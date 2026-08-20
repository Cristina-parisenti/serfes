type AthleteProfileSnapshot = {
  name: string;
  cpf: string;
  birthDate: string;
  institution: string;
  municipality: string;
  updatedAt: string;
};

type CompetitionSnapshot = {
  name: string;
  period: string;
  location: string;
};

const PROFILE_KEY = 'serfes-athlete-profile';
const SCHOOL_VALIDATION_KEY = 'serfes-school-validation';
const ANNUAL_PENDING_KEY = 'serfes-annual-update-pending';
const ANNUAL_DONE_KEY = 'serfes-last-annual-update-year';
const REGISTRATION_CANDIDATE_KEY = 'serfes-registration-candidate';
const NEXT_COMPETITION_KEY = 'serfes-next-competition';

function readStorage<T>(storage: Storage, key: string): T | null {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // O protótipo continua funcional mesmo se o navegador bloquear o armazenamento local.
  }
}

function removeStorage(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Sem ação: armazenamento local é apenas apoio à demonstração.
  }
}

function compactText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function findNavButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item')).find(
    (button) => compactText(button.textContent) === label,
  ) ?? null;
}

function openAthleteForm() {
  const cadastroButton = findNavButton('Meu cadastro');
  cadastroButton?.click();
}

function fieldValue(form: HTMLFormElement, labelStart: string) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find(
    (item) => compactText(item.textContent).startsWith(labelStart),
  );
  const control = label?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select');
  return control?.value?.trim() ?? '';
}

function captureAthleteForm(form: HTMLFormElement) {
  const snapshot: AthleteProfileSnapshot = {
    name: fieldValue(form, 'Nome completo'),
    cpf: fieldValue(form, 'CPF'),
    birthDate: fieldValue(form, 'Data de nascimento'),
    institution: fieldValue(form, 'Instituição de ensino superior') || fieldValue(form, 'Escola'),
    municipality: fieldValue(form, 'Município'),
    updatedAt: new Date().toISOString(),
  };
  writeStorage(localStorage, PROFILE_KEY, snapshot);
}

function formatDate(value: string) {
  if (!value) return 'Não informado';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informado' : new Intl.DateTimeFormat('pt-BR').format(date);
}

function maskCpf(value: string) {
  return value ? '***.***.***-**' : 'Não informado';
}

function appendSummaryRow(container: HTMLElement, label: string, value: string) {
  const row = document.createElement('div');
  row.className = 'athlete-profile-row';
  const term = document.createElement('span');
  term.textContent = label;
  const detail = document.createElement('strong');
  detail.textContent = value || 'Não informado';
  row.append(term, detail);
  container.append(row);
}

function renderProfileCard(card: HTMLElement) {
  if (card.querySelector('.athlete-profile-summary')) return;

  card.classList.remove('athlete-home-complete-card');
  card.classList.add('athlete-profile-card');
  card.removeAttribute('role');
  card.removeAttribute('tabindex');
  card.onclick = null;
  card.onkeydown = null;
  card.replaceChildren();

  const snapshot = readStorage<AthleteProfileSnapshot>(localStorage, PROFILE_KEY);
  const wrapper = document.createElement('div');
  wrapper.className = 'athlete-profile-summary';

  const heading = document.createElement('div');
  heading.className = 'athlete-profile-heading';
  const icon = document.createElement('span');
  icon.className = 'athlete-profile-icon';
  icon.textContent = '✓';
  const headingCopy = document.createElement('div');
  const kicker = document.createElement('span');
  kicker.className = 'athlete-home-card-kicker';
  kicker.textContent = 'Cadastro concluído';
  const title = document.createElement('h4');
  title.textContent = 'Dados cadastrais';
  headingCopy.append(kicker, title);
  heading.append(icon, headingCopy);

  const rows = document.createElement('div');
  rows.className = 'athlete-profile-grid';
  appendSummaryRow(rows, 'Nome', snapshot?.name || 'Não informado');
  appendSummaryRow(rows, 'CPF', maskCpf(snapshot?.cpf ?? ''));
  appendSummaryRow(rows, 'Data de nascimento', formatDate(snapshot?.birthDate ?? ''));
  appendSummaryRow(rows, 'Instituição de ensino', snapshot?.institution || 'Não informado');
  appendSummaryRow(rows, 'Município', snapshot?.municipality || 'Não informado');
  appendSummaryRow(rows, 'Última atualização', formatUpdatedAt(snapshot?.updatedAt ?? ''));

  const footer = document.createElement('div');
  footer.className = 'athlete-profile-footer';
  const annualYear = readStorage<number>(localStorage, ANNUAL_DONE_KEY);
  if (annualYear === new Date().getFullYear()) {
    const badge = document.createElement('span');
    badge.className = 'athlete-profile-updated-badge';
    badge.textContent = `Cadastro atualizado para ${annualYear} ✓`;
    footer.append(badge);
  }

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'secondary-button athlete-profile-edit';
  editButton.textContent = 'Alterar cadastro';
  editButton.addEventListener('click', openAthleteForm);
  footer.append(editButton);

  wrapper.append(heading, rows, footer);
  card.append(wrapper);
}

function renderCompleteCard(card: HTMLElement) {
  if (compactText(card.textContent).includes('Complete seu cadastro')) return;

  card.classList.remove('athlete-profile-card');
  card.classList.add('athlete-home-complete-card');
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.replaceChildren();

  const icon = document.createElement('span');
  icon.className = 'athlete-home-card-icon';
  icon.textContent = '＋';

  const copy = document.createElement('span');
  copy.className = 'athlete-complete-copy';
  const title = document.createElement('strong');
  title.textContent = 'Complete seu cadastro';
  const description = document.createElement('small');
  description.textContent = 'Preencha as informações necessárias para utilizar todos os recursos da plataforma.';
  const action = document.createElement('span');
  action.className = 'athlete-complete-action';
  action.textContent = 'Completar cadastro';
  copy.append(title, description, action);

  const arrow = document.createElement('span');
  arrow.className = 'athlete-complete-arrow';
  arrow.textContent = '›';
  card.append(icon, copy, arrow);

  card.onclick = openAthleteForm;
  card.onkeydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openAthleteForm();
    }
  };
}

function updateShortcut(
  button: HTMLButtonElement | undefined,
  title: string,
  description: string,
) {
  if (!button) return;
  const copy = button.querySelector<HTMLElement>('span:nth-child(2)');
  const strong = copy?.querySelector('strong');
  const small = copy?.querySelector('small');
  if (strong) strong.textContent = title;
  if (small) small.textContent = description;
}

function refineShortcuts(saved: boolean) {
  const shortcuts = Array.from(document.querySelectorAll<HTMLButtonElement>('.athlete-home-shortcut'));
  const school = shortcuts.find((button) => compactText(button.textContent).toLowerCase().includes('validação escolar'));
  const docs = shortcuts.find((button) => compactText(button.textContent).toLowerCase().includes('documentos'));
  const competition = shortcuts.find((button) => {
    const text = compactText(button.textContent).toLowerCase();
    return text.includes('competiç') || text.includes('inscrição');
  });

  const schoolStatus = (() => {
    try {
      return localStorage.getItem(SCHOOL_VALIDATION_KEY) ?? 'pending';
    } catch {
      return 'pending';
    }
  })();

  if (school) school.hidden = !saved || schoolStatus === 'validated';
  if (docs) docs.hidden = !saved;

  updateShortcut(
    school,
    'Acompanhar validação escolar',
    'Veja o andamento da confirmação do vínculo informado.',
  );
  updateShortcut(
    docs,
    'Consultar meus documentos',
    'Acesse os arquivos vinculados ao seu cadastro.',
  );
  updateShortcut(
    competition,
    'Verificar competições e solicitar inscrição',
    'Confira eventos disponíveis e envie seu pedido de participação.',
  );
}

function renderAnnualUpdate(saved: boolean) {
  const nativeNotice = document.querySelector<HTMLElement>('.athlete-next-step-notice');
  const annualNeeded = saved && compactText(nativeNotice?.textContent).includes('Atualize seu vínculo escolar');
  if (nativeNotice) nativeNotice.hidden = true;

  const existing = document.querySelector<HTMLElement>('.athlete-annual-update');
  const hero = document.querySelector<HTMLElement>('.athlete-home-hero');

  if (!annualNeeded) {
    existing?.remove();
    const pendingYear = readStorage<number>(sessionStorage, ANNUAL_PENDING_KEY);
    if (saved && pendingYear) {
      writeStorage(localStorage, ANNUAL_DONE_KEY, pendingYear);
      removeStorage(sessionStorage, ANNUAL_PENDING_KEY);
    }
    return;
  }

  if (existing || !hero) return;
  const year = new Date().getFullYear();
  const alert = document.createElement('section');
  alert.className = 'athlete-annual-update';

  const copy = document.createElement('div');
  const kicker = document.createElement('span');
  kicker.className = 'athlete-annual-kicker';
  kicker.textContent = 'Atenção';
  const title = document.createElement('strong');
  title.textContent = 'Atualização cadastral necessária';
  const description = document.createElement('p');
  description.textContent = `Para continuar participando das competições, confirme ou atualize suas informações para ${year}.`;
  copy.append(kicker, title, description);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'athlete-annual-action';
  button.textContent = 'Atualizar cadastro';
  button.addEventListener('click', () => {
    writeStorage(sessionStorage, ANNUAL_PENDING_KEY, year);
    openAthleteForm();
  });

  alert.append(copy, button);
  hero.before(alert);
}

const MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

function competitionStartDate(period: string) {
  const normalized = period.toLowerCase();
  const day = Number(normalized.match(/\d{1,2}/)?.[0]);
  const year = Number(normalized.match(/20\d{2}/)?.[0]);
  const monthEntry = Object.entries(MONTHS).find(([name]) => normalized.includes(name));
  if (!day || !year || !monthEntry) return null;
  const date = new Date(year, monthEntry[1], day, 23, 59, 59);
  return Number.isNaN(date.getTime()) ? null : date;
}

function renderNextCompetition(saved: boolean) {
  const existing = document.querySelector<HTMLElement>('.athlete-next-competition');
  if (!saved) {
    existing?.remove();
    return;
  }

  const snapshot = readStorage<CompetitionSnapshot>(localStorage, NEXT_COMPETITION_KEY);
  const start = snapshot ? competitionStartDate(snapshot.period) : null;
  if (!snapshot || (start && start.getTime() < Date.now())) {
    existing?.remove();
    return;
  }

  if (existing) return;
  const actions = document.querySelector<HTMLElement>('.athlete-home-actions');
  if (!actions) return;

  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'athlete-next-competition';
  card.addEventListener('click', () => findNavButton('Minhas competições')?.click());

  const copy = document.createElement('span');
  const kicker = document.createElement('small');
  kicker.textContent = 'Próxima competição';
  const title = document.createElement('strong');
  title.textContent = snapshot.name;
  const details = document.createElement('span');
  details.textContent = `${snapshot.period}${snapshot.location ? ` • ${snapshot.location}` : ''}`;
  copy.append(kicker, title, details);
  const action = document.createElement('span');
  action.className = 'athlete-next-competition-action';
  action.textContent = 'Ver detalhes ›';
  card.append(copy, action);
  actions.before(card);
}

function candidateFromCompetitionCard(card: HTMLElement): CompetitionSnapshot | null {
  const name = compactText(card.querySelector('h4')?.textContent);
  const meta = Array.from(card.querySelectorAll<HTMLElement>('.competition-meta span')).map((item) => compactText(item.textContent));
  const period = meta.find((item) => /20\d{2}/.test(item)) ?? '';
  const location = meta.find((item) => /\/PR/.test(item)) ?? '';
  return name && period ? { name, period, location } : null;
}

function confirmRegistrationCandidate() {
  const candidate = readStorage<CompetitionSnapshot>(sessionStorage, REGISTRATION_CANDIDATE_KEY);
  if (!candidate) return;

  const successInList = Array.from(document.querySelectorAll<HTMLElement>('.competition-card')).some((card) => {
    return compactText(card.querySelector('h4')?.textContent) === candidate.name && !!card.querySelector('.competition-registration-status');
  });
  const successInAuthorization = !!document.querySelector('.term-preview') && Array.from(document.querySelectorAll<HTMLHeadingElement>('h3')).some(
    (heading) => compactText(heading.textContent) === candidate.name,
  );

  if (successInList || successInAuthorization) {
    writeStorage(localStorage, NEXT_COMPETITION_KEY, candidate);
    removeStorage(sessionStorage, REGISTRATION_CANDIDATE_KEY);
  }
}

function refineAthleteHome() {
  confirmRegistrationCandidate();

  const actions = document.querySelector<HTMLElement>('.athlete-home-actions');
  if (!actions) return;

  const primaryCard = actions.querySelector<HTMLElement>('.athlete-home-primary-card');
  const originalHeading = primaryCard?.querySelector<HTMLHeadingElement>('h4');
  const originalButton = primaryCard?.querySelector<HTMLButtonElement>('.primary-button');
  const saved =
    actions.classList.contains('athlete-home-saved-menu') ||
    originalHeading?.textContent?.trim() === 'Meu cadastro' ||
    originalButton?.textContent?.includes('Atualizar meu cadastro') === true ||
    !!primaryCard?.querySelector('.athlete-profile-summary');

  actions.classList.toggle('athlete-home-saved-menu', saved);

  const heroPill = document.querySelector<HTMLElement>('.athlete-home-hero .pill');
  heroPill?.remove();

  const cadastroNav = findNavButton('Meu cadastro');
  if (cadastroNav) cadastroNav.hidden = saved;

  if (primaryCard) {
    if (saved) renderProfileCard(primaryCard);
    else renderCompleteCard(primaryCard);
  }

  refineShortcuts(saved);
  renderAnnualUpdate(saved);
  renderNextCompetition(saved);
}

let scheduled = false;
function scheduleRefinement() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    refineAthleteHome();
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (form?.classList.contains('athlete-form')) captureAthleteForm(form);
  }, true);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>('button');
    if (!button || compactText(button.textContent) !== 'Solicitar inscrição') return;
    const card = button.closest<HTMLElement>('.competition-card');
    const candidate = card ? candidateFromCompetitionCard(card) : null;
    if (candidate) {
      writeStorage(sessionStorage, REGISTRATION_CANDIDATE_KEY, candidate);
      window.setTimeout(confirmRegistrationCandidate, 350);
    }
  }, true);

  window.addEventListener('DOMContentLoaded', scheduleRefinement, { once: true });
  const observer = new MutationObserver(scheduleRefinement);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
