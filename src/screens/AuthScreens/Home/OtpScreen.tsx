import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { widthPercentageToDP } from 'react-native-responsive-screen';
import Toast from 'react-native-toast-message';
import { sendOtp, verifyOtp } from '../../../api/users';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OtpScreen = () => {
  const navigation = useNavigation<any>();
  const [phone, setPhone] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '']);

  async function init() {
    try {
      const saved = await AsyncStorage.getItem('phone');
      if (saved) setPhone(saved);
      await sendOtp({ phone: saved || phone });
    } catch (e) {
      // ignore
    }
  }
  useEffect(() => {
    init()
  }, [])
  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 5) {
      Toast.show({
        type: "info",
        text1: "Incomplete OTP",
        text2: "Enter a 5-digit OTP to continue."
      })
      return;
    }

    try {
      const res = await verifyOtp({ phone, otp: code });

      if (res?.data.success) {
        switch (res.data.role) {
          case "SuperAdmin":
            navigation.navigate("SuperAdminForm")
            break;
          case "UnitLeader":
            navigation.navigate("UnitLeaderFormOne");
            break;
          case "Member":
            console.log("member")
            break;

          default:
            break;
        }
        // navigation.navigate('...');
      } else {
        Toast.show({
          type: "error",
          text1: res?.data.message || "Network Issues"
        })
      }
    } catch (error: unknown) {
      console.error('OTP verification error:', error);
      Toast.show({
        type: "error",
        text1: "Something went wrong check your internet connection."
      })
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      const lastFilled = [...otp].reverse().findIndex((v) => v !== '');
      const idx = 4 - lastFilled;
      if (idx >= 0) {
        const newOtp = [...otp];
        newOtp[idx] = '';
        setOtp(newOtp);
      }
    } else if (/^\d$/.test(key)) {
      const nextIndex = otp.findIndex((d) => d === '');
      if (nextIndex !== -1) {
        const newOtp = [...otp];
        newOtp[nextIndex] = key;
        setOtp(newOtp);
      }
    } else if (key === 'submit') {
      handleVerify();
    }
  };

  const keypadLayout: string[][] = [
    ['1', '2', '3', '-'],
    ['4', '5', '6', 'space'],
    ['7', '8', '9', 'backspace'],
    [',', '0', '.', 'submit'],
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
  <StatusBar hidden={false} barStyle={"dark-content"} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <AntDesign name="left" size={20} color="#9c9c9c" />
          </TouchableOpacity>

          <Image
            source={require('../../../assets/Otp_logo.png')}
            style={styles.lockIcon}
          />

          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.subtitle}>Enter the 5-digit OTP sent to your phone</Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, idx) => (
              <TextInput key={idx} style={styles.otpInput} value={digit} editable={false} />
            ))}
          </View>

          <Text style={styles.timerText}>01:20</Text>
          <TouchableOpacity onPress={init}>
          <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
          <Text style={styles.verifyButtonText}>Verify Phone Number</Text>
        </TouchableOpacity>

        <View style={styles.keypadWrapper}>
          {keypadLayout.map((row, rowIndex) => (
            <View style={styles.keypadRow} key={rowIndex}>
              {row.map((key, idx) => {
                const isIcon = ['backspace', 'submit', 'space'].includes(key);
                const isBlue = key === 'submit';
                const isGray = ['backspace', 'space', '-'].includes(key);

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.keypadButton,
                      isGray && styles.grayKey,
                      isBlue && styles.blueKey,
                    ]}
                    onPress={() => (isBlue ? handleVerify() : handleKeyPress(key))}
                  >
                    {isIcon ? (
                      key === 'backspace' ? (
                        <Ionicons name="backspace-outline" size={22} color="#333" />
                      ) : key === 'submit' ? (
                        <Ionicons name="arrow-forward" size={22} color="#fff" />
                      ) : (
                        <Ionicons name="remove-outline" size={22} color="#333" />
                      )
                    ) : (
                      <Text style={styles.keypadText}>{key}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OtpScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: widthPercentageToDP(5.5),
  },
  content: {
    paddingTop: '15%',
    backgroundColor: "#fff"
  },
  backButton: {
    position: 'absolute',
    top: '20%',
    left: 0,
  },
  lockIcon: {
    width: 90,
    height: 90,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  otpInput: {
    width: 48,
    height: 54,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  timerText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#888',
    marginBottom: 5,
  },
  resendText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#349DC5',
    fontWeight: '500',
    marginBottom: 25,
  },
  keypadWrapper: {
    width: '100%',
    backgroundColor: '#e8e8e8',
    borderRadius: 18,
    padding: 10,
    marginBottom: '5%',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  keypadButton: {
    width: '22%',
    aspectRatio: 1.1,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: '#ddd',
  },
  grayKey: {
    backgroundColor: '#e1e1e1',
  },
  blueKey: {
    backgroundColor: '#349DC5',
    borderColor: '#349DC5',
  },
  keypadText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  verifyButton: {
    backgroundColor: '#349DC5',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
