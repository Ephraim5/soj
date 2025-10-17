import React, { useEffect } from 'react';
import WelcomeScreen from '../Home/WelcomeScreen';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

// Define the type for your navigation stack
type RootStackParamList = {
  Login: undefined;
  Registration: undefined;
};

// Define the navigation prop type
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RegistrationScreen() {
  const navigation = useNavigation<NavigationProp>();

  async function apiText() {
    try {
        Toast.show({
          type: 'info',
          text1: 'Internet Connection Slow',
        });
      //  navigation.navigate('Login'); // Now TypeScript recognizes 'Login' as a valid route
   
    } catch (err) {
      console.error('API Error:', err);
    }
  }

  useEffect(() => {
    apiText();
  }, []);

  return <WelcomeScreen />;
}