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
  const chState = { id: "politics", year: 2023, playing: false, timer: 0, prevN: 0, where: "", compare: false };
  const COUNTRY_DS = ["D6", "D4", "D3"];   // datasets EIGE reports country by country

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
      inp.addEventListener("change", () => { chState.id = id; stop(); fillWhere(); fitYears(); renderChamber(true); });
      lab.append(inp, sp); box.appendChild(lab);
    });
    const yr = $("#ch-year"), out = $("#ch-year-out"), play = $("#ch-play");
    const where = $("#ch-where"), cmp = $("#ch-compare");
    // where: the EU-27 total, or one country, for the bodies EIGE reports country by country
    function fillWhere() {
      const a = chArea();
      where.replaceChildren();
      if (!COUNTRY_DS.includes(a.ds)) {
        const o = el("option", null, "EU body: not reported by country"); o.value = ""; where.appendChild(o);
        where.disabled = true; chState.where = ""; return;
      }
      where.disabled = false;
      const ds = DATA.datasets[a.ds];
      const eu = el("option", null, "EU-27, all member states"); eu.value = ""; where.appendChild(eu);
      Object.keys(ds.series[a.pos] || {})
        .filter((k) => !ds.aggregates.includes(k) && series(a.ds, a.pos, k).length)
        .sort((p, q) => keyName(a.ds, p).localeCompare(keyName(a.ds, q)))
        .forEach((k) => { const o = el("option", null, keyName(a.ds, k)); o.value = k; where.appendChild(o); });
      if (![...where.options].some((o) => o.value === chState.where)) chState.where = "";
      where.value = chState.where;
    }
    where.addEventListener("change", () => { chState.where = where.value; stop(); fitYears(); renderChamber(true); });
    cmp.addEventListener("click", () => { chState.compare = !chState.compare; cmp.setAttribute("aria-pressed", String(chState.compare)); renderChamber(false); });
    function fitYears() {
      const s = chSeries();
      const ys = s.map((d) => d.y);
      yr.min = ys[0]; yr.max = ys[ys.length - 1];
      if (!ys.includes(chState.year)) chState.year = latest(s).y;
      yr.value = chState.year; out.textContent = chState.year;
      const a = chArea();
      $("#ch-table").replaceChildren(table(["Year", "Women", "Men", "Total", "Share of women"], s.map((d) => [String(d.y), String(d.w), String(d.t - d.w), String(d.t), f1(d.p) + "%"])));
      $("#ch-name").textContent = `${a.label} · ${chState.where ? keyName(a.ds, chState.where) : a.scope} (${a.ds})`;
      $("#ch-compare-y").textContent = s[0].y;
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
    fillWhere();
    fitYears();
    onResize($("#hemicycle"), () => renderChamber(false));
  }
  const chArea = () => DATA.areas.find((a) => a.id === chState.id);
  const chKey = () => { const a = chArea(); return COUNTRY_DS.includes(a.ds) && chState.where ? chState.where : a.key; };
  const chSeries = () => { const a = chArea(); return series(a.ds, a.pos, chKey()); };

  function renderChamber(animate) {
    const host = $("#hemicycle");
    const s = chSeries(), d = at(s, chState.year), a = chArea();
    const W = host.clientWidth || 700;
    const r0 = 0.36, rows = chState.rows;
    const seats = hemiLayout(d.t, rows, r0);
    const spacing = rows === 1 ? 1 - r0 : (1 - r0) / (rows - 1);
    const arcStep = d3.min(d3.range(rows), (i) => {
      const r = rows === 1 ? 1 : r0 + spacing * i, k = seats.filter((q) => Math.abs(q.r - r) < 1e-9).length;
      return k > 1 ? (Math.PI * r) / (k - 1) : Infinity;
    });
    // dot size as a share of the radius, capped so a body of five seats does not fill the page,
    // and the arc shrunk by that much so the outer dots stay inside the chart
    const dotK = Math.min(0.09, 0.42 * Math.min(spacing, arcStep));
    const R = (W / 2 - 4) / (1 + dotK), dotR = Math.max(1.2, dotK * R);
    const cx = W / 2, cy = R + dotR + 4, H = cy + Math.max(12, dotR + 4);
    let svg = d3.select(host).select("svg");
    if (svg.empty() || +svg.attr("data-w") !== W) {
      host.replaceChildren();
      svg = d3.select(host).append("svg").attr("aria-hidden", "true");
      svg.append("path").attr("class", "gain");
      svg.append("g").attr("class", "seats");
      svg.append("line").attr("class", "front");
      svg.append("text").attr("class", "front-t");
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
    // two years at once: the first year's women/men boundary, and the ground gained or lost since.
    // Seats fill from the left, so a share p ends at the angle pi * (1 - p/100) from the right-hand end.
    const first = s[0], showCmp = chState.compare && first.y !== d.y;
    const ang = (p) => Math.PI * (1 - p / 100);
    const polar = (a, r) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    const rIn = R * r0 - dotR - 3, rOut = R + dotR + 3;
    if (chState.compare) {
      const a0 = ang(first.p), [x0, y0] = polar(a0, rIn), [x1, y1] = polar(a0, rOut + 8);
      svg.select(".front").style("display", null).attr("x1", x0).attr("y1", y0).attr("x2", x1).attr("y2", y1);
      // the label sits past the end of the line; near either end of the arc it moves up, inside the chart
      let [tx, ty] = polar(a0, rOut + 14), anchor = Math.cos(a0) > 0.2 ? "start" : Math.cos(a0) < -0.2 ? "end" : "middle";
      if (anchor === "end" && tx < 110) { anchor = "start"; tx = 2; ty = Math.min(ty, y1) - 14; }
      if (anchor === "start" && tx > W - 110) { anchor = "end"; tx = W - 2; ty = Math.min(ty, y1) - 14; }
      svg.select(".front-t").style("display", null).attr("x", tx).attr("y", ty).attr("text-anchor", anchor).text(`${first.y}: ${f1(first.p)}%`);
      const lo = Math.min(first.p, d.p), hi = Math.max(first.p, d.p);
      svg.select(".gain").style("display", showCmp ? null : "none").attr("class", "gain" + (d.p < first.p ? " is-loss" : ""))
        .attr("transform", `translate(${cx},${cy})`)
        .attr("d", d3.arc().innerRadius(rIn).outerRadius(rOut).startAngle(Math.PI / 2 - ang(lo)).endAngle(Math.PI / 2 - ang(hi))());
      $("#ch-front-key").hidden = false;
      $("#ch-front-txt").textContent = `${first.y}${showCmp ? `, ${pts(halfUp(d.p) - halfUp(first.p))} since` : ""}`;
    } else {
      svg.selectAll(".front, .front-t, .gain").style("display", "none");
      $("#ch-front-key").hidden = true;
    }
    // read-out
    const need = Math.max(0, Math.ceil(d.t / 2) - d.w);
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
    const place = chState.where ? keyName(a.ds, chState.where) : "";
    $("#ch-note").textContent = place
      ? `${a.label} in ${place}: ${d.t} seats in ${d.y}. ` + (d.t <= 30 ? `In a body this small, one appointment moves the share by ${f1(100 / d.t)} points.` : "")
      : notes[a.id];
    host.setAttribute("aria-label", `Hemicycle of ${d.t} seats, ${a.label}${place ? " in " + place : ""}, ${d.y}: ${d.w} women (${f1(d.p)}%) and ${d.t - d.w} men.` +
      (showCmp ? ` In ${first.y}, women held ${f1(first.p)}%.` : "") + " The table below lists every year.");
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

  /* ---------- the glass ceiling: the level below vs the top level of the same body ---------- */
  const LADDER = [
    { area: "Politics", scope: "EU-27", ds: "D6", key: "EU27_2020", lo: "PRES_DEP_PART", hi: "PRES_PART", loN: "Deputy party leaders", hiN: "Party leaders" },
    { area: "Environment & climate", scope: "EU-27", ds: "D4", key: "EU27_2020", lo: "MEMB_GOV_JUN", hi: "MEMB_GOV_SEN", loN: "Junior ministers", hiN: "Senior ministers" },
    { area: "Environment & climate", scope: "EU-27", ds: "D4", key: "EU27_2020", lo: "ADMIN_L2", hi: "ADMIN_L1", loN: "Level 2 civil servants", hiN: "Level 1 civil servants" },
    { area: "Research funding", scope: "EU-27", ds: "D3", key: "EU27_2020", lo: "MEMB_HDM", hi: "PRES_CHAIR", loN: "Board members", hiN: "Presidents and chairs" },
    { area: "EU agencies", scope: "all agencies", ds: "D2", key: "TOT", lo: "MEMB_HDM", hi: "PRES_CHAIR", loN: "Board members", hiN: "Board chairs" },
    { area: "EU agencies", scope: "all agencies", ds: "D2", key: "TOT", lo: "MEMB_HDM", hi: "EXEC_HEAD", loN: "Board members", hiN: "Executive heads" },
    { area: "EU finance", scope: "ECB, EIB, EIF", ds: "D1", key: "TOT", lo: "MEMB_HDM", hi: "PRES_CHAIR", loN: "Board members", hiN: "Presidents and chairs" },
    { area: "EU courts", scope: "Court of Justice of the EU", ds: "D5", key: "CJEU", lo: "MEMB_CRT", hi: "PRES_CRT", loN: "Judges", hiN: "Presidents" },
  ];
  function ladder() {
    const rows = LADDER.map((r) => {
      const a = series(r.ds, r.lo, r.key), b = series(r.ds, r.hi, r.key);
      const y = d3.max(a.filter((d) => at(b, d.y)), (d) => d.y);
      return y ? { ...r, y, lo: at(a, y), hi: at(b, y), d: halfUp(at(b, y).p) - halfUp(at(a, y).p), small: at(b, y).t <= 5 } : null;
    }).filter(Boolean);
    const fewer = rows.filter((r) => r.d < 0), more = rows.filter((r) => r.d > 0);
    const big = fewer.filter((r) => !r.small);
    $("#ladder-lede").textContent = `In ${fewer.length} of ${rows.length} bodies, women hold a smaller share of the top seats than of the level just below` +
      (big.length ? `, from ${pts(d3.max(big, (r) => r.d))} to ${pts(d3.min(big, (r) => r.d))} among the larger bodies` : "") + ". " +
      (more.length ? `The exceptions: ${more.map((r) => `${r.hiN.toLowerCase()} in ${r.area === "EU finance" ? "EU finance" : r.area.toLowerCase().replace("eu ", "EU ")} (${r.hi.w} of ${r.hi.t})`).join(", ")}.` : "");
    const host = $("#ladder");
    const draw = (W) => {
      const narrow = W < 560, rowH = 78, labW = 0, m = { t: 6, b: 26, r: 14 };
      const H = m.t + rows.length * rowH + m.b, ty = 56;
      const x = d3.scaleLinear().domain([0, 70]).range([labW + 8, W - m.r]);
      host.replaceChildren();
      const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H);
      svg.append("g").attr("class", "grid").selectAll("line").data([0, 10, 20, 30, 40, 60, 70]).join("line").attr("x1", x).attr("x2", x).attr("y1", m.t).attr("y2", H - m.b);
      svg.append("line").attr("class", "parity").attr("x1", x(PARITY)).attr("x2", x(PARITY)).attr("y1", m.t).attr("y2", H - m.b);
      svg.append("g").selectAll("text").data(narrow ? [0, 20, 40, 70] : [0, 10, 20, 30, 40, 60, 70]).join("text").attr("x", x).attr("y", H - 6).attr("text-anchor", (d) => (d === 0 ? "start" : d === 70 ? "end" : "middle")).text((d) => d + "%");
      svg.append("text").attr("class", "parity-t").attr("x", x(PARITY)).attr("y", H - 6).attr("text-anchor", "middle").style("font-weight", 600).text("50% parity");
      const g = svg.append("g").selectAll("g").data(rows).join("g").attr("class", "row").attr("transform", (d, i) => `translate(0,${m.t + i * rowH})`);
      g.append("rect").attr("class", "row-hit").attr("x", 0).attr("y", 0).attr("width", W).attr("height", rowH - 4);
      g.append("text").attr("class", "t-ink").attr("x", 0).attr("y", 16).style("font-size", "14px").style("font-weight", 600).text((d) => (narrow ? `${d.area}: ${d.hiN.toLowerCase()}` : `${d.area} · ${d.hiN}`));
      g.append("text").attr("x", 0).attr("y", 34).style("font-size", "12.5px")
        .text((d) => narrow
          ? `${f1(d.lo.p)}% → ${f1(d.hi.p)}%, ${pts(d.d)}${d.small ? ` (${d.hi.w} of ${d.hi.t})` : ""}${d.y !== 2023 ? ` · ${d.y}` : ""}`
          : `${d.loN} ${f1(d.lo.p)}% → ${d.hiN.toLowerCase()} ${f1(d.hi.p)}%  ${pts(d.d)}${d.small ? `  (${d.hi.w} of ${d.hi.t})` : ""}${d.y !== 2023 ? `  · ${d.y}` : ""}`);
      g.append("line").attr("class", (d) => "lad-link" + (d.small ? " is-small" : "")).attr("x1", (d) => x(d.lo.p)).attr("x2", (d) => x(d.hi.p)).attr("y1", ty).attr("y2", ty);
      g.append("circle").attr("class", "lad-lo").attr("r", 6).attr("cx", (d) => x(d.lo.p)).attr("cy", ty);
      g.append("circle").attr("class", "lad-hi").attr("r", 6.5).attr("cx", (d) => x(d.hi.p)).attr("cy", ty);
      g.on("pointermove", (ev, d) => showTip([`${d.area}: ${pts(d.d)}`, `${d.loN}: ${f1(d.lo.p)}% (${d.lo.w} of ${d.lo.t})`, `${d.hiN}: ${f1(d.hi.p)}% (${d.hi.w} of ${d.hi.t})`, `${d.scope}, ${d.y}`], ev.clientX, ev.clientY))
        .on("pointerleave", hideTip);
    };
    onResize(host, draw);
    host.setAttribute("aria-label", "Share of women at two levels of the same body: " + rows.map((r) => `${r.area}, ${r.loN} ${f1(r.lo.p)}% and ${r.hiN} ${f1(r.hi.p)}% (${r.y})`).join("; ") + ".");
    $("#ladder-table").appendChild(table(["Body", "Year", "Level below", "Share", "Top level", "Share", "Change"],
      rows.map((r) => [`${r.area} (${r.scope})`, String(r.y), r.loN, `${f1(r.lo.p)}% (${r.lo.w}/${r.lo.t})`, r.hiN, `${f1(r.hi.p)}% (${r.hi.w}/${r.hi.t})`, pts(r.d)]), 1));
  }

  /* ---------- correlations: do the roles move together across countries? ---------- */
  const CORR_ROLES = [
    { ds: "D6", pos: "PRES_PART", name: "Party leaders", col: "Party leaders" },
    { ds: "D6", pos: "PRES_DEP_PART", name: "Deputy party leaders", col: "Deputy leaders" },
    { ds: "D4", pos: "MEMB_GOV_SEN", name: "Senior environment ministers", col: "Env. ministers" },
    { ds: "D4", pos: "ADMIN", name: "Senior environment civil servants", col: "Env. civil servants" },
    { ds: "D3", pos: "PRES_CHAIR", name: "Research board presidents", col: "Research presidents" },
    { ds: "D3", pos: "MEMB_HDM", name: "Research board members", col: "Research members" },
  ];
  const T_CRIT = { 8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145, 15: 2.131, 16: 2.12, 17: 2.11, 18: 2.101, 19: 2.093, 20: 2.086, 21: 2.08, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.06, 26: 2.056, 27: 2.052, 28: 2.048 };
  function ranks(v) {
    const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length);
    for (let i = 0; i < o.length;) {
      let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++;
      for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2;
      i = j + 1;
    }
    return r;
  }
  function spearman(a, b) {
    const ra = ranks(a), rb = ranks(b), ma = d3.mean(ra), mb = d3.mean(rb);
    const cov = d3.sum(ra, (x, i) => (x - ma) * (rb[i] - mb));
    const va = Math.sqrt(d3.sum(ra, (x) => (x - ma) ** 2)), vb = Math.sqrt(d3.sum(rb, (x) => (x - mb) ** 2));
    return va && vb ? cov / (va * vb) : NaN;
  }
  const roleShare = (r, k, y) => { const d = at(series(r.ds, r.pos, k), y); return d ? d : null; };
  function corrPair(A, B, y) {
    const pts_ = EU27.map((k) => ({ k, a: roleShare(A, k, y), b: roleShare(B, k, y) })).filter((q) => q.a && q.b);
    if (pts_.length < 10) return null;
    const rho = spearman(pts_.map((q) => q.a.p), pts_.map((q) => q.b.p)), n = pts_.length;
    const t = Math.abs(rho) < 1 ? Math.abs(rho) * Math.sqrt((n - 2) / (1 - rho * rho)) : Infinity;
    return { rho, n, pts: pts_, clear: t > (T_CRIT[n - 2] || 2.0) };
  }
  const strength = (r) => { const a = Math.abs(r); return a < 0.2 ? "no clear relation" : a < 0.4 ? "weak" : a < 0.6 ? "moderate" : "strong"; };
  const rhoTxt = (r) => (r >= 0 ? "+" : "−") + Math.abs(r).toFixed(2);
  const corrBin = (r) => { const a = Math.abs(r), s = r < 0 ? "n" : "p"; return a < 0.2 ? "c-0" : a < 0.4 ? `c-${s}1` : a < 0.6 ? `c-${s}2` : `c-${s}3`; };
  const corrState = { year: 2022, a: 4, b: 0 };
  const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
  const cap1 = (n) => WORDS[n] || String(n);
  const corrYears = () => d3.range(2017, 2024).filter((y) => CORR_ROLES.some((A, i) => CORR_ROLES.some((B, j) => j < i && corrPair(A, B, y))));

  function correlations() {
    const years = corrYears();
    const yr = $("#corr-year"), out = $("#corr-year-out");
    yr.min = years[0]; yr.max = years[years.length - 1];
    // default: the latest year every role is published, and its strongest pair across two different areas
    corrState.year = d3.max(years.filter((y) => CORR_ROLES.every((A, i) => CORR_ROLES.every((B, j) => j >= i || corrPair(A, B, y)))));
    let best = null;
    CORR_ROLES.forEach((A, i) => CORR_ROLES.forEach((B, j) => {
      if (j >= i || A.ds === B.ds) return;
      const c = corrPair(A, B, corrState.year);
      if (c && (!best || Math.abs(c.rho) > Math.abs(best.c.rho))) best = { i, j, c };
    }));
    if (best) { corrState.a = best.i; corrState.b = best.j; }
    yr.value = corrState.year; out.textContent = corrState.year;
    yr.addEventListener("input", () => { corrState.year = +yr.value; out.textContent = yr.value; renderCorr(); });
    onResize($("#corr-scatter"), () => renderScatter());
    renderCorr();
    // the table: every pair, every year
    const pairs = [];
    CORR_ROLES.forEach((A, i) => CORR_ROLES.forEach((B, j) => { if (j < i) pairs.push([A, B]); }));
    $("#corr-table").appendChild(table(["Pair", ...years.map(String)], pairs.map(([A, B]) => [`${A.name} × ${B.name}`, ...years.map((y) => { const c = corrPair(A, B, y); return c ? `${rhoTxt(c.rho)} (${c.n})${c.clear ? " *" : ""}` : "–"; })])));
    // caveat: how stable is a single role's country ranking from year to year?
    const stab = CORR_ROLES.map((R) => {
      const ys = years.filter((y) => EU27.some((k) => roleShare(R, k, y)));
      const y0 = ys[0], y1 = ys[ys.length - 1];
      const p = EU27.map((k) => ({ a: roleShare(R, k, y0), b: roleShare(R, k, y1) })).filter((q) => q.a && q.b);
      return p.length >= 10 && y1 > y0 ? { R, c: { rho: spearman(p.map((q) => q.a.p), p.map((q) => q.b.p)), y0, y1 } } : null;
    }).filter(Boolean);
    const lo = stab.reduce((p, q) => (q.c.rho < p.c.rho ? q : p)), hi = stab.reduce((p, q) => (q.c.rho > p.c.rho ? q : p));
    $("#corr-caveat").textContent = `The rankings are noisy because the bodies are small: a country may have three to eight party leaders or two senior ministers, so one appointment reorders it. Even the same role's ranking changes a lot over time: comparing each role's first and last published year, ρ runs from ${rhoTxt(lo.c.rho)} (${lo.R.name.toLowerCase()}, ${lo.c.y0}–${lo.c.y1}) to ${rhoTxt(hi.c.rho)} (${hi.R.name.toLowerCase()}, ${hi.c.y0}–${hi.c.y1}). Read single cells with care, and look for patterns that hold across years in the table.`;
    $(".corr__matrix").addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-i]");
      if (!b) return;
      corrState.a = +b.dataset.i; corrState.b = +b.dataset.j; renderCorr();
    });
  }

  function renderCorr() {
    const y = corrState.year;
    const t = el("table", "corr-t");
    const cap = el("caption", "vh", `Spearman rank correlations between the share of women in six roles across EU-27 countries, ${y}. Select a cell to see its scatter plot.`);
    const head = el("tr");
    head.appendChild(el("td"));
    CORR_ROLES.slice(0, -1).forEach((R) => { const th = el("th", null, R.col); th.scope = "col"; head.appendChild(th); });
    const thead = el("thead"); thead.appendChild(head);
    const tb = el("tbody");
    let pairsClear = 0, pairsAll = 0;
    CORR_ROLES.forEach((A, i) => {
      if (i === 0) return;
      const tr = el("tr");
      const th = el("th", null, A.name); th.scope = "row"; tr.appendChild(th);
      CORR_ROLES.slice(0, -1).forEach((B, j) => {
        const td = el("td");
        if (j < i) {
          const c = corrPair(A, B, y);
          if (!c) { td.appendChild(el("span", "corr-na", "–")); td.title = "No data for this year"; }
          else {
            pairsAll++; if (c.clear) pairsClear++;
            const b = el("button", `corr-c ${corrBin(c.rho)}${c.clear ? " is-clear" : ""}${A.ds === B.ds ? " is-same" : ""}`, rhoTxt(c.rho));
            b.type = "button"; b.dataset.i = i; b.dataset.j = j;
            b.setAttribute("aria-pressed", String(corrState.a === i && corrState.b === j));
            b.setAttribute("aria-label", `${A.name} and ${B.name}, ${y}: rho ${rhoTxt(c.rho)}, ${strength(c.rho)}${c.clear ? ", stronger than chance" : ", could be chance"}, ${c.n} countries. Show the scatter plot.`);
            td.appendChild(b);
          }
        }
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.append(cap, thead, tb);
    $("#corr-matrix").replaceChildren(t);
    // keep the selection on a pair that exists this year; otherwise the year's strongest pair across two areas
    if (!corrPair(CORR_ROLES[corrState.a], CORR_ROLES[corrState.b], y)) {
      let best = null;
      CORR_ROLES.forEach((A, i) => CORR_ROLES.forEach((B, j) => {
        if (j >= i) return;
        const c = corrPair(A, B, y);
        const score = c ? Math.abs(c.rho) + (A.ds !== B.ds ? 1 : 0) : -1;
        if (c && (!best || score > best.score)) best = { i, j, score };
      }));
      if (best) {
        corrState.a = best.i; corrState.b = best.j;
        const btn = $(`#corr-matrix button[data-i="${best.i}"][data-j="${best.j}"]`);
        if (btn) btn.setAttribute("aria-pressed", "true");
      }
    }
    // a summary sentence for the year, across different areas only
    const cross = [];
    CORR_ROLES.forEach((A, i) => CORR_ROLES.forEach((B, j) => { if (j < i && A.ds !== B.ds) { const c = corrPair(A, B, y); if (c) cross.push({ A, B, c }); } }));
    const pos = cross.filter((x) => x.c.clear && x.c.rho > 0), neg = cross.filter((x) => x.c.rho < -0.2);
    const top = cross.slice().sort((p, q) => q.c.rho - p.c.rho)[0];
    $("#corr-summary").textContent = cross.length
      ? `In ${y}, ${pos.length} of ${cross.length} pairs of roles from different areas line up more than chance would give` +
        (top ? `; the closest is ${top.A.name.toLowerCase()} and ${top.B.name.toLowerCase()} (ρ ${rhoTxt(top.c.rho)})` : "") + ". " +
        (neg.length ? `${neg.length === 1 ? "One pair runs" : cap1(neg.length) + " pairs run"} the other way: ${neg.map((x) => `${x.A.name.toLowerCase()} and ${x.B.name.toLowerCase()} (${rhoTxt(x.c.rho)})`).join("; ")}.` : "")
      : `In ${y}, too few roles are published to compare across areas.`;
    renderScatter();
  }

  function renderScatter() {
    const A = CORR_ROLES[corrState.a], B = CORR_ROLES[corrState.b], y = corrState.year;
    const c = corrPair(A, B, y), host = $("#corr-scatter");
    if (!c) { host.replaceChildren(); return; }
    $("#corr-title").textContent = `${A.name} and ${B.name}, ${y}`;
    $("#corr-rho").innerHTML = `ρ <b>${rhoTxt(c.rho)}</b> <span>${strength(c.rho)} · ${c.clear ? "stronger than chance" : "could be chance"} · ${c.n} countries</span>`;
    const dir = c.rho > 0 ? "more" : "fewer";
    $("#corr-read").textContent = Math.abs(c.rho) < 0.2
      ? `Knowing how many ${A.name.toLowerCase()} are women tells you almost nothing about the ${B.name.toLowerCase()}.`
      : `Countries where more ${A.name.toLowerCase()} are women tend to have ${dir} women among ${B.name.toLowerCase()}, ${Math.abs(c.rho) < 0.4 ? "but only slightly, and with many exceptions" : Math.abs(c.rho) < 0.6 ? "with plenty of exceptions" : "fairly consistently"}.` + (A.ds === B.ds ? " Both roles belong to the same kind of body, so some link is expected." : "");
    const W = host.clientWidth || 480, H = Math.round(Math.min(460, Math.max(320, W * 0.8)));
    const m = { l: 44, r: 16, t: 14, b: 44 };
    const max = Math.min(100, Math.ceil((d3.max(c.pts, (q) => Math.max(q.a.p, q.b.p)) + 5) / 10) * 10);
    const x = d3.scaleLinear().domain([0, Math.max(60, max)]).range([m.l, W - m.r]);
    const yS = d3.scaleLinear().domain([0, Math.max(60, max)]).range([H - m.b, m.t]);
    host.replaceChildren();
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H);
    const ticks = x.ticks(5);
    svg.append("g").attr("class", "grid").selectAll("line").data(ticks).join("line").attr("x1", x).attr("x2", x).attr("y1", m.t).attr("y2", H - m.b);
    svg.append("g").attr("class", "grid").selectAll("line").data(ticks).join("line").attr("y1", yS).attr("y2", yS).attr("x1", m.l).attr("x2", W - m.r);
    svg.append("g").selectAll("text").data(ticks).join("text").attr("x", x).attr("y", H - m.b + 16).attr("text-anchor", "middle").text((d) => d + "%");
    svg.append("g").selectAll("text").data(ticks.filter((d) => d > 0)).join("text").attr("x", m.l - 6).attr("y", (d) => yS(d) + 4).attr("text-anchor", "end").text((d) => d + "%");
    svg.append("line").attr("class", "parity").attr("x1", x(PARITY)).attr("x2", x(PARITY)).attr("y1", m.t).attr("y2", H - m.b);
    svg.append("line").attr("class", "parity").attr("y1", yS(PARITY)).attr("y2", yS(PARITY)).attr("x1", m.l).attr("x2", W - m.r);
    svg.append("text").attr("class", "t-ink").attr("x", W - m.r).attr("y", H - 6).attr("text-anchor", "end").style("font-size", "12.5px").text(`${A.name}: share of women →`);
    svg.append("text").attr("class", "t-ink").attr("x", m.l + 4).attr("y", m.t + 12).style("font-size", "12.5px").text(`↑ ${B.name}`);
    const nodes = c.pts.map((q) => ({ ...q, cx: x(q.a.p), cy: yS(q.b.p) }));
    const g = svg.append("g").selectAll("g").data(nodes).join("g").attr("class", "sc-pt");
    g.append("circle").attr("class", "sc-dot").attr("r", 5.5).attr("cx", (d) => d.cx).attr("cy", (d) => d.cy);
    // label each country by its code where there is room; the tooltip and the table have them all
    const placed = [];
    g.each(function (d) {
      const lx = d.cx + 8, ly = d.cy + 4, box = [lx, ly - 10, lx + 18, ly + 2];
      if (placed.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3])) || lx + 18 > W) return;
      placed.push(box);
      d3.select(this).append("text").attr("class", "sc-lbl").attr("x", lx).attr("y", ly).text(d.k);
    });
    const tipL = (d) => [keyName(A.ds, d.k), `${A.name}: ${f1(d.a.p)}% (${d.a.w} of ${d.a.t})`, `${B.name}: ${f1(d.b.p)}% (${d.b.w} of ${d.b.t})`];
    g.on("pointermove", (ev, d) => showTip(tipL(d), ev.clientX, ev.clientY)).on("pointerleave", hideTip);
    host.setAttribute("aria-label", `Scatter plot, ${A.name} against ${B.name}, ${y}, one point per country, rho ${rhoTxt(c.rho)}. Use the arrow keys to read each country.`);
    const order = nodes.slice().sort((p, q) => p.a.p - q.a.p);
    let idx = -1;
    host.onkeydown = (ev) => {
      if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(ev.key)) return;
      ev.preventDefault();
      idx = Math.max(0, Math.min(order.length - 1, idx + (ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1)));
      const d = order[idx], r = host.getBoundingClientRect();
      svg.selectAll(".sc-dot").classed("is-hot", (q) => q === d);
      showTip(tipL(d), r.left + d.cx, r.top + d.cy);
    };
    host.onblur = () => { hideTip(); svg.selectAll(".sc-dot").classed("is-hot", false); idx = -1; };
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
    ladder();
    correlations();
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
    $$(".chart").forEach((c) => { c.textContent = "The chart data could not be loaded. The datasets can be downloaded in section 10."; });
  });
})();
