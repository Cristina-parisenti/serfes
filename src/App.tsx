import { Trophy, Users, School, ShieldCheck, CalendarDays, BarChart3 } from 'lucide-react';

const cards = [
  { title: 'Competições', text: 'Cadastrar, acompanhar e homologar competições oficiais.', icon: Trophy },
  { title: 'Atletas', text: 'Gerenciar participantes, vínculos, documentos e histórico.', icon: Users },
  { title: 'Escolas', text: 'Validar estudantes e acompanhar competições escolares.', icon: School },
  { title: 'Integridade', text: 'Acessar orientações, denúncias e solicitações de apoio.', icon: ShieldCheck },
  { title: 'Calendário', text: 'Consultar eventos, inscrições e etapas competitivas.', icon: CalendarDays },
  { title: 'Indicadores', text: 'Visualizar dados consolidados para apoio à gestão pública.', icon: BarChart3 },
];

export function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Sistema Estadual Integrado de Regulação e Fomento aos E-sports</p>
          <h1>SERFES</h1>
        </div>
        <button className="login-button">Entrar</button>
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

      <footer>
        SERFES • Protótipo inicial
      </footer>
    </div>
  );
}
