/* js/threejs-preview.js
   Tooltip 3D com Three.js que aparece ao hover nos cards de produto.
   Exibe uma forma 3D girando com a cor do tema atual.
   Requer Three.js r128 carregado antes deste script. */
(function () {
  if (typeof THREE === 'undefined') return;

  const wrap   = document.getElementById('preview-3d');
  const canvas = document.getElementById('preview-canvas');
  if (!wrap || !canvas) return;

  /* ── Renderer ── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(160, 160);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  /* ── Scene / Camera ── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 3.2);

  /* ── Lights ── */
  const ambLight = new THREE.AmbientLight(0xffffff, .35);
  scene.add(ambLight);
  const ptLight = new THREE.PointLight(0xffffff, 1.2, 10);
  ptLight.position.set(2, 3, 3);
  scene.add(ptLight);

  /* ── Shapes catalogue ── */
  const SHAPES = [
    () => new THREE.BoxGeometry(1.2, 1.2, 1.2),
    () => new THREE.IcosahedronGeometry(.85, 0),
    () => new THREE.OctahedronGeometry(1, 0),
    () => new THREE.TorusGeometry(.7, .28, 16, 40),
    () => new THREE.ConeGeometry(.75, 1.4, 6),
    () => new THREE.TetrahedronGeometry(1, 0),
  ];

  let mesh    = null;
  let raf     = null;
  let theme   = 'decor';
  let visible = false;

  const THEME_COLORS = {
    decor:    0x5eca8a,
    creative: 0xc9a6ff,
  };

  function buildMesh(shapeIdx) {
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
    const geo = SHAPES[shapeIdx % SHAPES.length]();
    const mat = new THREE.MeshPhongMaterial({
      color:     THEME_COLORS[theme],
      emissive:  THEME_COLORS[theme],
      emissiveIntensity: .12,
      shininess: 80,
      wireframe: false,
      transparent: true,
      opacity: .92,
    });
    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Wireframe overlay
    const wfMat = new THREE.MeshBasicMaterial({
      color: THEME_COLORS[theme],
      wireframe: true,
      transparent: true,
      opacity: .18,
    });
    const wfMesh = new THREE.Mesh(geo.clone(), wfMat);
    wfMesh.scale.setScalar(1.005);
    mesh.add(wfMesh);
  }

  function animate() {
    raf = requestAnimationFrame(animate);
    if (mesh) {
      mesh.rotation.x += .012;
      mesh.rotation.y += .018;
    }
    renderer.render(scene, camera);
  }

  function show(x, y, shapeIdx) {
    buildMesh(shapeIdx);
    position(x, y);
    wrap.style.display = 'block';
    if (!visible) { visible = true; animate(); }
  }

  function hide() {
    wrap.style.display = 'none';
    visible = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function position(x, y) {
    const pad = 12;
    const w   = 160, h = 160;
    const vw  = window.innerWidth, vh = window.innerHeight;
    let left = x + pad, top = y + pad;
    if (left + w > vw - 8)  left = x - w - pad;
    if (top  + h > vh - 8)  top  = y - h - pad;
    wrap.style.left = left + 'px';
    wrap.style.top  = top  + 'px';
  }

  /* ── Public API ── */
  window.ThreePreview = {
    show,
    hide,
    move(x, y) { if (visible) position(x, y); },
    setTheme(t) {
      theme = t;
      if (mesh) {
        mesh.material.color.setHex(THEME_COLORS[t]);
        mesh.material.emissive.setHex(THEME_COLORS[t]);
        mesh.children.forEach(c => { if (c.material.wireframe) c.material.color.setHex(THEME_COLORS[t]); });
      }
    }
  };
})();
