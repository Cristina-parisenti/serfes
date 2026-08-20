export {};

type AthleteSnapshot = {
  name: string;
  cpf: string;
  birthDate: string;
  institution: string;
  municipality: string;
  updatedAt: string;
};

type StoredDocument = {
  name: string;
  type: string;
  size: number;
  updatedAt: string;
};

const PROFILE_KEY = 'serfes-athlete-profile-final';
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

function navButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item')).find(
    (button) => text(button.textContent) === label,
  ) ?? null;
}

function openForm() {
  closeDataView();
  navButton('Meu cadastro')?.click();
}

function sectionByHeading(form: HTMLFormElement, heading: string) {
  return Array.from(form.querySelectorAll<HTMLElement>('.form-section')).find((section) =>
    text(section.querySelector('.form-section-title h4')?.textContent) === heading,
  ) ?? null;
}

function selectByLabel(form: HTMLFormElement, labelStart: string) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    text(item.firstChild?.textContent).startsWith(labelStart),
  );
  return label?.querySelector<HTMLSelectElement>('select') ?? null;
}

function enrollmentIsActive(form: HTMLFormElement) {
  return selectByLabel(form, 'Está matriculado em instituição de ensino?')?.value !== 'Não';
}

function storedDocument(key: string) {
  return readJson<StoredDocument>(key);
}

function documentStatusText(key: string, selected?: File | null) {
  if (selected) return `Arquivo selecionado: ${selected.name}`;
  const stored = storedDocument(key);
  return stored ? `Documento já anexado: ${stored.name}` : 'Nenhum arquivo selecionado.';
}

function createUploadItem(
  sourceIcon: SVGElement | null,
  title: string,
  storageKey: string,
  kind: 'student' | 'school',
) {
  const wrapper = document.createElement('label');
  wrapper.className = 'document-item serfes-document-upload';
  wrapper.dataset.documentKind = kind;

  const icon = sourceIcon?.cloneNode(true);
  if (icon instanceof SVGElement) wrapper.append(icon);

  const copy = document.createElement('div');
  copy.className = 'serfes-document-upload-copy';

  const strong = document.createElement('strong');
  strong.textContent = title;

  const status = document.createElement('span');
  status.className = 'serfes-document-status';
  status.textContent = documentStatusText(storageKey);

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.jpg,.jpeg,.png';
  input.dataset.documentStorageKey = storageKey;
  input.setAttribute('aria-label', title);

  const hint = document.createElement('small');
  hint.className = 'field-help';
  hint.textContent = 'Formatos aceitos: PDF, JPG, JPEG ou PNG.';

  const error = document.createElement('small');
  error.className = 'field-error serfes-document-error';
  error.hidden = true;

  input.addEventListener('change', () => {
    input.setCustomValidity('');
    input.classList.remove('invalid');
    error.hidden = true;
    status.textContent = documentStatusText(storageKey, input.files?.[0] ?? null);
  });

  copy.append(strong, status, input, hint, error);
  wrapper.append(copy);
  return wrapper;
}

function refreshDocumentRequirements(form: HTMLFormElement) {
  const studentInput = form.querySelector<HTMLInputElement>('input[data-document-storage-key="serfes-student-document"]');
  const schoolInput = form.querySelector<HTMLInputElement>('input[data-document-storage-key="serfes-school-document"]');
  const schoolWrapper = schoolInput?.closest<HTMLElement>('.serfes-document-upload');
  const activeEnrollment = enrollmentIsActive(form);

  if (studentInput) {
    studentInput.required = !storedDocument(STUDENT_DOCUMENT_KEY);
  }

  if (schoolInput) {
    schoolInput.disabled = !activeEnrollment;
    schoolInput.required = activeEnrollment && !storedDocument(SCHOOL_DOCUMENT_KEY);
    schoolWrapper?.classList.toggle('disabled', !activeEnrollment);
    const status = schoolWrapper?.querySelector<HTMLElement>('.serfes-document-status');
    if (!activeEnrollment && status) status.textContent = 'Não exigido enquanto não houver vínculo escolar informado.';
    if (activeEnrollment && status && !schoolInput.files?.[0]) status.textContent = documentStatusText(SCHOOL_DOCUMENT_KEY);
  }
}

function injectDocumentUploads() {
  const form = document.querySelector<HTMLFormElement>('form.athlete-form');
  if (!form) return;

  const section = sectionByHeading(form, 'Documentos');
  const grid = section?.querySelector<HTMLElement>('.document-grid');
  if (!section || !grid) return;

  const sectionDescription = section.querySelector<HTMLElement>('.form-section-title p');
  if (sectionDescription) sectionDescription.textContent = 'Anexe os documentos necessários para conferência e validação do cadastro.';

  if (!grid.dataset.uploadsReady) {
    const sourceIcon = grid.querySelector<SVGElement>('svg');
    grid.replaceChildren(
      createUploadItem(sourceIcon, 'Documento de identificação do aluno', STUDENT_DOCUMENT_KEY, 'student'),
      createUploadItem(sourceIcon, 'Comprovante de vínculo escolar', SCHOOL_DOCUMENT_KEY, 'school'),
    );
    grid.dataset.uploadsReady = 'true';
  }

  refreshDocumentRequirements(form);
}

function showUploadError(input: HTMLInputElement, message: string) {
  const wrapper = input.closest<HTMLElement>('.serfes-document-upload');
  const error = wrapper?.querySelector<HTMLElement>('.serfes-document-error');
  input.setCustomValidity(message);
  input.classList.add('invalid');
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
}

function clearUploadError(input: HTMLInputElement) {
  const wrapper = input.closest<HTMLElement>('.serfes-document-upload');
  const error = wrapper?.querySelector<HTMLElement>('.serfes-document-error');
  input.setCustomValidity('');
  input.classList.remove('invalid');
  if (error) error.hidden = true;
}

function validateDocuments(form: HTMLFormElement) {
  const studentInput = form.querySelector<HTMLInputElement>(`input[data-document-storage-key="${STUDENT_DOCUMENT_KEY}"]`);
  const schoolInput = form.querySelector<HTMLInputElement>(`input[data-document-storage-key="${SCHOOL_DOCUMENT_KEY}"]`);
  let valid = true;

  if (studentInput) {
    const hasStudentDocument = Boolean(studentInput.files?.[0] || storedDocument(STUDENT_DOCUMENT_KEY));
    if (!hasStudentDocument) {
      showUploadError(studentInput, 'Anexe o documento de identificação do aluno antes de concluir o cadastro.');
      valid = false;
    } else {
      clearUploadError(studentInput);
    }
  }

  if (schoolInput) {
    const schoolRequired = enrollmentIsActive(form);
    const hasSchoolDocument = Boolean(schoolInput.files?.[0] || storedDocument(SCHOOL_DOCUMENT_KEY));
    if (schoolRequired && !hasSchoolDocument) {
      showUploadError(schoolInput, 'Anexe o comprovante de vínculo escolar antes de concluir o cadastro.');
      valid = false;
    } else {
      clearUploadError(schoolInput);
    }
  }

  return valid;
}

function fileSnapshot(file: File): StoredDocument {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    updatedAt: new Date().toISOString(),
  };
}

function captureNewDocuments(form: HTMLFormElement) {
  const student = form.querySelector<HTMLInputElement>(`input[data-document-storage-key="${STUDENT_DOCUMENT_KEY}"]`)?.files?.[0] ?? null;
  const school = form.querySelector<HTMLInputElement>(`input[data-document-storage-key="${SCHOOL_DOCUMENT_KEY}"]`)?.files?.[0] ?? null;
  return { student, school };
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

function addReadonlyRow(container: HTMLElement, label: string, value: string) {
  const row = document.createElement('div');
  row.className = 'final-account-row';

  const key = document.createElement('span');
  key.textContent = label;

  const data = document.createElement('strong');
  data.textContent = value || 'Não informado';

  row.append(key, data);
  container.append(row);
}

function setHomeHidden(hidden: boolean) {
  const selectors = [
    '.athlete-home-hero',
    '.athlete-home-actions',
    '.athlete-home-privacy',
    '.final-next-competition',
    '.final-annual-banner',
    '.athlete-next-step-notice',
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.classList.toggle(DATA_VIEW_CLASS, hidden);
    });
  });
}

function closeDataView() {
  document.querySelector<HTMLElement>('.serfes-athlete-data-view')?.remove();
  setHomeHidden(false);
}

function openDataView() {
  const snapshot = readJson<AthleteSnapshot>(PROFILE_KEY);
  const dashboard = document.querySelector<HTMLElement>('.dashboard-content');
  if (!snapshot || !dashboard) return;

  closeDataView();
  setHomeHidden(true);

  const view = document.createElement('section');
  view.className = 'serfes-athlete-data-view';

  const toolbar = document.createElement('section');
  toolbar.className = 'section-toolbar form-heading';

  const heading = document.createElement('div');
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'back-link';
  back.textContent = '← Voltar';
  back.addEventListener('click', closeDataView);

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Cadastro do atleta';

  const title = document.createElement('h3');
  title.textContent = 'Meus dados cadastrais';

  const description = document.createElement('p');
  description.className = 'muted';
  description.textContent = 'As informações abaixo são apenas para consulta. Para modificar algum item, utilize o botão Alterar cadastro.';

  heading.append(back, eyebrow, title, description);
  toolbar.append(heading);

  const card = document.createElement('section');
  card.className = 'glass-card serfes-readonly-card';

  const grid = document.createElement('div');
  grid.className = 'final-account-grid';
  addReadonlyRow(grid, 'Nome', snapshot.name);
  addReadonlyRow(grid, 'CPF', maskCpf(snapshot.cpf));
  addReadonlyRow(grid, 'Data de nascimento', formatDate(snapshot.birthDate));
  addReadonlyRow(grid, 'Instituição de ensino', snapshot.institution);
  addReadonlyRow(grid, 'Município', snapshot.municipality);
  addReadonlyRow(grid, 'Última atualização', formatUpdatedAt(snapshot.updatedAt));

  const documents = document.createElement('div');
  documents.className = 'serfes-readonly-documents';
  const documentsTitle = document.createElement('h4');
  documentsTitle.textContent = 'Documentos';
  const studentDoc = storedDocument(STUDENT_DOCUMENT_KEY);
  const schoolDoc = storedDocument(SCHOOL_DOCUMENT_KEY);
  const studentRow = document.createElement('p');
  studentRow.textContent = `Documento do aluno: ${studentDoc?.name ?? 'não anexado'}`;
  const schoolRow = document.createElement('p');
  schoolRow.textContent = `Comprovante de vínculo escolar: ${schoolDoc?.name ?? 'não anexado'}`;
  documents.append(documentsTitle, studentRow, schoolRow);

  const actions = document.createElement('div');
  actions.className = 'form-actions serfes-readonly-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'primary-button';
  edit.textContent = 'Alterar cadastro';
  edit.addEventListener('click', openForm);
  actions.append(edit);

  card.append(grid, documents, actions);
  view.append(toolbar, card);
  dashboard.prepend(view);
}

function enhanceSavedCard() {
  const card = document.querySelector<HTMLElement>('.athlete-home-primary-card[data-final-card="saved"]');
  if (!card || card.dataset.registrationFlowCard === 'ready') return;
  if (!readJson<AthleteSnapshot>(PROFILE_KEY)) return;

  card.dataset.registrationFlowCard = 'ready';
  card.classList.add('serfes-data-card');
  card.replaceChildren();
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', 'Meus dados cadastrais');

  const icon = document.createElement('span');
  icon.className = 'athlete-home-card-icon';
  icon.textContent = '👤';

  const copy = document.createElement('span');
  copy.className = 'athlete-card-copy';

  const title = document.createElement('strong');
  title.textContent = 'Meus dados cadastrais';

  const description = document.createElement('small');
  description.textContent = 'Consulte as informações registradas no SERFES.';

  copy.append(title, description);
  card.append(icon, copy);

  const activate = () => openDataView();
  card.onclick = activate;
  card.onkeydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  };
}

function injectStyles() {
  if (document.getElementById('serfes-registration-flow-styles')) return;

  const style = document.createElement('style');
  style.id = 'serfes-registration-flow-styles';
  style.textContent = `
    .${DATA_VIEW_CLASS} { display: none !important; }
    .serfes-data-card {
      cursor: pointer;
      display: grid !important;
      grid-template-columns: auto 1fr !important;
      align-items: center !important;
      gap: 1rem !important;
    }
    .serfes-data-card:hover {
      transform: translateY(-2px);
      border-color: #b8d4e9;
      box-shadow: 0 12px 26px rgba(20,59,99,.09);
    }
    .serfes-data-card .athlete-card-copy { display: grid; gap: .3rem; }
    .serfes-data-card .athlete-card-copy strong { color: #143b63; font-size: 1.05rem; }
    .serfes-data-card .athlete-card-copy small { color: #61758d; line-height: 1.45; }
    .serfes-document-upload {
      align-items: flex-start !important;
      cursor: default;
    }
    .serfes-document-upload-copy {
      display: grid;
      gap: .45rem;
      width: 100%;
    }
    .serfes-document-upload input[type="file"] {
      width: 100%;
      font-size: .84rem;
    }
    .serfes-document-upload.disabled { opacity: .62; }
    .serfes-document-status { color: #61758d; font-size: .82rem; }
    .serfes-athlete-data-view { display: grid; gap: 1rem; }
    .serfes-readonly-card { display: grid; gap: 1.2rem; }
    .serfes-readonly-documents {
      padding-top: 1rem;
      border-top: 1px solid #e1eaf2;
    }
    .serfes-readonly-documents h4 { margin: 0 0 .65rem; color: #143b63; }
    .serfes-readonly-documents p { margin: .3rem 0; color: #61758d; }
    .serfes-readonly-actions { justify-content: flex-start; }
    @media (max-width: 680px) {
      .serfes-data-card { grid-template-columns: auto 1fr !important; }
      .serfes-readonly-actions .primary-button { width: 100%; justify-content: center; }
    }
  `;
  document.head.append(style);
}

function applyEnhancements() {
  injectStyles();
  injectDocumentUploads();
  enhanceSavedCard();

  if (document.querySelector('form.athlete-form')) {
    closeDataView();
  }
}

let scheduled = false;
function scheduleEnhancements() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyEnhancements();
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('change', (event) => {
    const form = event.target instanceof Element ? event.target.closest<HTMLFormElement>('form.athlete-form') : null;
    if (form) window.requestAnimationFrame(() => refreshDocumentRequirements(form));
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;

    refreshDocumentRequirements(form);
    const documentsValid = validateDocuments(form);
    const nativeValid = form.checkValidity();

    if (!documentsValid || !nativeValid) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const firstInvalid = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(':invalid');
      firstInvalid?.focus();
      firstInvalid?.reportValidity();
      return;
    }

    const nextDocuments = captureNewDocuments(form);
    window.setTimeout(() => {
      if (!document.querySelector('.athlete-home-actions')) return;
      if (nextDocuments.student) saveJson(STUDENT_DOCUMENT_KEY, fileSnapshot(nextDocuments.student));
      if (nextDocuments.school) saveJson(SCHOOL_DOCUMENT_KEY, fileSnapshot(nextDocuments.school));
      scheduleEnhancements();
    }, 180);
  }, true);

  window.addEventListener('DOMContentLoaded', scheduleEnhancements, { once: true });
  window.addEventListener('focus', scheduleEnhancements);

  const observer = new MutationObserver(scheduleEnhancements);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
