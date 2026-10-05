// ============================================================
// RobotProcessEngine.ts – 3-Axis Robotic Pick-and-Place Simulation
// Coordinated Cartesian Kinematics, Vacuum Handling & Cycle Telemetry
// ============================================================

import * as THREE from 'three';
import { AppState, type RobotCycleStep } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { alarmManager } from '../core/AlarmManager';
import type { RobotEquipment } from '../equipment/RobotEquipment';

export class RobotProcessEngine {
  private robot: RobotEquipment;
  private isRunning = false;
  private stepTimer = 0;
  private currentStep: RobotCycleStep = 'IDLE';

  // Interpolation targets
  private startX = 0;
  private startY = 0.5;
  private startZ = 0;
  private targetX = 0;
  private targetY = 0.5;
  private targetZ = 0;
  private stepDuration = 1.0;

  constructor(robot: RobotEquipment) {
    this.robot = robot;
    AppState.setRobotPose(0, 0.5, 0);
    this.robot.setPose(0, 0.5, 0);

    EventBus.on(Events.PROCESS_START, () => {
      if (AppState.activeExperiment === 'ROBOT') {
        if (alarmManager.isEStopLatched()) {
          alarmManager.raiseAlarm('ALM-001', 'E-STOP LATCHED', 'Cannot start robotic workcell: E-Stop active.', 'EMERGENCY', 'ROBOT');
          return;
        }
        this.start();
      }
    });

    EventBus.on(Events.PROCESS_STOP, () => {
      if (AppState.activeExperiment === 'ROBOT') {
        this.stop();
      }
    });

    EventBus.on(Events.PROCESS_RESET, () => {
      if (AppState.activeExperiment === 'ROBOT') {
        this.reset();
      }
    });

    EventBus.on('robot:triggerCycle', () => {
      if ((!this.isRunning || this.currentStep === 'IDLE') && AppState.plcState !== 'FAULT') {
        this.start();
      }
    });

    EventBus.on('robot:manualVacuumToggle', () => {
      const active = !AppState.robotVacuumActive;
      AppState.setRobotVacuumActive(active);
      this.robot.setVacuum(active);
    });

    EventBus.on('robot:spawnPart', () => {
      this.robot.spawnFeedPart();
      AppState.setRobotPartInFeed(true);
    });
  }

  start(): void {
    this.isRunning = true;
    AppState.setPLCState('RUN');
    this.setStep('MOVE_PICKUP');
  }

  stop(): void {
    this.isRunning = false;
    AppState.setPLCState('STOP');
    this.setStep('IDLE');
  }

  reset(): void {
    this.stop();
    this.robot.reset();
    AppState.resetProcess();
  }

  private setStep(step: RobotCycleStep): void {
    this.currentStep = step;
    AppState.setRobotCycleStep(step);
    this.stepTimer = 0;
    this.startX = AppState.robotX;
    this.startY = AppState.robotY;
    this.startZ = AppState.robotZ;

    switch (step) {
      case 'IDLE':
        this.targetX = 0.5;
        this.targetY = 0.5;
        this.targetZ = 0;
        this.stepDuration = 0.5;
        break;

      case 'MOVE_PICKUP':
        // Gantry traverses to in-feed part nest (X=0, Y=0.5, Z=0)
        this.targetX = 0;
        this.targetY = 0.5;
        this.targetZ = 0;
        this.stepDuration = 1.0;
        break;

      case 'LOWER_PICKUP':
        // Match the suction cup stroke to the top of the waiting workpiece.
        this.targetX = 0;
        this.targetY = 0.5;
        this.targetZ = 0.50;
        this.stepDuration = 0.8;
        break;

      case 'GRIP':
        // Engage vacuum solenoid valve
        AppState.setRobotVacuumActive(true);
        this.robot.setVacuum(true);
        AppState.setRobotPartHeld(true);
        this.robot.setPartHeld(true);
        AppState.setRobotPartInFeed(false);
        this.robot.setPartInFeed(false);
        this.stepDuration = 0.35;
        break;

      case 'LIFT_PICKUP':
        // Z lifts up with gripped part
        this.targetX = 0;
        this.targetY = 0.5;
        this.targetZ = 0;
        this.stepDuration = 0.6;
        break;

      case 'MOVE_PLACE':
        // Select the centerline of the next sorting bin.
        this.targetX = 1.0;
        this.targetY = AppState.robotPartsTransferred % 2 === 0 ? 0.17 : 0.83;
        this.targetZ = 0;
        this.stepDuration = 1.2;
        break;

      case 'LOWER_PLACE':
        // Z lowers over bin
        this.targetX = 1.0;
        this.targetY = AppState.robotPartsTransferred % 2 === 0 ? 0.17 : 0.83;
        this.targetZ = 0.57;
        this.stepDuration = 0.75;
        break;

      case 'RELEASE':
        // Release vacuum & drop part into bin
        AppState.setRobotVacuumActive(false);
        this.robot.setVacuum(false);
        this.robot.dropPartIntoBin(AppState.robotPartsTransferred % 2);
        AppState.incrementRobotParts();
        this.stepDuration = 0.35;
        break;

      case 'LIFT_PLACE':
        // Z retracts up
        this.targetX = 1.0;
        this.targetY = 0.5;
        this.targetZ = 0;
        this.stepDuration = 0.6;
        break;

      case 'HOME':
        // Return to home & spawn new part
        this.targetX = 0.5;
        this.targetY = 0.5;
        this.targetZ = 0;
        this.stepDuration = 0.8;
        setTimeout(() => {
          this.robot.spawnFeedPart();
          AppState.setRobotPartInFeed(true);
        }, 500);
        break;
    }
  }

  update(dt: number): void {
    if (AppState.activeExperiment !== 'ROBOT') return;

    this.robot.update(dt);

    if (!this.isRunning || AppState.plcState !== 'RUN') return;

    this.stepTimer += dt;
    const progress = Math.min(1.0, this.stepTimer / this.stepDuration);
    // Smooth ease in/out interpolation
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

    const currentX = THREE.MathUtils.lerp(this.startX, this.targetX, ease);
    const currentY = THREE.MathUtils.lerp(this.startY, this.targetY, ease);
    const currentZ = THREE.MathUtils.lerp(this.startZ, this.targetZ, ease);

    AppState.setRobotPose(currentX, currentY, currentZ);
    this.robot.setPose(currentX, currentY, currentZ);

    if (this.stepTimer >= this.stepDuration) {
      this.advanceCycle();
    }
  }

  private advanceCycle(): void {
    switch (this.currentStep) {
      case 'MOVE_PICKUP':
        this.setStep('LOWER_PICKUP');
        break;
      case 'LOWER_PICKUP':
        this.setStep('GRIP');
        break;
      case 'GRIP':
        this.setStep('LIFT_PICKUP');
        break;
      case 'LIFT_PICKUP':
        this.setStep('MOVE_PLACE');
        break;
      case 'MOVE_PLACE':
        this.setStep('LOWER_PLACE');
        break;
      case 'LOWER_PLACE':
        this.setStep('RELEASE');
        break;
      case 'RELEASE':
        this.setStep('LIFT_PLACE');
        break;
      case 'LIFT_PLACE':
        this.setStep('HOME');
        break;
      case 'HOME':
        if (AppState.controlMode === 'AUTO') {
          this.setStep('MOVE_PICKUP');
        } else {
          this.setStep('IDLE');
        }
        break;
      default:
        break;
    }
  }
}
