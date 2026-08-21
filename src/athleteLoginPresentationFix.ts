export {};

const REGISTRATION_BUTTON_ID = 'serfes-registration-button';
const CTA_ID = 'serfes-athlete-registration-cta';
const STYLE_ID = 'serfes-athlete-login-presentation-styles';
const REGISTRATION_ENTRY_KEY = 'serfes-athlete-registration-entry';
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

function profileSelect(form: HTMLFormElement) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    text(item.firstChild?.textContent).startsWith('Perfil de acesso'),
  );
  return label?.querySelector<HTMLSelectElement>('select') ?? null;
}

function field(form: HTMLFormElement, labelStart: string) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    text(item.firstChild?.textContent).startsWith(labelStart),
  );
  return label?.querySelector<HTMLInputElement>('input') ?? null;
}

function isAthlete(form: HTMLFormElement) {
  return profileSelect(form)?.value === 'Atleta';
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function startRegistration(form: HTMLFormElement) {
  if (!isAthlete(form)) return;

  const email = field(form, 'E-mail');
  const password = field(form, 'Senha');
  if (!email || !password) return;

  try {
    sessionStorage.setItem(REGISTRATION_ENTRY_KEY, 'true');
  } catch {
    // Sem ação.
  }

  setNativeInputValue(email, TEMP_LOGIN_EMAIL);
  setNativeInputValue(password, TEMP_LOGIN_PASSWORD);
  form.dataset.serfesAuthBypass = 'true';
  form.requestSubmit();
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${CTA_ID} {
      margin-top: .85rem;
      padding-top: .85rem;
      border-top: 1px solid #dfe8f0;
      display: grid;
      gap: .55rem;
      text-align: center;
    }
    #${CTA_ID}[hidden] { display: none !important; }
    #${CTA_ID} p {
      margin: 0;
      color: #61758d;
      font-size: .86rem;
      line-height: 1.4;
    }
    #${CTA_ID} p strong { color: #314257; }
    #${CTA_ID} .serfes-registration-button {
      width: 100%;
      margin-top: 0 !important;
    }
  `;
  document.head.append(style);
}

function ensurePresentation(form: HTMLFormElement) {
  ensureStyles();

  const athlete = isAthlete(form);
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!submit) return;

  const muted = form.querySelector<HTMLElement>('h3 + .muted');
  if (athlete && muted) {
    muted.textContent = 'Informe seu e-mail e senha para acessar o SERFES.';
  }

  let cta = form.querySelector<HTMLElement>(`#${CTA_ID}`);
  if (!cta) {
    cta = document.createElement('div');
    cta.id = CTA_ID;

    const message = document.createElement('p');
    const lead = document.createElement('strong');
    lead.textContent = 'Novo por aqui?';
    message.append(lead, document.createTextNode(' Crie sua conta.'));
    cta.append(message);
    submit.after(cta);
  }

  cta.hidden = !athlete;

  let registrationButton = form.querySelector<HTMLButtonElement>(`#${REGISTRATION_BUTTON_ID}`);
  if (!registrationButton) {
    registrationButton = document.createElement('button');
    registrationButton.id = REGISTRATION_BUTTON_ID;
    registrationButton.type = 'button';
    registrationButton.className = 'secondary-button serfes-registration-button';
    registrationButton.textContent = 'Criar conta';
    registrationButton.addEventListener('click', () => startRegistration(form));
    cta.append(registrationButton);
  } else {
    if (registrationButton.textContent !== 'Criar conta') registrationButton.textContent = 'Criar conta';
    if (registrationButton.parentElement !== cta) cta.append(registrationButton);
  }

  registrationButton.hidden = !athlete;
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    const form = loginForm();
    if (form) ensurePresentation(form);
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const form = target.closest<HTMLFormElement>('form');
    if (!form || form !== loginForm()) return;
    ensurePresentation(form);
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
