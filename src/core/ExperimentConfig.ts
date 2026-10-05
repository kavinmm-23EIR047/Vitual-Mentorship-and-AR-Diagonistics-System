// ============================================================
// ExperimentConfig – Multi-Experiment Training System
// 5 Complete Industrial Applications with 3D Twins & Ladder Logic
// ============================================================

export type ExperimentType = 'TANK' | 'CONVEYOR' | 'TRAFFIC' | 'ROBOT' | 'REACTOR';

export interface ExperimentDef {
  id: ExperimentType;
  name: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: string;
  description: string;
  primaryColor: string;
  plcInputs: Array<{ tag: string; label: string; desc: string }>;
  plcOutputs: Array<{ tag: string; label: string; desc: string }>;
}

export const EXPERIMENTS: Record<ExperimentType, ExperimentDef> = {
  TANK: {
    id: 'TANK',
    name: 'Water Tank Level Control',
    title: 'Experiment 1: Water Tank Closed-Loop Level Control',
    shortTitle: 'Water Tank Level',
    subtitle: 'Siemens S7-1200 PID / Closed-Loop Level Regulation',
    icon: 'tank',
    description: 'Closed-loop fluid level regulation using high/low conductivity sensors, centrifugal motor pump, and motorized suction gate valve.',
    primaryColor: '#ff7700',
    plcInputs: [
      { tag: '%I0.0', label: 'Sensor Low (L0)', desc: 'Low level threshold detection float (<20%)' },
      { tag: '%I0.1', label: 'Sensor High (L1)', desc: 'High level threshold alarm float (>80%)' },
    ],
    plcOutputs: [
      { tag: '%Q0.0', label: 'Pump Starter', desc: 'Centrifugal pump motor 24V contactor' },
      { tag: '%Q0.1', label: 'Drain Valve', desc: 'Motorized proportional drain valve solenoid' },
    ],
  },
  CONVEYOR: {
    id: 'CONVEYOR',
    name: 'Conveyor & Optical Sorting',
    title: 'Experiment 2: Automated Conveyor Belt & Optical Sorting',
    shortTitle: 'Conveyor & Sorting',
    subtitle: 'Siemens S7-1200 High-Speed Part Sorting & Pneumatics',
    icon: 'box',
    description: 'Automated conveyor material handling with optical photoelectric part detection, electric gearmotor drive, and pneumatic diverter cylinder sorting.',
    primaryColor: '#f97316',
    plcInputs: [
      { tag: '%I0.0', label: 'Optical Sensor', desc: 'Photoelectric IR diffuse reflection beam sensor' },
      { tag: '%I0.1', label: 'Start Pushbutton', desc: 'Operator station green illuminated start button' },
    ],
    plcOutputs: [
      { tag: '%Q0.0', label: 'Motor Drive', desc: 'Siemens 24V DC conveyor gearmotor drive relay' },
      { tag: '%Q0.1', label: 'Pneumatic Diverter', desc: '5/2 way solenoid valve for pneumatic pusher' },
    ],
  },
  TRAFFIC: {
    id: 'TRAFFIC',
    name: 'Smart 4-Way Traffic Junction',
    title: 'Experiment 3: Smart 4-Way Traffic Light & Pedestrian Junction',
    shortTitle: 'Smart Traffic Light',
    subtitle: 'Siemens S7-1200 Timed Sequencer & Pedestrian Logic',
    icon: 'traffic',
    description: 'Intelligent multi-phase traffic signal sequencer with inductive road loop vehicle detection, pedestrian crosswalk push station, and emergency priority strobe.',
    primaryColor: '#ff8800',
    plcInputs: [
      { tag: '%I0.0', label: 'Pedestrian Call Button', desc: 'Crosswalk pedestrian request pushbutton' },
      { tag: '%I0.1', label: 'Vehicle Loop Sensor', desc: 'Inductive electro-magnetic road sensor' },
    ],
    plcOutputs: [
      { tag: '%Q0.0', label: 'Main Traffic Signal', desc: 'Main avenue Red/Amber/Green signal head matrix' },
      { tag: '%Q0.1', label: 'Pedestrian Walk Light', desc: 'Crosswalk Walk/Don\'t Walk illuminated LED sign' },
    ],
  },
  ROBOT: {
    id: 'ROBOT',
    name: '3-Axis Pick-and-Place Gantry',
    title: 'Experiment 4: 3-Axis Industrial Robotic Pick-and-Place Workcell',
    shortTitle: 'Robotic Pick & Place',
    subtitle: 'Siemens S7-1200 Coordinated Motion & Vacuum Handling',
    icon: 'robot',
    description: 'Cartesian gantry workcell with precision X/Y/Z linear actuators, optical workpiece detection nest, pneumatic vacuum gripper suction cup, and sorted pallet transfer.',
    primaryColor: '#ff6b00',
    plcInputs: [
      { tag: '%I0.0', label: 'Part Present Sensor', desc: 'In-feed nest optical proximity detector' },
      { tag: '%I0.1', label: 'Gantry Home Switch', desc: 'Axis reference home limit switch' },
    ],
    plcOutputs: [
      { tag: '%Q0.0', label: 'Gantry Servo Drive', desc: 'Coordinated X/Y linear axis stepper/servo trigger' },
      { tag: '%Q0.1', label: 'Vacuum Solenoid Valve', desc: 'Pneumatic vacuum suction cup venturi generator' },
    ],
  },
  REACTOR: {
    id: 'REACTOR',
    name: 'Batch Reactor & Chemical Mixer',
    title: 'Experiment 5: Industrial Thermal Batch Reactor & Chemical Mixing Vessel',
    shortTitle: 'Thermal Batch Reactor',
    subtitle: 'Siemens S7-1200 Recipe Batching, Heating & Agitation',
    icon: 'reactor',
    description: 'Automated chemical blending vessel with dual reagent metering valves, motorized vortex agitator, electric thermal heating coils, RTD PT100 sensor, and bottom drain.',
    primaryColor: '#ff5500',
    plcInputs: [
      { tag: '%I0.0', label: 'PT100 Temp Sensor', desc: 'RTD PT100 thermowell temperature trip contact' },
      { tag: '%I0.1', label: 'Recipe Cycle Start', desc: 'Automatic recipe batch initiation push contact' },
    ],
    plcOutputs: [
      { tag: '%Q0.0', label: 'Agitator Motor Drive', desc: 'Dual-tier vortex impeller stirrer motor starter' },
      { tag: '%Q0.1', label: 'Heating Coil Relay', desc: 'Electric jacket thermal heating element solid-state relay' },
    ],
  },
};
