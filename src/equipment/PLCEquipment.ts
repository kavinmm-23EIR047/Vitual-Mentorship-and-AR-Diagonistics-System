// ============================================================
// PLCEquipment – Siemens S7-1200 with 3D touch hit areas & LEDs
// ============================================================

import * as THREE from 'three';
import { loadModel, centerModel, enableShadows, type LoadedModel } from '../three/ModelLoader';
import { PLC_TERMINALS } from '../wiring/IOConfig';
import { COLORS, LAYOUT, PLC_MATERIALS, TERMINAL } from '../core/constants';
import plcUrl from '../models/plc.glb?url';

export interface PLCTerminal3D {
  id: string;
  label: string;
  type: 'INPUT' | 'OUTPUT';
  target: string;
  mesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  pulseRing: THREE.Mesh;
  glowMesh: THREE.Mesh;
  worldPosition: THREE.Vector3;
}

export class PLCEquipment {
  group: THREE.Group;
  model: THREE.Group | null = null;
  terminals: PLCTerminal3D[] = [];
  ledMeshes: THREE.Mesh[] = [];
  private greenMaterials: THREE.MeshStandardMaterial[] = [];
  private redMeshes: THREE.Mesh[] = [];
  private orangeMeshes: THREE.Mesh[] = [];

  private terminalGroup: THREE.Group;
  private hitGroup: THREE.Group;
  private loadedData: LoadedModel | null = null;
  private pulseTime = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'PLC';
    this.terminalGroup = new THREE.Group();
    this.terminalGroup.name = 'PLC_Terminals';
    this.terminalGroup.visible = true;
    this.group.add(this.terminalGroup);

    this.hitGroup = new THREE.Group();
    this.hitGroup.name = 'PLC_HitAreas';
    this.group.add(this.hitGroup);
  }

  async load(): Promise<void> {
    try {
      this.loadedData = await loadModel(plcUrl);
      this.model = this.loadedData.scene;

      centerModel(this.model, this.loadedData.center);

      const maxDim = Math.max(
        this.loadedData.size.x,
        this.loadedData.size.y,
        this.loadedData.size.z
      );
      const scale = LAYOUT.PLC_SCALE * (0.2 / maxDim);
      this.model.scale.setScalar(scale);

      enableShadows(this.model);
      this.identifyLEDMeshes();

      this.group.add(this.model);
      this.group.position.set(
        LAYOUT.PLC_POSITION.x,
        LAYOUT.PLC_POSITION.y,
        LAYOUT.PLC_POSITION.z
      );

      // Create mounting hardware dynamically sized to the model bounds
      this.createMountingPanel();
      this.createTerminals();

      console.log('[PLC] Loaded successfully, terminals ready:', this.terminals.length);
    } catch (err) {
      console.error('[PLC] Failed to load:', err);
      this.createFallbackPLC();
    }
  }

  private createMountingPanel(): void {
    if (!this.model) return;

    // Calculate exact bounding box after scaling
    const bbox = new THREE.Box3().setFromObject(this.model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    // Padding parameters around the PLC cluster
    const paddingX = 0.08;
    const paddingY = 0.07;
    const enclosureWidth = size.x + paddingX;
    const enclosureHeight = size.y + paddingY;
    const enclosureDepth = 0.055;

    // 1. Brushed Aluminum Cabinet Backplate
    const plateGeo = new THREE.BoxGeometry(enclosureWidth, enclosureHeight, 0.012);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.82,
      roughness: 0.25,
    });
    const backplate = new THREE.Mesh(plateGeo, plateMat);
    backplate.position.set(center.x, center.y, bbox.min.z - 0.014);
    backplate.castShadow = true;
    backplate.receiveShadow = true;
    this.group.add(backplate);

    // 2. Outer Enclosure Rim / Frame (Top, Bottom, Left, Right Bezel)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.2,
    });
    const wallThick = 0.008;

    // Top border
    const topBorder = new THREE.Mesh(new THREE.BoxGeometry(enclosureWidth + 0.016, wallThick, enclosureDepth), frameMat);
    topBorder.position.set(center.x, center.y + enclosureHeight / 2 + wallThick / 2, bbox.min.z + enclosureDepth / 2 - 0.014);
    this.group.add(topBorder);

    // Bottom border
    const bottomBorder = new THREE.Mesh(new THREE.BoxGeometry(enclosureWidth + 0.016, wallThick, enclosureDepth), frameMat);
    bottomBorder.position.set(center.x, center.y - enclosureHeight / 2 - wallThick / 2, bbox.min.z + enclosureDepth / 2 - 0.014);
    this.group.add(bottomBorder);

    // Left border
    const leftBorder = new THREE.Mesh(new THREE.BoxGeometry(wallThick, enclosureHeight, enclosureDepth), frameMat);
    leftBorder.position.set(center.x - enclosureWidth / 2 - wallThick / 2, center.y, bbox.min.z + enclosureDepth / 2 - 0.014);
    this.group.add(leftBorder);

    // Right border
    const rightBorder = new THREE.Mesh(new THREE.BoxGeometry(wallThick, enclosureHeight, enclosureDepth), frameMat);
    rightBorder.position.set(center.x + enclosureWidth / 2 + wallThick / 2, center.y, bbox.min.z + enclosureDepth / 2 - 0.014);
    this.group.add(rightBorder);

    // 3. Metallic 35mm Standard DIN Rail with End Clamps
    const railWidth = enclosureWidth - 0.02;
    const railGeo = new THREE.BoxGeometry(railWidth, 0.045, 0.008);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.92,
      roughness: 0.15,
    });
    const dinRail = new THREE.Mesh(railGeo, railMat);
    dinRail.position.set(center.x, center.y, bbox.min.z - 0.002);
    dinRail.castShadow = true;
    this.group.add(dinRail);

    // 4. Standoff Support Legs to Ground
    const legXLeft = center.x - enclosureWidth / 2 + 0.04;
    const legXRight = center.x + enclosureWidth / 2 - 0.04;
    const legHeight = LAYOUT.PLC_POSITION.y + enclosureHeight / 2 + 0.05;

    const legGeo = new THREE.CylinderGeometry(0.007, 0.007, legHeight, 12);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.7,
      roughness: 0.3,
    });

    const legLeft = new THREE.Mesh(legGeo, legMat);
    legLeft.position.set(legXLeft, -LAYOUT.PLC_POSITION.y / 2, bbox.min.z - 0.014);
    legLeft.castShadow = true;
    this.group.add(legLeft);

    const legRight = new THREE.Mesh(legGeo, legMat);
    legRight.position.set(legXRight, -LAYOUT.PLC_POSITION.y / 2, bbox.min.z - 0.014);
    legRight.castShadow = true;
    this.group.add(legRight);

    // 5. Corner Hex Fasteners on Enclosure Flanges
    const boltGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.006, 6);
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
    const marginX = enclosureWidth / 2 + 0.004;
    const marginY = enclosureHeight / 2 + 0.004;

    const corners = [
      [center.x - marginX, center.y + marginY],
      [center.x + marginX, center.y + marginY],
      [center.x - marginX, center.y - marginY],
      [center.x + marginX, center.y - marginY],
    ];

    for (const [bx, by] of corners) {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(bx, by, bbox.min.z + enclosureDepth / 2 - 0.01);
      this.group.add(bolt);
    }

    // 6. Cable Glands on Enclosure Perimeter
    const glandGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.016, 16);
    const glandMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });

    // Left Side Pipe Gland Coupling
    const glandLeft = new THREE.Mesh(glandGeo, glandMat);
    glandLeft.rotation.z = Math.PI / 2;
    glandLeft.position.set(center.x - enclosureWidth / 2 - wallThick, center.y + enclosureHeight * 0.3, bbox.min.z + enclosureDepth / 2 - 0.02);
    this.group.add(glandLeft);

    // Right Side Pipe Gland Coupling
    const glandRight = new THREE.Mesh(glandGeo, glandMat);
    glandRight.rotation.z = Math.PI / 2;
    glandRight.position.set(center.x + enclosureWidth / 2 + wallThick, center.y + enclosureHeight * 0.2, bbox.min.z + enclosureDepth / 2 - 0.02);
    this.group.add(glandRight);

    // 7. Realistic Multi-Colored Wiring Harness Bundles Emerging from Bottom
    const wireMatYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    const wireMatGreen = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 });
    const wireMatBlue = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 });
    const wireMatWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const wireMatRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const wireMatBlack = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

    // Left Harness (Sensors & Push Buttons inputs)
    const leftWireDefs = [
      { color: wireMatYellow, startX: center.x - 0.10, endX: center.x - 0.24, endY: center.y - 0.18 },
      { color: wireMatGreen, startX: center.x - 0.07, endX: center.x - 0.22, endY: center.y - 0.17 },
      { color: wireMatWhite, startX: center.x - 0.04, endX: center.x - 0.20, endY: center.y - 0.16 },
      { color: wireMatBlue, startX: center.x - 0.01, endX: center.x - 0.18, endY: center.y - 0.15 },
    ];
    for (const w of leftWireDefs) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(w.startX, center.y - enclosureHeight / 2 + 0.01, bbox.min.z + 0.02),
        new THREE.Vector3(w.startX, center.y - enclosureHeight / 2 - 0.03, bbox.min.z + 0.02),
        new THREE.Vector3(w.startX - 0.05, center.y - enclosureHeight / 2 - 0.06, bbox.min.z + 0.02),
        new THREE.Vector3(w.endX, w.endY, bbox.min.z + 0.02),
      ]);
      const wGeo = new THREE.TubeGeometry(curve, 16, 0.003, 8, false);
      const wMesh = new THREE.Mesh(wGeo, w.color);
      this.group.add(wMesh);
    }

    // Right Harness (Pump & Actuator outputs)
    const rightWireDefs = [
      { color: wireMatRed, startX: center.x + 0.05, endX: center.x + 0.16, endY: center.y - 0.18 },
      { color: wireMatBlack, startX: center.x + 0.08, endX: center.x + 0.18, endY: center.y - 0.19 },
      { color: wireMatRed, startX: center.x + 0.11, endX: center.x + 0.20, endY: center.y - 0.20 },
    ];
    for (const w of rightWireDefs) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(w.startX, center.y - enclosureHeight / 2 + 0.01, bbox.min.z + 0.02),
        new THREE.Vector3(w.startX, center.y - enclosureHeight / 2 - 0.03, bbox.min.z + 0.02),
        new THREE.Vector3(w.startX + 0.03, center.y - enclosureHeight / 2 - 0.06, bbox.min.z + 0.02),
        new THREE.Vector3(w.endX, w.endY, bbox.min.z + 0.02),
      ]);
      const wGeo = new THREE.TubeGeometry(curve, 16, 0.003, 8, false);
      const wMesh = new THREE.Mesh(wGeo, w.color);
      this.group.add(wMesh);
    }
  }

  private identifyLEDMeshes(): void {
    if (!this.model) return;

    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const mat = child.material as THREE.MeshStandardMaterial;
      if (!mat || !mat.name) return;

      if (mat.name === PLC_MATERIALS.GREEN_LED) {
        this.ledMeshes.push(child);
        this.greenMaterials.push(mat);
      } else if (mat.name === PLC_MATERIALS.RED_LED) {
        this.redMeshes.push(child);
      } else if (mat.name === PLC_MATERIALS.ORANGE_LED) {
        this.orangeMeshes.push(child);
      }
    });
  }

  private createTerminals(): void {
    const terminalGeo = new THREE.SphereGeometry(TERMINAL.RADIUS, 16, 12);
    const glowGeo = new THREE.SphereGeometry(TERMINAL.GLOW_RADIUS, 16, 12);
    const ringGeo = new THREE.RingGeometry(TERMINAL.RADIUS * 1.3, TERMINAL.RADIUS * 1.7, 24);
    const hitGeo = new THREE.SphereGeometry(TERMINAL.HIT_RADIUS, 8, 6);

    for (const def of PLC_TERMINALS) {
      // 1. Visible terminal core
      const mat = new THREE.MeshStandardMaterial({
        color: COLORS.TERMINAL_IDLE,
        emissive: COLORS.TERMINAL_IDLE,
        emissiveIntensity: 0.3,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(terminalGeo, mat);
      mesh.position.set(def.positionOffset.x, def.positionOffset.y, def.positionOffset.z);
      mesh.name = `Terminal_${def.id}`;
      mesh.userData = { terminalId: def.id, type: def.type, target: def.target, label: def.label, isPLCTerminal: true };

      // 2. Subtle steady glow
      const glowMat = new THREE.MeshBasicMaterial({
        color: COLORS.TERMINAL_IDLE,
        transparent: true,
        opacity: 0.25,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.name = `TerminalGlow_${def.id}`;
      mesh.add(glow);

      // 3. Pulsing source highlight ring
      const ringMat = new THREE.MeshBasicMaterial({
        color: COLORS.TERMINAL_SOURCE_ACTIVE,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const pulseRing = new THREE.Mesh(ringGeo, ringMat);
      pulseRing.position.z = 0.005;
      pulseRing.visible = false;
      mesh.add(pulseRing);

      this.terminalGroup.add(mesh);

      // 4. Touch hit-box
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.set(def.positionOffset.x, def.positionOffset.y, def.positionOffset.z);
      hitMesh.name = `Hit_${def.id}`;
      hitMesh.userData = { terminalId: def.id, isHitArea: true, isPLCTerminal: true };
      this.hitGroup.add(hitMesh);

      const worldPos = new THREE.Vector3();
      this.terminals.push({
        id: def.id,
        label: def.label,
        type: def.type,
        target: def.target,
        mesh,
        hitMesh,
        pulseRing,
        glowMesh: glow,
        worldPosition: worldPos,
      });
    }
  }

  updateTerminalWorldPositions(): void {
    for (const terminal of this.terminals) {
      terminal.mesh.getWorldPosition(terminal.worldPosition);
    }
  }

  setTerminalsVisible(visible: boolean): void {
    this.terminalGroup.visible = visible;
  }

  getHitMeshes(): THREE.Mesh[] {
    return this.terminals.map((t) => t.hitMesh);
  }

  getTerminalById(id: string): PLCTerminal3D | undefined {
    return this.terminals.find((t) => t.id === id);
  }

  getTerminalByMesh(mesh: THREE.Object3D): PLCTerminal3D | undefined {
    return this.terminals.find(
      (t) => t.mesh === mesh || t.hitMesh === mesh || t.mesh.children.includes(mesh)
    );
  }

  setTerminalState(id: string, state: 'idle' | 'source_active' | 'hover' | 'connected' | 'error'): void {
    const terminal = this.getTerminalById(id);
    if (!terminal) return;

    const mat = terminal.mesh.material as THREE.MeshStandardMaterial;
    const glowMat = terminal.glowMesh.material as THREE.MeshBasicMaterial;

    switch (state) {
      case 'idle':
        mat.color.setHex(COLORS.TERMINAL_IDLE);
        mat.emissive.setHex(COLORS.TERMINAL_IDLE);
        mat.emissiveIntensity = 0.2;
        glowMat.color.setHex(COLORS.TERMINAL_IDLE);
        glowMat.opacity = 0.15;
        terminal.pulseRing.visible = false;
        break;

      case 'source_active':
        mat.color.setHex(COLORS.TERMINAL_SOURCE_ACTIVE);
        mat.emissive.setHex(COLORS.TERMINAL_SOURCE_ACTIVE);
        mat.emissiveIntensity = 1.0;
        glowMat.color.setHex(COLORS.TERMINAL_SOURCE_ACTIVE);
        glowMat.opacity = 0.45;
        terminal.pulseRing.visible = true;
        break;

      case 'hover':
        mat.color.setHex(COLORS.TERMINAL_HOVER);
        mat.emissive.setHex(COLORS.TERMINAL_HOVER);
        mat.emissiveIntensity = 1.2;
        glowMat.color.setHex(COLORS.TERMINAL_HOVER);
        glowMat.opacity = 0.6;
        break;

      case 'connected':
        mat.color.setHex(COLORS.TERMINAL_CONNECTED);
        mat.emissive.setHex(COLORS.TERMINAL_CONNECTED);
        mat.emissiveIntensity = 0.8;
        glowMat.color.setHex(COLORS.TERMINAL_CONNECTED);
        glowMat.opacity = 0.4;
        terminal.pulseRing.visible = false;
        break;

      case 'error':
        mat.color.setHex(COLORS.TERMINAL_ERROR);
        mat.emissive.setHex(COLORS.TERMINAL_ERROR);
        mat.emissiveIntensity = 1.5;
        glowMat.color.setHex(COLORS.TERMINAL_ERROR);
        glowMat.opacity = 0.7;
        terminal.pulseRing.visible = false;
        break;
    }
  }

  update(dt: number): void {
    this.pulseTime += dt * 5.5;
    const scale = 1.0 + Math.sin(this.pulseTime) * 0.4;
    const opacity = 0.5 + Math.sin(this.pulseTime) * 0.45;
    const emissivePulse = 0.8 + Math.sin(this.pulseTime) * 0.6;

    for (const t of this.terminals) {
      if (t.pulseRing.visible) {
        t.pulseRing.scale.setScalar(scale);
        (t.pulseRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0.2, opacity);
        (t.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = emissivePulse;
        (t.glowMesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.6;
      }
    }
  }

  setLEDState(state: 'off' | 'green' | 'red' | 'yellow'): void {
    const color = {
      off: COLORS.LED_OFF,
      green: COLORS.LED_GREEN,
      red: COLORS.LED_RED,
      yellow: COLORS.LED_YELLOW,
    }[state];

    for (const mat of this.greenMaterials) {
      mat.emissive.setHex(color);
      mat.emissiveIntensity = state === 'off' ? 0 : 1.2;
    }
  }

  private createFallbackPLC(): void {
    console.warn('[PLC] Fallback geometry created');
    const geo = new THREE.BoxGeometry(0.2, 0.1, 0.05);
    const mat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.3, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    this.group.add(mesh);
    this.group.position.set(LAYOUT.PLC_POSITION.x, LAYOUT.PLC_POSITION.y, LAYOUT.PLC_POSITION.z);
    this.createTerminals();
  }

  dispose(): void {
    if (this.model) {
      this.group.remove(this.model);
    }
  }
}