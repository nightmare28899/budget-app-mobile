import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAppAccess } from './useAppAccess';
import { RootStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useI18n } from './useI18n';
import { PremiumFeature } from '../types/premium';

export function usePremiumAccess() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t } = useI18n();
    const access = useAppAccess();

    const featureLabelMap = useMemo(
        () => ({
            credit_cards: t('premium.featureCreditCards'),
            installments: t('premium.featureInstallments'),
        }),
        [t],
    );

    const openPremiumPaywall = (feature: PremiumFeature) => {
        navigation.navigate('PremiumPaywall', { feature });
    };

    const requirePremiumAccess = (feature: PremiumFeature) => {
        if (access.hasPremium) {
            return true;
        }

        openPremiumPaywall(feature);
        return false;
    };

    return {
        ...access,
        featureLabelMap,
        openPremiumPaywall,
        requirePremiumAccess,
    };
}
