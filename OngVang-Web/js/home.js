function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function updateDashboardSummary(dashboard) {
  const cards = document.querySelectorAll('.stat-card');
  if (!cards.length) return;

  cards[0].querySelector('strong').textContent = `${dashboard.totalTables ?? 0}`;
  cards[0].querySelector('small').textContent = `${dashboard.tableAvailable ?? 0} bàn trống`;

  cards[1].querySelector('strong').textContent = `${dashboard.pendingOrders ?? 0}`;
  cards[1].querySelector('small').textContent = `${dashboard.orderCount ?? 0} đơn hàng tổng`;

  cards[2].querySelector('strong').textContent = formatMoney(dashboard.revenueToday ?? 0);
  cards[2].querySelector('small').textContent = 'Hôm nay';

  cards[3].querySelector('strong').textContent = `${dashboard.customerCount ?? 0}`;
  cards[3].querySelector('small').textContent = '+18% so với tuần trước';
}

function escapeDashboardText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderRecentInvoices() {
  const tbody = document.querySelector('#recentInvoices');
  if (!tbody) return;

  const invoices = window.OngVangApp.readCollection('ongvang_invoices');
  tbody.innerHTML = invoices.slice(0, 5).map((invoice) => {
    const statusClass = invoice.status === 'Đã thanh toán' ? 'success' : invoice.status === 'Hủy' ? 'warning' : 'info';
    return `
      <tr>
        <td>${escapeDashboardText(invoice.id)}</td>
        <td>${escapeDashboardText(invoice.table || 'Mang đi')}</td>
        <td>${escapeDashboardText(invoice.customer)}</td>
        <td>${escapeDashboardText(invoice.date)}</td>
        <td><span class="tag ${statusClass}">${escapeDashboardText(invoice.status)}</span></td>
        <td>${formatMoney(invoice.total)}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6">Chưa có hóa đơn.</td></tr>';
}

document.addEventListener('DOMContentLoaded', async () => {
  window.renderTopbar('Tổng quan nhà hàng', 'Theo dõi nhanh tình trạng bàn, hóa đơn và doanh thu');
  window.OngVangApp?.setActiveNav?.('home');
  window.OngVangApp.subscribeCollection('ongvang_invoices', renderRecentInvoices);

  try {
    await window.OngVangApp.loadInvoices();
  } catch (error) {
    window.OngVangApp?.showToast?.('Không thể tải hóa đơn từ máy chủ.', 'warning');
  }
  renderRecentInvoices();
  window.OngVangApp.subscribeCollection('ongvang_invoices', renderRecentInvoices);

  const token = localStorage.getItem('ongvang_token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const dashboard = await window.OngVangApp.apiRequest('/api/dashboard', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    updateDashboardSummary(dashboard);
    window.OngVangApp.showToast('Dữ liệu dashboard đã được đồng bộ', 'success');
  } catch (error) {
    console.error('Dashboard load failed:', error);
    window.OngVangApp.showToast('Không thể đồng bộ dashboard, đang hiển thị dữ liệu cục bộ', 'warning');
  }
});
