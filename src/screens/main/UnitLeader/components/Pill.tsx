import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@theme/colors';

type Props = { label: string; onPress?: () => void; active?: boolean; style?: ViewStyle };

export default function Pill({ label, onPress, active, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.active, style]}>
      <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 20, backgroundColor: '#F0F6FA', borderWidth: 1, borderColor: Colors.primary
  },
  active: { backgroundColor: Colors.primary },
  text: { fontSize: 12, color: Colors.primary },
  activeText: { color: '#fff', fontWeight: '600' }
});
