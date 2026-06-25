import { useAppSelector } from './useAppDispatch';

export function useSubscription() {
  const tier    = useAppSelector(s => s.auth.subscriptionTier);
  const expiry  = useAppSelector(s => s.auth.subscriptionExpiry);
  const status  = useAppSelector(s => s.subscription.status);

  return {
    isPremium:  tier === 'premium',
    isFree:     tier === 'free',
    tier,
    expiry,
    status,
  };
}
