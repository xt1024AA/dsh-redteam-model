import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CONVERSATION_VIEW_SETTINGS_NAMESPACE,
  conversationViewWriteApplied,
  ConversationViewSettingsSchema,
  Config,
  DEFAULT_CONVERSATION_VIEW_SETTINGS,
  effectiveConversationViewSettings,
  readConversationViewSettings,
  registerConversationViewSettings,
} from '../lib/index.js'

test('conversation view settings default every owned view to visible', () => {
  // 0.2.0-rc.2: a settings namespace IS the profile Loader entry id, so it must
  // equal the id `cordis.patch.yml` mounts this package under.
  assert.equal(CONVERSATION_VIEW_SETTINGS_NAMESPACE, 'dsh-redteam-model')
  // `z.boolean().volatile()` resolves to a `{ get() }` reference, not a bare
  // value, so the defaults are read back through the plugin's own reader.
  assert.deepEqual(readConversationViewSettings(ConversationViewSettingsSchema({})), DEFAULT_CONVERSATION_VIEW_SETTINGS)
  assert.deepEqual(DEFAULT_CONVERSATION_VIEW_SETTINGS, {
    showCampaignMemory: true,
    showAttackAtlas: true,
    showRedteamResults: true,
    showHunter: true,
    showWebshellManager: true,
  })
})

test('every projected field is declared volatile so the Host serves it', () => {
  // The Host only projects `.volatile()` fields into a settings form
  // (`volatileForm()`), so losing the flag silently removes a toggle.
  // schemastery serializes structurally: the root ref's `dict` maps field
  // names to referenced ids, and the refs carry the `meta`.
  const described = ConversationViewSettingsSchema.toJSON()
  const root = described.dict === undefined ? described.refs[String(described.uid)] : described
  for (const field of [
    'showCampaignMemory',
    'showAttackAtlas',
    'showRedteamResults',
    'showHunter',
    'showWebshellManager',
  ]) {
    const ref = described.refs[String(root.dict[field])]
    assert.equal(ref.meta.volatile, true, `${field} must stay volatile`)
    assert.equal(ref.type, 'boolean', `${field} must stay boolean`)
  }
})

test('the plugin Config is the exported settings schema the Host projects into a form', () => {
  assert.equal(Config, ConversationViewSettingsSchema)
  // The Host reads `entry.fiber.runtime.Config` and only projects it when the
  // value is a schemastery schema (`typeof schema.toJSON === 'function'`).
  assert.equal(typeof Config.toJSON, 'function')
  assert.deepEqual(readConversationViewSettings(Config({})), DEFAULT_CONVERSATION_VIEW_SETTINGS)
})

test('conversation view settings accept booleans and reject malformed values', () => {
  assert.deepEqual(readConversationViewSettings(ConversationViewSettingsSchema({ showHunter: false })), {
    ...DEFAULT_CONVERSATION_VIEW_SETTINGS,
    showHunter: false,
  })
  assert.throws(() => ConversationViewSettingsSchema({ showHunter: 'false' }), TypeError)
})

test('conversation view settings fail open instead of displaying a retained unavailable value', () => {
  const hidden = { ...DEFAULT_CONVERSATION_VIEW_SETTINGS, showAttackAtlas: false }
  assert.equal(effectiveConversationViewSettings({ status: 'ready', value: hidden }).showAttackAtlas, false)
  assert.equal(effectiveConversationViewSettings({ status: 'unavailable', value: hidden }).showAttackAtlas, true)
  assert.equal(effectiveConversationViewSettings({ status: 'loading', value: undefined }).showAttackAtlas, true)
})

test('conversation view writes are acknowledged from the settled scope snapshot', () => {
  const visible = { ...DEFAULT_CONVERSATION_VIEW_SETTINGS, showAttackAtlas: true }
  const hidden = { ...DEFAULT_CONVERSATION_VIEW_SETTINGS, showAttackAtlas: false }
  assert.equal(conversationViewWriteApplied({ status: 'ready', value: hidden }, 'showAttackAtlas', false), true)
  assert.equal(conversationViewWriteApplied({ status: 'ready', value: visible }, 'showAttackAtlas', false), false)
  assert.equal(conversationViewWriteApplied({ status: 'unavailable', value: hidden }, 'showAttackAtlas', false), false)
})

test('conversation view settings declare the page policy instead of registering a namespace', () => {
  // 0.2.0-rc.2 removed `settings.register` and `settingsNamespace`. What a
  // plugin does now is stop the Host from auto-rendering a page
  // (`configure({ auto: false })`), registered as an effect on an optional
  // `settings` injection so a Host without the service still boots.
  const injections = []
  const configurations = []
  const effects = []
  const fiber = { marker: 'owner-fiber' }
  const ctx = {
    fiber,
    inject(services, callback) {
      injections.push([...services])
      callback({
        effect(execute, label) {
          effects.push(label)
          return execute()
        },
        settings: {
          configure(presentation, owner) {
            configurations.push({ presentation, owner })
            return () => undefined
          },
        },
      })
    },
  }

  registerConversationViewSettings(ctx)

  assert.deepEqual(injections, [['settings']])
  assert.deepEqual(configurations, [{ presentation: { auto: false }, owner: fiber }])
  assert.deepEqual(effects, ['dsh-redteam-model: settings page policy'])
})

test('the page-policy effect returns the disposer the Host tears down with', () => {
  // The registration must be lazy: with no `settings` service the callback
  // never runs, so nothing to assert there. What matters is that the effect
  // hands the `configure()` disposer back to cordis so the policy is dropped
  // when the fiber unloads.
  const dispose = () => undefined
  const seen = []
  const ctx = {
    inject(_services, callback) {
      callback({
        effect(execute) {
          seen.push(execute())
          return undefined
        },
        settings: {
          configure(presentation, owner) {
            seen.push({ presentation, owner })
            return dispose
          },
        },
      })
    },
  }

  registerConversationViewSettings(ctx)

  assert.deepEqual(seen, [
    { presentation: { auto: false }, owner: undefined },
    dispose,
  ])
})
