// ============================================================
// ComponentInspector – 3D 360° Zoom & Port Learning Module
// Interactive technical exploration of Siemens S7-1200 PLC & All 5 Experiments
// ============================================================

import * as THREE from 'three';
import { AppState } from '../core/AppState';
import { EventBus } from '../core/EventBus';
import type { SceneManager } from '../three/SceneManager';
import { Icons } from './Icons';

export interface PortDetail {
  id: string;
  name: string;
  type: 'Digital Input' | 'Digital Output' | 'Analog I/O' | 'Power' | 'Communication' | 'Hydraulic Flange' | 'Sensor' | 'LED Status';
  voltage: string;
  purpose: string;
  description: string;
  wiringTip: string;
  localPos?: THREE.Vector3;
}

export interface ComponentLearningData {
  id: string;
  name: string;
  category: string;
  modelCode: string;
  overview: string;
  specs: Record<string, string>;
  ports: PortDetail[];
  cameraFocusPos: THREE.Vector3;
  cameraLookAt: THREE.Vector3;
}

export const COMPONENTS_LEARNING_DATABASE: Record<string, ComponentLearningData> = {
  plc: {
    id: 'plc',
    name: 'Siemens SIMATIC S7-1200 PLC',
    category: 'Programmable Logic Controller',
    modelCode: 'CPU 1214C DC/DC/RLY (6ES7 214-1HG40-0XB0)',
    overview:
      'Compact industrial controller designed for closed-loop process automation, sequential machine logic, and industrial IoT communication.',
    specs: {
      'Work Memory': '100 KB Integrated',
      'Power Supply': '24V DC (20.4V to 28.8V DC)',
      'Digital Inputs': '14x 24V DC (Sink/Source IEC Type 1)',
      'Digital Outputs': '10x Relay (2A max per channel)',
      'Analog Inputs': '2x 0-10V DC (10-bit resolution)',
      'Communication': '1x PROFINET (RJ45, 100 Mbps, OPC UA)',
      'DIN Rail': 'Standard 35mm EN 50022',
    },
    cameraFocusPos: new THREE.Vector3(0.22, 0.38, 0.46),
    cameraLookAt: new THREE.Vector3(0.22, 0.36, -0.05),
    ports: [
      {
        id: 'I0.0',
        name: 'DI 0 (Digital Input %I0.0)',
        type: 'Digital Input',
        voltage: '24V DC (Logic 1: 15-30V, Logic 0: 0-5V)',
        purpose: 'Primary Sensor Feedback (Level L0 / Optical / Ped PB / Proximity / PT100)',
        description: 'Monitors the primary field sensor dry contact or 24V logic pulse.',
        wiringTip: 'Connect from sensor output terminal to PLC DI0 (%I0.0) pin.',
      },
      {
        id: 'I0.1',
        name: 'DI 1 (Digital Input %I0.1)',
        type: 'Digital Input',
        voltage: '24V DC (Logic 1: 15-30V, Logic 0: 0-5V)',
        purpose: 'Secondary Sensor Feedback / Pushbutton (High L1 / Start PB / Loop / Home / Batch Start)',
        description: 'Monitors upper alarm limit or operator start pushbutton contact.',
        wiringTip: 'Connect from secondary sensor or pushbutton to PLC DI1 (%I0.1) pin.',
      },
      {
        id: 'Q0.0',
        name: 'DO 0 (Digital Output %Q0.0)',
        type: 'Digital Output',
        voltage: '24V DC / 230V AC Relay (2.0A max)',
        purpose: 'Primary Actuator Contactor (Pump / Conveyor Drive / Main Signal / Servo / Agitator)',
        description: 'Energizes primary motor starter or traffic signal coil.',
        wiringTip: 'Connect from PLC Q0.0 relay terminal to field actuator drive terminal.',
      },
      {
        id: 'Q0.1',
        name: 'DO 1 (Digital Output %Q0.1)',
        type: 'Digital Output',
        voltage: '24V DC / 230V AC Relay (2.0A max)',
        purpose: 'Secondary Actuator (Valve / Pusher / Ped Walk / Vacuum / Heater Relay)',
        description: 'Controls auxiliary solenoid valve, pneumatic actuator, or SSR heater relay.',
        wiringTip: 'Connect from PLC Q0.1 relay terminal to secondary actuator terminal.',
      },
      {
        id: 'PWR',
        name: '24V DC / M (Power Supply Bus)',
        type: 'Power',
        voltage: '24V DC (±15%)',
        purpose: 'Main CPU & I/O Internal Power Bus',
        description: 'Provides regulated power to internal CPU logic, optocouplers, and output relay coils.',
        wiringTip: 'Connect L+ to industrial switched-mode 24V supply and M to common GND.',
      },
      {
        id: 'ETH',
        name: 'PROFINET Port (RJ45)',
        type: 'Communication',
        voltage: 'Standard Ethernet 100BASE-TX',
        purpose: 'Industrial Networking & OPC UA / MQTT Telemetry',
        description: 'Industrial Ethernet interface for TIA Portal programming, SCADA HMI connection, and OPC UA server communication.',
        wiringTip: 'Use shielded Cat5e/Cat6 industrial Ethernet cable with green RJ45 jacket.',
      },
    ],
  },
  tank: {
    id: 'tank',
    name: 'Water Level Storage Tank',
    category: 'Process Storage & Fluid Dynamics Vessel',
    modelCode: 'ACR-TK-500 (Transparent Cylinder + Float Rod)',
    overview:
      'Precision cylindrical storage vessel featuring metric volumetric graduations, integrated vertical float sensor rod (L0 & L1), and top return loop nozzle.',
    specs: {
      'Capacity': '50 Liters (Scaled 0-100% Volume)',
      'Material': 'UV-Stabilized Optical Acrylic',
      'Operating Pressure': 'Atmospheric / Gravity Outflow',
      'Inlet Port': 'Top Process Return Elbow with Water Nozzle',
      'Drain Port': 'Bottom Suction Line Flange to Check Valve',
    },
    cameraFocusPos: new THREE.Vector3(-0.52, 0.28, 0.46),
    cameraLookAt: new THREE.Vector3(-0.52, 0.22, 0),
    ports: [
      {
        id: 'L1',
        name: 'High Level Float Sensor (L1)',
        type: 'Sensor',
        voltage: '24V DC (Dry Contact)',
        purpose: 'High Level Overfill Detection',
        description: 'Magnetic float collar at 80% mark on the vertical probe rod that trips to signal impending tank overfill.',
        wiringTip: 'Connect to PLC Digital Input %I0.1.',
      },
      {
        id: 'L0',
        name: 'Low Level Float Sensor (L0)',
        type: 'Sensor',
        voltage: '24V DC (Dry Contact)',
        purpose: 'Low Level Starvation Detection',
        description: 'Magnetic float collar at 20% mark on the vertical probe rod that trips to prevent pump dry-run starvation.',
        wiringTip: 'Connect to PLC Digital Input %I0.0.',
      },
    ],
  },
  pump: {
    id: 'pump',
    name: 'Centrifugal Motor Pump',
    category: 'Fluid Transfer & Dynamic Pumping',
    modelCode: 'CP-24V-1200 (Cast-Iron Casing + 6-Blade Impeller)',
    overview:
      'High-reliability industrial centrifugal pump driven by a 24V DC brushless motor with integrated thermal overload sensor.',
    specs: {
      'Rated Speed': '1200 RPM at 24V DC',
      'Flow Rate': '18.5 Liters/min (Max Head 4.5m)',
      'Impeller Type': '6-Blade Radial Enclosed Bronze Alloy',
      'Suction Flange': 'DN25 Flanged Collar (Cyan Ring)',
      'Discharge Flange': 'DN20 Flanged Collar (Emerald Ring)',
    },
    cameraFocusPos: new THREE.Vector3(0.52, 0.08, 0.36),
    cameraLookAt: new THREE.Vector3(0.52, -0.04, 0),
    ports: [
      {
        id: 'PUMP_CTRL',
        name: 'Motor Starter Relay (DO0 / %Q0.0)',
        type: 'Digital Output',
        voltage: '24V DC (1.5A Motor Contactor)',
        purpose: 'Pump Motor Start / Stop Command',
        description: 'Actuates the magnetic motor starter coil to start or stop centrifugal impeller rotation.',
        wiringTip: 'Connect from PLC DO0 (%Q0.0) to Pump Control Terminal.',
      },
    ],
  },
  conveyor: {
    id: 'conveyor',
    name: 'Modular Conveyor Belt Station',
    category: 'Material Handling & Automated Transport',
    modelCode: 'CV-AL800-40 (Siemens Gearmotor Drive)',
    overview:
      'Extruded aluminum modular conveyor bed with integrated continuous rubber belt, steel rollers, and Siemens 24V DC planetary gearmotor.',
    specs: {
      'Bed Length': '880 mm (Extruded Anodized 6063-T6)',
      'Belt Width': '180 mm High-Traction Grip Surface',
      'Drive Motor': 'Siemens Blue 24V DC Planetary Gearmotor',
      'Belt Speed': '0.15 - 0.60 m/s Adjustable PWM',
    },
    cameraFocusPos: new THREE.Vector3(0.04, 0.28, 0.48),
    cameraLookAt: new THREE.Vector3(0.04, 0.12, 0.02),
    ports: [
      {
        id: 'MOTOR_PWR',
        name: 'Conveyor Motor Drive (DO0 / %Q0.0)',
        type: 'Digital Output',
        voltage: '24V DC (2.0A Motor Driver)',
        purpose: 'Conveyor Drive Contactor',
        description: 'Energizes the Siemens gearmotor to move workpieces forward along the conveyor bed.',
        wiringTip: 'Connect from PLC DO0 (%Q0.0) to Conveyor Motor Drive terminal.',
      },
    ],
  },
  traffic: {
    id: 'traffic',
    name: 'Smart 4-Way Traffic Signal Post',
    category: 'Traffic Management & Sequencer Actuator',
    modelCode: 'TL-LED-300 (High-Intensity Fresnel Lens Head)',
    overview:
      'Industrial traffic signal mast equipped with Red, Amber, and Green LED optics, aluminum sun visors, and vehicle loop interface.',
    specs: {
      'Lens Diameter': '200 mm High-Glow Optical Fresnel',
      'Luminous Intensity': 'Red: 400cd, Amber: 450cd, Green: 500cd',
      'Operating Voltage': '24V DC Matrix Controller',
      'Mast Height': '440 mm Steel Tubular Pole with Flange Base',
    },
    cameraFocusPos: new THREE.Vector3(0.28, 0.35, 0.52),
    cameraLookAt: new THREE.Vector3(0.28, 0.30, 0.18),
    ports: [
      {
        id: 'SIG_CTRL',
        name: 'Signal Head Matrix (DO0 / %Q0.0)',
        type: 'Digital Output',
        voltage: '24V DC Solid-State Output',
        purpose: 'Main Signal Phase Energization',
        description: 'Drives Red/Amber/Green signal head matrix according to PLC sequencer state.',
        wiringTip: 'Connect from PLC DO0 (%Q0.0) to Traffic Light Matrix terminal.',
      },
      {
        id: 'LOOP_SIG',
        name: 'Inductive Vehicle Loop (DI1 / %I0.1)',
        type: 'Sensor',
        voltage: '24V DC NPN Transistor Output',
        purpose: 'Road Vehicle Presence Detection',
        description: 'Oscillates electro-magnetic field to detect passing metallic car chassis.',
        wiringTip: 'Connect from Vehicle Loop Sensor to PLC DI1 (%I0.1).',
      },
    ],
  },
  pedestrian: {
    id: 'pedestrian',
    name: 'Pedestrian Crosswalk Signal & Call Station',
    category: 'Pedestrian Safety & Crosswalk Subsystem',
    modelCode: 'PED-LED-100 (Walk / Don\'t Walk & Pushbutton)',
    overview:
      'Integrated pedestrian safety post with illuminated Walk (Green/White) and Don\'t Walk (Red) symbols, and tactile call button.',
    specs: {
      'Walk Symbol': 'Illuminated Green Walking Person Icon',
      'Stop Symbol': 'Illuminated Red Upraised Hand Icon',
      'Push Button': 'Vandal-Resistant Stainless Steel Tactile Contact',
      'Enclosure': 'IP66 Weatherproof Polycarbonate Housing',
    },
    cameraFocusPos: new THREE.Vector3(-0.32, 0.24, 0.48),
    cameraLookAt: new THREE.Vector3(-0.32, 0.20, 0.24),
    ports: [
      {
        id: 'PED_BTN',
        name: 'Pedestrian Call PB (DI0 / %I0.0)',
        type: 'Digital Input',
        voltage: '24V DC Normally Open (NO)',
        purpose: 'Pedestrian Crosswalk Request Trigger',
        description: 'Sends momentary 24V pulse to PLC DI0 to queue a pedestrian crosswalk phase.',
        wiringTip: 'Connect to PLC Digital Input %I0.0.',
      },
      {
        id: 'PED_LIGHT',
        name: 'Walk Light Solenoid (DO1 / %Q0.1)',
        type: 'Digital Output',
        voltage: '24V DC Illuminated Output',
        purpose: 'Crosswalk Walk Sign Illumination',
        description: 'Energizes Walk light when vehicle traffic is confirmed stopped at Red.',
        wiringTip: 'Connect from PLC DO1 (%Q0.1) to Pedestrian Walk terminal.',
      },
    ],
  },
  robot: {
    id: 'robot',
    name: '3-Axis Cartesian Gantry Workcell',
    category: 'Industrial Robotics & Motion Handling',
    modelCode: 'ROBO-XYZ-400 (Precision Linear Rail & Vacuum)',
    overview:
      'Heavy-duty 3-axis Cartesian robot workcell with synchronized X/Y linear timing belts, Z vertical pneumatic cylinder, and vacuum end-effector.',
    specs: {
      'X-Axis Stroke': '560 mm Linear Precision Rail',
      'Y-Axis Stroke': '240 mm Cross Slide Rail',
      'Z-Axis Stroke': '140 mm Pneumatic Cylinder Stroke',
      'Repeatability': '± 0.05 mm Positioning Precision',
      'Payload': '3.5 kg Dynamic Handling Capacity',
    },
    cameraFocusPos: new THREE.Vector3(0, 0.32, 0.58),
    cameraLookAt: new THREE.Vector3(0, 0.20, 0),
    ports: [
      {
        id: 'SERVO_DRV',
        name: 'Gantry Servo Controller (DO0 / %Q0.0)',
        type: 'Digital Output',
        voltage: '24V DC High-Speed Pulse Train',
        purpose: 'Coordinated X/Y Linear Motion Command',
        description: 'Commands servo drive amplifier to execute pick-and-place trajectories.',
        wiringTip: 'Connect from PLC DO0 (%Q0.0) to Gantry Servo Controller terminal.',
      },
      {
        id: 'VAC_SOL',
        name: 'Vacuum Gripper Solenoid (DO1 / %Q0.1)',
        type: 'Digital Output',
        voltage: '24V DC (0.3A Solenoid)',
        purpose: 'Pneumatic Vacuum Venturi Generator',
        description: 'Actuates vacuum solenoid to draw suction and grip workpieces.',
        wiringTip: 'Connect from PLC DO1 (%Q0.1) to Vacuum Solenoid terminal.',
      },
      {
        id: 'FEED_PROX',
        name: 'In-Feed Proximity Sensor (DI0 / %I0.0)',
        type: 'Sensor',
        voltage: '24V DC NPN Sensor',
        purpose: 'Workpiece In-Feed Presence Detection',
        description: 'Confirms part is waiting in feed nest before pick stroke begins.',
        wiringTip: 'Connect to PLC Digital Input %I0.0.',
      },
    ],
  },
  reactor: {
    id: 'reactor',
    name: 'Thermal Chemical Batch Reactor Vessel',
    category: 'Process Chemical & Thermal Thermodynamics',
    modelCode: 'RX-500-JACKET (Stainless Steel 316L + Heated Jacket)',
    overview:
      'Jacketed chemical batch vessel featuring transparent sight glass inspection, dual reagent dosing valves, electric thermal heating coils, and PT100 RTD sensor.',
    specs: {
      'Volume Capacity': '50 Liters Liquid Batch Capacity',
      'Vessel Material': 'Sanitary Grade 316L Stainless Steel',
      'Heating Jacket': '3.5 kW Thermal Electric Resistance Coil',
      'Max Temperature': '95°C Process Operating Limit',
      'Agitator Impeller': 'Dual-Tier 4-Blade Pitch Impeller (720 RPM)',
    },
    cameraFocusPos: new THREE.Vector3(0, 0.48, 0.54),
    cameraLookAt: new THREE.Vector3(0, 0.42, 0),
    ports: [
      {
        id: 'HEATER_SSR',
        name: 'Heating Element SSR (DO1 / %Q0.1)',
        type: 'Digital Output',
        voltage: '24V DC Control to Solid-State Relay',
        purpose: 'Thermal Jacket Electric Element Energization',
        description: 'Switches 240V power to jacket heating coils to raise batch temperature.',
        wiringTip: 'Connect from PLC DO1 (%Q0.1) to Thermal Heater SSR terminal.',
      },
      {
        id: 'AGITATOR_DRV',
        name: 'Agitator Motor Drive (DO0 / %Q0.0)',
        type: 'Digital Output',
        voltage: '24V DC Motor Contactor',
        purpose: 'Vortex Stirrer Motor Start / Speed Control',
        description: 'Energizes gearmotor to rotate impeller blades and create liquid vortex.',
        wiringTip: 'Connect from PLC DO0 (%Q0.0) to Agitator Motor Drive terminal.',
      },
      {
        id: 'PT100_PROBE',
        name: 'PT100 RTD Temp Sensor (DI0 / %I0.0)',
        type: 'Sensor',
        voltage: '24V DC Temperature Controller Relay',
        purpose: 'Thermal Temperature Setpoint Trip (75°C)',
        description: 'Precision RTD sensor probe monitoring reactor liquid core temperature.',
        wiringTip: 'Connect to PLC Digital Input %I0.0.',
      },
    ],
  },
};

export class ComponentInspector {
  private overlay: HTMLElement;
  private inspectorCard: HTMLElement | null = null;
  private sceneManager: SceneManager;
  private activeComponentId: string | null = null;
  private selectedPortId: string | null = null;

  private isInspecting = false;
  private targetCameraPos = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private isTransitioning = false;
  private transitionProgress = 0;
  private startCameraPos = new THREE.Vector3();
  private startLookAt = new THREE.Vector3();

  constructor(sceneManager: SceneManager, overlayElement: HTMLElement) {
    this.sceneManager = sceneManager;
    this.overlay = overlayElement;

    this.createInspectorUI();
    this.bindEvents();
  }

  private createInspectorUI(): void {
    this.inspectorCard = document.createElement('div');
    this.inspectorCard.className = 'component-inspector-card hidden';
    this.overlay.appendChild(this.inspectorCard);
  }

  private bindEvents(): void {
    EventBus.on('inspector:open', (data: { componentId: string }) => {
      this.inspect(data.componentId);
    });

    EventBus.on('inspector:close', () => {
      this.close();
    });
  }

  inspect(componentId: string): void {
    const data = COMPONENTS_LEARNING_DATABASE[componentId] || COMPONENTS_LEARNING_DATABASE['plc'];
    this.activeComponentId = data.id;
    this.isInspecting = true;

    this.renderInspectorContent(data);
    this.startCameraTransition(data.cameraFocusPos, data.cameraLookAt);

    this.sceneManager.controls.minDistance = 0.35;
    this.sceneManager.controls.maxDistance = 2.2;

    EventBus.emit('inspector:opened', { componentId: data.id });
    EventBus.emit('inspector:componentSelected', { componentId: data.id });
  }

  close(): void {
    if (!this.isInspecting) return;
    this.isInspecting = false;
    this.activeComponentId = null;

    if (this.inspectorCard) {
      this.inspectorCard.classList.add('hidden');
    }

    this.sceneManager.resetCameraView();
    this.sceneManager.controls.minDistance = 0.2;
    this.sceneManager.controls.maxDistance = 4.0;

    EventBus.emit('inspector:closed');
  }

  private startCameraTransition(targetPos: THREE.Vector3, targetLookAt: THREE.Vector3): void {
    this.startCameraPos.copy(this.sceneManager.camera.position);
    this.startLookAt.copy(this.sceneManager.controls.target);
    this.targetCameraPos.copy(targetPos);
    this.targetLookAt.copy(targetLookAt);
    this.transitionProgress = 0;
    this.isTransitioning = true;
  }

  update(dt: number): void {
    if (this.isTransitioning) {
      this.transitionProgress += dt * 2.5;
      const t = Math.min(1.0, this.transitionProgress);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.sceneManager.camera.position.lerpVectors(this.startCameraPos, this.targetCameraPos, ease);
      this.sceneManager.controls.target.lerpVectors(this.startLookAt, this.targetLookAt, ease);
      this.sceneManager.controls.update();

      if (t >= 1.0) {
        this.isTransitioning = false;
      }
    }
  }

  private renderInspectorContent(data: ComponentLearningData): void {
    if (!this.inspectorCard) return;

    const activeExp = AppState.activeExperiment;
    let tabIds: string[];

    switch (activeExp) {
      case 'CONVEYOR':
        tabIds = ['plc', 'conveyor'];
        break;
      case 'TRAFFIC':
        tabIds = ['plc', 'traffic', 'pedestrian'];
        break;
      case 'ROBOT':
        tabIds = ['plc', 'robot'];
        break;
      case 'REACTOR':
        tabIds = ['plc', 'reactor'];
        break;
      case 'TANK':
      default:
        tabIds = ['plc', 'tank', 'pump'];
        break;
    }

    const iconMap: Record<string, string> = {
      plc: Icons.cpu({ size: 14 }),
      tank: Icons.tank({ size: 14 }),
      pump: Icons.pump({ size: 14 }),
      conveyor: Icons.box({ size: 14 }),
      traffic: Icons.traffic({ size: 14 }),
      pedestrian: Icons.pedestrian({ size: 14 }),
      robot: Icons.robot({ size: 14 }),
      reactor: Icons.reactor({ size: 14 }),
    };

    const navTabs = tabIds
      .map((id) => {
        const item = COMPONENTS_LEARNING_DATABASE[id];
        if (!item) return '';
        const isActive = id === data.id ? 'active' : '';
        const icon = iconMap[id] || Icons.cpu({ size: 14 });
        return `<button class="inspector-nav-tab ${isActive}" data-comp="${id}">${icon} ${item.name.split(' ')[0]}</button>`;
      })
      .join('');

    const specsList = Object.entries(data.specs)
      .map(
        ([k, v]) => `
        <div class="spec-item">
          <span class="spec-label">${k}</span>
          <span class="spec-val">${v}</span>
        </div>
      `
      )
      .join('');

    const portsList = data.ports
      .map((p) => {
        const isSelected = p.id === this.selectedPortId ? 'selected' : '';
        const typeClass =
          p.type === 'Digital Input'
            ? 'badge-di'
            : p.type === 'Digital Output'
            ? 'badge-do'
            : p.type === 'Power'
            ? 'badge-pwr'
            : 'badge-other';

        return `
        <div class="port-row ${isSelected}" data-port="${p.id}">
          <div class="port-header-line">
            <span class="port-name">${p.name}</span>
            <span class="port-type-badge ${typeClass}">${p.type}</span>
          </div>
          <div class="port-purpose">${p.purpose}</div>
          <div class="port-detail-body">
            <p>${p.description}</p>
            <div class="port-wiring-tip">${Icons.lightbulb({ size: 13 })} <strong>Wiring Guideline:</strong> ${p.wiringTip}</div>
            <div class="port-voltage-tag">${Icons.zap({ size: 12 })} ${p.voltage}</div>
          </div>
        </div>
      `;
      })
      .join('');

    this.inspectorCard.innerHTML = `
      <div class="inspector-header">
        <div class="inspector-title-group">
          <span class="inspector-badge">3D 360° INSPECT &amp; LEARN</span>
          <h2>${data.name}</h2>
          <span class="model-code">${data.modelCode}</span>
        </div>
        <button id="btn-close-inspector" class="inspector-close-btn" title="Back to Full Station">${Icons.x({ size: 14 })} Close</button>
      </div>

      <div class="inspector-component-nav">
        ${navTabs}
      </div>

      <div class="inspector-body-scroll">
        <div class="inspector-section">
          <h3>Overview &amp; Industrial Purpose</h3>
          <p class="overview-text">${data.overview}</p>
        </div>

        <div class="inspector-section">
          <h3>Technical Specifications</h3>
          <div class="specs-grid">${specsList}</div>
        </div>

        <div class="inspector-section">
          <h3>I/O Ports, Terminals &amp; Pin Functions</h3>
          <div class="ports-container">${portsList}</div>
        </div>
      </div>

      <div class="inspector-footer-hint">
        <span>${Icons.compass({ size: 13 })} Drag to rotate 360° around component | Scroll to zoom in/out</span>
      </div>
    `;

    this.inspectorCard.classList.remove('hidden');

    // Bind sub-events
    document.getElementById('btn-close-inspector')?.addEventListener('click', () => {
      this.close();
    });

    this.inspectorCard.querySelectorAll('.inspector-nav-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const compId = (e.currentTarget as HTMLElement).getAttribute('data-comp');
        if (compId) this.inspect(compId);
      });
    });

    this.inspectorCard.querySelectorAll('.port-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        this.inspectorCard?.querySelectorAll('.port-row').forEach((r) => r.classList.remove('selected'));
        (e.currentTarget as HTMLElement).classList.add('selected');
        const portId = (e.currentTarget as HTMLElement).getAttribute('data-port');
        if (portId) {
          this.selectedPortId = portId;
          EventBus.emit('inspector:portSelected', { componentId: data.id, portId });
        }
      });
    });
  }

  isInspectionActive(): boolean {
    return this.isInspecting;
  }
}
