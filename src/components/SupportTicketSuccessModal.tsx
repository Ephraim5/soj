import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  autoCloseMs?: number;
  loading?: boolean; // if parent wants to show processing state before closing
}

export default function SupportTicketSuccessModal({ visible, onClose, title = 'Ticket Submitted', message = 'We have received your request. Our support team will get back to you soon.', autoCloseMs = 3000, loading }: Props){
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    if(visible){
      Animated.timing(opacity, { toValue:1, duration:180, useNativeDriver:true }).start();
      if(autoCloseMs > 0){
        const t = setTimeout(()=>onClose(), autoCloseMs);
        return ()=>clearTimeout(t);
      }
    } else {
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', opacity, justifyContent:'center', alignItems:'center', padding:24 }}>
        <View style={{ backgroundColor:'#fff', padding:24, borderRadius:18, width:'100%', maxWidth:380 }}>
          <View style={{ width:72, height:72, borderRadius:36, backgroundColor:'#e8f9ef', alignItems:'center', justifyContent:'center', alignSelf:'center', marginBottom:16 }}>
            {loading ? <ActivityIndicator /> : <Text style={{ fontSize:34 }}>✅</Text>}
          </View>
          <Text style={{ fontSize:20, fontWeight:'700', marginBottom:8, textAlign:'center' }}>{title}</Text>
          <Text style={{ color:'#444', textAlign:'center', marginBottom:22, lineHeight:20 }}>{message}</Text>
          <TouchableOpacity onPress={onClose} style={{ backgroundColor:'#111', paddingVertical:14, borderRadius:10 }}>
            <Text style={{ color:'#fff', fontWeight:'600', textAlign:'center' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}
