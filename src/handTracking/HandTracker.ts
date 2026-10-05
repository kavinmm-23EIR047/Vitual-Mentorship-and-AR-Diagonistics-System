// ============================================================
// HandTracker – Robust MediaPipe Hands wrapper with pinch, grab & rotation gestures
// ============================================================

import { EventBus, Events } from '../core/EventBus';
import { AppState } from '../core/AppState';
import { PointerSmoother } from './PointerSmoother';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResults {
  multiHandLandmarks?: HandLandmark[][];
  multiHandedness?: Array<{ label: string; score: number }>;
}

export class HandTracker {
  private video: HTMLVideoElement | null = null;
  private hands: any = null;
  private isInitialized = false;
  private isRunning = false;
  private isProcessingFrame = false;
  private lastTwoHandCenter: { x: number; y: number } | null = null;
  private animFrameId: number | null = null;

  private indexSmoother = new PointerSmoother(0.35);
  private thumbSmoother = new PointerSmoother(0.35);

  private lastFingerPos: { x: number; y: number } | null = null;
  private lastThumbPos: { x: number; y: number } | null = null;
  private isPinching = false;
  private rawLandmarks: HandLandmark[] | null = null;

  private lastHandAngle: number | null = null;
  private lastWristX: number | null = null;
  private lastWristY: number | null = null;

  /**
   * Initialize hand tracking with video element feed.
   */
  async init(videoElement: HTMLVideoElement): Promise<boolean> {
    this.video = videoElement;

    try {
      // Ensure MediaPipe Hands is loaded (wait up to 3s if script is still downloading)
      let mpHands = (window as any).Hands;
      if (!mpHands) {
        let attempts = 0;
        while (!mpHands && attempts < 15) {
          await new Promise((r) => setTimeout(r, 200));
          mpHands = (window as any).Hands;
          attempts++;
        }
      }

      if (!mpHands) {
        console.warn('[HandTracker] MediaPipe Hands script not ready.');
        return false;
      }

      this.hands = new mpHands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0, // Lite for fast real-time 60fps response
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.hands.onResults((results: HandResults) => this.onResults(results));

      this.isInitialized = true;
      this.startProcessingLoop();
      console.log('[HandTracker] Initialized and processing loop started.');
      return true;
    } catch (err) {
      console.warn('[HandTracker] Initialization error:', err);
      return false;
    }
  }

  private startProcessingLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const processFrame = async () => {
      if (!this.isRunning) return;

      if (
        this.video &&
        this.video.readyState >= 2 &&
        !this.video.paused &&
        this.hands &&
        !this.isProcessingFrame
      ) {
        try {
          this.isProcessingFrame = true;
          await this.hands.send({ image: this.video });
        } catch {
          // ignore transient dropped frames
        } finally {
          this.isProcessingFrame = false;
        }
      }

      this.animFrameId = requestAnimationFrame(processFrame);
    };

    this.animFrameId = requestAnimationFrame(processFrame);
  }

  private onResults(results: HandResults): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        if (results.multiHandLandmarks.length >= 2) {
          const first = results.multiHandLandmarks[0][8];
          const second = results.multiHandLandmarks[1][8];
          const firstX = (1 - first.x) * w;
          const firstY = first.y * h;
          const secondX = (1 - second.x) * w;
          const secondY = second.y * h;
          const center = { x: (firstX + secondX) / 2, y: (firstY + secondY) / 2 };
          EventBus.emit('hand:twoHandMove', {
            centerX: center.x,
            centerY: center.y,
            deltaX: this.lastTwoHandCenter ? center.x - this.lastTwoHandCenter.x : 0,
            deltaY: this.lastTwoHandCenter ? center.y - this.lastTwoHandCenter.y : 0,
            distance: Math.hypot(firstX - secondX, firstY - secondY),
          });
          this.lastTwoHandCenter = center;
        } else {
          this.lastTwoHandCenter = null;
        }
      const landmarks = results.multiHandLandmarks[0];
      this.rawLandmarks = landmarks;

      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      const wrist = landmarks[0];
      const middleMcp = landmarks[9];

      if (indexTip && thumbTip) {
        // Raw mirrored screen positions
        const rawIndexX = (1 - indexTip.x) * w;
        const rawIndexY = indexTip.y * h;

        const rawThumbX = (1 - thumbTip.x) * w;
        const rawThumbY = thumbTip.y * h;

        // Smoothed screen positions
        const smoothIndex = this.indexSmoother.smooth(rawIndexX, rawIndexY);
        const smoothThumb = this.thumbSmoother.smooth(rawThumbX, rawThumbY);

        this.lastFingerPos = smoothIndex;
        this.lastThumbPos = smoothThumb;

        // Euclidean distance between thumb tip and index tip
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const dz = (indexTip.z || 0) - (thumbTip.z || 0);
        const rawPinchDist = Math.hypot(dx, dy, dz);

        // Palm scale reference (wrist to middle MCP knuckle) for distance invariance
        const palmDist = (wrist && middleMcp)
          ? Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y)
          : 0.22;
        const normalizedPinchRatio = rawPinchDist / Math.max(0.08, palmDist);

        // Adaptive hysteresis threshold: enter pinch < 0.32, exit pinch > 0.44
        if (!this.isPinching && (normalizedPinchRatio < 0.32 || rawPinchDist < 0.065)) {
          this.isPinching = true;
          EventBus.emit('hand:pinchStart', { x: smoothIndex.x, y: smoothIndex.y, pinchDist: rawPinchDist });
        } else if (this.isPinching && (normalizedPinchRatio > 0.44 && rawPinchDist > 0.09)) {
          this.isPinching = false;
          EventBus.emit('hand:pinchEnd', { x: smoothIndex.x, y: smoothIndex.y, pinchDist: rawPinchDist });
        }

        // Hand rotation gesture calculation (wrist to middle knuckle angle & position)
        if (wrist && middleMcp) {
          const currentAngle = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x);
          const currentWristX = (1 - wrist.x) * w;
          const currentWristY = wrist.y * h;

          if (this.lastHandAngle !== null && this.lastWristX !== null && this.lastWristY !== null) {
            let deltaAngle = currentAngle - this.lastHandAngle;
            // Normalize angle delta
            if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
            if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

            const deltaWristX = currentWristX - this.lastWristX;
            const deltaWristY = currentWristY - this.lastWristY;

            EventBus.emit('hand:rotate', {
              deltaAngle,
              deltaX: deltaWristX,
              deltaY: deltaWristY,
              angle: currentAngle,
            });
          }

          this.lastHandAngle = currentAngle;
          this.lastWristX = currentWristX;
          this.lastWristY = currentWristY;
        }

        const confidence = results.multiHandedness?.[0]?.score ?? 0.85;
        AppState.setHandTracking(true, confidence, smoothIndex, this.isPinching ? 'DRAGGING' : 'POINTING');

        EventBus.emit(Events.FINGER_MOVE, {
          x: smoothIndex.x,
          y: smoothIndex.y,
          thumbX: smoothThumb.x,
          thumbY: smoothThumb.y,
          isPinching: this.isPinching,
          pinchDist: rawPinchDist,
          landmarks,
        });
      }
    } else {
      if (this.lastFingerPos) {
        this.lastTwoHandCenter = null;
        this.lastFingerPos = null;
        this.lastThumbPos = null;
        this.isPinching = false;
        this.rawLandmarks = null;
        this.lastHandAngle = null;
        this.lastWristX = null;
        this.lastWristY = null;
        this.indexSmoother.reset();
        this.thumbSmoother.reset();
        AppState.setHandTracking(false, 0, null, 'IDLE');
        EventBus.emit(Events.HAND_LOST);
      }
    }
  }

  getFingerPosition(): { x: number; y: number } | null {
    return this.lastFingerPos;
  }

  getThumbPosition(): { x: number; y: number } | null {
    return this.lastThumbPos;
  }

  getPinching(): boolean {
    return this.isPinching;
  }

  getLandmarks(): HandLandmark[] | null {
    return this.rawLandmarks;
  }

  isActive(): boolean {
    return this.isInitialized && this.isRunning;
  }

  dispose(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.hands?.close();
  }
}
