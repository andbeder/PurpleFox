// scripts/agents/changeRequestGenerator.js
// Generates changeRequests.json and changeRequestInstructions.txt by comparing
// charts.json with revEngCharts.json

const fs = require('fs');
const path = require('path');

function loadJson(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`file not found: ${file}`);
  }
  const text = fs.readFileSync(file, 'utf8');
  return JSON.parse(text);
}

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function compareCharts(authoritative, current) {
  const mapA = new Map();
  const mapB = new Map();
  (authoritative.charts || []).forEach((c) => mapA.set(toKebab(c.id), c));
  (current.charts || []).forEach((c) => mapB.set(toKebab(c.id), c));

  const changes = [];

  for (const [normId, chart] of mapA.entries()) {
    if (!mapB.has(normId)) {
      changes.push({ chartId: chart.id, action: 'add', targetFile: 'dynamicCharts.js' });
    } else {
      const cur = mapB.get(normId);
      const mismatches = [];
      ['dashboard', 'title', 'type', 'saql', 'fieldMappings', 'style'].forEach((prop) => {
        const aVal = chart[prop];
        const bVal = cur[prop];
        if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
          mismatches.push({ property: prop, currentValue: bVal, expectedValue: aVal });
        }
      });
      if (mismatches.length) {
        changes.push({
          chartId: chart.id,
          action: 'update',
          targetFile: 'dynamicCharts.js',
          mismatches,
          instructions: mismatches.map((m) => `Update ${chart.id} ${m.property}`)
        });
      }
    }
  }

  for (const [normId, cur] of mapB.entries()) {
    if (!mapA.has(normId)) {
      changes.push({ chartId: cur.id, action: 'remove', targetFile: 'dynamicCharts.js' });
    }
  }

  return { changes };
}

function buildInstructions(changeData) {
  const lines = [];
  let step = 1;
  const addLine = (line) => {
    lines.push(`${step}. ${line}`);
    step += 1;
  };

  const formatValue = (value) => {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    return JSON.stringify(value);
  };

  changeData.changes.forEach((change) => {
    if (change.action === 'update' && Array.isArray(change.mismatches)) {
      change.mismatches.forEach((m) => {
        if (m.property === 'title') {
          addLine(
            `In ${change.targetFile}, update ${change.chartId} title using ` +
              `chart.updateOptions({ title: { text: "${m.expectedValue}" } });`
          );
        } else if (m.property === 'style') {
          const cur = m.currentValue || {};
          const exp = m.expectedValue || {};
          if (exp.seriesColors && exp.seriesColors !== cur.seriesColors) {
            const colors = exp.seriesColors
              .split(',')
              .map((c) => `'${c}'`)
              .join(', ');
            addLine(
              `In ${change.targetFile}, set ${change.chartId} ApexCharts option "colors" to [${colors}].`
            );
          }
          if (exp.font && exp.font !== 'default' && exp.font !== cur.font) {
            addLine(
              `In ${change.targetFile}, set ${change.chartId} option "chart.fontFamily" to "${exp.font}".`
            );
          }
          if (
            Array.isArray(exp.effects) &&
            exp.effects.includes('shadow') &&
            (!cur.effects || !cur.effects.includes('shadow'))
          ) {
            addLine(
              `In ${change.targetFile}, enable drop shadow for ${change.chartId} by setting chart.dropShadow options.`
            );
          }
        } else {
          const curVal = formatValue(m.currentValue);
          const expVal = formatValue(m.expectedValue);
          addLine(
            `In ${change.targetFile}, update ${change.chartId} ${m.property} from ${curVal} to ${expVal}.`
          );
        }
      });
    } else if (change.action === 'remove') {
      addLine(
        `Remove the <div class='chart-${change.chartId}'>...</div> block from dynamicCharts.html.`
      );
      addLine(
        `Remove the corresponding SAQL and render call for ${change.chartId} in dynamicCharts.js.`
      );
    } else if (change.action === 'add') {
      addLine(`Add markup for ${change.chartId} to dynamicCharts.html.`);
      addLine(
        `Add initialization and rendering logic for ${change.chartId} in dynamicCharts.js.`
      );
    }
  });

  return lines.join('\n') + '\n';
}

function generateChangeRequests({
  chartsFile = 'charts.json',
  revEngChartsFile = 'revEngCharts.json',
  jsonFile = 'changeRequests.json',
  outputFile = 'changeRequestInstructions.txt',
  silent = false
} = {}) {
  const chartsPath = path.resolve(chartsFile);
  const revPath = path.resolve(revEngChartsFile);
  const jsonPath = path.resolve(jsonFile);
  const outPath = path.resolve(outputFile);

  const authoritative = loadJson(chartsPath);
  const current = loadJson(revPath);

  const result = compareCharts(authoritative, current);
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  const instructions = buildInstructions(result);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, instructions);
  if (!silent) {
    console.log(`Wrote ${result.changes.length} changes to ${jsonPath}`);
    console.log(`Wrote instructions to ${outPath}`);
  }
  return instructions;
}

if (require.main === module) {
  const opts = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--charts-file=')) {
      opts.chartsFile = arg.split('=')[1];
    } else if (arg.startsWith('--rev-eng-charts-file=')) {
      opts.revEngChartsFile = arg.split('=')[1];
    } else if (arg.startsWith('--json-file=')) {
      opts.jsonFile = arg.split('=')[1];
    } else if (arg.startsWith('--output-file=')) {
      opts.outputFile = arg.split('=')[1];
    } else if (arg === '--silent') {
      opts.silent = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node changeRequestGenerator.js [--charts-file file] [--rev-eng-charts-file file] [--json-file file] [--output-file file] [--silent]'
      );
      process.exit(0);
    }
  });
  try {
    generateChangeRequests(opts);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

module.exports = generateChangeRequests;
