// ============================================================
// WireRenderer – Realistic 3D industrial cables using CatmullRom
// ============================================================

import * as THREE from 'three';
import { COLORS, WIRE } from '../core/constants';

export interface WireInstance {
  id: string;
  mesh: THREE.Mesh;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  sourceId?: string;
  targetId?: string;
  state: 'dragging' | 'snapped' | 'connected' | 'error';
}

export class WireRenderer {
  group: THREE.Group;
  private wires: Map<string, WireInstance> = new Map();

  // Materials
  private dragMaterial: THREE.MeshStandardMaterial;
  private connectedMaterial: THREE.MeshStandardMaterial;
  private errorMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Wires';

    // 1. Dragging cable material (subtle glowing cyan/sky industrial jacket)
    this.dragMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.CABLE_DRAGGING,
      emissive: COLORS.CABLE_DRAGGING,
      emissiveIntensity: 0.35,
      metalness: 0.2,
      roughness: 0.4,
    });

    // 2. Permanent connected cable material (realistic dark industrial cable jacket)
    this.connectedMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: COLORS.CABLE_CONNECTED,
      emissiveIntensity: 0.15,
      metalness: 0.3,
      roughness: 0.5,
    });

    // 3. Error material
    this.errorMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.CABLE_ERROR,
      emissive: COLORS.CABLE_ERROR,
      emissiveIntensity: 0.8,
      metalness: 0.2,
      roughness: 0.4,
    });
  }

  /**
   * Update or create a smooth 3D curved cable from start to end position.
   */
  updateWire(
    wireId: string,
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    state: WireInstance['state'] = 'dragging',
    sourceId?: string,
    targetId?: string
  ): void {
    let wire = this.wires.get(wireId);

    // Build natural sagging industrial cable path
    const distance = startPos.distanceTo(endPos);
    const sag = Math.min(0.12, distance * WIRE.SAG_FACTOR);

    // Intermediate control points for natural gravity sag
    const midPoint = new THREE.Vector3(
      (startPos.x + endPos.x) / 2,
      Math.min(startPos.y, endPos.y) - sag,
      (startPos.z + endPos.z) / 2
    );

    const curve = new THREE.CatmullRomCurve3(
      [
        startPos.clone(),
        new THREE.Vector3(
          startPos.x * 0.75 + midPoint.x * 0.25,
          startPos.y - sag * 0.5,
          startPos.z * 0.75 + midPoint.z * 0.25
        ),
        midPoint,
        new THREE.Vector3(
          endPos.x * 0.75 + midPoint.x * 0.25,
          endPos.y - sag * 0.5,
          endPos.z * 0.75 + midPoint.z * 0.25
        ),
        endPos.clone(),
      ],
      false,
      'centripetal',
      0.4
    );

    const geometry = new THREE.TubeGeometry(curve, WIRE.SEGMENTS, WIRE.RADIUS, 8, false);

    const material =
      state === 'connected'
        ? this.connectedMaterial.clone()
        : state === 'error'
        ? this.errorMaterial
        : this.dragMaterial;

    if (!wire) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `Wire_${wireId}`;
      mesh.castShadow = true;

      wire = {
        id: wireId,
        mesh,
        startPos: startPos.clone(),
        endPos: endPos.clone(),
        sourceId,
        targetId,
        state,
      };

      this.wires.set(wireId, wire);
      this.group.add(mesh);
    } else {
      wire.mesh.geometry.dispose();
      wire.mesh.geometry = geometry;
      wire.mesh.material = material;
      wire.startPos.copy(startPos);
      wire.endPos.copy(endPos);
      wire.state = state;
      if (sourceId) wire.sourceId = sourceId;
      if (targetId) wire.targetId = targetId;
    }
  }

  /**
   * Finalize wire as permanent connected cable.
   */
  setWireConnected(wireId: string): void {
    const wire = this.wires.get(wireId);
    if (!wire) return;
    wire.state = 'connected';
    wire.mesh.material = this.connectedMaterial.clone();
  }

  /**
   * Recalculate positions of all connected cables when equipment moves.
   */
  updateConnectedWirePositions(getTerminalPosFn: (id: string) => THREE.Vector3 | null): void {
    for (const [id, wire] of this.wires) {
      if (wire.state === 'connected' && wire.sourceId && wire.targetId) {
        const sPos = getTerminalPosFn(wire.sourceId);
        const tPos = getTerminalPosFn(wire.targetId);
        if (sPos && tPos) {
          this.updateWire(id, sPos, tPos, 'connected', wire.sourceId, wire.targetId);
        }
      }
    }
  }

  /**
   * Remove a wire by ID.
   */
  removeWire(wireId: string): void {
    const wire = this.wires.get(wireId);
    if (wire) {
      wire.mesh.geometry.dispose();
      this.group.remove(wire.mesh);
      this.wires.delete(wireId);
    }
  }

  /**
   * Flash red briefly and remove.
   */
  flashAndRemove(wireId: string, delayMs = 600): void {
    const wire = this.wires.get(wireId);
    if (wire) {
      wire.mesh.material = this.errorMaterial;
      setTimeout(() => {
        this.removeWire(wireId);
      }, delayMs);
    }
  }

  /**
   * Clear all wires (for reset).
   */
  removeAll(): void {
    for (const [id] of Array.from(this.wires.entries())) {
      this.removeWire(id);
    }
  }

  getConnectedWireCount(): number {
    let count = 0;
    for (const wire of this.wires.values()) {
      if (wire.state === 'connected') count++;
    }
    return count;
  }
}
