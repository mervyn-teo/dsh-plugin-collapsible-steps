# dsh-plugin-collapsible-steps

<p align="center">
  <a href="https://github.com/mervyn-teo/dsh-plugin-collapsible-steps">
    <img src="assets/banner.png" alt="dsh-plugin-collapsible-steps 横幅 — 把连续的卡片步骤折叠成一行" width="100%">
  </a>
</p>

[English](README.md) | 中文

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）Web
插件，把消息之间每一段连续的可折叠卡片步骤折叠成一行 `+ N steps`。点击该行可折叠整段
（仅保留最近一步），再次点击即可展开。原有的会话卡片与 Markdown 回答保持不变 ——
本插件只是对行做标注，从不替换它们。

## 功能

- 在会话头部加入 **Collapse steps / Expand steps** 控件，并在每一段连续步骤前插入
  `- N steps` 行。
- 折叠该行会隐藏这一段的所有行（`display: none`，不会留下空隙），仅保留最近一步，
  显示在 `+ N steps` 下方；点击 `+` 即可重新展开。
- 这里的“步骤”指任何可折叠卡片行 —— `tool-call`、`workflow-run`、`command`、
  `command-input`、`compaction`、`context`（上下文注入）、`manual-compaction`、
  `model-retry`，以及助手消息里的 `Think`（推理）折叠区。最终的文本回答、用户/steering
  消息以及回合提示作为分组边界。
- 常规工具卡片、推理区与 Markdown 回答渲染都保持 DSH 原样。
- 设置 → 插件里的 **Collapsible steps** 卡片可控制步骤是否默认折叠。

## 设置

插件注册了一个 `collapsible-steps` 设置命名空间，仅含一个选项：

- `collapseByDefault`（布尔值，默认 `true`）—— 默认折叠步骤段。关闭后，步骤段会保持
  展开，直到你手动折叠它们。

## 原理

槽位系统不允许插件“包裹”已有的会话卡片，因此本插件并不替换步骤渲染器，而是对现有 DOM
做标注：它通过会话 hook 读取会话节点顺序，计算连续的步骤段，并直接在已有流程中插入
折叠头（节点行本身从不移动，因此原有视图仍能正常协调更新）。

## 文件

| 文件 | 用途 |
| --- | --- |
| `lib/client.js` | 浏览器端 —— 头部控件、折叠头插入、折叠状态以及设置卡片。 |
| `lib/index.js` | 主机端 —— 注册 `collapsible-steps` 设置命名空间并暴露配置路由。 |
| `lib/invariant.js` | 不变量注册。 |
| `cordis.patch.yml` | 插入插件行及其默认配置的组合补丁。 |
| `package.json` | 包元数据（`dsh.bundle` + `dsh.client` 清单）。 |

## 安装

```bash
dsh plugin --profile web add github:mervyn-teo/dsh-plugin-collapsible-steps
```

随后重启 `dsh web` —— 主机端 bundle 在启动时加载。

## 依赖要求

- 已挂载基础会话 UI（`@deepseek-ai/dsh-client-ui-conversation`）的 DSH ——
  插件会在其聊天流程中插入折叠头。

## 许可证

[MIT](LICENSE)
