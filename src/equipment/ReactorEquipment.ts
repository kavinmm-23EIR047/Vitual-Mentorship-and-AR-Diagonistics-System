// ============================================================
// ReactorEquipment.ts – Industrial Thermal Chemical Batch Reactor
// Procedural 3D Model: Jacketed Vessel, Impeller Agitator, Dual Dosing & Thermal Coil
// ============================================================

import * as THREE from 'three';

export class ReactorEquipment {
  group: THREE.Group;

  // Agitator & Impeller
  private agitatorShaft: THREE.Group;
  private impellerUpper: THREE.Mesh;
  private impellerLower: THREE.Mesh;
  private agitatorMotorMesh: THREE.Mesh;

  // Fluid Mesh inside Sight Glass
  private fluidMesh: THREE.Mesh;
  private fluidMat: THREE.MeshStandardMaterial;

  // Thermal Heating Jacket & Coils
  private heatingCoils: THREE.Mesh[] = [];
  private heatingCoilMat: THREE.MeshStandardMaterial;

  // Reagent Inlet Valves & Stream Particles
  private valveAMesh: THREE.Mesh;
  private valveBMesh: THREE.Mesh;
  private valveAMat: THREE.MeshStandardMaterial;
  private valveBMat: THREE.MeshStandardMaterial;
  private streamA: THREE.Mesh;
  private streamB: THREE.Mesh;

  // Steam / Vapor particles
  private steamParticles: THREE.Points;
  private steamGeo: THREE.BufferGeometry;

  // Bottom Drain Valve
  private drainValveMesh: THREE.Mesh;
  private drainValveMat: THREE.MeshStandardMaterial;
  private drainStream: THREE.Mesh;

  // Temperature Indicator Probe & Display
  private tempSensorProbe: THREE.Mesh;

  // Terminal Objects for PLC Wiring
  terminalTempSensor: THREE.Object3D;
  terminalStartButton: THREE.Object3D;
  terminalAgitatorMotor: THREE.Object3D;
  terminalHeaterRelay: THREE.Object3D;

  // Dynamic States
  private agitatorSpeed = 0; // RPM
  private isAgitatorOn = false;
  private isHeaterOn = false;
  private currentTemp = 24.5;
  private fluidLevel = 0; // 0 to 1
  private currentFluidColor = new THREE.Color(0x38bdf8);
  private steamActive = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ReactorSystem';

    // Materials
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.3,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      ior: 1.5,
    });
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.85,
      roughness: 0.25,
    });
    const siemensBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.6,
      roughness: 0.35,
    });

    this.fluidMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.1,
    });

    this.heatingCoilMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.7,
    });

    this.valveAMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7 });
    this.valveBMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.7 });
    this.drainValveMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });

    // --- 1. Main Stainless Reactor Vessel (Cylinder + Dished Heads) ---
    const vesselRadius = 0.16;
    const vesselHeight = 0.38;

    // Support Stand (3 Heavy-Duty Tubular Legs)
    const legGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.26, 16);
    const legAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    for (const angle of legAngles) {
      const leg = new THREE.Mesh(legGeo, steelMat);
      const lx = Math.cos(angle) * 0.14;
      const lz = Math.sin(angle) * 0.14;
      leg.position.set(lx, 0.13, lz);
      leg.castShadow = true;
      this.group.add(leg);
    }

    // Lower Dished Head
    const bottomHeadGeo = new THREE.SphereGeometry(vesselRadius, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bottomHead = new THREE.Mesh(bottomHeadGeo, steelMat);
    bottomHead.position.set(0, 0.26, 0);
    this.group.add(bottomHead);

    // Vessel Body Outer Shell with Sight Glass Cutout
    const vesselBodyGeo = new THREE.CylinderGeometry(vesselRadius, vesselRadius, vesselHeight, 32, 1, true, 0.3, Math.PI * 2 - 0.6);
    const vesselBody = new THREE.Mesh(vesselBodyGeo, steelMat);
    vesselBody.position.set(0, 0.45, 0);
    this.group.add(vesselBody);

    // Transparent Glass Inspection Sight Window (Front)
    const glassGeo = new THREE.CylinderGeometry(vesselRadius - 0.002, vesselRadius - 0.002, vesselHeight, 32, 1, true, -0.35, 0.7);
    const sightGlass = new THREE.Mesh(glassGeo, glassMat);
    sightGlass.position.set(0, 0.45, 0);
    this.group.add(sightGlass);

    // Sight Glass Frame Flange Ring
    const glassFrameGeo = new THREE.BoxGeometry(0.12, vesselHeight * 0.85, 0.015);
    const glassFrame = new THREE.Mesh(glassFrameGeo, darkSteelMat);
    glassFrame.position.set(0, 0.45, vesselRadius + 0.005);
    this.group.add(glassFrame);

    // Top Dished Head & Flange Ring
    const topHeadGeo = new THREE.SphereGeometry(vesselRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const topHead = new THREE.Mesh(topHeadGeo, steelMat);
    topHead.position.set(0, 0.64, 0);
    this.group.add(topHead);

    const topFlangeGeo = new THREE.TorusGeometry(vesselRadius + 0.01, 0.012, 12, 32);
    topFlangeGeo.rotateX(Math.PI / 2);
    const topFlange = new THREE.Mesh(topFlangeGeo, darkSteelMat);
    topFlange.position.set(0, 0.64, 0);
    this.group.add(topFlange);

    // --- 2. Dynamic Reaction Liquid Mesh inside Vessel ---
    const fluidGeo = new THREE.CylinderGeometry(vesselRadius - 0.01, vesselRadius - 0.01, 0.01, 24);
    this.fluidMesh = new THREE.Mesh(fluidGeo, this.fluidMat);
    this.fluidMesh.position.set(0, 0.27, 0);
    this.group.add(this.fluidMesh);

    // --- 3. Electrical Heating Jacket & Glow Coils ---
    for (let i = 0; i < 4; i++) {
      const coilGeo = new THREE.TorusGeometry(vesselRadius + 0.008, 0.006, 12, 32);
      coilGeo.rotateX(Math.PI / 2);
      const coil = new THREE.Mesh(coilGeo, this.heatingCoilMat);
      coil.position.set(0, 0.32 + i * 0.045, 0);
      this.heatingCoils.push(coil);
      this.group.add(coil);
    }

    // --- 4. Top Agitator Motor, Gearbox & Impeller Shaft ---
    const motorGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.12, 16);
    this.agitatorMotorMesh = new THREE.Mesh(motorGeo, siemensBlueMat);
    this.agitatorMotorMesh.position.set(0, 0.77, 0);
    this.group.add(this.agitatorMotorMesh);

    const gearboxGeo = new THREE.BoxGeometry(0.08, 0.05, 0.08);
    const gearbox = new THREE.Mesh(gearboxGeo, darkSteelMat);
    gearbox.position.set(0, 0.69, 0);
    this.group.add(gearbox);

    // Rotating Agitator Shaft
    this.agitatorShaft = new THREE.Group();
    this.agitatorShaft.position.set(0, 0.64, 0);

    const shaftGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.38, 16);
    const shaft = new THREE.Mesh(shaftGeo, steelMat);
    shaft.position.set(0, -0.19, 0);
    this.agitatorShaft.add(shaft);

    // Dual-Tier 4-Blade Impellers
    const bladeGeo = new THREE.BoxGeometry(0.12, 0.015, 0.008);

    // Upper Impeller
    this.impellerUpper = new THREE.Mesh(bladeGeo, copperMat);
    this.impellerUpper.position.set(0, -0.18, 0);
    this.agitatorShaft.add(this.impellerUpper);

    const bladeUpperCross = new THREE.Mesh(bladeGeo, copperMat);
    bladeUpperCross.rotation.y = Math.PI / 2;
    this.impellerUpper.add(bladeUpperCross);

    // Lower Impeller
    this.impellerLower = new THREE.Mesh(bladeGeo, copperMat);
    this.impellerLower.position.set(0, -0.32, 0);
    this.agitatorShaft.add(this.impellerLower);

    const bladeLowerCross = new THREE.Mesh(bladeGeo, copperMat);
    bladeLowerCross.rotation.y = Math.PI / 2;
    this.impellerLower.add(bladeLowerCross);

    this.group.add(this.agitatorShaft);

    // --- 5. Dual Chemical Feed Inlets & Pouring Streams ---
    // In-Feed Line A (Left)
    const pipeAGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 12);
    const pipeA = new THREE.Mesh(pipeAGeo, steelMat);
    pipeA.position.set(-0.09, 0.72, 0);
    this.group.add(pipeA);

    const valveAGeo = new THREE.BoxGeometry(0.035, 0.035, 0.035);
    this.valveAMesh = new THREE.Mesh(valveAGeo, this.valveAMat);
    this.valveAMesh.position.set(-0.09, 0.76, 0);
    this.group.add(this.valveAMesh);

    const streamAGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.28, 8);
    this.streamA = new THREE.Mesh(streamAGeo, new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0 }));
    this.streamA.position.set(-0.09, 0.50, 0);
    this.group.add(this.streamA);

    // In-Feed Line B (Right)
    const pipeBGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 12);
    const pipeB = new THREE.Mesh(pipeBGeo, steelMat);
    pipeB.position.set(0.09, 0.72, 0);
    this.group.add(pipeB);

    this.valveBMesh = new THREE.Mesh(valveAGeo, this.valveBMat);
    this.valveBMesh.position.set(0.09, 0.76, 0);
    this.group.add(this.valveBMesh);

    this.streamB = new THREE.Mesh(streamAGeo, new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0 }));
    this.streamB.position.set(0.09, 0.50, 0);
    this.group.add(this.streamB);

    // --- 6. Steam / Vapor Particle Emitter (Top Vent) ---
    const steamCount = 35;
    this.steamGeo = new THREE.BufferGeometry();
    const steamPos = new Float32Array(steamCount * 3);
    for (let i = 0; i < steamCount * 3; i += 3) {
      steamPos[i] = (Math.random() - 0.5) * 0.04;
      steamPos[i + 1] = 0.78 + Math.random() * 0.15;
      steamPos[i + 2] = (Math.random() - 0.5) * 0.04;
    }
    this.steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
    const steamMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.018,
      transparent: true,
      opacity: 0,
    });
    this.steamParticles = new THREE.Points(this.steamGeo, steamMat);
    this.group.add(this.steamParticles);

    // --- 7. Bottom Drain Valve & Outflow Nozzle ---
    const drainPipeGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.08, 16);
    const drainPipe = new THREE.Mesh(drainPipeGeo, steelMat);
    drainPipe.position.set(0, 0.16, 0);
    this.group.add(drainPipe);

    this.drainValveMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), this.drainValveMat);
    this.drainValveMesh.position.set(0, 0.13, 0);
    this.group.add(this.drainValveMesh);

    this.drainStream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0 })
    );
    this.drainStream.position.set(0, 0.06, 0);
    this.group.add(this.drainStream);

    // --- 8. PT100 RTD Temperature Sensor Probe ---
    const probeGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.06, 12);
    probeGeo.rotateZ(Math.PI / 2);
    this.tempSensorProbe = new THREE.Mesh(probeGeo, copperMat);
    this.tempSensorProbe.position.set(-vesselRadius - 0.02, 0.36, 0);
    this.group.add(this.tempSensorProbe);

    // --- 9. Terminals for PLC Wiring ---
    this.terminalTempSensor = new THREE.Object3D();
    this.terminalTempSensor.position.set(-vesselRadius - 0.05, 0.36, 0);
    this.group.add(this.terminalTempSensor);

    this.terminalStartButton = new THREE.Object3D();
    this.terminalStartButton.position.set(vesselRadius + 0.05, 0.36, 0);
    this.group.add(this.terminalStartButton);

    this.terminalAgitatorMotor = new THREE.Object3D();
    this.terminalAgitatorMotor.position.set(0, 0.82, 0.05);
    this.group.add(this.terminalAgitatorMotor);

    this.terminalHeaterRelay = new THREE.Object3D();
    this.terminalHeaterRelay.position.set(0, 0.32, -vesselRadius - 0.03);
    this.group.add(this.terminalHeaterRelay);
  }

  setTemp(tempC: number): void {
    this.currentTemp = tempC;
    // Glow heating coils proportionally to temperature above 30°C
    if (this.isHeaterOn || tempC > 40) {
      const norm = Math.min(1, Math.max(0, (tempC - 25) / 60));
      this.heatingCoilMat.emissive.setHex(0xff3300);
      this.heatingCoilMat.emissiveIntensity = norm * 2.8;
    } else {
      this.heatingCoilMat.emissive.setHex(0x000000);
      this.heatingCoilMat.emissiveIntensity = 0;
    }

    // Activate steam vapor above 60°C
    this.steamActive = tempC > 55;
    (this.steamParticles.material as THREE.PointsMaterial).opacity = this.steamActive ? 0.65 : 0;
  }

  setAgitator(state: 'OFF' | 'ON', rpm = 0): void {
    this.isAgitatorOn = state === 'ON';
    this.agitatorSpeed = rpm;
  }

  setHeater(state: 'OFF' | 'ON'): void {
    this.isHeaterOn = state === 'ON';
    if (!this.isHeaterOn && this.currentTemp < 40) {
      this.heatingCoilMat.emissiveIntensity = 0;
    }
  }

  setValves(valveA: 'CLOSED' | 'OPEN', valveB: 'CLOSED' | 'OPEN', drain: 'CLOSED' | 'OPEN'): void {
    const openA = valveA === 'OPEN';
    const openB = valveB === 'OPEN';
    const openDrain = drain === 'OPEN';

    (this.streamA.material as THREE.MeshBasicMaterial).opacity = openA ? 0.85 : 0;
    (this.streamB.material as THREE.MeshBasicMaterial).opacity = openB ? 0.85 : 0;
    (this.drainStream.material as THREE.MeshBasicMaterial).opacity = openDrain ? 0.85 : 0;
  }

  setFluid(levelPct: number, colorHex: string): void {
    this.fluidLevel = levelPct / 100;
    const height = Math.max(0.01, this.fluidLevel * 0.32);
    this.fluidMesh.scale.set(1, height / 0.01, 1);
    this.fluidMesh.position.y = 0.26 + height / 2;

    this.currentFluidColor.setStyle(colorHex);
    this.fluidMat.color.copy(this.currentFluidColor);
  }

  reset(): void {
    this.setTemp(24.5);
    this.setAgitator('OFF', 0);
    this.setHeater('OFF');
    this.setValves('CLOSED', 'CLOSED', 'CLOSED');
    this.setFluid(0, '#38bdf8');
  }

  update(dt: number): void {
    // Spin agitator impeller when running
    if (this.isAgitatorOn || this.agitatorSpeed > 10) {
      const radPerSec = (this.agitatorSpeed * Math.PI * 2) / 60;
      this.agitatorShaft.rotation.y += radPerSec * dt;
    }

    // Animate steam particles rising
    if (this.steamActive) {
      const positions = this.steamGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += dt * 0.15;
        if (positions[i] > 0.95) {
          positions[i] = 0.78;
        }
      }
      this.steamGeo.attributes.position.needsUpdate = true;
    }
  }
}
