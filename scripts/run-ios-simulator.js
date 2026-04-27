#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');

// Fixed simulator to avoid random device selection or multiple booted simulators.
const DEFAULT_UDID = process.env.IOS_SIM_UDID || '43B9FA92-9074-4D46-A1FF-D982A5B4DC49';
const isRelease = process.argv.includes('--release');

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

function main() {
  run('xcrun simctl shutdown all');
  run(`xcrun simctl boot ${DEFAULT_UDID}`);
  run(`xcrun simctl bootstatus ${DEFAULT_UDID} -b`);
  run('open -a Simulator');

  const args = ['react-native', 'run-ios', '--udid', DEFAULT_UDID];
  if (isRelease) {
    args.push('--mode', 'Release');
  }

  const result = spawnSync('npx', args, { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

main();
