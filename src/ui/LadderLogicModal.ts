// ============================================================
// LadderLogicModal.ts – Interactive PLC Ladder Logic Studio & Learning Platform
// Live Animated Power Rails, IEC 61131-3 Contacts, Rung Breakdown & Quiz
// ============================================================

import { AppState } from '../core/AppState';
import { EventBus, Events } from '../core/EventBus';
import { EXPERIMENTS } from '../core/ExperimentConfig';
import { LadderLogicEngine, type LadderRung } from '../ladder/LadderLogicEngine';
import { voiceNarrator } from '../core/VoiceNarrator';
import { Icons } from './Icons';

export class LadderLogicModal {
  private container!: HTMLElement;
  private isOpen = false;
  private currentTab: 'DIAGRAM' | 'EXPLAIN' | 'QUIZ' = 'DIAGRAM';
  private updateInterval: number | null = null;
  private lastRenderedExp: string = '';

  constructor(parent: HTMLElement) {
    this.createModal(parent);
    this.bindEvents();
  }

  private createModal(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.className = 'ladder-modal-backdrop hidden';
    this.container.id = 'ladder-logic-modal';

    this.container.innerHTML = `
      <div class="ladder-modal-card" id="ladder-card-inner">
        <!-- Header -->
        <div class="ladder-header">
          <div class="ladder-header-left">
            <span class="ladder-icon-badge">${Icons.zap({ size: 18 })}</span>
            <div>
              <div class="ladder-main-title">
                <span id="ladder-exp-title">EXPERIMENT 1: WATER TANK LADDER LOGIC</span>
              </div>
              <div class="ladder-sub-title">Siemens SIMATIC S7-1200 • IEC 61131-3 Ladder Diagram (LAD) Studio</div>
            </div>
          </div>
          <div class="ladder-header-right">
            <div class="ladder-live-badge">
              <span class="live-dot-pulse"></span>
              <span>LIVE POWER SCAN (10ms)</span>
            </div>
            <button id="btn-close-ladder-modal" class="ladder-close-btn" title="Close Ladder Studio">
              ${Icons.x({ size: 16 })}
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="ladder-tabs-bar">
          <button class="ladder-tab-btn active" data-tab="DIAGRAM">
            <span>${Icons.zap({ size: 14 })} Live Ladder Diagram</span>
          </button>
          <button class="ladder-tab-btn" data-tab="EXPLAIN">
            <span>${Icons.bookOpen({ size: 14 })} Step-by-Step Logic Explanation</span>
          </button>
          <button class="ladder-tab-btn" data-tab="QUIZ">
            <span>${Icons.graduationCap({ size: 14 })} Student Knowledge Quiz</span>
          </button>
        </div>

        <!-- Content Area -->
        <div class="ladder-content-scroll" id="ladder-tab-content">
          <!-- Dynamically injected tab content -->
        </div>

        <!-- Footer Bar -->
        <div class="ladder-footer">
          <div class="ladder-legend">
            <div class="legend-item"><span class="leg-sym leg-no">-[ ]-</span><span>Normally Open (NO)</span></div>
            <div class="legend-item"><span class="leg-sym leg-nc">-[/]-</span><span>Normally Closed (NC)</span></div>
            <div class="legend-item"><span class="leg-sym leg-ton">[TON]</span><span>On-Delay Timer</span></div>
            <div class="legend-item"><span class="leg-sym leg-coil">-( )-</span><span>Output Relay Coil</span></div>
            <div class="legend-item"><span class="leg-sym leg-hot">${Icons.zap({ size: 12 })} Power</span><span>Energized Path</span></div>
          </div>
          <div class="ladder-footer-actions">
            <button id="btn-ladder-plc-run" class="ladder-run-btn">
              ${Icons.play({ size: 13 })} RUN CPU
            </button>
          </div>
        </div>
      </div>
    `;

    parent.appendChild(this.container);
  }

  private bindEvents(): void {
    // Close button
    const closeBtn = this.container.querySelector('#btn-close-ladder-modal');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // Close on clicking backdrop outside card
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });

    // Tab switching
    this.container.querySelectorAll('.ladder-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.ladder-tab-btn').forEach((b) => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const tab = target.getAttribute('data-tab') as 'DIAGRAM' | 'EXPLAIN' | 'QUIZ';
        this.currentTab = tab;
        this.renderTabContent(true);
      });
    });

    // Toggle PLC Run
    const runBtn = this.container.querySelector('#btn-ladder-plc-run');
    runBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (AppState.plcState === 'RUN') {
        EventBus.emit(Events.PROCESS_STOP);
      } else {
        EventBus.emit(Events.PROCESS_START);
      }
      this.updateRunButton();
    });

    EventBus.on('ladder:open', () => {
      this.open();
    });

    EventBus.on('ladder:close', () => {
      this.close();
    });

    EventBus.on('experiment:changed', () => {
      if (this.isOpen) {
        this.updateHeaderTitle();
        this.renderTabContent(true);
      }
    });

    EventBus.on(Events.PLC_STATE_CHANGED, () => {
      if (this.isOpen) {
        this.updateRunButton();
        if (this.currentTab === 'DIAGRAM') {
          this.updateLiveDiagramStates();
        }
      }
    });

    EventBus.on(Events.STATE_CHANGED, () => {
      if (this.isOpen && this.currentTab === 'DIAGRAM') {
        this.updateLiveDiagramStates();
      }
    });
  }

  open(): void {
    this.isOpen = true;
    this.container.classList.remove('hidden');
    this.container.classList.add('active');
    this.updateHeaderTitle();
    this.updateRunButton();
    this.renderTabContent(true);
    EventBus.emit('ladder:opened');

    // Live update loop for timers and power scan (updates states in place without DOM thrashing)
    if (!this.updateInterval) {
      this.updateInterval = window.setInterval(() => {
        if (this.isOpen && this.currentTab === 'DIAGRAM') {
          this.updateLiveDiagramStates();
        }
        this.updateRunButton();
      }, 150);
    }
  }

  close(): void {
    this.isOpen = false;
    this.container.classList.remove('active');
    this.container.classList.add('hidden');
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    EventBus.emit('ladder:closed');
  }

  private updateHeaderTitle(): void {
    const titleEl = document.getElementById('ladder-exp-title');
    const exp = EXPERIMENTS[AppState.activeExperiment];
    if (titleEl && exp) {
      titleEl.textContent = `${exp.title.toUpperCase()} — LADDER LOGIC (LAD)`;
    }
  }

  private updateRunButton(): void {
    const btn = document.getElementById('btn-ladder-plc-run');
    if (btn) {
      const isRun = AppState.plcState === 'RUN';
      btn.innerHTML = isRun ? `${Icons.stop({ size: 13 })} STOP CPU` : `${Icons.play({ size: 13 })} RUN CPU`;
      btn.className = isRun ? 'ladder-run-btn active' : 'ladder-run-btn';
    }
  }

  private renderTabContent(forceRebuild = false): void {
    const container = document.getElementById('ladder-tab-content');
    if (!container) return;

    const currentExp = AppState.activeExperiment;
    const expChanged = this.lastRenderedExp !== currentExp;
    this.lastRenderedExp = currentExp;

    if (this.currentTab === 'DIAGRAM') {
      if (forceRebuild || expChanged || !container.querySelector('.ladder-canvas-wrapper')) {
        this.buildDiagramTabDOM();
      } else {
        this.updateLiveDiagramStates();
      }
    } else if (this.currentTab === 'EXPLAIN') {
      this.renderExplainTab();
    } else if (this.currentTab === 'QUIZ') {
      this.renderQuizTab();
    }
  }

  // --- 1. Live Animated Ladder Diagram Tab ---
  private buildDiagramTabDOM(): void {
    const container = document.getElementById('ladder-tab-content');
    if (!container) return;

    const rungs = LadderLogicEngine.getRungsForExperiment(AppState.activeExperiment);

    container.innerHTML = `
      <div class="ladder-canvas-wrapper">
        <div class="power-rail left-rail">
          <span class="rail-tag">L1 (+24V)</span>
          <div class="rail-line ${AppState.plcState === 'RUN' ? 'energized' : ''}" id="left-power-rail-line"></div>
        </div>

        <div class="rungs-container" id="ladder-rungs-container">
          ${rungs
            .map((rung) => {
              const rungTrueClass = rung.isRungTrue ? 'rung-true' : 'rung-false';

              return `
              <div class="ladder-rung-card ${rungTrueClass}" id="rung-card-${rung.rungNumber}" data-rung-id="${rung.rungNumber}">
                <div class="rung-meta-header">
                  <span class="rung-num-badge">RUNG ${String(rung.rungNumber).padStart(3, '0')}</span>
                  <span class="rung-title-text">${rung.title}</span>
                  <span class="rung-status-tag ${rung.isRungTrue ? 'tag-true' : 'tag-false'}" id="rung-status-${rung.rungNumber}">
                    ${rung.isRungTrue ? `${Icons.zap({ size: 12 })} ENERGIZED (TRUE)` : '○ DE-ENERGIZED'}
                  </span>
                  <button class="rung-voice-btn" data-rung-num="${rung.rungNumber}" title="Hear AI Instructor explain Rung ${rung.rungNumber}">
                    ${Icons.mic({ size: 13 })} Read Aloud
                  </button>
                </div>

                <div class="rung-schematic-line">
                  <!-- Power In wire -->
                  <div class="wire-segment ${AppState.plcState === 'RUN' ? 'wire-hot' : ''}" id="wire-in-${rung.rungNumber}"></div>

                  <!-- Contact Elements -->
                  <div class="contacts-chain">
                    ${rung.elements
                      .map((el) => {
                        const hotClass = el.isEnergized ? 'elem-hot' : '';
                        const sym = el.type === 'NO' ? '┤ ├' : el.type === 'NC' ? '┤/├' : '[TON]';

                        return `
                        <div class="ladder-element ${hotClass}" id="elem-${el.id}" data-elem-id="${el.id}">
                          <div class="elem-tag">${el.tag}</div>
                          <div class="elem-symbol-box">${sym}</div>
                          <div class="elem-label">${el.label}</div>
                          <div class="elem-state-indicator ${el.isEnergized ? 'on' : 'off'}" id="ind-${el.id}">
                            ${el.isEnergized ? 'TRUE (1)' : 'FALSE (0)'}
                          </div>
                        </div>
                      `;
                      })
                      .join('<div class="wire-segment-inline"></div>')}
                  </div>

                  <!-- Wire to output coil -->
                  <div class="wire-segment ${rung.isRungTrue ? 'wire-hot' : ''}" id="wire-mid-${rung.rungNumber}"></div>

                  <!-- Output Coil / Timer -->
                  <div class="ladder-element ladder-coil ${rung.outputCoil.isEnergized ? 'elem-hot coil-hot' : ''}" id="elem-${rung.outputCoil.id}">
                    <div class="elem-tag">${rung.outputCoil.tag}</div>
                    <div class="elem-symbol-box coil-box">-( )-</div>
                    <div class="elem-label">${rung.outputCoil.label}</div>
                    <div class="elem-state-indicator ${rung.outputCoil.isEnergized ? 'on' : 'off'}" id="ind-${rung.outputCoil.id}">
                      ${rung.outputCoil.isEnergized ? 'ON (1)' : 'OFF (0)'}
                    </div>
                  </div>

                  <!-- Power Out wire to neutral -->
                  <div class="wire-segment ${rung.isRungTrue ? 'wire-hot' : ''}" id="wire-out-${rung.rungNumber}"></div>
                </div>

                <div class="rung-quick-eq">
                  <span class="eq-label">Boolean Equation:</span>
                  <code>${rung.booleanEquation}</code>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>

        <div class="power-rail right-rail">
          <span class="rail-tag">N (0V / M)</span>
          <div class="rail-line"></div>
        </div>
      </div>
    `;

    this.bindRungVoiceButtons(rungs);
  }

  /**
   * Fast in-place DOM update without destroying elements or resetting event listeners.
   */
  private updateLiveDiagramStates(): void {
    const rungs = LadderLogicEngine.getRungsForExperiment(AppState.activeExperiment);
    const isPlcRun = AppState.plcState === 'RUN';

    // Update left power rail line
    const railLine = document.getElementById('left-power-rail-line');
    if (railLine) {
      railLine.classList.toggle('energized', isPlcRun);
    }

    for (const rung of rungs) {
      const card = document.getElementById(`rung-card-${rung.rungNumber}`);
      if (card) {
        card.className = `ladder-rung-card ${rung.isRungTrue ? 'rung-true' : 'rung-false'}`;
      }

      const statusTag = document.getElementById(`rung-status-${rung.rungNumber}`);
      if (statusTag) {
        statusTag.className = `rung-status-tag ${rung.isRungTrue ? 'tag-true' : 'tag-false'}`;
        statusTag.innerHTML = rung.isRungTrue ? `${Icons.zap({ size: 12 })} ENERGIZED (TRUE)` : '○ DE-ENERGIZED';
      }

      const wireIn = document.getElementById(`wire-in-${rung.rungNumber}`);
      if (wireIn) wireIn.className = `wire-segment ${isPlcRun ? 'wire-hot' : ''}`;

      const wireMid = document.getElementById(`wire-mid-${rung.rungNumber}`);
      if (wireMid) wireMid.className = `wire-segment ${rung.isRungTrue ? 'wire-hot' : ''}`;

      const wireOut = document.getElementById(`wire-out-${rung.rungNumber}`);
      if (wireOut) wireOut.className = `wire-segment ${rung.isRungTrue ? 'wire-hot' : ''}`;

      // Contacts
      for (const el of rung.elements) {
        const elemNode = document.getElementById(`elem-${el.id}`);
        if (elemNode) {
          elemNode.className = `ladder-element ${el.isEnergized ? 'elem-hot' : ''}`;
        }
        const indNode = document.getElementById(`ind-${el.id}`);
        if (indNode) {
          indNode.className = `elem-state-indicator ${el.isEnergized ? 'on' : 'off'}`;
          indNode.textContent = el.isEnergized ? 'TRUE (1)' : 'FALSE (0)';
        }
      }

      // Output coil
      const coilNode = document.getElementById(`elem-${rung.outputCoil.id}`);
      if (coilNode) {
        coilNode.className = `ladder-element ladder-coil ${rung.outputCoil.isEnergized ? 'elem-hot coil-hot' : ''}`;
      }
      const coilInd = document.getElementById(`ind-${rung.outputCoil.id}`);
      if (coilInd) {
        coilInd.className = `elem-state-indicator ${rung.outputCoil.isEnergized ? 'on' : 'off'}`;
        coilInd.textContent = rung.outputCoil.isEnergized ? 'ON (1)' : 'OFF (0)';
      }
    }
  }

  // --- 2. Step-by-Step Educational Explanation Tab ---
  private renderExplainTab(): void {
    const container = document.getElementById('ladder-tab-content');
    if (!container) return;

    const rungs = LadderLogicEngine.getRungsForExperiment(AppState.activeExperiment);
    const exp = EXPERIMENTS[AppState.activeExperiment];

    container.innerHTML = `
      <div class="explain-tab-wrapper">
        <div class="explain-overview-card">
          <div class="explain-overview-header">
            <span class="overview-icon">${Icons.graduationCap({ size: 22 })}</span>
            <div>
              <h3>How Ladder Logic Works: ${exp.shortTitle}</h3>
              <p>Siemens S7-1200 executes these rungs sequentially from top to bottom in a continuous scan cycle (~10 milliseconds).</p>
            </div>
          </div>
        </div>

        <div class="explain-rungs-list">
          ${rungs
            .map(
              (rung) => `
            <div class="explain-rung-card">
              <div class="explain-rung-header">
                <span class="explain-num">RUNG ${rung.rungNumber}</span>
                <h4>${rung.title}</h4>
                <button class="rung-voice-btn" data-rung-num="${rung.rungNumber}" title="Hear AI Instructor explain Rung ${rung.rungNumber}">
                  ${Icons.mic({ size: 13 })} Read Aloud
                </button>
              </div>
              <div class="explain-body">
                <div class="explain-section">
                  <div class="sec-label">${Icons.clipboard({ size: 13 })} Industrial Purpose &amp; Operation:</div>
                  <p>${rung.description}</p>
                </div>
                <div class="explain-section">
                  <div class="sec-label">${Icons.activity({ size: 13 })} Mathematical Boolean Logic:</div>
                  <div class="boolean-eq-box">
                    <code>${rung.booleanEquation}</code>
                  </div>
                </div>
                <div class="explain-section">
                  <div class="sec-label">${Icons.lightbulb({ size: 13 })} Engineer's Learning Note:</div>
                  <div class="learning-note-box">
                    ${rung.learningNote}
                  </div>
                </div>
                <div class="explain-io-grid">
                  <div class="io-item">
                    <span class="io-lbl">Inputs (Condition):</span>
                    <span class="io-val">${rung.elements.map((e) => `<strong>${e.tag}</strong> (${e.label})`).join(' • ')}</span>
                  </div>
                  <div class="io-item">
                    <span class="io-lbl">Output (Actuator):</span>
                    <span class="io-val"><strong>${rung.outputCoil.tag}</strong> (${rung.outputCoil.label})</span>
                  </div>
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    this.bindRungVoiceButtons(rungs);
  }

  private bindRungVoiceButtons(rungs: LadderRung[]): void {
    const container = document.getElementById('ladder-tab-content');
    if (!container) return;

    container.querySelectorAll('.rung-voice-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const num = Number((e.currentTarget as HTMLElement).getAttribute('data-rung-num'));
        const rung = rungs.find((r) => r.rungNumber === num);
        if (rung) {
          voiceNarrator.speakLadderRung(rung.title, rung.booleanEquation, rung.learningNote);
          EventBus.emit('ladder:rungSelected', { rungIndex: num });
        }
      });
    });
  }

  // --- 3. Student Knowledge Quiz Tab ---
  private renderQuizTab(): void {
    const container = document.getElementById('ladder-tab-content');
    if (!container) return;

    container.innerHTML = `
      <div class="quiz-tab-wrapper">
        <div class="quiz-header-card">
          <h3>${Icons.lightbulb({ size: 18 })} Industrial Automation &amp; Ladder Logic Knowledge Check</h3>
          <p>Test your understanding of PLC scan cycles, contact logic, interlocks, and industrial safety standards.</p>
        </div>

        <div class="quiz-questions-list">
          <div class="quiz-card" data-q="1">
            <div class="q-title">1. What happens to a Normally Closed contact -[/]- when its associated Digital Input (%I0.1) receives 24V?</div>
            <div class="q-options">
              <label class="q-option"><input type="radio" name="q1" value="a" /> <span>It closes and conducts power flow</span></label>
              <label class="q-option"><input type="radio" name="q1" value="b" /> <span>It opens (breaks) and stops power flow to downstream coils</span></label>
              <label class="q-option"><input type="radio" name="q1" value="c" /> <span>It causes a short circuit on the CPU power rail</span></label>
            </div>
            <div class="q-feedback hidden" id="q1-fb"></div>
          </div>

          <div class="quiz-card" data-q="2">
            <div class="q-title">2. Why is a Seal-in (Latching) Contact placed in parallel with a momentary Start Pushbutton?</div>
            <div class="q-options">
              <label class="q-option"><input type="radio" name="q2" value="a" /> <span>To keep the motor running after the operator releases their finger from the Start button</span></label>
              <label class="q-option"><input type="radio" name="q2" value="b" /> <span>To double the voltage supplied to the motor starter</span></label>
              <label class="q-option"><input type="radio" name="q2" value="c" /> <span>To automatically restart the machine after a power outage without operator presence</span></label>
            </div>
            <div class="q-feedback hidden" id="q2-fb"></div>
          </div>

          <div class="quiz-card" data-q="3">
            <div class="q-title">3. What is the role of a TON (Timer On-Delay) block in material handling sorting systems?</div>
            <div class="q-options">
              <label class="q-option"><input type="radio" name="q3" value="a" /> <span>To turn off the conveyor belt immediately</span></label>
              <label class="q-option"><input type="radio" name="q3" value="b" /> <span>To delay actuator firing until the workpiece travels from the optical sensor to the pusher station</span></label>
              <label class="q-option"><input type="radio" name="q3" value="c" /> <span>To count total lifetime operating hours of the electric motor</span></label>
            </div>
            <div class="q-feedback hidden" id="q3-fb"></div>
          </div>
        </div>

        <div class="quiz-submit-row">
          <button id="btn-submit-quiz" class="quiz-submit-btn">${Icons.check({ size: 14 })} Check Answers</button>
        </div>
      </div>
    `;

    // Make clicking the option label highlight and check radio
    container.querySelectorAll('.q-option').forEach((label) => {
      label.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

    const submitBtn = container.querySelector('#btn-submit-quiz');
    submitBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.checkQuizAnswers();
    });
  }

  private checkQuizAnswers(): void {
    const q1 = (document.querySelector('input[name="q1"]:checked') as HTMLInputElement)?.value;
    const q2 = (document.querySelector('input[name="q2"]:checked') as HTMLInputElement)?.value;
    const q3 = (document.querySelector('input[name="q3"]:checked') as HTMLInputElement)?.value;

    const fb1 = document.getElementById('q1-fb');
    const fb2 = document.getElementById('q2-fb');
    const fb3 = document.getElementById('q3-fb');

    if (!fb1 || !fb2 || !fb3) return;

    let score = 0;

    if (q1 === 'b') {
      fb1.innerHTML = `<span class="fb-correct">${Icons.checkCircle({ size: 14 })} Correct!</span> An NC contact opens when energized, breaking power continuity.`;
      fb1.className = 'q-feedback correct';
      score++;
    } else {
      fb1.innerHTML = `<span class="fb-incorrect">${Icons.xCircle({ size: 14 })} Incorrect.</span> In PLC ladder logic, a Normally Closed contact breaks (opens) when its memory bit is 1 (energized).`;
      fb1.className = 'q-feedback incorrect';
    }

    if (q2 === 'a') {
      fb2.innerHTML = `<span class="fb-correct">${Icons.checkCircle({ size: 14 })} Correct!</span> The auxiliary NO contact of the output relay provides a holding path (seal-in).`;
      fb2.className = 'q-feedback correct';
      score++;
    } else {
      fb2.innerHTML = `<span class="fb-incorrect">${Icons.xCircle({ size: 14 })} Incorrect.</span> The seal-in contact maintains power to the coil after the momentary pushbutton springs open.`;
      fb2.className = 'q-feedback incorrect';
    }

    if (q3 === 'b') {
      fb3.innerHTML = `<span class="fb-correct">${Icons.checkCircle({ size: 14 })} Correct!</span> TON delays the pusher stroke to synchronize with the workpiece travel time along the belt.`;
      fb3.className = 'q-feedback correct';
      score++;
    } else {
      fb3.innerHTML = `<span class="fb-incorrect">${Icons.xCircle({ size: 14 })} Incorrect.</span> TON (Timer On-Delay) holds off output energization until the preset time (PT) has elapsed.`;
      fb3.className = 'q-feedback incorrect';
    }

    fb1.classList.remove('hidden');
    fb2.classList.remove('hidden');
    fb3.classList.remove('hidden');

    EventBus.emit('ladder:quizAnswered', { score, total: 3 });
  }
}
