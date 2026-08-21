export {};

const REGISTRATION_ENTRY_KEY = 'serfes-athlete-registration-entry';

function registrationEntryActive() {
  try {
    return sessionStorage.getItem(REGISTRATION_ENTRY_KEY) === 'true';
  } catch {
    return false;
  }
}

function arrangeAccountSection() {
  if (!registrationEntryActive()) return;
  const form = document.querySelector<HTMLFormElement>('form.athlete-form');
  const section = form?.querySelector<HTMLElement>('.serfes-account-section');
  const submit = form?.querySelector<HTMLButtonElement>('.form-actions button[type="submit"]');
  const actions = submit?.closest<HTMLElement>('.form-actions');
  if (!form || !section || !submit || !actions) return;

  if (section.nextElementSibling !== actions) actions.before(section);
  if (submit.textContent?.trim() !== 'Enviar cadastro') submit.textContent = 'Enviar cadastro';
}

function reportFirstInvalid(form: HTMLFormElement) {
  const firstInvalid = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(':invalid');
  firstInvalid?.focus();
  firstInvalid?.reportValidity();
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form') || !registrationEntryActive()) return;
    if (form.dataset.serfesRegistrationBypass === 'true') return;

    const password = form.querySelector<HTMLInputElement>('#serfes-registration-password');
    const confirmation = form.querySelector<HTMLInputElement>('#serfes-registration-password-confirmation');
    if (!password || !confirmation) return;

    const matches = password.value === confirmation.value;
    confirmation.setCustomValidity(matches ? '' : 'As senhas não coincidem.');

    if (!matches || !form.checkValidity()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      reportFirstInvalid(form);
    }
  }, true);

  window.addEventListener('DOMContentLoaded', arrangeAccountSection, { once: true });
  const observer = new MutationObserver(arrangeAccountSection);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
