// ============================================================
// VoiceAssistantManager.ts – Intelligent Step-by-Step AI Voice Mentor
// Enforces task completion before progressing to next voice guidance,
// with automated periodic repetitions if task remains pending.
// ============================================================

import { AppState } from './AppState';
import { EventBus, Events } from './EventBus';
import type { ExperimentType } from './ExperimentConfig';
import { voiceNarrator, VOICE_LANGUAGES } from './VoiceNarrator';
import { Icons } from '../ui/Icons';

export type AssistantMode = 'WIRING' | 'SCADA' | 'LADDER' | 'INSPECTOR' | 'GESTURES' | 'GENERAL';

export interface AssistantTask {
  id: string;
  title: string;
  instruction: string;
  repeatPrompt: string;
  successMessage: string;
  isCompleted: boolean;
  repeatIntervalSec: number;
}

export class VoiceAssistantManager {
  private static instance: VoiceAssistantManager;

  private currentMode: AssistantMode = 'WIRING';
  private tasksByMode: Record<AssistantMode, AssistantTask[]> = {
    WIRING: [],
    SCADA: [],
    LADDER: [],
    INSPECTOR: [],
    GESTURES: [],
    GENERAL: [],
  };

  private currentTaskIndex = 0;
  private repeatTimer: number | null = null;
  private countdownTimer: number | null = null;
  private secondsRemaining = 14;
  private isMuted = false;
  private hudElement: HTMLElement | null = null;
  private isMinimized = false;

  private constructor() {
    this.initTasksForExperiment(AppState.activeExperiment);
    this.createAssistantHUD();
    this.bindEvents();
  }

  public static getInstance(): VoiceAssistantManager {
    if (!VoiceAssistantManager.instance) {
      VoiceAssistantManager.instance = new VoiceAssistantManager();
    }
    return VoiceAssistantManager.instance;
  }

  public initTasksForExperiment(exp: ExperimentType): void {
    // 1. WIRING LAB TASKS (4 Sequential Steps)
    const wiringTasks: AssistantTask[] = [
      {
        id: `${exp}_WIRING_0`,
        title: 'Step 1: Primary Sensor Input',
        instruction: this.getWiringInstruction(exp, 0),
        repeatPrompt: `Step 1 Reminder: Please connect ${this.getWiringShortDesc(exp, 0)} to proceed.`,
        successMessage: `Step 1 connection verified and secured! Moving to Step 2.`,
        isCompleted: false,
        repeatIntervalSec: 13,
      },
      {
        id: `${exp}_WIRING_1`,
        title: 'Step 2: Secondary Feedback / Control',
        instruction: this.getWiringInstruction(exp, 1),
        repeatPrompt: `Step 2 Reminder: Connect ${this.getWiringShortDesc(exp, 1)} to complete circuit 2.`,
        successMessage: `Step 2 connection verified! Moving to Step 3.`,
        isCompleted: false,
        repeatIntervalSec: 13,
      },
      {
        id: `${exp}_WIRING_2`,
        title: 'Step 3: Primary Actuator Output',
        instruction: this.getWiringInstruction(exp, 2),
        repeatPrompt: `Step 3 Reminder: Connect ${this.getWiringShortDesc(exp, 2)} to arm the main actuator drive.`,
        successMessage: `Step 3 connection verified! Moving to Step 4.`,
        isCompleted: false,
        repeatIntervalSec: 13,
      },
      {
        id: `${exp}_WIRING_3`,
        title: 'Step 4: Auxiliary Actuator / Solenoid',
        instruction: this.getWiringInstruction(exp, 3),
        repeatPrompt: `Step 4 Reminder: Connect ${this.getWiringShortDesc(exp, 3)} to finish the circuit array.`,
        successMessage: `All wiring connections are verified and armed! You can now start SCADA simulation or inspect Ladder Logic.`,
        isCompleted: false,
        repeatIntervalSec: 13,
      },
    ];

    // 2. SCADA CONTROL TASKS
    const scadaTasks: AssistantTask[] = [
      {
        id: `${exp}_SCADA_0`,
        title: 'Task 1: CPU Start Execution',
        instruction: `SCADA Task 1: Start the automated process. Click the green 'Start Process' button or toggle the PLC to RUN.`,
        repeatPrompt: `SCADA Task 1 Reminder: Please click 'Start Process' or toggle the PLC CPU to RUN to begin.`,
        successMessage: `Task 1 complete! Siemens S7-1200 CPU is running in automated closed-loop.`,
        isCompleted: false,
        repeatIntervalSec: 14,
      },
      {
        id: `${exp}_SCADA_1`,
        title: `Task 2: Process Setpoint / Trigger`,
        instruction: this.getScadaTask2Instruction(exp),
        repeatPrompt: this.getScadaTask2Reminder(exp),
        successMessage: this.getScadaTask2Success(exp),
        isCompleted: false,
        repeatIntervalSec: 14,
      },
      {
        id: `${exp}_SCADA_2`,
        title: 'Task 3: Emergency Safety Test',
        instruction: `SCADA Task 3: Test safety shutdown. Actuate the red Emergency Stop button or perform a Closed Fist gesture in mid-air.`,
        repeatPrompt: `SCADA Task 3 Reminder: Click Emergency Stop or make a Closed Fist gesture to test safety interlock.`,
        successMessage: `Task 3 complete! Emergency Stop tripped and power isolated.`,
        isCompleted: false,
        repeatIntervalSec: 15,
      },
      {
        id: `${exp}_SCADA_3`,
        title: 'Task 4: Safety Reset & Recovery',
        instruction: `SCADA Task 4: Clear the Emergency Stop by clicking 'Acknowledge' or pressing E-Stop again to return to standby.`,
        repeatPrompt: `SCADA Task 4 Reminder: Click Acknowledge or E-Stop again to reset safety latches.`,
        successMessage: `Outstanding! All SCADA process operations for this experiment are mastered.`,
        isCompleted: false,
        repeatIntervalSec: 14,
      },
    ];

    // 3. LADDER LOGIC STUDIO TASKS
    const ladderTasks: AssistantTask[] = [
      {
        id: `${exp}_LADDER_0`,
        title: 'Task 1: Emergency Stop Rung Inspection',
        instruction: `Ladder Task 1: Click on Rung 0 in the Ladder Studio to inspect how the Emergency Stop NC contact latches power to the system coil.`,
        repeatPrompt: `Ladder Task 1 Reminder: Click Rung 0 in the Ladder Logic modal to test circuit continuity.`,
        successMessage: `Task 1 complete! Rung 0 power flow verified.`,
        isCompleted: false,
        repeatIntervalSec: 14,
      },
      {
        id: `${exp}_LADDER_1`,
        title: 'Task 2: Control Logic & Variable Watch',
        instruction: `Ladder Task 2: Click on Rung 1 or Rung 2 to study the Boolean equations and check real-time state in the Variable Watch Table.`,
        repeatPrompt: `Ladder Task 2 Reminder: Select Rung 1 or Rung 2 to inspect actuator latching logic.`,
        successMessage: `Task 2 complete! IEC 61131-3 Boolean logic equations verified.`,
        isCompleted: false,
        repeatIntervalSec: 14,
      },
      {
        id: `${exp}_LADDER_2`,
        title: 'Task 3: Student Interactive Quiz',
        instruction: `Ladder Task 3: Answer the Student Knowledge Quiz question on the right sidebar to test your PLC understanding.`,
        repeatPrompt: `Ladder Task 3 Reminder: Select the correct answer in the Student Quiz panel.`,
        successMessage: `Quiz completed! You have mastered IEC 61131-3 Ladder Logic for this application.`,
        isCompleted: false,
        repeatIntervalSec: 15,
      },
    ];

    // 4. COMPONENT INSPECTOR TASKS
    const inspectorTasks: AssistantTask[] = [
      {
        id: `${exp}_INSPECT_0`,
        title: 'Task 1: S7-1200 PLC Pinout Exploration',
        instruction: `Inspector Task 1: Click on the Siemens S7-1200 PLC in the 3D scene to inspect its 14 Digital Inputs and 10 Relay Outputs.`,
        repeatPrompt: `Inspector Task 1 Reminder: Select the Siemens S7-1200 PLC to study technical pinouts.`,
        successMessage: `Task 1 complete! S7-1200 hardware architecture explored.`,
        isCompleted: false,
        repeatIntervalSec: 14,
      },
      {
        id: `${exp}_INSPECT_1`,
        title: 'Task 2: Field Equipment Specs',
        instruction: `Inspector Task 2: Click on the field sensors and actuators to review their industrial voltage ratings and operating specs.`,
        repeatPrompt: `Inspector Task 2 Reminder: Select field sensors or actuators to view specifications.`,
        successMessage: `Task 2 complete! Field instrumentation specifications reviewed.`,
        isCompleted: false,
        repeatIntervalSec: 14,
      },
    ];

    // 5. SPATIAL GESTURES TASKS
    const gestureTasks: AssistantTask[] = [
      {
        id: `${exp}_GESTURE_0`,
        title: 'Task 1: Spatial Laser Raycast Pointing',
        instruction: `Gesture Task 1: Point your index finger at any 3D equipment to focus the holographic cyber laser and reticle.`,
        repeatPrompt: `Gesture Task 1 Reminder: Point with your index finger towards the 3D models or floating action nodes.`,
        successMessage: `Task 1 complete! Spatial target acquired.`,
        isCompleted: false,
        repeatIntervalSec: 14,
      },
      {
        id: `${exp}_GESTURE_1`,
        title: 'Task 2: Mid-Air Pinch Actuation',
        instruction: `Gesture Task 2: Pinch your thumb and index finger together to click buttons or grab wiring terminals in mid-air.`,
        repeatPrompt: `Gesture Task 2 Reminder: Perform a mid-air pinch gesture between your thumb and index finger.`,
        successMessage: `Task 2 complete! Pinch actuation verified.`,
        isCompleted: false,
        repeatIntervalSec: 14,
      },
      {
        id: `${exp}_GESTURE_2`,
        title: 'Task 3: Closed Fist Emergency Stop',
        instruction: `Gesture Task 3: Form a Closed Fist in mid-air to test the instant gesture-based Emergency Stop.`,
        repeatPrompt: `Gesture Task 3 Reminder: Clench your hand into a Closed Fist to trigger emergency safety shutdown.`,
        successMessage: `Task 3 complete! Closed Fist safety shutdown verified.`,
        isCompleted: false,
        repeatIntervalSec: 15,
      },
    ];

    this.tasksByMode = {
      WIRING: wiringTasks,
      SCADA: scadaTasks,
      LADDER: ladderTasks,
      INSPECTOR: inspectorTasks,
      GESTURES: gestureTasks,
      GENERAL: [],
    };

    // Reset current task index and start active mode
    this.currentTaskIndex = 0;
    this.updateHUDUI();
  }

  private getWiringInstruction(exp: ExperimentType, step: number): string {
    const list: Record<ExperimentType, string[]> = {
      TANK: [
        'Step 1: Connect PLC Digital Input I0.0 to the Low Level Conductivity Sensor. This signals when liquid falls below 20% to prevent pump cavitation.',
        'Step 2: Connect PLC Digital Input I0.1 to the High Level Alarm Sensor. This trips the PLC when liquid reaches 80% to avoid tank overflow.',
        'Step 3: Connect PLC Digital Output Q0.0 to the Centrifugal Pump Starter Contactor. This commands the motor to deliver water during fill cycles.',
        'Step 4: Connect PLC Digital Output Q0.1 to the Motorized Drain Valve. This regulates outflow to maintain precise liquid equilibrium.',
      ],
      CONVEYOR: [
        'Step 1: Connect PLC Digital Input I0.0 to the Optical Photoelectric Sensor. This beam detects incoming packages on the conveyor belt.',
        'Step 2: Connect PLC Digital Input I0.1 to the Operator Start Pushbutton to latch the motor run circuit in memory.',
        'Step 3: Connect PLC Digital Output Q0.0 to the 24V Gearmotor Drive to start the continuous sorting conveyor belt.',
        'Step 4: Connect PLC Digital Output Q0.1 to the Pneumatic Diverter Solenoid Valve to fire the high-speed sorting pusher.',
      ],
      TRAFFIC: [
        'Step 1: Connect PLC Digital Input I0.0 to the Pedestrian Crosswalk Call Pushbutton to request a pedestrian crossing interval.',
        'Step 2: Connect PLC Digital Input I0.1 to the Inductive Road Vehicle Loop Sensor to detect oncoming metallic vehicles.',
        'Step 3: Connect PLC Digital Output Q0.0 to the Main Traffic Signal Head to drive the Red, Yellow, and Green LED optics.',
        'Step 4: Connect PLC Digital Output Q0.1 to the Pedestrian Walk Signal Light to display the Walk symbol during safe crossing.',
      ],
      ROBOT: [
        'Step 1: Connect PLC Digital Input I0.0 to the In-Feed Part Proximity Sensor to verify workpiece presence before pick strokes.',
        'Step 2: Connect PLC Digital Input I0.1 to the Gantry Home Reference Limit Switch to calibrate absolute Cartesian coordinates.',
        'Step 3: Connect PLC Digital Output Q0.0 to the Gantry Servo Controller to command coordinated X and Y linear slides.',
        'Step 4: Connect PLC Digital Output Q0.1 to the Vacuum Solenoid Valve to draw suction and grip the workpiece.',
      ],
      REACTOR: [
        'Step 1: Connect PLC Digital Input I0.0 to the PT100 RTD Temperature Probe to monitor core temperature up to 75 degrees Celsius.',
        'Step 2: Connect PLC Digital Input I0.1 to the Recipe Batch Start Pushbutton to trigger automated chemical dosing.',
        'Step 3: Connect PLC Digital Output Q0.0 to the Impeller Agitator Starter to blend reagents at 700 RPM.',
        'Step 4: Connect PLC Digital Output Q0.1 to the Electric Heating Jacket Solid-State Relay to power the thermal coils.',
      ],
    };
    return list[exp]?.[step] || `Step ${step + 1}: Connect highlighted terminals.`;
  }

  private getWiringShortDesc(exp: ExperimentType, step: number): string {
    const list: Record<ExperimentType, string[]> = {
      TANK: ['PLC DI0 to Low Level Sensor', 'PLC DI1 to High Level Sensor', 'PLC DQ0 to Pump Starter', 'PLC DQ1 to Drain Valve'],
      CONVEYOR: ['PLC DI0 to Optical Sensor', 'PLC DI1 to Start Button', 'PLC DQ0 to Motor Drive', 'PLC DQ1 to Diverter Valve'],
      TRAFFIC: ['PLC DI0 to Pedestrian Button', 'PLC DI1 to Vehicle Loop', 'PLC DQ0 to Traffic Lights', 'PLC DQ1 to Walk Light'],
      ROBOT: ['PLC DI0 to Part Sensor', 'PLC DI1 to Home Switch', 'PLC DQ0 to Servo Drive', 'PLC DQ1 to Vacuum Valve'],
      REACTOR: ['PLC DI0 to PT100 Sensor', 'PLC DI1 to Recipe Start Button', 'PLC DQ0 to Agitator Motor', 'PLC DQ1 to Heater Relay'],
    };
    return list[exp]?.[step] || 'highlighted terminals';
  }

  private getScadaTask2Instruction(exp: ExperimentType): string {
    switch (exp) {
      case 'TANK': return 'SCADA Task 2: Adjust the Tank Level Setpoint slider to 80% to observe the closed-loop pump modulation.';
      case 'CONVEYOR': return 'SCADA Task 2: Click "Dispense Box" to drop a workpiece onto the belt and test the optical beam.';
      case 'TRAFFIC': return 'SCADA Task 2: Click "Call Pedestrian" to trigger the crosswalk walk request sequence.';
      case 'ROBOT': return 'SCADA Task 2: Click "Run Cycle" to initiate the automated pick-and-place transfer.';
      case 'REACTOR': return 'SCADA Task 2: Turn on the Agitator and Electric Heater to warm the batch to 75 degrees.';
    }
  }

  private getScadaTask2Reminder(exp: ExperimentType): string {
    switch (exp) {
      case 'TANK': return 'SCADA Task 2 Reminder: Move the Level Setpoint slider above 75%.';
      case 'CONVEYOR': return 'SCADA Task 2 Reminder: Click "Dispense Box" to test sorting.';
      case 'TRAFFIC': return 'SCADA Task 2 Reminder: Click "Call Pedestrian" to test crosswalk.';
      case 'ROBOT': return 'SCADA Task 2 Reminder: Click "Run Cycle" to test pick and place.';
      case 'REACTOR': return 'SCADA Task 2 Reminder: Turn on Agitator and Heater.';
    }
  }

  private getScadaTask2Success(exp: ExperimentType): string {
    switch (exp) {
      case 'TANK': return 'Task 2 complete! Water pump delivered fluid to reach 80% setpoint equilibrium.';
      case 'CONVEYOR': return 'Task 2 complete! Package detected by the optical beam.';
      case 'TRAFFIC': return 'Task 2 complete! Crosswalk walk phase queued and active.';
      case 'ROBOT': return 'Task 2 complete! Cartesian gantry executed pick-and-place transfer.';
      case 'REACTOR': return 'Task 2 complete! Reaction heating and vortex blending active.';
    }
  }

  private createAssistantHUD(): void {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    this.hudElement = document.createElement('div');
    this.hudElement.id = 'voice-assistant-mentor-hud';
    this.hudElement.className = 'voice-assistant-mentor-hud';
    this.hudElement.innerHTML = `
      <div class="mentor-hud-card">
        <div class="mentor-header">
          <div class="mentor-badge-group">
            <span class="mentor-mic-icon">${Icons.mic({ size: 16 })}</span>
            <span class="mentor-tag">AI VOICE MENTOR</span>
            <span class="mentor-mode-pill" id="mentor-mode-pill">WIRING LAB</span>
            <span class="mentor-task-pill" id="mentor-task-pill">STEP 1/4</span>
          </div>
          <div class="mentor-header-controls">
            <button class="mentor-ctrl-btn" id="btn-mentor-repeat" title="Repeat Voice Instruction (Now)">${Icons.rotateCcw({ size: 12 })} Repeat</button>
            <button class="mentor-ctrl-btn" id="btn-mentor-skip" title="Skip to Next Task">${Icons.skipForward({ size: 12 })} Next</button>
            <label class="mentor-language-label" for="mentor-language-select">Voice</label>
            <select class="mentor-language-select" id="mentor-language-select" aria-label="Voice language">
              ${VOICE_LANGUAGES.map(({ code, label }) => `<option value="${code}"${code === 'en-US' ? ' selected' : ''}>${label}</option>`).join('')}
            </select>
            <button class="mentor-ctrl-btn" id="btn-mentor-mute" title="Toggle Audio Voice">${Icons.volume2({ size: 13 })}</button>
            <button class="mentor-ctrl-btn min" id="btn-mentor-minimize" title="Minimize / Expand Mentor">${Icons.chevronDown({ size: 13 })}</button>
          </div>
        </div>

        <div class="mentor-body" id="mentor-body">
          <div class="mentor-task-title" id="mentor-task-title">Step 1: Primary Sensor Input</div>
          <div class="mentor-instruction-text" id="mentor-instruction-text">
            Connect PLC Digital Input I0.0 to the Low Level Conductivity Sensor.
          </div>
          <div class="mentor-status-bar">
            <div class="mentor-status-indicator pending" id="mentor-status-indicator">
              <span class="status-pulse-dot"></span>
              <span id="mentor-status-text">TASK PENDING (Repeats in <span id="mentor-countdown">13</span>s)</span>
            </div>
            <div class="mentor-progress-track">
              <div class="mentor-progress-bar" id="mentor-progress-bar" style="width: 25%;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    overlay.appendChild(this.hudElement);

    // Event handlers on HUD buttons
    document.getElementById('btn-mentor-repeat')?.addEventListener('click', () => {
      this.speakCurrentTask(true);
    });

    document.getElementById('btn-mentor-skip')?.addEventListener('click', () => {
      this.completeCurrentTask(true);
    });

    document.getElementById('mentor-language-select')?.addEventListener('change', (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      voiceNarrator.setLanguage(select.value);
      this.speakCurrentTask(false);
    });

    document.getElementById('btn-mentor-mute')?.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      voiceNarrator.toggleVoice();
      const muteBtn = document.getElementById('btn-mentor-mute');
      if (muteBtn) muteBtn.innerHTML = this.isMuted ? Icons.volumeX({ size: 13 }) : Icons.volume2({ size: 13 });
    });

    document.getElementById('btn-mentor-minimize')?.addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      const body = document.getElementById('mentor-body');
      const minBtn = document.getElementById('btn-mentor-minimize');
      if (body) body.style.display = this.isMinimized ? 'none' : 'block';
      if (minBtn) minBtn.innerHTML = this.isMinimized ? Icons.chevronUp({ size: 13 }) : Icons.chevronDown({ size: 13 });
    });
  }

  private bindEvents(): void {
    // Mode changes
    EventBus.on('placement:requestMode', (mode: string) => {
      if (mode === 'WIRING') {
        this.setMode('WIRING');
      }
    });

    EventBus.on('inspector:open', () => {
      this.setMode('INSPECTOR');
    });

    EventBus.on('inspector:close', () => {
      if (this.currentMode === 'INSPECTOR') {
        this.setMode('WIRING');
      }
    });

    EventBus.on('ladder:opened', () => {
      this.setMode('LADDER');
    });

    EventBus.on('ladder:closed', () => {
      if (this.currentMode === 'LADDER') {
        this.setMode('WIRING');
      }
    });

    EventBus.on('hand:toggleTracking', (data: { active: boolean }) => {
      if (data.active) {
        this.setMode('GESTURES');
      }
    });

    EventBus.on('experiment:changed', (data: { experiment: ExperimentType }) => {
      this.initTasksForExperiment(data.experiment);
      this.setMode('WIRING');
    });

    // 1. Wiring connection success -> complete step & ONLY THEN advance to next
    EventBus.on('training:connectionSuccess', (data: { stepIndex: number }) => {
      if (this.currentMode === 'WIRING' && data.stepIndex === this.currentTaskIndex) {
        this.completeCurrentTask();
      }
    });

    EventBus.on('training:stepChanged', (data: { stepIndex: number }) => {
      if (this.currentMode === 'WIRING' && this.currentTaskIndex !== data.stepIndex) {
        this.currentTaskIndex = data.stepIndex;
        this.speakCurrentTask(false);
      }
    });

    // 2. SCADA process start -> Task 0 complete
    EventBus.on(Events.PROCESS_START, () => {
      if (this.currentMode === 'SCADA' && this.currentTaskIndex === 0) {
        this.completeCurrentTask();
      }
    });

    // SCADA setpoint or trigger -> Task 1 complete
    EventBus.on(Events.SETPOINT_CHANGED, (val: number) => {
      if (this.currentMode === 'SCADA' && this.currentTaskIndex === 1 && AppState.activeExperiment === 'TANK' && val >= 75) {
        this.completeCurrentTask();
      }
    });

    EventBus.on('conveyor:dispenseBox', () => {
      if (this.currentMode === 'SCADA' && this.currentTaskIndex === 1 && AppState.activeExperiment === 'CONVEYOR') {
        this.completeCurrentTask();
      }
    });

    EventBus.on('traffic:pedCall', () => {
      if (this.currentMode === 'SCADA' && this.currentTaskIndex === 1 && AppState.activeExperiment === 'TRAFFIC') {
        this.completeCurrentTask();
      }
    });

    EventBus.on('robot:triggerCycle', () => {
      if (this.currentMode === 'SCADA' && this.currentTaskIndex === 1 && AppState.activeExperiment === 'ROBOT') {
        this.completeCurrentTask();
      }
    });

    EventBus.on('reactor:toggleHeater', () => {
      if (this.currentMode === 'SCADA' && this.currentTaskIndex === 1 && AppState.activeExperiment === 'REACTOR') {
        this.completeCurrentTask();
      }
    });

    // SCADA Emergency Stop -> Task 2 complete
    EventBus.on('estop:triggered', () => {
      if (this.currentMode === 'SCADA' && this.currentTaskIndex === 2) {
        this.completeCurrentTask();
      } else if (this.currentMode === 'GESTURES' && this.currentTaskIndex === 2) {
        this.completeCurrentTask();
      }
    });

    // SCADA Safety reset -> Task 3 complete
    EventBus.on('estop:reset', () => {
      if (this.currentMode === 'SCADA' && this.currentTaskIndex === 3) {
        this.completeCurrentTask();
      }
    });

    // Ladder Logic rung selection / quiz
    EventBus.on('ladder:rungSelected', (data: { rungIndex: number }) => {
      if (this.currentMode === 'LADDER') {
        if (this.currentTaskIndex === 0 && data.rungIndex === 0) {
          this.completeCurrentTask();
        } else if (this.currentTaskIndex === 1 && data.rungIndex > 0) {
          this.completeCurrentTask();
        }
      }
    });

    EventBus.on('ladder:quizAnswered', () => {
      if (this.currentMode === 'LADDER' && this.currentTaskIndex === 2) {
        this.completeCurrentTask();
      }
    });

    // Inspector component selection
    EventBus.on('inspector:componentSelected', (data: { componentId: string }) => {
      if (this.currentMode === 'INSPECTOR') {
        if (this.currentTaskIndex === 0 && data.componentId === 'plc') {
          this.completeCurrentTask();
        } else if (this.currentTaskIndex === 1 && data.componentId !== 'plc') {
          this.completeCurrentTask();
        }
      }
    });

    // Gestures raycast / pinch
    EventBus.on('hand:targetLocked', () => {
      if (this.currentMode === 'GESTURES' && this.currentTaskIndex === 0) {
        this.completeCurrentTask();
      }
    });

    EventBus.on('hand:pinchStart', () => {
      if (this.currentMode === 'GESTURES' && this.currentTaskIndex === 1) {
        this.completeCurrentTask();
      }
    });
  }

  public setMode(mode: AssistantMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.currentTaskIndex = 0;
    this.stopTimers();
    this.updateHUDUI();
    this.speakCurrentTask(false);
  }

  public getCurrentTask(): AssistantTask | null {
    const tasks = this.tasksByMode[this.currentMode];
    if (!tasks || this.currentTaskIndex >= tasks.length) return null;
    return tasks[this.currentTaskIndex];
  }

  /**
   * Speak current task instruction. If already spoken and repeating, speak repeat prompt.
   */
  public speakCurrentTask(isRepeat = false): void {
    const task = this.getCurrentTask();
    if (!task) return;

    const textToSpeak = isRepeat ? task.repeatPrompt : task.instruction;
    voiceNarrator.speak(textToSpeak, this.currentMode as any);
    this.startRepeatTimer(task.repeatIntervalSec);
    this.updateHUDUI();
  }

  /**
   * Mark current task complete, announce success, and ONLY THEN advance to next task!
   */
  public completeCurrentTask(forceSkip = false): void {
    const task = this.getCurrentTask();
    if (!task) return;

    task.isCompleted = true;
    this.stopTimers();

    // Visual confirmation
    this.showTaskSuccessFlash();

    // Voice announcement of task completion
    voiceNarrator.speak(task.successMessage, this.currentMode as any);

    const tasks = this.tasksByMode[this.currentMode];
    if (this.currentTaskIndex < tasks.length - 1) {
      this.currentTaskIndex++;
      // Wait for success voice to finish before speaking next task (approx 3.5s)
      setTimeout(() => {
        this.speakCurrentTask(false);
      }, 3600);
    } else {
      // All tasks completed for this mode
      this.updateHUDUI();
    }
  }

  private startRepeatTimer(seconds: number): void {
    this.stopTimers();
    this.secondsRemaining = seconds;

    this.countdownTimer = window.setInterval(() => {
      this.secondsRemaining--;
      const cdEl = document.getElementById('mentor-countdown');
      if (cdEl) cdEl.textContent = `${Math.max(0, this.secondsRemaining)}`;

      if (this.secondsRemaining <= 0) {
        this.stopTimers();
        // Speak repetition because task is STILL incomplete
        const task = this.getCurrentTask();
        if (task && !task.isCompleted) {
          this.speakCurrentTask(true);
        }
      }
    }, 1000);
  }

  private stopTimers(): void {
    if (this.repeatTimer) {
      clearTimeout(this.repeatTimer);
      this.repeatTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private updateHUDUI(): void {
    const task = this.getCurrentTask();
    const tasks = this.tasksByMode[this.currentMode] || [];

    const modePill = document.getElementById('mentor-mode-pill');
    const taskPill = document.getElementById('mentor-task-pill');
    const titleEl = document.getElementById('mentor-task-title');
    const textEl = document.getElementById('mentor-instruction-text');
    const statusTextEl = document.getElementById('mentor-status-text');
    const statusIndicator = document.getElementById('mentor-status-indicator');
    const progressBar = document.getElementById('mentor-progress-bar');

    if (modePill) {
      modePill.textContent =
        this.currentMode === 'WIRING'
          ? 'WIRING LAB'
          : this.currentMode === 'SCADA'
          ? 'SCADA CONTROL'
          : this.currentMode === 'LADDER'
          ? 'LADDER STUDIO'
          : this.currentMode === 'INSPECTOR'
          ? 'INSPECTOR'
          : 'GESTURES';
    }

    if (task) {
      if (taskPill) taskPill.textContent = `TASK ${this.currentTaskIndex + 1}/${tasks.length}`;
      if (titleEl) titleEl.textContent = task.title;
      if (textEl) textEl.textContent = task.instruction;
      if (statusTextEl) {
        statusTextEl.innerHTML = `TASK PENDING (Repeats in <span id="mentor-countdown">${this.secondsRemaining}</span>s)`;
      }
      if (statusIndicator) {
        statusIndicator.className = 'mentor-status-indicator pending';
      }
      if (progressBar) {
        const pct = Math.round(((this.currentTaskIndex + 1) / tasks.length) * 100);
        progressBar.style.width = `${pct}%`;
      }
    } else {
      if (taskPill) taskPill.innerHTML = `ALL DONE ${Icons.check({ size: 11 })}`;
      if (titleEl) titleEl.textContent = 'All Module Tasks Completed!';
      if (textEl) textEl.textContent = 'Great work! Switch to other modes in the top bar to explore further.';
      if (statusTextEl) statusTextEl.innerHTML = `MODULE COMPLETE ${Icons.check({ size: 12 })}`;
      if (statusIndicator) statusIndicator.className = 'mentor-status-indicator completed';
      if (progressBar) progressBar.style.width = '100%';
    }
  }

  private showTaskSuccessFlash(): void {
    const indicator = document.getElementById('mentor-status-indicator');
    const statusText = document.getElementById('mentor-status-text');
    if (indicator) {
      indicator.className = 'mentor-status-indicator completed';
    }
    if (statusText) {
      statusText.innerHTML = `${Icons.checkCircle({ size: 14 })} TASK VERIFIED & COMPLETED!`;
    }
  }
}

export const voiceAssistantManager = VoiceAssistantManager.getInstance();
