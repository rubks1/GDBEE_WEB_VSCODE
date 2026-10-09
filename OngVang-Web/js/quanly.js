const mockRegistry = [
  { id: '#MN-01', name: 'Phở bò', type: 'Món ăn', status: 'Hoạt động' },
  { id: '#MN-02', name: 'Cơm gà', type: 'Món ăn', status: 'Hoạt động' },
  { id: '#MN-03', name: 'Trà đào', type: 'Đồ uống', status: 'Hoạt động' },
  { id: '#BN-04', name: 'Bàn 02', type: 'Bàn', status: 'Đang dùng' },
  { id: '#VC-09', name: 'WELCOME10', type: 'Voucher', status: 'Còn hiệu lực' }
];

const registryStorageKey = 'ongvang_registry';
let registryRecords = readRegistry();
const resourceByType = {
  'Món ăn': '/api/menu',
  'Đồ uống': '/api/menu',
  'Bàn': '/api/tables',
  'Voucher': '/api/vouchers'
};

function toRegistryRecords(collections) {
  const prefixes = { menu: 'MN', tables: 'BN', vouchers: 'VC' };
  const rows = [];
  Object.entries(collections).forEach(([collection, entries]) => {
    entries.forEach((entry) => {
      const type = collection === 'menu' ? entry.category : collection === 'tables' ? 'Bàn' : 'Voucher';
      const status = collection === 'menu'
        ? entry.status === 'unavailable' ? 'Tạm ngưng' : 'Hoạt động'
        : collection === 'tables'
          ? ({ available: 'Hoạt động', occupied: 'Đang dùng', reserved: 'Đang dùng', maintenance: 'Tạm ngưng' }[entry.status] || 'Hoạt động')
          : entry.status === 'active' ? 'Hoạt động' : 'Tạm ngưng';
      rows.push({
        id: `#${prefixes[collection]}-${String(entry.id).padStart(2, '0')}`,
        apiId: entry.id,
        apiRecord: entry,
        name: entry.name || entry.code,
        type,
        status
      });
    });
  });
  return rows;
}

async function loadRegistry() {
  const [menu, tables, customers, vouchers] = await Promise.all([
    window.OngVangApp.apiRequest('/api/menu'),
    window.OngVangApp.apiRequest('/api/tables'),
    window.OngVangApp.apiRequest('/api/customers'),
    window.OngVangApp.apiRequest('/api/vouchers')
  ]);
  registryRecords = toRegistryRecords({ menu, tables, vouchers });
  window.OngVangApp.writeCollection('ongvang_menu', menu);
  window.OngVangApp.writeCollection('ongvang_tables', tables);
  window.OngVangApp.writeCollection('ongvang_customers', customers);
}

function createRegistryPayload(type, name, status, previous = {}, fields = {}) {
  if (type === 'Món ăn' || type === 'Đồ uống') {
    return { ...previous, name, category: type, status: status === 'Tạm ngưng' ? 'unavailable' : 'available', price: previous.price || 0 };
  }
  if (type === 'Bàn') {
    const tableStatus = { 'Đang dùng': 'occupied', 'Tạm ngưng': 'maintenance' }[status] || 'available';
    return { ...previous, name, status: tableStatus, capacity: previous.capacity || 4, area: previous.area || 'Trong nhà' };
  }
  if (type === 'Voucher') return {
    ...previous,
    name,
    code: String(fields.voucherCode || '').trim().toUpperCase(),
    discountType: fields.discountType,
    discountValue: Number(fields.discountValue),
    minimumOrder: Number(fields.minimumOrder || 0),
    maximumDiscount: fields.maximumDiscount === '' ? null : Number(fields.maximumDiscount),
    quantity: Number(fields.quantity || 0),
    startsAt: fields.startsAt,
    endsAt: fields.endsAt,
    status: status === 'Tạm ngưng' ? 'inactive' : 'active'
  };
  return { ...previous, name };
}

function voucherInputDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function readRegistry() {
  try {
    const stored = JSON.parse(localStorage.getItem(registryStorageKey) || 'null');
    return Array.isArray(stored) ? stored.filter((item) => !['Nhân viên', 'Khách hàng'].includes(item.type)) : mockRegistry;
  } catch (error) {
    return mockRegistry;
  }
}

function escapeRegistryText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderRegistry(rows = registryRecords) {
  const tbody = document.querySelector('tbody');
  if (!tbody) return;
  const count = document.querySelector('#registryCount');
  if (count) count.textContent = rows.length;

  tbody.innerHTML = rows.length
    ? rows.map((item) => `
        <tr>
          <td>${escapeRegistryText(item.id)}</td>
          <td>${escapeRegistryText(item.name)}${item.type === 'Voucher' ? `<br><small>${escapeRegistryText(item.apiRecord?.code || '')}</small>` : ''}</td>
          <td>${escapeRegistryText(item.type)}</td>
          <td>
            <span class="tag ${
              item.status === 'Hoạt động' || item.status === 'Còn hiệu lực' || item.status === 'Đang làm'
                ? 'success'
                : item.status === 'Đang dùng' || item.status === 'Thân thiết'
                  ? 'info'
                  : 'warning'
            }">${escapeRegistryText(item.status)}</span>
          </td>
          <td><button class="small-btn" type="button" data-edit-id="${escapeRegistryText(item.id)}" aria-label="Sửa ${escapeRegistryText(item.name)}">Sửa</button></td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" style="text-align:center; color: var(--muted); padding: 1.5rem;">Không có dữ liệu phù hợp.</td></tr>';

  document.querySelector('#foodCount').textContent = registryRecords.filter((item) => ['Món ăn', 'Đồ uống'].includes(item.type)).length;
  document.querySelector('#tableCount').textContent = registryRecords.filter((item) => item.type === 'Bàn').length;
  document.querySelector('#voucherCount').textContent = registryRecords.filter((item) => item.type === 'Voucher').length;
}

document.addEventListener('DOMContentLoaded', () => {
  window.renderTopbar('Danh mục & nhân sự', 'Quản lý dữ liệu vận hành của nhà hàng');
  window.OngVangApp?.setActiveNav?.('quanly');

  renderRegistry();

  const searchInput = document.querySelector('#registrySearch');
  const typeFilter = document.querySelector('#registryTypeFilter');
  typeFilter?.querySelectorAll('option').forEach((option) => {
    if (option.value.startsWith('Kh')) option.remove();
  });

  const applyFilters = () => {
    const term = (searchInput?.value || '').trim().toLowerCase();
    const filterValue = typeFilter?.value || 'Tất cả';

    const filtered = registryRecords.filter((row) => {
      const text = `${row.id} ${row.name} ${row.type} ${row.apiRecord?.code || ''}`.toLowerCase();
      const matchesSearch = !term || text.includes(term);
      const matchesType = filterValue === 'Tất cả' || row.type === filterValue;
      return matchesSearch && matchesType;
    });

    renderRegistry(filtered);
  };

  searchInput?.addEventListener('input', applyFilters);
  typeFilter?.addEventListener('change', applyFilters);

  loadRegistry()
    .then(applyFilters)
    .catch(() => window.OngVangApp?.showToast?.('Không thể tải danh mục từ máy chủ.', 'warning'));

  const openRegistryModal = (item = null) => {
    const editing = Boolean(item);
    const voucher = item?.type === 'Voucher' ? item.apiRecord : {};
    const today = new Date();
    const todayInput = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const defaultEnd = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
    const defaultEndInput = new Date(defaultEnd.getTime() - defaultEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const voucherFields = `
      <div class="form-grid voucher-fields ${item?.type === 'Voucher' ? '' : 'hidden'}">
        <label class="form-group full">Mã voucher<input class="form-control" name="voucherCode" value="${escapeRegistryText(voucher?.code || '')}" maxlength="30" pattern="[A-Za-z0-9_-]{2,30}" required /></label>
        <label class="form-group">Kiểu giảm<select class="form-control" name="discountType"><option value="percent" ${voucher?.discountType === 'percent' ? 'selected' : ''}>Phần trăm (%)</option><option value="fixed" ${voucher?.discountType === 'fixed' ? 'selected' : ''}>Số tiền cố định</option></select></label>
        <label class="form-group">Giá trị giảm<input class="form-control" name="discountValue" type="number" min="0.01" step="0.01" value="${escapeRegistryText(voucher?.discountValue ?? '')}" required /></label>
        <label class="form-group">Đơn tối thiểu (đ)<input class="form-control" name="minimumOrder" type="number" min="0" step="1000" value="${escapeRegistryText(voucher?.minimumOrder ?? 0)}" /></label>
        <label class="form-group">Giảm tối đa (đ)<input class="form-control" name="maximumDiscount" type="number" min="0" step="1000" value="${escapeRegistryText(voucher?.maximumDiscount ?? '')}" placeholder="Để trống = không giới hạn" /></label>
        <label class="form-group">Số lượt sử dụng<input class="form-control" name="quantity" type="number" min="1" step="1" value="${escapeRegistryText(voucher?.quantity ?? 100)}" required /></label>
        <label class="form-group">Bắt đầu<input class="form-control" name="startsAt" type="date" value="${escapeRegistryText(voucherInputDate(voucher?.startsAt) || todayInput)}" required /></label>
        <label class="form-group">Kết thúc<input class="form-control" name="endsAt" type="date" value="${escapeRegistryText(voucherInputDate(voucher?.endsAt) || defaultEndInput)}" required /></label>
      </div>
    `;
    const content = `
      <form id="registryForm" class="registry-form">
        <label class="form-group">Tên mục<input class="form-control" name="name" value="${escapeRegistryText(item?.name || '')}" required /></label>
        <div class="form-grid">
          <label class="form-group">Loại<select class="form-control" name="type" ${editing ? 'disabled' : ''}>${['Món ăn', 'Đồ uống', 'Bàn', 'Voucher'].map((type) => `<option ${item?.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select>${editing ? `<input type="hidden" name="type" value="${escapeRegistryText(item.type)}" />` : ''}</label>
          <label class="form-group">Trạng thái<select class="form-control" name="status">${['Hoạt động', 'Đang dùng', 'Đang làm', 'Thân thiết', 'Còn hiệu lực', 'Tạm ngưng'].map((status) => `<option ${item?.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label>
        </div>
        ${voucherFields}
      </form>
    `;
    window.OngVangApp?.openModal?.(editing ? 'Cập nhật mục' : 'Thêm mục mới', content, [
      { label: 'Hủy', type: 'secondary' },
      { label: 'Lưu', type: 'primary' }
    ]);

    const modalRoot = document.querySelector('#app-modal');
    const typeSelect = modalRoot?.querySelector('[name="type"]');
    typeSelect?.addEventListener('change', () => {
      modalRoot.querySelector('.voucher-fields')?.classList.toggle('hidden', typeSelect.value !== 'Voucher');
    });
    modalRoot?.querySelector('[data-modal-action="Hủy"]')?.addEventListener('click', () => { modalRoot.innerHTML = ''; });
    modalRoot?.querySelector('[data-modal-action="Lưu"]')?.addEventListener('click', async () => {
      const form = modalRoot.querySelector('#registryForm');
      const formData = new FormData(form);
      const name = String(formData.get('name') || '').trim();
      if (!name) {
        form.querySelector('[name="name"]').focus();
        return;
      }

      const type = formData.get('type');
      const endpoint = resourceByType[type];
      if (type === 'Voucher' && !form.reportValidity()) return;
      const payload = createRegistryPayload(type, name, formData.get('status'), item?.apiRecord, Object.fromEntries(formData.entries()));
      try {
        await window.OngVangApp.apiRequest(`${endpoint}${editing ? `/${item.apiId}` : ''}`, {
          method: editing ? 'PUT' : 'POST',
          body: payload
        });
        await loadRegistry();
        modalRoot.innerHTML = '';
        applyFilters();
        window.OngVangApp?.showToast?.(editing ? 'Đã cập nhật và đồng bộ mục.' : 'Đã thêm và đồng bộ mục.', 'success');
      } catch (error) {
        window.OngVangApp?.showToast?.('Không thể lưu mục lên máy chủ.', 'warning');
      }
    });
  };

  document.querySelector('#addRegistryButton')?.addEventListener('click', () => openRegistryModal());
  document.querySelector('tbody')?.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-id]');
    if (!editButton) return;
    const item = registryRecords.find((record) => record.id === editButton.dataset.editId);
    if (item) openRegistryModal(item);
  });
});
