// scripts/agents/dashboardReader.js
// Parses dashboard JSON into normalized chart definitions and writes charts.json

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Color name to hex mapping
const COLOR_MAP = {
  red: "#EF6B4D",
  "light blue": "#97C1DA",
  blue: "#3C5B81",
  green: "#1BAA96",
  teal: "#E2F4F9",
  grey: "#98ACBD",
  "dark green": "#175F68",
  "dark grey": "#283140",
  "dark blue": "#002060"
};

// SAQL mapping for compact-to-SAQL conversion
const saqlMapping = {
  load: 'q = load "<datasetId>";',
  where: "q = filter q by <filters>;",
  group: "q = group q by <dimension>;",
  foreach: "q = foreach q generate <aggregates>;",
  order: "q = order q by <orderField> <orderDirection>;",
  limit: "limit <limit>;"
};

function fetchDescription(key) {
  try {
    const html = execSync(`curl -s https://apexcharts.com/docs/options/${key}/`, {
      encoding: "utf8"
    });
    const m = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<title>(.*?)<\/title>/i);
    return m ? m[1].trim() : "ApexCharts option";
  } catch {
    return "ApexCharts option";
  }
}

function updateChartStyles(meta, file) {
  if (!file) return;
  const seen = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").split(/\n/).map((l) => l.split(" - ")[0])
    : [];
  Object.keys(meta || {}).forEach((k) => {
    if (!seen.includes(k)) {
      const desc = fetchDescription(k);
      fs.appendFileSync(file, `${k} - ${desc}\n`);
      seen.push(k);
    }
  });
}

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function parseStyleString(str) {
  const meta = {};
  if (!str) return meta;
  str
    .split(/(?:;|\r?\n)+/)
    .forEach((pair) => {
      const [key, value] = pair
        .split(pair.includes(":") ? ":" : "=")
        .map((s) => s.trim());
      if (key) meta[key.toLowerCase()] = value;
    });
  return meta;
}

function parseTextWidget(widget) {
  const content =
    widget &&
    widget.parameters &&
    widget.parameters.content &&
    widget.parameters.content.richTextContent;
  if (!Array.isArray(content)) return null;
  const text = content.map((c) => c.insert).join("");
  return parseStyleString(text);
}

function mapColors(str) {
  if (!str) return str;
  return str
    .split(",")
    .map((c) => COLOR_MAP[c.trim().toLowerCase()] || c.trim())
    .join(",");
}

function normalizeType(rawType) {
  if (!rawType) return "bar";
  const t = rawType.toLowerCase();
  if (t.includes("box")) return "box-and-whisker";
  return "bar";
}

function queryToSaql(queryObj, datasetId) {
  // Convert compact JSON query to SAQL using saqlMapping
  let saql = saqlMapping.load.replace("<datasetId>", datasetId);

  // Filters
  if (queryObj.sourceFilters && Object.keys(queryObj.sourceFilters).length) {
    const filters = Object.entries(queryObj.sourceFilters)
      .map(([dim, cond]) => `${dim} == ${cond}`)
      .join(" and ");
    saql += "\n" + saqlMapping.where.replace("<filters>", filters);
  }

  // Group dimensions
  const groups = (queryObj.sources[0].groups || []).join(", ");
  saql += "\n" + saqlMapping.group.replace("<dimension>", groups);

  // Aggregations
  const aggs = (queryObj.sources[0].columns || [])
    .map((col) => {
      if (col.field) {
        return `${col.field[0]}(${col.field[1]}) as ${col.name}`;
      } else if (col.formula) {
        return `${col.formula} as ${col.name}`;
      }
    })
    .join(", ");
  saql += "\n" + saqlMapping.foreach.replace("<aggregates>", aggs);

  // Ordering
  if (queryObj.orders && queryObj.orders[0]) {
    const ord = queryObj.orders[0];
    const dir = ord.ascending ? "asc" : "desc";
    saql +=
      "\n" +
      saqlMapping.order
        .replace("<orderField>", ord.name)
        .replace("<orderDirection>", dir);
  }

  // Limit
  if (queryObj.limit) {
    saql += "\n" + saqlMapping.limit.replace("<limit>", String(queryObj.limit));
  }

  return saql;
}

function readDashboard({
  dashboardApiName,
  inputDir = "tmp",
  chartsFile = "charts.json",
  chartStylesFile = "chartStyles.txt",
  silent = false
}) {
  if (!dashboardApiName) {
    throw new Error("dashboardApiName is required");
  }

  const filePath = path.resolve(inputDir, `${dashboardApiName}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dashboard JSON not found: ${filePath}`);
  }

  const dashboard = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (
    dashboard.errorCode ||
    (Array.isArray(dashboard) && dashboard[0]?.errorCode)
  ) {
    const msg = dashboard.message || dashboard[0]?.message || "Unknown error";
    throw new Error(`Invalid dashboard JSON: ${msg}`);
  }
  const state = dashboard.state || {};
  const steps = state.steps || {};
  const widgetsByName = state.widgets || {};
  const layoutWidgets =
    (state.gridLayouts &&
      state.gridLayouts[0] &&
      state.gridLayouts[0].pages &&
      state.gridLayouts[0].pages[0].widgets) ||
    [];

  // Sort by row then column so charts appear before their text widgets
  layoutWidgets.sort((a, b) => a.row - b.row || a.column - b.column);

  // Default datasetId
  const defaultDatasetId =
    (dashboard.datasets && dashboard.datasets[0] && dashboard.datasets[0].id) ||
    "";

  const charts = [];

  for (let i = 0; i < layoutWidgets.length; i++) {
    const widgetName = layoutWidgets[i].name;
    const w = widgetsByName[widgetName];
    if (!w || w.type === "text") continue;
    const title =
      w.title ||
      (w.parameters && w.parameters.title && w.parameters.title.label) ||
      (w.properties && w.properties.title);
    let meta = {};
    const next = layoutWidgets[i + 1];
    if (next && next.row === layoutWidgets[i].row) {
      const textWidget = widgetsByName[next.name];
      if (textWidget && textWidget.type === "text") {
        meta = parseTextWidget(textWidget);
        updateChartStyles(meta, chartStylesFile);
        i++; // skip text widget
      }
    }
    if (Object.keys(meta).length === 0) {
      const subtitle =
        w.subtitle ||
        (w.parameters && w.parameters.title && w.parameters.title.subtitleLabel);
      meta = parseStyleString(subtitle);
      updateChartStyles(meta, chartStylesFile);
    }

    const stepName =
      (typeof w.step === "string" && w.step) ||
      (w.parameters && w.parameters.step);
    let rawQuery = null;
    if (w.saql) {
      rawQuery = w.saql;
    } else if (w.step && typeof w.step === "object" && w.step.query) {
      rawQuery = queryToSaql(w.step.query, defaultDatasetId);
    } else if (steps[stepName] && steps[stepName].query) {
      rawQuery = queryToSaql(steps[stepName].query, defaultDatasetId);
    }
    if (!title || !rawQuery) return;

    const type = normalizeType(
      meta.type || w.type || (w.parameters && w.parameters.visualizationType)
    );

    // Build fieldMappings from columnMap
    const fieldMappings = {};
    const cm = (w.parameters && w.parameters.columnMap) || {};
    (cm.plots || []).forEach((f) => (fieldMappings[f] = f));
    (cm.dimensionAxis || []).forEach((f) => (fieldMappings[f] = f));

    // Build style
    const style = {};
    if (meta.colors) style.seriesColors = mapColors(meta.colors);
    if (meta.font) style.font = meta.font;
    if (meta["font-color"]) style.fontColor = meta["font-color"];
    if (meta["x-axis-font-size"])
      style.xAxisFontSize = meta["x-axis-font-size"];
    if (meta["y-axis-font-size"])
      style.yAxisFontSize = meta["y-axis-font-size"];
    if (
      meta.shadow === "true" ||
      meta.effects === "shadow" ||
      meta.dropshadow === "true"
    ) {
      style.effects = ["shadow"];
    }

    charts.push({
      dashboard: dashboardApiName,
      id: toKebab(title),
      type,
      title: meta.title || title,
      fieldMappings,
      saql: rawQuery,
      style
    });
  }

  const output = { charts };
  fs.writeFileSync(chartsFile, JSON.stringify(output, null, 2));
  if (!silent) console.log(`Wrote ${charts.length} charts to ${chartsFile}`);

  return output;
}

if (require.main === module) {
  const opts = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--dashboard-api-name=")) {
      opts.dashboardApiName = arg.split("=")[1];
    } else if (arg.startsWith("--input-dir=")) {
      opts.inputDir = arg.split("=")[1];
    } else if (arg.startsWith("--charts-file=")) {
      opts.chartsFile = arg.split("=")[1];
    } else if (arg.startsWith("--chart-styles-file=")) {
      opts.chartStylesFile = arg.split("=")[1];
    } else if (arg === "--silent") {
      opts.silent = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node dashboardReader.js --dashboard-api-name <name> [--input-dir dir] [--charts-file file] [--chart-styles-file file] [--silent]"
      );
      process.exit(0);
    }
  });
  readDashboard(opts);
}

module.exports = readDashboard;
