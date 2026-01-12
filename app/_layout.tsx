import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AlertProvider } from '@/context/AlertContext';
import { AppSettingsProvider } from '@/context/AppSettingsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as NavigationBar from 'expo-navigation-bar';
import { useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppSettingsProvider>
        <AlertProvider>
          <AuthProvider>
            <RootLayoutNav fontsLoaded={loaded} />
          </AuthProvider>
        </AlertProvider>
      </AppSettingsProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (fontsLoaded && !loading) {
      // Small delay to ensure the UI has actually rendered
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, loading]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      // Make the navigation bar transparent and immersive
      NavigationBar.setPositionAsync('absolute');
      NavigationBar.setBackgroundColorAsync('#00000000'); // Transparent
      NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark');
    }
  }, [colorScheme]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="event/success/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="join/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/personal-info" options={{ headerShown: false }} />
        <Stack.Screen name="profile/security" options={{ headerShown: false }} />
        <Stack.Screen name="profile/event-calendar" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
