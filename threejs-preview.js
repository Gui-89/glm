/* js/threejs-preview.js
   Tooltip 3D com Three.js que aparece ao hover nos cards de produto. */
(function () {
  if (typeof THREE === 'undefined') return;
  var wrap   = document.getElementById('preview-3d');
  var canvas = document.getElementById('preview-canvas');
  if (!wrap || !canvas) return;
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setSize(160, 160);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 3.2);
  scene.add(new THREE.AmbientLight(0xffffff, .35));
  var ptLight = new THREE.PointLight(0xffffff, 1.2, 10);
  ptLight.position.set(2, 3, 3);
  scene.add(ptLight);
  var SHAPES = [
    function() { return new THREE.BoxGeometry(1.2, 1.2, 1.2); },
    function() { return new THREE.IcosahedronGeometry(.85, 0); },
    function() { return new THREE.OctahedronGeometry(1, 0); },
    function() { return new THREE.TorusGeometry(.7, .28, 16, 40); },
    function() { return new THREE.ConeGeometry(.75, 1.4, 6); },
    function() { return new THREE.TetrahedronGeometry(1, 0); },
  ];
  var mesh    = null;
  var raf     = null;
  var theme   = 'decor';
  var visible = false;
  var THEME_COLORS = {
    decor:    0x5eca8a,
    creative: 0xc9a6ff,
  };
  function buildMesh(shapeIdx) {
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    var geo = SHAPES[shapeIdx % SHAPES.length]();
    var mat = new THREE.MeshPhongMaterial({
      color:             THEME_COLORS[theme],
      emissive:          THEME_COLORS[theme],
      emissiveIntensity: .12,
      shininess:         80,
      transparent:       true,
      opacity:           .92,
    });
    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    var wfMat = new THREE.MeshBasicMaterial({
      color:       THEME_COLORS[theme],
      wireframe:   true,
      transparent: true,
      opacity:     .18,
    });
    var wfMesh = new THREE.Mesh(geo.clone(), wfMat);
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
  function position(x, y) {
    var pad = 12, w = 160, h = 160;
    var vw  = window.innerWidth, vh = window.innerHeight;
    var left = x + pad, top = y + pad;
    if (left + w > vw - 8) left = x - w - pad;
    if (top  + h > vh - 8) top  = y - h - pad;
    wrap.style.left = left + 'px';
    wrap.style.top  = top  + 'px';
  }
  window.ThreePreview = {
    show: function(x, y, shapeIdx) {
      buildMesh(shapeIdx);
      position(x, y);
      wrap.style.display = 'block';
      if (!visible) { visible = true; animate(); }
    },
    hide: function() {
      wrap.style.display = 'none';
      visible = false;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    },
    move: function(x, y) { if (visible) position(x, y); },
    setTheme: function(t) {
      theme = t;
      if (mesh) {
        mesh.material.color.setHex(THEME_COLORS[t]);
        mesh.material.emissive.setHex(THEME_COLORS[t]);
        mesh.children.forEach(function(c) {
          if (c.material && c.material.wireframe) c.material.color.setHex(THEME_COLORS[t]);
        });
      }
    }
  };
})();
