// scripts/agents/lwcReader.js
// Parses the dynamicCharts LWC to produce revEngCharts.json

const fs = require('fs');
const path = require('path');

function extractChartSettings(jsContent) {
  const marker = 'chartSettings =';
  const start = jsContent.indexOf(marker);
  if (start === -1) {
    return {};
  }
  const open = jsContent.indexOf('{', start);
  if (open === -1) {
    return {};
  }
  let idx = open;
  let depth = 0;
  while (idx < jsContent.length) {
    const ch = jsContent[idx];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        idx += 1;
        break;
      }
    }
    idx += 1;
  }
  const objText = jsContent.slice(open, idx);
  // eslint-disable-next-line no-new-func
  return new Function(`return (${objText})`)();
}

function extractTypes(jsContent) {
  const regex = /this\.initChart\("\.([A-Za-z0-9]+)",\s*this\.(\w+),\s*"(\w+)"\)/g;
  const matches = {};
  let m;
  while ((m = regex.exec(jsContent))) {
    matches[m[3]] = m[2];
  }
  const typeMap = { chartAOptions: 'bar', chartBoxOptions: 'box-and-whisker' };
  const result = {};
  Object.entries(matches).forEach(([name, opt]) => {
    result[name] = typeMap[opt] || 'bar';
  });
  return result;
}

function generateRevEng({
  jsFile = 'force-app/main/default/lwc/dynamicCharts/dynamicCharts.js',
  htmlFile = 'force-app/main/default/lwc/dynamicCharts/dynamicCharts.html',
  outputFile = 'revEngCharts.json',
  silent = false
} = {}) {
  if (!fs.existsSync(jsFile)) {
    throw new Error(`JS file not found: ${jsFile}`);
  }
  if (!fs.existsSync(htmlFile)) {
    throw new Error(`HTML file not found: ${htmlFile}`);
  }

  const jsContent = fs.readFileSync(jsFile, 'utf8');
  const settings = extractChartSettings(jsContent);
  const types = extractTypes(jsContent);

  const charts = Object.entries(settings).map(([id, def]) => {
    const style = {};
    if (def.colors) {
      style.seriesColors = def.colors.join(',');
    }
    style.font = 'default';
    if (def.effects) {
      style.effects = def.effects;
    }
    return {
      dashboard: def.dashboard,
      id,
      type: types[id] || 'bar',
      title: def.title,
      fieldMappings: def.fieldMappings,
      style
    };
  });

  const result = { charts };
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  if (!silent) {
    console.log(`Wrote ${charts.length} charts to ${outputFile}`);
  }
  return result;
}

function runCLI() {
  const opts = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--js-file=')) {
      opts.jsFile = arg.split('=')[1];
    } else if (arg.startsWith('--html-file=')) {
      opts.htmlFile = arg.split('=')[1];
    } else if (arg.startsWith('--output-file=')) {
      opts.outputFile = arg.split('=')[1];
    } else if (arg === '--silent') {
      opts.silent = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node lwcReader.js [--js-file file] [--html-file file] [--output-file file] [--silent]'
      );
      process.exit(0);
    }
  });
  try {
    generateRevEng(opts);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runCLI();
}

module.exports = generateRevEng;
