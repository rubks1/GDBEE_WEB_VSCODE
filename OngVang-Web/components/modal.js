window.OngVangApp = window.OngVangApp || {};

window.OngVangApp.openModal = function (title, content, actions = []) {
  const modalRoot = document.querySelector('#app-modal');
  if (!modalRoot) {
    const container = document.createElement('div');
    container.id = 'app-modal';
    container.className = 'modal-root';
    document.body.appendChild(container);
  }

  const root = document.querySelector('#app-modal');
  const actionsMarkup = actions.map((action) => `
    <button type="button" class="btn ${action.type === 'primary' ? 'btn-primary' : 'btn-secondary'}" data-modal-action="${action.label}">
      ${action.label}
    </button>
  `).join('');

  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>${title}</h3>
          <button type="button" class="modal-close" aria-label="Đóng">×</button>
        </div>
        <div class="modal-body">${content}</div>
        <div class="modal-actions">${actionsMarkup}</div>
      </div>
    </div>
  `;

  root.querySelector('.modal-close').addEventListener('click', () => {
    root.innerHTML = '';
  });

  root.querySelector('.modal-backdrop').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      root.innerHTML = '';
    }
  });
};
