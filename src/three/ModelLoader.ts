// ============================================================
// ModelLoader – Reusable GLB loading utilities
// ============================================================

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  boundingBox: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
}

const loader = new GLTFLoader();

/**
 * Load a GLB/GLTF model and return normalized metadata.
 */
export function loadModel(url: string): Promise<LoadedModel> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf: GLTF) => {
        const scene = gltf.scene;
        const bbox = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getSize(size);
        bbox.getCenter(center);

        resolve({
          scene,
          animations: gltf.animations || [],
          boundingBox: bbox,
          size,
          center,
        });
      },
      undefined,
      (error) => {
        console.error(`[ModelLoader] Failed to load: ${url}`, error);
        reject(new Error(`Failed to load model: ${url}`));
      }
    );
  });
}

/**
 * Center a model so its bounding box center sits at the origin.
 */
export function centerModel(model: THREE.Group, center: THREE.Vector3): void {
  model.position.sub(center);
}

/**
 * Scale the model so its largest axis equals `targetSize`.
 */
export function normalizeScale(model: THREE.Group, size: THREE.Vector3, targetSize: number): void {
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = targetSize / maxDim;
    model.scale.setScalar(scale);
  }
}

/**
 * Enable shadows on all meshes in a model.
 */
export function enableShadows(model: THREE.Object3D, cast = true, receive = true): void {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Dispose all geometries, materials and textures in a model.
 */
export function disposeModel(model: THREE.Object3D): void {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of materials) {
        if (mat instanceof THREE.Material) {
          // Dispose textures
          for (const key of Object.keys(mat)) {
            const value = (mat as unknown as Record<string, unknown>)[key];
            if (value instanceof THREE.Texture) {
              value.dispose();
            }
          }
          mat.dispose();
        }
      }
    }
  });
}
