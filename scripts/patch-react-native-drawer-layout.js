#!/usr/bin/env node

const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const targetFile = join(
    __dirname,
    '..',
    'node_modules',
    'react-native-drawer-layout',
    'lib',
    'module',
    'views',
    'Drawer.native.js',
);

function patchDrawerLayout() {
    if (!existsSync(targetFile)) {
        console.log('[postinstall] Skipped drawer patch (file not found).');
        return;
    }

    const source = readFileSync(targetFile, 'utf8');

    if (!source.includes('InteractionManager')) {
        console.log('[postinstall] Drawer patch already applied.');
        return;
    }

    let next = source;

    next = next.replace(
        "{ I18nManager, InteractionManager, Keyboard, Platform, StatusBar, StyleSheet, useWindowDimensions, View }",
        "{ I18nManager, Keyboard, Platform, StatusBar, StyleSheet, useWindowDimensions, View }",
    );

    next = next.replace(
        `  const interactionHandleRef = React.useRef(null);
  const startInteraction = useLatestCallback(() => {
    interactionHandleRef.current = InteractionManager.createInteractionHandle();
  });
  const endInteraction = useLatestCallback(() => {
    if (interactionHandleRef.current != null) {
      InteractionManager.clearInteractionHandle(interactionHandleRef.current);
      interactionHandleRef.current = null;
    }
  });`,
        `  const startInteraction = useLatestCallback(() => {});
  const endInteraction = useLatestCallback(() => {});`,
    );

    if (next === source) {
        console.warn('[postinstall] Drawer patch not applied (unexpected source format).');
        return;
    }

    writeFileSync(targetFile, next, 'utf8');
    console.log('[postinstall] Patched react-native-drawer-layout to avoid InteractionManager deprecation warning.');
}

patchDrawerLayout();
