# dashboardReader

> Parses Salesforce dashboard JSON files to extract structured chart definitions compatible with ApexCharts.

## Script Path

`scripts/agents/dashboardReader.js`

## Description

This agent reads an extracted dashboard `state` JSON file and produces normalized chart definitions suitable for downstream processing.

## CLI Options

- `--dashboard-api-name <dashboardApiName>` (required): DeveloperName of the target dashboard.
- `--input-dir <directory>` (optional, default: `tmp`): Directory containing the dashboard state JSON file.
- `--charts-file <file>` (optional, default: `charts.json`): Path to output the normalized chart definitions.
- `--silent` (optional): Suppress informational output.
- `-h, --help`: Display help information.

## Inputs

- `dashboardApiName`: The DeveloperName of the dashboard.
- _(Optional)_ `inputDir`: Directory where state JSON files are located.
- _(Optional)_ `chartsFile`: File path for the output chart definitions.
- _(Optional)_ `silent`: Flag to suppress logs.

## Behavior

1. **Read Dashboard State**  
   Reads the file `${inputDir}/${dashboardApiName}.json`.

2. **Parse Chart Definitions**

   - Applies parsing rules defined in `DASHBOARD_PARSING_INSTRUCTIONS.MD`.
   - Widgets are sorted by row and then column so that each chart is immediately followed by its description widget.
   - Normalizes each chart widget into an entry with `id`, `type`, `title`, `fieldMappings`, `saql`, and `style`.

3. **Update `charts.json`**
   - Replaces or appends entries in `charts.json` keyed by `chart.id`.
   - Removes any existing chart entries not present in the current dashboard.

## Assumptions

- `title` is converted to kebab-case and used as `chart.id`.
- Style metadata is stored in a text widget positioned to the right of each chart. The text uses CSS-style syntax (`key: value`) and fields may be separated by semicolons or newlines. This replaces the previous use of the subtitle field.
- Widgets are processed in row-major order so that each chart widget is followed by its companion text widget.
- Color names not in the defined scheme are treated as valid CSS colors.
- Missing charts in the new dashboard cause removal of their entries from `charts.json`. fileciteturn2file0

## Error Handling

- Skips and logs charts missing required fields or containing invalid metadata.
- Gracefully handles missing input files or parsing errors, exiting with a non-zero code. fileciteturn2file0
- Detects when the dashboard JSON represents an error response (contains
  `errorCode`) and throws `Invalid dashboard JSON` to halt processing.

## Dependencies

- `DASHBOARD_PARSING_INSTRUCTIONS.MD`
- `charts.json` (will be created or updated) fileciteturn2file0
- `chartStyles.txt` (auto-populated with discovered style keys)

## Preconditions

- Salesforce dashboard state file (`${inputDir}/${dashboardApiName}.json`) exists.
- Node.js (v14+) is installed.
- Downstream `dashboardRetriever` agent has been executed.

## Output

- A `charts.json` file containing the normalized chart definitions.
- `chartStyles.txt` updated with any new style keys encountered.

## Examples

### Basic Usage

```bash
node scripts/agents/dashboardReader.js --dashboard-api-name CR-02
```

### Custom Input & Output

```bash
node scripts/agents/dashboardReader.js \
  --dashboard-api-name CR-02 \
  --input-dir dashState \
  --charts-file output/charts.json \
  --silent
```
