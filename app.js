'use strict';

// ─────────────────────────────────────────────
//  CONSTANTS & DEFAULT DATA
// ─────────────────────────────────────────────
var ROLES = {
  admin:     { label:'Admin',     icon:'👑', level:4 },
  redaktion: { label:'Redaktion', icon:'✏️',  level:3 },
  moderator: { label:'Moderator', icon:'🛡️',  level:2 },
  nutzer:    { label:'Nutzer',    icon:'👤',  level:1 },
};

var ALL_MODULES = [
  { id:'bf',          label:'🏛️ Bf / Strecke',          screen:'screen-bf' },
  { id:'regelwerke',  label:'📋 Regelwerke',             screen:'screen-regelwerke' },
  { id:'telefonbuch', label:'📞 Telefonbuch',            screen:'screen-telefonbuch' },
  { id:'betrieb',     label:'⚙️ Betrieb-Info',           screen:'screen-betrieb' },
  { id:'zugfahrt',    label:'🗂️ Zugfahrt',               screen:'screen-zugfahrt' },
  { id:'baureihen',   label:'🔧 Baureihen',              screen:'screen-baureihen' },
  { id:'wegzeit',     label:'⏱️ Weg / Zeit',             screen:'screen-wegzeit' },
  { id:'befehle',     label:'📡 Befehle',                screen:'screen-befehle' },
  { id:'la',          label:'⚠️ La – Langsamfahrstellen', screen:'screen-la' },
  { id:'online',      label:'🌐 Online Auswahl',         screen:'screen-online' },
  { id:'sos',         label:'🆘 SOS',                    screen:'screen-sos', sos:true },
  { id:'forum',       label:'💬 Forum',                  screen:'screen-forum' },
];

var DEFAULT_EVUS = [
  { id:'dbregio',   name:'DB Regio AG',    short:'DBREGIO',   desc:'S-Bahn · RE · RB' },
  { id:'dbfv',      name:'DB Fernverkehr', short:'DBFV',      desc:'ICE · IC · EC' },
  { id:'abellio',   name:'Abellio Rail',   short:'ABELLIO',   desc:'RB · RE' },
  { id:'flixtrain', name:'Flixtrain',      short:'FLIXTRAIN', desc:'FLX · Fernverkehr' },
  { id:'transdev',  name:'Transdev',       short:'TRANSDEV',  desc:'NV · Regional' },
  { id:'arriva',    name:'Arriva',         short:'ARRIVA',    desc:'RB · International' },
];

var DEFAULT_USERS = [
  { id:'u1', nr:'12345678', name:'Max Müller',    role:'admin',     evu:'DB Regio AG',    active:true,  created:'01.01.2025', lastLogin:'11.04.2026', permissions:{}, avatar:'MM' },
  { id:'u2', nr:'23456789', name:'Anna Schmidt',  role:'redaktion', evu:'DB Regio AG',    active:true,  created:'15.02.2025', lastLogin:'10.04.2026', permissions:{}, avatar:'AS' },
  { id:'u3', nr:'34567890', name:'Klaus Weber',   role:'redaktion', evu:'DB Fernverkehr', active:true,  created:'01.03.2025', lastLogin:'09.04.2026', permissions:{}, avatar:'KW' },
  { id:'u4', nr:'45678901', name:'Sara Becker',   role:'moderator', evu:'DB Regio AG',    active:true,  created:'10.03.2025', lastLogin:'11.04.2026', permissions:{}, avatar:'SB' },
  { id:'u5', nr:'56789012', name:'Tom Fischer',   role:'nutzer',    evu:'Abellio Rail',   active:true,  created:'20.03.2025', lastLogin:'08.04.2026', permissions:{}, avatar:'TF' },
  { id:'u6', nr:'67890123', name:'Lisa Hoffmann', role:'nutzer',    evu:'DB Regio AG',    active:true,  created:'05.04.2025', lastLogin:'07.04.2026', permissions:{}, avatar:'LH' },
  { id:'u7', nr:'78901234', name:'Peter Lange',   role:'nutzer',    evu:'Flixtrain',      active:false, created:'01.04.2025', lastLogin:'01.04.2026', permissions:{}, avatar:'PL' },
];

var FORUM_CATEGORIES = [
  { id:'allgemein', name:'Allgemein',          icon:'💬', color:'#4caf50', desc:'Allgemeine Diskussionen', restricted:false },
  { id:'betrieb',   name:'Betriebliches',      icon:'🚦', color:'#f59e0b', desc:'Betrieb, Regelwerke, Vorschriften', restricted:false },
  { id:'technik',   name:'Technik & Fahrzeuge',icon:'🔧', color:'#26a69a', desc:'Störungen, Lösungen, Technik', restricted:false },
  { id:'redaktion', name:'Redaktions-Board',   icon:'✏️', color:'#e94560', desc:'Interne Redaktionsdiskussionen', restricted:true, minRole:'redaktion' },
  { id:'ankunden',  name:'Ankündigungen',      icon:'📢', color:'#cc0000', desc:'Offizielle Mitteilungen', restricted:true, minRole:'moderator' },
];

var DEFAULT_THREADS = [
  { id:'t1', catId:'allgemein', title:'Willkommen in der RailApp Community!',
    author:'Max Müller', authorRole:'admin', authorId:'u1',
    created:'01.04.2026 09:00', pinned:true, locked:false, views:142,
    posts:[{ id:'p1', author:'Max Müller', authorRole:'admin', authorId:'u1',
      text:'Herzlich willkommen! Hier könnt ihr euch über dienstliche Themen austauschen. Bitte bleibt respektvoll.',
      created:'01.04.2026 09:00', likes:12, likedBy:[] }] },
  { id:'t2', catId:'betrieb', title:'Frage zu KR 408 – Bremsprüfung',
    author:'Anna Schmidt', authorRole:'redaktion', authorId:'u2',
    created:'08.04.2026 14:22', pinned:false, locked:false, views:38,
    posts:[
      { id:'p2', author:'Anna Schmidt', authorRole:'redaktion', authorId:'u2',
        text:'Frage zur vereinfachten Bremsprüfung bei Zugverstärkungen nach KR 408. Wer hat Erfahrungen?',
        created:'08.04.2026 14:22', likes:3, likedBy:[] },
      { id:'p3', author:'Klaus Weber', authorRole:'redaktion', authorId:'u3',
        text:'Dazu gibt es in der 408.0481 einen eigenen Abschnitt. Ich schaue das morgen nach.',
        created:'08.04.2026 16:45', likes:5, likedBy:[] },
    ] },
  { id:'t3', catId:'technik', title:'ICE 4 – Störung Türsteuerung TAV',
    author:'Tom Fischer', authorRole:'nutzer', authorId:'u5',
    created:'10.04.2026 08:30', pinned:false, locked:false, views:55,
    posts:[
      { id:'p4', author:'Tom Fischer', authorRole:'nutzer', authorId:'u5',
        text:'Hatte gestern eine Störung an der TAV beim ICE 4. Seitenselektive Türsteuerung ausgefallen, Linie D. Hat jemand den Störungssuchplan?',
        created:'10.04.2026 08:30', likes:2, likedBy:[] },
      { id:'p5', author:'Sara Becker', authorRole:'moderator', authorId:'u4',
        text:'Schau ob Fehlercode F-TAV-014 angezeigt wird. Liegt meist an der SISTO-Einheit. Dokument 414.2506Z01 hilft weiter.',
        created:'10.04.2026 09:15', likes:8, likedBy:[], mod:true },
    ] },
];

var BR_DATA = [
  { s:'Übersicht' }, { n:'Alle Baureihen' }, { n:'BR Beschreibungen' },
  { s:'Sonder-Triebwagen' }, { n:'Steuerwagen Regio' }, { n:'Steuerwagen FV' }, { n:'Steuerwagen IC2' },
  { s:'E-Loks' }, { n:'Baureihe 101' }, { n:'Baureihe 103' }, { n:'Baureihe 110' }, { n:'Baureihe 111' },
  { n:'Baureihe 120' }, { n:'Baureihe 139/140' }, { n:'Baureihe 143' }, { n:'Baureihe 145' },
  { n:'Baureihe 146.0' }, { n:'Baureihe 146.1' }, { n:'Baureihe 146.2-3' }, { n:'Baureihe 146.5' },
  { n:'Baureihe 147' }, { n:'Baureihe 151' }, { n:'Baureihe 152' }, { n:'Baureihe 182' },
  { n:'Baureihe 185' }, { n:'Baureihe 186' }, { n:'Baureihe 187' }, { n:'Baureihe 193' },
  { s:'Triebzüge' }, { n:'Baureihe 425/426' }, { n:'Baureihe 427' }, { n:'Baureihe 430' },
  { n:'Baureihe 440' }, { n:'Baureihe 462' }, { n:'Baureihe 612' }, { n:'Baureihe 620/621' },
  { n:'Baureihe 642' }, { n:'Baureihe 648' }, { n:'Baureihe 1440' },
];

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
var App = {
  history: [],
  evu: null,
  currentUser: null,
  adminLoggedIn: false,
  telFilter: 'alle',
  speedMode: 'gps',
  currentCatId: null,
  currentThreadId: null,
};

// ─────────────────────────────────────────────
//  STORAGE HELPERS
// ─────────────────────────────────────────────
function lsGet(key, def) {
  try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch(e) { return def; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}

function getEVUs()    { return lsGet('app_evus',     DEFAULT_EVUS); }
function getUsers()   { return lsGet('app_users',    DEFAULT_USERS); }
function getModules() { return lsGet('app_modules',  ALL_MODULES.map(function(m){ return Object.assign({}, m, {visible:true}); })); }
function getSections(){ return lsGet('app_sections', []); }
function getFiles()   { return lsGet('app_files',    []); }
function getThreads() { return lsGet('forum_threads',DEFAULT_THREADS); }
function getLog()     { return lsGet('admin_log',    []); }

function saveUsers(u)   { lsSet('app_users', u); }
function saveThreads(t) { lsSet('forum_threads', t); }

function addLog(msg) {
  var log = getLog();
  log.unshift(new Date().toLocaleTimeString('de') + ' · ' + msg);
  lsSet('admin_log', log.slice(0, 30));
}

// ─────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────
function go(id) {
  var cur = document.querySelector('.screen.active');
  if (cur) { App.history.push(cur.id); cur.classList.remove('active'); }
  var next = document.getElementById(id);
  if (next) { next.classList.add('active'); window.scrollTo(0, 0); }
}

function back() {
  var prev = App.history.pop() || 'screen-main';
  var cur  = document.querySelector('.screen.active');
  if (cur) cur.classList.remove('active');
  var target = document.getElementById(prev);
  if (target) { target.classList.add('active'); window.scrollTo(0, 0); }
}

// ─────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────
var toastTimer;
function toast(msg, isErr) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'toast' + (isErr ? ' err' : '');
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { el.classList.remove('visible'); }, 2400);
}

// ─────────────────────────────────────────────
//  AUTH / LOGIN
// ─────────────────────────────────────────────
function doLogin() {
  var nr  = document.getElementById('inp-user').value.trim();
  var pw  = document.getElementById('inp-pass').value;
  var users = getUsers();
  var user  = users.find(function(u) { return u.nr === nr; });

  // Demo credentials
  var validDemo = (nr === '12345678' && pw === 'demo1234') ||
                  (nr === 'admin'    && pw === 'admin123');

  if (validDemo || (user && user.active)) {
    App.currentUser = user || DEFAULT_USERS[0];
    renderEVUGrid();
    go('screen-evu');
  } else {
    toast('Ungültige Zugangsdaten', true);
    document.getElementById('inp-pass').value = '';
  }
}

// ─────────────────────────────────────────────
//  EVU SELECTION
// ─────────────────────────────────────────────
function renderEVUGrid() {
  var evus = getEVUs();
  document.getElementById('evu-grid').innerHTML = evus.map(function(e) {
    return '<div class="evu-card" data-name="' + e.name + '" data-short="' + e.short + '">' +
      '<div class="evu-card-name">' + e.name + '</div>' +
      '<div class="evu-card-desc">' + e.desc + '</div>' +
    '</div>';
  }).join('');
  document.querySelectorAll('.evu-card').forEach(function(card) {
    card.addEventListener('click', function() {
      selectEVU(card.dataset.name, card.dataset.short);
    });
  });
}

function selectEVU(name, short) {
  App.evu = { name: name, short: short };
  document.getElementById('main-evu-label').textContent = short;
  document.getElementById('settings-evu').textContent   = name;
  renderMainMenu();
  renderDynamicSections();
  App.history = [];
  go('screen-main');
  toast('✓ ' + name);
}

// ─────────────────────────────────────────────
//  MAIN MENU
// ─────────────────────────────────────────────
function renderMainMenu() {
  var mods = getModules().filter(function(m) { return m.visible !== false; });
  // prepend EVU module
  var evuLabel = App.evu ? '🚄 ' + App.evu.name.split(' ').slice(0,2).join(' ') : '🚄 EVU';
  document.getElementById('main-modules').innerHTML =
    '<button class="bli sos-btn" data-screen="screen-evu">' + evuLabel + '</button>' +
    mods.map(function(m) {
      return '<button class="bli' + (m.sos ? ' sos-btn' : '') + '" data-screen="' + m.screen + '">' + m.label + '</button>';
    }).join('');
  document.querySelectorAll('#main-modules .bli').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var screen = btn.dataset.screen;
      if (screen === 'screen-forum') renderForum();
      go(screen);
    });
  });
}

// ─────────────────────────────────────────────
//  DYNAMIC SECTIONS (admin-added content)
// ─────────────────────────────────────────────
function fileIcon(type) {
  if (!type) return '📄';
  if (type.indexOf('pdf') > -1) return '📕';
  if (type.indexOf('word') > -1 || type.indexOf('docx') > -1) return '📘';
  if (type.indexOf('sheet') > -1 || type.indexOf('xlsx') > -1) return '📗';
  if (type.indexOf('image') > -1) return '🖼️';
  return '📄';
}

function renderDynamicSections() {
  var sections = getSections();
  var files    = getFiles();
  var targets  = ['bf','regelwerke','betrieb','la','zugfahrt'];
  targets.forEach(function(target) {
    var el = document.getElementById(target + '-dynamic');
    if (!el) return;
    var secs = sections.filter(function(s) { return s.module === target; });
    el.innerHTML = secs.map(function(sec) {
      var sf = files.filter(function(f) { return f.sectionId === sec.id; });
      return '<div class="dyn-sec-header">' + sec.icon + ' ' + sec.name + '</div>' +
        (sf.length === 0 ? '<div class="dyn-empty">Keine Dateien</div>' :
          sf.map(function(f) {
            return '<div class="dyn-file-row">' +
              '<span class="dyn-file-icon">' + fileIcon(f.type) + '</span>' +
              '<div class="dyn-file-body">' +
                '<div class="dyn-file-name">' + f.name + '</div>' +
                '<div class="dyn-file-meta">' + (f.desc || '') + ' · ' + f.size + ' · ' + f.date + '</div>' +
              '</div>' +
            '</div>';
          }).join('')
        );
    }).join('');
  });
}

// ─────────────────────────────────────────────
//  BAUREIHEN
// ─────────────────────────────────────────────
function renderBaureihen() {
  document.getElementById('br-grid').innerHTML = BR_DATA.map(function(b) {
    if (b.s) return '<div class="br-section">' + b.s + '</div>';
    return '<div class="br-card" data-toast="' + b.n + '">' +
      '<div class="br-name">' + b.n + '</div>' +
      '<div class="br-links">Kennblatt · Talarbeit · AH</div>' +
    '</div>';
  }).join('');
}

// ─────────────────────────────────────────────
//  TELEFONBUCH
// ─────────────────────────────────────────────
function telSetFilter(filter, el) {
  App.telFilter = filter;
  document.querySelectorAll('.ftab').forEach(function(t) { t.classList.remove('active'); });
  el.classList.add('active');
  telSearch();
}

function telSearch() {
  var name  = document.getElementById('tel-name').value.trim().toLowerCase();
  var rl    = document.getElementById('tel-rl').value.trim().toLowerCase();
  var full  = document.getElementById('tel-full').checked;
  var info  = document.getElementById('tel-info');
  var list  = document.getElementById('tel-list');

  if (!name && !rl) {
    info.textContent = 'Suchbegriff eingeben …';
    list.innerHTML   = '';
    document.getElementById('tel-count').textContent = typeof TELDB !== 'undefined' ? TELDB.length.toLocaleString('de') : '–';
    return;
  }

  if (typeof TELDB === 'undefined') {
    info.textContent = 'Daten werden geladen …';
    return;
  }

  var res = TELDB;
  if (name) {
    if (full) {
      res = res.filter(function(r) {
        return Object.values(r).some(function(v) { return v && v.toLowerCase().indexOf(name) > -1; });
      });
    } else {
      res = res.filter(function(r) {
        return (r.ort||'').toLowerCase().indexOf(name) > -1 ||
               (r.lastr||'').toLowerCase().indexOf(name) > -1 ||
               (r.fdl||'').toLowerCase().indexOf(name) > -1;
      });
    }
  }
  if (rl) {
    res = res.filter(function(r) { return (r.rl100||'').toLowerCase().indexOf(rl) > -1; });
  }
  if (App.telFilter !== 'alle') {
    res = res.filter(function(r) { return r[App.telFilter] && r[App.telFilter].trim(); });
  }

  var shown = res.slice(0, 150);
  document.getElementById('tel-count').textContent = res.length.toLocaleString('de') + ' gefunden';
  info.textContent = res.length + ' Ergebnis' + (res.length !== 1 ? 'se' : '') +
    (res.length > 150 ? ' · Zeige erste 150' : '');

  if (res.length === 0) {
    list.innerHTML = '<div class="tel-empty">Keine Einträge gefunden</div>';
    return;
  }

  list.innerHTML = shown.map(function(r) {
    var nums = '';
    if (r.telefon)  nums += '<span class="nbadge ntel"><span class="nl">Tel</span>' + r.telefon + '</span>';
    if (r.mobil)    nums += '<span class="nbadge nmob"><span class="nl">Mob</span>' + r.mobil + '</span>';
    if (r.basa)     nums += '<span class="nbadge nbas"><span class="nl">Basa</span>' + r.basa + '</span>';
    if (r.langwahl) nums += '<span class="nbadge nlng"><span class="nl">Lang</span>' + r.langwahl + '</span>';
    if (r.gsmr)     nums += '<span class="nbadge ngsm"><span class="nl">GSM-R</span>' + r.gsmr + '</span>';
    if (r.ortsfunk) nums += '<span class="nbadge nort"><span class="nl">Funk</span>' + r.ortsfunk + '</span>';
    return '<div class="tel-entry" data-id="' + r.id + '">' +
      '<div class="tel-head">' +
        '<span class="tel-rl100">' + (r.rl100 || '–') + '</span>' +
        '<span class="tel-ort">' + r.ort + '</span>' +
      '</div>' +
      '<div class="tel-sub">' + (r.lastr || '') + (r.fdl ? ' · ' + r.fdl : '') + '</div>' +
      '<div class="tel-nums">' + nums + '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.tel-entry').forEach(function(el) {
    el.addEventListener('click', function() { showTelDetail(parseInt(el.dataset.id)); });
  });
}

function showTelDetail(id) {
  if (typeof TELDB === 'undefined') return;
  var r = TELDB.find(function(x) { return x.id === id; });
  if (!r) return;
  var fields = [
    {l:'Festnetz',        k:'telefon',  call:true},
    {l:'Mobilnetz',       k:'mobil',    call:true},
    {l:'Basa',            k:'basa'},
    {l:'Langwahl',        k:'langwahl'},
    {l:'GSM-R',           k:'gsmr'},
    {l:'Ortsfunk',        k:'ortsfunk'},
    {l:'Fax',             k:'fax'},
    {l:'FDL / Bezeichnung',k:'fdl'},
  ];
  var rows = fields.filter(function(f) { return r[f.key || f.k]; }).map(function(f) {
    var val = r[f.key || f.k];
    return '<div class="det-row">' +
      '<div><div class="det-lbl">' + f.l + '</div><div class="det-val">' + val + '</div></div>' +
      (f.call ? '<button class="call-btn" data-num="' + val + '">📞</button>' : '') +
    '</div>';
  }).join('');

  document.getElementById('det-content').innerHTML =
    '<div class="det-ort">' + r.ort + '</div>' +
    '<div class="det-lastr">' + (r.lastr||'') + '</div>' +
    '<div class="det-rl">' + (r.rl100||'–') + '</div>' +
    (rows || '<div class="det-empty">Keine Nummern</div>');

  document.querySelectorAll('.call-btn').forEach(function(b) {
    b.addEventListener('click', function() { toast('📞 ' + b.dataset.num); });
  });
  openOverlay('overlay');
}

// ─────────────────────────────────────────────
//  WEG / ZEIT RECHNER
// ─────────────────────────────────────────────
function calcWegzeit() {
  var v  = App.speedMode === 'manual' ? parseFloat(document.getElementById('inp-spd').value) : 80;
  var s  = parseFloat(document.getElementById('inp-s').value);
  var t  = parseFloat(document.getElementById('inp-t').value);
  var el = document.getElementById('res-wz');
  el.style.display = 'block';
  if (!isNaN(s) && isNaN(t)) {
    el.innerHTML = 'Fahrzeit: <strong>' + (s / v * 60).toFixed(1) + ' min</strong><br><small>bei ' + v + ' km/h über ' + s + ' km</small>';
  } else if (!isNaN(t) && isNaN(s)) {
    el.innerHTML = 'Strecke: <strong>' + (v * t / 60).toFixed(2) + ' km</strong>';
  } else {
    el.innerHTML = '⚠️ Bitte Strecke ODER Zeit eingeben';
  }
}

function calcVSoll() {
  var s  = parseFloat(document.getElementById('inp-s2').value);
  var t  = parseFloat(document.getElementById('inp-t2').value);
  var el = document.getElementById('res-vs');
  el.style.display = 'block';
  if (!isNaN(s) && !isNaN(t) && t > 0) {
    el.innerHTML = 'V-Soll: <strong>' + (s / t * 60).toFixed(1) + ' km/h</strong>';
  } else {
    el.innerHTML = '⚠️ Strecke und Zeit eingeben';
  }
}

// ─────────────────────────────────────────────
//  OVERLAY HELPERS
// ─────────────────────────────────────────────
function openOverlay(id) {
  document.getElementById(id).classList.add('open');
}
function closeOverlay(id) {
  document.getElementById(id).classList.remove('open');
}

// ─────────────────────────────────────────────
//  FORUM
// ─────────────────────────────────────────────
function canAccessCat(cat) {
  if (!cat.restricted) return true;
  if (!App.currentUser) return false;
  var myLevel   = (ROLES[App.currentUser.role] || ROLES.nutzer).level;
  var reqLevel  = (ROLES[cat.minRole] || ROLES.admin).level;
  return myLevel >= reqLevel;
}

function renderForum() {
  var threads    = getThreads();
  var totalPosts = threads.reduce(function(sum, t) { return sum + t.posts.length; }, 0);
  var activeUsers = getUsers().filter(function(u) { return u.active; }).length;

  document.getElementById('forum-content').innerHTML =
    '<div class="forum-hero">' +
      '<h2>Community Forum</h2>' +
      '<p>Austausch unter allen RailApp-Nutzern</p>' +
      '<div class="forum-stats">' +
        '<div class="fstat"><div class="fstat-num">' + threads.length + '</div><div class="fstat-lbl">Threads</div></div>' +
        '<div class="fstat"><div class="fstat-num">' + totalPosts + '</div><div class="fstat-lbl">Beiträge</div></div>' +
        '<div class="fstat"><div class="fstat-num">' + activeUsers + '</div><div class="fstat-lbl">Nutzer</div></div>' +
      '</div>' +
    '</div>' +
    FORUM_CATEGORIES.map(function(cat) {
      var ok        = canAccessCat(cat);
      var catThreads = threads.filter(function(t) { return t.catId === cat.id; });
      var catPosts  = catThreads.reduce(function(sum, t) { return sum + t.posts.length; }, 0);
      return '<div class="forum-cat-card' + (ok ? '' : ' locked') + '" ' +
        'data-cat-id="' + cat.id + '" data-ok="' + (ok ? '1' : '0') + '">' +
        '<div class="forum-cat-icon" style="background:' + cat.color + '22;color:' + cat.color + '">' + cat.icon + '</div>' +
        '<div class="forum-cat-body">' +
          '<div class="forum-cat-name">' + cat.name +
            (cat.restricted ? '<span class="lock-badge">🔒</span>' : '') + '</div>' +
          '<div class="forum-cat-desc">' + cat.desc + '</div>' +
        '</div>' +
        '<div class="forum-cat-meta">' +
          '<div class="forum-cat-count">' + catThreads.length + '</div>' +
          '<div class="forum-cat-sub">' + catPosts + ' Beitr.</div>' +
        '</div>' +
      '</div>';
    }).join('');

  document.querySelectorAll('.forum-cat-card').forEach(function(el) {
    el.addEventListener('click', function() {
      if (el.dataset.ok !== '1') { toast('Kein Zugriff auf diese Kategorie', true); return; }
      openForumCat(el.dataset.catId);
    });
  });
}

function openForumCat(catId) {
  App.currentCatId = catId;
  var cat     = FORUM_CATEGORIES.find(function(c) { return c.id === catId; });
  var threads = getThreads().filter(function(t) { return t.catId === catId; });
  threads.sort(function(a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });

  document.getElementById('forum-cat-title').textContent = cat.icon + ' ' + cat.name;
  document.getElementById('forum-cat-content').innerHTML = threads.length === 0
    ? '<div class="forum-empty">Noch keine Threads.<br>' +
      '<span class="link-btn" id="first-thread-link">Ersten Thread erstellen +</span></div>'
    : threads.map(function(t) {
        var initials = t.author.split(' ').map(function(n) { return n[0]; }).join('').slice(0, 2);
        return '<div class="thread-card' + (t.pinned ? ' pinned' : '') + '" data-tid="' + t.id + '">' +
          '<div class="thread-avatar">' + initials + '</div>' +
          '<div class="thread-body">' +
            '<div class="thread-title">' +
              (t.pinned ? '📌 ' : '') + (t.locked ? '🔒 ' : '') + t.title +
            '</div>' +
            '<div class="thread-preview">' + (t.posts[0] ? t.posts[0].text.slice(0, 90) + '…' : '') + '</div>' +
            '<div class="thread-meta">' +
              '<span>' + t.author + '</span>' +
              '<span class="role-pill ' + t.authorRole + '">' + (ROLES[t.authorRole]||ROLES.nutzer).label + '</span>' +
              '<span>' + t.created + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="thread-count">' + t.posts.length + '<br><span>💬</span></div>' +
        '</div>';
      }).join('');

  document.querySelectorAll('.thread-card').forEach(function(el) {
    el.addEventListener('click', function() { openThread(el.dataset.tid); });
  });
  var fl = document.getElementById('first-thread-link');
  if (fl) fl.addEventListener('click', function() { showNewThreadOverlay(); });
  go('screen-forum-cat');
}

function openThread(tid) {
  App.currentThreadId = tid;
  var threads = getThreads();
  var t = threads.find(function(x) { return x.id === tid; });
  if (!t) return;
  t.views++;
  saveThreads(threads);

  document.getElementById('forum-thread-title').textContent = t.title;
  document.getElementById('forum-thread-posts').innerHTML = t.posts.map(function(p, pi) {
    var isOP     = pi === 0;
    var initials = p.author.split(' ').map(function(n) { return n[0]; }).join('').slice(0, 2);
    return '<div class="post-item' + (isOP ? ' op' : '') + (p.mod ? ' mod' : '') + '">' +
      '<div class="post-header">' +
        '<div class="post-avatar' + (isOP ? ' op-avatar' : '') + '">' + initials + '</div>' +
        '<div class="post-meta">' +
          '<span class="post-author">' + p.author + '</span>' +
          (p.mod ? '<span class="mod-badge">MOD</span>' : '') +
          '<span class="role-pill ' + p.authorRole + '">' + (ROLES[p.authorRole]||ROLES.nutzer).label + '</span>' +
        '</div>' +
        (isOP ? '<span class="op-badge">OP</span>' : '') +
        '<span class="post-time">' + p.created + '</span>' +
      '</div>' +
      '<div class="post-text">' + p.text.replace(/\n/g, '<br>') + '</div>' +
      '<div class="post-actions">' +
        '<button class="post-btn like-btn' + (p.likedBy && p.likedBy.indexOf('u1') > -1 ? ' liked' : '') +
          '" data-pid="' + p.id + '" data-tid="' + tid + '">♥ <span>' + p.likes + '</span></button>' +
        '<button class="post-btn quote-btn" data-pid="' + p.id + '">Zitieren</button>' +
      '</div>' +
    '</div>';
  }).join('');

  document.querySelectorAll('.like-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { likePost(btn.dataset.tid, btn.dataset.pid, btn); });
  });
  document.querySelectorAll('.quote-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var t2 = getThreads().find(function(x) { return x.id === btn.dataset.tid; });
      var p  = t2 && t2.posts.find(function(x) { return x.id === btn.dataset.pid; });
      if (p) document.getElementById('reply-text').value = '[Zitat: ' + p.author + ']\n"' + p.text.slice(0, 80) + '..."\n\n';
    });
  });

  var replyArea = document.getElementById('reply-area');
  replyArea.style.opacity        = t.locked ? '.4' : '1';
  replyArea.style.pointerEvents  = t.locked ? 'none' : '';
  go('screen-forum-thread');
}

function likePost(tid, pid, btn) {
  var threads = getThreads();
  var t = threads.find(function(x) { return x.id === tid; });
  if (!t) return;
  var p = t.posts.find(function(x) { return x.id === pid; });
  if (!p) return;
  if (!p.likedBy) p.likedBy = [];
  var uid = App.currentUser ? App.currentUser.id : 'u1';
  var idx = p.likedBy.indexOf(uid);
  if (idx > -1) { p.likes--; p.likedBy.splice(idx, 1); btn.classList.remove('liked'); }
  else          { p.likes++; p.likedBy.push(uid);       btn.classList.add('liked'); }
  btn.querySelector('span').textContent = p.likes;
  saveThreads(threads);
}

function postReply() {
  var text = document.getElementById('reply-text').value.trim();
  if (!text) { toast('Antwort eingeben', true); return; }
  var threads = getThreads();
  var t = threads.find(function(x) { return x.id === App.currentThreadId; });
  if (!t || t.locked) { toast('Thread ist gesperrt', true); return; }
  var me  = App.currentUser || DEFAULT_USERS[0];
  var now = new Date().toLocaleDateString('de') + ' ' +
            new Date().toLocaleTimeString('de', {hour:'2-digit', minute:'2-digit'});
  t.posts.push({
    id: 'p' + Date.now(), author: me.name, authorRole: me.role, authorId: me.id,
    text: text, created: now, likes: 0, likedBy: []
  });
  saveThreads(threads);
  document.getElementById('reply-text').value = '';
  openThread(App.currentThreadId);
  toast('✓ Antwort gepostet');
}

function showNewThreadOverlay() {
  var cats = FORUM_CATEGORIES.filter(canAccessCat);
  document.getElementById('thread-overlay-content').innerHTML =
    '<h3 class="overlay-title">Neuer Thread</h3>' +
    '<label class="form-label">Kategorie</label>' +
    '<select class="form-select" id="nt-cat">' +
      cats.map(function(c) {
        return '<option value="' + c.id + '"' + (c.id === App.currentCatId ? ' selected' : '') + '>' + c.icon + ' ' + c.name + '</option>';
      }).join('') +
    '</select>' +
    '<label class="form-label">Titel</label>' +
    '<input class="form-input" id="nt-title" type="text" placeholder="Aussagekräftiger Titel …">' +
    '<label class="form-label">Beitrag</label>' +
    '<textarea class="form-textarea" id="nt-text" placeholder="Dein Beitrag …"></textarea>' +
    '<button class="primary-btn" id="btn-create-thread">Thread erstellen</button>';
  openOverlay('thread-overlay');
  document.getElementById('btn-create-thread').addEventListener('click', createThread);
}

function createThread() {
  var catId = document.getElementById('nt-cat').value;
  var title = document.getElementById('nt-title').value.trim();
  var text  = document.getElementById('nt-text').value.trim();
  if (!title || !text) { toast('Titel und Beitrag erforderlich', true); return; }
  var me  = App.currentUser || DEFAULT_USERS[0];
  var now = new Date().toLocaleDateString('de') + ' ' +
            new Date().toLocaleTimeString('de', {hour:'2-digit', minute:'2-digit'});
  var threads = getThreads();
  threads.push({
    id: 't' + Date.now(), catId: catId, title: title,
    author: me.name, authorRole: me.role, authorId: me.id,
    created: now, pinned: false, locked: false, views: 0,
    posts: [{ id: 'p' + Date.now(), author: me.name, authorRole: me.role, authorId: me.id,
              text: text, created: now, likes: 0, likedBy: [] }]
  });
  saveThreads(threads);
  closeOverlay('thread-overlay');
  addLog('Thread erstellt: ' + title);
  App.currentCatId = catId;
  openForumCat(catId);
  toast('✓ Thread erstellt');
}

// ─────────────────────────────────────────────
//  ADMIN – LOGIN
// ─────────────────────────────────────────────
function goAdmin() {
  go('screen-admin');
  if (App.adminLoggedIn) showAdminPanel();
}

function adminLogin() {
  var u = document.getElementById('a-user').value.trim();
  var p = document.getElementById('a-pass').value;
  if ((u === 'admin' || u === '12345678') && p === 'admin123') {
    App.adminLoggedIn = true;
    showAdminPanel();
    toast('✓ Admin-Zugang');
  } else {
    toast('Falsches Passwort', true);
  }
}

function adminLogout() {
  App.adminLoggedIn = false;
  document.getElementById('admin-login-wrap').style.display = '';
  document.getElementById('admin-panel-wrap').style.display  = 'none';
  back();
}

function showAdminPanel() {
  document.getElementById('admin-login-wrap').style.display = 'none';
  document.getElementById('admin-panel-wrap').style.display  = 'flex';
  adminTab('stats', document.querySelector('.admin-nav-btn[data-tab="stats"]'));
}

// ─────────────────────────────────────────────
//  ADMIN – TABS
// ─────────────────────────────────────────────
function adminTab(tabId, btn) {
  document.querySelectorAll('.admin-nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.admin-panel').forEach(function(p) { p.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var panel = document.getElementById('ap-' + tabId);
  if (panel) panel.classList.add('active');

  if (tabId === 'stats')    renderAdminStats();
  if (tabId === 'module')   renderAdminModules();
  if (tabId === 'sections') renderAdminSections();
  if (tabId === 'upload')   renderUploadTargets();
  if (tabId === 'evu')      renderAdminEVU();
  if (tabId === 'users')    renderUserList();
}

// ─────────────────────────────────────────────
//  ADMIN – STATS
// ─────────────────────────────────────────────
function renderAdminStats() {
  var users    = getUsers();
  var files    = getFiles();
  var sections = getSections();
  var evus     = getEVUs();
  var threads  = getThreads();
  var log      = getLog();

  set('stat-users',   users.filter(function(u) { return u.active; }).length);
  set('stat-evus',    evus.length);
  set('stat-files',   files.length);
  set('stat-sections',sections.length);
  set('stat-threads', threads.length);

  document.getElementById('admin-log').innerHTML = log.length
    ? log.map(function(l) { return '<div class="log-entry">→ ' + l + '</div>'; }).join('')
    : '<div class="log-empty">Noch keine Aktivitäten</div>';
}

function set(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─────────────────────────────────────────────
//  ADMIN – MODULES
// ─────────────────────────────────────────────
function renderAdminModules() {
  var mods = getModules();
  document.getElementById('amod-list').innerHTML = mods.map(function(m, i) {
    return '<div class="amod-item">' +
      '<div class="amod-info">' +
        '<div class="amod-name">' + m.label + '</div>' +
        '<div class="amod-sub">' + m.screen + '</div>' +
      '</div>' +
      '<div class="toggle' + (m.visible !== false ? ' on' : '') + '" data-idx="' + i + '"></div>' +
    '</div>';
  }).join('');
  document.querySelectorAll('.amod-item .toggle').forEach(function(tog) {
    tog.addEventListener('click', function() { tog.classList.toggle('on'); });
  });
}

function saveModules() {
  var mods = getModules();
  document.querySelectorAll('.amod-item .toggle').forEach(function(tog, i) {
    mods[i].visible = tog.classList.contains('on');
  });
  lsSet('app_modules', mods);
  renderMainMenu();
  addLog('Module-Sichtbarkeit gespeichert');
  toast('✓ Module gespeichert');
}

// ─────────────────────────────────────────────
//  ADMIN – SECTIONS
// ─────────────────────────────────────────────
function renderAdminSections() {
  var sections = getSections();
  var files    = getFiles();
  var list     = document.getElementById('asec-list');

  if (sections.length === 0) {
    list.innerHTML = '<div class="empty-msg">Noch keine Abschnitte. Erstelle den ersten unten.</div>';
    return;
  }
  list.innerHTML = sections.map(function(sec) {
    var sf = files.filter(function(f) { return f.sectionId === sec.id; });
    return '<div class="asec-item" id="sec-' + sec.id + '">' +
      '<div class="asec-header" data-sec="' + sec.id + '">' +
        '<span>' + sec.icon + '</span>' +
        '<span class="asec-name">' + sec.name + '</span>' +
        '<span class="asec-meta">' + sec.module + ' · ' + sf.length + ' Datei(en)</span>' +
        '<span class="asec-chevron">▾</span>' +
        '<button class="icon-btn danger" data-del-sec="' + sec.id + '">🗑</button>' +
      '</div>' +
      '<div class="asec-files">' +
        (sf.length === 0 ? '<div class="empty-msg">Keine Dateien</div>' :
          sf.map(function(f) {
            return '<div class="afile-row">' +
              fileIcon(f.type) + ' ' +
              '<span class="afile-name">' + f.name + '</span>' +
              '<span class="afile-type">' + (f.type||'').split('/').pop() + '</span>' +
              '<span class="afile-size">' + f.size + '</span>' +
              '<button class="icon-btn danger" data-del-file="' + f.id + '">🗑</button>' +
            '</div>';
          }).join('')
        ) +
      '</div>' +
    '</div>';
  }).join('');

  document.querySelectorAll('.asec-header').forEach(function(hdr) {
    hdr.addEventListener('click', function(e) {
      if (e.target.closest('.icon-btn')) return;
      document.getElementById('sec-' + hdr.dataset.sec).classList.toggle('open');
    });
  });
  document.querySelectorAll('[data-del-sec]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!confirm('Abschnitt löschen?')) return;
      lsSet('app_sections', getSections().filter(function(s) { return s.id !== btn.dataset.delSec; }));
      lsSet('app_files',    getFiles().filter(function(f)    { return f.sectionId !== btn.dataset.delSec; }));
      addLog('Abschnitt gelöscht');
      renderAdminSections(); renderDynamicSections(); renderAdminStats();
      toast('🗑 Abschnitt gelöscht');
    });
  });
  document.querySelectorAll('[data-del-file]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (!confirm('Datei löschen?')) return;
      lsSet('app_files', getFiles().filter(function(f) { return f.id !== btn.dataset.delFile; }));
      addLog('Datei gelöscht');
      renderAdminSections(); renderDynamicSections(); renderAdminStats();
      toast('🗑 Datei gelöscht');
    });
  });
}

function addSection() {
  var name = document.getElementById('new-sec-name').value.trim();
  var mod  = document.getElementById('new-sec-module').value;
  var icon = document.getElementById('new-sec-icon').value.trim() || '📁';
  if (!name) { toast('Name fehlt!', true); return; }
  var secs = getSections();
  secs.push({ id: Date.now().toString(), name: name, module: mod, icon: icon });
  lsSet('app_sections', secs);
  document.getElementById('new-sec-name').value = '';
  addLog('Abschnitt erstellt: ' + name);
  renderAdminSections(); renderDynamicSections(); renderAdminStats(); renderUploadTargets();
  toast('✓ Abschnitt "' + name + '" erstellt');
}

// ─────────────────────────────────────────────
//  ADMIN – UPLOAD
// ─────────────────────────────────────────────
var pendingFiles = [];

function renderUploadTargets() {
  var secs = getSections();
  var sel  = document.getElementById('upload-target-sec');
  if (!sel) return;
  sel.innerHTML = secs.length === 0
    ? '<option value="">– Erst Abschnitt erstellen –</option>'
    : secs.map(function(s) { return '<option value="' + s.id + '">' + s.icon + ' ' + s.name + ' (' + s.module + ')</option>'; }).join('');
}

function addPendingFiles(flist) {
  Array.from(flist).forEach(function(f) {
    if (!pendingFiles.find(function(p) { return p.name === f.name; })) pendingFiles.push(f);
  });
  renderUploadQueue();
}

function renderUploadQueue() {
  document.getElementById('upload-queue').innerHTML = pendingFiles.map(function(f, i) {
    return '<div class="uq-item">' +
      fileIcon(f.type) + ' ' +
      '<span class="uq-name">' + f.name + '</span>' +
      '<span class="uq-size">' + (f.size / 1024).toFixed(1) + ' KB</span>' +
      '<button class="icon-btn" data-qi="' + i + '">✕</button>' +
    '</div>';
  }).join('');
  document.querySelectorAll('[data-qi]').forEach(function(btn) {
    btn.addEventListener('click', function() { pendingFiles.splice(parseInt(btn.dataset.qi), 1); renderUploadQueue(); });
  });
  document.getElementById('upload-btn').style.display = pendingFiles.length > 0 ? '' : 'none';
}

function doUpload() {
  var secId = document.getElementById('upload-target-sec').value;
  var desc  = document.getElementById('upload-desc').value.trim();
  if (!secId)              { toast('Abschnitt wählen', true); return; }
  if (!pendingFiles.length){ toast('Keine Dateien', true);    return; }
  var files = getFiles();
  pendingFiles.forEach(function(f) {
    files.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
      sectionId: secId, name: f.name, type: f.type || 'application/octet-stream',
      size: (f.size / 1024).toFixed(1) + ' KB', desc: desc,
      date: new Date().toLocaleDateString('de')
    });
    addLog('Datei hochgeladen: ' + f.name);
  });
  lsSet('app_files', files);
  pendingFiles = [];
  renderUploadQueue();
  document.getElementById('upload-desc').value = '';
  renderAdminSections(); renderDynamicSections(); renderAdminStats();
  toast('✓ Dateien gespeichert');
}

// ─────────────────────────────────────────────
//  ADMIN – EVU MANAGER
// ─────────────────────────────────────────────
function renderAdminEVU() {
  document.getElementById('aevu-list').innerHTML = getEVUs().map(function(e) {
    return '<div class="aevu-item">' +
      '<div class="aevu-body"><div class="aevu-name">' + e.name + '</div>' +
      '<div class="aevu-desc">' + e.short + ' · ' + e.desc + '</div></div>' +
      '<button class="icon-btn danger" data-del-evu="' + e.id + '">🗑</button>' +
    '</div>';
  }).join('');
  document.querySelectorAll('[data-del-evu]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (!confirm('EVU löschen?')) return;
      lsSet('app_evus', getEVUs().filter(function(e) { return e.id !== btn.dataset.delEvu; }));
      addLog('EVU gelöscht');
      renderAdminEVU(); renderEVUGrid(); renderAdminStats();
      toast('🗑 EVU gelöscht');
    });
  });
}

function addEVU() {
  var name  = document.getElementById('new-evu-name').value.trim();
  var short = document.getElementById('new-evu-short').value.trim().toUpperCase();
  var desc  = document.getElementById('new-evu-desc').value.trim();
  if (!name || !short) { toast('Name und Kürzel erforderlich', true); return; }
  var evus = getEVUs();
  evus.push({ id: 'evu_' + Date.now(), name: name, short: short, desc: desc });
  lsSet('app_evus', evus);
  document.getElementById('new-evu-name').value  = '';
  document.getElementById('new-evu-short').value = '';
  document.getElementById('new-evu-desc').value  = '';
  addLog('EVU hinzugefügt: ' + name);
  renderAdminEVU(); renderEVUGrid(); renderAdminStats();
  toast('✓ ' + name + ' hinzugefügt');
}

// ─────────────────────────────────────────────
//  ADMIN – USER MANAGEMENT
// ─────────────────────────────────────────────
function renderUserList() {
  var users       = getUsers();
  var search      = (document.getElementById('user-search').value || '').toLowerCase();
  var roleFilter  = document.getElementById('user-role-filter').value;

  var filtered = users.filter(function(u) {
    var matchSearch = !search || u.name.toLowerCase().indexOf(search) > -1 || u.nr.indexOf(search) > -1;
    var matchRole   = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Stat row
  var stats = { admin:0, redaktion:0, moderator:0, nutzer:0 };
  users.forEach(function(u) { if (stats[u.role] !== undefined) stats[u.role]++; });
  document.getElementById('user-stats-row').innerHTML =
    '<div class="ustat"><div class="ustat-num">' + users.length + '</div><div class="ustat-lbl">Gesamt</div></div>' +
    '<div class="ustat"><div class="ustat-num ac">' + stats.admin + '</div><div class="ustat-lbl">Admin</div></div>' +
    '<div class="ustat"><div class="ustat-num teal">' + stats.redaktion + '</div><div class="ustat-lbl">Redaktion</div></div>' +
    '<div class="ustat"><div class="ustat-num amber">' + stats.moderator + '</div><div class="ustat-lbl">Moderator</div></div>' +
    '<div class="ustat"><div class="ustat-num muted">' + stats.nutzer + '</div><div class="ustat-lbl">Nutzer</div></div>';

  if (filtered.length === 0) {
    document.getElementById('user-list').innerHTML = '<div class="empty-msg">Keine Nutzer gefunden</div>';
    return;
  }
  document.getElementById('user-list').innerHTML = filtered.map(function(u) {
    var role = ROLES[u.role] || ROLES.nutzer;
    return '<div class="user-card" data-uid="' + u.id + '">' +
      '<div class="user-avatar role-' + u.role + '">' + u.avatar + '</div>' +
      '<div class="user-card-body">' +
        '<div class="user-card-name">' + u.name + '</div>' +
        '<div class="user-card-meta">' +
          '<span class="role-pill ' + u.role + '">' + role.icon + ' ' + role.label + '</span>' +
          '<span>Nr. ' + u.nr + '</span>' +
          '<span>' + u.evu + '</span>' +
        '</div>' +
        '<div class="user-card-login">Login: ' + u.lastLogin + '</div>' +
      '</div>' +
      '<div class="user-status-dot ' + (u.active ? 'active' : 'inactive') + '"></div>' +
    '</div>';
  }).join('');

  document.querySelectorAll('.user-card').forEach(function(card) {
    card.addEventListener('click', function() { showUserDetail(card.dataset.uid); });
  });
}

function showUserDetail(uid) {
  var users = getUsers();
  var u     = users.find(function(x) { return x.id === uid; });
  if (!u) return;
  var role  = ROLES[u.role] || ROLES.nutzer;

  document.getElementById('user-detail-content').innerHTML =
    '<div class="user-detail-header">' +
      '<div class="user-avatar role-' + u.role + '" style="width:48px;height:48px;font-size:17px;">' + u.avatar + '</div>' +
      '<div>' +
        '<div style="font-size:17px;font-weight:700;">' + u.name + '</div>' +
        '<div class="role-pill ' + u.role + '" style="margin-top:4px;">' + role.icon + ' ' + role.label + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="user-detail-grid">' +
      '<div class="detail-info-box"><div class="dib-label">Personalnr.</div>' + u.nr + '</div>' +
      '<div class="detail-info-box"><div class="dib-label">EVU</div>' + u.evu + '</div>' +
      '<div class="detail-info-box"><div class="dib-label">Erstellt</div>' + u.created + '</div>' +
      '<div class="detail-info-box"><div class="dib-label">Letzter Login</div>' + u.lastLogin + '</div>' +
    '</div>' +
    '<label class="form-label">Rolle ändern</label>' +
    '<select class="form-select" id="ud-role">' +
      Object.keys(ROLES).map(function(r) {
        return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + ROLES[r].icon + ' ' + ROLES[r].label + '</option>';
      }).join('') +
    '</select>' +
    '<div class="user-detail-actions">' +
      '<button class="primary-btn" id="btn-save-user">💾 Speichern</button>' +
      '<button class="secondary-btn" id="btn-toggle-user">' + (u.active ? '🚫 Deaktivieren' : '✅ Aktivieren') + '</button>' +
      '<button class="danger-btn" id="btn-del-user">🗑 Löschen</button>' +
    '</div>';

  document.getElementById('btn-save-user').addEventListener('click', function() {
    var newRole = document.getElementById('ud-role').value;
    var users2  = getUsers();
    var idx     = users2.findIndex(function(x) { return x.id === uid; });
    if (idx > -1) { users2[idx].role = newRole; saveUsers(users2); }
    addLog('Nutzer bearbeitet: ' + u.name);
    closeOverlay('user-detail-overlay');
    renderUserList();
    toast('✓ ' + u.name + ' gespeichert');
  });
  document.getElementById('btn-toggle-user').addEventListener('click', function() {
    var users2 = getUsers();
    var idx    = users2.findIndex(function(x) { return x.id === uid; });
    if (idx > -1) { users2[idx].active = !users2[idx].active; saveUsers(users2); }
    addLog((u.active ? 'Deaktiviert: ' : 'Aktiviert: ') + u.name);
    closeOverlay('user-detail-overlay');
    renderUserList();
    toast('✓ Status geändert');
  });
  document.getElementById('btn-del-user').addEventListener('click', function() {
    if (!confirm('Nutzer "' + u.name + '" wirklich löschen?')) return;
    saveUsers(getUsers().filter(function(x) { return x.id !== uid; }));
    addLog('Nutzer gelöscht: ' + u.name);
    closeOverlay('user-detail-overlay');
    renderUserList(); renderAdminStats();
    toast('🗑 Nutzer gelöscht');
  });
  openOverlay('user-detail-overlay');
}

function showNewUserForm() {
  document.getElementById('user-overlay-content').innerHTML =
    '<h3 class="overlay-title">Neuen Nutzer anlegen</h3>' +
    '<label class="form-label">Name</label>' +
    '<input class="form-input" id="nu-name" type="text" placeholder="Vor- und Nachname">' +
    '<label class="form-label">Personalnummer</label>' +
    '<input class="form-input" id="nu-nr" type="text" placeholder="z.B. 12345678">' +
    '<label class="form-label">Passwort</label>' +
    '<input class="form-input" id="nu-pw" type="password" placeholder="Mind. 8 Zeichen">' +
    '<label class="form-label">Rolle</label>' +
    '<select class="form-select" id="nu-role">' +
      Object.keys(ROLES).map(function(r) { return '<option value="' + r + '">' + ROLES[r].icon + ' ' + ROLES[r].label + '</option>'; }).join('') +
    '</select>' +
    '<label class="form-label">EVU</label>' +
    '<select class="form-select" id="nu-evu">' +
      getEVUs().map(function(e) { return '<option value="' + e.name + '">' + e.name + '</option>'; }).join('') +
    '</select>' +
    '<button class="primary-btn" id="btn-create-user" style="margin-top:12px;">Nutzer anlegen</button>';
  openOverlay('user-overlay');
  document.getElementById('btn-create-user').addEventListener('click', createUser);
}

function createUser() {
  var name = document.getElementById('nu-name').value.trim();
  var nr   = document.getElementById('nu-nr').value.trim();
  var pw   = document.getElementById('nu-pw').value;
  var role = document.getElementById('nu-role').value;
  var evu  = document.getElementById('nu-evu').value;
  if (!name || !nr || !pw) { toast('Alle Felder ausfüllen', true); return; }
  if (pw.length < 8)       { toast('Passwort mind. 8 Zeichen', true); return; }
  var users = getUsers();
  if (users.find(function(u) { return u.nr === nr; })) { toast('Personalnummer vergeben', true); return; }
  var initials = name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().slice(0, 2);
  users.push({
    id: 'u' + Date.now(), nr: nr, name: name, role: role, evu: evu,
    active: true, created: new Date().toLocaleDateString('de'), lastLogin: '–', permissions: {}, avatar: initials
  });
  saveUsers(users);
  addLog('Nutzer erstellt: ' + name + ' (' + role + ')');
  closeOverlay('user-overlay');
  renderUserList(); renderAdminStats();
  toast('✓ ' + name + ' angelegt');
}

// ─────────────────────────────────────────────
//  INIT – runs after DOM ready
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {

  // ── Login ──
  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('inp-pass').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doLogin();
  });

  // ── Navigation buttons ──
  function bindBack(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', back);
  }
  ['bf-back','rw-back','tel-back','betrieb-back','br-back','zf-back',
   'bef-back','onl-back','wz-back','sos-back','sosmb-back','la-back',
   'set-back','admin-back','ausers-back','forum-back','forum-cat-back',
   'forum-thread-back'].forEach(bindBack);

  document.getElementById('btn-settings').addEventListener('click', function() { go('screen-settings'); });
  document.getElementById('btn-evu-back').addEventListener('click', function() { go('screen-evu'); });
  document.getElementById('btn-sos-mb').addEventListener('click',   function() { go('screen-sos-mb'); });
  document.getElementById('btn-set-evu').addEventListener('click',  function() { renderEVUGrid(); go('screen-evu'); });
  document.getElementById('btn-sync').addEventListener('click',     function() { toast('Synchronisierung gestartet …'); });
  document.getElementById('btn-go-admin').addEventListener('click', goAdmin);

  // ── Overlays ──
  document.getElementById('det-close').addEventListener('click',          function() { closeOverlay('overlay'); });
  document.getElementById('thread-overlay-close').addEventListener('click',function() { closeOverlay('thread-overlay'); });
  document.getElementById('user-overlay-close').addEventListener('click',  function() { closeOverlay('user-overlay'); });
  document.getElementById('user-detail-close').addEventListener('click',   function() { closeOverlay('user-detail-overlay'); });

  document.querySelectorAll('.overlay').forEach(function(ov) {
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.classList.remove('open'); });
  });

  // ── Telefonbuch ──
  document.getElementById('tel-name').addEventListener('input', telSearch);
  document.getElementById('tel-rl').addEventListener('input',   telSearch);
  document.getElementById('tel-full').addEventListener('change',telSearch);
  document.querySelectorAll('.ftab').forEach(function(el) {
    el.addEventListener('click', function() { telSetFilter(el.dataset.filter, el); });
  });

  // ── Weg/Zeit ──
  document.getElementById('tab-wz').addEventListener('click', function() {
    document.querySelectorAll('.wz-tab').forEach(function(t) { t.classList.remove('active'); });
    this.classList.add('active');
    document.getElementById('wz-panel').style.display = '';
    document.getElementById('vs-panel').style.display = 'none';
  });
  document.getElementById('tab-vs').addEventListener('click', function() {
    document.querySelectorAll('.wz-tab').forEach(function(t) { t.classList.remove('active'); });
    this.classList.add('active');
    document.getElementById('wz-panel').style.display = 'none';
    document.getElementById('vs-panel').style.display = '';
  });
  document.getElementById('btn-gps').addEventListener('click', function() {
    App.speedMode = 'gps';
    this.classList.add('active'); document.getElementById('btn-man').classList.remove('active');
    document.getElementById('man-inp').style.display = 'none';
    document.getElementById('gps-st').style.display  = '';
  });
  document.getElementById('btn-man').addEventListener('click', function() {
    App.speedMode = 'manual';
    this.classList.add('active'); document.getElementById('btn-gps').classList.remove('active');
    document.getElementById('man-inp').style.display = '';
    document.getElementById('gps-st').style.display  = 'none';
  });
  document.getElementById('btn-calc-wz').addEventListener('click', calcWegzeit);
  document.getElementById('btn-calc-vs').addEventListener('click', calcVSoll);

  // ── Generic data-toast ──
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-toast]');
    if (el) toast(el.dataset.toast);
  });

  // ── Admin ──
  document.getElementById('admin-login-btn').addEventListener('click',  adminLogin);
  document.getElementById('admin-logout-btn').addEventListener('click', adminLogout);
  document.getElementById('a-pass').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') adminLogin();
  });
  document.querySelectorAll('.admin-nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { adminTab(btn.dataset.tab, btn); });
  });
  document.getElementById('btn-save-modules').addEventListener('click', saveModules);
  document.getElementById('btn-add-section').addEventListener('click',  addSection);
  document.getElementById('btn-add-evu').addEventListener('click',      addEVU);

  // Upload zone
  document.getElementById('upload-zone').addEventListener('click', function() {
    document.getElementById('file-inp').click();
  });
  document.getElementById('upload-zone').addEventListener('dragover', function(e) {
    e.preventDefault(); this.classList.add('drag');
  });
  document.getElementById('upload-zone').addEventListener('dragleave', function() {
    this.classList.remove('drag');
  });
  document.getElementById('upload-zone').addEventListener('drop', function(e) {
    e.preventDefault(); this.classList.remove('drag'); addPendingFiles(e.dataTransfer.files);
  });
  document.getElementById('file-inp').addEventListener('change', function() {
    addPendingFiles(this.files);
  });
  document.getElementById('upload-btn').addEventListener('click', doUpload);

  // Admin users
  document.getElementById('btn-new-user-open').addEventListener('click', showNewUserForm);
  document.getElementById('user-search').addEventListener('input',      renderUserList);
  document.getElementById('user-role-filter').addEventListener('change',renderUserList);

  // Forum
  document.getElementById('btn-new-thread').addEventListener('click',     function() { showNewThreadOverlay(); });
  document.getElementById('btn-new-thread-cat').addEventListener('click', function() { showNewThreadOverlay(); });
  document.getElementById('btn-post-reply').addEventListener('click',     postReply);

  // ── Static renders ──
  renderBaureihen();

  // ── Telefonbuch count display ──
  if (typeof TELDB !== 'undefined') {
    document.getElementById('tel-count').textContent = TELDB.length.toLocaleString('de');
  }
});
