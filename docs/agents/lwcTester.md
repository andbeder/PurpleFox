# lwcTester Agent

**Script Path**: `scripts/agents/lwcTester.js`

## Description

Automates building, maintaining, and enhancing Jest-based unit and integration tests for the `dynamicCharts` Lightning Web Component. All test scripts are stored under the `test/lwcTester/` directory and are version-controlled alongside your application code. fileciteturn1file0

## Inputs

- Authenticated Salesforce org via `sfdcAuthorizer`.
- Source code for the `dynamicCharts` component.
- Optional flags:
  - `--unit`: Run Jest unit tests only.
  - `--integration`: Run Jest integration tests only.
  - `--ci`: Run all tests in CI mode.

## Behavior

1. **Authenticate**: Verifies Salesforce org authentication via `sfdcAuthorizer`.
2. **Install & Update Tooling**: Verifies `sfdx-lwc-jest`, `apexcharts`, and `jest-canvas-mock` exist under `node_modules` and installs them when missing. fileciteturn1file0
3. **Scaffold Test Structure**: Creates `test/lwcTester/` with `unit/`, `integration/`, and `__mocks__/`.
4. **Generate & Update Test Templates**: For each chart definition in `dynamicCharts.js` or `charts.json`, generates or refreshes parameterized Jest test files, verifying SAQL assembly, ApexCharts instantiation, filter UI interactions, and snapshot updates. fileciteturn1file0
5. **Maintain Existing Tests**: Detects outdated or missing assertions, offers snapshot updates or placeholder specs. fileciteturn1file0
6. **Enforce Coverage & Quality**: Applies minimum coverage thresholds (Statements: 80%, Branches: 75%, Functions: 80%, Lines: 80%), reports gaps, and runs lint via `npm run lint`. fileciteturn1file0
7. **Run & Watch Mode**: Executes tests on-demand (`npm run test:lwc:unit`, `npm run test:lwc:integration`) and supports `--watch`. fileciteturn1file0
8. **Reporting**: Outputs console results and generates HTML reports in `test/lwcTester/reports/`. fileciteturn1file0
9. **CI Integration**: Updates `package.json` with scripts for unit, integration, and full CI test runs. fileciteturn1file0

## Preconditions

- Salesforce org authenticated via `sfdcAuthorizer`.
- Valid `jest.config.js` in project root with appropriate module mappings and setup files. fileciteturn1file0

## Dependencies

- Node.js ≥ v14.
- DevDependencies: `sfdx-lwc-jest`, `apexcharts`, `jest-canvas-mock`.
- `test/lwcTester/` directory (auto-generated if absent). fileciteturn1file0

## CLI Usage

```bash
node scripts/agents/lwcTester.js [--unit] [--integration] [--ci]
```

- `--unit` (`-u`): Run only Jest unit tests.
- `--integration` (`-i`): Run only Jest integration tests.
- `--ci` (`-c`): Run all tests in CI mode.

## Example

Use the npm script provided in `package.json` to run tests and deploy:

```bash
npm run deploy:charts
```

This pipeline includes:

```bash
npm run test:lwc:unit && node scripts/agents/lwcTester.js && node scripts/agents/sfdcDeployer.js
```

## Output

- A comprehensive, up-to-date test suite under `test/lwcTester/`.
- Updated test-related scripts in `package.json`.
- Coverage and test reports in `test/lwcTester/reports/`. fileciteturn1file0
