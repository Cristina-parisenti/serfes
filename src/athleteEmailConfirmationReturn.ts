import { supabase } from './supabaseClient';

const EMAIL_STATE_KEY = 'serfes-athlete-email-verification';
const SECRETARY_STATE_KEY = 'serfes-athlete-secretary-validation';
const CONFIRMATION_NOTICE_KEY = 'serfes-email-confirmation-return-notice';
const NOTICE_ID = 'serfes-email-confirmation-success-notice';
const STYLE_ID = 'serfes-email-confirmation-success-styles';

type EmailState = {
  status: 'pending' | 'confirmed';
  email: string;
  requestedAt: string;
  confirmedAt?: string;
};

type SecretaryState = {
  status: 'waiting_email' | 'pending' | 'approved' | 'changes_requested';
  updatedAt: string;
  note?: string;
};

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // O estado local mantém compatibilidade com a interface atual.
  }
}

function signupReturnDetected() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const search = new URLSearchParams(window.location.search);
  return hash.get('type') === 'signup' || search.get('type') === 'signup';
}

const isSignupReturn = typeof window !== 'undefined' ? signupReturnDetected() : false;

function publicHomeIsOpen() {
  return Boolean(document.querySelector('.site-header'))
    && !document.querySelector('.dashboard-shell')
    && !document.querySelector('.login-page');
}

function setNoticePending(active: boolean) {
  try {
    if (active) sessionStorage.setItem(CONFIRMATION_NOTICE_KEY, 'true');
    else sessionStorage.removeItem(CONFIRMATION_NOTICE_KEY);
  } catch {
    // O aviso pertence somente à sessão atual do navegador.
  }
}

function noticePending() {
  try {
    return sessionStorage.getItem(CONFIRMATION_NOTICE_KEY) === 'true';
  } catch {
    return false;
  }
}

function syncConfirmedEmail(email: string, confirmedAt: string) {
  const previous = readJson<EmailState>(EMAIL_STATE_KEY);
  writeJson(EMAIL_STATE_KEY, {
    status: 'confirmed',
    email,
    requestedAt: previous?.requestedAt ?? new Date().toISOString(),
    confirmedAt,
  } satisfies EmailState);
}

function advanceSecretaryReview() {
  const current = readJson<SecretaryState>(SECRETARY_STATE_KEY);
  if (current?.status === 'approved' || current?.status === 'changes_requested' || current?.status === 'pending') return;

  writeJson(SECRETARY_STATE_KEY, {
    status: 'pending',
    updatedAt: new Date().toISOString(),
  } satisfies SecretaryState);
}

function cleanAuthParametersFromUrl() {
  const url = new URL(window.location.href);
  url.hash = '';
  ['code', 'type', 'token_hash', 'error', 'error_code', 'error_description'].forEach((key) => {
    url.searchParams.delete(key);
  });
  const query = url.searchParams.toString();
  window.history.replaceState({}, document.title, `${url.pathname}${query ? `?${query}` : ''}`);
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
      z-index: 260;
      width: min(455px, calc(100vw - 2rem));
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: start;
      gap: .85rem;
      padding: 1rem 1rem 1rem 1.05rem;
      border: 1px solid #c9e6d8;
      border-left: 5px solid #1fa86b;
      border-radius: 17px;
      background: rgba(255,255,255,.98);
      box-shadow: 0 18px 42px rgba(20,59,99,.18);
      color: #17304d;
    }
    #${NOTICE_ID} .serfes-confirmation-icon {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: #e8f7f0;
      color: #167b50;
      font-size: 1.05rem;
      font-weight: 900;
    }
    #${NOTICE_ID} .serfes-confirmation-copy {
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
    #${NOTICE_ID} .serfes-confirmation-close {
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
      cursor: pointer;
    }
    #${NOTICE_ID} .serfes-confirmation-close:hover {
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
  setNoticePending(false);
  document.getElementById(NOTICE_ID)?.remove();
}

function ensureNotice() {
  if (!noticePending() || !publicHomeIsOpen()) return;
  if (document.getElementById(NOTICE_ID)) return;

  const notice = document.createElement('aside');
  notice.id = NOTICE_ID;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');

  const icon = document.createElement('span');
  icon.className = 'serfes-confirmation-icon';
  icon.textContent = '✓';
  icon.setAttribute('aria-hidden', 'true');

  const copy = document.createElement('div');
  copy.className = 'serfes-confirmation-copy';

  const title = document.createElement('strong');
  title.textContent = 'E-mail confirmado';

  const message = document.createElement('p');
  message.textContent = 'Seu e-mail foi validado com sucesso. O cadastro agora aguarda validação da Secretaria. Você já pode entrar no SERFES; as inscrições serão liberadas somente após a aprovação.';

  copy.append(title, message);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'serfes-confirmation-close';
  close.setAttribute('aria-label', 'Fechar aviso');
  close.textContent = '×';
  close.addEventListener('click', closeNotice);

  notice.append(icon, copy, close);
  document.body.append(notice);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    ensureStyles();
    ensureNotice();
  });
}

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!isSignupReturn) return;

    const user = session?.user;
    const confirmedAt = text(user?.email_confirmed_at);
    const email = text(user?.email).toLowerCase();
    if (!user || !email || !confirmedAt) return;

    syncConfirmedEmail(email, confirmedAt);
    advanceSecretaryReview();
    setNoticePending(true);
    cleanAuthParametersFromUrl();
    schedule();

    // A confirmação valida o e-mail, mas não deve abrir a área restrita automaticamente.
    // O atleta volta ao acesso normal e entra com a senha que criou no cadastro.
    window.setTimeout(() => {
      void supabase.auth.signOut();
    }, 250);
  });

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
