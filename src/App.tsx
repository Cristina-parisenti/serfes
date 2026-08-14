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
  School,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import './authorization.css';
import './validation.css';
import {
  formatCpf,
  formatPhone,
  isValidCpf,
  isValidEmail,
  isValidPhone,
  nicknameHasBlockedContent,
} from './formValidation';

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

type DashboardSection = 'overview' | 'athleteHome' | 'athletes' | 'athleteForm';
type Municipality = { id: number; nome: string };

function EsportsSymbol() {
  return (
    <div className="esports-symbol" aria-hidden="true">
      <div className="esports-symbol-inner"><Gamepad2 size={23} /></div>
    </div>
  );
}

function isUnder18(birthDate: string): boolean | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayHasNotOccurred =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);

  if (birthdayHasNotOccurred) age -= 1;
  return age < 18;
}

export function App() {
  const [view, setView] = useState<'home' | 'login' | 'dashboard'>('home');
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('overview');
  const [profile, setProfile] = useState(profiles[0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [athleteSaved, setAthleteSaved] = useState(false);
  const [formAttempted, setFormAttempted] = useState(false);

  const [athleteName, setAthleteName] = useState('');
  const [athleteBirthDate, setAthleteBirthDate] = useState('');
  const [athleteCpf, setAthleteCpf] = useState('');
  const [athleteEmail, setAthleteEmail] = useState('');
  const [athletePhone, setAthletePhone] = useState('');
  const [athleteMunicipality, setAthleteMunicipality] = useState('');
  const [athleteInstitution, setAthleteInstitution] = useState('');
  const [athleteNickname, setAthleteNickname] = useState('');
  const [athleteGame, setAthleteGame] = useState('');

  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleRg, setResponsibleRg] = useState('');
  const [responsibleCpf, setResponsibleCpf] = useState('');
  const [responsibleEmail, setResponsibleEmail] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');

  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [municipalitiesError, setMunicipalitiesError] = useState(false);

  const isAthlete = profile === 'Atleta';
  const isStateAdmin = profile === 'Administrador estadual';
  const minorStatus = isUnder18(athleteBirthDate);

  const nicknameBlocked = athleteNickname.length > 0 && nicknameHasBlockedContent(athleteNickname);
  const athleteCpfInvalid = athleteCpf.length > 0 && !isValidCpf(athleteCpf);
  const athleteEmailInvalid = athleteEmail.length > 0 && !isValidEmail(athleteEmail);
  const athletePhoneInvalid = athletePhone.length > 0 && !isValidPhone(athletePhone);
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

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAthleteSaved(false);
    setDashboardSection(profile === 'Atleta' ? 'athleteHome' : 'overview');
    setView('dashboard');
  }

  function handleAthleteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormAttempted(true);

    const mainFieldsValid =
      isValidCpf(athleteCpf) &&
      isValidEmail(athleteEmail) &&
      isValidPhone(athletePhone) &&
      !nicknameHasBlockedContent(athleteNickname) &&
      athleteMunicipality.length > 0 &&
      minorStatus !== null;

    const responsibleFieldsValid = minorStatus !== true || (
      isValidCpf(responsibleCpf) &&
      isValidEmail(responsibleEmail) &&
      isValidPhone(responsiblePhone)
    );

    if (!mainFieldsValid || !responsibleFieldsValid) return;

    setAthleteSaved(true);
    setFormAttempted(false);
    setDashboardSection(isAthlete ? 'athleteHome' : 'athletes');
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
                <button className="nav-item"><Trophy size={18} /> Minhas competições</button>
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
                {athleteSaved && <div className="success-banner"><CheckCircle2 size={19} /><div><strong>Seu cadastro demonstrativo foi salvo.</strong><span>Nesta fase do protótipo, os dados ainda não são armazenados.</span></div></div>}
                <section className="hero-panel">
                  <div><span className="pill">Minha área</span><h3>Bem-vindo ao seu espaço no SERFES</h3><p>Complete seu cadastro e acompanhe somente informações relacionadas ao seu próprio perfil.</p></div>
                  <button className="primary-button" onClick={() => setDashboardSection('athleteForm')}><UserRound size={17} /> Preencher meu cadastro</button>
                </section>
                <section className="athlete-summary-grid">
                  <article className="mini-status blue"><strong>1</strong><span>Meu cadastro</span></article>
                  <article className="mini-status yellow"><strong>{athleteSaved ? 'Enviado' : 'Pendente'}</strong><span>Validação cadastral</span></article>
                  <article className="mini-status green"><strong>{athleteInstitution ? 'Informado' : '—'}</strong><span>Vínculo escolar</span></article>
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
                    <div className="list-card"><strong>2</strong><span>Se menor de idade, complete os dados do responsável legal.</span></div>
                    <div className="list-card"><strong>3</strong><span>Ao se inscrever em cada competição, o termo específico será gerado para assinatura do responsável.</span></div>
                  </article>
                </section>
                <p className="prototype-note">Esta área é individual. O atleta não visualiza cadastros, documentos ou dados pessoais de outros atletas.</p>
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
                  {formAttempted && (nicknameBlocked || athleteCpfInvalid || athleteEmailInvalid || athletePhoneInvalid || responsibleCpfInvalid || responsibleEmailInvalid || responsiblePhoneInvalid) && (
                    <div className="warning-note"><AlertTriangle size={18} /><span>Revise os campos destacados antes de salvar o cadastro.</span></div>
                  )}

                  <section className="glass-card form-section">
                    <div className="form-section-title"><div className="icon-box"><UserRound size={20} /></div><div><h4>Identificação</h4><p>Dados básicos para individualização do atleta.</p></div></div>
                    <div className="form-grid">
                      <label>Nome completo<input required value={athleteName} onChange={(e) => setAthleteName(e.target.value)} placeholder="Ex.: Atleta Exemplo" /></label>
                      <label>Nome social<input placeholder="Opcional" /></label>
                      <label>Data de nascimento<input required type="date" value={athleteBirthDate} onChange={(e) => setAthleteBirthDate(e.target.value)} /></label>
                      <label>CPF
                        <input required inputMode="numeric" maxLength={14} className={athleteCpfInvalid ? 'invalid' : ''} value={athleteCpf} onChange={(e) => setAthleteCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" />
                        {athleteCpfInvalid && <small className="field-error">CPF inválido. Confira os 11 dígitos e os dígitos verificadores.</small>}
                      </label>
                      <label>E-mail
                        <input required type="email" className={athleteEmailInvalid ? 'invalid' : ''} value={athleteEmail} onChange={(e) => setAthleteEmail(e.target.value)} placeholder="atleta@exemplo.demo" />
                        {athleteEmailInvalid && <small className="field-error">Informe um endereço de e-mail válido.</small>}
                      </label>
                      <label>Telefone
                        <input required inputMode="tel" maxLength={15} className={athletePhoneInvalid ? 'invalid' : ''} value={athletePhone} onChange={(e) => setAthletePhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                        {athletePhoneInvalid && <small className="field-error">Informe DDD + telefone, com 10 ou 11 dígitos.</small>}
                      </label>
                      <label>Município
                        <select required value={athleteMunicipality} onChange={(e) => setAthleteMunicipality(e.target.value)}>
                          <option value="" disabled>{municipalities.length ? 'Selecione' : 'Carregando municípios...'}</option>
                          {municipalities.map((municipality) => <option key={municipality}>{municipality}</option>)}
                        </select>
                        {municipalitiesError && <small className="field-error">Não foi possível carregar a relação oficial do IBGE. Tente novamente.</small>}
                      </label>
                      <label>UF<select value="PR" disabled><option>PR</option></select></label>
                    </div>
                  </section>

                  <section className="glass-card form-section">
                    <div className="form-section-title"><div className="icon-box yellow-box"><Gamepad2 size={20} /></div><div><h4>Perfil esportivo</h4><p>Informações de participação no ecossistema de e-sports.</p></div></div>
                    <div className="form-grid">
                      <label>Nickname
                        <input required className={nicknameBlocked ? 'invalid' : ''} value={athleteNickname} onChange={(e) => setAthleteNickname(e.target.value)} placeholder="Nome utilizado nas competições" maxLength={24} />
                        {nicknameBlocked ? <small className="field-error">Este nickname contém termo potencialmente ofensivo ou incompatível com as regras do SERFES.</small> : <small className="field-help">Nicknames ofensivos, discriminatórios ou com palavrões serão bloqueados.</small>}
                      </label>
                      <label>Modalidade principal<select required value={athleteGame} onChange={(e) => setAthleteGame(e.target.value)}><option value="" disabled>Selecione</option><option>Valorant</option><option>League of Legends</option><option>EA Sports FC</option><option>Counter-Strike 2</option><option>Rocket League</option><option>Outra</option></select></label>
                      <label>Equipe ou entidade<input placeholder="Opcional" /></label>
                      <label>Tempo de prática<select defaultValue=""><option value="">Selecione</option><option>Até 1 ano</option><option>1 a 3 anos</option><option>Mais de 3 anos</option></select></label>
                    </div>
                  </section>

                  <section className="glass-card form-section">
                    <div className="form-section-title"><div className="icon-box green-box"><School size={20} /></div><div><h4>Vínculo educacional</h4><p>Informações para validação da situação escolar quando aplicável.</p></div></div>
                    <div className="form-grid">
                      <label>Está matriculado em instituição de ensino?<select required defaultValue="Sim"><option>Sim</option><option>Não</option></select></label>
                      <label>Instituição de ensino<input value={athleteInstitution} onChange={(e) => setAthleteInstitution(e.target.value)} placeholder="Nome fictício da instituição" /></label>
                      <label>Nível de ensino<select defaultValue=""><option value="">Selecione</option><option>Ensino fundamental</option><option>Ensino médio</option><option>Ensino superior</option><option>Outro</option></select></label>
                      <label>Situação da matrícula<select defaultValue="Ativa"><option>Ativa</option><option>Em validação</option><option>Não se aplica</option></select></label>
                    </div>
                  </section>

                  <section className="glass-card form-section authorization-section">
                    <div className="form-section-title"><div className="icon-box red-box"><ShieldCheck size={20} /></div><div><h4>Responsável legal</h4><p>Dados solicitados quando o atleta for menor de 18 anos.</p></div></div>
                    <div className="form-grid">
                      {minorStatus === true && (
                        <>
                          <label>Nome do responsável legal<input required value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} placeholder="Responsável Exemplo" /></label>
                          <label>RG do responsável<input required value={responsibleRg} onChange={(e) => setResponsibleRg(e.target.value)} placeholder="00.000.000-0" /></label>
                          <label>CPF do responsável
                            <input required inputMode="numeric" maxLength={14} className={responsibleCpfInvalid ? 'invalid' : ''} value={responsibleCpf} onChange={(e) => setResponsibleCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" />
                            {responsibleCpfInvalid && <small className="field-error">CPF inválido. Confira os 11 dígitos e os dígitos verificadores.</small>}
                          </label>
                          <label>E-mail do responsável
                            <input required type="email" className={responsibleEmailInvalid ? 'invalid' : ''} value={responsibleEmail} onChange={(e) => setResponsibleEmail(e.target.value)} placeholder="responsavel@exemplo.demo" />
                            {responsibleEmailInvalid && <small className="field-error">Informe um endereço de e-mail válido.</small>}
                          </label>
                          <label>Telefone do responsável
                            <input required inputMode="tel" maxLength={15} className={responsiblePhoneInvalid ? 'invalid' : ''} value={responsiblePhone} onChange={(e) => setResponsiblePhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                            {responsiblePhoneInvalid && <small className="field-error">Informe DDD + telefone, com 10 ou 11 dígitos.</small>}
                          </label>
                        </>
                      )}
                    </div>

                    {minorStatus === true && (
                      <div className="warning-note"><AlertTriangle size={18} /><span>A autorização não será geral. Ao solicitar a inscrição em cada competição, o SERFES gerará um termo específico com os dados do atleta, do responsável e daquele evento para assinatura.</span></div>
                    )}

                    {athleteBirthDate && minorStatus === false && (
                      <div className="login-highlight"><CheckCircle2 size={18} /><span>O atleta possui 18 anos ou mais. Os dados do responsável legal não são exigidos.</span></div>
                    )}
                  </section>

                  <section className="glass-card form-section">
                    <div className="form-section-title"><div className="icon-box"><FileText size={20} /></div><div><h4>Documentos</h4><p>Área demonstrativa para futura conferência documental.</p></div></div>
                    <div className="document-grid">
                      <div className="document-item"><FileText size={18} /><div><strong>Documento de identificação</strong><span>Não anexado</span></div></div>
                      <div className="document-item"><FileText size={18} /><div><strong>Comprovante de vínculo escolar</strong><span>Não anexado</span></div></div>
                      {minorStatus === true && <div className="document-item"><FileSignature size={18} /><div><strong>Autorizações por competição</strong><span>Serão geradas na inscrição de cada evento</span></div></div>}
                    </div>
                    <p className="prototype-note">O envio real de documentos e a assinatura eletrônica serão habilitados somente após a definição do armazenamento seguro e da integração institucional correspondente.</p>
                  </section>

                  <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => setDashboardSection(isAthlete ? 'athleteHome' : 'athletes')}>Cancelar</button>
                    <button type="submit" className="primary-button"><CheckCircle2 size={17} /> Salvar cadastro demonstrativo</button>
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
