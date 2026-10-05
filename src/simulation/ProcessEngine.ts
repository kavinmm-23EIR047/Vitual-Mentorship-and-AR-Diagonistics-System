// ============================================================
// ProcessEngine – Industrial Process & Closed-Loop Simulation
// Supports AUTO (PLC Closed-Loop) & MANUAL Control modes
// ============================================================

import { AppState } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { TANK_THRESHOLDS, TANK_FILL_RATE, TANK_DRAIN_RATE } from '../core/constants';
import { alarmManager } from '../core/AlarmManager';

export class ProcessEngine {
  private running = true;

  constructor() {
    EventBus.on(Events.PROCESS_START, () => {
      if (alarmManager.isEStopLatched()) {
        alarmManager.raiseAlarm('ALM-001', 'E-STOP LATCHED', 'Cannot start process: Emergency stop button is latched active.', 'EMERGENCY', 'SAFETY');
        return;
      }
      this.start();
    });
    EventBus.on(Events.PROCESS_STOP, () => this.stop());
    EventBus.on(Events.PROCESS_RESET, () => this.reset());

    EventBus.on('estop:triggered', () => {
      this.running = false;
      AppState.setPumpState('OFF');
      AppState.setValveState('OPEN'); // Fail-safe relief
      AppState.setPLCState('FAULT');
      this.updateFlowState();
    });

    EventBus.on('estop:reset', () => {
      if (AppState.plcState === 'FAULT') {
        AppState.setPLCState('STOP');
      }
    });

    EventBus.on(Events.SETPOINT_CHANGED, (target: number) => {
      AppState.targetLevel = target;
      if (AppState.controlMode === 'AUTO') {
        this.running = true;
        if (AppState.plcState !== 'FAULT') {
          AppState.setPLCState('RUN');
        }
      }
    });

    EventBus.on('control:toggleMode', () => {
      const newMode = AppState.controlMode === 'AUTO' ? 'MANUAL' : 'AUTO';
      AppState.setControlMode(newMode);
      if (newMode === 'AUTO') {
        this.running = true;
        if (AppState.plcState !== 'FAULT') {
          AppState.setPLCState('RUN');
        }
      }
      this.updateFlowState();
      EventBus.emit('control:modeChanged', { mode: newMode });
    });

    EventBus.on('control:togglePump', () => {
      const newState = AppState.pumpState === 'ON' ? 'OFF' : 'ON';
      AppState.setPumpState(newState);
      this.running = true;
      if (AppState.plcState === 'POWER_OFF' || AppState.plcState === 'STOP') {
        AppState.setPLCState('RUN');
      }
      this.updateFlowState();
    });

    EventBus.on('control:toggleValve', () => {
      const newState = AppState.valveState === 'OPEN' ? 'CLOSED' : 'OPEN';
      AppState.setValveState(newState);
      this.running = true;
      if (AppState.plcState === 'POWER_OFF' || AppState.plcState === 'STOP') {
        AppState.setPLCState('RUN');
      }
      this.updateFlowState();
    });

    EventBus.on('control:quickFill', () => {
      AppState.setTargetLevel(90);
      this.running = true;
      if (AppState.plcState !== 'FAULT') {
        AppState.setPLCState('RUN');
      }
      if (AppState.controlMode === 'MANUAL') {
        AppState.setPumpState('ON');
        AppState.setValveState('CLOSED');
      }
      this.updateFlowState();
    });

    EventBus.on('control:quickDrain', () => {
      AppState.setTargetLevel(10);
      this.running = true;
      if (AppState.plcState !== 'FAULT') {
        AppState.setPLCState('RUN');
      }
      if (AppState.controlMode === 'MANUAL') {
        AppState.setPumpState('OFF');
        AppState.setValveState('OPEN');
      }
      this.updateFlowState();
    });
  }

  start(): void {
    this.running = true;
    AppState.setPLCState('RUN');
    this.updateFlowState();
  }

  stop(): void {
    this.running = false;
    AppState.setPLCState('STOP');
    AppState.setPumpState('OFF');
    AppState.setValveState('CLOSED');
    AppState.setFlowState('STOPPED');
  }

  reset(): void {
    this.running = false;
    AppState.setTankLevel(0);
    AppState.setPumpState('OFF');
    AppState.setValveState('CLOSED');
    AppState.setFlowState('STOPPED');
    AppState.setSensorState('NORMAL');
    AppState.setPLCState('POWER_OFF');
  }

  /** Call each frame from main render loop */
  update(dt: number): void {
    if (AppState.plcState === 'POWER_OFF' && !this.running) return;

    if (AppState.controlMode === 'AUTO') {
      if (this.running || AppState.plcState === 'RUN') {
        this.runAutoLogic(dt);
      }
    } else if (AppState.controlMode === 'MANUAL') {
      this.runManualLogic(dt);
    }

    // Update sensor state & indicator tower lamps based on level
    this.updateSensor();
  }

  private runAutoLogic(dt: number): void {
    let level = AppState.tankLevel;
    const target = AppState.targetLevel;
    const tolerance = 0.5;

    if (level < target - tolerance) {
      // Level below target -> Engage pump to fill
      if (AppState.pumpState !== 'ON') AppState.setPumpState('ON');
      if (AppState.valveState !== 'CLOSED') AppState.setValveState('CLOSED');
      if (AppState.flowState !== 'ACTIVE') AppState.setFlowState('ACTIVE');

      const fillStep = TANK_FILL_RATE * dt * 60;
      level = Math.min(target, level + fillStep);
      AppState.setTankLevel(level);
    } else if (level > target + tolerance) {
      // Level above target -> Open valve to drain down to setpoint
      if (AppState.pumpState !== 'OFF') AppState.setPumpState('OFF');
      if (AppState.valveState !== 'OPEN') AppState.setValveState('OPEN');
      if (AppState.flowState !== 'ACTIVE') AppState.setFlowState('ACTIVE');

      const drainStep = TANK_DRAIN_RATE * 1.5 * dt * 60;
      level = Math.max(target, level - drainStep);
      AppState.setTankLevel(level);
    } else {
      // Target reached and holding steady
      if (AppState.pumpState !== 'OFF') AppState.setPumpState('OFF');
      if (AppState.valveState !== 'CLOSED') AppState.setValveState('CLOSED');
      if (AppState.flowState !== 'STOPPED') AppState.setFlowState('STOPPED');
    }

    // Overflow protection
    if (level >= TANK_THRESHOLDS.MAX) {
      AppState.setPumpState('OFF');
      AppState.setValveState('OPEN');
      AppState.setPLCState('FAULT');
      this.running = false;
    }
  }

  private runManualLogic(dt: number): void {
    let level = AppState.tankLevel;
    const pumpOn = AppState.pumpState === 'ON';
    const valveOpen = AppState.valveState === 'OPEN';

    if (pumpOn) {
      level += TANK_FILL_RATE * dt * 60;
    }
    if (valveOpen) {
      level -= TANK_DRAIN_RATE * 1.5 * dt * 60;
    }

    level = Math.max(0, Math.min(100, level));
    AppState.setTankLevel(level);
    this.updateFlowState();
  }

  private updateFlowState(): void {
    const pumpOn = AppState.pumpState === 'ON';
    const valveOpen = AppState.valveState === 'OPEN';
    const hasFlow = pumpOn || valveOpen;
    AppState.setFlowState(hasFlow ? 'ACTIVE' : 'STOPPED');
  }

  private updateSensor(): void {
    const level = AppState.tankLevel;

    if (level <= TANK_THRESHOLDS.LOW) {
      AppState.setSensorState('LOW');
      alarmManager.raiseAlarm(
        'ALM-102',
        'LOW LIQUID LEVEL STARVATION',
        `Tank liquid level dropped to ${Math.round(level)}% (<20% limit). Dry run cavitation risk.`,
        'WARNING',
        'Water Tank'
      );
      alarmManager.resolveAlarm('ALM-101');
      alarmManager.resolveAlarm('ALM-103');
    } else if (level >= TANK_THRESHOLDS.MAX) {
      AppState.setSensorState('HIGH');
      alarmManager.raiseAlarm(
        'ALM-103',
        'TANK MAXIMUM OVERFILL FAULT',
        `Tank volume reached 100% critical capacity. Automated fail-safe isolation triggered.`,
        'CRITICAL',
        'Water Tank'
      );
    } else if (level >= TANK_THRESHOLDS.HIGH) {
      AppState.setSensorState('HIGH');
      alarmManager.raiseAlarm(
        'ALM-101',
        'HIGH LIQUID LEVEL OVERFLOW',
        `Tank liquid level reached ${Math.round(level)}% (>80% limit). Inflow pump inhibited.`,
        'CRITICAL',
        'Water Tank'
      );
      alarmManager.resolveAlarm('ALM-102');
      alarmManager.resolveAlarm('ALM-103');
    } else {
      AppState.setSensorState('NORMAL');
      alarmManager.resolveAlarm('ALM-101');
      alarmManager.resolveAlarm('ALM-102');
      alarmManager.resolveAlarm('ALM-103');
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}

