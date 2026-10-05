// ============================================================
// EventBus – Typed pub/sub event system
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = (...args: any[]) => void;

class EventBusClass {
  private listeners: Map<string, Set<Listener>> = new Map();

  on(event: string, callback: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Listener): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(...args);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    });
  }

  once(event: string, callback: Listener): void {
    const wrapper: Listener = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const EventBus = new EventBusClass();

// Event name constants
export const Events = {
  // State
  STATE_CHANGED: 'state:changed',
  MODE_CHANGED: 'mode:changed',

  // PLC
  PLC_STATE_CHANGED: 'plc:stateChanged',
  PLC_LED_UPDATE: 'plc:ledUpdate',

  // Wiring
  WIRING_MODE_ENTER: 'wiring:enter',
  WIRING_MODE_EXIT: 'wiring:exit',
  WIRE_DRAG_START: 'wire:dragStart',
  WIRE_DRAG_UPDATE: 'wire:dragUpdate',
  WIRE_DRAG_END: 'wire:dragEnd',
  CONNECTION_CORRECT: 'connection:correct',
  CONNECTION_INCORRECT: 'connection:incorrect',
  CONNECTION_PROGRESS: 'connection:progress',
  ALL_CONNECTED: 'connection:allComplete',
  CONNECTIONS_RESET: 'connection:reset',

  // Process
  PROCESS_START: 'process:start',
  PROCESS_STOP: 'process:stop',
  PROCESS_RESET: 'process:reset',
  TANK_LEVEL_CHANGED: 'tank:levelChanged',
  PUMP_STATE_CHANGED: 'pump:stateChanged',
  VALVE_STATE_CHANGED: 'valve:stateChanged',
  FLOW_STATE_CHANGED: 'flow:stateChanged',
  SENSOR_STATE_CHANGED: 'sensor:stateChanged',

  // Hand Tracking
  HAND_DETECTED: 'hand:detected',
  HAND_LOST: 'hand:lost',
  FINGER_MOVE: 'finger:move',
  GESTURE_CHANGED: 'gesture:changed',

  // Mentor
  MENTOR_STEP_CHANGED: 'mentor:stepChanged',
  MENTOR_MESSAGE: 'mentor:message',

  // AR
  AR_SESSION_START: 'ar:sessionStart',
  AR_SESSION_END: 'ar:sessionEnd',
  AR_PLACED: 'ar:placed',

  // Equipment
  EQUIPMENT_SELECTED: 'equipment:selected',
  EQUIPMENT_DESELECTED: 'equipment:deselected',

  // UI
  FEEDBACK_SHOW: 'feedback:show',
  LOADING_PROGRESS: 'loading:progress',
  LOADING_COMPLETE: 'loading:complete',
} as const;
