// ============================================================
// TrafficEquipment.ts – Smart 4-Way Traffic Junction & Pedestrian Twin
// Procedural 3D Model: Signal Heads, Ped Crosswalk, Inductive Loop & Vehicles
// ============================================================

import * as THREE from 'three';
import type { TrafficPhase, PedWalkPhase } from '../core/AppState';

export class TrafficEquipment {
  group: THREE.Group;

  // Signal Lamps (Main Mast 1)
  private redLamp1: THREE.Mesh;
  private yellowLamp1: THREE.Mesh;
  private greenLamp1: THREE.Mesh;
  private redMat1: THREE.MeshStandardMaterial;
  private yellowMat1: THREE.MeshStandardMaterial;
  private greenMat1: THREE.MeshStandardMaterial;

  // Signal Lamps (Cross Mast 2)
  private redLamp2: THREE.Mesh;
  private yellowLamp2: THREE.Mesh;
  private greenLamp2: THREE.Mesh;
  private redMat2: THREE.MeshStandardMaterial;
  private yellowMat2: THREE.MeshStandardMaterial;
  private greenMat2: THREE.MeshStandardMaterial;

  // Pedestrian Signal Lamps
  private pedWalkLamp: THREE.Mesh;
  private pedStopLamp: THREE.Mesh;
  private pedWalkMat: THREE.MeshStandardMaterial;
  private pedStopMat: THREE.MeshStandardMaterial;
  private pedCallButtonMesh: THREE.Mesh;
  private pedCallBtnMat: THREE.MeshStandardMaterial;

  // Inductive Road Loop Mesh & Glow
  private loopMesh: THREE.Mesh;
  private loopMat: THREE.MeshStandardMaterial;

  // Animated Vehicles
  private carGroup: THREE.Group;
  private carPositionZ = -0.65;
  private carSpeed = 0;
  private carWheels: THREE.Mesh[] = [];

  // Terminal Objects for PLC Wiring
  terminalPedButton: THREE.Object3D;
  terminalVehicleSensor: THREE.Object3D;
  terminalMainSignal: THREE.Object3D;
  terminalPedLight: THREE.Object3D;

  // States
  private currentPhase: TrafficPhase = 'MAIN_GREEN';
  private currentPedPhase: PedWalkPhase = 'DONT_WALK';
  private isVehiclePresent = false;
  private emergencyMode = false;
  private strobeTimer = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'TrafficSystem';

    // Base Materials
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const stripeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.5,
    });
    const stripeYellowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.25,
    });
    const headHousingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.2,
    });

    // Lamp Materials with Emissive Glow
    this.redMat1 = new THREE.MeshStandardMaterial({
      color: 0x450a0a,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    this.yellowMat1 = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    this.greenMat1 = new THREE.MeshStandardMaterial({
      color: 0x022c22,
      emissive: 0x10b981,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });

    this.redMat2 = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    this.yellowMat2 = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    this.greenMat2 = new THREE.MeshStandardMaterial({
      color: 0x022c22,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
    });

    this.pedWalkMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    this.pedStopMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });
    this.pedCallBtnMat = new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      emissive: 0xff6b00,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });

    this.loopMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });

    // --- 1. Road Intersection Base Platform ---
    const roadGeo = new THREE.BoxGeometry(0.96, 0.02, 0.96);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, -0.01, 0);
    road.receiveShadow = true;
    this.group.add(road);

    // Crosswalk Zebra Stripes
    const zebraCount = 6;
    for (let i = 0; i < zebraCount; i++) {
      const stripeGeo = new THREE.BoxGeometry(0.04, 0.002, 0.22);
      const stripe = new THREE.Mesh(stripeGeo, stripeWhiteMat);
      stripe.position.set(-0.25 + i * 0.1, 0.002, 0.24);
      stripe.receiveShadow = true;
      this.group.add(stripe);
    }

    // Yellow Center Lines
    const centerLineGeo = new THREE.BoxGeometry(0.015, 0.002, 0.36);
    const centerLine1 = new THREE.Mesh(centerLineGeo, stripeYellowMat);
    centerLine1.position.set(-0.015, 0.002, -0.28);
    this.group.add(centerLine1);

    const centerLine2 = new THREE.Mesh(centerLineGeo, stripeYellowMat);
    centerLine2.position.set(0.015, 0.002, -0.28);
    this.group.add(centerLine2);

    // Stop Bar (White transversal stripe)
    const stopBarGeo = new THREE.BoxGeometry(0.38, 0.002, 0.035);
    const stopBar = new THREE.Mesh(stopBarGeo, stripeWhiteMat);
    stopBar.position.set(0, 0.002, 0.09);
    this.group.add(stopBar);

    // --- 2. Inductive Road Vehicle Loop Sensor ---
    const loopGeo = new THREE.RingGeometry(0.08, 0.11, 24);
    loopGeo.rotateX(-Math.PI / 2);
    this.loopMesh = new THREE.Mesh(loopGeo, this.loopMat);
    this.loopMesh.position.set(0.12, 0.003, -0.16);
    this.group.add(this.loopMesh);

    // --- 3. Main Traffic Mast Post (Right Corner) ---
    const mastGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.44, 16);
    const mast1 = new THREE.Mesh(mastGeo, postMat);
    mast1.position.set(0.28, 0.22, 0.18);
    mast1.castShadow = true;
    this.group.add(mast1);

    // Mast Base Collar
    const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.02, 16), postMat);
    baseCollar.position.set(0.28, 0.01, 0.18);
    this.group.add(baseCollar);

    // Signal Head 1 Housing (Avenue Signal)
    const headHousingGeo = new THREE.BoxGeometry(0.06, 0.17, 0.045);
    const headHousing1 = new THREE.Mesh(headHousingGeo, headHousingMat);
    headHousing1.position.set(0.28, 0.35, 0.18);
    headHousing1.castShadow = true;
    this.group.add(headHousing1);

    // Lenses on Head 1
    const lensGeo = new THREE.SphereGeometry(0.02, 16, 16);
    lensGeo.scale(1, 1, 0.5);

    this.redLamp1 = new THREE.Mesh(lensGeo, this.redMat1);
    this.redLamp1.position.set(0.28, 0.405, 0.205);
    this.group.add(this.redLamp1);

    this.yellowLamp1 = new THREE.Mesh(lensGeo, this.yellowMat1);
    this.yellowLamp1.position.set(0.28, 0.35, 0.205);
    this.group.add(this.yellowLamp1);

    this.greenLamp1 = new THREE.Mesh(lensGeo, this.greenMat1);
    this.greenLamp1.position.set(0.28, 0.295, 0.205);
    this.group.add(this.greenLamp1);

    // Sun Visors for Head 1
    for (const y of [0.405, 0.35, 0.295]) {
      const visorGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.02, 16, 1, true, 0, Math.PI);
      visorGeo.rotateX(Math.PI / 2);
      const visor = new THREE.Mesh(visorGeo, headHousingMat);
      visor.position.set(0.28, y + 0.012, 0.215);
      this.group.add(visor);
    }

    // --- 4. Cross Traffic Signal Head (Cross Street) ---
    const headHousing2 = new THREE.Mesh(headHousingGeo, headHousingMat);
    headHousing2.position.set(0.28, 0.35, 0.18);
    headHousing2.rotation.y = Math.PI / 2;
    this.group.add(headHousing2);

    this.redLamp2 = new THREE.Mesh(lensGeo, this.redMat2);
    this.redLamp2.position.set(0.305, 0.405, 0.18);
    this.redLamp2.rotation.y = Math.PI / 2;
    this.group.add(this.redLamp2);

    this.yellowLamp2 = new THREE.Mesh(lensGeo, this.yellowMat2);
    this.yellowLamp2.position.set(0.305, 0.35, 0.18);
    this.yellowLamp2.rotation.y = Math.PI / 2;
    this.group.add(this.yellowLamp2);

    this.greenLamp2 = new THREE.Mesh(lensGeo, this.greenMat2);
    this.greenLamp2.position.set(0.305, 0.295, 0.18);
    this.greenLamp2.rotation.y = Math.PI / 2;
    this.group.add(this.greenLamp2);

    // --- 5. Pedestrian Crossing Station (Left Corner) ---
    const pedPostGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.34, 16);
    const pedPost = new THREE.Mesh(pedPostGeo, postMat);
    pedPost.position.set(-0.32, 0.17, 0.24);
    pedPost.castShadow = true;
    this.group.add(pedPost);

    // Ped Head Housing
    const pedHousingGeo = new THREE.BoxGeometry(0.05, 0.11, 0.04);
    const pedHousing = new THREE.Mesh(pedHousingGeo, headHousingMat);
    pedHousing.position.set(-0.32, 0.27, 0.24);
    this.group.add(pedHousing);

    // Ped Lenses
    this.pedStopLamp = new THREE.Mesh(lensGeo, this.pedStopMat);
    this.pedStopLamp.position.set(-0.32, 0.295, 0.262);
    this.group.add(this.pedStopLamp);

    this.pedWalkLamp = new THREE.Mesh(lensGeo, this.pedWalkMat);
    this.pedWalkLamp.position.set(-0.32, 0.245, 0.262);
    this.group.add(this.pedWalkLamp);

    // Pedestrian Call Pushbutton Station
    const btnBoxGeo = new THREE.BoxGeometry(0.03, 0.05, 0.03);
    const btnBox = new THREE.Mesh(btnBoxGeo, new THREE.MeshStandardMaterial({ color: 0x334155 }));
    btnBox.position.set(-0.32, 0.14, 0.25);
    this.group.add(btnBox);

    const btnGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.008, 16);
    btnGeo.rotateX(Math.PI / 2);
    this.pedCallButtonMesh = new THREE.Mesh(btnGeo, this.pedCallBtnMat);
    this.pedCallButtonMesh.position.set(-0.32, 0.14, 0.268);
    this.group.add(this.pedCallButtonMesh);

    // --- 6. Animated 3D Vehicle ---
    this.carGroup = new THREE.Group();
    this.carGroup.position.set(0.12, 0, this.carPositionZ);

    const carBodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.7,
      roughness: 0.3,
    });
    const carGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.5,
    });

    // Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(0.12, 0.04, 0.24);
    const chassis = new THREE.Mesh(chassisGeo, carBodyMat);
    chassis.position.set(0, 0.035, 0);
    chassis.castShadow = true;
    this.carGroup.add(chassis);

    // Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(0.10, 0.035, 0.13);
    const cabin = new THREE.Mesh(cabinGeo, carGlassMat);
    cabin.position.set(0, 0.065, -0.01);
    cabin.castShadow = true;
    this.carGroup.add(cabin);

    // Headlights
    const hLightGeo = new THREE.BoxGeometry(0.02, 0.012, 0.01);
    const hlLeft = new THREE.Mesh(hLightGeo, headlightMat);
    hlLeft.position.set(-0.04, 0.04, 0.12);
    this.carGroup.add(hlLeft);

    const hlRight = new THREE.Mesh(hLightGeo, headlightMat);
    hlRight.position.set(0.04, 0.04, 0.12);
    this.carGroup.add(hlRight);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.015, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelPos = [
      [-0.065, 0.02, 0.07],
      [0.065, 0.02, 0.07],
      [-0.065, 0.02, -0.07],
      [0.065, 0.02, -0.07],
    ];
    for (const [wx, wy, wz] of wheelPos) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      this.carWheels.push(wheel);
      this.carGroup.add(wheel);
    }

    this.group.add(this.carGroup);

    // --- 7. Terminals for PLC Wiring ---
    this.terminalPedButton = new THREE.Object3D();
    this.terminalPedButton.position.set(-0.32, 0.14, 0.28);
    this.group.add(this.terminalPedButton);

    this.terminalVehicleSensor = new THREE.Object3D();
    this.terminalVehicleSensor.position.set(0.12, 0.04, -0.16);
    this.group.add(this.terminalVehicleSensor);

    this.terminalMainSignal = new THREE.Object3D();
    this.terminalMainSignal.position.set(0.28, 0.35, 0.24);
    this.group.add(this.terminalMainSignal);

    this.terminalPedLight = new THREE.Object3D();
    this.terminalPedLight.position.set(-0.32, 0.27, 0.28);
    this.group.add(this.terminalPedLight);

    // Initial update
    this.setTrafficPhase('MAIN_GREEN');
    this.setPedWalkPhase('DONT_WALK');
  }

  setTrafficPhase(phase: TrafficPhase): void {
    this.currentPhase = phase;

    // Reset all main lamps
    this.redMat1.emissive.setHex(0x000000);
    this.redMat1.emissiveIntensity = 0;
    this.yellowMat1.emissive.setHex(0x000000);
    this.yellowMat1.emissiveIntensity = 0;
    this.greenMat1.emissive.setHex(0x000000);
    this.greenMat1.emissiveIntensity = 0;

    this.redMat2.emissive.setHex(0x000000);
    this.redMat2.emissiveIntensity = 0;
    this.yellowMat2.emissive.setHex(0x000000);
    this.yellowMat2.emissiveIntensity = 0;
    this.greenMat2.emissive.setHex(0x000000);
    this.greenMat2.emissiveIntensity = 0;

    switch (phase) {
      case 'MAIN_GREEN':
        this.greenMat1.emissive.setHex(0x10b981);
        this.greenMat1.emissiveIntensity = 2.4;
        this.redMat2.emissive.setHex(0xef4444);
        this.redMat2.emissiveIntensity = 2.2;
        break;

      case 'MAIN_YELLOW':
        this.yellowMat1.emissive.setHex(0xf59e0b);
        this.yellowMat1.emissiveIntensity = 2.4;
        this.redMat2.emissive.setHex(0xef4444);
        this.redMat2.emissiveIntensity = 2.2;
        break;

      case 'MAIN_RED':
        this.redMat1.emissive.setHex(0xef4444);
        this.redMat1.emissiveIntensity = 2.4;
        this.greenMat2.emissive.setHex(0x10b981);
        this.greenMat2.emissiveIntensity = 2.2;
        break;

      case 'ALL_RED':
        this.redMat1.emissive.setHex(0xef4444);
        this.redMat1.emissiveIntensity = 2.4;
        this.redMat2.emissive.setHex(0xef4444);
        this.redMat2.emissiveIntensity = 2.4;
        break;
    }
  }

  setPedWalkPhase(phase: PedWalkPhase): void {
    this.currentPedPhase = phase;

    if (phase === 'WALK') {
      this.pedWalkMat.emissive.setHex(0x10b981);
      this.pedWalkMat.emissiveIntensity = 2.5;
      this.pedStopMat.emissive.setHex(0x000000);
      this.pedStopMat.emissiveIntensity = 0;
    } else if (phase === 'FLASHING') {
      this.pedWalkMat.emissive.setHex(0xf59e0b);
      this.pedWalkMat.emissiveIntensity = 1.8;
      this.pedStopMat.emissive.setHex(0x000000);
      this.pedStopMat.emissiveIntensity = 0;
    } else {
      // DONT_WALK
      this.pedWalkMat.emissive.setHex(0x000000);
      this.pedWalkMat.emissiveIntensity = 0;
      this.pedStopMat.emissive.setHex(0xef4444);
      this.pedStopMat.emissiveIntensity = 2.2;
    }
  }

  setPedButtonPressed(pressed: boolean): void {
    this.pedCallBtnMat.emissiveIntensity = pressed ? 2.0 : 0.6;
  }

  setEmergency(active: boolean): void {
    this.emergencyMode = active;
  }

  isCarOverSensor(): boolean {
    return this.isVehiclePresent;
  }

  resetCar(): void {
    this.carPositionZ = -0.55;
    this.carGroup.position.z = this.carPositionZ;
  }

  update(dt: number, onVehiclePass?: () => void): void {
    // 1. Vehicle Movement Logic
    const stopLineZ = -0.04;
    const isMainGreen = this.currentPhase === 'MAIN_GREEN';

    if (isMainGreen || this.carPositionZ > stopLineZ) {
      // Moving through intersection
      this.carSpeed = 0.38;
      this.carPositionZ += this.carSpeed * dt;
      if (this.carPositionZ > 0.65) {
        this.carPositionZ = -0.65;
        if (onVehiclePass) onVehiclePass();
      }
    } else {
      // Approaching stop line
      if (this.carPositionZ < stopLineZ - 0.05) {
        this.carPositionZ += 0.25 * dt;
      } else {
        this.carSpeed = 0;
      }
    }

    this.carGroup.position.z = this.carPositionZ;

    // Rotate wheels
    if (this.carSpeed > 0.01) {
      for (const w of this.carWheels) {
        w.rotation.x += this.carSpeed * dt * 25;
      }
    }

    // Check if car is over inductive loop (around z = -0.16)
    const distToLoop = Math.abs(this.carPositionZ - (-0.16));
    this.isVehiclePresent = distToLoop < 0.12;

    if (this.isVehiclePresent) {
      this.loopMat.emissiveIntensity = 2.5 + Math.sin(Date.now() * 0.01) * 0.5;
    } else {
      this.loopMat.emissiveIntensity = 0.6;
    }

    // Emergency Strobe Flash
    if (this.emergencyMode) {
      this.strobeTimer += dt;
      const flash = Math.sin(this.strobeTimer * 16) > 0;
      this.redMat1.emissiveIntensity = flash ? 3.0 : 0.2;
      this.yellowMat1.emissiveIntensity = !flash ? 3.0 : 0.2;
    }
  }
}
