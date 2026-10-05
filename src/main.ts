// ============================================================
// main.ts – Industrial AR Wiring Training & Digital Twin System
// 5 Complete Industrial PLC Applications with Live Ladder Logic
// ============================================================

import './style.css';

import * as THREE from 'three';
import { AppState } from './core/AppState';
import { EventBus, Events } from './core/EventBus';
import type { ExperimentType } from './core/ExperimentConfig';
import { SceneManager } from './three/SceneManager';
import { setupLighting } from './three/Lighting';
import { InteractionManager } from './three/InteractionManager';
import { WireRenderer } from './three/WireRenderer';
import { PLCEquipment } from './equipment/PLCEquipment';
import { TankEquipment } from './equipment/TankEquipment';
import { PumpEquipment } from './equipment/PumpEquipment';
import { ValveEquipment } from './equipment/ValveEquipment';
import { LevelSensorEquipment } from './equipment/LevelSensorEquipment';
import { LevelIndicatorTower } from './equipment/LevelIndicatorTower';
import { PipeSystem } from './equipment/PipeSystem';
import { FlowAnimation } from './equipment/FlowAnimation';
import { ConveyorEquipment } from './equipment/ConveyorEquipment';
import { TrafficEquipment } from './equipment/TrafficEquipment';
import { RobotEquipment } from './equipment/RobotEquipment';
import { ReactorEquipment } from './equipment/ReactorEquipment';
import { TerminalManager } from './wiring/TerminalManager';
import { WiringTrainingEngine } from './wiring/WiringTrainingEngine';
import { TouchFeedbackVisualizer } from './ui/TouchFeedbackVisualizer';
import { ProcessEngine } from './simulation/ProcessEngine';
import { ConveyorProcessEngine } from './simulation/ConveyorProcessEngine';
import { TrafficProcessEngine } from './simulation/TrafficProcessEngine';
import { RobotProcessEngine } from './simulation/RobotProcessEngine';
import { ReactorProcessEngine } from './simulation/ReactorProcessEngine';
import { ARManager } from './ar/ARManager';
import { UIManager } from './ui/UIManager';
import { HandTracker } from './handTracking/HandTracker';
import { HandCursorVisualizer } from './handTracking/HandCursorVisualizer';
import { EquipmentPlacementManager } from './three/EquipmentPlacementManager';
import { ComponentInspector } from './ui/ComponentInspector';
import { PLCPortGuide } from './ui/PLCPortGuide';
import { CyberGestureController } from './handTracking/CyberGestureController';
import { voiceNarrator } from './core/VoiceNarrator';
import { voiceAssistantManager } from './core/VoiceAssistantManager';
import { TERMINAL, LAYOUT } from './core/constants';


// ============================================================
// DOM Setup
// ============================================================
const app = document.getElementById('app')!;
app.innerHTML = `
  <video id="camera-feed" autoplay playsinline muted></video>
  <canvas id="three-canvas"></canvas>
  <canvas id="touch-canvas"></canvas>
  <div id="ui-overlay"></div>
  <div id="loading-screen">
    <div class="loading-spinner"></div>
    <h1>AR PLC Training</h1>
    <p>Loading industrial simulator...</p>
    <div class="loading-bar"><div id="loading-bar-fill" class="loading-bar-fill"></div></div>
  </div>
`;

// ============================================================
// Initialize Core Modules
// ============================================================
const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
const touchCanvas = document.getElementById('touch-canvas') as HTMLCanvasElement;
const overlay = document.getElementById('ui-overlay') as HTMLElement;

const sceneManager = new SceneManager(canvas);
setupLighting(sceneManager.scene);

const interaction = new InteractionManager(sceneManager.camera);
const wireRenderer = new WireRenderer();
const touchVisualizer = new TouchFeedbackVisualizer(touchCanvas, overlay);
touchVisualizer.setCamera(sceneManager.camera);
touchVisualizer.setEquipmentGroup(sceneManager.equipmentGroup);

const handTracker = new HandTracker();
const handVisualizer = new HandCursorVisualizer(touchCanvas);
const placementManager = new EquipmentPlacementManager(sceneManager.camera, sceneManager.equipmentGroup);
const componentInspector = new ComponentInspector(sceneManager, overlay);

// PLC Equipment
const plc = new PLCEquipment();
const portGuide = new PLCPortGuide(plc, overlay);
portGuide.setCamera(sceneManager.camera);
portGuide.setVisible(false);

// Experiment 1: Water Tank Equipment
const tank = new TankEquipment();
const indicatorTower = new LevelIndicatorTower();
const pump = new PumpEquipment();
const valve = new ValveEquipment();
const sensor = new LevelSensorEquipment();
const pipes = new PipeSystem();
const flow = new FlowAnimation();

const tankGroup = new THREE.Group();
tankGroup.name = 'TankExperimentGroup';
tankGroup.add(tank.group);
tankGroup.add(indicatorTower.group);
tankGroup.add(pump.group);
tankGroup.add(valve.group);
tankGroup.add(pipes.group);
tankGroup.add(flow.group);

// Experiment 2: Conveyor Equipment
const conveyor = new ConveyorEquipment();
const conveyorGroup = new THREE.Group();
conveyorGroup.name = 'ConveyorExperimentGroup';
conveyorGroup.add(conveyor.group);

// Experiment 3: Traffic Equipment
const traffic = new TrafficEquipment();
const trafficGroup = new THREE.Group();
trafficGroup.name = 'TrafficExperimentGroup';
trafficGroup.add(traffic.group);

// Experiment 4: 3-Axis Robot Equipment
const robot = new RobotEquipment();
const robotGroup = new THREE.Group();
robotGroup.name = 'RobotExperimentGroup';
robotGroup.add(robot.group);

// Experiment 5: Thermal Batch Reactor Equipment
const reactor = new ReactorEquipment();
const reactorGroup = new THREE.Group();
reactorGroup.name = 'ReactorExperimentGroup';
reactorGroup.add(reactor.group);

// Wiring & Training Engine
const terminalManager = new TerminalManager();
const wiringEngine = new WiringTrainingEngine();

// Simulation Engines for all 5 Applications
const processEngine = new ProcessEngine();
const conveyorProcessEngine = new ConveyorProcessEngine(conveyor);
const trafficProcessEngine = new TrafficProcessEngine(traffic);
const robotProcessEngine = new RobotProcessEngine(robot);
const reactorProcessEngine = new ReactorProcessEngine(reactor);
const arManager = new ARManager();

// UI Orchestrator
const uiManager = new UIManager();

// Cyber Gesture Controller
const cyberGestureController = new CyberGestureController(
  sceneManager.camera,
  plc,
  tank,
  valve,
  pump,
  handVisualizer,
  conveyor
);

// ============================================================
// Multi-Experiment Configuration & Switching
// ============================================================
function setupExperiment(exp: ExperimentType): void {
  // 1. Clear existing wires & terminals
  wireRenderer.removeAll();
  terminalManager.clearTerminals();

  // Hide all experiment groups
  tankGroup.visible = false;
  conveyorGroup.visible = false;
  trafficGroup.visible = false;
  robotGroup.visible = false;
  reactorGroup.visible = false;

  touchVisualizer.clearCallouts();

  if (exp === 'TANK') {
    plc.group.position.set(LAYOUT.PLC_POSITION.x, LAYOUT.PLC_POSITION.y, LAYOUT.PLC_POSITION.z);
    plc.group.scale.setScalar(1);
    reactorGroup.scale.setScalar(1);
    tankGroup.visible = true;

    terminalManager.registerTerminal('LEVEL_SENSOR_LOW', 'Sensor OUT (Low Lamp)', indicatorTower.terminalLow);
    terminalManager.registerTerminal('LEVEL_SENSOR_HIGH', 'Sensor HIGH Lamp', indicatorTower.terminalHigh);
    terminalManager.registerTerminal('PUMP_CONTROL', 'Pump Control', pump.terminalControl);
    terminalManager.registerTerminal('PUMP_FEEDBACK', 'Pump Feedback', pump.terminalFeedback);
    terminalManager.registerTerminal('VALVE_CONTROL', 'Valve Control', valve.terminalControl);
    terminalManager.registerTerminal('VALVE_FEEDBACK', 'Valve Feedback', valve.terminalFeedback);

    touchVisualizer.addEquipmentCallout('callout_l1', 'High Level Sensor (L1)', '', new THREE.Vector3(-0.62, 0.44, 0), 'sensor');
    touchVisualizer.addEquipmentCallout('callout_l0', 'Low Level Sensor (L0)', '', new THREE.Vector3(-0.62, 0.10, 0), 'sensor');
    touchVisualizer.addEquipmentCallout('callout_tank', 'Water Tank', '', new THREE.Vector3(-0.52, -0.06, 0), 'tank');
    touchVisualizer.addEquipmentCallout('callout_stop', 'Stop (Red)', '', new THREE.Vector3(-0.23, 0.33, 0), 'button');
    touchVisualizer.addEquipmentCallout('callout_start', 'Start (Green)', '', new THREE.Vector3(-0.23, 0.26, 0), 'button');
    touchVisualizer.addEquipmentCallout('callout_plc', 'PLC', 'SIMATIC S7-1200', new THREE.Vector3(0.22, 0.54, -0.05), 'plc');
    touchVisualizer.addEquipmentCallout('callout_pump', 'Water Pump', '', new THREE.Vector3(0.52, -0.06, 0), 'pump');

    tank.setLevel(AppState.tankLevel);
    indicatorTower.setLevel(AppState.tankLevel);
  } else if (exp === 'CONVEYOR') {
    plc.group.position.set(LAYOUT.PLC_POSITION.x, LAYOUT.PLC_POSITION.y, LAYOUT.PLC_POSITION.z);
    plc.group.scale.setScalar(1);
    reactorGroup.scale.setScalar(1);
    conveyorGroup.visible = true;

    terminalManager.registerTerminal('CONVEYOR_OPTICAL_SENSOR', 'Optical Sensor OUT', conveyor.terminalOpticalSensor);
    terminalManager.registerTerminal('CONVEYOR_START_BTN', 'Start Pushbutton', conveyor.terminalStartButton);
    terminalManager.registerTerminal('CONVEYOR_MOTOR_DRIVE', 'Conveyor Motor Drive', conveyor.terminalMotorDrive);
    terminalManager.registerTerminal('CONVEYOR_PUSHER_VALVE', 'Pneumatic Diverter Valve', conveyor.terminalPusherValve);

    touchVisualizer.addEquipmentCallout('callout_sensor', 'Optical Proximity Sensor', 'IR Diffuse Beam', new THREE.Vector3(-0.08, 0.22, 0.12), 'sensor');
    touchVisualizer.addEquipmentCallout('callout_conveyor', 'Conveyor Bed & Belt', 'Aluminum Chassis', new THREE.Vector3(-0.20, 0.16, 0.02), 'tank');
    touchVisualizer.addEquipmentCallout('callout_motor', 'Siemens Gearmotor', '24V DC Drive', new THREE.Vector3(0.48, 0.12, -0.10), 'pump');
    touchVisualizer.addEquipmentCallout('callout_pusher', 'Pneumatic Diverter', 'SMC Cylinder', new THREE.Vector3(0.12, 0.18, -0.12), 'valve');
    touchVisualizer.addEquipmentCallout('callout_plc', 'PLC', 'SIMATIC S7-1200', new THREE.Vector3(0.22, 0.54, -0.05), 'plc');
  } else if (exp === 'TRAFFIC') {
    plc.group.position.set(LAYOUT.TRAFFIC_PLC_POSITION.x, LAYOUT.TRAFFIC_PLC_POSITION.y, LAYOUT.TRAFFIC_PLC_POSITION.z);
    plc.group.scale.setScalar(0.82);
    reactorGroup.scale.setScalar(1);
    trafficGroup.visible = true;

    terminalManager.registerTerminal('TRAFFIC_PED_BTN', 'Pedestrian Call Button', traffic.terminalPedButton);
    terminalManager.registerTerminal('TRAFFIC_VEHICLE_SENSOR', 'Inductive Vehicle Loop', traffic.terminalVehicleSensor);
    terminalManager.registerTerminal('TRAFFIC_MAIN_SIGNAL', 'Traffic Signal Matrix', traffic.terminalMainSignal);
    terminalManager.registerTerminal('TRAFFIC_PED_LIGHT', 'Pedestrian Walk Light', traffic.terminalPedLight);

    touchVisualizer.addEquipmentCallout('callout_sig', 'Traffic Signal Post', 'Red/Amber/Green LEDs', new THREE.Vector3(0.28, 0.40, 0.18), 'plc');
    touchVisualizer.addEquipmentCallout('callout_ped', 'Pedestrian Post', 'Walk / Don\'t Walk & PB', new THREE.Vector3(0.38, 0.28, 0.24), 'button');
    touchVisualizer.addEquipmentCallout('callout_loop', 'Inductive Loop Sensor', 'Vehicle Detector', new THREE.Vector3(0.12, 0.05, -0.16), 'sensor');
    touchVisualizer.addEquipmentCallout('callout_plc', 'PLC', 'SIMATIC S7-1200', new THREE.Vector3(0.22, 0.54, -0.05), 'plc');
  } else if (exp === 'ROBOT') {
    plc.group.position.set(LAYOUT.PLC_POSITION.x, LAYOUT.PLC_POSITION.y, LAYOUT.PLC_POSITION.z);
    plc.group.scale.setScalar(1);
    reactorGroup.scale.setScalar(1);
    robotGroup.visible = true;

    terminalManager.registerTerminal('ROBOT_PART_SENSOR', 'In-Feed Proximity Sensor', robot.terminalPartSensor);
    terminalManager.registerTerminal('ROBOT_HOME_SWITCH', 'Gantry Home Limit Switch', robot.terminalHomeSwitch);
    terminalManager.registerTerminal('ROBOT_SERVO_DRIVE', 'Gantry Servo Controller', robot.terminalServoDrive);
    terminalManager.registerTerminal('ROBOT_VACUUM_VALVE', 'Vacuum Solenoid Valve', robot.terminalVacuumValve);

    touchVisualizer.addEquipmentCallout('callout_gantry', 'Cartesian Gantry', 'X/Y Linear Actuators', new THREE.Vector3(0, 0.42, 0), 'tank');
    touchVisualizer.addEquipmentCallout('callout_vac', 'Vacuum Gripper', 'Suction Cup', new THREE.Vector3(0, 0.22, 0), 'pump');
    touchVisualizer.addEquipmentCallout('callout_nest', 'In-Feed Part Nest', 'Proximity Sensor', new THREE.Vector3(-0.28, 0.08, 0), 'sensor');
    touchVisualizer.addEquipmentCallout('callout_plc', 'PLC', 'SIMATIC S7-1200', new THREE.Vector3(0.22, 0.54, -0.05), 'plc');
  } else if (exp === 'REACTOR') {
    plc.group.position.set(LAYOUT.REACTOR_PLC_POSITION.x, LAYOUT.REACTOR_PLC_POSITION.y, LAYOUT.REACTOR_PLC_POSITION.z);
    plc.group.scale.setScalar(0.78);
    reactorGroup.scale.setScalar(0.78);
    reactorGroup.visible = true;

    terminalManager.registerTerminal('REACTOR_TEMP_SENSOR', 'PT100 Temperature Sensor', reactor.terminalTempSensor);
    terminalManager.registerTerminal('REACTOR_START_BTN', 'Recipe Batch Start PB', reactor.terminalStartButton);
    terminalManager.registerTerminal('REACTOR_AGITATOR_DRIVE', 'Agitator Motor Contactor', reactor.terminalAgitatorMotor);
    terminalManager.registerTerminal('REACTOR_HEATER_RELAY', 'Thermal Heater SSR Relay', reactor.terminalHeaterRelay);

    // Keep labels around the equipment silhouette so they do not stack over the vessel.
    touchVisualizer.addEquipmentCallout('callout_reactor', 'Jacketed Vessel', '316L Stainless Steel', new THREE.Vector3(-0.38, 0.40, 0), 'tank');
    touchVisualizer.addEquipmentCallout('callout_agitator', 'Impeller Agitator', 'Dual-Tier Pitch Blades', new THREE.Vector3(-0.34, 0.86, 0), 'pump');
    touchVisualizer.addEquipmentCallout('callout_heater', 'Heating Jacket', 'Electric Coils', new THREE.Vector3(-0.40, 0.16, -0.16), 'valve');
    touchVisualizer.addEquipmentCallout('callout_plc', 'PLC', 'SIMATIC S7-1200', new THREE.Vector3(0.70, 0.58, -0.05), 'plc');
  }

  // Refresh transforms
  sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
  plc.updateTerminalWorldPositions();
  terminalManager.updateWorldPositions();

  // Switch Wiring Engine state
  wiringEngine.setExperiment(exp);
  highlightCurrentStep();
}

EventBus.on('experiment:changed', (data: { experiment: ExperimentType }) => {
  setupExperiment(data.experiment);
});

// ============================================================
// Load & Initialization
// ============================================================
async function init(): Promise<void> {
  const loadingFill = document.getElementById('loading-bar-fill');

  try {
    // 1. Load Siemens PLC S7-1200 model
    updateLoading(loadingFill, 15, 'Loading PLC model...');
    await plc.load();
    sceneManager.equipmentGroup.add(plc.group);

    // 2. Add 3D procedural equipment groups for all 5 experiments
    updateLoading(loadingFill, 45, 'Creating multi-application field equipment...');
    sceneManager.equipmentGroup.add(tankGroup);
    sceneManager.equipmentGroup.add(conveyorGroup);
    sceneManager.equipmentGroup.add(trafficGroup);
    sceneManager.equipmentGroup.add(robotGroup);
    sceneManager.equipmentGroup.add(reactorGroup);
    sceneManager.equipmentGroup.add(wireRenderer.group);

    // 3. Register terminals & hit areas
    updateLoading(loadingFill, 75, 'Configuring I/O terminals...');
    sceneManager.scene.add(terminalManager.group);
    sceneManager.scene.add(terminalManager.hitGroup);

    // 4. Initial experiment setup
    setupExperiment(AppState.activeExperiment);

    // 5. Connect Equipment to Placement Manager
    placementManager.setEquipment(
      tank,
      plc,
      indicatorTower,
      pump,
      valve,
      pipes,
      flow,
      terminalManager,
      wireRenderer,
      touchVisualizer
    );

    // 6. Check AR readiness
    updateLoading(loadingFill, 90, 'Checking AR readiness...');
    await arManager.checkSupport();

    updateLoading(loadingFill, 100, 'Ready!');

    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => loadingScreen.remove(), 400);
      }
      voiceAssistantManager.speakCurrentTask(false);
    }, 500);

    AppState.setLoading(false, 100);
  } catch (err) {
    console.error('[Init] Error:', err);
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <h1 style="color: #ef4444;">Loading Error</h1>
        <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
        <button onclick="location.reload()" class="ctrl-btn primary" style="margin-top:16px;">Retry</button>
      `;
    }
  }
}

function updateLoading(fill: HTMLElement | null, pct: number, msg: string): void {
  if (fill) fill.style.width = `${pct}%`;
  AppState.setLoading(true, pct);
  console.log(`[Loading] ${pct}% – ${msg}`);
}

// ============================================================
// Highlight Active Source & Destination Terminals
// ============================================================
function highlightCurrentStep(): void {
  const step = wiringEngine.getCurrentStep();
  if (!step) {
    touchVisualizer.hideLabels();
    return;
  }

  const completedSources = AppState.wiringProgress.completed.map((c) => c.source);
  const completedTargets = AppState.wiringProgress.completed.map((c) => c.target);

  for (const t of plc.terminals) {
    if (completedSources.includes(t.id)) {
      plc.setTerminalState(t.id, 'connected');
    } else if (t.id === step.sourceId) {
      plc.setTerminalState(t.id, 'source_active');
    } else {
      plc.setTerminalState(t.id, 'idle');
    }
  }

  for (const t of terminalManager.terminals) {
    if (completedTargets.includes(t.id)) {
      terminalManager.setTerminalState(t.id, 'connected');
    } else if (t.id === step.targetId) {
      terminalManager.setTerminalState(t.id, 'target_active');
    } else {
      terminalManager.setTerminalState(t.id, 'idle');
    }
  }

  const srcTerm = plc.getTerminalById(step.sourceId);
  const tgtTerm = terminalManager.getTerminalById(step.targetId);

  if (srcTerm && tgtTerm) {
    // Give the user a wide, stable screen-space landing zone for each wire.
    touchVisualizer.setActiveLabels(
      step.index + 1,
      srcTerm.worldPosition,
      `PLC ${step.shortSource}`,
      tgtTerm.worldPosition,
      step.targetLabel
    );
  }
}

EventBus.on('training:stepChanged', () => highlightCurrentStep());

EventBus.on('training:completed', () => {
  touchVisualizer.hideLabels();
  isOrbitLocked = false;
  sceneManager.controls.enabled = true;
  EventBus.emit('scene:orbitStateChanged', { enabled: true });
  for (const t of plc.terminals) {
    if (AppState.wiringProgress.completed.some((c) => c.source === t.id)) {
      plc.setTerminalState(t.id, 'connected');
    }
  }
  for (const t of terminalManager.terminals) {
    if (AppState.wiringProgress.completed.some((c) => c.target === t.id)) {
      terminalManager.setTerminalState(t.id, 'connected');
    }
  }
});

EventBus.on('training:reset', () => {
  wireRenderer.removeAll();
  sceneManager.controls.enabled = true;
  highlightCurrentStep();
});

EventBus.on('training:requestReset', () => {
  wiringEngine.reset();
});

EventBus.on('scene:resetCamera', () => {
  sceneManager.resetCameraView();
  placementManager.resetLayout();
  plc.updateTerminalWorldPositions();
  terminalManager.updateWorldPositions();

  const mode = placementManager.getMode();
  if (mode === 'WIRING') {
    sceneManager.controls.enabled = false;
  } else if (mode === 'ROTATE_RIG') {
    sceneManager.controls.enabled = !isOrbitLocked;
  }

  uiManager.showToast('info', '3D View & Product: Reset to Default');
});

EventBus.on('ui:togglePortGuide', () => {
  const visible = portGuide.toggleVisible();
  EventBus.emit('ui:portGuideStateChanged', { visible });
  uiManager.showToast('info', visible ? '📌 S7-1200 Terminal Guides: ON' : '📌 Terminal Guides: OFF');
});

EventBus.on('ui:toggleCallouts', () => {
  const visible = touchVisualizer.toggleCallouts();
  EventBus.emit('ui:calloutsStateChanged', { visible });
  uiManager.showToast('info', visible ? 'Equipment Labels: ON' : 'Equipment Labels: OFF');
});

let isOrbitLocked = false;

EventBus.on('scene:toggleOrbit', () => {
  isOrbitLocked = !isOrbitLocked;
  const mode = placementManager.getMode();
  if (mode === 'WIRING') {
    sceneManager.controls.enabled = false;
  } else {
    sceneManager.controls.enabled = !isOrbitLocked;
  }
  EventBus.emit('scene:orbitStateChanged', { enabled: !isOrbitLocked });
  uiManager.showToast('info', isOrbitLocked ? '3D Rotation: Locked (Fixed)' : '3D Rotation: Unlocked (Free Orbit)');
});

EventBus.on('scene:toggleAutoRotate', () => {
  sceneManager.controls.autoRotate = !sceneManager.controls.autoRotate;
  sceneManager.controls.autoRotateSpeed = 1.8;
  EventBus.emit('scene:autoRotateStateChanged', { enabled: sceneManager.controls.autoRotate });
  uiManager.showToast('info', sceneManager.controls.autoRotate ? '360° Auto Orbit: ON' : 'Auto Orbit: OFF');
});

EventBus.on('placement:requestMode', (mode: string) => {
  placementManager.setMode(mode as any);
  lastTwoHandDistance = null;
  if (mode === 'ROTATE_RIG') {
    sceneManager.controls.enabled = !isOrbitLocked;
    uiManager.showToast('info', 'Rotate 3D Active: Orbit with mouse/touch or use two-hand spatial gestures.');
  } else if (mode === 'WIRING') {
    sceneManager.controls.enabled = false;
    uiManager.showToast('info', 'Wiring Lab: 3D rotation locked for stable wiring.');
  } else {
    sceneManager.controls.enabled = !isOrbitLocked;
  }
});

// ============================================================
// Auto-Wire & Step Helpers
// ============================================================
function connectCurrentStepDirectly(): void {
  const step = wiringEngine.getCurrentStep();
  if (!step) return;

  const sourceTerm = plc.getTerminalById(step.sourceId);
  const targetTerm = terminalManager.getTerminalById(step.targetId);
  if (!sourceTerm || !targetTerm) return;

  const success = wiringEngine.completeConnection(step.targetId);
  if (success) {
    const permanentWireId = `wire_${step.sourceId}_${step.targetId}`;
    wireRenderer.removeWire('drag_active');
    wireRenderer.updateWire(
      permanentWireId,
      sourceTerm.worldPosition,
      targetTerm.worldPosition,
      'connected',
      step.sourceId,
      step.targetId
    );

    plc.setTerminalState(step.sourceId, 'connected');
    terminalManager.setTerminalState(step.targetId, 'connected');
  }
}

EventBus.on('wiring:autoConnectStep', () => connectCurrentStepDirectly());

EventBus.on('wiring:autoConnectAll', () => {
  let count = 0;
  const interval = setInterval(() => {
    if (wiringEngine.isCompleted() || count >= 4) {
      clearInterval(interval);
    } else {
      connectCurrentStepDirectly();
      count++;
    }
  }, 350);
});

// ============================================================
// Direct Touch / Finger Wiring Interaction
// ============================================================
let isDraggingWire = false;
let activeSourceId: string | null = null;
let isSnapped = false;
let handSourceHoverSince = 0;
let handTargetHoverSince = 0;
const HAND_WIRE_PICKUP_RADIUS = 145;
const HAND_WIRE_CONNECT_RADIUS = 135;
const HAND_WIRE_DWELL_MS = 280;

function setWireHint(message: string): void {
  const hint = document.getElementById('training-subtext');
  if (hint) hint.textContent = message;
}

function getScreenPos(worldPos: THREE.Vector3): { x: number; y: number } | null {
  const v = worldPos.clone().project(sceneManager.camera);
  if (v.z > 1.0) return null;
  return {
    x: ((v.x + 1) / 2) * window.innerWidth,
    y: ((-v.y + 1) / 2) * window.innerHeight,
  };
}

function handleTouchDown(clientX: number, clientY: number): boolean {
  touchVisualizer.triggerTouchRipple(clientX, clientY);

  if (wiringEngine.isCompleted()) {
    sceneManager.controls.enabled = !isOrbitLocked;
    return false;
  }

  const step = wiringEngine.getCurrentStep();
  if (!step) {
    sceneManager.controls.enabled = !isOrbitLocked;
    return false;
  }

  const srcTerm = plc.getTerminalById(step.sourceId);

  const srcScreenPos = srcTerm ? getScreenPos(srcTerm.worldPosition) : null;

  const distToSrc = srcScreenPos ? Math.hypot(clientX - srcScreenPos.x, clientY - srcScreenPos.y) : 9999;

  // A real wire drag always starts at the active PLC output/input, never by
  // tapping the destination or the training hint.
  if (distToSrc < TERMINAL.HIT_DISTANCE_PX + 28) {
    isDraggingWire = true;
    activeSourceId = step.sourceId;
    isSnapped = false;
    sceneManager.controls.enabled = false;
    wiringEngine.startDrag(step.sourceId);
    setWireHint(`Wire picked up: drag to ${step.targetLabel}, then release.`);
    return true;
  }

  // 3. Raycast fallback to 3D meshes
  interaction.setPointerFromScreen(clientX, clientY);
  const hit = interaction.raycast(plc.getHitMeshes(), true);
  if (hit) {
    const terminal = plc.getTerminalByMesh(hit.object);
    if (terminal && terminal.id === step.sourceId) {
      isDraggingWire = true;
      activeSourceId = terminal.id;
      isSnapped = false;
      sceneManager.controls.enabled = false;
      wiringEngine.startDrag(terminal.id);
      setWireHint(`Wire picked up: drag to ${step.targetLabel}, then release.`);
      return true;
    }
  }

  sceneManager.controls.enabled = !isOrbitLocked;
  return false;
}

function handleTouchMove(clientX: number, clientY: number): void {
  if (!isDraggingWire || !activeSourceId) return;

  const step = wiringEngine.getCurrentStep();
  if (!step || wiringEngine.isCompleted()) return;

  const srcTerm = plc.getTerminalById(step.sourceId);
  const targetTerm = terminalManager.getTerminalById(step.targetId);
  if (!srcTerm || !targetTerm) return;

  const targetScreenPos = getScreenPos(targetTerm.worldPosition);
  const screenDistToTarget = targetScreenPos ? Math.hypot(clientX - targetScreenPos.x, clientY - targetScreenPos.y) : 9999;

  interaction.setPointerFromScreen(clientX, clientY);

  const cameraPlanePoint =
    interaction.getPointOnCameraPlane(srcTerm.worldPosition) ||
    interaction.getPointOnPlane(srcTerm.worldPosition.y) ||
    new THREE.Vector3(srcTerm.worldPosition.x, srcTerm.worldPosition.y, srcTerm.worldPosition.z);

  const distToTarget3D = cameraPlanePoint.distanceTo(targetTerm.worldPosition);

  let currentEndPos: THREE.Vector3;

  if (distToTarget3D < TERMINAL.SNAP_DISTANCE_3D || screenDistToTarget < TERMINAL.SNAP_DISTANCE_PX) {
    currentEndPos = targetTerm.worldPosition.clone();
    if (!isSnapped) {
      isSnapped = true;
      terminalManager.setTerminalState(targetTerm.id, 'snapped');
      if (targetScreenPos) {
        touchVisualizer.triggerTouchRipple(targetScreenPos.x, targetScreenPos.y, 'rgba(34, 197, 94, 0.9)');
      }
    }
  } else {
    currentEndPos = cameraPlanePoint;
    if (isSnapped) {
      isSnapped = false;
      terminalManager.setTerminalState(targetTerm.id, 'target_active');
    }
  }

  wireRenderer.updateWire('drag_active', srcTerm.worldPosition, currentEndPos, 'dragging');
  const hint = document.getElementById('training-subtext');
  if (hint) hint.textContent = isSnapped
    ? `Release to connect ${step.shortSource} to ${step.targetLabel}.`
    : `Drag the wire to the glowing ${step.targetLabel} terminal.`;
}

function handleTouchUp(clientX: number, clientY: number): void {
  if (isDraggingWire && activeSourceId) {
    const step = wiringEngine.getCurrentStep();
    if (step) {
      const targetTerm = terminalManager.getTerminalById(step.targetId);
      const targetScreenPos = targetTerm ? getScreenPos(targetTerm.worldPosition) : null;
      const screenDistToTarget = targetScreenPos ? Math.hypot(clientX - targetScreenPos.x, clientY - targetScreenPos.y) : 9999;

      if (screenDistToTarget < TERMINAL.SNAP_DISTANCE_PX + 38) {
        connectCurrentStepDirectly();
      } else {
        wireRenderer.removeWire('drag_active');
        wiringEngine.cancelDrag();
        terminalManager.setTerminalState(step.targetId, 'target_active');
        setWireHint(`Wire returned. Drag from ${step.shortSource} to ${step.targetLabel}.`);
      }
    } else {
      wireRenderer.removeWire('drag_active');
    }

    isDraggingWire = false;
    activeSourceId = null;
    isSnapped = false;
  }

  sceneManager.controls.enabled = !isOrbitLocked;
}

// Pointer Events
canvas.addEventListener('pointerdown', (e) => {
  const target = e.target as HTMLElement;
  if (target?.closest('.control-panel, .training-panel, .completion-modal, .status-panel, .tank-gauge, .top-bar, .component-inspector-card, .ladder-modal-backdrop, .left-scada-stack, .right-telemetry-stack, .bottom-center-dock, .scada-glass-card, .voice-assistant-mentor-hud, .emergency-alarm-banner, .alarm-log-card, button, input, select')) {
    return;
  }

  const mode = placementManager.getMode();
  if (mode === 'WIRING') {
    const isWireDrag = handleTouchDown(e.clientX, e.clientY);
    if (isWireDrag) {
      e.stopImmediatePropagation();
      e.preventDefault();
    } else {
      sceneManager.controls.enabled = !isOrbitLocked;
    }
  } else if (mode === 'MOVE_COMPONENT') {
    const ok = placementManager.startDrag(e.clientX, e.clientY);
    if (ok) {
      sceneManager.controls.enabled = false;
      e.stopImmediatePropagation();
      e.preventDefault();
    } else {
      sceneManager.controls.enabled = !isOrbitLocked;
    }
  } else if (mode === 'ROTATE_RIG') {
    sceneManager.controls.enabled = true;
  }
}, { capture: true, passive: false });

window.addEventListener('pointermove', (e) => {
  const mode = placementManager.getMode();
  if (mode === 'WIRING' && isDraggingWire) {
    e.stopImmediatePropagation();
    e.preventDefault();
    handleTouchMove(e.clientX, e.clientY);
  } else if (mode === 'MOVE_COMPONENT' && placementManager.getSelectedComponent()) {
    e.stopImmediatePropagation();
    e.preventDefault();
    placementManager.updateDrag(e.clientX, e.clientY);
  }
}, { capture: true, passive: false });

window.addEventListener('pointerup', (e) => {
  const mode = placementManager.getMode();
  if (isDraggingWire) {
    e.stopImmediatePropagation();
    e.preventDefault();
    handleTouchUp(e.clientX, e.clientY);
  }
  if (mode === 'MOVE_COMPONENT') {
    placementManager.endDrag();
    sceneManager.controls.enabled = !isOrbitLocked;
  }
}, { capture: true, passive: false });

// ============================================================
// Hand Tracking & Gesture Integration
// ============================================================
let desktopWebcamStream: MediaStream | null = null;
let wasHandPinching = false;
let lastTwoHandDistance: number | null = null;

async function toggleHandTracking(active: boolean): Promise<void> {
  const video = document.getElementById('camera-feed') as HTMLVideoElement;
  if (!video) return;

  if (active) {
    try {
      uiManager.showToast('info', 'Starting webcam for Spatial Hand Gestures...');
      video.style.display = 'block';
      video.classList.add('active');

      desktopWebcamStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      video.srcObject = desktopWebcamStream;
      await video.play();

      const ok = await handTracker.init(video);
      if (ok) {
        uiManager.showToast('success', 'Hand Gestures Active: Point to interact, Pinch to wire, Closed Fist for E-Stop.');
      } else {
        uiManager.showToast('error', 'Hand tracking model loading failed. Please check internet connection.');
      }
    } catch (err: any) {
      console.warn('[HandTracking] Webcam access error:', err);
      uiManager.showToast('error', `Camera access denied: ${err.message || 'Permission needed'}`);
    }
  } else {
    if (desktopWebcamStream) {
      desktopWebcamStream.getTracks().forEach((t) => t.stop());
      desktopWebcamStream = null;
    }
    video.srcObject = null;
    video.style.display = 'none';
    video.classList.remove('active');
    handTracker.dispose();
    cyberGestureController.onHandLost();
    handVisualizer.setHandState(false, null, null, false);
    uiManager.showToast('info', 'Hand Gestures: Standby');
  }
}

EventBus.on('hand:toggleTracking', (data: { active: boolean }) => {
  toggleHandTracking(data.active);
});

// MediaPipe Hand Stream Ready (AR mode)
EventBus.on('ar:videoReady', async (video: HTMLVideoElement) => {
  const ok = await handTracker.init(video);
  if (ok) {
    uiManager.showToast('info', 'Hand tracking active in AR: Pinch to grab & wire.');
  }
});

let lastHandX: number | null = null;
let lastHandY: number | null = null;

// Real-time Hand Movement, Gestures & Air-Wiring
EventBus.on(Events.FINGER_MOVE, (data: {
  x: number;
  y: number;
  thumbX: number;
  thumbY: number;
  isPinching: boolean;
  pinchDist: number;
  landmarks?: any[];
  numHands?: number;
}) => {
  const mode = placementManager.getMode();
  // 1. Update Holographic Hand Cursor Visualizer
  handVisualizer.setHandState(
    true,
    { x: data.x, y: data.y },
    { x: data.thumbX, y: data.thumbY },
    data.isPinching,
    data.landmarks
  );

  if (data.numHands && data.numHands >= 2) {
    handVisualizer.setRecognizedPose('TWO_HAND_ROTATE');
    return;
  }

  // 2. Feed Cyber Gesture Controller (Raycasting & Poses)
  cyberGestureController.processHandFrame(data);

  // 3. Air-Pinch Spatial Wiring & Hand Rotation Interaction
  if (mode === 'WIRING') {
    const step = wiringEngine.getCurrentStep();
    if (step && !wiringEngine.isCompleted()) {
      const srcTerm = plc.getTerminalById(step.sourceId);
      const tgtTerm = terminalManager.getTerminalById(step.targetId);

      const srcScreenPos = srcTerm ? getScreenPos(srcTerm.worldPosition) : null;
      const tgtScreenPos = tgtTerm ? getScreenPos(tgtTerm.worldPosition) : null;

      const distToSrc = srcScreenPos ? Math.hypot(data.x - srcScreenPos.x, data.y - srcScreenPos.y) : 9999;
      const distToTgt = tgtScreenPos ? Math.hypot(data.x - tgtScreenPos.x, data.y - tgtScreenPos.y) : 9999;

      // Point at a highlighted source or pinch it to pick up its wire.
      if (!isDraggingWire) {
        const sourceReady = distToSrc <= HAND_WIRE_PICKUP_RADIUS;
        handSourceHoverSince = sourceReady ? (handSourceHoverSince || performance.now()) : 0;
        const sourceDwelled = handSourceHoverSince > 0 && performance.now() - handSourceHoverSince >= HAND_WIRE_DWELL_MS;
        if (sourceReady && (data.isPinching || sourceDwelled)) {
          isDraggingWire = true;
          activeSourceId = step.sourceId;
          isSnapped = false;
          handSourceHoverSince = 0;
          handTargetHoverSince = 0;
          sceneManager.controls.enabled = false;
          wiringEngine.startDrag(step.sourceId);
          setWireHint(`Wire held. Point to ${step.targetLabel} to connect.`);
          if (srcScreenPos) {
            touchVisualizer.triggerTouchRipple(srcScreenPos.x, srcScreenPos.y, 'rgba(56, 189, 248, 0.95)');
          }
        }
      } else {
        // 2. Wire follows finger smoothly in real-time
        handleTouchMove(data.x, data.y);

        // A stable point at the highlighted destination connects hands-free.
        const targetReady = distToTgt <= HAND_WIRE_CONNECT_RADIUS;
        handTargetHoverSince = targetReady ? (handTargetHoverSince || performance.now()) : 0;
        const targetDwelled = handTargetHoverSince > 0 && performance.now() - handTargetHoverSince >= HAND_WIRE_DWELL_MS;
        if (targetDwelled) {
          connectCurrentStepDirectly();
          isDraggingWire = false;
          activeSourceId = null;
          isSnapped = false;
          handTargetHoverSince = 0;
          sceneManager.controls.enabled = !isOrbitLocked;
          setWireHint('Connected. Follow the highlighted terminals for the next wire.');
          if (tgtScreenPos) {
            touchVisualizer.triggerTouchRipple(tgtScreenPos.x, tgtScreenPos.y, 'rgba(34, 197, 94, 0.95)');
          }
        } else if (wasHandPinching && !data.isPinching) {
          handleTouchUp(data.x, data.y);
          isDraggingWire = false;
          activeSourceId = null;
          isSnapped = false;
          handTargetHoverSince = 0;
        }
      }
    }
  } else if (mode === 'ROTATE_RIG') {
    // Rotate mode is driven by the dedicated two-hand gesture handler.
  } else if (mode === 'MOVE_COMPONENT') {
    if (!wasHandPinching && data.isPinching) {
      placementManager.startDrag(data.x, data.y);
    } else if (wasHandPinching && data.isPinching) {
      placementManager.updateDrag(data.x, data.y);
    } else if (wasHandPinching && !data.isPinching) {
      placementManager.endDrag();
    }
  }

  lastHandX = data.x;
  lastHandY = data.y;
  wasHandPinching = data.isPinching;
});

EventBus.on(Events.HAND_LOST, () => {
  cyberGestureController.onHandLost();
  handVisualizer.setHandState(false, null, null, false);
  if (isDraggingWire) {
    wireRenderer.removeWire('drag_active');
    isDraggingWire = false;
    activeSourceId = null;
    isSnapped = false;
  }
  wasHandPinching = false;
  handSourceHoverSince = 0;
  handTargetHoverSince = 0;
  lastHandX = null;
  lastHandY = null;

});

// Clean two-hand 3D orbit rotation (supports spatial drag and steering wheel motion)
EventBus.on('hand:twoHandMove', (data: { centerX: number; centerY: number; deltaX: number; deltaY: number; deltaAngle?: number; deltaDepth?: number }) => {
  const dx = data.deltaX / window.innerWidth;
  const dy = data.deltaY / window.innerHeight;
  const dAngle = data.deltaAngle || 0;
  const dDepth = data.deltaDepth || 0;
  if (Math.hypot(dx, dy) > 0.0001 || Math.abs(dAngle) > 0.0005 || Math.abs(dDepth) > 0.0005) {
    sceneManager.rotateByDelta(dx, dy, dAngle, dDepth);

  }

});

// 3D Navigation D-Pad & Zoom Gizmo Handlers
EventBus.on('scene:orbitTilt', (direction: number) => {
  sceneManager.orbitTilt(direction);
});

EventBus.on('scene:orbitPan', (direction: number) => {
  sceneManager.orbitPan(direction);
});

EventBus.on('scene:zoomIn', () => {
  sceneManager.zoomIn();
});

EventBus.on('scene:zoomOut', () => {
  sceneManager.zoomOut();
});

// PLC & Simulation State Listeners
EventBus.on(Events.PLC_STATE_CHANGED, (state: string) => {
  if (state === 'RUN') plc.setLEDState('green');
  else if (state === 'FAULT') plc.setLEDState('red');
  else if (state === 'READY') plc.setLEDState('yellow');
  else plc.setLEDState('off');
});

// Process Simulation Events (Tank)
EventBus.on(Events.PUMP_STATE_CHANGED, (state: string) => pump.setRunning(state === 'ON'));
EventBus.on(Events.VALVE_STATE_CHANGED, (state: string) => valve.setOpen(state === 'OPEN'));
EventBus.on(Events.FLOW_STATE_CHANGED, (state: string) => {
  const active = state === 'ACTIVE';
  flow.setActive(active);
  tank.setFlowing(active);
});
EventBus.on(Events.TANK_LEVEL_CHANGED, (level: number) => {
  tank.setLevel(level);
  indicatorTower.setLevel(level);
});
EventBus.on(Events.SENSOR_STATE_CHANGED, (state: string) => sensor.setState(state as any));

// AR Mode Toggle
EventBus.on('ui:toggleAR', async () => {
  if (AppState.viewMode === 'AR') {
    arManager.stopAR();
  } else {
    const success = await arManager.startAR(sceneManager.renderer);
    if (!success) {
      uiManager.showToast('error', 'Camera access denied or AR not supported.');
    }
  }
});

// ============================================================
// Animation Render Loop (All 5 Applications)
// ============================================================
sceneManager.onUpdate((dt) => {
  plc.update(dt);
  plc.updateTerminalWorldPositions();
  terminalManager.updateWorldPositions();
  terminalManager.update(dt);
  componentInspector.update(dt);

  const activeExp = AppState.activeExperiment;

  if (activeExp === 'TANK') {
    indicatorTower.update(dt);
    tank.update(dt);
    pump.update(dt);
    valve.update(dt);
    flow.update(dt);
    processEngine.update(dt);
  } else if (activeExp === 'CONVEYOR') {
    conveyorProcessEngine.update(dt);
  } else if (activeExp === 'TRAFFIC') {
    trafficProcessEngine.update(dt);
  } else if (activeExp === 'ROBOT') {
    robotProcessEngine.update(dt);
  } else if (activeExp === 'REACTOR') {
    reactorProcessEngine.update(dt);
  }
});

// Start scene & app
sceneManager.start();
init();

console.log('[ARPLCWebAR] Industrial AR 5-Experiment Suite Ready.');



