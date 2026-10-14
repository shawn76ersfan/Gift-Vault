import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { StripeProvider } from '@stripe/stripe-react-native';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SetupNeeded } from '@/components/SetupNeeded';
import { OnboardingProvider, useOnboarding } from '@/lib/onboarding';
import { useStoreUser } from '@/lib/useStoreUser';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;
const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL, { unsavedChangesWarning: false }) : null;

function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const onboarding = useOnboarding();
  const { ready: userReady } = useStoreUser();
  const { colors } = useTheme();

  useEffect(() => {
    if (isLoaded && onboarding.loaded) void SplashScreen.hideAsync();
  }, [isLoaded, onboarding.loaded]);

  if (!isLoaded || !onboarding.loaded) return null;

  const signedIn = !!isSignedIn;
  const onboarded = onboarding.onboarded;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!onboarded && !signedIn}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded && !signedIn}>
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !userReady}>
        <Stack.Screen name="preparing" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && userReady}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="person/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="person-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="occasion-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="send-gift" options={{ presentation: 'modal' }} />
        <Stack.Screen name="gifts" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { dark } = useTheme();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;

  const missing = [
    !CONVEX_URL && 'EXPO_PUBLIC_CONVEX_URL',
    !CLERK_KEY && 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  ].filter((name): name is string => !!name);

  if (!convex || !CLERK_KEY || missing.length > 0) {
    void SplashScreen.hideAsync();
    return <SetupNeeded missing={missing} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <StripeProvider publishableKey={STRIPE_KEY} merchantIdentifier="merchant.com.giftvault.app" urlScheme="giftvault">
            <OnboardingProvider>
              <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
                <StatusBar style={dark ? 'light' : 'dark'} />
                <RootNavigator />
              </ThemeProvider>
            </OnboardingProvider>
          </StripeProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
