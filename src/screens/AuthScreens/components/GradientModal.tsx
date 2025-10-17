import { useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFonts, Inter_600SemiBold, Inter_400Regular } from '@expo-google-fonts/inter';

// Define the props interface
export interface GradientModalProps {
  visible: boolean;
  onClose: () => void;
  message: string;
  autoHideDuration?: number; // Optional prop for autohide duration
}

export default function GradientModal({
  visible,
  onClose,
  message,
  autoHideDuration = 3000, // Default duration of 3 seconds
}: GradientModalProps) {
  const { width } = useWindowDimensions();
  const translateY = useSharedValue<number>(-100);
  const scale = useSharedValue<number>(0.9);
  const opacity = useSharedValue<number>(0);

  const [fontsLoaded, fontError] = useFonts({
    Inter_600SemiBold,
    Inter_400Regular,
  });

  useEffect(() => {
    if (visible) {
      // Animate in
      translateY.value = withTiming(40, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 250 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((err) => {
        console.error('Haptics error:', err);
      });

      // Autohide logic
      const timeoutId = setTimeout(() => {
        runOnJS(onClose)();
      }, autoHideDuration);

      return () => clearTimeout(timeoutId);
    } else {
      // Animate out
      translateY.value = withTiming(-100, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      scale.value = withTiming(0.9, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, scale, opacity, onClose, autoHideDuration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible || !fontsLoaded || fontError) {
    if (fontError) console.error('Font loading error:', fontError);
    return null;
  }

  return (
    <Animated.View style={[styles.modalContainer, animatedStyle]}>
      <BlurView intensity={100} tint="light" style={styles.blurContainer}>
        <View style={styles.content}>
          {/* Blue Accent */}
          <View style={styles.blueAccent} /> 
          
          {/* Notification Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>💡</Text> 
          </View>
          
          <View style={styles.body}>
            <Text style={[styles.message, { fontFamily: 'Inter_600SemiBold' }]}>
              {message}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                (err) => {
                  console.error('Haptics error:', err);
                }
              );
              onClose();
            }}
            accessibilityLabel="Close notification"
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    paddingTop: 40,
  },
  blurContainer: {
    borderRadius: 24, // More rounded corners
    overflow: 'hidden',
    width: '90%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Fallback for no blur
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Subtle border
  },
  content: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  blueAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#3498db', // A clean blue color
    borderRadius: 24,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 152, 219, 0.1)', // Light blue background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
    // Add a specific font if you have one for icons
  },
  body: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  closeButton: {
    marginLeft: 16,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  closeText: {
    fontSize: 24,
    lineHeight: 24,
    color: '#333333',
    fontFamily: 'Inter_400Regular',
    opacity: 0.4,
  },
});