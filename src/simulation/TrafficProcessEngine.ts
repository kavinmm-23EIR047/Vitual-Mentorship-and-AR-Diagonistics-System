// ============================================================
// TrafficProcessEngine.ts – Smart Traffic & Pedestrian Simulation
// Real-Time Sequencer, Vehicle Inductive Detection & Crosswalk Logic
// ============================================================

import { AppState, type TrafficPhase, type PedWalkPhase } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { alarmManager } from '../core/AlarmManager';
import type { TrafficEquipment } from '../equipment/TrafficEquipment';

export class TrafficProcessEngine {
  private traffic: TrafficEquipment;
  private isRunning = false;
  private phaseTimeRemaining = 8;
  private pedCallActive = false;
  private previousPhase: TrafficPhase = 'ALL_RED';

  constructor(traffic: TrafficEquipment) {
    this.traffic = traffic;

    EventBus.on(Events.PROCESS_START, () => {
      if (AppState.activeExperiment === 'TRAFFIC') {
        if (alarmManager.isEStopLatched()) {
          alarmManager.raiseAlarm('ALM-001', 'E-STOP LATCHED', 'Cannot start traffic controller: E-Stop active.', 'EMERGENCY', 'TRAFFIC');
          return;
        }
        this.start();
      }
    });

    EventBus.on(Events.PROCESS_STOP, () => {
      if (AppState.activeExperiment === 'TRAFFIC') {
        this.stop();
      }
    });

    EventBus.on(Events.PROCESS_RESET, () => {
      if (AppState.activeExperiment === 'TRAFFIC') {
        this.reset();
      }
    });

    EventBus.on('traffic:pedCall', () => {
      this.triggerPedestrianCall();
    });

    EventBus.on('traffic:forcePhase', (phase: TrafficPhase) => {
      this.setPhase(phase, 8);
    });

    EventBus.on('traffic:toggleEmergency', () => {
      const active = !AppState.trafficEmergencyMode;
      AppState.setTrafficEmergencyMode(active);
      this.traffic.setEmergency(active);
      if (active) {
        alarmManager.raiseAlarm('ALM-301', 'EMERGENCY VEHICLE PRIORITY PREEMPTION', 'Avenue traffic cleared for emergency vehicle strobe corridor.', 'WARNING', 'TRAFFIC');
      } else {
        alarmManager.resolveAlarm('ALM-301');
      }
    });
  }

  start(): void {
    this.isRunning = true;
    AppState.setPLCState('RUN');
    this.previousPhase = 'ALL_RED';
    this.setPhase('MAIN_GREEN', 8);
  }

  stop(): void {
    this.isRunning = false;
    AppState.setPLCState('STOP');
    this.pedCallActive = false;
    AppState.setPedCallRequested(false);
    this.traffic.setPedButtonPressed(false);
    this.setPhase('ALL_RED', 999);
  }

  reset(): void {
    this.stop();
    this.traffic.resetCar();
    this.pedCallActive = false;
    this.previousPhase = 'ALL_RED';
    AppState.resetProcess();
  }

  triggerPedestrianCall(): void {
    this.pedCallActive = true;
    AppState.setPedCallRequested(true);
    this.traffic.setPedButtonPressed(true);

    // If currently on Main Green, accelerate switch to Yellow so pedestrian gets crossing promptly
    if (this.phaseTimeRemaining > 2.5 && AppState.trafficPhase === 'MAIN_GREEN') {
      this.phaseTimeRemaining = 2.5;
    }
  }

  setPhase(phase: TrafficPhase, durationSec: number): void {
    this.phaseTimeRemaining = durationSec;
    AppState.setTrafficPhase(phase, durationSec);
    this.traffic.setTrafficPhase(phase);

    if (phase === 'MAIN_GREEN' || phase === 'MAIN_YELLOW' || phase === 'CROSS_YELLOW' || phase === 'ALL_RED') {
      this.setPedSignal('DONT_WALK');
    }
  }

  private setPedSignal(phase: PedWalkPhase): void {
    AppState.setPedWalkPhase(phase);
    this.traffic.setPedWalkPhase(phase);
  }

  update(dt: number): void {
    if (AppState.activeExperiment !== 'TRAFFIC') return;

    // Update 3D Traffic Models & Vehicle movement
    this.traffic.update(dt, () => {
      AppState.incrementTrafficVehicles();
    });

    // Check inductive vehicle loop sensor
    const vehicleOverLoop = this.traffic.isCarOverSensor();
    if (vehicleOverLoop !== AppState.vehicleDetected) {
      AppState.setVehicleDetected(vehicleOverLoop);
    }

    if (!this.isRunning || AppState.plcState !== 'RUN') return;

    // Phase Sequencer Clock
    this.phaseTimeRemaining -= dt;
    AppState.trafficPhaseTimer = Math.max(0, Math.ceil(this.phaseTimeRemaining));

    if (this.phaseTimeRemaining <= 0) {
      this.advancePhase();
    }

    // Pedestrian Walk Signal Flash Logic (warning 2.5s before walk period ends)
    if (AppState.trafficPhase === 'MAIN_RED' && AppState.pedWalkPhase === 'WALK' && this.phaseTimeRemaining < 2.5) {
      this.setPedSignal('FLASHING');
    }
  }

  private advancePhase(): void {
    const current = AppState.trafficPhase;

    switch (current) {
      case 'MAIN_GREEN':
        // Main Green -> Main Yellow (3s)
        this.previousPhase = 'MAIN_GREEN';
        this.setPhase('MAIN_YELLOW', 3);
        break;

      case 'MAIN_YELLOW':
        // Main Yellow -> All Red Clearance (1.5s)
        this.previousPhase = 'MAIN_YELLOW';
        this.setPhase('ALL_RED', 1.5);
        break;

      case 'ALL_RED':
        if (this.previousPhase === 'CROSS_YELLOW') {
          // Returning to Main Street Green
          this.previousPhase = 'ALL_RED';
          this.setPhase('MAIN_GREEN', 8);
        } else {
          // Entering Cross Street Green & Pedestrian Walk
          this.beginCrossStreetAndWalk();
        }
        break;

      case 'MAIN_RED':
        // Cross Street Green / Walk -> Cross Street Yellow (3s)
        this.previousPhase = 'MAIN_RED';
        this.setPedSignal('DONT_WALK');
        this.setPhase('CROSS_YELLOW', 3);
        break;

      case 'CROSS_YELLOW':
      default:
        // Cross Street Yellow -> All Red Clearance (1.5s) before returning to Main
        this.previousPhase = 'CROSS_YELLOW';
        this.setPedSignal('DONT_WALK');
        this.setPhase('ALL_RED', 1.5);
        break;
    }
  }

  private beginCrossStreetAndWalk(): void {
    this.previousPhase = 'ALL_RED';
    // Cross Street gets GREEN, Pedestrian gets WALK
    this.setPhase('MAIN_RED', 7);
    this.pedCallActive = false;
    AppState.setPedCallRequested(false);
    this.traffic.setPedButtonPressed(false);
    this.setPedSignal('WALK');
  }
}
