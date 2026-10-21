import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import type { Subscription, UpcomingSubscriptionCharge } from '../../src/types/index';

let mockUpcoming: UpcomingSubscriptionCharge[] = [];
const mockStored: Subscription[] = [{ id: 'stored', name: 'Cloud', cost: 10, currency: 'MXN', billingCycle: 'MONTHLY', isActive: true } as Subscription];
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: mockUpcoming, refetch: jest.fn(), isLoading: false }) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../../src/modules/subscriptions/useSubscriptionManager', () => ({ useSubscriptionManager: () => ({ subscriptions: mockStored, monthlyCurrencyBreakdown: [], activeCount: 1, refetch: jest.fn() }) }));
jest.mock('../../src/store/authStore', () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: { id: 'a', currency: 'MXN' } }) }));
jest.mock('../../src/components/alerts/AlertProvider', () => ({ useAppAlert: () => ({ alert: jest.fn() }) }));
jest.mock('../../src/hooks/shared/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key, tPlural: (key: string) => key, language: 'en' }) }));
jest.mock('../../src/utils/platform/haptics', () => ({ softHaptic: jest.fn() }));
jest.mock('../../src/api/resources/subscriptions', () => ({ subscriptionsApi: { getUpcoming: jest.fn() } }));
import { useSubscriptionsScreen } from '../../src/hooks/subscriptions/useSubscriptionsScreen';

let view: ReturnType<typeof useSubscriptionsScreen>;
const navigation = { navigate: jest.fn(), addListener: jest.fn(() => () => {}), setParams: jest.fn() };
function Harness() { view = useSubscriptionsScreen({ navigation, upcomingOnly: true }); return null; }

describe('upcoming read-only identity and payment metadata', () => {
    let renderer: Renderer.ReactTestRenderer;
    afterEach(async () => { await act(async () => renderer.unmount()); });
    it('never aliases an explicit unknown server ID to a similarly named stored item', async () => {
        mockUpcoming = [{ id: 'unknown-real-id', name: 'Cloud', amount: 10, daysRemaining: 1, currency: 'USD', paymentMethod: 'CREDIT_CARD', creditCardId: 'card' }];
        await act(async () => { renderer = Renderer.create(<Harness />); });
        expect(view.subscriptions[0]).toMatchObject({ id: 'unknown-real-id', cost: 10, currency: 'USD', creditCardId: 'card' });
        expect(view.canEditSubscription('unknown-real-id')).toBe(false);
        view.onEditSubscription('unknown-real-id');
        expect(navigation.navigate).not.toHaveBeenCalled();
    });
    it('keeps matched rows editable with authoritative upcoming payment values', async () => {
        mockUpcoming = [{ subscriptionId: 'stored', name: 'Cloud', amount: 12, daysRemaining: 1, currency: 'USD', creditCardId: 'new-card' }];
        await act(async () => { renderer = Renderer.create(<Harness />); });
        expect(view.subscriptions[0]).toMatchObject({ id: 'stored', cost: 12, currency: 'USD', creditCardId: 'new-card' });
        expect(view.canEditSubscription('stored')).toBe(true);
    });
});
