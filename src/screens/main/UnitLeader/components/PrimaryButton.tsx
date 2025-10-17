import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@theme/colors';

type Props = { title: string; onPress?: () => void; style?: ViewStyle; disabled?: boolean };

export default function PrimaryButton({ title, onPress, style, disabled }: Props) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.btn, disabled && styles.disabled, style]}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.primary
  },
  disabled: { opacity: 0.6 },
  text: { color: '#fff', fontWeight: '600' }
});
