// ============================================================
//  DATA LAYER (simulates API / JSON Server)
// ============================================================
const API_BASE = 'https://jsonplaceholder.typicode.com'; // real API for demo

let currentUser = null;
let reservas = [];
let nextId = 100;
let cancelTargetId = null;
let histFilter = 'todos';
let reservasFilter = 'todos';
let selectedSport = null;
let selectedTime = null;

const SPORTS_ICONS = { 'Futsal': '⚽', 'Vôlei': '🏐', 'Basquete': '🏀' };
const SPORTS_CLASS = { 'Futsal': 'futsal', 'Vôlei': 'volei', 'Basquete': 'basquete' };

const TIMES = ['07:00','08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

// Seed reservations
function seedReservas() {
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const add = (days) => { const d = new Date(today); d.setDate(d.getDate()+days); return fmt(d); };

  reservas = [
    { id: 1, sport: 'Futsal', date: add(1), time: '15:00', dur: 60, local: 'Quadra poliesportiva UNEX', status: 'confirmada', players: '' },
    { id: 2, sport: 'Basquete', date: add(2), time: '10:00', dur: 60, local: 'Quadra poliesportiva UNEX', status: 'pendente', players: '' },
    { id: 3, sport: 'Vôlei', date: add(-3), time: '16:00', dur: 90, local: 'Quadra poliesportiva UNEX', status: 'cancelada', players: '' },
    { id: 4, sport: 'Futsal', date: add(-7), time: '09:00', dur: 60, local: 'Quadra poliesportiva UNEX', status: 'confirmada', players: '' },
  ];
  nextId = 10;
}

// ============================================================
//  AUTH
// ============================================================
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t,i) => t.classList.toggle('active', (tab==='login' && i===0)||(tab==='register'&&i===1)));
  document.getElementById('form-login').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
}

async function doLogin() {
  clearErrors();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  let valid = true;

  if (!email || !email.includes('@')) { showError('err-login-email'); valid = false; }
  if (pass !== '123456') { showError('err-login-pass'); valid = false; }
  if (!valid) return;

  showLoading();
  // real GET to verify API is reachable
  try {
    await fetch(`${API_BASE}/users?id=1`);
  } catch(e) {}

  await sleep(800);
  const name = email.split('@')[0];
  currentUser = {
    name: capitalize(name),
    email,
    initials: name.substring(0,2).toUpperCase(),
    phone: '',
    mat: '2024001234'
  };
  seedReservas();
  enterApp();
  hideLoading();
}

async function doRegister() {
  clearErrors();
  const name = document.getElementById('reg-name').value.trim();
  const mat = document.getElementById('reg-mat').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  let valid = true;

  if (!name) { showError('err-reg-name'); valid = false; }
  if (!mat) { showError('err-reg-mat'); valid = false; }
  if (!email || !email.includes('@')) { showError('err-reg-email'); valid = false; }
  if (pass.length < 6) { showError('err-reg-pass'); valid = false; }
  if (!valid) return;

  showLoading();
  // POST to API
  try {
    await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, username: mat })
    });
  } catch(e) {}

  await sleep(1000);
  currentUser = { name, email, initials: name.substring(0,2).toUpperCase(), phone: '', mat };
  seedReservas();
  enterApp();
  hideLoading();
  toast('Conta criada com sucesso!', 'success');
}

function doLogout() {
  document.getElementById('app').classList.remove('active');
  document.getElementById('page-landing').style.display = '';
  currentUser = null;
  reservas = [];
}

function enterApp() {
  document.getElementById('page-landing').style.display = 'none';
  const app = document.getElementById('app');
  app.classList.add('active');
  updateUserUI();
  navTo('reservas');
}

function updateUserUI() {
  document.getElementById('topbar-avatar').textContent = currentUser.initials;
  document.getElementById('topbar-name').textContent = currentUser.name;
  document.getElementById('prof-avatar').textContent = currentUser.initials;
  document.getElementById('prof-name-display').textContent = currentUser.name;
  document.getElementById('prof-email-display').textContent = currentUser.email;
  document.getElementById('prof-name').value = currentUser.name;
  document.getElementById('prof-email').value = currentUser.email;
  document.getElementById('prof-mat').value = currentUser.mat;
  document.getElementById('prof-phone').value = currentUser.phone;
}

// ============================================================
//  NAVIGATION
// ============================================================
const PAGE_TITLES = {
  'reservas': 'Minhas Reservas',
  'nova-reserva': 'Nova Reserva',
  'historico': 'Histórico',
  'confirmacao': 'Reserva Confirmada',
  'perfil': 'Meu Perfil',
  'autorizacao': 'Autorização de Quadras',
  'ajuda': 'Ajuda'
};

function navTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item[data-page]').forEach(i => i.classList.remove('active'));

  const pageEl = document.getElementById('p-' + page);
  if (pageEl) pageEl.classList.add('active');

  const sideEl = document.querySelector(`.sidebar-item[data-page="${page}"]`);
  if (sideEl) sideEl.classList.add('active');

  document.getElementById('topbar-title').textContent = PAGE_TITLES[page] || '';

  // Load data
  if (page === 'reservas') renderReservas();
  if (page === 'historico') renderHistorico();
  if (page === 'autorizacao') renderAutorizacao();
  if (page === 'nova-reserva') resetNovaReserva();
}

// ============================================================
//  RESERVAS PAGE
// ============================================================
function renderReservas() {
  const list = document.getElementById('reservas-list');
  let items = reservas.filter(r => reservasFilter === 'todos' || r.sport === reservasFilter);
  const upcoming = items.filter(r => r.status !== 'cancelada');

  document.getElementById('stat-total').textContent = reservas.length;
  document.getElementById('stat-confirmed').textContent = reservas.filter(r=>r.status==='confirmada').length;
  document.getElementById('stat-cancelled').textContent = reservas.filter(r=>r.status==='cancelada').length;

  if (upcoming.length === 0) {
    list.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-icon">🏟️</div>
      <div class="empty-title">Nenhuma reserva ativa</div>
      <div class="empty-sub">Clique em "+ Nova reserva" para agendar</div>
    </div>`;
    return;
  }

  list.innerHTML = upcoming.map(r => `
    <div class="reserve-card" id="card-${r.id}">
      <div class="reserve-sport-icon ${SPORTS_CLASS[r.sport]}">${SPORTS_ICONS[r.sport]}</div>
      <div class="reserve-info">
        <div class="reserve-sport">${r.sport}</div>
        <div class="reserve-detail">${formatDate(r.date)} · ${r.time} (${r.dur} min)</div>
        <div class="reserve-local">📍 ${r.local}</div>
        <div style="margin-top:0.5rem;">${badgeHtml(r.status)}</div>
        <div class="reserve-actions">
          ${r.status !== 'cancelada' ? `<button class="btn-sm btn-danger" onclick="openCancel(${r.id})">Cancelar</button>` : ''}
          ${r.status === 'pendente' ? `<button class="btn-sm btn-info" onclick="checkIn(${r.id})">Check-in</button>` : ''}
          ${r.status === 'confirmada' ? `<button class="btn-sm btn-success">✓ Confirmado</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function filterReservas(filter, el) {
  reservasFilter = filter;
  document.querySelectorAll('#p-reservas .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderReservas();
}

function checkIn(id) {
  const r = reservas.find(x => x.id === id);
  if (r) { r.status = 'confirmada'; renderReservas(); toast('Check-in realizado!', 'success'); }
}

// ============================================================
//  CANCEL MODAL
// ============================================================
function openCancel(id) {
  cancelTargetId = id;
  document.getElementById('modal-cancel').classList.add('show');
}
function closeModal() {
  document.getElementById('modal-cancel').classList.remove('show');
  cancelTargetId = null;
}
async function confirmCancel() {
  closeModal();
  showLoading();
  // DELETE to API (simulated)
  try {
    await fetch(`${API_BASE}/todos/${cancelTargetId}`, { method: 'DELETE' });
  } catch(e){}
  await sleep(600);
  const r = reservas.find(x => x.id === cancelTargetId);
  if (r) r.status = 'cancelada';
  hideLoading();
  renderReservas();
  toast('Reserva cancelada.', 'error');
}

// ============================================================
//  NOVA RESERVA
// ============================================================
function resetNovaReserva() {
  selectedSport = null;
  selectedTime = null;
  document.querySelectorAll('.sport-select-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('form-reserva').style.display = 'none';
  document.getElementById('res-date').value = '';
  document.getElementById('res-players').value = '';
  document.getElementById('time-slots-container').innerHTML = '';
  clearErrors();
}

function selectSport(sport, el) {
  selectedSport = sport;
  selectedTime = null;
  document.querySelectorAll('.sport-select-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('form-reserva').style.display = 'block';
  document.getElementById('form-reserva-title').textContent = `Agendar — ${sport}`;
  document.getElementById('time-slots-container').innerHTML = '';
}

function cancelForm() {
  resetNovaReserva();
}

function loadSlots() {
  const date = document.getElementById('res-date').value;
  if (!date) return;
  selectedTime = null;

  // Simulate some occupied slots
  const occupied = reservas.filter(r => r.date === date && r.sport === selectedSport && r.status !== 'cancelada').map(r => r.time);

  const container = document.getElementById('time-slots-container');
  container.innerHTML = TIMES.map(t => {
    const isOcc = occupied.includes(t);
    return `<div class="time-slot${isOcc ? ' occupied' : ''}" onclick="${isOcc ? '' : `selectTime('${t}', this)`}">${t}</div>`;
  }).join('');
}

function selectTime(time, el) {
  selectedTime = time;
  document.querySelectorAll('.time-slot').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
}

async function submitReserva() {
  clearErrors();
  const date = document.getElementById('res-date').value;
  const dur = document.getElementById('res-dur').value;
  const players = document.getElementById('res-players').value;
  let valid = true;

  if (!date) { showError('err-res-date'); valid = false; }
  if (!selectedTime) { showError('err-res-time'); valid = false; }
  if (!valid) return;

  showLoading();

  // POST to API
  try {
    await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ title: `${selectedSport} - ${date} ${selectedTime}`, userId: 1, completed: false })
    });
  } catch(e) {}

  await sleep(900);

  const nova = {
    id: ++nextId,
    sport: selectedSport,
    date,
    time: selectedTime,
    dur: parseInt(dur),
    local: 'Quadra poliesportiva UNEX',
    status: 'confirmada',
    players
  };
  reservas.unshift(nova);
  hideLoading();

  // Show confirmation
  document.getElementById('confirm-details').innerHTML = `
    <div class="confirm-row"><span class="confirm-row-label">Esporte</span><span class="confirm-row-value">${SPORTS_ICONS[nova.sport]} ${nova.sport}</span></div>
    <div class="confirm-row"><span class="confirm-row-label">Data</span><span class="confirm-row-value">${formatDate(nova.date)}</span></div>
    <div class="confirm-row"><span class="confirm-row-label">Horário</span><span class="confirm-row-value">${nova.time} (${nova.dur} min)</span></div>
    <div class="confirm-row"><span class="confirm-row-label">Local</span><span class="confirm-row-value">${nova.local}</span></div>
    <div class="confirm-row"><span class="confirm-row-label">Status</span><span class="confirm-row-value">${badgeHtml('confirmada')}</span></div>
  `;
  navTo('confirmacao');
  toast('Reserva confirmada com sucesso!', 'success');
}

// ============================================================
//  HISTORICO
// ============================================================
function filterHist(filter, el) {
  histFilter = filter;
  document.querySelectorAll('#p-historico .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderHistorico();
}

function renderHistorico() {
  const search = (document.getElementById('hist-search').value || '').toLowerCase();
  let items = reservas.filter(r => {
    const matchSport = histFilter === 'todos' || r.sport === histFilter;
    const matchSearch = !search || r.sport.toLowerCase().includes(search) || r.date.includes(search) || r.time.includes(search);
    return matchSport && matchSearch;
  });

  const tbody = document.getElementById('hist-tbody');
  const empty = document.getElementById('hist-empty');

  if (items.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = items.map(r => `
    <tr>
      <td><span style="font-size:1.1rem;">${SPORTS_ICONS[r.sport]}</span> ${r.sport}</td>
      <td>${formatDate(r.date)}</td>
      <td>${r.time} · ${r.dur} min</td>
      <td style="color:var(--text2);">${r.local}</td>
      <td>${badgeHtml(r.status)}</td>
    </tr>
  `).join('');
}

// ============================================================
//  AUTORIZACAO
// ============================================================
function renderAutorizacao() {
  const list = document.getElementById('auth-list');
  const pendentes = reservas.filter(r => r.status === 'pendente');

  if (pendentes.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">✅</div>
      <div class="empty-title">Nenhuma reserva pendente</div>
      <div class="empty-sub">Todas as reservas foram processadas</div>
    </div>`;
    return;
  }

  list.innerHTML = pendentes.map(r => `
    <div class="auth-item" id="auth-${r.id}">
      <div style="font-size:1.8rem;">${SPORTS_ICONS[r.sport]}</div>
      <div class="auth-info">
        <div class="auth-sport">${r.sport}</div>
        <div class="auth-detail">${formatDate(r.date)} · ${r.time} · ${r.dur} min</div>
        <div class="auth-aluno">📍 ${r.local} · ${currentUser.name}</div>
      </div>
      <div style="display:flex; gap:0.5rem; flex-direction:column; align-items:flex-end;">
        ${badgeHtml('pendente')}
        <div style="display:flex; gap:0.4rem;">
          <button class="btn-sm btn-success" onclick="autorizar(${r.id}, 'confirmar')">✓ Confirmar</button>
          <button class="btn-sm btn-danger" onclick="autorizar(${r.id}, 'cancelar')">✕ Recusar</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function autorizar(id, acao) {
  showLoading();
  // PUT to API
  try {
    await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ completed: acao === 'confirmar' })
    });
  } catch(e){}
  await sleep(600);
  const r = reservas.find(x => x.id === id);
  if (r) r.status = acao === 'confirmar' ? 'confirmada' : 'cancelada';
  hideLoading();
  renderAutorizacao();
  toast(acao === 'confirmar' ? 'Reserva autorizada!' : 'Reserva recusada.', acao === 'confirmar' ? 'success' : 'error');
}

// ============================================================
//  PROFILE
// ============================================================
async function saveProfile() {
  const name = document.getElementById('prof-name').value.trim();
  const email = document.getElementById('prof-email').value.trim();
  const phone = document.getElementById('prof-phone').value.trim();
  const mat = document.getElementById('prof-mat').value.trim();

  if (!name || !email) { toast('Preencha todos os campos obrigatórios.', 'error'); return; }

  showLoading();
  // PUT to API
  try {
    await fetch(`${API_BASE}/users/1`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, username: mat, phone })
    });
  } catch(e){}
  await sleep(700);

  currentUser.name = name;
  currentUser.email = email;
  currentUser.phone = phone;
  currentUser.mat = mat;
  currentUser.initials = name.substring(0,2).toUpperCase();
  hideLoading();
  updateUserUI();
  toast('Perfil atualizado com sucesso!', 'success');
}

function handleAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const avatar = document.getElementById('prof-avatar');
    const topAvatar = document.getElementById('topbar-avatar');
    avatar.innerHTML = `<img src="${e.target.result}" alt="avatar">`;
    topAvatar.innerHTML = `<img src="${e.target.result}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  };
  reader.readAsDataURL(file);
}

// ============================================================
//  HELP
// ============================================================
function toggleHelp(item) {
  item.classList.toggle('open');
}

// ============================================================
//  UTILITIES
// ============================================================
function badgeHtml(status) {
  const map = {
    'confirmada': `<span class="badge badge-confirmed">✓ Confirmada</span>`,
    'pendente': `<span class="badge badge-pending">⏳ Pendente</span>`,
    'cancelada': `<span class="badge badge-cancelled">✕ Cancelada</span>`,
  };
  return map[status] || '';
}

function formatDate(str) {
  if (!str) return '';
  const [y,m,d] = str.split('-');
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const date = new Date(str + 'T12:00:00');
  return `${days[date.getDay()]}, ${d}/${m}/${y}`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showLoading() { document.getElementById('loading').classList.add('show'); }
function hideLoading() { document.getElementById('loading').classList.remove('show'); }

function showError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}

function clearErrors() {
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
}

function toast(msg, type='info') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  t.innerHTML = `<span>${icons[type]||''}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(30px)'; t.style.transition='0.3s'; setTimeout(()=>t.remove(), 300); }, 3000);
}

// Set min date for reservations
document.getElementById('res-date').min = new Date().toISOString().split('T')[0];