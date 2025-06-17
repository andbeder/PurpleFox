const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const authorize = require("./sfdcAuthorizer");

/**
 * Writes deployment JSON to a timestamped file under reports/
 */
function writeReport(content) {
  const reportsDir = path.resolve("reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(reportsDir, `deploy-report-${timestamp}.json`);
  fs.writeFileSync(file, content);
  console.log(`✔ Deployment report written to ${file}`);
  return file;
}

/**
 * Deploys or validates metadata via the Salesforce CLI, using a JWT-access-token file
 */
function sfdcDeployer({
  sourceDir = "force-app/main/default",
  checkOnly = false,
  verbose = false,
  wait = 10
} = {}) {
  // 1) Ensure we are logged in and token file is current
  authorize();

  // 2) Read the access token written by authorize()
  const tokenPath = path.resolve(process.cwd(), "tmp", "access_token.txt");
  let accessToken;
  try {
    accessToken = fs.readFileSync(tokenPath, "utf8").trim();
    process.env.SF_ACCESS_TOKEN = accessToken;
  } catch (err) {
    console.error(
      `❌ Could not read access token from ${tokenPath}:`,
      err.message
    );
    process.exit(1);
  }

  // 3) Build the base deploy command
  const baseCmd = checkOnly
    ? "sf project deploy validate"
    : "sf project deploy start";

  const args = [
    `--source-dir ${path.resolve(sourceDir)}`,
    `--wait ${wait}`,
    "--json"
  ];
  if (verbose) args.push("--verbose");

  const cmd = `${baseCmd} ${args.join(" ")}`;

  // 4) Execute with enriched environment
  let output;
  try {
    output = execSync(cmd, {
      encoding: "utf8",
      env: { ...process.env }
    });
  } catch (err) {
    console.error("❌ Deployment failed:", err.message);
    process.exit(1);
  }

  // 5) Write the deployment report and return paths
  const reportPath = writeReport(output);
  return { cmd, reportPath };
}

// If invoked directly from CLI
if (require.main === module) {
  const opts = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--source-dir=")) {
      opts.sourceDir = arg.split("=")[1];
    } else if (arg === "--checkonly" || arg === "-c") {
      opts.checkOnly = true;
    } else if (arg === "--verbose" || arg === "-v") {
      opts.verbose = true;
    } else if (arg.startsWith("--wait=")) {
      opts.wait = parseInt(arg.split("=")[1], 10);
    }
  });
  sfdcDeployer(opts);
}

module.exports = sfdcDeployer;
module.exports.writeReport = writeReport;
