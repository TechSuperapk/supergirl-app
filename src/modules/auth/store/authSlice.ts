import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string; name: string; phone: string; countryCode: string;
  avatarUrl?: string; bio?: string; createdAt: string; isVerified: boolean;
}

interface AuthState {
  isLoggedIn: boolean; hasSeenOnboarding: boolean; user: User | null;
  phoneNumber: string; countryCode: string; error: string | null;
  subscriptionTier: 'free' | 'premium'; subscriptionExpiry: string | null;
}

const initialState: AuthState = {
  isLoggedIn: false, hasSeenOnboarding: false, user: null,
  phoneNumber: '', countryCode: '+91', error: null,
  subscriptionTier: 'free', subscriptionExpiry: null,
};

const authSlice = createSlice({
  name: 'auth', initialState,
  reducers: {
    setPhoneNumber(s, a: PayloadAction<string>)  { s.phoneNumber = a.payload; },
    setCountryCode(s, a: PayloadAction<string>)  { s.countryCode = a.payload; },
    loginSuccess(s, a: PayloadAction<User>)      { s.isLoggedIn = true; s.user = a.payload; },
    updateProfile(s, a: PayloadAction<Partial<User>>) { if (s.user) s.user = { ...s.user, ...a.payload }; },
    setOnboardingSeen(s)                         { s.hasSeenOnboarding = true; },
    logout(s)                                    { s.isLoggedIn = false; s.user = null; s.phoneNumber = ''; s.subscriptionTier = 'free'; s.subscriptionExpiry = null; },
    setSubscriptionPremium(s, a: PayloadAction<{ expiresAt: string }>) { s.subscriptionTier = 'premium'; s.subscriptionExpiry = a.payload.expiresAt; },
    setSubscriptionFree(s)                       { s.subscriptionTier = 'free'; s.subscriptionExpiry = null; },
  },
});

export const { setPhoneNumber, setCountryCode, loginSuccess, updateProfile, setOnboardingSeen, logout, setSubscriptionPremium, setSubscriptionFree } = authSlice.actions;
export default authSlice.reducer;
