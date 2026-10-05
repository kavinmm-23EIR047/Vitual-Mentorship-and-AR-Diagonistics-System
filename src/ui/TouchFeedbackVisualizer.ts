// ============================================================
// TouchFeedbackVisualizer – Holographic Badges, Projections & Callouts
// ============================================================

import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

interface TouchRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface EquipmentCallout {
  id: string;
  name: string;
  sub?: string;
  worldPos: THREE.Vector3;
  element: HTMLElement;
  type: string;
}

export class TouchFeedbackVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ripples: TouchRipple[] = [];
  private animFrameId: number | null = null;

  // 3D Equipment callouts
  private labelContainer: HTMLElement;
  private callouts: EquipmentCallout[] = [];
  private calloutsVisible = true;

  private camera: THREE.Camera | null = null;
  private sourceWorldPos: THREE.Vector3 | null = null;
  private targetWorldPos: THREE.Vector3 | null = null;
  private labelsVisible = false;
  private activePointLabel: HTMLElement;
  private activePointName = '';
  private activeTargetName = '';

  constructor(canvasElement: HTMLCanvasElement, overlayContainer: HTMLElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // 3D Floating Equipment Badges Container
    this.labelContainer = document.createElement('div');
    this.labelContainer.className = 'terminal-labels-container';
    overlayContainer.appendChild(this.labelContainer);

    this.activePointLabel = document.createElement('div');
    this.activePointLabel.className = 'equipment-callout-badge callout-plc active-io-point-label';
    this.activePointLabel.innerHTML = '<div class="callout-indicator"></div><div class="callout-text"><span class="callout-name"></span><span class="callout-sub"></span></div>';
    this.activePointLabel.style.display = 'none';
    this.activePointLabel.style.transform = 'translate(-50%, -100%)';
    this.activePointLabel.style.zIndex = '30';
    this.labelContainer.appendChild(this.activePointLabel);

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

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /** Add persistent 3D equipment callout badge */
  addEquipmentCallout(id: string, name: string, sub: string, worldPos: THREE.Vector3, type = 'default'): void {
    const el = document.createElement('div');
    el.className = `equipment-callout-badge callout-${type}`;
    el.style.display = this.calloutsVisible ? 'flex' : 'none';
    el.innerHTML = `
      <div class="callout-indicator"></div>
      <div class="callout-text">
        <span class="callout-name">${name}</span>
        ${sub ? `<span class="callout-sub">${sub}</span>` : ''}
      </div>
    `;
    this.labelContainer.appendChild(el);
    this.callouts.push({ id, name, sub, worldPos, element: el, type });
  }

  setCalloutsVisible(visible: boolean): void {
    this.calloutsVisible = visible;
    for (const c of this.callouts) {
      c.element.style.display = visible ? 'flex' : 'none';
    }
  }

  toggleCallouts(): boolean {
    this.setCalloutsVisible(!this.calloutsVisible);
    return this.calloutsVisible;
  }

  getCalloutsVisible(): boolean {
    return this.calloutsVisible;
  }

  clearCallouts(): void {
    for (const c of this.callouts) {
      c.element.remove();
    }
    this.callouts = [];
  }

  /** Trigger subtle touch ripple */
  triggerTouchRipple(x: number, y: number, color = 'rgba(56, 189, 248, 0.7)'): void {
    this.ripples.push({
      x,
      y,
      radius: 4,
      maxRadius: 28,
      alpha: 0.85,
      color,
    });
  }

  /** Update active step source and destination positions */
  setActiveLabels(
    _stepNum: number,
    sourcePos: THREE.Vector3 | null,
    sourceName: string,
    targetPos: THREE.Vector3 | null,
    targetName: string
  ): void {
    this.sourceWorldPos = sourcePos ? sourcePos.clone() : null;
    this.targetWorldPos = targetPos ? targetPos.clone() : null;
    this.labelsVisible = !!(sourcePos && targetPos);
    this.activePointName = sourceName;
    this.activeTargetName = targetName;
  }

  hideLabels(): void {
    this.labelsVisible = false;
    this.activePointLabel.style.display = 'none';
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

    // 1. Draw ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += (r.maxRadius - r.radius) * 0.18 + 0.5;
      r.alpha *= 0.88;

      if (r.alpha < 0.03 || r.radius >= r.maxRadius - 1) {
        this.ripples.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = r.color;
      this.ctx.globalAlpha = r.alpha;
      this.ctx.lineWidth = 1.8;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Show one concise label at the active blinking PLC I/O point.
    if (this.camera && this.labelsVisible && this.sourceWorldPos) {
      const source = this.project3DToScreen(this.sourceWorldPos, this.camera);
      if (source) {
        this.activePointLabel.querySelector('.callout-name')!.textContent = this.activePointName;
        this.activePointLabel.querySelector('.callout-sub')!.textContent = `CONNECT TO · ${this.activeTargetName}`;
        this.activePointLabel.style.left = `${source.x}px`;
        this.activePointLabel.style.top = `${source.y - 34}px`;
        this.activePointLabel.style.display = 'flex';
      } else {
        this.activePointLabel.style.display = 'none';
      }
    } else {
      this.activePointLabel.style.display = 'none';
    }

    // 2. Draw animated wiring guidance trajectory between source and target
    if (this.camera && this.labelsVisible && this.sourceWorldPos && this.targetWorldPos) {
      const srcScreen = this.project3DToScreen(this.sourceWorldPos, this.camera);
      const tgtScreen = this.project3DToScreen(this.targetWorldPos, this.camera);

      if (srcScreen && tgtScreen) {
        this.drawWiringGuidance(srcScreen.x, srcScreen.y, tgtScreen.x, tgtScreen.y);
      }
    }

    // 3. Project equipment callouts only if visible
    if (this.camera && this.calloutsVisible) {
      for (const callout of this.callouts) {
        const p = this.project3DToScreen(callout.worldPos, this.camera);
        if (p) {
          callout.element.style.left = `${p.x}px`;
          callout.element.style.top = `${p.y}px`;
          callout.element.style.display = 'flex';
        } else {
          callout.element.style.display = 'none';
        }
      }
    }
  }

  private drawWiringGuidance(x1: number, y1: number, x2: number, y2: number): void {
    const time = performance.now() * 0.003;
    const dashOffset = -time * 20;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);

    // Smooth bezier curve connecting source and target
    const midX = (x1 + x2) / 2;
    const midY = Math.min(y1, y2) - 40;
    this.ctx.quadraticCurveTo(midX, midY, x2, y2);

    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    this.ctx.lineWidth = 2.2;
    this.ctx.setLineDash([6, 6]);
    this.ctx.lineDashOffset = dashOffset;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private project3DToScreen(worldPos: THREE.Vector3, camera: THREE.Camera): { x: number; y: number } | null {
    const v = worldPos.clone().project(camera);
    if (v.z > 1.0) return null; // Behind camera

    const x = ((v.x + 1) / 2) * window.innerWidth;
    const y = ((-v.y + 1) / 2) * window.innerHeight;
    return { x, y };
  }

  dispose(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.labelContainer.remove();
  }
}
