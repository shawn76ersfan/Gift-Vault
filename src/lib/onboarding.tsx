import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

const KEY = 'giftvault.onboarded';

type OnboardingState = {
  loaded: boolean;
  onboarded: boolean;
  complete: () => void;
};

const OnboardingContext = createContext<OnboardingState | null>(null);

async function readFlag(): Promise<boolean> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) === '1';
  return (await SecureStore.getItemAsync(KEY)) === '1';
}

async function writeFlag(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(KEY, '1');
    return;
  }
  await SecureStore.setItemAsync(KEY, '1');
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    readFlag()
      .then(setOnboarded)
      .catch(() => setOnboarded(false))
      .finally(() => setLoaded(true));
  }, []);

  const complete = () => {
    setOnboarded(true);
    void writeFlag();
  };

  return <OnboardingContext.Provider value={{ loaded, onboarded, complete }}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingState {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return value;
}
