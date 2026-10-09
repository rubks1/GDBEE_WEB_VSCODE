document.addEventListener('DOMContentLoaded', () => {
  window.renderTopbar('Trợ giúp', 'Hướng dẫn thao tác và hỗ trợ vận hành');
  window.OngVangApp?.setActiveNav?.('hotro');

  const search = document.querySelector('#helpSearch');
  const faqItems = Array.from(document.querySelectorAll('.faq-item'));
  const emptyState = document.querySelector('#faqEmpty');
  const faqCount = document.querySelector('#faqCount');

  search?.addEventListener('input', () => {
    const term = search.value.trim().toLowerCase();
    let visibleCount = 0;
    faqItems.forEach((item) => {
      const match = !term || `${item.dataset.search} ${item.textContent}`.toLowerCase().includes(term);
      item.classList.toggle('hidden', !match);
      if (match) visibleCount += 1;
    });
    emptyState?.classList.toggle('hidden', visibleCount > 0);
    if (faqCount) faqCount.textContent = `${visibleCount} hướng dẫn`;
  });

  document.querySelector('#newSupportRequest')?.addEventListener('click', () => {
    const content = `
      <form id="supportRequestForm" class="support-form">
        <label>Chủ đề<select class="form-control" name="topic"><option>Đặt bàn</option><option>Hóa đơn</option><option>Thực đơn</option><option>Tài khoản & cài đặt</option><option>Khác</option></select></label>
        <label>Email liên hệ<input class="form-control" name="email" type="email" placeholder="ban@example.com" required /></label>
        <label>Mô tả vấn đề<textarea class="form-control" name="message" placeholder="Mô tả ngắn gọn vấn đề bạn gặp..." required></textarea></label>
      </form>
    `;
    window.OngVangApp?.openModal?.('Yêu cầu hỗ trợ', content, [
      { label: 'Hủy', type: 'secondary' },
      { label: 'Gửi yêu cầu', type: 'primary' }
    ]);

    const modal = document.querySelector('#app-modal');
    modal?.querySelector('[data-modal-action="Hủy"]')?.addEventListener('click', () => { modal.innerHTML = ''; });
    modal?.querySelector('[data-modal-action="Gửi yêu cầu"]')?.addEventListener('click', () => {
      const form = modal.querySelector('#supportRequestForm');
      if (!form.reportValidity()) return;
      const request = Object.fromEntries(new FormData(form).entries());
      let requests = [];
      try {
        requests = JSON.parse(localStorage.getItem('ongvang_support_requests') || '[]');
      } catch (error) {
        requests = [];
      }
      requests.unshift({ ...request, id: `YC-${Date.now()}`, createdAt: new Date().toISOString() });
      localStorage.setItem('ongvang_support_requests', JSON.stringify(requests));
      modal.innerHTML = '';
      window.OngVangApp?.showToast?.('Yêu cầu đã được lưu trong mock store.', 'success');
    });
  });
});
