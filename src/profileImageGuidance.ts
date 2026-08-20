export {};

const DIALOG_CLASS = 'serfes-profile-image-guidance';

function injectStyles() {
  if (document.getElementById('serfes-profile-image-guidance-styles')) return;

  const style = document.createElement('style');
  style.id = 'serfes-profile-image-guidance-styles';
  style.textContent = `
    .${DIALOG_CLASS} {
      position: fixed;
      inset: 0;
      z-index: 500;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(12,31,52,.5);
      backdrop-filter: blur(5px);
    }
    .${DIALOG_CLASS}[hidden] { display: none !important; }
    .${DIALOG_CLASS}-panel {
      width: min(500px, calc(100vw - 32px));
      padding: 1.35rem 1.4rem;
      border-radius: 22px;
      background: #fff;
      box-shadow: 0 24px 70px rgba(20,59,99,.28);
    }
    .${DIALOG_CLASS}-panel h3 {
      margin: 0 0 .7rem;
      color: #143b63;
      font-size: 1.2rem;
    }
    .${DIALOG_CLASS}-format {
      margin: 0;
      color: #17304d;
      line-height: 1.5;
      font-size: .9rem;
    }
    .${DIALOG_CLASS}-rule {
      margin: .9rem 0 0 !important;
      padding: .72rem .78rem;
      border-radius: 12px;
      background: #fff8e5;
      color: #7b5800 !important;
      font-size: .84rem !important;
      line-height: 1.45;
    }
    .${DIALOG_CLASS}-actions {
      display: flex;
      justify-content: flex-end;
      gap: .65rem;
      margin-top: 1.1rem;
    }
    @media (max-width: 560px) {
      .${DIALOG_CLASS}-actions { flex-direction: column-reverse; }
      .${DIALOG_CLASS}-actions button { width: 100%; justify-content: center; }
    }
  `;
  document.head.append(style);
}

function closeDialog(dialog: HTMLElement) {
  dialog.remove();
}

function openGuidance(input: HTMLInputElement) {
  document.querySelector<HTMLElement>(`.${DIALOG_CLASS}`)?.remove();

  const dialog = document.createElement('div');
  dialog.className = DIALOG_CLASS;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'serfes-profile-image-guidance-title');

  const panel = document.createElement('section');
  panel.className = `${DIALOG_CLASS}-panel`;

  const title = document.createElement('h3');
  title.id = 'serfes-profile-image-guidance-title';
  title.textContent = 'Imagem de identificação';

  const format = document.createElement('p');
  format.className = `${DIALOG_CLASS}-format`;
  format.textContent = 'Formatos aceitos: JPG, PNG ou WEBP, com tamanho máximo de 5 MB.';

  const rule = document.createElement('p');
  rule.className = `${DIALOG_CLASS}-rule`;
  rule.textContent = 'Não são permitidas imagens com conteúdo ofensivo, discriminatório, violento ou sexualmente explícito.';

  const actions = document.createElement('div');
  actions.className = `${DIALOG_CLASS}-actions`;

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'secondary-button';
  cancel.textContent = 'Cancelar';
  cancel.addEventListener('click', () => closeDialog(dialog));

  const choose = document.createElement('button');
  choose.type = 'button';
  choose.className = 'primary-button';
  choose.textContent = 'Selecionar imagem';
  choose.addEventListener('click', () => {
    closeDialog(dialog);
    input.click();
  });

  actions.append(cancel, choose);
  panel.append(title, format, rule, actions);
  dialog.append(panel);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });

  document.body.append(dialog);
  choose.focus();
}

if (typeof window !== 'undefined') {
  injectStyles();

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>('.athlete-profile-upload');
    if (!button) return;

    const input = button.parentElement?.querySelector<HTMLInputElement>('.athlete-profile-image-input');
    if (!input) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openGuidance(input);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const dialog = document.querySelector<HTMLElement>(`.${DIALOG_CLASS}`);
    if (dialog) closeDialog(dialog);
  });
}
