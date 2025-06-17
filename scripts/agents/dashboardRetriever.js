#!/usr/bin/env node

// scripts/agents/dashboardRetriever.js
// Retrieves a CRM Analytics dashboard state JSON using the Salesforce REST API only,
// reading the access token from tmp/access_token.txt

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Path to the file where your JWT login script writes the token
const TOKEN_PATH = path.resolve(process.cwd(), "tmp", "access_token.txt");

/**
 * Read the access token from disk.
 * @throws {Error} if the file doesn't exist or is empty.
 * @returns {string} the raw access token
 */
function getAccessToken() {
  try {
    const raw = fs.readFileSync(TOKEN_PATH, "utf8").trim();
    if (!raw) {
      throw new Error("Token file is empty");
    }
    return raw;
  } catch (err) {
    throw new Error(
      `Unable to read access token from ${TOKEN_PATH}: ${err.message}`
    );
  }
}

/**
 * If you prefer to look up by dashboard label instead of API name,
 * you can call this function first. Otherwise pass dashboardApiName directly.
 */
function lookupApiNameByLabel(label) {
  const token = getAccessToken();
  const instance = process.env.SF_INSTANCE_URL;
  const apiVersion = process.env.SF_API_VERSION || "59.0";

  if (!instance) {
    throw new Error("SF_INSTANCE_URL must be set in your environment");
  }

  const url = `${instance}/services/data/v${apiVersion}/wave/dashboards`;
  const curlCmd = `curl -s -H "Authorization: Bearer ${token}" "${url}"`;
  const output = execSync(curlCmd, { encoding: "utf8" });
  const dashboards = JSON.parse(output).dashboards || [];
  const match = dashboards.find((d) => d.label === label);

  if (!match) {
    throw new Error(`Dashboard with label "${label}" not found`);
  }
  return match.name;
}

/**
 * Retrieves the dashboard JSON via the Wave REST API and writes it to disk.
 *
 * @param {Object} options
 * @param {string} options.dashboardApiName - The API name of the dashboard.
 * @param {string} [options.dashboardLabel] - Optional label to look up the API name.
 * @param {string} [options.outputDir="tmp"] - Directory to save the JSON file.
 * @returns {string} Description of the action performed.
 */
function retrieveDashboard({
  dashboardApiName,
  dashboardLabel,
  outputDir = "tmp"
}) {
  if (!dashboardApiName) {
    if (!dashboardLabel) {
      throw new Error("dashboardApiName or dashboardLabel is required");
    }
    dashboardApiName = lookupApiNameByLabel(dashboardLabel);
  }

  const token = getAccessToken();
  const instance = process.env.SF_INSTANCE_URL;
  const apiVersion = process.env.SF_API_VERSION || "60.0";

  if (!instance) {
    throw new Error("SF_INSTANCE_URL must be set in your environment");
  }

  const outDir = path.resolve(process.cwd(), outputDir);
  fs.mkdirSync(outDir, { recursive: true });

  const url = `${instance}/services/data/v${apiVersion}/wave/dashboards/${dashboardApiName}`;
  const curlCmd = `curl -s -H "Authorization: Bearer ${token}" "${url}"`;

  // Fetch JSON from REST API
  const json = execSync(curlCmd, { encoding: "utf8" });
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`Failed to parse dashboard JSON: ${err.message}`);
  }

  if (parsed.errorCode || (Array.isArray(parsed) && parsed[0]?.errorCode)) {
    const msg = parsed.message || parsed[0]?.message || "Unknown error";
    throw new Error(`Dashboard retrieval failed: ${msg}`);
  }

  const outPath = path.join(outDir, `${dashboardApiName}.json`);
  fs.writeFileSync(outPath, json, "utf8");

  return `REST → GET ${url} → saved to ${outPath}`;
}

if (require.main === module) {
  let apiName;
  let label;
  let dir = "tmp";

  process.argv.forEach((arg) => {
    if (arg.startsWith("--dashboard-api-name=")) {
      apiName = arg.split("=")[1];
    } else if (arg.startsWith("--dashboard-label=")) {
      label = arg.split("=")[1];
    } else if (arg.startsWith("--output-dir=")) {
      dir = arg.split("=")[1];
    }
  });

  try {
    const result = retrieveDashboard({
      dashboardApiName: apiName,
      dashboardLabel: label,
      outputDir: dir
    });
    console.log(`✅ ${result}`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = retrieveDashboard;
