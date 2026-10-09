window.OngVangApp = window.OngVangApp || {};
const isLocalAddress = /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|\[::1\])$/i.test(window.location.hostname);
const isSeparateLocalWebServer = isLocalAddress && window.location.port && window.location.port !== '3001';
const fallbackApiBase = window.location.protocol === 'file:'
  ? 'http://127.0.0.1:3001'
  : isSeparateLocalWebServer
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : window.location.origin;
window.OngVangApp.apiBase = (window.ONGVANG_API_BASE || fallbackApiBase).replace(/\/$/, '');

window.OngVangApp.applyTheme = function (theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ongvang_theme', theme);
};

window.OngVangApp.initializeTheme = function () {
  const saved = localStorage.getItem('ongvang_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const nextTheme = saved || (prefersDark ? 'dark' : 'light');
  this.applyTheme(nextTheme);
};

window.OngVangApp.toggleTheme = function () {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  this.applyTheme(next);
};

window.OngVangApp.apiRequest = async function (endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(`${this.apiBase}${endpoint}`, config);
  } catch {
    throw new Error(`Không thể kết nối đến máy chủ API tại ${this.apiBase}. Hãy kiểm tra backend đang chạy và địa chỉ máy chủ.`);
  }
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail = payload && typeof payload === 'object' ? payload.message : null;
    const fallbackDetail = typeof payload === 'string' ? payload.trim().replace(/\s+/g, ' ').slice(0, 240) : '';
    throw new Error(detail || fallbackDetail || `Yêu cầu thất bại (HTTP ${response.status} ${response.statusText}).`);
  }

  return payload;
};

window.OngVangApp.readCollection = function (key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
};

window.OngVangApp.writeCollection = function (key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('ongvang:datachange', { detail: { key, value } }));
};

window.OngVangApp.subscribeCollection = function (key, callback) {
  const handleStorage = (event) => {
    if (event.key === key) callback(window.OngVangApp.readCollection(key));
  };
  const handleDataChange = (event) => {
    if (event.detail?.key === key) callback(event.detail.value);
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('ongvang:datachange', handleDataChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('ongvang:datachange', handleDataChange);
  };
};

window.OngVangApp.normalizeInvoice = function (invoice) {
  const statuses = {
    paid: 'Đã thanh toán',
    pending: 'Chờ thanh toán',
    serving: 'Đang phục vụ',
    cancelled: 'Hủy',
    'Đã thanh toán': 'Đã thanh toán',
    'Chờ thanh toán': 'Chờ thanh toán',
    'Đang phục vụ': 'Đang phục vụ',
    'Hủy': 'Hủy'
  };
  const invoiceCode = invoice.invoiceCode || invoice.id;
  return {
    ...invoice,
    id: String(invoiceCode),
    invoiceCode: String(invoiceCode),
    customer: invoice.customer || invoice.customerName || 'Khách lẻ',
    employee: invoice.employee || (invoice.employeeId ? `NV-${String(invoice.employeeId).padStart(2, '0')}` : 'NV-01'),
    orderType: invoice.orderType || (invoice.table ? 'Dùng tại bàn' : 'Mang đi'),
    date: invoice.date || (invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('vi-VN') : ''),
    subtotal: Number(invoice.subtotal ?? invoice.total ?? 0),
    discount: Number(invoice.discount || 0),
    voucherCode: invoice.voucherCode || null,
    total: Number(invoice.total || 0),
    status: statuses[invoice.status] || invoice.status || 'Chờ thanh toán',
    items: Array.isArray(invoice.items) ? invoice.items : []
  };
};

window.OngVangApp.loadInvoices = async function () {
  const apiInvoices = await this.apiRequest('/api/invoices');
  const invoices = apiInvoices.map((invoice) => this.normalizeInvoice(invoice));
  const knownCodes = new Set(invoices.map((invoice) => invoice.invoiceCode));
  const localInvoices = this.readCollection('ongvang_invoices');
  const backendStatuses = {
    'Đã thanh toán': 'paid',
    'Chờ thanh toán': 'pending',
    'Đang phục vụ': 'serving',
    'Hủy': 'cancelled'
  };

  for (const localInvoice of localInvoices) {
    const invoice = this.normalizeInvoice(localInvoice);
    if (knownCodes.has(invoice.invoiceCode)) continue;
    const savedInvoice = await this.apiRequest('/api/invoices', {
      method: 'POST',
      body: {
        invoiceCode: invoice.invoiceCode,
        customerName: invoice.customer,
        table: invoice.table,
        date: invoice.date,
        employee: invoice.employee,
        total: invoice.total,
        status: backendStatuses[invoice.status] || 'pending',
        items: invoice.items,
        paymentMethod: invoice.paymentMethod,
        orderType: invoice.orderType
      }
    });
    invoices.unshift(this.normalizeInvoice(savedInvoice));
    knownCodes.add(invoice.invoiceCode);
  }

  this.writeCollection('ongvang_invoices', invoices);
  return invoices;
};

window.OngVangApp.setActiveNav = function (currentPage) {
  const links = document.querySelectorAll('.admin-nav a');
  links.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const targetPage = href.split('/').pop().replace(/\.html(?:[?#].*)?$/i, '');
    const isMatch = targetPage === currentPage;
    link.classList.toggle('active', isMatch);
  });
};

window.OngVangApp.showToast = function (message, type = 'success') {
  const existing = document.querySelector('.toast-container');
  if (!existing) {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const container = document.querySelector('.toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 400);
  }, 2600);
};

window.OngVangApp.initializeTheme();
