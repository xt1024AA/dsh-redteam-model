/** Browser-side contract for the five repository-owned conversation views. */

import {
  DEFAULT_CONVERSATION_VIEW_SETTINGS,
  type ConversationViewField,
  type ConversationViewSettings,
} from '../conversationViewState.js'

export {
  conversationViewWriteApplied,
  DEFAULT_CONVERSATION_VIEW_SETTINGS,
  effectiveConversationViewSettings,
} from '../conversationViewState.js'
export type { ConversationViewField, ConversationViewSettings } from '../conversationViewState.js'

/**
 * In 0.2.0-rc.2 a settings namespace IS the profile Loader entry id, not a
 * free-form slug. This package mounts as `dsh-redteam-model` (cordis.patch.yml)
 * and that is the namespace its Host-side `Config` is served under.
 */
export const CONVERSATION_VIEW_SETTINGS_NAMESPACE = 'dsh-redteam-model'

export const VIEW_FIELD_BY_PLUGIN = {
  'dsh-campaign-memory': 'showCampaignMemory',
  'dsh-attack-atlas': 'showAttackAtlas',
  'dsh-redteam-results': 'showRedteamResults',
  'dsh-hunter': 'showHunter',
  'dsh-webshell-mgr': 'showWebshellManager',
} as const

export interface ConversationViewSettingsSnapshot {
  status: 'loading' | 'ready' | 'unavailable'
  value: ConversationViewSettings | undefined
  writable: boolean
  mode: 'host' | 'memory'
}

/**
 * The subset of `ctx.configForms.get<T>()` this section consumes. The shape is
 * the Host's `ConfigFormSnapshot<T>` / `ConfigForm<T>` from
 * `@deepseek-ai/dsh-client-ui-settings@0.2.0-rc.2`.
 *
 * `set` resolves to whether the Host accepted the write, so callers may use the
 * answer directly instead of re-reading the settled snapshot.
 */
export interface ConversationViewSettingsScope {
  getSnapshot(): ConversationViewSettingsSnapshot
  subscribe(listener: () => void): () => void
  set(field: ConversationViewField, value: boolean): Promise<boolean>
}

const VIEW_FIELDS: readonly ConversationViewField[] = [
  'showCampaignMemory',
  'showAttackAtlas',
  'showRedteamResults',
  'showHunter',
  'showWebshellManager',
]

/** Decode only complete boolean sections; malformed snapshots fail open in the UI. */
export function decodeConversationViewSettings(section: unknown): ConversationViewSettings | undefined {
  if (typeof section !== 'object' || section === null || Array.isArray(section)) return undefined
  const candidate = section as Record<string, unknown>
  if (VIEW_FIELDS.some(field => typeof candidate[field] !== 'boolean')) return undefined
  return {
    showCampaignMemory: candidate.showCampaignMemory as boolean,
    showAttackAtlas: candidate.showAttackAtlas as boolean,
    showRedteamResults: candidate.showRedteamResults as boolean,
    showHunter: candidate.showHunter as boolean,
    showWebshellManager: candidate.showWebshellManager as boolean,
  }
}
