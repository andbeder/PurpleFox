const fs = require('fs');
const path = require('path');

function formatValue(value) {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  return JSON.stringify(value);
}

function toColorArray(value) {
  return value.split(',').map((c) => `'${c}'`).join(', ');
}

function generateInstructions(changeRequestsPath, outputPath) {
  const data = fs.readFileSync(changeRequestsPath, 'utf8');
  const json = JSON.parse(data);
  const lines = [];
  let step = 1;

  const addLine = (line) => {
    lines.push(`${step}. ${line}`);
    step += 1;
  };

  json.changes.forEach((change) => {
    if (change.action === 'update' && Array.isArray(change.mismatches)) {
      change.mismatches.forEach((m) => {
        if (m.property === 'title') {
          addLine(
            `In ${change.targetFile}, update ${change.chartId} title using ` +
              `chart.updateOptions({ title: { text: ${formatValue(m.expectedValue)} } });`
          );
        } else if (m.property === 'style') {
          const cur = m.currentValue || {};
          const exp = m.expectedValue || {};
          if (exp.seriesColors && exp.seriesColors !== cur.seriesColors) {
            addLine(
              `In ${change.targetFile}, set ${change.chartId} ApexCharts option ` +
                `\"colors\" to [${toColorArray(exp.seriesColors)}].`
            );
          }
          if (exp.font && exp.font !== 'default' && exp.font !== cur.font) {
            addLine(
              `In ${change.targetFile}, set ${change.chartId} option ` +
                `\"chart.fontFamily\" to ${formatValue(exp.font)}.`
            );
          }
          if (
            Array.isArray(exp.effects) &&
            exp.effects.includes('shadow') &&
            (!cur.effects || !cur.effects.includes('shadow'))
          ) {
            addLine(
              `In ${change.targetFile}, enable drop shadow for ${change.chartId} by ` +
                `setting chart.dropShadow options.`
            );
          }
        } else {
          addLine(
            `In ${change.targetFile}, update ${change.chartId} ${m.property} from ` +
              `${formatValue(m.currentValue)} to ${formatValue(m.expectedValue)}.`
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
      addLine(`Add initialization and rendering logic for ${change.chartId} in dynamicCharts.js.`);
    }
  });

  const output = lines.join('\n') + '\n';
  fs.writeFileSync(outputPath, output);
  return output;
}

if (require.main === module) {
  const input = path.resolve(__dirname, '..', 'changeRequests.json');
  const output = path.resolve(__dirname, '..', 'changeRequestInstructions.txt');
  generateInstructions(input, output);
}

module.exports = generateInstructions;
