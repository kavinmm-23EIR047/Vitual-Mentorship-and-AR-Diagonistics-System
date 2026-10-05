// ============================================================
// Lighting – Industrial scene lighting
// ============================================================

import * as THREE from 'three';
import { PERF } from '../core/constants';

export function setupLighting(scene: THREE.Scene): void {
  // Ambient fill
  const ambient = new THREE.AmbientLight(0xb0c4de, 0.6);
  scene.add(ambient);

  // Main directional (sun)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(2, 4, 3);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(PERF.SHADOW_MAP_SIZE, PERF.SHADOW_MAP_SIZE);
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 10;
  dirLight.shadow.camera.left = -2;
  dirLight.shadow.camera.right = 2;
  dirLight.shadow.camera.top = 2;
  dirLight.shadow.camera.bottom = -2;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // Fill light from opposite side
  const fillLight = new THREE.DirectionalLight(0x8ecae6, 0.4);
  fillLight.position.set(-2, 2, -1);
  scene.add(fillLight);

  // Subtle hemisphere for environmental color
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.3);
  scene.add(hemi);
}
