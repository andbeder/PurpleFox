# dashboardRetriever

> Fetches a CRM Analytics dashboard state JSON using the CRM Analytics REST API.

## Script Path

`scripts/agents/dashboardRetriever.js`

## Description

The `dashboardRetriever` agent downloads the JSON representation of a CRM Analytics dashboard so that downstream agents can parse it. It relies on direct REST API calls to retrieve the dashboard state. When only a dashboard label is supplied, the script first queries the CRM Analytics REST API to look up the dashboard's API name.

## CLI Options

- `--dashboard-api-name <dashboardApiName>`: DeveloperName of the dashboard to export.
- `--dashboard-label <label>`: Human readable label used to look up the dashboard API name.
- `--output-dir <directory>` (optional, default: `tmp`): Directory where the dashboard JSON file will be written.
- `-h, --help`: Display basic usage information.

## Inputs

- `dashboardApiName`: DeveloperName of the dashboard.
- `dashboardLabel`: Label used when the API name isn't known.
- _(Optional)_ `outputDir`: Directory in which to place the exported JSON file.

## Behavior

1. Ensure either `dashboardApiName` or `dashboardLabel` is provided.
2. If only `dashboardLabel` is supplied, query the REST API using `SF_ACCESS_TOKEN` and `SF_INSTANCE_URL` to find the corresponding API name.
3. Create `outputDir` if it does not exist.
4. Issue a REST `GET` request:
   ```bash
   curl -s -H "Authorization: Bearer $SF_ACCESS_TOKEN" \
     "$SF_INSTANCE_URL/services/data/v<apiVersion>/wave/dashboards/<dashboardApiName>"
   ```
   and save the response to `<outputDir>/<dashboardApiName>.json`.
5. Validate the parsed JSON and throw an error when the response contains an
   `errorCode` field so invalid data is never written to disk.
6. Exit with a non-zero code on command failure.

## Preconditions

- Salesforce CLI (`sf`) is installed and authenticated via the `sfdcAuthorizer` agent.

## Output

- A dashboard state JSON file named `<dashboardApiName>.json` in the specified directory.

## Example

```bash
# Using API name directly
node scripts/agents/dashboardRetriever.js --dashboard-api-name=CR-02 --output-dir=tmp

# Using dashboard label lookup
node scripts/agents/dashboardReader.js --dashboard-api-name=CR_02 --output-dir=tmp
```
