# dsh-plugin-collapsible-steps

<p align="center">
  <a href="https://github.com/mervyn-teo/dsh-plugin-collapsible-steps">
    <img src="assets/banner.png" alt="dsh-plugin-collapsible-steps banner — fold consecutive tool &amp; thinking steps into one bracket" width="100%">
  </a>
</p>

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web
plugin that folds every run of consecutive **tool calls and thinking steps**
between messages into a single `[N steps]` bracket. Click the bracket to
collapse the whole run into one line; click it again to expand it back. The
shipped conversation cards and markdown answers are left untouched — the
brackets are drawn around them, not instead of them.

## What it does

- Adds a **Collapse steps / Expand steps** control to the session header, and a
  `[▾ N steps]` bracket before every run of consecutive step nodes.
- Collapsing a bracket hides that run's rows (`display: none`, so no empty
  gaps are left behind) and turns the bracket into `[↕ N steps]`; clicking it
  restores the rows.
- A "step" is a `tool-call`, a `workflow-run`, or a thinking-only
  `assistant-step`; the final text answer and user messages act as group
  boundaries.
- The regular tool cards, reasoning sections, and markdown answer rendering
  all remain the shipped DSH ones.

## How it works

The slot system gives a plugin no way to wrap the shipped conversation cards,
so instead of replacing the step renderers this plugin annotates the shipped
DOM: it reads the conversation node order through the session hook, computes
the runs of consecutive steps, and inserts the bracket headers directly into
the existing flow (the node rows themselves are never moved, so the shipped
view keeps reconciling normally).

## Files

| File | Purpose |
| --- | --- |
| `lib/client.js` | Browser half — the header control, bracket insertion, and collapse state. |
| `lib/index.js` | Host half — no-op; the plugin is client-only. |
| `lib/invariant.js` | Invariant registration. |
| `cordis.patch.yml` | Composition patch that inserts the plugin row. |
| `package.json` | Package metadata (`dsh.bundle` + `dsh.client` manifest). |

## Install

```bash
dsh plugin --profile web add github:mervyn-teo/dsh-plugin-collapsible-steps
```

Then restart `dsh web` — host bundles load at boot.

## Requirements

- DSH with the base conversation UI (`@deepseek-ai/dsh-client-ui-conversation`)
  mounted — the plugin inserts brackets into its chat flow.

## License

[MIT](LICENSE)
