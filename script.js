// ─── DATA ───
let cardHolders = [];
let stockItems = [];
let stockLog = [];
let distributions = [];
const apiBaseUrl = '';

async function apiFetch(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Server error' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return response.json();
}

async function loadAllData() {
  const [cards, stock, stockLogs, dists] = await Promise.all([
    apiFetch('/api/cardholders'),
    apiFetch('/api/stock'),
    apiFetch('/api/stock/log'),
    apiFetch('/api/distributions'),
  ]);
  cardHolders = cards.data;
  stockItems = stock.data;
  stockLog = stockLogs.data;
  distributions = dists.data;
}

// ─── NAVIGATION ───
let currentPage = 'dashboard';
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById('page-' + page).style.display = 'block';
  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
  const titles = {dashboard:'Dashboard',cardholders:'Card Holders',stock:'Stock Management',distribution:'Distribution',reports:'Reports & Analytics'};
  document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
  // close sidebar on mobile
  if(window.innerWidth < 768) toggleSidebar(false);
  createIcons();
}

// ─── SIDEBAR ───
let sidebarOpen = false;
function toggleSidebar(force) {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('mobile-overlay');
  sidebarOpen = force !== undefined ? force : !sidebarOpen;
  if(window.innerWidth < 768) {
    sb.style.position = sidebarOpen ? 'fixed' : '';
    sb.style.zIndex = sidebarOpen ? '50' : '';
    sb.style.left = sidebarOpen ? '0' : '-100%';
    sb.style.top = '0';
    sb.style.height = '100%';
    ov.classList.toggle('show', sidebarOpen);
  }
}

// ─── LOGIN ───
document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  try {
    await apiFetch('/api/login', { method: 'POST', body: { user, pass } });
    await loadAllData();
    document.getElementById('page-login').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    renderCardHolders();
    renderStockCards();
    renderStockLog();
    renderDistributions();
    navigateTo('dashboard');
    createIcons();
  } catch (error) {
    showToast(error.message || 'Login failed');
  }
});

function setupEventHandlers() {
  on('mobile-overlay', 'click', () => toggleSidebar());
  on('mobile-menu-button', 'click', () => toggleSidebar());
  on('view-distribution-button', 'click', () => navigateTo('distribution'));
  on('add-cardholder-button', 'click', toggleAddCardHolder);
  on('cancel-cardholder-button', 'click', toggleAddCardHolder);
  on('cardholder-form', 'submit', submitCardHolder);
  on('ch-search', 'input', filterCardHolders);
  on('ch-filter', 'change', filterCardHolders);
  on('add-stock-button', 'click', toggleAddStock);
  on('cancel-stock-button', 'click', toggleAddStock);
  on('stock-form', 'submit', submitStock);
  on('new-distribution-button', 'click', toggleDistForm);
  on('cancel-distribution-button', 'click', toggleDistForm);
  on('d-card', 'input', updateDistributionName);
  on('distribution-form', 'submit', submitDistribution);
  on('export-report-button', 'click', () => {
    showToast('Report generated for download');
  });

  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
  });
}

function on(id, eventName, handler) {
  const element = document.getElementById(id);
  if (element) element.addEventListener(eventName, handler);
}

function updateDistributionName() {
  const card = document.getElementById('d-card')?.value.trim().toUpperCase();
  const holder = cardHolders.find(c => c.card.toUpperCase() === card);
  if (holder) {
    const nameField = document.getElementById('d-name');
    if (nameField && !nameField.value.trim()) {
      nameField.value = holder.name;
    }
  }
}

function createIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ─── CARD HOLDERS ───
function renderCardHolders(filter) {
  const tbody = document.getElementById('cardholders-tbody');
  let data = [...cardHolders];
  const search = (document.getElementById('ch-search')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('ch-filter')?.value || '';
  if(search) data = data.filter(c => c.name.toLowerCase().includes(search) || c.card.toLowerCase().includes(search));
  if(typeFilter) data = data.filter(c => c.type === typeFilter);
  tbody.innerHTML = data.map(c => `<tr>
    <td class="font-medium">${c.card}</td><td>${c.name}</td>
    <td><span class="badge ${c.type==='BPL'?'badge-blue':c.type==='AAY'?'badge-yellow':c.type==='PHH'?'badge-red':'badge-green'}">${c.type}</span></td>
    <td>${c.members}</td><td>${c.address}</td>
    <td><span class="badge ${c.status==='Active'?'badge-green':'badge-red'}">${c.status}</span></td>
  </tr>`).join('');
}
function filterCardHolders() { renderCardHolders(); }
function toggleAddCardHolder() {
  const f = document.getElementById('add-cardholder-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}
async function submitCardHolder(e) {
  e.preventDefault();
  try {
    const name = document.getElementById('ch-name').value.trim();
    const card = document.getElementById('ch-card').value.trim();
    const type = document.getElementById('ch-category').value;
    const members = Number(document.getElementById('ch-members').value) || 1;
    const address = document.getElementById('ch-address').value.trim() || '-';
    const result = await apiFetch('/api/cardholders', {
      method: 'POST',
      body: { card, name, type, members, address },
    });
    cardHolders = cardHolders.filter(c => c.card !== result.data.card);
    cardHolders.unshift(result.data);
    renderCardHolders();
    toggleAddCardHolder();
    e.target.reset();
    showToast('Card holder registered successfully');
  } catch (error) {
    showToast(error.message || 'Unable to register card holder');
  }
}

// ─── STOCK ───
function renderStockCards() {
  document.getElementById('stock-cards').innerHTML = stockItems.map(s => `
    <div class="rounded-xl p-4 text-center stock-card">
      <span class="text-2xl">${s.emoji}</span>
      <p class="text-lg font-bold mt-1 ${getStockValueClass(s.color)}">${s.qty.toLocaleString()} ${s.unit}</p>
      <p class="text-xs opacity-50">${s.item}</p>
      ${s.qty < 200 ? '<p class="text-xs font-bold mt-1 stock-low-label">⚠ Low</p>' : ''}
    </div>
  `).join('');
}

function getStockValueClass(color) {
  const classes = {
    'var(--primary)': 'stock-card-value-primary',
    'var(--secondary)': 'stock-card-value-secondary',
    '#eab308': 'stock-card-value-warning',
    '#dc2626': 'stock-card-value-danger',
  };

  return classes[color] || 'stock-card-value-primary';
}

function renderStockLog() {
  document.getElementById('stock-log-tbody').innerHTML = stockLog.map(s => `<tr>
    <td>${s.date}</td><td>${s.item}</td>
    <td><span class="badge ${s.type==='Received'?'badge-green':'badge-yellow'}">${s.type}</span></td>
    <td class="font-medium">${s.qty}</td><td>${s.source}</td><td>${s.balance}</td>
  </tr>`).join('');
}
function toggleAddStock() {
  const f = document.getElementById('add-stock-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}
async function submitStock(e) {
  e.preventDefault();
  try {
    const item = document.getElementById('st-item').value;
    const qty = Number(document.getElementById('st-qty').value);
    const source = document.getElementById('st-source').value.trim() || 'Manual Entry';
    const result = await apiFetch('/api/stock', {
      method: 'POST',
      body: { item, qty, source },
    });
    const updated = result.data.updated;
    const logEntry = result.data.log;
    const existingIndex = stockItems.findIndex(s => s.item === updated.item);
    if (existingIndex >= 0) {
      stockItems[existingIndex] = updated;
    } else {
      stockItems.push(updated);
    }
    stockLog.unshift(logEntry);
    renderStockCards();
    renderStockLog();
    toggleAddStock();
    e.target.reset();
    showToast('Stock entry added successfully');
  } catch (error) {
    showToast(error.message || 'Unable to add stock');
  }
}

// ─── DISTRIBUTION ───
function renderDistributions() {
  document.getElementById('dist-tbody').innerHTML = distributions.map(d => `<tr>
    <td class="font-medium">${d.id}</td><td>${d.card}</td><td>${d.name}</td>
    <td>${d.item}</td><td>${d.qty}</td><td>${d.date}</td>
    <td><span class="badge ${d.status==='Delivered'?'badge-green':d.status==='Pending'?'badge-yellow':'badge-red'}">${d.status}</span></td>
  </tr>`).join('');
}
function toggleDistForm() {
  const f = document.getElementById('dist-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}
async function submitDistribution(e) {
  e.preventDefault();
  try {
    const card = document.getElementById('d-card').value.trim();
    let name = document.getElementById('d-name').value.trim();
    const item = document.getElementById('d-item').value;
    const qty = Number(document.getElementById('d-qty').value);
    const status = document.getElementById('d-status').value;
    const existingHolder = cardHolders.find(c => c.card.toUpperCase() === card.toUpperCase());
    if (existingHolder && !name) name = existingHolder.name;
    const result = await apiFetch('/api/distributions', {
      method: 'POST',
      body: { card, name, item, qty, status },
    });
    distributions.unshift(result.data);
    renderDistributions();
    toggleDistForm();
    e.target.reset();
    showToast('Distribution recorded successfully');
  } catch (error) {
    showToast(error.message || 'Unable to record distribution');
  }
}

// ─── TOAST ───
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── RESPONSIVE SIDEBAR ───
function handleResize() {
  const sb = document.getElementById('sidebar');
  if(window.innerWidth >= 768) {
    sb.style.position = '';
    sb.style.zIndex = '';
    sb.style.left = '';
    sb.style.top = '';
    document.getElementById('mobile-overlay').classList.remove('show');
  } else if(!sidebarOpen) {
    sb.style.left = '-100%';
  }
}
window.addEventListener('resize', handleResize);

// Initial render
setupEventHandlers();
createIcons();
handleResize();
