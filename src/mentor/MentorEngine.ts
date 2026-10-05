// ============================================================
// MentorEngine – Step sequencing state machine
// ============================================================

import { AppState } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { MENTOR_STEPS, MENTOR_MESSAGES, type MentorStep } from './MentorSteps';

export class MentorEngine {
  private currentStep = 0;

  constructor() {
    // Listen for connection events
    EventBus.on(Events.CONNECTION_CORRECT, () => this.onCorrectConnection());
    EventBus.on(Events.CONNECTION_INCORRECT, () => this.onIncorrectConnection());
    EventBus.on(Events.WIRING_MODE_ENTER, () => this.onWiringEnter());
    EventBus.on(Events.ALL_CONNECTED, () => this.onAllComplete());
    EventBus.on(Events.CONNECTIONS_RESET, () => this.reset());
    EventBus.on(Events.PROCESS_START, () => this.onProcessStart());

    // Initial message
    this.emitMessage(MENTOR_MESSAGES.WELCOME, 'WAITING');
  }

  getCurrentStep(): MentorStep | null {
    if (this.currentStep >= MENTOR_STEPS.length) return null;
    return MENTOR_STEPS[this.currentStep];
  }

  private onWiringEnter(): void {
    const step = this.getCurrentStep();
    if (step) {
      this.emitMessage(step.instruction, 'GUIDING');
      AppState.setMentorStep(this.currentStep);
      AppState.setMentorState('GUIDING');
    }
  }

  private onCorrectConnection(): void {
    const step = this.getCurrentStep();
    if (step) {
      this.emitMessage(step.successMessage, 'CORRECT');
    }

    this.currentStep++;
    AppState.setMentorStep(this.currentStep);

    // Advance to next step after short delay
    setTimeout(() => {
      const next = this.getCurrentStep();
      if (next) {
        this.emitMessage(next.instruction, 'GUIDING');
        AppState.setMentorState('GUIDING');
      }
    }, 1500);
  }

  private onIncorrectConnection(): void {
    this.emitMessage(MENTOR_MESSAGES.INCORRECT, 'INCORRECT');
    AppState.setMentorState('INCORRECT');

    // Return to guiding after a moment
    setTimeout(() => {
      const step = this.getCurrentStep();
      if (step) {
        this.emitMessage(step.hint, 'GUIDING');
        AppState.setMentorState('GUIDING');
      }
    }, 2500);
  }

  private onAllComplete(): void {
    this.emitMessage(MENTOR_MESSAGES.ALL_COMPLETE, 'COMPLETE');
    AppState.setMentorState('COMPLETE');

    setTimeout(() => {
      this.emitMessage(MENTOR_MESSAGES.START_PROCESS, 'COMPLETE');
    }, 2000);
  }

  private onProcessStart(): void {
    this.emitMessage(MENTOR_MESSAGES.PROCESS_RUNNING, 'COMPLETE');
  }

  private reset(): void {
    this.currentStep = 0;
    AppState.setMentorStep(0);
    this.emitMessage(MENTOR_MESSAGES.ENTER_WIRING, 'WAITING');
    AppState.setMentorState('WAITING');
  }

  private emitMessage(message: string, state: string): void {
    EventBus.emit(Events.MENTOR_MESSAGE, {
      message,
      state,
      step: this.currentStep,
      totalSteps: MENTOR_STEPS.length,
    });
  }
}
