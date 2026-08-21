export {};

const REGISTRATION_RETURN_KEY = 'serfes-registration-return-after-submit';
const NOTICE_ID = 'serfes-registration-email-notice';
const STYLE_ID = 'serfes-registration-email-notice-styles';

type ReturnState = 'returning' | 'notice';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function returnState(): ReturnState | null {
  try {
    const value = sessionStorage.getItem(REGISTRATION_RETURN_KEY);
    return value === 'returning' || value === 'notice' ? value : null;
  } catch {
    return null;
  }
}

function setReturnState(value: ReturnState | null) {
  try {
    if (value) sessionStorage.setItem(REGISTRATION_RETURN_KEY, value);
    else sessionStorage.removeItem(REGISTRATION_RETURN_KEY);
  } catch {
    // O marcador existe apenas durante esta sessão do navegador.
  }
}

function athleteAreaIsOpen() {
  return text(document.querySelector('.sidebar-brand-wrap .eyebrow')?.textContent).toLowerCase() === 'área do atleta';
}

function registrationFinished() {
  return athleteAreaIsOpen()
    && !document.querySelector('form.athlete-form')
    && Boolean(document.querySelector('.athlete-home-actions'));
}

function publicHomeIsOpen() {
  return Boolean(document.querySelector('.site-header'))
    && !document.querySelector('.dashboard-shell')
    && !document.querySelector('.login-page');
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${NOTICE_ID} {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      z-index: 250;
      width: min(430px, calc(100vw - 2rem));
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: start;
      gap: .85rem;
      padding: 1rem 1rem 1rem 1.05rem;
      border: 1px solid #c9dceb;
      border-left: 5px solid #1fa86b;
      border-radius: 17px;
      background: rgba(255,255,255,.98);
      box-shadow: 0 18px 42px rgba(20,59,99,.18);
      color: #17304d;
    }
    #${NOTICE_ID} .serfes-email-notice-icon {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: #e8f7f0;
      color: #167b50;
      font-size: 1.15rem;
      font-weight: 800;
    }
    #${NOTICE_ID} .serfes-email-notice-copy {
      display: grid;
      gap: .28rem;
      min-width: 0;
    }
    #${NOTICE_ID} strong {
      color: #143b63;
      font-size: 1rem;
    }
    #${NOTICE_ID} p {
      margin: 0;
      color: #4f6179;
      font-size: .9rem;
      line-height: 1.5;
    }
    #${NOTICE_ID} .serfes-email-notice-close {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      margin: -.25rem -.25rem 0 0;
      padding: 0;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: #61758d;
      font-size: 1.35rem;
      line-height: 1;
    }
    #${NOTICE_ID} .serfes-email-notice-close:hover {
      background: #eef5fa;
      color: #143b63;
    }
    @media (max-width: 640px) {
      #${NOTICE_ID} {
        top: .8rem;
        right: .8rem;
        width: calc(100vw - 1.6rem);
      }
    }
  `;
  document.head.append(style);
}

function closeNotice() {
  setReturnState(null);
  document.getElementById(NOTICE_ID)?.remove();
}

function ensureNotice() {
  if (returnState() !== 'notice' || !publicHomeIsOpen()) {
    if (returnState() !== 'notice') document.getElementById(NOTICE_ID)?.remove();
    return;
  }

  if (document.getElementById(NOTICE_ID)) return;

  const notice = document.createElement('aside');
  notice.id = NOTICE_ID;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');

  const icon = document.createElement('span');
  icon.className = 'serfes-email-notice-icon';
  icon.textContent = '✉';
  icon.setAttribute('aria-hidden', 'true');

  const copy = document.createElement('div');
  copy.className = 'serfes-email-notice-copy';

  const title = document.createElement('strong');
  title.textContent = 'Cadastro enviado';

  const message = document.createElement('p');
  message.textContent = 'Enviamos uma mensagem para o e-mail informado. Confirme seu cadastro pelo link recebido para que ele siga para validação da Secretaria.';

  copy.append(title, message);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'serfes-email-notice-close';
  close.setAttribute('aria-label', 'Fechar aviso');
  close.textContent = '×';
  close.addEventListener('click', closeNotice);

  notice.append(icon, copy, close);
  document.body.append(notice);
}

function returnToPublicHome() {
  if (returnState() !== 'returning' || !registrationFinished()) return;

  const exit = document.querySelector<HTMLButtonElement>('.sidebar-exit');
  if (!exit) return;

  setReturnState('notice');
  exit.click();
}

function apply() {
  ensureStyles();
  returnToPublicHome();
  ensureNotice();
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    apply();
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;

    // O bypass é definido somente depois que o Supabase conclui com sucesso a criação da conta.
    if (form.dataset.serfesRegistrationBypass === 'true') {
      setReturnState('returning');
    }
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.setInterval(() => {
    if (returnState()) schedule();
  }, 300);
}
