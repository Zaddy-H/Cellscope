import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Transform cell number i from model space to pixel coordinates, step by step.
export function projectByHand(i) {
  const { camera, points, renderer } = window.cs;
  const pos = points.geometry.attributes.position;
  const v = new THREE.Vector4(pos.getX(i), pos.getY(i), pos.getZ(i), 1);
  camera.updateMatrixWorld();
  console.log('model:', v.toArray());

  v.applyMatrix4(points.matrixWorld);           // model -> world
  console.log('world:', v.toArray());

  v.applyMatrix4(camera.matrixWorldInverse);    // world -> view (camera at origin, looking down -z)
  console.log('view: ', v.toArray());

  v.applyMatrix4(camera.projectionMatrix);      // view -> clip
  console.log('clip: ', v.toArray());

  const ndc = new THREE.Vector3(v.x / v.w, v.y / v.w, v.z / v.w);   // perspective divide
  console.log('NDC:  ', ndc.toArray());

  // NDC [-1, 1] -> CSS pixels; NDC y points up, pixel y points down
  const canvas = renderer.domElement;
  const px = (ndc.x + 1) / 2 * canvas.clientWidth;
  const py = (1 - ndc.y) / 2 * canvas.clientHeight;
  console.log('pixel:', [px, py]);

  // Reference result from the library for comparison:
  const ref = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).project(camera);
  console.log('library NDC:', ref.toArray());
  return { ndc: ndc.toArray(), pixel: [px, py], libraryNdc: ref.toArray() };
}

// Swap between the perspective camera and an orthographic one that shows the same view.
let perspective = null;
export function toggleCamera() {
  const cs = window.cs;
  const old = cs.camera;
  const target = cs.controls.target.clone();
  const dist = old.position.distanceTo(target);
  const material = cs.points.material;
  let cam;

  if (old.isPerspectiveCamera) {
    perspective = { camera: old, pointSize: material.size };
    // Frustum that matches what the perspective camera sees at the target's distance.
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(old.fov) / 2);
    const halfW = halfH * old.aspect;
    cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, old.near, old.far);
    // sizeAttenuation only works with perspective, so convert the world size to pixels at the target.
    material.size = perspective.pointSize * (cs.renderer.domElement.clientHeight / 2) / dist;
  } else {
    cam = perspective.camera;
    cam.aspect = window.innerWidth / window.innerHeight;
    cam.updateProjectionMatrix();
    material.size = perspective.pointSize;
  }
  cam.position.copy(old.position);
  cam.quaternion.copy(old.quaternion);

  cs.controls.dispose();
  const controls = new OrbitControls(cam, cs.renderer.domElement);
  controls.enableDamping = true;
  controls.target.copy(target);
  controls.update();

  cs.camera = cam;
  cs.controls = controls;
  console.log('now using', cam.type);
  return cam;
}
