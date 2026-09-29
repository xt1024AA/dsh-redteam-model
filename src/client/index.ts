/** Web client plugin: registers the Redteam Manager settings section. */
import { createAdminPage } from './AdminPage.js'
import type { ClientContext } from './contracts.js'
import {
  CONVERSATION_VIEW_SETTINGS_NAMESPACE,
  decodeConversationViewSettings,
  type ConversationViewSettingsScope,
} from './conversationViewSettings.js'
import { AdminController } from './controller.js'
import { en, NS, zh } from './locales.js'
import { installStyles } from './styles.js'

export const name = 'dsh-redteam-model-client'
export const inject = ['slots', 'locale', 'connection', 'configForms']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-redteam-model: locale')
  ctx.effect(() => installStyles(), 'dsh-redteam-model: styles')

  const controller = new AdminController(ctx.connection)
  const face = controller.inject()
  const t = ctx.locale.bind(NS)

  // 0.2.0-rc.2 replaced the client `settingsScope` service with `configForms`.
  // `get()` takes the Host plugin ENTRY ID (which is now also the settings
  // namespace) and returns the namespace's shared form, whose snapshot shape
  // matches the one the section already consumed. A narrowing `decode` can no
  // longer be handed to the provider, so the host-served section is decoded
  // here and malformed sections fail open.
  const form = ctx.configForms.get<unknown>(CONVERSATION_VIEW_SETTINGS_NAMESPACE)
  const visibilityScope: ConversationViewSettingsScope = {
    getSnapshot() {
      const snapshot = form.getSnapshot()
      return {
        status: snapshot.status,
        value: decodeConversationViewSettings(snapshot.value),
        writable: snapshot.writable,
        mode: snapshot.mode,
      }
    },
    subscribe: listener => form.subscribe(listener),
    set: (field, value) => form.set(field, value),
  }

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'redteam-manager',
    order: 120,
    label: () => t('nav'),
  }, createAdminPage(face, t, visibilityScope)))
}
