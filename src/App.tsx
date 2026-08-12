import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  School,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';

const cards = [
  { title: 'Competições', text: 'Cadastrar, acompanhar e homologar competições oficiais.', icon: Trophy },
  { title: 'Atletas', text: 'Gerenciar participantes, vínculos, documentos e histórico.', icon: Users },
  { title: 'Escolas', text: 'Validar estudantes e acompanhar competições escolares.', icon: School },
  { title: 'Integridade', text: 'Acessar orientações, denúncias e solicitações de apoio.', icon: ShieldCheck },
  { title: 'Calendário', text: 'Consultar eventos, inscrições e etapas competitivas.', icon: CalendarDays },
  { title: 'Indicadores', text: 'Visualizar dados consolidados para apoio à gestão pública.', icon: BarChart3 },
];

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

export function App() {
  const [view, setView] = useState<'home' | 'login' | 'demo'>('home');
  const [profile, setProfile] = useState('Administrador estadual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setView('demo');
  }

  if (view === 'login') {
    return (
      <div className="login-page">
        <header className="login-header">
          <button className="back-button" onClick={() => setView('home')}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="brand-compact">
            <p className="eyebrow">Sistema Estadual Integrado de Regulação e Fomento aos E-sports</p>
            <strong>SERFES</strong>
          </div>
        </header>

        <main className="login-main">
          <section className="login-intro">
            <span className="tag">Área restrita</span>
            <h2>Acesse o SERFES</h2>
            <p>
              Escolha o perfil de acesso e informe suas credenciais. Nesta etapa do protótipo,
              o login é apenas demonstrativo e não utiliza dados reais.
            </p>
            <div className="security-note">
              <ShieldCheck size={20} />
              <span>Use somente informações fictícias durante os testes.</span>
            </div>
          </section>

          <form className="login-card" onSubmit={handleLogin}>
            <div className="login-card-icon"><UserRound size={24} /></div>
            <h3>Identificação do usuário</h3>

            <label>
              Perfil de acesso
              <select value={profile} onChange={(event) => setProfile(event.target.value)}>
                {profiles.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <label>
              E-mail
              <input
                type="email"
                placeholder="usuario@exemplo.com"
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

            <button className="primary login-submit" type="submit">Entrar no sistema</button>
            <button className="text-button" type="button">Esqueci minha senha</button>
          </form>
        </main>
      </div>
    );
  }

  if (view === 'demo') {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Área restrita • acesso demonstrativo</p>
            <h1>SERFES</h1>
          </div>
          <button className="login-button" onClick={() => setView('home')}>Sair</button>
        </header>
        <main className="demo-dashboard">
          <section className="welcome-card">
            <span className="tag">Perfil selecionado</span>
            <h2>{profile}</h2>
            <p>Login demonstrativo realizado com sucesso. O próximo passo será criar o painel específico deste perfil.</p>
          </section>
        </main>
        <footer>SERFES • Protótipo inicial</footer>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Sistema Estadual Integrado de Regulação e Fomento aos E-sports</p>
          <h1>SERFES</h1>
        </div>
        <button className="login-button" onClick={() => setView('login')}>Entrar</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="tag">Plataforma pública estadual</span>
            <h2>Governança, organização e fomento responsável aos e-sports.</h2>
            <p>
              Ambiente integrado para competições, participantes, escolas, organizadores,
              formação, integridade, legislação e indicadores do setor.
            </p>
            <div className="hero-actions">
              <button className="primary">Ver competições</button>
              <button className="secondary">Conhecer o sistema</button>
            </div>
          </div>
          <div className="hero-panel">
            <p className="panel-label">Visão geral</p>
            <div className="stat"><strong>0</strong><span>competições cadastradas</span></div>
            <div className="stat"><strong>0</strong><span>atletas registrados</span></div>
            <div className="stat"><strong>0</strong><span>municípios participantes</span></div>
          </div>
        </section>

        <section className="modules">
          <div className="section-heading">
            <p className="eyebrow">Primeira versão</p>
            <h3>Módulos principais</h3>
          </div>
          <div className="grid">
            {cards.map(({ title, text, icon: Icon }) => (
              <article className="card" key={title}>
                <div className="icon-wrap"><Icon size={22} /></div>
                <h4>{title}</h4>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer>SERFES • Protótipo inicial</footer>
    </div>
  );
}
