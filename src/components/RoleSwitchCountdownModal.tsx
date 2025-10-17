import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Colors } from '@theme/colors';

interface Props {
  visible: boolean;
  targetRole: string | null;
  seconds?: number; // default 8
  onCancel: () => void;
  onConfirmNow: () => Promise<void> | void; // triggers immediate switch
  onAutoExecute: () => Promise<void> | void; // called after countdown completes
  loading?: boolean;
}

const RoleSwitchCountdownModal: React.FC<Props> = ({
  visible,
  targetRole,
  seconds = 8,
  onCancel,
  onConfirmNow,
  onAutoExecute,
  loading
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const executedRef = useRef(false);

  useEffect(()=>{
    if(visible){
      setRemaining(seconds);
      executedRef.current = false;
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: seconds * 1000,
        useNativeDriver: false,
      }).start();
      timerRef.current = setInterval(()=>{
        setRemaining(prev => {
          if(prev <= 1){
            if(!executedRef.current){
              executedRef.current = true;
              onAutoExecute();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return ()=>{
      if(timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, seconds, onAutoExecute, progressAnim]);

  const widthInterpolate = progressAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] });

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Switching Role</Text>
          <Text style={styles.subtitle}>You are switching to <Text style={styles.roleText}>{targetRole || '—'}</Text>. This will finalize automatically in {remaining}s.</Text>
          <View style={styles.progressBarOuter}>
            <Animated.View style={[styles.progressBarInner,{ width: widthInterpolate }]} />
          </View>
          <View style={styles.remainingRow}>
            <Text style={styles.remainingText}>Executing in {remaining}s...</Text>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={onCancel} disabled={loading}>
              <Text style={[styles.actionText, {color:'#222'}]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: loading? '#7bbede' : Colors.primary, opacity: loading?0.7:1 }]} onPress={()=>{ if(!executedRef.current){ executedRef.current=true; onConfirmNow(); } }} disabled={loading}>
              <Text style={styles.actionText}>Switch Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'center', padding:24 },
  sheet:{ backgroundColor:'#fff', borderRadius:20, padding:20, elevation:10, shadowColor:'#000', shadowOpacity:0.15, shadowRadius:12, shadowOffset:{width:0,height:4} },
  title:{ fontSize:18, fontWeight:'700', color:'#0B2346', marginBottom:6 },
  subtitle:{ fontSize:13, color:'#555', lineHeight:18, marginBottom:16 },
  roleText:{ color:Colors.primary, fontWeight:'700' },
  progressBarOuter:{ height:10, borderRadius:6, backgroundColor:'#e5eef3', overflow:'hidden', marginBottom:10 },
  progressBarInner:{ backgroundColor:Colors.primary, height:'100%' },
  remainingRow:{ marginBottom:16 },
  remainingText:{ fontSize:12, color:'#333', fontWeight:'500' },
  actionsRow:{ flexDirection:'row', justifyContent:'space-between' },
  actionBtn:{ flex:1, paddingVertical:14, borderRadius:10, alignItems:'center', marginLeft:12 },
  cancelBtn:{ backgroundColor:'#f0f0f0', marginLeft:0, marginRight:8 },
  actionText:{ color:'#fff', fontWeight:'600', fontSize:15 }
});

export default RoleSwitchCountdownModal;
