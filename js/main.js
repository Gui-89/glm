/* ═══════════════════════════════════════════════════════════
   GLM UNIVERSE — main.js  (ES module)
   v8.1 — fix: detecção de extensão de modelo 3D robusta,
   funciona com URLs do Cloudinary que incluem extensão
   em qualquer posição do path (ex: /3d_models/arquivo.3mf)
   ═══════════════════════════════════════════════════════════ */

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

function applyTheme(t) {
  currentTheme = t;
  const T = THEME[t];

  const ey = document.getElementById('eyebrow');
  if (ey) { ey.textContent = T.eyebrow; ey.className = 'glm-eyebrow ' + T.eyeClass; }

  const title = document.getElementById('main-title');
  if (title) title.className = 'glm-title ' + T.titleClass;

  const btnD = document.getElementById('btn-d');
  const btnC = document.getElementById('btn-c');
  if (btnD) btnD.className = T.btnD;
  if (btnC) btnC.className = T.btnC;

  const dl1  = document.getElementById('dl1');
  const dl2  = document.getElementById('dl2');
  const dtxt = document.getElementById('dtxt');
  if (dl1)  dl1.className   = T.dline;
  if (dl2)  dl2.className   = T.dline;
  if (dtxt) { dtxt.className = T.dtext; dtxt.textContent = T.divText; }

  const dot  = document.getElementById('live-dot');
  const ltxt = document.getElementById('live-text');
  if (dot)  dot.className    = T.dot;
  if (ltxt) ltxt.textContent = T.liveText;

  const video = document.getElementById('hero-video');
  if (video) {
    const newSrc = t === 'creative' ? 'assets/video-hero.mp4' : 'assets/video2-hero.mp4';
    const source = video.querySelector('source');
    const currentSrc = source?.getAttribute('src') || '';
    if (source && !currentSrc.endsWith(newSrc.split('/').pop())) {
      source.setAttribute('src', newSrc);
      video.load();
      video.play().catch(() => {});
    }
    video.style.filter = t === 'creative'
      ? 'hue-rotate(200deg) saturate(0.8) brightness(0.45)'
      : 'brightness(0.45) saturate(0.7)';
  }

  window._heroSetTheme?.(t);
  window._preview?.setTheme(t);

  document.documentElement.style.setProperty('--accent',
    t === 'creative' ? 'var(--purple)' : 'var(--green)');
  document.documentElement.style.setProperty('--accent-d',
    t === 'creative' ? 'var(--purple-d)' : 'var(--green-d)');
  document.documentElement.style.setProperty('--accent-b',
    t === 'creative' ? 'var(--purple-b)' : 'var(--green-b)');

  if (window.__lastProducts !== undefined) renderGrid(window.__lastProducts);
  subscribeFirestore();
}

document.getElementById('btn-d')?.addEventListener('click', () => {
  if (currentTheme === 'decor') return;
  applyTheme('decor');
});
document.getElementById('btn-c')?.addEventListener('click', () => {
  if (currentTheme === 'creative') return;
  applyTheme('creative');
});

/* ══════════════════════════════════════════════════════════
   CARRINHO
   ══════════════════════════════════════════════════════════ */
let cart = [];
try { cart = JSON.parse(localStorage.getItem('glm_cart') || '[]'); } catch(_) {}

function saveCart() {
  try { localStorage.setItem('glm_cart', JSON.stringify(cart)); } catch(_) {}
}
function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

function addToCart(prod, variantLabel = null, variantPrice = null) {
  const price = variantPrice ?? prod.price ?? 0;
  const key   = prod.id + (variantLabel ? '_' + variantLabel : '');
  const idx   = cart.findIndex(i => i.key === key);
  if (idx >= 0) {
    cart[idx].qty++;
  } else {
    cart.push({ key, id: prod.id, name: prod.name, emoji: prod.emoji || '📦',
      imageUrl: prod.imageUrl || null, price, variant: variantLabel, qty: 1 });
  }
  saveCart(); renderCart(); updateCartFab(); showCartToast(prod.name);
}

function removeFromCart(key) {
  cart = cart.filter(i => i.key !== key);
  saveCart(); renderCart(); updateCartFab();
}

function changeQty(key, delta) {
  const idx = cart.findIndex(i => i.key === key);
  if (idx < 0) return;
  const newQty = cart[idx].qty + delta;
  if (newQty <= 0) { removeFromCart(key); return; }
  cart[idx].qty = newQty;
  saveCart(); renderCart(); updateCartFab();
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
      <button class="cart-item-remove" data-key="${item.key}" title="Remover">✕</button>`;
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
   CHECKOUT
   ══════════════════════════════════════════════════════════ */
let selectedPayment  = 'pix';
let selectedDelivery = 'retirada';

function openCheckout() {
  if (!cart.length) return;
  closeCart();
  const summaryEl = document.getElementById('checkout-items-summary');
  const totalEl   = document.getElementById('checkout-total-display');
  if (summaryEl) {
    summaryEl.innerHTML = cart.map(item => `
      <div class="co-item-row">
        <span class="co-item-qty">${item.qty}x</span>
        <span class="co-item-name">${item.name}${item.variant ? ` · ${item.variant}` : ''}</span>
        <span class="co-item-price">${fmtBRL(item.price * item.qty)}</span>
      </div>`).join('');
  }
  if (totalEl) totalEl.textContent = fmtBRL(cartTotal());
  document.getElementById('checkout-overlay')?.classList.add('open');
}

function closeCheckout() {
  document.getElementById('checkout-overlay')?.classList.remove('open');
}

function sendOrder() {
  const name    = document.getElementById('co-name')?.value.trim();
  const phone   = document.getElementById('co-phone')?.value.trim();
  const address = document.getElementById('co-address')?.value.trim();
  const notes   = document.getElementById('co-notes')?.value.trim();
  const errEl   = document.getElementById('checkout-error');

  if (!name)  { if (errEl) errEl.textContent = 'Por favor, informe seu nome.'; return; }
  if (!phone) { if (errEl) errEl.textContent = 'Por favor, informe seu WhatsApp.'; return; }
  if (selectedDelivery === 'entrega' && !address) {
    if (errEl) errEl.textContent = 'Por favor, informe o endereço de entrega.'; return;
  }
  if (errEl) errEl.textContent = '';

  const lines = cart.map(i =>
    `• ${i.qty}x ${i.name}${i.variant ? ` (${i.variant})` : ''} — ${fmtBRL(i.price * i.qty)}`
  );
  const entrega   = selectedDelivery === 'entrega'
    ? `🚚 Entrega em: ${address}`
    : '🏪 Retirada (combinar local)';
  const pagamento = { pix:'💠 PIX', cartao:'💳 Cartão', dinheiro:'💵 Dinheiro' }[selectedPayment] || '';

  const msg = [
    `*Novo Pedido — GLM Universe* 🛍️`, ``,
    `*Cliente:* ${name}`, `*WhatsApp:* ${phone}`, ``,
    `*Itens:*`, ...lines, ``,
    `*Total:* ${fmtBRL(cartTotal())}`,
    `*Entrega:* ${entrega}`,
    `*Pagamento:* ${pagamento}`,
    notes ? `*Obs:* ${notes}` : null,
  ].filter(l => l !== null).join('\n');

  window.open(`https://wa.me/5561983156915?text=${encodeURIComponent(msg)}`, '_blank');
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
  if (!vars.length) { addToCart(prod); return; }

  const byType = {};
  vars.forEach(v => { if (!byType[v.type]) byType[v.type] = []; byType[v.type].push(v); });
  let selected = {};

  Object.entries(byType).forEach(([type, variants]) => {
    const group = document.createElement('div');
    group.className = 'variant-group';
    group.innerHTML = `<span class="variant-group-label">${type.toUpperCase()}</span>`;
    const pills = document.createElement('div');
    pills.className = 'variant-pills';
    variants.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'variant-pill'; btn.type = 'button';
      btn.textContent = v.label + (v.price ? ` (+${fmtBRL(v.price - (prod.price || 0))})` : '');
      btn.addEventListener('click', () => {
        pills.querySelectorAll('.variant-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selected[type] = v;
        const prices = Object.values(selected).map(s => s.price).filter(Boolean);
        document.getElementById('vm-price').textContent = fmtBRL(prices.length ? Math.max(...prices) : (prod.price ?? 0));
      });
      pills.appendChild(btn);
    });
    group.appendChild(pills); container.appendChild(group);
  });

  document.getElementById('vm-add').onclick = () => {
    const label  = Object.values(selected).map(s => s.label).join(' / ') || null;
    const prices = Object.values(selected).map(s => s.price).filter(Boolean);
    addToCart(prod, label, prices.length ? Math.max(...prices) : (prod.price ?? 0));
    ov.classList.remove('open'); ov.style.display = '';
  };
  document.getElementById('vm-cancel').onclick = () => {
    ov.classList.remove('open'); ov.style.display = '';
  };
  ov.style.display = 'flex';
  requestAnimationFrame(() => ov.classList.add('open'));
}

/* ══════════════════════════════════════════════════════════
   PRODUCT DETAIL MODAL
   ══════════════════════════════════════════════════════════ */
let _pdProd       = null;
let _pdImgIndex   = 0;
let _pdImgs       = [];
let _pd3dRaf      = null;
let _pd3dRenderer = null;
let _pd3dScene    = null;
let _pd3dCamera   = null;
let _pd3dMesh     = null;
let _pd3dActive   = false;

function buildPdImages(prod) {
  const imgs = [];
  if (prod.imageUrl) imgs.push(prod.imageUrl);
  if (Array.isArray(prod.extraPhotos)) {
    prod.extraPhotos.forEach(u => { if (u && !imgs.includes(u)) imgs.push(u); });
  }
  return imgs;
}

function pdSetImage(idx) {
  _pdImgIndex = idx;
  const mainEl  = document.getElementById('pd-main-img');
  const emojiEl = document.getElementById('pd-main-emoji');
  if (_pdImgs.length) {
    if (mainEl)  { mainEl.src = _pdImgs[idx]; mainEl.style.display = 'block'; }
    if (emojiEl) emojiEl.style.display = 'none';
  } else {
    if (mainEl)  mainEl.style.display = 'none';
    if (emojiEl) { emojiEl.textContent = _pdProd?.emoji || '📦'; emojiEl.style.display = 'flex'; }
  }
  document.querySelectorAll('.pd-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
  const prev = document.getElementById('pd-nav-prev');
  const next = document.getElementById('pd-nav-next');
  if (prev) prev.disabled = idx === 0;
  if (next) next.disabled = idx === _pdImgs.length - 1;
}

function pdStop3d() {
  if (_pd3dRaf) { cancelAnimationFrame(_pd3dRaf); _pd3dRaf = null; }
  _pd3dActive = false;
  const viewer = document.getElementById('pd-3d-viewer');
  if (viewer) viewer.classList.remove('active');
  const mainZone = document.getElementById('pd-gallery-main');
  if (mainZone) mainZone.style.display = '';
}

async function pdStart3d(modelUrl) {
  const viewer   = document.getElementById('pd-3d-viewer');
  const canvas   = document.getElementById('pd-3d-canvas');
  const mainZone = document.getElementById('pd-gallery-main');
  if (!viewer || !canvas) return;

  mainZone.style.display = 'none';
  viewer.classList.add('active');
  _pd3dActive = true;

  if (_pd3dRenderer) {
    function loop3d() {
      if (!_pd3dActive) return;
      if (_pd3dMesh) { _pd3dMesh.rotation.x += 0.012; _pd3dMesh.rotation.y += 0.018; }
      _pd3dRenderer.render(_pd3dScene, _pd3dCamera);
      _pd3dRaf = requestAnimationFrame(loop3d);
    }
    loop3d(); return;
  }

  let THREE;
  try { THREE = await import('three'); } catch(e) {
    viewer.classList.remove('active'); mainZone.style.display = ''; return;
  }

  _pd3dRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  _pd3dRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _pd3dRenderer.setClearColor(0x000000, 0);
  const w = viewer.clientWidth || 400;
  const h = viewer.clientHeight || 300;
  _pd3dRenderer.setSize(w, h);

  _pd3dScene  = new THREE.Scene();
  _pd3dCamera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
  _pd3dCamera.position.set(0, 0, 3.2);
  _pd3dScene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const pl = new THREE.PointLight(0xffffff, 1.2, 10);
  pl.position.set(2, 3, 3); _pd3dScene.add(pl);

  const col = currentTheme === 'creative' ? 0xc9a6ff : 0x5eca8a;

  _pd3dMesh = await loadModelForViewer(THREE, modelUrl, _pd3dScene, col);

  if (_pd3dMesh) {
    const box    = new THREE.Box3().setFromObject(_pd3dMesh);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2.0 / maxDim;
      _pd3dMesh.scale.setScalar(scale);
      _pd3dMesh.position.sub(center.multiplyScalar(scale));
    }
    _pd3dCamera.position.set(0, 0, 3.2);
    _pd3dCamera.lookAt(0, 0, 0);
  }

  function loop3d() {
    if (!_pd3dActive) return;
    if (_pd3dMesh) { _pd3dMesh.rotation.x += 0.008; _pd3dMesh.rotation.y += 0.014; }
    _pd3dRenderer.render(_pd3dScene, _pd3dCamera);
    _pd3dRaf = requestAnimationFrame(loop3d);
  }
  loop3d();
}

function openProductDetail(prod) {
  _pdProd     = prod;
  _pdImgIndex = 0;
  _pdImgs     = buildPdImages(prod);
  const ov    = document.getElementById('pd-overlay');
  if (!ov) return;
  pdStop3d();

  const nameEl   = document.getElementById('pd-name');
  const priceEl  = document.getElementById('pd-price');
  const badgeEl  = document.getElementById('pd-badge-tag');
  const descEl   = document.getElementById('pd-description');
  const catLabel = document.getElementById('pd-category-label');

  if (nameEl)  nameEl.textContent  = prod.name || '';
  if (priceEl) priceEl.textContent = fmtBRL(prod.price ?? 0);
  if (descEl)  descEl.textContent  = prod.description || '';

  const isCreative = prod.category === 'creative';
  if (badgeEl) {
    if (prod.badge) {
      badgeEl.textContent = prod.badge;
      badgeEl.className = `pd-badge-tag ${isCreative ? 'pd-badge-creative' : 'pd-badge-decor'}`;
      badgeEl.style.display = '';
    } else { badgeEl.style.display = 'none'; }
  }
  if (catLabel) catLabel.textContent = isCreative ? '✦ 3D Creative' : '🌿 Essência Decor';

  const thumbsEl = document.getElementById('pd-thumbs');
  if (thumbsEl) {
    thumbsEl.innerHTML = '';
    if (_pdImgs.length > 1) {
      _pdImgs.forEach((url, i) => {
        const t = document.createElement('div');
        t.className = 'pd-thumb' + (i === 0 ? ' active' : '');
        t.innerHTML = `<img src="${url}" alt="foto ${i+1}" loading="lazy">`;
        t.addEventListener('click', () => pdSetImage(i));
        thumbsEl.appendChild(t);
      });
      thumbsEl.style.display = 'flex';
    } else { thumbsEl.style.display = 'none'; }
  }

  const badge3d = document.getElementById('pd-3d-badge');
  if (badge3d) {
    if (prod.model3dUrl) {
      badge3d.classList.add('visible');
      badge3d.onclick = () => {
        if (_pd3dActive) { pdStop3d(); pdSetImage(_pdImgIndex); }
        else pdStart3d(prod.model3dUrl);
      };
    } else { badge3d.classList.remove('visible'); }
  }

  const varsEl = document.getElementById('pd-variants-container');
  if (varsEl) {
    varsEl.innerHTML = '';
    const vars = prod.variations || [];
    if (vars.length) {
      const byType = {};
      vars.forEach(v => { if (!byType[v.type]) byType[v.type] = []; byType[v.type].push(v); });
      let pdSelected = {};
      Object.entries(byType).forEach(([type, variants]) => {
        const group = document.createElement('div');
        group.className = 'pd-variant-group';
        group.innerHTML = `<div class="pd-variant-group-label">${type.toUpperCase()}</div>`;
        const pills = document.createElement('div');
        pills.className = 'pd-variant-pills';
        variants.forEach(v => {
          const btn = document.createElement('button');
          btn.className = 'pd-variant-pill'; btn.type = 'button';
          btn.textContent = v.label + (v.price ? ` (+${fmtBRL(v.price - (prod.price || 0))})` : '');
          btn.addEventListener('click', () => {
            pills.querySelectorAll('.pd-variant-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active'); pdSelected[type] = v;
            const prices = Object.values(pdSelected).map(s => s.price).filter(Boolean);
            if (priceEl) priceEl.textContent = fmtBRL(prices.length ? Math.max(...prices) : (prod.price ?? 0));
          });
          pills.appendChild(btn);
        });
        group.appendChild(pills); varsEl.appendChild(group);
      });
      const addBtn = document.getElementById('pd-add-btn');
      if (addBtn) {
        addBtn.onclick = () => {
          const label  = Object.values(pdSelected).map(s => s.label).join(' / ') || null;
          const prices = Object.values(pdSelected).map(s => s.price).filter(Boolean);
          addToCart(prod, label, prices.length ? Math.max(...prices) : (prod.price ?? 0));
          closeProductDetail();
        };
      }
    } else {
      const addBtn = document.getElementById('pd-add-btn');
      if (addBtn) addBtn.onclick = () => { addToCart(prod); closeProductDetail(); };
    }
    const addBtn = document.getElementById('pd-add-btn');
    if (addBtn) addBtn.className = isCreative ? 'pd-add-btn creative-btn' : 'pd-add-btn';
  }

  pdSetImage(0);
  ov.style.display = 'flex';
  requestAnimationFrame(() => ov.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function closeProductDetail() {
  const ov = document.getElementById('pd-overlay');
  if (!ov) return;
  pdStop3d();
  ov.classList.remove('open');
  setTimeout(() => { ov.style.display = 'none'; }, 400);
  document.body.style.overflow = '';
}

document.getElementById('pd-nav-prev')?.addEventListener('click', () => {
  if (_pdImgIndex > 0) pdSetImage(_pdImgIndex - 1);
});
document.getElementById('pd-nav-next')?.addEventListener('click', () => {
  if (_pdImgIndex < _pdImgs.length - 1) pdSetImage(_pdImgIndex + 1);
});
document.getElementById('pd-close')?.addEventListener('click', closeProductDetail);
document.getElementById('pd-overlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('pd-overlay')) closeProductDetail();
});

let _pdTouchX = 0;
document.getElementById('pd-gallery-main')?.addEventListener('touchstart', e => {
  _pdTouchX = e.touches[0].clientX;
}, { passive: true });
document.getElementById('pd-gallery-main')?.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - _pdTouchX;
  if (Math.abs(dx) > 40) {
    if (dx < 0 && _pdImgIndex < _pdImgs.length - 1) pdSetImage(_pdImgIndex + 1);
    if (dx > 0 && _pdImgIndex > 0) pdSetImage(_pdImgIndex - 1);
  }
}, { passive: true });

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
    H = canvas.height = hero ? hero.offsetHeight : 420;
  }

  function mkP() {
    const c = P_COLORS[cTheme];
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
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

  window.addEventListener('resize', () => { resize(); });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    resize();
    particles = Array.from({ length: 120 }, mkP);
    draw();
  }));
}

/* ══════════════════════════════════════════════════════════
   CARREGADOR DE MODELOS 3D
   v8.1 FIX: detecção de extensão robusta via regex —
   funciona com URLs do Cloudinary onde a extensão aparece
   no meio do path (ex: /3d_models/Vase_1234567890.3mf)
   ══════════════════════════════════════════════════════════ */

const _modelCache = new Map();

/**
 * Detecta a extensão do modelo 3D a partir da URL.
 * Usa regex para encontrar .3mf/.glb/.gltf/.obj em qualquer
 * parte do path, ignorando query strings.
 */
function getModel3dExtension(url) {
  const clean = url.split('?')[0]; // remove query string
  // Procura extensão 3D em qualquer posição do path
  const match = clean.match(/\.(3mf|glb|gltf|obj)(?:[^a-zA-Z0-9]|$)/i);
  if (match) return match[1].toLowerCase();
  // Fallback: última extensão do path
  return clean.split('/').pop().split('.').pop().toLowerCase();
}

async function loadModelForViewer(THREE, url, scene, color = 0x5eca8a) {
  // v8.1: usa detecção robusta em vez de split simples
  const ext = getModel3dExtension(url);

  if (_modelCache.has(url)) {
    const cached = _modelCache.get(url);
    if (cached && cached.clone) {
      const clone = cached.clone();
      recolorModel(clone, THREE, color);
      scene.add(clone);
      return clone;
    }
  }

  try {
    let model;
    if (ext === '3mf') {
      model = await fetch3MFModel(THREE, url, scene, color);
    } else if (ext === 'glb' || ext === 'gltf') {
      model = await fetchGLTFModel(THREE, url, scene, color);
    } else if (ext === 'obj') {
      model = await fetchOBJModel(THREE, url, scene, color);
    } else {
      console.warn(`[3D] Extensão não reconhecida na URL: "${url}" (detectado: "${ext}") — usando shape genérico`);
      model = makeGenericShape(THREE, scene, color);
    }
    _modelCache.set(url, model);
    return model;
  } catch(e) {
    console.warn('[3D preview] Falha ao carregar modelo, usando shape genérico:', e.message);
    return makeGenericShape(THREE, scene, color);
  }
}

async function fetch3MFModel(THREE, url, scene, color) {
  try {
    const { unzipSync, strFromU8 } = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js');
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf  = await resp.arrayBuffer();
    const zipped = unzipSync(new Uint8Array(buf));

    const modelKey = Object.keys(zipped).find(k =>
      k.endsWith('.model') || k === '3D/3dmodel.model' || k.startsWith('3D/')
    );
    if (!modelKey) throw new Error('3MF: arquivo model não encontrado no ZIP');

    const xml = strFromU8(zipped[modelKey]);
    return parse3MFGeometry(THREE, xml, scene, color);
  } catch(e) {
    console.warn('[3MF]', e.message);
    return makeGenericShape(THREE, scene, color);
  }
}

function parse3MFGeometry(THREE, xmlStr, scene, color) {
  const parser   = new DOMParser();
  const doc      = parser.parseFromString(xmlStr, 'application/xml');
  const allVerts = [];
  const allIdx   = [];

  let offset = 0;
  doc.querySelectorAll('object').forEach(obj => {
    const verts = [];
    const tris  = [];
    obj.querySelectorAll('vertices vertex').forEach(v => {
      verts.push(parseFloat(v.getAttribute('x') || 0));
      verts.push(parseFloat(v.getAttribute('y') || 0));
      verts.push(parseFloat(v.getAttribute('z') || 0));
    });
    obj.querySelectorAll('triangles triangle').forEach(t => {
      tris.push(parseInt(t.getAttribute('v1')) + offset);
      tris.push(parseInt(t.getAttribute('v2')) + offset);
      tris.push(parseInt(t.getAttribute('v3')) + offset);
    });
    allVerts.push(...verts);
    allIdx.push(...tris);
    offset += verts.length / 3;
  });

  if (!allVerts.length || !allIdx.length) {
    throw new Error('3MF: nenhuma geometria encontrada');
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allVerts), 3));
  geo.setIndex(allIdx);
  geo.computeVertexNormals();

  const mat  = new THREE.MeshPhongMaterial({
    color, emissive: color, emissiveIntensity: 0.08,
    shininess: 70, transparent: true, opacity: 0.94
  });
  const mesh = new THREE.Mesh(geo, mat);

  const wf = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
    color, wireframe: true, transparent: true, opacity: 0.10
  }));
  mesh.add(wf);
  scene.add(mesh);
  return mesh;
}

async function fetchGLTFModel(THREE, url, scene, color) {
  const { GLTFLoader } = await import(
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js'
  );
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url,
      gltf => {
        gltf.scene.traverse(child => {
          if (child.isMesh) {
            child.material = new THREE.MeshPhongMaterial({
              color, emissive: color, emissiveIntensity: 0.06,
              shininess: 60, transparent: true, opacity: 0.94
            });
          }
        });
        scene.add(gltf.scene);
        resolve(gltf.scene);
      },
      null,
      reject
    );
  });
}

async function fetchOBJModel(THREE, url, scene, color) {
  const { OBJLoader } = await import(
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/OBJLoader.js'
  );
  return new Promise((resolve, reject) => {
    new OBJLoader().load(url,
      obj => {
        obj.traverse(child => {
          if (child.isMesh) {
            child.material = new THREE.MeshPhongMaterial({
              color, emissive: color, emissiveIntensity: 0.06,
              shininess: 60, transparent: true, opacity: 0.94
            });
          }
        });
        scene.add(obj);
        resolve(obj);
      },
      null,
      reject
    );
  });
}

function makeGenericShape(THREE, scene, color) {
  const SHAPES = [
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.IcosahedronGeometry(0.85, 0),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.TorusGeometry(0.7, 0.28, 16, 40),
  ];
  const geo  = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const mat  = new THREE.MeshPhongMaterial({
    color, emissive: color, emissiveIntensity: 0.12,
    shininess: 80, transparent: true, opacity: 0.92
  });
  const mesh = new THREE.Mesh(geo, mat);
  const wf   = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
    color, wireframe: true, transparent: true, opacity: 0.18
  }));
  wf.scale.setScalar(1.005);
  mesh.add(wf);
  scene.add(mesh);
  return mesh;
}

function recolorModel(model, THREE, color) {
  if (model.traverse) {
    model.traverse(child => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.color?.setHex(color);
        child.material.emissive?.setHex(color);
      }
    });
  }
}

/* ══════════════════════════════════════════════════════════
   THREE.JS PREVIEW — hover nos cards
   ══════════════════════════════════════════════════════════ */
const PREV_COLORS = { decor: 0x5eca8a, creative: 0xc9a6ff };

async function initThreePreview() {
  const wrap = document.getElementById('preview-3d');
  const cvs  = document.getElementById('preview-canvas');
  if (!wrap || !cvs) return;

  let THREE;
  try {
    THREE = await import('three');
  } catch (e) {
    console.warn('Three.js não carregado — preview 3D desabilitado:', e.message);
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true });
  renderer.setSize(160, 160);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  let scene  = new THREE.Scene();
  let camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
  camera.position.set(0, 0, 3.2);

  function buildLights(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const pl = new THREE.PointLight(0xffffff, 1.2, 10);
    pl.position.set(2, 3, 3);
    scene.add(pl);
  }
  buildLights(scene);

  let mesh      = null;
  let raf       = null;
  let visible   = false;
  let pTheme    = 'decor';
  let loadingUrl = null;

  function clearScene() {
    const toRemove = [];
    scene.traverse(obj => {
      if (!obj.isLight && obj !== scene) toRemove.push(obj);
    });
    toRemove.forEach(obj => {
      scene.remove(obj);
      obj.geometry?.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    mesh = null;
  }

  function normalizeModel(model) {
    if (!model) return;
    const box    = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 1.8 / maxDim;
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
    }
    camera.position.set(0, 0, 3.2);
    camera.lookAt(0, 0, 0);
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (mesh) { mesh.rotation.y += 0.018; mesh.rotation.x += 0.006; }
    renderer.render(scene, camera);
  }

  function pos(x, y) {
    let l = x + 12, t = y + 12;
    if (l + 160 > window.innerWidth  - 8) l = x - 172;
    if (t + 160 > window.innerHeight - 8) t = y - 172;
    wrap.style.left = l + 'px';
    wrap.style.top  = t + 'px';
  }

  async function show(x, y, prod) {
    pos(x, y);
    wrap.style.display = 'block';

    const color    = PREV_COLORS[pTheme];
    const modelUrl = prod?.model3dUrl || null;

    if (loadingUrl === modelUrl && mesh) {
      if (!visible) { visible = true; loop(); }
      return;
    }

    loadingUrl = modelUrl;
    clearScene();
    buildLights(scene);

    if (!visible) { visible = true; loop(); }

    if (modelUrl) {
      mesh = await loadModelForViewer(THREE, modelUrl, scene, color);
      if (loadingUrl !== modelUrl) return;
      normalizeModel(mesh);
    } else {
      mesh = makeGenericShape(THREE, scene, color);
    }
  }

  function hide() {
    wrap.style.display = 'none';
    visible    = false;
    loadingUrl = null;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function move(x, y) { if (visible) pos(x, y); }

  function setTheme(t) {
    pTheme = t;
    if (!mesh) return;
    const col = PREV_COLORS[t];
    recolorModel(mesh, THREE, col);
  }

  window._preview = { show, hide, move, setTheme };
  window._preview.setTheme(currentTheme);
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
  const badge3d = prod.model3dUrl
    ? `<span class="card-badge-3d">⬡ 3D</span>`
    : '';

  const hasVars  = prod.variations?.length > 0;
  const btnLabel = hasVars ? '+ VER OPÇÕES' : '+ ADICIONAR';

  card.innerHTML = `
    <div class="${T.ci}">${img}${badge}${badge3d}</div>
    <div class="card-info">
      <div class="${T.name}">${prod.name}</div>
      <div class="${T.price}">${fmtBRL(prod.price ?? 0)}</div>
      ${prod.description ? `<div class="card-desc">${prod.description}</div>` : ''}
    </div>
    <button type="button" class="card-add-btn">${btnLabel}</button>`;

  card.addEventListener('click', e => {
    if (e.target.classList.contains('card-add-btn')) return;
    openProductDetail(prod);
  });

  card.querySelector('.card-add-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (hasVars) openVariantModal(prod);
    else addToCart(prod);
  });

  let ht;
  card.addEventListener('mouseenter', e => {
    ht = setTimeout(() => window._preview?.show(e.clientX, e.clientY, prod), 200);
  });
  card.addEventListener('mousemove',  e => window._preview?.move(e.clientX, e.clientY));
  card.addEventListener('mouseleave', () => { clearTimeout(ht); window._preview?.hide(); });
  return card;
}

/* ══════════════════════════════════════════════════════════
   RENDER GRID
   ══════════════════════════════════════════════════════════ */
function renderGrid(products) {
  const _all = products || [];
  window.__lastProducts = _all;

  const filtered = _all.filter(p =>
    currentTheme === 'creative'
      ? p.category === 'creative'
      : p.category === 'decor' || !p.category
  );

  const grid    = document.getElementById('grid');
  const loading = document.getElementById('loading-state');
  const empty   = document.getElementById('empty-state');

  if (loading) loading.style.display = 'none';
  if (!filtered.length) {
    if (grid)  grid.style.display  = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (grid)  grid.style.display  = 'grid';
  grid.innerHTML = '';
  filtered.forEach((p, i) => grid.appendChild(makeCard(p, i)));
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

let db = null;
let firestoreReady = false;
let unsub = null;
let fallbackTimer = null;

async function initFirebase() {
  try {
    const [{ initializeApp }, { getFirestore }, { FIREBASE_CONFIG }] = await Promise.all([
      import('firebase/app'),
      import('firebase/firestore'),
      import('./firebase-config.js'),
    ]);
    const app = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(app);
    firestoreReady = true;
  } catch (e) {
    console.warn('Firebase não inicializado — usando dados demo:', e.message);
    db = null; firestoreReady = false;
  }
}

async function subscribeFirestore() {
  if (unsub) { unsub(); unsub = null; }
  clearTimeout(fallbackTimer);
  const loading = document.getElementById('loading-state');
  const grid    = document.getElementById('grid');
  const empty   = document.getElementById('empty-state');
  if (loading) loading.style.display = 'block';
  if (grid)    grid.style.display    = 'none';
  if (empty)   empty.style.display   = 'none';

  if (!db) { setTimeout(() => renderGrid(DEMO), 300); return; }

  try {
    const { collection, onSnapshot, query, orderBy } = await import('firebase/firestore');
    fallbackTimer = setTimeout(() => { console.warn('Firestore timeout'); renderGrid(DEMO); }, 5000);
    const ref = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    unsub = onSnapshot(ref, snap => {
      clearTimeout(fallbackTimer);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderGrid(all.length ? all : DEMO);
    }, err => {
      clearTimeout(fallbackTimer);
      console.warn('Firestore erro:', err.message);
      renderGrid(DEMO);
    });
  } catch (e) {
    clearTimeout(fallbackTimer);
    console.warn('Firestore falhou:', e.message);
    renderGrid(DEMO);
  }
}

/* ══════════════════════════════════════════════════════════
   EVENT LISTENERS
   ══════════════════════════════════════════════════════════ */
document.getElementById('cart-fab')?.addEventListener('click', openCart);
document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
document.getElementById('cart-close-btn')?.addEventListener('click', closeCart);
document.getElementById('btn-checkout')?.addEventListener('click', () => { if (!cart.length) return; openCheckout(); });
document.getElementById('checkout-back')?.addEventListener('click', closeCheckout);
document.getElementById('btn-send-order')?.addEventListener('click', sendOrder);

document.querySelectorAll('.pay-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pay-opt').forEach(b => b.classList.remove('pay-opt-active'));
    btn.classList.add('pay-opt-active');
    selectedPayment = btn.dataset.pay;
  });
});

document.querySelectorAll('input[name="delivery"]').forEach(radio => {
  radio.addEventListener('change', () => {
    selectedDelivery = radio.value;
    const addrField = document.getElementById('address-field');
    if (addrField) addrField.style.display = radio.value === 'entrega' ? 'block' : 'none';
  });
});

/* ══════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════ */
applyTheme('decor');
initCanvasHero();
initThreePreview();
renderCart();
updateCartFab();
initFirebase().then(() => subscribeFirestore());
