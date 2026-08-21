export {};

type StoredDocument = {
  name: string;
  type: string;
  size: number;
  updatedAt: string;
};

type LegacySnapshot = {
  name?: string;
  cpf?: string;
  birthDate?: string;
  institution?: string;
  municipality?: string;
  updatedAt?: string;
};

type CompleteSnapshot = {
  identification: {
    name: string;
    sex: string;
    birthDate: string;
    cpf: string;
    email: string;
    phone: string;
    municipality: string;
    uf: string;
  };
  sports: {
    nickname: string;
    game: string;
  };
  school: {
    enrollment: string;
    municipality: string;
    network: string;
    level: string;
    institution: string;
    schoolYear: string;
    course: string;
  };
  responsible: {
    name: string;
    capacity: string;
    cpf: string;
    email: string;
    phone: string;
    proofDocument: string;
  } | null;
  updatedAt: string;
};

const COMPLETE_PROFILE_KEY = 'serfes-athlete-profile-complete';
const LEGACY_PROFILE_KEY = 'serfes-athlete-profile-final';
const SEX_KEY = 'serfes-athlete-sex';
const STUDENT_DOCUMENT_KEY = 'serfes-student-document';
const SCHOOL_DOCUMENT_KEY = 'serfes-school-document';
const DATA_VIEW_CLASS = 'serfes-data-view-open';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // O armazenamento local é apenas apoio ao protótipo.
  }
}

function readText(key: string) {
  try {
    return text(localStorage.getItem(key));
  } catch {
    return '';
  }
}

function labelControl(form: HTMLFormElement, labelStart: string) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    text(item.firstChild?.textContent).startsWith(labelStart),
  );
  return label?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select') ?? null;
}

function controlValue(form: HTMLFormElement, labelStart: string) {
  return text(labelControl(form, labelStart)?.value);
}

function selectedText(form: HTMLFormElement, labelStart: string) {
  const control = labelControl(form, labelStart);
  if (control instanceof HTMLSelectElement) {
    return text(control.selectedOptions[0]?.textContent) || text(control.value);
  }
  return text(control?.value);
}

function fileName(form: HTMLFormElement, labelStart: string) {
  const control = labelControl(form, labelStart);
  return control instanceof HTMLInputElement && control.type === 'file'
    ? text(control.files?.[0]?.name)
    : '';
}

function captureSnapshot(form: HTMLFormElement): CompleteSnapshot {
  const responsibleName = controlValue(form, 'Nome completo');
  const allNameLabels = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).filter((item) =>
    text(item.firstChild?.textContent).startsWith('Nome completo'),
  );
  const athleteName = text(allNameLabels[0]?.querySelector<HTMLInputElement>('input')?.value);
  const legalName = text(allNameLabels[1]?.querySelector<HTMLInputElement>('input')?.value);

  const responsibleSection = Array.from(form.querySelectorAll<HTMLElement>('.form-section')).find((section) =>
    text(section.querySelector('.form-section-title h4')?.textContent) === 'Responsável legal',
  );

  const responsibleControl = (labelStart: string) => {
    const label = Array.from(responsibleSection?.querySelectorAll<HTMLLabelElement>('label') ?? []).find((item) =>
      text(item.firstChild?.textContent).startsWith(labelStart),
    );
    return label?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select') ?? null;
  };

  const responsibleValue = (labelStart: string) => text(responsibleControl(labelStart)?.value);
  const responsibleFile = (labelStart: string) => {
    const control = responsibleControl(labelStart);
    return control instanceof HTMLInputElement && control.type === 'file' ? text(control.files?.[0]?.name) : '';
  };

  const sex = text(form.querySelector<HTMLInputElement>('input[name="serfes-athlete-sex"]:checked')?.value) || readText(SEX_KEY);
  const course = selectedText(form, 'Curso');
  const enrollment = selectedText(form, 'Está matriculado em instituição de ensino?');

  return {
    identification: {
      name: athleteName || responsibleName,
      sex,
      birthDate: controlValue(form, 'Data de nascimento'),
      cpf: controlValue(form, 'CPF'),
      email: controlValue(form, 'E-mail'),
      phone: controlValue(form, 'Telefone'),
      municipality: selectedText(form, 'Município'),
      uf: selectedText(form, 'UF') || 'PR',
    },
    sports: {
      nickname: controlValue(form, 'Nickname'),
      game: selectedText(form, 'Modalidade principal'),
    },
    school: {
      enrollment,
      municipality: selectedText(form, 'Município da instituição'),
      network: selectedText(form, 'Rede de ensino'),
      level: selectedText(form, 'Nível de ensino'),
      institution: selectedText(form, 'Instituição de ensino superior') || selectedText(form, 'Escola'),
      schoolYear: selectedText(form, 'Ano escolar'),
      course,
    },
    responsible: responsibleSection ? {
      name: legalName,
      capacity: text(responsibleControl('Qualificação') instanceof HTMLSelectElement
        ? (responsibleControl('Qualificação') as HTMLSelectElement).selectedOptions[0]?.textContent
        : responsibleValue('Qualificação')),
      cpf: responsibleValue('CPF'),
      email: responsibleValue('E-mail'),
      phone: responsibleValue('Telefone'),
      proofDocument: responsibleFile('Documento comprobatório da responsabilidade legal'),
    } : null,
    updatedAt: new Date().toISOString(),
  };
}

function successfulSubmitFinished(form: HTMLFormElement) {
  const formClosed = !document.documentElement.contains(form) || !document.querySelector('form.athlete-form');
  const returnedHome = Boolean(document.querySelector('.athlete-home-actions'));
  return formClosed && returnedHome;
}

function formatDate(value: string) {
  if (!value) return 'Não informado';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatDateTime(value: string) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function maskCpf(value: string) {
  return value ? '***.***.***-**' : 'Não informado';
}

function fallbackSnapshot(): CompleteSnapshot | null {
  const legacy = readJson<LegacySnapshot>(LEGACY_PROFILE_KEY);
  if (!legacy) return null;

  return {
    identification: {
      name: text(legacy.name),
      sex: readText(SEX_KEY),
      birthDate: text(legacy.birthDate),
      cpf: text(legacy.cpf),
      email: '',
      phone: '',
      municipality: text(legacy.municipality),
      uf: 'PR',
    },
    sports: { nickname: '', game: '' },
    school: {
      enrollment: legacy.institution ? 'Sim' : '',
      municipality: '',
      network: '',
      level: '',
      institution: text(legacy.institution),
      schoolYear: '',
      course: '',
    },
    responsible: null,
    updatedAt: text(legacy.updatedAt),
  };
}

function currentSnapshot() {
  return readJson<CompleteSnapshot>(COMPLETE_PROFILE_KEY) ?? fallbackSnapshot();
}

type Row = { label: string; value: string; className?: string };

function createRow(row: Row) {
  const wrapper = document.createElement('div');
  wrapper.className = `final-account-row${row.className ? ` ${row.className}` : ''}`;

  const label = document.createElement('span');
  label.textContent = row.label;

  const value = document.createElement('strong');
  value.textContent = row.value || 'Não informado';

  wrapper.append(label, value);
  return wrapper;
}

function createSection(titleText: string, rows: Row[]) {
  const section = document.createElement('section');
  section.className = 'serfes-complete-readonly-section';

  const title = document.createElement('h4');
  title.textContent = titleText;

  const grid = document.createElement('div');
  grid.className = 'final-account-grid serfes-complete-data-grid';
  rows.forEach((row) => grid.append(createRow(row)));

  section.append(title, grid);
  return section;
}

function documentLabel(document: StoredDocument | null, notRequired = false) {
  if (document?.name) return document.name;
  return notRequired ? 'Não exigido' : 'Não anexado';
}

function openEditForm() {
  document.querySelector<HTMLElement>('.serfes-athlete-data-view')?.remove();
  document.querySelectorAll<HTMLElement>(`.${DATA_VIEW_CLASS}`).forEach((element) => element.classList.remove(DATA_VIEW_CLASS));

  const cadastro = Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item')).find(
    (button) => text(button.textContent) === 'Meu cadastro',
  );
  cadastro?.click();
}

function renderCompleteDataView() {
  const view = document.querySelector<HTMLElement>('.serfes-athlete-data-view');
  const card = view?.querySelector<HTMLElement>('.serfes-readonly-card');
  const snapshot = currentSnapshot();
  if (!view || !card || !snapshot) return;

  const renderKey = `${snapshot.updatedAt}:${snapshot.identification.name}:${snapshot.identification.sex}`;
  if (card.dataset.completeRenderKey === renderKey) return;
  card.dataset.completeRenderKey = renderKey;

  const identification = createSection('Identificação', [
    { label: 'Nome completo', value: snapshot.identification.name },
    { label: 'Sexo', value: snapshot.identification.sex, className: 'serfes-sex-readonly-row' },
    { label: 'Data de nascimento', value: formatDate(snapshot.identification.birthDate) },
    { label: 'CPF', value: maskCpf(snapshot.identification.cpf) },
    { label: 'E-mail', value: snapshot.identification.email },
    { label: 'Telefone', value: snapshot.identification.phone },
    { label: 'Município', value: snapshot.identification.municipality },
    { label: 'UF', value: snapshot.identification.uf || 'PR' },
  ]);

  const sports = createSection('Perfil esportivo', [
    { label: 'Nickname', value: snapshot.sports.nickname },
    { label: 'Modalidade principal', value: snapshot.sports.game },
  ]);

  const schoolRows: Row[] = [
    { label: 'Matriculado em instituição de ensino', value: snapshot.school.enrollment },
  ];

  if (snapshot.school.enrollment !== 'Não') {
    schoolRows.push(
      { label: 'Município da instituição', value: snapshot.school.municipality },
      { label: 'Rede de ensino', value: snapshot.school.network },
      { label: 'Nível de ensino', value: snapshot.school.level },
      { label: snapshot.school.level === 'Ensino superior' ? 'Instituição de ensino superior' : 'Escola', value: snapshot.school.institution },
    );
    if (snapshot.school.schoolYear) schoolRows.push({ label: 'Ano escolar', value: snapshot.school.schoolYear });
    if (snapshot.school.course) schoolRows.push({ label: 'Curso', value: snapshot.school.course });
  }

  const school = createSection('Vínculo escolar', schoolRows);

  const sections: HTMLElement[] = [identification, sports, school];

  if (snapshot.responsible) {
    const responsibleRows: Row[] = [
      { label: 'Nome completo', value: snapshot.responsible.name },
      { label: 'Qualificação', value: snapshot.responsible.capacity },
      { label: 'CPF', value: maskCpf(snapshot.responsible.cpf) },
      { label: 'E-mail', value: snapshot.responsible.email },
      { label: 'Telefone', value: snapshot.responsible.phone },
    ];
    if (snapshot.responsible.proofDocument) {
      responsibleRows.push({ label: 'Documento comprobatório', value: snapshot.responsible.proofDocument });
    }
    sections.push(createSection('Responsável legal', responsibleRows));
  }

  const studentDocument = readJson<StoredDocument>(STUDENT_DOCUMENT_KEY);
  const schoolDocument = readJson<StoredDocument>(SCHOOL_DOCUMENT_KEY);
  const schoolNotRequired = snapshot.school.enrollment === 'Não';
  sections.push(createSection('Documentos', [
    { label: 'Documento de identificação do aluno', value: documentLabel(studentDocument) },
    { label: 'Comprovante de vínculo escolar', value: documentLabel(schoolDocument, schoolNotRequired) },
  ]));

  const meta = document.createElement('p');
  meta.className = 'serfes-readonly-updated';
  meta.textContent = `Última atualização: ${formatDateTime(snapshot.updatedAt)}`;

  const actions = document.createElement('div');
  actions.className = 'form-actions serfes-readonly-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'primary-button';
  edit.textContent = 'Alterar cadastro';
  edit.addEventListener('click', openEditForm);
  actions.append(edit);

  card.replaceChildren(...sections, meta, actions);
}

function injectStyles() {
  if (document.getElementById('serfes-complete-data-view-styles')) return;

  const style = document.createElement('style');
  style.id = 'serfes-complete-data-view-styles';
  style.textContent = `
    .serfes-readonly-card {
      display: grid;
      gap: 1.15rem;
    }

    .serfes-complete-readonly-section {
      display: grid;
      gap: .8rem;
      padding: 1rem 1.05rem;
      border: 1px solid #d8e5ef;
      border-radius: 16px;
      background: #fbfdff;
    }

    .serfes-complete-readonly-section h4 {
      margin: 0;
      color: #143b63;
      font-size: 1rem;
    }

    .serfes-complete-data-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: .7rem .9rem;
    }

    .serfes-complete-data-grid .final-account-row {
      min-width: 0;
      padding: .72rem .78rem;
      border: 1px solid #e0eaf2;
      border-radius: 12px;
      background: #fff;
    }

    .serfes-complete-data-grid .final-account-row span {
      display: block;
      margin-bottom: .2rem;
      color: #61758d;
      font-size: .74rem;
      font-weight: 700;
    }

    .serfes-complete-data-grid .final-account-row strong {
      display: block;
      overflow-wrap: anywhere;
      color: #17304d;
      font-size: .9rem;
    }

    .serfes-readonly-updated {
      margin: 0;
      color: #61758d;
      font-size: .8rem;
      text-align: right;
    }

    @media (max-width: 680px) {
      .serfes-complete-data-grid {
        grid-template-columns: 1fr;
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
    renderCompleteDataView();
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;

    const snapshot = captureSnapshot(form);
    window.setTimeout(() => {
      if (successfulSubmitFinished(form)) saveJson(COMPLETE_PROFILE_KEY, snapshot);
      schedule();
    }, 450);
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);
  window.addEventListener('storage', (event) => {
    if ([COMPLETE_PROFILE_KEY, LEGACY_PROFILE_KEY, SEX_KEY, STUDENT_DOCUMENT_KEY, SCHOOL_DOCUMENT_KEY].includes(event.key ?? '')) schedule();
  });

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
