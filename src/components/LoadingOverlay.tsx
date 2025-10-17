import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Platform, Animated } from 'react-native';
import ModernLoader from '../loader/load';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  fullscreen?: boolean; // if false, just inline centered loader
}

const FADE_DURATION = 220;

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message, fullscreen = true }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const [render, setRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRender(true);
      Animated.timing(opacity, { toValue: 1, duration: FADE_DURATION, useNativeDriver: true }).start();
    } else if (render) {
      Animated.timing(opacity, { toValue: 0, duration: FADE_DURATION, useNativeDriver: true }).start(() => {
        setRender(false);
      });
    }
  }, [visible, opacity, render]);

  if (!fullscreen) {
    if (!render) return null;
    return (
      <Animated.View style={[styles.inlineContainer, { opacity }] }>
        <ModernLoader />
        {message ? <Text style={styles.inlineMessage}>{message}</Text> : null}
      </Animated.View>
    );
  }

  if (!render) return null;
  return (
    <Modal transparent visible>
      <Animated.View style={[styles.overlay, { opacity }] }>
        <View style={styles.loaderCard}>
          <View style={{height:80,width:80}}>
            <ModernLoader />
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : <Text style={styles.message}>Loading...</Text>}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay:{
    flex:1,
    backgroundColor:'rgba(0,0,0,0.2)',
    justifyContent:'center',
    alignItems:'center'
  },
  loaderCard:{
    backgroundColor:'#fff',
    paddingHorizontal:28,
    paddingVertical:30,
    borderRadius:24,
    width: Platform.select({ ios:260, android:260, default:260 }),
    alignItems:'center',
    elevation:8,
    shadowColor:'#000',
    shadowOpacity:0.15,
    shadowRadius:12,
    shadowOffset:{width:0,height:4}
  },
  message:{
    marginTop:12,
    fontSize:15,
    fontWeight:'600',
    color:'#0B2346',
    textAlign:'center'
  },
  inlineContainer:{
    alignItems:'center',
    justifyContent:'center'
  },
  inlineMessage:{
    marginTop:8,
    fontSize:13,
    color:'#555'
  }
});

export default LoadingOverlay;
