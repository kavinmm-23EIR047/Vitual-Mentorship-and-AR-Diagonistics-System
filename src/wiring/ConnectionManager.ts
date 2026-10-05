// ============================================================
// ConnectionManager – Tracks connections, emits events
// ============================================================

import { AppState, type CompletedConnection } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { REQUIRED_CONNECTIONS } from './IOConfig';
import { validateConnection, type ValidationResult } from './ConnectionValidator';
import { VIBRATION } from '../core/constants';

export class ConnectionManager {
  constructor() {
    // Set required connections in state
    AppState.wiringProgress.required = REQUIRED_CONNECTIONS;
  }

  /**
   * Attempt a connection. Returns validation result.
   */
  attemptConnection(sourceId: string, targetId: string): ValidationResult {
    const result = validateConnection(sourceId, targetId);

    if (result.valid) {
      const conn: CompletedConnection = {
        source: sourceId,
        target: targetId,
        wireId: `wire_${sourceId}_${targetId}`,
      };
      AppState.addCorrectConnection(conn);

      // Haptic success
      this.vibrate(VIBRATION.SUCCESS);

      EventBus.emit(Events.FEEDBACK_SHOW, {
        type: 'success',
        title: 'Connection Correct',
        message: `${sourceId} → ${targetId}`,
      });
    } else {
      AppState.recordIncorrectAttempt();

      // Haptic error
      this.vibrate(VIBRATION.ERROR);

      EventBus.emit(Events.CONNECTION_INCORRECT, {
        source: sourceId,
        target: targetId,
        reason: result.reason,
        expectedTarget: result.expectedTarget,
        expectedLabel: result.expectedLabel,
      });

      EventBus.emit(Events.FEEDBACK_SHOW, {
        type: 'error',
        title: 'Incorrect Connection',
        message: result.reason || 'Invalid connection',
        hint: result.expectedLabel
          ? `Connect ${sourceId} to ${result.expectedLabel}`
          : undefined,
      });
    }

    return result;
  }

  /**
   * Reset all connections.
   */
  resetAll(): void {
    AppState.resetConnections();
  }

  /**
   * Check if system can start.
   */
  canStart(): { ready: boolean; missing: string[] } {
    const missing: string[] = [];
    for (const req of REQUIRED_CONNECTIONS) {
      const found = AppState.wiringProgress.completed.some(
        c => c.source === req.source && c.target === req.target
      );
      if (!found) {
        missing.push(req.label);
      }
    }
    return { ready: missing.length === 0, missing };
  }

  private vibrate(pattern: readonly number[]): void {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([...pattern]);
      }
    } catch {
      // Vibration not supported
    }
  }
}
