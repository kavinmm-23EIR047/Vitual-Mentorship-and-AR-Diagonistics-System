// ============================================================
// Constants – Industrial AR PLC Training System
// ============================================================

// --- Tank Level Thresholds ---
export const TANK_THRESHOLDS = {
  EMPTY: 0,
  LOW: 20,
  NORMAL_MIN: 21,
  NORMAL_MAX: 80,
  HIGH: 81,
  OVERFLOW: 96,
  MAX: 100,
} as const;

export const DEFAULT_TARGET_LEVEL = 70;
export const TANK_FILL_RATE = 0.15;
export const TANK_DRAIN_RATE = 0.05;

// --- States ---
export type PLCState = 'POWER_OFF' | 'STOP' | 'READY' | 'RUN' | 'FAULT';
export type PumpState = 'OFF' | 'ON' | 'FAULT';
export type ValveState = 'CLOSED' | 'OPEN' | 'FAULT';
export type FlowState = 'STOPPED' | 'ACTIVE';
export type SensorState = 'NORMAL' | 'LOW' | 'HIGH' | 'FAULT';
export type LevelStatus = 'EMPTY' | 'LOW' | 'NORMAL' | 'HIGH' | 'OVERFLOW';
export type SystemMode = 'MANUAL' | 'AUTO';
export type InteractionMode = 'NORMAL' | 'WIRING' | 'PLACEMENT';
export type ViewMode = 'PREVIEW_3D' | 'AR';
export type MentorState = 'WAITING' | 'GUIDING' | 'USER_INTERACTING' | 'CORRECT' | 'INCORRECT' | 'COMPLETE';
export type GestureState = 'IDLE' | 'POINTING' | 'HOVER' | 'DRAGGING' | 'RELEASED';
export type TrainingState = 'IDLE' | 'WAITING_FOR_SOURCE' | 'DRAGGING' | 'VALIDATING' | 'CONNECTED' | 'COMPLETED';

// --- Colors (Three.js hex) ---
export const COLORS = {
  // LEDs
  LED_GREEN: 0x00ff88,
  LED_RED: 0xff3344,
  LED_YELLOW: 0xffdd00,
  LED_OFF: 0x272e3b,

  // Industrial Cables
  CABLE_DARK: 0x1e293b,
  CABLE_DRAGGING: 0x38bdf8,
  CABLE_CONNECTED: 0x22c55e,
  CABLE_ERROR: 0xef4444,

  // Terminal Highlights
  TERMINAL_IDLE: 0x475569,
  TERMINAL_SOURCE_ACTIVE: 0x38bdf8,   // Subtle bright cyan for active source
  TERMINAL_TARGET_ACTIVE: 0x34d399,   // Soft green/cyan for active destination
  TERMINAL_HOVER: 0x06b6d4,
  TERMINAL_CONNECTED: 0x22c55e,
  TERMINAL_ERROR: 0xef4444,

  // Equipment
  TANK_BODY: 0x64748b,
  LIQUID: 0x0284c7,
  LIQUID_SURFACE: 0x38bdf8,

  PUMP_BODY: 0x0284c7,     // Industrial Siemens Electric Blue
  PUMP_MOTOR: 0x00558b,
  PUMP_ACTIVE: 0x22c55e,
  VALVE_BODY: 0x475569,
  VALVE_ISOLATION: 0x94a3b8,
  VALVE_HANDWHEEL: 0x0284c7, // Blue Handwheel
  VALVE_GATE: 0xef4444,

  PIPE: 0x94a3b8,
  SENSOR_BODY: 0x0284c7,

  GRID: 0x2a2a4e,
  GROUND: 0x1a1a2e,
} as const;

// --- Scene Layout (world units matching reference industrial bench) ---
export const LAYOUT = {
  PLC_POSITION: { x: 0.22, y: 0.36, z: -0.05 },
  // Behind the intersection, centered in the scene and kept clear of the road corners.
  TRAFFIC_PLC_POSITION: { x: 0.02, y: 0.44, z: -0.38 },
  REACTOR_PLC_POSITION: { x: 0.28, y: 0.36, z: -0.05 },
  TANK_POSITION: { x: -0.52, y: 0, z: 0 },
  OPERATOR_STATION_POSITION: { x: -0.31, y: 0.26, z: 0 },
  PUMP_POSITION: { x: 0.52, y: 0.05, z: 0 },
  CHECK_VALVE_POSITION: { x: -0.04, y: 0.05, z: 0 },
  VALVE_POSITION: { x: 0.18, y: 0.05, z: 0 },
  SENSOR_POSITION: { x: -0.52, y: 0.35, z: 0 },
  PLC_SCALE: 2.3,
  TANK_RADIUS: 0.16,
  TANK_HEIGHT: 0.46,
} as const;

// --- Terminal Visual & Hit Areas ---
export const TERMINAL = {
  RADIUS: 0.012,          // visible dot radius
  GLOW_RADIUS: 0.024,     // visible glow radius
  HIT_RADIUS: 0.16,       // enlarged invisible hit target for comfortable touch
  SNAP_DISTANCE_3D: 0.32, // 3D world units snap threshold
  SNAP_DISTANCE_PX: 110,  // screen-space wire landing radius
  HIT_DISTANCE_PX: 108,   // screen-space source pickup radius
} as const;

// --- Wire Cable Parameters ---
export const WIRE = {
  RADIUS: 0.005,          // Realistic industrial cable thickness
  SEGMENTS: 32,
  CURVE_POINTS: 60,
  SAG_FACTOR: 0.08,       // Natural cable sag downwards
} as const;

// --- Hand Tracking ---
export const HAND = {
  SMOOTHING_FACTOR: 0.35,
  HOVER_DISTANCE: 0.03,
  DRAG_THRESHOLD_PX: 8,
  CONFIDENCE_MIN: 0.6,
} as const;

// --- Performance ---
export const PERF = {
  HAND_TRACK_INTERVAL_MS: 33,
  MAX_PARTICLES: 200,
  SHADOW_MAP_SIZE: 512,
} as const;

// --- Haptics ---
export const VIBRATION = {
  TOUCH_START: [20],
  SNAP: [35],
  SUCCESS: [40, 60, 80],
  ERROR: [80, 50, 80],
} as const;

// --- PLC Material Names (from GLB inspection) ---
export const PLC_MATERIALS = {
  GREEN_LED: '0069_VerdeLima',
  RED_LED: '0020_Rojo',
  ORANGE_LED: '0038_Naranja',
  BODY_WHITE: '0128_Blanco',
  BODY_GREY: '0110_GrisPizarraClaro',
  BODY_CARBON: '0136_Carbn',
  BODY_BLACK: '0137_Negro',
} as const;
