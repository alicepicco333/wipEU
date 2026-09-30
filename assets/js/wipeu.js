/* wipEU — charts. Data: data/web/wipeu.json (built by scripts/build_web_data.py from the EIGE
   exports in datav/ and databar/). Share of women = women / total headcount * 100.
   Every colour is a CSS custom property, so every chart takes the dark theme from the stylesheet. */
(function () {
  "use strict";

  const PARITY = 50;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const halfUp = (x) => Math.floor(x * 10 + 0.5 + 1e-9) / 10;
  const f1 = (x) => halfUp(x).toFixed(1);
  const pts = (d) => (d >= 0 ? "+" : "−") + f1(Math.abs(d)) + " pts";
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EU27 = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"];

  let DATA, GEO;

  /* ---------- data access ---------- */
  function series(ds, pos, key) {
    const s = DATA.datasets[ds].series[pos];
    const rows = (s && s[key]) || [];
    return rows.filter((r) => r[2] > 0).map(([y, w, t]) => ({ y, w, t, p: (100 * w) / t }));
  }
  const at = (arr, y) => arr.find((d) => d.y === y);
  const keyName = (ds, k) => DATA.datasets[ds].keys[k] || k;
  const latest = (arr) => arr[arr.length - 1];

  /* ---------- tooltip ---------- */
  const tip = $("#tip");
  function showTip(lines, x, y) {
    tip.replaceChildren();
    lines.forEach((l, i) => tip.appendChild(el(i === 0 ? "b" : "div", null, l)));
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > innerHeight - 8) top = y - r.height - 14;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = Math.max(8, top) + "px";
  }
  const hideTip = () => { tip.hidden = true; };
  function tipAtElement(elm, lines) {
    const r = elm.getBoundingClientRect();
    showTip(lines, r.left + r.width / 2, r.top + r.height / 2);
  }

  /* ---------- helpers ---------- */
  function onResize(node, fn) {
    let w = 0, raf = 0;
    new ResizeObserver((entries) => {
      const nw = Math.round(entries[0].contentRect.width);
      if (nw === w || nw === 0) return;
      w = nw; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => fn(nw));
    }).observe(node);
  }
  function table(headers, rows, numericFrom = 1) {
    const t = el("table"), th = el("thead"), tr = el("tr");
    headers.forEach((h, i) => { const c = el("th", i >= numericFrom ? "n" : null, h); c.scope = "col"; tr.appendChild(c); });
    th.appendChild(tr); t.appendChild(th);
    const tb = el("tbody");
    rows.forEach((r) => {
      const row = el("tr");
      r.forEach((v, i) => row.appendChild(el(i === 0 ? "th" : "td", i >= numericFrom ? "n" : null, v)));
      row.firstChild.scope = "row";
      tb.appendChild(row);
    });
    t.appendChild(tb);
    return t;
  }
  function scrollToId(id) {
    const n = document.getElementById(id);
    if (n) n.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  }

  /* ---------- URL state: #ds=D6&role=PRES_PART&year=2023&country=IT&compare=FR ---------- */
  const url = {
    read() {
      const h = location.hash.slice(1);
      if (!h.includes("=")) return {};
      const q = new URLSearchParams(h);
      return Object.fromEntries(q.entries());
    },
    write() {
      const q = new URLSearchParams();
      q.set("ds", mapState.ds); q.set("role", mapState.pos); q.set("year", String(mapState.year));
      if (cpState.a) q.set("country", cpState.a);
      if (cpState.b) q.set("compare", cpState.b);
      try { history.replaceState(null, "", "#" + q.toString()); } catch (e) { /* file:// or sandbox */ }
    },
  };

  /* ---------- KPIs (hero) ---------- */
  function kpis() {
    const set = (k, v) => { const n = document.querySelector(`[data-kpi="${k}"]`); if (n) n.textContent = v; };
    const areas = DATA.areas.map((a) => ({ a, s: series(a.ds, a.pos, a.key) }));
    const atParity = areas.filter(({ s }) => latest(s).p >= PARITY).length;
    set("parity", `${atParity} of ${areas.length}`);
    set("parity-note", atParity === 0 ? "All six headline series sit below 50%." : `${areas.length - atParity} of six sit below 50%.`);
    const pol = series("D6", "PRES_PART", "EU27_2020"), p23 = at(pol, 2023), p17 = at(pol, 2017);
    set("pol", f1(p23.p) + "%"); set("pol-note", `${p23.w} of ${p23.t} leaders. ${f1(p17.p)}% in 2017.`);
    const ecj = series("D5", "MEMB_CRT", "ECJ"), e23 = at(ecj, 2023), e17 = at(ecj, 2017);
    set("ecj", `${e23.w} of ${e23.t}`); set("ecj-note", `${f1(e23.p)}%, up from ${e17.w} of ${e17.t} in 2017.`);
    const best = areas.slice().sort((x, y) => latest(y.s).p - latest(x.s).p)[0];
    const b = latest(best.s);
    set("res", f1(b.p) + "%"); set("res-note", `${b.w} of ${b.t} members, ${best.a.scope === "EU-27 member states" ? "EU-27" : best.a.scope}.`);
  }

  /* ---------- the chamber: hemicycle, one dot per person ---------- */
  const CH_ORDER = ["politics", "environment", "research", "admin", "finance", "law"];
  const CH_SHORT = { politics: "Party leaders", environment: "Environment ministers", research: "Research boards", admin: "EU agency boards", finance: "EU finance boards", law: "Court of Justice" };
  const chState = { id: "politics", year: 2023, playing: false, timer: 0, prevN: 0 };

  /* Seat layout for N seats in `rows` concentric arcs (inner radius r0, outer 1).
     Seats are allotted to rows in proportion to arc length, then ordered left to right by angle. */
  function rowsFor(N, r0) {
    for (let rows = 1; rows < 60; rows++) {
      const d = rows === 1 ? 1 - r0 : (1 - r0) / (rows - 1);
      let cap = 0;
      for (let i = 0; i < rows; i++) { const r = rows === 1 ? 1 : r0 + d * i; cap += Math.floor((Math.PI * r) / d) + 1; }
      if (cap >= N) return rows;
    }
    return 60;
  }
  function hemiLayout(N, rows, r0) {
    const radii = d3.range(rows).map((i) => (rows === 1 ? 1 : r0 + ((1 - r0) * i) / (rows - 1)));
    const tot = d3.sum(radii);
    const raw = radii.map((r) => (N * r) / tot);
    const n = raw.map(Math.floor);
    let left = N - d3.sum(n);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { n[i]++; left--; } });
    const seats = [];
    radii.forEach((r, i) => {
      const k = n[i];
      for (let j = 0; j < k; j++) {
        const a = k === 1 ? Math.PI / 2 : Math.PI - (Math.PI * j) / (k - 1);
        seats.push({ a, r, x: r * Math.cos(a), y: r * Math.sin(a) });
      }
    });
    seats.sort((p, q) => q.a - p.a || p.r - q.r);
    return seats;
  }

  function setupChamber() {
    const box = $("#ch-body");
    CH_ORDER.forEach((id) => {
      const a = DATA.areas.find((x) => x.id === id);
      const lab = el("label"), inp = el("input"), sp = el("span", null, CH_SHORT[id]);
      inp.type = "radio"; inp.name = "chbody"; inp.value = id; inp.checked = id === chState.id;
      inp.setAttribute("aria-label", `${CH_SHORT[id]}: ${a.label}, ${a.scope}`);
      inp.addEventListener("change", () => { chState.id = id; stop(); fitYears(); renderChamber(true); });
      lab.append(inp, sp); box.appendChild(lab);
    });
    const yr = $("#ch-year"), out = $("#ch-year-out"), play = $("#ch-play");
    function fitYears() {
      const s = chSeries();
      const ys = s.map((d) => d.y);
      yr.min = ys[0]; yr.max = ys[ys.length - 1];
      if (!ys.includes(chState.year)) chState.year = latest(s).y;
      yr.value = chState.year; out.textContent = chState.year;
      const a = chArea();
      $("#ch-table").replaceChildren(table(["Year", "Women", "Men", "Total", "Share of women"], s.map((d) => [String(d.y), String(d.w), String(d.t - d.w), String(d.t), f1(d.p) + "%"])));
      $("#ch-name").textContent = `${a.label} · ${a.scope} (${a.ds})`;
      chState.rows = rowsFor(d3.max(s, (d) => d.t), 0.36);
    }
    yr.addEventListener("input", () => {
      stop();
      const s = chSeries(), v = +yr.value;
      // the series can skip years (the Court of Justice has 1999, then 2003 on): snap to the nearest published year
      const d = s.reduce((p, q) => (Math.abs(q.y - v) < Math.abs(p.y - v) ? q : p));
      chState.year = d.y; yr.value = d.y; out.textContent = d.y; renderChamber(true);
    });
    function step() {
      const s = chSeries(), i = s.findIndex((d) => d.y === chState.year);
      if (i >= s.length - 1) { stop(); return; }
      chState.year = s[i + 1].y; yr.value = chState.year; out.textContent = chState.year; renderChamber(true);
      if (i + 1 >= s.length - 1) stop();
    }
    function start() {
      const s = chSeries();
      if (chState.year === latest(s).y) { chState.year = s[0].y; yr.value = chState.year; out.textContent = chState.year; renderChamber(true); }
      chState.playing = true;
      play.setAttribute("aria-pressed", "true"); $(".play__label", play).textContent = "Pause";
      $("#ch-count").setAttribute("aria-live", "off");
      chState.timer = setInterval(step, reduced() ? 1600 : 1100);
    }
    function stop() {
      if (!chState.playing) return;
      chState.playing = false; clearInterval(chState.timer);
      play.setAttribute("aria-pressed", "false"); $(".play__label", play).textContent = "Play";
      $("#ch-count").setAttribute("aria-live", "polite");
    }
    play.addEventListener("click", () => (chState.playing ? stop() : start()));
    chState.stop = stop; chState.start = start;
    fitYears();
    onResize($("#hemicycle"), () => renderChamber(false));
  }
  const chArea = () => DATA.areas.find((a) => a.id === chState.id);
  const chSeries = () => { const a = chArea(); return series(a.ds, a.pos, a.key); };

  function renderChamber(animate) {
    const host = $("#hemicycle");
    const s = chSeries(), d = at(s, chState.year), a = chArea();
    const W = host.clientWidth || 700;
    const R = W / 2 - 4, H = R + 16, cx = W / 2, cy = R + 4;
    const r0 = 0.36, rows = chState.rows;
    const seats = hemiLayout(d.t, rows, r0);
    const spacing = rows === 1 ? 1 - r0 : (1 - r0) / (rows - 1);
    const arcStep = d3.min(d3.range(rows), (i) => {
      const r = rows === 1 ? 1 : r0 + spacing * i, k = seats.filter((q) => Math.abs(q.r - r) < 1e-9).length;
      return k > 1 ? (Math.PI * r) / (k - 1) : Infinity;
    });
    const dotR = Math.max(1.2, 0.42 * R * Math.min(spacing, arcStep));
    let svg = d3.select(host).select("svg");
    if (svg.empty() || +svg.attr("data-w") !== W) {
      host.replaceChildren();
      svg = d3.select(host).append("svg").attr("aria-hidden", "true");
      svg.append("g").attr("class", "seats");
      svg.append("line").attr("class", "midline");
      svg.append("text").attr("class", "yr").attr("text-anchor", "middle");
      svg.append("text").attr("class", "yr-sub").attr("text-anchor", "middle");
      animate = false;
    }
    svg.attr("data-w", W).attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H);
    const lift = dotR + 6;
    svg.select(".midline").attr("x1", cx).attr("x2", cx).attr("y1", cy - R * r0 + dotR + 4).attr("y2", cy - R - lift + 2);
    const yrSize = Math.round(Math.min(64, R * r0 * 0.42));
    svg.select(".yr").attr("x", cx).attr("y", cy - 8 - Math.max(13, yrSize * 0.32)).style("font-size", yrSize + "px").text(d.y);
    svg.select(".yr-sub").attr("x", cx).attr("y", cy - 2).text(`${d.w} of ${d.t} seats`);
    const move = animate && !reduced();
    const sel = svg.select(".seats").selectAll("circle").data(seats, (q, i) => i);
    sel.exit().remove();
    const all = sel.enter().append("circle").attr("class", "seat")
      .attr("cx", (q) => cx + q.x * R).attr("cy", (q) => cy - q.y * R).attr("r", move ? 0 : dotR)
      .merge(sel)
      .attr("class", (q, i) => "seat " + (i < d.w ? "w" : "m"));
    (move ? all.transition().duration(650).ease(d3.easeCubicInOut) : all)
      .attr("cx", (q) => cx + q.x * R).attr("cy", (q) => cy - q.y * R).attr("r", dotR);
    // read-out
    const need = Math.max(0, Math.ceil(d.t / 2) - d.w), first = s[0];
    $("#ch-share").textContent = f1(d.p) + "%";
    $("#ch-count").textContent = `${d.y}: ${d.w} women and ${d.t - d.w} men, ${d.t} seats in all.`;
    $("#ch-gap").textContent = need ? `${need} ${need === 1 ? "seat" : "seats"}` : "None";
    $("#ch-first").textContent = `${first.y}: ${f1(first.p)}%`;
    const notes = {
      finance: "The ECB, EIB and EIF boards together. With about 60 seats, each appointment moves the share by 1.7 points.",
      law: "Judges at the European Court of Justice: one per member state, plus the Court's own changes in size over the years.",
      research: "EIGE's coverage grew in 2018, from 628 to 841 board members, so part of the jump that year is a change in who is counted.",
      admin: "Board members of every EU agency EIGE covers; the number of agencies grows over time.",
      environment: "Senior and junior ministers in the ministries responsible for environment and climate, EU-27 member states. EIGE has published up to 2022.",
      politics: "Leaders of the major political parties in the EU-27 member states.",
    };
    $("#ch-note").textContent = notes[a.id];
    host.setAttribute("aria-label", `Hemicycle of ${d.t} seats, ${a.label}, ${d.y}: ${d.w} women (${f1(d.p)}%) and ${d.t - d.w} men. The table below lists every year.`);
  }

  /* ---------- small multiples ---------- */
  const SM_X = [2003, 2023], SM_Y = [0, 60];
  function smallMultiples() {
    const host = $("#multiples");
    const items = DATA.areas.map((a) => {
      const s = series(a.ds, a.pos, a.key).filter((d) => d.y >= SM_X[0]);
      const card = el("div", "sm");
      card.tabIndex = 0;
      const last = latest(s), first = s[0];
      card.setAttribute("role", "img");
      card.setAttribute("aria-label", `${a.area}: ${a.label}. ${f1(first.p)}% in ${first.y}, ${f1(last.p)}% in ${last.y}. Use left and right arrow keys to read each year.`);
      card.appendChild(el("div", "sm__area", a.area));
      card.appendChild(el("div", "sm__what", `${a.label} (${a.ds})`));
      card.appendChild(el("div", "sm__v", f1(last.p) + "%"));
      card.appendChild(el("div", "sm__vn", `${last.w} of ${last.t}, ${last.y}`));
      const chart = el("div", "chart");
      card.appendChild(chart);
      host.appendChild(card);
      return { a, s, card, chart };
    });
    const draw = () => items.forEach((it) => lineChart(it.chart, it.s, {
      x: SM_X, y: SM_Y, h: 150, yTicks: [0, 20, 40], xTicks: [2003, 2013, 2023], label: it.a.area, keyTarget: it.card,
    }));
    onResize(host, draw);
    const years = d3.range(1999, 2024);
    const all = DATA.areas.map((a) => series(a.ds, a.pos, a.key));
    const rows = years.filter((y) => all.some((s) => at(s, y))).map((y) => [String(y), ...all.map((s) => { const d = at(s, y); return d ? `${f1(d.p)}% (${d.w}/${d.t})` : "–"; })]);
    $("#multiples-table").appendChild(table(["Year", ...DATA.areas.map((a) => a.area)], rows));
  }

  /* generic single-series line chart with crosshair + keyboard reading */
  function lineChart(host, s, o) {
    const W = host.clientWidth || 300, H = o.h;
    const m = { l: 30, r: 10, t: 10, b: 22 };
    const x = d3.scaleLinear().domain(o.x).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain(o.y).range([H - m.b, m.t]);
    host.replaceChildren();
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H).attr("aria-hidden", "true");
    svg.append("g").attr("class", "grid").selectAll("line").data(o.yTicks).join("line")
      .attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
    svg.append("g").selectAll("text").data(o.yTicks).join("text").attr("x", m.l - 6).attr("y", (d) => y(d) + 4).attr("text-anchor", "end").text((d) => d + "%");
    svg.append("g").selectAll("text").data(o.xTicks).join("text").attr("x", x).attr("y", H - 4)
      .attr("text-anchor", (d) => (d === o.x[0] ? "start" : d === o.x[1] ? "end" : "middle")).text((d) => d);
    svg.append("line").attr("class", "base").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0));
    svg.append("line").attr("class", "parity").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(PARITY)).attr("y2", y(PARITY));
    svg.append("text").attr("class", "parity-t").attr("x", W - m.r).attr("y", y(PARITY) - 5).attr("text-anchor", "end").text("Parity 50%");
    const line = d3.line().x((d) => x(d.y)).y((d) => y(d.p));
    const area = d3.area().x((d) => x(d.y)).y0(y(0)).y1((d) => y(d.p));
    svg.append("path").attr("class", "area").attr("d", area(s));
    if (o.fit) svg.append("path").attr("class", "ln-fit").attr("d", d3.line().x((d) => x(d[0])).y((d) => y(d[1]))(o.fit));
    svg.append("path").attr("class", "ln").attr("d", line(s));
    if (o.dots) svg.append("g").selectAll("circle").data(s).join("circle").attr("class", "dot").attr("r", 4).attr("cx", (d) => x(d.y)).attr("cy", (d) => y(d.p));
    const last = latest(s);
    svg.append("circle").attr("class", "dot").attr("r", 4.5).attr("cx", x(last.y)).attr("cy", y(last.p));
    if (o.cross) svg.append("circle").attr("class", "dot-hit").attr("r", 5).attr("cx", x(o.cross[0])).attr("cy", y(o.cross[1]));
    if (o.endLabel) svg.append("text").attr("class", "t-strong").attr("x", x(last.y) - 8).attr("y", y(last.p) - 10).attr("text-anchor", "end").text(f1(last.p) + "%");
    const cross = svg.append("line").attr("class", "cross").attr("y1", m.t).attr("y2", H - m.b).style("display", "none");
    const hot = svg.append("circle").attr("class", "dot").attr("r", 5).style("display", "none");
    const lines = (d) => [`${f1(d.p)}%`, `${d.y} · ${d.w} women of ${d.t}`, o.label];
    function mark(d) {
      cross.style("display", null).attr("x1", x(d.y)).attr("x2", x(d.y));
      hot.style("display", null).attr("cx", x(d.y)).attr("cy", y(d.p));
    }
    function clear() { cross.style("display", "none"); hot.style("display", "none"); hideTip(); }
    const nearest = (yr) => s.reduce((a, b) => (Math.abs(b.y - yr) < Math.abs(a.y - yr) ? b : a));
    svg.append("rect").attr("x", m.l).attr("y", 0).attr("width", W - m.l - m.r).attr("height", H).attr("fill", "transparent")
      .on("pointermove", (ev) => { const d = nearest(x.invert(d3.pointer(ev)[0])); mark(d); showTip(lines(d), ev.clientX, ev.clientY); })
      .on("pointerleave", clear);
    const kt = o.keyTarget || host;
    let idx = s.length - 1;
    kt.onkeydown = (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      idx = Math.max(0, Math.min(s.length - 1, idx + (ev.key === "ArrowRight" ? 1 : -1)));
      mark(s[idx]); const r = host.getBoundingClientRect();
      showTip(lines(s[idx]), r.left + x(s[idx].y), r.top + y(s[idx].p));
    };
    kt.onblur = clear;
  }

  /* ---------- dumbbell: 2017 -> latest ---------- */
  function dumbbell() {
    const host = $("#dumbbell");
    const rows = DATA.areas.map((a) => {
      const s = series(a.ds, a.pos, a.key);
      const from = at(s, 2017), to = latest(s);
      return { a, from, to, d: halfUp(to.p) - halfUp(from.p) };
    }).sort((p, q) => q.to.p - p.to.p);
    const draw = (W) => {
      const narrow = W < 520, rowH = narrow ? 74 : 58, ty = narrow ? 52 : 36, m = { l: 0, r: 12, t: 6, b: 24 }, H = m.t + rows.length * rowH + m.b;
      const x = d3.scaleLinear().domain([0, 60]).range([m.l + 4, W - m.r]);
      host.replaceChildren();
      const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H);
      rows.forEach((r, i) => {
        const y0 = m.t + i * rowH + ty - 10, y1 = m.t + i * rowH + ty + 10;
        svg.append("g").attr("class", "grid").selectAll("line").data([0, 10, 20, 30, 40, 60]).join("line").attr("x1", x).attr("x2", x).attr("y1", y0).attr("y2", y1);
        svg.append("line").attr("class", "parity").attr("x1", x(PARITY)).attr("x2", x(PARITY)).attr("y1", y0).attr("y2", y1);
      });
      svg.append("g").selectAll("text").data([0, 10, 20, 30, 40, 60]).join("text").attr("x", x).attr("y", H - 6).attr("text-anchor", "middle").text((d) => d + "%");
      const g = svg.append("g").selectAll("g").data(rows).join("g").attr("transform", (d, i) => `translate(0,${m.t + i * rowH})`);
      g.append("text").attr("class", "t-ink").attr("x", 0).attr("y", 16).style("font-size", "14px").style("font-weight", 600).text((d) => d.a.area);
      g.append("text").attr("x", narrow ? 0 : W - m.r).attr("y", narrow ? 33 : 16).attr("text-anchor", narrow ? "start" : "end").style("font-size", "13px")
        .text((d) => `${f1(d.from.p)}% → ${f1(d.to.p)}%${d.to.y !== 2023 ? " (" + d.to.y + ")" : ""}  ${pts(d.d)}`);
      g.append("line").attr("class", "bar-link").attr("x1", (d) => x(d.from.p)).attr("x2", (d) => x(d.to.p)).attr("y1", ty).attr("y2", ty);
      g.append("circle").attr("class", "dot-from").attr("r", 6).attr("cx", (d) => x(d.from.p)).attr("cy", ty);
      g.append("circle").attr("class", "dot-to").attr("r", 6).attr("cx", (d) => x(d.to.p)).attr("cy", ty);
      g.append("rect").attr("x", 0).attr("y", 0).attr("width", W).attr("height", rowH).attr("fill", "transparent")
        .on("pointermove", (ev, d) => showTip([pts(d.d), `2017: ${f1(d.from.p)}% (${d.from.w}/${d.from.t})`, `${d.to.y}: ${f1(d.to.p)}% (${d.to.w}/${d.to.t})`, d.a.label], ev.clientX, ev.clientY))
        .on("pointerleave", hideTip);
      svg.append("text").attr("class", "parity-t").attr("x", x(PARITY)).attr("y", H - 6).attr("text-anchor", "middle").style("font-weight", 600).text("50% parity");
    };
    onResize(host, draw);
    host.setAttribute("aria-label", "Share of women, 2017 and latest year: " + rows.map((d) => `${d.a.area} ${f1(d.from.p)}% to ${f1(d.to.p)}% (${d.to.y})`).join("; ") + ".");
  }

  /* ---------- pace to parity: least-squares line through the last ten published years ---------- */
  const PACE_CAP = 2100;
  function paceFit(s) {
    const lastY = latest(s).y;
    const win = s.filter((d) => d.y > lastY - 10);
    const n = win.length, mx = d3.mean(win, (d) => d.y), my = d3.mean(win, (d) => d.p);
    const slope = d3.sum(win, (d) => (d.y - mx) * (d.p - my)) / d3.sum(win, (d) => (d.y - mx) ** 2);
    const icpt = my - slope * mx;
    const at50 = slope > 0 ? (PARITY - icpt) / slope : null;
    const year = at50 == null ? null : Math.ceil(at50 - 1e-9);
    return { win, n, from: win[0].y, to: lastY, slope, icpt, at50, year, reached: year != null && year <= PACE_CAP, fitted: (y) => icpt + slope * y };
  }
  function pace() {
    const host = $("#pace-list");
    const items = DATA.areas.map((a) => ({ a, s: series(a.ds, a.pos, a.key) })).map((it) => ({ ...it, f: paceFit(it.s) }));
    const maxYear = Math.min(PACE_CAP, d3.max(items, (it) => (it.f.reached ? it.f.year : 0)) + 4);
    const X = [2011, Math.max(2040, Math.ceil(maxYear / 5) * 5)];
    items.sort((p, q) => (p.f.reached ? p.f.year : 1e9) - (q.f.reached ? q.f.year : 1e9));
    items.forEach((it) => {
      const { a, s, f } = it;
      const card = el("div", "pace__i");
      card.setAttribute("role", "listitem");
      card.appendChild(el("div", "pace__area", a.area));
      const yr = el("div", "pace__yr", f.reached ? String(f.year) : "Not reached");
      const lastD = latest(s);
      if (f.reached) yr.appendChild(el("small", null, `${f.year - lastD.y} years after ${lastD.y}`));
      card.appendChild(yr);
      const rate = `${f.slope >= 0 ? "+" : "−"}${Math.abs(f.slope).toFixed(2)} pts a year`;
      card.appendChild(el("p", "pace__how", `${a.label}. Straight-line pace over ${f.from}–${f.to} (${f.n} years): ${rate}${f.reached ? "" : f.slope > 0 ? `, which would pass 50% only after ${PACE_CAP}` : ", flat or falling"}.`));
      const chart = el("div", "chart");
      chart.tabIndex = 0;
      chart.setAttribute("role", "img");
      chart.setAttribute("aria-label", `${a.area}: published shares ${s[0].y}–${lastD.y}, ${f1(lastD.p)}% in ${lastD.y}. Dashed straight-line projection ${f.reached ? "reaches 50% in " + f.year : "does not reach 50% by " + PACE_CAP}. Use left and right arrow keys to read each year.`);
      card.appendChild(chart);
      host.appendChild(card);
      it.chart = chart; it.card = card; it.X = X;
    });
    const draw = () => items.forEach(({ a, s, f, chart }) => {
      const endX = f.reached ? f.year : X[1];
      const fit = [[f.from, f.fitted(f.from)], [Math.min(endX, X[1]), Math.max(0, Math.min(100, f.fitted(Math.min(endX, X[1]))))]];
      const xt = d3.range(2020, X[1] + 1, X[1] - 2011 > 50 ? 20 : 10).filter((t) => X[1] - t >= 8 || t === X[1]);
      lineChart(chart, s.filter((d) => d.y >= X[0]), {
        x: X, y: [0, 60], h: 150, yTicks: [0, 20, 40], xTicks: [...xt, X[1]].filter((t, i, a) => a.indexOf(t) === i), label: a.area, fit,
        cross: f.reached && f.year <= X[1] ? [f.year, PARITY] : null,
      });
    });
    onResize(host, draw);
    $("#pace-table").appendChild(table(
      ["Area", "Years fitted", "Slope (pts a year)", "Fitted share, last year", "Year the line reaches 50%"],
      items.map(({ a, s, f }) => [a.area, `${f.from}–${f.to} (${f.n})`, (f.slope >= 0 ? "+" : "−") + Math.abs(f.slope).toFixed(2), `${f1(f.fitted(f.to))}% (published ${f1(latest(s).p)}%)`, f.reached ? String(f.year) : "Not reached"]),
    ));
  }

  /* ---------- map ---------- */
  const MAP_DEFAULT = { D6: "PRES_PART", D4: "MEMB_GOV", D3: "MEMB_HDM" };
  const MAP_DESC = {
    D6: ["D6 — Major political parties: leaders and deputy leaders", "The gender distribution of leaders of the major political parties in each country: who is at the helm of the parties that shape political leadership in the EU."],
    D4: ["D4 — National ministries dealing with environment and climate change", "The gender composition of ministers and senior administrators in the national ministries responsible for environment and climate policy: the people who shape and implement climate action in each country. EIGE has published this series up to 2022."],
    D3: ["D3 — Research funding organisations: presidents and members", "The gender distribution among presidents and board members of the organisations that fund research in each country, pivotal to advancing scientific knowledge and innovation. EIGE has no 2023 data for some countries."],
  };
  const ROLE_PLURAL = {
    PRES_PART: "leaders of major political parties", PRES_DEP_PART: "deputy leaders of major political parties",
    MEMB_GOV: "members of government in environment and climate ministries", MEMB_GOV_SEN: "senior ministers for environment and climate",
    MEMB_GOV_JUN: "junior ministers for environment and climate", ADMIN: "senior administrators in environment and climate ministries",
    ADMIN_L1: "level 1 administrators in environment and climate ministries", ADMIN_L2: "level 2 administrators in environment and climate ministries",
    MEMB_HDM: "board members of research funding organisations", PRES_CHAIR: "presidents or chairs of research funding organisations",
  };
  const BINS = [10, 20, 30, 40, 50];
  const bin = (p) => { let i = 0; while (i < BINS.length && p >= BINS[i]) i++; return i; };
  const BIN_LABELS = ["0–10%", "10–20", "20–30", "30–40", "40–50", "50%+"];
  const mapState = { ds: "D6", pos: "PRES_PART", year: 2023, hot: null };
  const MOVERS_FROM = 2017;

  function mapYears(ds = mapState.ds, pos = mapState.pos) {
    const s = DATA.datasets[ds].series[pos];
    const ys = new Set();
    Object.values(s).forEach((rows) => rows.forEach((r) => r[2] > 0 && ys.add(r[0])));
    return [...ys].sort((a, b) => a - b);
  }
  function mapValues(year) {
    const ds = DATA.datasets[mapState.ds], s = ds.series[mapState.pos], out = new Map();
    Object.entries(s).forEach(([k, rows]) => {
      if (ds.aggregates.includes(k)) return;
      const r = rows.find((q) => q[0] === year);
      if (r && r[2] > 0) out.set(k, { k, name: keyName(mapState.ds, k), w: r[1], t: r[2], p: (100 * r[1]) / r[2] });
    });
    return out;
  }
  function applyMapHash(h) {
    if (h.ds && MAP_DEFAULT[h.ds]) {
      mapState.ds = h.ds;
      mapState.pos = h.role && DATA.datasets[h.ds].positions[h.role] ? h.role : MAP_DEFAULT[h.ds];
    }
    if (h.year && /^\d{4}$/.test(h.year)) mapState.year = +h.year;
  }

  let syncMapControls = () => {};
  function setupMap() {
    const posSel = $("#map-pos"), yr = $("#map-year"), out = $("#map-year-out");
    function fillPos() {
      posSel.replaceChildren();
      Object.entries(DATA.datasets[mapState.ds].positions).forEach(([k, v]) => {
        const o = el("option", null, v); o.value = k; posSel.appendChild(o);
      });
      posSel.value = mapState.pos;
    }
    function fitYears() {
      const ys = mapYears();
      yr.min = ys[0]; yr.max = ys[ys.length - 1];
      if (mapState.year > +yr.max) mapState.year = +yr.max;
      if (mapState.year < +yr.min) mapState.year = +yr.min;
      yr.value = mapState.year; out.textContent = mapState.year;
    }
    syncMapControls = () => {
      $$('input[name="mapds"]').forEach((r) => { r.checked = r.value === mapState.ds; });
      fillPos(); fitYears();
    };
    $$('input[name="mapds"]').forEach((r) => r.addEventListener("change", () => {
      mapState.ds = r.value; mapState.pos = MAP_DEFAULT[r.value]; fillPos(); fitYears(); renderMap(); url.write();
    }));
    posSel.addEventListener("change", () => { mapState.pos = posSel.value; fitYears(); renderMap(); url.write(); });
    yr.addEventListener("input", () => { mapState.year = +yr.value; out.textContent = yr.value; renderMap(); url.write(); });
    syncMapControls();

    const lg = $("#map-legend");
    BIN_LABELS.forEach((l, i) => { const it = el("div", "legend__i"); const sw = el("span", "legend__sw"); sw.style.background = `var(--seq-${i})`; it.append(sw, el("span", null, l)); lg.appendChild(it); });
    const nd = el("div", "legend__i legend__i--nd"); nd.append(el("span", "legend__sw"), el("span", null, "No data")); lg.appendChild(nd);

    onResize($("#choropleth"), () => renderMap());
    onResize($("#rank"), () => renderMap());
    onResize($("#movers-up"), () => renderMovers());
  }

  function renderMap() {
    const vals = mapValues(mapState.year);
    const host = $("#choropleth");
    const W = host.clientWidth || 600, H = Math.round(W * 0.82);
    const frame = { type: "Feature", geometry: { type: "Polygon", coordinates: [[[-24, 34], [-24, 71], [10, 71], [42, 71], [42, 34], [10, 34], [-24, 34]]] } };
    const proj = d3.geoConicConformal().parallels([40, 64]).rotate([-10, 0]).fitSize([W, H], frame);
    const path = d3.geoPath(proj);
    host.replaceChildren();
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H)
      .attr("role", "img").attr("aria-label", `Choropleth map of the share of women, ${MAP_DESC[mapState.ds][0]}, ${DATA.datasets[mapState.ds].positions[mapState.pos]}, ${mapState.year}. The ranked list beside it gives every value; select a row to open a country profile.`);
    svg.append("defs").append("clipPath").attr("id", "mapclip").append("rect").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("clip-path", "url(#mapclip)");
    g.selectAll("path").data(GEO.features).join("path")
      .attr("d", path)
      .attr("class", (f) => "c" + (vals.has(f.properties.iso2) ? " has" : "") + (mapState.hot === f.properties.iso2 ? " is-hot" : "") + (cpState.a === f.properties.iso2 ? " is-sel" : ""))
      .attr("data-k", (f) => f.properties.iso2)
      .style("fill", (f) => { const v = vals.get(f.properties.iso2); return v ? `var(--seq-${bin(v.p)})` : "var(--nodata)"; })
      .on("pointermove", (ev, f) => {
        const v = vals.get(f.properties.iso2);
        showTip(v ? [`${f1(v.p)}%`, `${v.name} · ${v.w} women of ${v.t}`, `${mapState.year} · click for the country profile`] : [f.properties.name, "No data"], ev.clientX, ev.clientY);
        setHot(f.properties.iso2);
      })
      .on("pointerleave", () => { hideTip(); setHot(null); })
      .on("click", (ev, f) => { if (COUNTRIES.has(f.properties.iso2)) { hideTip(); openProfile(f.properties.iso2, { scroll: true }); } });
    renderRank(vals);
    renderMovers();
    caption(vals);
    const [t, d] = MAP_DESC[mapState.ds];
    $("#map-desc").replaceChildren(el("h3", null, t), el("p", null, d));
  }
  function setHot(k) {
    mapState.hot = k;
    $$("#choropleth path.c").forEach((p) => p.classList.toggle("is-hot", p.dataset.k === k));
    $$("#rank .row").forEach((r) => r.classList.toggle("is-hot", r.dataset.k === k));
  }

  function caption(vals) {
    const eu = at(series(mapState.ds, mapState.pos, "EU27_2020"), mapState.year);
    const role = ROLE_PLURAL[mapState.pos] || DATA.datasets[mapState.ds].positions[mapState.pos].toLowerCase();
    const list = [...vals.values()];
    const none = list.filter((v) => v.w === 0).length;
    const top = list.slice().sort((a, b) => b.p - a.p || a.name.localeCompare(b.name));
    const topP = top.length ? top[0].p : 0, tops = top.filter((v) => v.p === topP).map((v) => v.name);
    let txt = "";
    if (eu) txt += `In ${mapState.year}, ${f1(eu.p)}% of ${role} in the EU-27 were women (${eu.w} of ${eu.t}). `;
    if (list.length) {
      txt += `Highest: ${tops.slice(0, 3).join(", ")}${tops.length > 3 ? ` and ${tops.length - 3} more` : ""} (${f1(topP)}%). `;
      txt += none ? `${none} of ${list.length} countries with data had no woman in this role.` : `Every one of the ${list.length} countries with data had at least one woman in this role.`;
    }
    $("#map-caption").textContent = txt;
  }

  function renderRank(vals) {
    const host = $("#rank");
    const W = host.clientWidth || 360;
    const from = mapState.year > 2017 ? mapValues(2017) : null;
    $("#rank-to").textContent = mapState.year;
    $("#rank-from").textContent = from ? "2017" : "(2017 comparison shown from 2018 on)";
    $(".rankfig .key--from").style.visibility = from ? "" : "hidden";
    const rows = [...vals.values()].sort((a, b) => b.p - a.p || a.name.localeCompare(b.name));
    const eu = at(series(mapState.ds, mapState.pos, "EU27_2020"), mapState.year);
    const rowH = 22, nameW = W > 420 ? 168 : 128, valW = 46, m = { t: 4, b: 22 };
    const H = m.t + rows.length * rowH + m.b;
    const x = d3.scaleLinear().domain([0, 100]).range([nameW + 6, W - valW - 8]);
    host.replaceChildren();
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H)
      .attr("tabindex", 0).attr("role", "img")
      .attr("aria-label", `Countries ranked by share of women, ${mapState.year}: ` + rows.map((r) => `${r.name} ${f1(r.p)}%`).join(", ") + ". Use up and down arrow keys to step through countries, and Enter to open a country profile.");
    svg.append("g").attr("class", "grid").selectAll("line").data([0, 25, 75, 100]).join("line").attr("x1", x).attr("x2", x).attr("y1", m.t).attr("y2", H - m.b);
    svg.append("g").selectAll("text").data([0, 50, 100]).join("text").attr("x", x).attr("y", H - 6).attr("text-anchor", "middle").text((d) => d + "%");
    svg.append("line").attr("class", "parity").attr("x1", x(PARITY)).attr("x2", x(PARITY)).attr("y1", m.t).attr("y2", H - m.b);
    if (eu) svg.append("line").attr("class", "eu-line").attr("x1", x(eu.p)).attr("x2", x(eu.p)).attr("y1", m.t).attr("y2", H - m.b).style("opacity", 0.55);
    const g = svg.selectAll("g.row").data(rows).join("g").attr("class", (d) => "row" + (mapState.hot === d.k ? " is-hot" : "") + (cpState.a === d.k ? " is-sel" : "")).attr("data-k", (d) => d.k)
      .attr("transform", (d, i) => `translate(0,${m.t + i * rowH})`);
    g.append("rect").attr("class", "row-hit").attr("x", 0).attr("y", 0).attr("width", W).attr("height", rowH);
    g.append("text").attr("class", "t-ink").attr("x", 0).attr("y", 15).style("font-size", "13px").text((d) => d.name.length > (W > 420 ? 24 : 17) ? d.name.slice(0, W > 420 ? 23 : 16) + "…" : d.name);
    g.append("text").attr("class", "t-ink").attr("x", W).attr("y", 15).attr("text-anchor", "end").style("font-size", "13px").text((d) => f1(d.p) + "%");
    g.each(function (d) {
      const row = d3.select(this), f = from && from.get(d.k);
      if (f) {
        row.append("line").attr("class", "bar-link").attr("x1", x(f.p)).attr("x2", x(d.p)).attr("y1", 11).attr("y2", 11);
        row.append("circle").attr("class", "dot-from").attr("r", 4.5).attr("cx", x(f.p)).attr("cy", 11);
      }
      row.append("circle").attr("class", "dot-to").attr("r", 5).attr("cx", x(d.p)).attr("cy", 11);
    });
    const tipLines = (d) => { const f = from && from.get(d.k); return [`${f1(d.p)}%`, `${d.name} · ${d.w} women of ${d.t}, ${mapState.year}`].concat(f ? [`2017: ${f1(f.p)}% (${f.w}/${f.t})`] : []); };
    g.on("pointermove", (ev, d) => { showTip(tipLines(d), ev.clientX, ev.clientY); setHot(d.k); })
      .on("pointerleave", () => { hideTip(); setHot(null); })
      .on("click", (ev, d) => { hideTip(); openProfile(d.k, { scroll: true }); });
    let idx = -1;
    svg.on("keydown", (ev) => {
      if (ev.key === "Enter" && idx >= 0) { ev.preventDefault(); hideTip(); openProfile(rows[idx].k, { scroll: true, focus: true }); return; }
      if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
      ev.preventDefault();
      idx = Math.max(0, Math.min(rows.length - 1, idx + (ev.key === "ArrowDown" ? 1 : -1)));
      setHot(rows[idx].k);
      tipAtElement(host.querySelectorAll(".row")[idx], tipLines(rows[idx]).concat(["Enter: open the country profile"]));
    }).on("blur", () => { hideTip(); setHot(null); idx = -1; });
  }

  /* ---------- biggest movers, 2017 -> selected year ---------- */
  function renderMovers() {
    const role = ROLE_PLURAL[mapState.pos] || DATA.datasets[mapState.ds].positions[mapState.pos].toLowerCase();
    const note = $("#movers-note"), up = $("#movers-up"), down = $("#movers-down");
    $("#movers-h").textContent = `Biggest movers, ${MOVERS_FROM}–${mapState.year}`;
    if (mapState.year <= MOVERS_FROM) {
      note.textContent = `Pick a year after ${MOVERS_FROM} to see which countries changed most.`;
      up.replaceChildren(); down.replaceChildren(); return;
    }
    const a = mapValues(MOVERS_FROM), b = mapValues(mapState.year);
    const rows = [...b.values()].filter((v) => a.has(v.k)).map((v) => { const f = a.get(v.k); return { k: v.k, name: v.name, from: f, to: v, d: halfUp(v.p) - halfUp(f.p) }; });
    const ups = rows.filter((r) => r.d > 0).sort((p, q) => q.d - p.d || p.name.localeCompare(q.name)).slice(0, 5);
    const downs = rows.filter((r) => r.d < 0).sort((p, q) => p.d - q.d || p.name.localeCompare(q.name)).slice(0, 5);
    const same = rows.filter((r) => r.d === 0).length;
    note.textContent = `Change in the share of ${role} who are women, in percentage points, for the ${rows.length} countries with values in both years. ${same} did not change. Small bodies swing widely: read the headcounts.`;
    const maxAbs = d3.max(rows, (r) => Math.abs(r.d)) || 1;
    [[up, ups, "rises"], [down, downs, "falls"]].forEach(([host, list, kind]) => {
      const W = host.clientWidth || 320, rowH = 44, H = Math.max(1, list.length) * rowH + 4;
      host.replaceChildren();
      if (!list.length) { host.appendChild(el("p", "note", `No country ${kind === "rises" ? "rose" : "fell"}.`)); return; }
      const x = d3.scaleLinear().domain([0, maxAbs]).range([0, Math.max(40, W - 70)]);
      const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H)
        .attr("role", "img").attr("aria-label", `Largest ${kind}: ` + list.map((r) => `${r.name} ${pts(r.d)}, ${r.from.w} of ${r.from.t} in ${MOVERS_FROM} to ${r.to.w} of ${r.to.t} in ${mapState.year}`).join("; ") + ".");
      const g = svg.selectAll("g").data(list).join("g").attr("class", "row").attr("transform", (d, i) => `translate(0,${i * rowH})`);
      g.append("rect").attr("class", "row-hit").attr("x", 0).attr("y", 0).attr("width", W).attr("height", rowH - 2);
      g.append("text").attr("class", "t-ink").attr("x", 0).attr("y", 15).style("font-size", "14px").style("font-weight", 600).text((d) => d.name);
      g.append("text").attr("x", W).attr("y", 15).attr("text-anchor", "end").style("font-size", "13px").text((d) => `${d.from.w}/${d.from.t} → ${d.to.w}/${d.to.t}`);
      g.append("rect").attr("class", "bar").attr("x", 0).attr("y", 24).attr("height", 10).attr("rx", 2).attr("width", (d) => Math.max(2, x(Math.abs(d.d))));
      g.append("text").attr("class", "t-strong").attr("x", (d) => Math.max(2, x(Math.abs(d.d))) + 6).attr("y", 33).style("font-size", "13px").text((d) => pts(d.d));
      g.on("pointermove", (ev, d) => showTip([pts(d.d), `${d.name}`, `${MOVERS_FROM}: ${f1(d.from.p)}% (${d.from.w} of ${d.from.t})`, `${mapState.year}: ${f1(d.to.p)}% (${d.to.w} of ${d.to.t})`], ev.clientX, ev.clientY))
        .on("pointerleave", hideTip)
        .on("click", (ev, d) => { hideTip(); openProfile(d.k, { scroll: true }); });
    });
  }

  /* ---------- country profiles ---------- */
  const CP_SETS = [
    { ds: "D6", pos: "PRES_PART", title: "Leaders of major political parties" },
    { ds: "D4", pos: "MEMB_GOV", title: "Ministers for environment and climate" },
    { ds: "D3", pos: "MEMB_HDM", title: "Board members of research funding organisations" },
  ];
  const COUNTRIES = new Map();
  const cpState = { a: null, b: null };
  function setupProfiles() {
    CP_SETS.forEach(({ ds }) => {
      const d = DATA.datasets[ds];
      Object.keys(d.keys).forEach((k) => { if (!d.aggregates.includes(k) && !COUNTRIES.has(k)) COUNTRIES.set(k, d.keys[k]); });
    });
    const sorted = [...COUNTRIES.entries()].sort((p, q) => p[1].localeCompare(q[1]));
    const dl = $("#cp-list");
    sorted.forEach(([k, n]) => { const o = el("option"); o.value = n; o.label = EU27.includes(k) ? `${k} · EU-27` : k; dl.appendChild(o); });
    const find = (v) => {
      const s = v.trim().toLowerCase();
      if (!s) return "";
      for (const [k, n] of COUNTRIES) if (n.toLowerCase() === s || k.toLowerCase() === s) return k;
      const starts = sorted.filter(([, n]) => n.toLowerCase().startsWith(s));
      return starts.length === 1 ? starts[0][0] : null;
    };
    const ia = $("#cp-country"), ib = $("#cp-compare");
    function commit(inp, which) {
      const k = find(inp.value);
      if (k === null) { $("#cp-status").textContent = `No country matches “${inp.value.trim()}”. Pick one from the list.`; return; }
      if (which === "a") { if (!k) return; openProfile(k); } else { cpState.b = k || null; if (cpState.b === cpState.a) cpState.b = null; renderProfile(); url.write(); }
    }
    [[ia, "a"], [ib, "b"]].forEach(([inp, which]) => {
      inp.addEventListener("change", () => commit(inp, which));
      inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); commit(inp, which); } });
      inp.addEventListener("input", () => { const k = find(inp.value); if (k && [...COUNTRIES.values()].some((n) => n === inp.value)) commit(inp, which); if (which === "b" && inp.value === "") { cpState.b = null; renderProfile(); url.write(); } });
    });
    onResize($("#cp-grid"), () => renderProfile());
  }
  function openProfile(k, o = {}) {
    if (!COUNTRIES.has(k)) return;
    cpState.a = k;
    if (cpState.b === k) cpState.b = null;
    renderProfile();
    $$("#choropleth path.c").forEach((p) => p.classList.toggle("is-sel", p.dataset.k === k));
    $$("#rank .row").forEach((r) => r.classList.toggle("is-sel", r.dataset.k === k));
    if (!o.silent) url.write();
    if (o.scroll) scrollToId("countries");
    if (o.focus) $("#cp-name").focus({ preventScroll: true });
  }
  function renderProfile() {
    const box = $("#cp");
    if (!cpState.a) { box.hidden = true; return; }
    const A = cpState.a, B = cpState.b;
    const nA = COUNTRIES.get(A), nB = B ? COUNTRIES.get(B) : null;
    $("#cp-country").value = nA;
    $("#cp-compare").value = nB || "";
    box.hidden = false;
    const name = $("#cp-name");
    name.textContent = nA + (nB ? ` and ${nB}` : "");
    name.tabIndex = -1;
    $("#cp-status").textContent = `Showing ${nA}${nB ? ", compared with " + nB : ""}.${EU27.includes(A) ? "" : ` ${nA} is not an EU-27 member state; the EU-27 line is for reference.`}`;
    const key = $("#cp-key");
    key.replaceChildren();
    const addKey = (cls, txt) => { key.append(el("span", "key " + cls), document.createTextNode(txt)); };
    addKey("key--cty", nA);
    if (nB) addKey("key--cmp", nB);
    addKey("key--ref", "EU-27");
    addKey("key--par", "Parity");
    key.querySelectorAll(".key").forEach((k) => k.setAttribute("aria-hidden", "true"));
    const grid = $("#cp-grid");
    grid.replaceChildren();
    const trows = [];
    CP_SETS.forEach((set) => {
      const sA = series(set.ds, set.pos, A), sB = B ? series(set.ds, set.pos, B) : [], sE = series(set.ds, set.pos, "EU27_2020");
      const card = el("div", "cpc");
      card.appendChild(el("div", "cpc__ds", `${set.ds} · ${DATA.datasets[set.ds].positions[set.pos]}`));
      card.appendChild(el("h4", "cpc__t", set.title));
      if (!sA.length) {
        card.appendChild(el("p", "note", `EIGE publishes no values for ${nA} in this dataset.`));
        grid.appendChild(card); return;
      }
      const lA = latest(sA), eL = at(sE, lA.y);
      card.appendChild(el("div", "cpc__v", f1(lA.p) + "%"));
      card.appendChild(el("p", "cpc__vn", `${lA.w} of ${lA.t} were women in ${lA.y}` + (eL ? `; EU-27 ${f1(eL.p)}%` : "") + (B && at(sB, lA.y) ? `; ${nB} ${f1(at(sB, lA.y).p)}%` : "") + "."));
      let rank = "";
      if (EU27.includes(A)) {
        const vals = EU27.map((k) => ({ k, d: at(series(set.ds, set.pos, k), lA.y) })).filter((v) => v.d);
        const higher = vals.filter((v) => v.d.p > lA.p + 1e-9).length;
        const tied = vals.filter((v) => Math.abs(v.d.p - lA.p) < 1e-9).length;
        rank = `${tied > 1 ? "Joint " : ""}${ordinal(higher + 1)} of ${vals.length} EU-27 countries with data in ${lA.y}.`;
      }
      card.appendChild(el("p", "cpc__rank", rank));
      const chart = el("div", "chart");
      chart.tabIndex = 0;
      chart.setAttribute("role", "img");
      chart.setAttribute("aria-label", `${set.title}, share of women: ${nA} ${f1(sA[0].p)}% in ${sA[0].y} and ${f1(lA.p)}% in ${lA.y}` + (sB.length ? `; ${nB} ${f1(latest(sB).p)}% in ${latest(sB).y}` : "") + (eL ? `; EU-27 ${f1(eL.p)}% in ${lA.y}` : "") + ". Use left and right arrow keys to read each year; the table below lists all values.");
      card.appendChild(chart);
      grid.appendChild(card);
      profileChart(chart, set, [{ s: sA, name: nA, cls: "" }, ...(sB.length ? [{ s: sB, name: nB, cls: "-cmp" }] : []), { s: sE, name: "EU-27", cls: "-ref" }]);
      const years = [...new Set([...sA, ...sB, ...sE].map((d) => d.y))].sort((p, q) => p - q);
      const fmt = (d) => (d ? `${f1(d.p)}% (${d.w}/${d.t})` : "–");
      years.forEach((y) => trows.push([`${set.ds} ${y}`, fmt(at(sA, y)), ...(B ? [fmt(at(sB, y))] : []), fmt(at(sE, y))]));
    });
    $("#cp-table").replaceChildren(table(["Dataset and year", nA, ...(nB ? [nB] : []), "EU-27"], trows));
  }
  const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

  function profileChart(host, set, lines) {
    const W = host.clientWidth || 300, H = 190, m = { l: 34, r: 10, t: 12, b: 22 };
    const all = lines.flatMap((l) => l.s);
    const x0 = d3.min(all, (d) => d.y), x1 = d3.max(all, (d) => d.y);
    const x = d3.scaleLinear().domain([x0, x1]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 100]).range([H - m.b, m.t]);
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H).attr("aria-hidden", "true");
    svg.append("g").attr("class", "grid").selectAll("line").data([25, 75, 100]).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
    svg.append("g").selectAll("text").data([0, 50, 100]).join("text").attr("x", m.l - 6).attr("y", (d) => y(d) + 4).attr("text-anchor", "end").text((d) => d + "%");
    const xt = x1 - x0 > 8 ? [x0, Math.round((x0 + x1) / 2), x1] : [x0, x1];
    svg.append("g").selectAll("text").data(xt).join("text").attr("x", x).attr("y", H - 4).attr("text-anchor", (d, i) => (i === 0 ? "start" : i === xt.length - 1 ? "end" : "middle")).text((d) => d);
    svg.append("line").attr("class", "base").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0));
    svg.append("line").attr("class", "parity").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(PARITY)).attr("y2", y(PARITY));
    svg.append("text").attr("class", "parity-t").attr("x", m.l + 4).attr("y", y(PARITY) - 5).text("Parity");
    const ln = d3.line().x((d) => x(d.y)).y((d) => y(d.p));
    lines.slice().reverse().forEach((l) => {
      svg.append("path").attr("class", "ln" + l.cls).attr("d", ln(l.s));
      if (l.cls !== "-ref") svg.append("g").selectAll("circle").data(l.s).join("circle").attr("class", "dot" + l.cls).attr("r", 4).attr("cx", (d) => x(d.y)).attr("cy", (d) => y(d.p));
    });
    const years = [...new Set(all.map((d) => d.y))].sort((p, q) => p - q);
    const cross = svg.append("line").attr("class", "cross").attr("y1", m.t).attr("y2", H - m.b).style("display", "none");
    const tipLines = (yr) => [String(yr), ...lines.map((l) => { const d = at(l.s, yr); return d ? `${l.name}: ${f1(d.p)}% (${d.w} of ${d.t})` : `${l.name}: no data`; })];
    const mark = (yr) => cross.style("display", null).attr("x1", x(yr)).attr("x2", x(yr));
    const clear = () => { cross.style("display", "none"); hideTip(); };
    svg.append("rect").attr("x", m.l).attr("y", 0).attr("width", W - m.l - m.r).attr("height", H).attr("fill", "transparent")
      .on("pointermove", (ev) => { const v = x.invert(d3.pointer(ev)[0]); const yr = years.reduce((p, q) => (Math.abs(q - v) < Math.abs(p - v) ? q : p)); mark(yr); showTip(tipLines(yr), ev.clientX, ev.clientY); })
      .on("pointerleave", clear);
    let idx = years.length - 1;
    host.onkeydown = (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      idx = Math.max(0, Math.min(years.length - 1, idx + (ev.key === "ArrowRight" ? 1 : -1)));
      mark(years[idx]); const r = host.getBoundingClientRect();
      showTip(tipLines(years[idx]), r.left + x(years[idx]), r.top + m.t + 20);
    };
    host.onblur = clear;
  }

  /* ---------- institutions ---------- */
  const INST_DEFAULT = { D1: ["MEMB_HDM", "TOT"], D2: ["MEMB_HDM", "TOT"], D5: ["MEMB_CRT", "ECJ"] };
  const INST_DESC = {
    D1: {
      _: "Three institutions: the European Investment Bank (EIB), the European Central Bank (ECB) and the European Investment Fund (EIF). Each has its own focus and mandate; together they drive economic growth, financial stability and innovation in the EU.",
      EIB: "Established in 1958, the EIB is the long-term lending institution of the EU. It finances infrastructure, innovation, climate action and small and medium-sized enterprises, and is led by a President.",
      ECB: "Founded in 1998, the ECB sets monetary policy for the eurozone. It maintains price stability, keeps financial markets functioning, issues the euro, and is guided by a President and an Executive Board.",
      EIF: "Part of the EIB Group, the EIF supports Europe's micro, small and medium-sized enterprises with guarantees and equity financing. It is led by a Chief Executive.",
    },
    D2: {
      _: "European agencies are decentralised EU bodies that carry out specific tasks across policy areas, from regulatory oversight and scientific research to implementing EU policy in fields such as environment, food safety and aviation safety. Each typically has a leadership team (a president or chair, an executive head) and a board of representatives from member states. They operate independently and give expertise, support and coordination to member states.",
    },
    D5: {
      _: "Legal institutions develop and interpret EU law, protect rights, resolve disputes and keep EU law consistent.",
      CJEU: "The Court of Justice of the European Union is the EU's supreme judicial authority. It ensures EU law is interpreted and applied the same way in every member state, and comprises the Court of Justice, the General Court and specialised courts.",
      CST: "The Civil Service Tribunal was a specialised court within the CJEU for disputes between the EU and its staff: employment, working conditions and staff roles. EIGE's series ends in 2016.",
      ECHR: "Based in Strasbourg, the European Court of Human Rights is a body of the Council of Europe, not of the EU. Individuals can bring cases against states for violations of the European Convention on Human Rights.",
      ECJ: "The European Court of Justice is the highest court in matters of EU law. It interprets EU legislation, ensures its uniform application and settles disputes between member states, institutions and individuals.",
      GC: "Part of the CJEU, the General Court hears cases brought by individuals, businesses and sometimes member states against EU institutions, as a court of first instance.",
    },
  };
  const instState = { ds: "D1", pos: "MEMB_HDM", ent: "TOT" };
  function setupInst() {
    const posSel = $("#inst-pos"), entSel = $("#inst-ent");
    function fill() {
      const ds = DATA.datasets[instState.ds];
      posSel.replaceChildren();
      Object.entries(ds.positions).forEach(([k, v]) => { const o = el("option", null, v); o.value = k; posSel.appendChild(o); });
      posSel.value = instState.pos;
      fillEnt();
    }
    function fillEnt() {
      const ds = DATA.datasets[instState.ds];
      const avail = Object.keys(ds.series[instState.pos] || {}).filter((k) => series(instState.ds, instState.pos, k).length);
      const keys = avail.sort((a, b) => (a === "TOT" ? -1 : b === "TOT" ? 1 : keyName(instState.ds, a).localeCompare(keyName(instState.ds, b))));
      entSel.replaceChildren();
      keys.forEach((k) => { const o = el("option", null, k === "TOT" ? "All bodies (EIGE total)" : keyName(instState.ds, k)); o.value = k; entSel.appendChild(o); });
      if (!keys.includes(instState.ent)) instState.ent = keys[0];
      entSel.value = instState.ent;
    }
    $$('input[name="instds"]').forEach((r) => r.addEventListener("change", () => {
      instState.ds = r.value; [instState.pos, instState.ent] = INST_DEFAULT[r.value]; fill(); renderInst();
    }));
    posSel.addEventListener("change", () => { instState.pos = posSel.value; fillEnt(); renderInst(); });
    entSel.addEventListener("change", () => { instState.ent = entSel.value; renderInst(); });
    fill();
    onResize($("#inst-chart"), () => renderInst());
  }
  function renderInst() {
    const { ds, pos, ent } = instState;
    const s = series(ds, pos, ent);
    const name = ent === "TOT" ? "All bodies" : keyName(ds, ent);
    const role = DATA.datasets[ds].positions[pos];
    const host = $("#inst-chart");
    $("#inst-title").textContent = `${name} · ${role}: share of women, ${s[0].y}–${latest(s).y}`;
    host.setAttribute("aria-label", `Line chart, ${name}, ${role}. ${f1(s[0].p)}% in ${s[0].y}, ${f1(latest(s).p)}% in ${latest(s).y}. Use left and right arrow keys to read each year; the table below lists all values.`);
    const W = host.clientWidth || 600;
    const x0 = s[0].y, x1 = latest(s).y;
    const ticks = x1 - x0 > 12 ? d3.range(Math.ceil(x0 / 5) * 5, x1 + 1, 5) : d3.range(x0, x1 + 1, x1 - x0 > 6 ? 2 : 1);
    lineChart(host, s, { x: [x0, x1], y: [0, 100], h: Math.max(240, Math.min(340, W * 0.45)), yTicks: [0, 25, 75, 100], xTicks: ticks, dots: true, endLabel: true, label: `${name}, ${role}` });
    const desc = INST_DESC[ds];
    const box = $("#inst-desc");
    box.replaceChildren(el("h3", null, name), el("p", null, desc[ent] || desc._));
    const last = latest(s);
    box.appendChild(el("p", "muted", `${last.y}: ${last.w} women of ${last.t} (${f1(last.p)}%).` + (last.t <= 10 ? ` In a body of ${last.t}, one appointment moves the share by ${f1(100 / last.t)} points.` : "")));
    $("#inst-table").replaceChildren(table(["Year", "Women", "Total", "Share of women"], s.map((d) => [String(d.y), String(d.w), String(d.t), f1(d.p) + "%"])));
  }

  /* ---------- boot ---------- */
  Promise.all([
    fetch("data/web/wipeu.json").then((r) => r.json()),
    fetch("data/web/europe.min.geojson").then((r) => r.json()),
  ]).then(([data, geo]) => {
    DATA = data; GEO = geo;
    const h = url.read();
    applyMapHash(h);
    kpis();
    setupChamber();
    smallMultiples();
    dumbbell();
    pace();
    setupProfiles();
    setupMap();
    setupInst();
    if (h.country && COUNTRIES.has(h.country.toUpperCase())) {
      if (h.compare && COUNTRIES.has(h.compare.toUpperCase())) cpState.b = h.compare.toUpperCase();
      openProfile(h.country.toUpperCase());
    }
    else openProfile("IT", { silent: true }); // a default profile, without touching the address bar
    if (h.country || h.ds) requestAnimationFrame(() => setTimeout(() => scrollToId(h.country ? "countries" : "map"), 60));
    window.addEventListener("hashchange", () => {
      const q = url.read();
      if (!Object.keys(q).length) return;
      applyMapHash(q); syncMapControls(); renderMap();
      if (q.country && COUNTRIES.has(q.country.toUpperCase())) { cpState.b = q.compare && COUNTRIES.has(q.compare.toUpperCase()) ? q.compare.toUpperCase() : null; openProfile(q.country.toUpperCase(), { scroll: true }); }
    });
  }).catch((err) => {
    console.error("wipEU: could not load data", err);
    $$(".chart").forEach((c) => { c.textContent = "The chart data could not be loaded. The datasets can be downloaded in section 09."; });
  });
})();
