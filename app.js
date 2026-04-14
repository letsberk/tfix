'use strict';

// ═══════════════════════════════════════════════════════════
//  KONFIGURATION
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL     = window.SUPABASE_URL;
const SUPABASE_ANON    = window.SUPABASE_ANON_KEY;
const STORAGE_BUCKET   = 'railapp-files';
const IDB_NAME         = 'railapp-db';
const IDB_VERSION      = 1;
const CACHE_KEY_ITEMS  = 'cached_items';
const CACHE_KEY_FILES  = 'cached_files';

// ═══════════════════════════════════════════════════════════
//  SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════
let sb; // wird nach DOMContentLoaded initialisiert

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
const App = {
  user:         null,   // Supabase Auth User
  profile:      null,   // profiles-Tabelle
  isAdmin:      false,
  isOnline:     navigator.onLine,
  items:        [],
  uploadedFiles:[],
  pendingFiles: [],
  idb:          null,   // IndexedDB Instanz
};

// ═══════════════════════════════════════════════════════════
//  DOM HELPER
// ═══════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function show(id)   { $(id)?.classList.remove('hidden'); }
function hide(id)   { $(id)?.classList.add('hidden'); }
function toggle(id) { $(id)?.classList.toggle('hidden'); }

let toastTimer;
function toast(msg, type = 'info', duration = 3000) {
  const el = $('toast');
  el.textContent = msg;
  el.className   = `toast toast-${type}`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(id)?.classList.add('active');
}

// ═══════════════════════════════════════════════════════════
//  INDEXEDDB
// ═══════════════════════════════════════════════════════════
function initIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      // items store
      if (!db.objectStoreNames.contains('items')) {
        const itemStore = db.createObjectStore('items', { keyPath: 'id' });
        itemStore.createIndex('category', 'category', { unique: false });
        itemStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // files store (offline verfügbare Dateien)
      if (!db.objectStoreNames.contains('files')) {
        const fileStore = db.createObjectStore('files', { keyPath: 'id' });
        fileStore.createIndex('item_id', 'item_id', { unique: false });
      }

      // meta store (sync timestamps etc.)
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    req.onsuccess  = e => { App.idb = e.target.result; resolve(App.idb); };
    req.onerror    = e => reject(e.target.error);
  });
}

// Alle Items in IndexedDB speichern
async function idbSaveItems(items) {
  if (!App.idb) return;
  return new Promise((resolve, reject) => {
    const tx    = App.idb.transaction(['items', 'meta'], 'readwrite');
    const store = tx.objectStore('items');
    const meta  = tx.objectStore('meta');

    // Alten Stand löschen
    store.clear();

    // Neu befüllen
    items.forEach(item => store.put(item));

    // Timestamp speichern
    meta.put({ key: 'last_sync', value: new Date().toISOString() });

    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

// Items aus IndexedDB lesen
async function idbLoadItems() {
  if (!App.idb) return [];
  return new Promise((resolve, reject) => {
    const tx    = App.idb.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    const req   = store.getAll();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror   = e => reject(e.target.error);
  });
}

// Eine Datei (als Blob) offline speichern
async function idbSaveFile(fileRecord) {
  if (!App.idb) return;
  return new Promise((resolve, reject) => {
    const tx    = App.idb.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    store.put(fileRecord);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

// Alle offline gespeicherten Dateien lesen
async function idbLoadFiles() {
  if (!App.idb) return [];
  return new Promise((resolve, reject) => {
    const tx    = App.idb.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const req   = store.getAll();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror   = e => reject(e.target.error);
  });
}

// Letzten Sync-Zeitpunkt lesen
async function idbGetLastSync() {
  if (!App.idb) return null;
  return new Promise((resolve) => {
    const tx  = App.idb.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get('last_sync');
    req.onsuccess = e => resolve(e.target.result?.value || null);
    req.onerror   = () => resolve(null);
  });
}

// ═══════════════════════════════════════════════════════════
//  ONLINE / OFFLINE STATUS
// ═══════════════════════════════════════════════════════════
function updateOnlineStatus() {
  App.isOnline = navigator.onLine;
  const bar  = $('status-bar');
  const icon = $('status-icon');
  const text = $('status-text');

  if (App.isOnline) {
    bar.classList.remove('offline');
    bar.classList.add('online');
    icon.textContent = '🟢';
    text.textContent = 'Online';
    // Automatisch synchronisieren wenn wieder online
    if (App.user) syncData();
  } else {
    bar.classList.remove('online');
    bar.classList.add('offline');
    icon.textContent = '🔴';
    text.textContent = 'Offline';
    show('offline-banner');
    loadItemsFromIDB(); // lokale Daten anzeigen
  }
}

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ═══════════════════════════════════════════════════════════
//  SUPABASE AUTH
// ═══════════════════════════════════════════════════════════
async function login() {
  const email    = $('login-email').value.trim();
  const password = $('login-password').value;

  if (!email || !password) {
    showError('login-error', 'E-Mail und Passwort eingeben');
    return;
  }

  setLoading('btn-login', true, 'Anmelden…');

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    showError('login-error', germanizeAuthError(error.message));
    setLoading('btn-login', false, 'Anmelden');
    return;
  }

  await afterLogin(data.user);
}

async function register() {
  const name     = $('reg-name').value.trim();
  const email    = $('reg-email').value.trim();
  const password = $('reg-password').value;

  if (!name || !email || !password) {
    showError('reg-error', 'Alle Felder ausfüllen');
    return;
  }
  if (password.length < 8) {
    showError('reg-error', 'Passwort mind. 8 Zeichen');
    return;
  }

  setLoading('btn-register', true, 'Registrieren…');

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });

  setLoading('btn-register', false, 'Konto anlegen');

  if (error) {
    showError('reg-error', germanizeAuthError(error.message));
    return;
  }

  toast('✓ Konto erstellt! Bitte E-Mail bestätigen.', 'success', 5000);
  switchAuthTab('login');
}

async function logout() {
  await sb.auth.signOut();
  App.user    = null;
  App.profile = null;
  App.isAdmin = false;
  showScreen('screen-login');
  toast('Abgemeldet', 'info');
}

async function afterLogin(user) {
  App.user = user;
  // Profil laden
  const { data: profile, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    toast('Profil nicht gefunden – Admin kontaktieren', 'error');
    await sb.auth.signOut();
    return;
  }

  App.profile = profile;
  App.isAdmin = profile.role === 'admin';

  if (App.isAdmin) {
    $('admin-name-display').textContent = profile.full_name || profile.email;
    showScreen('screen-admin');
    await loadAdminData();
  } else {
    $('user-name-display').textContent = profile.full_name || profile.email;
    showScreen('screen-user');
    await syncData();
  }
}

function germanizeAuthError(msg) {
  const map = {
    'Invalid login credentials': 'E-Mail oder Passwort falsch',
    'Email not confirmed':        'E-Mail noch nicht bestätigt',
    'User already registered':    'E-Mail bereits registriert',
    'Password should be at least 6 characters': 'Passwort mind. 6 Zeichen',
  };
  return map[msg] || msg;
}

// ═══════════════════════════════════════════════════════════
//  SYNCHRONISATION
// ═══════════════════════════════════════════════════════════
async function syncData() {
  if (!App.isOnline) {
    toast('Offline – Sync nicht möglich', 'warning');
    return;
  }

  const syncBtn = $('btn-sync');
  syncBtn.classList.add('syncing');
  $('status-text').textContent = 'Synchronisiere…';

  try {
    // Items von Supabase laden
    const { data: items, error } = await sb
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    App.items = items || [];

    // In IndexedDB speichern (Server überschreibt lokal)
    await idbSaveItems(App.items);

    // UI aktualisieren
    renderItems(App.items);
    updateCategoryFilter(App.items);
    hide('offline-banner');

    // Sync-Log schreiben
    await logSync('sync', { items_count: App.items.length });

    const lastSync = await idbGetLastSync();
    toast(`✓ Synchronisiert · ${App.items.length} Einträge`, 'success');
    $('status-text').textContent = 'Online';

  } catch (err) {
    console.error('Sync-Fehler:', err);
    toast('Sync fehlgeschlagen – lade lokale Daten', 'error');
    await loadItemsFromIDB();
  } finally {
    syncBtn.classList.remove('syncing');
  }
}

async function loadItemsFromIDB() {
  const items = await idbLoadItems();
  App.items = items;
  renderItems(items);
  updateCategoryFilter(items);
  if (items.length > 0) {
    show('offline-banner');
  }
}

// ═══════════════════════════════════════════════════════════
//  ITEMS – CRUD
// ═══════════════════════════════════════════════════════════
async function loadAdminItems() {
  const { data, error } = await sb
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { toast('Fehler beim Laden', 'error'); return; }

  App.items = data || [];
  renderAdminItemsTable(App.items);
}

async function saveItem() {
  const id       = $('item-id').value;
  const title    = $('item-title').value.trim();
  const desc     = $('item-desc').value.trim();
  const category = $('item-category').value;
  const fileUrl  = $('item-file-attach').value.trim();

  if (!title) { showError('item-error', 'Titel ist erforderlich'); return; }

  setLoading('btn-save-item', true, 'Speichern…');

  const payload = {
    title,
    description: desc,
    category,
    file_url:   fileUrl || null,
    created_by: App.user.id,
  };

  let error;

  if (id) {
    // UPDATE
    const res = await sb.from('items').update(payload).eq('id', id);
    error = res.error;
    if (!error) toast('✓ Eintrag aktualisiert', 'success');
  } else {
    // INSERT
    const res = await sb.from('items').insert(payload);
    error = res.error;
    if (!error) toast('✓ Eintrag erstellt', 'success');
  }

  setLoading('btn-save-item', false, 'Speichern');

  if (error) {
    showError('item-error', 'Fehler: ' + error.message);
    return;
  }

  resetItemForm();
  await loadAdminItems();
  await logSync(id ? 'update' : 'create', { title });
}

async function deleteItem(id, title) {
  if (!confirm(`"${title}" wirklich löschen?`)) return;

  const { error } = await sb.from('items').delete().eq('id', id);

  if (error) { toast('Löschen fehlgeschlagen', 'error'); return; }

  toast('🗑 Gelöscht', 'info');
  await loadAdminItems();
  await logSync('delete', { id, title });
}

function editItem(item) {
  $('item-form-title').textContent = 'Eintrag bearbeiten';
  $('item-id').value       = item.id;
  $('item-title').value    = item.title;
  $('item-desc').value     = item.description || '';
  $('item-category').value = item.category || 'allgemein';
  $('item-file-attach').value = item.file_url || '';
  show('item-form-wrap');
  $('item-form-wrap').scrollIntoView({ behavior: 'smooth' });
}

function resetItemForm() {
  $('item-id').value          = '';
  $('item-title').value       = '';
  $('item-desc').value        = '';
  $('item-category').value    = 'allgemein';
  $('item-file-attach').value = '';
  $('item-form-title').textContent = 'Neuer Eintrag';
  hide('item-error');
  hide('item-form-wrap');
}

// ═══════════════════════════════════════════════════════════
//  FILE UPLOAD (Supabase Storage)
// ═══════════════════════════════════════════════════════════
async function uploadFiles() {
  if (!App.pendingFiles.length) {
    toast('Keine Dateien ausgewählt', 'warning');
    return;
  }

  setLoading('btn-do-upload', true, 'Hochladen…');
  const results = [];

  for (const file of App.pendingFiles) {
    try {
      // Einzigartigen Pfad generieren
      const ext      = file.name.split('.').pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path     = `${App.user.id}/${Date.now()}_${safeName}`;

      // Upload zu Supabase Storage
      const { data: uploadData, error: uploadError } = await sb.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Signed URL generieren (7 Tage gültig)
      const { data: urlData } = await sb.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      results.push({
        name:       file.name,
        size:       file.size,
        path:       path,
        url:        urlData?.signedUrl || '',
        type:       file.type,
        uploaded_at: new Date().toISOString(),
      });

      updateQueueItemStatus(file.name, 'done');

    } catch (err) {
      console.error('Upload-Fehler:', file.name, err);
      updateQueueItemStatus(file.name, 'error');
      toast(`Fehler bei ${file.name}`, 'error');
    }
  }

  setLoading('btn-do-upload', false, '⬆ Hochladen');
  App.pendingFiles = [];

  if (results.length > 0) {
    toast(`✓ ${results.length} Datei(en) hochgeladen`, 'success');
    await logSync('upload', { count: results.length, files: results.map(r => r.name) });
    await loadUploadedFiles();
  }
}

async function loadUploadedFiles() {
  const { data, error } = await sb.storage
    .from(STORAGE_BUCKET)
    .list(App.user.id, { sortBy: { column: 'created_at', order: 'desc' } });

  if (error) { console.error(error); return; }

  App.uploadedFiles = data || [];
  renderUploadedFiles(App.uploadedFiles);
  $('stat-files').textContent = App.uploadedFiles.length;
}

async function deleteFile(path, name) {
  if (!confirm(`"${name}" wirklich löschen?`)) return;

  const { error } = await sb.storage.from(STORAGE_BUCKET).remove([path]);

  if (error) { toast('Löschen fehlgeschlagen', 'error'); return; }

  toast('🗑 Datei gelöscht', 'info');
  await loadUploadedFiles();
}

// ═══════════════════════════════════════════════════════════
//  OFFLINE SPEICHERN (Dateien als Blob in IndexedDB)
// ═══════════════════════════════════════════════════════════
async function saveOffline() {
  const itemsWithFiles = App.items.filter(item => item.file_url);

  if (!itemsWithFiles.length) {
    toast('Keine Dateien zum offline Speichern', 'info');
    return;
  }

  toast(`Speichere ${itemsWithFiles.length} Datei(en) offline…`, 'info', 10000);
  let saved = 0;

  for (const item of itemsWithFiles) {
    try {
      const response = await fetch(item.file_url);
      if (!response.ok) continue;

      const blob   = await response.blob();
      const buffer = await blob.arrayBuffer();

      await idbSaveFile({
        id:          item.id,
        item_id:     item.id,
        name:        item.file_name || item.title,
        type:        blob.type,
        size:        blob.size,
        data:        buffer,
        saved_at:    new Date().toISOString(),
      });
      saved++;
    } catch (err) {
      console.warn('Offline-Speichern fehlgeschlagen:', item.title, err);
    }
  }

  toast(`✓ ${saved} Datei(en) offline verfügbar`, 'success');
  await renderOfflineSection();
  $('stat-offline').textContent = saved;
}

async function renderOfflineSection() {
  const files = await idbLoadFiles();
  if (!files.length) { hide('offline-section'); return; }

  show('offline-section');
  $('offline-list').innerHTML = files.map(f =>
    `<div class="offline-item">
      <span class="offline-icon">${fileIcon(f.type)}</span>
      <div class="offline-info">
        <div class="offline-name">${f.name}</div>
        <div class="offline-meta">${formatBytes(f.size)} · ${formatDate(f.saved_at)}</div>
      </div>
      <button class="btn-small" onclick="downloadOfflineFile('${f.id}')">⬇</button>
    </div>`
  ).join('');
}

async function downloadOfflineFile(id) {
  const files = await idbLoadFiles();
  const f = files.find(x => x.id === id);
  if (!f) return;

  const blob = new Blob([f.data], { type: f.type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = f.name;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
//  BENUTZERVERWALTUNG (Admin)
// ═══════════════════════════════════════════════════════════
async function loadUsers() {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) { console.error(error); return; }

  renderUsersTable(data || []);
  $('user-count').textContent = `${(data || []).length} Nutzer`;
  $('stat-users-count').textContent = (data || []).length;
}

async function updateUserRole(userId, newRole) {
  const { error } = await sb
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) { toast('Fehler beim Aktualisieren', 'error'); return; }

  toast(`✓ Rolle auf "${newRole}" gesetzt`, 'success');
  await loadUsers();
  await logSync('role_change', { userId, newRole });
}

// ═══════════════════════════════════════════════════════════
//  SYNC LOG
// ═══════════════════════════════════════════════════════════
async function logSync(action, details = {}) {
  if (!App.user || !App.isOnline) return;
  await sb.from('sync_log').insert({
    user_id: App.user.id,
    action,
    details,
  });
}

async function loadSyncLog() {
  const { data } = await sb
    .from('sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  const list = $('sync-log-list');
  if (!data?.length) { list.innerHTML = '<div class="log-empty">Noch keine Aktivitäten</div>'; return; }

  list.innerHTML = data.map(entry =>
    `<div class="log-entry">
      <span class="log-action log-${entry.action}">${entry.action}</span>
      <span class="log-detail">${JSON.stringify(entry.details || {})}</span>
      <span class="log-time">${formatDate(entry.created_at)}</span>
    </div>`
  ).join('');
}

// ═══════════════════════════════════════════════════════════
//  RENDER FUNKTIONEN
// ═══════════════════════════════════════════════════════════
function renderItems(items) {
  const container = $('items-container');
  const search    = $('search-input')?.value.toLowerCase() || '';
  const category  = $('category-filter')?.value || '';

  const filtered = items.filter(item => {
    const matchSearch   = !search || item.title.toLowerCase().includes(search) ||
                          (item.description || '').toLowerCase().includes(search);
    const matchCategory = !category || item.category === category;
    return matchSearch && matchCategory;
  });

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">📭 Keine Einträge gefunden</div>';
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="item-card" data-id="${item.id}">
      <div class="item-header">
        <span class="item-category">${item.category || 'allgemein'}</span>
        <span class="item-date">${formatDate(item.created_at)}</span>
      </div>
      <h3 class="item-title">${escHtml(item.title)}</h3>
      ${item.description
        ? `<p class="item-desc">${escHtml(item.description)}</p>`
        : ''}
      ${item.file_url
        ? `<div class="item-file">
            <span>${fileIcon('application/pdf')}</span>
            <a href="${item.file_url}" target="_blank" rel="noopener" class="file-link">
              ${escHtml(item.file_name || 'Datei öffnen')}
            </a>
           </div>`
        : ''}
    </div>
  `).join('');
}

function renderAdminItemsTable(items) {
  const tbody = $('items-table-body');
  $('stat-items').textContent = items.length;

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Keine Einträge</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td><strong>${escHtml(item.title)}</strong></td>
      <td><span class="badge badge-${item.category}">${item.category}</span></td>
      <td>${formatDate(item.created_at)}</td>
      <td>${item.file_url
        ? `<a href="${item.file_url}" target="_blank" class="file-link-small">📎 Datei</a>`
        : '<span class="text-muted">–</span>'}</td>
      <td class="table-actions">
        <button class="btn-small btn-edit" onclick='editItem(${JSON.stringify(item)})'>✏</button>
        <button class="btn-small btn-delete" onclick="deleteItem('${item.id}','${escHtml(item.title)}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

function renderUploadedFiles(files) {
  const container = $('uploaded-files-list');

  if (!files.length) {
    container.innerHTML = '<div class="files-empty">Noch keine Dateien</div>';
    return;
  }

  container.innerHTML = files.map(f => {
    const path = `${App.user.id}/${f.name}`;
    return `
      <div class="file-row">
        <span class="file-row-icon">${fileIcon(f.metadata?.mimetype || '')}</span>
        <div class="file-row-info">
          <div class="file-row-name">${escHtml(f.name.replace(/^\d+_/, ''))}</div>
          <div class="file-row-meta">${formatBytes(f.metadata?.size || 0)} · ${formatDate(f.created_at)}</div>
        </div>
        <div class="file-row-actions">
          <button class="btn-small" onclick="copyFileUrl('${path}')">🔗</button>
          <button class="btn-small btn-delete" onclick="deleteFile('${path}','${f.name}')">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

async function copyFileUrl(path) {
  const { data } = await sb.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (data?.signedUrl) {
    navigator.clipboard.writeText(data.signedUrl)
      .then(() => toast('✓ URL kopiert', 'success'))
      .catch(() => toast(data.signedUrl, 'info', 8000));
  }
}

function renderUsersTable(users) {
  const tbody = $('users-table-body');

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Keine Nutzer</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${escHtml(u.full_name || '–')}</td>
      <td>${escHtml(u.email)}</td>
      <td>
        <select class="role-select" onchange="updateUserRole('${u.id}', this.value)">
          <option value="user"  ${u.role === 'user'  ? 'selected' : ''}>user</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
        </select>
      </td>
      <td>${formatDate(u.created_at)}</td>
      <td>
        <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span>
      </td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════════════════
//  UPLOAD QUEUE
// ═══════════════════════════════════════════════════════════
function addFilesToQueue(files) {
  App.pendingFiles = Array.from(files);
  if (!App.pendingFiles.length) { hide('upload-queue'); return; }

  $('queue-count').textContent = `${App.pendingFiles.length} Datei(en) ausgewählt`;
  $('queue-list').innerHTML = App.pendingFiles.map(f => `
    <div class="queue-item" id="qi-${f.name.replace(/[^a-z0-9]/gi, '_')}">
      <span class="qi-icon">${fileIcon(f.type)}</span>
      <div class="qi-info">
        <div class="qi-name">${escHtml(f.name)}</div>
        <div class="qi-size">${formatBytes(f.size)}</div>
      </div>
      <span class="qi-status pending">Bereit</span>
    </div>
  `).join('');
  show('upload-queue');
}

function updateQueueItemStatus(name, status) {
  const key  = name.replace(/[^a-z0-9]/gi, '_');
  const el   = $(`qi-${key}`)?.querySelector('.qi-status');
  if (!el) return;
  const labels = { done: '✓ Fertig', error: '✗ Fehler', uploading: '↑ Lädt' };
  el.textContent = labels[status] || status;
  el.className   = `qi-status ${status}`;
}

// ═══════════════════════════════════════════════════════════
//  KATEGORIE FILTER
// ═══════════════════════════════════════════════════════════
function updateCategoryFilter(items) {
  const cats   = [...new Set(items.map(i => i.category).filter(Boolean))];
  const select = $('category-filter');
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Alle Kategorien</option>' +
    cats.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');
}

// ═══════════════════════════════════════════════════════════
//  ADMIN DATA LOADER
// ═══════════════════════════════════════════════════════════
async function loadAdminData() {
  await Promise.all([
    loadAdminItems(),
    loadUsers(),
    loadUploadedFiles(),
    loadSyncLog(),
  ]);
}

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function formatBytes(bytes) {
  if (!bytes) return '–';
  if (bytes < 1024)     return bytes + ' B';
  if (bytes < 1048576)  return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function fileIcon(mime) {
  if (!mime) return '📄';
  if (mime.includes('pdf'))   return '📕';
  if (mime.includes('word') || mime.includes('doc')) return '📘';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('xls')) return '📗';
  if (mime.includes('image')) return '🖼️';
  if (mime.includes('text'))  return '📝';
  return '📄';
}

function showError(id, msg) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(id) {
  $(id)?.classList.add('hidden');
}

function setLoading(btnId, loading, label) {
  const btn = $(btnId);
  if (!btn) return;
  btn.disabled     = loading;
  btn.textContent  = label;
}

// ═══════════════════════════════════════════════════════════
//  AUTH TABS (Login / Register)
// ═══════════════════════════════════════════════════════════
function switchAuthTab(tab) {
  $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const tabs = { login: 'tab-login', register: 'tab-register' };
  Object.entries(tabs).forEach(([key, id]) => {
    key === tab ? show(id) : hide(id);
  });
}

// ═══════════════════════════════════════════════════════════
//  ADMIN PANEL TABS
// ═══════════════════════════════════════════════════════════
function switchAdminPanel(panelId) {
  $$('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === panelId));
  $$('.admin-panel').forEach(p => p.classList.toggle('active', p.id === panelId));

  // Panel-spezifische Ladevorgänge
  if (panelId === 'panel-users')  loadUsers();
  if (panelId === 'panel-stats')  { loadSyncLog(); loadUploadedFiles(); }
  if (panelId === 'panel-upload') loadUploadedFiles();
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  // Supabase initialisieren
  if (!SUPABASE_URL || SUPABASE_URL.includes('DEIN-PROJEKT')) {
    $('items-container').innerHTML =
      '<div class="config-warning">⚠️ Supabase-Konfiguration fehlt!<br>' +
      'Trage SUPABASE_URL und SUPABASE_ANON_KEY in index.html ein.</div>';
    showScreen('screen-user');
    return;
  }

  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // IndexedDB initialisieren
  try {
    await initIDB();
  } catch (err) {
    console.warn('IndexedDB nicht verfügbar:', err);
  }

  // Online-Status initialisieren
  updateOnlineStatus();

  // Session prüfen (User bleibt eingeloggt)
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await afterLogin(session.user);
  }

  // Auth-Statusänderungen überwachen
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN'  && session) await afterLogin(session.user);
    if (event === 'SIGNED_OUT')            showScreen('screen-login');
  });

  // ── EVENT BINDINGS ──────────────────────────────────────

  // Auth
  $('btn-login')?.addEventListener('click', login);
  $('btn-register')?.addEventListener('click', register);
  $('btn-logout')?.addEventListener('click', logout);
  $('btn-admin-logout')?.addEventListener('click', logout);

  $('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });

  $$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });

  // Sync
  $('btn-sync')?.addEventListener('click', syncData);

  // User view
  $('btn-offline-save')?.addEventListener('click', saveOffline);
  $('btn-admin-to-user')?.addEventListener('click', () => {
    showScreen('screen-user');
    syncData();
  });

  $('search-input')?.addEventListener('input', () => renderItems(App.items));
  $('category-filter')?.addEventListener('change', () => renderItems(App.items));

  // Admin tabs
  $$('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAdminPanel(tab.dataset.panel));
  });

  // Admin Items
  $('btn-new-item')?.addEventListener('click', () => {
    resetItemForm();
    show('item-form-wrap');
    $('item-form-wrap').scrollIntoView({ behavior: 'smooth' });
  });
  $('btn-save-item')?.addEventListener('click', saveItem);
  $('btn-cancel-item')?.addEventListener('click', resetItemForm);

  // Upload
  const uploadZone = $('upload-zone');
  const fileInput  = $('file-input');

  uploadZone?.addEventListener('click', () => fileInput.click());
  uploadZone?.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone?.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    addFilesToQueue(e.dataTransfer.files);
  });
  fileInput?.addEventListener('change', e => addFilesToQueue(e.target.files));
  $('btn-do-upload')?.addEventListener('click', uploadFiles);

  // Overlay close
  $('overlay-close')?.addEventListener('click', () => {
    hide('item-overlay');
  });
  $('item-overlay')?.addEventListener('click', e => {
    if (e.target === $('item-overlay')) hide('item-overlay');
  });

  // Offline section
  renderOfflineSection();
});
