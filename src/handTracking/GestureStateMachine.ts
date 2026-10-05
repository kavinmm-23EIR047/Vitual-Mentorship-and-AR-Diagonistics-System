// ============================================================
// GestureStateMachine – IDLE → HOVER → DRAG → RELEASE
// ============================================================

import { AppState } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import type { GestureState } from '../core/constants';

export class GestureStateMachine {
  private state: GestureState = 'IDLE';
  private hoverTerminalId: string | null = null;
  private dragSourceId: string | null = null;
  private hoverStartTime = 0;
  private readonly DWELL_GRAB_MS = 450; // ms to auto-grab if holding without pinch

  getState(): GestureState {
    return this.state;
  }

  getDragSource(): string | null {
    return this.dragSourceId;
  }

  getHoverTerminal(): string | null {
    return this.hoverTerminalId;
  }

  /**
   * Called when finger is over a terminal.
   */
  onTerminalHover(terminalId: string): void {
    if (this.state === 'IDLE' || this.state === 'POINTING') {
      if (this.hoverTerminalId !== terminalId) {
        this.hoverTerminalId = terminalId;
        this.hoverStartTime = Date.now();
      } else if (Date.now() - this.hoverStartTime > this.DWELL_GRAB_MS) {
        // Dwell auto-start drag
        this.startDrag(terminalId);
        return;
      }
      this.setState('HOVER');
    } else if (this.state === 'DRAGGING') {
      this.hoverTerminalId = terminalId;
    }
  }

  /**
   * Called when finger is NOT over any terminal.
   */
  onNoHover(): void {
    if (this.state === 'HOVER') {
      this.hoverTerminalId = null;
      this.setState('POINTING');
    } else if (this.state === 'DRAGGING') {
      this.hoverTerminalId = null;
    }
  }

  /**
   * Pinch trigger on current hovered terminal.
   */
  onPinchStart(): void {
    if ((this.state === 'HOVER' || this.state === 'POINTING') && this.hoverTerminalId) {
      this.startDrag(this.hoverTerminalId);
    }
  }

  /**
   * Pinch release trigger.
   */
  onPinchEnd(): void {
    if (this.state === 'DRAGGING') {
      if (this.hoverTerminalId && this.dragSourceId) {
        this.confirmRelease(this.hoverTerminalId);
      } else {
        this.cancelDrag();
      }
    }
  }

  /**
   * Called when finger is detected.
   */
  onFingerDetected(): void {
    if (this.state === 'IDLE') {
      this.setState('POINTING');
    }
  }

  /**
   * Called when finger is lost.
   */
  onFingerLost(): void {
    if (this.state === 'DRAGGING') {
      this.cancelDrag();
    }
    this.dragSourceId = null;
    this.hoverTerminalId = null;
    this.setState('IDLE');
  }

  /**
   * Explicitly release / confirm connection.
   */
  confirmRelease(targetId: string): void {
    if (this.state === 'DRAGGING' && this.dragSourceId) {
      const source = this.dragSourceId;
      this.setState('RELEASED');
      EventBus.emit(Events.WIRE_DRAG_END, {
        source,
        target: targetId,
      });
      this.dragSourceId = null;
      this.hoverTerminalId = null;
      this.setState('IDLE');
    }
  }

  /**
   * Start a drag from a specific terminal.
   */
  startDrag(sourceId: string): void {
    this.dragSourceId = sourceId;
    this.setState('DRAGGING');
    EventBus.emit(Events.WIRE_DRAG_START, sourceId);
  }

  /**
   * Cancel current drag.
   */
  cancelDrag(): void {
    if (this.state === 'DRAGGING') {
      EventBus.emit('wire:dragCancel', this.dragSourceId);
    }
    this.dragSourceId = null;
    this.hoverTerminalId = null;
    this.setState('IDLE');
  }

  private setState(newState: GestureState): void {
    if (this.state !== newState) {
      this.state = newState;
      AppState.handTracking.gestureState = newState;
      EventBus.emit(Events.GESTURE_CHANGED, newState);
    }
  }

  reset(): void {
    this.dragSourceId = null;
    this.hoverTerminalId = null;
    this.setState('IDLE');
  }
}
