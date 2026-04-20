import { Prompt_400Regular, Prompt_500Medium, Prompt_600SemiBold, Prompt_700Bold, useFonts } from '@expo-google-fonts/prompt';
import { NavigationContainer } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, UIManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { auth } from './src/firebase';
import AppNavigator from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync();

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_600SemiBold,
    Prompt_700Bold,
  });

  const [initialRoute, setInitialRoute] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      const rememberMe = await SecureStore.getItemAsync('rememberMe');
      if (user && rememberMe === 'true') {
        setInitialRoute('SignUpPin');
      } else {
        setInitialRoute('Welcome');
      }
    });
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || initialRoute === null) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <AppNavigator initialRoute={initialRoute} />
        <Toast />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
