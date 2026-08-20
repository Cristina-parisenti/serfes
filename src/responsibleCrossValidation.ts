export {};

const ERROR_CLASS = 'serfes-cross-validation-error';

function normalizeCpf(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function headingSection(form: HTMLFormElement, headingText: string) {
  return Array.from(form.querySelectorAll<HTMLElement>('.form-section')).find((section) => {
    const heading = section.querySelector<HTMLElement>('.form-section-title h4');
    return heading?.textContent?.trim() === headingText;
  }) ?? null;
}

function inputForLabel(section: HTMLElement | null, labelText: string) {
  if (!section) return null;
  const label = Array.from(section.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    (item.firstChild?.textContent ?? '').trim() === labelText,
  );
  return label?.querySelector<HTMLInputElement>('input') ?? null;
}

function errorFor(input: HTMLInputElement, key: string) {
  const label = input.closest('label');
  if (!label) return null;
  return label.querySelector<HTMLElement>(`[data-cross-validation="${key}"]`);
}

function showError(input: HTMLInputElement, key: string, message: string) {
  input.setCustomValidity(message);
  input.classList.add('invalid');

  if (errorFor(input, key)) return;

  const error = document.createElement('small');
  error.className = `field-error ${ERROR_CLASS}`;
  error.dataset.crossValidation = key;
  error.textContent = message;
  input.closest('label')?.append(error);
}

function clearError(input: HTMLInputElement | null, key: string) {
  if (!input) return;

  input.setCustomValidity('');
  errorFor(input, key)?.remove();

  const label = input.closest('label');
  const hasOtherError = label?.querySelector(`.field-error:not(.${ERROR_CLASS})`);
  if (!hasOtherError) input.classList.remove('invalid');
}

function validateForm(form: HTMLFormElement) {
  const athleteSection = headingSection(form, 'Identificação');
  const responsibleSection = headingSection(form, 'Responsável legal');

  const athleteCpf = inputForLabel(athleteSection, 'CPF');
  const athleteEmail = inputForLabel(athleteSection, 'E-mail');
  const responsibleCpf = inputForLabel(responsibleSection, 'CPF');
  const responsibleEmail = inputForLabel(responsibleSection, 'E-mail');

  if (!responsibleSection || !responsibleCpf || !responsibleEmail) return true;

  const cpfMatches = Boolean(
    athleteCpf?.value &&
    responsibleCpf.value &&
    normalizeCpf(athleteCpf.value) === normalizeCpf(responsibleCpf.value),
  );

  const emailMatches = Boolean(
    athleteEmail?.value &&
    responsibleEmail.value &&
    normalizeEmail(athleteEmail.value) === normalizeEmail(responsibleEmail.value),
  );

  if (cpfMatches) {
    showError(
      responsibleCpf,
      'responsible-cpf-different',
      'O CPF do responsável legal deve ser diferente do CPF do estudante.',
    );
  } else {
    clearError(responsibleCpf, 'responsible-cpf-different');
  }

  if (emailMatches) {
    showError(
      responsibleEmail,
      'responsible-email-different',
      'O e-mail do responsável legal deve ser diferente do e-mail do estudante.',
    );
  } else {
    clearError(responsibleEmail, 'responsible-email-different');
  }

  return !cpfMatches && !emailMatches;
}

function validateVisibleForms() {
  document.querySelectorAll<HTMLFormElement>('form.athlete-form').forEach(validateForm);
}

let scheduled = false;
function scheduleValidation() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    validateVisibleForms();
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.closest('form.athlete-form')) {
      scheduleValidation();
    }
  }, true);

  document.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.closest('form.athlete-form')) {
      scheduleValidation();
    }
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;

    if (!validateForm(form)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const firstInvalid = form.querySelector<HTMLInputElement>(`input.${ERROR_CLASS}, input:invalid`);
      firstInvalid?.focus();
      firstInvalid?.reportValidity();
    }
  }, true);

  window.addEventListener('DOMContentLoaded', scheduleValidation, { once: true });
  window.addEventListener('focus', scheduleValidation);

  const observer = new MutationObserver(scheduleValidation);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
