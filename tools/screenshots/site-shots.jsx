// Scènes de capture pour le site vitrine. Trois écrans de l'app n'avaient
// aucune capture dans mvp-tracker-site/public/assets/screens/ : l'overlay de
// sélection d'agent, le bracket de tournoi et le double check post-match.
//
// Le balisage est recopié à l'identique depuis AgentSelectOverlay.jsx,
// BracketView.jsx et PostMortemModal.jsx, avec des données représentatives,
// et la vraie feuille de style de l'app. On obtient donc le rendu exact sans
// avoir besoin d'un compte Riot ni d'un historique de matchs.
//
// Sert à REGÉNÉRER ces trois captures quand le style de l'app bouge :
//   npx vite --config vite.renderer.config.mjs --port 5189 .
//   puis capturer #shot-overlay, #shot-bracket et #shot-postmatch depuis
//   http://localhost:5189/tools/screenshots/site-shots.html
// et déposer le résultat en .webp dans mvp-tracker-site/public/assets/screens/
// sous les noms agentselect.webp, tournois.webp et postmatch.webp.
import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-600.css';
import '@fontsource/chakra-petch/latin-700.css';
import '@fontsource-variable/inter';
import '../../src/index.css';
import { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle2, Minus, ScanFace, XCircle } from 'lucide-react';

// Mêmes icônes que l'app : le displayIcon de valorant-api.com, la source que
// agentIcons.js interroge déjà. La capture montre donc exactement ce que le
// joueur voit, et pas un rendu pied-à-tête recadré à la louche.
function useAgentIcons() {
  const [icons, setIcons] = useState(new Map());
  useLayoutEffect(() => {
    fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=fr-FR')
      .then((r) => r.json())
      .then((j) => setIcons(new Map(j.data.map((a) => [a.displayName, a.displayIcon]))));
  }, []);
  return icons;
}

/* ------------------------------------------------------------------ overlay */

const TIERS = {
  ascendant2: { name: 'Ascendant 2', color: '#84ff9a' },
  diamond1: { name: 'Diamant 1', color: '#c497fa' },
  platinum3: { name: 'Platine 3', color: '#4fd0c1' },
  immortal1: { name: 'Immortel 1', color: '#ff5a76' },
  gold2: { name: 'Or 2', color: '#ecc35b' },
};

const SQUAD = [
  { agent: 'Jett', tier: 'ascendant2', locked: true, me: true },
  { agent: 'Omen', tier: 'diamond1', locked: true },
  { agent: 'Sage', tier: 'platinum3', locked: true },
  { agent: null, tier: 'immortal1' },
  { agent: 'Raze', tier: 'gold2', locked: true },
];

const SUGGESTIONS = [
  { agent: 'Neon', detail: '64 % de victoires avec toi (28 matchs)' },
  { agent: 'Chamber', detail: 'recommandé par la communauté' },
  { agent: 'Phoenix', detail: 'rôle manquant' },
];

function OverlayPlayer({ p, icons }) {
  const tier = TIERS[p.tier];
  return (
    <div className={`overlay-agent-select-player ${p.locked ? 'locked' : ''} ${p.me ? 'me' : ''}`}>
      <div className="overlay-agent-select-avatar">
        {p.agent ? <img src={icons.get(p.agent)} alt="" /> : <span>?</span>}
      </div>
      <div className="overlay-agent-select-info">
        <span className="overlay-agent-select-agent">{p.agent ?? 'Choisit…'}</span>
        <span className="overlay-agent-select-rank" style={{ color: tier.color }}>{tier.name}</span>
      </div>
      {p.me && <span className="overlay-agent-select-you">Toi</span>}
    </div>
  );
}

function Overlay() {
  const icons = useAgentIcons();
  return (
    <div className="overlay-agent-select">
      <div className="overlay-agent-select-head">
        <span className="agent-select-dot" aria-hidden="true" />
        Sélection d’agent en cours
      </div>

      <p className="overlay-agent-select-team-label">Suggestion pour cette map</p>
      {SUGGESTIONS.map((s) => (
        <div key={s.agent} className="overlay-agent-suggestion-row">
          <div className="overlay-agent-select-avatar"><img src={icons.get(s.agent)} alt="" /></div>
          <div className="overlay-agent-select-info">
            <span className="overlay-agent-select-agent">{s.agent}</span>
            <span className="overlay-agent-select-rank">{s.detail}</span>
          </div>
        </div>
      ))}

      <p className="overlay-agent-select-team-label">Ton équipe</p>
      {SQUAD.map((p, i) => <OverlayPlayer key={i} p={p} icons={icons} />)}
    </div>
  );
}

/* ------------------------------------------------------------------ bracket */

const ROUNDS = [
  {
    title: 'Tour 1',
    matches: [
      ['Nova Six', 13, 'Bad Angle', 8],
      ['Sun Tzu Gaming', 11, 'Les Copains', 13],
      ['Spike Rush Club', 13, 'Overtime', 6],
      ['Dernier Round', 9, 'Full Buy', 13],
    ],
  },
  {
    title: 'Demi-finales',
    matches: [
      ['Nova Six', 13, 'Les Copains', 10],
      ['Spike Rush Club', 12, 'Full Buy', 14],
    ],
  },
  { title: 'Finale', matches: [['Nova Six', 13, 'Full Buy', 11]], champion: true },
];

function Bracket() {
  const containerRef = useRef(null);
  const matchRefs = useRef(new Map());
  const [lines, setLines] = useState([]);

  // Même géométrie que BracketView.jsx : trait horizontal jusqu'au milieu,
  // verticale, puis horizontale jusqu'au match suivant.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const box = container.getBoundingClientRect();
    const next = [];
    ROUNDS.forEach((r, round) => {
      if (round >= ROUNDS.length - 1) return;
      r.matches.forEach((_, position) => {
        const from = matchRefs.current.get(`${round}:${position}`);
        const to = matchRefs.current.get(`${round + 1}:${Math.floor(position / 2)}`);
        if (!from || !to) return;
        const f = from.getBoundingClientRect();
        const g = to.getBoundingClientRect();
        const x1 = f.right - box.left;
        const y1 = f.top + f.height / 2 - box.top;
        const x2 = g.left - box.left;
        const y2 = g.top + g.height / 2 - box.top;
        const midX = (x1 + x2) / 2;
        next.push({ key: `${round}:${position}`, d: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}` });
      });
    });
    setLines(next);
  }, []);

  return (
    <div className="bracket" ref={containerRef}>
      <svg className="bracket-lines" aria-hidden="true">
        {lines.map((l) => <path key={l.key} d={l.d} />)}
      </svg>
      {ROUNDS.map((r, round) => (
        <div key={r.title} className="bracket-round">
          <p className="bracket-round-title">{r.title}</p>
          <div className="bracket-round-matches">
            {r.matches.map(([a, sa, b, sb], i) => {
              const aWins = sa > sb;
              return (
                <div
                  key={i}
                  ref={(el) => { if (el) matchRefs.current.set(`${round}:${i}`, el); }}
                  className={`bracket-match decided ${r.champion ? 'champion' : ''}`}
                >
                  <div className={`bracket-team ${aWins ? 'winner' : ''}`}>
                    <span>{a}</span><span className="bracket-score">{sa}</span>
                  </div>
                  <div className={`bracket-team ${aWins ? '' : 'winner'}`}>
                    <span>{b}</span><span className="bracket-score">{sb}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- post-mortem */

const ICONS = { correct: CheckCircle2, close: Minus, incorrect: XCircle };

const RESULTS = [
  {
    state: 'incorrect',
    heading: 'Tu penses avoir bien joué ce match ? › tu as répondu « Non »',
    detail: 'K/D de ce match : 1.42, ta moyenne générale est de 1.08.',
  },
  {
    state: 'correct',
    heading: 'Tu penses avoir gagné tes duels ? › tu as répondu « Oui »',
    detail: '21 kills pour 14 morts ce match.',
  },
  {
    state: 'close',
    heading: 'Tu penses avoir eu une bonne précision (tête) ? › tu as répondu « Moyen »',
    detail: 'Précision tête ce match : 19 %, ta moyenne est de 23 %.',
  },
];

function PostMortem() {
  return (
    <div className="postmortem-modal card" style={{ position: 'static', margin: 0 }}>
      <h3><ScanFace size={18} strokeWidth={1.75} /> Perception vs réalité</h3>
      {RESULTS.map((r) => {
        const I = ICONS[r.state];
        return (
          <div key={r.heading} className={`postmortem-result ${r.state}`}>
            <div className="postmortem-result-title">
              <I size={16} strokeWidth={1.75} /> {r.heading}
            </div>
            <p className="label">{r.detail}</p>
          </div>
        );
      })}
      <div className="postmortem-actions">
        <button className="btn btn-ghost">Plus tard</button>
        <button className="btn btn-primary refresh">Fermer</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- montage */

// Chaque scène dans son propre bloc mesurable : la capture cible l'élément,
// pas la fenêtre, pour maîtriser le cadrage.
function Lab() {
  return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 60 }}>
      <div id="shot-overlay" style={{ width: 320 }}><Overlay /></div>
      <div id="shot-bracket" style={{ width: 'fit-content', padding: '2rem' }}><Bracket /></div>
      {/* 420 px : la largeur réelle de .postmortem-modal, pour que la capture
          cadre la fenêtre et pas du vide à sa droite. */}
      <div id="shot-postmatch" style={{ width: 420 }}><PostMortem /></div>
    </div>
  );
}

document.body.classList.add('in-app');
createRoot(document.getElementById('root')).render(<Lab />);
