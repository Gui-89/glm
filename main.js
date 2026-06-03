/* js/main.js
   ✅ CORRIGIDO: removido type="module" — agora é script clássico
   – Gerencia tema (decor / creative)
   – Escuta Firestore em tempo real e renderiza os cards
   – Liga hover dos cards ao ThreePreview
*/

/* ═══ STATE ════════════════════════════════════════════ */
var currentTheme = 'decor';
var unsubscribe  = null;

/* ═══ THEME ════════════════════════════════════════════ */
var THEME = {
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

function applyTheme(t) {
  currentTheme = t;
  var T = THEME[t];

  var ey = document.getElementById('eyebrow');
  ey.textContent = T.eyebrow;
  ey.className   = 'glm-eyebrow ' + T.eyeClass;

  document.getElementById('main-title').className = 'glm-title ' + T.titleClass;

  document.getElementById('btn-d').className = 'sel-btn ' + T.btnActive.d;
  document.getElementById('btn-c').className = 'sel-btn ' + T.btnActive.c;

  document.getElementById('dl1').className  = 'dline ' + T.divider.line;
  document.getElementById('dl2').className  = 'dline ' + T.divider.line;
  var dtxt = document.getElementById('dtxt');
  dtxt.className   = 'dtext ' + T.divider.text;
  dtxt.textContent = T.divText;

  document.getElementById('live-dot').className    = 'live-dot ' + T.dot;
  document.getElementById('live-text').textContent = T.liveText;

  if (window.heroCanvas) window.heroCanvas.setTheme(t);
  if (window.ThreePreview) window.ThreePreview.setTheme(t);

  // Re-renderiza cards com novo tema
  if (window.__lastProducts) renderGrid(window.__lastProducts);
}

/* ═══ CARD RENDER ══════════════════════════════════════ */
function formatPrice(v) {
  if (v === undefined || v === null || v === '') return '—';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function makeCard(prod, idx) {
  var T = THEME[currentTheme];
  var card = document.createElement('div');
  card.className = 'card ' + T.cardClass + ' fade-in';
  card.style.animationDelay = (idx * 55) + 'ms';

  var imgHtml = prod.imageUrl
    ? '<img src="' + prod.imageUrl + '" alt="' + prod.name + '" loading="lazy" />'
    : '<span class="emoji-fallback">' + (prod.emoji || '📦') + '</span>';

  var badgeHtml = prod.badge
    ? '<span class="badge ' + T.badgeClass + '">' + prod.badge + '</span>' : '';

  card.innerHTML =
    '<div class="card-img ' + T.ciClass + '">' +
      imgHtml + badgeHtml +
    '</div>' +
    '<div class="card-info">' +
      '<div class="card-name ' + T.nameClass + '">' + prod.name + '</div>' +
      '<div class="card-price ' + T.priceClass + '">' + formatPrice(prod.price) + '</div>' +
      (prod.description ? '<div class="card-desc">' + prod.description + '</div>' : '') +
    '</div>';

  // Three.js hover
  var hoverTimer;
  card.addEventListener('mouseenter', function(e) {
    hoverTimer = setTimeout(function() {
      if (window.ThreePreview) window.ThreePreview.show(e.clientX, e.clientY, idx);
    }, 180);
  });
  card.addEventListener('mousemove', function(e) {
    if (window.ThreePreview) window.ThreePreview.move(e.clientX, e.clientY);
  });
  card.addEventListener('mouseleave', function() {
    clearTimeout(hoverTimer);
    if (window.ThreePreview) window.ThreePreview.hide();
  });

  return card;
}

function renderGrid(products) {
  window.__lastProducts = products;
  var grid    = document.getElementById('grid');
  var loading = document.getElementById('loading-state');
  var empty   = document.getElementById('empty-state');

  loading.style.display = 'none';

  if (!products || !products.length) {
    grid.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.style.display  = 'grid';
  grid.innerHTML      = '';
  products.forEach(function(p, i) { grid.appendChild(makeCard(p, i)); });
}

/* ═══ FIRESTORE ════════════════════════════════════════ */
function subscribeFirestore() {
  if (!window.__db) {
    renderGrid(DEMO_PRODUCTS);
    return;
  }

  var db      = window.__db;
  var col     = window.__fsCollection;
  var snap    = window.__fsOnSnapshot;
  var q       = window.__fsQuery;
  var orderBy = window.__fsOrderBy;

  if (unsubscribe) unsubscribe();

  try {
    var ref = q(col(db, 'products'), orderBy('createdAt', 'desc'));
    unsubscribe = snap(ref, function(snapshot) {
      var products = snapshot.docs.map(function(d) {
        return Object.assign({ id: d.id }, d.data());
      });
      var filtered = products.filter(function(p) {
        if (currentTheme === 'creative') return p.category === 'creative';
        return p.category === 'decor' || !p.category;
      });
      renderGrid(filtered.length ? filtered : products);
    }, function(err) {
      console.warn('Firestore erro:', err);
      renderGrid(DEMO_PRODUCTS);
    });
  } catch (e) {
    console.warn('Firestore falhou:', e);
    renderGrid(DEMO_PRODUCTS);
  }
}

/* ═══ DEMO FALLBACK ════════════════════════════════════ */
var DEMO_PRODUCTS = [
  { id:'1', name:'Quadro Minimalista', price:189, badge:'NOVO', emoji:'🖼️',
    description:'Arte exclusiva para sua sala', category:'decor' },
  { id:'2', name:'Vaso Orgânico',      price:97,  badge:'TOP',  emoji:'🏺',
    description:'Cerâmica artesanal brasileira', category:'decor' },
  { id:'3', name:'Luminária Arc',      price:345, emoji:'💡',
    description:'Design escandinavo contemporâneo', category:'decor' },
  { id:'4', name:'Modelo 3D #01',      price:220, badge:'3D',   emoji:'💎',
    description:'Asset digital high-poly', category:'creative' },
  { id:'5', name:'Render Pack',        price:499, badge:'PRO',  emoji:'🎮',
    description:'10 cenas prontas para usar', category:'creative' },
  { id:'6', name:'Tapete Bouclé',      price:278, emoji:'🪨',
    description:'Textura tátil única, 160×230cm', category:'decor' },
];

/* ═══ GLOBAL API — ✅ exposta antes do init ════════════ */
window.GLM = {
  setTheme: function(t) { applyTheme(t); }
};

/* ═══ INIT ═════════════════════════════════════════════ */
function init() {
  // ✅ Liga os botões via addEventListener (mais robusto que onclick inline)
  var btnD = document.getElementById('btn-d');
  var btnC = document.getElementById('btn-c');
  if (btnD) btnD.addEventListener('click', function() { applyTheme('decor'); });
  if (btnC) btnC.addEventListener('click', function() { applyTheme('creative'); });

  applyTheme('decor');

  // ✅ Renderiza demo imediatamente — sem tela de loading travada
  renderGrid(DEMO_PRODUCTS);

  // Tenta Firebase (se já inicializado pelo module)
  if (window.__db) {
    subscribeFirestore();
  } else {
    window.addEventListener('fs-ready', function() {
      if (window.__db) subscribeFirestore();
      // se __db ainda undefined, DEMO já está visível — nada a fazer
    }, { once: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
