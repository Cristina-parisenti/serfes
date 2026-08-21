import { supabase } from './supabaseClient';

const AUTH_STATUS_ID = 'serfes-auth-status';
const SIGNUP_BUTTON_ID = 'serfes-signup-button';
const EMAIL_STATE_KEY = 'serfes-athlete-email-verification';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function loginForm() {
  return Array.from(document.querySelectorAll<HTMLFormElement>('form')).find((form) =>
    text(form.querySelector('h3')?.textContent) === 'Entrar no sistema',
  ) ?? null;
}

function profileValue(form: HTMLFormElement) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    text(item.firstChild?.textContent).startsWith('Perfil de acesso'),
  );
  return label?.querySelector<HTMLSelectElement>('select')?.value ?? '';
}

function field(form: HTMLFormElement, labelStart: string) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    text(item.firstChild?.textContent).startsWith(labelStart),
  );
  return label?.querySelector<HTMLInputElement>('input') ?? null;
}

function ensureStatus(form: HTMLFormElement) {
  let status = form.querySelector<HTMLElement>(`#${AUTH_STATUS_ID}`);
  if (!status) {
    status = document.createElement('div');
    status.id = AUTH_STATUS_ID;
    status.className = 'serfes-auth-status';
    status.setAttribute('aria-live', 'polite');
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submit?.before(status);
  }
  return status;
}

function setStatus(form: HTMLFormElement, message: string, tone: 'info' | 'success' | 'error' = 'info') {
  const status = ensureStatus(form);
  status.dataset.tone = tone;
  status.textContent = message;
  status.hidden = false;
}

function clearStatus(form: HTMLFormElement) {
  const status = ensureStatus(form);
  status.textContent = '';
  status.hidden = true;
}

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar no SERFES.';
  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (normalized.includes('user already registered')) return 'Já existe uma conta vinculada a este e-mail. Utilize Entrar.';
  if (normalized.includes('password')) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (normalized.includes('rate limit')) return 'Muitas tentativas em pouco tempo. Tente novamente mais tarde.';
  return 'Não foi possível concluir a autenticação. Confira os dados e tente novamente.';
}

function syncEmailVerification(email: string, confirmedAt?: string | null) {
  try {
    localStorage.setItem(EMAIL_STATE_KEY, JSON.stringify({
      status: confirmedAt ? 'confirmed' : 'pending',
      email,
      requestedAt: new Date().toISOString(),
      ...(confirmedAt ? { confirmedAt } : {}),
    }));
  } catch {
    // O estado local apenas mantém compatibilidade com a interface enquanto a migração é concluída.
  }
}

async function signInAthlete(form: HTMLFormElement) {
  const email = text(field(form, 'E-mail')?.value).toLowerCase();
  const password = field(form, 'Senha')?.value ?? '';

  if (!email || !password) {
    setStatus(form, 'Informe e-mail e senha.', 'error');
    return;
  }

  setStatus(form, 'Validando acesso...', 'info');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    setStatus(form, authErrorMessage(error?.message ?? ''), 'error');
    return;
  }

  syncEmailVerification(data.user.email ?? email, data.user.email_confirmed_at);
  setStatus(form, 'Acesso confirmado.', 'success');

  form.dataset.serfesAuthBypass = 'true';
  form.requestSubmit();
}

async function signUpAthlete(form: HTMLFormElement) {
  if (profileValue(form) !== 'Atleta') {
    setStatus(form, 'A criação de conta real está disponível nesta etapa apenas para o perfil Atleta.', 'info');
    return;
  }

  const email = text(field(form, 'E-mail')?.value).toLowerCase();
  const password = field(form, 'Senha')?.value ?? '';

  if (!email || !password) {
    setStatus(form, 'Informe o e-mail e crie uma senha para abrir sua conta.', 'error');
    return;
  }
  if (password.length < 8) {
    setStatus(form, 'Crie uma senha com pelo menos 8 caracteres.', 'error');
    return;
  }

  setStatus(form, 'Criando sua conta...', 'info');
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: { serfes_role: 'athlete' },
    },
  });

  if (error) {
    setStatus(form, authErrorMessage(error.message), 'error');
    return;
  }

  syncEmailVerification(data.user?.email ?? email, data.user?.email_confirmed_at);
  if (data.session) {
    setStatus(form, 'Conta criada e e-mail confirmado. Você já pode entrar.', 'success');
  } else {
    setStatus(form, `Conta criada. Enviamos uma mensagem para ${email}. Confirme o e-mail antes de entrar.`, 'success');
  }
}

function ensureSignupButton(form: HTMLFormElement) {
  let button = form.querySelector<HTMLButtonElement>(`#${SIGNUP_BUTTON_ID}`);
  if (!button) {
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!submit) return;

    button = document.createElement('button');
    button.id = SIGNUP_BUTTON_ID;
    button.type = 'button';
    button.className = 'secondary-button serfes-signup-button';
    button.textContent = 'Criar conta de atleta';
    button.addEventListener('click', () => void signUpAthlete(form));
    submit.after(button);
  }

  const athlete = profileValue(form) === 'Atleta';
  button.hidden = !athlete;
  if (!athlete) clearStatus(form);
}

function injectStyles() {
  if (document.getElementById('serfes-auth-bridge-styles')) return;
  const style = document.createElement('style');
  style.id = 'serfes-auth-bridge-styles';
  style.textContent = `
    .serfes-auth-status {
      margin: .1rem 0 .75rem;
      padding: .75rem .85rem;
      border-radius: 12px;
      background: #eef5fb;
      color: #314257;
      font-size: .86rem;
      line-height: 1.45;
    }
    .serfes-auth-status[data-tone='success'] { background: #edf9f2; color: #17643d; }
    .serfes-auth-status[data-tone='error'] { background: #fff1f1; color: #9d2929; }
    .serfes-signup-button { width: 100%; margin-top: .65rem; }
  `;
  document.head.append(style);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    injectStyles();
    const form = loginForm();
    if (form) ensureSignupButton(form);
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form || form !== loginForm()) return;

    if (form.dataset.serfesAuthBypass === 'true') {
      delete form.dataset.serfesAuthBypass;
      return;
    }

    if (profileValue(form) !== 'Atleta') return;

    event.preventDefault();
    event.stopImmediatePropagation();
    void signInAthlete(form);
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.sidebar-exit') : null;
    if (!button) return;
    const athleteArea = text(document.querySelector('.sidebar-brand-wrap .eyebrow')?.textContent).toLowerCase() === 'área do atleta';
    if (athleteArea) void supabase.auth.signOut();
  }, true);

  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    if (user?.email) syncEmailVerification(user.email, user.email_confirmed_at);
    schedule();
  });

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
