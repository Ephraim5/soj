import { useState, useEffect } from 'react';
import {
  SafeAreaView, Text, TextInput, TouchableOpacity, Image, Alert, Keyboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { phoneStyle as styles } from '../styles/styles';
import { RootStackParamList } from '../../../navigation/Navigation';
import { AntDesign } from '@expo/vector-icons';
import { heightPercentageToDP as responsiveHeight } from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OtpScreen'>;

const PhonenumberScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const continueButtonPress = async () => {
    if (!phone.trim()) {
      Toast.show({
        type:"info",
        text1:'Validation',
        text2:'Please enter a valid phone number.',
      })
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem("phone", phone.toString().trim())
      navigation.navigate("OtpScreen")
    } catch {
      Alert.alert('Error', 'Something went wrong while sending OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <AntDesign name="left" size={24} color="#9c9c9c" />
      </TouchableOpacity>
      <Image
        source={require('../../../assets/images-removebg-preview.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Complete Your Registration</Text>
      <Text style={styles.subtitle}>
        Please enter your phone number below{'\n'}to receive a verification code.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Enter phone number"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
        onChangeText={setPhone}
        value={phone}
      />
      <TouchableOpacity
        style={[
          styles.button,
          {
            marginTop: keyboardVisible ? responsiveHeight(20) : responsiveHeight(12),
            opacity: loading ? 0.6 : 1,
          },
        ]}
        onPress={continueButtonPress}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default PhonenumberScreen;
