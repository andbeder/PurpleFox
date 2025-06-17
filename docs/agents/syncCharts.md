# syncCharts Agent

**Script Path**: `scripts/agents/syncCharts.js`

## Description

The `syncCharts` agent merges the functionality of the `changeRequestInterpreter` and `chartSynchronizer` agents. It reads `changeRequests.json`, applies schema diffs, and performs AST-based transformations on your Lightning Web Component source files (`dynamicCharts.html` and `dynamicCharts.js`) to synchronize them with the authoritative dashboard definitions.

## Inputs

- `changeRequests.json`: A JSON file containing an array of change requests, each with `chartId`, `action`, `targetFile`, and `mismatches`.
- Source files:
  - `force-app/main/default/lwc/dynamicCharts/dynamicCharts.html`
  - `force-app/main/default/lwc/dynamicCharts/dynamicCharts.js`

## Behavior

1. **Parse** `changeRequests.json` to extract add/remove/update instructions.
2. **Load** target source files for in-place editing.
3. **For each** change request:
   - **add**: Insert new chart markup and initialization logic.
   - **remove**: Delete deprecated chart markup and related JavaScript calls.
   - **update**: Modify chart properties (titles, field mappings, styles) using AST transforms for precise code edits.
4. **Save** updated source files back to disk.
5. **Log** a summary of applied changes.

## Dependencies

- **jscodeshift** (or similar AST tooling) for code transformations.
- **fs-extra** for file I/O.
- Node.js ≥ 14.

## CLI Usage

```bash
node scripts/agents/syncCharts.js --input changeRequests.json --html force-app/main/default/lwc/dynamicCharts/dynamicCharts.html --js force-app/main/default/lwc/dynamicCharts/dynamicCharts.js
```

- `--input` (`-i`): Path to `changeRequests.json`. Defaults to `changeRequests.json`.
- `--html` (`-h`): Path to `dynamicCharts.html`. Defaults to `force-app/main/default/lwc/dynamicCharts/dynamicCharts.html`.
- `--js` (`-j`): Path to `dynamicCharts.js`. Defaults to `force-app/main/default/lwc/dynamicCharts/dynamicCharts.js`.

## Example

Use the npm script provided in `package.json` to run the agent end-to-end:

```bash
npm run sync:charts
```

## Output

- Updated `dynamicCharts.html` and `dynamicCharts.js` files with charts synchronized to the latest dashboard definitions.
