// ============================================================
// PumpEquipment – Industrial Siemens Blue Centrifugal Motor Pump
// ============================================================

import * as THREE from 'three';
import { COLORS, LAYOUT } from '../core/constants';

export class PumpEquipment {
  group: THREE.Group;
  private impeller: THREE.Mesh;
  private bodyMaterial: THREE.MeshStandardMaterial;
  private ledMesh: THREE.Mesh;
  private ledMaterial: THREE.MeshStandardMaterial;
  private isRunning = false;
  terminalControl: THREE.Object3D;
  terminalFeedback: THREE.Object3D;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'WaterPump';

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.2,
    });
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.PUMP_BODY, // Siemens Electric Blue (0x0284c7)
      metalness: 0.65,
      roughness: 0.32,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.4,
    });

    // --- 1. Industrial Baseplate (Cast Iron with Anchor Bolts) ---
    const plateGeo = new THREE.BoxGeometry(0.18, 0.016, 0.12);
    const plate = new THREE.Mesh(plateGeo, darkMat);
    plate.position.y = -0.042;
    plate.castShadow = true;
    plate.receiveShadow = true;
    this.group.add(plate);

    // 4 Corner Anchor Bolts
    const boltGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.008, 6);
    const corners = [
      [-0.075, 0.045],
      [0.075, 0.045],
      [-0.075, -0.045],
      [0.075, -0.045],
    ];
    for (const [bx, bz] of corners) {
      const bolt = new THREE.Mesh(boltGeo, steelMat);
      bolt.position.set(bx, -0.032, bz);
      this.group.add(bolt);
    }

    // --- 2. Centrifugal Volute Pump Casing (Front Section) ---
    const voluteGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.055, 24);
    const volute = new THREE.Mesh(voluteGeo, this.bodyMaterial);
    volute.rotation.z = Math.PI / 2;
    volute.position.x = -0.025;
    volute.castShadow = true;
    this.group.add(volute);

    // Front Volute Hub / Cover
    const hubGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.015, 20);
    const hub = new THREE.Mesh(hubGeo, this.bodyMaterial);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = -0.058;
    this.group.add(hub);

    // Suction Flange (Inlet facing left ←)
    const inletGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.008, 16);
    const inlet = new THREE.Mesh(inletGeo, steelMat);
    inlet.rotation.z = Math.PI / 2;
    inlet.position.x = -0.068;
    this.group.add(inlet);

    // Discharge Outlet Flange (Facing Top ↑)
    const outletGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.008, 16);
    const outlet = new THREE.Mesh(outletGeo, steelMat);
    outlet.position.set(-0.025, 0.062, 0);
    this.group.add(outlet);

    // Vertical discharge stub
    const outletStubGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.025, 16);
    const outletStub = new THREE.Mesh(outletStubGeo, this.bodyMaterial);
    outletStub.position.set(-0.025, 0.045, 0);
    this.group.add(outletStub);

    // --- 3. Electric Motor Body (Cylindrical with Cooling Fins) ---
    const motorGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.09, 24);
    const motor = new THREE.Mesh(motorGeo, this.bodyMaterial);
    motor.rotation.z = Math.PI / 2;
    motor.position.x = 0.045;
    motor.castShadow = true;
    this.group.add(motor);

    // Motor Cooling Fins (Perimeter Rings)
    const finGeo = new THREE.TorusGeometry(0.048, 0.002, 6, 24);
    for (let i = 0; i < 6; i++) {
      const fin = new THREE.Mesh(finGeo, this.bodyMaterial);
      fin.rotation.y = Math.PI / 2;
      fin.position.x = 0.015 + i * 0.012;
      this.group.add(fin);
    }

    // Rear Fan Cowl (Black / Dark Gray)
    const cowlGeo = new THREE.CylinderGeometry(0.047, 0.047, 0.025, 20);
    const cowl = new THREE.Mesh(cowlGeo, darkMat);
    cowl.rotation.z = Math.PI / 2;
    cowl.position.x = 0.098;
    this.group.add(cowl);

    // --- 4. Motor Terminal Junction Box (Top of Motor) ---
    const jboxGeo = new THREE.BoxGeometry(0.035, 0.025, 0.035);
    const jbox = new THREE.Mesh(jboxGeo, darkMat);
    jbox.position.set(0.045, 0.052, 0);
    jbox.castShadow = true;
    this.group.add(jbox);

    // --- 5. Internal Impeller / Hub animation ---
    const impellerGeo = new THREE.TorusGeometry(0.026, 0.004, 6, 6);
    this.impeller = new THREE.Mesh(impellerGeo, steelMat);
    this.impeller.rotation.y = Math.PI / 2;
    this.impeller.position.x = -0.06;
    this.impeller.name = 'Impeller';
    this.group.add(this.impeller);

    // --- 6. Status LED & Wiring Terminals ---
    const ledGeo = new THREE.SphereGeometry(0.005, 8, 6);
    this.ledMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.LED_OFF,
      emissive: COLORS.LED_OFF,
      emissiveIntensity: 0,
    });
    this.ledMesh = new THREE.Mesh(ledGeo, this.ledMaterial);
    this.ledMesh.position.set(0.045, 0.068, 0);
    this.group.add(this.ledMesh);

    this.terminalControl = new THREE.Object3D();
    this.terminalControl.position.set(0.06, 0.068, 0.02);
    this.terminalControl.name = 'Terminal_PUMP_CONTROL';
    this.terminalControl.userData = { terminalId: 'PUMP_CONTROL', label: 'Pump Control' };
    this.group.add(this.terminalControl);

    this.terminalFeedback = new THREE.Object3D();
    this.terminalFeedback.position.set(0.03, 0.068, 0.02);
    this.terminalFeedback.name = 'Terminal_PUMP_FEEDBACK';
    this.terminalFeedback.userData = { terminalId: 'PUMP_FEEDBACK', label: 'Pump Feedback' };
    this.group.add(this.terminalFeedback);

    // Position
    this.group.position.set(
      LAYOUT.PUMP_POSITION.x,
      LAYOUT.PUMP_POSITION.y,
      LAYOUT.PUMP_POSITION.z
    );
  }

  /** Set pump state */
  setRunning(running: boolean): void {
    this.isRunning = running;
    if (running) {
      this.ledMaterial.color.setHex(COLORS.LED_GREEN);
      this.ledMaterial.emissive.setHex(COLORS.LED_GREEN);
      this.ledMaterial.emissiveIntensity = 1.0;
    } else {
      this.ledMaterial.color.setHex(COLORS.LED_OFF);
      this.ledMaterial.emissive.setHex(COLORS.LED_OFF);
      this.ledMaterial.emissiveIntensity = 0;
    }
  }

  /** Call each frame for impeller animation */
  update(dt: number): void {
    if (this.isRunning) {
      this.impeller.rotation.x += dt * 16;
    }
  }
}
