/* wipEU — charts. Data: data/web/wipeu.json (built by scripts/build_web_data.py from the EIGE
   exports in datav/ and databar/). Share of women = women / total headcount * 100. */
(function () {
  "use strict";

  const PARITY = 50;
  const $ = (s, r = document) => r.querySelector(s);
  const halfUp = (x) => Math.floor(x * 10 + 0.5 + 1e-9) / 10;
  const f1 = (x) => halfUp(x).toFixed(1);
  const pts = (d) => (d >= 0 ? "+" : "−") + f1(Math.abs(d)) + " pts";
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const svgNS = "http://www.w3.org/2000/svg";

  let DATA, GEO;

  /* ---------- data access ---------- */
  function series(ds, pos, key) {
    const s = DATA.datasets[ds].series[pos];
    const rows = (s && s[key]) || [];
    return rows.filter((r) => r[2] > 0).map(([y, w, t]) => ({ y, w, t, p: (100 * w) / t }));
  }
  const at = (arr, y) => arr.find((d) => d.y === y);
  const keyName = (ds, k) => DATA.datasets[ds].keys[k] || k;

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

  /* ---------- KPIs (hero) ---------- */
  function latest(arr) { return arr[arr.length - 1]; }
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

    // table view
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
      .attr("text-anchor", (d, i) => (i === 0 ? "start" : i === o.xTicks.length - 1 ? "end" : "middle")).text((d) => d);
    svg.append("line").attr("class", "base").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0));
    svg.append("line").attr("class", "parity").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(PARITY)).attr("y2", y(PARITY));
    svg.append("text").attr("class", "parity-t").attr("x", W - m.r).attr("y", y(PARITY) - 5).attr("text-anchor", "end").text("Parity 50%");
    const line = d3.line().x((d) => x(d.y)).y((d) => y(d.p));
    const area = d3.area().x((d) => x(d.y)).y0(y(0)).y1((d) => y(d.p));
    svg.append("path").attr("class", "area").attr("d", area(s));
    svg.append("path").attr("class", "ln").attr("d", line(s));
    if (o.dots) svg.append("g").selectAll("circle").data(s).join("circle").attr("class", "dot").attr("r", 4).attr("cx", (d) => x(d.y)).attr("cy", (d) => y(d.p));
    const last = latest(s);
    svg.append("circle").attr("class", "dot").attr("r", 4.5).attr("cx", x(last.y)).attr("cy", y(last.p));
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
      return { a, from: at(s, 2017), to: latest(s) };
    }).sort((p, q) => q.to.p - p.to.p);
    const draw = (W) => {
      const rowH = 58, m = { l: 0, r: 12, t: 6, b: 24 }, H = m.t + rows.length * rowH + m.b;
      const x = d3.scaleLinear().domain([0, 60]).range([m.l + 4, W - m.r]);
      host.replaceChildren();
      const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H);
      svg.append("g").attr("class", "grid").selectAll("line").data([0, 10, 20, 30, 40, 60]).join("line")
        .attr("x1", x).attr("x2", x).attr("y1", m.t).attr("y2", H - m.b);
      svg.append("g").selectAll("text").data([0, 10, 20, 30, 40, 50, 60]).join("text").attr("x", x).attr("y", H - 6).attr("text-anchor", "middle").text((d) => d + "%");
      svg.append("line").attr("class", "parity").attr("x1", x(PARITY)).attr("x2", x(PARITY)).attr("y1", m.t).attr("y2", H - m.b);
      const g = svg.append("g").selectAll("g").data(rows).join("g").attr("transform", (d, i) => `translate(0,${m.t + i * rowH})`);
      g.append("text").attr("class", "t-ink").attr("x", 0).attr("y", 16).style("font-size", "14px").style("font-weight", 600).text((d) => d.a.area);
      g.append("text").attr("x", W - m.r).attr("y", 16).attr("text-anchor", "end").style("font-size", "13px")
        .text((d) => `${f1(d.from.p)}% → ${f1(d.to.p)}%${d.to.y !== 2023 ? " (" + d.to.y + ")" : ""}  ${pts(d.to.p - d.from.p)}`);
      g.append("line").attr("class", "bar-link").attr("x1", (d) => x(d.from.p)).attr("x2", (d) => x(d.to.p)).attr("y1", 36).attr("y2", 36);
      g.append("circle").attr("class", "dot-from").attr("r", 6).attr("cx", (d) => x(d.from.p)).attr("cy", 36);
      g.append("circle").attr("class", "dot-to").attr("r", 6).attr("cx", (d) => x(d.to.p)).attr("cy", 36);
      g.append("rect").attr("x", 0).attr("y", 0).attr("width", W).attr("height", rowH).attr("fill", "transparent")
        .on("pointermove", (ev, d) => showTip([pts(d.to.p - d.from.p), `2017: ${f1(d.from.p)}% (${d.from.w}/${d.from.t})`, `${d.to.y}: ${f1(d.to.p)}% (${d.to.w}/${d.to.t})`, d.a.label], ev.clientX, ev.clientY))
        .on("pointerleave", hideTip);
      svg.append("text").attr("class", "parity-t").attr("x", x(PARITY) + 4).attr("y", H - m.b - 4).text("Parity");
    };
    onResize(host, draw);
    host.setAttribute("aria-label", "Share of women, 2017 and latest year: " + rows.map((d) => `${d.a.area} ${f1(d.from.p)}% to ${f1(d.to.p)}% (${d.to.y})`).join("; ") + ".");
  }

  /* ---------- map ---------- */
  const MAP_DEFAULT = { D6: "PRES_PART", D4: "MEMB_GOV", D3: "MEMB_HDM" };
  const MAP_DESC = {
    D6: ["D6 — Major political parties: leaders and deputy leaders", "The gender distribution of leaders of the major political parties in each country: who is at the helm of the parties that shape political leadership in the EU."],
    D4: ["D4 — National ministries dealing with environment and climate change", "The gender composition of ministers and senior administrators in the national ministries responsible for environment and climate policy: the people who shape and implement climate action in each country. EIGE has published this series up to 2022."],
    D3: ["D3 — Research funding organisations: presidents and members", "The gender distribution among presidents and board members of the organisations that fund research in each country, pivotal to advancing scientific knowledge and innovation. EIGE has no 2023 data for some countries."],
  };
  const BINS = [10, 20, 30, 40, 50];
  const bin = (p) => { let i = 0; while (i < BINS.length && p >= BINS[i]) i++; return i; };
  const BIN_LABELS = ["0–10%", "10–20", "20–30", "30–40", "40–50", "50%+"];
  const mapState = { ds: "D6", pos: "PRES_PART", year: 2023, hot: null };

  function mapYears() {
    const s = DATA.datasets[mapState.ds].series[mapState.pos];
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
    document.querySelectorAll('input[name="mapds"]').forEach((r) => r.addEventListener("change", () => {
      mapState.ds = r.value; mapState.pos = MAP_DEFAULT[r.value]; fillPos(); fitYears(); renderMap();
    }));
    posSel.addEventListener("change", () => { mapState.pos = posSel.value; fitYears(); renderMap(); });
    yr.addEventListener("input", () => { mapState.year = +yr.value; out.textContent = yr.value; renderMap(); });
    fillPos(); fitYears();

    // legend
    const lg = $("#map-legend");
    BIN_LABELS.forEach((l, i) => { const it = el("div", "legend__i"); const sw = el("span", "legend__sw"); sw.style.background = `var(--seq-${i})`; it.append(sw, el("span", null, l)); lg.appendChild(it); });
    const nd = el("div", "legend__i legend__i--nd"); nd.append(el("span", "legend__sw"), el("span", null, "No data")); lg.appendChild(nd);

    onResize($("#choropleth"), () => renderMap());
    onResize($("#rank"), () => renderMap());
  }

  let projFor = null;
  function renderMap() {
    const vals = mapValues(mapState.year);
    const host = $("#choropleth");
    const W = host.clientWidth || 600, H = Math.round(W * 0.82);
    const frame = { type: "Feature", geometry: { type: "Polygon", coordinates: [[[-24, 34], [-24, 71], [10, 71], [42, 71], [42, 34], [10, 34], [-24, 34]]] } };
    const proj = d3.geoConicConformal().parallels([40, 64]).rotate([-10, 0]).fitSize([W, H], frame);
    const path = d3.geoPath(proj);
    host.replaceChildren();
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H)
      .attr("role", "img").attr("aria-label", `Choropleth map of the share of women, ${MAP_DESC[mapState.ds][0]}, ${DATA.datasets[mapState.ds].positions[mapState.pos]}, ${mapState.year}. The ranked list beside it gives every value.`);
    svg.append("defs").append("clipPath").attr("id", "mapclip").append("rect").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("clip-path", "url(#mapclip)");
    g.selectAll("path").data(GEO.features).join("path")
      .attr("d", path)
      .attr("class", (f) => "c" + (vals.has(f.properties.iso2) ? " has" : "") + (mapState.hot === f.properties.iso2 ? " is-hot" : ""))
      .attr("data-k", (f) => f.properties.iso2)
      .style("fill", (f) => { const v = vals.get(f.properties.iso2); return v ? `var(--seq-${bin(v.p)})` : "var(--nodata)"; })
      .on("pointermove", (ev, f) => {
        const v = vals.get(f.properties.iso2);
        showTip(v ? [`${f1(v.p)}%`, `${v.name} · ${v.w} women of ${v.t}`, String(mapState.year)] : [f.properties.name, "No data"], ev.clientX, ev.clientY);
        setHot(f.properties.iso2);
      })
      .on("pointerleave", () => { hideTip(); setHot(null); });
    renderRank(vals);
    caption(vals);
    const [t, d] = MAP_DESC[mapState.ds];
    const box = $("#map-desc"); box.replaceChildren(el("h3", null, t), el("p", null, d));
  }
  function setHot(k) {
    mapState.hot = k;
    document.querySelectorAll("#choropleth path.c").forEach((p) => p.classList.toggle("is-hot", p.dataset.k === k));
    document.querySelectorAll("#rank .row").forEach((r) => r.classList.toggle("is-hot", r.dataset.k === k));
  }

  function caption(vals) {
    const eu = at(series(mapState.ds, mapState.pos, "EU27_2020"), mapState.year);
    const role = DATA.datasets[mapState.ds].positions[mapState.pos].replace(/^Members of the government: /, "").toLowerCase();
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
    $("#rank-from").textContent = from ? "2017" : "(no comparison before 2018)";
    const rows = [...vals.values()].sort((a, b) => b.p - a.p || a.name.localeCompare(b.name));
    const eu = at(series(mapState.ds, mapState.pos, "EU27_2020"), mapState.year);
    const rowH = 22, nameW = Math.min(150, Math.max(104, W * 0.3)), valW = 46, m = { t: 4, b: 22 };
    const H = m.t + rows.length * rowH + m.b;
    const x = d3.scaleLinear().domain([0, 100]).range([nameW + 6, W - valW - 8]);
    host.replaceChildren();
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H)
      .attr("tabindex", 0).attr("role", "img")
      .attr("aria-label", `Countries ranked by share of women, ${mapState.year}: ` + rows.map((r) => `${r.name} ${f1(r.p)}%`).join(", ") + ". Use up and down arrow keys to step through countries.");
    svg.append("g").attr("class", "grid").selectAll("line").data([0, 25, 75, 100]).join("line").attr("x1", x).attr("x2", x).attr("y1", m.t).attr("y2", H - m.b);
    svg.append("g").selectAll("text").data([0, 50, 100]).join("text").attr("x", x).attr("y", H - 6).attr("text-anchor", "middle").text((d) => d + "%");
    svg.append("line").attr("class", "parity").attr("x1", x(PARITY)).attr("x2", x(PARITY)).attr("y1", m.t).attr("y2", H - m.b);
    if (eu) svg.append("line").attr("class", "eu-line").attr("x1", x(eu.p)).attr("x2", x(eu.p)).attr("y1", m.t).attr("y2", H - m.b).style("opacity", 0.55);
    const g = svg.selectAll("g.row").data(rows).join("g").attr("class", (d) => "row" + (mapState.hot === d.k ? " is-hot" : "")).attr("data-k", (d) => d.k)
      .attr("transform", (d, i) => `translate(0,${m.t + i * rowH})`);
    g.append("rect").attr("class", "row-hit").attr("x", 0).attr("y", 0).attr("width", W).attr("height", rowH);
    g.append("text").attr("class", "t-ink").attr("x", 0).attr("y", 15).style("font-size", "13px").text((d) => d.name.length > 22 ? d.name.slice(0, 21) + "…" : d.name);
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
      .on("pointerleave", () => { hideTip(); setHot(null); });
    let idx = -1;
    svg.on("keydown", (ev) => {
      if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
      ev.preventDefault();
      idx = Math.max(0, Math.min(rows.length - 1, idx + (ev.key === "ArrowDown" ? 1 : -1)));
      setHot(rows[idx].k);
      tipAtElement(host.querySelectorAll(".row")[idx], tipLines(rows[idx]));
    }).on("blur", () => { hideTip(); setHot(null); idx = -1; });
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
    document.querySelectorAll('input[name="instds"]').forEach((r) => r.addEventListener("change", () => {
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
    box.appendChild(el("p", "muted", `${last.y}: ${last.w} women of ${last.t} (${f1(last.p)}%). Small bodies change in large steps: one appointment in a group of three moves the share by 33 points.`));
    $("#inst-table").replaceChildren(table(["Year", "Women", "Total", "Share of women"], s.map((d) => [String(d.y), String(d.w), String(d.t), f1(d.p) + "%"])));
  }

  /* ---------- boot ---------- */
  Promise.all([
    fetch("data/web/wipeu.json").then((r) => r.json()),
    fetch("data/web/europe.min.geojson").then((r) => r.json()),
  ]).then(([data, geo]) => {
    DATA = data; GEO = geo;
    kpis();
    smallMultiples();
    dumbbell();
    setupMap();
    setupInst();
  }).catch((err) => {
    console.error("wipEU: could not load data", err);
    document.querySelectorAll(".chart").forEach((c) => { c.textContent = "The chart data could not be loaded. The datasets can be downloaded in section 06."; });
  });
})();
