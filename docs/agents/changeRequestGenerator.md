# changeRequestGenerator

> Compares the authoritative chart definitions in `charts.json` against the current LWC state in `revEngCharts.json`, generating a `changeRequestInstructions.txt` file with step-by-step developer guidance.

## Script Path

`scripts/agents/changeRequestGenerator.js`

## Description

This agent reads the upstream dashboard definitions (`charts.json`) and the reverse-engineered LWC chart definitions (`revEngCharts.json`), then compares them to produce a JSON-formatted set of change requests to synchronize your Lightning Web Component with the latest dashboard metadata. fileciteturn3file2turn3file3

## CLI Options

- `--charts-file <file>` (optional, default: `charts.json`): Path to the authoritative chart definitions file.
- `--rev-eng-charts-file <file>` (optional, default: `revEngCharts.json`): Path to the reverse-engineered chart definitions.
- `--json-file <file>` (optional, default: `changeRequests.json`): Path where the raw change request data will be written.
- `--output-file <file>` (optional, default: `changeRequestInstructions.txt`): Path where developer instructions will be written.
- `--silent` (optional): Suppress informational logging.
- `-h, --help`: Show help information.

## Inputs

- `chartsFile`: Authoritative charts definitions JSON.
- `revEngChartsFile`: Current LWC chart definitions JSON.
- _(Optional)_ `jsonFile`: Destination path for the raw change request data.
- _(Optional)_ `outputFile`: Destination for the developer instructions text file.
- _(Optional)_ `silent`: Flag to silence logs.

## Behavior

1. **Validate Preconditions**

   - Ensure both input files exist and contain valid JSON.
   - Create output directory if necessary.

2. **Load Inputs**

   - Parse `charts.json` into _authoritativeCharts_.
   - Parse `revEngCharts.json` into _currentCharts_. fileciteturn3file3

3. **Build Lookup Maps**

   - Index each input by `chart.id` for efficient comparison.

4. **Detect Added & Removed Charts**

   - **Add**: Charts present in _authoritativeCharts_ but missing in _currentCharts_.
   - **Remove**: Charts present in _currentCharts_ but missing in _authoritativeCharts_.

5. **Detect Updated Charts**

   - For each chart ID in both sets:
     - Compare each relevant property (e.g., `title`, `type`, `saql`, `style.seriesColors`, etc.).
     - Record any mismatches under an `mismatches` array, listing `property`, `currentValue`, and `expectedValue`.

6. **Construct Change Requests**

   - Assemble an array of objects:
     ```jsonc
     {
       "chartId": "<chart.id>",
       "action": "add" | "remove" | "update",
       "targetFile": "dynamicCharts.html" | "dynamicCharts.js",
       "mismatches": [ /* for updates */ ],
       "instructions": [ /* human-readable steps */ ]
     }
     ```

7. **Write Output**
   - Write the raw change data to `changeRequests.json`.
   - Convert the change data into detailed developer instructions and save them to `changeRequestInstructions.txt`.

## Dependencies

- Node.js (v14+)
- `fs` / `path` for file I/O
- JSON diff library (e.g., `deep-diff` or custom comparator)
- Input files: `charts.json` and `revEngCharts.json`

## Preconditions

- Both `charts.json` and `revEngCharts.json` exist and are valid JSON.
- Output directory is writeable.

## Output

- `changeRequests.json`: Raw change request data consumed by automation tools.
- `changeRequestInstructions.txt`: Human and machine-readable instructions detailing exactly what changes an LWC developer needs to make to the current LWC. Adding charts should include all detail required to build the chart including type, colors, style, etc. Updates should be specific and actionable. Deletes should be targeted.

## Examples

### Basic Usage

```bash
node scripts/agents/changeRequestGenerator.js
```

### Custom Input & Output Paths

```bash
node scripts/agents/changeRequestGenerator.js \
  --charts-file data/charts.json \
  --rev-eng-charts-file data/revEngCharts.json \
  --json-file tmp/changeRequests.json \
  --output-file generated/changeRequestInstructions.txt
```
