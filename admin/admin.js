/* ═══════════════════════════════════════════════════════════
   GLM UNIVERSE — admin.js  (ES module)
   v5 — correções:
   · Fotos extras: btn-add-extra-photo abre file picker e sobe para Cloudinary
   · extraPhotos[] salvo/carregado no Firestore
   · openEdit carrega extraPhotos existentes
   · resetForm limpa extraPhotos
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

const fName       = $('f-name');
const fPrice      = $('f-price');
const fBadge      = $('f-badge');
const fEmoji      = $('f-emoji');
const fDesc       = $('f-desc');
const fEditId     = $('f-edit-id');
const fEditImgUrl = $('f-edit-img-url');
const fExtraPhotos = $('f-extra-photos');
const btnSave     = $('btn-save');
const btnCancel   = $('btn-cancel-edit');
const formStatus  = $('form-status');
const formTitle   = $('form-title');

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

/* ── STATE ─────────────────────────────────────────────────── */
let allProducts     = [];
let filterCat       = 'all';
let searchQuery     = '';
let pendingDeleteId = null;
let unsubProducts   = null;
let selectedFile    = null;
let extraPhotoFiles = [];   // File[] — novas fotos extras a subir
let extraPhotoUrls  = [];   // string[] — URLs já salvas (edição)

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
  // mantém apenas o botão "+"
  while (extraPhotosGrid.firstChild && extraPhotosGrid.firstChild !== btnAddExtraPhoto) {
    extraPhotosGrid.removeChild(extraPhotosGrid.firstChild);
  }

  // URLs já salvas
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

  // Arquivos novos (preview local)
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

/* Abre seletor de arquivos ao clicar no "+" */
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
          case 'auth/cancelled-popup-request':
            break;
          case 'auth/popup-blocked':
            loginError.textContent = '❌ Popup bloqueado. Permita popups para este site e tente novamente.';
            break;
          case 'auth/unauthorized-domain':
            loginError.textContent = '❌ Domínio não autorizado no Firebase (Authentication → Authorized domains).';
            break;
          case 'auth/operation-not-allowed':
            loginError.textContent = '❌ Login com Google não está habilitado no Firebase Auth.';
            break;
          default:
            loginError.textContent = '❌ Erro ao autenticar: ' + (err.message || err.code);
        }
      })
      .finally(() => {
        btnGoogleLogin.disabled = false;
      });
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
      let imageUrl = fEditImgUrl.value || '';

      // Upload foto principal
      if (selectedFile) {
        if (!CLOUDINARY) throw new Error('Configuração Cloudinary ausente no firebase-config.js');
        setStatus('Enviando foto principal… 0%', '');
        imageUrl = await uploadToCloudinary(selectedFile, CLOUDINARY, pct => {
          setStatus(`Enviando foto principal… ${pct}%`, '');
        });
      }

      // Upload fotos extras
      let finalExtraUrls = [...extraPhotoUrls];
      if (extraPhotoFiles.length) {
        if (!CLOUDINARY) throw new Error('Configuração Cloudinary ausente no firebase-config.js');
        for (let i = 0; i < extraPhotoFiles.length; i++) {
          setStatus(`Enviando foto extra ${i+1}/${extraPhotoFiles.length}…`, '');
          const url = await uploadToCloudinary(extraPhotoFiles[i], CLOUDINARY, null);
          finalExtraUrls.push(url);
        }
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

    const catLabel = p.category === 'creative' ? '✦ Creative' : '🌿 Decor';
    const price = p.price != null
      ? 'R$ ' + Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      : '—';
    const extraCount = Array.isArray(p.extraPhotos) && p.extraPhotos.length
      ? `<span style="font-size:8.5px;opacity:.35">+${p.extraPhotos.length} foto${p.extraPhotos.length>1?'s':''}</span>`
      : '';

    item.innerHTML = `
      <div class="product-thumb">${thumbInner}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">
          <span class="product-price">${price}</span>
          <span class="product-cat">${catLabel}</span>
          ${extraCount}
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
uploadZone?.addEventListener('dragleave', () => {
  uploadZone.style.borderColor = '';
});
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

async function uploadToCloudinary(file, cloudinary, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinary.uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`);

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

  // Fotos extras existentes
  extraPhotoUrls  = Array.isArray(p.extraPhotos) ? [...p.extraPhotos] : [];
  extraPhotoFiles = [];
  renderExtraGrid();

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
  fEditId.value = fEditImgUrl.value = '';
  fName.value = fPrice.value = fBadge.value = fEmoji.value = fDesc.value = '';
  const decor = document.querySelector('input[name="cat"][value="decor"]');
  if (decor) decor.checked = true;
  clearImagePreview();
  // limpa fotos extras
  extraPhotoUrls  = [];
  extraPhotoFiles = [];
  renderExtraGrid();
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
