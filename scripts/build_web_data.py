"""Build the compact files the website reads, from the EIGE exports already in this repo.

Inputs (unchanged EIGE downloads, 2024-01-25/26):
  datav/*.json    country-level datasets D3, D4, D6
  databar/*.json  EU-institution datasets D1, D2, D5
  europe.geojson  country outlines

Outputs:
  data/web/wipeu.json          headcounts of women (w) and total (t) per year
  data/web/europe.min.geojson  simplified outlines (shapely, tolerance 0.03 deg)

Every percentage on the site is computed in the browser as 100 * w / t from the
EIGE headcounts (_UNIT == "NR"). The script also checks that this equals EIGE's own
"Percent of total" (_UNIT == "PC") value for women, to one decimal.

Run from the repo root:  python scripts/build_web_data.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SOURCES = {
    "D1": ("databar/2024-01-26-wmidm_bus_fin__wmid_fineur.json", "institution"),
    "D2": ("databar/2024-01-26-wmidm_adm_eur__wmid_euadmin_eurag.json", "institution"),
    "D3": ("datav/2024-01-26-wmidm_educ__wmid_resfund.json", "country"),
    "D4": ("datav/2024-01-26-wmidm_env_nat__wmid_env_natmin_envmin.json", "country"),
    "D5": ("databar/2024-01-26-wmidm_jud_eucrt__wmid_eucrt (2).json", "institution"),
    "D6": ("datav/2024-01-25-wmidm_pol_part__wmid_polpart.json", "country"),
}

# The six headline series (one per area), EU level.
AREAS = [
    {"id": "politics", "area": "Politics", "ds": "D6", "pos": "PRES_PART", "key": "EU27_2020",
     "label": "Leaders of major political parties", "scope": "EU-27 member states"},
    {"id": "environment", "area": "Environment & climate", "ds": "D4", "pos": "MEMB_GOV", "key": "EU27_2020",
     "label": "Ministers in national environment & climate ministries", "scope": "EU-27 member states"},
    {"id": "research", "area": "Education, science & research", "ds": "D3", "pos": "MEMB_HDM", "key": "EU27_2020",
     "label": "Board members of research funding organisations", "scope": "EU-27 member states"},
    {"id": "admin", "area": "Public administration", "ds": "D2", "pos": "MEMB_HDM", "key": "TOT",
     "label": "Board members of European agencies", "scope": "All EU agencies"},
    {"id": "finance", "area": "Business & finance", "ds": "D1", "pos": "MEMB_HDM", "key": "TOT",
     "label": "Board members of EU financial institutions", "scope": "ECB, EIB and EIF"},
    {"id": "law", "area": "Law & institutions", "ds": "D5", "pos": "MEMB_CRT", "key": "ECJ",
     "label": "Judges at the European Court of Justice", "scope": "European Court of Justice"},
]

# EIGE geo codes -> ISO 3166-1 alpha-2 used in europe.geojson
GEO_FIX = {"EL": "GR", "UK": "GB"}
AGGREGATES = {"EU27_2020", "EU28", "EEA", "IPA"}


def half_up(x):
    """Round to one decimal, halves away from zero (as EIGE and the site do)."""
    return int(x * 10 + 0.5 + 1e-9) / 10


def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def build():
    out = {"generated_from": {}, "datasets": {}, "areas": AREAS}
    mismatches = 0
    for ds, (rel, kind) in SOURCES.items():
        raw = load(rel)
        meta = {k: raw[k] for k in ("datasetViewName", "datasetViewUrl", "datasetName", "datasetYears",
                                    "datasetUpdatedOn", "datasetValueCount")}
        out["generated_from"][ds] = rel
        cells = {}   # (pos, key, year) -> {"W": n, "T": n, "PC": pct}
        positions, keys = {}, {}
        for e in raw["elements"]:
            pos = e["_POSITION"]
            if kind == "country":
                key = GEO_FIX.get(e["_geo"], e["_geo"])
                keys[key] = e["geo"].replace("T�rkiye", "Türkiye")
            else:
                key = e["_ENTITY"]
                keys[key] = e["ENTITY"]
            positions[pos] = e["POSITION"]
            c = cells.setdefault((pos, key, e["time"]), {})
            if e["_UNIT"] == "NR":
                c[e["_sex"]] = e.get("value")
            elif e["_sex"] == "W":
                c["PC"] = e.get("value")
        series = {}
        for (pos, key, year), c in sorted(cells.items(), key=lambda kv: kv[0]):
            if "W" not in c or "T" not in c or c["W"] is None or c["T"] is None:
                continue
            if c["T"] and c.get("PC") is not None and abs(half_up(100 * c["W"] / c["T"]) - c["PC"]) > 0.051:
                mismatches += 1
            series.setdefault(pos, {}).setdefault(key, []).append([year, c["W"], c["T"]])
        out["datasets"][ds] = {
            "kind": kind, "meta": meta, "positions": positions,
            "keys": dict(sorted(keys.items(), key=lambda kv: kv[1])),
            "aggregates": sorted(k for k in keys if k in AGGREGATES or k == "TOT"),
            "series": series,
        }
    print("percent cross-check mismatches vs EIGE PC:", mismatches)
    (ROOT / "data/web").mkdir(parents=True, exist_ok=True)
    (ROOT / "data/web/wipeu.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def build_geo():
    from shapely.geometry import shape, mapping
    g = load("europe.geojson")
    feats = []
    for f in g["features"]:
        geom = shape(f["geometry"]).simplify(0.03, preserve_topology=True)
        gj = json.loads(json.dumps(mapping(geom)))

        def rnd(x):
            return [round(x[0], 3), round(x[1], 3)] if isinstance(x[0], (int, float)) else [rnd(y) for y in x]
        gj["coordinates"] = rnd(gj["coordinates"])
        feats.append({"type": "Feature", "properties": {"iso2": f["properties"]["ISO2"], "name": f["properties"]["NAME"]},
                      "geometry": gj})
    (ROOT / "data/web/europe.min.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    build()
    build_geo()
