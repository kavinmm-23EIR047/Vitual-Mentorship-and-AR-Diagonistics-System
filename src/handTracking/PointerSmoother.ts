// ============================================================
// PointerSmoother – EMA filter + jitter suppression
// ============================================================

import { HAND } from '../core/constants';

export class PointerSmoother {
  private smoothX = 0;
  private smoothY = 0;
  private initialized = false;
  private alpha: number;

  constructor(alpha?: number) {
    this.alpha = alpha ?? HAND.SMOOTHING_FACTOR;
  }

  /**
   * Apply exponential moving average smoothing.
   */
  smooth(rawX: number, rawY: number): { x: number; y: number } {
    if (!this.initialized) {
      this.smoothX = rawX;
      this.smoothY = rawY;
      this.initialized = true;
    } else {
      this.smoothX += this.alpha * (rawX - this.smoothX);
      this.smoothY += this.alpha * (rawY - this.smoothY);
    }

    return { x: this.smoothX, y: this.smoothY };
  }

  /**
   * Reset smoother state.
   */
  reset(): void {
    this.initialized = false;
    this.smoothX = 0;
    this.smoothY = 0;
  }

  /**
   * Get current smoothed position.
   */
  getPosition(): { x: number; y: number } {
    return { x: this.smoothX, y: this.smoothY };
  }
}
