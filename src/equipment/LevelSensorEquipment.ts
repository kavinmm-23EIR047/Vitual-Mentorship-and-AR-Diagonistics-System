// ============================================================
// LevelSensorEquipment – Procedural level sensor probe
// ============================================================

import * as THREE from 'three';
import { COLORS, LAYOUT } from '../core/constants';

export class LevelSensorEquipment {
  group: THREE.Group;
  private ledMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'LevelSensor';

    // --- Sensor housing (small box at top) ---
    const housingGeo = new THREE.BoxGeometry(0.03, 0.025, 0.02);
    const housingMat = new THREE.MeshStandardMaterial({
      color: COLORS.SENSOR_BODY,
      metalness: 0.5,
      roughness: 0.4,
    });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.y = 0.35;
    housing.castShadow = true;
    this.group.add(housing);

    // --- Probe rod (vertical) ---
    const probeGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.3, 8);
    const probeMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.8,
      roughness: 0.2,
    });
    const probe = new THREE.Mesh(probeGeo, probeMat);
    probe.position.y = 0.19;
    probe.castShadow = true;
    this.group.add(probe);

    // --- Probe tip ---
    const tipGeo = new THREE.SphereGeometry(0.006, 8, 6);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.5,
      roughness: 0.3,
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.04;
    this.group.add(tip);

    // --- Status LED ---
    const ledGeo = new THREE.SphereGeometry(0.005, 8, 6);
    this.ledMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.LED_OFF,
      emissive: COLORS.LED_OFF,
      emissiveIntensity: 0,
    });
    const led = new THREE.Mesh(ledGeo, this.ledMaterial);
    led.position.set(0, 0.37, 0.012);
    this.group.add(led);

    // --- Mounting bracket ---
    const bracketGeo = new THREE.BoxGeometry(0.005, 0.04, 0.02);
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      metalness: 0.6,
      roughness: 0.4,
    });
    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    bracket.position.set(-0.02, 0.35, 0);
    this.group.add(bracket);

    // Position
    this.group.position.set(
      LAYOUT.SENSOR_POSITION.x,
      LAYOUT.SENSOR_POSITION.y,
      LAYOUT.SENSOR_POSITION.z
    );
  }

  setState(state: 'NORMAL' | 'LOW' | 'HIGH' | 'FAULT'): void {
    const colorMap = {
      NORMAL: COLORS.LED_GREEN,
      LOW: COLORS.LED_YELLOW,
      HIGH: COLORS.LED_RED,
      FAULT: COLORS.LED_RED,
    };
    const color = colorMap[state];
    this.ledMaterial.color.setHex(color);
    this.ledMaterial.emissive.setHex(color);
    this.ledMaterial.emissiveIntensity = state === 'NORMAL' ? 0.8 : 1.2;
  }
}
