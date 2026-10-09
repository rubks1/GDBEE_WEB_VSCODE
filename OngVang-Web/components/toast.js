window.OngVangApp = window.OngVangApp || {};

window.OngVangApp.showToast = function (message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('toast-hide'), 2000);
  setTimeout(() => toast.remove(), 2600);
};
