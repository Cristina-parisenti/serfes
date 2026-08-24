export {};

const INTERNAL_CAPACITY = 'representante';
const LEGACY_RG_KEY = 'serfes-athlete-responsible-rg';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function clearLegacyRg() {
  try {
    localStorage.removeItem(LEGACY_RG_KEY);
  } catch {
    // Sem ação: o dado legado não é mais utilizado pelo SERFES.
  }
}

function responsibleSection(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll<HTMLElement>('.form-section')).find((section) =>
    text(section.querySelector('.form-section-title h4')?.textContent) === 'Responsável legal',
  ) ?? null;
}

function labelStartingWith(section: HTMLElement, labelStart: string) {
  return Array.from(section.querySelectorAll<HTMLLabelElement>('label')).find((label) =>
    text(label.firstChild?.textContent).startsWith(labelStart),
  ) ?? null;
}

function setNativeSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function hideLegacyField(label: HTMLLabelElement) {
  label.hidden = true;
  label.dataset.serfesLegacyResponsibleField = 'true';
  label.setAttribute('aria-hidden', 'true');
  label.style.setProperty('display', 'none', 'important');
}

function neutralizeLegacyFields(section: HTMLElement) {
  const capacityLabel = labelStartingWith(section, 'Qualificação');
  const capacity = capacityLabel?.querySelector<HTMLSelectElement>('select');

  if (capacity) {
    if (!Array.from(capacity.options).some((option) => option.value === INTERNAL_CAPACITY)) {
      const option = document.createElement('option');
      option.value = INTERNAL_CAPACITY;
      option.textContent = 'Responsável legal';
      option.hidden = true;
      capacity.append(option);
    }

    if (capacity.value !== INTERNAL_CAPACITY) setNativeSelectValue(capacity, INTERNAL_CAPACITY);
  }

  if (capacityLabel) hideLegacyField(capacityLabel);

  const proofLabel = labelStartingWith(section, 'Documento comprobatório da responsabilidade legal');
  if (proofLabel) {
    hideLegacyField(proofLabel);
    const input = proofLabel.querySelector<HTMLInputElement>('input[type="file"]');
    if (input) input.required = false;
  }

  section.querySelectorAll<HTMLElement>('.serfes-responsible-rg-field').forEach((field) => field.remove());
}

function applyFormFix(form: HTMLFormElement) {
  const section = responsibleSection(form);
  if (!section) return;
  neutralizeLegacyFields(section);
}

function applyReadonlyFix() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.serfes-complete-readonly-section'));
  const section = sections.find((item) => text(item.querySelector('h4')?.textContent) === 'Responsável legal');
  if (!section) return;

  const grid = section.querySelector<HTMLElement>('.serfes-complete-data-grid');
  if (!grid) return;

  Array.from(grid.querySelectorAll<HTMLElement>('.final-account-row')).forEach((row) => {
    const label = text(row.querySelector('span')?.textContent);
    if (label === 'Qualificação' || label === 'Documento comprobatório' || label === 'RG') row.remove();
  });
}

function apply() {
  clearLegacyRg();
  document.querySelectorAll<HTMLFormElement>('form.athlete-form').forEach(applyFormFix);
  applyReadonlyFix();
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
  clearLegacyRg();

  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;
    applyFormFix(form);
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
