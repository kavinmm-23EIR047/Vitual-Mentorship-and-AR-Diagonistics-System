// ============================================================
// WiringTrainingEngine – Sequential step-by-step training engine
// Supports All 5 Multi-Experiment Step Sets
// ============================================================

import { AppState, type CompletedConnection } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { VIBRATION, type TrainingState } from '../core/constants';
import { soundManager } from '../core/SoundManager';
import type { ExperimentType } from '../core/ExperimentConfig';

export interface TrainingStepDef {
  index: number;
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  shortSource: string;
  shortTarget: string;
  instruction: string;
  subtext: string;
}

// --- Experiment 1: Water Tank Steps ---
export const TANK_TRAINING_STEPS: TrainingStepDef[] = [
  {
    index: 0,
    sourceId: 'I0.0',
    sourceLabel: 'PLC DI0 (%I0.0)',
    targetId: 'LEVEL_SENSOR_LOW',
    targetLabel: 'Sensor OUT (Low)',
    shortSource: 'DI0',
    shortTarget: 'Sensor Low',
    instruction: 'PLC DI0 → Sensor OUT',
    subtext: 'Touch highlighted [DI0] and connect to [Sensor OUT]',
  },
  {
    index: 1,
    sourceId: 'I0.1',
    sourceLabel: 'PLC DI1 (%I0.1)',
    targetId: 'LEVEL_SENSOR_HIGH',
    targetLabel: 'Sensor HIGH',
    shortSource: 'DI1',
    shortTarget: 'Sensor High',
    instruction: 'PLC DI1 → Sensor HIGH',
    subtext: 'Touch highlighted [DI1] and connect to [Sensor HIGH]',
  },
  {
    index: 2,
    sourceId: 'Q0.0',
    sourceLabel: 'PLC DO0 (%Q0.0)',
    targetId: 'PUMP_CONTROL',
    targetLabel: 'Pump Motor Starter',
    shortSource: 'DO0',
    shortTarget: 'Pump Control',
    instruction: 'PLC DO0 → Pump Starter',
    subtext: 'Touch highlighted [DO0] and connect to [Pump Starter]',
  },
  {
    index: 3,
    sourceId: 'Q0.1',
    sourceLabel: 'PLC DO1 (%Q0.1)',
    targetId: 'VALVE_CONTROL',
    targetLabel: 'Valve Actuator',
    shortSource: 'DO1',
    shortTarget: 'Valve Control',
    instruction: 'PLC DO1 → Valve Control',
    subtext: 'Touch highlighted [DO1] and connect to [Valve Actuator]',
  },
];

// --- Experiment 2: Conveyor & Optical Sorting Steps ---
export const CONVEYOR_TRAINING_STEPS: TrainingStepDef[] = [
  {
    index: 0,
    sourceId: 'I0.0',
    sourceLabel: 'PLC DI0 (%I0.0)',
    targetId: 'CONVEYOR_OPTICAL_SENSOR',
    targetLabel: 'Optical Sensor OUT',
    shortSource: 'DI0',
    shortTarget: 'Optical Sensor',
    instruction: 'PLC DI0 → Optical Sensor',
    subtext: 'Touch highlighted [DI0] and connect to [Optical Sensor]',
  },
  {
    index: 1,
    sourceId: 'I0.1',
    sourceLabel: 'PLC DI1 (%I0.1)',
    targetId: 'CONVEYOR_START_BTN',
    targetLabel: 'Start Pushbutton',
    shortSource: 'DI1',
    shortTarget: 'Start Button',
    instruction: 'PLC DI1 → Start Button',
    subtext: 'Touch highlighted [DI1] and connect to [Start Pushbutton]',
  },
  {
    index: 2,
    sourceId: 'Q0.0',
    sourceLabel: 'PLC DO0 (%Q0.0)',
    targetId: 'CONVEYOR_MOTOR_DRIVE',
    targetLabel: 'Conveyor Motor Drive',
    shortSource: 'DO0',
    shortTarget: 'Motor Drive',
    instruction: 'PLC DO0 → Conveyor Drive',
    subtext: 'Touch highlighted [DO0] and connect to [Conveyor Drive]',
  },
  {
    index: 3,
    sourceId: 'Q0.1',
    sourceLabel: 'PLC DO1 (%Q0.1)',
    targetId: 'CONVEYOR_PUSHER_VALVE',
    targetLabel: 'Pneumatic Diverter Valve',
    shortSource: 'DO1',
    shortTarget: 'Pneumatic Pusher',
    instruction: 'PLC DO1 → Diverter Valve',
    subtext: 'Touch highlighted [DO1] and connect to [Diverter Valve]',
  },
];

// --- Experiment 3: Smart Traffic & Pedestrian Steps ---
export const TRAFFIC_TRAINING_STEPS: TrainingStepDef[] = [
  {
    index: 0,
    sourceId: 'I0.0',
    sourceLabel: 'PLC DI0 (%I0.0)',
    targetId: 'TRAFFIC_PED_BTN',
    targetLabel: 'Pedestrian Call Button',
    shortSource: 'DI0',
    shortTarget: 'Ped Call PB',
    instruction: 'PLC DI0 → Pedestrian Button',
    subtext: 'Touch highlighted [DI0] and connect to [Pedestrian Call Button]',
  },
  {
    index: 1,
    sourceId: 'I0.1',
    sourceLabel: 'PLC DI1 (%I0.1)',
    targetId: 'TRAFFIC_VEHICLE_SENSOR',
    targetLabel: 'Inductive Vehicle Loop',
    shortSource: 'DI1',
    shortTarget: 'Loop Sensor',
    instruction: 'PLC DI1 → Vehicle Detector',
    subtext: 'Touch highlighted [DI1] and connect to [Vehicle Loop Sensor]',
  },
  {
    index: 2,
    sourceId: 'Q0.0',
    sourceLabel: 'PLC DO0 (%Q0.0)',
    targetId: 'TRAFFIC_MAIN_SIGNAL',
    targetLabel: 'Traffic Light Matrix',
    shortSource: 'DO0',
    shortTarget: 'Signal Head',
    instruction: 'PLC DO0 → Main Signal Head',
    subtext: 'Touch highlighted [DO0] and connect to [Traffic Signal Head]',
  },
  {
    index: 3,
    sourceId: 'Q0.1',
    sourceLabel: 'PLC DO1 (%Q0.1)',
    targetId: 'TRAFFIC_PED_LIGHT',
    targetLabel: 'Pedestrian Walk Light',
    shortSource: 'DO1',
    shortTarget: 'Walk Light',
    instruction: 'PLC DO1 → Pedestrian Light',
    subtext: 'Touch highlighted [DO1] and connect to [Pedestrian Walk Light]',
  },
];

// --- Experiment 4: 3-Axis Robotic Pick & Place Steps ---
export const ROBOT_TRAINING_STEPS: TrainingStepDef[] = [
  {
    index: 0,
    sourceId: 'I0.0',
    sourceLabel: 'PLC DI0 (%I0.0)',
    targetId: 'ROBOT_PART_SENSOR',
    targetLabel: 'In-Feed Proximity Sensor',
    shortSource: 'DI0',
    shortTarget: 'Part Sensor',
    instruction: 'PLC DI0 → Part Proximity Sensor',
    subtext: 'Touch highlighted [DI0] and connect to [Part Feed Sensor]',
  },
  {
    index: 1,
    sourceId: 'I0.1',
    sourceLabel: 'PLC DI1 (%I0.1)',
    targetId: 'ROBOT_HOME_SWITCH',
    targetLabel: 'Gantry Home Limit Switch',
    shortSource: 'DI1',
    shortTarget: 'Home Switch',
    instruction: 'PLC DI1 → Home Limit Switch',
    subtext: 'Touch highlighted [DI1] and connect to [Gantry Home Switch]',
  },
  {
    index: 2,
    sourceId: 'Q0.0',
    sourceLabel: 'PLC DO0 (%Q0.0)',
    targetId: 'ROBOT_SERVO_DRIVE',
    targetLabel: 'Gantry Servo Controller',
    shortSource: 'DO0',
    shortTarget: 'Servo Drive',
    instruction: 'PLC DO0 → Gantry Motion Drive',
    subtext: 'Touch highlighted [DO0] and connect to [Gantry Servo Drive]',
  },
  {
    index: 3,
    sourceId: 'Q0.1',
    sourceLabel: 'PLC DO1 (%Q0.1)',
    targetId: 'ROBOT_VACUUM_VALVE',
    targetLabel: 'Vacuum Gripper Solenoid',
    shortSource: 'DO1',
    shortTarget: 'Vacuum Solenoid',
    instruction: 'PLC DO1 → Vacuum Solenoid',
    subtext: 'Touch highlighted [DO1] and connect to [Vacuum Solenoid Valve]',
  },
];

// --- Experiment 5: Thermal Batch Reactor Steps ---
export const REACTOR_TRAINING_STEPS: TrainingStepDef[] = [
  {
    index: 0,
    sourceId: 'I0.0',
    sourceLabel: 'PLC DI0 (%I0.0)',
    targetId: 'REACTOR_TEMP_SENSOR',
    targetLabel: 'PT100 Temperature Switch',
    shortSource: 'DI0',
    shortTarget: 'PT100 Temp',
    instruction: 'PLC DI0 → PT100 Temp Sensor',
    subtext: 'Touch highlighted [DI0] and connect to [PT100 Temp Probe]',
  },
  {
    index: 1,
    sourceId: 'I0.1',
    sourceLabel: 'PLC DI1 (%I0.1)',
    targetId: 'REACTOR_START_BTN',
    targetLabel: 'Recipe Batch Start PB',
    shortSource: 'DI1',
    shortTarget: 'Batch Start',
    instruction: 'PLC DI1 → Recipe Start PB',
    subtext: 'Touch highlighted [DI1] and connect to [Batch Start Pushbutton]',
  },
  {
    index: 2,
    sourceId: 'Q0.0',
    sourceLabel: 'PLC DO0 (%Q0.0)',
    targetId: 'REACTOR_AGITATOR_DRIVE',
    targetLabel: 'Agitator Stirrer Contactor',
    shortSource: 'DO0',
    shortTarget: 'Agitator Drive',
    instruction: 'PLC DO0 → Stirrer Contactor',
    subtext: 'Touch highlighted [DO0] and connect to [Agitator Motor Contactor]',
  },
  {
    index: 3,
    sourceId: 'Q0.1',
    sourceLabel: 'PLC DO1 (%Q0.1)',
    targetId: 'REACTOR_HEATER_RELAY',
    targetLabel: 'Heating Element SSR Relay',
    shortSource: 'DO1',
    shortTarget: 'Heater Relay',
    instruction: 'PLC DO1 → Thermal Heater SSR',
    subtext: 'Touch highlighted [DO1] and connect to [Heating Element Relay]',
  },
];

export class WiringTrainingEngine {
  private currentStepIndex = 0;
  private state: TrainingState = 'WAITING_FOR_SOURCE';
  private completedConnections: CompletedConnection[] = [];
  private activeExperiment: ExperimentType = 'TANK';

  constructor() {
    this.updateState();

    EventBus.on('experiment:changed', (data: { experiment: ExperimentType }) => {
      this.setExperiment(data.experiment);
    });
  }

  setExperiment(exp: ExperimentType): void {
    this.activeExperiment = exp;
    this.reset();
  }

  private getSteps(): TrainingStepDef[] {
    switch (this.activeExperiment) {
      case 'CONVEYOR':
        return CONVEYOR_TRAINING_STEPS;
      case 'TRAFFIC':
        return TRAFFIC_TRAINING_STEPS;
      case 'ROBOT':
        return ROBOT_TRAINING_STEPS;
      case 'REACTOR':
        return REACTOR_TRAINING_STEPS;
      case 'TANK':
      default:
        return TANK_TRAINING_STEPS;
    }
  }

  getCurrentStep(): TrainingStepDef | null {
    const steps = this.getSteps();
    if (this.currentStepIndex >= steps.length) return null;
    return steps[this.currentStepIndex];
  }

  getState(): TrainingState {
    return this.state;
  }

  getStepIndex(): number {
    return this.currentStepIndex;
  }

  getTotalSteps(): number {
    return this.getSteps().length;
  }

  isCompleted(): boolean {
    return this.currentStepIndex >= this.getSteps().length;
  }

  isExpectedSource(terminalId: string): boolean {
    const step = this.getCurrentStep();
    return step ? step.sourceId === terminalId : false;
  }

  isExpectedTarget(targetId: string): boolean {
    const step = this.getCurrentStep();
    return step ? step.targetId === targetId : false;
  }

  startDrag(sourceId: string): boolean {
    if (this.isCompleted()) return false;

    const step = this.getCurrentStep();
    if (!step || step.sourceId !== sourceId) {
      this.vibrate(VIBRATION.ERROR);
      EventBus.emit('training:wrongSource', {
        touched: sourceId,
        expected: step ? step.sourceId : '',
        expectedLabel: step ? step.sourceLabel : '',
      });
      return false;
    }

    this.state = 'DRAGGING';
    this.vibrate(VIBRATION.TOUCH_START);
    soundManager.playGrab();
    EventBus.emit('training:dragStart', step);
    return true;
  }

  completeConnection(targetId: string): boolean {
    const step = this.getCurrentStep();
    if (!step) return false;

    if (step.targetId === targetId) {
      this.state = 'CONNECTED';
      const conn: CompletedConnection = {
        source: step.sourceId,
        target: step.targetId,
        wireId: `wire_${step.sourceId}_${step.targetId}`,
      };

      this.completedConnections.push(conn);
      AppState.addCorrectConnection(conn);

      this.vibrate(VIBRATION.SUCCESS);
      soundManager.playSuccess();

      const totalSteps = this.getSteps().length;
      EventBus.emit('training:connectionSuccess', {
        step,
        connection: conn,
        stepIndex: this.currentStepIndex,
        totalSteps,
      });

      this.currentStepIndex++;

      setTimeout(() => {
        if (this.isCompleted()) {
          this.state = 'COMPLETED';
          EventBus.emit('training:completed', {
            totalSteps,
            connections: this.completedConnections,
          });
          EventBus.emit(Events.ALL_CONNECTED);
        } else {
          this.state = 'WAITING_FOR_SOURCE';
          this.updateState();
        }
      }, 900);

      return true;
    } else {
      this.state = 'WAITING_FOR_SOURCE';
      this.vibrate(VIBRATION.ERROR);
      soundManager.playError();

      EventBus.emit('training:connectionError', {
        step,
        attemptedTarget: targetId,
        expectedTarget: step.targetId,
        expectedLabel: step.targetLabel,
      });

      return false;
    }
  }

  cancelDrag(): void {
    if (this.state === 'DRAGGING') {
      this.state = 'WAITING_FOR_SOURCE';
      const step = this.getCurrentStep();
      EventBus.emit('training:dragCancelled', step);
    }
  }

  reset(): void {
    this.currentStepIndex = 0;
    this.state = 'WAITING_FOR_SOURCE';
    this.completedConnections = [];
    AppState.resetConnections();
    soundManager.playPlace();
    this.updateState();
    EventBus.emit('training:reset');
    EventBus.emit(Events.CONNECTIONS_RESET);
  }

  private updateState(): void {
    const step = this.getCurrentStep();
    if (step) {
      AppState.setMentorStep(this.currentStepIndex);
      EventBus.emit('training:stepChanged', {
        stepIndex: this.currentStepIndex,
        totalSteps: this.getSteps().length,
        step,
      });
    }
  }

  private vibrate(pattern: readonly number[]): void {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([...pattern]);
      }
    } catch {
      // ignore
    }
  }
}
