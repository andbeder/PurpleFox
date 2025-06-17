# sfdcDeployer Agent

**Script Path**: `scripts/agents/sfdcDeployer.js`

## Description

The `sfdcDeployer` agent orchestrates the deployment of Salesforce metadata (Lightning Web Components, Apex classes, static resources, etc.) to your target org. It leverages `sfdcAuthorizer` for authentication and uses the unified Salesforce CLI (`sf`) commands under the hood to perform robust, repeatable deployments with error handling and reporting.

## Inputs

- Authenticated Salesforce org via `sfdcAuthorizer`.
- Metadata source directory (e.g., `force-app/main/default`).
- Optional flags:

  - `--checkonly` (`-c`): Perform a validation deployment without committing changes.
  - `--verbose` (`-v`): Output detailed logs for debugging.
  - `--wait <minutes>` (`-w`): Minutes to wait for deployment status (default: 10 minutes).

## Behavior

1. **Authenticate**: Confirms valid session with the target org via `sfdcAuthorizer`.
2. **Validate**: Optionally runs:

   ```bash
   sf project deploy validate --source-dir <path> --target-org <alias> --wait <minutes>
   ```

   to perform a dry-run and catch errors early.

3. **Deploy**: Executes:

   ```bash
   sf project deploy start --source-dir <path> --target-org <alias> --wait <minutes>
   ```

   to push the specified metadata to the target org.

4. **Monitor**: The `--wait` flag causes the CLI to poll the deployment status until completion or timeout. For ad-hoc status checks:

   ```bash
   sf project deploy report --job-id <jobId>
   ```

5. **Error Handling**: On failure, captures error details, optionally rolls back partial changes, and emits a non-zero exit code.
6. **Reporting**: Writes deployment results (successes, failures, warnings) to `reports/deploy-report-<timestamp>.json` and prints a summary to the console.

## Dependencies

- **Salesforce CLI** (`sf`) installed and configured.
- **Node.js** ≥ 14.
- **fs-extra** for file system operations.
- **sfdcAuthorizer** agent for authentication.

## CLI Usage

You can invoke the SF CLI directly:

```bash
sf project deploy start --source-dir force-app/main/default --target-org MyOrgAlias --wait 10
```

Or use the agent script in your CI pipeline:

```bash
node scripts/agents/sfdcDeployer.js --source-dir force-app/main/default --target-org MyOrgAlias --wait 10
```

- `--source` (`-s`): Path to metadata directory.
- `--checkonly` (`-c`): Validate only.
- `--verbose` (`-v`): Enable detailed logging.
- `--wait` (`-w`): Minutes to wait for completion.

## Example

Include in your `package.json` scripts:

```json
{
  "scripts": {
    "validate": "node scripts/agents/sfdcDeployer.js --source-dir force-app/main/default --checkonly",
    "deploy:charts": "node scripts/agents/lwcTester.js && node scripts/agents/sfdcDeployer.js --source-dir force-app/main/default"
  }
}
```

## Output

- Files deployed to the target org.
- Console summary of results.
- Detailed JSON report in `reports/`.
