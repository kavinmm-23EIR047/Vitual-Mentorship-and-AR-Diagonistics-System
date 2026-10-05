// ============================================================
// VoiceNarrator.ts – Web Speech AI Voice-Over & Narration Engine
// Speaks English audio explanations for Wiring, Simulation & Ladder Logic
// ============================================================

import { AppState } from './AppState';
import { EventBus } from './EventBus';
import type { ExperimentType } from './ExperimentConfig';
import { Icons } from '../ui/Icons';

export interface NarrationScript {
  id: string;
  text: string;
  category: 'WIRING' | 'SIMULATION' | 'LADDER' | 'ALARM' | 'SYSTEM';
}

export const VOICE_LANGUAGES = [
  { code: 'mute', label: 'Mute' },
  { code: 'en-US', label: 'English' },
  { code: 'ta-IN', label: 'தமிழ்' },
] as const;

export class VoiceNarrator {
  private static instance: VoiceNarrator;
  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private language = 'en-US';
  private isEnabled = true;
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private subtitleEl: HTMLElement | null = null;
  private subtitleTimer: number | null = null;
  private speechRequestId = 0;
  private translationCache = new Map<string, string>();

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoice();
      }
    }
    this.createSubtitleUI();
    this.bindEvents();
  }

  public static getInstance(): VoiceNarrator {
    if (!VoiceNarrator.instance) {
      VoiceNarrator.instance = new VoiceNarrator();
    }
    return VoiceNarrator.instance;
  }

  private initVoice(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    const exactLanguageVoice = voices.find((voice) => voice.lang.toLowerCase() === this.language.toLowerCase());
    if (exactLanguageVoice) {
      this.selectedVoice = exactLanguageVoice;
      return;
    }
    const languageVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(this.language.slice(0, 2)));
    if (languageVoice) {
      this.selectedVoice = languageVoice;
      return;
    }
    if (this.language !== 'en-US') {
      this.selectedVoice = null;
      return;
    }
    // Prioritize natural English voices
    const preferredVoices = [
      'Google US English',
      'Microsoft Jenny Online (Natural)',
      'Microsoft Guy Online (Natural)',
      'Microsoft David',
      'Microsoft Zira',
      'Samantha',
      'Alex',
    ];

    for (const name of preferredVoices) {
      const v = voices.find((voice) => voice.name.includes(name) || voice.lang.startsWith('en'));
      if (v) {
        this.selectedVoice = v;
        break;
      }
    }
    if (!this.selectedVoice && voices.length > 0) {
      this.selectedVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
    }
  }

  public getLanguage(): string { return this.language; }

  public setLanguage(language: string): void {
    if (language === 'mute') {
      if (this.isEnabled) this.toggleVoice();
      return;
    }
    if (!VOICE_LANGUAGES.some((item) => item.code === language)) return;
    if (!this.isEnabled) this.toggleVoice();
    this.language = language;
    this.initVoice();
    this.synth?.cancel();
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.updateWaveAnimation(false);
    EventBus.emit('voice:languageChanged', { language });
  }

  private createSubtitleUI(): void {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    this.subtitleEl = document.createElement('div');
    this.subtitleEl.className = 'voice-narration-hud hidden';
    this.subtitleEl.innerHTML = `
      <div class="narration-badge">
        <span class="voice-wave-bars">
          <span class="v-bar"></span>
          <span class="v-bar"></span>
          <span class="v-bar"></span>
          <span class="v-bar"></span>
        </span>
        <span class="voice-badge-text">AI INSTRUCTOR</span>
      </div>
      <div class="narration-text" id="voice-narration-text"></div>
      <button class="voice-mute-btn" id="btn-voice-toggle-mini" title="Mute / Unmute Audio Guide">${Icons.volume2({ size: 14 })}</button>
    `;
    overlay.appendChild(this.subtitleEl);

    document.getElementById('btn-voice-toggle-mini')?.addEventListener('click', () => {
      this.toggleVoice();
    });
  }

  private bindEvents(): void {
    // Experiment introduction on switch
    EventBus.on('experiment:changed', (data: { experiment: ExperimentType }) => {
      this.speakExperimentIntro(data.experiment);
    });

    // Wiring connection errors
    EventBus.on('training:connectionError', (data: { expectedLabel: string }) => {
      this.speak(
        `Incorrect connection. Please connect to the highlighted terminal: ${data.expectedLabel}.`,
        'WIRING'
      );
    });

    EventBus.on('training:wrongSource', (data: { expectedLabel: string }) => {
      this.speak(
        `Please touch the highlighted terminal first: ${data.expectedLabel}.`,
        'WIRING'
      );
    });

    // Emergency Stop
    EventBus.on('estop:triggered', () => {
      this.speak('Emergency Stop activated! All field actuators and power circuits are isolated.', 'ALARM');
    });

    EventBus.on('estop:reset', () => {
      this.speak('Emergency Stop cleared. Safety latches are reset to standby.', 'SYSTEM');
    });
  }

  public speak(text: string, _category: 'WIRING' | 'SIMULATION' | 'LADDER' | 'ALARM' | 'SYSTEM' = 'SYSTEM'): void {
    const requestId = ++this.speechRequestId;
    this.synth?.cancel();
    this.isSpeaking = false;
    this.updateWaveAnimation(false);
    if (!this.isEnabled || !this.synth) return;

    void this.translateText(text, this.language).then((spokenText) => {
      if (requestId !== this.speechRequestId || !this.isEnabled || !this.synth) return;
      this.showSubtitle(spokenText);
      const utterance = new SpeechSynthesisUtterance(spokenText);
      if (this.selectedVoice) utterance.voice = this.selectedVoice;
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      utterance.lang = this.language;
      utterance.onstart = () => {
        this.isSpeaking = true;
        this.updateWaveAnimation(true);
      };
      utterance.onend = () => {
        this.isSpeaking = false;
        this.updateWaveAnimation(false);
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
        this.updateWaveAnimation(false);
      };
      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    }).catch(() => {
      if (requestId !== this.speechRequestId) return;
      this.showSubtitle('Translation is unavailable. Check your internet connection and try again.');
      EventBus.emit('voice:translationError', { language: this.language });
    });
  }

  private async translateText(text: string, language: string): Promise<string> {
    if (language === 'en-US') return text;
    const target = language.slice(0, 2);
    const pieces = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const translated: string[] = [];
    for (const piece of pieces) {
      const key = `${target}:${piece.trim()}`;
      let result = this.translationCache.get(key);
      if (!result) {
        try { result = localStorage.getItem(`arplc-translation:${key}`) || undefined; } catch { /* storage may be disabled */ }
      }
      if (!result) {
        // MyMemory's free endpoint limits each query to 500 bytes.
        if (new TextEncoder().encode(piece).length > 480) {
          const words = piece.split(/\s+/);
          const chunks: string[] = [];
          let chunk = '';
          for (const word of words) {
            if (chunk && new TextEncoder().encode(`${chunk} ${word}`).length > 450) {
              chunks.push(chunk);
              chunk = word;
            } else chunk = chunk ? `${chunk} ${word}` : word;
          }
          if (chunk) chunks.push(chunk);
          const converted: string[] = [];
          for (const part of chunks) converted.push(await this.fetchTranslation(part, target));
          result = converted.join(' ');
        } else {
          result = await this.fetchTranslation(piece, target);
        }
        this.translationCache.set(key, result);
        try { localStorage.setItem(`arplc-translation:${key}`, result); } catch { /* storage may be full */ }
      }
      translated.push(result);
    }
    return translated.join(' ').replace(/\s+([,.!?])/g, '$1');
  }

  private async fetchTranslation(text: string, target: string): Promise<string> {
    const providers = [
      async () => {
        const response = await fetch('https://translate.argosopentech.com/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, source: 'en', target }),
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) throw new Error(`LibreTranslate returned ${response.status}`);
        const data = await response.json() as { translatedText?: string };
        return data.translatedText?.trim() || '';
      },
      async () => {
        const query = new URLSearchParams({ q: text, langpair: `en|${target}`, mt: '1' });
        const response = await fetch(`https://api.mymemory.translated.net/get?${query}`, { signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error(`MyMemory returned ${response.status}`);
        const data = await response.json() as { responseStatus?: number; responseData?: { translatedText?: string } };
        if (data.responseStatus !== 200) throw new Error('MyMemory rejected the translation request');
        return data.responseData?.translatedText?.trim() || '';
      },
    ];

    for (const request of providers) {
      try {
        const result = await request();
        if (result && result.toLowerCase() !== text.trim().toLowerCase()) return result;
      } catch { /* Try the next free translation provider. */ }
    }
    throw new Error('No translation provider returned translated text');
  }

  public speakWiringStep(exp: ExperimentType, stepIndex: number): void {
    const scripts: Record<ExperimentType, string[]> = {
      TANK: [
        'Step 1: Connect PLC Digital Input I0.0 to the Low Level Conductivity Sensor. This signals the controller when liquid falls below twenty percent to prevent pump cavitation.',
        'Step 2: Connect PLC Digital Input I0.1 to the High Level Alarm Sensor. This trips the PLC when liquid reaches eighty percent to avoid tank overfill.',
        'Step 3: Connect PLC Digital Output Q0.0 to the Centrifugal Pump Starter Contactor. This commands the twelve-hundred RPM motor to deliver water during fill cycles.',
        'Step 4: Connect PLC Digital Output Q0.1 to the Motorized Proportional Drain Valve. This regulates outflow to maintain precise setpoint equilibrium.',
      ],
      CONVEYOR: [
        'Step 1: Connect PLC Digital Input I0.0 to the Optical Photoelectric Sensor. This infrared beam detects incoming workpiece packages on the conveyor belt.',
        'Step 2: Connect PLC Digital Input I0.1 to the Operator Start Pushbutton. This latches the motor drive run command in memory.',
        'Step 3: Connect PLC Digital Output Q0.0 to the Siemens 24-Volt Gearmotor Drive to start the continuous rubber conveyor belt.',
        'Step 4: Connect PLC Digital Output Q0.1 to the Pneumatic Diverter Solenoid Valve to actuate the high-speed sorting pusher cylinder.',
      ],
      TRAFFIC: [
        'Step 1: Connect PLC Digital Input I0.0 to the Pedestrian Crosswalk Call Pushbutton. This queues a pedestrian crossing sequence into memory bit M1.0.',
        'Step 2: Connect PLC Digital Input I0.1 to the Inductive Road Vehicle Loop Sensor to detect oncoming metallic vehicles.',
        'Step 3: Connect PLC Digital Output Q0.0 to the Main Traffic Signal Head to drive the Red, Yellow, and Green LED optics matrix.',
        'Step 4: Connect PLC Digital Output Q0.1 to the Pedestrian Walk Signal Light to illuminate the walk sign when vehicle traffic is stopped at Red.',
      ],
      ROBOT: [
        'Step 1: Connect PLC Digital Input I0.0 to the In-Feed Part Proximity Sensor. This confirms a workpiece is present before initiating the pick stroke.',
        'Step 2: Connect PLC Digital Input I0.1 to the Gantry Home Reference Limit Switch to calibrate absolute Cartesian coordinates.',
        'Step 3: Connect PLC Digital Output Q0.0 to the Gantry Servo Motion Controller to drive coordinated X and Y linear slides.',
        'Step 4: Connect PLC Digital Output Q0.1 to the Pneumatic Vacuum Solenoid Valve to draw suction and grip the workpiece.',
      ],
      REACTOR: [
        'Step 1: Connect PLC Digital Input I0.0 to the PT100 RTD Temperature Sensor Probe. This signals the controller when the core reaches seventy-five degrees Celsius.',
        'Step 2: Connect PLC Digital Input I0.1 to the Recipe Batch Start Pushbutton to trigger the automated chemical dosing sequence.',
        'Step 3: Connect PLC Digital Output Q0.0 to the Dual-Tier Impeller Agitator Motor Starter to blend the reagents at seven-hundred RPM.',
        'Step 4: Connect PLC Digital Output Q0.1 to the Electric Heating Jacket Solid-State Relay to power the thermal heating coils.',
      ],
    };

    const expScripts = scripts[exp] || scripts.TANK;
    const text = expScripts[stepIndex] || `Step ${stepIndex + 1}: Connect the highlighted terminals.`;
    this.speak(text, 'WIRING');
  }

  public speakSimulationStart(exp: ExperimentType): void {
    const scripts: Record<ExperimentType, string> = {
      TANK: 'Automated water level process running. The PLC engages the centrifugal pump, delivers fluid through the dynamic pipes, and holds the target setpoint.',
      CONVEYOR: 'Conveyor sorting system active. Workpieces are moving along the belt. The optical beam detects packages and triggers the pneumatic diverter into the collection chute.',
      TRAFFIC: 'Smart traffic intersection online. The PLC sequencer executes multi-phase timing, monitoring the vehicle loop and crosswalk call station.',
      ROBOT: 'Robotic workcell running. The Cartesian gantry traverses to the feed nest, lowers the Z-axis, draws vacuum suction, and transfers the part into the target bin.',
      REACTOR: 'Chemical batch recipe sequence initiated. In-feed valves are dosing reagents A and B. The vortex agitator is blending while electric heating coils warm the core to seventy-five degrees.',
    };

    this.speak(scripts[exp] || 'Process started. Closed-loop control active.', 'SIMULATION');
  }

  public speakExperimentIntro(exp: ExperimentType): void {
    const scripts: Record<ExperimentType, string> = {
      TANK: 'Welcome to Experiment 1: Water Tank Closed-Loop Level Control. Let us wire the low and high level sensors, pump starter, and drain valve to the Siemens S7-1200 PLC.',
      CONVEYOR: 'Welcome to Experiment 2: Automated Conveyor Belt and Optical Sorting. Let us interface the photoelectric sensor, start button, gearmotor drive, and pneumatic diverter.',
      TRAFFIC: 'Welcome to Experiment 3: Smart 4-Way Traffic Light and Pedestrian Junction. Let us wire the pedestrian pushbutton, inductive vehicle loop, and signal heads.',
      ROBOT: 'Welcome to Experiment 4: 3-Axis Industrial Robotic Pick-and-Place Gantry. Let us connect the proximity sensor, home limit switch, servo drive, and vacuum gripper.',
      REACTOR: 'Welcome to Experiment 5: Industrial Thermal Batch Mixing Reactor. Let us interface the PT100 temperature probe, recipe start button, agitator motor, and heating jacket.',
    };

    this.speak(scripts[exp] || 'Welcome to AR PLC Studio.', 'SYSTEM');
  }

  public speakLadderRung(title: string, eq: string, note: string): void {
    const text = `${title}. Boolean equation: ${eq.replace(/[∧∨¬]/g, (m) => (m === '∧' ? ' AND ' : m === '∨' ? ' OR ' : ' NOT '))}. ${note}`;
    this.speak(text, 'LADDER');
  }

  private showSubtitle(text: string): void {
    if (!this.subtitleEl) return;
    const textEl = document.getElementById('voice-narration-text');
    if (textEl) textEl.textContent = text;

    this.subtitleEl.classList.remove('hidden');

    if (this.subtitleTimer) {
      clearTimeout(this.subtitleTimer);
    }
    // Auto-hide subtitle after reading duration (calculated by word count)
    const displayMs = Math.max(3500, (text.split(' ').length / 2.5) * 1000);
    this.subtitleTimer = window.setTimeout(() => {
      this.subtitleEl?.classList.add('hidden');
    }, displayMs);
  }

  private updateWaveAnimation(speaking: boolean): void {
    const bars = document.querySelectorAll('.v-bar');
    bars.forEach((b) => {
      if (speaking) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  public toggleVoice(): boolean {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled && this.synth) {
      this.synth.cancel();
      this.updateWaveAnimation(false);
      this.subtitleEl?.classList.add('hidden');
    }
    const miniBtn = document.getElementById('btn-voice-toggle-mini');
    if (miniBtn) {
      miniBtn.innerHTML = this.isEnabled ? Icons.volume2({ size: 14 }) : Icons.volumeX({ size: 14 });
    }
    EventBus.emit('voice:stateChanged', { enabled: this.isEnabled });
    return this.isEnabled;
  }

  public isVoiceEnabled(): boolean {
    return this.isEnabled;
  }

  public replayLast(): void {
    const textEl = document.getElementById('voice-narration-text');
    if (textEl && textEl.textContent) {
      this.speak(textEl.textContent);
    }
  }
}

export const voiceNarrator = VoiceNarrator.getInstance();
