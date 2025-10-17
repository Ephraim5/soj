import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '@components/PrimaryButton';
import { Colors } from '@theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SalesStackParamList } from '../types';
import { exportSalesReport } from './utils/export';
import Toast from 'react-native-toast-message';


type Props = NativeStackScreenProps<SalesStackParamList, 'ViewDetails'>;

export default function ViewDetails({ navigation }: Props) {
  const [loading, setLoading] = useState(false);

  const salesList = [
    {
      name: "Communion",
      variation: [
        { label: "250ml (Small)", qtyRec: 50, qtySold: 30, cost: "₦100", selling: "₦150", profit: "₦1500" },
        { label: "500ml (Large)", qtyRec: 30, qtySold: 20, cost: "₦150", selling: "₦200", profit: "₦1000" },
      ],
    },
    {
      name: "T-Shirt",
      variation: [
        { label: "Medium", qtyRec: 30, qtySold: 20, cost: "₦7000", selling: "₦8000", profit: "₦1000" },
        { label: "Large", qtyRec: 30, qtySold: 20, cost: "₦7000", selling: "₦8000", profit: "₦1000" },
      ],
    },
    {
      name: "Teens Devotional",
      variation: [
        { label: "", qtyRec: 12, qtySold: 10, cost: "₦500", selling: "₦600", profit: "₦100" },
      ],
    },
  ];

  const handleExport = async () => {
    try {
      setLoading(true);
      Toast.show({
        type: "info",
        text1: "Building Export",
        autoHide: true,
        visibilityTime: 2000,
      })
      // flatten variations into Sale[]
      const flatSales = salesList.flatMap(item =>
        item.variation.map(v => ({
          merchName: `${item.name}${v.label ? " - " + v.label : ""}`,
          qtyRec: v.qtyRec,
          qtySold: v.qtySold,
          unit: v.selling, // or cost, depending on what export expects
          total: v.profit, // adjust if your PDF expects "total revenue" not profit
        }))
      );

      await exportSalesReport(Toast, flatSales, []);

    } catch (error) {
      console.error("Export failed:", error);
      Toast.show({
        type: "error",
        text1: "Network Issues",
      })
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
  <StatusBar barStyle="dark-content" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Sales Summary</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date */}
        <Text style={styles.dateText}>2025</Text>

        {/* Table */}
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.4 }]}>Item Name</Text>
            <Text style={styles.th}>Qty Received</Text>
            <Text style={styles.th}>Qty Sold</Text>
            <Text style={styles.th}>Cost Price</Text>
            <Text style={styles.th}>Selling Price</Text>
            <Text style={styles.th}>Profit</Text>
          </View>

          {salesList.map((item, idx) => (
            <View key={idx} style={{ marginBottom: 12 }}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemSub}>Variation</Text>

              {item.variation.map((v, i) => (
                <View key={i} style={styles.tableRow}>
                  <View style={{ flex: 1.4 }}>
                    {v.label ? <Text style={styles.itemSub}>{v.label}</Text> : null}
                  </View>
                  <Text style={styles.td}>{v.qtyRec}</Text>
                  <Text style={styles.td}>{v.qtySold}</Text>
                  <Text style={styles.td}>{v.cost}</Text>
                  <Text style={styles.td}>{v.selling}</Text>
                  <Text style={styles.td}>{v.profit}</Text>
                </View>
              ))}

              {idx !== salesList.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Export Button */}
        <PrimaryButton title="Export As PDF" onPress={handleExport} style={{ marginTop: 20 }} />
      </ScrollView>

      {/* Loading Overlay */}
      <Modal transparent visible={loading} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Exporting Report...</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16 },

  // Top Bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingTop: 10 },
  topBarTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },

  // Date
  dateText: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginBottom: 12 },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 12 },

  // Table
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 6 },
  th: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.muted, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, alignItems: 'center' },
  td: { flex: 1, fontSize: 12, color: Colors.text, textAlign: 'center' },
  itemTitle: { fontSize: 13, fontWeight: '600', color: Colors.text },
  itemSub: { fontSize: 11, color: Colors.muted },

  divider: { borderBottomWidth: 1, borderBottomColor: Colors.border, marginTop: 6 },

  // Loading
  modalOverlay: { flex: 1, backgroundColor: 'rgba(fff, fff, fff, 0.1)', justifyContent: 'center', alignItems: 'center' },
  loaderBox: { backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', elevation: 5 },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
