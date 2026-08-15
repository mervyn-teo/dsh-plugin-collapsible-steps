// dsh-plugin-collapsible-steps — host half.
//
// This plugin is purely a browser conversation-view effect: the bracket and
// the collapse logic live in lib/client.js, which shadows the `tool-call`,
// `workflow-run`, and `assistant-step` renderers of `conversation.chat.node`.
// The host half therefore only declares the plugin name and a no-op `apply`;
// nothing needs to run in the DSH Node process.

const name = "dsh-plugin-collapsible-steps";

/**
 * No-op host apply. The bundle is loaded for its client half, which does all
 * of the work in the browser.
 * @param {unknown} ctx - host cordis context (unused).
 */
function apply(ctx) {
  // Intentionally empty.
}

export { apply, name };
