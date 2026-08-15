window.__ModuleLoader__.load({
  id: "dsh-plugin-collapsible-steps",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var React = require("react");

    // ── CSS ──
    // The bracket headers are inserted into the shipped conversation flow
    // (which keeps its own regular tool / assistant cards); the step rows get
    // a thin left gutter so a group reads as one bracketed block.
    var CSS = [
      ".dscs-bracket{display:flex;align-items:center;gap:5px;width:100%;background:none;border:none;cursor:pointer;padding:2px 0;color:var(--dsw-alias-label-secondary,#8b949e);font-size:12px;line-height:18px;text-align:left;font-family:inherit}",
      ".dscs-bracket:hover{color:var(--dsw-alias-label-primary,#e6edf3)}",
      ".dscs-bracket-open,.dscs-bracket-close{color:var(--dsw-alias-label-tertiary,#6e7681);font-family:var(--ds-font-family-code,monospace)}",
      ".dscs-arrow{display:inline-block;width:16px;text-align:center;color:var(--dsw-alias-label-tertiary,#6e7681)}",
      ".dscs-label{color:var(--dsw-alias-label-secondary,#8b949e)}",
      "[data-dscs-step]{border-left:2px solid var(--dsw-alias-border-l2,#30363d);padding-left:10px}",
      ".dscs-header-toggle{border:1px solid var(--dsw-alias-border-l2,#30363d);background:none;color:var(--dsw-alias-label-secondary,#8b949e);font:inherit;font-size:12px;line-height:18px;cursor:pointer;border-radius:999px;padding:3px 10px}",
      ".dscs-header-toggle:hover{color:var(--dsw-alias-label-primary,#e6edf3);background:var(--dsw-alias-interactive-bg-hover,#21262d)}",
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

    // ── Shared collapse state (per group key) ──
    var collapseStore = (function () {
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

    // ── Node classification (mirrors the shipped conversation semantics) ──
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

    // ── Group runs of consecutive step nodes ──
    function computeGroups(order, nodes) {
      var groups = [];
      if (!order || !nodes) return groups;
      var i = 0;
      while (i < order.length) {
        var key = order[i];
        if (isStep(nodes.get(key))) {
          var keys = [key];
          var j = i + 1;
          while (j < order.length && isStep(nodes.get(order[j]))) {
            keys.push(order[j]);
            j++;
          }
          groups.push({ key: key, keys: keys });
          i = j;
        } else {
          i++;
        }
      }
      return groups;
    }

    // ── Build the bracket header button ──
    function buildHeader(header, count, collapsed) {
      header.textContent = "";
      var open = document.createElement("span");
      open.className = "dscs-bracket-open";
      open.textContent = "[";
      var arrow = document.createElement("span");
      arrow.className = "dscs-arrow";
      arrow.textContent = collapsed ? "↕" : "▾";
      var label = document.createElement("span");
      label.className = "dscs-label";
      label.textContent = count + (count === 1 ? " step" : " steps");
      var close = document.createElement("span");
      close.className = "dscs-bracket-close";
      close.textContent = "]";
      header.appendChild(open);
      header.appendChild(arrow);
      header.appendChild(label);
      header.appendChild(close);
    }

    // ── Reconcile the DOM with the current groups + collapse state ──
    // Flow items are never moved (so React's own reconciliation keeps working);
    // we only insert/remove bracket headers and toggle `display` on step rows.
    function sync(groups) {
      var column = document.querySelector('[data-chat-flow]');
      if (!column) return;

      var oldHeaders = column.querySelectorAll('[data-dscs-bracket]');
      for (var i = 0; i < oldHeaders.length; i++) oldHeaders[i].remove();

      var stepRows = column.querySelectorAll('[data-dscs-step]');
      for (var j = 0; j < stepRows.length; j++) {
        stepRows[j].removeAttribute("data-dscs-step");
        stepRows[j].style.display = "";
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
          el.setAttribute("data-dscs-step", "");
          if (isCollapsed) el.style.display = "none";
        }
      }
    }

    // ── The header control + DOM wiring ──
    function StepCollapser(props) {
      var useSession = props.useSession;

      var order = useSession(function (s) { return (s && s.chat ? s.chat.order : EMPTY); });
      var nodes = useSession(function (s) { return (s && s.chat ? s.chat.nodes : null); });
      // Re-select whenever the step/boundary classification of any node changes
      // (e.g. a streaming thinking step turns into the final answer).
      var stepSig = useSession(function (s) {
        if (!s || !s.chat) return "";
        var ord = s.chat.order;
        var nd = s.chat.nodes;
        var parts = [];
        for (var i = 0; i < ord.length; i++) {
          parts.push(isStep(nd.get(ord[i])) ? "1" : "0");
        }
        return parts.join("");
      });

      var groups = React.useMemo(function () { return computeGroups(order, nodes); }, [order, nodes, stepSig]);

      var version = React.useState(0);
      var bump = version[1];
      React.useEffect(function () {
        return collapseStore.subscribe(function () { bump(function (n) { return n + 1; }); });
      }, []);

      React.useLayoutEffect(function () {
        sync(groups);
        return function () {
          var col = document.querySelector('[data-chat-flow]');
          if (col) {
            var hs = col.querySelectorAll('[data-dscs-bracket]');
            for (var i = 0; i < hs.length; i++) hs[i].remove();
            var st = col.querySelectorAll('[data-dscs-step]');
            for (var j = 0; j < st.length; j++) {
              st[j].removeAttribute("data-dscs-step");
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

    // ── Plugin registration ──
    var inject = ["slots"];

    function apply(ctx) {
      ctx.slots.inject("conversation.session.header.actions", function () {
        return ctx.slots.register(
          { name: "conversation.session.header.actions", id: "collapsible-steps", order: 100, label: "Collapse steps" },
          StepCollapser
        );
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
