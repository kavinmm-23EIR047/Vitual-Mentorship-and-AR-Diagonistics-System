// ============================================================
// TerminalManager – Field device terminal 3D objects & hit areas
// ============================================================

import * as THREE from 'three';
import { COLORS, TERMINAL } from '../core/constants';

export interface FieldTerminal3D {
  id: string;
  label: string;
  mesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  pulseRing: THREE.Mesh;
  worldPosition: THREE.Vector3;
}

export class TerminalManager {
  group: THREE.Group;
  hitGroup: THREE.Group;
  terminals: FieldTerminal3D[] = [];
  private terminalGeo: THREE.SphereGeometry;
  private glowGeo: THREE.SphereGeometry;
  private ringGeo: THREE.RingGeometry;
  private hitGeo: THREE.SphereGeometry;
  private allTerminalObjects: Map<string, THREE.Object3D> = new Map();
  private pulseTime = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'FieldTerminals';
    this.group.visible = true;

    this.hitGroup = new THREE.Group();
    this.hitGroup.name = 'FieldTerminal_HitAreas';

    this.terminalGeo = new THREE.SphereGeometry(TERMINAL.RADIUS, 16, 12);
    this.glowGeo = new THREE.SphereGeometry(TERMINAL.GLOW_RADIUS, 16, 12);
    this.ringGeo = new THREE.RingGeometry(TERMINAL.RADIUS * 1.3, TERMINAL.RADIUS * 1.7, 24);
    this.hitGeo = new THREE.SphereGeometry(TERMINAL.HIT_RADIUS, 8, 6);
  }

  /**
   * Clear all registered terminals and their 3D meshes cleanly.
   */
  clearTerminals(): void {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    while (this.hitGroup.children.length > 0) {
      this.hitGroup.remove(this.hitGroup.children[0]);
    }
    this.terminals = [];
    this.allTerminalObjects.clear();
  }

  /**
   * Register a field device terminal position from equipment.
   */
  registerTerminal(id: string, label: string, parentObject: THREE.Object3D): void {
    // 1. Visible terminal core
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.TERMINAL_IDLE,
      emissive: COLORS.TERMINAL_IDLE,
      emissiveIntensity: 0.3,
      roughness: 0.4,
    });
    const mesh = new THREE.Mesh(this.terminalGeo, mat);
    mesh.name = `FieldTerminal_${id}`;
    mesh.userData = { terminalId: id, label, isFieldTerminal: true };

    // 2. Subtle steady glow
    const glowMat = new THREE.MeshBasicMaterial({
      color: COLORS.TERMINAL_IDLE,
      transparent: true,
      opacity: 0.2,
    });
    const glow = new THREE.Mesh(this.glowGeo, glowMat);
    glow.name = `FieldGlow_${id}`;
    mesh.add(glow);

    // 3. Subtle target highlight ring (shown when this is current target)
    const ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.TERMINAL_TARGET_ACTIVE,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const pulseRing = new THREE.Mesh(this.ringGeo, ringMat);
    pulseRing.position.z = 0.005;
    pulseRing.visible = false;
    mesh.add(pulseRing);

    // 4. Large invisible touch hit area
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(this.hitGeo, hitMat);
    hitMesh.name = `Hit_${id}`;
    hitMesh.userData = { terminalId: id, isHitArea: true, isFieldTerminal: true };
    this.hitGroup.add(hitMesh);

    // Position at parent's world position
    const worldPos = new THREE.Vector3();
    parentObject.getWorldPosition(worldPos);
    mesh.position.copy(worldPos);
    hitMesh.position.copy(worldPos);

    this.group.add(mesh);
    this.terminals.push({ id, label, mesh, hitMesh, glowMesh: glow, pulseRing, worldPosition: worldPos });
    this.allTerminalObjects.set(id, parentObject);
  }

  /** Update world positions after scene changes */
  updateWorldPositions(): void {
    for (const terminal of this.terminals) {
      const parent = this.allTerminalObjects.get(terminal.id);
      if (parent) {
        parent.getWorldPosition(terminal.worldPosition);
        terminal.mesh.position.copy(terminal.worldPosition);
        terminal.hitMesh.position.copy(terminal.worldPosition);
      }
    }
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  getHitMeshes(): THREE.Mesh[] {
    return this.terminals.map((t) => t.hitMesh);
  }

  getTerminalByMesh(mesh: THREE.Object3D): FieldTerminal3D | undefined {
    return this.terminals.find(
      (t) => t.mesh === mesh || t.hitMesh === mesh || t.mesh.children.includes(mesh)
    );
  }

  getTerminalById(id: string): FieldTerminal3D | undefined {
    return this.terminals.find((t) => t.id === id);
  }

  setTerminalState(id: string, state: 'idle' | 'target_active' | 'hover' | 'snapped' | 'connected' | 'error'): void {
    const terminal = this.getTerminalById(id);
    if (!terminal) return;

    const mat = terminal.mesh.material as THREE.MeshStandardMaterial;
    const glowMat = terminal.glowMesh.material as THREE.MeshBasicMaterial;

    switch (state) {
      case 'idle':
        mat.color.setHex(COLORS.TERMINAL_IDLE);
        mat.emissive.setHex(COLORS.TERMINAL_IDLE);
        mat.emissiveIntensity = 0.2;
        glowMat.color.setHex(COLORS.TERMINAL_IDLE);
        glowMat.opacity = 0.15;
        terminal.pulseRing.visible = false;
        break;

      case 'target_active':
        mat.color.setHex(COLORS.TERMINAL_TARGET_ACTIVE);
        mat.emissive.setHex(COLORS.TERMINAL_TARGET_ACTIVE);
        mat.emissiveIntensity = 0.8;
        glowMat.color.setHex(COLORS.TERMINAL_TARGET_ACTIVE);
        glowMat.opacity = 0.4;
        terminal.pulseRing.visible = true;
        break;

      case 'hover':
      case 'snapped':
        mat.color.setHex(COLORS.TERMINAL_HOVER);
        mat.emissive.setHex(COLORS.TERMINAL_HOVER);
        mat.emissiveIntensity = 1.2;
        glowMat.color.setHex(COLORS.TERMINAL_HOVER);
        glowMat.opacity = 0.7;
        terminal.pulseRing.visible = true;
        break;

      case 'connected':
        mat.color.setHex(COLORS.TERMINAL_CONNECTED);
        mat.emissive.setHex(COLORS.TERMINAL_CONNECTED);
        mat.emissiveIntensity = 0.8;
        glowMat.color.setHex(COLORS.TERMINAL_CONNECTED);
        glowMat.opacity = 0.4;
        terminal.pulseRing.visible = false;
        break;

      case 'error':
        mat.color.setHex(COLORS.TERMINAL_ERROR);
        mat.emissive.setHex(COLORS.TERMINAL_ERROR);
        mat.emissiveIntensity = 1.5;
        glowMat.color.setHex(COLORS.TERMINAL_ERROR);
        glowMat.opacity = 0.7;
        terminal.pulseRing.visible = false;
        break;
    }
  }

  update(dt: number): void {
    this.pulseTime += dt * 5.5;
    const scale = 1.0 + Math.sin(this.pulseTime) * 0.4;
    const opacity = 0.5 + Math.sin(this.pulseTime) * 0.45;
    const emissivePulse = 0.8 + Math.sin(this.pulseTime) * 0.6;

    for (const t of this.terminals) {
      if (t.pulseRing.visible) {
        t.pulseRing.scale.setScalar(scale);
        (t.pulseRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0.2, opacity);
        (t.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = emissivePulse;
        (t.glowMesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.6;
      }
    }
  }
}
