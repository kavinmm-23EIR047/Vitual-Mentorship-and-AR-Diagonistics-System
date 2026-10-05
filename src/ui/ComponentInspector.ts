// ============================================================
// ComponentInspector – 3D 360° Zoom & Port Learning Module
// Cyber-Physical SCADA Digital Twin Inspector for Siemens S7-1200 & 5 Industrial Stations
// ============================================================

import * as THREE from 'three';
import { AppState } from '../core/AppState';
import { EventBus } from '../core/EventBus';
import type { SceneManager } from '../three/SceneManager';
import { Icons } from './Icons';
import { voiceNarrator } from '../core/VoiceNarrator';

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
  brand?: string;
  tags?: string[];
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
    brand: 'Siemens AG',
    tags: ['Industrial Controller', 'IEC 61131-3', 'PROFINET', '24V DC'],
    overview:
      'High-performance compact industrial controller designed for closed-loop process automation, sequential machine logic, deterministic I/O scanning, and OPC UA / Industrial IoT communication.',
    specs: {
      'Work Memory': '100 KB Integrated RAM',
      'Power Supply': '24V DC (20.4V to 28.8V DC)',
      'Digital Inputs': '14x 24V DC (Sink/Source IEC Type 1)',
      'Digital Outputs': '10x Relay (2A max per channel)',
      'Analog Inputs': '2x 0-10V DC (10-bit resolution)',
      'Communication': '1x PROFINET (RJ45, 100 Mbps, OPC UA)',
      'Scan Cycle': '1.2 ms per 1K Boolean Instructions',
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
        description: 'Monitors the primary field sensor dry contact or 24V logic pulse with optical isolation.',
        wiringTip: 'Connect from sensor signal terminal to PLC DI0 (%I0.0) screw terminal.',
      },
      {
        id: 'I0.1',
        name: 'DI 1 (Digital Input %I0.1)',
        type: 'Digital Input',
        voltage: '24V DC (Logic 1: 15-30V, Logic 0: 0-5V)',
        purpose: 'Secondary Sensor Feedback / Pushbutton (High L1 / Start PB / Loop / Home / Batch Start)',
        description: 'Monitors upper alarm limit or operator start pushbutton contact to initiate automated cycles.',
        wiringTip: 'Connect from secondary sensor or pushbutton to PLC DI1 (%I0.1) screw terminal.',
      },
      {
        id: 'Q0.0',
        name: 'DO 0 (Digital Output %Q0.0)',
        type: 'Digital Output',
        voltage: '24V DC / 230V AC Relay (2.0A max)',
        purpose: 'Primary Actuator Contactor (Pump / Conveyor Drive / Main Signal / Servo / Agitator)',
        description: 'Energizes primary motor starter, frequency inverter enable, or traffic signal relay coil.',
        wiringTip: 'Connect from PLC Q0.0 relay terminal to field actuator drive terminal.',
      },
      {
        id: 'Q0.1',
        name: 'DO 1 (Digital Output %Q0.1)',
        type: 'Digital Output',
        voltage: '24V DC / 230V AC Relay (2.0A max)',
        purpose: 'Secondary Actuator (Valve / Pusher / Ped Walk / Vacuum / Heater Relay)',
        description: 'Controls auxiliary solenoid valve, pneumatic cylinder actuator, or solid-state heater relay.',
        wiringTip: 'Connect from PLC Q0.1 relay terminal to secondary actuator terminal.',
      },
      {
        id: 'PWR',
        name: '24V DC / M (Power Supply Bus)',
        type: 'Power',
        voltage: '24V DC (±15%) Regulated',
        purpose: 'Main CPU & I/O Internal Power Bus',
        description: 'Provides regulated DC power to internal CPU logic, optocouplers, and output relay coils.',
        wiringTip: 'Connect L+ to industrial switched-mode 24V supply and M to common chassis ground (GND).',
      },
      {
        id: 'ETH',
        name: 'PROFINET Port (RJ45)',
        type: 'Communication',
        voltage: 'Standard Ethernet 100BASE-TX',
        purpose: 'Industrial Networking & OPC UA / MQTT Telemetry',
        description: 'Industrial Ethernet interface for TIA Portal engineering, SCADA HMI connection, and OPC UA server communication.',
        wiringTip: 'Use shielded Cat5e/Cat6 industrial Ethernet cable with green RJ45 jacket.',
      },
    ],
  },
  tank: {
    id: 'tank',
    name: 'Water Level Storage Tank',
    category: 'Fluid Storage & Process Dynamics',
    modelCode: 'ACR-TK-500 (Transparent Cylinder + Float Rod)',
    brand: 'ProMinent Fluid Tech',
    tags: ['Hydrostatic Level', 'Dual Float Sensors', 'Visual Sight Column'],
    overview:
      'Precision cylindrical storage vessel featuring metric volumetric graduations, integrated vertical float sensor rod (L0 & L1), and top return loop nozzle for closed-loop fluid simulation.',
    specs: {
      'Capacity': '50 Liters (Scaled 0-100% Volume)',
      'Material': 'UV-Stabilized Optical Acrylic Glass',
      'Operating Pressure': 'Atmospheric / Gravity Outflow',
      'Inlet Port': 'Top Process Return Elbow with Water Nozzle',
      'Drain Port': 'Bottom Suction Line Flange to Check Valve',
      'Sensor Type': 'Magnetic Reed Float Switch Array',
    },
    cameraFocusPos: new THREE.Vector3(-0.52, 0.28, 0.46),
    cameraLookAt: new THREE.Vector3(-0.52, 0.22, 0),
    ports: [
      {
        id: 'L1',
        name: 'High Level Float Sensor (L1)',
        type: 'Sensor',
        voltage: '24V DC (Dry Contact Reed)',
        purpose: 'High Level Overfill Detection (80% Mark)',
        description: 'Magnetic float collar at 80% mark on the vertical probe rod that trips to signal impending tank overfill.',
        wiringTip: 'Connect to PLC Digital Input %I0.1.',
      },
      {
        id: 'L0',
        name: 'Low Level Float Sensor (L0)',
        type: 'Sensor',
        voltage: '24V DC (Dry Contact Reed)',
        purpose: 'Low Level Starvation Detection (20% Mark)',
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
    brand: 'Grundfos Industrial',
    tags: ['Centrifugal Impeller', 'Brushless DC Motor', '1200 RPM'],
    overview:
      'High-reliability industrial centrifugal pump driven by a 24V DC brushless motor with integrated thermal overload sensor and precision mechanical shaft seal.',
    specs: {
      'Rated Speed': '1200 RPM at 24V DC',
      'Flow Rate': '18.5 Liters/min (Max Head 4.5m)',
      'Impeller Type': '6-Blade Radial Enclosed Bronze Alloy',
      'Suction Flange': 'DN25 Flanged Collar (Cyan Ring)',
      'Discharge Flange': 'DN20 Flanged Collar (Emerald Ring)',
      'Motor Rating': '45W DC Brushless with Electronic Commutation',
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
    brand: 'Festo Automation',
    tags: ['Modular Belt', 'Optical Inspection', 'Pneumatic Sorting'],
    overview:
      'Extruded aluminum modular conveyor bed with integrated continuous rubber belt, steel rollers, optical workpiece detector, and Siemens 24V DC planetary gearmotor.',
    specs: {
      'Bed Length': '880 mm (Extruded Anodized 6063-T6)',
      'Belt Width': '180 mm High-Traction Grip Surface',
      'Drive Motor': 'Siemens Blue 24V DC Planetary Gearmotor',
      'Belt Speed': '0.15 - 0.60 m/s Adjustable PWM',
      'Pneumatic Stroke': '50 mm High-Speed Diverter Cylinder',
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
      {
        id: 'OPTICAL_SENS',
        name: 'Optical Part Sensor (DI0 / %I0.0)',
        type: 'Sensor',
        voltage: '24V DC Photoelectric Beam',
        purpose: 'Workpiece Detection at In-Feed',
        description: 'Detects presence of package passing through infrared beam.',
        wiringTip: 'Connect from Optical Sensor to PLC DI0 (%I0.0).',
      },
    ],
  },
  traffic: {
    id: 'traffic',
    name: 'Smart 4-Way Traffic Signal Post',
    category: 'Traffic Automation & Signal Sequencer',
    modelCode: 'TL-LED-300 (High-Intensity Fresnel Lens Head)',
    brand: 'Siemens Mobility',
    tags: ['Triple LED Optics', 'Vehicle Induction Loop', 'Weatherproof IP66'],
    overview:
      'Industrial traffic signal mast equipped with Red, Amber, and Green LED optics, aluminum sun visors, and road vehicle induction loop interface for intelligent traffic sequence control.',
    specs: {
      'Lens Diameter': '200 mm High-Glow Optical Fresnel',
      'Luminous Intensity': 'Red: 400cd, Amber: 450cd, Green: 500cd',
      'Operating Voltage': '24V DC Matrix Controller',
      'Mast Height': '440 mm Steel Tubular Pole with Flange Base',
      'Enclosure Rating': 'IP66 Weatherproof Polycarbonate',
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
        description: 'Oscillates electromagnetic field to detect passing metallic car chassis.',
        wiringTip: 'Connect from Vehicle Loop Sensor to PLC DI1 (%I0.1).',
      },
    ],
  },
  pedestrian: {
    id: 'pedestrian',
    name: 'Pedestrian Crosswalk Signal & Call Station',
    category: 'Pedestrian Safety & Crosswalk Subsystem',
    modelCode: 'PED-LED-100 (Walk / Don\'t Walk & Pushbutton)',
    brand: 'Siemens Mobility',
    tags: ['Illuminated Symbols', 'Stainless Pushbutton', 'Visual Signal'],
    overview:
      'Integrated pedestrian safety post with illuminated Walk (Green/White) and Don\'t Walk (Red) symbols, and vandal-resistant tactile call button.',
    specs: {
      'Walk Symbol': 'Illuminated Green Walking Person Icon',
      'Stop Symbol': 'Illuminated Red Upraised Hand Icon',
      'Push Button': 'Vandal-Resistant Stainless Steel Tactile Contact',
      'Enclosure': 'IP66 Weatherproof Polycarbonate Housing',
      'Supply Voltage': '24V DC Auxiliary Channel',
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
    brand: 'KUKA Systems / Festo',
    tags: ['Linear Gantry', 'Pneumatic Gripper', 'Servo Drives'],
    overview:
      'Heavy-duty 3-axis Cartesian robot workcell with synchronized X/Y linear timing belts, Z vertical pneumatic cylinder, and vacuum suction end-effector for high-speed pick-and-place automation.',
    specs: {
      'X-Axis Stroke': '560 mm Linear Precision Rail',
      'Y-Axis Stroke': '240 mm Cross Slide Rail',
      'Z-Axis Stroke': '140 mm Pneumatic Cylinder Stroke',
      'Repeatability': '± 0.05 mm Positioning Precision',
      'Payload': '3.5 kg Dynamic Handling Capacity',
      'End Effector': 'Venturi Vacuum Suction Cup (80 kPa)',
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
    category: 'Process Thermodynamics & Batch Kinetics',
    modelCode: 'RX-500-JACKET (Stainless Steel 316L + Heated Jacket)',
    brand: 'Siemens Process Analytics',
    tags: ['Sanitary 316L', 'Thermal Jacket 3.5kW', 'PT100 Sensor', 'Impeller Agitator'],
    overview:
      'Jacketed chemical batch vessel featuring transparent sight glass inspection, dual reagent dosing valves, electric thermal heating coils, precision PT100 RTD sensor, and dynamic vortex impeller.',
    specs: {
      'Volume Capacity': '50 Liters Liquid Batch Capacity',
      'Vessel Material': 'Sanitary Grade 316L Stainless Steel',
      'Heating Jacket': '3.5 kW Thermal Electric Resistance Coil',
      'Max Temperature': '95°C Process Operating Limit',
      'Agitator Impeller': 'Dual-Tier 4-Blade Pitch Impeller (720 RPM)',
      'Temperature Sensor': 'Class A PT100 3-Wire RTD Probe',
      'Dosing Ports': 'Reagent A & B Tri-Clamp Sanitary Inlets',
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
        description: 'Switches 240V power to jacket heating coils to raise batch temperature according to PID logic.',
        wiringTip: 'Connect from PLC DO1 (%Q0.1) to Thermal Heater SSR terminal.',
      },
      {
        id: 'AGITATOR_DRV',
        name: 'Agitator Motor Drive (DO0 / %Q0.0)',
        type: 'Digital Output',
        voltage: '24V DC Motor Contactor',
        purpose: 'Vortex Stirrer Motor Start / Speed Control',
        description: 'Energizes gearmotor to rotate impeller blades and create liquid vortex mixing.',
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
  private currentTab: 'SPECS' | 'PINOUT' | 'CAMERA' = 'SPECS';

  private isInspecting = false;
  private isAutoRotating = false;
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

    this.sceneManager.controls.minDistance = 0.25;
    this.sceneManager.controls.maxDistance = 2.5;

    EventBus.emit('inspector:opened', { componentId: data.id });
    EventBus.emit('inspector:componentSelected', { componentId: data.id });
  }

  close(): void {
    if (!this.isInspecting) return;
    this.isInspecting = false;
    this.activeComponentId = null;

    if (this.isAutoRotating) {
      this.toggleAutoRotate(false);
    }

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

  public setCameraAnglePreset(angle: 'FRONT' | 'ISOMETRIC' | 'TOP' | 'SIDE' | 'PORTS'): void {
    if (!this.activeComponentId) return;
    const data = COMPONENTS_LEARNING_DATABASE[this.activeComponentId];
    if (!data) return;

    const baseLook = data.cameraLookAt.clone();
    let newPos = data.cameraFocusPos.clone();

    switch (angle) {
      case 'FRONT':
        newPos = baseLook.clone().add(new THREE.Vector3(0, 0.06, 0.48));
        break;
      case 'ISOMETRIC':
        newPos = baseLook.clone().add(new THREE.Vector3(0.38, 0.28, 0.38));
        break;
      case 'TOP':
        newPos = baseLook.clone().add(new THREE.Vector3(0, 0.65, 0.02));
        break;
      case 'SIDE':
        newPos = baseLook.clone().add(new THREE.Vector3(0.48, 0.08, 0));
        break;
      case 'PORTS':
        newPos = baseLook.clone().add(new THREE.Vector3(0.18, -0.05, 0.32));
        break;
    }

    this.startCameraTransition(newPos, baseLook);
  }

  public toggleAutoRotate(state?: boolean): boolean {
    this.isAutoRotating = state !== undefined ? state : !this.isAutoRotating;
    this.sceneManager.controls.autoRotate = this.isAutoRotating;
    this.sceneManager.controls.autoRotateSpeed = 1.4;

    const btn = document.getElementById('btn-inspector-auto-rotate');
    if (btn) {
      btn.classList.toggle('active', this.isAutoRotating);
      btn.innerHTML = this.isAutoRotating
        ? `${Icons.refreshCw({ size: 13 })} Auto Orbit: ON`
        : `${Icons.refreshCw({ size: 13 })} Auto Orbit 360°`;
    }
    return this.isAutoRotating;
  }

  update(dt: number): void {
    if (this.isTransitioning) {
      this.transitionProgress += dt * 2.8;
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
      plc: Icons.cpu({ size: 15 }),
      tank: Icons.tank({ size: 15 }),
      pump: Icons.pump({ size: 15 }),
      conveyor: Icons.box({ size: 15 }),
      traffic: Icons.traffic({ size: 15 }),
      pedestrian: Icons.pedestrian({ size: 15 }),
      robot: Icons.robot({ size: 15 }),
      reactor: Icons.reactor({ size: 15 }),
    };

    // Equipment Selector Tabs
    const navTabs = tabIds
      .map((id) => {
        const item = COMPONENTS_LEARNING_DATABASE[id];
        if (!item) return '';
        const isActive = id === data.id ? 'active' : '';
        const icon = iconMap[id] || Icons.cpu({ size: 15 });
        return `
          <button class="inspector-nav-tab ${isActive}" data-comp="${id}" title="Inspect ${item.name}">
            <span class="nav-tab-icon">${icon}</span>
            <span class="nav-tab-label">${item.name.split(' ')[0]}</span>
          </button>
        `;
      })
      .join('');

    // Tags Chips
    const tagsHtml = (data.tags || ['Industrial Twin', 'IEC Compliant'])
      .map((tag) => `<span class="inspector-pill-chip">${tag}</span>`)
      .join('');

    // Specs Grid
    const specsList = Object.entries(data.specs)
      .map(([k, v]) => `
        <div class="spec-item-card">
          <div class="spec-card-header">
            <span class="spec-card-icon">${Icons.sliders({ size: 12 })}</span>
            <span class="spec-card-label">${k}</span>
          </div>
          <div class="spec-card-val">${v}</div>
        </div>
      `)
      .join('');

    // Ports List
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
            : p.type === 'Communication'
            ? 'badge-comm'
            : 'badge-sens';

        return `
        <div class="port-row-card ${isSelected}" data-port="${p.id}">
          <div class="port-header-line">
            <div class="port-title-wrapper">
              <span class="port-bullet"></span>
              <span class="port-name">${p.name}</span>
            </div>
            <span class="port-type-badge ${typeClass}">${p.type}</span>
          </div>
          <div class="port-purpose-row">
            <span>${p.purpose}</span>
          </div>
          <div class="port-detail-body">
            <p class="port-desc">${p.description}</p>
            <div class="port-meta-boxes">
              <div class="port-wiring-tip">
                <span class="tip-icon">${Icons.lightbulb({ size: 13 })}</span>
                <div class="tip-content"><strong>Wiring Rule:</strong> ${p.wiringTip}</div>
              </div>
              <div class="port-voltage-tag">
                <span class="volt-icon">${Icons.zap({ size: 12 })}</span>
                <span><strong>Signal Rating:</strong> ${p.voltage}</span>
              </div>
            </div>
            <button class="btn-focus-port" data-port="${p.id}">
              ${Icons.crosshair({ size: 12 })} Highlight &amp; Focus Pin in 3D
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    // 3D Camera Controls HTML
    const cameraControlsHtml = `
      <div class="camera-presets-wrapper">
        <div class="camera-presets-header">
          <h4>${Icons.eye({ size: 14 })} 3D Digital Twin View Angles</h4>
          <p>Quickly orient and inspect CAD geometry from standardized viewpoint perspectives.</p>
        </div>
        <div class="camera-presets-grid">
          <button class="camera-preset-btn" data-angle="FRONT">
            <span class="preset-icon">${Icons.minimize2({ size: 14 })}</span>
            <span>Front Elevation</span>
          </button>
          <button class="camera-preset-btn" data-angle="ISOMETRIC">
            <span class="preset-icon">${Icons.box({ size: 14 })}</span>
            <span>Isometric 360°</span>
          </button>
          <button class="camera-preset-btn" data-angle="TOP">
            <span class="preset-icon">${Icons.layers({ size: 14 })}</span>
            <span>Top-Down (Plan)</span>
          </button>
          <button class="camera-preset-btn" data-angle="SIDE">
            <span class="preset-icon">${Icons.activity({ size: 14 })}</span>
            <span>Side Profile</span>
          </button>
          <button class="camera-preset-btn" data-angle="PORTS">
            <span class="preset-icon">${Icons.crosshair({ size: 14 })}</span>
            <span>Terminal Strip</span>
          </button>
        </div>
        <div class="orbit-toggle-card">
          <div class="orbit-info">
            <span class="orbit-title">${Icons.refreshCw({ size: 14 })} Continuous 360° Auto-Orbit</span>
            <span class="orbit-sub">Smooth turntable rotation around component center</span>
          </div>
          <button id="btn-inspector-auto-rotate" class="auto-rotate-btn ${this.isAutoRotating ? 'active' : ''}">
            ${Icons.refreshCw({ size: 13 })} ${this.isAutoRotating ? 'Auto Orbit: ON' : 'Auto Orbit 360°'}
          </button>
        </div>
      </div>
    `;

    this.inspectorCard.innerHTML = `
      <!-- Glowing Corner Accent Line -->
      <div class="inspector-card-glow-bar"></div>

      <!-- Header -->
      <div class="inspector-header">
        <div class="inspector-header-left">
          <div class="inspector-badge-row">
            <span class="inspector-live-tag">
              <span class="pulse-dot"></span>
              <span>3D DIGITAL TWIN</span>
            </span>
            <span class="inspector-brand-tag">${data.brand || 'Siemens AG'}</span>
            <span class="inspector-category-tag">${data.category}</span>
          </div>
          <h2 class="inspector-title">${data.name}</h2>
          <div class="inspector-model-badge">
            <span class="model-lbl">PART NO:</span>
            <code class="model-code">${data.modelCode}</code>
          </div>
        </div>

        <div class="inspector-header-actions">
          <button id="btn-speak-inspector" class="inspector-speak-btn" title="Hear AI Voice Narration">
            ${Icons.mic({ size: 14 })}
            <span>Read Aloud</span>
          </button>
          <button id="btn-close-inspector" class="inspector-close-btn" title="Back to Full Station">
            ${Icons.x({ size: 16 })}
          </button>
        </div>
      </div>

      <!-- Equipment Selector Carousel -->
      <div class="inspector-component-nav">
        ${navTabs}
      </div>

      <!-- Sub-Tabs Navigation (Specs / Pinout / Camera) -->
      <div class="inspector-subtabs-bar">
        <button class="subtab-btn ${this.currentTab === 'SPECS' ? 'active' : ''}" data-tab="SPECS">
          ${Icons.sliders({ size: 13 })} Overview &amp; Specs
        </button>
        <button class="subtab-btn ${this.currentTab === 'PINOUT' ? 'active' : ''}" data-tab="PINOUT">
          ${Icons.zap({ size: 13 })} I/O Pinout (${data.ports.length})
        </button>
        <button class="subtab-btn ${this.currentTab === 'CAMERA' ? 'active' : ''}" data-tab="CAMERA">
          ${Icons.camera({ size: 13 })} 3D Angles
        </button>
      </div>

      <!-- Main Scrollable Body Content -->
      <div class="inspector-body-scroll">
        <!-- 1. Specs & Overview Tab -->
        <div class="inspector-tab-page ${this.currentTab === 'SPECS' ? 'active' : ''}" id="tab-page-specs">
          <div class="inspector-section-card">
            <div class="sec-card-header">
              <span class="sec-icon">${Icons.bookOpen({ size: 14 })}</span>
              <h3>Overview &amp; Industrial Function</h3>
            </div>
            <p class="overview-text">${data.overview}</p>
            <div class="inspector-tags-row">
              ${tagsHtml}
            </div>
          </div>

          <div class="inspector-section-card">
            <div class="sec-card-header">
              <span class="sec-icon">${Icons.settings({ size: 14 })}</span>
              <h3>Technical Specifications Matrix</h3>
            </div>
            <div class="specs-grid">${specsList}</div>
          </div>
        </div>

        <!-- 2. Pinout Tab -->
        <div class="inspector-tab-page ${this.currentTab === 'PINOUT' ? 'active' : ''}" id="tab-page-pinout">
          <div class="inspector-section-card">
            <div class="sec-card-header">
              <span class="sec-icon">${Icons.cpu({ size: 14 })}</span>
              <h3>Field I/O Terminals &amp; Wiring Pinout</h3>
            </div>
            <p class="pinout-intro">Click any terminal row below to view full voltage characteristics, dry-contact wiring rules, and 3D pin highlighting.</p>
            <div class="ports-container">${portsList}</div>
          </div>
        </div>

        <!-- 3. Camera Tab -->
        <div class="inspector-tab-page ${this.currentTab === 'CAMERA' ? 'active' : ''}" id="tab-page-camera">
          ${cameraControlsHtml}
        </div>
      </div>

      <!-- Footer Control Hint -->
      <div class="inspector-footer-hint">
        <span class="footer-hint-text">
          <span class="hint-icon">${Icons.compass({ size: 12 })}</span>
          <span>Left-Drag: Orbit 360° • Scroll: Zoom • Right-Drag: Pan</span>
        </span>
        <button id="btn-inspector-reset-cam" class="footer-reset-btn" title="Reset Camera to Default Focus">
          ${Icons.rotateCcw({ size: 11 })} Reset View
        </button>
      </div>
    `;

    this.inspectorCard.classList.remove('hidden');

    // Bind sub-events
    document.getElementById('btn-close-inspector')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    document.getElementById('btn-speak-inspector')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const speakText = `${data.name}. ${data.overview}. Key Specifications: ${Object.entries(data.specs)
        .slice(0, 3)
        .map(([k, v]) => `${k}, ${v}`)
        .join('. ')}`;
      voiceNarrator.speak(speakText, 'SYSTEM');
    });

    document.getElementById('btn-inspector-reset-cam')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startCameraTransition(data.cameraFocusPos, data.cameraLookAt);
    });

    // Subtab switching
    this.inspectorCard.querySelectorAll('.subtab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.inspectorCard?.querySelectorAll('.subtab-btn').forEach((b) => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const tab = target.getAttribute('data-tab') as 'SPECS' | 'PINOUT' | 'CAMERA';
        this.currentTab = tab;

        this.inspectorCard?.querySelectorAll('.inspector-tab-page').forEach((page) => {
          page.classList.remove('active');
        });
        const pageId = tab === 'SPECS' ? 'tab-page-specs' : tab === 'PINOUT' ? 'tab-page-pinout' : 'tab-page-camera';
        const pageEl = document.getElementById(pageId);
        if (pageEl) pageEl.classList.add('active');
      });
    });

    // Equipment navigation tabs
    this.inspectorCard.querySelectorAll('.inspector-nav-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        const compId = (e.currentTarget as HTMLElement).getAttribute('data-comp');
        if (compId) this.inspect(compId);
      });
    });

    // Port selection & accordion toggle
    this.inspectorCard.querySelectorAll('.port-row-card').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetRow = e.currentTarget as HTMLElement;
        const portId = targetRow.getAttribute('data-port');
        const isAlreadySelected = targetRow.classList.contains('selected');

        this.inspectorCard?.querySelectorAll('.port-row-card').forEach((r) => r.classList.remove('selected'));
        if (!isAlreadySelected && portId) {
          targetRow.classList.add('selected');
          this.selectedPortId = portId;
          EventBus.emit('inspector:portSelected', { componentId: data.id, portId });
        } else {
          this.selectedPortId = null;
        }
      });
    });

    // Focus port button
    this.inspectorCard.querySelectorAll('.btn-focus-port').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const portId = (e.currentTarget as HTMLElement).getAttribute('data-port');
        if (portId) {
          this.setCameraAnglePreset('PORTS');
          EventBus.emit('inspector:portSelected', { componentId: data.id, portId });
        }
      });
    });

    // Camera preset buttons
    this.inspectorCard.querySelectorAll('.camera-preset-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const angle = (e.currentTarget as HTMLElement).getAttribute('data-angle') as
          | 'FRONT'
          | 'ISOMETRIC'
          | 'TOP'
          | 'SIDE'
          | 'PORTS';
        if (angle) this.setCameraAnglePreset(angle);
      });
    });

    // Auto rotate toggle
    document.getElementById('btn-inspector-auto-rotate')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleAutoRotate();
    });
  }

  isInspectionActive(): boolean {
    return this.isInspecting;
  }
}
