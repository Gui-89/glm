/* js/canvas-hero.js
   Partículas animadas no hero — adapta cor ao tema ativo */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [], theme = 'decor';
  const COLORS = {
    decor:    ['rgba(94,202,138,',  'rgba(74,160,100,',  'rgba(40,100,60,'],
    creative: ['rgba(201,166,255,', 'rgba(160,110,232,', 'rgba(100,60,200,']
  };

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function mkParticle() {
    const c = COLORS[theme];
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.6 + .3,
      vx: (Math.random() - .5) * .35,
      vy: (Math.random() - .5) * .35,
      a: Math.random() * .55 + .08,
      col: c[Math.floor(Math.random() * c.length)]
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: 120 }, mkParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // lines between close particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 90) {
          ctx.beginPath();
          ctx.strokeStyle = particles[i].col + ((.12 * (1 - d / 90)).toFixed(3)) + ')';
          ctx.lineWidth   = .5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    // dots
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.col + p.a + ')';
      ctx.fill();

      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }

  // Public API — main.js chama window.heroCanvas.setTheme('creative')
  window.heroCanvas = {
    setTheme(t) {
      theme = t;
      const c = COLORS[t];
      particles.forEach(p => { p.col = c[Math.floor(Math.random() * c.length)]; });
    }
  };

  window.addEventListener('resize', resize);
  init();
  draw();
})();
