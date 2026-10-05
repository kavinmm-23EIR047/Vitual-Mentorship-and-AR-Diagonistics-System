// ============================================================
// MentorSteps – Declarative step definitions
// ============================================================

import { REQUIRED_CONNECTIONS } from '../wiring/IOConfig';

export interface MentorStep {
  index: number;
  sourceId: string;
  targetId: string;
  instruction: string;
  hint: string;
  successMessage: string;
}

export const MENTOR_STEPS: MentorStep[] = REQUIRED_CONNECTIONS.map((conn, i) => ({
  index: i,
  sourceId: conn.source,
  targetId: conn.target,
  instruction: `Connect PLC ${conn.source} to ${conn.target.replace(/_/g, ' ')}`,
  hint: `Point your finger at ${conn.source} on the PLC, then drag to the ${conn.target.replace(/_/g, ' ')} terminal.`,
  successMessage: `Correct! ${conn.source} is now connected to ${conn.target.replace(/_/g, ' ')}.`,
}));

export const MENTOR_MESSAGES = {
  WELCOME: 'Welcome to PLC Wiring Training. Let\'s connect the field devices to the PLC terminals.',
  ENTER_WIRING: 'Press "Wiring Mode" to begin connecting terminals.',
  STEP_PREFIX: 'Step',
  ALL_COMPLETE: 'All connections verified! The system is ready to start.',
  INCORRECT: 'That connection is incorrect. Check the terminal labels and try again.',
  START_PROCESS: 'Press "Start" to begin the tank level control process.',
  PROCESS_RUNNING: 'The PLC is running. Watch the tank level, pump, and valve respond to the control logic.',
  TARGET_REACHED: 'Target level reached! The PLC has stopped the pump and closed the valve.',
} as const;
