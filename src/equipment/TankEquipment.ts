// ============================================================
// TankEquipment – Procedural industrial tank with dual-float sensor & return loop
// ============================================================

import * as THREE from 'three';
import { COLORS, LAYOUT } from '../core/constants';

export class TankEquipment {
  group: THREE.Group;
  private liquidMesh: THREE.Mesh;
  private liquidMaterial: THREE.MeshStandardMaterial;
  private tankBody: THREE.Mesh;
  private innerRadius: number;
  private innerHeight: number;
  private currentLevel = 0;

  // Sensor float collars
  private floatL0: THREE.Mesh;
  private floatL1: THREE.Mesh;
  private sensorHeadLedMat: THREE.MeshStandardMaterial;

  // Discharge nozzle & drip effect
  private dripMesh: THREE.Points;
  private dripPositions: Float32Array;
  private isFlowing = false;

  // Field terminal positions
  terminalLow: THREE.Object3D;
  terminalHigh: THREE.Object3D;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Tank';

    const radius = LAYOUT.TANK_RADIUS;
    const height = LAYOUT.TANK_HEIGHT;
    const wallThickness = 0.008;
    this.innerRadius = radius - wallThickness;
    this.innerHeight = height - wallThickness * 2;

    // --- 1. Tank Body (clear acrylic/glass cylinder) ---
    const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 36, 1, true);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.15,
      roughness: 0.1,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    });
    this.tankBody = new THREE.Mesh(bodyGeo, bodyMat);
    this.tankBody.position.y = height / 2;
    this.tankBody.castShadow = true;
    this.tankBody.name = 'TankBody';
    this.group.add(this.tankBody);

    // --- 2. Heavy-Duty Industrial Base (solid dark flanged ring) ---
    const baseGeo = new THREE.CylinderGeometry(radius + 0.012, radius + 0.016, 0.02, 36);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.01;
    base.castShadow = true;
    base.receiveShadow = true;
    this.group.add(base);

    // Tank base inner bottom seal
    const innerBottomGeo = new THREE.CircleGeometry(radius, 36);
    const innerBottomMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const innerBottom = new THREE.Mesh(innerBottomGeo, innerBottomMat);
    innerBottom.rotation.x = -Math.PI / 2;
    innerBottom.position.y = wallThickness;
    this.group.add(innerBottom);

    // --- 3. Tank Top Chrome Rim ---
    const rimGeo = new THREE.TorusGeometry(radius, 0.007, 12, 36);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.15,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = height;
    this.group.add(rim);

    // --- 4. Level graduation markers ---
    for (let i = 1; i <= 3; i++) {
      const markY = (height * i) / 4;
      const markGeo = new THREE.TorusGeometry(radius + 0.001, 0.0015, 6, 36);
      const markMat = new THREE.MeshBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.45,
      });
      const mark = new THREE.Mesh(markGeo, markMat);
      mark.rotation.x = Math.PI / 2;
      mark.position.y = markY;
      this.group.add(mark);
    }

    // --- 5. Liquid Volume ---
    this.liquidMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.LIQUID,
      emissive: COLORS.LIQUID,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.78,
      metalness: 0.1,
      roughness: 0.4,
    });
    const liquidGeo = new THREE.CylinderGeometry(this.innerRadius, this.innerRadius, 0.001, 36, 1, false);
    this.liquidMesh = new THREE.Mesh(liquidGeo, this.liquidMaterial);
    this.liquidMesh.position.y = wallThickness;
    this.liquidMesh.name = 'Liquid';
    this.group.add(this.liquidMesh);

    // Liquid top surface
    const surfGeo = new THREE.CircleGeometry(this.innerRadius, 36);
    const surfMat = new THREE.MeshStandardMaterial({
      color: COLORS.LIQUID_SURFACE,
      emissive: COLORS.LIQUID_SURFACE,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const surfMesh = new THREE.Mesh(surfGeo, surfMat);
    surfMesh.rotation.x = -Math.PI / 2;
    surfMesh.name = 'LiquidSurface';
    this.liquidMesh.add(surfMesh);

    // --- 6. DUAL-FLOAT LEVEL SENSOR ASSEMBLY ---
    const sensorX = -radius * 0.45; // Offset inside tank
    const rodLength = height * 0.96;

    // Stainless Guide Rod
    const rodGeo = new THREE.CylinderGeometry(0.0035, 0.0035, rodLength, 12);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.12 });
    const sensorRod = new THREE.Mesh(rodGeo, steelMat);
    sensorRod.position.set(sensorX, height / 2 + 0.04, 0);
    sensorRod.castShadow = true;
    this.group.add(sensorRod);

    // Top Industrial Sensor Transmitter Head (High Level L1 Head)
    const headBaseGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.035, 16);
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 });
    const headBase = new THREE.Mesh(headBaseGeo, blueMat);
    headBase.position.set(sensorX, height + 0.06, 0);
    this.group.add(headBase);

    // Top Cable gland & LED
    const glandGeo = new THREE.CylinderGeometry(0.006, 0.008, 0.012, 12);
    const glandMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.4 });
    const gland = new THREE.Mesh(glandGeo, glandMat);
    gland.position.set(sensorX, height + 0.082, 0);
    this.group.add(gland);

    this.sensorHeadLedMat = new THREE.MeshStandardMaterial({ color: COLORS.LED_GREEN, emissive: COLORS.LED_GREEN, emissiveIntensity: 0.8 });
    const headLed = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), this.sensorHeadLedMat);
    headLed.position.set(sensorX, height + 0.09, 0);
    this.group.add(headLed);

    // Top Mounting Bracket to Rim
    const bracketGeo = new THREE.BoxGeometry(Math.abs(sensorX) + 0.02, 0.006, 0.016);
    const bracket = new THREE.Mesh(bracketGeo, steelMat);
    bracket.position.set(sensorX / 2 - 0.01, height + 0.01, 0);
    this.group.add(bracket);

    // Float Bobbin L1 (High Level Float Collar)
    const floatGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.022, 16);
    const floatMat1 = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
    this.floatL1 = new THREE.Mesh(floatGeo, floatMat1);
    this.floatL1.position.set(sensorX, height * 0.78, 0);
    this.floatL1.castShadow = true;
    this.group.add(this.floatL1);

    // Float Bobbin L0 (Low Level Float Collar)
    const floatMat0 = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
    this.floatL0 = new THREE.Mesh(floatGeo, floatMat0);
    this.floatL0.position.set(sensorX, height * 0.22, 0);
    this.floatL0.castShadow = true;
    this.group.add(this.floatL0);

    // Bottom stop ring on sensor rod
    const stopRingGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.008, 12);
    const stopRing = new THREE.Mesh(stopRingGeo, steelMat);
    stopRing.position.set(sensorX, 0.05, 0);
    this.group.add(stopRing);

    // --- 7. TOP RETURN NOZZLE & DISCHARGE STREAM ---
    const nozzleGroup = new THREE.Group();
    nozzleGroup.position.set(0, height + 0.05, 0);

    // Vertical nozzle spout pointing into tank
    const spoutGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.04, 16);
    const spout = new THREE.Mesh(spoutGeo, steelMat);
    spout.position.set(0, -0.02, 0);
    nozzleGroup.add(spout);

    // Nozzle elbow fitting
    const nozzleElbowGeo = new THREE.SphereGeometry(0.014, 12, 12);
    const nozzleElbow = new THREE.Mesh(nozzleElbowGeo, steelMat);
    nozzleGroup.add(nozzleElbow);

    this.group.add(nozzleGroup);

    // Water drip particles falling from top return nozzle
    const dripCount = 18;
    this.dripPositions = new Float32Array(dripCount * 3);
    for (let i = 0; i < dripCount; i++) {
      this.dripPositions[i * 3] = (Math.random() - 0.5) * 0.01;
      this.dripPositions[i * 3 + 1] = height + 0.02 - (i / dripCount) * (height * 0.8);
      this.dripPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    const dripGeo = new THREE.BufferGeometry();
    dripGeo.setAttribute('position', new THREE.BufferAttribute(this.dripPositions, 3));
    const dripMat = new THREE.PointsMaterial({
      color: COLORS.LIQUID_SURFACE,
      size: 0.009,
      transparent: true,
      opacity: 0.8,
    });
    this.dripMesh = new THREE.Points(dripGeo, dripMat);
    this.dripMesh.visible = false;
    this.group.add(this.dripMesh);

    // --- 8. BOTTOM DRAIN OUTLET FLANGE ---
    const drainFlangeGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.01, 16);
    const drainFlange = new THREE.Mesh(drainFlangeGeo, steelMat);
    drainFlange.rotation.z = Math.PI / 2;
    drainFlange.position.set(radius + 0.005, 0.04, 0);
    this.group.add(drainFlange);

    // --- 9. SENSOR WIRING TERMINALS ---
    this.terminalLow = new THREE.Object3D();
    this.terminalLow.position.set(sensorX + 0.03, height * 0.22, 0);
    this.terminalLow.name = 'Terminal_LEVEL_SENSOR_LOW';
    this.terminalLow.userData = { terminalId: 'LEVEL_SENSOR_LOW', label: 'Low Level Sensor (L0)' };
    this.group.add(this.terminalLow);

    this.terminalHigh = new THREE.Object3D();
    this.terminalHigh.position.set(sensorX + 0.03, height + 0.06, 0);
    this.terminalHigh.name = 'Terminal_LEVEL_SENSOR_HIGH';
    this.terminalHigh.userData = { terminalId: 'LEVEL_SENSOR_HIGH', label: 'High Level Sensor (L1)' };
    this.group.add(this.terminalHigh);

    // Position Tank in Scene
    this.group.position.set(
      LAYOUT.TANK_POSITION.x,
      LAYOUT.TANK_POSITION.y,
      LAYOUT.TANK_POSITION.z
    );
  }

  /** Set tank level 0–100, updates liquid mesh height & sensor state */
  setLevel(percent: number): void {
    percent = Math.max(0, Math.min(100, percent));
    this.currentLevel = percent;

    const liquidHeight = (percent / 100) * this.innerHeight;
    const minHeight = 0.001;
    const h = Math.max(liquidHeight, minHeight);

    // Update liquid cylinder geometry
    this.liquidMesh.geometry.dispose();
    this.liquidMesh.geometry = new THREE.CylinderGeometry(
      this.innerRadius,
      this.innerRadius,
      h,
      36, 1, false
    );
    this.liquidMesh.position.y = h / 2 + 0.008;

    // Update surface disc position
    const surface = this.liquidMesh.children[0];
    if (surface) {
      surface.position.y = h / 2;
    }

    // Color based on level
    if (percent >= 96) {
      this.liquidMaterial.color.setHex(0xef4444);
      this.liquidMaterial.emissive.setHex(0xef4444);
      this.sensorHeadLedMat.color.setHex(0xef4444);
      this.sensorHeadLedMat.emissive.setHex(0xef4444);
    } else if (percent >= 81) {
      this.liquidMaterial.color.setHex(0xf97316);
      this.liquidMaterial.emissive.setHex(0xf97316);
      this.sensorHeadLedMat.color.setHex(0xf97316);
      this.sensorHeadLedMat.emissive.setHex(0xf97316);
    } else {
      this.liquidMaterial.color.setHex(COLORS.LIQUID);
      this.liquidMaterial.emissive.setHex(COLORS.LIQUID);
      this.sensorHeadLedMat.color.setHex(COLORS.LED_GREEN);
      this.sensorHeadLedMat.emissive.setHex(COLORS.LED_GREEN);
    }
  }

  setFlowing(flowing: boolean): void {
    this.isFlowing = flowing;
    this.dripMesh.visible = flowing;
  }

  private waveTime = 0;

  /** Call each frame for fluid surface shimmer & falling drip animation */
  update(dt: number): void {
    if (this.currentLevel > 0) {
      this.waveTime += dt * 4;
      const surface = this.liquidMesh.children[0] as THREE.Mesh;
      if (surface && surface.material) {
        const mat = surface.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.15 + Math.sin(this.waveTime) * 0.08;
      }
    }

    if (this.isFlowing) {
      const height = LAYOUT.TANK_HEIGHT;
      const liquidTop = (this.currentLevel / 100) * this.innerHeight + 0.02;
      const dripSpeed = dt * 0.8;

      for (let i = 0; i < this.dripPositions.length / 3; i++) {
        let y = this.dripPositions[i * 3 + 1] - dripSpeed;
        if (y < liquidTop) {
          y = height + 0.02;
        }
        this.dripPositions[i * 3 + 1] = y;
      }
      (this.dripMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  getLevel(): number {
    return this.currentLevel;
  }
}
