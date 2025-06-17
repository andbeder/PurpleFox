const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const authorize = require("./sfdcAuthorizer");

function ensureDevDependencies() {
  const pkgPath = path.resolve(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const devDeps = pkg.devDependencies || {};
  const needed = ["sfdx-lwc-jest", "apexcharts", "jest-canvas-mock"];
  const missingInPkg = needed.filter((d) => !devDeps[d]);
  const missingOnDisk = needed.filter(
    (d) => !fs.existsSync(path.join("node_modules", d))
  );
  const missing = Array.from(new Set([...missingInPkg, ...missingOnDisk]));
  if (missing.length) {
    const cmd = `npm install --save-dev ${missing.join(" ")}`;
    execSync(cmd, { stdio: "inherit" });
  }
}

function ensureTestStructure(baseDir = "test/lwcTester") {
  ["unit", "integration", "__mocks__", "reports"].forEach((d) => {
    fs.mkdirSync(path.join(baseDir, d), { recursive: true });
  });
}

function runTests({ unit, integration, ci } = {}) {
  let script = "npm run test:lwc:unit";
  if (integration) script = "npm run test:lwc:integration";
  if (ci) {
    execSync("npm run lint", { stdio: "inherit" });
  }
  execSync(script, { stdio: "inherit" });
}

function lwcTester(opts = {}) {
  authorize();
  ensureDevDependencies();
  ensureTestStructure();
  runTests(opts);
}

if (require.main === module) {
  const opts = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg === "--unit" || arg === "-u") opts.unit = true;
    else if (arg === "--integration" || arg === "-i") opts.integration = true;
    else if (arg === "--ci" || arg === "-c") opts.ci = true;
  });
  lwcTester(opts);
}

module.exports = lwcTester;
module.exports.ensureTestStructure = ensureTestStructure;
module.exports.runTests = runTests;
module.exports.ensureDevDependencies = ensureDevDependencies;
