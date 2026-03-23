import React from 'react';
import { RootScreenProps } from '../../navigation/types';
import { SettingsScreen } from '../settings/SettingsScreen';

export function ProfileScreen(props: RootScreenProps<'Profile'>) {
    return <SettingsScreen {...props} />;
}
