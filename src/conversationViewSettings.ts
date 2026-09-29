/**
 * Persistent Host settings for repository-owned conversation views.
 *
 * DSH 0.2.0-rc.2 deleted this plugin's old registration path: `ctx.settings`
 * exposes only `configure / prepareDocument / describe / update / replace /
 * mutate`, and the module no longer exports `settingsNamespace` or a
 * `register`-style helper. What replaced it:
 *
 *   - A settings namespace is the profile Loader **entry id** (`SettingsNamespace`
 *     is documented as "Nominal id of one profile plugin entry"; `describe()`
 *     emits `ns: entry.options.id`). This package mounts as `dsh-redteam-model`
 *     (see cordis.patch.yml), so that is the namespace — not a free-form slug.
 *   - The fields a settings form shows are the `.volatile()` fields of the
 *     plugin's **own** `Config` schema: the Host reads `entry.fiber.runtime.Config`
 *     and projects it. So the schema must be exported as `Config` from the
 *     plugin entry module instead of being registered at runtime.
 *   - A plugin that renders its own page declares `configure({ auto: false })`
 *     as an effect inside an optional `ctx.inject(['settings'], ...)` child.
 */
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_CONVERSATION_VIEW_SETTINGS,
  type ConversationViewField,
  type ConversationViewSettings,
} from './conversationViewState.ts'

export {
  conversationViewWriteApplied,
  DEFAULT_CONVERSATION_VIEW_SETTINGS,
  effectiveConversationViewSettings,
} from './conversationViewState.ts'
export type { ConversationViewField, ConversationViewSettings } from './conversationViewState.ts'

/**
 * Settings namespace for this plugin. Since 0.2.0-rc.2 this is not a free-form
 * slug: it must equal the Loader entry id this package is mounted under, which
 * `cordis.patch.yml` declares as `dsh-redteam-model`.
 */
export const CONVERSATION_VIEW_SETTINGS_NAMESPACE = 'dsh-redteam-model'

/**
 * The plugin Config. The five `.volatile()` booleans are exactly the fields
 * `ctx.settings` projects into this plugin's form; `.volatile()` is what makes
 * them live-editable (resolved config exposes them as `{ get(): T }` refs).
 * The defaults keep an absent field reading back as the shipped default.
 */
export const ConversationViewSettingsSchema = z.object({
  showCampaignMemory: z.boolean().default(DEFAULT_CONVERSATION_VIEW_SETTINGS.showCampaignMemory).volatile(),
  showAttackAtlas: z.boolean().default(DEFAULT_CONVERSATION_VIEW_SETTINGS.showAttackAtlas).volatile(),
  showRedteamResults: z.boolean().default(DEFAULT_CONVERSATION_VIEW_SETTINGS.showRedteamResults).volatile(),
  showHunter: z.boolean().default(DEFAULT_CONVERSATION_VIEW_SETTINGS.showHunter).volatile(),
  showWebshellManager: z.boolean().default(DEFAULT_CONVERSATION_VIEW_SETTINGS.showWebshellManager).volatile(),
})

/** The name the Loader reads off the plugin module (`entry.fiber.runtime.Config`). */
export const Config = ConversationViewSettingsSchema

/** One schemastery volatile reference, as resolved config exposes it. */
interface VolatileRef<T> {
  get(): T | undefined
}

/** Resolved plugin Config, field by field, as cordis hands it to `apply`. */
export type ConversationViewConfig = Partial<Record<ConversationViewField, VolatileRef<boolean>>>

/** Read the live toggles from this plugin's own resolved Config refs. */
export function readConversationViewSettings(
  config: ConversationViewConfig | undefined,
): ConversationViewSettings {
  const read = (field: ConversationViewField): boolean =>
    config?.[field]?.get() ?? DEFAULT_CONVERSATION_VIEW_SETTINGS[field]
  return {
    showCampaignMemory: read('showCampaignMemory'),
    showAttackAtlas: read('showAttackAtlas'),
    showRedteamResults: read('showRedteamResults'),
    showHunter: read('showHunter'),
    showWebshellManager: read('showWebshellManager'),
  }
}

/** Minimal structural face of the `ctx.settings` members this module touches. */
interface SettingsFormsHandle {
  configure(presentation: { auto?: boolean }, owner?: unknown): () => void
}

/** Minimal structural face of the Context members this module touches. */
export interface ConversationViewSettingsContext {
  readonly fiber?: unknown
  inject(services: readonly string[], callback: (ctx: unknown) => void): unknown
  effect(execute: () => unknown, label?: string): unknown
}

/**
 * Declare this plugin's own settings-page policy. There is no namespace
 * registration any more: the form already exists as soon as the exported
 * `Config` carries volatile fields, and `auto: false` says the shipped client
 * section renders the page. Kept inside an optional `ctx.inject(['settings'])`
 * child so the plugin still boots on a Host without the settings service.
 */
export function registerConversationViewSettings(ctx: ConversationViewSettingsContext): void {
  ctx.inject(['settings'], (childCtx: unknown) => {
    const child = childCtx as ConversationViewSettingsContext & { settings: SettingsFormsHandle }
    child.effect(
      () => child.settings.configure({ auto: false }, ctx.fiber),
      'dsh-redteam-model: settings page policy',
    )
  })
}
