(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return;
  const intro = document.createElement('div');
  intro.className = 'cinema-intro';
  intro.setAttribute('role', 'dialog');
  intro.setAttribute('aria-modal', 'true');
  intro.setAttribute('aria-label', '帧外影业开场动画');
  intro.innerHTML = `<div class="intro-curtain intro-curtain-top"></div><div class="intro-curtain intro-curtain-bottom"></div><div class="intro-content"><div class="intro-kicker">FRAME PICTURES PRESENTS</div><div class="intro-wordmark" aria-label="FRAME"><span>F</span><span>R</span><span class="intro-a">Λ</span><span>M</span><span>E</span></div><div class="intro-caption">画面之外 · 故事之中</div><div class="intro-track" aria-hidden="true"><i></i></div><div class="intro-footer" aria-hidden="true"><span>THE STORY STARTS HERE</span><span class="intro-count">000</span></div></div><button class="intro-skip">跳过片头 ↗</button><div class="intro-edge" aria-hidden="true"><span>01 / OPENING SEQUENCE</span><span>BEYOND THE FRAME.</span></div>`;
  document.body.prepend(intro);
  const surfaces = [...document.body.children].filter(el => el !== intro && el.tagName !== 'SCRIPT');
  const previousInert = surfaces.map(el => el.inert);
  const oldFocus = document.activeElement;
  surfaces.forEach(el => { el.inert = true; });
  document.documentElement.classList.add('intro-playing');
  const skip = intro.querySelector('button');
  skip.focus({ preventScroll: true });
  let finished = false, frame, cleanupTimer;
  const duration = 2100;
  const start = performance.now();
  const count = intro.querySelector('.intro-count');
  const track = intro.querySelector('.intro-track i');
  function restore() {
    clearTimeout(cleanupTimer);
    intro.remove();
    surfaces.forEach((el, i) => { el.inert = previousInert[i]; });
    document.documentElement.classList.remove('intro-playing');
    document.removeEventListener('keydown', onKey);
    motion.removeEventListener('change', onMotion);
    if (oldFocus && oldFocus !== document.body) oldFocus.focus({ preventScroll: true });
  }
  function finish(instant = false) {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    clearTimeout(failsafe);
    if (instant) { restore(); return; }
    count.textContent = '100';
    track.style.transform = 'scaleX(1)';
    intro.classList.add('is-opening');
    document.body.classList.add('cinema-arrival');
    cleanupTimer = setTimeout(restore, 1100);
    setTimeout(() => document.body.classList.remove('cinema-arrival'), 2400);
  }
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    count.textContent = String(Math.round(progress * 100)).padStart(3, '0');
    track.style.transform = `scaleX(${progress})`;
    if (progress === 1) finish(); else frame = requestAnimationFrame(tick);
  }
  function onKey(e) {
    if (e.key === 'Escape') finish(true);
    if (e.key === 'Tab') { e.preventDefault(); skip.focus(); }
  }
  function onMotion(e) { if (e.matches) { if (finished) restore(); else finish(true); } }
  skip.addEventListener('click', () => { if (finished) restore(); else finish(true); });
  document.addEventListener('keydown', onKey);
  motion.addEventListener('change', onMotion);
  const failsafe = setTimeout(() => finish(true), 5000);
  frame = requestAnimationFrame(tick);
})();
