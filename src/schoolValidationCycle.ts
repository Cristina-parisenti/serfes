const SCHOOL_VALIDATION_KEY = 'serfes-school-validation';
const EDUCATION_SIGNATURE_KEY = 'serfes-education-signature';
const ANNUAL_PENDING_KEY = 'serfes-annual-update-pending';

function normalized(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function fieldValue(form: HTMLFormElement, labelStart: string) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find(
    (item) => normalized(item.textContent).startsWith(labelStart),
  );
  const control = label?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select');
  return control?.value?.trim() ?? '';
}

function educationSignature(form: HTMLFormElement) {
  const data = {
    enrollment: fieldValue(form, 'Está matriculado em instituição de ensino?'),
    municipality: fieldValue(form, 'Município da instituição'),
    network: fieldValue(form, 'Rede de ensino'),
    level: fieldValue(form, 'Nível de ensino'),
    institution: fieldValue(form, 'Instituição de ensino superior') || fieldValue(form, 'Escola'),
    schoolYear: fieldValue(form, 'Ano escolar'),
    course: fieldValue(form, 'Curso'),
  };
  return JSON.stringify(data);
}

function schoolValidationIsComplete() {
  try {
    return localStorage.getItem(SCHOOL_VALIDATION_KEY) === 'validated';
  } catch {
    return false;
  }
}

function syncSchoolValidationShortcut() {
  const shortcut = Array.from(document.querySelectorAll<HTMLButtonElement>('.athlete-home-shortcut')).find(
    (button) => normalized(button.textContent).toLowerCase().includes('validação escolar'),
  );
  if (shortcut) shortcut.hidden = schoolValidationIsComplete();
}

function markSchoolValidationPendingWhenNeeded(form: HTMLFormElement) {
  const nextSignature = educationSignature(form);

  try {
    const previousSignature = localStorage.getItem(EDUCATION_SIGNATURE_KEY);
    const annualUpdateInProgress = sessionStorage.getItem(ANNUAL_PENDING_KEY) !== null;
    const educationChanged = previousSignature === null || previousSignature !== nextSignature;

    if (educationChanged || annualUpdateInProgress) {
      localStorage.setItem(SCHOOL_VALIDATION_KEY, 'pending');
    }

    localStorage.setItem(EDUCATION_SIGNATURE_KEY, nextSignature);
  } catch {
    // O armazenamento local serve apenas para simular o fluxo de validação no protótipo.
  }

  window.setTimeout(syncSchoolValidationShortcut, 0);
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;
    markSchoolValidationPendingWhenNeeded(form);
  }, true);

  window.addEventListener('storage', (event) => {
    if (event.key === SCHOOL_VALIDATION_KEY) syncSchoolValidationShortcut();
  });
  window.addEventListener('focus', syncSchoolValidationShortcut);
  window.addEventListener('DOMContentLoaded', syncSchoolValidationShortcut, { once: true });
}
