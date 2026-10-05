// ============================================================
// UIManager – Cyber-Physical SCADA Digital Twin & AR Studio Interface
// 5 Multi-Experiment Suites, Left SCADA Stack, Right Telemetry, 3D Gizmo & Bottom Dock
// ============================================================

import { AppState } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { EXPERIMENTS, type ExperimentType } from '../core/ExperimentConfig';
import { alarmManager, type AlarmRecord } from '../core/AlarmManager';
import type { TrainingStepDef } from '../wiring/WiringTrainingEngine';
import { LadderLogicModal } from './LadderLogicModal';
import { voiceNarrator, VOICE_LANGUAGES } from '../core/VoiceNarrator';
import { voiceAssistantManager } from '../core/VoiceAssistantManager';
import { Icons } from './Icons';

export class UIManager {
  private leftStack!: HTMLElement;
  private rightStack!: HTMLElement;
  private bottomDock!: HTMLElement;
  private topBar!: HTMLElement;
  private completionModal!: HTMLElement;
  private emergencyBanner!: HTMLElement;
  private alarmLogPanel!: HTMLElement;
  private feedbackOverlay!: HTMLElement;
  private ladderLogicModal!: LadderLogicModal;
  private reactorDashboard!: HTMLElement;

  private currentAlarmFilter: 'ALL' | 'ACTIVE' | 'CRITICAL' | 'WARNING' = 'ALL';
  private isAlarmLogOpen = false;
  private isHandTrackingActive = false;

  constructor() {
    this.createUI();
    this.bindEvents();
    this.updateExperimentUI(AppState.activeExperiment);
    this.updateStatusPanel();
    this.updateGauges();
    this.updateSystemBadge();
    this.updateAlarmUI();
    // Equipment labels are visible in the default training view.
    EventBus.emit('ui:toggleCallouts');
  }

  private createUI(): void {
    const overlay = document.getElementById('ui-overlay')!;

    // Initialize Ladder Logic Studio Modal
    this.ladderLogicModal = new LadderLogicModal(overlay);

    // --- 1. Sleek Top Navigation Bar ---
    this.topBar = this.el('div', 'top-bar', overlay, `
      <div class="top-bar-left">
        <div class="brand-badge">
          <span class="siemens-logo-icon">${Icons.zap({ size: 18 })}</span>
          <div class="brand-info">
            <span class="brand-title">SIEMENS</span>
            <span class="brand-subtitle">S7-1200 Digital Twin Studio</span>
          </div>
        </div>

        <!-- Multi-Experiment Switcher Dropdown (5 Applications) -->
        <div class="experiment-dropdown-wrapper">
          <select id="experiment-select" class="experiment-select-dropdown" title="Select Active Industrial Experiment">
            <option value="TANK" ${AppState.activeExperiment === 'TANK' ? 'selected' : ''}>Exp 1 : Water Tank Level Control</option>
            <option value="CONVEYOR" ${AppState.activeExperiment === 'CONVEYOR' ? 'selected' : ''}>Exp 2 : Conveyor Optical Sorting</option>
            <option value="TRAFFIC" ${AppState.activeExperiment === 'TRAFFIC' ? 'selected' : ''}>Exp 3 : Smart Traffic Junction</option>
            <option value="ROBOT" ${AppState.activeExperiment === 'ROBOT' ? 'selected' : ''}>Exp 4 : 3-Axis Robotic Pick &amp; Place</option>
            <option value="REACTOR" ${AppState.activeExperiment === 'REACTOR' ? 'selected' : ''}>Exp 5 : Thermal Batch Reactor</option>
          </select>
        </div>

        <div id="system-state-badge" class="system-state state-wiring">
          <span class="state-dot"></span>
          <span class="state-text">WIRING MODE</span>
        </div>
      </div>

      <div class="top-bar-center">
        <div class="mode-selector-pill">
          <button id="btn-mode-wire" class="mode-pill-btn active" title="Step-by-step interactive wiring training">
            <span class="pill-icon">${Icons.zap({ size: 14 })}</span>
            <span>Wiring Lab</span>
          </button>
          <button id="btn-mode-inspect" class="mode-pill-btn" title="3D 360° Component Pinouts &amp; Specs">
            <span class="pill-icon">${Icons.eye({ size: 14 })}</span>
            <span>Inspector</span>
          </button>
          <button id="btn-mode-ladder" class="mode-pill-btn ladder-pill-btn" title="Open Interactive Ladder Logic Studio">
            <span class="pill-icon">${Icons.gitBranch({ size: 14 })}</span>
            <span>Ladder Studio</span>
          </button>
          <button id="btn-mode-rotate" class="mode-pill-btn" title="Use both hands to orbit and zoom the 3D station">
            <span class="pill-icon">${Icons.refreshCw({ size: 14 })}</span>
            <span>Rotate 3D</span>
          </button>
        </div>
      </div>

      <div class="top-bar-right">
        <!-- Hand Tracking Toggle -->
        <button id="btn-toggle-hand-tracking" class="tool-pill-btn" title="Toggle Spatial Hand Gesture Tracking (Webcam/AR)">
          <span class="pill-icon">${Icons.hand({ size: 14 })}</span>
          <span id="hand-tracking-label">Gestures</span>
        </button>

        <!-- AI Voice Narrator Guide Indicator Pill -->
        <label class="voice-language-control" title="Choose AI voice language">
          <span class="pill-icon">${Icons.mic({ size: 14 })}</span>
          <select id="btn-toggle-voice" aria-label="AI voice language">
            ${VOICE_LANGUAGES.map(({ code, label }) => `<option value="${code}"${code === 'en-US' ? ' selected' : ''}>${code === 'mute' ? 'Mute' : label}</option>`).join('')}
          </select>
        </label>

        <!-- SCADA Alarm & Event Log Indicator Pill -->
        <button id="btn-toggle-alarm-log" class="tool-pill-btn alarm-pill" title="Open SCADA Alarm &amp; Event Log">
          <span class="alarm-bell-icon">${Icons.alarm({ size: 15 })}</span>
          <span id="alarm-active-counter" class="alarm-count-badge">0</span>
          <span>Alarms</span>
        </button>

        <div class="quick-tools-group">
          <button id="btn-toggle-labels" class="tool-icon-btn active" title="Toggle 3D Equipment Labels">
            <span>${Icons.tag({ size: 14 })}</span>
            <span class="btn-label">Labels</span>
          </button>
          <button id="btn-reset-view" class="tool-icon-btn" title="Reset Camera View">
            <span>${Icons.compass({ size: 14 })}</span>
            <span class="btn-label">Reset View</span>
          </button>
        </div>
      </div>
    `);

    // --- 2. Left Column Stack (Wiring Training + SCADA Instrumentation + Fault Controls) ---
    this.leftStack = this.el('div', 'left-scada-stack', overlay, `
      <!-- Card 1: WIRING TRAINING -->
      <div class="scada-glass-card wiring-training-card" id="training-panel">
        <div class="card-header-row">
          <div class="card-title-group">
            <span class="header-icon-glow">${Icons.zap({ size: 18 })}</span>
            <div>
              <div class="main-title" id="training-main-title">WIRING TRAINING</div>
              <div class="sub-title" id="training-sub-title">Connect Field IO to S7-1200</div>
            </div>
          </div>
          <div class="header-badge-group">
            <div id="training-step-counter" class="training-step-counter">STEP 1 OF 4</div>
            <div class="step-num-bubbles" id="step-bubbles-row">
              <span class="bubble active" id="sdot-0">1</span>
              <span class="bubble-line"></span>
              <span class="bubble" id="sdot-1">2</span>
              <span class="bubble-line"></span>
              <span class="bubble" id="sdot-2">3</span>
              <span class="bubble-line"></span>
              <span class="bubble" id="sdot-3">4</span>
            </div>
          </div>
        </div>

        <div class="training-instruction-box">
          <div class="instruction-label">REQUIRED CONNECTION</div>
          <div id="training-target-text" class="instruction-flow-row">
            <div class="flow-pill src-pill" id="src-pill-text">
              <span class="pill-dot src-dot"></span>
              <span>PLC DI0 (%X10.0)</span>
            </div>
            <div class="flow-arrow-animated">${Icons.arrowRight({ size: 14 })}</div>
            <div class="flow-pill tgt-pill" id="tgt-pill-text">
              <span class="pill-dot tgt-dot"></span>
              <span>Sensor OUT (Low)</span>
            </div>
          </div>
          <div id="training-subtext" class="instruction-subtext">
            Point at a glowing PLC terminal to pick up its wire. Point at the matching field terminal to connect.
          </div>
        </div>

        <div class="training-actions-row">
          <button id="btn-voice-step" class="btn-action-ghost voice-action-btn" title="Replay AI Voice Guidance">
            <span>${Icons.volume2({ size: 14 })} Voice Guide</span>
          </button>
          <button id="btn-reset-wires" class="btn-action-ghost" title="Reset all wiring connections">
            <span>${Icons.rotateCcw({ size: 14 })} Reset</span>
          </button>
        </div>
      </div>

      <!-- Card 2: SCADA INSTRUMENTATION -->
      <div class="scada-glass-card scada-instrumentation-card" id="scada-panel">
        <div class="card-header-row">
          <div class="card-title-group">
            <span class="header-icon-glow">${Icons.sliders({ size: 18 })}</span>
            <span class="main-title" id="scada-panel-title">SCADA INSTRUMENTATION</span>
          </div>
          <button id="btn-mode-toggle" class="mode-toggle-pill mode-auto" title="Switch between Auto and Manual Control">
            <span class="mode-indicator-dot"></span>
            <span id="mode-toggle-text">AUTO</span>
          </button>
        </div>

        <!-- EXPERIMENT 1: Water Tank SCADA -->
        <div class="hmi-grid" id="tank-scada-grid">
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">PLC CPU S7-1200</span>
              <span id="st-plc" class="value off">STOP</span>
            </div>
            <button id="btn-toggle-plc" class="hmi-btn-tactile">${Icons.play({ size: 13 })} RUN</button>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">PUMP MOTOR</span>
              <span id="st-pump" class="value off">OFF (0 RPM)</span>
            </div>
            <button id="btn-toggle-pump" class="hmi-btn-tactile amber">${Icons.zap({ size: 13 })} PUMP</button>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">CONTROL VALVE</span>
              <span id="st-valve" class="value off">CLOSED (0%)</span>
            </div>
            <button id="btn-toggle-valve" class="hmi-btn-tactile cyan">${Icons.refreshCw({ size: 13 })} VALVE</button>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">INDICATOR STAND</span>
              <span id="st-sensor" class="value on">NORMAL (OK)</span>
            </div>
            <div class="lamp-indicators-mini">
              <span id="lamp-hi" class="mini-lamp red" title="High Alarm >80%">HI</span>
              <span id="lamp-norm" class="mini-lamp green on" title="Normal 20-80%">NORM</span>
              <span id="lamp-low" class="mini-lamp amber" title="Low Alarm <20%">LOW</span>
            </div>
          </div>
        </div>

        <div class="level-setpoint-group" id="tank-setpoint-group">
          <div class="setpoint-header">
            <span class="label">TANK LEVEL SETPOINT</span>
            <span id="setpoint-val" class="value-highlight">70%</span>
          </div>
          <div class="slider-wrapper">
            <input type="range" id="level-slider" min="10" max="95" value="70" class="level-range" />
          </div>
          <div class="quick-level-actions">
            <button id="btn-quick-fill" class="quick-preset-btn fill">${Icons.droplet({ size: 12 })} Fill 90%</button>
            <button id="btn-quick-mid" class="quick-preset-btn mid">${Icons.waves({ size: 12 })} Mid 50%</button>
            <button id="btn-quick-drain" class="quick-preset-btn drain">${Icons.arrowDown({ size: 12 })} Drain 10%</button>
            <button id="btn-tank-voice-sim" class="quick-preset-btn voice-preset-btn" title="AI Voice explanation">${Icons.volume2({ size: 12 })} Explain Sim</button>
          </div>
        </div>

        <!-- EXPERIMENT 2: Conveyor SCADA -->
        <div class="hmi-grid" id="conveyor-scada-grid" style="display: none;">
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">PLC CPU S7-1200</span>
              <span id="st-conveyor-plc" class="value off">STOP</span>
            </div>
            <button id="btn-toggle-conveyor-plc" class="hmi-btn-tactile">${Icons.play({ size: 13 })} RUN</button>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">GEARMOTOR DRIVE</span>
              <span id="st-conveyor-motor" class="value off">OFF (0.0 m/s)</span>
            </div>
            <button id="btn-toggle-conveyor-motor" class="hmi-btn-tactile amber">${Icons.zap({ size: 13 })} MOTOR</button>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">OPTICAL SENSOR</span>
              <span id="st-optical-sensor" class="value on">CLEAR</span>
            </div>
            <div class="lamp-indicators-mini">
              <span id="lamp-optical" class="mini-lamp green">BEAM</span>
            </div>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">PNEUMATIC DIVERTER</span>
              <span id="st-diverter-pusher" class="value off">RETRACTED</span>
            </div>
            <button id="btn-toggle-pusher" class="hmi-btn-tactile cyan">${Icons.shuffle({ size: 13 })} PUSH</button>
          </div>
        </div>

        <div class="level-setpoint-group" id="conveyor-setpoint-group" style="display: none;">
          <div class="quick-level-actions">
            <button id="btn-dispense-box" class="quick-preset-btn fill">${Icons.box({ size: 12 })} Dispense Box</button>
            <button id="btn-fire-pusher" class="quick-preset-btn mid">${Icons.zap({ size: 12 })} Fire Pusher</button>
            <button id="btn-conveyor-voice-sim" class="quick-preset-btn voice-preset-btn" title="AI Voice explanation">${Icons.volume2({ size: 12 })} Explain Sim</button>
            <button id="btn-reset-conveyor-stats" class="quick-preset-btn drain">${Icons.rotateCcw({ size: 12 })} Clear Stats</button>
          </div>
        </div>

        <!-- EXPERIMENT 3: Traffic Junction SCADA -->
        <div class="hmi-grid" id="traffic-scada-grid" style="display: none;">
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">MAIN SIGNAL HEAD</span>
              <span id="st-traffic-signal" class="value on">GREEN (GO)</span>
            </div>
            <div class="lamp-indicators-mini">
              <span id="lamp-traffic-red" class="mini-lamp red">R</span>
              <span id="lamp-traffic-yel" class="mini-lamp amber">Y</span>
              <span id="lamp-traffic-grn" class="mini-lamp green on">G</span>
            </div>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">PEDESTRIAN CROSSWALK</span>
              <span id="st-traffic-ped" class="value off">DON'T WALK</span>
            </div>
            <button id="btn-traffic-ped-call" class="hmi-btn-tactile cyan">${Icons.pedestrian({ size: 13 })} CALL PED</button>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">VEHICLE LOOP SENSOR</span>
              <span id="st-traffic-loop" class="value on">NO CAR</span>
            </div>
            <span class="tag-status" id="tag-vehicle-count">0 CARS</span>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">PHASE SEQUENCER</span>
              <span id="st-traffic-timer" class="value-highlight">10s Remaining</span>
            </div>
            <button id="btn-traffic-emergency" class="hmi-btn-tactile amber" title="Emergency Vehicle Corridor">${Icons.alarm({ size: 13 })} CORRIDOR</button>
          </div>
        </div>

        <div class="level-setpoint-group" id="traffic-setpoint-group" style="display: none;">
          <div class="quick-level-actions">
            <button id="btn-traffic-voice-sim" class="quick-preset-btn voice-preset-btn" title="AI Voice explanation">${Icons.volume2({ size: 12 })} Explain Sim</button>
          </div>
        </div>

        <!-- EXPERIMENT 4: Robotic Pick & Place SCADA -->
        <div class="hmi-grid" id="robot-scada-grid" style="display: none;">
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">GANTRY MOTION STATE</span>
              <span id="st-robot-cycle" class="value on">IDLE</span>
            </div>
            <button id="btn-robot-cycle-start" class="hmi-btn-tactile">${Icons.play({ size: 13 })} RUN CYCLE</button>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">VACUUM SUCTION GRIPPER</span>
              <span id="st-robot-vac" class="value off">RELEASED (0 kPa)</span>
            </div>
            <button id="btn-robot-vac-toggle" class="hmi-btn-tactile cyan">${Icons.wind({ size: 13 })} VACUUM</button>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">PART FEED NEST</span>
              <span id="st-robot-feed" class="value on">PART READY</span>
            </div>
            <button id="btn-robot-spawn-part" class="hmi-btn-tactile amber">${Icons.plus({ size: 13 })} FEED PART</button>
          </div>
        </div>

        <div class="level-setpoint-group" id="robot-setpoint-group" style="display: none;">
          <div class="quick-level-actions">
            <button id="btn-robot-voice-sim" class="quick-preset-btn voice-preset-btn" title="AI Voice explanation">${Icons.volume2({ size: 12 })} Explain Sim</button>
          </div>
        </div>

        <!-- EXPERIMENT 5: Thermal Batch Reactor SCADA -->
        <div class="hmi-grid" id="reactor-scada-grid" style="display: none;">
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">REACTION CORE TEMP</span>
              <span id="st-reactor-temp" class="value-highlight">24.5 °C</span>
            </div>
            <button id="btn-reactor-toggle-heater" class="hmi-btn-tactile amber">${Icons.flame({ size: 13 })} HEATER</button>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">IMPELLER AGITATOR</span>
              <span id="st-reactor-agitator" class="value off">OFF (0 RPM)</span>
            </div>
            <button id="btn-reactor-toggle-agitator" class="hmi-btn-tactile cyan">${Icons.wind({ size: 13 })} AGITATE</button>
          </div>
          <div class="hmi-card-row">
            <div class="hmi-info">
              <span class="label">BATCH RECIPE STEP</span>
              <span id="st-reactor-step" class="value on">IDLE</span>
            </div>
            <button id="btn-reactor-toggle-drain" class="hmi-btn-tactile">${Icons.arrowDown({ size: 13 })} DRAIN</button>
          </div>
        </div>

        <div class="level-setpoint-group" id="reactor-setpoint-group" style="display: none;">
          <div class="quick-level-actions">
            <button id="btn-reactor-voice-sim" class="quick-preset-btn voice-preset-btn" title="AI Voice explanation">${Icons.volume2({ size: 12 })} Explain Sim</button>
          </div>
        </div>
      </div>

      <!-- Card 3: SAFETY & FAULT CONTROLS -->
      <div class="scada-glass-card safety-controls-card">
        <div class="safety-title-row">
          <span class="safety-icon">${Icons.alertOctagon({ size: 18 })}</span>
          <span class="safety-title">SAFETY &amp; FAULT CONTROLS</span>
        </div>
        <div class="estop-row">
          <button id="btn-estop-main" class="e-stop-mushroom-btn">
            <span class="estop-icon">${Icons.alertTriangle({ size: 20 })}</span>
            <span id="estop-btn-text">EMERGENCY STOP</span>
          </button>
        </div>
        <div class="fault-actions-row">
          <button id="btn-fault-1" class="btn-fault-action" title="Simulate overfill or jam fault">
            <span>${Icons.zap({ size: 13 })}</span>
            <span id="fault-1-label">Inject Overfill</span>
          </button>
          <button id="btn-fault-2" class="btn-fault-action" title="Simulate starvation or sensor failure">
            <span>${Icons.zap({ size: 13 })}</span>
            <span id="fault-2-label">Inject Starve</span>
          </button>
          <button id="btn-clear-faults" class="btn-fault-action clear" title="Clear all simulated faults">
            <span>${Icons.check({ size: 13 })}</span>
            <span>Clear Faults</span>
          </button>
        </div>
      </div>
    `);

    // --- 3. Right Column Stack (Telemetry Cards + 3D Gizmo) ---
    this.rightStack = this.el('div', 'right-telemetry-stack', overlay, `
      <!-- Card 1: Primary Gauge (e.g. Tank Level, Sort Ratio, Temp) -->
      <div class="telemetry-gauge-card" id="card-gauge-main">
        <div class="gauge-card-header">
          <span class="gauge-header-icon" id="metric-1-icon">${Icons.waves({ size: 16 })}</span>
          <span class="gauge-header-title" id="metric-1-title">TANK LEVEL</span>
        </div>
        <div class="gauge-card-content">
          <div class="gauge-big-val" id="metric-1-value">0%</div>
          <div class="gauge-vertical-cylinder">
            <div class="cylinder-ticks">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            <div class="cylinder-tube">
              <div class="cylinder-liquid-fill" id="gauge-fill" style="height: 0%;">
                <div class="liquid-meniscus"></div>
              </div>
              <div class="setpoint-indicator-line" id="setpoint-marker-line" style="bottom: 70%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 2: Flow Rate / Velocity / Metric 2 -->
      <div class="telemetry-metric-card">
        <div class="metric-card-header">
          <span class="metric-icon" id="metric-2-icon">${Icons.activity({ size: 16 })}</span>
          <span class="metric-title" id="metric-2-title">FLOW RATE</span>
        </div>
        <div class="metric-value-row">
          <span class="metric-main-val" id="metric-2-value">0.0</span>
          <span class="metric-unit-tag" id="metric-2-unit">L/min</span>
        </div>
      </div>

      <!-- Card 3: Pump Status / Actuator 1 -->
      <div class="telemetry-metric-card">
        <div class="metric-card-header">
          <span class="metric-icon" id="metric-3-icon">${Icons.pump({ size: 16 })}</span>
          <span class="metric-title" id="metric-3-title">PUMP STATUS</span>
        </div>
        <div class="metric-value-row">
          <span class="metric-status-val off" id="metric-3-value">OFF</span>
          <span class="metric-sub-tag" id="metric-3-sub">0 RPM</span>
        </div>
      </div>

      <!-- Card 4: Valve Status / Actuator 2 -->
      <div class="telemetry-metric-card">
        <div class="metric-card-header">
          <span class="metric-icon" id="metric-4-icon">${Icons.valve({ size: 16 })}</span>
          <span class="metric-title" id="metric-4-title">VALVE STATUS</span>
        </div>
        <div class="metric-value-row">
          <span class="metric-status-val off" id="metric-4-value">CLOSED</span>
          <span class="metric-sub-tag" id="metric-4-sub">0%</span>
        </div>
      </div>
    `);

    // --- 4. Bottom Floating Dock ---
    this.bottomDock = this.el('div', 'bottom-center-dock', overlay, `
      <button id="btn-start" class="dock-btn-modern start-btn" title="Start automated process">
        <span class="dock-icon">${Icons.play({ size: 18 })}</span>
        <span>Start Process</span>
      </button>
      <button id="btn-dock-ladder" class="dock-btn-modern ladder-btn" title="Open Interactive Ladder Logic Studio">
        <span class="dock-icon">${Icons.gitBranch({ size: 18 })}</span>
        <span>Ladder Logic</span>
      </button>
      <button id="btn-stop" class="dock-btn-modern stop-btn" title="Halt process">
        <span class="dock-icon">${Icons.stop({ size: 18 })}</span>
        <span>Stop</span>
      </button>
      <button id="btn-ar" class="dock-btn-modern ar-btn" title="Launch Augmented Reality camera">
        <span class="dock-icon">${Icons.cube({ size: 18 })}</span>
        <span>AR Mode</span>
      </button>
    `);

    // --- 5. Emergency Alarm Banner ---
    this.emergencyBanner = this.el('div', 'emergency-alarm-banner hidden', overlay, `
      <div class="alarm-banner-strobe"></div>
      <div class="alarm-banner-left">
        <div class="alarm-banner-icon-glow">${Icons.alertOctagon({ size: 24 })}</div>
        <div class="alarm-banner-info">
          <div class="alarm-banner-title">
            <span class="alarm-code" id="alm-banner-code">ALM-101</span>
            <span class="alarm-main-title" id="alm-banner-title">HIGH LIQUID LEVEL OVERFLOW</span>
            <span class="alarm-eq-tag" id="alm-banner-eq">Process Equipment</span>
          </div>
          <div class="alarm-banner-desc" id="alm-banner-desc">
            Industrial safety threshold tripped. Automated protection active.
          </div>
        </div>
      </div>
      <div class="alarm-banner-actions">
        <button id="btn-banner-ack" class="alarm-banner-btn ack" title="Acknowledge Active Alarm">${Icons.check({ size: 14 })} ACKNOWLEDGE</button>
        <button id="btn-banner-silence" class="alarm-banner-btn silence" title="Silence Siren">${Icons.volumeX({ size: 14 })} SILENCE</button>
        <button id="btn-banner-estop" class="alarm-banner-btn estop" title="Emergency Stop">${Icons.alertTriangle({ size: 14 })} E-STOP</button>
      </div>
    `);

    // --- 6. SCADA Alarm Log Panel ---
    this.alarmLogPanel = this.el('div', 'alarm-log-card hidden', overlay, `
      <div class="alarm-log-header">
        <div class="alarm-log-title-group">
          <span class="alarm-header-icon">${Icons.clipboard({ size: 18 })}</span>
          <div>
            <div class="alarm-header-main">SCADA ALARM &amp; EVENT RECORDER</div>
            <div class="alarm-header-sub">ISA-18.2 Sequence of Events Log</div>
          </div>
        </div>
        <div class="alarm-header-tools">
          <button id="btn-ack-all-alarms" class="alarm-tool-btn" title="Acknowledge all alarms">${Icons.check({ size: 13 })} Ack All</button>
          <button id="btn-clear-alarm-logs" class="alarm-tool-btn" title="Clear resolved events">${Icons.rotateCcw({ size: 13 })} Clear</button>
          <button id="btn-close-alarm-log" class="alarm-close-btn" title="Close Log Panel">${Icons.x({ size: 16 })}</button>
        </div>
      </div>

      <div class="alarm-filter-tabs">
        <button class="alarm-tab active" data-filter="ALL">ALL EVENTS</button>
        <button class="alarm-tab" data-filter="ACTIVE">ACTIVE (<span id="tab-active-count">0</span>)</button>
        <button class="alarm-tab" data-filter="CRITICAL">CRITICAL</button>
        <button class="alarm-tab" data-filter="WARNING">WARNINGS</button>
      </div>

      <div class="alarm-log-body" id="alarm-log-list"></div>
    `);

    // --- 7. Completion Celebration Modal ---
    this.completionModal = this.el('div', 'completion-modal', overlay, `
      <div class="completion-card">
        <div class="completion-glow-ring"></div>
        <div class="completion-icon">${Icons.checkCircle({ size: 48 })}</div>
        <h2>WIRING VERIFIED</h2>
        <div class="completion-badge" id="modal-badge-text">4 / 4 CIRCUITS ARMED</div>
        <p id="modal-desc-text">Siemens S7-1200 CPU and field devices are securely interfaced. Ready for real-time automated process simulation.</p>
        <div class="completion-actions">
          <button id="btn-modal-start" class="modal-btn-primary">${Icons.play({ size: 14 })} Start Automated Process</button>
          <button id="btn-modal-ladder" class="modal-btn-primary ladder-btn-accent">${Icons.zap({ size: 14 })} View Live Ladder Logic</button>
          <button id="btn-modal-restart" class="modal-btn-secondary">${Icons.rotateCcw({ size: 14 })} Reset Training</button>
        </div>
      </div>
    `);
    this.completionModal.style.display = 'none';

    // --- 8. Feedback Toast Overlay ---
    this.feedbackOverlay = this.el('div', 'feedback-overlay', overlay, '');

    this.reactorDashboard = this.el('section', 'reactor-dashboard', overlay, `
      <header class="reactor-dashboard-header">
        <div class="reactor-brand"><span class="reactor-brand-mark">${Icons.reactor({ size: 18 })}</span><div><strong>Thermal Batch Reactor</strong><small>Process Simulation &amp; Control</small></div></div>
        <nav class="reactor-nav">
          <button class="active" data-tab="overview">${Icons.home({ size: 14 })} <span>Overview</span></button>
          <button data-tab="pid">${Icons.gitBranch({ size: 14 })} <span>P&amp;ID</span></button>
          <button data-tab="trending">${Icons.trendingUp({ size: 14 })} <span>Trending</span></button>
          <button data-tab="alarms">${Icons.alarm({ size: 14 })} <span>Alarms</span></button>
          <button data-tab="reports">${Icons.fileText({ size: 14 })} <span>Reports</span></button>
        </nav>
        <div class="reactor-online"><i></i><div><strong>System Online</strong><small>SIMATIC S7-1200</small></div></div>
      </header>
      <aside class="reactor-components reactor-dash-panel"><h2>${Icons.layers({ size: 14 })} &nbsp;Components</h2><ol>
        <li><b>1</b><span>Reactor Vessel<small>(SS, Insulated)</small></span></li><li><b>2</b><span>Heater (Electrical)</span></li><li><b>3</b><span>Temperature Sensor<small>(PT100/TC)</small></span></li><li><b>4</b><span>Pressure Sensor</span></li><li><b>5</b><span>Level Sensor</span></li><li><b>6</b><span>Agitator / Stirrer</span></li><li><b>7</b><span>Inlet Valve (Feed)</span></li><li><b>8</b><span>Outlet Valve (Drain)</span></li><li><b>9</b><span>Safety Relief Valve</span></li><li><b>10</b><span>Control Panel (PLC)</span></li><li><b>11</b><span>HMI (Optional)</span></li><li><b>12</b><span>Piping &amp; Fittings</span></li><li><b>13</b><span>Insulation &amp; Support</span></li>
      </ol></aside>
      <aside class="reactor-right-column"><section class="reactor-parameters reactor-dash-panel"><h2>${Icons.gauge({ size: 14 })} &nbsp;Process Parameters</h2>
        <div class="reactor-metric"><span class="metric-icon">${Icons.flame({ size: 16 })}</span><div class="metric-content"><div class="metric-heading"><strong>Temperature</strong><small>SP: <span data-sp-temp>75.0</span> °C</small></div><div class="metric-reading"><b data-temp>24.5</b><span>°C</span></div><div class="metric-track"><i data-temp-bar></i></div><div class="metric-limits"><span>0</span><span>100</span></div></div></div>
        <div class="reactor-metric"><span class="metric-icon">${Icons.gauge({ size: 16 })}</span><div class="metric-content"><div class="metric-heading"><strong>Pressure</strong><small>SP: 1.50 bar</small></div><div class="metric-reading"><b>1.20</b><span>bar</span></div><div class="metric-track"><i style="width:24%"></i></div><div class="metric-limits"><span>0</span><span>5</span></div></div></div>
        <div class="reactor-metric"><span class="metric-icon">${Icons.droplet({ size: 16 })}</span><div class="metric-content"><div class="metric-heading"><strong>Level</strong><small>SP: <span data-sp-level>80</span> %</small></div><div class="metric-reading"><b data-level>0</b><span>%</span></div><div class="metric-track"><i data-level-bar></i></div><div class="metric-limits"><span>0</span><span>100</span></div></div></div>
        <div class="reactor-metric"><span class="metric-icon">${Icons.wind({ size: 16 })}</span><div class="metric-content"><div class="metric-heading"><strong>Agitator Speed</strong><small>SP: 720 RPM</small></div><div class="metric-reading"><b data-rpm>0</b><span>RPM</span></div><div class="metric-track"><i data-rpm-bar></i></div><div class="metric-limits"><span>0</span><span>1000</span></div></div></div>
      </section><section class="reactor-controls reactor-dash-panel"><h2>${Icons.sliders({ size: 14 })} &nbsp;Reactor Control</h2><div class="reactor-control-grid">
        <button class="batch-start" data-action="start">${Icons.play({ size: 13 })} &nbsp;START BATCH</button>
        <button data-action="stop">${Icons.stop({ size: 13 })} &nbsp;STOP</button>
        <button data-action="heater">${Icons.flame({ size: 13 })} &nbsp;HEATER <span data-heater-state>OFF</span></button>
        <button data-action="agitator">${Icons.wind({ size: 13 })} &nbsp;AGITATOR <span data-agitator-state>OFF</span></button>
      </div></section></aside>
      <footer class="reactor-bottom"><section class="reactor-batch reactor-dash-panel"><h2>${Icons.activity({ size: 14 })} &nbsp;Batch Status <span data-batch-count>0 batches</span></h2><div class="batch-steps">
        <div data-step="IDLE"><i>${Icons.check({ size: 12 })}</i><span>Idle</span></div>
        <div data-step="DOSING_A"><i>${Icons.droplet({ size: 12 })}</i><span>Dosing A</span></div>
        <div data-step="DOSING_B"><i>${Icons.droplet({ size: 12 })}</i><span>Dosing B</span></div>
        <div data-step="MIXING"><i>${Icons.reactor({ size: 12 })}</i><span>Reaction</span></div>
        <div data-step="HEATING"><i>${Icons.flame({ size: 12 })}</i><span>Heating</span></div>
        <div data-step="HOLDING"><i>${Icons.wind({ size: 12 })}</i><span>Cooling</span></div>
        <div data-step="COMPLETE"><i>${Icons.checkCircle({ size: 12 })}</i><span>Complete</span></div>
      </div><p class="batch-caption" data-batch-caption>Ready to start a batch</p></section><section class="reactor-trend reactor-dash-panel"><h2>${Icons.trendingUp({ size: 14 })} &nbsp;Trends (Temperature)</h2><div class="trend-chart"><div class="trend-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><svg viewBox="0 0 420 110" preserveAspectRatio="none" aria-label="Temperature trend"><path class="trend-grid" d="M0 10H420M0 32H420M0 54H420M0 76H420M0 98H420"/><path class="trend-area" data-trend-area d="M0 90 L50 84 L95 65 L145 58 L195 37 L245 35 L290 22 L345 20 L420 20 L420 105 L0 105Z"/><path class="trend-line" data-trend-line d="M0 90 L50 84 L95 65 L145 58 L195 37 L245 35 L290 22 L345 20 L420 20"/></svg></div><div class="trend-x"><span>09:00</span><span>09:15</span><span>09:30</span><span>09:45</span><span>10:00</span></div></section><section class="reactor-alarms reactor-dash-panel"><h2>${Icons.alarm({ size: 14 })} &nbsp;Alarms &amp; Events <button data-action="alarms">View All</button></h2><div class="reactor-alarm-list" data-alarm-list></div></section></footer>
    `);
    this.reactorDashboard.hidden = true;
    this.reactorDashboard.remove();
    this.reactorDashboard.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'start') EventBus.emit(Events.PROCESS_START);
      else if (action === 'stop') EventBus.emit(Events.PROCESS_STOP);
      else if (action === 'heater') EventBus.emit('reactor:toggleHeater');
      else if (action === 'agitator') EventBus.emit('reactor:toggleAgitator');
      else if (action === 'alarms') document.getElementById('btn-toggle-alarm-log')?.click();
    }));
    this.reactorDashboard.querySelectorAll<HTMLButtonElement>('.reactor-nav button').forEach((button) => button.addEventListener('click', () => {
      this.reactorDashboard.querySelectorAll('.reactor-nav button').forEach((tab) => tab.classList.toggle('active', tab === button));
      const tab = button.dataset.tab;
      if (tab === 'alarms') document.getElementById('btn-toggle-alarm-log')?.click();
      if (tab === 'pid') EventBus.emit('inspector:open', { componentId: 'reactor' });
      if (tab === 'overview') EventBus.emit('inspector:close');
      if (tab === 'trending') this.reactorDashboard.querySelector('.reactor-trend')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (tab === 'reports') this.showToast('info', `Completed batches: ${AppState.reactorBatchesCompleted}`);
    }));
    EventBus.on('alarm:changed', () => this.updateReactorDashboard());
    EventBus.on('reactor:batchStepChanged', () => this.updateReactorDashboard());
    EventBus.on('reactor:tempChanged', () => this.updateReactorDashboard());
    EventBus.on('reactor:fluidChanged', () => this.updateReactorDashboard());
    EventBus.on('reactor:agitatorChanged', () => this.updateReactorDashboard());
    EventBus.on('reactor:heaterChanged', () => this.updateReactorDashboard());
    this.updateReactorDashboard();
  }

  private bindEvents(): void {
    // Experiment Selection Dropdown
    const expSelect = document.getElementById('experiment-select') as HTMLSelectElement;
    expSelect?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as ExperimentType;
      AppState.setExperiment(val);
      this.updateExperimentUI(val);
      this.showToast('info', `Switched to ${EXPERIMENTS[val].title}`);
    });

    // Ladder Logic Studio Modal Open
    const openLadder = () => {
      this.ladderLogicModal.open();
      this.setActiveModeBtn('btn-mode-ladder');
    };

    document.getElementById('btn-open-ladder')?.addEventListener('click', openLadder);
    document.getElementById('btn-dock-ladder')?.addEventListener('click', openLadder);
    document.getElementById('btn-mode-ladder')?.addEventListener('click', openLadder);
    document.getElementById('btn-modal-ladder')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      this.hideCompletionModal();
      openLadder();
      voiceAssistantManager.setMode('LADDER');
    });

    // Hand Tracking Activation
    document.getElementById('btn-toggle-hand-tracking')?.addEventListener('click', () => {
      this.isHandTrackingActive = !this.isHandTrackingActive;
      EventBus.emit('hand:toggleTracking', { active: this.isHandTrackingActive });
      const btn = document.getElementById('btn-toggle-hand-tracking');
      const label = document.getElementById('hand-tracking-label');
      if (btn) btn.classList.toggle('active', this.isHandTrackingActive);
      if (label) label.textContent = this.isHandTrackingActive ? 'Gestures ON' : 'Gestures';
      this.showToast('info', this.isHandTrackingActive ? 'Hand Gestures: Webcam Activated' : 'Hand Gestures: Standby');
    });

    // Voice Instructor UI & Handlers
    document.getElementById('btn-toggle-voice')?.addEventListener('change', (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      voiceNarrator.setLanguage(select.value);
      const enabled = voiceNarrator.isVoiceEnabled();
      select.closest('.voice-language-control')?.classList.toggle('active', enabled);
      document.querySelectorAll<HTMLSelectElement>('.mentor-language-select').forEach((el) => {
        el.value = enabled ? voiceNarrator.getLanguage() : 'mute';
      });
      if (enabled) voiceAssistantManager.speakCurrentTask(false);
      this.showToast('info', enabled ? `AI Voice: ${VOICE_LANGUAGES.find((item) => item.code === select.value)?.label}` : 'AI Voice: Muted');
    });

    EventBus.on('voice:stateChanged', (data: { enabled: boolean }) => {
      document.querySelectorAll<HTMLSelectElement>('#btn-toggle-voice, .mentor-language-select').forEach((el) => {
        el.value = data.enabled ? voiceNarrator.getLanguage() : 'mute';
      });
    });

    EventBus.on('voice:translationError', () => {
      this.showToast('error', 'Translation failed. Check your connection or free translation limit, then try again.');
    });

    // Replay wiring voice guide on demand
    document.getElementById('btn-voice-step')?.addEventListener('click', () => {
      voiceAssistantManager.speakCurrentTask(true);
    });

    // Explain simulation on demand
    const triggerVoiceSim = () => {
      voiceNarrator.speakSimulationStart(AppState.activeExperiment);
    };

    document.getElementById('btn-tank-voice-sim')?.addEventListener('click', triggerVoiceSim);
    document.getElementById('btn-conveyor-voice-sim')?.addEventListener('click', triggerVoiceSim);
    document.getElementById('btn-traffic-voice-sim')?.addEventListener('click', triggerVoiceSim);
    document.getElementById('btn-robot-voice-sim')?.addEventListener('click', triggerVoiceSim);
    document.getElementById('btn-reactor-voice-sim')?.addEventListener('click', triggerVoiceSim);

    // Alarm Log Events
    document.getElementById('btn-toggle-alarm-log')?.addEventListener('click', () => this.toggleAlarmLog());
    document.getElementById('btn-close-alarm-log')?.addEventListener('click', () => this.closeAlarmLog());
    document.getElementById('btn-ack-all-alarms')?.addEventListener('click', () => {
      alarmManager.acknowledgeAll();
      this.showToast('success', 'All active alarms acknowledged');
    });
    document.getElementById('btn-clear-alarm-logs')?.addEventListener('click', () => {
      alarmManager.clearHistory();
      this.renderAlarmLogList(this.currentAlarmFilter);
      this.showToast('info', 'Alarm event history cleared');
    });

    // Alarm Filter Tabs
    this.alarmLogPanel.querySelectorAll('.alarm-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        this.alarmLogPanel.querySelectorAll('.alarm-tab').forEach((t) => t.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const filter = (target.getAttribute('data-filter') as any) || 'ALL';
        this.currentAlarmFilter = filter;
        this.renderAlarmLogList(filter);
      });
    });

    // Emergency Banner Actions
    document.getElementById('btn-banner-ack')?.addEventListener('click', () => {
      alarmManager.acknowledgeAll();
      this.showToast('success', 'Alarm acknowledged & siren silenced');
    });
    document.getElementById('btn-banner-silence')?.addEventListener('click', () => {
      const silenced = alarmManager.toggleSilenceSiren();
      const btn = document.getElementById('btn-banner-silence');
      if (btn) btn.innerHTML = silenced ? `${Icons.volume2({ size: 14 })} UNMUTE` : `${Icons.volumeX({ size: 14 })} SILENCE`;
      this.showToast('info', silenced ? 'Siren muted' : 'Siren unmuted');
    });
    document.getElementById('btn-banner-estop')?.addEventListener('click', () => this.toggleEStop());
    document.getElementById('btn-estop-main')?.addEventListener('click', () => this.toggleEStop());

    // Fault Injection Buttons
    document.getElementById('btn-fault-1')?.addEventListener('click', () => this.triggerFault(1));
    document.getElementById('btn-fault-2')?.addEventListener('click', () => this.triggerFault(2));
    document.getElementById('btn-clear-faults')?.addEventListener('click', () => this.clearAllFaults());

    // Mode Switching
    document.getElementById('btn-mode-wire')?.addEventListener('click', () => {
      EventBus.emit('placement:requestMode', 'WIRING');
      this.setActiveModeBtn('btn-mode-wire');
      EventBus.emit('inspector:close');
      this.ladderLogicModal.close();
      voiceAssistantManager.setMode('WIRING');
    });

    document.getElementById('btn-mode-inspect')?.addEventListener('click', () => {
      const initialComp = AppState.activeExperiment === 'CONVEYOR' ? 'conveyor' : AppState.activeExperiment === 'TRAFFIC' ? 'traffic' : AppState.activeExperiment === 'ROBOT' ? 'robot' : AppState.activeExperiment === 'REACTOR' ? 'reactor' : 'plc';
      EventBus.emit('inspector:open', { componentId: initialComp });
      this.setActiveModeBtn('btn-mode-inspect');
      this.ladderLogicModal.close();
      voiceAssistantManager.setMode('INSPECTOR');
    });

    document.getElementById('btn-mode-rotate')?.addEventListener('click', () => {
      EventBus.emit('placement:requestMode', 'ROTATE_RIG');
      this.setActiveModeBtn('btn-mode-rotate');
      EventBus.emit('inspector:close');
      this.ladderLogicModal.close();
    });

    EventBus.on('inspector:closed', () => {
      if (document.getElementById('btn-mode-inspect')?.classList.contains('active')) {
        this.setActiveModeBtn('btn-mode-wire');
      }
    });

    // Control Mode (Auto / Manual)
    document.getElementById('btn-mode-toggle')?.addEventListener('click', () => {
      EventBus.emit('control:toggleMode');
    });

    const togglePLC = () => {
      if (alarmManager.isEStopLatched()) {
        this.showToast('error', 'Cannot start: Release Emergency Stop first!');
        return;
      }
      if (AppState.plcState === 'RUN') {
        EventBus.emit(Events.PROCESS_STOP);
      } else {
        EventBus.emit(Events.PROCESS_START);
      }
    };

    document.getElementById('btn-toggle-plc')?.addEventListener('click', togglePLC);
    document.getElementById('btn-toggle-conveyor-plc')?.addEventListener('click', togglePLC);

    // Exp 1: Tank Controls
    document.getElementById('btn-toggle-pump')?.addEventListener('click', () => EventBus.emit('control:togglePump'));
    document.getElementById('btn-toggle-valve')?.addEventListener('click', () => EventBus.emit('control:toggleValve'));
    document.getElementById('btn-quick-fill')?.addEventListener('click', () => {
      EventBus.emit('control:quickFill');
      this.updateSetpointUI(90);
    });
    document.getElementById('btn-quick-mid')?.addEventListener('click', () => {
      EventBus.emit(Events.SETPOINT_CHANGED, 50);
      this.updateSetpointUI(50);
    });
    document.getElementById('btn-quick-drain')?.addEventListener('click', () => {
      EventBus.emit('control:quickDrain');
      this.updateSetpointUI(10);
    });

    // Exp 2: Conveyor Controls
    document.getElementById('btn-toggle-conveyor-motor')?.addEventListener('click', () => EventBus.emit('conveyor:toggleMotor'));
    document.getElementById('btn-toggle-pusher')?.addEventListener('click', () => EventBus.emit('conveyor:togglePusher'));
    document.getElementById('btn-dispense-box')?.addEventListener('click', () => {
      EventBus.emit('conveyor:dispenseBox');
      this.showToast('info', 'Workpiece box dispensed onto conveyor');
    });
    document.getElementById('btn-fire-pusher')?.addEventListener('click', () => {
      EventBus.emit('conveyor:togglePusher');
      this.showToast('info', 'Pneumatic diverter fired');
    });
    document.getElementById('btn-reset-conveyor-stats')?.addEventListener('click', () => {
      AppState.conveyorPartsTotal = 0;
      AppState.conveyorPartsSorted = 0;
      this.updateStatusPanel();
      this.showToast('info', 'Conveyor part counters reset');
    });

    // Exp 3: Traffic Controls
    document.getElementById('btn-traffic-ped-call')?.addEventListener('click', () => {
      EventBus.emit('traffic:pedCall');
      this.showToast('info', 'Pedestrian crosswalk call registered');
    });
    document.getElementById('btn-traffic-emergency')?.addEventListener('click', () => {
      EventBus.emit('traffic:toggleEmergency');
    });

    // Exp 4: Robot Controls
    document.getElementById('btn-robot-cycle-start')?.addEventListener('click', () => {
      EventBus.emit('robot:triggerCycle');
      this.showToast('info', 'Robotic pick-and-place cycle initiated');
    });
    document.getElementById('btn-robot-vac-toggle')?.addEventListener('click', () => {
      EventBus.emit('robot:manualVacuumToggle');
    });
    document.getElementById('btn-robot-spawn-part')?.addEventListener('click', () => {
      EventBus.emit('robot:spawnPart');
      this.showToast('info', 'Workpiece loaded into feed nest');
    });

    // Exp 5: Reactor Controls
    document.getElementById('btn-reactor-toggle-heater')?.addEventListener('click', () => {
      EventBus.emit('reactor:toggleHeater');
    });
    document.getElementById('btn-reactor-toggle-agitator')?.addEventListener('click', () => {
      EventBus.emit('reactor:toggleAgitator');
    });
    document.getElementById('btn-reactor-toggle-drain')?.addEventListener('click', () => {
      EventBus.emit('reactor:toggleDrain');
    });

    // Wiring actions & Tap-to-wire pills
    document.getElementById('btn-reset-wires')?.addEventListener('click', () => EventBus.emit('training:requestReset'));
    document.getElementById('training-target-text')?.addEventListener('click', () => EventBus.emit('wiring:autoConnectStep'));
    document.getElementById('src-pill-text')?.addEventListener('click', () => EventBus.emit('wiring:autoConnectStep'));
    document.getElementById('tgt-pill-text')?.addEventListener('click', () => EventBus.emit('wiring:autoConnectStep'));

    const slider = document.getElementById('level-slider') as HTMLInputElement;
    slider?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.updateSetpointUI(val);
      EventBus.emit(Events.SETPOINT_CHANGED, val);
    });

    // Top Utility Controls
    document.getElementById('btn-toggle-labels')?.addEventListener('click', () => {
      EventBus.emit('ui:toggleCallouts');
      document.getElementById('btn-toggle-labels')?.classList.toggle('active');
    });
    document.getElementById('btn-reset-view')?.addEventListener('click', () => EventBus.emit('scene:resetCamera'));
    document.getElementById('btn-ar')?.addEventListener('click', () => EventBus.emit('ui:toggleAR'));

    // Master Start / Stop / Reset Buttons
    document.getElementById('btn-start')?.addEventListener('click', () => {
      if (alarmManager.isEStopLatched()) {
        this.showToast('error', 'Cannot start: Release Emergency Stop first!');
        return;
      }
      if (!AppState.wiringProgress.allCorrect && AppState.activeExperiment === 'TANK') {
        EventBus.emit('wiring:autoConnectAll');
        this.showToast('success', 'Circuits connected! Starting process simulation...');
        setTimeout(() => {
          EventBus.emit(Events.PROCESS_START);
          voiceAssistantManager.setMode('SCADA');
        }, 600);
      } else {
        EventBus.emit(Events.PROCESS_START);
        voiceAssistantManager.setMode('SCADA');
        this.showToast('success', 'Process simulation active');
      }
      this.hideCompletionModal();
    });

    document.getElementById('btn-stop')?.addEventListener('click', () => {
      EventBus.emit(Events.PROCESS_STOP);
      this.showToast('info', 'Process halted');
    });

    this.completionModal.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('#btn-modal-start')) return;
      event.preventDefault();
      event.stopPropagation();
      if (alarmManager.isEStopLatched()) {
        this.showToast('error', 'Cannot start: Release Emergency Stop first!');
        return;
      }
      this.hideCompletionModal();
      AppState.setPLCState('RUN');
      EventBus.emit(Events.PROCESS_START);
      voiceAssistantManager.setMode('SCADA');
      this.showToast('success', 'Process simulation active');
    }, true);
    document.getElementById('btn-modal-restart')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      this.hideCompletionModal();
      EventBus.emit('training:requestReset');
      voiceAssistantManager.setMode('WIRING');
      this.showToast('info', 'Wiring reset to Step 1');
    });

    // Training Engine Events
    EventBus.on('training:stepChanged', (data: { stepIndex: number; totalSteps: number; step: TrainingStepDef }) => {
      this.updateStepUI(data.stepIndex, data.totalSteps, data.step);
      this.hideCompletionModal();
    });

    EventBus.on('training:connectionSuccess', (data: { step: TrainingStepDef; stepIndex: number; totalSteps: number }) => {
      this.showToast('success', `Verified: ${data.step.shortSource} → ${data.step.shortTarget}`);
      this.markStepDone(data.stepIndex);
    });

    EventBus.on('training:connectionError', (data: { expectedLabel: string }) => {
      this.showToast('error', `Connection error: Wire to ${data.expectedLabel}`);
    });

    EventBus.on('training:wrongSource', (data: { expectedLabel: string }) => {
      this.showToast('error', `Point at the glowing source terminal: ${data.expectedLabel}`);
    });

    EventBus.on('training:completed', () => {
      this.showCompletionModal();
      this.updateStartButton(true);
    });

    EventBus.on('training:reset', () => {
      this.resetStepDots();
      this.updateStartButton(false);
      this.hideCompletionModal();
      this.showToast('info', 'Wiring reset to Step 1');
    });

    // Process updates
    EventBus.on(Events.STATE_CHANGED, () => {
      this.updateStatusPanel();
      this.updateGauges();
      this.updateSystemBadge();
    });

    EventBus.on('alarm:changed', () => this.updateAlarmUI());
    EventBus.on('estop:triggered', () => this.updateEStopButtonUI(true));
    EventBus.on('estop:reset', () => this.updateEStopButtonUI(false));
  }

  // --- Fault Injections ---
  private triggerFault(faultNum: number): void {
    const exp = AppState.activeExperiment;

    if (exp === 'TANK') {
      if (faultNum === 1) {
        AppState.setTankLevel(98);
        alarmManager.triggerAlarm('ALM-101', 'HIGH LIQUID LEVEL OVERFLOW', 'CRITICAL', 'Tank liquid level exceeded 95% maximum limit', 'Process Tank');
        this.showToast('error', 'Injected Fault: High Level Overflow (>95%)');
      } else {
        AppState.setTankLevel(5);
        alarmManager.triggerAlarm('ALM-102', 'LOW WATER DRY RUN CAVITATION', 'WARNING', 'Tank level below 10% - Pump cavitation risk', 'Process Tank');
        this.showToast('error', 'Injected Fault: Tank Starvation (<10%)');
      }
    } else if (exp === 'CONVEYOR') {
      if (faultNum === 1) {
        AppState.setBeltSpeed(0);
        AppState.setOpticalSensorDetected(true);
        alarmManager.triggerAlarm('ALM-201', 'CONVEYOR WORKPIECE JAM', 'CRITICAL', 'Workpiece box jammed in sorting station zone', 'Conveyor Bed');
        this.showToast('error', 'Injected Fault: Workpiece Jam on Conveyor');
      } else {
        AppState.setOpticalSensorDetected(false);
        alarmManager.triggerAlarm('ALM-202', 'OPTICAL SENSOR BLINDED', 'WARNING', 'Optical infrared diffuse receiver beam blocked', 'Photoelectric Sensor');
        this.showToast('error', 'Injected Fault: Optical Sensor Failure');
      }
    } else if (exp === 'TRAFFIC') {
      if (faultNum === 1) {
        AppState.setVehicleDetected(true);
        alarmManager.triggerAlarm('ALM-301', 'INDUCTIVE LOOP STUCK', 'WARNING', 'Road vehicle presence loop locked in conductive trip', 'Traffic Junction');
        this.showToast('error', 'Injected Fault: Inductive Loop Stuck Active');
      } else {
        alarmManager.triggerAlarm('ALM-302', 'PEDESTRIAN TIMEOUT EXPIRED', 'WARNING', 'Crosswalk call registered with phase timer conflict', 'Ped Station');
        this.showToast('error', 'Injected Fault: Pedestrian Phase Timeout');
      }
    } else if (exp === 'ROBOT') {
      if (faultNum === 1) {
        AppState.setRobotVacuumActive(false);
        AppState.setRobotPartHeld(false);
        alarmManager.triggerAlarm('ALM-401', 'VACUUM PRESSURE DROP', 'CRITICAL', 'Pneumatic suction lost grip pressure (-20 kPa)', 'Vacuum Gripper');
        this.showToast('error', 'Injected Fault: Gripper Vacuum Pressure Loss');
      } else {
        AppState.setRobotPartInFeed(false);
        alarmManager.triggerAlarm('ALM-402', 'IN-FEED PART STARVATION', 'WARNING', 'Part proximity sensor reports empty in-feed nest', 'Feed Nest');
        this.showToast('error', 'Injected Fault: Part In-Feed Starvation');
      }
    } else if (exp === 'REACTOR') {
      if (faultNum === 1) {
        AppState.setReactorTemp(96.5);
        alarmManager.triggerAlarm('ALM-501', 'CORE OVER-TEMPERATURE', 'CRITICAL', 'Chemical reaction vessel core exceeded 90°C thermal limit', 'Jacketed Reactor');
        this.showToast('error', 'Injected Fault: Thermal Core Overheat (96.5°C)');
      } else {
        AppState.setReactorAgitator('OFF', 0);
        alarmManager.triggerAlarm('ALM-502', 'AGITATOR MOTOR STALL', 'CRITICAL', 'Dual-tier vortex impeller agitator stalled during heating', 'Agitator Motor');
        this.showToast('error', 'Injected Fault: Agitator Motor Stall');
      }
    }
  }

  private clearAllFaults(): void {
    alarmManager.clearHistory();
    alarmManager.acknowledgeAll();
    AppState.resetProcess();
    this.updateStatusPanel();
    this.updateGauges();
    this.showToast('success', 'All simulated faults cleared. Station reset to safe standby.');
  }

  // --- Emergency Stop Methods ---
  private toggleEStop(): void {
    if (alarmManager.isEStopLatched()) {
      alarmManager.resetEStop();
      this.updateEStopButtonUI(false);
      this.showToast('info', 'Emergency Stop reset. System armed.');
    } else {
      alarmManager.triggerEStop();
      this.updateEStopButtonUI(true);
      this.showToast('error', 'EMERGENCY STOP ACTIVATED! All actuators isolated.');
    }
  }

  private updateEStopButtonUI(latched: boolean): void {
    const btn = document.getElementById('btn-estop-main');
    const text = document.getElementById('estop-btn-text');
    if (btn) btn.classList.toggle('latched', latched);
    if (text) text.textContent = latched ? 'E-STOP [LATCHED ACTIVE]' : 'EMERGENCY STOP';
  }

  private updateAlarmUI(): void {
    const activeAlarms = alarmManager.getActiveAlarms();
    const countBadge = document.getElementById('alarm-active-counter');
    const tabActiveCount = document.getElementById('tab-active-count');
    const togglePill = document.getElementById('btn-toggle-alarm-log');

    const count = activeAlarms.length;
    if (countBadge) countBadge.textContent = String(count);
    if (tabActiveCount) tabActiveCount.textContent = String(count);

    if (togglePill) {
      togglePill.classList.toggle('has-active', count > 0);
      togglePill.classList.toggle('critical-active', alarmManager.hasActiveCritical());
    }

    const critical = activeAlarms.find((a) => a.severity === 'CRITICAL' || a.severity === 'EMERGENCY') || activeAlarms[0];
    if (critical && !critical.acknowledged) {
      const codeEl = document.getElementById('alm-banner-code');
      const titleEl = document.getElementById('alm-banner-title');
      const descEl = document.getElementById('alm-banner-desc');
      const eqEl = document.getElementById('alm-banner-eq');

      if (codeEl) codeEl.textContent = critical.code;
      if (titleEl) titleEl.textContent = critical.title;
      if (descEl) descEl.textContent = critical.description;
      if (eqEl) eqEl.textContent = critical.equipment;

      this.emergencyBanner.classList.remove('hidden');
    } else {
      this.emergencyBanner.classList.add('hidden');
    }

    if (this.isAlarmLogOpen) {
      this.renderAlarmLogList(this.currentAlarmFilter);
    }
  }

  private toggleAlarmLog(): void {
    this.isAlarmLogOpen = !this.isAlarmLogOpen;
    if (this.isAlarmLogOpen) {
      this.alarmLogPanel.classList.remove('hidden');
      this.renderAlarmLogList(this.currentAlarmFilter);
    } else {
      this.alarmLogPanel.classList.add('hidden');
    }
  }

  private closeAlarmLog(): void {
    this.isAlarmLogOpen = false;
    this.alarmLogPanel.classList.add('hidden');
  }

  private renderAlarmLogList(filter: 'ALL' | 'ACTIVE' | 'CRITICAL' | 'WARNING'): void {
    const listEl = document.getElementById('alarm-log-list');
    if (!listEl) return;

    let records = alarmManager.getAllAlarms();
    if (filter === 'ACTIVE') records = records.filter((r) => r.active);
    else if (filter === 'CRITICAL') records = records.filter((r) => r.severity === 'CRITICAL' || r.severity === 'EMERGENCY');
    else if (filter === 'WARNING') records = records.filter((r) => r.severity === 'WARNING');

    if (records.length === 0) {
      listEl.innerHTML = `<div class="alarm-empty-state"><span class="empty-icon">${Icons.checkCircle({ size: 28 })}</span><p>No ${filter.toLowerCase()} alarms.</p></div>`;
      return;
    }

    listEl.innerHTML = records
      .map((r) => `
        <div class="alarm-row ${r.active ? 'active-row' : ''}">
          <div class="alarm-row-left">
            <span class="alarm-time">${r.timestamp}</span>
            <span class="alarm-sev-badge badge-${r.severity.toLowerCase()}">${r.severity}</span>
            <span class="alarm-code-tag">${r.code}</span>
          </div>
          <div class="alarm-row-center">
            <div class="alarm-row-title">${r.title}</div>
            <div class="alarm-row-desc">${r.description}</div>
            <div class="alarm-row-eq">Tag: <strong>${r.equipment}</strong></div>
          </div>
        </div>
      `)
      .join('');
  }

  public updateExperimentUI(exp: ExperimentType): void {
    if (this.reactorDashboard) this.reactorDashboard.hidden = true;
    document.getElementById('app')?.classList.remove('reactor-dashboard-active');
    document.getElementById('app')?.classList.toggle('reactor-training-active', exp === 'REACTOR');
    const expSelect = document.getElementById('experiment-select') as HTMLSelectElement;
    if (expSelect && expSelect.value !== exp) expSelect.value = exp;

    const subTitle = document.getElementById('training-sub-title');
    if (subTitle) {
      subTitle.textContent = `Connect Field IO to S7-1200`;
    }

    // Toggle Left SCADA Grid sections
    const tankGrid = document.getElementById('tank-scada-grid');
    const tankSetpoint = document.getElementById('tank-setpoint-group');
    const conveyorGrid = document.getElementById('conveyor-scada-grid');
    const conveyorSetpoint = document.getElementById('conveyor-setpoint-group');
    const trafficGrid = document.getElementById('traffic-scada-grid');
    const trafficSetpoint = document.getElementById('traffic-setpoint-group');
    const robotGrid = document.getElementById('robot-scada-grid');
    const robotSetpoint = document.getElementById('robot-setpoint-group');
    const reactorGrid = document.getElementById('reactor-scada-grid');
    const reactorSetpoint = document.getElementById('reactor-setpoint-group');

    if (tankGrid) tankGrid.style.display = exp === 'TANK' ? 'grid' : 'none';
    if (tankSetpoint) tankSetpoint.style.display = exp === 'TANK' ? 'flex' : 'none';
    if (conveyorGrid) conveyorGrid.style.display = exp === 'CONVEYOR' ? 'grid' : 'none';
    if (conveyorSetpoint) conveyorSetpoint.style.display = exp === 'CONVEYOR' ? 'flex' : 'none';
    if (trafficGrid) trafficGrid.style.display = exp === 'TRAFFIC' ? 'grid' : 'none';
    if (trafficSetpoint) trafficSetpoint.style.display = exp === 'TRAFFIC' ? 'flex' : 'none';
    if (robotGrid) robotGrid.style.display = exp === 'ROBOT' ? 'grid' : 'none';
    if (robotSetpoint) robotSetpoint.style.display = exp === 'ROBOT' ? 'flex' : 'none';
    if (reactorGrid) reactorGrid.style.display = exp === 'REACTOR' ? 'grid' : 'none';
    if (reactorSetpoint) reactorSetpoint.style.display = exp === 'REACTOR' ? 'flex' : 'none';

    // Update Fault labels
    const f1 = document.getElementById('fault-1-label');
    const f2 = document.getElementById('fault-2-label');
    if (f1 && f2) {
      if (exp === 'TANK') {
        f1.textContent = 'Inject Overfill';
        f2.textContent = 'Inject Starve';
      } else if (exp === 'CONVEYOR') {
        f1.textContent = 'Belt Jam';
        f2.textContent = 'Sensor Blind';
      } else if (exp === 'TRAFFIC') {
        f1.textContent = 'Loop Stuck';
        f2.textContent = 'Ped Timeout';
      } else if (exp === 'ROBOT') {
        f1.textContent = 'Vacuum Leak';
        f2.textContent = 'Part Jam';
      } else if (exp === 'REACTOR') {
        f1.textContent = 'Core Overheat';
        f2.textContent = 'Agitator Stall';
      }
    }

    // Update Right Telemetry Stack Icons and Labels
    const m1Icon = document.getElementById('metric-1-icon');
    const m1Title = document.getElementById('metric-1-title');
    const m2Icon = document.getElementById('metric-2-icon');
    const m2Title = document.getElementById('metric-2-title');
    const m2Unit = document.getElementById('metric-2-unit');
    const m3Icon = document.getElementById('metric-3-icon');
    const m3Title = document.getElementById('metric-3-title');
    const m4Icon = document.getElementById('metric-4-icon');
    const m4Title = document.getElementById('metric-4-title');

    if (exp === 'TANK') {
      if (m1Icon) m1Icon.innerHTML = Icons.waves({ size: 16 });
      if (m1Title) m1Title.textContent = 'TANK LEVEL';
      if (m2Icon) m2Icon.innerHTML = Icons.activity({ size: 16 });
      if (m2Title) m2Title.textContent = 'FLOW RATE';
      if (m2Unit) m2Unit.textContent = 'L/min';
      if (m3Icon) m3Icon.innerHTML = Icons.pump({ size: 16 });
      if (m3Title) m3Title.textContent = 'PUMP STATUS';
      if (m4Icon) m4Icon.innerHTML = Icons.valve({ size: 16 });
      if (m4Title) m4Title.textContent = 'VALVE STATUS';
    } else if (exp === 'CONVEYOR') {
      if (m1Icon) m1Icon.innerHTML = Icons.box({ size: 16 });
      if (m1Title) m1Title.textContent = 'SORT RATIO';
      if (m2Icon) m2Icon.innerHTML = Icons.zap({ size: 16 });
      if (m2Title) m2Title.textContent = 'BELT SPEED';
      if (m2Unit) m2Unit.textContent = 'm/s';
      if (m3Icon) m3Icon.innerHTML = Icons.activity({ size: 16 });
      if (m3Title) m3Title.textContent = 'MOTOR DRIVE';
      if (m4Icon) m4Icon.innerHTML = Icons.shuffle({ size: 16 });
      if (m4Title) m4Title.textContent = 'DIVERTER';
    } else if (exp === 'TRAFFIC') {
      if (m1Icon) m1Icon.innerHTML = Icons.activity({ size: 16 });
      if (m1Title) m1Title.textContent = 'PHASE TIMER';
      if (m2Icon) m2Icon.innerHTML = Icons.car({ size: 16 });
      if (m2Title) m2Title.textContent = 'VEHICLES';
      if (m2Unit) m2Unit.textContent = 'CARS';
      if (m3Icon) m3Icon.innerHTML = Icons.traffic({ size: 16 });
      if (m3Title) m3Title.textContent = 'MAIN SIGNAL';
      if (m4Icon) m4Icon.innerHTML = Icons.pedestrian({ size: 16 });
      if (m4Title) m4Title.textContent = 'PEDESTRIAN';
    } else if (exp === 'ROBOT') {
      if (m1Icon) m1Icon.innerHTML = Icons.robot({ size: 16 });
      if (m1Title) m1Title.textContent = 'TRANSFERRED';
      if (m2Icon) m2Icon.innerHTML = Icons.sliders({ size: 16 });
      if (m2Title) m2Title.textContent = 'GANTRY STEP';
      if (m2Unit) m2Unit.textContent = '';
      if (m3Icon) m3Icon.innerHTML = Icons.wind({ size: 16 });
      if (m3Title) m3Title.textContent = 'VACUUM LEVEL';
      if (m4Icon) m4Icon.innerHTML = Icons.box({ size: 16 });
      if (m4Title) m4Title.textContent = 'FEED NEST';
    } else if (exp === 'REACTOR') {
      if (m1Icon) m1Icon.innerHTML = Icons.flame({ size: 16 });
      if (m1Title) m1Title.textContent = 'CORE TEMP';
      if (m2Icon) m2Icon.innerHTML = Icons.wind({ size: 16 });
      if (m2Title) m2Title.textContent = 'AGITATOR SPEED';
      if (m2Unit) m2Unit.textContent = 'RPM';
      if (m3Icon) m3Icon.innerHTML = Icons.zap({ size: 16 });
      if (m3Title) m3Title.textContent = 'HEATER SSR';
      if (m4Icon) m4Icon.innerHTML = Icons.clipboard({ size: 16 });
      if (m4Title) m4Title.textContent = 'RECIPE STEP';
    }

    this.updateGauges();
  }

  private updateReactorDashboard(): void {
    const dashboard = this.reactorDashboard;
    if (!dashboard) return;
    const set = (selector: string, value: string): void => {
      const node = dashboard.querySelector<HTMLElement>(selector);
      if (node) node.textContent = value;
    };
    const temp = AppState.reactorTemp;
    const level = AppState.reactorFluidLevel;
    const speed = AppState.reactorAgitatorSpeed;
    set('[data-temp]', temp.toFixed(1));
    set('[data-level]', String(Math.round(level)));
    set('[data-rpm]', String(speed));
    set('[data-sp-temp]', AppState.reactorTargetTemp.toFixed(1));
    set('[data-sp-level]', '80');
    set('[data-heater-state]', AppState.reactorHeaterState);
    set('[data-agitator-state]', AppState.reactorAgitatorState);
    set('[data-batch-count]', `${AppState.reactorBatchesCompleted} batches`);
    const tempBar = dashboard.querySelector<HTMLElement>('[data-temp-bar]');
    const levelBar = dashboard.querySelector<HTMLElement>('[data-level-bar]');
    const rpmBar = dashboard.querySelector<HTMLElement>('[data-rpm-bar]');
    if (tempBar) tempBar.style.width = `${Math.max(0, Math.min(100, temp))}%`;
    if (levelBar) levelBar.style.width = `${Math.max(0, Math.min(100, level))}%`;
    if (rpmBar) rpmBar.style.width = `${Math.max(0, Math.min(100, speed / 10))}%`;

    const order = ['IDLE', 'DOSING_A', 'DOSING_B', 'MIXING', 'HEATING', 'HOLDING', 'COMPLETE'];
    const stepKey = AppState.reactorBatchStep === 'DRAINING' ? 'HOLDING' : AppState.reactorBatchStep;
    const activeIndex = order.indexOf(stepKey);
    dashboard.querySelectorAll<HTMLElement>('[data-step]').forEach((step) => {
      const index = order.indexOf(step.dataset.step || '');
      step.classList.toggle('complete', activeIndex > index || AppState.reactorBatchStep === 'COMPLETE');
      step.classList.toggle('active', index === activeIndex && AppState.reactorBatchStep !== 'IDLE');
    });
    const labels: Record<string, string> = { IDLE: 'Ready to start a batch', DOSING_A: 'Dosing reagent A', DOSING_B: 'Dosing reagent B', MIXING: 'Mixing the batch', HEATING: `Heating · ${temp.toFixed(1)} / ${AppState.reactorTargetTemp.toFixed(1)} °C`, HOLDING: 'Holding temperature', DRAINING: 'Discharging finished product', COMPLETE: 'Batch complete' };
    set('[data-batch-caption]', labels[AppState.reactorBatchStep] || 'Ready');

    const line = dashboard.querySelector<SVGPathElement>('[data-trend-line]');
    const area = dashboard.querySelector<SVGPathElement>('[data-trend-area]');
    if (line && area) {
      const x = Math.max(0, Math.min(420, ((Date.now() / 30000) % 420)));
      const y = 98 - Math.max(0, Math.min(100, temp)) * 0.88;
      const d = `M0 90 L50 84 L95 65 L145 58 L195 37 L245 35 L290 22 L345 20 L${x.toFixed(0)} ${y.toFixed(1)} L420 ${y.toFixed(1)}`;
      line.setAttribute('d', d);
      area.setAttribute('d', `${d} L420 105 L0 105Z`);
    }
    const alarms = dashboard.querySelector<HTMLElement>('[data-alarm-list]');
    if (alarms) {
      const recent = alarmManager.getAllAlarms().slice(0, 4);
      alarms.innerHTML = recent.length ? recent.map((alarm: AlarmRecord) => `<div><i class="alarm-dot ${alarm.severity.toLowerCase()}"></i><span>${alarm.title}</span><time>${alarm.timestamp.slice(0, 5)}</time></div>`).join('') : '<div><i class="alarm-dot normal"></i><span>System normal</span><time>Now</time></div>';
    }
  }

  private setActiveModeBtn(id: string): void {
    const ids = ['btn-mode-wire', 'btn-mode-inspect', 'btn-mode-ladder', 'btn-mode-rotate'];
    for (const btnId of ids) {
      const btn = document.getElementById(btnId);
      if (btn) btn.classList.toggle('active', btnId === id);
    }
  }

  private updateSetpointUI(val: number): void {
    const s = document.getElementById('level-slider') as HTMLInputElement;
    const sp = document.getElementById('setpoint-val');
    const marker = document.getElementById('setpoint-marker-line');
    if (s && Number(s.value) !== val) s.value = String(val);
    if (sp) sp.textContent = `${val}%`;
    if (marker) marker.style.bottom = `${val}%`;
  }

  private updateStepUI(stepIndex: number, totalSteps: number, step: TrainingStepDef): void {
    const counter = document.getElementById('training-step-counter');
    const srcPill = document.getElementById('src-pill-text');
    const tgtPill = document.getElementById('tgt-pill-text');
    const subtext = document.getElementById('training-subtext');

    if (counter) counter.textContent = `STEP ${stepIndex + 1} OF ${totalSteps}`;
    if (srcPill) srcPill.innerHTML = `<span class="pill-dot src-dot"></span><span>${step.sourceLabel}</span>`;
    if (tgtPill) tgtPill.innerHTML = `<span class="pill-dot tgt-dot"></span><span>${step.targetLabel}</span>`;
    if (subtext) subtext.textContent = `Point at the glowing ${step.shortSource} terminal to take its wire. Point at ${step.targetLabel} to connect.`;

    for (let i = 0; i < totalSteps; i++) {
      const dot = document.getElementById(`sdot-${i}`);
      if (dot) {
        if (i < stepIndex) {
          dot.className = 'bubble done';
          dot.innerHTML = Icons.check({ size: 12 });
        } else if (i === stepIndex) {
          dot.className = 'bubble active';
          dot.textContent = String(i + 1);
        } else {
          dot.className = 'bubble';
          dot.textContent = String(i + 1);
        }
      }
    }
  }

  private markStepDone(stepIndex: number): void {
    const dot = document.getElementById(`sdot-${stepIndex}`);
    if (dot) {
      dot.className = 'bubble done';
      dot.innerHTML = Icons.check({ size: 12 });
    }
  }

  private resetStepDots(): void {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`sdot-${i}`);
      if (dot) {
        dot.className = i === 0 ? 'bubble active' : 'bubble';
        dot.textContent = String(i + 1);
      }
    }
  }

  private showCompletionModal(): void {
    this.completionModal.style.display = 'flex';
    this.completionModal.classList.add('visible');
    const exp = EXPERIMENTS[AppState.activeExperiment];
    const badgeText = document.getElementById('modal-badge-text');
    const descText = document.getElementById('modal-desc-text');

    if (badgeText) badgeText.textContent = `4 / 4 CIRCUITS ARMED`;
    if (descText) descText.textContent = `Siemens S7-1200 CPU and ${exp.shortTitle} field devices are securely interfaced. Ready for real-time automated process simulation.`;
  }

  private hideCompletionModal(): void {
    this.completionModal.style.display = 'none';
    this.completionModal.classList.remove('visible');
  }

  private updateStatusPanel(): void {
    const plcRunning = AppState.plcState === 'RUN';
    const plcText = plcRunning ? 'RUN (24V OK)' : AppState.plcState === 'FAULT' ? 'FAULT' : 'STOP';
    const plcClass = plcRunning ? 'on' : AppState.plcState === 'FAULT' ? 'fault' : 'off';

    this.setStatusValue('st-plc', plcText, plcClass);
    this.setStatusValue('st-conveyor-plc', plcText, plcClass);

    // 1. Tank
    const pumpOn = AppState.pumpState === 'ON';
    this.setStatusValue('st-pump', pumpOn ? 'ON (1200 RPM)' : 'OFF (0 RPM)', pumpOn ? 'on' : 'off');
    const valveOpen = AppState.valveState === 'OPEN';
    this.setStatusValue('st-valve', valveOpen ? 'OPEN (100%)' : 'CLOSED (0%)', valveOpen ? 'on' : 'off');
    const sensorState = AppState.sensorState;
    this.setStatusValue('st-sensor', sensorState === 'HIGH' ? 'HIGH (>80%)' : sensorState === 'LOW' ? 'LOW (<20%)' : 'NORMAL (OK)', sensorState === 'HIGH' ? 'fault' : sensorState === 'LOW' ? 'warn' : 'on');

    // 2. Conveyor
    const motorOn = AppState.conveyorMotorState === 'ON';
    this.setStatusValue('st-conveyor-motor', motorOn ? `ON (${AppState.beltSpeed.toFixed(1)} m/s)` : 'OFF (0.0 m/s)', motorOn ? 'on' : 'off');
    const sensorTripped = AppState.opticalSensorDetected;
    this.setStatusValue('st-optical-sensor', sensorTripped ? 'DETECTED' : 'CLEAR', sensorTripped ? 'fault' : 'on');
    const pusherExt = AppState.diverterPusherExtended;
    this.setStatusValue('st-diverter-pusher', pusherExt ? 'EXTENDED' : 'RETRACTED', pusherExt ? 'warn' : 'off');

    // 3. Traffic
    const phase = AppState.trafficPhase;
    this.setStatusValue('st-traffic-signal', phase === 'MAIN_GREEN' ? 'GREEN (GO)' : (phase === 'MAIN_YELLOW' || phase === 'CROSS_YELLOW') ? 'YELLOW (CLEAR)' : 'RED (STOP)', phase === 'MAIN_GREEN' ? 'on' : (phase === 'MAIN_YELLOW' || phase === 'CROSS_YELLOW') ? 'warn' : 'fault');
    this.setStatusValue('st-traffic-ped', AppState.pedWalkPhase === 'WALK' ? 'WALK (CROSS)' : AppState.pedWalkPhase === 'FLASHING' ? 'FLASHING' : "DON'T WALK", AppState.pedWalkPhase === 'WALK' ? 'on' : AppState.pedWalkPhase === 'FLASHING' ? 'warn' : 'off');
    this.setStatusValue('st-traffic-loop', AppState.vehicleDetected ? 'VEHICLE DETECTED' : 'NO CAR', AppState.vehicleDetected ? 'warn' : 'on');
    this.setStatusValue('st-traffic-timer', `${AppState.trafficPhaseTimer}s Remaining`, '');

    const lampRed = document.getElementById('lamp-traffic-red');
    const lampYel = document.getElementById('lamp-traffic-yel');
    const lampGrn = document.getElementById('lamp-traffic-grn');
    if (lampRed) lampRed.classList.toggle('on', phase === 'MAIN_RED' || phase === 'ALL_RED' || phase === 'CROSS_YELLOW');
    if (lampYel) lampYel.classList.toggle('on', phase === 'MAIN_YELLOW');
    if (lampGrn) lampGrn.classList.toggle('on', phase === 'MAIN_GREEN');

    const carTag = document.getElementById('tag-vehicle-count');
    if (carTag) carTag.textContent = `${AppState.trafficVehiclesPassed} CARS`;

    // 4. Robot
    this.setStatusValue('st-robot-cycle', AppState.robotCycleStep, AppState.robotCycleStep === 'IDLE' ? 'off' : 'on');
    this.setStatusValue('st-robot-vac', AppState.robotVacuumActive ? 'ACTIVE (-85 kPa)' : 'RELEASED (0 kPa)', AppState.robotVacuumActive ? 'on' : 'off');
    this.setStatusValue('st-robot-feed', AppState.robotPartInFeed ? 'PART READY' : 'EMPTY NEST', AppState.robotPartInFeed ? 'on' : 'off');

    // 5. Reactor
    this.setStatusValue('st-reactor-temp', `${AppState.reactorTemp.toFixed(1)} °C`, '');
    this.setStatusValue('st-reactor-agitator', AppState.reactorAgitatorState === 'ON' ? `ON (${AppState.reactorAgitatorSpeed} RPM)` : 'OFF (0 RPM)', AppState.reactorAgitatorState === 'ON' ? 'on' : 'off');
    this.setStatusValue('st-reactor-step', AppState.reactorBatchStep, AppState.reactorBatchStep === 'IDLE' ? 'off' : 'on');
  }

  private setStatusValue(id: string, value: string, cssClass: string): void {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
      if (cssClass) el.className = `value ${cssClass}`;
    }
  }

  private updateGauges(): void {
    const exp = AppState.activeExperiment;
    const m1Val = document.getElementById('metric-1-value');
    const gFill = document.getElementById('gauge-fill');
    const m2Val = document.getElementById('metric-2-value');
    const m3Val = document.getElementById('metric-3-value');
    const m3Sub = document.getElementById('metric-3-sub');
    const m4Val = document.getElementById('metric-4-value');
    const m4Sub = document.getElementById('metric-4-sub');

    if (exp === 'TANK') {
      const level = Math.round(AppState.tankLevel);
      if (m1Val) m1Val.textContent = `${level}%`;
      if (gFill) gFill.style.height = `${level}%`;

      const flowRate = AppState.flowState === 'ACTIVE' ? '12.4' : '0.0';
      if (m2Val) m2Val.textContent = flowRate;

      const pumpOn = AppState.pumpState === 'ON';
      if (m3Val) {
        m3Val.textContent = pumpOn ? 'ON' : 'OFF';
        m3Val.className = `metric-status-val ${pumpOn ? 'on' : 'off'}`;
      }
      if (m3Sub) m3Sub.textContent = pumpOn ? '1200 RPM' : '0 RPM';

      const valveOpen = AppState.valveState === 'OPEN';
      if (m4Val) {
        m4Val.textContent = valveOpen ? 'OPEN' : 'CLOSED';
        m4Val.className = `metric-status-val ${valveOpen ? 'on' : 'off'}`;
      }
      if (m4Sub) m4Sub.textContent = valveOpen ? '100%' : '0%';
    } else if (exp === 'CONVEYOR') {
      const total = AppState.conveyorPartsTotal;
      const sorted = AppState.conveyorPartsSorted;
      const ratio = total > 0 ? Math.min(100, Math.round((sorted / total) * 100)) : 0;
      if (m1Val) m1Val.textContent = `${ratio}%`;
      if (gFill) gFill.style.height = `${ratio}%`;

      if (m2Val) m2Val.textContent = AppState.beltSpeed.toFixed(1);

      const motorOn = AppState.conveyorMotorState === 'ON';
      if (m3Val) {
        m3Val.textContent = motorOn ? 'ON' : 'OFF';
        m3Val.className = `metric-status-val ${motorOn ? 'on' : 'off'}`;
      }
      if (m3Sub) m3Sub.textContent = motorOn ? '1400 RPM' : '0 RPM';

      const pusherExt = AppState.diverterPusherExtended;
      if (m4Val) {
        m4Val.textContent = pusherExt ? 'EXTENDED' : 'RETRACTED';
        m4Val.className = `metric-status-val ${pusherExt ? 'warn' : 'off'}`;
      }
      if (m4Sub) m4Sub.textContent = `${sorted}/${total} pcs`;
    } else if (exp === 'TRAFFIC') {
      const timer = AppState.trafficPhaseTimer;
      if (m1Val) m1Val.textContent = `${timer}s`;
      if (gFill) gFill.style.height = `${Math.min(100, (timer / 10) * 100)}%`;

      if (m2Val) m2Val.textContent = String(AppState.trafficVehiclesPassed);

      const phase = AppState.trafficPhase;
      if (m3Val) {
        m3Val.textContent = phase === 'MAIN_GREEN' ? 'GREEN' : phase === 'MAIN_YELLOW' ? 'YELLOW' : 'RED';
        m3Val.className = `metric-status-val ${phase === 'MAIN_GREEN' ? 'on' : phase === 'MAIN_YELLOW' ? 'warn' : 'off'}`;
      }
      if (m3Sub) m3Sub.textContent = 'Signal Head';

      const pedWalk = AppState.pedWalkPhase === 'WALK';
      if (m4Val) {
        m4Val.textContent = pedWalk ? 'WALK' : "DON'T WALK";
        m4Val.className = `metric-status-val ${pedWalk ? 'on' : 'off'}`;
      }
      if (m4Sub) m4Sub.textContent = AppState.pedCallRequested ? 'CALL QUEUED' : 'IDLE';
    } else if (exp === 'ROBOT') {
      const count = AppState.robotPartsTransferred;
      if (m1Val) m1Val.textContent = `${count} pcs`;
      if (gFill) gFill.style.height = `${Math.min(100, count * 10)}%`;

      if (m2Val) m2Val.textContent = AppState.robotCycleStep;

      const vac = AppState.robotVacuumActive;
      if (m3Val) {
        m3Val.textContent = vac ? 'ACTIVE' : 'RELEASED';
        m3Val.className = `metric-status-val ${vac ? 'on' : 'off'}`;
      }
      if (m3Sub) m3Sub.textContent = vac ? '-85 kPa' : '0 kPa';

      const ready = AppState.robotPartInFeed;
      if (m4Val) {
        m4Val.textContent = ready ? 'READY' : 'EMPTY';
        m4Val.className = `metric-status-val ${ready ? 'on' : 'off'}`;
      }
      if (m4Sub) m4Sub.textContent = 'In-Feed Nest';
    } else if (exp === 'REACTOR') {
      const temp = AppState.reactorTemp.toFixed(1);
      if (m1Val) m1Val.textContent = `${temp}°C`;
      if (gFill) gFill.style.height = `${Math.min(100, (AppState.reactorTemp / 100) * 100)}%`;

      if (m2Val) m2Val.textContent = String(AppState.reactorAgitatorSpeed);

      const heaterOn = AppState.reactorHeaterState === 'ON';
      if (m3Val) {
        m3Val.textContent = heaterOn ? 'ON' : 'OFF';
        m3Val.className = `metric-status-val ${heaterOn ? 'on' : 'off'}`;
      }
      if (m3Sub) m3Sub.textContent = heaterOn ? '100% PWR' : '0% PWR';

      if (m4Val) {
        m4Val.textContent = AppState.reactorBatchStep;
        m4Val.className = `metric-status-val ${AppState.reactorBatchStep === 'IDLE' ? 'off' : 'on'}`;
      }
      if (m4Sub) m4Sub.textContent = `${AppState.reactorBatchesCompleted} Batches`;
    }
  }

  private updateSystemBadge(): void {
    const badge = document.getElementById('system-state-badge');
    if (!badge) return;

    const textEl = badge.querySelector('.state-text');
    if (alarmManager.isEStopLatched()) {
      if (textEl) textEl.textContent = 'E-STOP LATCHED';
      badge.className = 'system-state state-fault';
    } else if (AppState.plcState === 'RUN') {
      if (textEl) textEl.textContent = 'RUNNING';
      badge.className = 'system-state state-running';
    } else if (AppState.plcState === 'FAULT') {
      if (textEl) textEl.textContent = 'FAULT';
      badge.className = 'system-state state-fault';
    } else if (AppState.wiringProgress.allCorrect) {
      if (textEl) textEl.textContent = 'SYSTEM READY';
      badge.className = 'system-state state-ready';
    } else {
      if (textEl) textEl.textContent = 'WIRING MODE';
      badge.className = 'system-state state-wiring';
    }
  }

  private updateStartButton(_ready: boolean): void {
    const btn = document.getElementById('btn-start') as HTMLButtonElement;
    const stopBtn = document.getElementById('btn-stop') as HTMLButtonElement;
    if (btn) btn.disabled = false;
    if (stopBtn) stopBtn.disabled = false;
  }

  public showToast(type: 'success' | 'error' | 'info' | 'warn', message: string): void {
    const toast = document.createElement('div');
    // Match the toast structure and type classes defined in style.css.
    toast.className = `feedback-toast ${type === 'warn' ? 'error' : type}`;
    const icon = type === 'success' ? Icons.checkCircle({ size: 14 }) : type === 'error' || type === 'warn' ? Icons.alertTriangle({ size: 14 }) : Icons.info({ size: 14 });
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${message}</span>`;

    this.feedbackOverlay.innerHTML = '';
    this.feedbackOverlay.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 250);
    }, 2400);
  }

  private el(tag: string, className: string, parent: HTMLElement, html: string): HTMLElement {
    const el = document.createElement(tag);
    el.className = className;
    el.innerHTML = html;
    parent.appendChild(el);
    return el;
  }
}
