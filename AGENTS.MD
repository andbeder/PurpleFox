# AGENTS.md

> This file lists the agents implemented for the Dynamic Charts project and the high-level workflows that tie them together.

## Agents

All agent implementations live under `scripts/agents/`, with per-agent documentation in `docs/agents/`.
Each agent is responsible for providing a runnable Node.js script named after the
agent. The file must be placed at `scripts/agents/<agent name>.js` so the
automation commands can locate it.

| Agent Name                 | Script Path                                | Documentation                           |                       |
| -------------------------- | ------------------------------------------ | --------------------------------------- | --------------------- |
| **sfdcAuthorizer**         | `scripts/agents/sfdcAuthorizer.js`         | `docs/agents/sfdcAuthorizer.md`         |                       |
| **dashboardRetriever**     | `scripts/agents/dashboardRetriever.js`     | `docs/agents/dashboardRetriever.md`     |                       |
| **dashboardReader**        | `scripts/agents/dashboardReader.js`        | `docs/agents/dashboardReader.md`        |                       |
| **lwcReader**              | `scripts/agents/lwcReader.js`              | `docs/agents/lwcReader.md`              |                       |
| **changeRequestGenerator** | `scripts/agents/changeRequestGenerator.js` | `docs/agents/changeRequestGenerator.md` |                       |
| **syncCharts**             | `scripts/agents/syncCharts.js`             | `docs/agents/syncCharts.md`             |                       |
| **lwcTester**              | `scripts/agents/lwcTester.js`              | `docs/agents/lwcTester.md`              |                       |
| **sfdcDeployer**           | `scripts/agents/sfdcDeployer.js`           | `docs/agents/sfdcDeployer.md`           |  |

## Workflows


### generate\:charts

   **Sequence**:

   1. **sfdcAuthorizer**

      * Authenticates with Salesforce and caches an access token.
   2. **dashboardRetriever**

      * Retrieves dashboard state JSON (e.g., `CR-02.json`).
   3. **dashboardReader**

      * Parses dashboard JSON into normalized chart definitions and writes `charts.json`.
   4. **lwcReader**

      * Reads `force-app\main\default\lwc\dynamicCharts\dynamicCharts.js` and `force-app\main\default\lwc\dynamicCharts\dynamicCharts.html` for chart components and ApexCharts options driving them
      * Writes `revEndCharts.json` based on `CHART_JSON_DEFINITION.MD` 

   5. **changeRequestGenerator**

      * Compares `charts.json` with `revEngCharts.json` to produce `changeRequests.json` and `changeRequestInstructions.txt`.

   **Outputs**: `charts.json`, `changeRequests.json`, `changeRequestInstructions.txt`

   ---

### sync\:charts

   1. **syncCharts**

      * Reads `changeRequests.json`.
      * Applies AST transformations to update or remove chart markup and JS options in `dynamicCharts.html` and `dynamicCharts.js`.

   **Outputs**: Updated LWC source files. 

   ---

### deploy\:charts

   1. **lwcTester**

      * Runs Jest unit tests (`npm run test:unit`) to validate updated components.
   2. **sfdcDeployer**

      * Deploys changes in `force-app/main/default` to the Salesforce org.

**Outputs**: Test reports and deployment logs. 


### end-to-end\:charts


   1. **sfdcAuthorizer**

      * Authenticates with Salesforce and caches an access token.
   2. **dashboardRetriever**

      * Retrieves dashboard state JSON (e.g., `CR-02.json`).
   3. **dashboardReader**

      * Parses dashboard JSON into normalized chart definitions and writes `charts.json`.
   4. **lwcReader**

      * Reads `charts.json` and generates LWC component files (`.js`, `.html`, `.js-meta.xml`).
   5. **changeRequestGenerator**

      * Compares `charts.json` with `revEngCharts.json` to produce `changeRequests.json` and `changeRequestInstructions.txt`.
   6. **syncCharts**

      * Reads `changeRequests.json`.
      * Applies AST transformations to update or remove chart markup and JS options in `dynamicCharts.html` and `dynamicCharts.js`.
   7. **lwcTester**

      * Runs Jest unit tests (`npm run test:unit`) to validate updated components.
   8. **sfdcDeployer**

      * Deploys changes in `force-app/main/default` to the Salesforce org.

  **Outputs**: `charts.json`, `changeRequests.json`, `changeRequestInstructions.txt`, Updated LWC source files.

