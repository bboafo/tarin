/* TARIN — shared helpers and the line chart every page uses. No dependencies. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var ROOT = document.body.getAttribute("data-root") || "";

  var T = {};
  T.ROOT = ROOT;
  T.MONTHS = MONTHS;

  T.json = function (path) {
    return fetch(ROOT + path).then(function (r) {
      if (!r.ok) throw new Error(path + ": " + r.status);
      return r.json();
    });
  };
  T.monthLabel = function (p) { return MONTHS[+p.slice(5, 7) - 1] + " " + p.slice(0, 4); };
  /* any period: "2026-04" (month), "2026-Q1" (quarter) or "2025" (year) */
  T.freqOf = function (p) { return p.length === 4 ? "a" : p.charAt(5) === "Q" ? "q" : "m"; };
  T.periodLabel = function (p) {
    var f = T.freqOf(p);
    return f === "m" ? T.monthLabel(p) : f === "q" ? p.slice(5) + " " + p.slice(0, 4) : p;
  };
  T.perYear = { m: 12, q: 4, a: 1 };
  T.pIndex = function (p) {
    var f = T.freqOf(p), y = +p.slice(0, 4);
    return f === "m" ? y * 12 + +p.slice(5, 7) - 1 : f === "q" ? y * 4 + +p.slice(6) - 1 : y;
  };
  T.pAt = function (f, k) {
    if (f === "m") return T.periodAt(k);
    if (f === "q") return Math.floor(k / 4) + "-Q" + (k % 4 + 1);
    return String(k);
  };
  T.monthIndex = function (p) { return +p.slice(0, 4) * 12 + +p.slice(5, 7) - 1; };
  T.periodAt = function (k) { return Math.floor(k / 12) + "-" + String(k % 12 + 1).padStart(2, "0"); };
  T.months = function (a, b) {
    var out = [], k = T.monthIndex(a), e = T.monthIndex(b);
    for (; k <= e; k++) out.push(T.periodAt(k));
    return out;
  };
  T.fmt = function (v, d, unit) {
    if (v == null || isNaN(v)) return "–";
    var s = Number(v).toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
    if (v < 0) s = "−" + s.replace("-", "");
    return s + (unit || "");
  };
  T.int = function (v) { return Number(v).toLocaleString("en-GB"); };
  /* big numbers made readable: 1,138.5bn, 29.3m; small ones as they are */
  T.compact = function (v, d) {
    if (v == null || isNaN(v)) return "–";
    var a = Math.abs(v);
    if (a >= 1e9) return T.fmt(v / 1e9, a >= 1e11 ? 0 : a >= 1e10 ? 1 : 2) + "bn";
    if (a >= 1e6) return T.fmt(v / 1e6, a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2) + "m";
    return T.fmt(v, d != null ? d : a >= 1e4 ? 0 : a >= 100 ? 1 : 2);
  };
  T.el = function (tag, attrs, style) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (style) e.setAttribute("style", style);
    return e;
  };
  T.text = function (parent, x, y, s, cls, anchor) {
    var t = T.el("text", { x: x, y: y, "text-anchor": anchor || "start" });
    if (cls) t.setAttribute("class", cls);
    t.textContent = s;
    parent.appendChild(t);
    return t;
  };
  T.plotWidth = function (host) { return Math.max(280, Math.floor(host.getBoundingClientRect().width - 24)); };
  T.niceTicks = function (lo, hi, count) {
    var span = hi - lo || 1, raw = span / (count || 5);
    var mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
    var step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
    for (var v = a; v <= b + step / 2; v += step) out.push(+v.toFixed(10));
    return { ticks: out, lo: a, hi: b, step: step };
  };

  /* ---------- tooltip ---------- */
  T.tip = function (host) {
    var t = document.createElement("div");
    t.className = "tip"; t.hidden = true; host.appendChild(t);
    return t;
  };
  T.fillTip = function (tip, title, rows, note) {
    tip.textContent = "";
    var h = document.createElement("div"); h.className = "t-date"; h.textContent = title; tip.appendChild(h);
    rows.forEach(function (r) {
      var row = document.createElement("div"); row.className = "t-row";
      var k = document.createElement("span"); k.className = "k";
      if (r.color) { var sw = document.createElement("i"); sw.className = "key-line"; sw.style.background = r.color; k.appendChild(sw); }
      k.appendChild(document.createTextNode(r.name));
      var v = document.createElement("strong"); v.textContent = r.value;
      row.appendChild(k); row.appendChild(v); tip.appendChild(row);
      if (r.note) { var n = document.createElement("div"); n.className = "t-note"; n.textContent = r.note; tip.appendChild(n); }
    });
    if (note) { var nn = document.createElement("div"); nn.className = "t-note"; nn.textContent = note; tip.appendChild(nn); }
  };
  T.placeTip = function (host, svg, W, tip, sx, sy) {
    var hr = host.getBoundingClientRect(), sr = svg.getBoundingClientRect(), k = sr.width / W;
    var px = sr.left - hr.left + sx * k, py = sr.top - hr.top + sy * k;
    tip.hidden = false;
    var hw = host.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    var left = px + 16; if (left + tw > hw - 4) left = px - tw - 16; if (left < 4) left = 4;
    tip.style.left = left + "px"; tip.style.top = Math.max(4, py - th / 2) + "px";
  };

  /* ---------- line chart ----------
     cfg.labels   periods, one per x position
     cfg.series   [{values, color, name, endName?, quiet?, held?: {i: [rules]}}]
     cfg.yMin/yMax/yStep optional; computed from data if absent
     cfg.band     {lo:[], hi:[]} optional shaded band
     cfg.tipRows(i) optional; default lists each non-quiet series
     cfg.fmt(v)   value formatter for tips and end labels */
  T.lineChart = function (host, cfg) {
    var old = host.querySelector("svg"); if (old) old.remove();
    var oldTip = host.querySelector(".tip"); if (oldTip) oldTip.remove();
    var fmt = cfg.fmt || function (v) { return T.fmt(v, 1); };
    var W = T.plotWidth(host), H = cfg.height || 320;
    var n = cfg.labels.length;
    var all = [];
    cfg.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) all.push(v); }); });
    (cfg.bands || []).forEach(function (b) { b.lo.concat(b.hi).forEach(function (v) { if (v != null) all.push(v); }); });
    var yMin = cfg.yMin, yMax = cfg.yMax, ticks;
    if (yMin == null || yMax == null) {
      var lo = Math.min.apply(null, all.concat(cfg.zero ? [0] : [])), hi = Math.max.apply(null, all.concat(cfg.zero ? [0] : []));
      var nt = T.niceTicks(lo, hi, cfg.tickCount || 5);
      yMin = nt.lo; yMax = nt.hi; ticks = nt.ticks;
    } else {
      ticks = []; for (var v = yMin; v <= yMax + 1e-9; v += cfg.yStep) ticks.push(+v.toFixed(10));
    }
    var yLabel = cfg.yFmt || function (v) { return T.fmt(v, Math.abs(ticks[1] - ticks[0]) < 1 ? 1 : 0) + (cfg.unit || ""); };
    var longestTick = Math.max.apply(null, ticks.map(function (t) { return yLabel(t).length; }));
    var m = { t: 14, r: 16, b: 28, l: Math.max(36, 10 + longestTick * 7) };
    if (cfg.endLabels) {
      var longest = 0;
      cfg.series.forEach(function (s) { if (!s.quiet && s.endName) longest = Math.max(longest, (s.endName + " " + fmt(-88.8)).length); });
      m.r = Math.min(W * 0.35, 18 + longest * 7);
    }
    var hasHeld = cfg.series.some(function (s) { return s.held && Object.keys(s.held).length; });
    if (hasHeld) m.b += 8;
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var x = function (i) { return m.l + (n === 1 ? iw / 2 : i * iw / (n - 1)); };
    var y = function (v) { return m.t + (yMax - v) / (yMax - yMin) * ih; };
    var svg = T.el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": cfg.aria || "" });
    host.appendChild(svg);

    ticks.forEach(function (tv) {
      var gy = y(tv);
      svg.appendChild(T.el("line", { x1: m.l, x2: m.l + iw, y1: gy, y2: gy },
        "stroke:" + (tv === 0 ? "var(--axis)" : "var(--grid)") + ";stroke-width:1"));
      T.text(svg, m.l - 8, gy + 4, yLabel(tv), null, "end");
    });
    // x ticks: years, thinned to fit; quarters on short spans
    var janIdx = [];
    var yearStart = function (p) { return p.length === 4 || p.slice(5) === "01" || p.slice(5) === "Q1"; };
    cfg.labels.forEach(function (p, i) { if (yearStart(p)) janIdx.push(i); });
    var step = 1; while (janIdx.length / step * 46 > iw) step++;
    var short = janIdx.length <= 3 && iw / n > 10;
    cfg.labels.forEach(function (p, i) {
      var mo = p.slice(5);
      var isJan = yearStart(p);
      if (isJan && ((+p.slice(0, 4)) % step === 0 || step === 1)) {
        svg.appendChild(T.el("line", { x1: x(i), x2: x(i), y1: m.t + ih, y2: m.t + ih + 4 }, "stroke:var(--axis)"));
        T.text(svg, x(i), m.t + ih + 18, p.slice(0, 4), null, "middle");
      } else if (short && (mo === "04" || mo === "07" || mo === "10" || mo === "Q2" || mo === "Q3" || mo === "Q4")) {
        svg.appendChild(T.el("line", { x1: x(i), x2: x(i), y1: m.t + ih, y2: m.t + ih + 3 }, "stroke:var(--axis)"));
        T.text(svg, x(i), m.t + ih + 18, mo.charAt(0) === "Q" ? mo : MONTHS[+mo - 1], null, "middle");
      }
    });
    if (!janIdx.length && n) T.text(svg, x(0), m.t + ih + 18, T.periodLabel(cfg.labels[0]), null, "start");

    (cfg.bands || (cfg.band ? [cfg.band] : [])).forEach(function (band) {
      var top = [], bot = [];
      band.hi.forEach(function (hv, i) { if (hv != null) top.push([x(i), y(Math.min(hv, yMax))]); });
      band.lo.forEach(function (lv, i) { if (lv != null) bot.push([x(i), y(Math.max(lv, yMin))]); });
      if (top.length) {
        var d = "M" + top.map(function (p) { return p.join(","); }).join("L") + "L" + bot.reverse().map(function (p) { return p.join(","); }).join("L") + "Z";
        svg.appendChild(T.el("path", { d: d }, "fill:" + (band.fill || "var(--tol)") + ";stroke:none"));
      }
    });
    function pathFor(vals, s) {
      var d = "", pen = false;
      vals.forEach(function (v, i) {
        // s.connect: the series is coarser than the axis, so bridge the empty slots between its
        // own periods; s.breaks marks where one of its periods is missing or held
        if (v == null) { if (!s || !s.connect || (s.breaks && s.breaks[i])) pen = false; return; }
        d += (pen ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1); pen = true;
      });
      return d;
    }
    cfg.series.slice().sort(function (a, b) { return (a.quiet ? 0 : 1) - (b.quiet ? 0 : 1); }).forEach(function (s) {
      svg.appendChild(T.el("path", { d: pathFor(s.values, s) },
        "fill:none;stroke:" + s.color + ";stroke-width:" + (s.width || (s.quiet ? 1.25 : 2)) + ";stroke-linejoin:round;stroke-linecap:round" +
        (s.dash ? ";stroke-dasharray:" + s.dash : "")));
      // isolated points (a value with no neighbours) would otherwise be invisible
      if (!s.quiet) s.values.forEach(function (v, i) {
        if (v != null && (s.dots || (!s.connect && s.values[i - 1] == null && s.values[i + 1] == null)))
          svg.appendChild(T.el("circle", { cx: x(i), cy: y(v), r: s.dots ? 2.25 : 2.5 }, "fill:" + s.color));
      });
      if (s.held && !s.quiet) {
        Object.keys(s.held).forEach(function (k) {
          var i = +k;
          if (i < 0 || i >= n) return;
          svg.appendChild(T.el("line", { x1: x(i), x2: x(i), y1: m.t + ih + 22, y2: m.t + ih + 30 },
            "stroke:var(--hold);stroke-width:2"));
        });
      }
    });
    if (cfg.endLabels) {
      var ends = cfg.series.filter(function (s) { return !s.quiet && s.endName; }).map(function (s) {
        var i = s.values.length - 1; while (i > 0 && s.values[i] == null) i--;
        return { s: s, i: i, yy: y(s.values[i]) };
      }).filter(function (e) { return e.s.values[e.i] != null; }).sort(function (a, b) { return a.yy - b.yy; });
      for (var k = 1; k < ends.length; k++) if (ends[k].yy - ends[k - 1].yy < 16) ends[k].yy = ends[k - 1].yy + 16;
      ends.forEach(function (e) {
        svg.appendChild(T.el("circle", { cx: x(e.i), cy: y(e.s.values[e.i]), r: 4 }, "fill:" + e.s.color + ";stroke:var(--surface);stroke-width:2"));
        T.text(svg, x(e.i) + 10, e.yy + 4, e.s.endName + " " + fmt(e.s.values[e.i]), "lbl");
      });
    }
    (cfg.annotations || []).forEach(function (a) {
      var ax = x(a.i), ay = y(a.v);
      svg.appendChild(T.el("circle", { cx: ax, cy: ay, r: 4 }, "fill:" + (a.color || "var(--s1)") + ";stroke:var(--surface);stroke-width:2"));
      var anchor = a.anchor || "middle";
      if (anchor === "middle" && ax < m.l + 60) anchor = "start";
      if (anchor === "middle" && ax > m.l + iw - 50) anchor = "end";
      T.text(svg, ax + (a.dx || 0), ay + (a.dy || -12), a.text, "lbl-strong", anchor);
    });

    // interaction
    var tip = T.tip(host);
    var cross = T.el("line", { y1: m.t, y2: m.t + ih }, "stroke:var(--axis);stroke-width:1;display:none");
    svg.appendChild(cross);
    var live = cfg.series.filter(function (s) { return !s.quiet; });
    var dots = live.map(function (s) {
      var c = T.el("circle", { r: 4 }, "fill:" + s.color + ";stroke:var(--surface);stroke-width:2;display:none");
      svg.appendChild(c); return { s: s, c: c };
    });
    var perYear = T.perYear[T.freqOf(cfg.labels[0] || "2000-01")];
    var hit = T.el("rect", { x: m.l, y: m.t, width: iw, height: ih + (hasHeld ? 30 : 0), tabindex: 0,
      "aria-label": (cfg.aria || "Chart") + ". Use the arrow keys to step through " +
        (perYear === 12 ? "months." : perYear === 4 ? "quarters." : "years.") },
      "fill:transparent;cursor:crosshair;outline:none");
    svg.appendChild(hit);
    var cur = n - 1;
    function defaultRows(i) {
      return live.map(function (s) {
        var held = s.held && s.held[i];
        return { color: s.color, name: s.name || s.endName || "", value: held ? "held" : fmt(s.values[i]),
          note: held ? held.map(function (r) { return (cfg.rules && cfg.rules[r]) || r; }).join("; ") : null };
      });
    }
    function show(i) {
      cur = Math.max(0, Math.min(n - 1, i));
      var cx = x(cur);
      cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.style.display = "";
      var yTop = m.t + ih;
      dots.forEach(function (d) {
        var v = d.s.values[cur];
        if (v == null) { d.c.style.display = "none"; return; }
        d.c.setAttribute("cx", cx); d.c.setAttribute("cy", y(v)); d.c.style.display = ""; yTop = Math.min(yTop, y(v));
      });
      T.fillTip(tip, (cfg.titleFmt || T.periodLabel)(cfg.labels[cur]), (cfg.tipRows || defaultRows)(cur));
      T.placeTip(host, svg, W, tip, cx, yTop);
    }
    function hide() { cross.style.display = "none"; dots.forEach(function (d) { d.c.style.display = "none"; }); tip.hidden = true; }
    function fromEvent(ev) {
      var r = svg.getBoundingClientRect();
      return Math.round(((ev.clientX - r.left) * W / r.width - m.l) / iw * (n - 1));
    }
    hit.addEventListener("pointermove", function (ev) { show(fromEvent(ev)); });
    hit.addEventListener("pointerdown", function (ev) { show(fromEvent(ev)); });
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("focus", function () { show(cur); });
    hit.addEventListener("blur", hide);
    hit.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft") { show(cur - (ev.shiftKey ? perYear : 1)); ev.preventDefault(); }
      if (ev.key === "ArrowRight") { show(cur + (ev.shiftKey ? perYear : 1)); ev.preventDefault(); }
    });
    return { x: x, y: y, svg: svg };
  };

  /* redraw on width change, not on every pixel */
  T.onResize = function (fn) {
    var lastW = window.innerWidth, pending = false;
    window.addEventListener("resize", function () {
      if (pending || Math.abs(window.innerWidth - lastW) < 8) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; lastW = window.innerWidth; fn(); });
    });
  };

  T.fail = function (host, err) {
    host.innerHTML = '<p class="caption">Couldn\'t load the data (' + String(err && err.message || err) +
      '). If you opened this file straight from disk, serve the folder instead: <code>python3 -m http.server</code> in site/www.</p>';
  };

  /* ---------- freshness line in every footer ---------- */
  (function () {
    var el = document.getElementById("site-status");
    if (!el) return;
    T.json("data/status.json").then(function (s) {
      var when = (s.checked_at || "").slice(0, 10);
      var latest = s.latest && s.latest.annex ? T.monthLabel(s.latest.annex) : null;
      if (!when) return;
      el.textContent = "GSS checked for new data " + when + (latest ? " · latest release " + latest : "") +
        (s.result === "error" ? " · last update stopped, figures unchanged" : "");
      el.hidden = false;
    }).catch(function () { /* no status file yet: say nothing */ });
  })();

  window.TARIN = T;
})();
