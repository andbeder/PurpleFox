const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadJson(file) {
  const p = path.resolve(file);
  if (!fs.existsSync(p)) {
    throw new Error(`file not found: ${file}`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function parseChartSettings(jsText) {
  const marker = 'chartSettings =';
  const start = jsText.indexOf(marker);
  if (start === -1) throw new Error('chartSettings block not found');
  const open = jsText.indexOf('{', start);
  let idx = open;
  let depth = 0;
  while (idx < jsText.length) {
    const ch = jsText[idx];
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
  const objText = jsText.slice(open, idx);
  const obj = vm.runInNewContext('(' + objText + ')');
  const semicolonIdx = jsText.indexOf(';', idx);
  const end = semicolonIdx === -1 ? idx : semicolonIdx + 1;
  return { obj, start, open, end };
}

function serializeSettings(obj) {
  let str = JSON.stringify(obj, null, 2);
  str = str.replace(/"([a-zA-Z_$][\w$]*)"(?=:)/g, '$1');
  return str;
}

function toPascal(id) {
  return id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function updateJs(jsPath, changes) {
  let content = fs.readFileSync(jsPath, 'utf8');
  const { obj: settings, open, end } = parseChartSettings(content);

  changes.changes.forEach((change) => {
    if (change.targetFile !== 'dynamicCharts.js') return;
    const id = change.chartId;
    if (change.action === 'remove') {
      delete settings[id];
      return;
    }
    const entry = settings[id] || {};
    const mismatches = change.mismatches || [];
    mismatches.forEach((m) => {
      const val = m.expectedValue;
      if (m.property === 'dashboard') entry.dashboard = val;
      else if (m.property === 'title') entry.title = val;
      else if (m.property === 'fieldMappings') entry.fieldMappings = val;
      else if (m.property === 'style') {
        if (val.seriesColors) entry.colors = val.seriesColors.split(',');
        if (Array.isArray(val.effects)) entry.effects = val.effects;
      }
    });
    settings[id] = entry;
  });

  const newObj = serializeSettings(settings) + ';';
  content = content.slice(0, open) + newObj + content.slice(end);
  fs.writeFileSync(jsPath, content);
}

function updateHtml(htmlPath, changes) {
  let lines = fs.readFileSync(htmlPath, 'utf8').split(/\r?\n/);
  const ulStart = lines.findIndex((l) => l.includes('<ul') && l.includes('slds-list_dotted'));
  let ulEnd = lines.findIndex((l, i) => i > ulStart && l.includes('</ul>'));
  let layoutEnd = lines.lastIndexOf('</lightning-layout-item>');
  changes.changes.forEach((change) => {
    if (change.targetFile !== 'dynamicCharts.js') return;
    const id = change.chartId;
    if (change.action === 'remove') {
      lines = lines.filter(
        (l) =>
          !l.includes(`class=\"${id} `) &&
          !l.includes(`class=\"${id}AO`) &&
          !l.includes(`data-id=\"${id}`)
      );
    } else if (change.action === 'add') {
      const pascal = toPascal(id);
      const nav = [
        '        <li>',
        `          <a href="javascript:void(0);" data-id="${pascal}" onclick={handleNavClick}>${pascal}</a>`,
        '        </li>'
      ];
      lines.splice(ulEnd, 0, ...nav);
      ulEnd += nav.length;
      const block = [
        `      <div data-page="${pascal}">`,
        '        <lightning-card title="Chart Series" icon-name="custom:custom1">',
        '          <lightning-layout>',
        '            <lightning-layout-item size="6">',
        `              <div class="${pascal} slds-var-m-around_medium" lwc:dom="manual"></div>`,
        '            </lightning-layout-item>',
        '            <lightning-layout-item size="6">',
        `              <div class="${pascal}AO slds-var-m-around_medium" lwc:dom="manual"></div>`,
        '            </lightning-layout-item>',
        '          </lightning-layout>',
        '        </lightning-card>',
        '      </div>'
      ];
      lines.splice(layoutEnd, 0, ...block);
      layoutEnd += block.length;
    }
  });
  fs.writeFileSync(htmlPath, lines.join('\n'));
}

function syncCharts({
  input = 'changeRequests.json',
  html = 'force-app/main/default/lwc/dynamicCharts/dynamicCharts.html',
  js = 'force-app/main/default/lwc/dynamicCharts/dynamicCharts.js'
} = {}) {
  if (!html || !js) {
    throw new Error('html and js options are required');
  }
  const changes = loadJson(input);
  updateJs(js, changes);
  updateHtml(html, changes);
  return changes;
}

if (require.main === module) {
  const opts = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--input=')) opts.input = arg.split('=')[1];
    else if (arg.startsWith('--html=')) opts.html = arg.split('=')[1];
    else if (arg.startsWith('--js=')) opts.js = arg.split('=')[1];
    else if (arg === '-h') {
      console.log(
        'Usage: node syncCharts.js --input file --html file --js file'
      );
      process.exit(0);
    }
  });
  try {
    syncCharts(opts);
    console.log('syncCharts complete');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

module.exports = syncCharts;
