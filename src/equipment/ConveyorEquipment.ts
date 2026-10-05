// ============================================================
// ConveyorEquipment – Industrial Conveyor Belt & Optical Sorting System
// Procedural 3D Model with Gearmotor, Sensor, Pneumatic Diverter & Packages
// ============================================================

import * as THREE from 'three';

export interface WorkpieceBox {
  mesh: THREE.Group;
  positionX: number; // Position along conveyor X-axis (-0.45 to +0.45)
  isDefective: boolean; // Needs sorting/diverting
  isSorted: boolean; // Successfully pushed to sort chute
  isPushed: boolean;
  pushProgress: number; // 0 to 1
}

export class ConveyorEquipment {
  group: THREE.Group;
  private beltMesh: THREE.Mesh;
  private driveRoller: THREE.Mesh;
  private idlerRoller: THREE.Mesh;
  private motorMesh: THREE.Mesh;
  private sensorLED: THREE.Mesh;
  private sensorLEDMat: THREE.MeshStandardMaterial;
  private sensorBeam: THREE.Mesh;
  private sensorBeamMat: THREE.MeshBasicMaterial;
  private cylinderPiston: THREE.Group;
  private pusherPlate: THREE.Mesh;

  // Workpieces on belt
  private workpieces: WorkpieceBox[] = [];
  private spawnTimer = 0;

  // Operational State
  private isRunning = false;
  private beltSpeed = 0.35; // m/s
  private isSensorTripped = false;
  private isPusherExtended = false;
  private pusherStroke = 0; // 0 (retracted) to 1 (fully extended)

  // Terminals for PLC Wiring
  terminalOpticalSensor: THREE.Object3D;
  terminalStartButton: THREE.Object3D;
  terminalMotorDrive: THREE.Object3D;
  terminalPusherValve: THREE.Object3D;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ConveyorSystem';

    // Materials
    const aluminumMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.18,
    });
    const blackRubberMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const siemensBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.65,
      roughness: 0.35,
    });
    const yellowHazardMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.4,
      roughness: 0.4,
    });

    // --- 1. Conveyor Main Frame Bed (Extruded Aluminum) ---
    const bedLength = 0.88;
    const bedWidth = 0.18;
    const bedHeight = 0.04;

    // Left & Right Side Guide Channels
    const sideRailGeo = new THREE.BoxGeometry(bedLength, 0.05, 0.015);
    const sideRailFront = new THREE.Mesh(sideRailGeo, aluminumMat);
    sideRailFront.position.set(0, 0.01, bedWidth / 2);
    sideRailFront.castShadow = true;
    this.group.add(sideRailFront);

    const sideRailBack = new THREE.Mesh(sideRailGeo, aluminumMat);
    sideRailBack.position.set(0, 0.01, -bedWidth / 2);
    sideRailBack.castShadow = true;
    this.group.add(sideRailBack);

    // Bed Support Plate
    const bedPlateGeo = new THREE.BoxGeometry(bedLength - 0.06, 0.01, bedWidth - 0.02);
    const bedPlate = new THREE.Mesh(bedPlateGeo, steelMat);
    bedPlate.position.set(0, 0.02, 0);
    this.group.add(bedPlate);

    // --- 2. Support Legs & Structural Frame ---
    const legGeo = new THREE.BoxGeometry(0.025, 0.28, 0.025);
    const footGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.01, 16);

    const legPositions = [
      [-0.38, -0.14, 0.08],
      [-0.38, -0.14, -0.08],
      [0.38, -0.14, 0.08],
      [0.38, -0.14, -0.08],
    ];

    for (const [lx, ly, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeo, aluminumMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      this.group.add(leg);

      const foot = new THREE.Mesh(footGeo, steelMat);
      foot.position.set(lx, ly - 0.14, lz);
      this.group.add(foot);
    }

    // Cross Braces
    const braceGeo = new THREE.BoxGeometry(0.015, 0.015, bedWidth - 0.02);
    const brace1 = new THREE.Mesh(braceGeo, aluminumMat);
    brace1.position.set(-0.38, -0.18, 0);
    this.group.add(brace1);

    const brace2 = new THREE.Mesh(braceGeo, aluminumMat);
    brace2.position.set(0.38, -0.18, 0);
    this.group.add(brace2);

    // --- 3. Conveyor Belt & Rollers ---
    const beltGeo = new THREE.BoxGeometry(bedLength - 0.04, 0.008, bedWidth - 0.025);
    this.beltMesh = new THREE.Mesh(beltGeo, blackRubberMat);
    this.beltMesh.position.set(0, 0.026, 0);
    this.beltMesh.receiveShadow = true;
    this.group.add(this.beltMesh);

    // Rotating Rollers at entry and exit
    const rollerGeo = new THREE.CylinderGeometry(0.02, 0.02, bedWidth - 0.02, 20);
    this.driveRoller = new THREE.Mesh(rollerGeo, steelMat);
    this.driveRoller.rotation.x = Math.PI / 2;
    this.driveRoller.position.set(bedLength / 2 - 0.025, 0.018, 0);
    this.driveRoller.castShadow = true;
    this.group.add(this.driveRoller);

    this.idlerRoller = new THREE.Mesh(rollerGeo, steelMat);
    this.idlerRoller.rotation.x = Math.PI / 2;
    this.idlerRoller.position.set(-bedLength / 2 + 0.025, 0.018, 0);
    this.idlerRoller.castShadow = true;
    this.group.add(this.idlerRoller);

    // --- 4. Siemens Electric Gearmotor Prime Mover ---
    const motorGroup = new THREE.Group();
    motorGroup.position.set(bedLength / 2 + 0.04, -0.01, -bedWidth / 2 - 0.045);

    // Gearbox
    const gearboxGeo = new THREE.BoxGeometry(0.06, 0.06, 0.05);
    const gearbox = new THREE.Mesh(gearboxGeo, aluminumMat);
    gearbox.castShadow = true;
    motorGroup.add(gearbox);

    // Motor Housing (Blue)
    const motorBodyGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.07, 20);
    this.motorMesh = new THREE.Mesh(motorBodyGeo, siemensBlueMat);
    this.motorMesh.rotation.x = Math.PI / 2;
    this.motorMesh.position.z = -0.055;
    this.motorMesh.castShadow = true;
    motorGroup.add(this.motorMesh);

    // Motor Terminal Box (Black)
    const motorJBoxGeo = new THREE.BoxGeometry(0.025, 0.02, 0.025);
    const motorJBox = new THREE.Mesh(motorJBoxGeo, blackRubberMat);
    motorJBox.position.set(0, 0.035, -0.055);
    motorGroup.add(motorJBox);

    this.group.add(motorGroup);

    // --- 5. Optical Photoelectric Sensor (Through-Beam / Proximity) ---
    const sensorBracketGroup = new THREE.Group();
    sensorBracketGroup.position.set(-0.08, 0.035, bedWidth / 2 + 0.015);

    // Bracket
    const bracketGeo = new THREE.BoxGeometry(0.015, 0.08, 0.02);
    const bracket = new THREE.Mesh(bracketGeo, aluminumMat);
    bracket.position.y = 0.02;
    sensorBracketGroup.add(bracket);

    // Sensor Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.035, 16);
    const barrel = new THREE.Mesh(barrelGeo, steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.035, -0.01);
    sensorBracketGroup.add(barrel);

    // Sensor LED Indicator (Top)
    const ledGeo = new THREE.SphereGeometry(0.004, 8, 8);
    this.sensorLEDMat = new THREE.MeshStandardMaterial({
      color: 0x052e16,
      emissive: 0x052e16,
      emissiveIntensity: 0.2,
    });
    this.sensorLED = new THREE.Mesh(ledGeo, this.sensorLEDMat);
    this.sensorLED.position.set(0, 0.05, -0.01);
    sensorBracketGroup.add(this.sensorLED);

    // Optical Beam (Across Conveyor)
    const beamGeo = new THREE.CylinderGeometry(0.0015, 0.0015, bedWidth - 0.02, 8);
    this.sensorBeamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.4,
    });
    this.sensorBeam = new THREE.Mesh(beamGeo, this.sensorBeamMat);
    this.sensorBeam.rotation.x = Math.PI / 2;
    this.sensorBeam.position.set(0, 0.035, -bedWidth / 2 + 0.01);
    sensorBracketGroup.add(this.sensorBeam);

    this.group.add(sensorBracketGroup);

    // --- 6. Pneumatic Sorting Cylinder & Diverter Pusher ---
    const cylinderGroup = new THREE.Group();
    cylinderGroup.position.set(0.12, 0.04, -bedWidth / 2 - 0.06);

    // Cylinder Body (Silver Anodized)
    const cylBodyGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.08, 16);
    const cylBody = new THREE.Mesh(cylBodyGeo, aluminumMat);
    cylBody.rotation.x = Math.PI / 2;
    cylBody.castShadow = true;
    cylinderGroup.add(cylBody);

    // Piston Rod & Pusher Assembly (Movable)
    this.cylinderPiston = new THREE.Group();

    const rodGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.09, 12);
    const rod = new THREE.Mesh(rodGeo, steelMat);
    rod.rotation.x = Math.PI / 2;
    rod.position.z = 0.04;
    this.cylinderPiston.add(rod);

    // Diverter Pusher Paddle (Bright Yellow)
    const paddleGeo = new THREE.BoxGeometry(0.065, 0.03, 0.008);
    this.pusherPlate = new THREE.Mesh(paddleGeo, yellowHazardMat);
    this.pusherPlate.position.set(0, 0, 0.085);
    this.pusherPlate.castShadow = true;
    this.cylinderPiston.add(this.pusherPlate);

    cylinderGroup.add(this.cylinderPiston);
    this.group.add(cylinderGroup);

    // --- 7. Collection Chute & Sorting Bin ---
    const chuteGroup = new THREE.Group();
    chuteGroup.position.set(0.12, 0.01, bedWidth / 2 + 0.04);

    // Inclined Slide Chute
    const chuteGeo = new THREE.BoxGeometry(0.10, 0.006, 0.09);
    const chute = new THREE.Mesh(chuteGeo, steelMat);
    chute.rotation.x = Math.PI / 6; // 30 deg incline
    chuteGroup.add(chute);

    // Collection Bin (Blue Poly Container)
    const binGeo = new THREE.BoxGeometry(0.14, 0.08, 0.12);
    const binMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const bin = new THREE.Mesh(binGeo, binMat);
    bin.position.set(0, -0.10, 0.08);
    bin.castShadow = true;
    chuteGroup.add(bin);

    this.group.add(chuteGroup);

    // --- 8. Operator Pushbutton Station (Start/Stop) ---
    const stationGroup = new THREE.Group();
    stationGroup.position.set(-0.35, 0.04, -bedWidth / 2 - 0.04);

    const stationBoxGeo = new THREE.BoxGeometry(0.04, 0.06, 0.03);
    const stationBox = new THREE.Mesh(stationBoxGeo, yellowHazardMat);
    stationGroup.add(stationBox);

    // Green Start Button
    const startBtnGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.006, 16);
    const startBtnMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.4 });
    const startBtn = new THREE.Mesh(startBtnGeo, startBtnMat);
    startBtn.position.set(0, 0.015, 0.016);
    startBtn.rotation.x = Math.PI / 2;
    stationGroup.add(startBtn);

    // Red Stop Button
    const stopBtnMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.3 });
    const stopBtn = new THREE.Mesh(startBtnGeo, stopBtnMat);
    stopBtn.position.set(0, -0.015, 0.016);
    stopBtn.rotation.x = Math.PI / 2;
    stationGroup.add(stopBtn);

    this.group.add(stationGroup);

    // --- 9. Register 3D Terminal Anchors for PLC Wiring ---
    this.terminalOpticalSensor = new THREE.Object3D();
    this.terminalOpticalSensor.position.set(-0.08, 0.08, bedWidth / 2 + 0.02);
    this.terminalOpticalSensor.name = 'Terminal_CONVEYOR_OPTICAL_SENSOR';
    this.terminalOpticalSensor.userData = { terminalId: 'CONVEYOR_OPTICAL_SENSOR', label: 'Optical Sensor OUT' };
    this.group.add(this.terminalOpticalSensor);

    this.terminalStartButton = new THREE.Object3D();
    this.terminalStartButton.position.set(-0.35, 0.08, -bedWidth / 2 - 0.03);
    this.terminalStartButton.name = 'Terminal_CONVEYOR_START_BTN';
    this.terminalStartButton.userData = { terminalId: 'CONVEYOR_START_BTN', label: 'Start Pushbutton' };
    this.group.add(this.terminalStartButton);

    this.terminalMotorDrive = new THREE.Object3D();
    this.terminalMotorDrive.position.set(bedLength / 2 + 0.04, 0.06, -bedWidth / 2 - 0.045);
    this.terminalMotorDrive.name = 'Terminal_CONVEYOR_MOTOR_DRIVE';
    this.terminalMotorDrive.userData = { terminalId: 'CONVEYOR_MOTOR_DRIVE', label: 'Conveyor Motor Drive' };
    this.group.add(this.terminalMotorDrive);

    this.terminalPusherValve = new THREE.Object3D();
    this.terminalPusherValve.position.set(0.12, 0.08, -bedWidth / 2 - 0.06);
    this.terminalPusherValve.name = 'Terminal_CONVEYOR_PUSHER_VALVE';
    this.terminalPusherValve.userData = { terminalId: 'CONVEYOR_PUSHER_VALVE', label: 'Pneumatic Diverter Valve' };
    this.group.add(this.terminalPusherValve);

    // Position entire conveyor station nicely in front of the PLC
    this.group.position.set(0.04, 0.12, 0.02);
  }

  /** Spawn a new workpiece box at the start of the conveyor */
  spawnBox(isDefective = Math.random() < 0.5): void {
    const boxGroup = new THREE.Group();

    // Box body (Cardboard brown / industrial gray)
    const boxGeo = new THREE.BoxGeometry(0.05, 0.035, 0.05);
    const boxMat = new THREE.MeshStandardMaterial({
      color: isDefective ? 0xf59e0b : 0x38bdf8,
      roughness: 0.6,
      metalness: 0.2,
    });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.castShadow = true;
    boxGroup.add(boxMesh);

    // Label on top
    const labelGeo = new THREE.PlaneGeometry(0.03, 0.03);
    const labelMat = new THREE.MeshBasicMaterial({
      color: isDefective ? 0xef4444 : 0x22c55e,
      side: THREE.DoubleSide,
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.rotation.x = -Math.PI / 2;
    label.position.y = 0.018;
    boxGroup.add(label);

    boxGroup.position.set(-0.40, 0.048, 0);
    this.group.add(boxGroup);

    this.workpieces.push({
      mesh: boxGroup,
      positionX: -0.40,
      isDefective,
      isSorted: false,
      isPushed: false,
      pushProgress: 0,
    });
  }

  setRunning(running: boolean): void {
    this.isRunning = running;
  }

  setPusher(extended: boolean): void {
    this.isPusherExtended = extended;
  }

  getSensorTripped(): boolean {
    return this.isSensorTripped;
  }

  /** Update loop for conveyor belt, rollers, moving workpieces, and pneumatic stroke */
  update(dt: number, onBoxSorted?: () => void, onBoxPassed?: () => void): void {
    // 1. Belt & Roller continuous rotation
    if (this.isRunning) {
      const rotSpeed = this.beltSpeed * dt * 20;
      this.driveRoller.rotation.y += rotSpeed;
      this.idlerRoller.rotation.y += rotSpeed;
      this.motorMesh.rotation.y += rotSpeed * 3;

      // Spawn periodic workpiece packages
      this.spawnTimer += dt;
      if (this.spawnTimer > 3.0 && this.workpieces.length < 5) {
        this.spawnTimer = 0;
        this.spawnBox();
      }
    }

    // 2. Pneumatic Pusher stroke animation (smooth extension & retraction)
    const targetStroke = this.isPusherExtended ? 1.0 : 0.0;
    this.pusherStroke += (targetStroke - this.pusherStroke) * Math.min(1.0, dt * 14);
    this.cylinderPiston.position.z = this.pusherStroke * 0.08;

    // 3. Update moving workpiece packages along the conveyor
    let sensorTriggeredThisFrame = false;

    for (let i = this.workpieces.length - 1; i >= 0; i--) {
      const box = this.workpieces[i];

      if (!box.isSorted) {
        // Move along conveyor X-axis
        if (this.isRunning) {
          box.positionX += this.beltSpeed * dt * 0.45;
          box.mesh.position.x = box.positionX;
        }

        // Check optical sensor beam detection zone (-0.11 to -0.05)
        if (box.positionX >= -0.11 && box.positionX <= -0.05) {
          sensorTriggeredThisFrame = true;
        }

        // Check if pneumatic diverter pushes this box (at X ~ 0.09 to 0.15)
        if (this.pusherStroke > 0.4 && box.positionX >= 0.07 && box.positionX <= 0.17 && !box.isPushed) {
          box.isPushed = true;
        }

        // Animate box being pushed off into sorting bin
        if (box.isPushed) {
          box.pushProgress += dt * 5.0;
          box.mesh.position.z += dt * 0.4;
          box.mesh.position.y -= dt * 0.15; // Slide down chute
          box.mesh.rotation.x += dt * 2.0;

          if (box.pushProgress >= 1.0) {
            box.isSorted = true;
            if (onBoxSorted) onBoxSorted();
            // Remove from 3D scene after brief settling
            setTimeout(() => {
              box.mesh.remove();
              const idx = this.workpieces.indexOf(box);
              if (idx >= 0) this.workpieces.splice(idx, 1);
            }, 800);
          }
        }

        // Check if box reached end of conveyor without being sorted
        if (box.positionX > 0.44 && !box.isPushed) {
          box.isSorted = true;
          if (onBoxPassed) onBoxPassed();
          // Fall off exit into standard bin
          box.mesh.position.y -= dt * 0.4;
          setTimeout(() => {
            box.mesh.remove();
            const idx = this.workpieces.indexOf(box);
            if (idx >= 0) this.workpieces.splice(idx, 1);
          }, 400);
        }
      }
    }

    // 4. Update optical sensor LED & beam glow
    this.isSensorTripped = sensorTriggeredThisFrame;
    if (this.isSensorTripped) {
      this.sensorLEDMat.color.setHex(0x22c55e);
      this.sensorLEDMat.emissive.setHex(0x22c55e);
      this.sensorLEDMat.emissiveIntensity = 1.0;
      this.sensorBeamMat.opacity = 0.85;
    } else {
      this.sensorLEDMat.color.setHex(0x052e16);
      this.sensorLEDMat.emissive.setHex(0x052e16);
      this.sensorLEDMat.emissiveIntensity = 0.2;
      this.sensorBeamMat.opacity = 0.35;
    }
  }

  reset(): void {
    for (const box of this.workpieces) {
      box.mesh.remove();
    }
    this.workpieces = [];
    this.isRunning = false;
    this.isPusherExtended = false;
    this.pusherStroke = 0;
    this.cylinderPiston.position.z = 0;
  }
}
