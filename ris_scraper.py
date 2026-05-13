"""
RailApp – RIS::Journeys Scraper
Holt Live-Zugdaten von ris-info.bahn.de → speichert in Supabase

Railway Variables:
  RIS_REFRESH_TOKEN  = berkkutlug#7776000#...  (aus Cookie risinfo-jwtRefreshToken)
  RIS_USERNAME       = berkkutlug
  RIS_PASSWORD       = [dein Passwort]
  SUPABASE_URL       = https://...supabase.co
  SUPABASE_KEY       = sb_publishable_...
  POLL_TRAINS        = 15201,17,18,19  (Komma-getrennte Zugnummern)
  POLL_INTERVAL      = 60
"""

import os, json, asyncio, hashlib, httpx
from datetime import datetime, date

# ── Config ──────────────────────────────────────────────────
RIS_BASE        = "https://ris-info.bahn.de"
RIS_REFRESH_TOK = os.environ.get("RIS_REFRESH_TOKEN", "")
RIS_USERNAME    = os.environ.get("RIS_USERNAME", "")
RIS_PASSWORD    = os.environ.get("RIS_PASSWORD", "")
SUPABASE_URL    = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY    = os.environ.get("SUPABASE_KEY", "")
POLL_INTERVAL   = int(os.environ.get("POLL_INTERVAL", "60"))
POLL_TRAINS     = [t.strip() for t in os.environ.get("POLL_TRAINS", "").split(",") if t.strip()]

SB_HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal",
}

BROWSER_HEADERS = {
    "Accept":          "*/*",
    "Accept-Language": "de-DE,de;q=0.9",
    "DNT":             "1",
    "Referer":         "https://ris-info.bahn.de/",
    "Sec-Fetch-Dest":  "empty",
    "Sec-Fetch-Mode":  "cors",
    "Sec-Fetch-Site":  "same-origin",
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "intranet-token":  "",
}

print("=" * 55, flush=True)
print("  RIS::Journeys Scraper", flush=True)
print(f"  Züge: {POLL_TRAINS or 'keine konfiguriert'}", flush=True)
print(f"  Poll: {POLL_INTERVAL}s", flush=True)
print("=" * 55, flush=True)

# ── Token-Management ────────────────────────────────────────
class RisAuth:
    def __init__(self):
        self.jwt         = None
        self.refresh_tok = RIS_REFRESH_TOK
        self.expires_at  = 0

    async def get_jwt(self, client: httpx.AsyncClient) -> str | None:
        """JWT holen / erneuern"""
        import time
        if self.jwt and time.time() < self.expires_at - 30:
            return self.jwt

        # Refresh via Cookie
        if self.refresh_tok:
            jwt = await self._refresh(client)
            if jwt:
                return jwt

        # Fallback: Login
        if RIS_USERNAME and RIS_PASSWORD:
            jwt = await self._login(client)
            if jwt:
                return jwt

        return None

    async def _refresh(self, client: httpx.AsyncClient) -> str | None:
        """GET /api/v1/idm/refreshtoken mit Cookie"""
        import time
        try:
            r = await client.get(
                f"{RIS_BASE}/api/v1/idm/refreshtoken",
                headers=BROWSER_HEADERS,
                cookies={"risinfo-jwtRefreshToken": self.refresh_tok},
                timeout=15,
            )
            print(f"  Refresh → {r.status_code}", flush=True)

            if r.status_code == 200:
                data = r.json()
                # Token aus Response
                jwt = (
                    data.get("token") or
                    data.get("accessToken") or
                    data.get("access_token") or
                    data.get("jwt") or
                    ""
                )
                # Neuen Refresh-Token aus Cookie speichern
                new_rt = r.cookies.get("risinfo-jwtRefreshToken")
                if new_rt:
                    self.refresh_tok = new_rt

                if jwt:
                    # Ablaufzeit aus JWT-Payload lesen
                    try:
                        import base64
                        parts   = jwt.split(".")
                        pad     = parts[1] + "=="
                        payload = json.loads(base64.urlsafe_b64decode(pad).decode())
                        self.expires_at = payload.get("exp", time.time() + 300)
                    except Exception:
                        self.expires_at = time.time() + 240

                    self.jwt = jwt
                    print(f"  ✅ JWT erneuert (gültig bis {datetime.fromtimestamp(self.expires_at).strftime('%H:%M:%S')})", flush=True)
                    return jwt

            # Token abgelaufen → neu einloggen
            if r.status_code in (401, 403):
                print("  ⚠️ Refresh Token abgelaufen → Login", flush=True)
                return None

        except Exception as e:
            print(f"  Refresh Fehler: {e}", flush=True)
        return None

    async def _login(self, client: httpx.AsyncClient) -> str | None:
        """Login mit Username/Password"""
        import time
        try:
            # Login-Endpoint ermitteln
            for ep in [
                "/api/v1/idm/token",
                "/api/v1/idm/login",
                "/api/v1/auth/login",
            ]:
                r = await client.post(
                    f"{RIS_BASE}{ep}",
                    json={"username": RIS_USERNAME, "password": RIS_PASSWORD},
                    headers={**BROWSER_HEADERS, "Content-Type": "application/json"},
                    timeout=15,
                )
                print(f"  Login {ep} → {r.status_code}", flush=True)

                if r.status_code == 200:
                    data = r.json()
                    jwt  = data.get("token") or data.get("accessToken") or data.get("access_token") or ""
                    rt   = r.cookies.get("risinfo-jwtRefreshToken", "")
                    if rt: self.refresh_tok = rt
                    if jwt:
                        self.jwt        = jwt
                        self.expires_at = time.time() + 240
                        print("  ✅ Login OK", flush=True)
                        return jwt

        except Exception as e:
            print(f"  Login Fehler: {e}", flush=True)
        return None


auth = RisAuth()

# ── RIS API Calls ────────────────────────────────────────────
async def ris_autocomplete(client: httpx.AsyncClient, number: str, jwt: str) -> list:
    """Zugnummer → JourneyID(s)"""
    today = date.today().isoformat()
    params = {
        "number":              number,
        "date":                today,
        "transports":          "HIGH_SPEED_TRAIN,INTERCITY_TRAIN,INTER_REGIONAL_TRAIN,REGIONAL_TRAIN,CITY_TRAIN",
        "onlyDomesticJourneys": "true",
    }
    r = await client.get(
        f"{RIS_BASE}/api/ris-ipet-ri/v1/ri/operationaljourneysautocomplete",
        params=params,
        headers={**BROWSER_HEADERS, "Authorization": f"Bearer {jwt}"},
        timeout=15,
    )
    print(f"  Autocomplete {number} → {r.status_code}", flush=True)
    if not r.ok: return []
    data = r.json()
    # Struktur: Liste von {journeyID, trainNumber, ...}
    return data if isinstance(data, list) else data.get("journeys", data.get("data", []))


async def ris_journey(client: httpx.AsyncClient, journey_id: str, jwt: str) -> dict | None:
    """JourneyID → vollständiger Fahrtverlauf"""
    params = {
        "journeyID":            journey_id,
        "includeJourneyReferences": "true",
        "includeExpired":       "true",
    }
    r = await client.get(
        f"{RIS_BASE}/api/ris-ipet-ri/v1/ri/operationaljourneyseventbased",
        params=params,
        headers={**BROWSER_HEADERS, "Authorization": f"Bearer {jwt}"},
        timeout=20,
    )
    print(f"  Journey {journey_id[:30]}… → {r.status_code} ({len(r.content)}B)", flush=True)
    if not r.ok: return None
    return r.json()


# ── Supabase Upsert ──────────────────────────────────────────
async def upsert_journey(journey_id: str, train_nr: str, data: dict):
    """Fahrtverlauf in Supabase speichern / aktualisieren"""
    events    = data.get("events", data.get("stops", data.get("halte", [])))
    line_name = data.get("trainNumber") or data.get("name") or f"Zug {train_nr}"
    dest_name = events[-1].get("station", {}).get("name", "") if events else ""

    stopovers = []
    for ev in events:
        stn       = ev.get("station", {})
        sched     = ev.get("timeSchedule", {})
        forecast  = ev.get("timeForecast", {})
        stopovers.append({
            "name":          stn.get("name", ""),
            "evaNumber":     stn.get("evaNumber") or stn.get("eva"),
            "arrPlan":       sched.get("arrival"),
            "depPlan":       sched.get("departure"),
            "arrForecast":   forecast.get("arrival"),
            "depForecast":   forecast.get("departure"),
            "arrDelay":      ev.get("arrivalDelay"),
            "depDelay":      ev.get("departureDelay"),
            "platform":      ev.get("platform") or ev.get("gleisBezeichnung"),
            "cancelled":     ev.get("cancelled", False),
        })

    payload = {
        "journey_id":    journey_id,
        "train_number":  train_nr,
        "line_name":     line_name,
        "destination":   dest_name,
        "stopovers":     json.dumps(stopovers),
        "raw":           json.dumps(data)[:10000],  # max 10KB
        "updated_at":    datetime.utcnow().isoformat(),
    }

    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            f"{SUPABASE_URL}/rest/v1/ris_journeys",
            headers={**SB_HEADERS, "Prefer": "return=minimal,resolution=merge-duplicates"},
            content=json.dumps(payload),
        )
        if r.status_code in (200, 201):
            print(f"  ✅ {line_name} → {dest_name} ({len(stopovers)} Halte)", flush=True)
        else:
            print(f"  ⚠️ Supabase: {r.status_code} {r.text[:100]}", flush=True)


# ── MAIN LOOP ────────────────────────────────────────────────
async def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ SUPABASE_URL / SUPABASE_KEY fehlen", flush=True)
        return

    if not RIS_REFRESH_TOK and not (RIS_USERNAME and RIS_PASSWORD):
        print("❌ RIS_REFRESH_TOKEN oder RIS_USERNAME+RIS_PASSWORD fehlen", flush=True)
        return

    if not POLL_TRAINS:
        print("⚠️ POLL_TRAINS nicht gesetzt – setze z.B. '15201,17,18'", flush=True)

    async with httpx.AsyncClient(
        base_url=RIS_BASE,
        follow_redirects=True,
        timeout=30,
    ) as client:

        while True:
            try:
                now = datetime.now().strftime("%H:%M:%S")
                print(f"\n🔄 [{now}]", flush=True)

                # Token holen
                jwt = await auth.get_jwt(client)
                if not jwt:
                    print("  ❌ Kein JWT – warte 60s", flush=True)
                    await asyncio.sleep(60)
                    continue

                # Alle konfigurierten Züge abfragen
                for train_nr in POLL_TRAINS:
                    try:
                        journeys = await ris_autocomplete(client, train_nr, jwt)
                        if not journeys:
                            print(f"  Kein Zug {train_nr} gefunden", flush=True)
                            continue

                        for j in journeys[:2]:  # max 2 Varianten
                            jid = j.get("journeyID") or j.get("id") or ""
                            if not jid:
                                continue
                            data = await ris_journey(client, jid, jwt)
                            if data:
                                await upsert_journey(jid, train_nr, data)

                    except Exception as e:
                        print(f"  Fehler {train_nr}: {e}", flush=True)

            except Exception as e:
                print(f"⚠️ Loop-Fehler: {e}", flush=True)

            await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
