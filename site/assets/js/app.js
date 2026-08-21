/* ==========================================================================
   MVP Tracker — interactions du site (partagées par toutes les pages)
   ========================================================================== */

/* --- Curseur personnalisé -------------------------------------------------
   Deux éléments : un point qui colle au pointeur, et un anneau qui le suit
   avec un léger retard (interpolation) pour un rendu plus vivant. */
(function customCursor() {
  if (window.matchMedia('(hover: none)').matches || window.innerWidth < 900) return;

  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
  });

  (function follow() {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(follow);
  })();

  const interactive = 'a, button, .card, .showcase-tab, summary, input';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactive)) ring.classList.add('is-hovering');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactive)) ring.classList.remove('is-hovering');
  });
})();

/* --- Barre de nav : état "scrolled" + barre de progression ---------------- */
(function navAndProgress() {
  const nav = document.querySelector('.nav');
  const bar = document.querySelector('.scroll-progress');

  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 24);
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : '0%';
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* --- Menu mobile ---------------------------------------------------------- */
(function mobileMenu() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.textContent = open ? '✕' : '☰';
  });

  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      links.classList.remove('open');
      toggle.textContent = '☰';
    }
  });
})();

/* --- Apparition au défilement --------------------------------------------
   Un seul observateur pour tous les éléments marqués `.reveal` / `.stagger`. */
(function revealOnScroll() {
  const items = document.querySelectorAll('.reveal, .stagger');
  if (!items.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        io.unobserve(entry.target); // une seule fois : pas de clignotement au retour
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
  );

  items.forEach((el) => io.observe(el));
})();

/* --- Compteurs animés ----------------------------------------------------- */
(function counters() {
  const nums = document.querySelectorAll('[data-count]');
  if (!nums.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);

        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const suffix = el.dataset.suffix || '';
        const duration = 1400;
        const start = performance.now();

        function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          // easeOutExpo : démarre vite, ralentit à l'arrivée
          const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          el.textContent = (target * eased).toFixed(decimals) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.4 },
  );

  nums.forEach((el) => io.observe(el));
})();

/* --- Halo qui suit la souris dans les cartes ------------------------------ */
(function cardSpotlight() {
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
})();

/* --- Inclinaison 3D au survol (cartes média) ------------------------------ */
(function tilt3d() {
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const strength = parseFloat(el.dataset.tilt) || 8;

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `perspective(1000px) rotateY(${px * strength}deg) rotateX(${-py * strength}deg) scale(1.015)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) scale(1)';
    });
  });
})();

/* --- Parallaxe des agents du hero ----------------------------------------- */
(function heroParallax() {
  const agents = document.querySelectorAll('.hero-agent');
  if (!agents.length || window.matchMedia('(hover: none)').matches) return;

  document.addEventListener('mousemove', (e) => {
    const cx = (e.clientX / window.innerWidth - 0.5) * 2;  // -1 → 1
    const cy = (e.clientY / window.innerHeight - 0.5) * 2;

    agents.forEach((agent) => {
      const depth = parseFloat(agent.dataset.depth) || 12;
      agent.style.transform = `translate3d(${-cx * depth}px, ${-cy * depth * 0.5}px, 0)`;
    });
  });
})();

/* --- Vitrine de captures : onglets ---------------------------------------- */
(function showcase() {
  const tabs = document.querySelectorAll('.showcase-tab');
  const frames = document.querySelectorAll('.stage-frame');
  const caption = document.querySelector('.showcase-caption');
  const stageTitle = document.querySelector('.stage-title');
  if (!tabs.length) return;

  function select(index) {
    tabs.forEach((t, i) => t.classList.toggle('active', i === index));
    frames.forEach((f, i) => f.classList.toggle('active', i === index));
    const tab = tabs[index];
    if (caption) caption.textContent = tab.dataset.caption || '';
    if (stageTitle) stageTitle.textContent = `MVP Tracker — ${tab.dataset.title || ''}`;
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
  select(0);
})();

/* --- Titre révélé mot par mot --------------------------------------------
   Découpe le texte en <span> animés successivement. */
(function splitWords() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;
      span.style.animationDelay = `${0.25 + i * 0.07}s`;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });
})();

/* --- Effet magnétique sur les boutons ------------------------------------- */
(function magneticButtons() {
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
})();
