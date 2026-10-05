// ============================================================
// AppState – Central state (single source of truth)
// Supports all 5 industrial digital twin experiments
// ============================================================

import { EventBus, Events } from './EventBus';
import {
  type PLCState,
  type PumpState,
  type ValveState,
  type FlowState,
  type SensorState,
  type LevelStatus,
  type SystemMode,
  type InteractionMode,
  type ViewMode,
  type MentorState,
  type GestureState,
  DEFAULT_TARGET_LEVEL,
  TANK_THRESHOLDS,
} from './constants';

import type { ExperimentType } from './ExperimentConfig';

// --- Connection Types ---
export interface ConnectionDef {
  source: string;       // e.g. "I0.0"
  target: string;       // e.g. "LEVEL_SENSOR_LOW"
  label: string;        // Human-readable
  type: 'INPUT' | 'OUTPUT';
}

export interface CompletedConnection {
  source: string;
  target: string;
  wireId: string;
}

// --- Traffic Light Types ---
export type TrafficPhase = 'MAIN_GREEN' | 'MAIN_YELLOW' | 'MAIN_RED' | 'ALL_RED' | 'CROSS_YELLOW';
export type PedWalkPhase = 'DONT_WALK' | 'WALK' | 'FLASHING';

// --- Robotic Types ---
export type RobotCycleStep = 'IDLE' | 'MOVE_PICKUP' | 'LOWER_PICKUP' | 'GRIP' | 'LIFT_PICKUP' | 'MOVE_PLACE' | 'LOWER_PLACE' | 'RELEASE' | 'LIFT_PLACE' | 'HOME';

// --- Reactor Types ---
export type ReactorBatchStep = 'IDLE' | 'DOSING_A' | 'DOSING_B' | 'MIXING' | 'HEATING' | 'HOLDING' | 'DRAINING' | 'COMPLETE';

// --- State Shape ---
export interface IAppState {
  // Experiment
  activeExperiment: ExperimentType;

  // View & UI
  viewMode: ViewMode;
  controlMode: SystemMode;
  interactionMode: InteractionMode;

  // PLC
  plcState: PLCState;

  // Tank Process (Experiment 1)
  tankLevel: number;
  targetLevel: number;
  pumpState: PumpState;
  valveState: ValveState;
  flowState: FlowState;
  sensorState: SensorState;
  levelStatus: LevelStatus;

  // Conveyor Process (Experiment 2)
  conveyorMotorState: 'OFF' | 'ON';
  beltSpeed: number; // m/s
  opticalSensorDetected: boolean;
  diverterPusherExtended: boolean;
  conveyorPartsTotal: number;
  conveyorPartsSorted: number;

  // Traffic Junction Process (Experiment 3)
  trafficPhase: TrafficPhase;
  pedWalkPhase: PedWalkPhase;
  pedCallRequested: boolean;
  vehicleDetected: boolean;
  trafficPhaseTimer: number;
  trafficEmergencyMode: boolean;
  trafficVehiclesPassed: number;

  // Robotic Pick-and-Place Process (Experiment 4)
  robotX: number; // 0 (home/feed) to 1 (target bin)
  robotY: number; // 0 to 1
  robotZ: number; // 0 (up) to 1 (down)
  robotVacuumActive: boolean;
  robotPartHeld: boolean;
  robotPartInFeed: boolean;
  robotCycleStep: RobotCycleStep;
  robotPartsTransferred: number;
  robotCycleTime: number;

  // Chemical Batch Reactor Process (Experiment 5)
  reactorTemp: number; // °C
  reactorTargetTemp: number; // °C
  reactorAgitatorSpeed: number; // RPM
  reactorAgitatorState: 'OFF' | 'ON';
  reactorHeaterState: 'OFF' | 'ON';
  reactorValveAState: 'CLOSED' | 'OPEN';
  reactorValveBState: 'CLOSED' | 'OPEN';
  reactorDrainValveState: 'CLOSED' | 'OPEN';
  reactorFluidLevel: number; // 0 to 100%
  reactorFluidColor: string;
  reactorBatchStep: ReactorBatchStep;
  reactorBatchProgress: number; // 0 to 100%
  reactorBatchesCompleted: number;

  // Wiring
  wiringProgress: {
    required: ConnectionDef[];
    completed: CompletedConnection[];
    correctCount: number;
    incorrectAttempts: number;
    allCorrect: boolean;
  };

  // Hand Tracking
  handTracking: {
    detected: boolean;
    confidence: number;
    fingerScreenPos: { x: number; y: number } | null;
    gestureState: GestureState;
  };

  // Mentor
  mentorStep: number;
  mentorState: MentorState;

  // System
  isLoading: boolean;
  loadingProgress: number;
  debugMode: boolean;
}

function computeLevelStatus(level: number): LevelStatus {
  if (level <= 0) return 'EMPTY';
  if (level <= TANK_THRESHOLDS.LOW) return 'LOW';
  if (level <= TANK_THRESHOLDS.NORMAL_MAX) return 'NORMAL';
  if (level < TANK_THRESHOLDS.OVERFLOW) return 'HIGH';
  return 'OVERFLOW';
}

class AppStateClass implements IAppState {
  // Experiment
  activeExperiment: ExperimentType = 'TANK';

  // View
  viewMode: ViewMode = 'PREVIEW_3D';
  controlMode: SystemMode = 'AUTO';
  interactionMode: InteractionMode = 'NORMAL';

  // PLC
  plcState: PLCState = 'POWER_OFF';

  // Tank Process (Experiment 1)
  tankLevel = 0;
  targetLevel = DEFAULT_TARGET_LEVEL;
  pumpState: PumpState = 'OFF';
  valveState: ValveState = 'CLOSED';
  flowState: FlowState = 'STOPPED';
  sensorState: SensorState = 'NORMAL';
  levelStatus: LevelStatus = 'EMPTY';

  // Conveyor Process (Experiment 2)
  conveyorMotorState: 'OFF' | 'ON' = 'OFF';
  beltSpeed = 0;
  opticalSensorDetected = false;
  diverterPusherExtended = false;
  conveyorPartsTotal = 0;
  conveyorPartsSorted = 0;

  // Traffic Junction Process (Experiment 3)
  trafficPhase: TrafficPhase = 'MAIN_GREEN';
  pedWalkPhase: PedWalkPhase = 'DONT_WALK';
  pedCallRequested = false;
  vehicleDetected = false;
  trafficPhaseTimer = 10;
  trafficEmergencyMode = false;
  trafficVehiclesPassed = 0;

  // Robotic Pick-and-Place Process (Experiment 4)
  robotX = 0;
  robotY = 0;
  robotZ = 0;
  robotVacuumActive = false;
  robotPartHeld = false;
  robotPartInFeed = true;
  robotCycleStep: RobotCycleStep = 'IDLE';
  robotPartsTransferred = 0;
  robotCycleTime = 0;

  // Chemical Batch Reactor Process (Experiment 5)
  reactorTemp = 24.5;
  reactorTargetTemp = 75.0;
  reactorAgitatorSpeed = 0;
  reactorAgitatorState: 'OFF' | 'ON' = 'OFF';
  reactorHeaterState: 'OFF' | 'ON' = 'OFF';
  reactorValveAState: 'CLOSED' | 'OPEN' = 'CLOSED';
  reactorValveBState: 'CLOSED' | 'OPEN' = 'CLOSED';
  reactorDrainValveState: 'CLOSED' | 'OPEN' = 'CLOSED';
  reactorFluidLevel = 0;
  reactorFluidColor = '#38bdf8';
  reactorBatchStep: ReactorBatchStep = 'IDLE';
  reactorBatchProgress = 0;
  reactorBatchesCompleted = 0;

  // Wiring
  wiringProgress = {
    required: [] as ConnectionDef[],
    completed: [] as CompletedConnection[],
    correctCount: 0,
    incorrectAttempts: 0,
    allCorrect: false,
  };

  // Hand Tracking
  handTracking = {
    detected: false,
    confidence: 0,
    fingerScreenPos: null as { x: number; y: number } | null,
    gestureState: 'IDLE' as GestureState,
  };

  // Mentor
  mentorStep = 0;
  mentorState: MentorState = 'WAITING';

  // System
  isLoading = true;
  loadingProgress = 0;
  debugMode = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.debugMode = new URLSearchParams(window.location.search).has('debug');
    }
  }

  // --- Setters with events ---

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    EventBus.emit(Events.MODE_CHANGED, mode);
    EventBus.emit(Events.STATE_CHANGED, 'viewMode', mode);
  }

  setControlMode(mode: SystemMode): void {
    this.controlMode = mode;
    EventBus.emit(Events.STATE_CHANGED, 'controlMode', mode);
  }

  setInteractionMode(mode: InteractionMode): void {
    this.interactionMode = mode;
    if (mode === 'WIRING') {
      EventBus.emit(Events.WIRING_MODE_ENTER);
    } else {
      EventBus.emit(Events.WIRING_MODE_EXIT);
    }
    EventBus.emit(Events.STATE_CHANGED, 'interactionMode', mode);
  }

  setPLCState(state: PLCState): void {
    this.plcState = state;
    EventBus.emit(Events.PLC_STATE_CHANGED, state);
    EventBus.emit(Events.STATE_CHANGED, 'plcState', state);
  }

  setTargetLevel(target: number): void {
    this.targetLevel = Math.max(0, Math.min(100, target));
    EventBus.emit(Events.SETPOINT_CHANGED, this.targetLevel);
    EventBus.emit(Events.STATE_CHANGED, 'targetLevel', this.targetLevel);
  }

  setTankLevel(level: number): void {
    this.tankLevel = Math.max(0, Math.min(100, level));
    this.levelStatus = computeLevelStatus(this.tankLevel);
    EventBus.emit(Events.TANK_LEVEL_CHANGED, this.tankLevel, this.levelStatus);
    EventBus.emit(Events.STATE_CHANGED, 'tankLevel', this.tankLevel);
  }

  setPumpState(state: PumpState): void {
    this.pumpState = state;
    EventBus.emit(Events.PUMP_STATE_CHANGED, state);
    EventBus.emit(Events.STATE_CHANGED, 'pumpState', state);
  }

  setValveState(state: ValveState): void {
    this.valveState = state;
    EventBus.emit(Events.VALVE_STATE_CHANGED, state);
    EventBus.emit(Events.STATE_CHANGED, 'valveState', state);
  }

  setFlowState(state: FlowState): void {
    this.flowState = state;
    EventBus.emit(Events.FLOW_STATE_CHANGED, state);
    EventBus.emit(Events.STATE_CHANGED, 'flowState', state);
  }

  setSensorState(state: SensorState): void {
    this.sensorState = state;
    EventBus.emit(Events.SENSOR_STATE_CHANGED, state);
    EventBus.emit(Events.STATE_CHANGED, 'sensorState', state);
  }

  setMentorStep(step: number): void {
    this.mentorStep = step;
    EventBus.emit(Events.MENTOR_STEP_CHANGED, step);
  }

  setMentorState(state: MentorState): void {
    this.mentorState = state;
    EventBus.emit(Events.STATE_CHANGED, 'mentorState', state);
  }

  setHandTracking(detected: boolean, confidence: number, pos: { x: number; y: number } | null, gesture: GestureState): void {
    this.handTracking.detected = detected;
    this.handTracking.confidence = confidence;
    this.handTracking.fingerScreenPos = pos;
    this.handTracking.gestureState = gesture;

    if (detected) {
      EventBus.emit(Events.HAND_DETECTED);
    } else {
      EventBus.emit(Events.HAND_LOST);
    }
    if (pos) {
      EventBus.emit(Events.FINGER_MOVE, pos);
    }
  }

  setLoading(loading: boolean, progress?: number): void {
    this.isLoading = loading;
    if (progress !== undefined) this.loadingProgress = progress;
    if (!loading) {
      EventBus.emit(Events.LOADING_COMPLETE);
    } else {
      EventBus.emit(Events.LOADING_PROGRESS, this.loadingProgress);
    }
  }

  // --- Connection helpers ---

  addCorrectConnection(conn: CompletedConnection): void {
    this.wiringProgress.completed.push(conn);
    this.wiringProgress.correctCount = this.wiringProgress.completed.length;
    this.wiringProgress.allCorrect =
      this.wiringProgress.correctCount >= this.wiringProgress.required.length;

    EventBus.emit(Events.CONNECTION_CORRECT, conn);
    EventBus.emit(Events.CONNECTION_PROGRESS, this.wiringProgress);

    if (this.wiringProgress.allCorrect) {
      this.setPLCState('READY');
      EventBus.emit(Events.ALL_CONNECTED);
    }
  }

  recordIncorrectAttempt(): void {
    this.wiringProgress.incorrectAttempts++;
  }

  resetConnections(): void {
    this.wiringProgress.completed = [];
    this.wiringProgress.correctCount = 0;
    this.wiringProgress.incorrectAttempts = 0;
    this.wiringProgress.allCorrect = false;
    this.setPLCState('POWER_OFF');
    EventBus.emit(Events.CONNECTIONS_RESET);
  }

  setExperiment(exp: ExperimentType): void {
    this.activeExperiment = exp;
    EventBus.emit('experiment:changed', { experiment: exp });
    EventBus.emit(Events.STATE_CHANGED, 'activeExperiment', exp);
  }

  // --- Conveyor Setters ---
  setConveyorMotorState(state: 'OFF' | 'ON'): void {
    this.conveyorMotorState = state;
    EventBus.emit('conveyor:motorStateChanged', state);
    EventBus.emit(Events.STATE_CHANGED, 'conveyorMotorState', state);
  }

  setBeltSpeed(speed: number): void {
    this.beltSpeed = speed;
    EventBus.emit('conveyor:speedChanged', speed);
    EventBus.emit(Events.STATE_CHANGED, 'beltSpeed', speed);
  }

  setOpticalSensorDetected(detected: boolean): void {
    this.opticalSensorDetected = detected;
    EventBus.emit('conveyor:sensorStateChanged', detected);
    EventBus.emit(Events.STATE_CHANGED, 'opticalSensorDetected', detected);
  }

  setDiverterPusherExtended(extended: boolean): void {
    this.diverterPusherExtended = extended;
    EventBus.emit('conveyor:diverterStateChanged', extended);
    EventBus.emit(Events.STATE_CHANGED, 'diverterPusherExtended', extended);
  }

  incrementPartsTotal(): void {
    this.conveyorPartsTotal++;
    EventBus.emit('conveyor:partsCountChanged', { total: this.conveyorPartsTotal, sorted: this.conveyorPartsSorted });
  }

  incrementPartsSorted(): void {
    this.conveyorPartsSorted++;
    EventBus.emit('conveyor:partsCountChanged', { total: this.conveyorPartsTotal, sorted: this.conveyorPartsSorted });
  }

  // --- Traffic Junction Setters ---
  setTrafficPhase(phase: TrafficPhase, timerSec: number): void {
    this.trafficPhase = phase;
    this.trafficPhaseTimer = timerSec;
    EventBus.emit('traffic:phaseChanged', { phase, timer: timerSec });
    EventBus.emit(Events.STATE_CHANGED, 'trafficPhase', phase);
  }

  setPedWalkPhase(phase: PedWalkPhase): void {
    this.pedWalkPhase = phase;
    EventBus.emit('traffic:pedWalkChanged', phase);
    EventBus.emit(Events.STATE_CHANGED, 'pedWalkPhase', phase);
  }

  setPedCallRequested(requested: boolean): void {
    this.pedCallRequested = requested;
    EventBus.emit('traffic:pedCallChanged', requested);
    EventBus.emit(Events.STATE_CHANGED, 'pedCallRequested', requested);
  }

  setVehicleDetected(detected: boolean): void {
    this.vehicleDetected = detected;
    EventBus.emit('traffic:vehicleDetectedChanged', detected);
    EventBus.emit(Events.STATE_CHANGED, 'vehicleDetected', detected);
  }

  setTrafficEmergencyMode(emergency: boolean): void {
    this.trafficEmergencyMode = emergency;
    EventBus.emit('traffic:emergencyChanged', emergency);
    EventBus.emit(Events.STATE_CHANGED, 'trafficEmergencyMode', emergency);
  }

  incrementTrafficVehicles(): void {
    this.trafficVehiclesPassed++;
    EventBus.emit('traffic:vehiclesCountChanged', this.trafficVehiclesPassed);
  }

  // --- Robotic Gantry Setters ---
  setRobotPose(x: number, y: number, z: number): void {
    this.robotX = x;
    this.robotY = y;
    this.robotZ = z;
    EventBus.emit('robot:poseChanged', { x, y, z });
  }

  setRobotVacuumActive(active: boolean): void {
    this.robotVacuumActive = active;
    EventBus.emit('robot:vacuumChanged', active);
    EventBus.emit(Events.STATE_CHANGED, 'robotVacuumActive', active);
  }

  setRobotPartHeld(held: boolean): void {
    this.robotPartHeld = held;
    EventBus.emit('robot:partHeldChanged', held);
    EventBus.emit(Events.STATE_CHANGED, 'robotPartHeld', held);
  }

  setRobotPartInFeed(present: boolean): void {
    this.robotPartInFeed = present;
    EventBus.emit('robot:partInFeedChanged', present);
    EventBus.emit(Events.STATE_CHANGED, 'robotPartInFeed', present);
  }

  setRobotCycleStep(step: RobotCycleStep): void {
    this.robotCycleStep = step;
    EventBus.emit('robot:cycleStepChanged', step);
    EventBus.emit(Events.STATE_CHANGED, 'robotCycleStep', step);
  }

  incrementRobotParts(): void {
    this.robotPartsTransferred++;
    EventBus.emit('robot:partsCountChanged', this.robotPartsTransferred);
  }

  // --- Chemical Batch Reactor Setters ---
  setReactorTemp(temp: number): void {
    this.reactorTemp = temp;
    EventBus.emit('reactor:tempChanged', temp);
    EventBus.emit(Events.STATE_CHANGED, 'reactorTemp', temp);
  }

  setReactorTargetTemp(temp: number): void {
    this.reactorTargetTemp = temp;
    EventBus.emit('reactor:targetTempChanged', temp);
    EventBus.emit(Events.STATE_CHANGED, 'reactorTargetTemp', temp);
  }

  setReactorAgitator(state: 'OFF' | 'ON', rpm = 0): void {
    this.reactorAgitatorState = state;
    this.reactorAgitatorSpeed = rpm;
    EventBus.emit('reactor:agitatorChanged', { state, rpm });
    EventBus.emit(Events.STATE_CHANGED, 'reactorAgitatorState', state);
  }

  setReactorHeater(state: 'OFF' | 'ON'): void {
    this.reactorHeaterState = state;
    EventBus.emit('reactor:heaterChanged', state);
    EventBus.emit(Events.STATE_CHANGED, 'reactorHeaterState', state);
  }

  setReactorValves(valveA: 'CLOSED' | 'OPEN', valveB: 'CLOSED' | 'OPEN', drain: 'CLOSED' | 'OPEN'): void {
    this.reactorValveAState = valveA;
    this.reactorValveBState = valveB;
    this.reactorDrainValveState = drain;
    EventBus.emit('reactor:valvesChanged', { valveA, valveB, drain });
  }

  setReactorFluid(level: number, color: string): void {
    this.reactorFluidLevel = Math.max(0, Math.min(100, level));
    this.reactorFluidColor = color;
    EventBus.emit('reactor:fluidChanged', { level: this.reactorFluidLevel, color });
    EventBus.emit(Events.STATE_CHANGED, 'reactorFluidLevel', this.reactorFluidLevel);
  }

  setReactorBatchStep(step: ReactorBatchStep, progress = 0): void {
    this.reactorBatchStep = step;
    this.reactorBatchProgress = progress;
    EventBus.emit('reactor:batchStepChanged', { step, progress });
    EventBus.emit(Events.STATE_CHANGED, 'reactorBatchStep', step);
  }

  incrementReactorBatches(): void {
    this.reactorBatchesCompleted++;
    EventBus.emit('reactor:batchesCountChanged', this.reactorBatchesCompleted);
  }

  // --- Universal Process Reset ---
  resetProcess(): void {
    // 1. Tank
    this.setTankLevel(0);
    this.setPumpState('OFF');
    this.setValveState('CLOSED');
    this.setFlowState('STOPPED');
    this.setSensorState('NORMAL');

    // 2. Conveyor
    this.setConveyorMotorState('OFF');
    this.setBeltSpeed(0);
    this.setOpticalSensorDetected(false);
    this.setDiverterPusherExtended(false);
    this.conveyorPartsTotal = 0;
    this.conveyorPartsSorted = 0;

    // 3. Traffic
    this.setTrafficPhase('MAIN_GREEN', 10);
    this.setPedWalkPhase('DONT_WALK');
    this.setPedCallRequested(false);
    this.setVehicleDetected(false);
    this.trafficEmergencyMode = false;
    this.trafficVehiclesPassed = 0;

    // 4. Robot
    this.setRobotPose(0, 0, 0);
    this.setRobotVacuumActive(false);
    this.setRobotPartHeld(false);
    this.setRobotPartInFeed(true);
    this.setRobotCycleStep('IDLE');
    this.robotPartsTransferred = 0;

    // 5. Reactor
    this.setReactorTemp(24.5);
    this.setReactorAgitator('OFF', 0);
    this.setReactorHeater('OFF');
    this.setReactorValves('CLOSED', 'CLOSED', 'CLOSED');
    this.setReactorFluid(0, '#38bdf8');
    this.setReactorBatchStep('IDLE', 0);
    this.reactorBatchesCompleted = 0;

    this.setPLCState(this.wiringProgress.allCorrect ? 'READY' : 'POWER_OFF');
    EventBus.emit(Events.PROCESS_RESET);
  }
}

export const AppState = new AppStateClass();
