// ============================================================
// ARManager – WebXR session + webcam fallback & hand stream
// ============================================================

import { AppState } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import type * as THREE from 'three';

export class ARManager {
  private xrSupported = false;
  private currentStream: MediaStream | null = null;

  async checkSupport(): Promise<boolean> {
    if ('xr' in navigator) {
      try {
        this.xrSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');
      } catch {
        this.xrSupported = false;
      }
    }
    console.log(`[AR] WebXR immersive-ar supported: ${this.xrSupported}`);
    return this.xrSupported;
  }

  isSupported(): boolean {
    return this.xrSupported;
  }

  /**
   * Start AR mode.
   * If WebXR is unavailable, fall back to webcam overlay with hand tracking.
   */
  async startAR(renderer: THREE.WebGLRenderer): Promise<boolean> {
    if (this.xrSupported) {
      try {
        const session = await (navigator as any).xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
        });
        renderer.xr.enabled = true;
        await renderer.xr.setSession(session);
        AppState.setViewMode('AR');
        EventBus.emit(Events.AR_SESSION_START);
        return true;
      } catch (err) {
        console.warn('[AR] WebXR session failed:', err);
      }
    }

    // Fallback: webcam background + hand tracking
    return this.startWebcamFallback();
  }

  async startWebcamFallback(): Promise<boolean> {
    try {
      // Try user/selfie camera first (standard for laptop air gestures) or environment for phone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback to any available video device
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      this.currentStream = stream;
      const video = document.getElementById('camera-feed') as HTMLVideoElement;
      if (video) {
        video.srcObject = stream;
        await video.play();
        video.classList.add('active');
      }

      AppState.setViewMode('AR');
      EventBus.emit(Events.AR_SESSION_START);
      EventBus.emit('ar:videoReady', video);
      console.log('[AR] Webcam running and videoReady emitted');
      return true;
    } catch (err) {
      console.warn('[AR] Webcam access denied:', err);
      return false;
    }
  }

  stopAR(): void {
    const video = document.getElementById('camera-feed') as HTMLVideoElement;
    if (video && this.currentStream) {
      this.currentStream.getTracks().forEach((t) => t.stop());
      this.currentStream = null;
      video.srcObject = null;
      video.classList.remove('active');
    }
    AppState.setViewMode('PREVIEW_3D');
    EventBus.emit(Events.AR_SESSION_END);
  }
}
