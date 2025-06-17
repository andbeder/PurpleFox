# Dynamic Charts System Requirements

## Purpose

Dynamic Charts is a Lightning application for Salesforce that enables users to quickly generate interactive charts in the Salesforce UI. The application leverages the ApexCharts JavaScript library to render charts and retrieves data from CRM Analytics (Wave) datasets using SAQL queries.

## Functional Requirements

1. **Dataset Retrieval**
   - The system shall fetch available CRM Analytics datasets using the `getDatasets` wire adapter.
   - Only datasets of type `Default` or `Live` with license type `EinsteinAnalytics` shall be returned.
2. **Dashboard Retrieval**
   - A `dashboardRetriever` script shall download dashboard state JSON using the CRM Analytics REST API.
   - If only a dashboard label is provided, the script shall query the CRM Analytics REST API using `SF_INSTANCE_URL` and `SF_ACCESS_TOKEN` environment variables to resolve the dashboard's API name.
   - Retrieved files shall be written to a configurable output directory (default `tmp`).
   - The script shall validate the REST response and fail when it contains an `errorCode` field so that invalid dashboards are not saved.
3. **Dashboard Parsing**
   - A `dashboardReader` script shall convert exported dashboard JSON into normalized chart definitions.
   - The parser must handle dashboard files where the `widgets` section is either an array or a keyed object.
   - The parser shall detect error responses (objects with `errorCode`) and throw `Invalid dashboard JSON` to halt processing.
   - Metadata describing each chart is now read from a text widget placed in the column to the right of the chart. The text widget uses CSS-style strings (`key: value`) separated by semicolons or newlines instead of the subtitle field.
   - Parsed charts shall be written to `charts.json`, replacing previous definitions. Style attribute keys discovered in the text widgets shall be tracked in `chartStyles.txt`.
   - Widgets are processed in row-major order so chart widgets are encountered before their companion text widgets.
4. **Component Analysis**
   - A `lwcReader` script shall parse the existing Lightning Web Component source and output `revEngCharts.json` describing the charts implemented.
5. **Filter Options**
   - Users shall filter chart results by `host`, `nation`, `season`, and `ski` attributes.
   - Dual list boxes shall be provided for `host`, `nation`, and `season` selections.
   - A combo box shall be provided for the `ski` selection with the choices **All**, **Yes**, and **No**.
   - Selecting a value in any filter shall refresh the remaining filter options so that only valid values are displayed.
6. **Dynamic Query Generation**
   - The component shall build a SAQL query based on selected filter values.
   - Filters shall be combined using the `filter q by` SAQL syntax.
7. **Chart Rendering**
   - The system shall load the ApexCharts library from a static resource only once during component initialization.
   - Dashboards organize widgets in two columns: charts on the left and text widgets on the right. The first layout is sorted by row then column so the parser reads chart then description.
   - All charts shall be shown in pairs side-by-side:
     - The original chart bound to the filters so that it is applying a positive filter
     - A clone of the original chart with `AO` appended to the ID which shows 'All Others' or the inverse (!=) of the filters applied
   - Chart data shall refresh only when the user clicks the **Render** button
   - Chart content and presentation shall be governed by CRMA dashboards referenced by a property in `charts.json`.
   - For every chart ID listed in `charts.json`, the markup shall include a pair of containers: one with the ID itself and a second with the `AO` suffix.
   - The component currently displays three chart pairs: `ClimbsByNation`/`ClimbsByNationAO`, `TimeByPeak`/`TimeByPeakAO`, and `CampsByPeak`/`CampsByPeakAO`.
   - Charts configured with a `shadow` effect shall display drop shadows using the ApexCharts `chart.dropShadow` option.
8. **User Interface**
   - The component shall expose a Lightning App Page, Record Page, and Home Page target as defined in the metadata file.
   - Chart content shall appear within `<lightning-card>` containers that include `<div>` elements with classes matching the titles of charts within CRM Analytics dashboards.
   - A vertical unordered list on the left shall allow users to select which chart page is displayed. Each chart pair occupies its own page.
   - Dashboard pages use a two-column layout: charts appear on the left and a text widget on the right displays the chart description and style metadata.
9. **Compatibility**
   - The application shall be compatible with Salesforce API version 59.0 as specified in the `sfdx-project.json` configuration.
   - Development tooling shall run on Node.js 18 or later (tested with Node.js 22). Using unsupported Node versions may prevent `npm install` from completing successfully.
10. **Change Request Generation**

- A Node script named `changeRequestGenerator` shall compare `charts.json` with `revEngCharts.json` and output both `changeRequests.json` and a developer-oriented `changeRequestInstructions.txt` file.
- Chart IDs shall be normalized to kebab-case during comparison so differences in naming style do not generate spurious changes.
- The instructions file shall translate style changes into their corresponding ApexCharts option paths so developers can implement updates precisely.
- A Node script named `syncCharts` shall apply `changeRequests.json` to update `dynamicCharts.html` and `dynamicCharts.js` automatically. The script defaults to `force-app/main/default/lwc/dynamicCharts/dynamicCharts.html` and `force-app/main/default/lwc/dynamicCharts/dynamicCharts.js` when paths are not provided.
- The `syncCharts` agent shall modify the `chartSettings` object when mismatched properties specify new dashboard names, titles, field mappings, or style values.
- A Node script named `endToEndCharts` shall run all agents sequentially. It shall be exposed through the npm command `end-to-end:charts`. The command accepts `--dashboard=<name>` or reads the `npm_config_dashboard` environment variable to pass the dashboard API name to `dashboardRetriever` and `dashboardReader`.

## Non‑Functional Requirements

1. **Performance**
   - Chart rendering shall occur within one second after the ApexCharts library loads and the SAQL query completes.
   - No more than five CRM Analytics queries shall execute concurrently. A query queue processes one request at a time to comply with this limit.
2. **Security**
   - The LWC shall operate with sharing enforced through Salesforce security mechanisms.
   - A Node script named `sfdcAuthorizer` shall authenticate to Salesforce via JWT and set the default CLI username for deployment and testing automation.
   - If `./tmp/access_token.txt` exists, the authorizer shall validate the token against Salesforce and reuse it when accepted, skipping the login step.
   - Token validation shall prefer the `SF_INSTANCE_URL` environment variable and fall back to `SFDC_LOGIN_URL` to prevent unnecessary authentication cycles.
3. **Maintainability**
   - Code shall be written in modern JavaScript and Apex standards to ease future modifications.
4. **Extensibility**
   - The system should allow additional chart types and datasets to be introduced with minimal code changes.
5. **Testing**
   - Automated tests shall verify that each chart container successfully initializes an ApexCharts instance.

- A Node script named `lwcTester` shall verify that `sfdx-lwc-jest`, `apexcharts`, and `jest-canvas-mock` are installed in `node_modules`, install any missing packages, run Jest unit and integration tests from `test/lwcTester`, and enforce minimum coverage of 80% statements, 75% branches, 80% functions, and 80% lines before deployment.
- Each agent's tests shall be runnable individually via npm scripts such as `npm run test:changeRequestGenerator`.
- Each agent shall have a dedicated npm script. Pass the dashboard API name using `--dashboard=<name>` when running `dashboardRetriever` or `dashboardReader`.
- A Node script named `sfdcDeployer` shall deploy metadata using the `sf` CLI and write a deployment report under `reports`.
- Development tooling such as the Salesforce CLI and Jest shall be listed under `devDependencies` in `package.json` so `npm install` fully sets up the environment.

## Out of Scope

- Complex state management beyond the provided filters.
- Server-side Apex logic aside from the placeholder `DPOStateMachine` class.
- Advanced chart features such as drill‑down or cross‑filtering between multiple charts.
