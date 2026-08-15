window.__ModuleLoader__.load({
  id: "dsh-plugin-collapsible-steps",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var React = require("react");

    // ── CSS ──
    var CSS = [
      ".dscs-bracket{display:flex;align-items:center;gap:6px;width:100%;background:none;border:none;cursor:pointer;padding:2px 0;color:var(--dsw-alias-label-secondary,#8b949e);font-size:12px;line-height:18px;text-align:left;font-family:inherit}",
      ".dscs-bracket:hover{color:var(--dsw-alias-label-primary,#e6edf3)}",
      ".dscs-bracket-open,.dscs-bracket-close{color:var(--dsw-alias-label-tertiary,#6e7681);font-family:var(--ds-font-family-code,monospace)}",
      ".dscs-arrow{display:inline-block;width:14px;text-align:center;color:var(--dsw-alias-label-tertiary,#6e7681)}",
      ".dscs-label{color:var(--dsw-alias-label-secondary,#8b949e)}",
      ".dscs-card{border-left:2px solid var(--dsw-alias-border-l2,#30363d);padding:0 0 0 10px;margin-left:5px;min-width:0}",
      ".dscs-tool{display:flex;align-items:center;gap:8px;min-width:0}",
      ".dscs-name{font-weight:600;color:var(--dsw-alias-label-primary,#e6edf3);font-family:var(--ds-font-family-code,monospace);font-size:12px}",
      ".dscs-status{font-size:11px;line-height:16px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,#21262d);color:var(--dsw-alias-label-secondary,#8b949e);white-space:nowrap}",
      ".dscs-status.error{color:var(--dsw-alias-state-error-primary,#f85149)}",
      ".dscs-sub{font-size:12px;color:var(--dsw-alias-label-tertiary,#6e7681)}",
      ".dscs-collapse{margin-top:4px}",
      ".dscs-collapse-toggle{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:2px 0;color:var(--dsw-alias-label-secondary,#8b949e);font-size:12px;font-family:inherit}",
      ".dscs-collapse-toggle:hover{color:var(--dsw-alias-label-primary,#e6edf3)}",
      ".dscs-collapse-body{margin-top:2px}",
      ".dscs-pre{margin:4px 0 0;padding:8px;background:var(--dsw-alias-markdown-code-block,#161b22);border-radius:6px;overflow:auto;font-family:var(--ds-font-family-code,monospace);font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary,#e6edf3);white-space:pre-wrap;word-break:break-word;max-height:40vh}",
      ".dscs-thinking{color:var(--dsw-alias-label-secondary,#8b949e);font-size:13px;line-height:20px;white-space:pre-wrap;word-break:break-word}",
      ".dscs-answer{min-width:0}",
      ".dscs-text{color:var(--dsw-alias-label-primary,#e6edf3);font-size:14px;line-height:22px;white-space:pre-wrap;word-break:break-word}",
      ".dscs-md{min-width:0}",
    ].join("");

    var cssTagId = "dsh-plugin-collapsible-steps/styles";
    if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="' + cssTagId + '"]') === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-plugin-collapsible-steps";
      tag.dataset.pluginCss = cssTagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    // ── Shared collapse state (one Map + a tiny subscription) ──
    var store = (function () {
      var collapsed = new Map();
      var listeners = new Set();
      return {
        get: function (k) { return collapsed.get(k) === true; },
        set: function (k, v) {
          collapsed.set(k, v);
          var ls = Array.from(listeners);
          for (var i = 0; i < ls.length; i++) ls[i]();
        },
        subscribe: function (l) {
          listeners.add(l);
          return function () { listeners.delete(l); };
        },
      };
    })();

    var EMPTY = [];

    function useCollapsed(key) {
      var bump = React.useState(0)[1];
      React.useEffect(function () {
        return store.subscribe(function () { bump(function (n) { return n + 1; }); });
      }, []);
      return store.get(key);
    }

    function hasTextBlock(node) {
      var blocks = node && node.data && node.data.blocks;
      if (!Array.isArray(blocks)) return false;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (b && b.kind === "text" && b.text && String(b.text).trim().length > 0) return true;
      }
      return false;
    }

    function isStep(node) {
      if (!node) return false;
      var k = node.kind;
      if (k === "tool-call" || k === "workflow-run") return true;
      if (k === "assistant-step") return !hasTextBlock(node);
      return false;
    }

    function blocksOfKind(node, kind) {
      var blocks = node && node.data && node.data.blocks;
      if (!Array.isArray(blocks)) return [];
      var out = [];
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (b && b.kind === kind && b.text != null) out.push(String(b.text));
      }
      return out;
    }

    function contentToText(content) {
      if (!Array.isArray(content)) return "";
      var parts = [];
      for (var i = 0; i < content.length; i++) {
        var b = content[i];
        if (b == null) continue;
        if (typeof b === "string") { parts.push(b); continue; }
        if (b.text != null) { parts.push(String(b.text)); continue; }
        try { parts.push(JSON.stringify(b)); } catch (e) { parts.push(String(b)); }
      }
      return parts.join("\n");
    }

    function truncate(text, max) {
      var s = String(text == null ? "" : text);
      if (s.length <= max) return s;
      return s.slice(0, max) + "\n… (truncated)";
    }

    function toolInfo(node) {
      var root = node && node.data && node.data.root;
      if (!root) return { name: "tool", status: "unknown", args: "", output: "", isError: false };
      if (root.kind === "tool-result") {
        var name = (root.call && root.call.name) || root.callId || "tool";
        var args = (root.call && root.call.argsRaw) || "";
        var output = contentToText(root.content);
        return { name: name, status: "done", args: args, output: output, isError: !!root.isError };
      }
      return { name: root.name || "tool", status: "running", args: root.argsRaw || "", output: "", isError: false };
    }

    function Collapsible(props) {
      var state = React.useState(props.defaultOpen === true);
      var open = state[0];
      var setOpen = state[1];
      return React.createElement("div", { className: "dscs-collapse" },
        React.createElement("button", { type: "button", className: "dscs-collapse-toggle", onClick: function () { setOpen(function (o) { return !o; }); } },
          React.createElement("span", { className: "dscs-arrow" }, open ? "▾" : "▸"),
          React.createElement("span", null, props.label),
        ),
        open ? React.createElement("div", { className: "dscs-collapse-body" }, props.children) : null,
      );
    }

    function renderMarkdownLite(text) {
      var seg = String(text == null ? "" : text).split("```");
      var parts = [];
      for (var i = 0; i < seg.length; i++) {
        if (i % 2 === 0) {
          if (seg[i] !== "") parts.push(React.createElement("div", { key: "t" + i, className: "dscs-text" }, seg[i]));
        } else {
          var code = seg[i];
          var nl = code.indexOf("\n");
          if (nl > 0 && code.slice(0, nl).trim().length <= 24) code = code.slice(nl + 1);
          parts.push(React.createElement("pre", { key: "c" + i, className: "dscs-pre" }, React.createElement("code", null, code)));
        }
      }
      return React.createElement("div", { className: "dscs-md" }, parts);
    }

    function renderToolCard(node) {
      var info = toolInfo(node);
      var children = [
        React.createElement("div", { key: "h", className: "dscs-tool" },
          React.createElement("span", { className: "dscs-name" }, info.name),
          React.createElement("span", { className: "dscs-status" + (info.isError ? " error" : " " + info.status) }, info.isError ? "error" : info.status),
        ),
      ];
      if (info.args) children.push(React.createElement(Collapsible, { key: "a", label: "input", defaultOpen: false }, React.createElement("pre", { className: "dscs-pre" }, truncate(info.args, 20000))));
      if (info.output) children.push(React.createElement(Collapsible, { key: "o", label: "output", defaultOpen: false }, React.createElement("pre", { className: "dscs-pre" }, truncate(info.output, 60000))));
      return React.createElement("div", { className: "dscs-card" }, children);
    }

    function renderWorkflowCard(node) {
      var d = (node && node.data) || {};
      var name = d.name || "workflow";
      var status = d.status || "running";
      var phases = Array.isArray(d.phases) ? d.phases : [];
      var members = 0;
      for (var i = 0; i < phases.length; i++) {
        var p = phases[i];
        if (p && Array.isArray(p.members)) members += p.members.length;
      }
      return React.createElement("div", { className: "dscs-card" },
        React.createElement("div", { className: "dscs-tool" },
          React.createElement("span", { className: "dscs-name" }, name),
          React.createElement("span", { className: "dscs-status " + status }, status),
        ),
        members > 0 ? React.createElement("div", { className: "dscs-sub" }, members + " members") : null,
      );
    }

    function renderThinking(node) {
      var reasoning = blocksOfKind(node, "reasoning").join("\n\n");
      return React.createElement("div", { className: "dscs-card" },
        React.createElement("div", { className: "dscs-tool" },
          React.createElement("span", { className: "dscs-name" }, "thinking"),
        ),
        reasoning ? React.createElement(Collapsible, { label: "reasoning", defaultOpen: false }, React.createElement("div", { className: "dscs-thinking" }, truncate(reasoning, 40000))) : null,
      );
    }

    function renderCard(node) {
      if (!node) return null;
      if (node.kind === "tool-call") return renderToolCard(node);
      if (node.kind === "workflow-run") return renderWorkflowCard(node);
      if (node.kind === "assistant-step") return renderThinking(node);
      return null;
    }

    function GroupedStep(props) {
      var node = props.node;
      var useSession = props.useSession;
      var order = useSession ? useSession(function (s) { return (s && s.chat ? s.chat.order : EMPTY); }) : EMPTY;
      var nodes = useSession ? useSession(function (s) { return (s && s.chat ? s.chat.nodes : null); }) : null;

      var idx = order.indexOf(node && node.key);
      var start = idx;
      var end = idx;
      if (idx >= 0 && nodes) {
        while (start > 0 && isStep(nodes.get(order[start - 1]))) start -= 1;
        while (end + 1 < order.length && isStep(nodes.get(order[end + 1]))) end += 1;
      }
      var len = Math.max(1, end - start + 1);
      var isFirst = start === idx;
      var groupKey = idx >= 0 ? order[start] : (node && node.key);
      var collapsed = useCollapsed(groupKey);

      var children = [];
      if (isFirst) {
        children.push(React.createElement("button", {
          key: "bracket", type: "button", className: "dscs-bracket",
          onClick: function () { store.set(groupKey, !collapsed); },
        },
          React.createElement("span", { className: "dscs-bracket-open" }, "["),
          React.createElement("span", { className: "dscs-arrow" }, collapsed ? "▸" : "▾"),
          React.createElement("span", { className: "dscs-label" }, len === 1 ? "1 step" : len + " steps"),
          React.createElement("span", { className: "dscs-bracket-close" }, "]"),
        ));
      }
      if (!collapsed) {
        var card = renderCard(node);
        if (card) children.push(React.createElement("div", { key: "card" }, card));
      }
      return children.length ? children : null;
    }

    function AnswerView(props) {
      var node = props.node;
      var reasoning = blocksOfKind(node, "reasoning").join("\n\n");
      var text = blocksOfKind(node, "text").join("\n\n");
      var children = [];
      if (reasoning) children.push(React.createElement(Collapsible, { key: "r", label: "thinking", defaultOpen: false }, React.createElement("div", { className: "dscs-thinking" }, truncate(reasoning, 40000))));
      if (text) children.push(React.createElement("div", { key: "t" }, renderMarkdownLite(text)));
      if (children.length === 0) return React.createElement("div", { className: "dscs-card" }, React.createElement("div", { className: "dscs-sub" }, "(assistant)"));
      return React.createElement("div", { className: "dscs-answer" }, children);
    }

    function AssistantNodeView(props) {
      if (hasTextBlock(props.node)) return React.createElement(AnswerView, props);
      return React.createElement(GroupedStep, props);
    }

    function ToolNodeView(props) {
      return React.createElement(GroupedStep, props);
    }

    // ── Plugin registration ──
    var inject = ["slots"];

    function apply(ctx) {
      var register = function (key, component) {
        ctx.slots.inject("conversation.chat.node", function () {
          return ctx.slots.register({ name: "conversation.chat.node", key: key, priority: -1 }, component);
        });
      };
      register("tool-call", ToolNodeView);
      register("workflow-run", ToolNodeView);
      register("assistant-step", AssistantNodeView);
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
