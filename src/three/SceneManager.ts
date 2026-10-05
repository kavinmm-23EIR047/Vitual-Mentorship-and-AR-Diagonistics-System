// ============================================================
// SceneManager – Three.js scene, renderer, camera, loop
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { COLORS, PERF } from '../core/constants';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  clock: THREE.Clock;
  equipmentGroup: THREE.Group;

  private callbacks: Array<(dt: number, elapsed: number) => void> = [];
  private _animationId = 0;

  constructor(canvas: HTMLCanvasElement) {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );
    this.camera.position.set(-0.16, 0.32, 1.48);
    this.camera.lookAt(-0.16, 0.22, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.autoRotate = false;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(-0.16, 0.22, 0);
    this.controls.minDistance = 0.2;
    this.controls.maxDistance = 5.0;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.2;
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.95;
    this.controls.minPolarAngle = 0.05; // Look almost straight down from above (top-down)
    this.controls.maxPolarAngle = Math.PI * 0.88; // Look upwards from ground level (bottom-up)

    // Equipment parent group
    this.equipmentGroup = new THREE.Group();
    this.equipmentGroup.name = 'EquipmentGroup';
    this.scene.add(this.equipmentGroup);

    // Ground
    this.createGround();

    // Clock
    this.clock = new THREE.Clock();

    // Resize
    window.addEventListener('resize', this.onResize);
  }

  private createGround(): void {
    // Grid helper
    const grid = new THREE.GridHelper(4, 40, COLORS.GRID, COLORS.GRID);
    (grid.material as THREE.Material).opacity = 0.15;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);

    // Ground plane (shadow receiver)
    const groundGeo = new THREE.PlaneGeometry(4, 4);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'Ground';
    this.scene.add(ground);
  }

  onUpdate(callback: (dt: number, elapsed: number) => void): void {
    this.callbacks.push(callback);
  }

  removeUpdate(callback: (dt: number, elapsed: number) => void): void {
    const idx = this.callbacks.indexOf(callback);
    if (idx >= 0) this.callbacks.splice(idx, 1);
  }

  start(): void {
    const animate = () => {
      this._animationId = requestAnimationFrame(animate);
      const dt = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      this.controls.update();
      for (const cb of this.callbacks) {
        cb(dt, elapsed);
      }
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  stop(): void {
    cancelAnimationFrame(this._animationId);
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  resetCameraView(): void {
    this.camera.position.set(-0.16, 0.32, 1.48);
    this.controls.target.set(-0.16, 0.22, 0);
    this.equipmentGroup.rotation.set(0, 0, 0);
    this.equipmentGroup.position.set(0, 0, 0);
    this.controls.update();
  }

  zoom(factor: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.multiplyScalar(factor);
    const newDist = offset.length();
    if (newDist >= this.controls.minDistance && newDist <= this.controls.maxDistance) {
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
    }
  }

  zoomIn(): void {
    this.zoom(0.82);
  }

  zoomOut(): void {
    this.zoom(1.22);
  }

  orbitPan(direction: number): void {
    const angle = direction * 0.18;
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  orbitTilt(direction: number): void {
    const angle = direction * 0.14;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const right = new THREE.Vector3().crossVectors(this.camera.up, offset).normalize();
    offset.applyAxisAngle(right, angle);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  /**
   * AR Spatial Direct Product Hand Rotation Engine.
   * Rotates the 3D product turntable directly in mid-air around its vertical axis.
   */
  rotateProduct(deltaYaw: number): void {
    if (Math.abs(deltaYaw) > 0.0001) {
      this.equipmentGroup.rotation.y += deltaYaw;
    }
  }

  rotateByDelta(dx: number, dy: number, dAngle = 0, dDepth = 0): void {
    // 1. Direct AR Product Yaw Rotation (model turntable turns directly with hands)
    // - dx: Hands moving left/right horizontally
    // - dAngle: Two hands tilting in a steering wheel / dial motion
    // - dDepth: Moving one hand forward and pulling the other back
    const deltaYaw = dx * 3.6 + dAngle * 2.6 - dDepth * 3.0;
    if (Math.abs(deltaYaw) > 0.0001) {
      this.equipmentGroup.rotation.y += deltaYaw;
    }

    // 2. Vertical Camera Elevation Pitch Tilt (inspect top/bottom)
    if (Math.abs(dy) > 0.0001) {
      const offset = this.camera.position.clone().sub(this.controls.target);
      const right = new THREE.Vector3().crossVectors(this.camera.up, offset).normalize();
      const angleY = -dy * 2.2;
      offset.applyAxisAngle(right, angleY);

      const newPos = this.controls.target.clone().add(offset);
      if (newPos.y > -0.15 && newPos.y < 3.2) {
        this.camera.position.copy(newPos);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      }
    }
  }

  setTopView(): void {
    this.camera.position.set(-0.16, 1.6, 0.01);
    this.controls.target.set(-0.16, 0.22, 0);
    this.controls.update();
  }

  setFrontView(): void {
    this.camera.position.set(-0.16, 0.28, 1.35);
    this.controls.target.set(-0.16, 0.22, 0);
    this.controls.update();
  }

  setSideView(): void {
    this.camera.position.set(1.4, 0.28, 0);
    this.controls.target.set(-0.16, 0.22, 0);
    this.controls.update();
  }

  setIsometricView(): void {
    this.camera.position.set(0.9, 0.85, 1.1);
    this.controls.target.set(-0.16, 0.22, 0);
    this.controls.update();
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.controls.dispose();
  }
}
