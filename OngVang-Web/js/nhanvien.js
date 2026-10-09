let employeeRecords = [];
const employeeToken = localStorage.getItem('ongvang_token') || '';

function readCurrentUser() {
  try { return JSON.parse(localStorage.getItem('ongvang_user') || 'null'); } catch { return null; }
}

function escapeEmployeeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function employeeDateInput(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function employeeApi(endpoint, options = {}) {
  return window.OngVangApp.apiRequest(endpoint, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${employeeToken}` }
  });
}

function renderEmployees() {
  const term = (document.querySelector('#employeeSearch')?.value || '').trim().toLowerCase();
  const rows = employeeRecords.filter((employee) => `${employee.employeeCode || ''} ${employee.name} ${employee.phone || ''} ${employee.email || ''} ${employee.address || ''}`.toLowerCase().includes(term));
  document.querySelector('#employeeCount').textContent = String(employeeRecords.length);
  document.querySelector('#activeEmployeeCount').textContent = String(employeeRecords.filter((employee) => employee.status === 'active').length);
  document.querySelector('#inactiveEmployeeCount').textContent = String(employeeRecords.filter((employee) => employee.status !== 'active').length);
  const tbody = document.querySelector('#employeeList');
  tbody.innerHTML = rows.length ? rows.map((employee) => `
    <tr>
      <td><span class="employee-code">${escapeEmployeeText(employee.employeeCode || `NV-${employee.id}`)}</span></td>
      <td class="employee-name"><strong>${escapeEmployeeText(employee.name)}</strong><small>${escapeEmployeeText(employee.position || 'Nhân viên')}</small></td>
      <td class="employee-contact">${escapeEmployeeText(employee.phone || '—')}<small>${escapeEmployeeText(employee.email || '—')}</small></td>
      <td>${escapeEmployeeText(employeeDateInput(employee.birthDate) || '—')}</td>
      <td>${escapeEmployeeText(employee.gender || '—')}</td>
      <td class="employee-address">${escapeEmployeeText(employee.address || '—')}</td>
      <td>${escapeEmployeeText(employeeDateInput(employee.hireDate) || '—')}</td>
      <td>${escapeEmployeeText(employee.username || 'Chưa cấp')}</td>
      <td>${String(employee.role || '').toUpperCase() === 'ADMIN' ? 'Quản trị' : 'Nhân viên'}</td>
      <td><span class="tag ${employee.status === 'active' ? 'success' : 'warning'}">${employee.status === 'active' ? 'Đang làm' : 'Nghỉ việc'}</span></td>
      <td><button class="small-btn" type="button" data-edit-employee="${employee.id}">Sửa</button></td>
    </tr>`).join('') : '<tr><td colspan="11" class="empty-table-cell">Không có hồ sơ phù hợp.</td></tr>';
}

async function loadEmployees() {
  employeeRecords = await employeeApi('/api/employees');
  renderEmployees();
}

function openEmployeeForm(employee = null) {
  const editing = Boolean(employee);
  const content = `
    <form id="employeeForm" class="employee-form form-grid">
      ${editing ? `<p class="form-group full">Mã nhân viên: <strong>${escapeEmployeeText(employee.employeeCode)}</strong></p>` : ''}
      <label class="form-group">Họ và tên<input class="form-control" name="name" maxlength="200" value="${escapeEmployeeText(employee?.name || '')}" required /></label>
      <label class="form-group">Chức vụ<input class="form-control" name="position" maxlength="100" value="${escapeEmployeeText(employee?.position || '')}" /></label>
      <label class="form-group">Số điện thoại<input class="form-control" name="phone" type="tel" maxlength="20" value="${escapeEmployeeText(employee?.phone || '')}" /></label>
      <label class="form-group">Gmail / email<input class="form-control" name="email" type="email" maxlength="200" value="${escapeEmployeeText(employee?.email || '')}" /></label>
      <label class="form-group">Ngày sinh<input class="form-control" name="birthDate" type="date" value="${employeeDateInput(employee?.birthDate)}" /></label>
      <label class="form-group">Giới tính<input class="form-control" name="gender" maxlength="30" value="${escapeEmployeeText(employee?.gender || '')}" /></label>
      <label class="form-group full">Địa chỉ<input class="form-control" name="address" maxlength="300" value="${escapeEmployeeText(employee?.address || '')}" /></label>
      <label class="form-group">Ngày vào làm<input class="form-control" name="hireDate" type="date" value="${employeeDateInput(employee?.hireDate)}" /></label>
      <label class="form-group">Trạng thái<select class="form-control" name="status"><option value="active" ${employee?.status !== 'off' ? 'selected' : ''}>Đang làm</option><option value="off" ${employee?.status === 'off' ? 'selected' : ''}>Nghỉ việc</option></select></label>
      <label class="form-group">Tên đăng nhập<input class="form-control" name="username" maxlength="100" value="${escapeEmployeeText(employee?.username || '')}" /></label>
      <label class="form-group">${editing ? 'Đổi mật khẩu (để trống nếu giữ nguyên)' : 'Mật khẩu ban đầu (để trống nếu chưa cấp tài khoản)'}<input class="form-control" name="password" type="password" minlength="4" autocomplete="new-password" /></label>
    </form>`;
  window.OngVangApp.openModal(editing ? 'Cập nhật hồ sơ nhân viên' : 'Thêm nhân viên', content, [
    { label: 'Hủy', type: 'secondary' }, { label: 'Lưu', type: 'primary' }
  ]);
  const modal = document.querySelector('#app-modal');
  modal.querySelector('[data-modal-action="Hủy"]')?.addEventListener('click', () => { modal.innerHTML = ''; });
  modal.querySelector('[data-modal-action="Lưu"]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const form = modal.querySelector('#employeeForm');
    if (!form.reportValidity()) return;
    button.disabled = true;
    const fields = Object.fromEntries(new FormData(form).entries());
    try {
      await employeeApi(`/api/employees${editing ? `/${employee.id}` : ''}`, { method: editing ? 'PUT' : 'POST', body: fields });
      modal.innerHTML = '';
      await loadEmployees();
      window.OngVangApp.showToast('Đã lưu hồ sơ nhân viên.', 'success');
    } catch (error) {
      button.disabled = false;
      window.OngVangApp.showToast(error.message || 'Không thể lưu hồ sơ nhân viên.', 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const user = readCurrentUser();
  if (!employeeToken) {
    window.location.replace('login.html');
    return;
  }
  if (String(user?.role || '').toUpperCase() !== 'ADMIN') {
    window.location.replace('home.html');
    return;
  }
  window.renderTopbar('Quản lý nhân viên', 'Hồ sơ và thông tin nhân sự · chỉ dành cho admin');
  window.OngVangApp?.setActiveNav?.('nhanvien');
  loadEmployees().catch((error) => {
    if (error.message.includes('401') || error.message.toLowerCase().includes('sign in')) window.location.replace('login.html');
    else window.OngVangApp.showToast(error.message || 'Không thể tải danh sách nhân viên.', 'error');
  });
  document.querySelector('#employeeSearch')?.addEventListener('input', renderEmployees);
  document.querySelector('#addEmployee')?.addEventListener('click', () => openEmployeeForm());
  document.querySelector('#employeeList')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-edit-employee]');
    const employee = employeeRecords.find((record) => String(record.id) === button?.dataset.editEmployee);
    if (employee) openEmployeeForm(employee);
  });
});
