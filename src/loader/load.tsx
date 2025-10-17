import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, Image, ViewStyle } from "react-native";

interface ModernLoaderProps {
  fullscreen?: boolean;            // if true fills parent (default true)
  backgroundColor?: string;       // bg color for fullscreen mode
  spinnerSize?: number;           // diameter of spinner ring
  ringWidth?: number;             // thickness of ring border
  logoSize?: number;              // size of center logo
  style?: ViewStyle;              // additional container style
}

export default function ModernLoader({
  fullscreen = true,
  backgroundColor = "#F8FAFC",
  spinnerSize = 60,
  ringWidth = 6,
  logoSize = 35,
  style
}: ModernLoaderProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // rotation with ease in & out
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // subtle pulsing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotateAnim, scaleAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "720deg"], // smooth ease in/out rotation
  });

  const containerStyle: ViewStyle = fullscreen ? {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor,
  } : {
    justifyContent: 'center',
    alignItems: 'center'
  };

  return (
    <View style={[containerStyle, style]}>        
      {/* Spinner ring */}
      <Animated.View
        style={{
          width: spinnerSize,
          height: spinnerSize,
          borderWidth: ringWidth,
          borderTopColor: "#349DC5",
          borderRightColor: "#80D0F7",
          borderBottomColor: "transparent",
          borderLeftColor: "transparent",
          borderRadius: spinnerSize/2,
          position: "absolute",
          transform: [{ rotate: spin }, { scale: scaleAnim }],
          shadowColor: "#349DC5",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 6,
          elevation: 5, // Android shadow
        }}
      />

      {/* Static App Icon */}
      <Image
        source={require("../assets/images-removebg-preview.png")} // your logo file
        style={{ width: logoSize, height: logoSize }}
        resizeMode="contain"
      />
    </View>
  );
}
