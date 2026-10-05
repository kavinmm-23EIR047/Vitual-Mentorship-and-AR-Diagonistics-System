// ============================================================
// PipeSystem – Industrial Closed-Loop Piping Network
// Suction line (Check Valve + Isolation Valve) & Overhead Return Loop
// ============================================================

import * as THREE from 'three';
import { COLORS, LAYOUT } from '../core/constants';

export class PipeSystem {
  group: THREE.Group;
  private pipeMaterial: THREE.MeshStandardMaterial;
  private elbowMaterial: THREE.MeshStandardMaterial;

  private meshSuctionLine: THREE.Mesh | null = null;
  private meshDischargeRiser: THREE.Mesh | null = null;
  private meshOverheadReturn: THREE.Mesh | null = null;
  private elbows: THREE.Mesh[] = [];
  private arrows: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'IndustrialPiping';

    this.pipeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c7d0, // Polished Stainless Steel / Industrial PVC
      metalness: 0.88,
      roughness: 0.18,
    });

    this.elbowMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.15,
    });

    this.rebuildPipes(
      new THREE.Vector3(LAYOUT.PUMP_POSITION.x, LAYOUT.PUMP_POSITION.y, LAYOUT.PUMP_POSITION.z),
      new THREE.Vector3(LAYOUT.VALVE_POSITION.x, LAYOUT.VALVE_POSITION.y, LAYOUT.VALVE_POSITION.z),
      new THREE.Vector3(LAYOUT.TANK_POSITION.x, LAYOUT.TANK_POSITION.y, LAYOUT.TANK_POSITION.z)
    );
  }

  /**
   * Rebuilds pipe geometries dynamically connecting equipment positions.
   */
  rebuildPipes(pumpPos: THREE.Vector3, valvePos: THREE.Vector3, tankPos: THREE.Vector3): void {
    // Clear old elbows and arrows
    for (const el of this.elbows) {
      el.geometry.dispose();
      this.group.remove(el);
    }
    this.elbows = [];

    for (const ar of this.arrows) {
      ar.geometry.dispose();
      this.group.remove(ar);
    }
    this.arrows = [];

    const pipeRadius = 0.012;
    const suctionY = 0.04;
    const tankDrainX = tankPos.x + LAYOUT.TANK_RADIUS;
    const pumpInletX = pumpPos.x - 0.068;

    // 1. Straight Suction Line (Tank Bottom → Check Valve → Isolation Valve → Pump Inlet)
    const suctionPoints = [
      new THREE.Vector3(tankDrainX, suctionY, tankPos.z),
      new THREE.Vector3(pumpInletX, suctionY, pumpPos.z),
    ];
    this.meshSuctionLine = this.replacePipeMesh(this.meshSuctionLine, suctionPoints, 'SuctionLine');

    // 2. Discharge Vertical Riser (Pump Outlet → Top Overhead Height)
    const riserX = pumpPos.x - 0.025;
    const riserStartY = pumpPos.y + 0.062;
    const overheadY = LAYOUT.TANK_HEIGHT + 0.08;

    const riserPoints = [
      new THREE.Vector3(riserX, riserStartY, pumpPos.z),
      new THREE.Vector3(riserX, overheadY, pumpPos.z),
    ];
    this.meshDischargeRiser = this.replacePipeMesh(this.meshDischargeRiser, riserPoints, 'DischargeRiser');

    // 3. Overhead Return Line (Overhead Riser Elbow → Over Tank Rim → Tank Down Nozzle)
    const tankInletX = tankPos.x;
    const tankInletY = LAYOUT.TANK_HEIGHT + 0.02;

    const overheadPoints = [
      new THREE.Vector3(riserX, overheadY, pumpPos.z),
      new THREE.Vector3(tankInletX, overheadY, tankPos.z),
      new THREE.Vector3(tankInletX, tankInletY, tankPos.z),
    ];
    this.meshOverheadReturn = this.replacePipeMesh(this.meshOverheadReturn, overheadPoints, 'OverheadReturn');

    // Add 90° Joint Elbows
    this.addElbow(new THREE.Vector3(riserX, overheadY, pumpPos.z));
    this.addElbow(new THREE.Vector3(tankInletX, overheadY, tankPos.z));

    // Directional Flow Arrows
    this.addFlowArrow(new THREE.Vector3(-0.18, suctionY + 0.018, tankPos.z), 'RIGHT');
    this.addFlowArrow(new THREE.Vector3(0.08, suctionY + 0.018, tankPos.z), 'RIGHT');
    this.addFlowArrow(new THREE.Vector3(riserX + 0.018, (riserStartY + overheadY) / 2, pumpPos.z), 'UP');
  }

  private addElbow(pos: THREE.Vector3): void {
    const elbowGeo = new THREE.SphereGeometry(0.015, 16, 16);
    const elbow = new THREE.Mesh(elbowGeo, this.elbowMaterial);
    elbow.position.copy(pos);
    elbow.castShadow = true;
    this.elbows.push(elbow);
    this.group.add(elbow);
  }

  private addFlowArrow(pos: THREE.Vector3, dir: 'RIGHT' | 'UP'): void {
    const arrowGeo = new THREE.ConeGeometry(0.007, 0.018, 12);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.copy(pos);
    if (dir === 'RIGHT') {
      arrow.rotation.z = -Math.PI / 2;
    } else if (dir === 'UP') {
      // standard cone points up
    }
    this.arrows.push(arrow);
    this.group.add(arrow);
  }

  private replacePipeMesh(existing: THREE.Mesh | null, points: THREE.Vector3[], name: string): THREE.Mesh {
    if (existing) {
      existing.geometry.dispose();
      this.group.remove(existing);
    }

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.0);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.012, 16, false);
    const mesh = new THREE.Mesh(tubeGeo, this.pipeMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = name;
    this.group.add(mesh);
    return mesh;
  }
}
