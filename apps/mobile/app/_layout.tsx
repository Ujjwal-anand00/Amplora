import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';
import { AuthProvider } from '../services/authContext';

LogBox.ignoreLogs([
  'Cannot connect to Expo CLI',
  'Disconnected from Metro',
  'Unable to symbolicate stack trace',
]);

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

import { queryClient } from '../services/queryClient';


export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <Stack
          screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            ...typography.headingSmall,
            color: colors.textPrimary,
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="campaign/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Amplora',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="campaign/contribute"
          options={{
            headerShown: true,
            headerTitle: 'Back Campaign',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="create/manual"
          options={{
            headerShown: true,
            headerTitle: 'New Campaign',
            headerBackTitle: 'Cancel',
          }}
        />
        <Stack.Screen
          name="creator/dashboard"
          options={{
            headerShown: true,
            headerTitle: 'Creator Hub',
            headerBackTitle: 'Profile',
          }}
        />
        <Stack.Screen
          name="campaign/[id]/analytics"
          options={{
            headerShown: true,
            headerTitle: 'Campaign Telemetry & Analytics',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="campaign/[id]/report"
          options={{
            headerShown: true,
            headerTitle: 'Distribution Report',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="review/queue"
          options={{
            headerShown: true,
            headerTitle: 'Review Pipeline',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="review/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Review Dossier',
            headerBackTitle: 'Queue',
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      </AuthProvider>
    </QueryClientProvider>
    </SafeAreaProvider>
  );
}
