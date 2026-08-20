export {};

type AthleteSex = 'Feminino' | 'Masculino';

type AthleteSnapshot = {
  name?: string;
};

const COMPLETED_REGISTRATION_KEY = 'serfes-athlete-registration-completed';
const PROFILE_KEY = 'serfes-athlete-profile-final';
const FIRST_NAME_KEY = 'serfes-athlete-first-name';
const SEX_KEY = 'serfes-athlete-sex';
const SEX_FIELD_CLASS = 'serfes-athlete-sex-field';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // O armazenamento local é apenas apoio ao protótipo.
  }
}

function registrationCompleted() {
  return readStorage(COMPLETED_REGISTRATION_KEY) === 'true';
}

function readProfileName() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return '';
    const snapshot = JSON.parse(raw) as AthleteSnapshot;
    return text(snapshot.name);
  } catch {
    return '';
  }
}

function firstName(value: string) {
  return text(value).split(' ').filter(Boolean)[0] ?? '';
}

function storedFirstName() {
  const saved = text(readStorage(FIRST_NAME_KEY));
  if (saved) return saved;

  const fromProfile = firstName(readProfileName());
  if (registrationCompleted() && fromProfile) writeStorage(FIRST_NAME_KEY, fromProfile);
  return fromProfile;
}

function storedSex(): AthleteSex | '' {
  const value = readStorage(SEX_KEY);
  return value === 'Feminino' || value === 'Masculino' ? value : '';
}

function athleteAreaIsOpen() {
  const label = text(document.querySelector<HTMLElement>('.sidebar-brand-wrap .eyebrow')?.textContent).toLowerCase();
  return label === 'área do atleta';
}

function updateGreeting() {
  if (!athleteAreaIsOpen()) return;

  const heading = document.querySelector<HTMLElement>('.dashboard-header h2');
  if (!heading) return;

  const name = registrationCompleted() ? storedFirstName() : '';
  const desired = `Olá, ${name || 'Atleta'}`;
  if (text(heading.textContent) !== desired) heading.textContent = desired;
}

function createSexOption(value: AthleteSex, checkedValue: AthleteSex | '') {
  const label = document.createElement('label');
  label.className = 'serfes-sex-option';

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'serfes-athlete-sex';
  input.value = value;
  input.required = true;
  input.checked = checkedValue === value;

  const copy = document.createElement('span');
  copy.textContent = value;

  label.append(input, copy);
  return label;
}

function createSexField() {
  const fieldset = document.createElement('fieldset');
  fieldset.className = SEX_FIELD_CLASS;
  fieldset.setAttribute('aria-required', 'true');

  const legend = document.createElement('legend');
  legend.textContent = 'Sexo';

  const options = document.createElement('div');
  options.className = 'serfes-sex-options';
  const current = storedSex();
  options.append(
    createSexOption('Feminino', current),
    createSexOption('Masculino', current),
  );

  fieldset.append(legend, options);
  return fieldset;
}

function injectSexField() {
  const form = document.querySelector<HTMLFormElement>('form.athlete-form');
  if (!form) return;

  const identification = Array.from(form.querySelectorAll<HTMLElement>('.form-section')).find(
    (section) => text(section.querySelector('.form-section-title h4')?.textContent) === 'Identificação',
  );
  const grid = identification?.querySelector<HTMLElement>('.form-grid');
  if (!grid || grid.querySelector(`.${SEX_FIELD_CLASS}`)) return;

  const nameLabel = Array.from(grid.querySelectorAll<HTMLLabelElement>('label')).find(
    (label) => text(label.firstChild?.textContent).startsWith('Nome completo'),
  );

  const field = createSexField();
  if (nameLabel) nameLabel.after(field);
  else grid.prepend(field);
}

function selectedSex(form: HTMLFormElement): AthleteSex | '' {
  const selected = form.querySelector<HTMLInputElement>('input[name="serfes-athlete-sex"]:checked')?.value;
  return selected === 'Feminino' || selected === 'Masculino' ? selected : '';
}

function athleteNameFromForm(form: HTMLFormElement) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find(
    (item) => text(item.firstChild?.textContent).startsWith('Nome completo'),
  );
  return text(label?.querySelector<HTMLInputElement>('input')?.value);
}

function successfulSubmitFinished(form: HTMLFormElement) {
  const formClosed = !document.documentElement.contains(form) || !document.querySelector('form.athlete-form');
  const returnedHome = Boolean(document.querySelector('.athlete-home-actions'));
  return formClosed && returnedHome;
}

function addReadonlySex() {
  const grid = document.querySelector<HTMLElement>('.serfes-athlete-data-view .final-account-grid');
  if (!grid || grid.querySelector('.serfes-sex-readonly-row')) return;

  const row = document.createElement('div');
  row.className = 'final-account-row serfes-sex-readonly-row';

  const label = document.createElement('span');
  label.textContent = 'Sexo';

  const value = document.createElement('strong');
  value.textContent = storedSex() || 'Não informado';

  row.append(label, value);

  const birthDateRow = Array.from(grid.querySelectorAll<HTMLElement>('.final-account-row')).find(
    (item) => text(item.querySelector('span')?.textContent) === 'Data de nascimento',
  );

  if (birthDateRow) birthDateRow.after(row);
  else grid.append(row);
}

function injectStyles() {
  if (document.getElementById('serfes-sex-and-greeting-styles')) return;

  const style = document.createElement('style');
  style.id = 'serfes-sex-and-greeting-styles';
  style.textContent = `
    .${SEX_FIELD_CLASS} {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
      display: grid;
      align-content: start;
      gap: .55rem;
    }

    .${SEX_FIELD_CLASS} legend {
      margin: 0;
      padding: 0;
      color: #17304d;
      font-size: .86rem;
      font-weight: 750;
    }

    .serfes-sex-options {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-height: 44px;
      padding: .68rem .8rem;
      border: 1px solid #cad9e5;
      border-radius: 12px;
      background: #fff;
    }

    .serfes-sex-option {
      display: inline-flex !important;
      align-items: center !important;
      gap: .45rem !important;
      margin: 0 !important;
      color: #17304d;
      font-size: .88rem;
      font-weight: 650;
      cursor: pointer;
    }

    .serfes-sex-option input[type='radio'] {
      width: 17px !important;
      height: 17px !important;
      min-width: 17px;
      margin: 0 !important;
      padding: 0 !important;
      accent-color: #0b5aa6;
      cursor: pointer;
    }

    @media (max-width: 560px) {
      .serfes-sex-options {
        align-items: flex-start;
        flex-direction: column;
        gap: .7rem;
      }
    }
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
    injectSexField();
    addReadonlySex();
    updateGreeting();
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;

    const fullName = athleteNameFromForm(form);
    const sex = selectedSex(form);

    window.setTimeout(() => {
      if (!successfulSubmitFinished(form)) {
        schedule();
        return;
      }

      writeStorage(COMPLETED_REGISTRATION_KEY, 'true');
      const name = firstName(fullName);
      if (name) writeStorage(FIRST_NAME_KEY, name);
      if (sex) writeStorage(SEX_KEY, sex);
      schedule();
    }, 500);
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);
  window.addEventListener('storage', (event) => {
    if ([COMPLETED_REGISTRATION_KEY, PROFILE_KEY, FIRST_NAME_KEY, SEX_KEY].includes(event.key ?? '')) schedule();
  });

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
