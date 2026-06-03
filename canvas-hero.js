/* js/canvas-hero.js
   Partículas animadas no hero — adapta cor ao tema ativo */
(function () {
  function setup() {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H, particles = [], theme = 'decor';
    var COLORS = {
      decor:    ['rgba(94,202,138,',  'rgba(74,160,100,',  'rgba(40,100,60,'],
      creative: ['rgba(201,166,255,', 'rgba(160,110,232,', 'rgba(100,60,200,']
    };
    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    function mkParticle() {
      var c = COLORS[theme];
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
      particles = [];
      for (var i = 0; i < 120; i++) particles.push(mkParticle());
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var d  = Math.sqrt(dx * dx + dy * dy);
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
      particles.forEach(function(p) {
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
    window.heroCanvas = {
      setTheme: function(t) {
        theme = t;
        var c = COLORS[t];
        particles.forEach(function(p) {
          p.col = c[Math.floor(Math.random() * c.length)];
        });
      }
    };
    window.addEventListener('resize', resize);
    init();
    draw();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
