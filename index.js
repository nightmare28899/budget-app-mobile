/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { openNotificationDestination } from './src/navigation/navigationBridge';
import { registerBackgroundReminderHandler } from './src/modules/reminders/notifyKitAdapter';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async () => {});

registerBackgroundReminderHandler(openNotificationDestination);

AppRegistry.registerComponent(appName, () => App);
