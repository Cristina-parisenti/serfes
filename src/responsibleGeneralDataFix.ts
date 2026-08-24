export {};

const RESPONSIBLE_RG_KEY = 'serfes-athlete-responsible-rg';
const RG_INPUT_CLASS = 'serfes-responsible-rg-input';
const INTERNAL_CAPACITY = 'representante';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function readStoredRg() {
  try {
    return text(localStorage.getItem(RESPONSIBLE_RG_KEY));
  } catch {
    return '';
  }
}

function saveRg(value: string) {
  try {
    localStorage.setItem(RESPONSIBLE_RG_KEY, text(value));
  } catch {
    // O valor permanece disponível no formulário mesmo se o armazenamento local estiver indisponível.
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

function neutralizeLegacyCapacity(section: HTMLElement) {
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
}

function createRgField(initialValue: string) {
  const label = document.createElement('label');
  label.className = 'serfes-responsible-rg-field';
  label.append(document.createTextNode('RG'));

  const input = document.createElement('input');
  input.type = 'text';
  input.required = true;
  input.maxLength = 20;
  input.autocomplete = 'off';
  input.placeholder = 'Número do RG';
  input.className = RG_INPUT_CLASS;
  input.value = initialValue;
  input.addEventListener('input', () => saveRg(input.value));
  input.addEventListener('change', () => saveRg(input.value));

  label.append(input);
  return label;
}

function ensureRgField(section: HTMLElement) {
  const input = section.querySelector<HTMLInputElement>(`.${RG_INPUT_CLASS}`);
  if (input) {
    if (!input.value && readStoredRg()) input.value = readStoredRg();
    input.required = true;
    return;
  }

  const field = createRgField(readStoredRg());
  const nameLabel = labelStartingWith(section, 'Nome completo');
  if (nameLabel) nameLabel.after(field);
  else section.querySelector<HTMLElement>('.form-grid')?.prepend(field);
}

function applyFormFix(form: HTMLFormElement) {
  const section = responsibleSection(form);
  if (!section) return;

  neutralizeLegacyCapacity(section);
  ensureRgField(section);
}

function createReadonlyRow(labelText: string, valueText: string) {
  const row = document.createElement('div');
  row.className = 'final-account-row serfes-responsible-rg-readonly-row';

  const label = document.createElement('span');
  label.textContent = labelText;

  const value = document.createElement('strong');
  value.textContent = valueText || 'Não informado';

  row.append(label, value);
  return row;
}

function applyReadonlyFix() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.serfes-complete-readonly-section'));
  const section = sections.find((item) => text(item.querySelector('h4')?.textContent) === 'Responsável legal');
  if (!section) return;

  const grid = section.querySelector<HTMLElement>('.serfes-complete-data-grid');
  if (!grid) return;

  Array.from(grid.querySelectorAll<HTMLElement>('.final-account-row')).forEach((row) => {
    const label = text(row.querySelector('span')?.textContent);
    if (label === 'Qualificação' || label === 'Documento comprobatório') row.remove();
  });

  let rgRow = grid.querySelector<HTMLElement>('.serfes-responsible-rg-readonly-row');
  if (!rgRow) {
    rgRow = createReadonlyRow('RG', readStoredRg());
    const nameRow = Array.from(grid.querySelectorAll<HTMLElement>('.final-account-row')).find(
      (row) => text(row.querySelector('span')?.textContent) === 'Nome completo',
    );
    if (nameRow) nameRow.after(rgRow);
    else grid.prepend(rgRow);
  } else {
    const value = rgRow.querySelector<HTMLElement>('strong');
    if (value) value.textContent = readStoredRg() || 'Não informado';
  }
}

function apply() {
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
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;
    applyFormFix(form);
    const rg = form.querySelector<HTMLInputElement>(`.${RG_INPUT_CLASS}`);
    if (rg) saveRg(rg.value);
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);
  window.addEventListener('storage', (event) => {
    if (event.key === RESPONSIBLE_RG_KEY) schedule();
  });

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
