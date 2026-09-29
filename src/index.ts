/**
 * dsh-redteam-model management host plugin.
 *
 * The plugin itself never installs modes or sub-plugins at startup; all
 * mutations are triggered by the settings page through the loopback RPC.
 */

import path from 'node:path'

import {
  CONVERSATION_VIEW_SETTINGS_NAMESPACE,
  conversationViewWriteApplied,
  ConversationViewSettingsSchema,
  Config,
  DEFAULT_CONVERSATION_VIEW_SETTINGS,
  effectiveConversationViewSettings,
  readConversationViewSettings,
  registerConversationViewSettings,
} from './conversationViewSettings.ts'
import { deployGlobalAgents, deployModes, dshHome, getStatus, installOne, profileWebDir, reconcileProfileBundles, repairMode, scanModes, scanPlugins, uninstallModes, uninstallOne } from './manager.ts'
import { detectEngineFlavor, isPackagedDesktopHost, normalizePresetComposition } from './manager.ts'
import { ENGINE_PACKAGES, NORMALIZER_VERSION, rewriteCompositionText } from './normalize.ts'
import { OperationQueue } from './operations.ts'
import { registerModelRpc } from './rpc.ts'
import type { HostConnectionHandle } from './types.ts'

export { OperationQueue }
export { deployGlobalAgents, deployModes, dshHome, getStatus, installOne, profileWebDir, reconcileProfileBundles, repairMode, scanModes, scanPlugins, uninstallModes, uninstallOne }
export { detectEngineFlavor, isPackagedDesktopHost, normalizePresetComposition }
export { ENGINE_PACKAGES, NORMALIZER_VERSION, rewriteCompositionText }
export { registerModelRpc }
export {
  CONVERSATION_VIEW_SETTINGS_NAMESPACE,
  conversationViewWriteApplied,
  ConversationViewSettingsSchema,
  Config,
  DEFAULT_CONVERSATION_VIEW_SETTINGS,
  effectiveConversationViewSettings,
  readConversationViewSettings,
  registerConversationViewSettings,
}

export const name = 'dsh-redteam-model'
export const inject = ['connection']

/**
 * Minimal structural face of the Cordis context this plugin needs.
 *
 * `ctx.inject(services, callback)` starts the callback as a child plugin and
 * calls it with `(ctx, config)` — a child Context, not a plain service table.
 * Service names resolve as Context properties; reading one that was not
 * injected throws `cannot get property "<name>" without inject`. The return
 * value is a Fiber (awaitable), which this plugin deliberately discards.
 */
export interface HostContext {
  inject(services: readonly string[], callback: (ctx: unknown) => void): unknown
  effect(execute: () => unknown, label?: string): unknown
}

export function apply(ctx: HostContext): void {
  registerConversationViewSettings(ctx)

  // The plugin still never deploys modes or sub-plugins at startup, but the
  // bundle rows of ALREADY installed plugins are its own bookkeeping: heal a
  // manifest that an older release (or a bundle reconcile reading a stale
  // `dsh.bundle` declaration) left naming a preset-plane plugin, which would
  // otherwise report "broken — repair" on this boot and every boot after it.
  // Never fatal: an unreadable profile must not keep the host from booting.
  try {
    reconcileProfileBundles()
  } catch {
    /* getStatus reports the profile state to the settings page instead. */
  }

  const queue = new OperationQueue(path.join(profileWebDir(), '.dsh-redteam-model-operations.json'))

  ctx.inject(['connection', 'webServer'], (childCtx: unknown) => {
    // `connection.rpc.handle` registers its channel through
    // `owner.effect(() => owner.webServer.register(route))`, so the context
    // that reads `connection` must also have injected `webServer` — otherwise
    // that registration throws `cannot get property "webServer" without inject`.
    const { connection } = childCtx as { connection: HostConnectionHandle }
    registerModelRpc(connection, queue)
  })

  ctx.effect(() => () => {
    queue.dispose()
  }, 'dsh-redteam-model: queue')
}
