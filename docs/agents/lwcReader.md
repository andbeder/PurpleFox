# lwcReader

> Parses the `dynamicCharts` Lightning Web Component to produce `revEngCharts.json` containing the currently implemented chart definitions.

## Script Path

`scripts/agents/lwcReader.js`

## Description

This agent inspects `force-app/main/default/lwc/dynamicCharts/dynamicCharts.js` and `dynamicCharts.html` to reverse engineer chart metadata. The extracted information is normalized according to `CHART_JSON_DEFINITION.MD` and written to `revEngCharts.json`.

## CLI Options

- `--js-file <file>` (optional, default: `force-app/main/default/lwc/dynamicCharts/dynamicCharts.js`): Path to the component JavaScript file.
- `--html-file <file>` (optional, default: `force-app/main/default/lwc/dynamicCharts/dynamicCharts.html`): Path to the component template file.
- `--output-file <file>` (optional, default: `revEngCharts.json`): Destination for the generated chart definitions.
- `--silent` (optional): Suppress informational output.
- `-h, --help`: Display help information.

## Inputs

- `jsFile`: Path to the LWC JavaScript file.
- `htmlFile`: Path to the LWC template file.
- _(Optional)_ `outputFile`: Location of the resulting JSON file.
- _(Optional)_ `silent`: Flag to suppress logs.

## Behavior

1. **Extract Chart Settings**
   - Locate and evaluate the `chartSettings` object in the JavaScript file.
   - Detect the `initChart` calls to determine which chart option set (`chartAOptions`, `chartBoxOptions`, etc.) applies to each chart.
2. **Normalize Data**
   - Map option sets to chart `type` values (`chartAOptions` → `bar`, `chartBoxOptions` → `box-and-whisker`).
   - Convert `colors` arrays to a comma-separated `style.seriesColors` value and default the `font` to `"default"`.
3. **Write Output**
   - Assemble an object following `CHART_JSON_DEFINITION.MD` and write it to `revEngCharts.json`.
   - Log the number of charts written unless the `silent` flag is provided.

## Assumptions

- The LWC defines a single `chartSettings` object listing chart metadata.
- Each chart is initialized via `this.initChart('.<name>', this.<optionsVar>, '<name>')`.

## Error Handling

- Throws if the specified source files are missing.
- Propagates JSON and file system errors.

## Dependencies

- Node.js (v14+)
- `fs`, `path`

## Preconditions

- The `dynamicCharts` component exists under `force-app/main/default/lwc`.

## Output

- `revEngCharts.json`

## Examples

```bash
node scripts/agents/lwcReader.js
```

```bash
node scripts/agents/lwcReader.js \
  --js-file lwc/dynamicCharts.js \
  --html-file lwc/dynamicCharts.html \
  --output-file data/revEngCharts.json
```
