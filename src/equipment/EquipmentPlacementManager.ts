// ============================================================
// EquipmentPlacementManager – Hold & place 3D equipment with hands
// ============================================================

import * as THREE from 'three';
import { AppState } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { LAYOUT } from '../core/constants';
import { soundManager } from '../core/SoundManager';
import { PLCEquipment } from './PLCEquipment';
import { TankEquipment } from './TankEquipment';
import { PumpEquipment } from './PumpEquipment';
import { ValveEquipment } from './ValveEquipment';
import { LevelSensorEquipment } from './LevelSensorEquipment';
import { PipeSystem } from './PipeSystem';
import { FlowAnimation } from './FlowAnimation';
import { TerminalManager } from '../wiring/TerminalManager';
import { WireRenderer } from '../three/WireRenderer';
import { InteractionManager } from '../three/InteractionManager';

export interface PlaceableItem {
  id: string;
  name: string;
  group: THREE.Group;
  defaultPos: THREE.Vector3;
  type: 'plc' | 'tank' | 'pump' | 'valve' | 'sensor' | 'rig';
}

export class EquipmentPlacementManager {
  private items: Map<string, PlaceableItem> = new Map();
  private heldItem: PlaceableItem | null = null;
  private holdPlane = new THREE.Plane();
  private planeIntersect = new THREE.Vector3();
  private dragOffset = new THREE.Vector3();
  private interaction: InteractionManager;

  // Equipment references for dynamic updates
  private plc: PLCEquipment;
  private tank: TankEquipment;
  private pump: PumpEquipment;
  private valve: ValveEquipment;
  private sensor: LevelSensorEquipment;
  private pipes: PipeSystem;
  private flow: FlowAnimation;
  private terminalManager: TerminalManager;
  private wireRenderer: WireRenderer;
  private masterRigGroup: THREE.Group;

  // Visual selection outline / ring
  private selectionRing: THREE.Mesh;

  constructor(
    interaction: InteractionManager,
    plc: PLCEquipment,
    tank: TankEquipment,
    pump: PumpEquipment,
    valve: ValveEquipment,
    sensor: LevelSensorEquipment,
    pipes: PipeSystem,
    flow: FlowAnimation,
    terminalManager: TerminalManager,
    wireRenderer: WireRenderer,
    masterRigGroup: THREE.Group
  ) {
    this.interaction = interaction;
    this.plc = plc;
    this.tank = tank;
    this.pump = pump;
    this.valve = valve;
    this.sensor = sensor;
    this.pipes = pipes;
    this.flow = flow;
    this.terminalManager = terminalManager;
    this.wireRenderer = wireRenderer;
    this.masterRigGroup = masterRigGroup;

    // Selection ring
    const ringGeo = new THREE.RingGeometry(0.12, 0.15, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.visible = false;
    this.masterRigGroup.add(this.selectionRing);

    this.registerEquipment();
  }

  private registerEquipment(): void {
    this.register('plc', 'Siemens PLC S7-1200', this.plc.group, LAYOUT.PLC_POSITION, 'plc');
    this.register('tank', 'Storage Water Tank', this.tank.group, LAYOUT.TANK_POSITION, 'tank');
    this.register('pump', 'Centrifugal Pump', this.pump.group, LAYOUT.PUMP_POSITION, 'pump');
    this.register('valve', 'Control Valve', this.valve.group, LAYOUT.VALVE_POSITION, 'valve');
    this.register('sensor', 'Level Sensor', this.sensor.group, LAYOUT.SENSOR_POSITION, 'sensor');
  }

  private register(
    id: string,
    name: string,
    group: THREE.Group,
    pos: { x: number; y: number; z: number },
    type: PlaceableItem['type']
  ): void {
    const defaultPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.items.set(id, { id, name, group, defaultPos, type });
  }

  /**
   * Raycast to find which equipment is hovered.
   */
  getEquipmentAtScreenPos(screenX: number, screenY: number): PlaceableItem | null {
    this.interaction.setPointerFromScreen(screenX, screenY);

    const hitMeshes: THREE.Object3D[] = [];
    for (const item of this.items.values()) {
      item.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          hitMeshes.push(child);
        }
      });
    }

    const hit = this.interaction.raycast(hitMeshes, true);
    if (!hit) return null;

    // Find parent group
    for (const item of this.items.values()) {
      let current: THREE.Object3D | null = hit.object;
      while (current) {
        if (current === item.group) {
          return item;
        }
        current = current.parent;
      }
    }
    return null;
  }

  /**
   * Start holding / grabbing an equipment.
   */
  startHolding(item: PlaceableItem, screenX: number, screenY: number): boolean {
    this.heldItem = item;
    this.interaction.setPointerFromScreen(screenX, screenY);

    // Create drag plane parallel to ground at equipment's height
    this.holdPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      item.group.position
    );

    const worldPoint = this.interaction.getPointOnPlane(item.group.position.y);
    if (worldPoint) {
      this.dragOffset.subVectors(item.group.position, worldPoint);
    } else {
      this.dragOffset.set(0, 0, 0);
    }

    this.selectionRing.visible = true;
    this.selectionRing.position.copy(item.group.position);
    this.selectionRing.position.y = 0.005;

    soundManager.playGrab();
    EventBus.emit(Events.FEEDBACK_SHOW, {
      type: 'success',
      title: 'Holding Equipment',
      message: `Moving ${item.name}. Release to place.`,
    });

    return true;
  }

  /**
   * Move held equipment following hand / pointer in 3D space.
   */
  moveHeldItem(screenX: number, screenY: number): void {
    if (!this.heldItem) return;

    this.interaction.setPointerFromScreen(screenX, screenY);
    const worldPoint = this.interaction.getPointOnPlane(this.heldItem.group.position.y);

    if (worldPoint) {
      const newPos = worldPoint.clone().add(this.dragOffset);
      // Keep on desk bounds (-0.6 to 0.6 X, 0 to 0.5 Y, -0.6 to 0.6 Z)
      newPos.x = Math.max(-0.6, Math.min(0.6, newPos.x));
      newPos.z = Math.max(-0.6, Math.min(0.6, newPos.z));

      this.heldItem.group.position.copy(newPos);
      this.selectionRing.position.set(newPos.x, 0.005, newPos.z);

      // If tank moved, level sensor moves with tank
      if (this.heldItem.id === 'tank') {
        this.sensor.group.position.set(
          newPos.x + (LAYOUT.SENSOR_POSITION.x - LAYOUT.TANK_POSITION.x),
          newPos.y + (LAYOUT.SENSOR_POSITION.y - LAYOUT.TANK_POSITION.y),
          newPos.z + (LAYOUT.SENSOR_POSITION.z - LAYOUT.TANK_POSITION.z)
        );
      }

      this.updateSystemTopology();
    }
  }

  /**
   * Release and place held equipment.
   */
  releaseHeldItem(): PlaceableItem | null {
    if (!this.heldItem) return null;

    const placed = this.heldItem;
    this.heldItem = null;
    this.selectionRing.visible = false;

    this.updateSystemTopology();
    soundManager.playPlace();

    EventBus.emit(Events.FEEDBACK_SHOW, {
      type: 'success',
      title: 'Equipment Placed',
      message: `${placed.name} locked at new location.`,
    });

    return placed;
  }

  /**
   * Is an item currently being held?
   */
  isHolding(): boolean {
    return this.heldItem !== null;
  }

  getHeldItem(): PlaceableItem | null {
    return this.heldItem;
  }

  /**
   * Update all dynamic pipes, terminals, and wires when positions change.
   */
  updateSystemTopology(): void {
    // 1. Update Pipe mesh geometries
    this.pipes.rebuildPipes(
      this.pump.group.position,
      this.valve.group.position,
      this.tank.group.position
    );

    // 2. Update flow animation path
    this.flow.rebuildPath(
      this.pump.group.position,
      this.valve.group.position,
      this.tank.group.position
    );

    // 3. Update PLC and field terminal world positions
    this.plc.updateTerminalWorldPositions();
    this.terminalManager.updateWorldPositions();

    // 4. Update all connected wires to match new terminal positions
    this.wireRenderer.updateConnectedWirePositions((terminalId: string) => {
      const plcTerm = this.plc.getTerminalById(terminalId);
      if (plcTerm) return plcTerm.worldPosition;
      const fieldTerm = this.terminalManager.getTerminalById(terminalId);
      if (fieldTerm) return fieldTerm.worldPosition;
      return null;
    });
  }

  /**
   * Reset all equipment back to default factory layout.
   */
  resetAllPositions(): void {
    for (const item of this.items.values()) {
      item.group.position.copy(item.defaultPos);
    }
    this.sensor.group.position.set(
      LAYOUT.SENSOR_POSITION.x,
      LAYOUT.SENSOR_POSITION.y,
      LAYOUT.SENSOR_POSITION.z
    );
    this.updateSystemTopology();
    soundManager.playPlace();
  }
}
