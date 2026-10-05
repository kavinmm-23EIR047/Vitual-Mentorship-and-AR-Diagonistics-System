// ============================================================
// ConnectionValidator – Pure validation logic
// ============================================================

import { isValidConnection, getExpectedTarget, getTerminalType, REQUIRED_CONNECTIONS } from './IOConfig';
import { AppState } from '../core/AppState';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  expectedTarget?: string;
  expectedLabel?: string;
}

/**
 * Validate a connection attempt between a PLC terminal and a field device.
 */
export function validateConnection(sourceId: string, targetId: string): ValidationResult {
  // Check source type
  const sourceType = getTerminalType(sourceId);
  if (!sourceType) {
    return { valid: false, reason: `Unknown PLC terminal: ${sourceId}` };
  }

  // Check if already connected
  const existing = AppState.wiringProgress.completed.find(c => c.source === sourceId);
  if (existing) {
    return { valid: false, reason: `${sourceId} is already connected to ${existing.target}` };
  }

  // Check if target already connected
  const targetUsed = AppState.wiringProgress.completed.find(c => c.target === targetId);
  if (targetUsed) {
    return { valid: false, reason: `${targetId} is already connected from ${targetUsed.source}` };
  }

  // Check valid mapping
  if (isValidConnection(sourceId, targetId)) {
    return { valid: true };
  }

  // Invalid – provide helpful feedback
  const expected = getExpectedTarget(sourceId);
  if (expected) {
    return {
      valid: false,
      reason: `${sourceId} is configured for ${expected.label}`,
      expectedTarget: expected.target,
      expectedLabel: expected.label,
    };
  }

  return { valid: false, reason: `Invalid connection: ${sourceId} → ${targetId}` };
}

/**
 * Check if all required connections are complete.
 */
export function areAllConnectionsComplete(): boolean {
  const completed = AppState.wiringProgress.completed;
  return REQUIRED_CONNECTIONS.every(req =>
    completed.some(c => c.source === req.source && c.target === req.target)
  );
}

/**
 * Get the list of missing connections.
 */
export function getMissingConnections(): Array<{ source: string; target: string; label: string }> {
  const completed = AppState.wiringProgress.completed;
  return REQUIRED_CONNECTIONS.filter(
    req => !completed.some(c => c.source === req.source && c.target === req.target)
  );
}
