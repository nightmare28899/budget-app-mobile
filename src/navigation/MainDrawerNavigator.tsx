import React from 'react';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  createDrawerNavigator,
} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Ionicons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainDrawerParamList } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import { ExpensesScreen } from '../screens/expenses/ExpensesScreen';
import { IncomesScreen } from '../screens/incomes/IncomesScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { PlannerScreen } from '../screens/planner/PlannerScreen';
import { CategoryBudgetsScreen } from '../screens/categoryBudgets/CategoryBudgetsScreen';
import { SubscriptionsScreen } from '../screens/subscriptions/SubscriptionsScreen';
import { SavingsScreen } from '../screens/savings/SavingsScreen';
import { CreditCardsScreen } from '../screens/creditCards/CreditCardsScreen';
import { spacing, typography, useTheme } from '../theme/index';
import { useI18n } from '../hooks/useI18n';
import { useAuthStore } from '../store/authStore';
import { withAlpha } from '../utils/domain/subscriptions';

const Drawer = createDrawerNavigator<MainDrawerParamList>();
const DRAWER_ICONS: Record<keyof MainDrawerParamList, string> = {
  Tabs: 'home-outline',
  Notifications: 'notifications-outline',
  Reports: 'document-text-outline',
  Planner: 'calendar-outline',
  CategoryBudgets: 'pie-chart-outline',
  Expenses: 'wallet-outline',
  Incomes: 'trending-up-outline',
  Subscriptions: 'albums-outline',
  CreditCards: 'card-outline',
  Savings: 'cash-outline',
  UpcomingSubscriptions: 'albums-outline',
};

type AppDrawerContentProps = DrawerContentComponentProps & {
  versionLabel: string;
  reportsLabel: string;
  plannerLabel: string;
  categoryBudgetsLabel: string;
  creditCardsLabel: string;
  savingsLabel: string;
  homeLabel: string;
  planLabel: string;
  premiumActiveLabel: string;
  premiumInactiveLabel: string;
  accountLabel: string;
  guestLabel: string;
  colors: Record<string, string>;
};

function AppDrawerContent({
  versionLabel,
  reportsLabel,
  plannerLabel,
  categoryBudgetsLabel,
  creditCardsLabel,
  savingsLabel,
  homeLabel,
  planLabel,
  premiumActiveLabel,
  premiumInactiveLabel,
  accountLabel,
  guestLabel,
  colors,
  state,
  navigation,
}: AppDrawerContentProps) {
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const user = useAuthStore(s => s.user);
  const isGuest = useAuthStore(s => s.isGuest);

  const drawerItems: Array<{
    route: keyof MainDrawerParamList;
    label: string;
    icon: string;
  }> = [
    { route: 'Tabs', label: homeLabel, icon: 'home-outline' },
    { route: 'Reports', label: reportsLabel, icon: 'document-text-outline' },
    { route: 'Planner', label: plannerLabel, icon: 'calendar-outline' },
    { route: 'CategoryBudgets', label: categoryBudgetsLabel, icon: 'pie-chart-outline' },
    { route: 'CreditCards', label: creditCardsLabel, icon: 'card-outline' },
    { route: 'Savings', label: savingsLabel, icon: 'cash-outline' },
  ];

  const activeRouteName = state.routeNames[state.index] as keyof MainDrawerParamList;
  const displayName = user?.name?.trim() || guestLabel;
  const displayEmail = user?.email?.trim() || 'guest@local';
  const avatarUri = user?.avatarUri ?? user?.avatarUrl ?? null;
  const initial = (displayName.charAt(0) || 'G').toUpperCase();
  const hasPremium = user?.isPremium === true;
  const planStatusLabel = hasPremium ? premiumActiveLabel : premiumInactiveLabel;

  return (
    <View style={styles.drawerRoot}>
      <DrawerContentScrollView
        contentContainerStyle={[
          styles.drawerScrollContent,
          { paddingTop: insets.top + spacing.sm },
        ]}
      >
        <View style={styles.brandCard}>
          <View style={styles.brandTopRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={styles.brandMeta}>
              <Text numberOfLines={1} style={styles.userName}>{displayName}</Text>
              <Text numberOfLines={1} style={styles.userEmail}>{displayEmail}</Text>
            </View>
          </View>
          <View style={styles.metaPillsRow}>
            <View style={styles.accountPill}>
              <View style={styles.accountDot} />
              <Text style={styles.accountPillText}>
                {isGuest ? guestLabel : accountLabel}
              </Text>
            </View>
            <View style={styles.planPill}>
              <Text style={styles.planPillText}>
                {planLabel}: {planStatusLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.menuGroup}>
          {drawerItems.map(item => {
            const isFocused = item.route === activeRouteName;
            return (
              <TouchableOpacity
                key={item.route}
                activeOpacity={0.85}
                style={[styles.menuItem, isFocused ? styles.menuItemActive : null]}
                onPress={() => {
                  navigation.navigate(item.route);
                  navigation.closeDrawer();
                }}
              >
                <View style={[styles.menuIconWrap, isFocused ? styles.menuIconWrapActive : null]}>
                  <Icon
                    name={item.icon}
                    size={18}
                    color={isFocused ? colors.primaryAction : colors.textSecondary}
                  />
                </View>
                <Text style={[styles.menuLabel, isFocused ? styles.menuLabelActive : null]}>
                  {item.label}
                </Text>
                {isFocused ? (
                  <View style={styles.focusBadge}>
                    <Icon name="chevron-forward" size={14} color={colors.primaryAction} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>
      <View
        style={[
          styles.drawerFooter,
          { paddingBottom: Math.max(insets.bottom, spacing.base) },
        ]}
      >
        <Text style={styles.drawerFooterText}>{versionLabel}</Text>
      </View>
    </View>
  );
}

export function MainDrawerNavigator() {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="Tabs"
      drawerContent={props => (
        <AppDrawerContent
          {...props}
          versionLabel={t('settings.version')}
          reportsLabel={t('reports.title')}
          plannerLabel={t('planner.title')}
          categoryBudgetsLabel={t('categoryBudgets.title')}
          creditCardsLabel={t('creditCards.title')}
          savingsLabel={t('savings.title')}
          homeLabel={t('tab.home')}
          planLabel={t('settings.planLabel')}
          premiumActiveLabel={t('premium.activeStatus')}
          premiumInactiveLabel={t('premium.inactiveStatus')}
          accountLabel={t('guest.statusAccount')}
          guestLabel={t('guest.statusGuest')}
          colors={colors as Record<string, string>}
        />
      )}
      screenOptions={({ route }) => ({
        headerShown: false,
        drawerType: 'front',
        swipeEnabled: true,
        swipeEdgeWidth: 64,
        drawerStyle: {
          backgroundColor: colors.surface,
          width: 286,
          borderRightWidth: 1,
          borderRightColor: colors.border,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerActiveBackgroundColor: colors.surfaceCard,
        drawerItemStyle: {
          borderRadius: 12,
          marginHorizontal: spacing.base,
          marginVertical: 2,
        },
        drawerLabelStyle: {
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
        },
        drawerIcon: ({ color, size }) => {
          return <Icon name={DRAWER_ICONS[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Drawer.Screen
        name="Tabs"
        component={MainTabNavigator}
        options={{
          drawerLabel: t('tab.home'),
          drawerItemStyle: { display: 'none' },
        }}
        listeners={({ navigation }) => ({
          drawerItemPress: event => {
            event.preventDefault();
            navigation.navigate('Tabs', { screen: 'Dashboard' });
            navigation.closeDrawer();
          },
        })}
      />
      <Drawer.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          drawerLabel: t('notifications.title'),
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ drawerLabel: t('reports.title') }}
      />
      <Drawer.Screen
        name="Planner"
        component={PlannerScreen}
        options={{ drawerLabel: t('planner.title') }}
      />
      <Drawer.Screen
        name="CategoryBudgets"
        component={CategoryBudgetsScreen}
        options={{ drawerLabel: t('categoryBudgets.title') }}
      />
      <Drawer.Screen
        name="CreditCards"
        component={CreditCardsScreen}
        options={{ drawerLabel: t('creditCards.title') }}
      />
      <Drawer.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          drawerLabel: t('expenses.title'),
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="Incomes"
        component={IncomesScreen}
        options={{
          drawerLabel: t('income.title'),
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{
          drawerLabel: t('subscriptions.title'),
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="Savings"
        component={SavingsScreen}
        options={{ drawerLabel: t('savings.title') }}
      />
      <Drawer.Screen
        name="UpcomingSubscriptions"
        component={SubscriptionsScreen}
        options={{
          drawerLabel: t('dashboard.upcomingTitle'),
          drawerItemStyle: { display: 'none' },
          swipeEnabled: false,
        }}
      />
    </Drawer.Navigator>
  );
}

const createStyles = (colors: Record<string, string>) =>
  StyleSheet.create({
    drawerRoot: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    drawerScrollContent: {
      paddingHorizontal: spacing.base,
      paddingTop: spacing.sm,
    },
    brandCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: withAlpha(colors.primaryAction, 0.22),
      backgroundColor: withAlpha(colors.surfaceCard, 0.84),
      padding: spacing.base,
      marginBottom: spacing.base,
    },
    brandTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatarImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: withAlpha(colors.primaryAction, 0.35),
    },
    avatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.primaryAction, 0.18),
      borderWidth: 1,
      borderColor: withAlpha(colors.primaryAction, 0.35),
    },
    avatarInitial: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
    },
    brandMeta: {
      flex: 1,
    },
    userName: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
    },
    userEmail: {
      marginTop: 2,
      color: colors.textMuted,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
    },
    accountPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      backgroundColor: withAlpha(colors.primaryAction, 0.14),
      borderWidth: 1,
      borderColor: withAlpha(colors.primaryAction, 0.26),
    },
    metaPillsRow: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    accountDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primaryAction,
    },
    accountPillText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
    },
    planPill: {
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      backgroundColor: withAlpha(colors.surface, 0.9),
      borderWidth: 1,
      borderColor: withAlpha(colors.border, 0.9),
    },
    planPillText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
    },
    menuGroup: {
      gap: spacing.xs,
    },
    menuItem: {
      minHeight: 54,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    },
    menuItemActive: {
      backgroundColor: withAlpha(colors.primaryAction, 0.16),
      borderColor: withAlpha(colors.primaryAction, 0.34),
    },
    menuIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.surfaceCard, 0.72),
      borderWidth: 1,
      borderColor: withAlpha(colors.border, 0.85),
    },
    menuIconWrapActive: {
      backgroundColor: withAlpha(colors.primaryAction, 0.14),
      borderColor: withAlpha(colors.primaryAction, 0.3),
    },
    menuLabel: {
      flex: 1,
      marginLeft: spacing.sm,
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
    },
    menuLabelActive: {
      color: colors.textPrimary,
    },
    focusBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.primaryAction, 0.18),
    },
    drawerFooter: {
      borderTopWidth: 1,
      borderTopColor: withAlpha(colors.border, 0.9),
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.base,
    },
    drawerFooterText: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
    },
  });
