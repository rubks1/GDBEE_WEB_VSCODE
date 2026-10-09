let loyaltyCards = [];

function escapeLoyaltyText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function renderLoyaltyCards() {
  const term = (document.querySelector('#loyaltySearch')?.value || '').trim().toLowerCase();
  const filtered = loyaltyCards.filter((card) => `${card.code} ${card.name} ${card.phone || ''}`.toLowerCase().includes(term));
  const tbody = document.querySelector('#loyaltyList');
  document.querySelector('#loyaltyCount').textContent = String(loyaltyCards.length);
  tbody.innerHTML = filtered.length ? filtered.map((card) => `
    <tr><td><strong class="loyalty-code">${escapeLoyaltyText(card.code)}</strong></td>
      <td>${escapeLoyaltyText(card.name)}</td><td>${escapeLoyaltyText(card.phone || '—')}</td>
      <td>${escapeLoyaltyText(card.membership || 'Thường')}</td><td>${Number(card.points || 0).toLocaleString('vi-VN')}</td></tr>
  `).join('') : '<tr><td colspan="5" class="empty-table-cell">Chưa có thẻ thành viên phù hợp.</td></tr>';
}

async function loadLoyaltyCards() {
  loyaltyCards = await window.OngVangApp.apiRequest('/api/loyalty-cards');
  renderLoyaltyCards();
}

document.addEventListener('DOMContentLoaded', () => {
  window.renderTopbar('Khách hàng thân thiết', 'Quản lý thẻ thành viên do khách hàng tự nguyện đăng ký');
  window.OngVangApp?.setActiveNav?.('khachhang');
  loadLoyaltyCards().catch(() => window.OngVangApp?.showToast?.('Không thể tải danh sách thẻ thành viên.', 'warning'));
  document.querySelector('#loyaltySearch')?.addEventListener('input', renderLoyaltyCards);
  document.querySelector('#loyaltyForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const submit = document.querySelector('#loyaltySubmit');
    submit.disabled = true;
    try {
      const card = await window.OngVangApp.apiRequest('/api/loyalty-cards', { method: 'POST', body: Object.fromEntries(new FormData(form).entries()) });
      const result = document.querySelector('#loyaltyCreated');
      result.innerHTML = `Đã tạo thẻ cho <strong>${escapeLoyaltyText(card.name)}</strong><strong>${escapeLoyaltyText(card.code)}</strong><small>Hãy cung cấp mã này cho khách để sử dụng khi thanh toán.</small>`;
      result.hidden = false;
      form.reset();
      await loadLoyaltyCards();
      window.OngVangApp?.showToast?.('Đã đăng ký thẻ thành viên.', 'success');
    } catch (error) {
      window.OngVangApp?.showToast?.(error.message || 'Không thể tạo thẻ thành viên.', 'error');
    } finally {
      submit.disabled = false;
    }
  });
});
