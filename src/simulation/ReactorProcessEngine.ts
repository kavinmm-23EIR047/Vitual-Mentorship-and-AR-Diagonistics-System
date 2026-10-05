// ============================================================
// ReactorProcessEngine.ts – Thermal Chemical Batch Mixing Simulation
// Recipe State Machine, Thermodynamics & Fluid Dynamics
// ============================================================

import { AppState, type ReactorBatchStep } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { alarmManager } from '../core/AlarmManager';
import type { ReactorEquipment } from '../equipment/ReactorEquipment';

export class ReactorProcessEngine {
  private reactor: ReactorEquipment;
  private isRunning = false;
  private stepTimer = 0;
  private holdTimer = 5.0;

  constructor(reactor: ReactorEquipment) {
    this.reactor = reactor;

    EventBus.on(Events.PROCESS_START, () => {
      if (AppState.activeExperiment === 'REACTOR') {
        if (alarmManager.isEStopLatched()) {
          alarmManager.raiseAlarm('ALM-001', 'E-STOP LATCHED', 'Cannot start reactor: Emergency stop is active.', 'EMERGENCY', 'REACTOR');
          return;
        }
        this.start();
      }
    });

    EventBus.on(Events.PROCESS_STOP, () => {
      if (AppState.activeExperiment === 'REACTOR') {
        this.stop();
      }
    });

    EventBus.on(Events.PROCESS_RESET, () => {
      if (AppState.activeExperiment === 'REACTOR') {
        this.reset();
      }
    });

    EventBus.on('reactor:toggleHeater', () => {
      const newState = AppState.reactorHeaterState === 'ON' ? 'OFF' : 'ON';
      AppState.setReactorHeater(newState);
      this.reactor.setHeater(newState);
    });

    EventBus.on('reactor:toggleAgitator', () => {
      const newState = AppState.reactorAgitatorState === 'ON' ? 'OFF' : 'ON';
      AppState.setReactorAgitator(newState, newState === 'ON' ? 650 : 0);
      this.reactor.setAgitator(newState, newState === 'ON' ? 650 : 0);
    });

    EventBus.on('reactor:toggleDrain', () => {
      const isDrain = AppState.reactorDrainValveState === 'OPEN';
      AppState.setReactorValves(AppState.reactorValveAState, AppState.reactorValveBState, isDrain ? 'CLOSED' : 'OPEN');
      this.reactor.setValves(AppState.reactorValveAState, AppState.reactorValveBState, isDrain ? 'CLOSED' : 'OPEN');
    });
  }

  start(): void {
    this.isRunning = true;
    AppState.setPLCState('RUN');
    this.setStep('DOSING_A');
  }

  stop(): void {
    this.isRunning = false;
    AppState.setPLCState('STOP');
    AppState.setReactorAgitator('OFF', 0);
    AppState.setReactorHeater('OFF');
    AppState.setReactorValves('CLOSED', 'CLOSED', 'CLOSED');
    this.reactor.setAgitator('OFF', 0);
    this.reactor.setHeater('OFF');
    this.reactor.setValves('CLOSED', 'CLOSED', 'CLOSED');
  }

  reset(): void {
    this.stop();
    this.reactor.reset();
    AppState.resetProcess();
  }

  private setStep(step: ReactorBatchStep): void {
    AppState.setReactorBatchStep(step, 0);
    this.stepTimer = 0;

    switch (step) {
      case 'IDLE':
        AppState.setReactorValves('CLOSED', 'CLOSED', 'CLOSED');
        AppState.setReactorAgitator('OFF', 0);
        AppState.setReactorHeater('OFF');
        this.reactor.setValves('CLOSED', 'CLOSED', 'CLOSED');
        this.reactor.setAgitator('OFF', 0);
        this.reactor.setHeater('OFF');
        break;

      case 'DOSING_A':
        // Open Reagent A Inlet Valve
        AppState.setReactorValves('OPEN', 'CLOSED', 'CLOSED');
        this.reactor.setValves('OPEN', 'CLOSED', 'CLOSED');
        break;

      case 'DOSING_B':
        // Close A, Open Reagent B Inlet Valve
        AppState.setReactorValves('CLOSED', 'OPEN', 'CLOSED');
        this.reactor.setValves('CLOSED', 'OPEN', 'CLOSED');
        break;

      case 'MIXING':
        // Close all valves, Start Agitator at 720 RPM
        AppState.setReactorValves('CLOSED', 'CLOSED', 'CLOSED');
        AppState.setReactorAgitator('ON', 720);
        this.reactor.setValves('CLOSED', 'CLOSED', 'CLOSED');
        this.reactor.setAgitator('ON', 720);
        break;

      case 'HEATING':
        // Turn on Electric Heating Jacket SSR Relay (%Q0.1)
        AppState.setReactorHeater('ON');
        this.reactor.setHeater('ON');
        break;

      case 'HOLDING':
        this.holdTimer = 5.0;
        break;

      case 'DRAINING':
        // Turn off heater, Open bottom discharge valve
        AppState.setReactorHeater('OFF');
        AppState.setReactorValves('CLOSED', 'CLOSED', 'OPEN');
        this.reactor.setHeater('OFF');
        this.reactor.setValves('CLOSED', 'CLOSED', 'OPEN');
        break;

      case 'COMPLETE':
        AppState.incrementReactorBatches();
        AppState.setReactorValves('CLOSED', 'CLOSED', 'CLOSED');
        AppState.setReactorAgitator('OFF', 0);
        this.reactor.setValves('CLOSED', 'CLOSED', 'CLOSED');
        this.reactor.setAgitator('OFF', 0);
        setTimeout(() => {
          if (this.isRunning && AppState.controlMode === 'AUTO') {
            this.setStep('DOSING_A');
          } else {
            this.setStep('IDLE');
          }
        }, 1500);
        break;
    }
  }

  update(dt: number): void {
    if (AppState.activeExperiment !== 'REACTOR') return;

    this.reactor.update(dt);

    if (AppState.controlMode === 'MANUAL') {
      this.runManualPhysics(dt);
      return;
    }

    if (!this.isRunning || AppState.plcState !== 'RUN') return;

    this.stepTimer += dt;
    let level = AppState.reactorFluidLevel;
    let temp = AppState.reactorTemp;

    switch (AppState.reactorBatchStep) {
      case 'DOSING_A':
        // Dose Reagent A (Blue) up to 40%
        level = Math.min(40, level + 18 * dt);
        AppState.setReactorFluid(level, '#38bdf8');
        this.reactor.setFluid(level, '#38bdf8');
        if (level >= 40) {
          this.setStep('DOSING_B');
        }
        break;

      case 'DOSING_B':
        // Dose Reagent B (Yellow) up to 80%
        level = Math.min(80, level + 18 * dt);
        AppState.setReactorFluid(level, '#06b6d4');
        this.reactor.setFluid(level, '#06b6d4');
        if (level >= 80) {
          this.setStep('MIXING');
        }
        break;

      case 'MIXING':
        // Blend reagents into emerald green
        if (this.stepTimer > 2.5) {
          AppState.setReactorFluid(level, '#10b981');
          this.reactor.setFluid(level, '#10b981');
          this.setStep('HEATING');
        }
        break;

      case 'HEATING':
        // Heat to 75°C
        temp = Math.min(75.0, temp + 12.0 * dt);
        AppState.setReactorTemp(temp);
        this.reactor.setTemp(temp);
        if (temp >= 75.0) {
          this.setStep('HOLDING');
        }
        break;

      case 'HOLDING':
        this.holdTimer -= dt;
        if (this.holdTimer <= 0) {
          this.setStep('DRAINING');
        }
        break;

      case 'DRAINING':
        // Discharge product liquid
        level = Math.max(0, level - 22 * dt);
        temp = Math.max(25.0, temp - 8 * dt);
        AppState.setReactorFluid(level, '#10b981');
        AppState.setReactorTemp(temp);
        this.reactor.setFluid(level, '#10b981');
        this.reactor.setTemp(temp);
        if (level <= 0) {
          this.setStep('COMPLETE');
        }
        break;
    }
  }

  private runManualPhysics(dt: number): void {
    let level = AppState.reactorFluidLevel;
    let temp = AppState.reactorTemp;

    if (AppState.reactorValveAState === 'OPEN') level = Math.min(100, level + 15 * dt);
    if (AppState.reactorValveBState === 'OPEN') level = Math.min(100, level + 15 * dt);
    if (AppState.reactorDrainValveState === 'OPEN') level = Math.max(0, level - 20 * dt);

    if (AppState.reactorHeaterState === 'ON') {
      temp = Math.min(98.0, temp + 10.0 * dt);
    } else {
      temp = Math.max(24.5, temp - 2.5 * dt);
    }

    AppState.setReactorFluid(level, level > 50 ? '#10b981' : '#38bdf8');
    AppState.setReactorTemp(temp);
    this.reactor.setFluid(level, level > 50 ? '#10b981' : '#38bdf8');
    this.reactor.setTemp(temp);

    // High temperature alarm
    if (temp > 85.0) {
      alarmManager.raiseAlarm('ALM-501', 'REACTOR HIGH TEMPERATURE WARNING', `Reaction core reached ${temp.toFixed(1)}°C. Approaching thermal runaway limit.`, 'WARNING', 'REACTOR');
    } else {
      alarmManager.resolveAlarm('ALM-501');
    }
  }
}
