/* ==========================================================================
   MVP Tracker — bandeau de consentement cookies + Google Analytics
   ========================================================================== */

// Identifiant du conteneur Google Tag Manager (Admin > Installer GTM). GTM
// pilote Google Analytics (et tout autre outil ajouté plus tard) sans avoir
// à retoucher ce fichier à chaque changement.
const GTM_ID = 'GTM-MFFWHPFK';

const CONSENT_KEY = 'mvptracker-cookie-consent';
const isEnglish = document.documentElement.lang === 'en';

const texts = isEnglish
  ? {
      message: 'We use Google Analytics to understand how visitors use this site. No data is used for advertising.',
      accept: 'Accept',
      decline: 'Decline',
      link: 'Learn more',
      privacyHref: 'privacy-policy.html',
    }
  : {
      message: "On utilise Google Analytics pour comprendre comment le site est utilisé. Aucune donnée n'est utilisée à des fins publicitaires.",
      accept: 'Accepter',
      decline: 'Refuser',
      link: 'En savoir plus',
      privacyHref: 'politique-confidentialite.html',
    };

function loadGoogleAnalytics() {
  if (!GTM_ID || GTM_ID.includes('XXXX')) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}

function hideBanner(banner) {
  banner.classList.remove('visible');
  setTimeout(() => banner.remove(), 300);
}

function showConsentBanner() {
  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.innerHTML = `
    <p>${texts.message} <a href="${texts.privacyHref}">${texts.link}</a></p>
    <div class="cookie-banner-actions">
      <button type="button" class="btn btn-ghost btn-sm" data-cookie-decline>${texts.decline}</button>
      <button type="button" class="btn btn-primary btn-sm" data-cookie-accept>${texts.accept}</button>
    </div>
  `;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('visible'));

  banner.querySelector('[data-cookie-accept]').addEventListener('click', () => {
    try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch { /* stockage indisponible : tant pis, pas bloquant */ }
    hideBanner(banner);
    loadGoogleAnalytics();
  });
  banner.querySelector('[data-cookie-decline]').addEventListener('click', () => {
    try { localStorage.setItem(CONSENT_KEY, 'declined'); } catch { /* stockage indisponible : tant pis, pas bloquant */ }
    hideBanner(banner);
  });
}

// Permet à un lien de la page (ex. politique de confidentialité) de rouvrir
// le bandeau pour changer d'avis, via <button data-manage-cookies>.
function initManageCookiesButtons() {
  document.querySelectorAll('[data-manage-cookies]').forEach((btn) => {
    btn.addEventListener('click', () => {
      try { localStorage.removeItem(CONSENT_KEY); } catch { /* rien à faire */ }
      document.querySelectorAll('.cookie-banner').forEach((b) => b.remove());
      showConsentBanner();
    });
  });
}

(function initConsent() {
  let stored;
  try {
    stored = localStorage.getItem(CONSENT_KEY);
  } catch {
    stored = null;
  }
  if (stored === 'accepted') {
    loadGoogleAnalytics();
  } else if (stored !== 'declined') {
    showConsentBanner();
  }
  initManageCookiesButtons();
})();
