window.renderTopbar = function (title = 'Tổng quan nhà hàng', description = 'Theo dõi nhanh tình trạng bàn, hóa đơn và doanh thu') {
  const host = document.getElementById('topbar');
  if (!host) return;

  const today = new Date();
  const dateText = today.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  host.innerHTML = `
    <header class="admin-topbar">
      <button class="icon-button nav-toggle" type="button" aria-label="Mở điều hướng" title="Mở điều hướng"><i class="fa-solid fa-bars"></i></button>
      <div class="topbar-title">
        <h1>${title}</h1>
        <p>${description}</p>
      </div>

      <div class="topbar-actions">
        <button class="topbar-search" type="button" data-search-toggle><i class="fa-solid fa-magnifying-glass"></i><span>Tìm nhanh</span><kbd>/</kbd></button>
        <span class="today"><i class="fa-regular fa-calendar"></i>${dateText}</span>
        <button class="icon-button notification-button" type="button" data-notifications aria-label="Thông báo" title="Thông báo"><i class="fa-regular fa-bell"></i><span></span></button>
        <button class="icon-button" type="button" data-theme-toggle aria-label="Chuyển giao diện" title="Chuyển giao diện"><i class="fa-solid fa-moon"></i></button>
      </div>
      <div class="global-search-panel hidden" role="dialog" aria-label="Tìm nhanh trong hệ thống">
        <label for="globalSearchInput">Đi tới màn hình</label>
        <div class="global-search-input"><i class="fa-solid fa-magnifying-glass"></i><input id="globalSearchInput" type="search" placeholder="Tìm chức năng..." autocomplete="off" /></div>
        <div class="global-search-results"></div>
      </div>
    </header>
  `;

  const navToggle = host.querySelector('.nav-toggle');
  navToggle?.addEventListener('click', () => document.body.classList.toggle('nav-open'));

  const searchPanel = host.querySelector('.global-search-panel');
  const searchInput = host.querySelector('#globalSearchInput');
  const searchResults = host.querySelector('.global-search-results');
  const navLinks = Array.from(document.querySelectorAll('.admin-nav a'));

  const renderSearchResults = (term = '') => {
    const matches = navLinks.filter((link) => link.textContent.toLowerCase().includes(term.toLowerCase()));
    searchResults.innerHTML = '';
    matches.forEach((link) => {
      const result = document.createElement('a');
      result.href = link.href;
      result.className = 'global-search-result';
      result.innerHTML = link.querySelector('i')?.outerHTML || '';
      const label = document.createElement('span');
      label.textContent = link.querySelector('span')?.textContent || link.textContent.trim();
      result.appendChild(label);
      result.addEventListener('click', () => document.body.classList.remove('nav-open'));
      searchResults.appendChild(result);
    });
    if (!matches.length) searchResults.innerHTML = '<p class="search-empty">Không tìm thấy chức năng.</p>';
  };

  const toggleSearch = (show) => {
    searchPanel.classList.toggle('hidden', !show);
    if (show) {
      renderSearchResults(searchInput.value);
      searchInput.focus();
    }
  };

  host.querySelector('[data-search-toggle]')?.addEventListener('click', () => {
    toggleSearch(searchPanel.classList.contains('hidden'));
  });
  searchInput?.addEventListener('input', () => renderSearchResults(searchInput.value));
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') toggleSearch(false);
    if (event.key === 'Enter') searchResults.querySelector('a')?.click();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      toggleSearch(true);
    }
    if (event.key === 'Escape') toggleSearch(false);
  });
  renderSearchResults();

  host.querySelector('[data-notifications]')?.addEventListener('click', () => {
    window.OngVangApp?.showToast?.('Bạn đã xem các thông báo mới nhất.', 'info');
  });

  const toggleButton = host.querySelector('[data-theme-toggle]');
  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      window.OngVangApp?.toggleTheme?.();
      const icon = toggleButton.querySelector('i');
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'fa-sun' : 'fa-moon';
      icon.className = `fa-solid ${next}`;
    });

    const icon = toggleButton.querySelector('i');
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'fa-sun' : 'fa-moon';
    icon.className = `fa-solid ${current}`;
  }
};
