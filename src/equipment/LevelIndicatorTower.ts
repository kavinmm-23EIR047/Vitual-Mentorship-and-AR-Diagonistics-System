// ============================================================
// LevelIndicatorTower – 3-Button Industrial Operator Station
// Houses Stop (Red), Start (Green), Reset (Yellow) Buttons & Wiring Terminals
// ============================================================

import * as THREE from 'three';
import { COLORS, LAYOUT } from '../core/constants';
import { alarmManager } from '../core/AlarmManager';

export class LevelIndicatorTower {
  group: THREE.Group;

  // Button materials for illumination & feedback
  private stopLampMat: THREE.MeshStandardMaterial;
  private startLampMat: THREE.MeshStandardMaterial;
  private resetLampMat: THREE.MeshStandardMaterial;

  // 3D Terminal Objects (for wiring)
  terminalLow: THREE.Object3D;
  terminalHigh: THREE.Object3D;

  private pulseTime = 0;
  private currentStatus: 'LOW' | 'NORMAL' | 'HIGH' = 'NORMAL';

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'OperatorStation';

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.75,
      roughness: 0.28,
    });
    const darkBoxMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.65,
      roughness: 0.35,
    });
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.92,
      roughness: 0.15,
    });

    // --- 1. Mounting Frame / Enclosure Box ---
    const boxWidth = 0.065;
    const boxHeight = 0.22;
    const boxDepth = 0.042;
    const boxGeo = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const stationBox = new THREE.Mesh(boxGeo, darkBoxMat);
    stationBox.castShadow = true;
    stationBox.receiveShadow = true;
    this.group.add(stationBox);

    // Front Brushed Aluminum Bezel Frame
    const frameGeo = new THREE.BoxGeometry(boxWidth + 0.006, boxHeight + 0.006, 0.006);
    const stationFrame = new THREE.Mesh(frameGeo, metalMat);
    stationFrame.position.z = boxDepth / 2 + 0.002;
    this.group.add(stationFrame);

    // Corner Screws
    const screwGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.004, 6);
    const corners = [
      [-boxWidth / 2 + 0.008, boxHeight / 2 - 0.008],
      [boxWidth / 2 - 0.008, boxHeight / 2 - 0.008],
      [-boxWidth / 2 + 0.008, -boxHeight / 2 + 0.008],
      [boxWidth / 2 - 0.008, -boxHeight / 2 + 0.008],
    ];
    for (const [cx, cy] of corners) {
      const screw = new THREE.Mesh(screwGeo, bezelMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(cx, cy, boxDepth / 2 + 0.006);
      this.group.add(screw);
    }

    // --- 2. STOP PUSH BUTTON (Top - Red) ---
    const btnRadius = 0.015;
    const bezelGeo = new THREE.CylinderGeometry(btnRadius + 0.003, btnRadius + 0.003, 0.006, 20);
    const domeGeo = new THREE.CylinderGeometry(btnRadius, btnRadius, 0.008, 20);

    const stopBezel = new THREE.Mesh(bezelGeo, bezelMat);
    stopBezel.rotation.x = Math.PI / 2;
    stopBezel.position.set(0, 0.065, boxDepth / 2 + 0.005);
    this.group.add(stopBezel);

    this.stopLampMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
    });
    const stopDome = new THREE.Mesh(domeGeo, this.stopLampMat);
    stopDome.rotation.x = Math.PI / 2;
    stopDome.position.set(0, 0.065, boxDepth / 2 + 0.009);
    this.group.add(stopDome);

    // --- 3. START PUSH BUTTON (Middle - Green) ---
    const startBezel = new THREE.Mesh(bezelGeo, bezelMat);
    startBezel.rotation.x = Math.PI / 2;
    startBezel.position.set(0, 0, boxDepth / 2 + 0.005);
    this.group.add(startBezel);

    this.startLampMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x166534,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.1,
    });
    const startDome = new THREE.Mesh(domeGeo, this.startLampMat);
    startDome.rotation.x = Math.PI / 2;
    startDome.position.set(0, 0, boxDepth / 2 + 0.009);
    this.group.add(startDome);

    // --- 4. RESET PUSH BUTTON (Bottom - Yellow/Amber) ---
    const resetBezel = new THREE.Mesh(bezelGeo, bezelMat);
    resetBezel.rotation.x = Math.PI / 2;
    resetBezel.position.set(0, -0.065, boxDepth / 2 + 0.005);
    this.group.add(resetBezel);

    this.resetLampMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.1,
    });
    const resetDome = new THREE.Mesh(domeGeo, this.resetLampMat);
    resetDome.rotation.x = Math.PI / 2;
    resetDome.position.set(0, -0.065, boxDepth / 2 + 0.009);
    this.group.add(resetDome);

    // --- 5. Wire Trunking Conduit (Exiting Bottom to PLC) ---
    const conduitCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -boxHeight / 2, 0),
      new THREE.Vector3(0, -boxHeight / 2 - 0.06, 0),
      new THREE.Vector3(0.04, -boxHeight / 2 - 0.10, 0),
      new THREE.Vector3(0.12, -boxHeight / 2 - 0.10, 0),
    ]);
    const conduitGeo = new THREE.TubeGeometry(conduitCurve, 20, 0.008, 12, false);
    const conduitMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.7,
      roughness: 0.3,
    });
    const conduitMesh = new THREE.Mesh(conduitGeo, conduitMat);
    this.group.add(conduitMesh);

    // --- 6. Terminal Connection Points ---
    this.terminalHigh = new THREE.Object3D();
    this.terminalHigh.position.set(boxWidth / 2 + 0.015, 0.065, 0);
    this.terminalHigh.name = 'Terminal_LEVEL_SENSOR_HIGH';
    this.terminalHigh.userData = { terminalId: 'LEVEL_SENSOR_HIGH', label: 'Stop Button / High Lamp' };
    this.group.add(this.terminalHigh);

    this.terminalLow = new THREE.Object3D();
    this.terminalLow.position.set(boxWidth / 2 + 0.015, -0.065, 0);
    this.terminalLow.name = 'Terminal_LEVEL_SENSOR_LOW';
    this.terminalLow.userData = { terminalId: 'LEVEL_SENSOR_LOW', label: 'Start Button / Low Lamp' };
    this.group.add(this.terminalLow);

    // Position operator station on the bench
    this.group.position.set(
      LAYOUT.OPERATOR_STATION_POSITION.x,
      LAYOUT.OPERATOR_STATION_POSITION.y,
      LAYOUT.OPERATOR_STATION_POSITION.z
    );
  }

  /** Update illuminated button states based on tank level (0-100) */
  setLevel(percent: number): void {
    if (percent <= 20) {
      this.currentStatus = 'LOW';
      this.resetLampMat.emissive.setHex(0xf59e0b);
      this.resetLampMat.emissiveIntensity = 1.3;

      this.startLampMat.emissive.setHex(0x166534);
      this.startLampMat.emissiveIntensity = 0.2;

      this.stopLampMat.emissive.setHex(0x991b1b);
      this.stopLampMat.emissiveIntensity = 0.2;
    } else if (percent >= 80) {
      this.currentStatus = 'HIGH';
      this.stopLampMat.emissive.setHex(0xef4444);
      this.stopLampMat.emissiveIntensity = 1.5;

      this.startLampMat.emissive.setHex(0x166534);
      this.startLampMat.emissiveIntensity = 0.2;

      this.resetLampMat.emissive.setHex(0xb45309);
      this.resetLampMat.emissiveIntensity = 0.2;
    } else {
      this.currentStatus = 'NORMAL';
      this.startLampMat.emissive.setHex(0x22c55e);
      this.startLampMat.emissiveIntensity = 1.0;

      this.resetLampMat.emissive.setHex(0xb45309);
      this.resetLampMat.emissiveIntensity = 0.2;

      this.stopLampMat.emissive.setHex(0x991b1b);
      this.stopLampMat.emissiveIntensity = 0.2;
    }
  }

  /** Button pulse and emergency strobe during active alarms */
  update(dt: number): void {
    this.pulseTime += dt * 6;
    const isEStop = alarmManager.isEStopLatched();
    const isCritical = alarmManager.hasActiveCritical();

    if (isEStop || this.currentStatus === 'HIGH' || isCritical) {
      const strobeSpeed = isEStop ? 14 : 6;
      const intensity = 1.0 + Math.sin(this.pulseTime * (strobeSpeed / 6)) * 0.8;
      this.stopLampMat.emissive.setHex(0xef4444);
      this.stopLampMat.emissiveIntensity = Math.max(0.2, intensity);
    } else if (this.currentStatus === 'LOW') {
      const intensity = 0.8 + Math.sin(this.pulseTime) * 0.5;
      this.resetLampMat.emissiveIntensity = Math.max(0.3, intensity);
    }
  }
}
