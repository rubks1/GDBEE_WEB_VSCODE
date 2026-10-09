document.addEventListener('DOMContentLoaded', () => {
  window.renderTopbar('Cài đặt', 'Thông tin cơ sở và tùy chọn vận hành');
  window.OngVangApp?.setActiveNav?.('setting');

  const settingsKey = 'ongvang_settings';
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(settingsKey) || '{}');
  } catch (error) {
    saved = {};
  }

  const form = document.querySelector('#settingsForm');
  form?.querySelectorAll('[name]').forEach((input) => {
    if (input.type === 'checkbox') {
      const defaultChecked = input.name === 'darkMode'
        ? document.documentElement.getAttribute('data-theme') === 'dark'
        : input.checked;
      input.checked = saved[input.name] ?? defaultChecked;
    } else if (saved[input.name] !== undefined) {
      input.value = saved[input.name];
    }
  });

  document.querySelector('#darkMode')?.addEventListener('change', (event) => {
    window.OngVangApp?.applyTheme?.(event.target.checked ? 'dark' : 'light');
  });

  document.querySelector('#compactMode')?.addEventListener('change', (event) => {
    document.body.classList.toggle('compact-mode', event.target.checked);
  });
  document.body.classList.toggle('compact-mode', Boolean(saved.compactMode));

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const settings = {};
    form.querySelectorAll('[name]').forEach((input) => {
      settings[input.name] = input.type === 'checkbox' ? input.checked : formData.get(input.name);
    });
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    window.OngVangApp?.showToast?.('Đã lưu cấu hình trên thiết bị này.', 'success');
  });
});
