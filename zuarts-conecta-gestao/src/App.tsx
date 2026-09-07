export function App() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 320 320" role="img" aria-label="Zuarts Inova Simples">
            <defs>
              <linearGradient id="zuarts-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2b6fe8" />
                <stop offset="100%" stopColor="#0b2e86" />
              </linearGradient>
              <linearGradient id="zuarts-green" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#b8e41a" />
                <stop offset="100%" stopColor="#91cd00" />
              </linearGradient>
            </defs>
            <path d="M70 30H250L210 70H70Z" fill="url(#zuarts-blue)" />
            <path d="M250 30V88L184 154L150 120L190 80L170 60H250Z" fill="url(#zuarts-blue)" />
            <path d="M70 290H250V230H118L70 178Z" fill="url(#zuarts-blue)" />
            <path d="M70 290V218L118 170L152 204L112 244L132 264H70Z" fill="url(#zuarts-blue)" />
            <path
              d="M76 122H160L194 156H244"
              fill="none"
              stroke="url(#zuarts-green)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M56 160H142L176 194H222"
              fill="none"
              stroke="url(#zuarts-green)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="72" cy="122" r="18" fill="#e4f95b" stroke="#8fc900" strokeWidth="10" />
            <circle cx="244" cy="156" r="18" fill="#e4f95b" stroke="#8fc900" strokeWidth="10" />
            <circle cx="56" cy="160" r="18" fill="#e4f95b" stroke="#8fc900" strokeWidth="10" />
            <circle cx="222" cy="194" r="18" fill="#e4f95b" stroke="#8fc900" strokeWidth="10" />
          </svg>
          <div className="brand-copy">
            <p className="eyebrow">ZUARTS SISTEMA DE GESTÃO</p>
            <h1>Zuarts Inova Simples.</h1>
            <p className="lead">
              Base responsiva com identidade própria, preparada para crescer como web app e PWA.
            </p>
          </div>
        </div>
        <div className="cards">
          <article>
            <h2>Web</h2>
            <p>Interface inicial com a marca ajustada para telas pequenas e grandes.</p>
          </article>
          <article>
            <h2>API</h2>
            <p>Health check simples para validar a base do serviço.</p>
          </article>
          <article>
            <h2>Qualidade</h2>
            <p>Scripts prontos para build, lint, type-check e teste.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
