import { supabase } from './supabaseClient';

const AUTH_STATUS_ID = 'serfes-auth-status';
const REGISTRATION_BUTTON_ID = 'serfes-registration-button';
const REGISTRATION_ENTRY_KEY = 'serfes-athlete-registration-entry';
const EMAIL_STATE_KEY = 'serfes-athlete-email-verification';
const SECRETARY_STATE_KEY = 'serfes-athlete-secretary-validation';
const SERFES_PRODUCTION_URL = 'https://cristina-parisenti.github.io/serfes/';
const TEMP_LOGIN_EMAIL = 'cadastro@teste.serfes.com.br';
const TEMP_LOGIN_PASSWORD = 'cadastro-temporario';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function loginForm() {
  return Array.from(document.querySelectorAll<HTMLFormElement>('form')).find((form) =>
    text(form.querySelector('h3')?.textContent) === 'Entrar no sistema',
  ) ?? null;
}

function athleteForm() {
  return document.querySelector<HTMLFormElement>('form.athlete-form');
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

function identificationEmail(form: HTMLFormElement) {
  const identification = Array.from(form.querySelectorAll<HTMLElement>('.form-section')).find(
    (section) => text(section.querySelector('.form-section-title h4')?.textContent) === 'Identificação',
  );
  const label = Array.from(identification?.querySelectorAll<HTMLLabelElement>('label') ?? []).find(
    (item) => text(item.firstChild?.textContent).startsWith('E-mail'),
  );
  return text(label?.querySelector<HTMLInputElement>('input')?.value).toLowerCase();
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function setRegistrationEntry(active: boolean) {
  try {
    if (active) sessionStorage.setItem(REGISTRATION_ENTRY_KEY, 'true');
    else sessionStorage.removeItem(REGISTRATION_ENTRY_KEY);
  } catch {
    // O marcador existe apenas durante o fluxo inicial de cadastro.
  }
}

function registrationEntryActive() {
  try {
    return sessionStorage.getItem(REGISTRATION_ENTRY_KEY) === 'true';
  } catch {
    return false;
  }
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
    // O estado local mantém compatibilidade com a interface enquanto a migração do cadastro é concluída.
  }
}

function syncSecretaryWaitingForEmail() {
  try {
    localStorage.setItem(SECRETARY_STATE_KEY, JSON.stringify({
      status: 'waiting_email',
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // Sem ação.
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

function startAthleteRegistration(form: HTMLFormElement) {
  if (profileValue(form) !== 'Atleta') {
    setStatus(form, 'Selecione o perfil Atleta para iniciar um novo cadastro.', 'info');
    return;
  }

  const emailInput = field(form, 'E-mail');
  const passwordInput = field(form, 'Senha');
  if (!emailInput || !passwordInput) return;

  setRegistrationEntry(true);
  setNativeInputValue(emailInput, TEMP_LOGIN_EMAIL);
  setNativeInputValue(passwordInput, TEMP_LOGIN_PASSWORD);
  form.dataset.serfesAuthBypass = 'true';
  form.requestSubmit();
}

function ensureRegistrationButton(form: HTMLFormElement) {
  let button = form.querySelector<HTMLButtonElement>(`#${REGISTRATION_BUTTON_ID}`);
  if (!button) {
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!submit) return;

    button = document.createElement('button');
    button.id = REGISTRATION_BUTTON_ID;
    button.type = 'button';
    button.className = 'secondary-button serfes-registration-button';
    button.textContent = 'Fazer cadastro de atleta';
    button.addEventListener('click', () => startAthleteRegistration(form));
    submit.after(button);
  }

  const athlete = profileValue(form) === 'Atleta';
  button.hidden = !athlete;
  if (athlete) {
    const muted = form.querySelector<HTMLElement>('h3 + .muted');
    if (muted) muted.textContent = 'Quem já possui cadastro deve entrar com e-mail e senha. Para um novo atleta, utilize Fazer cadastro de atleta.';
  } else {
    clearStatus(form);
  }
}

function openRegistrationFormIfNeeded() {
  if (!registrationEntryActive()) return;
  if (athleteForm()) return;

  const athleteArea = text(document.querySelector('.sidebar-brand-wrap .eyebrow')?.textContent).toLowerCase() === 'área do atleta';
  if (!athleteArea) return;

  const cadastro = Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item')).find(
    (button) => text(button.textContent) === 'Meu cadastro',
  );
  cadastro?.click();
}

function createPasswordField(labelText: string, id: string, autocomplete: string) {
  const label = document.createElement('label');
  label.textContent = labelText;

  const input = document.createElement('input');
  input.id = id;
  input.type = 'password';
  input.required = true;
  input.minLength = 8;
  input.setAttribute('autocomplete', autocomplete);
  input.placeholder = 'Mínimo de 8 caracteres';

  label.append(input);
  return { label, input };
}

function setAccountStatus(section: HTMLElement, message: string, tone: 'info' | 'success' | 'error' = 'info') {
  const status = section.querySelector<HTMLElement>('.serfes-account-status');
  if (!status) return;
  status.dataset.tone = tone;
  status.textContent = message;
  status.hidden = !message;
}

function validatePasswordMatch(form: HTMLFormElement) {
  const password = form.querySelector<HTMLInputElement>('#serfes-registration-password');
  const confirmation = form.querySelector<HTMLInputElement>('#serfes-registration-password-confirmation');
  if (!password || !confirmation) return true;

  const matches = password.value === confirmation.value;
  confirmation.setCustomValidity(matches ? '' : 'As senhas não coincidem.');
  return matches;
}

function injectPostRegistrationAccountSection(form: HTMLFormElement) {
  if (!registrationEntryActive()) return;

  let section = form.querySelector<HTMLElement>('.serfes-account-section');
  if (!section) {
    section = document.createElement('section');
    section.className = 'glass-card form-section serfes-account-section';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'form-section-title';

    const titleText = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = 'Acesso ao SERFES';
    const description = document.createElement('p');
    description.textContent = 'Defina sua senha. O e-mail de confirmação será enviado somente depois que você concluir e enviar todo o cadastro.';
    titleText.append(title, description);
    titleWrap.append(titleText);

    const grid = document.createElement('div');
    grid.className = 'form-grid';
    const password = createPasswordField('Crie uma senha', 'serfes-registration-password', 'new-password');
    const confirmation = createPasswordField('Confirme a senha', 'serfes-registration-password-confirmation', 'new-password');

    const help = document.createElement('small');
    help.className = 'field-help serfes-account-help';
    help.textContent = 'Após o envio, você receberá uma mensagem no e-mail informado em Identificação. Só depois da confirmação o cadastro seguirá para validação da Secretaria.';

    const status = document.createElement('div');
    status.className = 'serfes-account-status';
    status.hidden = true;
    status.setAttribute('aria-live', 'polite');

    const check = () => validatePasswordMatch(form);
    password.input.addEventListener('input', check);
    confirmation.input.addEventListener('input', check);

    grid.append(password.label, confirmation.label);
    section.append(titleWrap, grid, help, status);

    const actions = form.querySelector<HTMLElement>('.form-actions');
    actions?.before(section);
  }

  const submit = form.querySelector<HTMLButtonElement>('.form-actions button[type="submit"]');
  if (submit) submit.textContent = 'Enviar cadastro';
}

async function submitInitialAthleteRegistration(form: HTMLFormElement) {
  const section = form.querySelector<HTMLElement>('.serfes-account-section');
  const email = identificationEmail(form);
  const password = form.querySelector<HTMLInputElement>('#serfes-registration-password')?.value ?? '';
  const confirmation = form.querySelector<HTMLInputElement>('#serfes-registration-password-confirmation')?.value ?? '';

  if (!section) return;
  if (!email) {
    setAccountStatus(section, 'Informe um e-mail válido na seção Identificação.', 'error');
    return;
  }
  if (password.length < 8) {
    setAccountStatus(section, 'Crie uma senha com pelo menos 8 caracteres.', 'error');
    return;
  }
  if (password !== confirmation) {
    validatePasswordMatch(form);
    setAccountStatus(section, 'As senhas informadas não coincidem.', 'error');
    form.querySelector<HTMLInputElement>('#serfes-registration-password-confirmation')?.focus();
    return;
  }

  const submit = form.querySelector<HTMLButtonElement>('.form-actions button[type="submit"]');
  if (submit) submit.disabled = true;
  setAccountStatus(section, 'Enviando cadastro e preparando a confirmação do e-mail...', 'info');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: SERFES_PRODUCTION_URL,
      data: { serfes_role: 'athlete' },
    },
  });

  if (error || !data.user) {
    if (submit) submit.disabled = false;
    setAccountStatus(section, authErrorMessage(error?.message ?? ''), 'error');
    return;
  }

  syncEmailVerification(data.user.email ?? email, data.user.email_confirmed_at);
  if (!data.user.email_confirmed_at) syncSecretaryWaitingForEmail();

  setAccountStatus(
    section,
    data.user.email_confirmed_at
      ? 'Cadastro enviado. O e-mail já está confirmado e o cadastro aguarda validação da Secretaria.'
      : `Cadastro enviado. Enviamos a confirmação para ${email}.`,
    'success',
  );

  form.dataset.serfesRegistrationBypass = 'true';
  if (submit) submit.disabled = false;
  form.requestSubmit();

  window.setTimeout(() => {
    if (document.querySelector('.athlete-home-actions')) setRegistrationEntry(false);
  }, 900);
}

function injectStyles() {
  if (document.getElementById('serfes-auth-bridge-styles')) return;
  const style = document.createElement('style');
  style.id = 'serfes-auth-bridge-styles';
  style.textContent = `
    .serfes-auth-status,
    .serfes-account-status {
      margin: .1rem 0 .75rem;
      padding: .75rem .85rem;
      border-radius: 12px;
      background: #eef5fb;
      color: #314257;
      font-size: .86rem;
      line-height: 1.45;
    }
    .serfes-auth-status[data-tone='success'],
    .serfes-account-status[data-tone='success'] { background: #edf9f2; color: #17643d; }
    .serfes-auth-status[data-tone='error'],
    .serfes-account-status[data-tone='error'] { background: #fff1f1; color: #9d2929; }
    .serfes-registration-button { width: 100%; margin-top: .65rem; }
    .serfes-account-section { border-color: #c9dceb; }
    .serfes-account-help { display: block; margin-top: .75rem; }
    .serfes-account-status { margin-top: .8rem; margin-bottom: 0; }
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
    if (form) ensureRegistrationButton(form);
    openRegistrationFormIfNeeded();
    const registration = athleteForm();
    if (registration) injectPostRegistrationAccountSection(registration);
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

  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form') || !registrationEntryActive()) return;

    if (form.dataset.serfesRegistrationBypass === 'true') {
      delete form.dataset.serfesRegistrationBypass;
      return;
    }

    if (!validatePasswordMatch(form) || !form.checkValidity()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    void submitInitialAthleteRegistration(form);
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.sidebar-exit') : null;
    if (!button) return;
    const athleteArea = text(document.querySelector('.sidebar-brand-wrap .eyebrow')?.textContent).toLowerCase() === 'área do atleta';
    if (athleteArea) {
      if (registrationEntryActive()) setRegistrationEntry(false);
      void supabase.auth.signOut();
    }
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
