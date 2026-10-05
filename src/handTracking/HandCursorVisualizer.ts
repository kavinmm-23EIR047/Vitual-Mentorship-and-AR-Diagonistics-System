// ============================================================
// HandCursorVisualizer – Clean, Minimalist WebAR Pointer HUD
// Precision Reticle, Subtle Hand Skeleton & Non-Intrusive HUD
// ============================================================

import { soundManager } from '../core/SoundManager';
import type { RecognizedPose } from './CyberGestureController';

interface RippleWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface CyberActionNode {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  activeColor: string;
  isActive: boolean;
  actionText: string;
}

export class HandCursorVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ripples: RippleWave[] = [];
  private animFrameId: number | null = null;

  private fingerPos: { x: number; y: number } | null = null;
  private thumbPos: { x: number; y: number } | null = null;
  private isPinching = false;
  private pinchProgress = 0; // 0 to 1
  private hoverTarget: {
    label: string;
    type: 'terminal' | 'equipment' | 'none';
    color: string;
    actionHint?: string;
    laserTarget?: { x: number; y: number };
  } | null = null;
  private handLandmarks: Array<{ x: number; y: number; z: number }> | null = null;
  private isHandActive = false;

  // Cyber Gesture HUD State
  private recognizedPose: RecognizedPose = 'IDLE';
  private isSliderActive = false;
  private currentSliderPct = 70;
  private sliderPos: { x: number; y: number } | null = null;

  private pulseAngle = 0;

  constructor(canvasElement: HTMLCanvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startLoop();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setHandState(
    active: boolean,
    finger: { x: number; y: number } | null,
    thumb: { x: number; y: number } | null,
    pinching: boolean,
    landmarks?: Array<{ x: number; y: number; z: number }> | null
  ): void {
    this.isHandActive = active;
    this.fingerPos = finger;
    this.thumbPos = thumb;
    this.isPinching = pinching;
    this.handLandmarks = landmarks || null;
  }

  setRecognizedPose(pose: RecognizedPose): void {
    this.recognizedPose = pose;
  }

  setCyberSliderState(active: boolean, pct: number, pos?: { x: number; y: number }): void {
    this.isSliderActive = active;
    this.currentSliderPct = pct;
    if (pos) this.sliderPos = pos;
  }

  setActionNodes(_nodes: CyberActionNode[]): void {
    // Clean HUD: Action nodes omitted to avoid screen clutter
  }

  setHoverTarget(target: {
    label: string;
    type: 'terminal' | 'equipment' | 'none';
    color?: string;
    actionHint?: string;
    laserTarget?: { x: number; y: number };
  } | null): void {
    if (target && target.type !== 'none') {
      const isNew = !this.hoverTarget || this.hoverTarget.label !== target.label;
      this.hoverTarget = {
        label: target.label,
        type: target.type,
        color: target.color || (target.type === 'terminal' ? '#06b6d4' : '#38bdf8'),
        actionHint: target.actionHint,
        laserTarget: target.laserTarget,
      };
      if (isNew && this.fingerPos) {
        this.addRipple(this.fingerPos.x, this.fingerPos.y, 35, this.hoverTarget.color);
        soundManager.playCyberLaser();
      }
    } else {
      this.hoverTarget = null;
    }
  }

  addRipple(x: number, y: number, maxRadius = 35, color = 'rgba(6,182,212,0.7)'): void {
    this.ripples.push({
      x,
      y,
      radius: 4,
      maxRadius,
      alpha: 0.9,
      color,
    });
  }

  private startLoop(): void {
    const loop = () => {
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  private render(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.ctx.clearRect(0, 0, width, height);

    this.pulseAngle += 0.03;

    // Smooth pinch transition
    const targetPinch = this.isPinching ? 1 : 0;
    this.pinchProgress += (targetPinch - this.pinchProgress) * 0.25;

    // 1. Update & Draw Subtle Click Ripples
    this.updateRipples();

    // 2. Draw Subtle, Non-Intrusive Hand Skeleton
    if (this.isHandActive && this.handLandmarks && this.handLandmarks.length >= 21) {
      this.drawHandSkeleton(this.handLandmarks);
    }

    // 3. Draw Clean Laser Guideline (only when actively targeting an object)
    if (this.isHandActive && this.fingerPos && this.hoverTarget?.laserTarget) {
      this.drawLaserTracer(this.fingerPos, this.hoverTarget.laserTarget, this.hoverTarget.color);
    }

    // 4. Draw Clean Precision AR Pointer
    if (this.isHandActive && this.fingerPos) {
      this.drawCleanPointer(this.fingerPos.x, this.fingerPos.y);

      // 5. Draw Holographic Level Elevator Slider if active
      if (this.isSliderActive && this.sliderPos) {
        this.drawHolographicSlider(this.sliderPos.x, this.sliderPos.y, this.currentSliderPct);
      }

      // 6. Draw Recognized Pose Badge (Top Right HUD)
      this.drawPoseBadge(this.recognizedPose);
    }
  }

  /**
   * Clean, minimal precision AR pointer.
   */
  private drawCleanPointer(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();

    const isHover = !!this.hoverTarget;
    const mainColor = this.isPinching
      ? '#eab308' // Amber Gold on pinch
      : isHover
      ? this.hoverTarget!.color
      : '#06b6d4'; // Clean Cyan

    // Outer subtle precision ring
    const ringRadius = 9 * (1 - this.pinchProgress * 0.35);
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.6;
    ctx.shadowBlur = 6;
    ctx.shadowColor = mainColor;
    ctx.stroke();

    // Inner center dot
    const innerRadius = this.isPinching ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.isPinching ? '#fef08a' : '#ffffff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = mainColor;
    ctx.fill();

    // Hover tooltip/reticle only when targeting interactive elements
    if (this.hoverTarget) {
      this.drawHoverReticle(x, y, ringRadius, this.hoverTarget);
    }

    ctx.restore();
  }

  /**
   * Clean, minimal laser tracer to target.
   */
  private drawLaserTracer(from: { x: number; y: number }, to: { x: number; y: number }, color: string): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.setLineDash([]);

    // Small target dot at destination
    ctx.beginPath();
    ctx.arc(to.x, to.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw Clean Hover Label Tag.
   */
  private drawHoverReticle(
    x: number,
    y: number,
    radius: number,
    target: { label: string; type: string; color: string; actionHint?: string }
  ): void {
    const ctx = this.ctx;
    const boxWidth = Math.max(140, target.label.length * 7.5 + 24);
    const boxHeight = target.actionHint ? 34 : 22;
    const boxX = x + radius + 12;
    const boxY = y - boxHeight / 2;

    // HUD Label Box
    ctx.fillStyle = 'rgba(10, 14, 23, 0.9)';
    ctx.strokeStyle = target.color;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 6;
    ctx.shadowColor = target.color;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
    ctx.fill();
    ctx.stroke();

    // Main Text
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f1f5f9';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.textBaseline = target.actionHint ? 'top' : 'middle';

    const tagPrefix = target.type === 'terminal' ? '[IO] ' : '[EQ] ';
    ctx.fillText(tagPrefix + target.label, boxX + 6, target.actionHint ? boxY + 5 : y);

    // Action Hint Sub-label
    if (target.actionHint) {
      ctx.font = '500 8.5px "JetBrains Mono", monospace';
      ctx.fillStyle = target.color;
      ctx.fillText(`» ${target.actionHint}`, boxX + 6, boxY + 19);
    }
  }

  /**
   * Subtle, lightweight hand skeleton.
   */
  private drawHandSkeleton(landmarks: Array<{ x: number; y: number; z: number }>): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const fingers = [
      [0, 1, 2, 3, 4],    // Thumb
      [0, 5, 6, 7, 8],    // Index
      [0, 9, 10, 11, 12], // Middle
      [0, 13, 14, 15, 16],// Ring
      [0, 17, 18, 19, 20],// Pinky
      [5, 9, 13, 17],     // Palm base
    ];

    ctx.save();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.lineWidth = 1.0;

    for (const chain of fingers) {
      ctx.beginPath();
      for (let i = 0; i < chain.length; i++) {
        const pt = landmarks[chain[i]];
        if (!pt) continue;
        const sx = (1 - pt.x) * w;
        const sy = pt.y * h;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      if (!pt) continue;
      const sx = (1 - pt.x) * w;
      const sy = pt.y * h;
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const nodeRadius = isTip ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.arc(sx, sy, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? 'rgba(34, 211, 238, 0.5)' : 'rgba(148, 163, 184, 0.25)';
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Draw subtle click ripples.
   */
  private updateRipples(): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += (r.maxRadius - r.radius) * 0.14 + 0.5;
      r.alpha *= 0.90;

      if (r.alpha < 0.02 || r.radius >= r.maxRadius - 1) {
        this.ripples.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = r.color;
      this.ctx.globalAlpha = r.alpha;
      this.ctx.lineWidth = 1.2;
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  /**
   * Draw Floating Holographic Level Elevator Slider.
   */
  private drawHolographicSlider(x: number, y: number, pct: number): void {
    const ctx = this.ctx;
    const barHeight = 140;
    const barWidth = 12;
    const topY = y - barHeight / 2;
    const bottomY = y + barHeight / 2;

    ctx.save();

    // Background track panel
    ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(x, topY, barWidth + 50, barHeight, 5);
    ctx.fill();
    ctx.stroke();

    // Vertical Gauge Tube
    const tubeX = x + 6;
    const tubeWidth = 10;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(tubeX, topY + 6, tubeWidth, barHeight - 12, 3);
    ctx.fill();

    // Liquid Fill Column
    const fillHeight = ((barHeight - 12) * pct) / 100;
    const fillY = topY + 6 + (barHeight - 12 - fillHeight);

    const fillGrad = ctx.createLinearGradient(0, fillY, 0, bottomY - 6);
    fillGrad.addColorStop(0, '#38bdf8');
    fillGrad.addColorStop(1, '#0284c7');

    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(tubeX, fillY, tubeWidth, fillHeight, 3);
    ctx.fill();

    // Dynamic Target Value Pill
    ctx.fillStyle = '#10b981';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${pct}%`, x + 6, topY - 8);

    ctx.restore();
  }

  /**
   * Draw Recognized Hand Pose HUD Pill.
   */
  private drawPoseBadge(pose: RecognizedPose): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const badgeX = w - 150;
    const badgeY = 65;
    const badgeW = 135;
    const badgeH = 24;

    let text = 'IDLE';
    let color = '#06b6d4';

    if (pose === 'FIST_ESTOP') {
      text = 'CLOSED FIST [E-STOP]';
      color = '#ef4444';
    } else if (pose === 'LEVEL_SLIDER') {
      text = 'SLIDER ELEVATOR';
      color = '#10b981';
    } else if (pose === 'PINCH') {
      text = 'PINCH ACTIVE';
      color = '#eab308';
    } else if (pose === 'OPEN_PALM') {
      text = 'OPEN PALM';
      color = '#38bdf8';
    } else if (pose === 'POINTING') {
      text = 'SPATIAL POINT';
      color = '#06b6d4';
    } else if (pose === 'TWO_HAND_ROTATE') {
      text = '2-HAND 3D ROTATE';
      color = '#38bdf8';
    }

    ctx.save();
    ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, badgeX + badgeW / 2, badgeY + badgeH / 2);

    ctx.restore();
  }

  dispose(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}
