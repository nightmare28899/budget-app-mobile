import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityStackParamList } from './types';
import { HistoryScreen } from '../screens/history/HistoryScreen';

const Stack = createNativeStackNavigator<ActivityStackParamList>();

export function ActivityNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="HistoryHome"
            screenOptions={{
                headerShown: false,
                animation: 'none',
            }}
        >
            <Stack.Screen name="HistoryHome" component={HistoryScreen} />
        </Stack.Navigator>
    );
}
