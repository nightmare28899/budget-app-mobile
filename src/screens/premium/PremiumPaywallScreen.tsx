import React from 'react';
import { RootScreenProps } from '../../navigation/types';
import { PremiumFeatureGate } from '../../components/premium/PremiumFeatureGate';

export function PremiumPaywallScreen({
    route,
    navigation,
}: RootScreenProps<'PremiumPaywall'>) {
    return (
        <PremiumFeatureGate
            feature={route.params.feature}
            onClose={() => navigation.goBack()}
            onContinueToAuth={() =>
                navigation.navigate('Auth', { screen: 'Login' })
            }
            onOpenFeature={
                route.params.feature === 'credit_cards'
                    ? () => navigation.navigate('Main', { screen: 'CreditCards' })
                    : undefined
            }
        />
    );
}
