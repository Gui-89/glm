/* js/main.js  (type="module")
   – Gerencia tema (decor / creative)
   – Escuta Firestore em tempo real e renderiza os cards
   – Liga hover dos cards ao ThreePreview
*/

/* ═══ STATE ════════════════════════════════════════════ */
let currentTheme = 'decor';
let unsubscribe   = null;

/* ═══ THEME ════════════════════════════════════════════ */
const THEME = {
  decor: {
    eyebrow:   'ESCOLHA SUA EXPERIÊNCIA',
    eyeClass:  'eye-decor',
    titleClass:'title-decor',
    btnActive:  { d: 'sel-active-decor', c: '' },
    divider:   { line: 'dline-decor', text: 'dtext-decor' },
    dot:       'dot-decor',
    liveText:  'AO VIVO',
    divText:   'PRODUTOS EM DESTAQUE',
    cardClass: 'card-decor',
    ciClass:   'ci-decor',
    badgeClass:'badge-decor',
    nameClass: 'name-decor',
    priceClass:'price-decor',
  },
  creative: {
    eyebrow:   '3D CREATIVE STUDIO',
    eyeClass:  'eye-creative',
    titleClass:'title-creative',
    btnActive:  { d: '', c: 'sel-active-creative' },
    divider:   { line: 'dline-creative', text: 'dtext-creative' },
    dot:       'dot-creative',
    liveText:  'LIVE',
    divText:   'CATÁLOGO 3D',
    cardClass: 'card-creative',
    ciClass:   'ci-creative',
    badgeClass:'badge-creative',
    nameClass: 'name-creative',
    priceClass:'price-creative',
  }
};

function applyTheme(t) {
  currentTheme = t;
  const T = THEME[t];

  // Eyebrow
  const ey = document.getElementById('eyebrow');
  ey.textContent  = T.eyebrow;
  ey.className    = 'glm-eyebrow ' + T.eyeClass;

  // Title
  document.getElementById('main-title').className = 'glm-title ' + T.titleClass;

  // Buttons
  document.getElementById('btn-d').className = 'sel-btn ' + T.btnActive.d;
  document.getElementById('btn-c').className = 'sel-btn ' + T.btnActive.c;

  // Divider
  document.getElementById('dl1').className = 'dline ' + T.divider.line;
  document.getElementById('dl2').className = 'dline ' + T.divider.line;
  document.getElementById('dtxt').className = 'dtext ' + T.divider.text;
  document.getElementById('dtxt').textContent = T.divText;

  // Live dot
  document.getElementById('live-dot').className = 'live-dot ' + T.dot;
  document.getElementById('live-text').textContent = T.liveText;

  // Propagate to helpers
  window.heroCanvas?.setTheme(t);
  window.ThreePreview?.setTheme(t);

  // Re-render cards with new theme classes
  renderGrid(window.__lastProducts || []);
}

/* ═══ CARD RENDER ══════════════════════════════════════ */
function formatPrice(v) {
  if (!v && v !== 0) return '—';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function makeCard(prod, idx) {
  const T = THEME[currentTheme];
  const card = document.createElement('div');
  card.className = 'card ' + T.cardClass + ' fade-in';
  card.style.animationDelay = (idx * 55) + 'ms';

  const imgHtml = prod.imageUrl
    ? `<img src="${prod.imageUrl}" alt="${prod.name}" loading="lazy" />`
    : `<span class="emoji-fallback">${prod.emoji || '📦'}</span>`;

  const badgeHtml = prod.badge
    ? `<span class="badge ${T.badgeClass}">${prod.badge}</span>` : '';

  card.innerHTML = `
    <div class="card-img ${T.ciClass}">
      ${imgHtml}
      ${badgeHtml}
    </div>
    <div class="card-info">
      <div class="card-name ${T.nameClass}">${prod.name}</div>
      <div class="card-price ${T.priceClass}">${formatPrice(prod.price)}</div>
      ${prod.description ? `<div class="card-desc">${prod.description}</div>` : ''}
    </div>`;

  // Three.js hover
  let hoverTimer;
  card.addEventListener('mouseenter', e => {
    hoverTimer = setTimeout(() => {
      window.ThreePreview?.show(e.clientX, e.clientY, idx);
    }, 180);
  });
  card.addEventListener('mousemove', e => {
    window.ThreePreview?.move(e.clientX, e.clientY);
  });
  card.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    window.ThreePreview?.hide();
  });

  return card;
}

function renderGrid(products) {
  window.__lastProducts = products;
  const grid    = document.getElementById('grid');
  const loading = document.getElementById('loading-state');
  const empty   = document.getElementById('empty-state');

  loading.style.display = 'none';

  if (!products.length) {
    grid.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.style.display  = 'grid';
  grid.innerHTML      = '';
  products.forEach((p, i) => grid.appendChild(makeCard(p, i)));
}

/* ═══ FIRESTORE ════════════════════════════════════════ */
function subscribeFirestore() {
  if (!window.__db) return;

  const { __db: db, __fsCollection: col, __fsOnSnapshot: snap,
          __fsQuery: q, __fsOrderBy: orderBy, __fsWhere: where } = window;

  if (unsubscribe) unsubscribe();

  const ref = q(col(db, 'products'), orderBy('createdAt', 'desc'));

  unsubscribe = snap(ref, (snapshot) => {
    const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Filter by theme/category if set
    const filtered = currentTheme === 'creative'
      ? products.filter(p => p.category === 'creative' || !p.category)
      : products.filter(p => p.category !== 'creative' || !p.category);

    // Show all if no category split makes sense
    renderGrid(products.length ? products : []);
  }, (err) => {
    console.error('Firestore error:', err);
    // Fallback to demo products
    renderGrid(DEMO_PRODUCTS);
  });
}

/* ═══ DEMO FALLBACK (sem Firebase configurado) ═════════ */
const DEMO_PRODUCTS = [
  { id:'1', name:'Quadro Minimalista', price:189, badge:'NOVO', emoji:'🖼️',
    description:'Arte exclusiva para sua sala' },
  { id:'2', name:'Vaso Orgânico', price:97, badge:'TOP', emoji:'🏺',
    description:'Cerâmica artesanal brasileira' },
  { id:'3', name:'Luminária Arc', price:345, emoji:'💡',
    description:'Design escandinavo contemporâneo' },
  { id:'4', name:'Modelo 3D #01', price:220, badge:'3D', emoji:'💎',
    description:'Asset digital high-poly' },
  { id:'5', name:'Render Pack', price:499, badge:'PRO', emoji:'🎮',
    description:'10 cenas prontas para usar' },
  { id:'6', name:'Tapete Bouclé', price:278, emoji:'🪨',
    description:'Textura tátil única, 160×230cm' },
];

/* ═══ GLOBAL API (usada pelos botões inline do HTML) ═══ */
window.GLM = {
  setTheme(t) { applyTheme(t); }
};

/* ═══ INIT ═════════════════════════════════════════════ */
function init() {
  applyTheme('decor');

  if (window.__db) {
    subscribeFirestore();
  } else {
    // Aguarda Firebase inicializar
    window.addEventListener('fs-ready', () => subscribeFirestore(), { once: true });
    // Timeout de segurança — mostra demo se Firebase não responder em 3 s
    setTimeout(() => {
      if (!window.__lastProducts) renderGrid(DEMO_PRODUCTS);
    }, 3000);
  }
}

// Garante que o DOM esteja pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
