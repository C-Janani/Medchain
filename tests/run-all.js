// Runs the offline unit tests (no database needed):  npm test
const { execFileSync } = require("child_process");
const path = require("path");
for (const file of ["safety.test.js", "ledger-fraud-schedule.test.js"]) {
  execFileSync(process.execPath, [path.join(__dirname, file)], { stdio: "inherit" });
}
