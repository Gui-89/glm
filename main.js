/* js/main.js  — type="module"
   ✅ Firebase importado aqui dentro: sem race condition com scripts clássicos
   ✅ window.GLM exposto via globalThis para onclick inline caso necessário
   ✅ canvas-hero.js e threejs-preview.js são scripts clássicos: já estão prontos
*/

import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ═══ FIREBASE CONFIG ══════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAqEsBUgdvvVbuYgmqG59yFlqekMxQ8L3g",
  authDomain:        "glm-universe.firebaseapp.com",
  projectId:         "glm-universe",
  storageBucket:     "glm-universe.firebasestorage.app",
  messagingSenderId: "426101358920",
  appId:             "1:426101358920:web:6d20b1c48ef2dba2d7b37d",
  measurementId:     "G-DJ03MXYLQ3"
};

/* ═══ STATE ════════════════════════════════════════════ */
let currentTheme = 'decor';
let unsubscribe  = null;
let db           = null;

/* ═══ FIREBASE INIT ════════════════════════════════════ */
try {
  const app = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(app);
} catch (e) {
  console.warn('Firebase não inicializado:', e.message);
}

/* ═══ THEME MAP ════════════════════════════════════════ */
const THEME = {
  decor: {
    eyebrow:    'ESCOLHA SUA EXPERIÊNCIA',
    eyeClass:   'eye-decor',
    titleClass: 'title-decor',
    btnActive:  { d: 'sel-active-decor', c: '' },
    divider:    { line: 'dline-decor', text: 'dtext-decor' },
    dot:        'dot-decor',
    liveText:   'AO VIVO',
    divText:    'PRODUTOS EM DESTAQUE',
    cardClass:  'card-decor',
    ciClass:    'ci-decor',
    badgeClass: 'badge-decor',
    nameClass:  'name-decor',
    priceClass: 'price-decor',
  },
  creative: {
    eyebrow:    '3D CREATIVE STUDIO',
    eyeClass:   'eye-creative',
    titleClass: 'title-creative',
    btnActive:  { d: '', c: 'sel-active-creative' },
    divider:    { line: 'dline-creative', text: 'dtext-creative' },
    dot:        'dot-creative',
    liveText:   'LIVE',
    divText:    'CATÁLOGO 3D',
    cardClass:  'card-creative',
    ciClass:    'ci-creative',
    badgeClass: 'badge-creative',
    nameClass:  'name-creative',
    priceClass: 'price-creative',
  }
};

/* ═══ APPLY THEME ══════════════════════════════════════ */
function applyTheme(t) {
  currentTheme = t;
  const T = THEME[t];

  const ey = document.getElementById('eyebrow');
  ey.textContent = T.eyebrow;
  ey.className   = 'glm-eyebrow ' + T.eyeClass;

  document.getElementById('main-title').className = 'glm-title ' + T.titleClass;

  document.getElementById('btn-d').className = 'sel-btn ' + T.btnActive.d;
  document.getElementById('btn-c').className = 'sel-btn ' + T.btnActive.c;

  document.getElementById('dl1').className  = 'dline ' + T.divider.line;
  document.getElementById('dl2').className  = 'dline ' + T.divider.line;
  const dtxt = document.getElementById('dtxt');
  dtxt.className   = 'dtext ' + T.divider.text;
  dtxt.textContent = T.divText;

  document.getElementById('live-dot').className    = 'live-dot ' + T.dot;
  document.getElementById('live-text').textContent = T.liveText;

  // canvas-hero e ThreePreview são scripts clássicos — já estão no window
  window.heroCanvas?.setTheme(t);
  window.ThreePreview?.setTheme(t);

  // Re-renderiza cards com o novo tema
  if (window.__lastProducts) renderGrid(window.__lastProducts);
}

/* ═══ CARD RENDER ══════════════════════════════════════ */
function formatPrice(v) {
  if (v === undefined || v === null || v === '') return '—';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function makeCard(prod, idx) {
  const T    = THEME[currentTheme];
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
      ${imgHtml}${badgeHtml}
    </div>
    <div class="card-info">
      <div class="card-name ${T.nameClass}">${prod.name}</div>
      <div class="card-price ${T.priceClass}">${formatPrice(prod.price)}</div>
      ${prod.description ? `<div class="card-desc">${prod.description}</div>` : ''}
    </div>`;

  let hoverTimer;
  card.addEventListener('mouseenter', e => {
    hoverTimer = setTimeout(() => window.ThreePreview?.show(e.clientX, e.clientY, idx), 180);
  });
  card.addEventListener('mousemove', e => window.ThreePreview?.move(e.clientX, e.clientY));
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

  if (!products || !products.length) {
    grid.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.style.display  = 'grid';
  grid.innerHTML      = '';
  products.forEach((p, i) => grid.appendChild(makeCard(p, i)));
}

/* ═══ FIRESTORE LISTENER ═══════════════════════════════ */
function subscribeFirestore() {
  if (unsubscribe) unsubscribe();
  try {
    const ref = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    unsubscribe = onSnapshot(ref, snapshot => {
      const all      = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = all.filter(p =>
        currentTheme === 'creative'
          ? p.category === 'creative'
          : p.category === 'decor' || !p.category
      );
      renderGrid(filtered.length ? filtered : all);
    }, err => {
      console.warn('Firestore erro:', err);
      renderGrid(DEMO_PRODUCTS);
    });
  } catch (e) {
    console.warn('Firestore falhou:', e);
    renderGrid(DEMO_PRODUCTS);
  }
}

/* ═══ DEMO FALLBACK ════════════════════════════════════ */
const DEMO_PRODUCTS = [
  { id:'1', name:'Quadro Minimalista', price:189, badge:'NOVO', emoji:'🖼️', description:'Arte exclusiva para sua sala',          category:'decor'    },
  { id:'2', name:'Vaso Orgânico',      price:97,  badge:'TOP',  emoji:'🏺', description:'Cerâmica artesanal brasileira',          category:'decor'    },
  { id:'3', name:'Luminária Arc',      price:345,               emoji:'💡', description:'Design escandinavo contemporâneo',       category:'decor'    },
  { id:'4', name:'Modelo 3D #01',      price:220, badge:'3D',   emoji:'💎', description:'Asset digital high-poly',                category:'creative' },
  { id:'5', name:'Render Pack',        price:499, badge:'PRO',  emoji:'🎮', description:'10 cenas prontas para usar',             category:'creative' },
  { id:'6', name:'Tapete Bouclé',      price:278,               emoji:'🪨', description:'Textura tátil única, 160×230cm',         category:'decor'    },
];

/* ═══ INIT ═════════════════════════════════════════════ */
function init() {
  // Liga botões de tema
  document.getElementById('btn-d').addEventListener('click', () => {
    applyTheme('decor');
    if (db) subscribeFirestore();
    else renderGrid(DEMO_PRODUCTS.filter(p => p.category === 'decor' || !p.category));
  });
  document.getElementById('btn-c').addEventListener('click', () => {
    applyTheme('creative');
    if (db) subscribeFirestore();
    else renderGrid(DEMO_PRODUCTS.filter(p => p.category === 'creative'));
  });

  // Aplica tema inicial
  applyTheme('decor');

  // Carrega produtos
  if (db) {
    subscribeFirestore();
  } else {
    renderGrid(DEMO_PRODUCTS.filter(p => p.category === 'decor' || !p.category));
  }
}

// Módulos ES já rodam com DOM pronto (defer implícito)
init();
