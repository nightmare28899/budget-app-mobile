#!/usr/bin/env node

const { execFileSync, spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const API_PORT = 3001;

function resolveAdbBinary() {
    const sdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
    const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb';

    if (sdkRoot) {
        const sdkAdb = join(sdkRoot, 'platform-tools', adbName);
        if (existsSync(sdkAdb)) {
            return sdkAdb;
        }
    }

    return adbName;
}

function listOnlineDevices(adbPath) {
    try {
        const raw = execFileSync(adbPath, ['devices'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        return raw
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('List of devices'))
            .map((line) => line.split(/\s+/))
            .filter((parts) => parts[1] === 'device')
            .map((parts) => parts[0]);
    } catch (error) {
        console.warn('[android] Could not list adb devices:', error.message);
        return [];
    }
}

function reverseApiPort(adbPath, serial) {
    try {
        execFileSync(
            adbPath,
            ['-s', serial, 'reverse', `tcp:${API_PORT}`, `tcp:${API_PORT}`],
            { stdio: ['ignore', 'pipe', 'pipe'] },
        );
        console.log(`[android] ${serial}: reversed tcp:${API_PORT} -> tcp:${API_PORT}`);
    } catch (error) {
        console.warn(`[android] ${serial}: failed to reverse tcp:${API_PORT}:`, error.message);
    }
}

function runAndroid() {
    const args = process.argv.slice(2);
    const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const result = spawnSync(npxBin, ['react-native', 'run-android', ...args], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });

    if (typeof result.status === 'number') {
        return result.status;
    }

    return 1;
}

const adbPath = resolveAdbBinary();
const devices = listOnlineDevices(adbPath);

if (devices.length === 0) {
    console.log('[android] No online devices found for adb reverse.');
} else {
    devices.forEach((serial) => reverseApiPort(adbPath, serial));
}

const exitCode = runAndroid();

if (exitCode === 0) {
    const postRunDevices = listOnlineDevices(adbPath);
    if (postRunDevices.length === 0) {
        console.log('[android] No online devices found after run-android.');
    } else {
        postRunDevices.forEach((serial) => reverseApiPort(adbPath, serial));
    }
}

process.exit(exitCode);
