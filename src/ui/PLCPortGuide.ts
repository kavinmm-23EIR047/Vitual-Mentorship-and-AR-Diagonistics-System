// ============================================================
// PLCPortGuide – Interactive 3D Arrow Callout Guide for Siemens S7-1200 Ports
// Points arrows directly to each I/O terminal and explains its purpose & signal type
// ============================================================

import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import type { PLCEquipment } from '../equipment/PLCEquipment';

export interface PLCPortGuideItem {
  id: string;
  tag: string;
  type: 'DI' | 'DO' | 'PWR' | 'ETH' | 'LED';
  name: string;
  purpose: string;
  detail: string;
  voltage: string;
  localOffset: THREE.Vector3;
  direction: 'TOP' | 'BOTTOM' | 'LEFT';
  staggerIndex: number;
}

export const PLC_PORT_DEFINITIONS: PLCPortGuideItem[] = [
  // --- DIGITAL INPUTS (Top Terminal Strip) ---
  {
    id: 'I0.0',
    tag: '%I0.0',
    type: 'DI',
    name: 'DI 0 (Digital Input 0)',
    purpose: 'Low Level Sensor (L0)',
    detail: 'Monitors minimum water threshold (20%). Trips when tank is empty to prevent pump dry-running.',
    voltage: '24V DC (Sink/Source)',
    localOffset: new THREE.Vector3(-0.09, 0.058, 0.025),
    direction: 'TOP',
    staggerIndex: 0,
  },
  {
    id: 'I0.1',
    tag: '%I0.1',
    type: 'DI',
    name: 'DI 1 (Digital Input 1)',
    purpose: 'High Level Sensor (L1)',
    detail: 'Monitors maximum water threshold (80%). Trips to prevent tank overfilling.',
    voltage: '24V DC (Sink/Source)',
    localOffset: new THREE.Vector3(-0.045, 0.058, 0.025),
    direction: 'TOP',
    staggerIndex: 1,
  },
  {
    id: 'I0.2',
    tag: '%I0.2',
    type: 'DI',
    name: 'DI 2 (Digital Input 2)',
    purpose: 'Pump Motor Feedback',
    detail: 'Auxiliary contact feedback from pump starter contactor confirming motor rotation.',
    voltage: '24V DC',
    localOffset: new THREE.Vector3(0.005, 0.058, 0.025),
    direction: 'TOP',
    staggerIndex: 0,
  },
  {
    id: 'I0.3',
    tag: '%I0.3',
    type: 'DI',
    name: 'DI 3 (Digital Input 3)',
    purpose: 'Valve Position Feedback',
    detail: 'Limit switch feedback indicating isolation valve open/closed state.',
    voltage: '24V DC',
    localOffset: new THREE.Vector3(0.055, 0.058, 0.025),
    direction: 'TOP',
    staggerIndex: 1,
  },

  // --- DIGITAL OUTPUTS (Bottom Terminal Strip) ---
  {
    id: 'Q0.0',
    tag: '%Q0.0',
    type: 'DO',
    name: 'DO 0 (Digital Output 0)',
    purpose: 'Water Pump Starter Relay',
    detail: 'Energizes 24V coil to start/stop the Siemens centrifugal pump motor.',
    voltage: '24V DC / 2A Relay',
    localOffset: new THREE.Vector3(-0.065, -0.058, 0.025),
    direction: 'BOTTOM',
    staggerIndex: 0,
  },
  {
    id: 'Q0.1',
    tag: '%Q0.1',
    type: 'DO',
    name: 'DO 1 (Digital Output 1)',
    purpose: 'Isolation Valve Actuator',
    detail: 'Actuates the motorized suction gate valve to open or isolate fluid flow.',
    voltage: '24V DC / 2A Relay',
    localOffset: new THREE.Vector3(-0.015, -0.058, 0.025),
    direction: 'BOTTOM',
    staggerIndex: 1,
  },
  {
    id: 'Q0.2',
    tag: '%Q0.2',
    type: 'DO',
    name: 'DO 2 (Digital Output 2)',
    purpose: 'Master Alarm Beacon',
    detail: 'Drives audiovisual alarm strobe when an abnormal level or fault is detected.',
    voltage: '24V DC / 2A Relay',
    localOffset: new THREE.Vector3(0.035, -0.058, 0.025),
    direction: 'BOTTOM',
    staggerIndex: 0,
  },

  // --- POWER & COMMS (Left / CPU Face) ---
  {
    id: 'PWR',
    tag: '24V / M',
    type: 'PWR',
    name: '24V DC Power Supply Bus',
    purpose: 'CPU & I/O Power Supply',
    detail: 'Main regulated 24V DC power input (L+ / M) from industrial power supply unit.',
    voltage: '24V DC (±15%)',
    localOffset: new THREE.Vector3(-0.11, 0.058, 0.025),
    direction: 'LEFT',
    staggerIndex: 0,
  },
  {
    id: 'ETH',
    tag: 'PROFINET',
    type: 'ETH',
    name: 'Industrial Ethernet (RJ45)',
    purpose: 'OPC UA & MQTT Port',
    detail: '100 Mbps Industrial Ethernet port for TIA Portal, SCADA, and IoT field telemetry.',
    voltage: '100BASE-TX',
    localOffset: new THREE.Vector3(-0.11, -0.045, 0.025),
    direction: 'LEFT',
    staggerIndex: 1,
  },
  {
    id: 'LED',
    tag: 'LED DIAG',
    type: 'LED',
    name: 'CPU Status LEDs',
    purpose: 'RUN / STOP / ERROR Diagnostic Bank',
    detail: 'Visual indicator bank showing CPU execution mode, hardware faults, and maintenance state.',
    voltage: 'Internal Logic',
    localOffset: new THREE.Vector3(-0.09, 0.01, 0.03),
    direction: 'LEFT',
    staggerIndex: 2,
  },
];

export class PLCPortGuide {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: THREE.Camera | null = null;
  private plc: PLCEquipment;
  private isVisible = true;
  private portElements: Map<string, HTMLElement> = new Map();
  private animFrameId: number | null = null;

  constructor(plc: PLCEquipment, overlayContainer?: HTMLElement) {
    this.plc = plc;

    // Attach to overlay container or fallback to body
    const parent = overlayContainer || document.getElementById('ui-overlay') || document.body;

    this.container = document.createElement('div');
    this.container.className = 'plc-port-guide-container';
    parent.appendChild(this.container);

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'plc-port-guide-canvas';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.createPortCards();
    this.startLoop();
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
  }

  toggleVisible(): boolean {
    this.setVisible(!this.isVisible);
    return this.isVisible;
  }

  getVisible(): boolean {
    return this.isVisible;
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private createPortCards(): void {
    for (const item of PLC_PORT_DEFINITIONS) {
      const card = document.createElement('div');
      card.className = `plc-port-arrow-card port-type-${item.type.toLowerCase()}`;
      card.dataset.portId = item.id;
      card.innerHTML = `
        <div class="port-card-tag-row">
          <span class="port-type-badge">${item.type}</span>
          <span class="port-address-tag">${item.tag}</span>
        </div>
        <div class="port-card-purpose">${item.purpose}</div>
        <div class="port-card-voltage">${item.voltage}</div>
      `;

      card.addEventListener('pointerenter', () => {
        this.plc.setTerminalState(item.id, 'hover');
      });

      card.addEventListener('pointerleave', () => {
        this.plc.setTerminalState(item.id, 'idle');
      });

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        EventBus.emit('inspector:open', { componentId: 'plc', portId: item.id });
      });

      this.container.appendChild(card);
      this.portElements.set(item.id, card);
    }
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

    if (!this.isVisible || !this.camera) {
      for (const el of this.portElements.values()) {
        el.style.display = 'none';
      }
      return;
    }

    if (this.plc.group.parent) {
      this.plc.group.parent.updateMatrixWorld(true);
    }
    this.plc.group.updateMatrixWorld(true);

    for (const item of PLC_PORT_DEFINITIONS) {
      const el = this.portElements.get(item.id);
      if (!el) continue;

      // 1. Get 3D world position of terminal
      let worldPos: THREE.Vector3;
      const term3D = this.plc.getTerminalById(item.id);
      if (term3D && term3D.mesh) {
        worldPos = new THREE.Vector3();
        term3D.mesh.getWorldPosition(worldPos);
      } else {
        worldPos = item.localOffset.clone().applyMatrix4(this.plc.group.matrixWorld);
      }

      // 2. Project to 2D Screen
      const screenPos = this.project3DToScreen(worldPos, this.camera);
      if (!screenPos) {
        el.style.display = 'none';
        continue;
      }

      el.style.display = 'flex';

      // 3. Smart staggered card position
      let labelX = screenPos.x;
      let labelY = screenPos.y;

      if (item.direction === 'TOP') {
        const offsetY = 50 + (item.staggerIndex * 38);
        labelY = screenPos.y - offsetY;
        labelX = screenPos.x;
      } else if (item.direction === 'BOTTOM') {
        const offsetY = 55 + (item.staggerIndex * 40);
        labelY = screenPos.y + offsetY;
        labelX = screenPos.x;
      } else if (item.direction === 'LEFT') {
        labelX = screenPos.x - 115;
        labelY = screenPos.y + (item.staggerIndex * 34) - 34;
      }

      el.style.left = `${labelX}px`;
      el.style.top = `${labelY}px`;

      // 4. Connect pointer leader arrow from terminal to card edge
      const anchorY = item.direction === 'TOP' ? labelY + 18 : (item.direction === 'BOTTOM' ? labelY - 18 : labelY);
      const anchorX = item.direction === 'LEFT' ? labelX + 48 : labelX;

      this.drawArrowLeader(screenPos.x, screenPos.y, anchorX, anchorY, item.type, item.direction);
    }
  }

  private drawArrowLeader(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    type: string,
    direction: 'TOP' | 'BOTTOM' | 'LEFT'
  ): void {
    const colorMap: Record<string, string> = {
      DI: '#38bdf8',  // Cyan
      DO: '#22c55e',  // Emerald Green
      PWR: '#facc15', // Gold Yellow
      ETH: '#a78bfa', // Purple
      LED: '#fb923c', // Orange
    };
    const color = colorMap[type] || '#38bdf8';

    this.ctx.save();

    // 1. Terminal anchor glowing circle
    this.ctx.beginPath();
    this.ctx.arc(fromX, fromY, 3.5, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 8;
    this.ctx.fill();

    // 2. Leader Line with Joint
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);

    if (direction === 'TOP' || direction === 'BOTTOM') {
      const midY = (fromY + toY) / 2;
      this.ctx.lineTo(fromX, midY);
      this.ctx.lineTo(toX, toY);
    } else {
      const midX = (fromX + toX) / 2;
      this.ctx.lineTo(midX, fromY);
      this.ctx.lineTo(toX, toY);
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.6;
    this.ctx.setLineDash([3, 2]);
    this.ctx.stroke();

    // 3. Arrowhead pointing towards the card
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowSize = 6;
    this.ctx.setLineDash([]);
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(toX - arrowSize * Math.cos(angle - Math.PI / 6), toY - arrowSize * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(toX - arrowSize * Math.cos(angle + Math.PI / 6), toY - arrowSize * Math.sin(angle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.restore();
  }

  private project3DToScreen(worldPos: THREE.Vector3, camera: THREE.Camera): { x: number; y: number } | null {
    const v = worldPos.clone().project(camera);
    if (v.z > 1.0) return null;

    const x = ((v.x + 1) / 2) * window.innerWidth;
    const y = ((-v.y + 1) / 2) * window.innerHeight;
    return { x, y };
  }

  dispose(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.container.remove();
  }
}
