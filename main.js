/* ═══════════════════════════════════════════════════════════
   GLM UNIVERSE — main.js  (ES module)
   Todas as dependências importadas aqui: Three.js, Firebase.
   Sem scripts externos, sem race conditions, sem window.THREE.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { initializeApp }   from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy }
  from 'firebase/firestore';

/* ══════════════════════════════════════════════════════════
   FIREBASE
   ══════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAqEsBUgdvvVbuYgmqG59yFlqekMxQ8L3g',
  authDomain:        'glm-universe.firebaseapp.com',
  projectId:         'glm-universe',
  storageBucket:     'glm-universe.firebasestorage.app',
  messagingSenderId: '426101358920',
  appId:             '1:426101358920:web:6d20b1c48ef2dba2d7b37d',
  measurementId:     'G-DJ03MXYLQ3'
};

let db = null;
try {
  const app = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(app);
} catch (e) {
  console.warn('Firebase não inicializado:', e.message);
}

/* ══════════════════════════════════════════════════════════
   TEMA
   ══════════════════════════════════════════════════════════ */
const THEME = {
  decor: {
    eyebrow:    'ESCOLHA SUA EXPERIÊNCIA',
    eyeClass:   'eye-decor',
    titleClass: 'title-decor',
    btnD:       'sel-btn sel-active-decor',
    btnC:       'sel-btn',
    dline:      'dline dline-decor',
    dtext:      'dtext dtext-decor',
    dot:        'live-dot dot-decor',
    liveText:   'AO VIVO',
    divText:    'PRODUTOS EM DESTAQUE',
    card:       'card card-decor fade-in',
    ci:         'card-img ci-decor',
    badge:      'badge badge-decor',
    name:       'card-name name-decor',
    price:      'card-price price-decor',
  },
  creative: {
    eyebrow:    '3D CREATIVE STUDIO',
    eyeClass:   'eye-creative',
    titleClass: 'title-creative',
    btnD:       'sel-btn',
    btnC:       'sel-btn sel-active-creative',
    dline:      'dline dline-creative',
    dtext:      'dtext dtext-creative',
    dot:        'live-dot dot-creative',
    liveText:   'LIVE',
    divText:    'CATÁLOGO 3D',
    card:       'card card-creative fade-in',
    ci:         'card-img ci-creative',
    badge:      'badge badge-creative',
    name:       'card-name name-creative',
    price:      'card-price price-creative',
  }
};

let currentTheme = 'decor';

/* ══════════════════════════════════════════════════════════
   CANVAS HERO — rede de partículas
   ══════════════════════════════════════════════════════════ */
const P_COLORS = {
  decor:    ['rgba(94,202,138,',  'rgba(74,160,100,',  'rgba(40,100,60,'],
  creative: ['rgba(201,166,255,', 'rgba(160,110,232,', 'rgba(100,60,200,'],
};

function initCanvasHero() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) { console.warn('hero-canvas não encontrado'); return; }
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, particles = [], cTheme = 'decor';

  function resize() {
    const hero = canvas.parentElement;
    W = canvas.width  = hero ? hero.offsetWidth  : window.innerWidth;
    H = canvas.height = hero ? hero.offsetHeight : 360;
  }

  function mkP() {
    const c = P_COLORS[cTheme];
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.55 + 0.08,
      col: c[Math.floor(Math.random() * c.length)]
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 90) {
          ctx.beginPath();
          ctx.strokeStyle = particles[i].col + (0.12 * (1 - d / 90)).toFixed(3) + ')';
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.col + p.a + ')';
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    }
    requestAnimationFrame(draw);
  }

  // setTheme exposto globalmente para applyTheme chamar
  window._heroSetTheme = (t) => {
    cTheme = t;
    const c = P_COLORS[t];
    particles.forEach(p => { p.col = c[Math.floor(Math.random() * c.length)]; });
  };

  window.addEventListener('resize', resize);

  // duplo rAF: garante 2 frames de layout antes de ler offsetWidth
  requestAnimationFrame(() => requestAnimationFrame(() => {
    resize();
    particles = Array.from({ length: 120 }, mkP);
    draw();
  }));
}

/* ══════════════════════════════════════════════════════════
   THREE.JS PREVIEW
   ══════════════════════════════════════════════════════════ */
const PREV_COLORS = { decor: 0x5eca8a, creative: 0xc9a6ff };

function initThreePreview() {
  const wrap   = document.getElementById('preview-3d');
  const cvs    = document.getElementById('preview-canvas');
  if (!wrap || !cvs) return;

  const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true });
  renderer.setSize(160, 160);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 3.2);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const pl = new THREE.PointLight(0xffffff, 1.2, 10);
  pl.position.set(2, 3, 3);
  scene.add(pl);

  const SHAPES = [
    () => new THREE.BoxGeometry(1.2, 1.2, 1.2),
    () => new THREE.IcosahedronGeometry(0.85, 0),
    () => new THREE.OctahedronGeometry(1, 0),
    () => new THREE.TorusGeometry(0.7, 0.28, 16, 40),
    () => new THREE.ConeGeometry(0.75, 1.4, 6),
    () => new THREE.TetrahedronGeometry(1, 0),
  ];

  let mesh = null, raf = null, visible = false, pTheme = 'decor';

  function buildMesh(idx) {
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
    const geo = SHAPES[idx % SHAPES.length]();
    const col = PREV_COLORS[pTheme];
    mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
      color: col, emissive: col, emissiveIntensity: 0.12,
      shininess: 80, transparent: true, opacity: 0.92
    }));
    scene.add(mesh);
    const wf = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
      color: col, wireframe: true, transparent: true, opacity: 0.18
    }));
    wf.scale.setScalar(1.005);
    mesh.add(wf);
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (mesh) { mesh.rotation.x += 0.012; mesh.rotation.y += 0.018; }
    renderer.render(scene, camera);
  }

  function pos(x, y) {
    let l = x + 12, t = y + 12;
    if (l + 160 > window.innerWidth  - 8) l = x - 172;
    if (t + 160 > window.innerHeight - 8) t = y - 172;
    wrap.style.left = l + 'px';
    wrap.style.top  = t + 'px';
  }

  // API exposta globalmente
  window._preview = {
    show(x, y, idx) {
      buildMesh(idx); pos(x, y);
      wrap.style.display = 'block';
      if (!visible) { visible = true; loop(); }
    },
    hide() {
      wrap.style.display = 'none'; visible = false;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    },
    move(x, y) { if (visible) pos(x, y); },
    setTheme(t) {
      pTheme = t;
      if (!mesh) return;
      const col = PREV_COLORS[t];
      mesh.material.color.setHex(col);
      mesh.material.emissive.setHex(col);
      mesh.children.forEach(c => { if (c.material?.wireframe) c.material.color.setHex(col); });
    }
  };
}

/* ══════════════════════════════════════════════════════════
   APPLY THEME
   ══════════════════════════════════════════════════════════ */
function applyTheme(t) {
  currentTheme = t;
  const T = THEME[t];

  const ey = document.getElementById('eyebrow');
  ey.textContent = T.eyebrow;
  ey.className   = 'glm-eyebrow ' + T.eyeClass;

  document.getElementById('main-title').className = 'glm-title ' + T.titleClass;
  document.getElementById('btn-d').className = T.btnD;
  document.getElementById('btn-c').className = T.btnC;
  document.getElementById('dl1').className   = T.dline;
  document.getElementById('dl2').className   = T.dline;

  const dtxt = document.getElementById('dtxt');
  dtxt.className   = T.dtext;
  dtxt.textContent = T.divText;

  document.getElementById('live-dot').className    = T.dot;
  document.getElementById('live-text').textContent = T.liveText;

  window._heroSetTheme?.(t);
  window._preview?.setTheme(t);

  // Re-renderiza grid com novo tema
  if (window.__lastProducts) renderGrid(window.__lastProducts);
}

/* ══════════════════════════════════════════════════════════
   CARDS
   ══════════════════════════════════════════════════════════ */
function fmtPrice(v) {
  if (v == null || v === '') return '—';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function makeCard(prod, idx) {
  const T    = THEME[currentTheme];
  const card = document.createElement('div');
  card.className = T.card;
  card.style.animationDelay = (idx * 55) + 'ms';

  const img   = prod.imageUrl
    ? `<img src="${prod.imageUrl}" alt="${prod.name}" loading="lazy">`
    : `<span class="emoji-fallback">${prod.emoji || '📦'}</span>`;
  const badge = prod.badge ? `<span class="${T.badge}">${prod.badge}</span>` : '';

  card.innerHTML = `
    <div class="${T.ci}">${img}${badge}</div>
    <div class="card-info">
      <div class="${T.name}">${prod.name}</div>
      <div class="${T.price}">${fmtPrice(prod.price)}</div>
      ${prod.description ? `<div class="card-desc">${prod.description}</div>` : ''}
    </div>`;

  let ht;
  card.addEventListener('mouseenter', e => {
    ht = setTimeout(() => window._preview?.show(e.clientX, e.clientY, idx), 180);
  });
  card.addEventListener('mousemove',  e => window._preview?.move(e.clientX, e.clientY));
  card.addEventListener('mouseleave', () => { clearTimeout(ht); window._preview?.hide(); });
  return card;
}

function renderGrid(products) {
  window.__lastProducts = products;
  const grid    = document.getElementById('grid');
  const loading = document.getElementById('loading-state');
  const empty   = document.getElementById('empty-state');
  loading.style.display = 'none';
  if (!products?.length) {
    grid.style.display = 'none'; empty.style.display = 'block'; return;
  }
  empty.style.display = 'none';
  grid.style.display  = 'grid';
  grid.innerHTML      = '';
  products.forEach((p, i) => grid.appendChild(makeCard(p, i)));
}

/* ══════════════════════════════════════════════════════════
   FIRESTORE
   ══════════════════════════════════════════════════════════ */
const DEMO = [
  { id:'1', name:'Quadro Minimalista', price:189, badge:'NOVO', emoji:'🖼️', description:'Arte exclusiva para sua sala',     category:'decor'    },
  { id:'2', name:'Vaso Orgânico',      price:97,  badge:'TOP',  emoji:'🏺', description:'Cerâmica artesanal brasileira',    category:'decor'    },
  { id:'3', name:'Luminária Arc',      price:345,               emoji:'💡', description:'Design escandinavo contemporâneo', category:'decor'    },
  { id:'4', name:'Tapete Bouclé',      price:278,               emoji:'🪨', description:'Textura tátil única, 160×230cm',   category:'decor'    },
  { id:'5', name:'Modelo 3D #01',      price:220, badge:'3D',   emoji:'💎', description:'Asset digital high-poly',          category:'creative' },
  { id:'6', name:'Render Pack',        price:499, badge:'PRO',  emoji:'🎮', description:'10 cenas prontas para usar',       category:'creative' },
  { id:'7', name:'Scene Kit Vol.1',    price:180, badge:'NEW',  emoji:'🌐', description:'5 ambientes prontos para render',  category:'creative' },
  { id:'8', name:'Shader Pack',        price:89,                emoji:'✨', description:'20 materiais PBR otimizados',      category:'creative' },
];

function demoFiltered() {
  return DEMO.filter(p =>
    currentTheme === 'creative' ? p.category === 'creative'
                                : p.category === 'decor' || !p.category
  );
}

let unsub = null;
function subscribeFirestore() {
  if (!db) { renderGrid(demoFiltered()); return; }
  if (unsub) unsub();
  try {
    const ref = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    unsub = onSnapshot(ref, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = all.filter(p =>
        currentTheme === 'creative' ? p.category === 'creative'
                                    : p.category === 'decor' || !p.category
      );
      renderGrid(filtered.length ? filtered : all);
    }, err => {
      console.warn('Firestore erro:', err.message);
      renderGrid(demoFiltered());
    });
  } catch (e) {
    console.warn('Firestore falhou:', e.message);
    renderGrid(demoFiltered());
  }
}

/* ══════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════ */
// ES module + importmap = DOM garantido, Three.js garantido
document.getElementById('btn-d').addEventListener('click', () => {
  applyTheme('decor');
  subscribeFirestore();
});
document.getElementById('btn-c').addEventListener('click', () => {
  applyTheme('creative');
  subscribeFirestore();
});

applyTheme('decor');
initCanvasHero();
initThreePreview();
subscribeFirestore();
