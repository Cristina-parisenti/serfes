export {};

const REGISTRATION_ENTRY_KEY = 'serfes-athlete-registration-entry';
const EDIT_REQUEST_KEY = 'serfes-athlete-edit-requested';
const COMPETITION_VIEW_KEY = 'serfes-athlete-competition-view';
const SCHOOL_VALIDATION_KEY = 'serfes-school-validation';
const STYLE_ID = 'serfes-athlete-menu-navigation-styles';
const MINE_BUTTON_ID = 'serfes-my-competitions-menu';
const EMPTY_ID = 'serfes-my-competitions-empty';
const GATE_ANCHOR_CLASS = 'serfes-competition-gate-anchor';

type CompetitionView = 'registrations' | 'mine';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function athleteAreaOpen() {
  return text(document.querySelector('.sidebar-brand-wrap .eyebrow')?.textContent).toLowerCase() === 'área do atleta';
}

function navButtons() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item'));
}

function navButton(label: string) {
  return navButtons().find((button) => text(button.textContent) === label) ?? null;
}

function registrationEntryActive() {
  try {
    return sessionStorage.getItem(REGISTRATION_ENTRY_KEY) === 'true';
  } catch {
    return false;
  }
}

function setEditRequest(active: boolean) {
  try {
    if (active) sessionStorage.setItem(EDIT_REQUEST_KEY, 'true');
    else sessionStorage.removeItem(EDIT_REQUEST_KEY);
  } catch {
    // Sem ação.
  }
}

function consumeEditRequest() {
  try {
    const active = sessionStorage.getItem(EDIT_REQUEST_KEY) === 'true';
    if (active) sessionStorage.removeItem(EDIT_REQUEST_KEY);
    return active;
  } catch {
    return false;
  }
}

function competitionView(): CompetitionView {
  try {
    return sessionStorage.getItem(COMPETITION_VIEW_KEY) === 'mine' ? 'mine' : 'registrations';
  } catch {
    return 'registrations';
  }
}

function setCompetitionView(value: CompetitionView) {
  try {
    sessionStorage.setItem(COMPETITION_VIEW_KEY, value);
  } catch {
    // Sem ação.
  }
}

function setButtonLabel(button: HTMLButtonElement, label: string) {
  const nodes = Array.from(button.childNodes).reverse();
  const textNode = nodes.find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    if (text(textNode.textContent) !== label) textNode.textContent = ` ${label}`;
    return;
  }
  button.append(document.createTextNode(` ${label}`));
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .sidebar-nav .nav-item[data-serfes-cadastro-menu='true'] {
      display: flex !important;
    }
    .serfes-school-validation-status {
      display: grid;
      gap: .2rem;
      margin: .15rem 0 .2rem;
      padding: .8rem .9rem;
      border: 1px solid #efd98a;
      border-radius: 12px;
      background: #fffdf6;
    }
    .serfes-school-validation-status strong {
      color: #5f4a00;
      font-size: .86rem;
    }
    .serfes-school-validation-status span {
      color: #75642d;
      font-size: .8rem;
      line-height: 1.4;
    }
    #${EMPTY_ID} {
      margin-top: .9rem;
      padding: 1rem 1.05rem;
      border: 1px dashed #c9d9e7;
      border-radius: 14px;
      color: #61758d;
      background: #fbfdff;
      text-align: center;
      font-size: .88rem;
    }
    .${GATE_ANCHOR_CLASS} { display: none !important; }
  `;
  document.head.append(style);
}

function revealCadastro(button: HTMLButtonElement) {
  button.dataset.serfesCadastroMenu = 'true';
  button.hidden = false;
  button.style.display = '';
  button.classList.remove('serfes-hidden-cadastro-nav');
  button.removeAttribute('aria-hidden');
  if (button.tabIndex < 0) button.tabIndex = 0;
}

function nativeRegistrationsButton() {
  return navButtons().find((button) =>
    button.dataset.serfesRegistrationMenu === 'true'
    || (button.id !== MINE_BUTTON_ID && ['Minhas competições', 'Inscrições'].includes(text(button.textContent))),
  ) ?? null;
}

function createMineButton(source: HTMLButtonElement) {
  const button = document.createElement('button');
  button.id = MINE_BUTTON_ID;
  button.type = 'button';
  button.className = 'nav-item';
  button.dataset.serfesMineCompetitions = 'true';

  const icon = source.querySelector('svg')?.cloneNode(true);
  if (icon instanceof SVGElement) button.append(icon);
  button.append(document.createTextNode(' Minhas competições'));
  return button;
}

function ensureMenu() {
  if (!athleteAreaOpen()) return;
  ensureStyles();

  const cadastro = navButtons().find((button) => text(button.textContent) === 'Meu cadastro');
  if (cadastro) revealCadastro(cadastro);

  const registrations = nativeRegistrationsButton();
  if (!registrations) return;

  registrations.dataset.serfesRegistrationMenu = 'true';
  setButtonLabel(registrations, 'Inscrições');

  let mine = document.getElementById(MINE_BUTTON_ID) as HTMLButtonElement | null;
  if (!mine || !mine.isConnected) {
    mine = createMineButton(registrations);
    registrations.after(mine);
  }
}

function closeReadonlyDataView() {
  document.querySelector<HTMLElement>('.serfes-athlete-data-view')?.remove();
  document.querySelectorAll<HTMLElement>('.serfes-data-view-open').forEach((element) => {
    element.classList.remove('serfes-data-view-open');
  });
}

function openReadonlyCadastro() {
  closeReadonlyDataView();
  navButton('Início')?.click();

  let attempts = 0;
  const tryOpen = () => {
    attempts += 1;
    const card = document.querySelector<HTMLElement>('.serfes-data-card');
    if (card) {
      card.click();
      schedule();
      return;
    }
    if (attempts < 12) window.setTimeout(tryOpen, 35);
  };
  window.setTimeout(tryOpen, 0);
}

function registeredCard(card: HTMLElement) {
  return Boolean(card.querySelector('.competition-registration-status'))
    || text(card.textContent).includes('Solicitação registrada')
    || text(card.textContent).includes('Inscrição enviada')
    || text(card.textContent).includes('Aguardando assinatura');
}

function ensureGateAnchor(toolbar: HTMLElement, active: boolean) {
  let anchor = toolbar.querySelector<HTMLElement>(`.${GATE_ANCHOR_CLASS}`);
  if (!active) {
    anchor?.remove();
    return;
  }
  if (!anchor) {
    anchor = document.createElement('h3');
    anchor.className = GATE_ANCHOR_CLASS;
    anchor.setAttribute('aria-hidden', 'true');
    anchor.textContent = 'Minhas competições';
    toolbar.append(anchor);
  }
}

function renderCompetitionView() {
  const grid = document.querySelector<HTMLElement>('.competition-grid');
  if (!grid) {
    document.getElementById(EMPTY_ID)?.remove();
    return;
  }

  const mode = competitionView();
  const toolbar = Array.from(document.querySelectorAll<HTMLElement>('.section-toolbar')).find((section) =>
    Boolean(section.querySelector('h3')) && section.nextElementSibling !== null,
  ) ?? document.querySelector<HTMLElement>('.section-toolbar');
  const heading = toolbar?.querySelector<HTMLElement>(`h3:not(.${GATE_ANCHOR_CLASS})`);
  const description = toolbar?.querySelector<HTMLElement>('.muted');

  if (heading) heading.textContent = mode === 'mine' ? 'Minhas competições' : 'Inscrições';
  if (description) {
    description.textContent = mode === 'mine'
      ? 'Acompanhe as competições em que você já solicitou inscrição e consulte a situação de cada participação.'
      : 'Consulte as competições disponíveis, confira os requisitos e solicite sua inscrição.';
  }

  if (toolbar) ensureGateAnchor(toolbar, mode === 'registrations');

  const cards = Array.from(grid.querySelectorAll<HTMLElement>('.competition-card'));
  let visible = 0;
  cards.forEach((card) => {
    const show = mode === 'registrations' || registeredCard(card);
    card.hidden = !show;
    if (show) visible += 1;
  });

  let empty = document.getElementById(EMPTY_ID);
  if (mode === 'mine' && visible === 0) {
    if (!empty) {
      empty = document.createElement('div');
      empty.id = EMPTY_ID;
      grid.insertAdjacentElement('afterend', empty);
    }
    empty.textContent = 'Você ainda não possui competições vinculadas ao seu cadastro.';
  } else {
    empty?.remove();
  }
}

function schoolValidationStatus() {
  try {
    return localStorage.getItem(SCHOOL_VALIDATION_KEY) ?? '';
  } catch {
    return '';
  }
}

function syncSchoolValidationNotice() {
  const view = document.querySelector<HTMLElement>('.serfes-athlete-data-view');
  if (!view) return;

  const section = Array.from(view.querySelectorAll<HTMLElement>('.serfes-complete-readonly-section')).find((item) =>
    text(item.querySelector('h4')?.textContent) === 'Vínculo escolar',
  );
  if (!section) return;

  const enrolledRow = Array.from(section.querySelectorAll<HTMLElement>('.final-account-row')).find((row) =>
    text(row.querySelector('span')?.textContent) === 'Matriculado em instituição de ensino',
  );
  const enrolled = text(enrolledRow?.querySelector('strong')?.textContent);
  let notice = section.querySelector<HTMLElement>('.serfes-school-validation-status');

  if (enrolled === 'Não' || schoolValidationStatus() === 'validated') {
    notice?.remove();
    return;
  }

  if (!notice) {
    notice = document.createElement('div');
    notice.className = 'serfes-school-validation-status';
    const title = document.createElement('strong');
    title.textContent = 'Validação do vínculo escolar pendente';
    const detail = document.createElement('span');
    detail.textContent = 'A confirmação pela instituição de ensino ainda não foi concluída. Este aviso desaparecerá automaticamente após a validação.';
    notice.append(title, detail);
    section.querySelector('h4')?.insertAdjacentElement('afterend', notice);
  }
}

function syncActiveMenu() {
  if (!athleteAreaOpen()) return;

  const cadastro = navButtons().find((button) => text(button.textContent) === 'Meu cadastro');
  const registrations = nativeRegistrationsButton();
  const mine = document.getElementById(MINE_BUTTON_ID) as HTMLButtonElement | null;
  const inicio = navButton('Início');

  const cadastroOpen = Boolean(document.querySelector('.serfes-athlete-data-view, form.athlete-form'));
  const competitionOpen = Boolean(document.querySelector('.competition-grid, .term-preview'));
  const mode = competitionView();

  if (cadastro) cadastro.classList.toggle('active', cadastroOpen);
  if (inicio && cadastroOpen) inicio.classList.remove('active');
  if (registrations && competitionOpen) registrations.classList.toggle('active', mode === 'registrations');
  if (mine) mine.classList.toggle('active', competitionOpen && mode === 'mine');
  if (competitionOpen && inicio) inicio.classList.remove('active');
}

function apply() {
  ensureMenu();
  renderCompetitionView();
  syncSchoolValidationNotice();
  syncActiveMenu();
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
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>('button');
    if (!button) return;

    if (text(button.textContent) === 'Alterar cadastro') {
      setEditRequest(true);
      return;
    }

    if (button.id === MINE_BUTTON_ID) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeReadonlyDataView();
      setCompetitionView('mine');
      const registrations = nativeRegistrationsButton();
      if (registrations) {
        registrations.dataset.serfesForwardMode = 'mine';
        registrations.click();
        delete registrations.dataset.serfesForwardMode;
      }
      schedule();
      return;
    }

    if (!button.closest('.sidebar-nav')) return;

    if (text(button.textContent) === 'Meu cadastro') {
      if (registrationEntryActive() || consumeEditRequest()) {
        closeReadonlyDataView();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      openReadonlyCadastro();
      return;
    }

    if (button.dataset.serfesRegistrationMenu === 'true' || text(button.textContent) === 'Inscrições') {
      const forwardedMine = button.dataset.serfesForwardMode === 'mine';
      setCompetitionView(forwardedMine ? 'mine' : 'registrations');
      closeReadonlyDataView();
      schedule();
    }
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);
  window.addEventListener('storage', (event) => {
    if (!event.key || [SCHOOL_VALIDATION_KEY].includes(event.key)) schedule();
  });

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['hidden', 'style', 'class'],
  });
}
