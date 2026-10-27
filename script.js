'use strict';
(() => {
  const sky = document.querySelector('.sky');
  const layers = [...document.querySelectorAll('[data-depth]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 650px)');
  const announcement = document.querySelector('#announcement');
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  let frame = 0, previousTime = 0;

  function render(time) {
    // Frame-rate independent easing. Each layer owns only its parallax transform.
    const delta = previousTime ? Math.min(time - previousTime, 50) : 16;
    previousTime = time;
    const ease = 1 - Math.exp(-delta / 180);
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    const strength = reducedMotion.matches ? 0 : narrow.matches ? 0.38 : 1;
    for (const layer of layers) {
      const depth = Number(layer.dataset.depth) * strength;
      layer.style.transform = `translate3d(${(currentX * depth).toFixed(3)}px, ${(currentY * depth).toFixed(3)}px, 0)`;
    }
    if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.0005) {
      frame = requestAnimationFrame(render);
    } else {
      frame = 0;
      previousTime = 0;
    }
  }
  function wake() { if (!frame) frame = requestAnimationFrame(render); }
  function followPointer(event) {
    if (reducedMotion.matches) return;
    const bounds = sky.getBoundingClientRect();
    targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    wake();
  }
  function settle() { targetX = 0; targetY = 0; wake(); }
  sky.addEventListener('pointermove', followPointer, {passive: true});
  sky.addEventListener('pointerdown', followPointer, {passive: true});
  sky.addEventListener('pointerleave', settle, {passive: true});
  sky.addEventListener('pointercancel', settle, {passive: true});
  sky.addEventListener('pointerup', event => { if (event.pointerType === 'touch') settle(); }, {passive: true});
  window.addEventListener('blur', settle);
  window.addEventListener('resize', settle, {passive: true});
  reducedMotion.addEventListener('change', settle);

  // One complete large rebound, then one complete smaller rebound.
  // Anchor → parallax → float → hover button → bounce: transforms never compete.
  const bounceFrames = [
    {offset: 0, transform: 'scale(1, 1)'},
    {offset: 0.12, transform: 'scale(1.15, 0.84)'},
    {offset: 0.28, transform: 'scale(0.88, 1.18)'},
    {offset: 0.44, transform: 'scale(1.055, 0.95)'},
    {offset: 0.55, transform: 'scale(1, 1)'},
    {offset: 0.66, transform: 'scale(1.075, 0.92)'},
    {offset: 0.79, transform: 'scale(0.94, 1.09)'},
    {offset: 0.91, transform: 'scale(1.025, 0.975)'},
    {offset: 1, transform: 'scale(1, 1)'}
  ];
  for (const button of document.querySelectorAll('.toy-button')) {
    const bounce = button.querySelector('.bounce');
    let activeAnimation = null;
    button.addEventListener('click', () => {
      // Ignore repeated taps during a pair, so both rebounds always finish.
      if (activeAnimation) return;
      const keyframes = reducedMotion.matches
        ? bounceFrames.map(frame => ({
            offset: frame.offset,
            transform: frame.transform.replace(/([0-9]+(?:\.[0-9]+)?)/g, value =>
              String(1 + (Number(value) - 1) * 0.18))
          }))
        : bounceFrames;
      activeAnimation = bounce.animate(keyframes, {
        duration: reducedMotion.matches ? 720 : 1080,
        easing: 'ease-in-out',
        iterations: 1
      });
      button.dataset.bouncing = 'true';
      announcement.textContent = `${button.dataset.name}给了你两次软软的回弹。`;
      const finish = () => { activeAnimation = null; delete button.dataset.bouncing; };
      activeAnimation.onfinish = finish;
      activeAnimation.oncancel = finish;
    });
  }
})();
