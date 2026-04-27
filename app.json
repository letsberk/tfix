'use strict';

// ═══════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL  = window.SUPABASE_URL;
const SUPABASE_ANON = window.SUPABASE_ANON_KEY;
let sb;

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
const App = {
  user:          null,
  profile:       null,
  isAdmin:       false,
  isOnline:      navigator.onLine,
  evuFilter:     'alle',
  categories:    [],
  contacts:      [],      // alle Kontakte (in-memory)
  items:         [],
  favorites:     [],      // { id, type, ref_id }
  currentCatId:  null,
  currentFavTab: 'all',
  telSortAsc:    true,
  telKatFilter:  '',
  searchDebounce: null,
};

// ═══════════════════════════════════════════════════════════
//  DOM HELPERS
// ═══════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const show = id => $(id)?.classList.remove('hidden');
const hide = id => $(id)?.classList.add('hidden');

let _toastTimer;
function toast(msg, type = 'info', dur = 3000) {
  const el = $('toast');
  el.textContent = msg;
  el.className   = `toast toast-${type}`;
  el.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), dur);
}

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(id)?.classList.add('active');
}

const ALL_VIEWS = ['view-home','view-telefonbuch','view-subcategories','view-items','view-favoriten'];
function showView(id) {
  ALL_VIEWS.forEach(v => v === id ? show(v) : hide(v));
  // Bottom Nav sync
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  if (id === 'view-home')        $('nav-home')?.classList.add('active');
  if (id === 'view-telefonbuch') $('nav-tel')?.classList.add('active');
  if (id === 'view-favoriten')   $('nav-fav')?.classList.add('active');
}

function setLoading(id, loading, label) {
  const el = $(id); if (!el) return;
  el.disabled = loading; el.textContent = label;
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function highlight(text, term) {
  if (!term || !text) return escHtml(text);
  const escaped = escHtml(text);
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${escapedTerm})`, 'gi'), '<mark>$1</mark>');
}

function formatDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'});
}

function showError(id, msg) {
  const el = $(id); if (!el) return;
  el.textContent = msg; el.classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════════
//  ONLINE STATUS
// ═══════════════════════════════════════════════════════════
function updateOnlineStatus() {
  App.isOnline = navigator.onLine;
  const bar = $('status-bar');
  if (App.isOnline) {
    bar.className = 'status-bar online';
    $('status-icon').textContent = '🟢';
    $('status-text').textContent = 'Online';
    if (App.user) loadAllData();
  } else {
    bar.className = 'status-bar offline';
    $('status-icon').textContent = '🔴';
    $('status-text').textContent = 'Offline';
  }
}
window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ═══════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════
async function login() {
  const email = $('login-email').value.trim();
  const pw    = $('login-password').value;
  if (!email || !pw) { showError('login-error','E-Mail und Passwort eingeben'); return; }
  setLoading('btn-login', true, 'Anmelden…');
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
  setLoading('btn-login', false, 'Anmelden');
  if (error) { showError('login-error', deError(error.message)); return; }
  await afterLogin(data.user);
}

async function register() {
  const name = $('reg-name').value.trim();
  const email = $('reg-email').value.trim();
  const pw    = $('reg-password').value;
  if (!name||!email||!pw) { showError('reg-error','Alle Felder ausfüllen'); return; }
  if (pw.length < 8)      { showError('reg-error','Passwort mind. 8 Zeichen'); return; }
  setLoading('btn-register', true, 'Registrieren…');
  const { error } = await sb.auth.signUp({ email, password: pw, options: { data: { full_name: name } } });
  setLoading('btn-register', false, 'Konto anlegen');
  if (error) { showError('reg-error', deError(error.message)); return; }
  toast('✓ Konto erstellt – E-Mail bestätigen', 'success', 5000);
  switchAuthTab('login');
}

async function logout() {
  await sb.auth.signOut();
  App.user = null; App.profile = null; App.isAdmin = false;
  App.contacts = []; App.items = []; App.favorites = [];
  showScreen('screen-login');
  toast('Abgemeldet');
}

async function afterLogin(user) {
  App.user = user;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) {
    await sb.from('profiles').insert({
      id: user.id, email: user.email, role: 'user',
      full_name: user.user_metadata?.full_name || '',
    });
    App.profile = { id: user.id, email: user.email, role: 'user' };
  } else {
    App.profile = profile;
  }
  App.isAdmin = App.profile.role === 'admin';

  if (App.isAdmin) {
    $('admin-name-display').textContent = App.profile.full_name || App.profile.email;
    showScreen('screen-admin');
    await loadAdminData();
  } else {
    $('user-name-display').textContent = App.profile.full_name || App.profile.email;
    if (App.isAdmin) show('btn-user-admin');
    showScreen('screen-user');
    showView('view-home');
    await loadAllData();
  }
}

function deError(msg) {
  const m = {
    'Invalid login credentials':'E-Mail oder Passwort falsch',
    'Email not confirmed':'E-Mail noch nicht bestätigt',
    'User already registered':'E-Mail bereits registriert',
    'email rate limit exceeded':'Zu viele E-Mails – kurz warten',
  };
  return m[msg] || msg;
}

function switchAuthTab(tab) {
  $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  tab === 'login' ? (show('tab-login'), hide('tab-register'))
                  : (hide('tab-login'), show('tab-register'));
}

// ═══════════════════════════════════════════════════════════
//  EVU FILTER
// ═══════════════════════════════════════════════════════════
function setEvuFilter(evu) {
  App.evuFilter = evu;
  $$('.evu-btn').forEach(b => b.classList.toggle('active', b.dataset.evu === evu));
  const inTel = !$('view-telefonbuch').classList.contains('hidden');
  const inSub = !$('view-subcategories').classList.contains('hidden');
  const inItm = !$('view-items').classList.contains('hidden');
  if (!$('view-home').classList.contains('hidden')) renderHomeTiles();
  if (inTel) renderContacts($('tel-search').value);
  if (inSub && App.currentCatId) loadSubcategories(App.currentCatId);
  if (inItm) renderItems();
}

function evuMatch(v) {
  if (App.evuFilter === 'alle') return true;
  return v === 'alle' || v === App.evuFilter;
}

// ═══════════════════════════════════════════════════════════
//  DATA LOADING
// ═══════════════════════════════════════════════════════════
async function loadAllData() {
  $('status-text').textContent = 'Synchronisiere…';
  const icon = $('btn-sync').querySelector('.sync-icon');
  icon.style.animation = 'spin 1s linear infinite';

  // Jeden Fetch einzeln absichern – ein Fehler bricht nicht alles ab
  const results = await Promise.allSettled([
    fetchCategories(),
    fetchItems(),
    fetchFavorites(),
  ]);

  // Fehler einzeln loggen (hilft beim Debugging)
  const labels = ['Kategorien', 'Items', 'Favoriten'];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`${labels[i]} konnte nicht geladen werden:`, r.reason);
    }
  });

  // Prüfen ob Kategorien und Items geladen wurden (Mindestanforderung)
  const catOk  = results[0].status === 'fulfilled';
  const itemOk = results[1].status === 'fulfilled';

  if (!catOk && !itemOk) {
    // Beides fehlgeschlagen → Verbindungsproblem
    toast('Verbindung zu Supabase fehlgeschlagen', 'error');
    $('status-text').textContent = 'Fehler';
    console.error('Supabase nicht erreichbar. Prüfe:\n1. Supabase URL korrekt?\n2. Anon Key korrekt?\n3. RLS-Policies vorhanden?\n4. Tabellen angelegt?');
  } else {
    renderHomeTiles();
    updateFavBadge();
    $('status-text').textContent = 'Online';

    // Hinweis wenn Favoriten-Tabelle fehlt
    if (results[2].status === 'rejected') {
      console.warn('Favoriten-Tabelle fehlt – favoriten.sql in Supabase ausführen');
    }
  }

  icon.style.animation = '';
}

async function fetchCategories() {
  const { data, error } = await sb.from('categories').select('*').order('sort_order');
  if (error) throw new Error('categories: ' + error.message);
  App.categories = data || [];
}

async function fetchItems() {
  const { data, error } = await sb
    .from('items').select('*, categories(name), subcategories(name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error('items: ' + error.message);
  App.items = data || [];
}

// ═══════════════════════════════════════════════════════════
//  HOME KACHELN
// ═══════════════════════════════════════════════════════════
function renderHomeTiles() {
  const container = $('dynamic-tiles');
  if (!container) return;
  const filtered = App.categories.filter(c => evuMatch(c.evu));
  container.innerHTML = filtered.map(cat =>
    `<button class="tile" data-cat-id="${cat.id}">
      <span class="tile-icon">${escHtml(cat.icon||'📁')}</span>
      <span class="tile-label">${escHtml(cat.name)}</span>
    </button>`
  ).join('');
  container.querySelectorAll('.tile[data-cat-id]').forEach(btn => {
    btn.addEventListener('click', () => openCategory(btn.dataset.catId));
  });
}

function openCategory(catId) {
  App.currentCatId = catId;
  const cat = App.categories.find(c => c.id === catId);
  $('subcategory-title').textContent = `${cat?.icon||''} ${cat?.name||''}`;
  showView('view-subcategories');
  loadSubcategories(catId);
}

// ═══════════════════════════════════════════════════════════
//  UNTERKATEGORIEN
// ═══════════════════════════════════════════════════════════
async function loadSubcategories(categoryId) {
  $('sub-tiles').innerHTML = '<div class="loading-msg"><div class="spinner"></div>Lade…</div>';
  const { data } = await sb.from('subcategories').select('*')
    .eq('category_id', categoryId).order('sort_order');
  const filtered = (data||[]).filter(s => evuMatch(s.evu));
  if (!filtered.length) {
    $('items-view-title').textContent = $('subcategory-title').textContent;
    showView('view-items');
    renderItemsByCategory(categoryId, null);
    return;
  }
  $('sub-tiles').innerHTML = filtered.map(sub =>
    `<button class="tile" data-sub-id="${sub.id}" data-cat-id="${categoryId}">
      <span class="tile-icon">${escHtml(sub.icon||'📄')}</span>
      <span class="tile-label">${escHtml(sub.name)}</span>
    </button>`
  ).join('');
  $('sub-tiles').querySelectorAll('.tile[data-sub-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = filtered.find(s => s.id === btn.dataset.subId);
      $('items-view-title').textContent = `${sub?.icon||''} ${sub?.name||''}`;
      showView('view-items');
      renderItemsByCategory(btn.dataset.catId, btn.dataset.subId);
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  ITEMS
// ═══════════════════════════════════════════════════════════
function renderItemsByCategory(catId, subCatId) {
  const filtered = App.items.filter(i =>
    (!catId || i.category_id === catId) &&
    (!subCatId || i.subcategory_id === subCatId) &&
    evuMatch(i.evu)
  );
  renderItemsList(filtered);
}

function renderItems() {
  renderItemsList(App.items.filter(i => evuMatch(i.evu)));
}

function renderItemsList(items) {
  const list = $('items-list');
  if (!items.length) {
    list.innerHTML = '<div class="empty-state">📭 Keine Inhalte gefunden</div>';
    return;
  }
  list.innerHTML = items.map(item => {
    const isFav = isFavorite('item', item.id);
    return `
    <div class="item-card">
      <div class="item-header">
        <span class="item-evu-badge">${escHtml(item.evu||'alle')}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="item-date">${formatDate(item.created_at)}</span>
          <button class="fav-btn ${isFav?'active':''}" data-type="item" data-id="${item.id}" title="${isFav?'Aus Favoriten entfernen':'Zu Favoriten hinzufügen'}">
            ${isFav?'⭐':'☆'}
          </button>
        </div>
      </div>
      <h3 class="item-title">${escHtml(item.title)}</h3>
      ${item.description ? `<p class="item-desc">${escHtml(item.description)}</p>` : ''}
      ${item.file_url ? `<div class="item-file">📎 <a href="${escHtml(item.file_url)}" target="_blank" rel="noopener" class="file-link">Datei öffnen</a></div>` : ''}
    </div>`;
  }).join('');

  list.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.type, btn.dataset.id, btn);
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  TELEFONBUCH – VERBESSERTE SUCHE
// ═══════════════════════════════════════════════════════════
let _telSearchTimer = null;
const TEL_PAGE_SIZE = 80;

function onTelInput() {
  const q = $('tel-search').value.trim();
  // Clear-Button zeigen/verstecken
  q.length > 0 ? show('tel-search-clear') : hide('tel-search-clear');

  // Debounce: 250ms warten nach letzter Eingabe
  clearTimeout(_telSearchTimer);
  _telSearchTimer = setTimeout(() => renderContacts(q), 250);
}

async function renderContacts(rawQuery) {
  const q        = (rawQuery || $('tel-search').value || '').trim().toLowerCase();
  const katFilt  = App.telKatFilter;
  const list     = $('contacts-list');

  // Kein Suchbegriff → Hinweis anzeigen
  if (!q && !katFilt) {
    list.innerHTML = `
      <div class="tel-start-hint">
        <div class="tel-hint-icon">📞</div>
        <p>Suche im Telefonbuch</p>
        <p class="tel-hint-sub">${App.contacts.length ? App.contacts.length.toLocaleString('de') : '8.280'} Einträge verfügbar<br>Name · Ort · Rl100 · Nummer</p>
      </div>`;
    hide('tel-info-bar');
    return;
  }

  // Kontakte lazy laden (nur bei erster Suche)
  if (!App.contacts.length) {
    list.innerHTML = '<div class="loading-msg"><div class="spinner"></div>Lade Telefonbuch…</div>';
    const { data, error } = await sb.from('contacts').select('*').order('name');
    if (error) { console.error(error); list.innerHTML = '<div class="empty-state">Fehler beim Laden</div>'; return; }
    App.contacts = data || [];
  }

  // Filtern
  let results = App.contacts.filter(c => {
    const matchEvu = evuMatch(c.evu);
    const matchKat = !katFilt || c.kategorie === katFilt;
    if (!matchEvu || !matchKat) return false;
    if (!q) return true;

    // Suche in: name, funktion, telefon, notiz (enthält Rl100, weitere Nummern)
    return (c.name     || '').toLowerCase().includes(q) ||
           (c.funktion || '').toLowerCase().includes(q) ||
           (c.telefon  || '').toLowerCase().includes(q) ||
           (c.notiz    || '').toLowerCase().includes(q);
  });

  // Sortieren
  results.sort((a, b) => {
    const cmp = (a.name||'').localeCompare(b.name||'', 'de');
    return App.telSortAsc ? cmp : -cmp;
  });

  const total  = results.length;
  const shown  = results.slice(0, TEL_PAGE_SIZE);

  // Info-Bar
  show('tel-info-bar');
  $('tel-info-text').textContent = total === 0
    ? 'Keine Treffer'
    : `${total.toLocaleString('de')} Ergebnis${total !== 1 ? 'se' : ''}${total > TEL_PAGE_SIZE ? ` · Zeige erste ${TEL_PAGE_SIZE}` : ''}`;

  if (total === 0) {
    list.innerHTML = `
      <div class="empty-state">
        🔍 Keine Treffer für <strong>${escHtml(rawQuery || q)}</strong>
      </div>`;
    return;
  }

  list.innerHTML = shown.map(c => {
    const isFav = isFavorite('contact', c.id);
    const notizParts = parseNotiz(c.notiz);
    return `
    <div class="contact-card" data-id="${c.id}">
      <div class="contact-main">
        <div class="contact-name">${highlight(c.name, q)}</div>
        ${c.funktion ? `<div class="contact-funktion">${highlight(c.funktion, q)}</div>` : ''}
        ${notizParts.rl100 ? `<span class="contact-rl100">${escHtml(notizParts.rl100)}</span>` : ''}
      </div>
      <div class="contact-right">
        ${c.evu !== 'alle' ? `<span class="evu-tag">${escHtml(c.evu)}</span>` : ''}
        <div class="contact-tel">${highlight(c.telefon, q)}</div>
        <div class="contact-actions">
          <a class="call-chip" href="tel:${encodeURIComponent(c.telefon)}" onclick="event.stopPropagation()">📞</a>
          <button class="fav-btn ${isFav?'active':''}" data-type="contact" data-id="${c.id}">
            ${isFav?'⭐':'☆'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Events
  list.querySelectorAll('.contact-card').forEach(card => {
    card.addEventListener('click', () => showContactDetail(card.dataset.id));
  });
  list.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.type, btn.dataset.id, btn);
    });
  });

  // "Mehr laden" Button
  if (total > TEL_PAGE_SIZE) {
    const more = document.createElement('button');
    more.className = 'load-more-btn';
    more.textContent = `Weitere ${Math.min(TEL_PAGE_SIZE, total - TEL_PAGE_SIZE)} von ${total - TEL_PAGE_SIZE} anzeigen`;
    more.addEventListener('click', () => renderContactsAll(results, q));
    list.appendChild(more);
  }
}

function renderContactsAll(results, q) {
  const list = $('contacts-list');
  list.innerHTML = results.map(c => {
    const isFav = isFavorite('contact', c.id);
    return `
    <div class="contact-card" data-id="${c.id}">
      <div class="contact-main">
        <div class="contact-name">${highlight(c.name, q)}</div>
        ${c.funktion ? `<div class="contact-funktion">${highlight(c.funktion, q)}</div>` : ''}
      </div>
      <div class="contact-right">
        ${c.evu !== 'alle' ? `<span class="evu-tag">${escHtml(c.evu)}</span>` : ''}
        <div class="contact-tel">${highlight(c.telefon, q)}</div>
        <div class="contact-actions">
          <a class="call-chip" href="tel:${encodeURIComponent(c.telefon)}" onclick="event.stopPropagation()">📞</a>
          <button class="fav-btn ${isFav?'active':''}" data-type="contact" data-id="${c.id}">
            ${isFav?'⭐':'☆'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('.contact-card').forEach(card => {
    card.addEventListener('click', () => showContactDetail(card.dataset.id));
  });
  list.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.type, btn.dataset.id, btn);
    });
  });
}

function parseNotiz(notiz) {
  const result = {};
  if (!notiz) return result;
  const m = notiz.match(/Rl100:\s*([A-Z0-9]+)/);
  if (m) result.rl100 = m[1];
  return result;
}

function showContactDetail(id) {
  const c = App.contacts.find(x => x.id === id);
  if (!c) return;
  const isFav  = isFavorite('contact', c.id);
  const notizParts = c.notiz ? c.notiz.split(' · ').filter(Boolean) : [];

  $('contact-overlay-content').innerHTML = `
    <div class="contact-detail">
      <div class="contact-detail-top">
        <div>
          <div class="contact-detail-name">${escHtml(c.name)}</div>
          ${c.funktion ? `<div class="contact-detail-funktion">${escHtml(c.funktion)}</div>` : ''}
          ${c.evu !== 'alle' ? `<div class="contact-detail-evu">${escHtml(c.evu)}</div>` : ''}
        </div>
        <button class="fav-btn-lg ${isFav?'active':''}" id="overlay-fav-btn" data-type="contact" data-id="${c.id}">
          ${isFav?'⭐':'☆'}
        </button>
      </div>

      <div class="contact-detail-tel">${escHtml(c.telefon)}</div>
      <a class="btn-call" href="tel:${encodeURIComponent(c.telefon)}">📞 Anrufen</a>

      ${notizParts.length ? `
        <div class="contact-detail-extras">
          ${notizParts.map(p => `<div class="detail-extra-row">${escHtml(p)}</div>`).join('')}
        </div>` : ''}
      ${c.notiz ? `<div class="contact-detail-notiz">${escHtml(c.notiz)}</div>` : ''}
    </div>`;

  $('overlay-fav-btn')?.addEventListener('click', function() {
    toggleFavorite(this.dataset.type, this.dataset.id, this);
  });
  $('contact-overlay').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════════
//  FAVORITEN SYSTEM
// ═══════════════════════════════════════════════════════════
async function fetchFavorites() {
  if (!App.user) return;
  const { data, error } = await sb
    .from('favorites').select('*').eq('user_id', App.user.id);
  if (error) {
    // Tabelle existiert noch nicht → favoriten.sql ausführen
    throw new Error('favorites: ' + error.message);
  }
  App.favorites = data || [];
  updateFavBadge();
}

function isFavorite(type, refId) {
  return App.favorites.some(f => f.type === type && f.ref_id === refId);
}

async function toggleFavorite(type, refId, btnEl) {
  if (!App.user) { toast('Bitte einloggen', 'warning'); return; }
  const existing = App.favorites.find(f => f.type === type && f.ref_id === refId);

  if (existing) {
    // Entfernen
    const { error } = await sb.from('favorites').delete().eq('id', existing.id);
    if (error) { toast('Fehler', 'error'); return; }
    App.favorites = App.favorites.filter(f => f.id !== existing.id);
    if (btnEl) { btnEl.textContent = '☆'; btnEl.classList.remove('active'); }
    toast('Aus Favoriten entfernt');
  } else {
    // Hinzufügen
    const { data, error } = await sb.from('favorites').insert({
      user_id: App.user.id, type, ref_id: refId
    }).select().single();
    if (error) { toast('Fehler beim Speichern', 'error'); return; }
    App.favorites.push(data);
    if (btnEl) { btnEl.textContent = '⭐'; btnEl.classList.add('active'); }
    toast('⭐ Zu Favoriten hinzugefügt', 'success');
  }
  updateFavBadge();
}

function updateFavBadge() {
  const count = App.favorites.length;
  const badge1 = $('fav-count-badge');
  const badge2 = $('nav-fav-badge');
  [badge1, badge2].forEach(b => {
    if (!b) return;
    b.textContent = count;
    count > 0 ? b.classList.remove('hidden') : b.classList.add('hidden');
  });
}

async function renderFavoriten() {
  const list = $('fav-list');
  list.innerHTML = '<div class="loading-msg"><div class="spinner"></div>Lade…</div>';

  // Favoriten neu laden
  await fetchFavorites();

  const tab      = App.currentFavTab;
  let favs       = App.favorites;
  if (tab === 'contact') favs = favs.filter(f => f.type === 'contact');
  if (tab === 'item')    favs = favs.filter(f => f.type === 'item');

  $('fav-total-count').textContent = `${App.favorites.length} gesamt`;

  if (!favs.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div style="font-size:48px;margin-bottom:12px">⭐</div>
        <div>${tab === 'all' ? 'Noch keine Favoriten' : 'Keine Favoriten in dieser Kategorie'}</div>
        <div class="empty-sub">Klicke auf ☆ bei einem Kontakt oder Eintrag</div>
      </div>`;
    return;
  }

  // Daten zusammenführen
  const contactFavs = favs.filter(f => f.type === 'contact');
  const itemFavs    = favs.filter(f => f.type === 'item');

  // Kontakte aus App.contacts oder Supabase laden
  let favContacts = [];
  if (contactFavs.length) {
    // Erst aus Cache versuchen
    const ids = contactFavs.map(f => f.ref_id);
    favContacts = App.contacts.filter(c => ids.includes(c.id));
    // Fehlende von Supabase laden
    if (favContacts.length < ids.length) {
      const missing = ids.filter(id => !favContacts.find(c => c.id === id));
      if (missing.length) {
        const { data } = await sb.from('contacts').select('*').in('id', missing);
        if (data) {
          favContacts = [...favContacts, ...data];
          App.contacts = [...App.contacts, ...data.filter(d => !App.contacts.find(c => c.id === d.id))];
        }
      }
    }
  }

  const favItems = itemFavs.map(f => App.items.find(i => i.id === f.ref_id)).filter(Boolean);

  let html = '';

  if (favContacts.length && (tab === 'all' || tab === 'contact')) {
    html += `<div class="fav-section-header">📞 Kontakte (${favContacts.length})</div>`;
    html += favContacts.map(c => `
      <div class="fav-contact-card" data-id="${c.id}">
        <div class="fav-card-main">
          <div class="fav-card-name">${escHtml(c.name)}</div>
          ${c.funktion ? `<div class="fav-card-sub">${escHtml(c.funktion)}</div>` : ''}
        </div>
        <div class="fav-card-right">
          ${c.evu !== 'alle' ? `<span class="evu-tag">${escHtml(c.evu)}</span>` : ''}
          <div class="fav-tel">${escHtml(c.telefon)}</div>
          <div class="fav-actions">
            <a class="call-chip" href="tel:${encodeURIComponent(c.telefon)}" onclick="event.stopPropagation()">📞</a>
            <button class="fav-btn active" data-type="contact" data-id="${c.id}">⭐</button>
          </div>
        </div>
      </div>`).join('');
  }

  if (favItems.length && (tab === 'all' || tab === 'item')) {
    html += `<div class="fav-section-header">📄 Einträge (${favItems.length})</div>`;
    html += favItems.map(item => `
      <div class="fav-item-card">
        <div class="fav-item-top">
          <span class="item-evu-badge">${escHtml(item.evu||'alle')}</span>
          <button class="fav-btn active" data-type="item" data-id="${item.id}">⭐</button>
        </div>
        <div class="fav-card-name">${escHtml(item.title)}</div>
        ${item.description ? `<div class="fav-card-sub">${escHtml(item.description)}</div>` : ''}
        ${item.file_url ? `<div class="item-file">📎 <a href="${escHtml(item.file_url)}" target="_blank" class="file-link">Datei öffnen</a></div>` : ''}
      </div>`).join('');
  }

  list.innerHTML = html;

  list.querySelectorAll('.fav-contact-card').forEach(card => {
    card.addEventListener('click', () => {
      showView('view-telefonbuch');
      setTimeout(() => showContactDetail(card.dataset.id), 100);
    });
  });
  list.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await toggleFavorite(btn.dataset.type, btn.dataset.id, btn);
      await renderFavoriten(); // Favoriten-View neu laden
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  ADMIN – LADEN
// ═══════════════════════════════════════════════════════════
async function loadAdminData() {
  await Promise.all([loadAdminCategories(), loadAdminContacts(), loadAdminItems(), loadUsers()]);
}

// ═══════════════════════════════════════════════════════════
//  ADMIN – KATEGORIEN
// ═══════════════════════════════════════════════════════════
async function loadAdminCategories() {
  const { data } = await sb.from('categories').select('*, subcategories(count)').order('sort_order');
  App.categories = data || [];
  $('cat-table-body').innerHTML = (data||[]).map(c => `
    <tr>
      <td style="font-size:20px">${escHtml(c.icon||'📁')}</td>
      <td><strong>${escHtml(c.name)}</strong></td>
      <td><span class="badge">${escHtml(c.evu||'alle')}</span></td>
      <td>${c.subcategories?.[0]?.count ?? 0}</td>
      <td class="table-actions">
        <button class="btn-small btn-edit" data-edit-cat="${c.id}">✏</button>
        <button class="btn-small btn-delete" data-del-cat="${c.id}" data-name="${escHtml(c.name)}">🗑</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="5" class="table-empty">Keine Kategorien</td></tr>';

  $('subcat-parent').innerHTML = (data||[]).map(c =>
    `<option value="${c.id}">${escHtml(c.icon||'')} ${escHtml(c.name)}</option>`).join('');
  $('item-category-sel').innerHTML = '<option value="">– keine –</option>' +
    (data||[]).map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');

  $$('[data-edit-cat]').forEach(btn => btn.addEventListener('click', async () => {
    const cat = App.categories.find(c => c.id === btn.dataset.editCat);
    if (!cat) return;
    $('cat-form-title').textContent = 'Kategorie bearbeiten';
    $('cat-id').value = cat.id; $('cat-name').value = cat.name;
    $('cat-icon').value = cat.icon||'📁'; $('cat-evu').value = cat.evu||'alle';
    show('cat-form-wrap'); $('cat-form-wrap').scrollIntoView({behavior:'smooth'});
  }));
  $$('[data-del-cat]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm(`"${btn.dataset.name}" löschen?`)) return;
    const { error } = await sb.from('categories').delete().eq('id', btn.dataset.delCat);
    if (error) { toast('Fehler', 'error'); return; }
    toast('🗑 Gelöscht'); await loadAdminCategories();
  }));
}

async function saveCategory() {
  const id = $('cat-id').value, name = $('cat-name').value.trim();
  const icon = $('cat-icon').value.trim()||'📁', evu = $('cat-evu').value;
  if (!name) { showError('cat-error','Name erforderlich'); return; }
  setLoading('btn-save-cat', true, 'Speichern…');
  const { error } = id
    ? await sb.from('categories').update({name,icon,evu}).eq('id',id)
    : await sb.from('categories').insert({name,icon,evu});
  setLoading('btn-save-cat', false, 'Speichern');
  if (error) { showError('cat-error', error.message); return; }
  toast('✓ Gespeichert', 'success'); resetCatForm(); await loadAdminCategories();
}

function resetCatForm() {
  $('cat-id').value=''; $('cat-name').value=''; $('cat-icon').value='📁'; $('cat-evu').value='alle';
  $('cat-form-title').textContent='Neue Kategorie'; hide('cat-error'); hide('cat-form-wrap');
}

async function saveSubcategory() {
  const id = $('subcat-id').value, catId = $('subcat-parent').value;
  const name = $('subcat-name').value.trim(), icon = $('subcat-icon').value.trim()||'📄';
  const evu = $('subcat-evu').value;
  if (!name||!catId) { showError('subcat-error','Name und Kategorie erforderlich'); return; }
  setLoading('btn-save-subcat', true, 'Speichern…');
  const { error } = id
    ? await sb.from('subcategories').update({category_id:catId,name,icon,evu}).eq('id',id)
    : await sb.from('subcategories').insert({category_id:catId,name,icon,evu});
  setLoading('btn-save-subcat', false, 'Speichern');
  if (error) { showError('subcat-error', error.message); return; }
  toast('✓ Gespeichert', 'success'); resetSubcatForm(); await loadAdminCategories();
}

function resetSubcatForm() {
  $('subcat-id').value=''; $('subcat-name').value=''; $('subcat-icon').value='📄'; $('subcat-evu').value='alle';
  hide('subcat-error'); hide('subcat-form-wrap');
}

// ═══════════════════════════════════════════════════════════
//  ADMIN – TELEFONBUCH
// ═══════════════════════════════════════════════════════════
async function loadAdminContacts() {
  const { data } = await sb.from('contacts').select('*').order('name').limit(200);
  $('contacts-table-body').innerHTML = (data||[]).map(c => `
    <tr>
      <td><strong>${escHtml(c.name)}</strong></td>
      <td>${escHtml(c.funktion||'–')}</td>
      <td><a href="tel:${encodeURIComponent(c.telefon)}" class="tel-link">${escHtml(c.telefon)}</a></td>
      <td><span class="badge">${escHtml(c.evu||'alle')}</span></td>
      <td>${escHtml(c.kategorie||'–')}</td>
      <td class="table-actions">
        <button class="btn-small btn-edit" data-edit-contact='${JSON.stringify(c)}'>✏</button>
        <button class="btn-small btn-delete" data-del-contact="${c.id}" data-name="${escHtml(c.name)}">🗑</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" class="table-empty">Keine Kontakte</td></tr>';

  $$('[data-edit-contact]').forEach(btn => btn.addEventListener('click', () => {
    const c = JSON.parse(btn.dataset.editContact);
    $('contact-form-title').textContent='Kontakt bearbeiten';
    $('contact-id').value=c.id; $('contact-name').value=c.name;
    $('contact-funktion').value=c.funktion||''; $('contact-telefon').value=c.telefon;
    $('contact-evu').value=c.evu||'alle'; $('contact-kat').value=c.kategorie||'allgemein';
    $('contact-notiz').value=c.notiz||'';
    show('contact-form-wrap'); $('contact-form-wrap').scrollIntoView({behavior:'smooth'});
  }));
  $$('[data-del-contact]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm(`"${btn.dataset.name}" löschen?`)) return;
    const { error } = await sb.from('contacts').delete().eq('id', btn.dataset.delContact);
    if (error) { toast('Fehler','error'); return; }
    toast('🗑 Gelöscht'); await loadAdminContacts();
  }));
}

async function saveContact() {
  const id = $('contact-id').value, name = $('contact-name').value.trim();
  const tel = $('contact-telefon').value.trim();
  if (!name||!tel) { showError('contact-error','Name und Telefon erforderlich'); return; }
  setLoading('btn-save-contact', true, 'Speichern…');
  const payload = {
    name, funktion: $('contact-funktion').value.trim()||null, telefon: tel,
    evu: $('contact-evu').value, kategorie: $('contact-kat').value,
    notiz: $('contact-notiz').value.trim()||null,
  };
  const { error } = id
    ? await sb.from('contacts').update(payload).eq('id',id)
    : await sb.from('contacts').insert(payload);
  setLoading('btn-save-contact', false, 'Speichern');
  if (error) { showError('contact-error', error.message); return; }
  toast('✓ Gespeichert', 'success'); resetContactForm(); await loadAdminContacts();
}

function resetContactForm() {
  ['contact-id','contact-name','contact-funktion','contact-telefon','contact-notiz'].forEach(id => $(id).value='');
  $('contact-evu').value='alle'; $('contact-kat').value='allgemein';
  $('contact-form-title').textContent='Neuer Kontakt'; hide('contact-error'); hide('contact-form-wrap');
}

// ═══════════════════════════════════════════════════════════
//  ADMIN – ITEMS
// ═══════════════════════════════════════════════════════════
async function loadAdminItems() {
  const { data } = await sb.from('items')
    .select('*, categories(name), subcategories(name)').order('created_at', {ascending:false});
  App.items = data || [];
  $('items-table-body').innerHTML = (data||[]).map(item => `
    <tr>
      <td><strong>${escHtml(item.title)}</strong></td>
      <td>${escHtml(item.categories?.name||'–')}</td>
      <td><span class="badge">${escHtml(item.evu||'alle')}</span></td>
      <td>${item.file_url?`<a href="${escHtml(item.file_url)}" target="_blank" class="tel-link">📎</a>`:'–'}</td>
      <td class="table-actions">
        <button class="btn-small btn-edit" onclick='editItem(${JSON.stringify(item)})'>✏</button>
        <button class="btn-small btn-delete" onclick="deleteItem('${item.id}','${escHtml(item.title)}')">🗑</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="5" class="table-empty">Keine Einträge</td></tr>';
}

function editItem(item) {
  $('item-form-title').textContent='Eintrag bearbeiten';
  $('item-id').value=item.id; $('item-title').value=item.title;
  $('item-desc').value=item.description||''; $('item-category-sel').value=item.category_id||'';
  $('item-evu').value=item.evu||'alle'; $('item-file-attach').value=item.file_url||'';
  show('item-form-wrap'); $('item-form-wrap').scrollIntoView({behavior:'smooth'});
  if (item.category_id) loadSubcatOptions(item.category_id, item.subcategory_id);
}

async function loadSubcatOptions(catId, selectedId='') {
  const { data } = await sb.from('subcategories').select('*').eq('category_id', catId);
  $('item-subcategory-sel').innerHTML = '<option value="">– keine –</option>' +
    (data||[]).map(s => `<option value="${s.id}" ${s.id===selectedId?'selected':''}>${escHtml(s.name)}</option>`).join('');
}

async function saveItem() {
  const id = $('item-id').value, title = $('item-title').value.trim();
  if (!title) { showError('item-error','Titel erforderlich'); return; }
  setLoading('btn-save-item', true, 'Speichern…');
  const payload = {
    title, description: $('item-desc').value.trim()||null,
    category_id: $('item-category-sel').value||null,
    subcategory_id: $('item-subcategory-sel').value||null,
    evu: $('item-evu').value,
    file_url: $('item-file-attach').value.trim()||null,
    created_by: App.user.id,
  };
  const { error } = id
    ? await sb.from('items').update(payload).eq('id',id)
    : await sb.from('items').insert(payload);
  setLoading('btn-save-item', false, 'Speichern');
  if (error) { showError('item-error', error.message); return; }
  toast('✓ Gespeichert', 'success'); resetItemForm(); await loadAdminItems();
}

async function deleteItem(id, title) {
  if (!confirm(`"${title}" löschen?`)) return;
  const { error } = await sb.from('items').delete().eq('id', id);
  if (error) { toast('Fehler','error'); return; }
  toast('🗑 Gelöscht'); await loadAdminItems();
}

function resetItemForm() {
  ['item-id','item-title','item-desc','item-file-attach'].forEach(id => $(id).value='');
  $('item-category-sel').value=''; $('item-subcategory-sel').value=''; $('item-evu').value='alle';
  $('item-form-title').textContent='Neuer Eintrag'; hide('item-error'); hide('item-form-wrap');
}

// ═══════════════════════════════════════════════════════════
//  ADMIN – NUTZER
// ═══════════════════════════════════════════════════════════
async function loadUsers() {
  const { data } = await sb.from('profiles').select('*').order('created_at');
  $('user-count').textContent = `${(data||[]).length} Nutzer`;
  $('users-table-body').innerHTML = (data||[]).map(u => `
    <tr>
      <td>${escHtml(u.full_name||'–')}</td>
      <td>${escHtml(u.email)}</td>
      <td>
        <select class="role-select" data-uid="${u.id}">
          <option value="user"  ${u.role==='user' ?'selected':''}>user</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>admin</option>
        </select>
      </td>
      <td>${formatDate(u.created_at)}</td>
      <td><span class="badge ${u.role==='admin'?'badge-admin':'badge-user'}">${u.role}</span></td>
    </tr>`).join('') || '<tr><td colspan="5" class="table-empty">Keine Nutzer</td></tr>';

  $$('.role-select').forEach(sel => sel.addEventListener('change', async () => {
    const { error } = await sb.from('profiles').update({role:sel.value}).eq('id',sel.dataset.uid);
    if (error) { toast('Fehler','error'); return; }
    toast(`✓ Rolle auf "${sel.value}" gesetzt`, 'success'); await loadUsers();
  }));
}

// ═══════════════════════════════════════════════════════════
//  ADMIN TABS
// ═══════════════════════════════════════════════════════════
function switchAdminPanel(panelId) {
  $$('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === panelId));
  $$('.admin-panel').forEach(p => p.classList.toggle('active', p.id === panelId));
  if (panelId==='panel-categories') loadAdminCategories();
  if (panelId==='panel-contacts')   loadAdminContacts();
  if (panelId==='panel-items')      loadAdminItems();
  if (panelId==='panel-users')      loadUsers();
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  if (!SUPABASE_URL || SUPABASE_URL.includes('DEIN-PROJEKT')) {
    toast('⚠️ Supabase nicht konfiguriert!', 'error', 10000);
    return;
  }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  updateOnlineStatus();

  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) await afterLogin(session.user);

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event==='SIGNED_IN'  && session) await afterLogin(session.user);
    if (event==='SIGNED_OUT')            showScreen('screen-login');
  });

  // ── AUTH ──
  $('btn-login')?.addEventListener('click', login);
  $('btn-register')?.addEventListener('click', register);
  $('btn-logout')?.addEventListener('click', logout);
  $('btn-admin-logout')?.addEventListener('click', logout);
  $('login-password')?.addEventListener('keydown', e => { if(e.key==='Enter') login(); });
  $$('.auth-tab').forEach(t => t.addEventListener('click', () => switchAuthTab(t.dataset.tab)));

  // ── SYNC ──
  $('btn-sync')?.addEventListener('click', () => {
    if (App.isOnline && App.user) { App.contacts = []; loadAllData(); }
    else toast('Offline – kein Sync möglich', 'warning');
  });

  // ── NAVIGATION ──
  $('btn-user-admin')?.addEventListener('click', () => { showScreen('screen-admin'); loadAdminData(); });
  $('btn-admin-to-user')?.addEventListener('click', () => { showScreen('screen-user'); showView('view-home'); });

  // Bottom Nav
  $('nav-home')?.addEventListener('click', () => showView('view-home'));
  $('nav-tel')?.addEventListener('click',  () => { showView('view-telefonbuch'); });
  $('nav-fav')?.addEventListener('click',  () => { showView('view-favoriten'); renderFavoriten(); });

  // EVU Filter
  $$('.evu-btn').forEach(btn => btn.addEventListener('click', () => setEvuFilter(btn.dataset.evu)));

  // Home Kacheln
  $('tile-telefonbuch')?.addEventListener('click', () => showView('view-telefonbuch'));
  $('tile-kategorien')?.addEventListener('click',  () => showView('view-home'));
  $('tile-favoriten')?.addEventListener('click',   () => { showView('view-favoriten'); renderFavoriten(); });

  // Zurück-Buttons
  $('back-from-tel')?.addEventListener('click',   () => showView('view-home'));
  $('back-from-sub')?.addEventListener('click',   () => showView('view-home'));
  $('back-from-fav')?.addEventListener('click',   () => showView('view-home'));
  $('back-from-items')?.addEventListener('click', () =>
    showView(App.currentCatId ? 'view-subcategories' : 'view-home'));

  // ── TELEFONBUCH SUCHE ──
  $('tel-search')?.addEventListener('input', onTelInput);
  $('tel-search')?.addEventListener('search', onTelInput); // Löschen-Button im Browser
  $('tel-search-clear')?.addEventListener('click', () => {
    $('tel-search').value = '';
    hide('tel-search-clear');
    App.telKatFilter = '';
    $$('.tel-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.kat === ''));
    renderContacts('');
  });
  $$('.tel-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      App.telKatFilter = btn.dataset.kat;
      $$('.tel-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.kat === btn.dataset.kat));
      renderContacts($('tel-search').value);
    });
  });
  $('tel-sort-btn')?.addEventListener('click', () => {
    App.telSortAsc = !App.telSortAsc;
    $('tel-sort-btn').textContent = App.telSortAsc ? 'A–Z ↕' : 'Z–A ↕';
    renderContacts($('tel-search').value);
  });

  // ── FAVORITEN TABS ──
  $$('.fav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      App.currentFavTab = tab.dataset.ftab;
      $$('.fav-tab').forEach(t => t.classList.toggle('active', t.dataset.ftab === tab.dataset.ftab));
      renderFavoriten();
    });
  });

  // ── OVERLAY ──
  $('contact-overlay-close')?.addEventListener('click', () => $('contact-overlay').classList.add('hidden'));
  $('contact-overlay')?.addEventListener('click', e => {
    if (e.target === $('contact-overlay')) $('contact-overlay').classList.add('hidden');
  });

  // ── ADMIN ──
  $('btn-admin-to-user')?.addEventListener('click', () => { showScreen('screen-user'); showView('view-home'); });
  $$('.admin-tab').forEach(t => t.addEventListener('click', () => switchAdminPanel(t.dataset.panel)));
  $('btn-new-category')?.addEventListener('click', () => { resetCatForm(); show('cat-form-wrap'); });
  $('btn-cancel-cat')?.addEventListener('click', resetCatForm);
  $('btn-save-cat')?.addEventListener('click', saveCategory);
  $('btn-new-subcat')?.addEventListener('click', () => { resetSubcatForm(); show('subcat-form-wrap'); });
  $('btn-cancel-subcat')?.addEventListener('click', resetSubcatForm);
  $('btn-save-subcat')?.addEventListener('click', saveSubcategory);
  $('btn-new-contact')?.addEventListener('click', () => { resetContactForm(); show('contact-form-wrap'); });
  $('btn-cancel-contact')?.addEventListener('click', resetContactForm);
  $('btn-save-contact')?.addEventListener('click', saveContact);
  $('btn-new-item')?.addEventListener('click', () => { resetItemForm(); show('item-form-wrap'); });
  $('btn-cancel-item')?.addEventListener('click', resetItemForm);
  $('btn-save-item')?.addEventListener('click', saveItem);
  $('item-category-sel')?.addEventListener('change', () => {
    const catId = $('item-category-sel').value;
    catId ? loadSubcatOptions(catId)
          : ($('item-subcategory-sel').innerHTML = '<option value="">– keine –</option>');
  });
});
