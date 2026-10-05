// ============================================================
// HandCursorVisualizer – Futuristic Cyberpunk WebAR Hologram HUD
// Floating Action Rings, Holographic Level Slider, Laser Guidance & Reticles
// ============================================================

import { soundManager } from '../core/SoundManager';
import type { RecognizedPose } from './CyberGestureController';

interface BubbleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  wobble: number;
}

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
  private particles: BubbleParticle[] = [];
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
  private spawnTimer = 0;

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
    // Action nodes removed for clean HUD
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
        this.addRipple(this.fingerPos.x, this.fingerPos.y, 50, this.hoverTarget.color);
        soundManager.playCyberLaser();
      }
    } else {
      this.hoverTarget = null;
    }
  }

  addRipple(x: number, y: number, maxRadius = 50, color = 'rgba(6,182,212,0.8)'): void {
    this.ripples.push({
      x,
      y,
      radius: 5,
      maxRadius,
      alpha: 1.0,
      color,
    });
  }

  private spawnBubble(x: number, y: number, color = 'rgba(6, 182, 212, 0.7)'): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.8,
      radius: 3 + Math.random() * 6,
      color,
      alpha: 0.85,
      life: 0,
      maxLife: 35 + Math.random() * 25,
      wobble: Math.random() * Math.PI * 2,
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

    this.pulseAngle += 0.04;

    // Smooth pinch progress
    const targetPinch = this.isPinching ? 1 : 0;
    this.pinchProgress += (targetPinch - this.pinchProgress) * 0.22;

    // 1. Update & Draw Ripples
    this.updateRipples();

    // 3. Update & Draw Particles
    this.updateParticles();

    // 4. Draw Hand Skeleton with Cyber Joint Rings
    if (this.isHandActive && this.handLandmarks && this.handLandmarks.length >= 21) {
      this.drawHandSkeleton(this.handLandmarks);
    }

    // 5. Draw Laser Guideline to Focused 3D Object or Action Node
    if (this.isHandActive && this.fingerPos && this.hoverTarget?.laserTarget) {
      this.drawLaserTracer(this.fingerPos, this.hoverTarget.laserTarget, this.hoverTarget.color);
    }

    // 6. Draw Finger Cyber Reticle & HUD Tag
    if (this.isHandActive && this.fingerPos) {
      this.drawFingerBubble(this.fingerPos.x, this.fingerPos.y);

      // 7. Draw Holographic Level Elevator Slider if active
      if (this.isSliderActive && this.sliderPos) {
        this.drawHolographicSlider(this.sliderPos.x, this.sliderPos.y, this.currentSliderPct);
      }

      // 8. Draw Recognized Pose Badge (Top Right HUD)
      this.drawPoseBadge(this.recognizedPose);

      // Periodic cyber particle emission
      this.spawnTimer++;
      if (this.spawnTimer % 3 === 0) {
        const bubbleColor = this.isPinching
          ? 'rgba(234, 179, 8, 0.85)'
          : this.hoverTarget
          ? this.hoverTarget.color
          : 'rgba(6, 182, 212, 0.75)';
        this.spawnBubble(this.fingerPos.x, this.fingerPos.y, bubbleColor);
      }
    }
  }

  /**
   * Action nodes removed for clean HUD.
   */
  private drawActionNodes(): void {}

  /**
   * Draw Holographic Laser Targeting Guideline.
   */
  private drawLaserTracer(from: { x: number; y: number }, to: { x: number; y: number }, color: string): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing target reticle at destination
    ctx.beginPath();
    ctx.arc(to.x, to.y, 8 + Math.sin(this.pulseAngle * 4) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw Floating Holographic Level Elevator Slider.
   */
  private drawHolographicSlider(x: number, y: number, pct: number): void {
    const ctx = this.ctx;
    const barHeight = 160;
    const barWidth = 14;
    const topY = y - barHeight / 2;
    const bottomY = y + barHeight / 2;

    ctx.save();

    // Background track panel
    ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#06b6d4';
    ctx.beginPath();
    ctx.roundRect(x, topY, barWidth + 60, barHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Vertical Gauge Tube
    const tubeX = x + 8;
    const tubeWidth = 12;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(tubeX, topY + 8, tubeWidth, barHeight - 16, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Liquid Fill Column
    const fillHeight = ((barHeight - 16) * pct) / 100;
    const fillY = topY + 8 + (barHeight - 16 - fillHeight);

    const fillGrad = ctx.createLinearGradient(0, fillY, 0, bottomY - 8);
    fillGrad.addColorStop(0, '#38bdf8');
    fillGrad.addColorStop(0.5, '#06b6d4');
    fillGrad.addColorStop(1, '#0284c7');

    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(tubeX, fillY, tubeWidth, fillHeight, 4);
    ctx.fill();

    // Meniscus Glow Line
    ctx.beginPath();
    ctx.moveTo(tubeX - 2, fillY);
    ctx.lineTo(tubeX + tubeWidth + 2, fillY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#38bdf8';
    ctx.stroke();

    // Graduation Tick Marks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '600 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const ticks = [90, 75, 50, 25, 10];
    for (const t of ticks) {
      const tickY = topY + 8 + (barHeight - 16) * (1 - t / 100);
      ctx.fillRect(tubeX + tubeWidth + 3, tickY, 4, 1);
      ctx.fillText(`${t}%`, tubeX + tubeWidth + 10, tickY);
    }

    // Dynamic Target Value Pill
    ctx.fillStyle = '#10b981';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${pct}%`, x + 8, topY - 10);

    ctx.restore();
  }

  /**
   * Draw Recognized Hand Pose HUD Pill.
   */
  private drawPoseBadge(pose: RecognizedPose): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const badgeX = w - 160;
    const badgeY = 70;
    const badgeW = 145;
    const badgeH = 26;

    let text = 'IDLE';
    let glyph = '●';
    let color = '#06b6d4';

    if (pose === 'FIST_ESTOP') {
      text = 'CLOSED FIST [E-STOP]';
      glyph = '■';
      color = '#ef4444';
    } else if (pose === 'LEVEL_SLIDER') {
      text = 'SLIDER ELEVATOR';
      glyph = '▲';
      color = '#10b981';
    } else if (pose === 'PINCH') {
      text = 'PINCH ACTIVE';
      glyph = '◆';
      color = '#eab308';
    } else if (pose === 'OPEN_PALM') {
      text = 'OPEN PALM (READY)';
      glyph = '●';
      color = '#38bdf8';
    } else if (pose === 'POINTING') {
      text = 'SPATIAL POINT';
      glyph = '▶';
      color = '#06b6d4';
    }

    ctx.save();
    ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${glyph} ${text}`, badgeX + badgeW / 2, badgeY + badgeH / 2);

    ctx.restore();
  }

  private updateRipples(): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += (r.maxRadius - r.radius) * 0.12 + 0.5;
      r.alpha *= 0.92;

      if (r.alpha < 0.02 || r.radius >= r.maxRadius - 1) {
        this.ripples.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = r.color;
      this.ctx.globalAlpha = r.alpha;
      this.ctx.lineWidth = 2;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = r.color;
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx + Math.sin(p.wobble + p.life * 0.1) * 0.4;
      p.y += p.vy;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife || p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;

      const grad = this.ctx.createRadialGradient(
        p.x - p.radius * 0.3,
        p.y - p.radius * 0.3,
        p.radius * 0.1,
        p.x,
        p.y,
        p.radius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, p.color);
      grad.addColorStop(0.85, p.color);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = grad;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  private drawFingerBubble(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();

    const isHover = !!this.hoverTarget;
    const baseRadius = isHover ? 26 : 20;
    const currentRadius = baseRadius * (1 - this.pinchProgress * 0.35) + Math.sin(this.pulseAngle * 2) * 2;

    const mainColor = this.isPinching
      ? '#eab308' // Gold
      : isHover
      ? this.hoverTarget!.color
      : '#06b6d4'; // Cyan

    // Outer Energy Orbitals
    ctx.beginPath();
    ctx.arc(x, y, currentRadius + 8, this.pulseAngle, this.pulseAngle + Math.PI * 1.5);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 12;
    ctx.shadowColor = mainColor;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, currentRadius + 14, -this.pulseAngle * 1.2, -this.pulseAngle * 1.2 + Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Main Glass Water Bubble
    const bubbleGrad = ctx.createRadialGradient(
      x - currentRadius * 0.3,
      y - currentRadius * 0.3,
      currentRadius * 0.1,
      x,
      y,
      currentRadius
    );
    bubbleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    bubbleGrad.addColorStop(0.3, isHover ? 'rgba(56, 189, 248, 0.7)' : 'rgba(6, 182, 212, 0.55)');
    bubbleGrad.addColorStop(0.8, 'rgba(14, 165, 233, 0.25)');
    bubbleGrad.addColorStop(1, isHover ? 'rgba(56, 189, 248, 0.6)' : 'rgba(6, 182, 212, 0.45)');

    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = bubbleGrad;
    ctx.shadowBlur = 14;
    ctx.shadowColor = mainColor;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Hover Holographic Reticle & Action Hint
    if (this.hoverTarget) {
      this.drawHoverReticle(x, y, currentRadius, this.hoverTarget);
    }

    ctx.restore();
  }

  private drawHoverReticle(
    x: number,
    y: number,
    radius: number,
    target: { label: string; type: string; color: string; actionHint?: string }
  ): void {
    const ctx = this.ctx;
    const boxWidth = Math.max(170, target.label.length * 8 + 36);
    const boxHeight = target.actionHint ? 40 : 26;
    const boxX = x + radius + 16;
    const boxY = y - boxHeight / 2;

    const bracketSize = radius + 12;
    const offset = 6;
    ctx.strokeStyle = target.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = target.color;

    // Reticle brackets
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x - bracketSize, y - bracketSize + offset);
    ctx.lineTo(x - bracketSize, y - bracketSize);
    ctx.lineTo(x - bracketSize + offset, y - bracketSize);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + bracketSize - offset, y - bracketSize);
    ctx.lineTo(x + bracketSize, y - bracketSize);
    ctx.lineTo(x + bracketSize, y - bracketSize + offset);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x - bracketSize, y + bracketSize - offset);
    ctx.lineTo(x - bracketSize, y + bracketSize);
    ctx.lineTo(x - bracketSize + offset, y + bracketSize);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + bracketSize - offset, y + bracketSize);
    ctx.lineTo(x + bracketSize, y + bracketSize);
    ctx.lineTo(x + bracketSize, y + bracketSize - offset);
    ctx.stroke();

    // Connecting line to HUD tag
    ctx.beginPath();
    ctx.moveTo(x + radius + 2, y);
    ctx.lineTo(boxX, y);
    ctx.strokeStyle = target.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // HUD Label Box
    ctx.fillStyle = 'rgba(10, 14, 23, 0.9)';
    ctx.strokeStyle = target.color;
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = target.color;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
    ctx.fill();
    ctx.stroke();

    // Main Text
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f1f5f9';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.textBaseline = target.actionHint ? 'top' : 'middle';

    const tagPrefix = target.type === 'terminal' ? '[IO] ' : '[EQ] ';
    ctx.fillText(tagPrefix + target.label, boxX + 8, target.actionHint ? boxY + 6 : y);

    // Action Hint Sub-label
    if (target.actionHint) {
      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.fillStyle = target.color;
      ctx.fillText(`» ${target.actionHint}`, boxX + 8, boxY + 22);
    }
  }

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
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';

    for (const chain of fingers) {
      ctx.beginPath();
      for (let i = 0; i < chain.length; i++) {
        const pt = landmarks[chain[i]];
        const sx = (1 - pt.x) * w;
        const sy = pt.y * h;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      const sx = (1 - pt.x) * w;
      const sy = pt.y * h;
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const nodeRadius = isTip ? 4 : 2.5;

      ctx.beginPath();
      ctx.arc(sx, sy, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? '#22d3ee' : 'rgba(148, 163, 184, 0.6)';
      ctx.fill();
    }

    ctx.restore();
  }

  dispose(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}
