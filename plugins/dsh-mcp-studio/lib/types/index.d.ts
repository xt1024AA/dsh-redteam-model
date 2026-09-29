/** Host plugin: owns the `dsh-mcp-studio` settings namespace, mounts one mcp-client per enabled row (hot-swap on edit, dispose on remove), and serves live status aggregated from the tool registry over the plugin's loopback channel. */
import type { Context } from '@deepseek-ai/cordis';
import { type StudioSection } from './types.ts';
export declare const name = "dsh-mcp-studio";
export declare const inject: string[];
/**
 * Settings namespace owned by this plugin. Since DSH 0.2.0-rc.2 a namespace is
 * the profile Loader **entry id**, not a free-form slug, so it must equal the
 * id declared in this plugin's `cordis.patch.yml` — `describe()` matches on
 * `entry.options.id` and would never find a bare `mcp-studio`.
 */
export declare const STUDIO_SETTINGS_NAMESPACE = "dsh-mcp-studio";
export declare function apply(ctx: Context, config: StudioSection): void;
