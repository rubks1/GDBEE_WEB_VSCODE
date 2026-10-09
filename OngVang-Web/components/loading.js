window.OngVangApp = window.OngVangApp || {};

window.OngVangApp.showLoading = function (message = 'Đang xử lý...') {
  const loader = document.querySelector('#global-loader');
  if (!loader) {
    const element = document.createElement('div');
    element.id = 'global-loader';
    element.className = 'global-loader';
    element.innerHTML = `<div class="loader-spinner"></div><span>${message}</span>`;
    document.body.appendChild(element);
    return;
  }

  loader.classList.remove('hidden');
  loader.querySelector('span').textContent = message;
};

window.OngVangApp.hideLoading = function () {
  const loader = document.querySelector('#global-loader');
  if (loader) loader.classList.add('hidden');
};
