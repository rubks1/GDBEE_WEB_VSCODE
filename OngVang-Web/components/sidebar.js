window.renderSidebar = function (activePage = 'home') {
  const host = document.getElementById('sidebar');
  if (!host) return;
  let currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem('ongvang_user') || 'null'); } catch { currentUser = null; }
  const employeeNavLink = String(currentUser?.role || '').toUpperCase() === 'ADMIN'
    ? `<a href="nhanvien.html" class="${activePage === 'nhanvien' ? 'active' : ''}"><i class="fa-solid fa-users-gear"></i><span>Quản lý nhân viên</span></a>`
    : '';

  host.innerHTML = `
    <aside class="admin-sidebar">
      <a class="brand" href="home.html" aria-label="Golden Bee, trang tổng quan">
        <span class="brand-mark">GB</span>
        <div>
          <strong>Golden Bee</strong>
          <small>RESTAURANT OS</small>
        </div>
      </a>

      <nav class="admin-nav" aria-label="Sidebar navigation">
        <span class="nav-section-label">ĐIỀU HÀNH</span>
        <a href="home.html" class="${activePage === 'home' ? 'active' : ''}"><i class="fa-solid fa-chart-pie"></i><span>Tổng quan</span><kbd>1</kbd></a>
        <a href="datban.html" class="${activePage === 'datban' ? 'active' : ''}"><i class="fa-solid fa-table-cells-large"></i><span>Bàn & đặt chỗ</span></a>
        <a href="hoadon.html" class="${activePage === 'hoadon' ? 'active' : ''}"><i class="fa-solid fa-bag-shopping"></i><span>Gọi món</span><kbd>2</kbd></a>

        <span class="nav-section-label">KINH DOANH</span>
        <a href="quanlyhoadon.html" class="${activePage === 'quanlyhoadon' ? 'active' : ''}"><i class="fa-solid fa-receipt"></i><span>Hóa đơn</span></a>
        <a href="quanly.html" class="${activePage === 'quanly' ? 'active' : ''}"><i class="fa-solid fa-boxes-stacked"></i><span>Danh mục nhà hàng</span></a>
        <a href="khachhang.html" class="${activePage === 'khachhang' ? 'active' : ''}"><i class="fa-solid fa-address-card"></i><span>Khách hàng thân thiết</span></a>
        ${employeeNavLink}

        <span class="nav-section-label">HỆ THỐNG</span>
        <a href="setting.html" class="${activePage === 'setting' ? 'active' : ''}"><i class="fa-solid fa-sliders"></i><span>Cài đặt</span></a>
        <a href="hotro.html" class="${activePage === 'hotro' ? 'active' : ''}"><i class="fa-regular fa-circle-question"></i><span>Trợ giúp</span></a>
      </nav>

      <div class="sidebar-footer">
        <div class="service-status"><span></span><div><strong>Đang hoạt động</strong><small>Dữ liệu mô phỏng</small></div></div>
        <a class="sidebar-profile" href="setting.html">
          <span class="avatar">NV</span>
          <span><strong>Nhân viên</strong><small>Quản trị nhà hàng</small></span>
          <i class="fa-solid fa-ellipsis"></i>
        </a>
      </div>
    </aside>
    <button class="sidebar-scrim" type="button" aria-label="Đóng điều hướng"></button>
  `;

  window.OngVangApp?.setActiveNav?.(activePage);

  host.querySelector('.sidebar-scrim')?.addEventListener('click', () => {
    document.body.classList.remove('nav-open');
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page || 'home';
    window.renderSidebar(page);
  });
} else {
  const page = document.body.dataset.page || 'home';
  window.renderSidebar(page);
}
