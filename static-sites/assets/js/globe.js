import { latLonToCartesian, nextRotation } from './globe-core.js';

async function getThree() {
  return import('https://unpkg.com/three@0.160.0/build/three.module.js');
}

function latLonToVector3(THREE, lat, lon, radius) {
  const coord = latLonToCartesian(lat, lon, radius);
  return new THREE.Vector3(coord.x, coord.y, coord.z);
}

export async function initGlobe(canvasSelector, points = [], options = {}) {
  const THREE = await getThree();
  const canvas = document.querySelector(canvasSelector);
  if (!canvas) return null;

  const width = canvas.clientWidth || 720;
  const height = canvas.clientHeight || 300;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 1000);
  camera.position.z = 7;

  const ambient = new THREE.AmbientLight(0x6ec7ff, 0.7);
  const key = new THREE.PointLight(0xffffff, 1.2, 120);
  key.position.set(7, 8, 10);
  scene.add(ambient, key);

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 56, 56),
    new THREE.MeshPhongMaterial({
      color: 0x0f2d45,
      emissive: 0x04131f,
      specular: 0x65dbff,
      shininess: 22,
      transparent: true,
      opacity: 0.96,
    }),
  );
  scene.add(globe);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.32, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x4fd9ff, transparent: true, opacity: 0.08 }),
  );
  scene.add(atmosphere);

  const pointsGroup = new THREE.Group();
  const cap = options.pointLimit ?? 650;
  const sample = points.slice(0, cap);

  sample.forEach((entry, idx) => {
    const vector = latLonToVector3(THREE, entry.lat, entry.lon, 2.25);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.03 + ((idx % 6) * 0.002), 6, 6),
      new THREE.MeshBasicMaterial({ color: idx % 7 === 0 ? 0xff5c70 : 0x46d889 }),
    );
    marker.position.copy(vector);
    pointsGroup.add(marker);
  });
  scene.add(pointsGroup);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.015, 8, 100),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.35 }),
  );
  ring.rotation.x = Math.PI / 2.8;
  scene.add(ring);

  const clock = new THREE.Clock();
  let raf = 0;

  const animate = () => {
    const elapsed = clock.getElapsedTime();
    globe.rotation.y = nextRotation(globe.rotation.y, options.speed ?? 0.0022);
    pointsGroup.rotation.y = globe.rotation.y;
    ring.rotation.z += 0.0012;
    atmosphere.scale.setScalar(1 + Math.sin(elapsed * 1.3) * 0.004);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };

  animate();

  const onResize = () => {
    const w = canvas.clientWidth || width;
    const h = canvas.clientHeight || height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  window.addEventListener('resize', onResize);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      scene.clear();
    },
  };
}
