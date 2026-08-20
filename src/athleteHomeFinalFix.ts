type AthleteSnapshot = {
  name: string;
  cpf: string;
  birthDate: string;
  institution: string;
  municipality: string;
  updatedAt: string;
};

const PROFILE_KEY = 'serfes-athlete-profile-final';
const SCHOOL_VALIDATION_KEY = 'serfes-school-validation';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function navButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item')).find(
    (button) => text(button.textContent) === label,
  ) ?? null;
}

function openForm() {
  navButton('Meu cadastro')?.click();
}

function fieldValue(form: HTMLFormElement, labelStart: string) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find(
    (item) => text(item.textContent).startsWith(labelStart),
  );
  return label?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select')?.value?.trim() ?? '';
}

function captureForm(form: HTMLFormElement) {
  const snapshot: AthleteSnapshot = {
    name: fieldValue(form, 'Nome completo'),
    cpf: fieldValue(form, 'CPF'),
    birthDate: fieldValue(form, 'Data de nascimento'),
    institution: fieldValue(form, 'Instituição de ensino superior') || fieldValue(form, 'Escola'),
    municipality: fieldValue(form, 'Município'),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(snapshot));
  } catch {
    // O armazenamento local é apenas apoio ao protótipo.
  }
}

function readSnapshot(): AthleteSnapshot | null {
  try {
    const value = localStorage.getItem(PROFILE_KEY);
    return value ? JSON.parse(value) as AthleteSnapshot : null;
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  if (!value) return 'Não informado';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatUpdatedAt(value: string) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date);
}

function maskCpf(value: string) {
  return value ? '***.***.***-**' : 'Não informado';
}

function addRow(container: HTMLElement, label: string, value: string) {
  const row = document.createElement('div');
  row.className = 'final-account-row';
  const key = document.createElement('span');
  key.textContent = label;
  const data = document.createElement('strong');
  data.textContent = value || 'Não informado';
  row.append(key, data);
  container.append(row);
}

function fixSidebar() {
  const cadastro = navButton('Meu cadastro');
  if (!cadastro) return;
  cadastro.hidden = true;
  cadastro.style.display = 'none';
}

function fixShortcuts() {
  const shortcuts = Array.from(document.querySelectorAll<HTMLButtonElement>('.athlete-home-shortcut'));
  const school = shortcuts.find((button) => text(button.textContent).toLowerCase().includes('validação escolar'));
  const docs = shortcuts.find((button) => text(button.textContent).toLowerCase().includes('documentos'));

  let validated = false;
  try {
    validated = localStorage.getItem(SCHOOL_VALIDATION_KEY) === 'validated';
  } catch {
    validated = false;
  }

  if (school) {
    school.hidden = validated;
    const copy = school.querySelector<HTMLElement>('span:nth-child(2)');
    const strong = copy?.querySelector('strong');
    const small = copy?.querySelector('small');
    if (strong) strong.textContent = 'Acompanhar validação escolar';
    if (small) small.textContent = 'Veja o andamento da confirmação do vínculo pela instituição de ensino.';
  }

  if (docs) {
    docs.hidden = false;
    const copy = docs.querySelector<HTMLElement>('span:nth-child(2)');
    const strong = copy?.querySelector('strong');
    const small = copy?.querySelector('small');
    if (strong) strong.textContent = 'Verificar documentos';
    if (small) small.textContent = 'Acesse os documentos vinculados ao seu cadastro.';
  }
}

function renderStartCard(card: HTMLElement) {
  if (card.dataset.finalCard === 'start') return;
  card.dataset.finalCard = 'start';

  const title = card.querySelector<HTMLElement>('.athlete-card-copy strong, h4');
  const description = card.querySelector<HTMLElement>('.athlete-card-copy small, p');
  const action = card.querySelector<HTMLElement>('.athlete-card-action');

  if (title) title.textContent = 'Iniciar cadastro';
  if (description) description.textContent = 'Informe seus dados pessoais, esportivos e de vínculo escolar.';
  action?.remove();
  card.setAttribute('aria-label', 'Iniciar cadastro');
}

function renderSavedCard(card: HTMLElement) {
  if (card.dataset.finalCard === 'saved') return;
  card.dataset.finalCard = 'saved';
  card.replaceChildren();
  card.removeAttribute('role');
  card.removeAttribute('tabindex');
  card.onclick = null;
  card.onkeydown = null;

  const snapshot = readSnapshot();

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'final-account-toggle';
  toggle.setAttribute('aria-expanded', 'false');

  const icon = document.createElement('span');
  icon.className = 'athlete-account-icon';
  icon.textContent = '✓';

  const copy = document.createElement('span');
  copy.className = 'athlete-card-copy';
  const title = document.createElement('strong');
  title.textContent = 'Meu cadastro';
  const description = document.createElement('small');
  description.textContent = 'Visualize as informações registradas no SERFES.';
  const updated = document.createElement('span');
  updated.className = 'athlete-account-updated';
  updated.textContent = 'Cadastro atualizado.';
  copy.append(title, description, updated);

  const arrow = document.createElement('span');
  arrow.className = 'athlete-card-arrow';
  arrow.textContent = '›';
  toggle.append(icon, copy, arrow);

  const details = document.createElement('div');
  details.className = 'final-account-details';
  details.hidden = true;

  const heading = document.createElement('div');
  heading.className = 'final-account-heading';
  const headingTitle = document.createElement('h4');
  headingTitle.textContent = 'Dados cadastrais';
  const headingText = document.createElement('p');
  headingText.textContent = 'Estas informações estão disponíveis apenas para visualização.';
  heading.append(headingTitle, headingText);

  const grid = document.createElement('div');
  grid.className = 'final-account-grid';
  addRow(grid, 'Nome', snapshot?.name || 'Não informado');
  addRow(grid, 'CPF', maskCpf(snapshot?.cpf ?? ''));
  addRow(grid, 'Data de nascimento', formatDate(snapshot?.birthDate ?? ''));
  addRow(grid, 'Instituição de ensino', snapshot?.institution || 'Não informado');
  addRow(grid, 'Município', snapshot?.municipality || 'Não informado');
  addRow(grid, 'Última atualização', formatUpdatedAt(snapshot?.updatedAt ?? ''));

  const footer = document.createElement('div');
  footer.className = 'final-account-footer';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'secondary-button';
  edit.textContent = 'Alterar cadastro';
  edit.addEventListener('click', openForm);
  footer.append(edit);

  details.append(heading, grid, footer);

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    details.hidden = expanded;
    arrow.textContent = expanded ? '›' : '⌄';
  });

  card.append(toggle, details);
}

function fixPrimaryCard() {
  const actions = document.querySelector<HTMLElement>('.athlete-home-actions');
  const card = actions?.querySelector<HTMLElement>('.athlete-home-primary-card');
  if (!actions || !card) return;

  const saved =
    actions.classList.contains('athlete-home-saved-menu') ||
    card.dataset.athleteCardMode === 'account' ||
    text(card.textContent).includes('Meu cadastro');

  if (saved) renderSavedCard(card);
  else renderStartCard(card);
}

function fixAnnualPopup() {
  const popup = document.querySelector<HTMLElement>('.athlete-annual-update');
  if (!popup) return;
  popup.classList.add('final-annual-popup');
}

function injectStyles() {
  if (document.getElementById('serfes-final-athlete-styles')) return;
  const style = document.createElement('style');
  style.id = 'serfes-final-athlete-styles';
  style.textContent = `
    .final-account-toggle {
      width: 100%; display: grid; grid-template-columns: auto 1fr auto; align-items: center;
      gap: 1rem; padding: 0; border: 0; background: transparent; text-align: left; color: inherit;
    }
    .final-account-details { width: 100%; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e1eaf2; }
    .final-account-heading h4 { margin: 0; color: #143b63; font-size: 1.15rem; }
    .final-account-heading p { margin: .3rem 0 0; color: #61758d; font-size: .84rem; }
    .final-account-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: .8rem 1rem; margin-top: 1rem; }
    .final-account-row { display: grid; gap: .2rem; }
    .final-account-row span { color: #73859a; font-size: .72rem; font-weight: 750; text-transform: uppercase; letter-spacing: .04em; }
    .final-account-row strong { color: #17304d; font-size: .88rem; overflow-wrap: anywhere; }
    .final-account-footer { display: flex; justify-content: flex-end; margin-top: 1rem; }
    .final-annual-popup {
      position: fixed !important; left: 50% !important; top: 50% !important; transform: translate(-50%,-50%) !important;
      z-index: 120 !important; width: min(520px, calc(100vw - 36px)) !important; margin: 0 !important;
      box-shadow: 0 26px 75px rgba(20,59,99,.3) !important; background: #fffdf7 !important;
    }
    @media (max-width: 680px) {
      .final-account-toggle { grid-template-columns: auto 1fr; }
      .final-account-toggle .athlete-card-arrow { display: none; }
      .final-account-grid { grid-template-columns: 1fr; }
      .final-account-footer .secondary-button { width: 100%; justify-content: center; }
    }
  `;
  document.head.append(style);
}

function applyFinalFixes() {
  injectStyles();
  fixSidebar();
  fixShortcuts();
  fixPrimaryCard();
  fixAnnualPopup();
}

let scheduled = false;
function scheduleFinalFixes() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyFinalFixes();
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (form?.classList.contains('athlete-form')) captureForm(form);
  }, true);

  window.addEventListener('DOMContentLoaded', scheduleFinalFixes, { once: true });
  const observer = new MutationObserver(scheduleFinalFixes);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['hidden', 'style', 'class'],
  });
}
