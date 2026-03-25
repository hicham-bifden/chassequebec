// ============================================
//  ChasseQuébec — main.js
//  Sprint 1 · Compilé depuis main.ts
//  (Version navigateur — sans build tool)
// ============================================

"use strict";

// ── Navbar scroll effect ────────────────────
const initNavbar = () => {
  const navbar = document.getElementById('navbar');
  let isScrolled = false;

  const update = () => {
    const should = window.scrollY > 20;
    if (should !== isScrolled) {
      isScrolled = should;
      navbar.classList.toggle('scrolled', isScrolled);
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
};

// ── Menu mobile ─────────────────────────────
const initMobileMenu = () => {
  const btn  = document.getElementById('menu-btn');
  const menu = document.getElementById('mobile-menu');
  let open   = false;

  const toggle = (force) => {
    open = force !== undefined ? force : !open;
    menu.classList.toggle('hidden', !open);
    btn.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  btn.addEventListener('click', () => toggle());
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false)));
  document.addEventListener('click', (e) => {
    if (open && !btn.contains(e.target) && !menu.contains(e.target)) toggle(false);
  });
};

// ── Smooth scroll ────────────────────────────
const initSmoothScroll = () => {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
};

// ── Reveal au scroll ─────────────────────────
const initReveal = () => {
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    }),
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
};

// ── Compteur animé ───────────────────────────
const animateCounter = (el, target, duration = 2.0, suffix = '') => {
  let start = null;
  const step = (ts) => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / (duration * 1000), 1);
    const eased    = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    el.textContent = Math.round(eased * target).toLocaleString('fr-CA') + (progress >= 1 ? suffix : '');
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

// ── Compteurs économies ──────────────────────
const initCounters = () => {
  const suffixes = { 2400: ' $', 9: '', 40: ' %' };

  const obs = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el     = e.target;
      const target = parseInt(el.dataset.target, 10);
      const suffix = suffixes[target] ?? '';
      animateCounter(el, target, 2.0, suffix);
      obs.unobserve(el);
    }),
    { threshold: 0.5 }
  );

  document.querySelectorAll('[data-target]').forEach(el => obs.observe(el));
};

// ── GSAP animations ──────────────────────────
const initGSAP = () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Parallax hero mockup
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

  // Features stagger
  gsap.from('.feature-card', {
    opacity: 0,
    y: 30,
    stagger: 0.1,
    duration: 0.6,
    ease: 'power2.out',
    scrollTrigger: { trigger: '#features', start: 'top 80%' }
  });
};

// ── FAQ accordion ────────────────────────────
const initFaq = () => {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn    = item.querySelector('.faq-btn');
    const answer = item.querySelector('.faq-answer');
    const icon   = item.querySelector('.faq-icon');

    btn.addEventListener('click', () => {
      const opening = !answer.classList.contains('open');

      // Ferme tous
      document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
      document.querySelectorAll('.faq-icon').forEach(i => i.classList.remove('open'));

      if (opening) {
        answer.classList.add('open');
        icon.classList.add('open');
      }
    });
  });
};

// ── Formulaire ───────────────────────────────
const initForm = () => {
  const form  = document.getElementById('signup-form');
  const input = document.getElementById('email-input');
  const msg   = document.getElementById('signup-msg');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email) return;

    console.info('[ChasseQuébec] Lead:', email);

    const btn = form.querySelector('button');
    btn.textContent    = '✓ Inscrit !';
    btn.style.background = '#16a34a';
    msg.classList.remove('hidden');
    input.value = '';

    setTimeout(() => {
      btn.textContent = 'Démarrer gratuitement';
      btn.style.background = '';
    }, 3000);
  });
};

// ── Active nav ───────────────────────────────
const initActiveNav = () => {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-link');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => {
          l.style.color = l.getAttribute('href')?.slice(1) === e.target.id ? '#f97316' : '';
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => obs.observe(s));
};

// ── Bootstrap ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initSmoothScroll();
  initReveal();
  initCounters();
  initFaq();
  initForm();
  initActiveNav();
  window.addEventListener('load', initGSAP);
});
