// ============================================================
// ValveEquipment – In-Line Industrial Check Valve & Isolation Valve with Blue Handwheel
// ============================================================

import * as THREE from 'three';
import { COLORS, LAYOUT } from '../core/constants';

export class ValveEquipment {
  group: THREE.Group;
  private handwheel: THREE.Mesh;
  private ledMaterial: THREE.MeshStandardMaterial;
  private targetRotation = 0;
  private currentRotation = 0;
  terminalControl: THREE.Object3D;
  terminalFeedback: THREE.Object3D;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Valves';

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.22,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.35,
    });
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Industrial Siemens Blue
      metalness: 0.6,
      roughness: 0.3,
    });

    // ==========================================
    // 1. ISOLATION VALVE (with Blue Handwheel)
    // ==========================================
    const isoGroup = new THREE.Group();
    isoGroup.name = 'IsolationValve';

    // Valve Main Body (short horizontal spool)
    const bodyGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.075, 20);
    const body = new THREE.Mesh(bodyGeo, steelMat);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    isoGroup.add(body);

    // Flanges on both ends
    const flangeGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.006, 20);
    const flange1 = new THREE.Mesh(flangeGeo, steelMat);
    flange1.rotation.z = Math.PI / 2;
    flange1.position.x = -0.038;
    isoGroup.add(flange1);

    const flange2 = new THREE.Mesh(flangeGeo, steelMat);
    flange2.rotation.z = Math.PI / 2;
    flange2.position.x = 0.038;
    isoGroup.add(flange2);

    // Bonnet Neck / Stem Housing
    const bonnetGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.035, 16);
    const bonnet = new THREE.Mesh(bonnetGeo, steelMat);
    bonnet.position.y = 0.025;
    bonnet.castShadow = true;
    isoGroup.add(bonnet);

    // Threaded Stem
    const stemGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.03, 12);
    const stem = new THREE.Mesh(stemGeo, steelMat);
    stem.position.y = 0.045;
    isoGroup.add(stem);

    // Bright Blue Circular Handwheel (Torus + Spokes)
    const wheelRimGeo = new THREE.TorusGeometry(0.022, 0.0035, 12, 24);
    this.handwheel = new THREE.Mesh(wheelRimGeo, blueMat);
    this.handwheel.rotation.x = Math.PI / 2;
    this.handwheel.position.y = 0.06;
    this.handwheel.castShadow = true;

    // Handwheel spokes (crossbar)
    const spoke1 = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.044, 8), blueMat);
    spoke1.rotation.z = Math.PI / 2;
    this.handwheel.add(spoke1);

    const spoke2 = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.044, 8), blueMat);
    spoke2.rotation.x = Math.PI / 2;
    this.handwheel.add(spoke2);

    // Central hub nut
    const hubNut = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.006, 6), steelMat);
    this.handwheel.add(hubNut);

    isoGroup.add(this.handwheel);

    // Status LED
    const ledGeo = new THREE.SphereGeometry(0.004, 8, 6);
    this.ledMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.LED_OFF,
      emissive: COLORS.LED_OFF,
      emissiveIntensity: 0,
    });
    const led = new THREE.Mesh(ledGeo, this.ledMaterial);
    led.position.set(0, 0.075, 0);
    isoGroup.add(led);

    // Wiring Terminals
    this.terminalControl = new THREE.Object3D();
    this.terminalControl.position.set(0.035, 0.06, 0);
    this.terminalControl.name = 'Terminal_VALVE_CONTROL';
    this.terminalControl.userData = { terminalId: 'VALVE_CONTROL', label: 'Valve Control' };
    isoGroup.add(this.terminalControl);

    this.terminalFeedback = new THREE.Object3D();
    this.terminalFeedback.position.set(-0.035, 0.06, 0);
    this.terminalFeedback.name = 'Terminal_VALVE_FEEDBACK';
    this.terminalFeedback.userData = { terminalId: 'VALVE_FEEDBACK', label: 'Valve Feedback' };
    isoGroup.add(this.terminalFeedback);

    this.group.add(isoGroup);

    // ==========================================
    // 2. IN-LINE CHECK VALVE (Non-Return)
    // ==========================================
    const checkGroup = new THREE.Group();
    checkGroup.name = 'CheckValve';
    checkGroup.position.set(LAYOUT.CHECK_VALVE_POSITION.x - LAYOUT.VALVE_POSITION.x, 0, 0);

    // Check valve dark cylindrical chamber
    const checkGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.065, 20);
    const checkMesh = new THREE.Mesh(checkGeo, darkMat);
    checkMesh.rotation.z = Math.PI / 2;
    checkMesh.castShadow = true;
    checkGroup.add(checkMesh);

    // Flanges
    const chkFlange1 = new THREE.Mesh(flangeGeo, steelMat);
    chkFlange1.rotation.z = Math.PI / 2;
    chkFlange1.position.x = -0.033;
    checkGroup.add(chkFlange1);

    const chkFlange2 = new THREE.Mesh(flangeGeo, steelMat);
    chkFlange2.rotation.z = Math.PI / 2;
    chkFlange2.position.x = 0.033;
    checkGroup.add(chkFlange2);

    // Top Hex Inspection Cap
    const capGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.014, 6);
    const cap = new THREE.Mesh(capGeo, darkMat);
    cap.position.y = 0.03;
    checkGroup.add(cap);

    // Flow Direction Arrow badge
    const arrowBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.008, 0.002),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    arrowBox.position.set(0, 0, 0.027);
    checkGroup.add(arrowBox);

    this.group.add(checkGroup);

    // Position entire valve assembly on the suction line
    this.group.position.set(
      LAYOUT.VALVE_POSITION.x,
      LAYOUT.VALVE_POSITION.y,
      LAYOUT.VALVE_POSITION.z
    );
  }

  /** Set valve open or closed */
  setOpen(open: boolean): void {
    this.targetRotation = open ? Math.PI * 1.5 : 0;

    if (open) {
      this.ledMaterial.color.setHex(COLORS.LED_GREEN);
      this.ledMaterial.emissive.setHex(COLORS.LED_GREEN);
      this.ledMaterial.emissiveIntensity = 1.0;
    } else {
      this.ledMaterial.color.setHex(COLORS.LED_RED);
      this.ledMaterial.emissive.setHex(COLORS.LED_RED);
      this.ledMaterial.emissiveIntensity = 0.8;
    }
  }

  /** Smooth handwheel rotation */
  update(dt: number): void {
    const speed = 4.0;
    const diff = this.targetRotation - this.currentRotation;
    if (Math.abs(diff) > 0.01) {
      this.currentRotation += diff * speed * dt;
      this.handwheel.rotation.z = this.currentRotation;
    }
  }
}
