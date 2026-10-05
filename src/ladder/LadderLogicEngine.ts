// ============================================================
// LadderLogicEngine.ts – Real-Time Interactive Ladder Logic Engine
// IEC 61131-3 Standard Rungs, Live Power Flow & Student Explanations
// ============================================================

import { AppState } from '../core/AppState';
import type { ExperimentType } from '../core/ExperimentConfig';

export type ContactType = 'NO' | 'NC' | 'TIMER' | 'COIL' | 'COUNTER';

export interface LadderElement {
  id: string;
  type: ContactType;
  tag: string;
  label: string;
  isEnergized: boolean;
  timerPT?: number; // Preset Time in sec
  timerET?: number; // Elapsed Time in sec
}

export interface LadderRung {
  rungNumber: number;
  title: string;
  description: string;
  booleanEquation: string;
  learningNote: string;
  isRungTrue: boolean;
  elements: LadderElement[];
  outputCoil: LadderElement;
}

export class LadderLogicEngine {
  public static getRungsForExperiment(exp: ExperimentType): LadderRung[] {
    switch (exp) {
      case 'CONVEYOR':
        return this.getConveyorRungs();
      case 'TRAFFIC':
        return this.getTrafficRungs();
      case 'ROBOT':
        return this.getRobotRungs();
      case 'REACTOR':
        return this.getReactorRungs();
      case 'TANK':
      default:
        return this.getTankRungs();
    }
  }

  // --- EXPERIMENT 1: Water Tank Ladder Rungs ---
  private static getTankRungs(): LadderRung[] {
    const isPlcRun = AppState.plcState === 'RUN';
    const isPumpOn = AppState.pumpState === 'ON';
    const isValveOpen = AppState.valveState === 'OPEN';
    const isLowSensor = AppState.tankLevel <= 20;
    const isHighSensor = AppState.tankLevel >= 80;

    const rung0True = isPlcRun;
    const rung1True = isPlcRun && (isLowSensor || isPumpOn) && !isHighSensor;
    const rung2True = isPlcRun && (isHighSensor || isValveOpen);
    const rung3True = isHighSensor;

    return [
      {
        rungNumber: 0,
        title: 'Rung 000: Master CPU Run & Safety Interlock',
        description: 'Verifies PLC CPU execution state and emergency stop contact continuity.',
        booleanEquation: 'M0.0 = S7_1200_RUN ∧ ¬EMERGENCY_STOP',
        learningNote: 'Standard industrial safety master permissive. If E-Stop trips or CPU is paused, all downstream rungs are isolated.',
        isRungTrue: rung0True,
        elements: [
          { id: 't_r0_c1', type: 'NO', tag: '%I0.1', label: 'CPU RUN', isEnergized: isPlcRun },
          { id: 't_r0_c2', type: 'NC', tag: '%I0.0', label: 'E-STOP NC', isEnergized: !isPlcRun },
        ],
        outputCoil: { id: 't_r0_coil', type: 'COIL', tag: 'M0.0', label: 'MASTER PERMISSIVE', isEnergized: rung0True },
      },
      {
        rungNumber: 1,
        title: 'Rung 001: Automatic Water Pump Filling Control',
        description: 'Engages centrifugal pump when low level sensor trips (<20%) until high level cut-off.',
        booleanEquation: 'Q0.0 = M0.0 ∧ (¬I0.0 ∨ Q0.0) ∧ ¬I0.1',
        learningNote: 'Uses a latching (seal-in) contact Q0.0 in parallel with low sensor I0.0, keeping the pump running until high float I0.1 breaks the circuit.',
        isRungTrue: rung1True,
        elements: [
          { id: 't_r1_c1', type: 'NO', tag: 'M0.0', label: 'MASTER ON', isEnergized: isPlcRun },
          { id: 't_r1_c2', type: 'NO', tag: '%I0.0', label: 'LOW SENSOR (L0)', isEnergized: isLowSensor },
          { id: 't_r1_c3', type: 'NC', tag: '%I0.1', label: 'HIGH SENSOR (L1)', isEnergized: !isHighSensor },
        ],
        outputCoil: { id: 't_r1_coil', type: 'COIL', tag: '%Q0.0', label: 'PUMP STARTER CONTACTOR', isEnergized: isPumpOn },
      },
      {
        rungNumber: 2,
        title: 'Rung 002: Proportional Drain Valve Actuation',
        description: 'Opens motorized drain valve when tank exceeds level setpoint or high limit.',
        booleanEquation: 'Q0.1 = M0.0 ∧ (I0.1 ∨ MANUAL_DRAIN)',
        learningNote: 'Commands the proportional gate valve actuator to release liquid and maintain setpoint equilibrium.',
        isRungTrue: rung2True,
        elements: [
          { id: 't_r2_c1', type: 'NO', tag: 'M0.0', label: 'MASTER ON', isEnergized: isPlcRun },
          { id: 't_r2_c2', type: 'NO', tag: '%I0.1', label: 'HIGH FLOAT (L1)', isEnergized: isHighSensor },
        ],
        outputCoil: { id: 't_r2_coil', type: 'COIL', tag: '%Q0.1', label: 'DRAIN VALVE SOLENOID', isEnergized: isValveOpen },
      },
      {
        rungNumber: 3,
        title: 'Rung 003: High-Level Visual Alarm Tower',
        description: 'Illuminates the Red High Alarm dome beacon on the indicator stand.',
        booleanEquation: 'LAMP_HI = I0.1 ∧ M0.0',
        learningNote: 'ISA-18.2 compliant visual warning to alert plant operators of impending liquid overflow.',
        isRungTrue: rung3True,
        elements: [
          { id: 't_r3_c1', type: 'NO', tag: '%I0.1', label: 'HIGH ALARM FLOAT', isEnergized: isHighSensor },
        ],
        outputCoil: { id: 't_r3_coil', type: 'COIL', tag: 'ALM_HI', label: 'RED ALARM TOWER BEACON', isEnergized: isHighSensor },
      },
    ];
  }

  // --- EXPERIMENT 2: Conveyor & Optical Sorting Rungs ---
  private static getConveyorRungs(): LadderRung[] {
    const isPlcRun = AppState.plcState === 'RUN';
    const isMotorOn = AppState.conveyorMotorState === 'ON';
    const isSensorTripped = AppState.opticalSensorDetected;
    const isPusherExt = AppState.diverterPusherExtended;

    const rung0True = isPlcRun && isMotorOn;
    const rung1True = isPlcRun && isSensorTripped;
    const rung2True = isPlcRun && isPusherExt;

    return [
      {
        rungNumber: 0,
        title: 'Rung 000: Conveyor Start/Stop Motor Latch',
        description: 'Operator station start button latches the 24V gearmotor drive.',
        booleanEquation: 'Q0.0 = (I0.1_START ∨ Q0.0) ∧ ¬STOP_PB',
        learningNote: 'Classic industrial seal-in contact. Pressing Start PB (%I0.1) latches DO0 (%Q0.0) on until Stop pushbutton is pressed.',
        isRungTrue: rung0True,
        elements: [
          { id: 'c_r0_c1', type: 'NO', tag: '%I0.1', label: 'START PB', isEnergized: isMotorOn },
          { id: 'c_r0_c2', type: 'NC', tag: '%I0.0_STOP', label: 'STOP PB NC', isEnergized: true },
        ],
        outputCoil: { id: 'c_r0_coil', type: 'COIL', tag: '%Q0.0', label: 'CONVEYOR MOTOR DRIVE', isEnergized: isMotorOn },
      },
      {
        rungNumber: 1,
        title: 'Rung 001: Photoelectric Part Detect & On-Delay Timer',
        description: 'Photoelectric sensor detects workpiece and starts travel delay timer TON.',
        booleanEquation: 'T001.IN = %I0.0 ∧ %Q0.0 (Belt Running)',
        learningNote: 'TON (Timer On-Delay) compensates for the physical distance between the optical beam and pneumatic pusher paddle.',
        isRungTrue: rung1True,
        elements: [
          { id: 'c_r1_c1', type: 'NO', tag: '%I0.0', label: 'OPTICAL SENSOR', isEnergized: isSensorTripped },
          { id: 'c_r1_c2', type: 'NO', tag: '%Q0.0', label: 'BELT RUNNING', isEnergized: isMotorOn },
        ],
        outputCoil: { id: 'c_r1_coil', type: 'TIMER', tag: 'TON_SORT', label: 'TRAVEL DELAY (PT: 720ms)', isEnergized: isSensorTripped, timerPT: 720, timerET: isSensorTripped ? 720 : 0 },
      },
      {
        rungNumber: 2,
        title: 'Rung 002: Pneumatic Diverter Cylinder Solenoid',
        description: 'Fires 5/2-way pneumatic solenoid valve to eject part into sorting bin.',
        booleanEquation: 'Q0.1 = TON_SORT.Q ∧ NOT_FAULT',
        learningNote: 'Actuates pneumatic cylinder piston stroke (380ms pulse duration) to divert package into reject chute.',
        isRungTrue: rung2True,
        elements: [
          { id: 'c_r2_c1', type: 'NO', tag: 'TON_SORT.Q', label: 'TIMER DONE', isEnergized: isPusherExt },
        ],
        outputCoil: { id: 'c_r2_coil', type: 'COIL', tag: '%Q0.1', label: 'DIVERTER SOLENOID VALVE', isEnergized: isPusherExt },
      },
      {
        rungNumber: 3,
        title: 'Rung 003: Production Sorting Counter (CTU)',
        description: 'Increments total sorted parts counter in non-volatile data block.',
        booleanEquation: 'DB1.PartCount = CTU(CU: %Q0.1, PV: 9999)',
        learningNote: 'CTU (Up Counter) tracks manufacturing yield and throughput metrics for SCADA telemetry.',
        isRungTrue: isPusherExt,
        elements: [
          { id: 'c_r3_c1', type: 'NO', tag: '%Q0.1', label: 'PUSHER FIRED', isEnergized: isPusherExt },
        ],
        outputCoil: { id: 'c_r3_coil', type: 'COUNTER', tag: 'CTU_SORT', label: `COUNT: ${AppState.conveyorPartsSorted}`, isEnergized: isPusherExt },
      },
    ];
  }

  // --- EXPERIMENT 3: Smart Traffic & Pedestrian Rungs ---
  private static getTrafficRungs(): LadderRung[] {
    const isPlcRun = AppState.plcState === 'RUN';
    const phase = AppState.trafficPhase;
    const isGreen = phase === 'MAIN_GREEN';
    const isYellow = phase === 'MAIN_YELLOW';
    const isRed = phase === 'MAIN_RED' || phase === 'ALL_RED' || phase === 'CROSS_YELLOW';
    const isPedWalk = AppState.pedWalkPhase === 'WALK' || AppState.pedWalkPhase === 'FLASHING';
    const isLoopActive = AppState.vehicleDetected;
    const isPedCall = AppState.pedCallRequested;

    return [
      {
        rungNumber: 0,
        title: 'Rung 000: Master Intersection Phase Sequencer',
        description: 'Multi-phase state machine coordinating timed traffic transitions.',
        booleanEquation: 'PHASE_SEQ = TON(PT: 10s) ∧ NOT_E_STOP',
        learningNote: 'Industrial traffic controllers use cascading TON timers to enforce safe minimum green and clearance intervals.',
        isRungTrue: isPlcRun,
        elements: [
          { id: 'tr_r0_c1', type: 'NO', tag: 'S7_RUN', label: 'CPU RUN', isEnergized: isPlcRun },
          { id: 'tr_r0_c2', type: 'NO', tag: 'LOOP_DET', label: 'VEHICLE LOOP', isEnergized: isLoopActive },
        ],
        outputCoil: { id: 'tr_r0_coil', type: 'TIMER', tag: 'TON_PHASE', label: `PHASE TIMER (${AppState.trafficPhaseTimer}s)`, isEnergized: isPlcRun, timerPT: 10, timerET: AppState.trafficPhaseTimer },
      },
      {
        rungNumber: 1,
        title: 'Rung 001: Pedestrian Call Request Latch',
        description: 'Latches pedestrian push button request into memory bit M1.0.',
        booleanEquation: 'M1.0 = (%I0.0_PED_PB ∨ M1.0) ∧ ¬CROSSWALK_COMPLETE',
        learningNote: 'Ensures pedestrian request is remembered even if button was pressed momentarily 30 seconds before green ends.',
        isRungTrue: isPedCall || isPedWalk,
        elements: [
          { id: 'tr_r1_c1', type: 'NO', tag: '%I0.0', label: 'PED CALL BUTTON', isEnergized: isPedCall },
        ],
        outputCoil: { id: 'tr_r1_coil', type: 'COIL', tag: 'M1.0', label: 'PEDESTRIAN MEMORY LATCH', isEnergized: isPedCall || isPedWalk },
      },
      {
        rungNumber: 2,
        title: 'Rung 002: Main Avenue Signal Output Matrix',
        description: 'Energizes Green (%Q0.0), Yellow, or Red LED signal heads.',
        booleanEquation: '%Q0.0_GREEN = PHASE_GREEN ∧ ¬EMERGENCY_OVERRIDE',
        learningNote: 'Hardware interlocks prevent Green and Red from ever energizing concurrently.',
        isRungTrue: isGreen,
        elements: [
          { id: 'tr_r2_c1', type: 'NO', tag: 'PHASE_G', label: 'GREEN PHASE', isEnergized: isGreen },
          { id: 'tr_r2_c2', type: 'NC', tag: 'EMERGENCY', label: 'E-OVERRIDE NC', isEnergized: !AppState.trafficEmergencyMode },
        ],
        outputCoil: { id: 'tr_r2_coil', type: 'COIL', tag: '%Q0.0', label: 'MAIN SIGNAL HEAD MATRIX', isEnergized: isGreen },
      },
      {
        rungNumber: 3,
        title: 'Rung 003: Pedestrian Crosswalk Walk Light Output',
        description: 'Illuminates Walk symbol (%Q0.1) when Main traffic is safely held at Red.',
        booleanEquation: '%Q0.1 = M1.0 ∧ PHASE_RED ∧ NOT_CONFLICT',
        learningNote: 'Safety critical rung: Pedestrian Walk MUST ONLY illuminate when all opposing vehicle heads are confirmed Red.',
        isRungTrue: isPedWalk && isRed,
        elements: [
          { id: 'tr_r3_c1', type: 'NO', tag: 'M1.0', label: 'PED LATCH ACTIVE', isEnergized: isPedWalk },
          { id: 'tr_r3_c2', type: 'NO', tag: 'MAIN_RED', label: 'MAIN RED CONFIRMED', isEnergized: isRed },
        ],
        outputCoil: { id: 'tr_r3_coil', type: 'COIL', tag: '%Q0.1', label: 'PEDESTRIAN WALK LIGHT', isEnergized: isPedWalk },
      },
    ];
  }

  // --- EXPERIMENT 4: 3-Axis Robot Rungs ---
  private static getRobotRungs(): LadderRung[] {
    const isPlcRun = AppState.plcState === 'RUN';
    const isPartInFeed = AppState.robotPartInFeed;
    const isVacuumOn = AppState.robotVacuumActive;
    const isPartHeld = AppState.robotPartHeld;
    const step = AppState.robotCycleStep;
    const isGantryMoving = step === 'MOVE_PICKUP' || step === 'MOVE_PLACE' || step === 'HOME';

    return [
      {
        rungNumber: 0,
        title: 'Rung 000: Gantry Workcell Master Ready & Home Reference',
        description: 'Verifies reference limit switch continuity before enabling servo motion.',
        booleanEquation: 'M0.0 = %I0.1_HOME_LS ∧ NOT_E_STOP',
        learningNote: 'Industrial Cartesian gantries must perform a homing routine to calibrate absolute encoder zero before cycling.',
        isRungTrue: isPlcRun,
        elements: [
          { id: 'rb_r0_c1', type: 'NO', tag: '%I0.1', label: 'GANTRY HOME LS', isEnergized: isPlcRun },
        ],
        outputCoil: { id: 'rb_r0_coil', type: 'COIL', tag: 'M0.0', label: 'WORKCELL READY BIT', isEnergized: isPlcRun },
      },
      {
        rungNumber: 1,
        title: 'Rung 001: Part In-Feed Optical Presence Detect',
        description: 'Proximity sensor %I0.0 confirms workpiece is seated in in-feed nest.',
        booleanEquation: 'M0.1_CYCLE_START = %I0.0_PART_DETECT ∧ M0.0',
        learningNote: 'Prevents gantry from initiating pick stroke on an empty nest, avoiding machine collision and cycle fault.',
        isRungTrue: isPartInFeed,
        elements: [
          { id: 'rb_r1_c1', type: 'NO', tag: '%I0.0', label: 'IN-FEED PROXIMITY', isEnergized: isPartInFeed },
          { id: 'rb_r1_c2', type: 'NO', tag: 'M0.0', label: 'GANTRY READY', isEnergized: isPlcRun },
        ],
        outputCoil: { id: 'rb_r1_coil', type: 'COIL', tag: 'M0.1', label: 'START PICK SEQUENCE', isEnergized: isPartInFeed },
      },
      {
        rungNumber: 2,
        title: 'Rung 002: Coordinated X/Y Linear Servo Axis Motion',
        description: 'Commands stepper/servo drives to execute pick-and-place trajectory.',
        booleanEquation: '%Q0.0 = M0.1 ∧ NOT_AXIS_FAULT',
        learningNote: 'Triggers motion controller trajectory generator for smooth S-curve velocity acceleration.',
        isRungTrue: isGantryMoving,
        elements: [
          { id: 'rb_r2_c1', type: 'NO', tag: 'M0.1', label: 'CYCLE ACTIVE', isEnergized: isGantryMoving },
        ],
        outputCoil: { id: 'rb_r2_coil', type: 'COIL', tag: '%Q0.0', label: 'GANTRY SERVO DRIVE', isEnergized: isGantryMoving },
      },
      {
        rungNumber: 3,
        title: 'Rung 003: Pneumatic Vacuum Gripper Solenoid',
        description: 'Energizes vacuum venturi solenoid %Q0.1 to grip workpiece.',
        booleanEquation: '%Q0.1 = Z_LOWERED ∧ (GRIP_STEP ∨ %Q0.1_HELD) ∧ NOT_RELEASE',
        learningNote: 'Operates 3/2-way vacuum generator solenoid. Vacuum pressure switch confirms seal before lifting Z-axis.',
        isRungTrue: isVacuumOn,
        elements: [
          { id: 'rb_r3_c1', type: 'NO', tag: 'Z_DOWN', label: 'Z-AXIS LOWERED', isEnergized: isVacuumOn || step === 'LOWER_PICKUP' },
          { id: 'rb_r3_c2', type: 'NO', tag: 'VAC_SW', label: 'VACUUM GENERATOR', isEnergized: isVacuumOn },
        ],
        outputCoil: { id: 'rb_r3_coil', type: 'COIL', tag: '%Q0.1', label: 'VACUUM SOLENOID VALVE', isEnergized: isVacuumOn },
      },
    ];
  }

  // --- EXPERIMENT 5: Thermal Batch Reactor Rungs ---
  private static getReactorRungs(): LadderRung[] {
    const isPlcRun = AppState.plcState === 'RUN';
    const isAgitatorOn = AppState.reactorAgitatorState === 'ON';
    const isHeaterOn = AppState.reactorHeaterState === 'ON';
    const isTempSensor = AppState.reactorTemp >= 75.0;
    const isBatchActive = AppState.reactorBatchStep !== 'IDLE';

    return [
      {
        rungNumber: 0,
        title: 'Rung 000: Batch Recipe Start PB & Cycle Latch',
        description: 'Operator station recipe start pushbutton initiates automatic chemical blending.',
        booleanEquation: 'M0.0 = (%I0.1_START ∨ M0.0) ∧ ¬BATCH_COMPLETE',
        learningNote: 'ISA-88 batch control standard: Sets state machine into recipe sequence until final discharge complete.',
        isRungTrue: isBatchActive,
        elements: [
          { id: 'rc_r0_c1', type: 'NO', tag: '%I0.1', label: 'RECIPE START PB', isEnergized: isBatchActive },
        ],
        outputCoil: { id: 'rc_r0_coil', type: 'COIL', tag: 'M0.0', label: 'BATCH SEQUENCE ACTIVE', isEnergized: isBatchActive },
      },
      {
        rungNumber: 1,
        title: 'Rung 001: Motorized Vortex Agitator Drive Contactor',
        description: 'Energizes stirrer motor %Q0.0 once minimum liquid level is satisfied.',
        booleanEquation: '%Q0.0 = M0.0 ∧ LEVEL_OK ∧ NOT_MOTOR_OVERLOAD',
        learningNote: 'Interlocked with minimum level (40%) to protect impeller blades and mechanical shaft seal from dry spin damage.',
        isRungTrue: isAgitatorOn,
        elements: [
          { id: 'rc_r1_c1', type: 'NO', tag: 'M0.0', label: 'BATCH ACTIVE', isEnergized: isBatchActive },
          { id: 'rc_r1_c2', type: 'NO', tag: 'MIN_LEVEL', label: 'LEVEL >= 40%', isEnergized: isAgitatorOn },
        ],
        outputCoil: { id: 'rc_r1_coil', type: 'COIL', tag: '%Q0.0', label: 'AGITATOR MOTOR STARTER', isEnergized: isAgitatorOn },
      },
      {
        rungNumber: 2,
        title: 'Rung 002: Electric Heating Jacket Solid-State Relay (SSR)',
        description: 'Energizes thermal jacket heating element %Q0.1 until target temp 75°C reached.',
        booleanEquation: '%Q0.1 = M0.0 ∧ %Q0.0 (Agitator Running) ∧ ¬%I0.0 (Temp < 75°C)',
        learningNote: 'Critical safety interlock: Heater MUST NEVER fire unless Agitator is actively spinning to prevent localized liquid boiling and hot spots.',
        isRungTrue: isHeaterOn,
        elements: [
          { id: 'rc_r2_c1', type: 'NO', tag: '%Q0.0', label: 'AGITATOR CONFIRMED', isEnergized: isAgitatorOn },
          { id: 'rc_r2_c2', type: 'NC', tag: '%I0.0', label: 'PT100 TRIP NC (75°C)', isEnergized: !isTempSensor },
        ],
        outputCoil: { id: 'rc_r2_coil', type: 'COIL', tag: '%Q0.1', label: 'THERMAL HEATER SSR RELAY', isEnergized: isHeaterOn },
      },
      {
        rungNumber: 3,
        title: 'Rung 003: Reaction Cook Hold Timer (TON)',
        description: 'Holds temperature at 75°C for 5 seconds to complete reaction stoichiometry.',
        booleanEquation: 'TON_HOLD.IN = %I0.0 (Temp >= 75°C) ∧ M0.0',
        learningNote: 'TON timer ensures adequate thermal residence time before automated discharge valve opens.',
        isRungTrue: isTempSensor,
        elements: [
          { id: 'rc_r3_c1', type: 'NO', tag: '%I0.0', label: 'PT100 TEMP REACHED', isEnergized: isTempSensor },
        ],
        outputCoil: { id: 'rc_r3_coil', type: 'TIMER', tag: 'TON_HOLD', label: 'HOLD TIMER (PT: 5.0s)', isEnergized: isTempSensor, timerPT: 5, timerET: isTempSensor ? 5 : 0 },
      },
    ];
  }
}
