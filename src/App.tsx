import { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileSignature,
  FileText,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Plus,
  Printer,
  School,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import './authorization.css';
import './competition.css';
import './gameEligibility.css';
import './validation.css';
import {
  ClassindRatingsPayload,
  GAME_CATALOG,
  classificationLabel,
  classificationMinimumAge,
  getClassindRecord,
  getGameCatalogEntry,
  isClassindRecordFresh,
} from './gameCatalog';
import {
  formatCpf,
  formatPhone,
  isValidCpf,
  isValidEmail,
  isValidPhone,
  nicknameHasBlockedContent,
} from './formValidation';
import {
  EducationLevel,
  HigherEducationPayload,
  SCHOOL_NETWORK_FILES,
  SCHOOL_NETWORKS,
  SchoolDirectoryPayload,
  SchoolNetwork,
  educationLevelsForAge,
  higherEducationCourseLabel,
  normalizeEducationText,
  schoolYearsForLevel,
} from './educationCatalog';

const modules = [
  ['Competições', 'Gestão de inscrições, calendários, chaves, resultados e homologação.', Trophy],
  ['Atletas', 'Cadastro, documentos, vínculos e histórico competitivo.', Users],
  ['Escolas', 'Validação institucional e acompanhamento de estudantes.', School],
  ['Integridade', 'Prevenção, apoio, denúncias e orientações do sistema.', ShieldCheck],
  ['Calendário', 'Organização de eventos, prazos e etapas competitivas.', CalendarDays],
  ['Indicadores', 'Painéis com dados para monitoramento e tomada de decisão.', BarChart3],
] as const;

const profiles = [
  'Administrador estadual',
  'Gestor municipal',
  'Atleta',
  'Responsável legal',
  'Instituição de ensino',
  'Organizador de competição',
  'Equipe ou entidade esportiva',
  'Árbitro ou profissional habilitado',
];

const athleteRows = [
  { name: 'Atleta Alpha', nick: 'ALPHA01', game: 'Valorant', city: 'Curitiba', school: 'Vínculo confirmado', status: 'Validado', tone: 'green' },
  { name: 'Jogadora Beta', nick: 'BETA.GG', game: 'League of Legends', city: 'Londrina', school: 'Em análise', status: 'Pendente', tone: 'yellow' },
  { name: 'Atleta Gamma', nick: 'GAMMA7', game: 'EA Sports FC', city: 'Maringá', school: 'Não informado', status: 'Aguardando responsável', tone: 'red' },
] as const;

const competitions = [
  {
    id: 'jogos-escolares-2026',
    name: 'Jogos Eletrônicos Escolares do Paraná 2026',
    game: 'EA FC',
    officialGameTitle: 'EA Sports FC 26',
    period: '10 a 12 de outubro de 2026',
    location: 'Curitiba/PR',
    organizer: 'Secretaria de Esportes do Estado do Paraná',
    partner: 'Instituição parceira demonstrativa',
    category: 'Escolar',
    status: 'Inscrições abertas',
  },
  {
    id: 'copa-fortnite-2026',
    name: 'Copa Paraná de Fortnite Escolar',
    game: 'Fortnite',
    officialGameTitle: 'Fortnite',
    period: '7 e 8 de novembro de 2026',
    location: 'Londrina/PR',
    organizer: 'Secretaria de Esportes do Estado do Paraná',
    partner: 'Instituição parceira demonstrativa',
    category: 'Escolar',
    status: 'Inscrições abertas',
  },
  {
    id: 'circuito-lol-2026',
    name: 'Circuito Estadual Escolar de League of Legends',
    game: 'League of Legends',
    officialGameTitle: 'League of Legends',
    period: '21 e 22 de novembro de 2026',
    location: 'Maringá/PR',
    organizer: 'Secretaria de Esportes do Estado do Paraná',
    partner: 'Instituição parceira demonstrativa',
    category: 'Escolar',
    status: 'Inscrições abertas',
  },
] as const;

type DashboardSection =
  | 'overview'
  | 'athleteHome'
  | 'athletes'
  | 'athleteForm'
  | 'athleteCompetitions'
  | 'competitionAuthorization';

type Municipality = { id: number; nome: string };
type RegistrationStatus = 'Aguardando assinatura' | 'Inscrição enviada';

function EsportsSymbol() {
  return (
    <div className="esports-symbol" aria-hidden="true">
      <div className="esports-symbol-inner"><Gamepad2 size={23} /></div>
    </div>
  );
}

function calculateAge(birthDate: string, referenceDate = new Date()): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime()) || birth > referenceDate) return null;

  let age = referenceDate.getFullYear() - year;
  const birthdayHasNotOccurred =
    referenceDate.getMonth() + 1 < month ||
    (referenceDate.getMonth() + 1 === month && referenceDate.getDate() < day);

  if (birthdayHasNotOccurred) age -= 1;
  return age;
}

function formatInputDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
}

function currentDateLong() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function App() {
  const [view, setView] = useState<'home' | 'login' | 'dashboard'>('home');
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('overview');
  const [profile, setProfile] = useState(profiles[0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [athleteSaved, setAthleteSaved] = useState(false);
  const [formAttempted, setFormAttempted] = useState(false);
  const [ageReferenceDate, setAgeReferenceDate] = useState(() => new Date());

  const [athleteName, setAthleteName] = useState('');
  const [athleteBirthDate, setAthleteBirthDate] = useState('');
  const [athleteCpf, setAthleteCpf] = useState('');
  const [athleteEmail, setAthleteEmail] = useState('');
  const [athletePhone, setAthletePhone] = useState('');
  const [athleteMunicipality, setAthleteMunicipality] = useState('');
  const [athleteInstitution, setAthleteInstitution] = useState('');
  const [athleteNickname, setAthleteNickname] = useState('');
  const [athleteGame, setAthleteGame] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState('Sim');
  const [schoolMunicipality, setSchoolMunicipality] = useState('');
  const [schoolNetwork, setSchoolNetwork] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [higherEducationCourse, setHigherEducationCourse] = useState('');
  const [schoolAnnualConfirmation, setSchoolAnnualConfirmation] = useState(false);
  const [schoolConfirmedYear, setSchoolConfirmedYear] = useState<number | null>(null);

  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleLegalCapacity, setResponsibleLegalCapacity] = useState('');
  const [responsibleProofDocument, setResponsibleProofDocument] = useState<File | null>(null);
  const [responsibleCpf, setResponsibleCpf] = useState('');
  const [responsibleEmail, setResponsibleEmail] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');

  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [municipalitiesError, setMunicipalitiesError] = useState(false);
  const [schoolDirectory, setSchoolDirectory] = useState<SchoolDirectoryPayload | null>(null);
  const [schoolDirectoryError, setSchoolDirectoryError] = useState(false);
  const [higherEducation, setHigherEducation] = useState<HigherEducationPayload | null>(null);
  const [higherEducationError, setHigherEducationError] = useState(false);

  const [registrations, setRegistrations] = useState<Record<string, RegistrationStatus>>({});
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [classindRatings, setClassindRatings] = useState<ClassindRatingsPayload | null>(null);
  const [classindRatingsError, setClassindRatingsError] = useState(false);

  const isAthlete = profile === 'Atleta';
  const isStateAdmin = profile === 'Administrador estadual';
  const athleteAge = calculateAge(athleteBirthDate, ageReferenceDate);
  const athleteTooYoung = athleteAge !== null && athleteAge < 12;
  const minorStatus = athleteAge === null ? null : athleteAge < 18;
  const schoolReferenceYear = ageReferenceDate.getFullYear();
  const schoolConfirmationCurrent = enrollmentStatus !== 'Sim' || schoolConfirmedYear === schoolReferenceYear;
  const selectedCompetition = competitions.find((competition) => competition.id === selectedCompetitionId) ?? null;
  const authorizationDate = currentDateLong();
  const selectedGameCatalog = getGameCatalogEntry(athleteGame);
  const selectedGameClassind = selectedGameCatalog ? getClassindRecord(classindRatings, selectedGameCatalog.id) : null;
  const selectedGameMinimumAge = classificationMinimumAge(selectedGameClassind?.classification ?? null);
  const selectedGameFresh = isClassindRecordFresh(selectedGameClassind);
  const selectedGameNeedsExactVersion = selectedGameCatalog?.requiresExactVersion ?? false;
  const selectedGameVerified = !selectedGameNeedsExactVersion && selectedGameClassind?.status === 'verified' && selectedGameMinimumAge !== null && selectedGameFresh;
  const gameAgeBlocked = selectedGameVerified && athleteAge !== null && athleteAge < selectedGameMinimumAge;

  const availableEducationLevels = educationLevelsForAge(athleteAge);
  const availableSchoolYears = schoolYearsForLevel(schoolLevel as EducationLevel | '');
  const normalizedSchoolMunicipality = normalizeEducationText(schoolMunicipality);
  const basicInstitutionOptions = (schoolDirectory?.records ?? [])
    .filter((record) => record.network === schoolNetwork && normalizeEducationText(record.municipality) === normalizedSchoolMunicipality)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const higherInstitutionOptions = (higherEducation?.institutions ?? [])
    .filter((record) => record.network === schoolNetwork && normalizeEducationText(record.municipality) === normalizedSchoolMunicipality)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const institutionOptions = schoolLevel === 'Ensino superior' ? higherInstitutionOptions : basicInstitutionOptions;
  const selectedHigherInstitution = schoolLevel === 'Ensino superior'
    ? higherInstitutionOptions.find((institution) => institution.name === athleteInstitution) ?? null
    : null;
  const higherCourseOptions = (higherEducation?.courses ?? [])
    .filter((course) => selectedHigherInstitution !== null && course.institutionId === selectedHigherInstitution.id)
    .sort((a, b) => higherEducationCourseLabel(a).localeCompare(higherEducationCourseLabel(b), 'pt-BR'));
  const institutionCatalogReady = schoolLevel === 'Ensino superior'
    ? (higherEducation?.institutions.length ?? 0) > 0
    : (schoolDirectory?.records.length ?? 0) > 0;

  const nicknameBlocked = athleteNickname.length > 0 && nicknameHasBlockedContent(athleteNickname);
  const athleteCpfInvalid = athleteCpf.length > 0 && !isValidCpf(athleteCpf);
  const athleteEmailInvalid = athleteEmail.length > 0 && !isValidEmail(athleteEmail);
  const athletePhoneInvalid = athletePhone.length > 0 && !isValidPhone(athletePhone);
  const responsibleNeedsProof = ['Tutor(a)', 'Guardião(ã)'].includes(responsibleLegalCapacity);
  const responsibleCapacityLabel = responsibleLegalCapacity;
  const responsibleCpfInvalid = responsibleCpf.length > 0 && !isValidCpf(responsibleCpf);
  const responsibleEmailInvalid = responsibleEmail.length > 0 && !isValidEmail(responsibleEmail);
  const responsiblePhoneInvalid = responsiblePhone.length > 0 && !isValidPhone(responsiblePhone);

  useEffect(() => {
    let active = true;
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/41/municipios?orderBy=nome')
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar os municípios.');
        return response.json() as Promise<Municipality[]>;
      })
      .then((data) => {
        if (active) setMunicipalities(data.map((item) => item.nome));
      })
      .catch(() => {
        if (active) setMunicipalitiesError(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const basePath = window.location.pathname.startsWith('/serfes') ? '/serfes/' : '/';

    fetch(`${basePath}higher-education.json`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar o catálogo do ensino superior.');
        return response.json() as Promise<HigherEducationPayload>;
      })
      .then((data) => {
        if (active) {
          setHigherEducation(data);
          setHigherEducationError(false);
        }
      })
      .catch(() => {
        if (active) setHigherEducationError(true);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    if (!schoolNetwork || schoolLevel === 'Ensino superior') {
      setSchoolDirectory(null);
      setSchoolDirectoryError(false);
      return () => { active = false; };
    }

    const basePath = window.location.pathname.startsWith('/serfes') ? '/serfes/' : '/';
    const networkFile = SCHOOL_NETWORK_FILES[schoolNetwork as SchoolNetwork];
    setSchoolDirectory(null);
    setSchoolDirectoryError(false);

    fetch(`${basePath}${networkFile}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar o catálogo da rede selecionada.');
        return response.json() as Promise<SchoolDirectoryPayload>;
      })
      .then((data) => {
        if (active) {
          setSchoolDirectory(data);
          setSchoolDirectoryError(false);
        }
      })
      .catch(() => {
        if (active) setSchoolDirectoryError(true);
      });

    return () => { active = false; };
  }, [schoolNetwork, schoolLevel]);

  useEffect(() => {
    let active = true;
    const classindBasePath = window.location.pathname.startsWith('/serfes') ? '/serfes/' : '/';
    fetch(`${classindBasePath}classind-ratings.json`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar o catálogo ClassInd.');
        return response.json() as Promise<ClassindRatingsPayload>;
      })
      .then((data) => {
        if (active) {
          setClassindRatings(data);
          setClassindRatingsError(false);
        }
      })
      .catch(() => {
        if (active) setClassindRatingsError(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refreshAgeReference = () => setAgeReferenceDate(new Date());
    const timer = window.setInterval(refreshAgeReference, 60 * 60 * 1000);
    window.addEventListener('focus', refreshAgeReference);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshAgeReference);
    };
  }, []);

  useEffect(() => {
    if (!schoolLevel) return;
    const allowedLevels = educationLevelsForAge(athleteAge);
    if (!allowedLevels.includes(schoolLevel as EducationLevel)) {
      setSchoolLevel('');
      setSchoolYear('');
      setHigherEducationCourse('');
      setAthleteInstitution('');
      setSchoolAnnualConfirmation(false);
      setSchoolConfirmedYear(null);
    }
  }, [athleteAge, schoolLevel]);

  useEffect(() => {
    if (schoolConfirmedYear !== null && schoolConfirmedYear !== schoolReferenceYear) {
      setSchoolAnnualConfirmation(false);
    }
  }, [schoolConfirmedYear, schoolReferenceYear]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAthleteSaved(false);
    setRegistrations({});
    setSelectedCompetitionId(null);
    setRegistrationMessage('');
    setAgeReferenceDate(new Date());
    setDashboardSection(profile === 'Atleta' ? 'athleteHome' : 'overview');
    setView('dashboard');
  }

  function handleAthleteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormAttempted(true);

    const mainFieldsValid =
      !athleteTooYoung &&
      !gameAgeBlocked &&
      athleteAge !== null &&
      isValidCpf(athleteCpf) &&
      isValidEmail(athleteEmail) &&
      isValidPhone(athletePhone) &&
      !nicknameHasBlockedContent(athleteNickname) &&
      athleteMunicipality.length > 0;

    const schoolYearRequired = schoolLevel === 'Ensino fundamental' || schoolLevel === 'Ensino médio';
    const higherCourseRequired = schoolLevel === 'Ensino superior';
    const schoolFieldsValid = enrollmentStatus !== 'Sim' || (
      schoolMunicipality.length > 0 &&
      schoolNetwork.length > 0 &&
      athleteInstitution.trim().length > 0 &&
      schoolLevel.length > 0 &&
      (!schoolYearRequired || schoolYear.length > 0) &&
      (!higherCourseRequired || higherEducationCourse.trim().length > 0) &&
      schoolAnnualConfirmation
    );

    const responsibleFieldsValid = minorStatus !== true || (
      responsibleName.trim().length > 0 &&
      responsibleLegalCapacity.length > 0 &&
      (!responsibleNeedsProof || responsibleProofDocument !== null) &&
      isValidCpf(responsibleCpf) &&
      isValidEmail(responsibleEmail) &&
      isValidPhone(responsiblePhone)
    );

    if (!mainFieldsValid || !schoolFieldsValid || !responsibleFieldsValid) return;

    setSchoolConfirmedYear(enrollmentStatus === 'Sim' ? schoolReferenceYear : null);
    setAthleteSaved(true);
    setFormAttempted(false);
    setRegistrationMessage('');
    setDashboardSection(isAthlete ? 'athleteHome' : 'athletes');
  }

  async function requestCompetitionRegistration(competitionId: string) {
    setRegistrationMessage('');
    setAgeReferenceDate(new Date());

    if (athleteTooYoung) {
      setRegistrationMessage('A inscrição não está disponível para atletas com menos de 12 anos.');
      return;
    }

    if (!athleteSaved) {
      setRegistrationMessage('Antes da inscrição em uma competição, complete e salve o seu cadastro.');
      return;
    }

    if (enrollmentStatus === 'Sim' && schoolConfirmedYear !== schoolReferenceYear) {
      setRegistrationMessage(`Antes da inscrição, confirme novamente seu vínculo escolar referente ao ano letivo de ${schoolReferenceYear}.`);
      return;
    }

    const competition = competitions.find((item) => item.id === competitionId);
    const competitionGameTitle = competition?.officialGameTitle ?? '';
    const competitionCatalog = competitionGameTitle ? getGameCatalogEntry(competitionGameTitle) : null;

    const classindBasePath = window.location.pathname.startsWith('/serfes') ? '/serfes/' : '/';
    let latestRatings: ClassindRatingsPayload;
    try {
      const response = await fetch(`${classindBasePath}classind-ratings.json?check=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Fonte local indisponível');
      latestRatings = await response.json() as ClassindRatingsPayload;
      setClassindRatings(latestRatings);
      setClassindRatingsError(false);
    } catch {
      setClassindRatingsError(true);
      setRegistrationMessage('Inscrição aguardando verificação: não foi possível conferir a classificação indicativa oficial mais recente.');
      return;
    }

    const competitionRating = competitionCatalog ? getClassindRecord(latestRatings, competitionCatalog.id, competitionGameTitle) : null;
    const competitionMinimumAge = classificationMinimumAge(competitionRating?.classification ?? null);
    const competitionRatingFresh = isClassindRecordFresh(competitionRating);

    if (!competitionRating || competitionRating.status !== 'verified' || competitionMinimumAge === null) {
      setRegistrationMessage('Inscrição aguardando verificação: a classificação indicativa oficial desta modalidade está pendente.');
      return;
    }

    if (!competitionRatingFresh) {
      setRegistrationMessage('Inscrição aguardando verificação: a fonte oficial de classificação está desatualizada e exige nova conferência antes da liberação.');
      return;
    }

    if (athleteAge !== null && athleteAge < competitionMinimumAge) {
      setRegistrationMessage(`Inscrição indisponível: a classificação indicativa vigente para ${competitionGameTitle} é ${classificationLabel(competitionRating.classification)}.`);
      return;
    }

    if (minorStatus === true && (!responsibleName || !responsibleLegalCapacity)) {
      setRegistrationMessage('Complete as informações do responsável legal antes de solicitar a inscrição.');
      return;
    }

    const nextStatus: RegistrationStatus = minorStatus === true ? 'Aguardando assinatura' : 'Inscrição enviada';
    setRegistrations((current) => ({ ...current, [competitionId]: nextStatus }));
    setSelectedCompetitionId(competitionId);

    if (minorStatus === true) {
      setDashboardSection('competitionAuthorization');
    }
  }

  function viewCompetitionAuthorization(competitionId: string) {
    setSelectedCompetitionId(competitionId);
    setAgeReferenceDate(new Date());
    setDashboardSection('competitionAuthorization');
  }

  if (view === 'login') {
    return (
      <div className="login-page">
        <header className="simple-header">
          <button className="ghost-button" onClick={() => setView('home')}><ArrowLeft size={16} /> Voltar</button>
          <div className="brand-cluster">
            <EsportsSymbol />
            <div><p className="eyebrow">Sistema Estadual Integrado de Regulação e Fomento aos E-sports</p><h1 className="brand-title">SERFES</h1></div>
          </div>
        </header>

        <main className="login-layout">
          <section className="glass-card intro-card">
            <span className="pill">Acesso restrito</span>
            <h2>Acesse o SERFES</h2>
            <p>Utilize suas credenciais para acessar as funcionalidades disponíveis ao seu perfil. Nesta fase do protótipo, utilize somente informações fictícias.</p>
            <div className="login-highlight"><ShieldCheck size={20} /><span>Ambiente de testes preparado para os próximos módulos do sistema.</span></div>
          </section>

          <form className="glass-card form-card" onSubmit={handleLogin}>
            <div className="icon-box"><UserRound size={22} /></div>
            <h3>Entrar no sistema</h3>
            <p className="muted">Selecione seu perfil e informe as credenciais demonstrativas.</p>
            <label>Perfil de acesso<select value={profile} onChange={(event) => setProfile(event.target.value)}>{profiles.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>E-mail<input type="email" placeholder="usuario@serfes.demo" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Senha<input type="password" placeholder="Digite uma senha fictícia" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button className="primary-button" type="submit">Entrar</button>
          </form>
        </main>
      </div>
    );
  }

  if (view === 'dashboard') {
    return (
      <div className="dashboard-shell">
        <aside className="sidebar">
          <div className="sidebar-brand-wrap">
            <EsportsSymbol />
            <div><p className="eyebrow eyebrow-light">{isAthlete ? 'Área do atleta' : 'Painel administrativo'}</p><h2 className="sidebar-title">SERFES</h2></div>
          </div>

          <nav className="sidebar-nav">
            {isAthlete ? (
              <>
                <button className={`nav-item ${dashboardSection === 'athleteHome' ? 'active' : ''}`} onClick={() => setDashboardSection('athleteHome')}><LayoutDashboard size={18} /> Início</button>
                <button className={`nav-item ${dashboardSection === 'athleteForm' ? 'active' : ''}`} onClick={() => setDashboardSection('athleteForm')}><UserRound size={18} /> Meu cadastro</button>
                <button className={`nav-item ${dashboardSection === 'athleteCompetitions' || dashboardSection === 'competitionAuthorization' ? 'active' : ''}`} onClick={() => setDashboardSection('athleteCompetitions')}><Trophy size={18} /> Minhas competições</button>
                <button className="nav-item"><ShieldCheck size={18} /> Integridade e apoio</button>
              </>
            ) : (
              <>
                <button className={`nav-item ${dashboardSection === 'overview' ? 'active' : ''}`} onClick={() => setDashboardSection('overview')}><LayoutDashboard size={18} /> Visão geral</button>
                <button className="nav-item"><Trophy size={18} /> Competições</button>
                {isStateAdmin && <button className={`nav-item ${dashboardSection === 'athletes' || dashboardSection === 'athleteForm' ? 'active' : ''}`} onClick={() => setDashboardSection('athletes')}><Users size={18} /> Atletas</button>}
                <button className="nav-item"><School size={18} /> Escolas</button>
                <button className="nav-item"><ShieldCheck size={18} /> Integridade</button>
                <button className="nav-item"><BarChart3 size={18} /> Indicadores</button>
              </>
            )}
          </nav>

          <button className="sidebar-exit" onClick={() => setView('home')}><LogOut size={17} /> Sair</button>
        </aside>

        <div className="dashboard-main-shell">
          <header className="dashboard-header">
            <div><p className="eyebrow">Área restrita • demonstração</p><h2>Olá, {profile}</h2></div>
            {!isAthlete && <div className="header-tools"><label className="search-box"><Search size={16} /><input type="text" placeholder="Pesquisar no sistema" /></label><button className="icon-button" aria-label="Notificações"><Bell size={18} /></button></div>}
          </header>

          <main className="dashboard-content">
            {dashboardSection === 'athleteHome' && isAthlete && (
              <>
                {athleteSaved && enrollmentStatus === 'Sim' && !schoolConfirmationCurrent && (
                  <div className="warning-note">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Atualize seu vínculo escolar para {schoolReferenceYear}</strong>
                      <span>Para manter seu cadastro escolar válido no novo ano letivo, confirme novamente a instituição e o ano escolar/curso atuais.</span>
                    </div>
                    <button type="button" className="secondary-button compact-button" onClick={() => setDashboardSection('athleteForm')}>Atualizar agora</button>
                  </div>
                )}
                {athleteSaved && <div className="success-banner"><CheckCircle2 size={19} /><div><strong>Seu cadastro demonstrativo foi salvo.</strong><span>Agora você pode consultar as competições disponíveis.</span></div></div>}
                <section className="hero-panel">
                  <div><span className="pill">Minha área</span><h3>Bem-vindo ao seu espaço no SERFES</h3><p>Complete seu cadastro e acompanhe somente informações relacionadas ao seu próprio perfil.</p></div>
                  <button className="primary-button" onClick={() => setDashboardSection(athleteSaved ? 'athleteCompetitions' : 'athleteForm')}>
                    {athleteSaved ? <Trophy size={17} /> : <UserRound size={17} />}
                    {athleteSaved ? 'Ver competições' : 'Preencher meu cadastro'}
                  </button>
                </section>
                <section className="athlete-summary-grid">
                  <article className="mini-status blue"><strong>1</strong><span>Meu cadastro</span></article>
                  <article className="mini-status yellow"><strong>{athleteSaved ? 'Enviado' : 'Pendente'}</strong><span>Validação cadastral</span></article>
                  <article className="mini-status green"><strong>{athleteInstitution ? (schoolConfirmationCurrent ? `Confirmado ${schoolReferenceYear}` : 'Reconfirmação pendente') : '—'}</strong><span>Vínculo escolar</span></article>
                  <article className="mini-status red"><strong>{minorStatus === true ? (responsibleName ? 'Informado' : 'Pendente') : '—'}</strong><span>Responsável legal</span></article>
                </section>
                <section className="panel-grid">
                  <article className="glass-card panel-card">
                    <div className="panel-head"><div><p className="eyebrow">Meu cadastro</p><h4>Etapas pessoais</h4></div></div>
                    <button className="line-action" onClick={() => setDashboardSection('athleteForm')}><span>Preencher ou atualizar meus dados</span><ChevronRight size={16} /></button>
                    <button className="line-action"><span>Acompanhar validação escolar</span><ChevronRight size={16} /></button>
                    <button className="line-action"><span>Consultar meus documentos</span><ChevronRight size={16} /></button>
                  </article>
                  <article className="glass-card panel-card">
                    <div className="panel-head"><div><p className="eyebrow">Participação</p><h4>Próximas etapas</h4></div></div>
                    <div className="list-card"><strong>1</strong><span>Complete seu cadastro pessoal.</span></div>
                    <div className="list-card"><strong>2</strong><span>Se menor de idade, complete as informações do responsável legal.</span></div>
                    <button className="line-action" onClick={() => setDashboardSection('athleteCompetitions')}><span>3. Consultar competições e solicitar inscrição</span><ChevronRight size={16} /></button>
                  </article>
                </section>
                <p className="prototype-note">Esta área é individual. O atleta não visualiza cadastros, documentos ou dados pessoais de outros atletas.</p>
              </>
            )}

            {dashboardSection === 'athleteCompetitions' && isAthlete && (
              <>
                <section className="section-toolbar">
                  <div>
                    <p className="eyebrow">Participação esportiva</p>
                    <h3>Minhas competições</h3>
                    <p className="muted">Consulte competições disponíveis e acompanhe a situação das suas solicitações de inscrição.</p>
                  </div>
                </section>

                {registrationMessage && (
                  <div className="warning-note competition-warning">
                    <AlertTriangle size={18} />
                    <span>{registrationMessage}</span>
                    <button type="button" className="secondary-button compact-button" onClick={() => setDashboardSection('athleteForm')}>Ir para meu cadastro</button>
                  </div>
                )}

                <section className="competition-grid">
                  {competitions.map((competition) => {
                    const registrationStatus = registrations[competition.id];
                    return (
                      <article className="glass-card competition-card" key={competition.id}>
                        <div className="competition-card-head">
                          <span className="status-badge green">{competition.status}</span>
                          <span className="competition-category">{competition.category}</span>
                        </div>
                        <h4>{competition.name}</h4>
                        <div className="competition-meta">
                          <span><Gamepad2 size={16} /> {competition.game}</span>
                          <span><CalendarDays size={16} /> {competition.period}</span>
                          <span><Trophy size={16} /> {competition.location}</span>
                        </div>
                        {registrationStatus ? (
                          <div className={`competition-registration-status ${registrationStatus === 'Aguardando assinatura' ? 'pending' : 'sent'}`}>
                            <strong>{registrationStatus}</strong>
                            <span>{registrationStatus === 'Aguardando assinatura' ? 'O termo específico desta competição precisa ser assinado pelo responsável legal.' : 'A solicitação foi registrada e seguirá para as etapas de validação.'}</span>
                          </div>
                        ) : (
                          <p className="competition-description">A inscrição utiliza as informações já registradas no cadastro do atleta. Para menores de 18 anos, será gerado um termo específico desta competição.</p>
                        )}
                        <div className="competition-card-actions">
                          {!registrationStatus && <button className="primary-button" type="button" onClick={() => requestCompetitionRegistration(competition.id)}>Solicitar inscrição</button>}
                          {registrationStatus === 'Aguardando assinatura' && <button className="primary-button" type="button" onClick={() => viewCompetitionAuthorization(competition.id)}><FileSignature size={17} /> Ver termo para assinatura</button>}
                          {registrationStatus === 'Inscrição enviada' && <span className="status-badge blue">Solicitação registrada</span>}
                        </div>
                      </article>
                    );
                  })}
                </section>

                <p className="prototype-note">As competições, datas e instituições exibidas nesta tela são fictícias e servem exclusivamente para demonstração do fluxo.</p>
              </>
            )}

            {dashboardSection === 'competitionAuthorization' && isAthlete && selectedCompetition && minorStatus === true && !athleteTooYoung && (
              <>
                <section className="section-toolbar form-heading">
                  <div>
                    <button className="back-link" onClick={() => setDashboardSection('athleteCompetitions')}><ArrowLeft size={16} /> Voltar para minhas competições</button>
                    <p className="eyebrow">Autorização específica da competição</p>
                    <h3>{selectedCompetition.name}</h3>
                    <p className="muted">O documento abaixo reúne as informações já cadastradas do atleta e do responsável legal com os dados desta competição.</p>
                  </div>
                </section>

                <section className="competition-summary-bar">
                  <div><strong>Modalidade</strong><span>{selectedCompetition.game}</span></div>
                  <div><strong>Período</strong><span>{selectedCompetition.period}</span></div>
                  <div><strong>Local</strong><span>{selectedCompetition.location}</span></div>
                  <div><strong>Situação</strong><span>Aguardando assinatura</span></div>
                </section>

                <section className="term-preview" aria-label="Termo de autorização da competição">
                  <div className="term-toolbar no-print">
                    <div><p className="eyebrow">Documento da inscrição</p><h4>Termo de autorização</h4></div>
                    <button type="button" className="secondary-button" onClick={() => window.print()}><Printer size={17} /> Imprimir / salvar em PDF</button>
                  </div>

                  <article className="term-paper">
                    <h3>TERMO DE AUTORIZAÇÃO PARA PARTICIPAÇÃO DE ESTUDANTE EM COMPETIÇÃO DE ESPORTES ELETRÔNICOS ESCOLARES</h3>
                    <p>Eu, <strong>{responsibleName}</strong>, inscrito(a) no CPF nº <strong>{responsibleCpf}</strong>, na condição de <strong>{responsibleCapacityLabel}</strong> e responsável legal pelo(a) estudante <strong>{athleteName}</strong>, regularmente matriculado(a) na instituição de ensino <strong>{athleteInstitution || '_______________________________'}</strong>, autorizo sua participação voluntária na competição <strong>{selectedCompetition.name}</strong>, a ser realizada no período de <strong>{selectedCompetition.period}</strong>, em <strong>{selectedCompetition.location}</strong>.</p>
                    <p>Declaro estar ciente de que a iniciativa possui caráter educacional, formativo e recreativo, sendo organizada por <strong>{selectedCompetition.organizer}</strong>, em parceria com <strong>{selectedCompetition.partner}</strong>, com o objetivo de promover o desenvolvimento de competências digitais, sociais e esportivas.</p>
                    <p>Autorizo, ainda, a participação do(a) estudante nas atividades previstas na programação, incluindo partidas, treinamentos e demais ações correlatas, bem como o uso gratuito de sua imagem, voz e nome, para fins institucionais e de divulgação do evento, em meios físicos e digitais, nos termos da legislação aplicável.</p>
                    <p>Autorizo, por fim, o tratamento dos dados pessoais do(a) estudante e do responsável legal, estritamente para fins de inscrição, organização e registro da atividade, em conformidade com a Lei Geral de Proteção de Dados (LGPD).</p>
                    <p>Por fim, declaro que as informações prestadas são verdadeiras, estando ciente de que eventual inexatidão poderá implicar o cancelamento da participação.</p>

                    <div className="term-fields">
                      <p><strong>Estudante:</strong> {athleteName}</p>
                      <p><strong>CPF do estudante:</strong> {athleteCpf}</p>
                      <p><strong>Data de nascimento:</strong> {formatInputDate(athleteBirthDate)}</p>
                      <p><strong>Nickname:</strong> {athleteNickname}</p>
                      <p><strong>Jogo:</strong> {selectedCompetition.game}</p>
                      <p><strong>Telefone do responsável:</strong> {responsiblePhone}</p>
                      <p><strong>E-mail do responsável:</strong> {responsibleEmail}</p>
                      <p><strong>Local e data:</strong> {athleteMunicipality ? `${athleteMunicipality}/PR` : selectedCompetition.location}, {authorizationDate}.</p>
                      <p><strong>Assinatura eletrônica do responsável legal:</strong> {responsibleName} — CPF {responsibleCpf}</p>
                    </div>
                  </article>

                  <div className="signature-flow no-print">
                    <div className="signature-step complete">
                      <span>1</span>
                      <div><strong>Termo gerado</strong><small>Informações do cadastro e da competição reunidas automaticamente.</small></div>
                    </div>
                    <div className="signature-step current govbr-step">
                      <span>2</span>
                      <div>
                        <strong>Assinatura com GOV.BR</strong>
                        <small>O responsável assinará eletronicamente quando a integração institucional estiver habilitada.</small>
                        <button type="button" className="govbr-button" disabled title="A integração real dependerá da habilitação institucional da API de assinatura eletrônica.">Assinar com GOV.BR — integração futura</button>
                      </div>
                    </div>
                    <div className="signature-step">
                      <span>3</span>
                      <div><strong>Validação pelo SERFES</strong><small>Após a assinatura válida, a inscrição seguirá para validação e homologação.</small></div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {dashboardSection === 'overview' && !isAthlete && (
              <>
                <section className="hero-panel">
                  <div><span className="pill">Perfil selecionado</span><h3>{profile}</h3><p>Área de gestão do SERFES conforme as permissões atribuídas ao perfil.</p></div>
                  {isStateAdmin && <button className="primary-button" onClick={() => setDashboardSection('athleteForm')}><Plus size={17} /> Novo atleta</button>}
                </section>
                <section className="stats-grid">
                  <article className="stat-card featured"><span>Competições</span><strong>12</strong><small>+3 neste mês</small></article>
                  <article className="stat-card"><span>Atletas</span><strong>248</strong><small>18 pendências</small></article>
                  <article className="stat-card"><span>Escolas</span><strong>57</strong><small>9 em validação</small></article>
                  <article className="stat-card"><span>Municípios</span><strong>21</strong><small>4 aderentes recentes</small></article>
                </section>
                <section className="panel-grid">
                  <article className="glass-card panel-card">
                    <div className="panel-head"><div><p className="eyebrow">Ações rápidas</p><h4>Atalhos principais</h4></div></div>
                    <button className="line-action"><span>Cadastrar competição</span><ChevronRight size={16} /></button>
                    {isStateAdmin && <button className="line-action" onClick={() => setDashboardSection('athletes')}><span>Gerenciar atletas</span><ChevronRight size={16} /></button>}
                    <button className="line-action"><span>Validar escola</span><ChevronRight size={16} /></button>
                  </article>
                  <article className="glass-card panel-card">
                    <div className="panel-head"><div><p className="eyebrow">Agenda</p><h4>Próximos eventos</h4></div></div>
                    <div className="list-card"><strong>18/08</strong><span>Prazo de inscrições dos Jogos Escolares</span></div>
                    <div className="list-card"><strong>22/08</strong><span>Reunião com organizadores</span></div>
                    <div className="list-card"><strong>29/08</strong><span>Homologação de resultados</span></div>
                  </article>
                </section>
              </>
            )}

            {dashboardSection === 'athletes' && isStateAdmin && (
              <>
                <section className="section-toolbar">
                  <div><p className="eyebrow">Gestão estadual de atletas</p><h3>Atletas cadastrados</h3><p className="muted">Consulta administrativa de vínculos, documentação e situação de elegibilidade.</p></div>
                  <button className="primary-button" onClick={() => setDashboardSection('athleteForm')}><Plus size={17} /> Cadastrar atleta</button>
                </section>
                <section className="athlete-summary-grid">
                  <article className="mini-status blue"><strong>248</strong><span>Total cadastrado</span></article>
                  <article className="mini-status green"><strong>214</strong><span>Validados</span></article>
                  <article className="mini-status yellow"><strong>18</strong><span>Em análise</span></article>
                  <article className="mini-status red"><strong>16</strong><span>Com pendências</span></article>
                </section>
                <section className="glass-card table-card">
                  <div className="table-toolbar"><label className="search-box table-search"><Search size={16} /><input type="text" placeholder="Buscar por nome, nickname ou município" /></label><select className="compact-select" defaultValue="Todos os status"><option>Todos os status</option><option>Validado</option><option>Pendente</option><option>Aguardando responsável</option></select></div>
                  <div className="table-shell"><table className="data-table"><thead><tr><th>Atleta</th><th>Modalidade</th><th>Município</th><th>Vínculo escolar</th><th>Situação</th></tr></thead><tbody>{athleteRows.map((athlete) => <tr key={athlete.nick}><td><strong>{athlete.name}</strong><small>{athlete.nick}</small></td><td>{athlete.game}</td><td>{athlete.city}</td><td>{athlete.school}</td><td><span className={`status-badge ${athlete.tone}`}>{athlete.status}</span></td></tr>)}</tbody></table></div>
                  <p className="prototype-note">Nomes e quantitativos exibidos nesta página são fictícios e servem exclusivamente para demonstração.</p>
                </section>
              </>
            )}

            {dashboardSection === 'athleteForm' && (isAthlete || isStateAdmin) && (
              <>
                <section className="section-toolbar form-heading">
                  <div>
                    <button className="back-link" onClick={() => setDashboardSection(isAthlete ? 'athleteHome' : 'athletes')}><ArrowLeft size={16} /> Voltar</button>
                    <p className="eyebrow">{isAthlete ? 'Meu cadastro' : 'Novo cadastro'}</p>
                    <h3>{isAthlete ? 'Dados do atleta' : 'Cadastrar atleta'}</h3>
                    <p className="muted">Preencha apenas dados fictícios durante esta fase de desenvolvimento.</p>
                  </div>
                </section>

                <form className="athlete-form" onSubmit={handleAthleteSubmit}>
                  {formAttempted && (athleteTooYoung || gameAgeBlocked || nicknameBlocked || athleteCpfInvalid || athleteEmailInvalid || athletePhoneInvalid || responsibleCpfInvalid || responsibleEmailInvalid || responsiblePhoneInvalid) && (
                    <div className="warning-note"><AlertTriangle size={18} /><span>Revise os campos destacados antes de salvar o cadastro.</span></div>
                  )}

                  <section className="glass-card form-section">
                    <div className="form-section-title"><div className="icon-box"><UserRound size={20} /></div><div><h4>Identificação</h4><p>Dados básicos para individualização do atleta.</p></div></div>
                    <div className="form-grid">
                      <label>Nome completo<input required value={athleteName} onChange={(e) => setAthleteName(e.target.value)} placeholder="Ex.: Atleta Exemplo" /></label>
                      <label>Data de nascimento
                        <input required type="date" max={todayInputValue()} value={athleteBirthDate} onChange={(e) => setAthleteBirthDate(e.target.value)} />
                        {athleteTooYoung && <small className="field-error">Cadastro indisponível: o SERFES aceita atletas a partir de 12 anos.</small>}
                        {!athleteTooYoung && minorStatus === true && <small className="field-help">Atleta entre 12 e 17 anos. As informações do responsável legal serão solicitadas abaixo e reaproveitadas na autorização de cada competição.</small>}
                        {minorStatus === false && <small className="field-help">Atleta com 18 anos ou mais. Não será exigida autorização do responsável legal.</small>}
                      </label>
                      <label>CPF
                        <input required disabled={athleteTooYoung} inputMode="numeric" maxLength={14} className={athleteCpfInvalid ? 'invalid' : ''} value={athleteCpf} onChange={(e) => setAthleteCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" />
                        {athleteCpfInvalid && <small className="field-error">CPF inválido. Confira os 11 dígitos e os dígitos verificadores.</small>}
                      </label>
                      <label>E-mail
                        <input required disabled={athleteTooYoung} type="email" className={athleteEmailInvalid ? 'invalid' : ''} value={athleteEmail} onChange={(e) => setAthleteEmail(e.target.value)} placeholder="atleta@exemplo.demo" />
                        {athleteEmailInvalid && <small className="field-error">Informe um endereço de e-mail válido.</small>}
                      </label>
                      <label>Telefone
                        <input required disabled={athleteTooYoung} inputMode="tel" maxLength={15} className={athletePhoneInvalid ? 'invalid' : ''} value={athletePhone} onChange={(e) => setAthletePhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                        {athletePhoneInvalid && <small className="field-error">Informe DDD + telefone, com 10 ou 11 dígitos.</small>}
                      </label>
                      <label>Município
                        <select required disabled={athleteTooYoung} value={athleteMunicipality} onChange={(e) => setAthleteMunicipality(e.target.value)}>
                          <option value="" disabled>{municipalities.length ? 'Selecione' : 'Carregando municípios...'}</option>
                          {municipalities.map((municipality) => <option key={municipality}>{municipality}</option>)}
                        </select>
                        {municipalitiesError && <small className="field-error">Não foi possível carregar a relação oficial do IBGE. Tente novamente.</small>}
                      </label>
                      <label>UF<select value="PR" disabled><option>PR</option></select></label>
                    </div>
                  </section>

                  {!athleteTooYoung && (
                    <>
                      <section className="glass-card form-section">
                        <div className="form-section-title"><div className="icon-box yellow-box"><Gamepad2 size={20} /></div><div><h4>Perfil esportivo</h4><p>Informações de participação no ecossistema de e-sports.</p></div></div>
                        <div className="form-grid">
                          <label>Nickname
                            <input required className={nicknameBlocked ? 'invalid' : ''} value={athleteNickname} onChange={(e) => setAthleteNickname(e.target.value)} placeholder="Nome utilizado nas competições" maxLength={24} />
                            {nicknameBlocked ? <small className="field-error">Este nickname contém termo potencialmente ofensivo ou incompatível com as regras do SERFES.</small> : <small className="field-help">Nicknames ofensivos, discriminatórios ou com palavrões serão bloqueados.</small>}
                          </label>
                          <label>Modalidade principal
                            <select required value={athleteGame} onChange={(e) => setAthleteGame(e.target.value)}>
                              <option value="" disabled>Selecione</option>
                              {GAME_CATALOG.map((game) => <option key={game.id}>{game.name}</option>)}
                            </select>
                            {athleteGame && selectedGameCatalog && (
                              <div className={`game-eligibility-note ${selectedGameVerified ? (gameAgeBlocked ? 'blocked' : 'allowed') : 'pending'}`}>
                                {selectedGameNeedsExactVersion ? (
                                  <>
                                    <strong>Classificação verificada na inscrição</strong>
                                    <small>Esta modalidade possui títulos ou versões específicos. O SERFES fará a conferência oficial usando o jogo exato informado pela competição.</small>
                                  </>
                                ) : selectedGameVerified ? (
                                  <>
                                    <strong>{gameAgeBlocked ? 'Modalidade incompatível com a idade informada' : 'Modalidade compatível com a idade informada'}</strong>
                                    <small>Classificação de referência: {classificationLabel(selectedGameClassind?.classification ?? null)}{selectedGameClassind?.officialTitle ? ` — ${selectedGameClassind.officialTitle}` : ''}.</small>
                                  </>
                                ) : selectedGameClassind?.status === 'verified' && !selectedGameFresh ? (
                                  <>
                                    <strong>Fonte oficial desatualizada</strong>
                                    <small>O SERFES não fará liberação automática até que a base oficial seja atualizada e sincronizada novamente.</small>
                                  </>
                                ) : (
                                  <>
                                    <strong>Classificação oficial pendente de sincronização</strong>
                                    <small>O SERFES não fará liberação automática enquanto não houver classificação oficial validada para esta modalidade.</small>
                                  </>
                                )}
                                {selectedGameCatalog.requiresExactVersion && <small>A verificação definitiva será refeita na inscrição, usando o título/versão exatos informados pela competição.</small>}
                                <a className="game-eligibility-source" href={classindRatings?.sourceUrl || 'https://classindportal.mj.gov.br/consulta-jogos'} target="_blank" rel="noreferrer">Consultar ClassInd/MJSP</a>
                                {classindRatingsError && <small className="field-error">A fonte local de classificação não pôde ser carregada. Tente novamente.</small>}
                              </div>
                            )}
                          </label>
                        </div>
                      </section>

                      <section className="glass-card form-section">
                        <div className="form-section-title"><div className="icon-box green-box"><School size={20} /></div><div><h4>Vínculo escolar</h4><p>Município, rede e nível de ensino determinam as opções oficiais de instituição.</p></div></div>
                        <div className="form-grid">
                          <label>Está matriculado em instituição de ensino?
                            <select required value={enrollmentStatus} onChange={(e) => {
                              const nextValue = e.target.value;
                              setEnrollmentStatus(nextValue);
                              setSchoolAnnualConfirmation(false);
                              setSchoolConfirmedYear(null);
                              if (nextValue !== 'Sim') {
                                setSchoolMunicipality('');
                                setSchoolNetwork('');
                                setAthleteInstitution('');
                                setSchoolLevel('');
                                setSchoolYear('');
                                setHigherEducationCourse('');
                              }
                            }}>
                              <option>Sim</option><option>Não</option>
                            </select>
                          </label>
                          <label>Município da instituição
                            <select
                              required={enrollmentStatus === 'Sim'}
                              disabled={enrollmentStatus !== 'Sim'}
                              value={schoolMunicipality}
                              onChange={(e) => {
                                setSchoolMunicipality(e.target.value);
                                setSchoolAnnualConfirmation(false);
                                setSchoolConfirmedYear(null);
                                setSchoolNetwork('');
                                setAthleteInstitution('');
                              }}
                            >
                              <option value="" disabled>{municipalities.length ? 'Selecione' : 'Carregando municípios...'}</option>
                              {municipalities.map((municipality) => <option key={`school-${municipality}`}>{municipality}</option>)}
                            </select>
                          </label>
                          <label>Rede de ensino
                            <select
                              required={enrollmentStatus === 'Sim'}
                              disabled={enrollmentStatus !== 'Sim' || !schoolMunicipality}
                              value={schoolNetwork}
                              onChange={(e) => {
                                setSchoolNetwork(e.target.value);
                                setSchoolAnnualConfirmation(false);
                                setSchoolConfirmedYear(null);
                                setAthleteInstitution('');
                                setHigherEducationCourse('');
                                setSchoolDirectory(null);
                                setSchoolDirectoryError(false);
                              }}
                            >
                              <option value="" disabled>Selecione</option>
                              {SCHOOL_NETWORKS.map((network) => <option key={network}>{network}</option>)}
                            </select>
                          </label>
                          <label>Nível de ensino
                            <select
                              required={enrollmentStatus === 'Sim'}
                              disabled={enrollmentStatus !== 'Sim' || athleteAge === null}
                              value={schoolLevel}
                              onChange={(e) => {
                                setSchoolLevel(e.target.value);
                                setSchoolAnnualConfirmation(false);
                                setSchoolConfirmedYear(null);
                                setSchoolYear('');
                                setHigherEducationCourse('');
                                setAthleteInstitution('');
                              }}
                            >
                              <option value="" disabled>Selecione</option>
                              {availableEducationLevels.map((level) => <option key={level}>{level}</option>)}
                            </select>
                          </label>
                          <label>{schoolLevel === 'Ensino superior' ? 'Instituição de ensino superior' : 'Escola'}
                            {institutionCatalogReady ? (
                              <select
                                required={enrollmentStatus === 'Sim'}
                                disabled={enrollmentStatus !== 'Sim' || !schoolMunicipality || !schoolNetwork || !schoolLevel}
                                value={athleteInstitution}
                                onChange={(e) => { setAthleteInstitution(e.target.value); setHigherEducationCourse(''); setSchoolAnnualConfirmation(false); setSchoolConfirmedYear(null); }}
                              >
                                <option value="" disabled>{institutionOptions.length ? 'Selecione' : 'Nenhuma instituição localizada para os filtros'}</option>
                                {institutionOptions.map((institution) => <option key={`${institution.id}-${institution.name}`} value={institution.name}>{institution.name}</option>)}
                              </select>
                            ) : (
                              <input
                                disabled
                                value=""
                                placeholder={!schoolLevel ? 'Selecione primeiro o nível de ensino' : 'Aguardando catálogo oficial'}
                              />
                            )}
                            {schoolLevel && !institutionCatalogReady && <small className="field-help">{schoolLevel === 'Ensino superior' ? 'Aguardando sincronização com a base oficial de instituições e cursos de ensino superior. O SERFES não aceitará instituição informada manualmente.' : 'Aguardando sincronização com a Consulta Escolas/SEED-PR. O SERFES não aceitará escola informada manualmente.'}</small>}
                            {schoolLevel !== 'Ensino superior' && schoolDirectoryError && <small className="field-error">Não foi possível carregar o catálogo da Consulta Escolas/SEED-PR.</small>}
                            {schoolLevel === 'Ensino superior' && higherEducationError && <small className="field-error">Não foi possível carregar o catálogo do MEC/e-MEC.</small>}
                          </label>
                          {(schoolLevel === 'Ensino fundamental' || schoolLevel === 'Ensino médio') && (
                            <label>Ano escolar
                              <select required value={schoolYear} onChange={(e) => { setSchoolYear(e.target.value); setSchoolAnnualConfirmation(false); setSchoolConfirmedYear(null); }}>
                                <option value="" disabled>Selecione</option>
                                {availableSchoolYears.map((year) => <option key={year}>{year}</option>)}
                              </select>
                            </label>
                          )}
                          {schoolLevel === 'Ensino superior' && (
                            <label>Curso
                              <select
                                required
                                disabled={!athleteInstitution || higherCourseOptions.length === 0}
                                value={higherEducationCourse}
                                onChange={(e) => { setHigherEducationCourse(e.target.value); setSchoolAnnualConfirmation(false); setSchoolConfirmedYear(null); }}
                              >
                                <option value="" disabled>{!athleteInstitution ? 'Selecione primeiro a instituição' : (higherCourseOptions.length ? 'Selecione' : 'Aguardando catálogo oficial')}</option>
                                {higherCourseOptions.map((course) => <option key={course.id} value={course.id}>{higherEducationCourseLabel(course)}</option>)}
                              </select>
                              <small className="field-help">São exibidos somente cursos oficiais vinculados à instituição selecionada e com oferta localizada no Paraná. Quando disponíveis na base oficial, o grau, a modalidade e o código e-MEC identificam cada oferta.</small>
                            </label>
                          )}
                          {enrollmentStatus === 'Sim' && (
                            <div className="annual-school-confirmation">
                              <div className="annual-school-confirmation-head">
                                <strong>Confirmação anual do vínculo escolar</strong>
                                <span>Ano letivo {schoolReferenceYear}</span>
                              </div>
                              <label className="annual-school-checkbox">
                                <input
                                  required
                                  type="checkbox"
                                  checked={schoolAnnualConfirmation}
                                  onChange={(e) => setSchoolAnnualConfirmation(e.target.checked)}
                                />
                                <span>Confirmo que, no ano letivo de {schoolReferenceYear}, a instituição e o ano escolar/curso informados acima correspondem à minha matrícula atual.</span>
                              </label>
                              <small className="field-help">Esta confirmação será solicitada novamente no início de cada ano. Se houver mudança de escola, instituição, ano escolar ou curso, será necessário atualizar e salvar o cadastro.</small>
                              {schoolConfirmedYear === schoolReferenceYear && <small className="annual-school-confirmed">Vínculo confirmado para {schoolReferenceYear}.</small>}
                            </div>
                          )}
                        </div>
                        {schoolLevel === 'Ensino superior' && (
                          <div className="form-actions source-actions">
                            <a className="secondary-button" href={higherEducation?.sourceUrl || 'https://emec.mec.gov.br/emec/nova-index/'} target="_blank" rel="noreferrer">Consultar cadastro oficial e-MEC</a>
                          </div>
                        )}
                      </section>

                      {minorStatus === true && (
                        <section className="glass-card form-section authorization-section">
                          <div className="form-section-title"><div className="icon-box red-box"><ShieldCheck size={20} /></div><div><h4>Responsável legal</h4><p>Informações gerais que serão reutilizadas automaticamente nos termos específicos de cada competição.</p></div></div>
                          <div className="form-grid">
                            <label>Nome completo<input required value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} placeholder="Nome completo" /></label>
                            <label>Qualificação
                              <select
                                required
                                value={responsibleLegalCapacity}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setResponsibleLegalCapacity(next);
                                  if (!['Tutor(a)', 'Guardião(ã)'].includes(next)) setResponsibleProofDocument(null);
                                }}
                              >
                                <option value="" disabled>Selecione</option>
                                <option>Mãe</option>
                                <option>Pai</option>
                                <option>Tutor(a)</option>
                                <option>Guardião(ã)</option>
                              </select>
                            </label>
                            {responsibleNeedsProof && (
                              <label>Documento comprobatório da responsabilidade legal
                                <input
                                  required
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => setResponsibleProofDocument(e.target.files?.[0] ?? null)}
                                />
                                <small className="field-help">Para tutor ou guardião, anexe o termo, decisão judicial ou documento equivalente que comprove a representação.</small>
                                {responsibleProofDocument && <small className="field-help">Arquivo selecionado: {responsibleProofDocument.name}</small>}
                              </label>
                            )}
                            <label>CPF
                              <input required inputMode="numeric" maxLength={14} className={responsibleCpfInvalid ? 'invalid' : ''} value={responsibleCpf} onChange={(e) => setResponsibleCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" />
                              {responsibleCpfInvalid && <small className="field-error">CPF inválido. Confira os 11 dígitos e os dígitos verificadores.</small>}
                            </label>
                            <label>E-mail
                              <input required type="email" className={responsibleEmailInvalid ? 'invalid' : ''} value={responsibleEmail} onChange={(e) => setResponsibleEmail(e.target.value)} placeholder="email@exemplo.demo" />
                              {responsibleEmailInvalid && <small className="field-error">Informe um endereço de e-mail válido.</small>}
                            </label>
                            <label>Telefone
                              <input required inputMode="tel" maxLength={15} className={responsiblePhoneInvalid ? 'invalid' : ''} value={responsiblePhone} onChange={(e) => setResponsiblePhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                              {responsiblePhoneInvalid && <small className="field-error">Informe DDD + telefone, com 10 ou 11 dígitos.</small>}
                            </label>
                          </div>
                        </section>
                      )}

                      <section className="glass-card form-section">
                        <div className="form-section-title"><div className="icon-box"><FileText size={20} /></div><div><h4>Documentos</h4><p>Área demonstrativa para futura conferência documental.</p></div></div>
                        <div className="document-grid">
                          <div className="document-item"><FileText size={18} /><div><strong>Documento de identificação do aluno</strong><span>Não anexado</span></div></div>
                          <div className="document-item"><FileText size={18} /><div><strong>Comprovante de vínculo escolar</strong><span>Não anexado</span></div></div>
                        </div>
                      </section>
                    </>
                  )}

                  <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => setDashboardSection(isAthlete ? 'athleteHome' : 'athletes')}>Cancelar</button>
                    <button type="submit" className="primary-button" disabled={athleteTooYoung}><CheckCircle2 size={17} /> Salvar cadastro demonstrativo</button>
                  </div>
                </form>
              </>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="brand-cluster"><EsportsSymbol /><div><p className="eyebrow">Sistema Estadual Integrado de Regulação e Fomento aos E-sports</p><h1 className="brand-title">SERFES</h1></div></div>
        <div className="header-actions"><button className="secondary-button">Portal público</button><button className="primary-button" onClick={() => setView('login')}>Entrar</button></div>
      </header>
      <main>
        <section className="hero-section">
          <div className="glass-card hero-card"><span className="pill">Plataforma pública estadual</span><h2>Sistema Estadual Integrado de Regulação e Fomento aos E-sports</h2><p>Ambiente integrado para competições, atletas, escolas, organizadores, integridade, legislação e indicadores do setor.</p><div className="hero-actions"><button className="primary-button" onClick={() => setView('login')}>Acessar sistema</button><button className="secondary-button">Conhecer módulos</button></div></div>
          <div className="side-stack">
            <div className="glass-card dark-card"><div className="card-row"><span className="eyebrow eyebrow-light">Visão geral</span><Gamepad2 size={18} /></div><div className="metric"><strong>12</strong><span>competições ativas</span></div><div className="metric"><strong>248</strong><span>atletas monitorados</span></div><div className="metric"><strong>21</strong><span>municípios participantes</span></div></div>
            <div className="glass-card summary-card"><p className="eyebrow">Acesso e informação</p><h3>Um ambiente único para consulta e gestão</h3><p className="muted">Consulte informações públicas do setor e acesse a área restrita para realizar as rotinas de gestão do SERFES.</p></div>
          </div>
        </section>
        <section className="module-section"><div className="section-head"><p className="eyebrow">Estrutura do sistema</p><h3>Módulos principais</h3><p className="muted">Funcionalidades centrais previstas para a primeira versão do SERFES.</p></div><div className="module-grid">{modules.map(([title, text, Icon]) => <article key={title} className="glass-card module-card"><div className="icon-box"><Icon size={20} /></div><h4>{title}</h4><p>{text}</p></article>)}</div></section>
      </main>
      <footer className="site-footer">SERFES • Sistema Estadual Integrado de Regulação e Fomento aos E-sports</footer>
    </div>
  );
}
