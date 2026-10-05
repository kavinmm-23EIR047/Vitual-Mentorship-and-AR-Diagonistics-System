// ============================================================
// EquipmentPlacementManager – AR Spatial Placement & Repositioning
// Enables grabbing, moving, and rotating any 3D component with hand gestures or touch
// ============================================================

import * as THREE from 'three';
import { LAYOUT } from '../core/constants';
import { AppState } from '../core/AppState';
import type { TankEquipment } from '../equipment/TankEquipment';
import type { PLCEquipment } from '../equipment/PLCEquipment';
import type { LevelIndicatorTower } from '../equipment/LevelIndicatorTower';
import type { PumpEquipment } from '../equipment/PumpEquipment';
import type { ValveEquipment } from '../equipment/ValveEquipment';
import type { PipeSystem } from '../equipment/PipeSystem';
import type { FlowAnimation } from '../equipment/FlowAnimation';
import type { TerminalManager } from '../wiring/TerminalManager';
import type { WireRenderer } from '../three/WireRenderer';
import type { TouchFeedbackVisualizer } from '../ui/TouchFeedbackVisualizer';
import { EventBus } from '../core/EventBus';

export type PlacementMode = 'WIRING' | 'MOVE_COMPONENT' | 'ROTATE_RIG';

export interface PlacedComponentInfo {
  id: string;
  name: string;
  group: THREE.Group;
  defaultPosition: THREE.Vector3;
  type: 'tank' | 'plc' | 'tower' | 'pump' | 'valve' | 'rig';
}

export class EquipmentPlacementManager {
  private camera: THREE.Camera;
  private equipmentGroup: THREE.Group;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  // Equipment references
  private tank!: TankEquipment;
  private plc!: PLCEquipment;
  private indicatorTower!: LevelIndicatorTower;
  private pump!: PumpEquipment;
  private valve!: ValveEquipment;
  private pipes!: PipeSystem;
  private flow!: FlowAnimation;
  private terminalManager!: TerminalManager;
  private wireRenderer!: WireRenderer;
  private touchVisualizer!: TouchFeedbackVisualizer;

  // Placement state
  private mode: PlacementMode = 'WIRING';
  private selectedComponent: PlacedComponentInfo | null = null;
  private isDragging = false;
  private dragOffset = new THREE.Vector3();
  private placementRing: THREE.Mesh;

  // Registered components
  private components: PlacedComponentInfo[] = [];

  constructor(camera: THREE.Camera, equipmentGroup: THREE.Group) {
    this.camera = camera;
    this.equipmentGroup = equipmentGroup;

    // Holographic placement ring beneath selected equipment
    const ringGeo = new THREE.RingGeometry(0.12, 0.14, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.placementRing = new THREE.Mesh(ringGeo, ringMat);
    this.placementRing.rotation.x = -Math.PI / 2;
    this.placementRing.position.y = 0.002;
    this.placementRing.visible = false;
    this.equipmentGroup.add(this.placementRing);
  }

  setEquipment(
    tank: TankEquipment,
    plc: PLCEquipment,
    indicatorTower: LevelIndicatorTower,
    pump: PumpEquipment,
    valve: ValveEquipment,
    pipes: PipeSystem,
    flow: FlowAnimation,
    terminalManager: TerminalManager,
    wireRenderer: WireRenderer,
    touchVisualizer: TouchFeedbackVisualizer
  ): void {
    this.tank = tank;
    this.plc = plc;
    this.indicatorTower = indicatorTower;
    this.pump = pump;
    this.valve = valve;
    this.pipes = pipes;
    this.flow = flow;
    this.terminalManager = terminalManager;
    this.wireRenderer = wireRenderer;
    this.touchVisualizer = touchVisualizer;

    this.components = [
      {
        id: 'tank',
        name: 'Water Level Tank',
        group: tank.group,
        defaultPosition: new THREE.Vector3(LAYOUT.TANK_POSITION.x, LAYOUT.TANK_POSITION.y, LAYOUT.TANK_POSITION.z),
        type: 'tank',
      },
      {
        id: 'plc',
        name: 'Siemens S7-1200 PLC',
        group: plc.group,
        defaultPosition: new THREE.Vector3(LAYOUT.PLC_POSITION.x, LAYOUT.PLC_POSITION.y, LAYOUT.PLC_POSITION.z),
        type: 'plc',
      },
      {
        id: 'tower',
        name: 'Dual Lamp Stand',
        group: indicatorTower.group,
        defaultPosition: new THREE.Vector3(-0.24, 0, -0.05),
        type: 'tower',
      },
      {
        id: 'pump',
        name: 'Centrifugal Pump',
        group: pump.group,
        defaultPosition: new THREE.Vector3(LAYOUT.PUMP_POSITION.x, LAYOUT.PUMP_POSITION.y, LAYOUT.PUMP_POSITION.z),
        type: 'pump',
      },
      {
        id: 'valve',
        name: 'Control Valve',
        group: valve.group,
        defaultPosition: new THREE.Vector3(LAYOUT.VALVE_POSITION.x, LAYOUT.VALVE_POSITION.y, LAYOUT.VALVE_POSITION.z),
        type: 'valve',
      },
    ];
  }

  setMode(mode: PlacementMode): void {
    this.mode = mode;
    if (mode === 'WIRING') {
      this.deselect();
    }
    EventBus.emit('placement:modeChanged', { mode });
  }

  getMode(): PlacementMode {
    return this.mode;
  }

  getSelectedComponent(): PlacedComponentInfo | null {
    return this.selectedComponent;
  }

  /**
   * Raycast from screen coordinate to check which equipment was clicked/pinched
   */
  pickComponent(screenX: number, screenY: number): PlacedComponentInfo | null {
    this.pointer.x = (screenX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(screenY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    for (const comp of this.components) {
      const hits = this.raycaster.intersectObjects(comp.group.children, true);
      if (hits.length > 0) {
        return comp;
      }
    }
    return null;
  }

  /**
   * Start dragging a component
   */
  startDrag(screenX: number, screenY: number, comp?: PlacedComponentInfo): boolean {
    const targetComp = comp || this.pickComponent(screenX, screenY);
    if (!targetComp) return false;

    this.selectedComponent = targetComp;
    this.isDragging = true;

    // Calculate ground plane drag point
    const hitPoint = this.getPointOnGround(screenX, screenY);
    if (hitPoint) {
      this.dragOffset.copy(targetComp.group.position).sub(hitPoint);
    } else {
      this.dragOffset.set(0, 0, 0);
    }

    this.placementRing.visible = true;
    this.placementRing.position.set(targetComp.group.position.x, 0.002, targetComp.group.position.z);

    EventBus.emit('placement:selected', { component: targetComp });
    return true;
  }

  /**
   * Move the dragged component across 3D AR space
   */
  updateDrag(screenX: number, screenY: number): void {
    if (!this.isDragging || !this.selectedComponent) return;

    const hitPoint = this.getPointOnGround(screenX, screenY);
    if (hitPoint) {
      const newX = hitPoint.x + this.dragOffset.x;
      const newZ = hitPoint.z + this.dragOffset.z;

      // Keep within reasonable bounds around AR center
      const clampedX = Math.max(-1.2, Math.min(1.2, newX));
      const clampedZ = Math.max(-1.2, Math.min(1.2, newZ));

      this.selectedComponent.group.position.x = clampedX;
      this.selectedComponent.group.position.z = clampedZ;

      this.placementRing.position.set(clampedX, 0.002, clampedZ);

      // Dynamically rebuild interconnecting pipes, wires, and callouts
      this.recalculateSceneConnections();
    }
  }

  /**
   * End drag and place component
   */
  endDrag(): void {
    if (this.isDragging && this.selectedComponent) {
      this.isDragging = false;
      this.placementRing.visible = false;
      EventBus.emit('placement:placed', { component: this.selectedComponent });
    }
  }

  /**
   * Rotate the selected component or the whole equipment rig
   */
  rotate(deltaAngle: number, targetType: 'selected' | 'rig' = 'rig'): void {
    if (targetType === 'selected' && this.selectedComponent) {
      this.selectedComponent.group.rotation.y += deltaAngle;
    } else {
      this.equipmentGroup.rotation.y += deltaAngle;
    }
    this.recalculateSceneConnections();
  }

  /**
   * Reset all components to default layout coordinates
   */
  resetLayout(): void {
    for (const comp of this.components) {
      comp.group.position.copy(comp.defaultPosition);
      comp.group.rotation.set(0, 0, 0);
    }
    this.equipmentGroup.rotation.set(0, 0, 0);
    this.placementRing.visible = false;
    this.selectedComponent = null;
    this.recalculateSceneConnections();
    EventBus.emit('placement:reset');
  }

  private deselect(): void {
    this.selectedComponent = null;
    this.isDragging = false;
    this.placementRing.visible = false;
  }

  /**
   * Recalculate pipes, flow particle paths, terminal world positions, and cable curves
   */
  recalculateSceneConnections(): void {
    if (AppState.activeExperiment === 'TANK' && this.pump && this.valve && this.tank && this.pipes && this.flow) {
      // 1. Rebuild procedural dynamic pipes
      this.pipes.rebuildPipes(
        this.pump.group.position,
        this.valve.group.position,
        this.tank.group.position
      );

      // 2. Rebuild flow particle path
      this.flow.rebuildPath(
        this.pump.group.position,
        this.valve.group.position,
        this.tank.group.position
      );
    }

    // 3. Update terminal world coordinates
    if (this.plc) this.plc.updateTerminalWorldPositions();
    if (this.terminalManager) this.terminalManager.updateWorldPositions();

    // 4. Update connected cable curves
    if (this.wireRenderer && this.plc && this.terminalManager) {
      this.wireRenderer.updateConnectedWirePositions((id) => {
        const src = this.plc.getTerminalById(id);
        if (src) return src.worldPosition;
        const tgt = this.terminalManager.getTerminalById(id);
        if (tgt) return tgt.worldPosition;
        return null;
      });
    }
  }

  private getPointOnGround(screenX: number, screenY: number): THREE.Vector3 | null {
    this.pointer.x = (screenX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(screenY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, target);
  }
}
