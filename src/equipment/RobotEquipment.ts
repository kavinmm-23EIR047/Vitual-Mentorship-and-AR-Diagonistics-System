// ============================================================
// RobotEquipment.ts – 3-Axis Industrial Robotic Pick-and-Place Workcell
// Procedural 3D Model: Cartesian Gantry, Vacuum Gripper, In-Feed & Sorting Nest
// ============================================================

import * as THREE from 'three';

export class RobotEquipment {
  group: THREE.Group;

  // Gantry Moving Assemblies
  private xGantryBeam: THREE.Group;
  private yCarriage: THREE.Group;
  private zPistonRod: THREE.Group;
  private vacuumCup: THREE.Mesh;
  private vacuumCupMat: THREE.MeshStandardMaterial;
  private vacuumAura: THREE.Mesh;
  private vacuumAuraMat: THREE.MeshBasicMaterial;

  // In-feed and Target Bins
  private inFeedNest: THREE.Group;
  private targetBinA: THREE.Mesh;
  private targetBinB: THREE.Mesh;
  private partSensorBeam: THREE.Mesh;
  private partSensorBeamMat: THREE.MeshBasicMaterial;

  // Workpieces
  private feedPartMesh: THREE.Mesh;
  private grippedPartMesh: THREE.Mesh;
  private sortedParts: THREE.Mesh[] = [];

  // Terminal Objects for PLC Wiring
  terminalPartSensor: THREE.Object3D;
  terminalHomeSwitch: THREE.Object3D;
  terminalServoDrive: THREE.Object3D;
  terminalVacuumValve: THREE.Object3D;

  // Kinematic Coordinates
  private currentX = 0; // -0.28 (Feed) to +0.28 (Target)
  private currentY = 0;
  private currentZ = 0; // 0 (up) to 0.16 (down)
  private isVacuumActive = false;
  private isPartHeld = false;
  private isPartInFeed = true;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'RobotWorkcell';

    // Materials
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x8898a5,
      metalness: 0.58,
      roughness: 0.38,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xc3cdd5,
      metalness: 0.72,
      roughness: 0.29,
    });
    const carriageMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Siemens industrial blue
      metalness: 0.7,
      roughness: 0.3,
    });
    const orangeAccentMat = new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      metalness: 0.5,
      roughness: 0.35,
    });
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.75,
      metalness: 0.2,
    });
    const binMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Green bin
      roughness: 0.5,
      metalness: 0.3,
    });

    this.vacuumCupMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.4,
      metalness: 0.1,
    });
    this.vacuumAuraMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });

    // --- 1. Base Worktable Platform ---
    const tableGeo = new THREE.BoxGeometry(0.88, 0.025, 0.56);
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, -0.0125, 0);
    table.receiveShadow = true;
    this.group.add(table);

    // --- 2. 4-Post Gantry Structural Frame ---
    const postGeo = new THREE.BoxGeometry(0.03, 0.42, 0.03);
    const postPositions = [
      [-0.38, 0.20, 0.22],
      [-0.38, 0.20, -0.22],
      [0.38, 0.20, 0.22],
      [0.38, 0.20, -0.22],
    ];

    for (const [px, py, pz] of postPositions) {
      const post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(px, py, pz);
      post.castShadow = true;
      this.group.add(post);

      // Foot pads
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16), railMat);
      foot.position.set(px, 0.005, pz);
      this.group.add(foot);
    }

    // Top Longitudinal Guide Rails (X-Axis Rails)
    const xRailGeo = new THREE.BoxGeometry(0.76, 0.02, 0.025);
    const xRailFront = new THREE.Mesh(xRailGeo, railMat);
    xRailFront.position.set(0, 0.40, 0.22);
    this.group.add(xRailFront);

    const xRailBack = new THREE.Mesh(xRailGeo, railMat);
    xRailBack.position.set(0, 0.40, -0.22);
    this.group.add(xRailBack);

    // Lateral Braces
    const latBraceGeo = new THREE.BoxGeometry(0.02, 0.02, 0.44);
    const latBraceLeft = new THREE.Mesh(latBraceGeo, frameMat);
    latBraceLeft.position.set(-0.38, 0.40, 0);
    this.group.add(latBraceLeft);

    const latBraceRight = new THREE.Mesh(latBraceGeo, frameMat);
    latBraceRight.position.set(0.38, 0.40, 0);
    this.group.add(latBraceRight);

    // --- 3. Moving X-Axis Gantry Crossbeam Assembly ---
    this.xGantryBeam = new THREE.Group();
    this.xGantryBeam.position.set(this.currentX, 0.40, 0);

    // Crossbeam aluminum extrusion
    const beamGeo = new THREE.BoxGeometry(0.04, 0.03, 0.44);
    const beam = new THREE.Mesh(beamGeo, carriageMat);
    beam.castShadow = true;
    this.xGantryBeam.add(beam);

    // Dual X-Slide Blocks
    const slideBlockGeo = new THREE.BoxGeometry(0.06, 0.04, 0.045);
    const slideFront = new THREE.Mesh(slideBlockGeo, orangeAccentMat);
    slideFront.position.set(0, 0, 0.22);
    this.xGantryBeam.add(slideFront);

    const slideBack = new THREE.Mesh(slideBlockGeo, orangeAccentMat);
    slideBack.position.set(0, 0, -0.22);
    this.xGantryBeam.add(slideBack);

    // --- 4. Moving Y-Axis Carriage Assembly ---
    this.yCarriage = new THREE.Group();
    this.yCarriage.position.set(0, 0, this.currentY);

    const yCarriageGeo = new THREE.BoxGeometry(0.06, 0.05, 0.06);
    const yCarriageMesh = new THREE.Mesh(yCarriageGeo, carriageMat);
    this.yCarriage.add(yCarriageMesh);

    // Z-Axis Linear Pneumatic Cylinder Body
    const zCylinderGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.16, 16);
    const zCylinder = new THREE.Mesh(zCylinderGeo, frameMat);
    zCylinder.position.set(0, -0.07, 0);
    this.yCarriage.add(zCylinder);

    // --- 5. Moving Z-Axis Piston Shaft & Vacuum Gripper ---
    this.zPistonRod = new THREE.Group();
    this.zPistonRod.position.set(0, -0.12, 0);

    const pistonShaftGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.18, 16);
    const pistonShaft = new THREE.Mesh(pistonShaftGeo, railMat);
    pistonShaft.position.set(0, 0, 0);
    this.zPistonRod.add(pistonShaft);

    // Vacuum Head Flange
    const flangeGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.015, 16);
    const flange = new THREE.Mesh(flangeGeo, orangeAccentMat);
    flange.position.set(0, -0.09, 0);
    this.zPistonRod.add(flange);

    // Blue Silicone Vacuum Suction Cup
    const cupGeo = new THREE.ConeGeometry(0.022, 0.02, 16, 1, true);
    this.vacuumCup = new THREE.Mesh(cupGeo, this.vacuumCupMat);
    this.vacuumCup.position.set(0, -0.10, 0);
    this.zPistonRod.add(this.vacuumCup);

    // Suction Aura
    const auraGeo = new THREE.RingGeometry(0.01, 0.03, 16);
    auraGeo.rotateX(Math.PI / 2);
    this.vacuumAura = new THREE.Mesh(auraGeo, this.vacuumAuraMat);
    this.vacuumAura.position.set(0, -0.11, 0);
    this.zPistonRod.add(this.vacuumAura);

    // Gripped Workpiece (attached when vacuum holds part)
    const partGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 16);
    const partMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Gold brass finish
      metalness: 0.8,
      roughness: 0.2,
    });
    this.grippedPartMesh = new THREE.Mesh(partGeo, partMat);
    this.grippedPartMesh.position.set(0, -0.125, 0);
    this.grippedPartMesh.visible = false;
    this.zPistonRod.add(this.grippedPartMesh);

    this.yCarriage.add(this.zPistonRod);
    this.xGantryBeam.add(this.yCarriage);
    this.group.add(this.xGantryBeam);

    // --- 6. In-Feed Part Nest & Optical Sensor (Left Side) ---
    this.inFeedNest = new THREE.Group();
    this.inFeedNest.position.set(-0.28, 0.02, 0);

    const nestBaseGeo = new THREE.BoxGeometry(0.10, 0.04, 0.10);
    const nestBase = new THREE.Mesh(nestBaseGeo, frameMat);
    nestBase.position.set(0, 0.02, 0);
    this.inFeedNest.add(nestBase);

    // Sensor Bracket & IR Beam
    const sensorBracket = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), orangeAccentMat);
    sensorBracket.position.set(0.06, 0.04, 0);
    this.inFeedNest.add(sensorBracket);

    this.partSensorBeamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.75,
    });
    const beamGeo2 = new THREE.CylinderGeometry(0.002, 0.002, 0.08, 8);
    beamGeo2.rotateZ(Math.PI / 2);
    this.partSensorBeam = new THREE.Mesh(beamGeo2, this.partSensorBeamMat);
    this.partSensorBeam.position.set(0.02, 0.05, 0);
    this.inFeedNest.add(this.partSensorBeam);

    // Feed Part currently waiting
    this.feedPartMesh = new THREE.Mesh(partGeo, partMat);
    this.feedPartMesh.position.set(0, 0.055, 0);
    this.feedPartMesh.castShadow = true;
    this.inFeedNest.add(this.feedPartMesh);

    this.group.add(this.inFeedNest);

    // --- 7. Target Sorting Bins (Right Side) ---
    const binGeo = new THREE.BoxGeometry(0.12, 0.06, 0.12);
    this.targetBinA = new THREE.Mesh(binGeo, binMat);
    this.targetBinA.position.set(0.28, 0.03, -0.08);
    this.group.add(this.targetBinA);

    this.targetBinB = new THREE.Mesh(binGeo, new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 }));
    this.targetBinB.position.set(0.28, 0.03, 0.08);
    this.group.add(this.targetBinB);

    // --- 8. Terminals for PLC Wiring ---
    this.terminalPartSensor = new THREE.Object3D();
    this.terminalPartSensor.position.set(-0.22, 0.08, 0);
    this.group.add(this.terminalPartSensor);

    this.terminalHomeSwitch = new THREE.Object3D();
    this.terminalHomeSwitch.position.set(-0.38, 0.42, 0.22);
    this.group.add(this.terminalHomeSwitch);

    this.terminalServoDrive = new THREE.Object3D();
    this.terminalServoDrive.position.set(0.38, 0.42, 0.22);
    this.group.add(this.terminalServoDrive);

    this.terminalVacuumValve = new THREE.Object3D();
    this.terminalVacuumValve.position.set(0, 0.38, -0.22);
    this.group.add(this.terminalVacuumValve);
  }

  setPose(normX: number, normY: number, normZ: number): void {
    // Map normalized 0..1 to physical gantry travel range
    // X: 0 (feed -0.28) to 1 (target +0.28)
    this.currentX = -0.28 + normX * 0.56;
    this.currentY = (normY - 0.5) * 0.24;
    this.currentZ = normZ * 0.14; // 0 is top, 0.14 is bottom touch

    this.xGantryBeam.position.x = this.currentX;
    this.yCarriage.position.z = this.currentY;
    this.zPistonRod.position.y = -0.12 - this.currentZ;
  }

  setVacuum(active: boolean): void {
    this.isVacuumActive = active;
    this.vacuumAuraMat.opacity = active ? 0.8 : 0;
    this.vacuumCupMat.emissive.setHex(active ? 0x06b6d4 : 0x000000);
    this.vacuumCupMat.emissiveIntensity = active ? 1.5 : 0;
  }

  setPartHeld(held: boolean): void {
    this.isPartHeld = held;
    this.grippedPartMesh.visible = held;
  }

  setPartInFeed(present: boolean): void {
    this.isPartInFeed = present;
    this.feedPartMesh.visible = present;
    this.partSensorBeamMat.opacity = present ? 0.9 : 0.2;
  }

  spawnFeedPart(): void {
    this.setPartInFeed(true);
  }

  dropPartIntoBin(binIndex: number): void {
    this.setPartHeld(false);
    // Create stationary sorted part in target bin
    const partGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 16);
    const partMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const sortedMesh = new THREE.Mesh(partGeo, partMat);
    const zOffset = binIndex === 0 ? -0.08 : 0.08;
    sortedMesh.position.set(0.28, 0.075, zOffset);
    this.group.add(sortedMesh);
    this.sortedParts.push(sortedMesh);

    // Limit to max 6 parts in bin to prevent clutter
    if (this.sortedParts.length > 6) {
      const oldest = this.sortedParts.shift();
      if (oldest) this.group.remove(oldest);
    }
  }

  reset(): void {
    this.setPose(0, 0.5, 0);
    this.setVacuum(false);
    this.setPartHeld(false);
    this.setPartInFeed(true);
    for (const p of this.sortedParts) {
      this.group.remove(p);
    }
    this.sortedParts = [];
  }

  update(dt: number): void {
    // Pulse vacuum aura when active
    if (this.isVacuumActive) {
      this.vacuumAura.rotation.z += dt * 5;
    }
  }
}
