# dsh-plugin-collapsible-steps

<p align="center">
  <a href="https://github.com/mervyn-teo/dsh-plugin-collapsible-steps">
    <img src="assets/banner.png" alt="dsh-plugin-collapsible-steps banner — fold consecutive tool &amp; thinking steps into one bracket" width="100%">
  </a>
</p>

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web
plugin that folds every run of consecutive **tool calls and thinking steps**
between messages into a single `[N steps]` bracket. Click the bracket to
collapse the whole run into one line; click it again to expand it back. Each
card keeps its own collapsible `input` / `output` / `reasoning` sections, so the
steps collapse "once more" on top of their own per-card collapse.

## What it does

- Registers collapse-aware renderers for `tool-call`, `workflow-run`, and
  thinking-only `assistant-step` conversation nodes (via the
  `conversation.chat.node` keyed slot).
- Groups a maximal run of consecutive step nodes into one bracket:
  `[▾ N steps]` when expanded, `[▸ N steps]` when collapsed.
- Collapsing hides every step in the run; expanding restores them.
- The final assistant answer and user messages stay visible as group
  boundaries.

## Files

| File | Purpose |
| --- | --- |
| `lib/client.js` | Browser half — the bracket UI, collapse state, and the step renderers. |
| `lib/index.js` | Host half — no-op; the plugin is client-only. |
| `lib/invariant.js` | Invariant registration. |
| `cordis.patch.yml` | Composition patch that inserts the plugin row. |
| `package.json` | Package metadata (`dsh.bundle` + `dsh.client` manifest). |

## Install

```bash
dsh plugin --profile web add github:mervyn-teo/dsh-plugin-collapsible-steps
```

Then restart `dsh web` — host bundles load at boot.

## Tradeoffs

The slot system offers a plugin no way to wrap the shipped conversation cards
while also grouping them, so taking over the group means taking over those
nodes' rendering:

- Tool cards render as compact summaries (name + status + collapsible
  input/output) instead of the rich per-tool views (diffs, images).
- The assistant answer is rendered as plain text with fenced code blocks
  preserved; rich markdown (bold, inline code, lists, tables) is not rendered,
  and reasoning shows as a collapsed "thinking" section.

These are intentional: they keep the group-collapse feature self-contained and
the answer text intact.

## Requirements

- DSH with the base conversation UI (`@deepseek-ai/dsh-client-ui-conversation`)
  mounted — the plugin registers into its `conversation.chat.node` slot.

## License

[MIT](LICENSE)
