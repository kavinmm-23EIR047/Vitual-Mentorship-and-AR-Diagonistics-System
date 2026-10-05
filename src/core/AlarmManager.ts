// ============================================================
// AlarmManager – SCADA Alarm Engine & Real-Time Event Logger
// Industrial ISA-18.2 Alarm Management Lifecycle
// ============================================================

import { EventBus } from './EventBus';
import { soundManager } from './SoundManager';

export type AlarmSeverity = 'EMERGENCY' | 'CRITICAL' | 'WARNING' | 'INFO' | 'RESOLVED';

export interface AlarmRecord {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: AlarmSeverity;
  timestamp: string;
  rawTime: number;
  acknowledged: boolean;
  active: boolean;
  equipment: string;
}

export class AlarmManager {
  private alarms: AlarmRecord[] = [];
  private isSirenActive = false;
  private isSirenSilenced = false;
  private eStopLatched = false;

  constructor() {
    // Initial welcome / system boot log
    this.logInfo('SYS-001', 'System Initialized', 'Siemens S7-1200 Digital Twin Process Engine Online', 'PLC S7-1200');
  }

  private formatTime(): string {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  /**
   * Raise or update a process alarm
   */
  raiseAlarm(code: string, title: string, description: string, severity: AlarmSeverity, equipment: string): AlarmRecord {
    // Check if this alarm code is already active
    const existing = this.alarms.find((a) => a.code === code && a.active);
    if (existing) {
      return existing;
    }

    const alarm: AlarmRecord = {
      id: `alm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      code,
      title,
      description,
      severity,
      timestamp: this.formatTime(),
      rawTime: Date.now(),
      acknowledged: false,
      active: true,
      equipment,
    };

    this.alarms.unshift(alarm); // Newest on top
    if (this.alarms.length > 80) this.alarms.pop(); // Keep recent 80 logs

    // Trigger siren if critical or emergency
    if ((severity === 'CRITICAL' || severity === 'EMERGENCY') && !this.isSirenSilenced) {
      this.startSiren();
    }

    EventBus.emit('alarm:raised', alarm);
    EventBus.emit('alarm:changed', { activeAlarms: this.getActiveAlarms(), total: this.alarms.length });

    return alarm;
  }

  /** Compatibility API used by the fault-injection and gesture controllers. */
  triggerAlarm(code: string, title: string, severity: AlarmSeverity, description: string, equipment: string): AlarmRecord {
    return this.raiseAlarm(code, title, description, severity, equipment);
  }

  /**
   * Resolve an active alarm (equipment back to normal)
   */
  resolveAlarm(code: string, resolveMsg?: string): void {
    const existing = this.alarms.find((a) => a.code === code && a.active);
    if (existing) {
      existing.active = false;
      this.logInfo(
        `${code}-OK`,
        `Cleared: ${existing.title}`,
        resolveMsg || `Parameter returned to normal operating threshold.`,
        existing.equipment
      );

      // Stop siren if no other critical/emergency alarms remain active
      if (!this.hasActiveCritical()) {
        this.stopSiren();
      }

      EventBus.emit('alarm:resolved', { code });
      EventBus.emit('alarm:changed', { activeAlarms: this.getActiveAlarms(), total: this.alarms.length });
    }
  }

  /**
   * Log standard informational or state events
   */
  logInfo(code: string, title: string, description: string, equipment = 'SYSTEM'): void {
    const infoRecord: AlarmRecord = {
      id: `info_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      code,
      title,
      description,
      severity: 'INFO',
      timestamp: this.formatTime(),
      rawTime: Date.now(),
      acknowledged: true,
      active: false,
      equipment,
    };

    this.alarms.unshift(infoRecord);
    if (this.alarms.length > 80) this.alarms.pop();

    EventBus.emit('alarm:info', infoRecord);
    EventBus.emit('alarm:changed', { activeAlarms: this.getActiveAlarms(), total: this.alarms.length });
  }

  /**
   * Acknowledge specific alarm
   */
  acknowledge(id: string): void {
    const alarm = this.alarms.find((a) => a.id === id);
    if (alarm) {
      alarm.acknowledged = true;
      this.stopSiren();
      EventBus.emit('alarm:acknowledged', alarm);
      EventBus.emit('alarm:changed', { activeAlarms: this.getActiveAlarms(), total: this.alarms.length });
    }
  }

  /**
   * Acknowledge all active alarms and silence siren
   */
  acknowledgeAll(): void {
    for (const a of this.alarms) {
      if (a.active) a.acknowledged = true;
    }
    this.stopSiren();
    EventBus.emit('alarm:allAcknowledged');
    EventBus.emit('alarm:changed', { activeAlarms: this.getActiveAlarms(), total: this.alarms.length });
  }

  /**
   * Silence audible siren without resolving alarm state
   */
  toggleSilenceSiren(): boolean {
    this.isSirenSilenced = !this.isSirenSilenced;
    if (this.isSirenSilenced) {
      this.stopSiren();
    } else if (this.hasActiveCritical()) {
      this.startSiren();
    }
    EventBus.emit('alarm:silenceToggled', { silenced: this.isSirenSilenced });
    return this.isSirenSilenced;
  }

  /**
   * Trigger Emergency Stop (E-STOP)
   */
  triggerEStop(): void {
    this.eStopLatched = true;
    this.raiseAlarm(
      'ALM-001',
      'EMERGENCY STOP ACTIVATED',
      'Operator E-STOP initiated. All prime movers and actuators isolated to safe state.',
      'EMERGENCY',
      'SAFETY SYSTEM'
    );
    EventBus.emit('estop:triggered');
  }

  /** Compatibility name retained for emergency-stop gesture handling. */
  latchEStop(): void {
    this.triggerEStop();
  }

  /**
   * Reset Emergency Stop latch
   */
  resetEStop(): void {
    if (!this.eStopLatched) return;
    this.eStopLatched = false;
    this.resolveAlarm('ALM-001', 'E-Stop latch released by operator. Ready for system arming.');
    EventBus.emit('estop:reset');
  }

  isEStopLatched(): boolean {
    return this.eStopLatched;
  }

  startSiren(): void {
    if (this.isSirenSilenced) return;
    this.isSirenActive = true;
    soundManager.playAlarmSiren();
  }

  stopSiren(): void {
    this.isSirenActive = false;
    soundManager.stopAlarmSiren();
  }

  hasActiveCritical(): boolean {
    return this.alarms.some((a) => a.active && (a.severity === 'CRITICAL' || a.severity === 'EMERGENCY'));
  }

  getActiveAlarms(): AlarmRecord[] {
    return this.alarms.filter((a) => a.active);
  }

  getAllAlarms(): AlarmRecord[] {
    return this.alarms;
  }

  clearHistory(): void {
    this.alarms = this.alarms.filter((a) => a.active); // Keep active, clear historical
    EventBus.emit('alarm:changed', { activeAlarms: this.getActiveAlarms(), total: this.alarms.length });
  }
}

export const alarmManager = new AlarmManager();
