// ============================================================
// CyberGestureController – Futuristic Spatial Hand Gesture Interaction Engine
// Mid-Air Control: Level Target Elevator, PLC Run/Stop, Valve, Pump & E-Stop
// ============================================================

import * as THREE from 'three';
import { EventBus, Events } from '../core/EventBus';
import { AppState } from '../core/AppState';
import { soundManager } from '../core/SoundManager';
import { alarmManager } from '../core/AlarmManager';
import type { HandLandmark } from './HandTracker';
import type { PLCEquipment } from '../equipment/PLCEquipment';
import type { TankEquipment } from '../equipment/TankEquipment';
import type { ValveEquipment } from '../equipment/ValveEquipment';
import type { PumpEquipment } from '../equipment/PumpEquipment';
import type { ConveyorEquipment } from '../equipment/ConveyorEquipment';
import type { HandCursorVisualizer, CyberActionNode } from './HandCursorVisualizer';

export type RecognizedPose = 'IDLE' | 'OPEN_PALM' | 'POINTING' | 'PINCH' | 'FIST_ESTOP' | 'LEVEL_SLIDER' | 'TWO_HAND_ROTATE';

export class CyberGestureController {
  private camera: THREE.Camera;
  private plc: PLCEquipment;
  private tank: TankEquipment;
  private valve: ValveEquipment;
  private pump: PumpEquipment;
  private conveyor: ConveyorEquipment | null = null;
  private visualizer: HandCursorVisualizer;

  private raycaster = new THREE.Raycaster();
  private ndcPointer = new THREE.Vector2();

  // Gesture state
  private currentPose: RecognizedPose = 'IDLE';
  private fistHoldTime = 0;
  private lastFistTrigger = 0;
  private isLevelSliderActive = false;
  private lastPinchTrigger = 0;
  private activeHoveredObject: {
    name: string;
    type: 'plc' | 'valve' | 'pump' | 'tank' | 'estop' | 'conveyor_motor' | 'conveyor_pusher' | 'conveyor_box';
    nodeId?: string;
    screenPos?: { x: number; y: number };
    worldPos?: THREE.Vector3;
    actionLabel: string;
  } | null = null;

  constructor(
    camera: THREE.Camera,
    plc: PLCEquipment,
    tank: TankEquipment,
    valve: ValveEquipment,
    pump: PumpEquipment,
    visualizer: HandCursorVisualizer,
    conveyor?: ConveyorEquipment
  ) {
    this.camera = camera;
    this.plc = plc;
    this.tank = tank;
    this.valve = valve;
    this.pump = pump;
    this.conveyor = conveyor || null;
    this.visualizer = visualizer;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Spatial Gesture bindings
  }



  private lastUIClickTime = 0;
  private hoveredUIElement: HTMLElement | null = null;
  private uiHoverStartTime = 0;

  /**
   * Main Hand Tracking Update step called on every camera frame from MediaPipe.
   */
  processHandFrame(data: {
    x: number;
    y: number;
    thumbX: number;
    thumbY: number;
    isPinching: boolean;
    pinchDist: number;
    landmarks?: HandLandmark[];
  }): void {
    const { x, y, isPinching, landmarks } = data;

    // 1. Classify Hand Pose from 21 3D Landmarks
    this.currentPose = this.classifyHandPose(landmarks, isPinching);
    this.visualizer.setRecognizedPose(this.currentPose);

    // 2. Handle Closed Fist Gesture (`✊` -> Immediate Emergency Stop)
    if (this.currentPose === 'FIST_ESTOP') {
      const now = performance.now();
      if (now - this.lastFistTrigger > 1200) {
        this.lastFistTrigger = now;
        this.triggerEStopGesture(x, y);
      }
      return;
    }

    // 3. Check for 2D Interactive UI Elements under finger (Modals, SCADA buttons, Docks, Top bar)
    const hitUI = this.findHoveredUIElement(x, y);
    if (hitUI) {
      if (this.hoveredUIElement !== hitUI) {
        this.hoveredUIElement = hitUI;
        this.uiHoverStartTime = performance.now();
      }

      const rect = hitUI.getBoundingClientRect();
      const screenPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const rawText = hitUI.getAttribute('aria-label') || hitUI.getAttribute('title') || hitUI.innerText || hitUI.textContent || 'Button';
      const cleanLabel = rawText.trim().replace(/\s+/g, ' ').slice(0, 24);

      this.visualizer.setHoverTarget({
        label: cleanLabel || 'UI Control',
        type: 'equipment',
        color: '#ff6b00',
        actionHint: isPinching ? 'CLICKING...' : 'PINCH TO CLICK',
        laserTarget: screenPos,
      });

      EventBus.emit('hand:targetLocked');

      const now = performance.now();
      const isDwellClick = now - this.uiHoverStartTime > 550; // Dwell auto-click fallback

      if ((isPinching || isDwellClick) && now - this.lastUIClickTime > 380) {
        this.lastUIClickTime = now;
        this.uiHoverStartTime = now + 600;
        this.triggerDOMClick(hitUI, x, y);
      }
      return;
    } else {
      this.hoveredUIElement = null;
      this.uiHoverStartTime = 0;
    }

    // 4. Raycast to 3D Equipment in the scene (active in SCADA / Operation mode)
    const isWiringActive = !AppState.wiringProgress.allCorrect;
    const hit3D = isWiringActive ? null : this.raycast3DEquipment(x, y);

    if (hit3D) {
      this.activeHoveredObject = hit3D;
      const screenPos = this.getScreenPos(hit3D.worldPos!);

      this.visualizer.setHoverTarget({
        label: hit3D.name,
        type: 'equipment',
        color: hit3D.type === 'plc' ? '#06b6d4' : hit3D.type === 'valve' ? '#38bdf8' : hit3D.type === 'pump' ? '#a855f7' : '#10b981',
        actionHint: hit3D.actionLabel,
        laserTarget: screenPos || undefined,
      });

      EventBus.emit('hand:targetLocked');

      if (isPinching) {
        this.trigger3DAction(hit3D, x, y);
      }
    } else {
      // 5. Check if in Mid-Air Vertical Level Slider mode (Operation mode)
      if (!isWiringActive && AppState.activeExperiment === 'TANK') {
        const isNearTankZone = x < window.innerWidth * 0.45;
        if (this.currentPose === 'LEVEL_SLIDER' || (this.isLevelSliderActive && isPinching) || (isNearTankZone && !isPinching)) {
          this.handleVerticalLevelSlider(x, y, isPinching);
          return;
        }
      }

      this.activeHoveredObject = null;
      this.visualizer.setHoverTarget(null);
      this.visualizer.setCyberSliderState(false, 0);
    }
  }

  private findHoveredUIElement(x: number, y: number): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const el = document.elementFromPoint(x, y);
    if (!el) return null;

    if (
      el.id === 'three-canvas' ||
      el.id === 'touch-canvas' ||
      el.id === 'ui-overlay' ||
      el.id === 'app' ||
      el.id === 'camera-feed'
    ) {
      return null;
    }

    const interactive = el.closest(
      'button, [role="button"], input, select, a, .modal-btn-primary, .modal-btn-secondary, .hmi-btn-tactile, .tool-pill-btn, .dock-pill-btn, .ctrl-btn, .quick-preset-btn, .alarm-tab, .mentor-ctrl-btn, .ladder-tab-btn, .rung-card, .ladder-btn-accent, .tool-icon-btn, .hmi-slider, .quiz-opt-btn'
    ) as HTMLElement | null;

    return interactive;
  }

  private triggerDOMClick(el: HTMLElement, x: number, y: number): void {
    this.visualizer.addRipple(x, y, 65, '#ff6b00');
    soundManager.playCyberToggle(1.1);

    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 220);

    el.focus();
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    el.click();
  }

  /**
   * Classify 3D MediaPipe hand landmarks into distinct industrial cyber poses.
   */
  private classifyHandPose(landmarks?: HandLandmark[], isPinching = false): RecognizedPose {
    if (!landmarks || landmarks.length < 21) {
      return isPinching ? 'PINCH' : 'IDLE';
    }

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexMcp = landmarks[5];
    const middleTip = landmarks[12];
    const middleMcp = landmarks[9];
    const ringTip = landmarks[16];
    const ringMcp = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMcp = landmarks[17];

    // Distance of fingertips from wrist
    const dIndex = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
    const dMiddle = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
    const dRing = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
    const dPinky = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y);

    const dIndexMcp = Math.hypot(indexMcp.x - wrist.x, indexMcp.y - wrist.y);
    const dMiddleMcp = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);
    const dRingMcp = Math.hypot(ringMcp.x - wrist.x, ringMcp.y - wrist.y);
    const dPinkyMcp = Math.hypot(pinkyMcp.x - wrist.x, pinkyMcp.y - wrist.y);

    // Closed Fist: All 4 fingers curled close to palm base
    const isFist =
      dIndex < dIndexMcp * 1.15 &&
      dMiddle < dMiddleMcp * 1.15 &&
      dRing < dRingMcp * 1.15 &&
      dPinky < dPinkyMcp * 1.15;

    if (isFist) {
      return 'FIST_ESTOP';
    }

    if (isPinching) {
      return 'PINCH';
    }

    // Pointing / Vertical Slider: Index finger fully extended, middle/ring/pinky curled
    const isIndexExtended = dIndex > dIndexMcp * 1.35;
    const areOthersCurled =
      dMiddle < dMiddleMcp * 1.25 &&
      dRing < dRingMcp * 1.25 &&
      dPinky < dPinkyMcp * 1.25;

    if (isIndexExtended && areOthersCurled) {
      return 'LEVEL_SLIDER';
    }

    // Open Palm: All 4 fingers extended
    const isOpenPalm =
      dIndex > dIndexMcp * 1.3 &&
      dMiddle > dMiddleMcp * 1.3 &&
      dRing > dRingMcp * 1.3 &&
      dPinky > dPinkyMcp * 1.3;

    if (isOpenPalm) {
      return 'OPEN_PALM';
    }

    return 'POINTING';
  }

  /**
   * Vertical Hand Travel mapped directly to Target Water Level Setpoint (10% to 95%).
   */
  private handleVerticalLevelSlider(x: number, y: number, isPinching: boolean): void {
    const h = window.innerHeight;
    const topLimit = h * 0.18; // 95% level
    const bottomLimit = h * 0.78; // 10% level

    // Map Y: Top of screen = 95%, Bottom of screen = 10%
    const normalizedY = 1 - THREE.MathUtils.clamp((y - topLimit) / (bottomLimit - topLimit), 0, 1);
    const targetPct = Math.round(10 + normalizedY * 85);

    this.isLevelSliderActive = true;
    this.visualizer.setCyberSliderState(true, targetPct, { x: x + 40, y });

    AppState.setTargetLevel(targetPct);
    soundManager.playCyberSlider(targetPct);

    this.visualizer.setHoverTarget({
      label: `TARGET LEVEL: ${targetPct}%`,
      type: 'equipment',
      color: '#10b981',
      actionHint: 'RAISE/LOWER HAND TO ADJUST',
    });
  }

  /**
   * Raycast from finger position to 3D equipment.
   */
  private raycast3DEquipment(clientX: number, clientY: number): {
    name: string;
    type: 'plc' | 'valve' | 'pump' | 'tank' | 'estop' | 'conveyor_motor' | 'conveyor_pusher' | 'conveyor_box';
    worldPos: THREE.Vector3;
    actionLabel: string;
  } | null {
    this.ndcPointer.x = (clientX / window.innerWidth) * 2 - 1;
    this.ndcPointer.y = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.ndcPointer, this.camera);

    const hitTargets: Array<{
      group: THREE.Group;
      name: string;
      type: 'plc' | 'valve' | 'pump' | 'tank' | 'conveyor_motor' | 'conveyor_pusher' | 'conveyor_box';
      action: string;
    }> = [];

    // Registered 3D interactives
    hitTargets.push({
      group: this.plc.group,
      name: 'Siemens S7-1200 PLC',
      type: 'plc',
      action: `PINCH: ${AppState.plcState === 'RUN' ? 'HALT CPU (STOP)' : 'RUN CPU'}`,
    });

    if (AppState.activeExperiment === 'TANK') {
      hitTargets.push({
        group: this.valve.group,
        name: 'Control Valve',
        type: 'valve',
        action: `PINCH: ${AppState.valveState === 'OPEN' ? 'CLOSE VALVE (0%)' : 'OPEN VALVE (100%)'}`,
      });
      hitTargets.push({
        group: this.pump.group,
        name: 'Water Pump Motor',
        type: 'pump',
        action: `PINCH: ${AppState.pumpState === 'ON' ? 'STOP PUMP (0 RPM)' : 'START PUMP'}`,
      });
      hitTargets.push({
        group: this.tank.group,
        name: 'Water Level Tank',
        type: 'tank',
        action: 'SLIDE HAND: ADJUST LEVEL',
      });
    } else if (this.conveyor) {
      hitTargets.push({
        group: this.conveyor.group,
        name: 'Conveyor Sorter',
        type: 'conveyor_motor',
        action: `PINCH: ${AppState.conveyorMotorState === 'ON' ? 'STOP MOTOR' : 'START MOTOR'}`,
      });
    }

    for (const target of hitTargets) {
      const intersects = this.raycaster.intersectObjects(target.group.children, true);
      if (intersects.length > 0) {
        return {
          name: target.name,
          type: target.type,
          worldPos: intersects[0].point,
          actionLabel: target.action,
        };
      }
    }

    return null;
  }



  /**
   * Trigger action on 3D Equipment hit.
   */
  private trigger3DAction(
    target: {
      name: string;
      type: 'plc' | 'valve' | 'pump' | 'tank' | 'estop' | 'conveyor_motor' | 'conveyor_pusher' | 'conveyor_box';
      worldPos: THREE.Vector3;
    },
    x: number,
    y: number
  ): void {
    const now = performance.now();
    if (now - this.lastPinchTrigger < 450) return; // Debounce
    this.lastPinchTrigger = now;

    this.visualizer.addRipple(x, y, 70, '#06b6d4');
    soundManager.playCyberToggle(1.0);

    if (target.type === 'plc') {
      this.togglePLC();
    } else if (target.type === 'valve') {
      EventBus.emit('control:toggleValve');
    } else if (target.type === 'pump') {
      EventBus.emit('control:togglePump');
    } else if (target.type === 'conveyor_motor') {
      EventBus.emit('conveyor:toggleMotor');
    }
  }

  /**
   * Toggle PLC execution.
   */
  private togglePLC(): void {
    if (alarmManager.isEStopLatched()) {
      soundManager.playError();
      return;
    }
    if (AppState.plcState === 'RUN') {
      EventBus.emit(Events.PROCESS_STOP);
    } else {
      EventBus.emit(Events.PROCESS_START);
    }
  }

  /**
   * Trigger Emergency Stop on Fist gesture.
   */
  private triggerEStopGesture(x: number, y: number): void {
    this.visualizer.addRipple(x, y, 100, '#ef4444');
    soundManager.playError();
    soundManager.playAlarmSiren();

    alarmManager.triggerAlarm(
      'ALM-001',
      'EMERGENCY STOP (GESTURE FIST)',
      'CRITICAL',
      'Emergency Stop actuated via mid-air Closed Fist gesture.',
      'Safety Rig'
    );
    alarmManager.latchEStop();
    EventBus.emit('estop:triggered');
    EventBus.emit(Events.PROCESS_STOP);
  }

  private getScreenPos(worldPos: THREE.Vector3): { x: number; y: number } | null {
    const v = worldPos.clone().project(this.camera);
    if (v.z > 1.0) return null;
    return {
      x: ((v.x + 1) / 2) * window.innerWidth,
      y: ((-v.y + 1) / 2) * window.innerHeight,
    };
  }

  onHandLost(): void {
    this.currentPose = 'IDLE';
    this.isLevelSliderActive = false;
    this.activeHoveredObject = null;
    this.visualizer.setRecognizedPose('IDLE');
    this.visualizer.setCyberSliderState(false, 0);
    this.visualizer.setHoverTarget(null);
  }
}
