/* ═══════════════════════════════════════════════════════════
   GLM UNIVERSE — main.js  (ES module)
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { initializeApp }   from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy }
  from 'firebase/firestore';
import { FIREBASE_CONFIG } from './firebase-config.js';

/* ══════════════════════════════════════════════════════════
   FIREBASE
   ══════════════════════════════════════════════════════════ */
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
   CARRINHO
   ══════════════════════════════════════════════════════════ */
let cart = JSON.parse(localStorage.getItem('glm_cart') || '[]');

function saveCart() {
  localStorage.setItem('glm_cart', JSON.stringify(cart));
}

function cartTotal() {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function cartCount() {
  return cart.reduce((s, i) => s + i.qty, 0);
}

function addToCart(prod, variantLabel = null, variantPrice = null) {
  const price = variantPrice ?? prod.price ?? 0;
  const key   = prod.id + (variantLabel ? '_' + variantLabel : '');
  const idx   = cart.findIndex(i => i.key === key);
  if (idx >= 0) {
    cart[idx].qty++;
  } else {
    cart.push({
      key,
      id:      prod.id,
      name:    prod.name,
      emoji:   prod.emoji  || '📦',
      imageUrl:prod.imageUrl || null,
      price,
      variant: variantLabel,
      qty:     1,
    });
  }
  saveCart();
  renderCart();
  updateCartFab();
  showCartToast(prod.name);
}

function removeFromCart(key) {
  cart = cart.filter(i => i.key !== key);
  saveCart();
  renderCart();
  updateCartFab();
}

function changeQty(key, delta) {
  const idx = cart.findIndex(i => i.key === key);
  if (idx < 0) return;
  cart[idx].qty = Math.max(1, cart[idx].qty + delta);
  saveCart();
  renderCart();
  updateCartFab();
}

function updateCartFab() {
  const cnt = cartCount();
  const el  = document.getElementById('cart-fab-count');
  if (!el) return;
  el.textContent = cnt;
  el.classList.toggle('visible', cnt > 0);
}

function showCartToast(name) {
  const t = document.createElement('div');
  t.className = 'cart-toast';
  t.innerHTML = `<span>🛒</span> <b>${name}</b> adicionado ao carrinho`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}

function fmtBRL(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function renderCart() {
  const items   = document.getElementById('cart-items');
  const empty   = document.getElementById('cart-empty');
  const totalEl = document.getElementById('cart-total-val');
  if (!items) return;

  if (!cart.length) {
    items.innerHTML = '';
    if (empty)   empty.style.display = 'flex';
    if (totalEl) totalEl.textContent = fmtBRL(0);
    return;
  }
  if (empty) empty.style.display = 'none';
  if (totalEl) totalEl.textContent = fmtBRL(cartTotal());

  items.innerHTML = '';
  cart.forEach(item => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    const img = item.imageUrl
      ? `<img src="${item.imageUrl}" alt="${item.name}">`
      : item.emoji;
    el.innerHTML = `
      <div class="cart-item-img">${img}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        ${item.variant ? `<div class="cart-item-variant">${item.variant}</div>` : ''}
        <div class="cart-item-price">${fmtBRL(item.price)}</div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" data-key="${item.key}" data-d="-1">−</button>
          <span class="cart-qty-val">${item.qty}</span>
          <button class="cart-qty-btn" data-key="${item.key}" data-d="1">+</button>
        </div>
      </div>
      <button class="cart-item-remove" data-key="${item.key}">✕</button>`;
    el.querySelector('.cart-item-remove').addEventListener('click', () => removeFromCart(item.key));
    el.querySelectorAll('.cart-qty-btn').forEach(b =>
      b.addEventListener('click', () => changeQty(item.key, parseInt(b.dataset.d)))
    );
    items.appendChild(el);
  });
}

function openCart()  {
  document.getElementById('cart-overlay')?.classList.add('open');
  document.getElementById('cart-drawer')?.classList.add('open');
}
function closeCart() {
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.getElementById('cart-drawer')?.classList.remove('open');
}

/* ══════════════════════════════════════════════════════════
   VARIANT MODAL
   ══════════════════════════════════════════════════════════ */
function openVariantModal(prod) {
  const ov = document.getElementById('variant-overlay');
  if (!ov) return;

  const vars = prod.variations || [];

  document.getElementById('vm-name').textContent  = prod.name;
  document.getElementById('vm-price').textContent = fmtBRL(prod.price ?? 0);

  const container = document.getElementById('vm-variants');
  container.innerHTML = '';

  if (!vars.length) {
    // sem variações: adicionar direto
    addToCart(prod);
    return;
  }

  // Agrupar por tipo
  const byType = {};
  vars.forEach(v => {
    if (!byType[v.type]) byType[v.type] = [];
    byType[v.type].push(v);
  });

  let selected = {}; // type → variant object

  Object.entries(byType).forEach(([type, variants]) => {
    const group = document.createElement('div');
    group.className = 'variant-group';
    group.innerHTML = `<span class="variant-group-label">${type.toUpperCase()}</span>`;
    const pills = document.createElement('div');
    pills.className = 'variant-pills';

    variants.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'variant-pill';
      btn.textContent = v.label + (v.price ? ` (+${fmtBRL(v.price - (prod.price || 0))})` : '');
      btn.addEventListener('click', () => {
        pills.querySelectorAll('.variant-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selected[type] = v;
        // Atualizar preço exibido
        const prices = Object.values(selected).map(s => s.price).filter(Boolean);
        const shown  = prices.length ? Math.max(...prices) : (prod.price ?? 0);
        document.getElementById('vm-price').textContent = fmtBRL(shown);
      });
      pills.appendChild(btn);
    });
    group.appendChild(pills);
    container.appendChild(group);
  });

  const btnAdd = document.getElementById('vm-add');
  btnAdd.onclick = () => {
    const label  = Object.values(selected).map(s => s.label).join(' / ') || null;
    const prices = Object.values(selected).map(s => s.price).filter(Boolean);
    const price  = prices.length ? Math.max(...prices) : (prod.price ?? 0);
    addToCart(prod, label, price);
    ov.classList.remove('open');
  };

  document.getElementById('vm-cancel').onclick = () => ov.classList.remove('open');
  ov.classList.add('open');
}

/* ══════════════════════════════════════════════════════════
   CANVAS HERO — rede de partículas
   ══════════════════════════════════════════════════════════ */
const P_COLORS = {
  decor:    ['rgba(94,202,138,',  'rgba(74,160,100,',  'rgba(40,100,60,'],
  creative: ['rgba(201,166,255,', 'rgba(160,110,232,', 'rgba(100,60,200,'],
};

function initCanvasHero() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
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

  window._heroSetTheme = (t) => {
    cTheme = t;
    const c = P_COLORS[t];
    particles.forEach(p => { p.col = c[Math.floor(Math.random() * c.length)]; });
  };

  window.addEventListener('resize', resize);
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
  const wrap = document.getElementById('preview-3d');
  const cvs  = document.getElementById('preview-canvas');
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

  if (window.__lastProducts) renderGrid(window.__lastProducts);
}

/* ══════════════════════════════════════════════════════════
   CARDS
   ══════════════════════════════════════════════════════════ */
function makeCard(prod, idx) {
  const T    = THEME[currentTheme];
  const card = document.createElement('div');
  card.className = T.card;
  card.style.animationDelay = (idx * 55) + 'ms';

  const img   = prod.imageUrl
    ? `<img src="${prod.imageUrl}" alt="${prod.name}" loading="lazy">`
    : `<span class="emoji-fallback">${prod.emoji || '📦'}</span>`;
  const badge = prod.badge ? `<span class="${T.badge}">${prod.badge}</span>` : '';

  const hasVars = prod.variations?.length > 0;
  const btnLabel = hasVars ? '+ VER OPÇÕES' : '+ ADICIONAR';

  card.innerHTML = `
    <div class="${T.ci}">${img}${badge}</div>
    <div class="card-info">
      <div class="${T.name}">${prod.name}</div>
      <div class="${T.price}">${fmtBRL(prod.price ?? 0)}</div>
      ${prod.description ? `<div class="card-desc">${prod.description}</div>` : ''}
    </div>
    <button class="card-add-btn">${btnLabel}</button>`;

  card.querySelector('.card-add-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (hasVars) openVariantModal(prod);
    else addToCart(prod);
  });

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
    currentTheme === 'creative' ? p.category === 'creative' : p.category === 'decor' || !p.category
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
        currentTheme === 'creative' ? p.category === 'creative' : p.category === 'decor' || !p.category
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
document.getElementById('btn-d').addEventListener('click', () => {
  applyTheme('decor');
  subscribeFirestore();
});
document.getElementById('btn-c').addEventListener('click', () => {
  applyTheme('creative');
  subscribeFirestore();
});

// Carrinho
document.getElementById('cart-fab')?.addEventListener('click', openCart);
document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
document.getElementById('cart-close-btn')?.addEventListener('click', closeCart);
document.getElementById('btn-checkout')?.addEventListener('click', () => {
  if (!cart.length) return;
  localStorage.setItem('glm_cart', JSON.stringify(cart));
  window.location.href = 'checkout/index.html';
});

applyTheme('decor');
initCanvasHero();
initThreePreview();
renderCart();
updateCartFab();
subscribeFirestore();
