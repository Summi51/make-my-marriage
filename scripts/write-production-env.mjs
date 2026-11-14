import { writeFileSync } from "node:fs";

// Names only. Amplify supplies the values at build time. This script never
// prints a value, and the repo must never contain one.
//
// Values are written exactly as Amplify provides them. Quoting or escaping
// them here can change a secret that the running app already accepts.
const REQUIRED = [
  "APP_ORIGIN",
  "MONGODB_URI",
  "MEMBER_INVITATION_SECRET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

const OPTIONAL = ["CRON_SECRET", "VOLANEA_API_KEY", "VOLANEA_FROM"];

function line(name, value) {
  if (/[\r\n]/.test(value)) {
    throw new Error(`${name} contains a line break. Set it as one line.`);
  }
  return `${name}=${value}`;
}

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `Amplify did not provide: ${missing.join(", ")}. Add each name under Hosting, Environment variables for this branch, then start a new build. Redeploying an old version does not pick them up.`,
  );
  process.exit(1);
}

const lines = [...REQUIRED, ...OPTIONAL]
  .filter((name) => process.env[name])
  .map((name) => line(name, process.env[name]));

writeFileSync(".env.production", `${lines.join("\n")}\n`);
const found = lines.map((entry) => entry.slice(0, entry.indexOf("=")));
console.log(`Wrote .env.production names: ${found.join(", ")}`);
