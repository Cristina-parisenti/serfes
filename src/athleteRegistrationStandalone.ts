export {};

const REGISTRATION_ENTRY_KEY = 'serfes-athlete-registration-entry';
const ROOT_CLASS = 'serfes-registration-standalone';
const HEADER_ID = 'serfes-registration-standalone-header';
const STYLE_ID = 'serfes-registration-standalone-styles';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function registrationEntryActive() {
  try {
    return sessionStorage.getItem(REGISTRATION_ENTRY_KEY) === 'true';
  } catch {
    return false;
  }
}

function athleteRegistrationForm() {
  return document.querySelector<HTMLFormElement>('form.athlete-form');
}

function athleteDashboardShell() {
  const shell = document.querySelector<HTMLElement>('.dashboard-shell');
  const athleteArea = text(shell?.querySelector('.sidebar-brand-wrap .eyebrow')?.textContent).toLowerCase() === 'área do atleta';
  return athleteArea ? shell : null;
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function clearLoginFields() {
  const form = Array.from(document.querySelectorAll<HTMLFormElement>('form')).find((item) =>
    text(item.querySelector('h3')?.textContent) === 'Entrar no sistema',
  );
  if (!form) return;

  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input'));
  inputs.forEach((input) => {
    if (input.type === 'email' || input.type === 'password') setNativeInputValue(input, '');
  });
}

function leaveRegistration() {
  try {
    sessionStorage.removeItem(REGISTRATION_ENTRY_KEY);
  } catch {
    // Sem ação.
  }

  const shell = athleteDashboardShell();
  shell?.classList.remove(ROOT_CLASS);
  document.getElementById(HEADER_ID)?.remove();

  const exit = shell?.querySelector<HTMLButtonElement>('.sidebar-exit');
  exit?.click();

  window.setTimeout(() => {
    const enter = Array.from(document.querySelectorAll<HTMLButtonElement>('.site-header .primary-button')).find(
      (button) => text(button.textContent) === 'Entrar',
    );
    enter?.click();
    window.setTimeout(clearLoginFields, 30);
  }, 30);
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .dashboard-shell.${ROOT_CLASS} {
      display: block !important;
      min-height: 100vh;
      background:
        radial-gradient(circle at 92% 8%, rgba(11,90,166,.09), transparent 24%),
        radial-gradient(circle at 8% 92%, rgba(31,168,107,.07), transparent 22%),
        linear-gradient(180deg,#f6f9fc 0%,#eef5fa 100%);
    }
    .dashboard-shell.${ROOT_CLASS} > .sidebar,
    .dashboard-shell.${ROOT_CLASS} .dashboard-header {
      display: none !important;
    }
    .dashboard-shell.${ROOT_CLASS} .dashboard-main-shell {
      width: 100%;
      min-height: 100vh;
      display: block;
    }
    .dashboard-shell.${ROOT_CLASS} .dashboard-content {
      width: min(1180px, 100%);
      margin: 0 auto;
      padding: 1.6rem clamp(1rem, 4vw, 3rem) 3.5rem;
    }
    .dashboard-shell.${ROOT_CLASS} .section-toolbar.form-heading .back-link {
      display: none !important;
    }
    #${HEADER_ID} {
      position: sticky;
      top: 0;
      z-index: 30;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem clamp(1rem, 4vw, 3rem);
      background: rgba(255,255,255,.96);
      border-bottom: 1px solid #d8e5ef;
      box-shadow: 0 8px 24px rgba(20,59,99,.06);
    }
    #${HEADER_ID}::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 4px;
      background: linear-gradient(90deg,#0b5aa6 0 38%,#f3c623 38% 58%,#1fa86b 58% 79%,#d83a3a 79% 100%);
    }
    #${HEADER_ID} .serfes-registration-brand {
      display: grid;
      gap: .15rem;
    }
    #${HEADER_ID} .serfes-registration-brand strong {
      color: #143b63;
      font-size: 1.35rem;
      letter-spacing: .02em;
    }
    #${HEADER_ID} .serfes-registration-brand span {
      color: #61758d;
      font-size: .82rem;
      font-weight: 650;
    }
    #${HEADER_ID} .serfes-registration-back {
      flex: 0 0 auto;
    }
    @media (max-width: 640px) {
      #${HEADER_ID} {
        align-items: flex-start;
        flex-direction: column;
      }
      #${HEADER_ID} .serfes-registration-back {
        width: 100%;
      }
      .dashboard-shell.${ROOT_CLASS} .dashboard-content {
        padding-top: 1rem;
      }
    }
  `;
  document.head.append(style);
}

function ensureHeader(shell: HTMLElement) {
  let header = document.getElementById(HEADER_ID);
  if (header) return;

  const mainShell = shell.querySelector<HTMLElement>('.dashboard-main-shell');
  if (!mainShell) return;

  header = document.createElement('header');
  header.id = HEADER_ID;

  const brand = document.createElement('div');
  brand.className = 'serfes-registration-brand';
  const title = document.createElement('strong');
  title.textContent = 'SERFES';
  const subtitle = document.createElement('span');
  subtitle.textContent = 'Criação de conta • Cadastro do atleta';
  brand.append(title, subtitle);

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'secondary-button serfes-registration-back';
  back.textContent = 'Voltar ao acesso';
  back.addEventListener('click', leaveRegistration);

  header.append(brand, back);
  mainShell.prepend(header);
}

function clearStandaloneLayout() {
  document.querySelectorAll<HTMLElement>(`.dashboard-shell.${ROOT_CLASS}`).forEach((shell) => {
    shell.classList.remove(ROOT_CLASS);
  });
  document.getElementById(HEADER_ID)?.remove();
}

function apply() {
  ensureStyles();

  const form = athleteRegistrationForm();
  const shell = athleteDashboardShell();
  const standalone = registrationEntryActive() && Boolean(form) && Boolean(shell);

  if (!standalone || !shell) {
    clearStandaloneLayout();
    return;
  }

  shell.classList.add(ROOT_CLASS);
  ensureHeader(shell);
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
  document.addEventListener('click', (event) => {
    if (!registrationEntryActive()) return;

    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>('button');
    if (!button) return;

    const form = athleteRegistrationForm();
    if (!form || !form.contains(button)) return;

    const label = text(button.textContent);
    if (label !== 'Cancelar' && !button.classList.contains('back-link')) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    leaveRegistration();
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  window.setInterval(() => {
    if (registrationEntryActive() || document.querySelector(`.${ROOT_CLASS}`)) schedule();
  }, 400);
}
