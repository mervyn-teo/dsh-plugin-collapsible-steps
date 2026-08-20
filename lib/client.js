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
      ".dscs-sign{display:inline-block;width:16px;text-align:center;color:var(--dsw-alias-label-tertiary,#6e7681);font-family:var(--ds-font-family-code,monospace);font-size:13px;line-height:18px}",
      ".dscs-label{color:var(--dsw-alias-label-secondary,#8b949e)}",
      ".dscs-header-toggle{border:1px solid var(--dsw-alias-border-l2,#30363d);background:none;color:var(--dsw-alias-label-secondary,#8b949e);font:inherit;font-size:12px;line-height:18px;cursor:pointer;border-radius:999px;padding:3px 10px}",
      ".dscs-header-toggle:hover{color:var(--dsw-alias-label-primary,#e6edf3);background:var(--dsw-alias-interactive-bg-hover,#21262d)}",
      ".dscs-settings-card{border:1px solid var(--dsw-alias-border-l2,#30363d);background:var(--dsw-alias-bg-layer-3,#161b22);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}",
      ".dscs-settings-card:hover{border-color:var(--dsw-alias-label-dimmed,#8b949e)}",
      ".dscs-settings-card-open{background:var(--dsw-alias-bg-layer-2,#0d1117);border-color:var(--dsw-alias-label-dimmed,#8b949e)}",
      ".dscs-settings-header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}",
      ".dscs-settings-headtext{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}",
      ".dscs-settings-name{color:var(--dsw-alias-label-primary,#e6edf3);font-size:15px;font-weight:600;line-height:1.4}",
      ".dscs-settings-desc{color:var(--dsw-alias-label-tertiary,#6e7681);font-size:13px;line-height:1.5}",
      ".dscs-settings-body{border-top:1px solid var(--dsw-alias-border-l2,#30363d);margin:0 16px;padding:10px 0 14px}",
      ".dscs-settings-row{align-items:center;gap:10px;padding:6px 0;display:flex}",
      ".dscs-settings-row input{accent-color:var(--dsw-alias-brand-primary,#2563eb)}",
      ".dscs-settings-row span{color:var(--dsw-alias-label-secondary,#8b949e);font-size:13px;line-height:1.5}",
    ].join("");

    var cssTagId = "dsh-plugin-collapsible-steps/styles";
    if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="' + cssTagId + '"]') === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-plugin-collapsible-steps";
      tag.dataset.pluginCss = cssTagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    var EMPTY = [];

    // Latest computed groups (kept so a DOM-driven re-sync always uses fresh data).
    var currentGroups = [];
    var syncScheduled = false;

    // Default collapse state for groups the user has not explicitly toggled.
    // Updated from the `collapseByDefault` settings preference when available.
    var defaultCollapsed = true;

    // ── Shared collapse state (per group key) ──
    var collapseStore = (function () {
      var collapsed = new Map();
      var listeners = new Set();
      return {
        get: function (k) {
          if (collapsed.has(k)) return collapsed.get(k) === true;
          return defaultCollapsed;
        },
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

    // ── Node classification ──
    // Everything that renders as a collapsible card is a "step"; the durable
    // message/text rows are group boundaries.
    var BOUNDARY_KINDS = {
      "user": true,
      "steering": true,
      "turn-tail": true,
      "turn-error": true,
      "turn-max-tokens": true,
      "unknown": true,
    };

    function hasReasoningBlock(node) {
      var blocks = node && node.data && node.data.blocks;
      if (!Array.isArray(blocks)) return false;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (b && b.kind === "reasoning" && b.text && String(b.text).trim().length > 0) return true;
      }
      return false;
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

    // A "step" is any collapsible-card row. An assistant message counts as a
    // step when it carries a "Think" (reasoning) disclosure — its answer text
    // stays the always-visible boundary.
    function isStep(node) {
      if (!node) return false;
      var k = node.kind;
      if (k === "assistant-step") return hasReasoningBlock(node);
      return !BOUNDARY_KINDS[k];
    }

    // How a step row should be hidden when collapsed: "think" hides only the
    // reasoning disclosure (the answer text stays); "row" hides the whole row
    // (tool cards and thinking-only assistant steps).
    function targetMode(node) {
      if (node && node.kind === "assistant-step" && hasTextBlock(node)) return "think";
      return "row";
    }

    // ── Group runs of consecutive step nodes (only runs of 2+) ──
    function computeGroups(order, nodes) {
      var groups = [];
      if (!order || !nodes) return groups;
      var lastKey = order[order.length - 1];
      var i = 0;
      while (i < order.length) {
        var key = order[i];
        var node = nodes.get(key);
        if (isStep(node)) {
          var keys = [key];
          var modes = [targetMode(node)];
          var j = i + 1;
          while (j < order.length && isStep(nodes.get(order[j]))) {
            keys.push(order[j]);
            modes.push(targetMode(nodes.get(order[j])));
            j++;
          }
          if (keys.length >= 2) groups.push({ key: key, keys: keys, modes: modes, trailing: keys[keys.length - 1] === lastKey });
          i = j;
        } else {
          i++;
        }
      }
      return groups;
    }

    // ── Build the header (sign + "N steps", no brackets) ──
    function buildHeader(header, count, collapsed) {
      header.textContent = "";
      var sign = document.createElement("span");
      sign.className = "dscs-sign";
      sign.textContent = collapsed ? "+" : "-";
      var label = document.createElement("span");
      label.className = "dscs-label";
      label.textContent = count + (count === 1 ? " step" : " steps");
      header.appendChild(sign);
      header.appendChild(label);
    }

    // ── Reconcile the DOM with the current groups + collapse state ──
    // Flow items are never moved (so React keeps reconciling normally); we only
    // insert/remove headers and toggle `display` on the step elements. When a
    // group is collapsed, every step but the most recent one is hidden.
    function sync(groups) {
      var column = document.querySelector('[data-chat-flow]');
      if (!column) return;

      var oldHeaders = column.querySelectorAll('[data-dscs-bracket]');
      for (var i = 0; i < oldHeaders.length; i++) oldHeaders[i].remove();

      var hidden = column.querySelectorAll('[data-dscs-hidden]');
      for (var j = 0; j < hidden.length; j++) {
        hidden[j].removeAttribute("data-dscs-hidden");
        hidden[j].style.display = "";
      }

      var flowItems = column.querySelectorAll('[data-chat-flow-key]');
      var byKey = new Map();
      for (var m = 0; m < flowItems.length; m++) {
        byKey.set(flowItems[m].getAttribute("data-chat-flow-key"), flowItems[m]);
      }

      for (var g = 0; g < groups.length; g++) {
        var group = groups[g];
        var first = byKey.get(group.keys[0]);
        if (!first) continue;
        var isCollapsed = collapseStore.get(group.key);
        var lastIndex = group.keys.length - 1;
        var keepLast = isCollapsed && group.trailing === true;

        var header = document.createElement("button");
        header.type = "button";
        header.className = "dscs-bracket";
        header.setAttribute("data-dscs-bracket", group.key);
        buildHeader(header, group.keys.length, isCollapsed);
        (function (gk) {
          header.addEventListener("click", function () {
            collapseStore.set(gk, !collapseStore.get(gk));
          });
        })(group.key);
        first.parentNode.insertBefore(header, first);

        for (var k = 0; k < group.keys.length; k++) {
          var el = byKey.get(group.keys[k]);
          if (!el) continue;
          var mode = group.modes ? group.modes[k] : "row";
          var target = mode === "think" ? el.querySelector('[data-variant="think"]') : el;
          if (!target) continue;
          var hide = isCollapsed && !(keepLast && k === lastIndex);
          if (hide) {
            target.style.display = "none";
            target.setAttribute("data-dscs-hidden", "");
          }
        }
      }
    }

    // Debounced re-sync (runs after the browser has committed DOM changes).
    function scheduleSync() {
      if (syncScheduled) return;
      syncScheduled = true;
      requestAnimationFrame(function () {
        syncScheduled = false;
        sync(currentGroups);
      });
    }

    // ── The header control + DOM wiring ──
    function StepCollapser(props) {
      var useSession = props.useSession;

      var order = useSession(function (s) { return (s && s.chat ? s.chat.order : EMPTY); });
      var nodes = useSession(function (s) { return (s && s.chat ? s.chat.nodes : null); });
      var stepSig = useSession(function (s) {
        if (!s || !s.chat) return "";
        var ord = s.chat.order;
        var nd = s.chat.nodes;
        var parts = [];
        for (var i = 0; i < ord.length; i++) {
          var node = nd.get(ord[i]);
          if (!isStep(node)) parts.push("0");
          else parts.push(targetMode(node) === "think" ? "t" : "1");
        }
        return parts.join("");
      });

      var groups = React.useMemo(function () { return computeGroups(order, nodes); }, [order, nodes, stepSig]);
      currentGroups = groups;

      var version = React.useState(0);
      var bump = version[1];
      React.useEffect(function () {
        return collapseStore.subscribe(function () { bump(function (n) { return n + 1; }); });
      }, []);

      // Re-apply collapse whenever the shipped flow adds or removes a node row
      // (React commits the row separately from this component's own re-render).
      React.useEffect(function () {
        var observer = new MutationObserver(function (mutations) {
          var relevant = false;
          for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            var nodes = m.addedNodes.length ? m.addedNodes : m.removedNodes;
            for (var j = 0; j < nodes.length; j++) {
              var n = nodes[j];
              if (n && n.nodeType === 1) {
                if (n.hasAttribute && n.hasAttribute("data-chat-flow-key")) { relevant = true; break; }
                if (n.querySelector && n.querySelector("[data-chat-flow-key]")) { relevant = true; break; }
              }
            }
            if (relevant) break;
          }
          if (relevant) scheduleSync();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return function () { observer.disconnect(); };
      }, []);

      React.useLayoutEffect(function () {
        sync(groups);
        return function () {
          var col = document.querySelector('[data-chat-flow]');
          if (col) {
            var hs = col.querySelectorAll('[data-dscs-bracket]');
            for (var i = 0; i < hs.length; i++) hs[i].remove();
            var st = col.querySelectorAll('[data-dscs-hidden]');
            for (var j = 0; j < st.length; j++) {
              st[j].removeAttribute("data-dscs-hidden");
              st[j].style.display = "";
            }
          }
        };
      }, [groups, version[0]]);

      var allCollapsed = groups.length > 0;
      for (var g = 0; g < groups.length; g++) {
        if (!collapseStore.get(groups[g].key)) { allCollapsed = false; break; }
      }

      return React.createElement("button", {
        type: "button",
        className: "dscs-header-toggle",
        onClick: function () {
          var target = !allCollapsed;
          for (var g = 0; g < groups.length; g++) collapseStore.set(groups[g].key, target);
        },
      }, allCollapsed ? "Expand steps" : "Collapse steps");
    }

    // ── Settings card (Plugins → Plugin configuration) ──
    function CollapsibleStepsCard() {
      var state = React.useState({ status: "loading", value: true, writable: true });
      var open = React.useState(false);

      var reload = function () {
        fetch("/__collapse-steps/config")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var v = data.collapseByDefault !== false;
            defaultCollapsed = v;
            state[1]({ status: "ready", value: v, writable: true });
            scheduleSync();
          })
          .catch(function () {
            state[1](function (s) { return { status: "unavailable", value: s.value, writable: false }; });
          });
      };

      React.useEffect(function () { reload(); }, []);

      if (state[0].status === "unavailable") return null;

      var value = state[0].value;
      var writable = state[0].status === "ready" && state[0].writable !== false;

      return React.createElement("li", { className: "dscs-settings-card" + (open[0] ? " dscs-settings-card-open" : "") },
        React.createElement("button", { type: "button", className: "dscs-settings-header", onClick: function () { open[1](!open[0]); } },
          React.createElement("span", { className: "dscs-settings-headtext" },
            React.createElement("span", { className: "dscs-settings-name" }, "Collapsible steps"),
            React.createElement("span", { className: "dscs-settings-desc" }, "Fold consecutive tool & thinking steps into one row."),
          ),
        ),
        open[0] ? React.createElement("div", { className: "dscs-settings-body" },
          React.createElement("label", { className: "dscs-settings-row" },
            React.createElement("input", {
              type: "checkbox",
              checked: value,
              disabled: !writable,
              onChange: function (e) {
                var v = e.target.checked;
                state[1](function (s) { return { status: s.status, value: v, writable: s.writable }; });
                defaultCollapsed = v;
                scheduleSync();
                fetch("/__collapse-steps/config", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ collapseByDefault: v }),
                }).catch(function () {});
              },
            }),
            React.createElement("span", null, "Collapse items by default"),
          ),
        ) : null,
      );
    }

    // ── Plugin registration ──
    var inject = ["slots"];

    function apply(ctx) {
      ctx.slots.inject("conversation.session.header.actions", function () {
        return ctx.slots.register(
          { name: "conversation.session.header.actions", id: "collapsible-steps", order: 100, label: "Collapse steps" },
          StepCollapser
        );
      });

      // Load the persisted default (best-effort; falls back to `true`).
      fetch("/__collapse-steps/config")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (typeof data.collapseByDefault === "boolean") {
            defaultCollapsed = data.collapseByDefault;
            scheduleSync();
          }
        })
        .catch(function () {});

      // Settings card (Plugins → Plugin configuration). The slot was a list
      // through rc.6 and became keyed in rc.7: the old form throws on rc.7+,
      // the new form throws on rc.6, so carry both and let each host read the
      // field it knows. The key resolves against the `collapsible-steps`
      // settings namespace registered in lib/index.js.
      ctx.slots.inject("settings.plugin.item", function () {
        return ctx.slots.register(
          { name: "settings.plugin.item", id: "collapsible-steps", key: "collapsible-steps", order: 100, label: "Collapsible steps" },
          CollapsibleStepsCard
        );
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
