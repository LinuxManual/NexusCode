(() => {
  const q = (s) => document.querySelector(s);
  const landing = q('#landing');
  if (!landing) return;

  const nav = q('.site-nav');
  const links = q('.nav-links');
  const launch = () => {
    const auth = q('#auth');
    if (auth) {
      landing.classList.add('hidden');
      auth.classList.remove('hidden');
      q('#auth-user')?.focus();
    }
  };
  ['#nav-launch','#hero-launch','#about-launch'].forEach(sel => q(sel)?.addEventListener('click', launch));

  // Mobile navigation
  const menu = document.createElement('button');
  menu.className = 'mobile-nav-toggle';
  menu.setAttribute('aria-label','Open navigation');
  menu.innerHTML = '☰';
  nav?.appendChild(menu);
  menu.addEventListener('click', () => {
    links?.classList.toggle('mobile-open');
    menu.innerHTML = links?.classList.contains('mobile-open') ? '×' : '☰';
  });
  links?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('mobile-open')));

  // Scroll progress + compact nav
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
    nav?.classList.toggle('nav-scrolled', scrollY > 30);
  };
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // Reveal cards/sections
  const reveal = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('is-visible');
  }), {threshold:.08});
  document.querySelectorAll('.site-section,.feature-card,.service-list > div,.security-points span').forEach((el,i) => {
    el.classList.add('reveal-item'); el.style.setProperty('--reveal-delay', `${Math.min(i % 6, 5) * 55}ms`); reveal.observe(el);
  });

  // Live terminal typing effect
  const code = q('.hero-code');
  if (code) {
    const lines = [...code.querySelectorAll('p')];
    lines.forEach((line,i) => { line.style.animationDelay = `${i * 120}ms`; line.classList.add('terminal-line-in'); });
  }

  // Interactive feature cards: subtle focus state
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX-r.left}px`);
      card.style.setProperty('--my', `${e.clientY-r.top}px`);
    });
  });
})();
