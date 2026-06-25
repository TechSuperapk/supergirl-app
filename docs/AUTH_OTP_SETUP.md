# Enabling Real Mobile OTP (Firebase Phone Auth)

The app currently uses a **test OTP** (any 4-digit code verifies) so the flow is
usable in Expo Go. The real Firebase Phone Auth code path already exists in
`src/modules/auth/services/authService.ts` (`sendOtp`, `verifyOtp`). Real SMS
needs native capabilities that cannot be configured from this environment.

## What's already in code
- `authService.sendOtp(phone, recaptchaVerifier)` → `signInWithPhoneNumber`.
- `authService.verifyOtp(code)` → confirms and returns the Firebase user.
- `RootNavigator` already listens to `onAuthStateChanged` and loads the profile.

## Steps to turn on real SMS
1. **Add the verifier dependency** (managed Expo):
   `npx expo install expo-firebase-recaptcha firebase`
2. **Firebase console:**
   - Authentication → Sign-in method → enable **Phone**.
   - Add a test number (optional) for review.
   - Android: add your app's **SHA-1 / SHA-256** keys (Project settings → Your apps).
   - iOS: upload an **APNs key** and enable Push for silent verification.
3. **Build a dev client** (Phone Auth does NOT work in Expo Go):
   `npx expo run:android` / `npx expo run:ios` (or EAS build).
4. **Wire the verifier in `OnboardingScreen`:**
   ```tsx
   import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
   import { app } from '../../../lib/firebase';
   const recaptchaRef = useRef(null);
   // in render:
   <FirebaseRecaptchaVerifierModal ref={recaptchaRef} firebaseConfig={app.options} attemptInvisibleVerification />
   // in sendOtp(): await fbSendOtp(`${cc}${phone}`, recaptchaRef.current!);
   // in verifyOtp(): const user = await fbVerifyOtp(otp);  // then loginSuccess(user)
   ```
5. **Flip the flag:** set `USE_REAL_OTP = true` in `OnboardingScreen` (keep test
   mode for local development).
6. **Auto OTP read (Android):** add `react-native-otp-verify` (SMS Retriever) and
   listen for the code to auto-fill the boxes. iOS auto-fills natively from the
   keyboard quickbar when the SMS format includes the code.

## Notes
- Changing the mobile number in Profile updates the stored profile immediately;
  with real auth on, a number change should trigger OTP re-verification before
  it becomes the login identity.
- Deploy security rules & indexes after any change:
  `firebase deploy --only firestore:rules,firestore:indexes`
