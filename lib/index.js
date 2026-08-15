// dsh-plugin-collapsible-steps — host half.
//
// The collapse effect is entirely client-side, but its preference is a real
// user setting, so the host half registers a settings namespace for it. The
// browser half reads/writes `collapseByDefault` through the settings scope.

import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";

const name = "dsh-plugin-collapsible-steps";

/** Plugin configuration (also the settings-namespace schema). */
const Config = z.object({
  collapseByDefault: z.boolean().default(true)
    .description("Collapse consecutive tool/thinking steps by default."),
});

/**
 * Register the settings namespace so the browser half can read and persist the
 * `collapseByDefault` preference through the settings service.
 * @param {unknown} ctx - host cordis context.
 * @param {object} config - resolved plugin configuration (composition layer).
 */
function apply(ctx, config) {
  installSettingsSection(
    ctx,
    settingsNamespace("collapsible-steps"),
    Config,
    config ?? {},
    {
      setSource: () => {},
      onChange: () => {},
    },
  );
}

export { Config, apply, name };
