import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@theme/colors';

type Props = { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode };

export default function TopBar({ title, subtitle, onBack, right }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>{'‹'}</Text>
          </TouchableOpacity>
        ) : null}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  right:{
      display:"flex"
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    marginRight: 8, backgroundColor: '#F0F3F7'
  },
  backText: { fontSize: 30, color: Colors.text, lineHeight: 22 },
  title: { fontSize: 16, fontWeight: '600', color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.muted, marginTop: 2 }
});
