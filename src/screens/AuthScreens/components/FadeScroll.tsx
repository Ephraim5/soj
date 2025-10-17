
import React, { ReactNode } from 'react';
import { ScrollView, ScrollViewProps, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FadeScrollViewProps extends ScrollViewProps {
  children: ReactNode;
  topFadeHeight?: number;
  bottomFadeHeight?: number;
  fadeColor?: string;
}

const FadeScrollView: React.FC<FadeScrollViewProps> = ({
  children,
  topFadeHeight = 60,
  bottomFadeHeight = 60,
  fadeColor = 'white',
  contentContainerStyle,
  ...rest
}) => {
  return (
    <View style={styles.wrapper}>
      {/* Top Fade */}
      <LinearGradient
        colors={[fadeColor, 'transparent']}
        style={[styles.topFade, { height: topFadeHeight }]}
        pointerEvents="none"
      />

      {/* Scrollable content */}
      <ScrollView
        {...rest}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {/* Bottom Fade */}
      <LinearGradient
        colors={['transparent', fadeColor]}
        style={[styles.bottomFade, { height: bottomFadeHeight }]}
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'white',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

export default FadeScrollView;
