// ===== CLOUDSECURE FRONTEND APP =====

const API = '/api';
let currentPage = 'dashboard';
let currentUser = null;
let starredFiles = JSON.parse(localStorage.getItem('cs_starred') || '[]');

// ===== AUTH =====
function showLogin() {
  document.getElementById('login-card').classList.remove('hidden');
  document.getElementById('register-card').classList.add('hidden');
}
function showRegister() {
  document.getElementById('login-card').classList.add('hidden');
  document.getElementById('register-card').classList.remove('hidden');
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;

  // Check registered users
  const users = JSON.parse(localStorage.getItem('cs_users') || '[]');
  const user = users.find(u => u.email === email && u.password === pass);

  if (user) {
    loginAs(user);
  } else if (email === 'admin@gmail.com' && pass === 'admin123') {
    // Default admin
    loginAs({ name: 'Admin', email: 'admin@gmail.com', role: 'admin', registeredAt: new Date().toISOString() });
  } else {
    toast('Invalid credentials', 'error');
  }
  return false;
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const pass = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;

  const users = JSON.parse(localStorage.getItem('cs_users') || '[]');
  if (users.find(u => u.email === email)) {
    toast('Email already registered', 'error');
    return false;
  }

  const user = { name, email, password: pass, role, registeredAt: new Date().toISOString() };
  users.push(user);
  localStorage.setItem('cs_users', JSON.stringify(users));
  toast('Account created! Signing in...', 'success');
  setTimeout(() => loginAs(user), 800);
  return false;
}

function loginAs(user) {
  currentUser = user;
  localStorage.setItem('cs_session', JSON.stringify(user));

  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-wrapper').classList.remove('hidden');

  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-role').textContent = user.role;
  document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();

  // Hide admin for non-admins
  const adminNav = document.getElementById('nav-admin');
  if (user.role !== 'admin') adminNav.style.display = 'none';
  else adminNav.style.display = '';

  toast(`Welcome back, ${user.name}!`, 'success');
  loadDashboard();
}

function handleLogout() {
  localStorage.removeItem('cs_session');
  currentUser = null;
  document.getElementById('app-wrapper').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  showLogin();
}

// Auto-login from session
(function checkSession() {
  const session = localStorage.getItem('cs_session');
  if (session) {
    try { loginAs(JSON.parse(session)); } catch(e) { localStorage.removeItem('cs_session'); }
  }
})();

// ===== NAVIGATION =====
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');

  if (page === 'dashboard') loadDashboard();
  if (page === 'files') loadFiles();
  if (page === 'nodes') loadNodes();
  if (page === 'admin') loadAdmin();
}

// ===== UTILITY =====
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ===== STAR / LIKE =====
function toggleStar(fileId) {
  const idx = starredFiles.indexOf(fileId);
  if (idx > -1) { starredFiles.splice(idx, 1); toast('Removed from starred', 'info'); }
  else { starredFiles.push(fileId); toast('Added to starred ⭐', 'success'); }
  localStorage.setItem('cs_starred', JSON.stringify(starredFiles));
  loadFiles();
}

function isStarred(fileId) { return starredFiles.includes(fileId); }

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`);
    const data = await res.json();

    document.getElementById('stat-files').textContent = data.totalFiles;
    document.getElementById('stat-storage').textContent = formatSize(data.totalSize);
    document.getElementById('stat-blocks').textContent = data.totalBlocks;
    document.getElementById('stat-nodes').textContent = data.activeNodes;

    const barsEl = document.getElementById('node-bars');
    const nodeColors = ['n1', 'n2', 'n3'];
    const nodeLabels = ['DataNode 1', 'DataNode 2', 'DataNode 3'];
    barsEl.innerHTML = data.nodes.map((n, i) => {
      const pct = n.capacity > 0 ? ((n.storageUsed / n.capacity) * 100).toFixed(1) : 0;
      return `<div class="node-bar-item">
          <div class="node-bar-label"><span>${nodeLabels[i]}</span><span>${formatSize(n.storageUsed)} / ${formatSize(n.capacity)} (${pct}%)</span></div>
          <div class="node-bar-track"><div class="node-bar-fill ${nodeColors[i]}" style="width: ${pct}%"></div></div>
        </div>`;
    }).join('');

    const recentEl = document.getElementById('recent-list');
    if (data.recentFiles.length === 0) {
      recentEl.innerHTML = '<p class="empty-state">No files uploaded yet</p>';
    } else {
      recentEl.innerHTML = data.recentFiles.map(f => `
        <div class="recent-item">
          <span class="recent-item-name">${isStarred(f.fileId) ? '⭐' : '📄'} ${f.originalName}</span>
          <span class="recent-item-meta">${formatSize(f.fileSize)} · ${f.blockCount} blocks</span>
        </div>`).join('');
    }
  } catch (err) { console.error('Dashboard error:', err); }
}

// ===== FILE MANAGER =====
async function loadFiles() {
  try {
    const res = await fetch(`${API}/files`);
    const files = await res.json();
    const tbody = document.getElementById('file-tbody');

    if (files.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No files uploaded yet</td></tr>';
      return;
    }

    tbody.innerHTML = files.map(f => `
      <tr>
        <td>📄 ${f.originalName}</td>
        <td>${formatSize(f.fileSize)}</td>
        <td>${f.blockCount} × ${formatSize(f.blockSize)}</td>
        <td><span class="encryption-badge">🔒 ${f.encryption}</span></td>
        <td>${formatDate(f.uploadedAt)}</td>
        <td><button class="star-btn ${isStarred(f.fileId) ? 'starred' : ''}" onclick="toggleStar('${f.fileId}')">${isStarred(f.fileId) ? '⭐' : '☆'}</button></td>
        <td>
          <button class="action-btn" onclick="viewBlocks('${f.fileId}')">🧩 Blocks</button>
          <button class="action-btn" onclick="downloadFile('${f.fileId}')">⬇️</button>
          <button class="action-btn danger" onclick="deleteFileAction('${f.fileId}')">🗑️</button>
        </td>
      </tr>`).join('');
  } catch (err) { console.error('Files error:', err); }
}

// ===== UPLOAD =====
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.getElementById('progress-fill');

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) handleUpload(fileInput.files[0]); });

async function handleUpload(file) {
  document.getElementById('upload-filename').textContent = file.name;
  document.getElementById('upload-status').textContent = 'Encrypting & distributing...';
  uploadProgress.classList.remove('hidden');

  let pct = 0;
  const interval = setInterval(() => { pct = Math.min(pct + Math.random() * 15, 90); progressFill.style.width = pct + '%'; }, 200);

  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
    const data = await res.json();

    clearInterval(interval);
    progressFill.style.width = '100%';
    document.getElementById('upload-status').textContent = `✓ Split into ${data.file.blockCount} encrypted blocks`;
    toast(`"${file.name}" uploaded — ${data.file.blockCount} blocks across 3 nodes`, 'success');
    setTimeout(() => { uploadProgress.classList.add('hidden'); progressFill.style.width = '0%'; }, 2500);
    loadFiles();
    fileInput.value = '';
  } catch (err) {
    clearInterval(interval);
    document.getElementById('upload-status').textContent = '✗ Upload failed';
    toast('Upload failed: ' + err.message, 'error');
  }
}

// ===== DOWNLOAD =====
async function downloadFile(fileId) {
  toast('Collecting blocks & decrypting...', 'info');
  try {
    const res = await fetch(`${API}/download/${fileId}`);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition');
    const filename = cd ? cd.split('filename="')[1]?.replace('"', '') : 'download';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('File decrypted & downloaded!', 'success');
  } catch (err) { toast('Download failed: ' + err.message, 'error'); }
}

// ===== DELETE =====
async function deleteFileAction(fileId) {
  if (!confirm('Delete this file and all its encrypted blocks?')) return;
  try {
    await fetch(`${API}/files/${fileId}`, { method: 'DELETE' });
    // Also remove from starred
    const idx = starredFiles.indexOf(fileId);
    if (idx > -1) { starredFiles.splice(idx, 1); localStorage.setItem('cs_starred', JSON.stringify(starredFiles)); }
    toast('File and all blocks deleted', 'success');
    loadFiles();
  } catch (err) { toast('Delete failed', 'error'); }
}

// ===== VIEW BLOCKS =====
async function viewBlocks(fileId) {
  try {
    const res = await fetch(`${API}/files/${fileId}/blocks`);
    const data = await res.json();
    document.getElementById('modal-title').textContent = `Block Distribution — ${data.originalName}`;
    document.getElementById('modal-body').innerHTML = `
      <div style="margin-bottom: 20px;">
        <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.7;">
          <strong>File:</strong> ${data.originalName}<br>
          <strong>Size:</strong> ${formatSize(data.fileSize)}<br>
          <strong>Block Size:</strong> ${formatSize(data.blockSize)}<br>
          <strong>Total Blocks:</strong> ${data.blockCount}<br>
          <strong>Encryption:</strong> ${data.encryption.algorithm}<br>
          <strong>Replication:</strong> ${data.replicationFactor}
        </p>
      </div>
      <div class="block-grid">
        ${data.blocks.map(b => `
          <div class="block-item ${b.nodeId}">
            <div class="block-idx">Block ${b.blockIndex}</div>
            <div class="block-node">📍 ${b.nodeId}</div>
            <div class="block-size">${formatSize(b.originalSize)} → ${formatSize(b.encryptedSize)}</div>
          </div>`).join('')}
      </div>`;
    document.getElementById('block-modal').classList.remove('hidden');
  } catch (err) { toast('Could not load block info', 'error'); }
}

document.getElementById('modal-close').addEventListener('click', () => document.getElementById('block-modal').classList.add('hidden'));
document.getElementById('block-modal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden'); });

// ===== NODE MONITOR =====
async function loadNodes() {
  try {
    const res = await fetch(`${API}/nodes`);
    const nodes = await res.json();
    const grid = document.getElementById('nodes-grid');
    const colors = ['n1', 'n2', 'n3'];
    const names = ['DataNode 1', 'DataNode 2', 'DataNode 3'];

    grid.innerHTML = nodes.map((n, i) => {
      const pct = n.capacity > 0 ? ((n.storageUsed / n.capacity) * 100).toFixed(1) : 0;
      return `
        <div class="node-card ${colors[i]}">
          <div class="node-card-icon">🖥️</div>
          <div class="node-card-name">${names[i]}</div>
          <div class="node-card-status"><span class="status-dot"></span> Online</div>
          <div class="node-stat"><span class="node-stat-label">Blocks Stored</span><span class="node-stat-value">${n.blockCount}</span></div>
          <div class="node-stat"><span class="node-stat-label">Storage Used</span><span class="node-stat-value">${formatSize(n.storageUsed)}</span></div>
          <div class="node-stat"><span class="node-stat-label">Capacity</span><span class="node-stat-value">${formatSize(n.capacity)}</span></div>
          <div class="capacity-bar">
            <div class="capacity-label"><span>Usage</span><span>${pct}%</span></div>
            <div class="capacity-track"><div class="capacity-fill" style="width: ${pct}%"></div></div>
          </div>
        </div>`;
    }).join('');
  } catch (err) { console.error('Nodes error:', err); }
}

// ===== ADMIN PANEL =====
function loadAdmin() {
  const users = JSON.parse(localStorage.getItem('cs_users') || '[]');
  // Add default admin if not in list
  const allUsers = [
    { name: 'Admin', email: 'admin@gmail.com', role: 'admin', registeredAt: '2026-01-01T00:00:00Z' },
    ...users
  ];

  document.getElementById('users-tbody').innerHTML = allUsers.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="encryption-badge">${u.role === 'admin' ? '👑 Admin' : '👤 User'}</span></td>
      <td>${formatDate(u.registeredAt)}</td>
      <td>${u.email === 'admin@gmail.com' ? '<span style="color:var(--text-muted)">Default</span>' : `<button class="action-btn danger" onclick="removeUser('${u.email}')">Remove</button>`}</td>
    </tr>`).join('');

  // Starred files list
  loadStarredList();
}

async function loadStarredList() {
  try {
    const res = await fetch(`${API}/files`);
    const files = await res.json();
    const starred = files.filter(f => isStarred(f.fileId));
    const el = document.getElementById('starred-list');
    if (starred.length === 0) {
      el.innerHTML = '<p class="empty-state">No starred files</p>';
    } else {
      el.innerHTML = starred.map(f => `
        <div class="recent-item">
          <span class="recent-item-name">⭐ ${f.originalName}</span>
          <span class="recent-item-meta">${formatSize(f.fileSize)}</span>
        </div>`).join('');
    }
  } catch(e) {}
}

function removeUser(email) {
  if (!confirm('Remove this user?')) return;
  let users = JSON.parse(localStorage.getItem('cs_users') || '[]');
  users = users.filter(u => u.email !== email);
  localStorage.setItem('cs_users', JSON.stringify(users));
  toast('User removed', 'success');
  loadAdmin();
}

// ===== INIT =====
if (!currentUser) {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-wrapper').classList.add('hidden');
}
