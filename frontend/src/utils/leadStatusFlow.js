/**
 * Lead Status Flow — Pipeline Transition Logic
 *
 * Pipeline:  New → Contacted → Follow-up → Proposal → Won
 *                                                     Lost (terminal, with reason)
 */

export const PIPELINE_STAGES = ['New', 'Contacted', 'Follow-up', 'Proposal Sent', 'Won']
export const TERMINAL_STAGES = ['Won', 'Lost']

/**
 * Returns which statuses the given user role can transition TO from the current status.
 * Returns [] if no transitions are allowed (terminal or no permission).
 */
export function getAllowedTransitions(currentStatus, userRole) {
  const current = normalizeStatus(currentStatus)
  const role    = userRole || ''
  const isManagerOrAdmin = role === 'Admin' || role === 'Manager'
  const isEmployee       = role === 'Employee'

  // Terminal states — no further changes
  if (current === 'won' || current === 'lost') return []

  const pipelineNorm = PIPELINE_STAGES.map(normalizeStatus)
  const idx = pipelineNorm.indexOf(current)

  const allowed = []

  // Advance to the next pipeline stage
  const nextIdx = idx + 1
  if (nextIdx < PIPELINE_STAGES.length) {
    const nextStage = PIPELINE_STAGES[nextIdx]
    const nextNorm  = normalizeStatus(nextStage)

    if (nextNorm === 'won') {
      // Only Manager/Admin can mark as Won
      if (isManagerOrAdmin) allowed.push('Won')
    } else {
      // Employee, Manager, Admin can advance through New→Contacted→Follow-up→Proposal
      allowed.push(nextStage)
    }
  }

  // Any → Lost: only Manager/Admin (requires a reason)
  if (isManagerOrAdmin) allowed.push('Lost')

  return allowed
}

/**
 * Checks if a specific transition is permitted.
 */
export function canTransitionTo(currentStatus, targetStatus, userRole) {
  const allowed = getAllowedTransitions(currentStatus, userRole)
  return allowed.map(normalizeStatus).includes(normalizeStatus(targetStatus))
}

/**
 * Returns true if the status requires a "reason" input (only Lost).
 */
export function requiresReason(targetStatus) {
  return normalizeStatus(targetStatus) === 'lost'
}

/**
 * Gets the pipeline step index (0-based). Returns -1 for Lost/unknown.
 */
export function getPipelineIndex(status) {
  const norm = normalizeStatus(status)
  return PIPELINE_STAGES.map(normalizeStatus).indexOf(norm)
}

/**
 * Whether the lead is in a terminal/closed state.
 */
export function isTerminalStatus(status) {
  return TERMINAL_STAGES.map(normalizeStatus).includes(normalizeStatus(status))
}

export function normalizeStatus(status) {
  const normalized = String(status || '').trim().toLowerCase().replace(/\s+/g, '-')
  if (normalized === 'proposal') return 'proposal-sent'
  return normalized
}
