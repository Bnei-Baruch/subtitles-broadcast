const fs = require("fs");
const path = require("path");

// Print the current directory
console.log("Current directory:", process.cwd());

// New variable names
const gitHooksDirectory = path.join(process.cwd(), ".git", "hooks"); // Directory for Git hooks
const appHooksDir = path.join(process.cwd(), ".hooks"); // Directory for app-defined hooks

console.log("Git hooks directory:", gitHooksDirectory);
console.log("App hooks directory:", appHooksDir);

if (fs.existsSync(gitHooksDirectory) && fs.existsSync(appHooksDir)) {
  const prePushHook = path.join(appHooksDir, "pre-push");
  const destPrePushHook = path.join(gitHooksDirectory, "pre-push");

  fs.copyFileSync(prePushHook, destPrePushHook);
  fs.chmodSync(destPrePushHook, "755");
  console.log("Pre-push hook installed successfully.");
} else {
  console.error("Error: Hooks directory not found!");
  process.exit(1);
}
