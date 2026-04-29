// ============================================
// ABLAZE — SHARED SITE JS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // MOBILE MENU
  const mb = document.getElementById('menuBtn');
  const cb = document.getElementById('closeBtn');
  const mm = document.getElementById('mMenu');
  if (mb && mm) mb.addEventListener('click', () => mm.classList.add('open'));
  if (cb && mm) cb.addEventListener('click', () => mm.classList.remove('open'));
  if (mm) mm.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mm.classList.remove('open')));

  // EMBERS
  const e = document.getElementById('embers');
  if (e) {
    for (let i = 0; i < 22; i++) {
      const d = document.createElement('div');
      d.className = 'ember';
      const s = Math.random() * 8 + 4;
      d.style.width = s + 'px';
      d.style.height = s + 'px';
      d.style.left = (Math.random() * 100) + '%';
      d.style.bottom = '-20px';
      d.style.animationDuration = (Math.random() * 8 + 8) + 's';
      d.style.animationDelay = (Math.random() * 8) + 's';
      e.appendChild(d);
    }
  }

  // REVEAL ON SCROLL
  const io = new IntersectionObserver((es) => {
    es.forEach(en => { if (en.isIntersecting) en.target.classList.add('in'); });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // ACTIVE NAV LINK
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav ul a, .m-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
  });

  // FORMS:
  // - Forms with data-netlify="true" submit natively and Netlify captures them.
  // - Forms with data-form (legacy/email-capture) get a JS-handled fake-success state.
  document.querySelectorAll('form[data-form]:not([data-netlify])').forEach(f => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = f.querySelector('button[type=submit]');
      const orig = btn.innerHTML;
      btn.innerHTML = 'Sent ✓';
      btn.disabled = true;
      setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; f.reset(); }, 2400);
    });
  });
});
