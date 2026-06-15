/* ═══════════════════════════════════════════════════════════
   GLM UNIVERSE — admin.js  (ES module)
   v6 — novidades:
   · Upload de arquivo 3D (.3mf / .glb / .gltf / .obj) para Cloudinary
   · Preview 3D no painel admin via Three.js (3MFLoader para .3mf,
     GLTFLoader para .glb/.gltf, OBJLoader para .obj)
   · model3dUrl salvo/carregado no Firestore
   · Botão de remover modelo 3D existente na edição
   ═══════════════════════════════════════════════════════════ */

/* ── DOM REFS ──────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const viewLogin   = $('view-login');
const viewPanel   = $('view-panel');
const adminNav    = $('admin-nav');
const loginError  = $('login-error');

const uploadZone        = $('upload-zone');
const fileInput         = $('file-input');
const imgPreview        = $('img-preview');
const btnClearImg       = $('btn-clear-img');
const uploadPlaceholder = $('upload-placeholder');

const fName         = $('f-name');
const fPrice        = $('f-price');
const fBadge        = $('f-badge');
const fEmoji        = $('f-emoji');
const fDesc         = $('f-desc');
const fEditId       = $('f-edit-id');
const fEditImgUrl   = $('f-edit-img-url');
const fExtraPhotos  = $('f-extra-photos');
const fModel3dUrl   = $('f-model3d-url');
const btnSave       = $('btn-save');
const btnCancel     = $('btn-cancel-edit');
const formStatus    = $('form-status');
const formTitle     = $('form-title');

const searchInput = $('search-input');
const productList = $('product-list');
const listCount   = $('list-count');
const filterBtns  = document.querySelectorAll('.filter-btn');

const modalDelete     = $('modal-delete');
const modalDeleteName = $('modal-delete-name');
const modalCancel     = $('modal-cancel');
const modalConfirm    = $('modal-confirm');
const btnGoogleLogin  = $('btn-google-login');
const btnLogout       = $('btn-logout');

const extraPhotosGrid   = $('extra-photos-grid');
const btnAddExtraPhoto  = $('btn-add-extra-photo');
const extraFileInput    = $('extra-file-input');

// 3D
const file3dZone         = $('file3d-zone');
const file3dInput        = $('file3d-input');
const file3dNameEl       = $('file3d-name');
const file3dClear        = $('file3d-clear');
const file3dPreviewEl    = $('file3d-preview');
const file3dCanvas       = $('file3d-canvas');
const file3dExistingBadge  = $('file3d-existing-badge');
const file3dExistingName   = $('file3d-existing-name');
const file3dExistingRemove = $('file3d-existing-remove');

/* ── STATE ─────────────────────────────────────────────────── */
let allProducts     = [];
let filterCat       = 'all';
let searchQuery     = '';
let pendingDeleteId = null;
let unsubProducts   = null;
let selectedFile    = null;
let extraPhotoFiles = [];
let extraPhotoUrls  = [];
let selected3dFile  = null;   // File do modelo 3D selecionado
let admin3dRaf      = null;   // animationFrame do preview admin
let admin3dRenderer = null;

/* ── HELPERS ───────────────────────────────────────────────── */
function setStatus(msg, type) {
  if (!formStatus) return;
  formStatus.textContent = msg;
  formStatus.className   = 'form-status'
    + (type === 'ok'  ? ' status-ok'  : '')
    + (type === 'err' ? ' status-err' : '');
}

function showToast(msg, type) {
  const area = $('toast-area') || document.body;
  const t = document.createElement('div');
  t.className = `toast ${type === 'ok' ? 'ok' : 'err'}`;
  t.innerHTML = `<span>${type === 'ok' ? '✅' : '❌'}</span> ${msg}`;
  area.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function showLogin() {
  viewLogin.classList.remove('hidden');
  viewPanel.classList.remove('visible');
  adminNav.style.display = 'none';
}

function showPanel() {
  viewLogin.classList.add('hidden');
  viewPanel.classList.add('visible');
  adminNav.style.display = '';
}

/* ── FOTOS EXTRAS ──────────────────────────────────────────── */
function renderExtraGrid() {
  while (extraPhotosGrid.firstChild && extraPhotosGrid.firstChild !== btnAddExtraPhoto) {
    extraPhotosGrid.removeChild(extraPhotosGrid.firstChild);
  }
  extraPhotoUrls.forEach((url, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'extra-photo-thumb';
    thumb.innerHTML = `
      <img src="${url}" alt="extra ${i+1}" loading="lazy"/>
      <button class="extra-photo-remove" type="button" data-url="${url}" title="Remover">✕</button>`;
    thumb.querySelector('.extra-photo-remove').addEventListener('click', () => {
      extraPhotoUrls = extraPhotoUrls.filter(u => u !== url);
      renderExtraGrid();
    });
    extraPhotosGrid.insertBefore(thumb, btnAddExtraPhoto);
  });
  extraPhotoFiles.forEach((file, i) => {
    const objUrl = URL.createObjectURL(file);
    const thumb = document.createElement('div');
    thumb.className = 'extra-photo-thumb';
    thumb.style.position = 'relative';
    thumb.innerHTML = `
      <img src="${objUrl}" alt="novo ${i+1}"/>
      <button class="extra-photo-remove" type="button" data-idx="${i}" title="Remover">✕</button>`;
    thumb.querySelector('.extra-photo-remove').addEventListener('click', () => {
      extraPhotoFiles.splice(i, 1);
      renderExtraGrid();
    });
    extraPhotosGrid.insertBefore(thumb, btnAddExtraPhoto);
  });
}

btnAddExtraPhoto?.addEventListener('click', () => {
  extraFileInput.value = '';
  extraFileInput.click();
});

extraFileInput?.addEventListener('change', () => {
  const files = Array.from(extraFileInput.files || []);
  const valid = files.filter(f => {
    if (!f.type.startsWith('image/')) { showToast('Arquivo inválido: ' + f.name, 'err'); return false; }
    if (f.size > 10 * 1024 * 1024)   { showToast('Imagem muito grande (máx 10MB): ' + f.name, 'err'); return false; }
    return true;
  });
  extraPhotoFiles = [...extraPhotoFiles, ...valid];
  renderExtraGrid();
});

/* ══════════════════════════════════════════════════════════
   PREVIEW 3D NO ADMIN
   Suporta .3mf via 3MFLoader, .glb/.gltf via GLTFLoader,
   .obj via OBJLoader (Three.js r128 — mesmo importmap do site)
   ══════════════════════════════════════════════════════════ */
function stopAdmin3d() {
  if (admin3dRaf) { cancelAnimationFrame(admin3dRaf); admin3dRaf = null; }
  if (admin3dRenderer) { admin3dRenderer.dispose(); admin3dRenderer = null; }
  if (file3dPreviewEl) file3dPreviewEl.classList.remove('active');
}

async function startAdmin3dPreview(file) {
  stopAdmin3d();

  // Importa Three.js
  let THREE;
  try {
    THREE = await import('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js');
  } catch(e) {
    console.warn('Three.js não disponível para preview admin:', e.message);
    return;
  }

  file3dPreviewEl.classList.add('active');

  const w = file3dPreviewEl.clientWidth  || 332;
  const h = 160;

  admin3dRenderer = new THREE.WebGLRenderer({ canvas: file3dCanvas, antialias: true, alpha: true });
  admin3dRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  admin3dRenderer.setSize(w, h);
  admin3dRenderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dl = new THREE.DirectionalLight(0xffffff, 0.9);
  dl.position.set(2, 4, 3);
  scene.add(dl);
  const dl2 = new THREE.DirectionalLight(0xc9a6ff, 0.3);
  dl2.position.set(-2, -1, -2);
  scene.add(dl2);

  const ext = file.name.split('.').pop().toLowerCase();
  const objectUrl = URL.createObjectURL(file);

  let model = null;

  try {
    if (ext === '3mf') {
      model = await load3MF(THREE, objectUrl, scene);
    } else if (ext === 'glb' || ext === 'gltf') {
      model = await loadGLTF(THREE, objectUrl, scene);
    } else if (ext === 'obj') {
      model = await loadOBJ(THREE, objectUrl, scene);
    } else {
      // Fallback: shape genérico
      model = makeFallbackShape(THREE, scene);
    }
  } catch(e) {
    console.warn('Erro ao carregar modelo, usando fallback:', e.message);
    model = makeFallbackShape(THREE, scene);
  }

  URL.revokeObjectURL(objectUrl);

  if (model) {
    // Centraliza e escala o modelo para caber na câmera
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale  = 1.8 / maxDim;
    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    camera.position.set(0, 0, 3.2);
    camera.lookAt(0, 0, 0);
  }

  function loop() {
    admin3dRaf = requestAnimationFrame(loop);
    if (model) { model.rotation.y += 0.012; }
    admin3dRenderer.render(scene, camera);
  }
  loop();
}

/* ── Loaders ── */
async function load3MF(THREE, url, scene) {
  // 3MFLoader não está no CDN do r128 — fazemos parse manual do ZIP/XML
  // Estratégia: baixar o .3mf (que é um ZIP), extrair model.xml e parsear geometria
  try {
    const { unzipSync, strFromU8 } = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js');
    const resp = await fetch(url);
    const buf  = await resp.arrayBuffer();
    const files = unzipSync(new Uint8Array(buf));

    // Procura o arquivo model dentro do 3mf
    const modelKey = Object.keys(files).find(k => k.endsWith('.model') || k === '3D/3dmodel.model');
    if (!modelKey) throw new Error('3MF: arquivo model não encontrado');

    const xml = strFromU8(files[modelKey]);
    return parse3MFxml(THREE, xml, scene);
  } catch(e) {
    console.warn('3MF parse falhou:', e.message);
    return makeFallbackShape(THREE, scene);
  }
}

function parse3MFxml(THREE, xmlStr, scene) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlStr, 'application/xml');
  const vertices = [];
  const indices  = [];

  doc.querySelectorAll('vertices vertex').forEach(v => {
    vertices.push(parseFloat(v.getAttribute('x') || 0));
    vertices.push(parseFloat(v.getAttribute('y') || 0));
    vertices.push(parseFloat(v.getAttribute('z') || 0));
  });
  doc.querySelectorAll('triangles triangle').forEach(t => {
    indices.push(parseInt(t.getAttribute('v1')));
    indices.push(parseInt(t.getAttribute('v2')));
    indices.push(parseInt(t.getAttribute('v3')));
  });

  if (!vertices.length || !indices.length) return makeFallbackShape(THREE, scene);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat   = new THREE.MeshPhongMaterial({ color: 0xc9a6ff, shininess: 60, transparent: true, opacity: 0.92 });
  const mesh  = new THREE.Mesh(geo, mat);

  // Wireframe overlay
  const wf = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
    color: 0xc9a6ff, wireframe: true, transparent: true, opacity: 0.12
  }));
  mesh.add(wf);
  scene.add(mesh);
  return mesh;
}

async function loadGLTF(THREE, url, scene) {
  // GLTFLoader via CDN adicional
  const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js');
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url,
      gltf => { scene.add(gltf.scene); resolve(gltf.scene); },
      null,
      reject
    );
  });
}

async function loadOBJ(THREE, url, scene) {
  const { OBJLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/OBJLoader.js');
  return new Promise((resolve, reject) => {
    new OBJLoader().load(url,
      obj => { scene.add(obj); resolve(obj); },
      null,
      reject
    );
  });
}

function makeFallbackShape(THREE, scene) {
  const SHAPES = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.TorusGeometry(0.7, 0.28, 16, 40),
  ];
  const geo  = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const mat  = new THREE.MeshPhongMaterial({ color: 0xc9a6ff, shininess: 60, transparent: true, opacity: 0.92 });
  const mesh = new THREE.Mesh(geo, mat);
  const wf   = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
    color: 0xc9a6ff, wireframe: true, transparent: true, opacity: 0.12
  }));
  mesh.add(wf);
  scene.add(mesh);
  return mesh;
}

/* ── Evento: selecionar arquivo 3D ── */
file3dZone?.addEventListener('click', e => {
  if (e.target === file3dClear) return;
  file3dInput.click();
});

file3dInput?.addEventListener('change', () => {
  const file = file3dInput.files[0];
  if (!file) return;

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) { showToast('Arquivo 3D muito grande (máx 50MB).', 'err'); return; }

  selected3dFile = file;
  file3dNameEl.textContent = file.name;
  file3dNameEl.style.display = 'block';
  file3dZone.classList.add('has-file');

  // Esconde badge de modelo existente ao trocar
  file3dExistingBadge.classList.remove('active');
  fModel3dUrl.value = '';

  // Inicia preview 3D
  startAdmin3dPreview(file);
});

file3dClear?.addEventListener('click', e => {
  e.stopPropagation();
  clear3dFile();
});

file3dExistingRemove?.addEventListener('click', () => {
  fModel3dUrl.value = '';
  file3dExistingBadge.classList.remove('active');
  file3dExistingName.textContent = '';
});

function clear3dFile() {
  selected3dFile = null;
  file3dInput.value = '';
  file3dNameEl.style.display = 'none';
  file3dNameEl.textContent = '';
  file3dZone.classList.remove('has-file');
  stopAdmin3d();
}

/* ── BOOT ──────────────────────────────────────────────────── */
async function boot() {

  let firebaseApp, firestoreMod, authMod, config;

  try {
    [firebaseApp, firestoreMod, authMod, config] = await Promise.all([
      import('firebase/app'),
      import('firebase/firestore'),
      import('firebase/auth'),
      import('../js/firebase-config.js'),
    ]);
  } catch (err) {
    console.error('[boot] Falha ao importar módulos:', err);
    loginError.textContent = '❌ Erro ao carregar configuração: ' + err.message;
    return;
  }

  const { initializeApp }                              = firebaseApp;
  const { getFirestore, collection, addDoc, updateDoc,
          deleteDoc, doc, onSnapshot, query,
          orderBy, serverTimestamp }                   = firestoreMod;
  const { getAuth, GoogleAuthProvider,
          signInWithPopup, signOut,
          onAuthStateChanged }                         = authMod;
  const { FIREBASE_CONFIG, ALLOWED_EMAILS = [],
          CLOUDINARY = null }                          = config;

  let app, db, auth;
  try {
    app  = initializeApp(FIREBASE_CONFIG);
    db   = getFirestore(app);
    auth = getAuth(app);
  } catch (err) {
    console.error('[boot] Falha ao inicializar Firebase:', err);
    loginError.textContent = '❌ Erro ao inicializar Firebase: ' + err.message;
    return;
  }

  /* ── AUTH: botão Google ─────────────────────────────────── */
  btnGoogleLogin?.addEventListener('click', () => {
    loginError.textContent  = '';
    btnGoogleLogin.disabled = true;

    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
      .then(result => {
        const email = result.user.email;
        if (!ALLOWED_EMAILS.includes(email)) {
          return signOut(auth).then(() => {
            loginError.textContent = `❌ ${email} não tem permissão de acesso.`;
          });
        }
      })
      .catch(err => {
        console.error('[login]', err.code, err.message);
        switch (err.code) {
          case 'auth/popup-closed-by-user':
          case 'auth/cancelled-popup-request': break;
          case 'auth/popup-blocked':
            loginError.textContent = '❌ Popup bloqueado. Permita popups para este site.';
            break;
          case 'auth/unauthorized-domain':
            loginError.textContent = '❌ Domínio não autorizado no Firebase.';
            break;
          default:
            loginError.textContent = '❌ Erro ao autenticar: ' + (err.message || err.code);
        }
      })
      .finally(() => { btnGoogleLogin.disabled = false; });
  });

  btnLogout?.addEventListener('click', () => signOut(auth));

  /* ── AUTH STATE ─────────────────────────────────────────── */
  onAuthStateChanged(auth, user => {
    if (user && ALLOWED_EMAILS.includes(user.email)) {
      showPanel();
      startProductListener();
    } else {
      showLogin();
      if (unsubProducts) { unsubProducts(); unsubProducts = null; }
      allProducts = [];
      renderList();
      if (user) signOut(auth);
    }
  });

  /* ── FIRESTORE LISTENER ─────────────────────────────────── */
  function startProductListener() {
    if (unsubProducts) return;
    const ref = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    unsubProducts = onSnapshot(ref, snap => {
      allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderList();
    }, err => {
      console.error('[firestore]', err);
      showToast('Erro ao carregar produtos.', 'err');
    });
  }

  /* ── SALVAR PRODUTO ─────────────────────────────────────── */
  btnSave?.addEventListener('click', async () => {
    const name  = fName.value.trim();
    const price = fPrice.value.trim();
    const cat   = document.querySelector('input[name="cat"]:checked')?.value || 'decor';

    if (!name)  { setStatus('Nome obrigatório.', 'err'); return; }
    if (!price) { setStatus('Preço obrigatório.', 'err'); return; }

    btnSave.disabled = true;
    setStatus('Salvando…', '');

    try {
      let imageUrl    = fEditImgUrl.value || '';
      let model3dUrl  = fModel3dUrl.value || null;

      // Upload foto principal
      if (selectedFile) {
        if (!CLOUDINARY) throw new Error('Configuração Cloudinary ausente.');
        setStatus('Enviando foto principal… 0%', '');
        imageUrl = await uploadToCloudinary(selectedFile, CLOUDINARY, 'image', pct => {
          setStatus(`Enviando foto principal… ${pct}%`, '');
        });
      }

      // Upload fotos extras
      let finalExtraUrls = [...extraPhotoUrls];
      if (extraPhotoFiles.length) {
        if (!CLOUDINARY) throw new Error('Configuração Cloudinary ausente.');
        for (let i = 0; i < extraPhotoFiles.length; i++) {
          setStatus(`Enviando foto extra ${i+1}/${extraPhotoFiles.length}…`, '');
          const url = await uploadToCloudinary(extraPhotoFiles[i], CLOUDINARY, 'image', null);
          finalExtraUrls.push(url);
        }
      }

      // Upload modelo 3D
      if (selected3dFile) {
        if (!CLOUDINARY) throw new Error('Configuração Cloudinary ausente.');
        setStatus('Enviando modelo 3D…', '');
        // Cloudinary aceita raw files com resource_type=raw
        model3dUrl = await uploadToCloudinary(selected3dFile, CLOUDINARY, 'raw', pct => {
          setStatus(`Enviando modelo 3D… ${pct}%`, '');
        });
      }

      const data = {
        name,
        price:       parseFloat(price),
        badge:       fBadge.value.trim() || null,
        emoji:       fEmoji.value.trim() || '📦',
        description: fDesc.value.trim()  || null,
        category:    cat,
        imageUrl:    imageUrl || null,
        extraPhotos: finalExtraUrls,
        model3dUrl:  model3dUrl || null,
      };

      const editId = fEditId.value;
      if (editId) {
        await updateDoc(doc(db, 'products', editId), { ...data, updatedAt: serverTimestamp() });
        showToast('Produto atualizado!', 'ok');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'products'), data);
        showToast('Produto adicionado!', 'ok');
      }

      resetForm();
      setStatus('Salvo com sucesso!', 'ok');
    } catch (err) {
      console.error('[save]', err);
      setStatus('Erro: ' + err.message, 'err');
    } finally {
      btnSave.disabled = false;
    }
  });

  /* ── DELETAR ────────────────────────────────────────────── */
  modalConfirm?.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    modalDelete.classList.remove('open');
    try {
      await deleteDoc(doc(db, 'products', pendingDeleteId));
      showToast('Produto excluído.', 'ok');
    } catch (err) {
      showToast('Erro ao excluir: ' + err.message, 'err');
    }
    pendingDeleteId = null;
  });
}

/* ── RENDER LIST ───────────────────────────────────────────── */
function renderList() {
  const q = searchQuery.toLowerCase();
  const filtered = allProducts.filter(p => {
    const matchCat = filterCat === 'all'
      || p.category === filterCat
      || (!p.category && filterCat === 'decor');
    const matchQ = !q
      || p.name?.toLowerCase().includes(q)
      || p.description?.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  listCount.textContent = `${filtered.length} produto${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    productList.innerHTML = `<div class="empty-state"><p>Nenhum produto encontrado.</p></div>`;
    return;
  }

  productList.innerHTML = '';
  filtered.forEach(p => {
    const item = document.createElement('div');
    item.className = 'product-item';

    const thumbInner = p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy"/>`
      : (p.emoji || '📦');

    const catLabel   = p.category === 'creative' ? '✦ Creative' : '🌿 Decor';
    const price      = p.price != null
      ? 'R$ ' + Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      : '—';
    const extraCount = Array.isArray(p.extraPhotos) && p.extraPhotos.length
      ? `<span style="font-size:8.5px;opacity:.35">+${p.extraPhotos.length} foto${p.extraPhotos.length>1?'s':''}</span>`
      : '';
    const has3d = p.model3dUrl
      ? `<span title="Tem modelo 3D" style="font-size:8.5px;color:#c9a6ff;opacity:.7">⬡ 3D</span>`
      : '';

    item.innerHTML = `
      <div class="product-thumb">${thumbInner}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">
          <span class="product-price">${price}</span>
          <span class="product-cat">${catLabel}</span>
          ${extraCount}
          ${has3d}
          ${p.badge ? `<span style="font-size:8.5px;opacity:.4;background:rgba(255,255,255,.06);padding:1px 6px;border-radius:4px">${p.badge}</span>` : ''}
        </div>
      </div>
      <div class="product-actions">
        <button class="btn-icon" data-edit="${p.id}" title="Editar">✏️</button>
        <button class="btn-icon" data-del="${p.id}" title="Excluir">🗑️</button>
      </div>`;

    item.querySelector('[data-edit]').addEventListener('click', () => openEdit(p));
    item.querySelector('[data-del]').addEventListener('click',  () => openDelete(p));
    productList.appendChild(item);
  });
}

/* ── FILTROS ───────────────────────────────────────────────── */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterCat = btn.dataset.filter;
    renderList();
  });
});

searchInput?.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  renderList();
});

/* ── UPLOAD IMAGEM PRINCIPAL ───────────────────────────────── */
uploadZone?.addEventListener('click', e => {
  if (e.target === btnClearImg) return;
  fileInput.click();
});
uploadZone?.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.style.borderColor = 'rgba(94,202,138,.6)';
});
uploadZone?.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
uploadZone?.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file) setPreviewFile(file);
});

fileInput?.addEventListener('change', () => {
  if (fileInput.files[0]) setPreviewFile(fileInput.files[0]);
});

btnClearImg?.addEventListener('click', e => {
  e.stopPropagation();
  clearImagePreview();
});

function setPreviewFile(file) {
  if (!file.type.startsWith('image/')) { showToast('Arquivo inválido.', 'err'); return; }
  if (file.size > 10 * 1024 * 1024)   { showToast('Imagem muito grande (máx 10MB).', 'err'); return; }
  selectedFile = file;
  imgPreview.src = URL.createObjectURL(file);
  imgPreview.style.display        = 'block';
  uploadPlaceholder.style.display = 'none';
  btnClearImg.style.display       = 'flex';
  uploadZone.classList.add('has-preview');
}

function clearImagePreview() {
  selectedFile                    = null;
  fileInput.value                 = '';
  imgPreview.src                  = '';
  imgPreview.style.display        = 'none';
  uploadPlaceholder.style.display = '';
  btnClearImg.style.display       = 'none';
  uploadZone.classList.remove('has-preview');
}

/* ── UPLOAD CLOUDINARY (imagens e raw/3D) ──────────────────── */
async function uploadToCloudinary(file, cloudinary, resourceType, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinary.uploadPreset);

  // Para arquivos raw (3D), precisa de resource_type=raw
  const endpoint = resourceType === 'raw'
    ? `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/raw/upload`
    : `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress)
        onProgress(Math.round(e.loaded / e.total * 100));
    };
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        res.secure_url ? resolve(res.secure_url) : reject(new Error(res.error?.message || 'Upload falhou'));
      } catch (e) { reject(e); }
    };
    xhr.onerror = () => reject(new Error('Erro de rede no upload'));
    xhr.send(formData);
  });
}

/* ── EDITAR ────────────────────────────────────────────────── */
function openEdit(p) {
  fEditId.value     = p.id;
  fEditImgUrl.value = p.imageUrl || '';
  fName.value       = p.name || '';
  fPrice.value      = p.price ?? '';
  fBadge.value      = p.badge || '';
  fEmoji.value      = p.emoji || '';
  fDesc.value       = p.description || '';

  extraPhotoUrls  = Array.isArray(p.extraPhotos) ? [...p.extraPhotos] : [];
  extraPhotoFiles = [];
  renderExtraGrid();

  // Modelo 3D existente
  clear3dFile();
  if (p.model3dUrl) {
    fModel3dUrl.value = p.model3dUrl;
    // Extrai nome do arquivo da URL
    const urlParts = p.model3dUrl.split('/');
    const fileName = urlParts[urlParts.length - 1].split('?')[0];
    file3dExistingName.textContent = decodeURIComponent(fileName);
    file3dExistingBadge.classList.add('active');
  } else {
    fModel3dUrl.value = '';
    file3dExistingBadge.classList.remove('active');
  }

  const catInput = document.querySelector(`input[name="cat"][value="${p.category || 'decor'}"]`);
  if (catInput) catInput.checked = true;

  if (p.imageUrl) {
    imgPreview.src                  = p.imageUrl;
    imgPreview.style.display        = 'block';
    uploadPlaceholder.style.display = 'none';
    btnClearImg.style.display       = 'flex';
    uploadZone.classList.add('has-preview');
  } else {
    clearImagePreview();
  }

  formTitle.textContent   = 'EDITANDO PRODUTO';
  btnSave.textContent     = 'ATUALIZAR PRODUTO';
  btnCancel.style.display = '';
  setStatus('', '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

btnCancel?.addEventListener('click', resetForm);

function resetForm() {
  fEditId.value = fEditImgUrl.value = fModel3dUrl.value = '';
  fName.value = fPrice.value = fBadge.value = fEmoji.value = fDesc.value = '';
  const decor = document.querySelector('input[name="cat"][value="decor"]');
  if (decor) decor.checked = true;
  clearImagePreview();
  extraPhotoUrls  = [];
  extraPhotoFiles = [];
  renderExtraGrid();
  clear3dFile();
  file3dExistingBadge.classList.remove('active');
  file3dExistingName.textContent = '';
  formTitle.textContent   = 'ADICIONAR PRODUTO';
  btnSave.textContent     = 'SALVAR PRODUTO';
  btnCancel.style.display = 'none';
  setStatus('', '');
}

/* ── MODAL DELETAR ─────────────────────────────────────────── */
function openDelete(p) {
  pendingDeleteId             = p.id;
  modalDeleteName.textContent = `Excluir "${p.name}"? Esta ação não pode ser desfeita.`;
  modalDelete.classList.add('open');
}

modalCancel?.addEventListener('click', () => {
  modalDelete.classList.remove('open');
  pendingDeleteId = null;
});
modalDelete?.addEventListener('click', e => {
  if (e.target === modalDelete) {
    modalDelete.classList.remove('open');
    pendingDeleteId = null;
  }
});

/* ── INICIAR ───────────────────────────────────────────────── */
boot();
