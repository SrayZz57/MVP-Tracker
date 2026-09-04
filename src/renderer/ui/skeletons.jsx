import Skeleton, { SkeletonBox, SkeletonCircle, SkeletonText } from './Skeleton.jsx';

const range = (n) => Array.from({ length: n }, (_, i) => i);

const BLANK_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function MatchListShape({ rows = 6 }) {
  return (
    <div className="match-list">
      {range(rows).map((i) => (
        <div key={i} className="match-row is-skeleton">
          <span className="match-info">
            <SkeletonText style={{ width: `${72 - (i % 3) * 9}%` }}>&nbsp;</SkeletonText>
          </span>
          <span className="result-badge is-skeleton">
            <SkeletonText>Victoire</SkeletonText>
          </span>
        </div>
      ))}
    </div>
  );
}

export function StatTilesShape({ count = 3 }) {
  return (
    <div className="stat-tiles">
      {range(count).map((i) => (
        <div key={i} className="stat-tile is-skeleton">
          <div className="value"><SkeletonText>0.00</SkeletonText></div>
          <div className="label"><SkeletonText>Libellé de tuile</SkeletonText></div>
        </div>
      ))}
    </div>
  );
}

export function KpiRowShape({ count = 4 }) {
  return (
    <div className="kpi-row">
      {range(count).map((i) => (
        <div key={i} className="kpi-tile is-skeleton">
          <div className="kpi-tile-icon"><SkeletonBox w={22} h={22} r={6} style={{ margin: '0 auto' }} /></div>
          <div className="kpi-tile-value"><SkeletonText>000</SkeletonText></div>
          <div className="kpi-tile-label"><SkeletonText>Indicateur</SkeletonText></div>
        </div>
      ))}
    </div>
  );
}

export function BarListShape({ rows = 6 }) {
  return (
    <div className="skeleton-bar-list">
      {range(rows).map((i) => (
        <div key={i} className="stat-bar-row">
          <span className="stat-bar-label"><SkeletonText style={{ width: '100%' }}>&nbsp;</SkeletonText></span>
          <span className="stat-bar-track">
            <SkeletonBox h="100%" r={999} style={{ display: 'block', width: `${88 - i * 9}%` }} />
          </span>
          <span className="stat-bar-value"><SkeletonText>00%</SkeletonText></span>
          <span className="stat-bar-meta"><SkeletonText>0 parties</SkeletonText></span>
        </div>
      ))}
    </div>
  );
}

export function LineChartShape() {
  return (
    <div className="line-chart-wrap">
      <SkeletonBox h={240} r="var(--r-md)" style={{ display: 'block', width: '100%' }} />
    </div>
  );
}

export function HeatmapShape({ rows = 7, cols = 4 }) {
  return (
    <div className="heatmap-grid-chart">
      <div className="heatmap-grid-row heatmap-grid-header">
        <span className="heatmap-grid-row-label" />
        {range(cols).map((c) => (
          <span key={c} className="heatmap-grid-col-label"><SkeletonText>Période</SkeletonText></span>
        ))}
      </div>
      {range(rows).map((r) => (
        <div key={r} className="heatmap-grid-row">
          <span className="heatmap-grid-row-label"><SkeletonText>Vendredi</SkeletonText></span>
          {range(cols).map((c) => (
            <span key={c} className="heatmap-grid-cell is-skeleton" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StackedBarShape({ rows = 4 }) {
  return (
    <div className="skeleton-bar-list">
      {range(rows).map((i) => (
        <div key={i} className="stat-bar-row">
          <span className="stat-bar-label"><SkeletonText>Rôle</SkeletonText></span>
          <span className="stat-bar-track">
            <SkeletonBox h="100%" r={999} style={{ display: 'block', width: '100%' }} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function SkinGridShape({ count = 10 }) {
  return (
    <div className="skin-grid">
      {range(count).map((i) => (
        <div key={i} className="skin-card is-skeleton">
          <div className="skin-card-img-wrap skeleton">
            <img src={BLANK_PIXEL} alt="" />
          </div>
          <p className="skin-card-name"><SkeletonText>Nom du skin</SkeletonText></p>
          <span className="skin-card-price is-skeleton"><SkeletonText>0000 VP</SkeletonText></span>
        </div>
      ))}
    </div>
  );
}

export function FriendListShape({ rows = 5, avatar = 36 }) {
  return (
    <div className="friend-list">
      {range(rows).map((i) => (
        <div key={i} className="friend-request-row">
          <SkeletonCircle size={avatar} />
          <span><SkeletonText style={{ width: `${58 - (i % 3) * 11}%` }}>&nbsp;</SkeletonText></span>
        </div>
      ))}
    </div>
  );
}

export function LeaderboardShape({ rows = 8 }) {
  return (
    <div className="skeleton-board">
      {range(rows).map((i) => (
        <div key={i} className="aim-board-row">
          <span className="aim-board-rank"><SkeletonText>00</SkeletonText></span>
          <SkeletonCircle size={26} />
          <span className="aim-board-name">
            <SkeletonText style={{ width: `${62 - (i % 3) * 12}%` }}>&nbsp;</SkeletonText>
          </span>
          <span className="aim-board-score"><SkeletonText>0000</SkeletonText></span>
        </div>
      ))}
    </div>
  );
}

export function MessageThreadShape({ rows = 6 }) {
  return (
    <>
      {range(rows).map((i) => (
        <div key={i} className={i % 3 === 1 ? 'message-bubble mine is-skeleton' : 'message-bubble is-skeleton'}>
          <SkeletonText style={{ width: `${9 - (i % 4) * 2}rem` }}>&nbsp;</SkeletonText>
        </div>
      ))}
    </>
  );
}

export function IconGridShape({ count = 24 }) {
  return (
    <div className="card-picker-grid">
      {range(count).map((i) => (
        <span key={i} className="card-picker-item is-skeleton">
          <SkeletonBox h="100%" style={{ display: 'block', width: '100%', borderRadius: 0 }} />
        </span>
      ))}
    </div>
  );
}

export function TrophyGridShape({ count = 4 }) {
  return (
    <div className="trophy-grid">
      {range(count).map((i) => (
        <div key={i} className="trophy-card is-skeleton" />
      ))}
    </div>
  );
}

export function ProfileHeaderShape() {
  return (
    <div className="card profile-header-card is-skeleton">
      <div className="profile-header-overlay">
        <SkeletonBox w={76} h={76} r={12} style={{ flexShrink: 0 }} />
        <div className="profile-header-info">
          <h2><SkeletonText>Joueur#0000</SkeletonText></h2>
          <div className="profile-rank-block">
            <div className="profile-rank-row">
              <SkeletonBox w={44} h={44} r={8} />
              <SkeletonText>Immortel 3</SkeletonText>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardStackShape({ rows = 3, height = 132 }) {
  return (
    <div className="skeleton-card-stack">
      {range(rows).map((i) => (
        <SkeletonBox key={i} h={height} r="var(--r-lg)" style={{ display: 'block', width: '100%' }} />
      ))}
    </div>
  );
}

export function TextBlockShape({ lines = 3 }) {
  return (
    <div className="skeleton-text-block">
      {range(lines).map((i) => (
        <p key={i} className="label"><SkeletonText style={{ width: `${88 - i * 13}%` }}>&nbsp;</SkeletonText></p>
      ))}
    </div>
  );
}

export function FormShape({ fields = 2 }) {
  return (
    <div className="skeleton-form">
      {range(fields).map((i) => (
        <SkeletonBox key={i} h="var(--control-h)" r="var(--r-sm)" style={{ display: 'block', width: '100%' }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ title, children, className = '' }) {
  return (
    <div className={`card ${className}`.trim()}>
      <div className="collapsible-card-header"><h3><SkeletonText>{title}</SkeletonText></h3></div>
      <div className="collapsible-card-body">{children}</div>
    </div>
  );
}

export function StatsTabSkeleton() {
  return (
    <Skeleton>
      <ProfileHeaderShape />
      <SkeletonCard title="Statistiques globales"><StatTilesShape count={4} /></SkeletonCard>
      <SkeletonCard title="Historique des parties"><MatchListShape rows={8} /></SkeletonCard>
    </Skeleton>
  );
}

export function FormTabSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard title="Forme récente"><StatTilesShape count={3} /></SkeletonCard>
      <SkeletonCard title="Meilleur moment pour jouer"><StatTilesShape count={2} /></SkeletonCard>
      <SkeletonCard title="Créneaux horaires"><BarListShape rows={5} /></SkeletonCard>
    </Skeleton>
  );
}

export function TiltTabSkeleton() {
  return (
    <Skeleton>
      <div className="card tilt-card calm is-skeleton">
        <div className="tilt-card-header">
          <SkeletonCircle size={40} />
          <div className="skeleton-grow">
            <h3><SkeletonText>État de forme</SkeletonText></h3>
            <p><SkeletonText style={{ width: '62%' }}>&nbsp;</SkeletonText></p>
          </div>
        </div>
      </div>
      <SkeletonCard title="Résultats récents">
        <div className="streak-dots">
          {range(10).map((i) => <SkeletonCircle key={i} size={22} />)}
        </div>
      </SkeletonCard>
      <SkeletonCard title="Fréquence du tilt"><BarListShape rows={4} /></SkeletonCard>
    </Skeleton>
  );
}

export function ChartsTabSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard title="Indicateurs clés"><KpiRowShape /></SkeletonCard>
      <SkeletonCard title="Créneaux de la semaine"><HeatmapShape /></SkeletonCard>
      <div className="chart-grid-2">
        <SkeletonCard title="Tendance K/D"><LineChartShape /></SkeletonCard>
        <SkeletonCard title="Tendance winrate"><LineChartShape /></SkeletonCard>
      </div>
      <SkeletonCard title="Winrate par carte"><BarListShape rows={7} /></SkeletonCard>
      <SkeletonCard title="Répartition des rôles"><StackedBarShape /></SkeletonCard>
    </Skeleton>
  );
}

export function AnalyseTabSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard title="Timing des morts"><BarListShape rows={4} /></SkeletonCard>
      <SkeletonCard title="Distance des duels"><StatTilesShape count={3} /></SkeletonCard>
      <SkeletonCard title="Répartition par distance"><BarListShape rows={4} /></SkeletonCard>
    </Skeleton>
  );
}

export function BuySimulatorSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard title="Analyse des rounds"><BarListShape rows={4} /></SkeletonCard>
      <SkeletonCard title="Calculateur d’achat"><StatTilesShape count={3} /></SkeletonCard>
    </Skeleton>
  );
}

export function HallOfFameSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard title="Panthéon"><TextBlockShape lines={1} /></SkeletonCard>
      <TrophyGridShape count={4} />
    </Skeleton>
  );
}

export function TeammatesRivalsSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard title="Synergie">
        <div className="synergy-graph-wrap">
          <SkeletonBox w={420} h={420} r="50%" style={{ maxWidth: '100%' }} />
        </div>
      </SkeletonCard>
      <div className="nemesis-columns">
        <SkeletonCard title="Agents bêtes noires"><BarListShape rows={6} /></SkeletonCard>
        <SkeletonCard title="Joueurs bêtes noires"><BarListShape rows={6} /></SkeletonCard>
      </div>
    </Skeleton>
  );
}

export function SessionGuideSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard title="Guide de session"><TextBlockShape lines={2} /></SkeletonCard>
      <SkeletonCard title="Checklist">
        <div className="session-checklist">
          {range(5).map((i) => (
            <div key={i} className="session-check-item is-skeleton">
              <SkeletonCircle size={28} />
              <span className="session-check-body">
                <span className="session-check-title">
                  <SkeletonText style={{ width: `${56 - i * 6}%` }}>&nbsp;</SkeletonText>
                </span>
                <span className="session-check-detail">
                  <SkeletonText style={{ width: `${82 - i * 7}%` }}>&nbsp;</SkeletonText>
                </span>
              </span>
            </div>
          ))}
        </div>
      </SkeletonCard>
    </Skeleton>
  );
}

export function PuzzleSkeleton() {
  return (
    <Skeleton>
      <StatTilesShape count={5} />
      <div className="skeleton-choice-row">
        {range(3).map((i) => (
          <SkeletonBox key={i} h="var(--control-h)" r="var(--r-sm)" style={{ display: 'block', flex: 1 }} />
        ))}
      </div>
    </Skeleton>
  );
}

export function BetSkeleton() {
  return (
    <Skeleton>
      <div className="tilt-card-header">
        <SkeletonCircle size={34} />
        <div className="skeleton-grow">
          <h3><SkeletonText>Pari en cours</SkeletonText></h3>
          <p><SkeletonText style={{ width: '54%' }}>&nbsp;</SkeletonText></p>
        </div>
      </div>
    </Skeleton>
  );
}

export function SkinsCatalogSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard title="Catalogue des skins">
        <FormShape fields={1} />
        <SkinGridShape count={10} />
      </SkeletonCard>
    </Skeleton>
  );
}

export function MySkinsSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard title="Ma collection"><SkinGridShape count={8} /></SkeletonCard>
    </Skeleton>
  );
}

export function FriendsPageSkeleton() {
  return (
    <Skeleton className="friends-page">
      <SkeletonCard title="Ajouter un ami"><FormShape fields={1} /></SkeletonCard>
      <SkeletonCard title="Mes amis"><FriendListShape rows={6} /></SkeletonCard>
    </Skeleton>
  );
}

export function MessagesPageSkeleton() {
  return (
    <Skeleton className="messages-page-skeleton">
      <div className="messages-sidebar card">
        <h3><SkeletonText>Conversations</SkeletonText></h3>
        <FriendListShape rows={6} avatar={30} />
      </div>
      <div className="messages-thread card">
        <div className="messages-thread-body"><MessageThreadShape rows={5} /></div>
      </div>
    </Skeleton>
  );
}

export function TournamentListSkeleton({ rows = 3 }) {
  return (
    <Skeleton>
      <CardStackShape rows={rows} height={150} />
    </Skeleton>
  );
}

export function TournamentDetailSkeleton() {
  return (
    <Skeleton>
      <SkeletonBox h={92} r="var(--r-lg)" style={{ display: 'block', width: '100%' }} />
      <SkeletonCard title="Équipes inscrites"><FriendListShape rows={5} /></SkeletonCard>
      <SkeletonCard title="Arbre du tournoi"><CardStackShape rows={2} height={110} /></SkeletonCard>
    </Skeleton>
  );
}

export function IconPickerSkeleton() {
  return (
    <Skeleton>
      <IconGridShape count={24} />
    </Skeleton>
  );
}

export function FriendPreviewSkeleton() {
  return (
    <Skeleton>
      <div className="friend-summary-stats">
        <div className="friend-summary-stat friend-summary-stat-rank">
          <SkeletonBox w={38} h={38} r={8} />
          <div className="friend-summary-stat-text">
            <span className="value"><SkeletonText>Immortel</SkeletonText></span>
            <span className="label"><SkeletonText>000 RR</SkeletonText></span>
          </div>
        </div>
        <div className="friend-summary-stat">
          <div className="friend-summary-stat-text">
            <span className="value"><SkeletonText>000</SkeletonText></span>
            <span className="label"><SkeletonText>Niveau</SkeletonText></span>
          </div>
        </div>
      </div>
    </Skeleton>
  );
}

export function HoverPreviewSkeleton() {
  return (
    <Skeleton>
      <div className="aim-board-hover-stat">
        <SkeletonBox w={26} h={26} r={6} />
        <SkeletonText>Immortel 3</SkeletonText>
      </div>
    </Skeleton>
  );
}

export function AccountSearchSkeleton() {
  return (
    <Skeleton>
      <div className="account-picker-result is-skeleton">
        <SkeletonText>Joueur#0000</SkeletonText>
      </div>
    </Skeleton>
  );
}

export function AppShellSkeleton() {
  return (
    <Skeleton className="app-shell-skeleton">
      <div className="app-shell-skeleton-sidebar">
        <SkeletonBox h={44} r="var(--r-md)" style={{ display: 'block', width: '100%' }} />
        {range(9).map((i) => (
          <SkeletonBox key={i} h={34} r="var(--r-sm)" style={{ display: 'block', width: `${94 - (i % 3) * 8}%` }} />
        ))}
      </div>
      <div className="app-shell-skeleton-main">
        <SkeletonBox h="var(--control-h)" r="var(--r-md)" style={{ display: 'block', width: '100%' }} />
        <ProfileHeaderShape />
        <SkeletonCard title="Statistiques globales"><StatTilesShape count={4} /></SkeletonCard>
      </div>
    </Skeleton>
  );
}

export function AdminTournamentsSkeleton() {
  return (
    <Skeleton>
      <CardStackShape rows={3} height={96} />
    </Skeleton>
  );
}
