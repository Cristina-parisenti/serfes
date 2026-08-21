export {};

const REGISTRATION_BUTTON_ID = 'serfes-registration-button';
const CTA_ID = 'serfes-athlete-registration-cta';
const STYLE_ID = 'serfes-athlete-login-presentation-styles';

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

function isAthlete(form: HTMLFormElement) {
  return profileSelect(form)?.value === 'Atleta';
}

function nudgeAuthBridge(form: HTMLFormElement) {
  if (!isAthlete(form) || form.querySelector(`#${REGISTRATION_BUTTON_ID}`)) return;

  const marker = document.createElement('span');
  marker.hidden = true;
  marker.dataset.serfesLoginRefresh = 'true';
  form.append(marker);

  window.requestAnimationFrame(() => {
    marker.remove();
    schedule();
  });
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

  const registrationButton = form.querySelector<HTMLButtonElement>(`#${REGISTRATION_BUTTON_ID}`);
  if (!registrationButton) {
    nudgeAuthBridge(form);
    return;
  }

  if (registrationButton.textContent !== 'Criar conta') registrationButton.textContent = 'Criar conta';
  if (registrationButton.parentElement !== cta) cta.append(registrationButton);
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
    schedule();
    window.setTimeout(schedule, 0);
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}