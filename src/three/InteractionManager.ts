// ============================================================
// InteractionManager – Raycaster + pointer/finger hit-testing
// ============================================================

import * as THREE from 'three';

export class InteractionManager {
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  /**
   * Update pointer from screen coordinates (0–windowWidth, 0–windowHeight).
   */
  setPointerFromScreen(x: number, y: number): void {
    this.pointer.x = (x / window.innerWidth) * 2 - 1;
    this.pointer.y = -(y / window.innerHeight) * 2 + 1;
  }

  /**
   * Update pointer from normalized device coordinates (-1 to +1).
   */
  setPointerNDC(x: number, y: number): void {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  /**
   * Raycast against a list of objects. Returns the first hit.
   */
  raycast(objects: THREE.Object3D[], recursive = true): THREE.Intersection | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(objects, recursive);
    return hits.length > 0 ? hits[0] : null;
  }

  /**
   * Raycast and return all hits.
   */
  raycastAll(objects: THREE.Object3D[], recursive = true): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(objects, recursive);
  }

  /**
   * Get a world-space point on a plane at a given Y height.
   */
  getPointOnPlane(y: number = 0): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(plane, target);
    return hit;
  }

  /**
   * Get a world-space point on a plane facing the camera through a coplanar reference point.
   */
  getPointOnCameraPlane(coplanarPoint: THREE.Vector3): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const normal = new THREE.Vector3();
    this.camera.getWorldDirection(normal).negate();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, coplanarPoint);
    const target = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, target);
  }
}
