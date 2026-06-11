/* ═══════════════════════════════════════════════════════════
   GLM UNIVERSE — admin.js  (ES module)
   Auth Google · Firestore CRUD · Cloudinary upload
   v2 — fix: caminho correto do firebase-config.js (raiz),
        captura completa de erros de autenticação,
        inicialização resiliente com erro visível na tela
   ═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   DOM REFS — registrados primeiro, sem dependências externas
   ══════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════ */
let allProducts      = [];
let filterCat        = 'all';
let searchQuery      = '';
let pendingDeleteId  = null;
let unsubProducts    = null;
let selectedFile     = null;

let auth = null;
let db   = null;
let CLOUDINARY = null;
let ALLOWED_EMAILS = [];

/* ══════════════════════════════════════════════════════════
   HELPERS (definidos cedo — usados no boot e no resto)
   ══════════════════════════════════════════════════════════ */
function setStatus(msg, type) {
  if (!formStatus) return;
  formStatus.textContent = msg;
  formStatus.className   = 'form-status ' + (type === 'ok' ? 'status-ok' : type === 'err' ? 'status-err' : '');
}

function showToast(msg, type) {
  const area = $('toast-area') || document.body;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type === 'ok' ? '✅' : '❌'}</span> ${msg}`;
  area.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ══════════════════════════════════════════════════════════
   BOOT — inicializa Firebase. Se falhar, mostra erro na tela
   em vez de travar o módulo inteiro silenciosamente.
   ══════════════════════════════════════════════════════════ */
async function boot() {
  let initializeApp, getFirestore, getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged;
  let FIREBASE_CONFIG;

  try {
    [
      { initializeApp },
      { getFirestore },
      { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged },
      { FIREBASE_CONFIG, ALLOWED_EMAILS: allowed, CLOUDINARY: cloud }
    ] = await Promise.all([
      import('firebase/app'),
      import('firebase/firestore'),
      import('firebase/auth'),
      // Caminho correto: admin.js está em admin/, firebase-config.js está na raiz
      import('../firebase-config.js'),
    ]);
    ALLOWED_EMAILS = allowed || [];
    CLOUDINARY     = cloud || null;
  } catch (e) {
    console.error('Falha ao carregar dependências:', e);
    if (loginError) {
      loginError.textContent = '❌ Erro ao carregar configuração: ' + e.message;
    }
    return;
  }

  let app;
  try {
    app  = initializeApp(FIREBASE_CONFIG);
    db   = getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    console.error('Falha ao inicializar Firebase:', e);
    if (loginError) {
      loginError.textContent = '❌ Erro ao inicializar Firebase: ' + e.message;
    }
    return;
  }

  /* ══════════════════════════════════════════════════════
     AUTH — listeners
     ══════════════════════════════════════════════════════ */
  btnGoogleLogin?.addEventListener('click', async () => {
    if (loginError) loginError.textContent = '';
    btnGoogleLogin.disabled = true;
    try {
      const provider = new GoogleAuthProvider();
      const result   = await signInWithPopup(auth, provider);
      const email    = result.user.email;
      if (!ALLOWED_EMAILS.includes(email)) {
        await signOut(auth);
        if (loginError) loginError.textContent = `❌ ${email} não tem permissão de acesso.`;
      }
    } catch (e) {
      console.error('Erro de login:', e.code, e.message);
      if (!loginError) {
        btnGoogleLogin.disabled = false;
        return;
      }
      switch (e.code) {
        case 'auth/popup-closed-by-user':
          // usuário fechou — não mostra erro
          break;
        case 'auth/popup-blocked':
          loginError.textContent = '❌ O navegador bloqueou o popup. Permita popups para este site e tente novamente.';
          break;
        case 'auth/cancelled-popup-request':
          break;
        case 'auth/unauthorized-domain':
          loginError.textContent = '❌ Este domínio não está autorizado no Firebase Auth (adicione em Authentication → Settings → Authorized domains).';
          break;
        case 'auth/operation-not-allowed':
          loginError.textContent = '❌ Login com Google não está habilitado no Firebase Auth.';
          break;
        default:
          loginError.textContent = '❌ Erro ao autenticar: ' + (e.message || e.code || 'desconhecido');
      }
    } finally {
      btnGoogleLogin.disabled = false;
    }
  });

  btnLogout?.addEventListener('click', () => signOut(auth));

  onAuthStateChanged(auth, user => {
    if (user && ALLOWED_EMAILS.includes(user.email)) {
      if (viewLogin) viewLogin.style.display = 'none';
      if (viewPanel) { viewPanel.style.display = ''; viewPanel.classList.add('visible'); }
      if (adminNav)  adminNav.style.display  = '';
      startProductListener();
    } else {
      if (viewLogin) viewLogin.style.display = '';
      if (viewPanel) { viewPanel.style.display = 'none'; viewPanel.classList.remove('visible'); }
      if (adminNav)  adminNav.style.display  = 'none';
      if (unsubProducts) { unsubProducts(); unsubProducts = null; }
      if (user) signOut(auth);
    }
  });

  /* ══════════════════════════════════════════════════════
     FIRESTORE LISTENER
     ══════════════════════════════════════════════════════ */
  async function startProductListener() {
    if (unsubProducts) return;
    const { collection, onSnapshot, query, orderBy } = await import('firebase/firestore');
    const ref = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    unsubProducts = onSnapshot(ref, snap => {
      allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderList();
    }, err => {
      console.error('Firestore erro:', err);
      showToast('Erro ao carregar produtos.', 'err');
    });
  }

  /* ══════════════════════════════════════════════════════
     SALVAR PRODUTO
     ══════════════════════════════════════════════════════ */
  btnSave?.addEventListener('click', saveProduct);

  async function saveProduct() {
    const { collection, addDoc, updateDoc, doc, serverTimestamp } = await import('firebase/firestore');

    const name  = fName.value.trim();
    const price = fPrice.value.trim();
    const cat   = document.querySelector('input[name="cat"]:checked')?.value || 'decor';

    if (!name)  { setStatus('Nome obrigatório.', 'err'); return; }
    if (!price) { setStatus('Preço obrigatório.', 'err'); return; }

    btnSave.disabled = true;
    setStatus('Salvando…', '');

    try {
      let imageUrl = fEditImgUrl.value || '';

      if (selectedFile) {
        setStatus('Enviando imagem… 0%', '');
        imageUrl = await uploadToCloudinary(selectedFile, pct => {
          setStatus(`Enviando imagem… ${pct}%`, '');
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
    } catch (e) {
      console.error(e);
      setStatus('Erro: ' + e.message, 'err');
    } finally {
      btnSave.disabled = false;
    }
  }

  /* ══════════════════════════════════════════════════════
     DELETAR
     ══════════════════════════════════════════════════════ */
  modalConfirm?.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    const { deleteDoc, doc } = await import('firebase/firestore');
    modalDelete.style.display = 'none';
    try {
      await deleteDoc(doc(db, 'products', pendingDeleteId));
      showToast('Produto excluído.', 'ok');
    } catch (e) {
      showToast('Erro ao excluir: ' + e.message, 'err');
    }
    pendingDeleteId = null;
  });
}

/* ══════════════════════════════════════════════════════════
   RENDER LIST
   ══════════════════════════════════════════════════════════ */
function renderList() {
  const q = searchQuery.toLowerCase();
  const filtered = allProducts.filter(p => {
    const matchCat = filterCat === 'all' || p.category === filterCat || (!p.category && filterCat === 'decor');
    const matchQ   = !q || p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  listCount.textContent = `${filtered.length} produto${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    productList.innerHTML = `<div class="empty-state" style="padding:32px 0">
      <p>Nenhum produto encontrado.</p></div>`;
    return;
  }

  productList.innerHTML = '';
  filtered.forEach(p => {
    const item = document.createElement('div');
    item.className = 'product-item';

    const thumb = document.createElement('div');
    thumb.className = 'product-item-thumb';
    if (p.imageUrl) {
      const img = document.createElement('img');
      img.src = p.imageUrl; img.alt = p.name;
      thumb.appendChild(img);
    } else {
      thumb.textContent = p.emoji || '📦';
    }

    const catLabel = p.category === 'creative' ? '✦ Creative' : '🌿 Decor';
    const price    = p.price != null
      ? 'R$ ' + Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      : '—';

    item.innerHTML = `
      ${thumb.outerHTML}
      <div class="product-item-info">
        <div class="product-item-name">${p.name}</div>
        <div class="product-item-meta">
          <span class="product-item-price">${price}</span>
          <span>${catLabel}</span>
          ${p.badge ? `<span>${p.badge}</span>` : ''}
        </div>
      </div>
      <div class="product-item-actions">
        <button class="btn-icon" data-edit="${p.id}" title="Editar">✏️</button>
        <button class="btn-icon" data-delete="${p.id}" data-name="${p.name}" title="Excluir">🗑️</button>
      </div>`;

    item.querySelector('[data-edit]').addEventListener('click',   () => openEdit(p));
    item.querySelector('[data-delete]').addEventListener('click', () => openDelete(p));
    productList.appendChild(item);
  });
}

/* ══════════════════════════════════════════════════════════
   FILTROS
   ══════════════════════════════════════════════════════════ */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('filter-active', 'active'));
    btn.classList.add('filter-active', 'active');
    filterCat = btn.dataset.filter;
    renderList();
  });
});

searchInput?.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  renderList();
});

/* ══════════════════════════════════════════════════════════
   UPLOAD DE IMAGEM — CLOUDINARY (sem Firebase Storage)
   ══════════════════════════════════════════════════════════ */
uploadZone?.addEventListener('click', () => fileInput.click());

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
  const url = URL.createObjectURL(file);
  imgPreview.src = url;
  imgPreview.style.display     = 'block';
  uploadPlaceholder.style.display = 'none';
  btnClearImg.style.display    = 'flex';
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

/**
 * Faz upload para o Cloudinary via unsigned preset.
 * Retorna a URL segura da imagem.
 */
async function uploadToCloudinary(file, onProgress) {
  if (!CLOUDINARY) throw new Error('Configuração do Cloudinary ausente.');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY.uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round(e.loaded / e.total * 100));
      }
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.secure_url) resolve(res.secure_url);
        else reject(new Error(res.error?.message || 'Upload falhou'));
      } catch (e) {
        reject(e);
      }
    };

    xhr.onerror = () => reject(new Error('Erro de rede no upload'));
    xhr.send(formData);
  });
}

/* ══════════════════════════════════════════════════════════
   EDITAR
   ══════════════════════════════════════════════════════════ */
function openEdit(p) {
  fEditId.value      = p.id;
  fEditImgUrl.value  = p.imageUrl || '';
  fName.value        = p.name || '';
  fPrice.value       = p.price ?? '';
  fBadge.value       = p.badge || '';
  fEmoji.value       = p.emoji || '';
  fDesc.value        = p.description || '';

  const catInput = document.querySelector(`input[name="cat"][value="${p.category || 'decor'}"]`);
  if (catInput) catInput.checked = true;

  if (p.imageUrl) {
    imgPreview.src = p.imageUrl;
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
  document.querySelector('input[name="cat"][value="decor"]').checked = true;
  clearImagePreview();
  formTitle.textContent   = 'ADICIONAR PRODUTO';
  btnSave.textContent     = 'SALVAR PRODUTO';
  btnCancel.style.display = 'none';
  setStatus('', '');
}

/* ══════════════════════════════════════════════════════════
   DELETAR — abrir modal
   ══════════════════════════════════════════════════════════ */
function openDelete(p) {
  pendingDeleteId = p.id;
  modalDeleteName.textContent = `Excluir "${p.name}"? Esta ação não pode ser desfeita.`;
  modalDelete.style.display   = 'flex';
}

modalCancel?.addEventListener('click', () => {
  modalDelete.style.display = 'none';
  pendingDeleteId = null;
});

/* ══════════════════════════════════════════════════════════
   START
   ══════════════════════════════════════════════════════════ */
boot();
