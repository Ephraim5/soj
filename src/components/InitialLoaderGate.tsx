import React, { useEffect, useState } from 'react';
import ModernLoader from '../loader/load';
import { View, StyleSheet } from 'react-native';

interface InitialLoaderGateProps {
  minDuration?: number; // ms the loader should display (default 1200)
  children: React.ReactNode;
}

// Wrap app root to show a fullscreen ModernLoader before rendering children.
export default function InitialLoaderGate({ minDuration = 1200, children }: InitialLoaderGateProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), minDuration);
    return () => clearTimeout(t);
  }, [minDuration]);
  if (!ready) {
    return (
      <View style={styles.container}>
        <ModernLoader fullscreen spinnerSize={74} ringWidth={7} logoSize={40} />
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container:{ flex:1 }
});
