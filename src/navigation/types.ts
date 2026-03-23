import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { Subscription } from '../types';

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

export type ActivityStackParamList = {
    Expenses: { successMessage?: string } | undefined;
    HistoryHome: { successMessage?: string } | undefined;
};

export type MainTabParamList = {
    Dashboard: { successMessage?: string } | undefined;
    History: NavigatorScreenParams<ActivityStackParamList> | undefined;
    Analytics: undefined;
    SubscriptionsTab:
    | {
        successMessage?: string;
        initialTab?: 'expenses' | 'subscriptions';
    }
    | undefined;
};

export type MainDrawerParamList = {
    Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
    Expenses: { successMessage?: string } | undefined;
    Subscriptions: { successMessage?: string } | undefined;
    Savings: undefined;
    UpcomingSubscriptions: { upcomingDays?: number } | undefined;
};

export type RootStackParamList = {
    Auth: NavigatorScreenParams<AuthStackParamList>;
    Main: NavigatorScreenParams<MainDrawerParamList>;
    Profile: undefined;
    AddEntry:
    | {
        initialTab?: 'expense' | 'subscription';
    }
    | undefined;
    AddExpense: { embedded?: boolean } | undefined;
    AddSubscription: { subscription?: Subscription; embedded?: boolean } | undefined;
    SavingsGoalDetail: { goalId: string; title?: string };
    ExpenseDetail: { id: string };
    EditExpense: { id: string };
    Camera: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> =
    NativeStackScreenProps<AuthStackParamList, T>;

export type MainDrawerScreenProps<T extends keyof MainDrawerParamList> =
    CompositeScreenProps<
        DrawerScreenProps<MainDrawerParamList, T>,
        NativeStackScreenProps<RootStackParamList>
    >;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
    CompositeScreenProps<
        BottomTabScreenProps<MainTabParamList, T>,
        MainDrawerScreenProps<'Tabs'>
    >;

export type ActivityScreenProps<T extends keyof ActivityStackParamList> =
    CompositeScreenProps<
        NativeStackScreenProps<ActivityStackParamList, T>,
        MainTabScreenProps<'History'>
    >;

export type RootScreenProps<T extends keyof RootStackParamList> =
    NativeStackScreenProps<RootStackParamList, T>;
