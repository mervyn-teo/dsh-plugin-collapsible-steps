// dsh-plugin-collapsible-steps — host half.
//
// The collapse effect is client-side, but its "collapse by default" preference
// is a real user setting. rc.6 does not let external plugins expose their own
// settings namespaces through the standard settings RPC, so — like
// dsh-plugin-qr-connect — this host half serves a small same-origin config
// route the browser half reads/writes, and persists the value through the
// settings service so it survives restarts.

import z from "@deepseek-ai/schemastery";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";

const name = "dsh-plugin-collapsible-steps";
const NS = settingsNamespace("collapsible-steps");

/** Plugin configuration (also the settings-namespace schema). */
const Config = z.object({
  collapseByDefault: z.boolean().default(true)
    .description("Collapse consecutive tool/thinking steps by default."),
});

/**
 * Register the settings namespace and serve /__collapse-steps/config.
 * @param {unknown} ctx - host cordis context.
 * @param {object} config - resolved plugin configuration (composition layer).
 */
function apply(ctx, config) {
  const base = config ?? {};
  let scope = null;

  ctx.inject(["settings"], (sctx) => {
    scope = sctx.settings.register(NS, Config, { base });
  });

  ctx.inject(["webServer"], (deps) => {
    deps.effect(() => {
      const ws = deps.webServer;
      const json = (res, code, data) => {
        res.writeHead(code, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };
      const readBody = async (req) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { return {}; }
      };
      const dispose = ws.register({
        kind: "exact",
        path: "/__collapse-steps/config",
        handler: async (req, res) => {
          if (req.method === "POST") {
            const body = await readBody(req);
            if (scope !== null && typeof body.collapseByDefault === "boolean") {
              try { await scope.update({ collapseByDefault: body.collapseByDefault }); } catch { /* keep last good value */ }
            }
          }
          const value = scope !== null ? scope.get() : base;
          json(res, 200, { collapseByDefault: (value && value.collapseByDefault) !== false });
        },
      });
      return () => { dispose(); };
    }, name + ": config route");
  });
}

export { Config, apply, name };
