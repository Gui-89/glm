/* ═══════════════════════════════════════════════════════════
   GLM UNIVERSE — admin.js  (ES module)
   Auth Google · Firestore CRUD · Storage upload
   ═══════════════════════════════════════════════════════════ */

import { initializeApp }          from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy,
         addDoc, updateDoc, deleteDoc, doc, serverTimestamp }
  from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from 'firebase/auth';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject }
  from 'firebase/storage';

/* ══════════════════════════════════════════════════════════
   CONFIG
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

// ✏️  ADICIONE AQUI os emails Google autorizados
const ALLOWED_EMAILS = [
  'seuemail@gmail.com',   // <- substitua pelo seu email
  // 'outro@gmail.com',   // adicione mais se necessário
];

/* ══════════════════════════════════════════════════════════
   FIREBASE INIT
   ══════════════════════════════════════════════════════════ */
const app     = initializeApp(FIREBASE_CONFIG);
const db      = getFirestore(app);
const auth    = getAuth(app);
const storage = getStorage(app);

/* ══════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════ */
let allProducts  = [];
let filterCat    = 'all';
let searchQuery  = '';
let pendingDeleteId  = null;
let pendingDeleteImg = null;
let unsubProducts    = null;
let selectedFile     = null;

/* ══════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const viewLogin   = $('view-login');
const viewPanel   = $('view-panel');
const adminNav    = $('admin-nav');
const loginError  = $('login-error');

const uploadZone  = $('upload-zone');
const fileInput   = $('file-input');
const imgPreview  = $('img-preview');
const btnClearImg = $('btn-clear-img');
const uploadPlaceholder = $('upload-placeholder');

const fName     = $('f-name');
const fPrice    = $('f-price');
const fBadge    = $('f-badge');
const fEmoji    = $('f-emoji');
const fDesc     = $('f-desc');
const fEditId   = $('f-edit-id');
const fEditImgUrl = $('f-edit-img-url');
const btnSave   = $('btn-save');
const btnCancel = $('btn-cancel-edit');
const formStatus = $('form-status');
const formTitle  = $('form-title');

const searchInput  = $('search-input');
const productList  = $('product-list');
const listCount    = $('list-count');
const filterBtns   = document.querySelectorAll('.filter-btn');

const modalDelete      = $('modal-delete');
const modalDeleteName  = $('modal-delete-name');
const modalCancel      = $('modal-cancel');
const modalConfirm     = $('modal-confirm');

/* ══════════════════════════════════════════════════════════
   AUTH
   ══════════════════════════════════════════════════════════ */
$('btn-google-login').addEventListener('click', async () => {
  loginError.textContent = '';
  try {
    const provider = new GoogleAuthProvider();
    const result   = await signInWithPopup(auth, provider);
    const email    = result.user.email;
    if (!ALLOWED_EMAILS.includes(email)) {
      await signOut(auth);
      loginError.textContent = `❌ ${email} não tem permissão de acesso.`;
    }
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      loginError.textContent = 'Erro ao autenticar: ' + e.message;
    }
  }
});

$('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user && ALLOWED_EMAILS.includes(user.email)) {
    viewLogin.style.display = 'none';
    viewPanel.style.display = '';
    adminNav.style.display  = '';
    startProductListener();
  } else {
    viewLogin.style.display = '';
    viewPanel.style.display = 'none';
    adminNav.style.display  = 'none';
    if (unsubProducts) { unsubProducts(); unsubProducts = null; }
    if (user) signOut(auth); // loga fora se email não autorizado
  }
});

/* ══════════════════════════════════════════════════════════
   FIRESTORE LISTENER
   ══════════════════════════════════════════════════════════ */
function startProductListener() {
  if (unsubProducts) return;
  const ref = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  unsubProducts = onSnapshot(ref, snap => {
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderList();
  }, err => {
    console.error('Firestore erro:', err);
    showToast('Erro ao carregar produtos.', 'err');
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
        <button class="btn-icon" data-delete="${p.id}" data-name="${p.name}" data-img="${p.imageUrl || ''}" title="Excluir">🗑️</button>
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
    filterBtns.forEach(b => b.classList.remove('filter-active'));
    btn.classList.add('filter-active');
    filterCat = btn.dataset.filter;
    renderList();
  });
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  renderList();
});

/* ══════════════════════════════════════════════════════════
   UPLOAD DE IMAGEM
   ══════════════════════════════════════════════════════════ */
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.style.borderColor = 'rgba(94,202,138,.6)';
});
uploadZone.addEventListener('dragleave', () => {
  uploadZone.style.borderColor = '';
});
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file) setPreviewFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setPreviewFile(fileInput.files[0]);
});

btnClearImg.addEventListener('click', e => {
  e.stopPropagation();
  clearImagePreview();
});

function setPreviewFile(file) {
  if (!file.type.startsWith('image/')) { showToast('Arquivo inválido.', 'err'); return; }
  if (file.size > 5 * 1024 * 1024)    { showToast('Imagem muito grande (máx 5MB).', 'err'); return; }
  selectedFile = file;
  const url = URL.createObjectURL(file);
  imgPreview.src = url;
  imgPreview.style.display = 'block';
  uploadPlaceholder.style.display = 'none';
  btnClearImg.style.display = 'flex';
  uploadZone.classList.add('has-preview');
}

function clearImagePreview() {
  selectedFile       = null;
  fileInput.value    = '';
  imgPreview.src     = '';
  imgPreview.style.display     = 'none';
  uploadPlaceholder.style.display = '';
  btnClearImg.style.display    = 'none';
  uploadZone.classList.remove('has-preview');
}

/* ══════════════════════════════════════════════════════════
   SALVAR PRODUTO
   ══════════════════════════════════════════════════════════ */
btnSave.addEventListener('click', saveProduct);

async function saveProduct() {
  const name  = fName.value.trim();
  const price = fPrice.value.trim();
  const cat   = document.querySelector('input[name="cat"]:checked')?.value || 'decor';

  if (!name)  { setStatus('Nome obrigatório.', 'err'); return; }
  if (!price) { setStatus('Preço obrigatório.', 'err'); return; }

  btnSave.disabled = true;
  setStatus('Salvando…', '');

  try {
    let imageUrl = fEditImgUrl.value || '';
    let imagePath = '';

    // Upload nova imagem se selecionada
    if (selectedFile) {
      const ext  = selectedFile.name.split('.').pop();
      const path = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      imagePath  = path;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, selectedFile);

      imageUrl = await new Promise((resolve, reject) => {
        task.on('state_changed',
          snap => {
            const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
            setStatus(`Enviando imagem… ${pct}%`, '');
          },
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
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
      imagePath:   imagePath || null,
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
    imgPreview.style.display    = 'block';
    uploadPlaceholder.style.display = 'none';
    btnClearImg.style.display   = 'flex';
    uploadZone.classList.add('has-preview');
  } else {
    clearImagePreview();
  }

  formTitle.textContent = 'EDITANDO PRODUTO';
  btnSave.textContent   = 'ATUALIZAR PRODUTO';
  btnCancel.style.display = '';
  setStatus('', '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

btnCancel.addEventListener('click', resetForm);

function resetForm() {
  fEditId.value     = '';
  fEditImgUrl.value = '';
  fName.value = fPrice.value = fBadge.value = fEmoji.value = fDesc.value = '';
  document.querySelector('input[name="cat"][value="decor"]').checked = true;
  clearImagePreview();
  formTitle.textContent   = 'ADICIONAR PRODUTO';
  btnSave.textContent     = 'SALVAR PRODUTO';
  btnCancel.style.display = 'none';
  setStatus('', '');
}

/* ══════════════════════════════════════════════════════════
   DELETAR
   ══════════════════════════════════════════════════════════ */
function openDelete(p) {
  pendingDeleteId  = p.id;
  pendingDeleteImg = p.imagePath || null;
  modalDeleteName.textContent = `Excluir "${p.name}"? Esta ação não pode ser desfeita.`;
  modalDelete.style.display   = 'flex';
}

modalCancel.addEventListener('click',  () => { modalDelete.style.display = 'none'; pendingDeleteId = null; });
modalConfirm.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  modalDelete.style.display = 'none';
  try {
    await deleteDoc(doc(db, 'products', pendingDeleteId));
    if (pendingDeleteImg) {
      try { await deleteObject(storageRef(storage, pendingDeleteImg)); } catch (_) {}
    }
    showToast('Produto excluído.', 'ok');
  } catch (e) {
    showToast('Erro ao excluir: ' + e.message, 'err');
  }
  pendingDeleteId = pendingDeleteImg = null;
});

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */
function setStatus(msg, type) {
  formStatus.textContent = msg;
  formStatus.className   = 'form-status ' + (type === 'ok' ? 'status-ok' : type === 'err' ? 'status-err' : '');
}

function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type === 'ok' ? '✅' : '❌'}</span> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
