// Coque de l'app pour les captures du site vitrine.
//
// Les captures en ligne dataient d'une version antérieure : barre latérale en
// emojis, Tilt encore sous « Performance », une section « Réseau » qui n'existe
// plus et aucune trace des Tournois. Cette coque reprend NAV_SECTIONS tel quel,
// donc elle vieillit avec l'app plutôt que contre elle.
//
// Voir site-shots.jsx pour la procédure de capture.
import {
  AlarmClock, Angry, BarChart3, BookOpen, Brain, ChevronDown, Clapperboard, Coins,
  Dices, Flame, Gem, Handshake, LogOut, Map, MessageCircle, Puzzle as PuzzleIcon,
  Signal, Target, TrendingUp, Trophy, UserRound, Users, Wallet,
} from 'lucide-react';
import logoText from '../../src/assets/logo-text.png';

// Copie conforme de NAV_SECTIONS dans src/renderer/App.jsx, libellés résolus.
export const NAV_SECTIONS = [
  {
    label: 'Performance',
    tabs: [
      { id: 'stats', label: 'Stats', icon: BarChart3 },
      { id: 'forme', label: 'Perf & Forme', icon: AlarmClock },
      { id: 'heatmap', label: 'Heatmap', icon: Flame },
      { id: 'analyse', label: 'Analyse', icon: Brain },
      { id: 'social', label: 'Coéquipiers & Rivaux', icon: Handshake },
      { id: 'graphiques', label: 'Graphiques', icon: TrendingUp },
    ],
  },
  {
    label: 'Mon compte',
    tabs: [
      { id: 'my-hall-of-fame', label: 'Mon Hall of Fame', icon: Trophy },
      { id: 'my-social', label: 'Mes coéquipiers & rivaux', icon: Handshake },
      { id: 'my-skins-collection', label: 'Ma collection', icon: Gem },
      { id: 'tilt', label: 'Tilt', icon: Angry },
      { id: 'reseau', label: 'Réseau', icon: Signal },
    ],
  },
  {
    label: 'Tournois',
    tabs: [{ id: 'tournaments', label: 'Tournois', icon: Trophy, badge: 1 }],
  },
  {
    label: 'Entraînement',
    tabs: [
      { id: 'session', label: 'Session guidée', icon: Clapperboard },
      { id: 'aim-trainer', label: 'Aim Trainer', icon: Target },
      { id: 'puzzle', label: 'Puzzle du jour', icon: Dices },
      { id: 'bets', label: 'Paris perso', icon: Coins },
    ],
  },
  {
    label: 'Outils',
    tabs: [
      { id: 'crosshairs', label: 'Crosshairs', icon: Target },
      { id: 'strategie', label: 'Stratégie', icon: Map },
      { id: 'skins', label: 'Skins', icon: Gem },
      { id: 'composition', label: 'Composition', icon: PuzzleIcon },
      { id: 'buy-simulator', label: "Simulation d'achat", icon: Wallet },
      { id: 'wiki', label: 'Wiki', icon: BookOpen },
    ],
  },
];

const ALL_TABS = NAV_SECTIONS.flatMap((s) => s.tabs);

// Le joueur de démonstration. Un profil crédible plutôt qu'un compte réel :
// les captures partent sur un site public et dans un dossier de candidature.
export const PLAYER = { name: 'Vyn', tag: '4021', tier: 'Ascendant 2', tierColor: '#84ff9a' };

const B = ({ v = 'ghost', c = '', children, ...p }) => (
  <button type="button" className={['btn', `btn-${v}`, c].filter(Boolean).join(' ')} {...p}>
    {children}
  </button>
);

const DiscordGlyph = () => (
  <svg viewBox="0 0 127.14 96.36" width="18" height="18" aria-hidden="true">
    <path
      fill="currentColor"
      d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
    />
  </svg>
);

// Mon compte, Amis et Messages s'ouvrent depuis la barre du haut, pas depuis
// la barre laterale : ils ont un titre mais aucun onglet a surligner.
const TOPBAR_VIEWS = {
  compte: { label: 'Mon compte', icon: UserRound },
};

export default function AppShell({ tab, title, children }) {
  const meta = TOPBAR_VIEWS[title] ?? ALL_TABS.find((t) => t.id === tab);
  const TitleIcon = meta?.icon;

  return (
    <div className="app app-with-sidebar">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <img src={logoText} alt="MVP Tracker" />
        </div>

        <div className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="sidebar-section">
              <B c="sidebar-section-label">
                {section.label}
                <span className="sidebar-section-chevron">
                  <ChevronDown size={14} strokeWidth={1.75} />
                </span>
              </B>
              {section.tabs.map((t) => (
                <B key={t.id} c={t.id === tab ? 'sidebar-link active' : 'sidebar-link'}>
                  <span className="sidebar-link-icon">
                    <t.icon size={20} strokeWidth={2} />
                  </span>
                  {t.label}
                  {t.badge && <span className="sidebar-link-badge">{t.badge}</span>}
                </B>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <B c="sidebar-profile">
            <div className="sidebar-profile-avatar">
              <span>{PLAYER.name.charAt(0)}</span>
            </div>
            <div className="sidebar-profile-info">
              <div className="sidebar-profile-name">
                {PLAYER.name}
                <span className="profile-tag">
                  <span className="profile-tag-hash">#</span>
                  {PLAYER.tag}
                </span>
              </div>
              <div className="sidebar-profile-rank" style={{ color: PLAYER.tierColor }}>
                <span>{PLAYER.tier}</span>
              </div>
            </div>
          </B>
          <B v="icon" c="sidebar-signout">
            <LogOut size={16} strokeWidth={1.75} />
          </B>
        </div>
      </nav>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-title-icon">{TitleIcon && <TitleIcon size={18} strokeWidth={1.75} />}</span>
            <h2>{meta?.label}</h2>
          </div>

          <form className="search-bar">
            <div className="search-bar-riotid">
              <input value={PLAYER.name} readOnly />
              <span className="search-bar-hash">#</span>
              <input className="search-bar-tag" value={PLAYER.tag} readOnly />
            </div>
            <B v="primary" c="refresh">Rechercher</B>
          </form>

          <div className="topbar-group topbar-group-actions">
            <B v="primary" c="refresh">Rafraîchir</B>
            <B v="accent" c="aim-topbar-button">
              <span className="aim-topbar-icon"><Target size={16} strokeWidth={1.75} /></span>
              <span>Aim Trainer</span>
            </B>
          </div>

          <div className="topbar-group">
            <B c="discord-button"><DiscordGlyph /><span>Discord</span></B>
            <B c="topbar-lang"><span className="topbar-lang-label">EN</span></B>
          </div>

          <div className="topbar-group">
            <B v="icon" c="topbar-icon-button">
              <MessageCircle size={18} strokeWidth={1.75} />
              <span className="topbar-icon-badge">2</span>
            </B>
            <B v="icon" c="topbar-icon-button">
              <Users size={18} strokeWidth={1.75} />
              <span className="topbar-icon-dot" />
            </B>
            <B v="icon" c="topbar-account-button">
              <span>{PLAYER.name.charAt(0)}</span>
            </B>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
