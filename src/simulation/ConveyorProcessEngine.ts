// ============================================================
// ConveyorProcessEngine – Industrial Conveyor & Optical Sorting Simulation
// Closed-Loop PLC Sorting Logic & Part Telemetry
// ============================================================

import { AppState } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { alarmManager } from '../core/AlarmManager';
import type { ConveyorEquipment } from '../equipment/ConveyorEquipment';

export class ConveyorProcessEngine {
  private conveyor: ConveyorEquipment;
  private isRunning = false;
  private autoSortQueue: number[] = []; // Timers for timed pusher actuation

  constructor(conveyor: ConveyorEquipment) {
    this.conveyor = conveyor;

    // Simulation events
    EventBus.on(Events.PROCESS_START, () => {
      if (AppState.activeExperiment === 'CONVEYOR') {
        if (alarmManager.isEStopLatched()) {
          alarmManager.raiseAlarm('ALM-001', 'E-STOP LATCHED', 'Cannot start conveyor: Emergency stop is active.', 'EMERGENCY', 'CONVEYOR');
          return;
        }
        this.start();
      }
    });

    EventBus.on('estop:triggered', () => {
      if (AppState.activeExperiment === 'CONVEYOR') {
        this.stop();
        AppState.setPLCState('FAULT');
      }
    });

    EventBus.on('estop:reset', () => {
      if (AppState.activeExperiment === 'CONVEYOR' && AppState.plcState === 'FAULT') {
        AppState.setPLCState('STOP');
      }
    });

    EventBus.on(Events.PROCESS_STOP, () => {
      if (AppState.activeExperiment === 'CONVEYOR') {
        this.stop();
      }
    });

    EventBus.on(Events.PROCESS_RESET, () => {
      if (AppState.activeExperiment === 'CONVEYOR') {
        this.reset();
      }
    });

    EventBus.on('conveyor:dispenseBox', () => {
      this.conveyor.spawnBox();
      AppState.incrementPartsTotal();
    });

    EventBus.on('conveyor:togglePusher', () => {
      const isExt = !AppState.diverterPusherExtended;
      this.setPusherState(isExt);
      if (isExt) {
        // Auto retract after 400ms stroke
        setTimeout(() => {
          this.setPusherState(false);
        }, 400);
      }
    });

    EventBus.on('conveyor:toggleMotor', () => {
      const newState = AppState.conveyorMotorState === 'ON' ? 'OFF' : 'ON';
      AppState.setConveyorMotorState(newState);
      this.conveyor.setRunning(newState === 'ON');
      if (newState === 'ON' && AppState.plcState !== 'RUN') {
        AppState.setPLCState('RUN');
      }
    });
  }

  start(): void {
    this.isRunning = true;
    AppState.setPLCState('RUN');
    AppState.setConveyorMotorState('ON');
    AppState.setBeltSpeed(0.5);
    this.conveyor.setRunning(true);
  }

  stop(): void {
    this.isRunning = false;
    AppState.setPLCState('STOP');
    AppState.setConveyorMotorState('OFF');
    AppState.setBeltSpeed(0);
    this.conveyor.setRunning(false);
  }

  reset(): void {
    this.stop();
    this.conveyor.reset();
    AppState.resetProcess();
  }

  setPusherState(extended: boolean): void {
    AppState.setDiverterPusherExtended(extended);
    this.conveyor.setPusher(extended);
  }

  update(dt: number): void {
    if (AppState.activeExperiment !== 'CONVEYOR') return;

    // Update 3D conveyor model & workpieces
    this.conveyor.update(
      dt,
      () => {
        // On box sorted
        AppState.incrementPartsSorted();
      },
      () => {
        // On box passed
        AppState.incrementPartsTotal();
      }
    );

    const sensorTripped = this.conveyor.getSensorTripped();
    if (sensorTripped !== AppState.opticalSensorDetected) {
      AppState.setOpticalSensorDetected(sensorTripped);

      // Automated PLC Closed-Loop Logic:
      // When sensor detects box, schedule diverter stroke when box reaches pusher station (~0.8s later)
      if (sensorTripped && AppState.controlMode === 'AUTO' && AppState.plcState === 'RUN') {
        this.autoSortQueue.push(0.72); // Travel delay in seconds
      }
    }

    // Process queued diverter strokes
    for (let i = this.autoSortQueue.length - 1; i >= 0; i--) {
      this.autoSortQueue[i] -= dt;
      if (this.autoSortQueue[i] <= 0) {
        this.autoSortQueue.splice(i, 1);
        // Fire pneumatic stroke
        this.setPusherState(true);
        setTimeout(() => {
          this.setPusherState(false);
        }, 380);
      }
    }
  }
}
