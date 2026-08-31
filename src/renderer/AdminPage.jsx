import { useTranslation } from 'react-i18next';

// Écran d'administration — pour l'instant un simple point d'entrée qui
// prouve que la vérification de rôle fonctionne (voir App.jsx : la section
// de navigation qui mène ici n'existe même pas dans le DOM pour un compte
// non-admin, et côté serveur `public.is_admin()` bloque toute action même
// en cas de requête forcée). Le futur module Tournoi viendra se brancher
// ici — rien de plus construit pour l'instant, comme demandé.
function AdminPage() {
  const { t } = useTranslation();

  return (
    <div className="admin-page">
      <h1>{t('admin.title')}</h1>
      <p className="label">{t('admin.placeholder')}</p>
    </div>
  );
}

export default AdminPage;
