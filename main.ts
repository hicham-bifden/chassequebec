// ============================================
//  ChasseQuébec — main.ts
//  Sprint 1 · TypeScript source
//  Compilé → main.js (voir instructions bas)
// ============================================

// ── Types ──────────────────────────────────
interface NavState {
  isScrolled: boolean;
  menuOpen: boolean;
}

interface FaqItem {
  btn: HTMLButtonElement;
  answer: HTMLElement;
  icon: SVGElement | HTMLElement;
  isOpen: boolean;
}

interface CounterOptions {
  el: HTMLElement;
  target: number;
  duration: number;
  suffix?: string;
}

// ── Navbar scroll effect ────────────────────
const initNavbar = (): void => {
  const navbar = document.getElementById('navbar') as HTMLElement;
  const state: NavState = { isScrolled: false, menuOpen: false };

  const updateNavbar = (): void => {
    const shouldScroll = window.scrollY > 20;
    if (shouldScroll !== state.isScrolled) {
      state.isScrolled = shouldScroll;
      navbar.classList.toggle('scrolled', shouldScroll);
    }
  };

  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();
};

// ── Menu mobile ─────────────────────────────
const initMobileMenu = (): void => {
  const btn       = document.getElementById('menu-btn') as HTMLButtonElement;
  const menu      = document.getElementById('mobile-menu') as HTMLElement;
  let isOpen      = false;

  const toggle = (force?: boolean): void => {
    isOpen = force !== undefined ? force : !isOpen;
    menu.classList.toggle('hidden', !isOpen);
    btn.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  btn.addEventListener('click', () => toggle());

  // Ferme au clic sur un lien
  menu.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => toggle(false))
  );

  // Ferme au clic dehors
  document.addEventListener('click', (e: MouseEvent) => {
    if (isOpen && !btn.contains(e.target as Node) && !menu.contains(e.target as Node)) {
      toggle(false);
    }
  });
};

// ── Smooth scroll ────────────────────────────
const initSmoothScroll = (): void => {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e: MouseEvent) => {
      const href   = link.getAttribute('href')!;
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;
      e.preventDefault();
      const offset     = 72; // hauteur navbar
      const targetTop  = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });
};

// ── Intersection Observer — reveal ──────────
const initReveal = (): void => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // une seule fois
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll<HTMLElement>('.reveal').forEach(el => observer.observe(el));
};

// ── GSAP animations avancées ────────────────
const initGSAP = (): void => {
  // GSAP est chargé en defer — on attend qu'il soit dispo
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Hero — entrée du mockup avec parallax léger
  gsap.to('.hero-mockup', {
    y: -20,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero-mockup',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.5,
    }
  });

  // Section magasins — entrée en cascade
  gsap.from('.store-logo', {
    opacity: 0,
    y: 15,
    stagger: 0.06,
    duration: 0.5,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '#magasins',
      start: 'top 85%',
    }
  });

  // Section économies — compteurs animés GSAP
  document.querySelectorAll<HTMLElement>('.stat-counter [data-target]').forEach(el => {
    const target = parseInt(el.dataset.target ?? '0', 10);

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => animateCounter({ el, target, duration: 2.0, suffix: target > 100 ? ' $' : ' %' }),
    });
  });
};

// ── Compteur animé ───────────────────────────
const animateCounter = ({ el, target, duration, suffix = '' }: CounterOptions): void => {
  let start: number | null = null;

  const step = (timestamp: number): void => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / (duration * 1000), 1);
    // easeOutExpo
    const eased    = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const value    = Math.round(eased * target);
    el.textContent = value.toLocaleString('fr-CA') + (progress >= 1 ? suffix : '');
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

// ── FAQ accordion ────────────────────────────
const initFaq = (): void => {
  const items: FaqItem[] = [];

  document.querySelectorAll<HTMLElement>('.faq-item').forEach(item => {
    const btn    = item.querySelector<HTMLButtonElement>('.faq-btn')!;
    const answer = item.querySelector<HTMLElement>('.faq-answer')!;
    const icon   = item.querySelector<HTMLElement>('.faq-icon')!;

    const faqItem: FaqItem = { btn, answer, icon, isOpen: false };
    items.push(faqItem);

    btn.addEventListener('click', () => {
      const opening = !faqItem.isOpen;

      // Ferme tous les autres
      items.forEach(other => {
        if (other !== faqItem && other.isOpen) {
          other.isOpen = false;
          other.answer.classList.remove('open');
          other.icon.classList.remove('open');
        }
      });

      faqItem.isOpen = opening;
      answer.classList.toggle('open', opening);
      icon.classList.toggle('open', opening);
    });
  });
};

// ── Formulaire inscription ───────────────────
const initSignupForm = (): void => {
  const form  = document.getElementById('signup-form') as HTMLFormElement;
  const input = document.getElementById('email-input') as HTMLInputElement;
  const msg   = document.getElementById('signup-msg') as HTMLElement;

  form.addEventListener('submit', (e: SubmitEvent) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email) return;

    // Sprint 3 → vraie API Node.js
    console.info('[ChasseQuébec] Nouveau lead:', email);

    // Animation feedback
    const btn = form.querySelector('button')!;
    btn.textContent = '✓ Inscrit !';
    btn.style.background = '#16a34a';

    msg.classList.remove('hidden');
    input.value = '';

    setTimeout(() => {
      btn.textContent = 'Démarrer gratuitement';
      btn.style.background = '';
    }, 3000);
  });
};

// ── Active nav link au scroll ────────────────
const initActiveNav = (): void => {
  const sections  = document.querySelectorAll<HTMLElement>('section[id]');
  const navLinks  = document.querySelectorAll<HTMLAnchorElement>('.nav-link');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            const href = link.getAttribute('href')?.slice(1);
            link.style.color = href === entry.target.id ? '#f97316' : '';
          });
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach(section => observer.observe(section));
};

// ── Init global ──────────────────────────────
const init = (): void => {
  initNavbar();
  initMobileMenu();
  initSmoothScroll();
  initReveal();
  initFaq();
  initSignupForm();
  initActiveNav();

  // GSAP après chargement des scripts defer
  window.addEventListener('load', initGSAP);
};

document.addEventListener('DOMContentLoaded', init);

// ── Export pour tests unitaires (Sprint 7) ──
export { animateCounter, initFaq, initReveal };
