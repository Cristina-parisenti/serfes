export {};

type AthleteSnapshot = {
  name: string;
  cpf: string;
  birthDate: string;
  institution: string;
  municipality: string;
  updatedAt: string;
};

type NextCompetitionSnapshot = {
  name: string;
  date: string;
};

const PROFILE_KEY = 'serfes-athlete-profile-final';
const SCHOOL_VALIDATION_KEY = 'serfes-school-validation';
const ANNUAL_PENDING_KEY = 'serfes-annual-update-pending';
const ANNUAL_DONE_KEY = 'serfes-annual-update-done';
const NEXT_COMPETITION_KEY = 'serfes-next-competition';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function setText(element: Element | null | undefined, value: string) {
  if (element && text(element.textContent) !== value) element.textContent = value;
}

function navButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item')).find(
    (button) => text(button.textContent) === label,
  ) ?? null;
}

function openHome() {
  navButton('Início')?.click();
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

function snapshotFromForm(form: HTMLFormElement): AthleteSnapshot {
  return {
    name: fieldValue(form, 'Nome completo'),
    cpf: fieldValue(form, 'CPF'),
    birthDate: fieldValue(form, 'Data de nascimento'),
    institution: fieldValue(form, 'Instituição de ensino superior') || fieldValue(form, 'Escola'),
    municipality: fieldValue(form, 'Município'),
    updatedAt: new Date().toISOString(),
  };
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // O armazenamento local é apenas apoio ao protótipo.
  }
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function saveSnapshot(snapshot: AthleteSnapshot) {
  saveJson(PROFILE_KEY, snapshot);
}

function readSnapshot() {
  return readJson<AthleteSnapshot>(PROFILE_KEY);
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

function fixHero() {
  document.querySelector<HTMLElement>('.athlete-home-hero .pill')?.remove();
  const heading = document.querySelector<HTMLElement>('.athlete-home-hero h3');
  setText(heading, 'Bem-vindo(a) ao seu espaço no SERFES');
}

function registrationIsSaved() {
  if (readSnapshot()) return true;

  const card = document.querySelector<HTMLElement>('.athlete-home-primary-card');
  const cardText = text(card?.textContent);
  return card?.dataset.finalCard === 'saved'
    || cardText.includes('Meu cadastro')
    || cardText.includes('Atualizar meu cadastro');
}

function fixSidebar() {
  const cadastro = navButton('Meu cadastro');
  if (!cadastro) return;

  const hidden = registrationIsSaved();
  if (cadastro.hidden !== hidden) cadastro.hidden = hidden;
  const desiredDisplay = hidden ? 'none' : '';
  if (cadastro.style.display !== desiredDisplay) cadastro.style.display = desiredDisplay;
}

function schoolValidationComplete() {
  try {
    return localStorage.getItem(SCHOOL_VALIDATION_KEY) === 'validated';
  } catch {
    return false;
  }
}

function fixShortcuts() {
  const shortcuts = Array.from(document.querySelectorAll<HTMLButtonElement>('.athlete-home-shortcut'));
  const school = shortcuts.find((button) => text(button.textContent).toLowerCase().includes('validação escolar'));
  const docs = shortcuts.find((button) => text(button.textContent).toLowerCase().includes('documentos'));
  const competitions = shortcuts.find((button) => text(button.textContent).toLowerCase().includes('competiç'));

  if (school) {
    const shouldHide = schoolValidationComplete();
    if (school.hidden !== shouldHide) school.hidden = shouldHide;

    const copy = school.querySelector<HTMLElement>('span:nth-child(2)');
    setText(copy?.querySelector('strong'), 'Acompanhar validação escolar');
    setText(copy?.querySelector('small'), 'Veja o andamento da confirmação do vínculo pela instituição de ensino.');
  }

  if (docs) {
    if (docs.hidden) docs.hidden = false;
    const copy = docs.querySelector<HTMLElement>('span:nth-child(2)');
    setText(copy?.querySelector('strong'), 'Consultar meus documentos');
    setText(copy?.querySelector('small'), 'Acesse os documentos vinculados ao seu cadastro.');
  }

  if (competitions) {
    const copy = competitions.querySelector<HTMLElement>('span:nth-child(2)');
    setText(copy?.querySelector('strong'), 'Consultar competições e solicitar inscrição');
    setText(copy?.querySelector('small'), 'Confira as oportunidades disponíveis e a situação das suas solicitações.');
  }
}

function createPersonIcon(sourceCard: HTMLElement) {
  const original = sourceCard.querySelector<HTMLElement>('.athlete-home-card-icon');
  const clone = original?.cloneNode(true);
  if (clone instanceof HTMLElement) return clone;

  const fallback = document.createElement('span');
  fallback.className = 'athlete-home-card-icon';
  fallback.textContent = '👤';
  return fallback;
}

function renderStartCard(card: HTMLElement) {
  if (card.dataset.finalCard === 'start') return;

  const icon = createPersonIcon(card);

  card.dataset.finalCard = 'start';
  card.classList.add('final-start-card');
  card.replaceChildren();
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', 'Iniciar cadastro');

  const copy = document.createElement('span');
  copy.className = 'athlete-card-copy';

  const title = document.createElement('strong');
  title.textContent = 'Iniciar cadastro';

  const description = document.createElement('small');
  description.textContent = 'Preencha suas informações para acessar todos os recursos do SERFES.';

  copy.append(title, description);

  const activate = () => openForm();
  card.onclick = activate;
  card.onkeydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  };

  card.append(icon, copy);
}

function renderSavedCard(card: HTMLElement) {
  if (card.dataset.finalCard === 'saved') return;

  const snapshot = readSnapshot();

  card.dataset.finalCard = 'saved';
  card.classList.remove('final-start-card');
  card.classList.add('final-saved-card');
  card.replaceChildren();
  card.removeAttribute('role');
  card.removeAttribute('tabindex');
  card.onclick = null;
  card.onkeydown = null;

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
  card.append(heading, grid, footer);
}

function fixPrimaryCard() {
  const actions = document.querySelector<HTMLElement>('.athlete-home-actions');
  const card = actions?.querySelector<HTMLElement>('.athlete-home-primary-card');
  if (!actions || !card) return;

  if (registrationIsSaved()) renderSavedCard(card);
  else renderStartCard(card);
}

function annualUpdateNeeded() {
  const notice = document.querySelector<HTMLElement>('.athlete-next-step-notice');
  const year = new Date().getFullYear();

  try {
    if (localStorage.getItem(ANNUAL_DONE_KEY) === String(year)) return false;
  } catch {
    // Sem ação.
  }

  return text(notice?.textContent).includes('Atualize seu vínculo escolar');
}

function removeAnnualBanner() {
  document.querySelector<HTMLElement>('.final-annual-banner')?.remove();
}

function fixAnnualUpdate() {
  const nativeNotice = document.querySelector<HTMLElement>('.athlete-next-step-notice');
  if (nativeNotice) {
    if (!nativeNotice.hidden) nativeNotice.hidden = true;
    if (nativeNotice.style.display !== 'none') nativeNotice.style.display = 'none';
  }

  const hero = document.querySelector<HTMLElement>('.athlete-home-hero');
  if (!hero) return;

  if (!annualUpdateNeeded()) {
    removeAnnualBanner();
    return;
  }

  if (document.querySelector('.final-annual-banner')) return;

  const year = new Date().getFullYear();
  const banner = document.createElement('section');
  banner.className = 'final-annual-banner';

  const copy = document.createElement('div');

  const title = document.createElement('strong');
  title.textContent = 'Atualização cadastral necessária';

  const description = document.createElement('p');
  description.textContent = `Para continuar participando das competições, confirme ou atualize suas informações para ${year}.`;

  copy.append(title, description);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'athlete-annual-action';
  button.textContent = 'Atualizar cadastro';
  button.addEventListener('click', () => {
    try {
      sessionStorage.setItem(ANNUAL_PENDING_KEY, String(year));
    } catch {
      // Sem ação.
    }
    openForm();
  });

  banner.append(copy, button);
  hero.before(banner);
}

function fixCompetitionBackButton() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>('.section-toolbar h3')).find(
    (item) => text(item.textContent) === 'Minhas competições',
  );
  const container = heading?.parentElement;
  if (!container || container.querySelector('.final-competition-back')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'back-link final-competition-back';
  button.textContent = '← Voltar';
  button.addEventListener('click', openHome);

  container.prepend(button);
}

function readNextCompetition() {
  return readJson<NextCompetitionSnapshot>(NEXT_COMPETITION_KEY);
}

function captureCompetitionRequest(button: HTMLElement) {
  const card = button.closest<HTMLElement>('.competition-card');
  if (!card) return;

  const name = text(card.querySelector('h4')?.textContent);
  const meta = Array.from(card.querySelectorAll<HTMLElement>('.competition-meta span'));
  const date = meta.length > 1 ? text(meta[1].textContent) : '';

  if (name) saveJson(NEXT_COMPETITION_KEY, { name, date } satisfies NextCompetitionSnapshot);
}

function fixNextCompetition() {
  const homeActions = document.querySelector<HTMLElement>('.athlete-home-actions');
  if (!homeActions) return;

  const next = readNextCompetition();
  const existing = document.querySelector<HTMLElement>('.final-next-competition');

  if (!next) {
    existing?.remove();
    return;
  }

  if (existing) {
    setText(existing.querySelector('.final-next-name'), next.name);
    setText(existing.querySelector('.final-next-date'), next.date);
    return;
  }

  const section = document.createElement('section');
  section.className = 'final-next-competition';

  const copy = document.createElement('div');

  const label = document.createElement('span');
  label.className = 'eyebrow';
  label.textContent = 'Próxima competição';

  const name = document.createElement('strong');
  name.className = 'final-next-name';
  name.textContent = next.name;

  const date = document.createElement('span');
  date.className = 'final-next-date';
  date.textContent = next.date;

  copy.append(label, name, date);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-button';
  button.textContent = 'Ver detalhes';
  button.addEventListener('click', () => navButton('Minhas competições')?.click());

  section.append(copy, button);
  homeActions.before(section);
}

function injectStyles() {
  if (document.getElementById('serfes-final-athlete-styles')) return;

  const style = document.createElement('style');
  style.id = 'serfes-final-athlete-styles';
  style.textContent = `
    .final-start-card {
      cursor: pointer;
      display: grid !important;
      grid-template-columns: auto 1fr !important;
      align-items: center !important;
      gap: 1rem !important;
    }
    .final-start-card:hover {
      transform: translateY(-2px);
      border-color: #b8d4e9;
      box-shadow: 0 12px 26px rgba(20,59,99,.09);
    }
    .final-start-card .athlete-card-copy {
      display: grid;
      gap: .3rem;
      min-width: 0;
    }
    .final-start-card .athlete-card-copy strong {
      color: #143b63;
      font-size: 1.05rem;
    }
    .final-start-card .athlete-card-copy small {
      color: #61758d;
      line-height: 1.45;
    }
    .final-saved-card {
      display: block !important;
    }
    .final-account-heading h4 {
      margin: 0;
      color: #143b63;
      font-size: 1.15rem;
    }
    .final-account-heading p {
      margin: .3rem 0 0;
      color: #61758d;
      font-size: .84rem;
    }
    .final-account-grid {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: .8rem 1rem;
      margin-top: 1rem;
    }
    .final-account-row {
      display: grid;
      gap: .2rem;
    }
    .final-account-row span {
      color: #73859a;
      font-size: .72rem;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .final-account-row strong {
      color: #17304d;
      font-size: .88rem;
      overflow-wrap: anywhere;
    }
    .final-account-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 1rem;
    }
    .final-annual-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1rem 1.15rem;
      border: 1px solid #efd98a;
      border-radius: 18px;
      background: #fffdf6;
    }
    .final-annual-banner > div {
      display: grid;
      gap: .3rem;
    }
    .final-annual-banner strong {
      color: #5f4a00;
    }
    .final-annual-banner p {
      margin: 0;
      color: #75642d;
      line-height: 1.45;
      font-size: .88rem;
    }
    .final-next-competition {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 1rem 0;
      padding: 1rem 1.15rem;
      border: 1px solid #dce8f2;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 8px 20px rgba(20,59,99,.05);
    }
    .final-next-competition > div {
      display: grid;
      gap: .22rem;
    }
    .final-next-competition strong {
      color: #143b63;
      font-size: 1rem;
    }
    .final-next-competition .final-next-date {
      color: #61758d;
      font-size: .86rem;
    }
    .final-competition-back {
      margin-bottom: .6rem;
    }
    @media (max-width: 680px) {
      .final-account-grid {
        grid-template-columns: 1fr;
      }
      .final-account-footer .secondary-button,
      .final-annual-banner .athlete-annual-action,
      .final-next-competition .secondary-button {
        width: 100%;
        justify-content: center;
      }
      .final-annual-banner,
      .final-next-competition {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `;
  document.head.append(style);
}

function applyFinalFixes() {
  injectStyles();
  fixHero();
  fixPrimaryCard();
  fixSidebar();
  fixShortcuts();
  fixAnnualUpdate();
  fixCompetitionBackButton();
  fixNextCompetition();
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
    if (!form?.classList.contains('athlete-form')) return;

    const snapshot = snapshotFromForm(form);
    const year = new Date().getFullYear();

    window.setTimeout(() => {
      saveSnapshot(snapshot);

      try {
        if (sessionStorage.getItem(ANNUAL_PENDING_KEY) === String(year)) {
          localStorage.setItem(ANNUAL_DONE_KEY, String(year));
          sessionStorage.removeItem(ANNUAL_PENDING_KEY);
        }
      } catch {
        // Sem ação.
      }

      scheduleFinalFixes();
    }, 120);
  }, true);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLElement>('button');
    if (!button) return;

    if (text(button.textContent) === 'Solicitar inscrição') {
      captureCompetitionRequest(button);
    }
  }, true);

  window.addEventListener('DOMContentLoaded', scheduleFinalFixes, { once: true });
  window.addEventListener('focus', scheduleFinalFixes);
  window.addEventListener('storage', (event) => {
    if ([SCHOOL_VALIDATION_KEY, PROFILE_KEY, NEXT_COMPETITION_KEY, ANNUAL_DONE_KEY].includes(event.key ?? '')) {
      scheduleFinalFixes();
    }
  });

  const observer = new MutationObserver(scheduleFinalFixes);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
