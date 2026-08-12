import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  School,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';

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

function EsportsSymbol() {
  return (
    <div className="esports-symbol" aria-hidden="true">
      <div className="esports-symbol-inner">
        <Gamepad2 size={23} />
      </div>
    </div>
  );
}

export function App() {
  const [view, setView] = useState<'home' | 'login' | 'dashboard'>('home');
  const [profile, setProfile] = useState(profiles[0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setView('dashboard');
  }

  if (view === 'login') {
    return (
      <div className="login-page">
        <header className="simple-header">
          <button className="ghost-button" onClick={() => setView('home')}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="brand-cluster">
            <EsportsSymbol />
            <div>
              <p className="eyebrow">Sistema Estadual Integrado de Regulação e Fomento aos E-sports</p>
              <h1 className="brand-title">SERFES</h1>
            </div>
          </div>
        </header>

        <main className="login-layout">
          <section className="glass-card intro-card">
            <span className="pill">Acesso restrito</span>
            <h2>Acesse o SERFES</h2>
            <p>
              Utilize suas credenciais para acessar as funcionalidades disponíveis ao seu perfil.
              Nesta fase do protótipo, utilize somente informações fictícias.
            </p>
            <div className="login-highlight">
              <ShieldCheck size={20} />
              <span>Ambiente de testes preparado para os próximos módulos do sistema.</span>
            </div>
          </section>

          <form className="glass-card form-card" onSubmit={handleLogin}>
            <div className="icon-box"><UserRound size={22} /></div>
            <h3>Entrar no sistema</h3>
            <p className="muted">Selecione seu perfil e informe as credenciais demonstrativas.</p>

            <label>
              Perfil de acesso
              <select value={profile} onChange={(event) => setProfile(event.target.value)}>
                {profiles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              E-mail
              <input
                type="email"
                placeholder="usuario@serfes.demo"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                placeholder="Digite uma senha fictícia"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

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
            <div>
              <p className="eyebrow eyebrow-light">Painel administrativo</p>
              <h2 className="sidebar-title">SERFES</h2>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button className="nav-item active"><LayoutDashboard size={18} /> Visão geral</button>
            <button className="nav-item"><Trophy size={18} /> Competições</button>
            <button className="nav-item"><Users size={18} /> Atletas</button>
            <button className="nav-item"><School size={18} /> Escolas</button>
            <button className="nav-item"><ShieldCheck size={18} /> Integridade</button>
            <button className="nav-item"><BarChart3 size={18} /> Indicadores</button>
          </nav>

          <button className="sidebar-exit" onClick={() => setView('home')}>
            <LogOut size={17} /> Sair
          </button>
        </aside>

        <div className="dashboard-main-shell">
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">Área restrita • demonstração</p>
              <h2>Olá, {profile}</h2>
            </div>
            <div className="header-tools">
              <label className="search-box">
                <Search size={16} />
                <input type="text" placeholder="Pesquisar no sistema" />
              </label>
              <button className="icon-button" aria-label="Notificações">
                <Bell size={18} />
              </button>
            </div>
          </header>

          <main className="dashboard-content">
            <section className="hero-panel">
              <div>
                <span className="pill">Perfil selecionado</span>
                <h3>{profile}</h3>
                <p>Layout-base para cadastros, painéis e rotinas principais do SERFES.</p>
              </div>
              <button className="primary-button">Novo registro</button>
            </section>

            <section className="stats-grid">
              <article className="stat-card featured"><span>Competições</span><strong>12</strong><small>+3 neste mês</small></article>
              <article className="stat-card"><span>Atletas</span><strong>248</strong><small>18 pendências</small></article>
              <article className="stat-card"><span>Escolas</span><strong>57</strong><small>9 em validação</small></article>
              <article className="stat-card"><span>Municípios</span><strong>21</strong><small>4 aderentes recentes</small></article>
            </section>

            <section className="panel-grid">
              <article className="glass-card panel-card">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Ações rápidas</p>
                    <h4>Atalhos principais</h4>
                  </div>
                </div>
                <button className="line-action"><span>Cadastrar competição</span><ChevronRight size={16} /></button>
                <button className="line-action"><span>Adicionar atleta</span><ChevronRight size={16} /></button>
                <button className="line-action"><span>Validar escola</span><ChevronRight size={16} /></button>
              </article>

              <article className="glass-card panel-card">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Agenda</p>
                    <h4>Próximos eventos</h4>
                  </div>
                </div>
                <div className="list-card"><strong>18/08</strong><span>Prazo de inscrições dos Jogos Escolares</span></div>
                <div className="list-card"><strong>22/08</strong><span>Reunião com organizadores</span></div>
                <div className="list-card"><strong>29/08</strong><span>Homologação de resultados</span></div>
              </article>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="brand-cluster">
          <EsportsSymbol />
          <div>
            <p className="eyebrow">Sistema Estadual Integrado de Regulação e Fomento aos E-sports</p>
            <h1 className="brand-title">SERFES</h1>
          </div>
        </div>
        <div className="header-actions">
          <button className="secondary-button">Portal público</button>
          <button className="primary-button" onClick={() => setView('login')}>Entrar</button>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="glass-card hero-card">
            <span className="pill">Plataforma pública estadual</span>
            <h2>Sistema Estadual Integrado de Regulação e Fomento aos E-sports</h2>
            <p>
              Ambiente integrado para competições, atletas, escolas, organizadores, integridade,
              legislação e indicadores do setor.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => setView('login')}>Acessar sistema</button>
              <button className="secondary-button">Conhecer módulos</button>
            </div>
          </div>

          <div className="side-stack">
            <div className="glass-card dark-card">
              <div className="card-row">
                <span className="eyebrow eyebrow-light">Visão geral</span>
                <Gamepad2 size={18} />
              </div>
              <div className="metric"><strong>12</strong><span>competições ativas</span></div>
              <div className="metric"><strong>248</strong><span>atletas monitorados</span></div>
              <div className="metric"><strong>21</strong><span>municípios participantes</span></div>
            </div>

            <div className="glass-card summary-card">
              <p className="eyebrow">Acesso e informação</p>
              <h3>Um ambiente único para consulta e gestão</h3>
              <p className="muted">
                Consulte informações públicas do setor e acesse a área restrita para realizar as rotinas de gestão do SERFES.
              </p>
            </div>
          </div>
        </section>

        <section className="module-section">
          <div className="section-head">
            <p className="eyebrow">Estrutura do sistema</p>
            <h3>Módulos principais</h3>
            <p className="muted">Funcionalidades centrais previstas para a primeira versão do SERFES.</p>
          </div>
          <div className="module-grid">
            {modules.map(([title, text, Icon]) => (
              <article key={title} className="glass-card module-card">
                <div className="icon-box"><Icon size={20} /></div>
                <h4>{title}</h4>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">SERFES • Sistema Estadual Integrado de Regulação e Fomento aos E-sports</footer>
    </div>
  );
}
