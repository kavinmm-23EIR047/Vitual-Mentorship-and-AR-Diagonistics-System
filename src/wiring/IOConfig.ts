// ============================================================
// IOConfig – Central PLC I/O wiring definitions for Multi-Experiments
// ============================================================

import type { ConnectionDef } from '../core/AppState';
import type { ExperimentType } from '../core/ExperimentConfig';

export interface IOTerminal {
  id: string;
  label: string;
  type: 'INPUT' | 'OUTPUT';
  target: string;
  positionOffset: { x: number; y: number; z: number };
}

export interface FieldTerminal {
  id: string;
  label: string;
  equipmentType: 'SENSOR' | 'PUMP' | 'VALVE' | 'ALARM' | 'CONVEYOR' | 'BUTTON';
}

// --- PLC I/O Terminals (Universal S7-1200 Terminal Strip) ---
export const PLC_TERMINALS: IOTerminal[] = [
  // INPUTS (Top terminal strip)
  {
    id: 'I0.0',
    label: 'DI 0 (%I0.0)',
    type: 'INPUT',
    target: 'LEVEL_SENSOR_LOW',
    positionOffset: { x: -0.09, y: 0.058, z: 0.025 },
  },
  {
    id: 'I0.1',
    label: 'DI 1 (%I0.1)',
    type: 'INPUT',
    target: 'LEVEL_SENSOR_HIGH',
    positionOffset: { x: -0.045, y: 0.058, z: 0.025 },
  },
  {
    id: 'I0.2',
    label: 'DI 2 (%I0.2)',
    type: 'INPUT',
    target: 'PUMP_FEEDBACK',
    positionOffset: { x: 0.005, y: 0.058, z: 0.025 },
  },
  {
    id: 'I0.3',
    label: 'DI 3 (%I0.3)',
    type: 'INPUT',
    target: 'VALVE_FEEDBACK',
    positionOffset: { x: 0.055, y: 0.058, z: 0.025 },
  },
  // OUTPUTS (Bottom terminal strip)
  {
    id: 'Q0.0',
    label: 'DO 0 (%Q0.0)',
    type: 'OUTPUT',
    target: 'PUMP_CONTROL',
    positionOffset: { x: -0.065, y: -0.058, z: 0.025 },
  },
  {
    id: 'Q0.1',
    label: 'DO 1 (%Q0.1)',
    type: 'OUTPUT',
    target: 'VALVE_CONTROL',
    positionOffset: { x: -0.015, y: -0.058, z: 0.025 },
  },
  {
    id: 'Q0.2',
    label: 'DO 2 (%Q0.2)',
    type: 'OUTPUT',
    target: 'ALARM_OUTPUT',
    positionOffset: { x: 0.035, y: -0.058, z: 0.025 },
  },
];

// --- Field Device Terminals for Experiment 1 (Water Tank) ---
export const TANK_FIELD_TERMINALS: FieldTerminal[] = [
  { id: 'LEVEL_SENSOR_LOW', label: 'Sensor OUT (Low Lamp)', equipmentType: 'SENSOR' },
  { id: 'LEVEL_SENSOR_HIGH', label: 'Sensor HIGH Lamp', equipmentType: 'SENSOR' },
  { id: 'PUMP_FEEDBACK', label: 'Pump Feedback', equipmentType: 'PUMP' },
  { id: 'VALVE_FEEDBACK', label: 'Valve Feedback', equipmentType: 'VALVE' },
  { id: 'PUMP_CONTROL', label: 'Pump Control', equipmentType: 'PUMP' },
  { id: 'VALVE_CONTROL', label: 'Valve Control', equipmentType: 'VALVE' },
  { id: 'ALARM_OUTPUT', label: 'Alarm Output', equipmentType: 'ALARM' },
];

// --- Field Device Terminals for Experiment 2 (Conveyor Sorting) ---
export const CONVEYOR_FIELD_TERMINALS: FieldTerminal[] = [
  { id: 'CONVEYOR_OPTICAL_SENSOR', label: 'Optical Sensor OUT', equipmentType: 'SENSOR' },
  { id: 'CONVEYOR_START_BTN', label: 'Start Pushbutton', equipmentType: 'BUTTON' },
  { id: 'CONVEYOR_MOTOR_DRIVE', label: 'Conveyor Motor Drive', equipmentType: 'CONVEYOR' },
  { id: 'CONVEYOR_PUSHER_VALVE', label: 'Pneumatic Diverter Valve', equipmentType: 'VALVE' },
];

// --- Required Connections for Experiment 1 (Water Tank) ---
export const TANK_REQUIRED_CONNECTIONS: ConnectionDef[] = [
  { source: 'I0.0', target: 'LEVEL_SENSOR_LOW', label: 'DI0 (%I0.0) → Sensor Low', type: 'INPUT' },
  { source: 'I0.1', target: 'LEVEL_SENSOR_HIGH', label: 'DI1 (%I0.1) → Sensor High', type: 'INPUT' },
  { source: 'Q0.0', target: 'PUMP_CONTROL', label: 'DO0 (%Q0.0) → Pump Control', type: 'OUTPUT' },
  { source: 'Q0.1', target: 'VALVE_CONTROL', label: 'DO1 (%Q0.1) → Valve Control', type: 'OUTPUT' },
];

// Backward-compatible names used by the original single-tank training modules.
export const REQUIRED_CONNECTIONS = TANK_REQUIRED_CONNECTIONS;

export function getExpectedTarget(source: string): { target: string; label: string } | null {
  const terminal = PLC_TERMINALS.find((item) => item.id === source);
  if (!terminal) return null;
  const required = TANK_REQUIRED_CONNECTIONS.find((item) => item.source === source);
  return {
    target: required?.target ?? terminal.target,
    label: required?.label ?? terminal.label,
  };
}

// --- Required Connections for Experiment 2 (Conveyor Sorting) ---
export const CONVEYOR_REQUIRED_CONNECTIONS: ConnectionDef[] = [
  { source: 'I0.0', target: 'CONVEYOR_OPTICAL_SENSOR', label: 'DI0 (%I0.0) → Optical Sensor OUT', type: 'INPUT' },
  { source: 'I0.1', target: 'CONVEYOR_START_BTN', label: 'DI1 (%I0.1) → Start Pushbutton', type: 'INPUT' },
  { source: 'Q0.0', target: 'CONVEYOR_MOTOR_DRIVE', label: 'DO0 (%Q0.0) → Conveyor Motor Drive', type: 'OUTPUT' },
  { source: 'Q0.1', target: 'CONVEYOR_PUSHER_VALVE', label: 'DO1 (%Q0.1) → Pneumatic Diverter Valve', type: 'OUTPUT' },
];

export function getRequiredConnections(exp: ExperimentType = 'TANK'): ConnectionDef[] {
  return exp === 'CONVEYOR' ? CONVEYOR_REQUIRED_CONNECTIONS : TANK_REQUIRED_CONNECTIONS;
}

export function isValidConnection(source: string, target: string, exp: ExperimentType = 'TANK'): boolean {
  const req = getRequiredConnections(exp);
  return req.some(c => c.source === source && c.target === target);
}

export function getTerminalType(id: string): 'INPUT' | 'OUTPUT' | null {
  const terminal = PLC_TERMINALS.find(t => t.id === id);
  return terminal?.type ?? null;
}
