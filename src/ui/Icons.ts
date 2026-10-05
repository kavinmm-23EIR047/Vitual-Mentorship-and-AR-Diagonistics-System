// ============================================================
// Icons.ts – Comprehensive Industrial & Modern SCADA SVG Icon System
// Clean, featherweight vector icons replacing all emojis across AR PLC Studio
// ============================================================

export type IconName =
  | 'zap'
  | 'play'
  | 'stop'
  | 'rotateCcw'
  | 'refreshCw'
  | 'sliders'
  | 'activity'
  | 'eye'
  | 'cube'
  | 'hand'
  | 'mic'
  | 'micOff'
  | 'volume2'
  | 'volumeX'
  | 'alarm'
  | 'alertTriangle'
  | 'alertOctagon'
  | 'shieldAlert'
  | 'check'
  | 'checkCircle'
  | 'x'
  | 'xCircle'
  | 'info'
  | 'cpu'
  | 'box'
  | 'tank'
  | 'traffic'
  | 'robot'
  | 'reactor'
  | 'pump'
  | 'valve'
  | 'pedestrian'
  | 'car'
  | 'flame'
  | 'wind'
  | 'droplet'
  | 'waves'
  | 'plus'
  | 'minus'
  | 'arrowRight'
  | 'arrowUp'
  | 'arrowDown'
  | 'chevronRight'
  | 'chevronDown'
  | 'chevronUp'
  | 'skipForward'
  | 'repeat'
  | 'lock'
  | 'unlock'
  | 'sparkles'
  | 'camera'
  | 'clipboard'
  | 'bookOpen'
  | 'graduationCap'
  | 'lightbulb'
  | 'compass'
  | 'gauge'
  | 'trash'
  | 'helpCircle'
  | 'target'
  | 'gitBranch'
  | 'crosshair'
  | 'terminal'
  | 'home'
  | 'trendingUp'
  | 'fileText'
  | 'shuffle'
  | 'layers'
  | 'tag'
  | 'pin'
  | 'minimize2'
  | 'settings';

export interface IconOptions {
  size?: number | string;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

const SVG_PATHS: Record<IconName, string> = {
  // Electric / Power / Signal
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>`,
  
  // Controls
  play: `<polygon points="5 3 19 12 5 21 5 3"></polygon>`,
  stop: `<rect x="5" y="5" width="14" height="14" rx="2" ry="2"></rect>`,
  rotateCcw: `<path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>`,
  refreshCw: `<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>`,
  repeat: `<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>`,
  skipForward: `<polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line>`,
  
  // Navigation & Views
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`,
  cube: `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>`,
  hand: `<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path>`,
  sliders: `<line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>`,
  activity: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>`,
  gauge: `<path d="M12 14v-4"></path><path d="M3.34 19a10 10 0 1 1 17.32 0"></path>`,
  home: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>`,
  trendingUp: `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>`,
  fileText: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>`,
  layers: `<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>`,
  shuffle: `<polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line>`,
  tag: `<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>`,
  pin: `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>`,
  minimize2: `<polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line>`,
  settings: `<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.76.6l-.05.07h-3.4l-.02-.08a1.7 1.7 0 0 0-1.3-1.2l-.08-.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 10.1 15l-.08-.04v-3.4l.08-.02a1.7 1.7 0 0 0 1.2-1.3l.02-.08 2.94-1.7.06.06a1.7 1.7 0 0 0 1.88.34l.06-.04h3.4l.02.08a1.7 1.7 0 0 0 1.3 1.2l.08.02v3.4l-.08.02a1.7 1.7 0 0 0-1.2 1.3z"></path>`,

  // Audio / Speech
  mic: `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>`,
  micOff: `<line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>`,
  volume2: `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>`,
  volumeX: `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>`,

  // Alarms & Safety
  alarm: `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path><line x1="12" y1="2" x2="12" y2="4"></line>`,
  alertTriangle: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`,
  alertOctagon: `<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`,
  shieldAlert: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`,

  // Status & Feedback
  check: `<polyline points="20 6 9 17 4 12"></polyline>`,
  checkCircle: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`,
  x: `<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>`,
  xCircle: `<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>`,
  info: `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>`,
  helpCircle: `<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>`,

  // Experiments & Industrial Components
  cpu: `<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>`,
  tank: `<path d="M5 6a7 3 0 1 0 14 0A7 3 0 1 0 5 6Z"></path><path d="M5 6v12a7 3 0 0 0 14 0V6"></path><path d="M5 12a7 3 0 0 0 14 0"></path>`,
  box: `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>`,
  traffic: `<rect x="7" y="2" width="10" height="20" rx="3"></rect><circle cx="12" cy="6" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="18" r="1.5"></circle>`,
  robot: `<rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="16" y1="16" x2="16.01" y2="16"></line>`,
  reactor: `<path d="M9 2v3.7a4 4 0 0 1-.8 2.3L4.2 14.5A4 4 0 0 0 7.4 21h9.2a4 4 0 0 0 3.2-6.5l-4-6.5a4 4 0 0 1-.8-2.3V2"></path><line x1="8" y1="2" x2="16" y2="2"></line><line x1="6.8" y1="14" x2="17.2" y2="14"></line>`,
  pump: `<circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 1 9 9h-9"></path><path d="M12 21a9 9 0 0 1-9-9h9"></path>`,
  valve: `<circle cx="12" cy="12" r="3"></circle><line x1="3" y1="12" x2="9" y2="12"></line><line x1="15" y1="12" x2="21" y2="12"></line><line x1="12" y1="3" x2="12" y2="9"></line>`,
  pedestrian: `<circle cx="12" cy="4" r="2"></circle><path d="m15 22-3-5-3 5"></path><path d="M12 17v-6l4-2"></path><path d="m8 11 4-2"></path>`,
  car: `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle>`,
  flame: `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>`,
  wind: `<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path>`,
  droplet: `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>`,
  waves: `<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>`,
  terminal: `<rect x="3" y="5" width="18" height="14" rx="2"></rect><polyline points="7 10 10 12 7 14"></polyline><line x1="13" y1="14" x2="17" y2="14"></line>`,
  gitBranch: `<line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path>`,

  // Utilities & Math
  plus: `<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`,
  minus: `<line x1="5" y1="12" x2="19" y2="12"></line>`,
  arrowRight: `<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>`,
  arrowUp: `<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>`,
  arrowDown: `<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>`,
  chevronRight: `<polyline points="9 18 15 12 9 6"></polyline>`,
  chevronDown: `<polyline points="6 9 12 15 18 9"></polyline>`,
  chevronUp: `<polyline points="18 15 12 9 6 15"></polyline>`,
  lock: `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>`,
  unlock: `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>`,
  sparkles: `<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>`,
  camera: `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>`,
  clipboard: `<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>`,
  bookOpen: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>`,
  graduationCap: `<path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path>`,
  lightbulb: `<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>`,
  compass: `<circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>`,
  target: `<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>`,
  crosshair: `<circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line>`,
  trash: `<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>`,
};

/**
 * Returns an inline SVG string for the specified icon.
 */
export function getIcon(name: IconName, options?: IconOptions): string {
  const path = SVG_PATHS[name] || SVG_PATHS.helpCircle;
  const size = options?.size ?? 16;
  const cls = options?.className ? `svg-icon ${options.className}` : 'svg-icon';
  const color = options?.color ? `style="color: ${options.color}"` : '';
  const stroke = options?.strokeWidth ?? 2;

  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${color}>${path}</svg>`;
}

/**
 * Convenience helper to render icon directly.
 */
export const Icons: Record<IconName, (options?: IconOptions) => string> = Object.keys(SVG_PATHS).reduce(
  (acc, key) => {
    const iconKey = key as IconName;
    acc[iconKey] = (opts?: IconOptions) => getIcon(iconKey, opts);
    return acc;
  },
  {} as Record<IconName, (options?: IconOptions) => string>
);
