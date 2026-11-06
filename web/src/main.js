import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { projectByHand, toggleCamera } from './experiments.js';

// ---- renderer, scene, camera ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101114);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 0, 3);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Works for whichever camera is active (see toggleCamera in experiments.js).
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  const cam = window.cs.camera;
  if (cam.isOrthographicCamera) {
    cam.left = cam.bottom * aspect;
    cam.right = cam.top * aspect;
  } else {
    cam.aspect = aspect;
  }
  cam.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Handy for the browser console (F12): type  cs.camera  etc.
window.cs = { THREE, renderer, scene, camera, controls };

// ---- CONTENT START ----
let points = null;

async function loadF32(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (HTTP ${res.status})`);
  return new Float32Array(await res.arrayBuffer());
}

async function loadCells() {
  // Vite answers a missing file with index.html (HTTP 200), so check the content type too.
  const res = await fetch('/data/manifest.json');
  if (!res.ok || !res.headers.get('content-type')?.includes('json')) {
    throw new Error('Could not load /data/manifest.json - run python run_pipeline.py');
  }
  const manifest = await res.json();
  const positions = await loadF32('/data/' + manifest.embeddings.pca.file);
  if (positions.length !== manifest.n_cells * 3) throw new Error('Size mismatch: manifest vs file');

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // sizeAttenuation: true makes size a world-space size, so points shrink with distance like real objects.
  const material = new THREE.PointsMaterial({ size: 0.015, color: 0x66ccff, sizeAttenuation: true });

  points = new THREE.Points(geometry, material);
  scene.add(points);
  window.cs.points = points;
  hudInfo = `${manifest.n_cells} cells · PCA`;

  geometry.computeBoundingSphere();
  fitCamera(geometry.boundingSphere);
}

// Place the camera so the whole bounding sphere fits in the narrower of the two fields of view.
// Default direction is oblique, so a long arm along one axis (platelets on PC3) is not seen end-on.
function fitCamera(sphere, direction = new THREE.Vector3(0.8, 0.5, 1), margin = 1.1) {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const dist = margin * sphere.radius / Math.sin(Math.min(vFov, hFov) / 2);
  controls.target.copy(sphere.center);
  camera.position.copy(sphere.center).addScaledVector(direction.clone().normalize(), dist);
  camera.near = dist / 100;
  camera.far = dist * 10;
  camera.updateProjectionMatrix();
  controls.update();
}

loadCells().catch((err) => { console.error(err); hud.style.color = '#f66'; hud.textContent = String(err); });
function update(dt) { /* nothing to animate yet */ }

window.cs.projectByHand = projectByHand;
window.cs.toggleCamera = toggleCamera;
// ---- CONTENT END ----

// ---- HUD and render loop ----
const hud = document.getElementById('hud');
let hudInfo = '';
let frames = 0, last = performance.now(), prev = last;

function animate(now) {
  requestAnimationFrame(animate);
  update((now - prev) / 1000);
  prev = now;
  window.cs.controls.update();
  renderer.render(scene, window.cs.camera);

  frames++;
  if (now - last > 500) {
    hud.textContent = `${hudInfo}  ${Math.round(frames * 1000 / (now - last))} FPS`;
    frames = 0; last = now;
  }
}
requestAnimationFrame(animate);
