import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '@theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SalesStackParamList } from '../types';
import { widthPercentageToDP } from 'react-native-responsive-screen';

type Variation = {
  size?: string;
  quantityReceived: number;
  unitPrice: number;
  quantitySold: number;
};

type Entry = {
  id: number;
  name: string;
  hasVariations: boolean | null;
  variations: Variation[];
};

type Props = NativeStackScreenProps<SalesStackParamList, 'RecordEmpty'>;

export default function RecordEmpty({ navigation }: Props) {
  const [date, setDate] = useState<Date>(new Date(2025, 5, 30)); // June 30, 2025
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(null);
  const [isVariation, setIsVariation] = useState(false);
  const [size, setSize] = useState('');
  const [qtyRec, setQtyRec] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [qtySold, setQtySold] = useState('');

  useEffect(() => {
    if (showModal) {
      setSize('');
      setQtyRec('');
      setUnitPrice('');
      setQtySold('');
    }
  }, [showModal]);

  const addEntry = () => {
    const newId = entries.length > 0 ? Math.max(...entries.map(e => e.id)) + 1 : 1;
    setEntries([...entries, { id: newId, name: 'Communion', hasVariations: null, variations: [] }]);
  };

  const updateEntryName = (id: number, name: string) => {
    setEntries(entries.map(e => e.id === id ? { ...e, name } : e));
  };

  const updateHasVariations = (id: number, hasVariations: boolean) => {
    setEntries(entries.map(e => e.id === id ? { ...e, hasVariations } : e));
    setCurrentEntryId(id);
    setIsVariation(hasVariations);
    setShowModal(true);
  };

  const removeEntry = (id: number) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const addAnotherVariation = (id: number) => {
    setCurrentEntryId(id);
    setIsVariation(true);
    setShowModal(true);
  };

  const handleSave = () => {
    const qr = Number(qtyRec) || 0;
    const up = Number(unitPrice) || 0;
    const qs = Number(qtySold) || 0;

    setEntries(prev => prev.map(e => {
      if (e.id === currentEntryId) {
        const newVar: Variation = {
          quantityReceived: qr,
          unitPrice: up,
          quantitySold: qs,
        };
        if (isVariation) {
          newVar.size = size;
        }
        return { ...e, variations: [...e.variations, newVar] };
      }
      return e;
    }));
    setShowModal(false);
  };

  const currentEntry = currentEntryId !== null ? entries.find(e => e.id === currentEntryId) : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Record Merchandise Sales</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Date Button */}
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={Colors.text} />
          <Text style={styles.dateText}>
            {date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </Text>
        </TouchableOpacity>

        {/* Sales Input Card */}
        <TouchableOpacity style={styles.salesInputCard} onPress={addEntry}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="home-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.salesInputTitle}>Sales Input</Text>
              <Text style={styles.salesInputSubtitle}>Multiple Merchandise Entries Possible</Text>
            </View>
          </View>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>

        {/* Entries List */}
        {entries.length > 0 && (
          <View style={{ marginBottom: 40 }}>
            {entries.sort((a, b) => (a.hasVariations === true ? 1 : 0) - (b.hasVariations === true ? 1 : 0)).map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <TouchableOpacity onPress={() => removeEntry(entry.id)} style={styles.removeButton}>
                  <Ionicons name="close" size={20} color={Colors.muted} />
                </TouchableOpacity>
                {entry.hasVariations === null ? (
                  <>
                    <View style={styles.merchandiseNameContainer}>
                      <Text style={styles.label}>Merchandise Name</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={entry.name}
                          onValueChange={(value) => updateEntryName(entry.id, value)}
                          style={styles.picker}
                        >
                          <Picker.Item label="Communion" value="Communion" />
                          <Picker.Item label="Anointing Oil" value="Anointing Oil" />
                        </Picker>
                      </View>
                    </View>
                    <View style={styles.variationsContainer}>
                      <Text style={styles.label}>Does this merchandise have variations like different sizes?</Text>
                      <View style={styles.checkboxContainer}>
                        <TouchableOpacity
                          style={[styles.checkbox, entry.hasVariations === true && styles.checkboxSelected]}
                          onPress={() => updateHasVariations(entry.id, true)}
                        >
                          <Text style={styles.checkboxText}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.checkbox, entry.hasVariations === false && styles.checkboxSelected]}
                          onPress={() => updateHasVariations(entry.id, false)}
                        >
                          <Text style={styles.checkboxText}>No</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    {entry.variations.map((varItem, index) => (
                      <View key={index} style={styles.variationBlock}>
                        <Text style={styles.variationTitle}>
                          {entry.hasVariations ? `${entry.name} - Variation ${index + 1}` : entry.name}
                        </Text>
                        {varItem.size && (
                          <View style={styles.row}>
                            <Text style={styles.rowLabel}>Size</Text>
                            <Text style={styles.rowValue}>{varItem.size}</Text>
                          </View>
                        )}
                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Quantity Received</Text>
                          <Text style={styles.rowValue}>{varItem.quantityReceived}</Text>
                        </View>
                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Unit Price</Text>
                          <Text style={styles.rowValue}>₦ {varItem.unitPrice}</Text>
                        </View>
                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Quantity Sold</Text>
                          <Text style={styles.rowValue}>{varItem.quantitySold}</Text>
                        </View>
                      </View>
                    ))}
                    {entry.hasVariations && (
                      <TouchableOpacity style={styles.addVariationButton} onPress={() => addAnotherVariation(entry.id)}>
                        <Text style={styles.addVariationText}>Add Another Variation</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {entries.length === 0 && (
          <View style={styles.center}>
            <Ionicons name="bag-outline" size={90} color={Colors.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No Available Merchandise</Text>
          </View>
        )}

        {/* Upload Sales Report */}
        <TouchableOpacity style={styles.uploadButton}>
          <Text style={styles.uploadText}>Upload Sales Report</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      {/* Input Modal */}
      {showModal && currentEntry && (
        <Modal visible={showModal} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isVariation ? `${currentEntry.name} - Variation ${currentEntry.variations.length + 1}` : currentEntry.name}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              {isVariation && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Size</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="E.g., S, M, L, 500ml, 1L, etc."
                    value={size}
                    onChangeText={setSize}
                  />
                </View>
              )}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Quantity Received</Text>
                <TextInput
                  style={styles.input}
                  placeholder="E.g., 10, 20, etc."
                  value={qtyRec}
                  onChangeText={setQtyRec}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Unit {isVariation ? 'Price' : 'Selling Price'}</Text>
                <View style={styles.priceInput}>
                  <Text style={styles.currency}>₦</Text>
                  <TextInput
                    style={styles.inputNoBorder}
                    value={unitPrice}
                    onChangeText={setUnitPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Quantity Sold</Text>
                <TextInput
                  style={styles.input}
                  value={qtySold}
                  onChangeText={setQtySold}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },

  // Top Bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  topBarTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },

  // Date Button
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  dateText: { marginLeft: 8, fontSize: 14, color: Colors.text },

  // Sales Input Card
  salesInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 20,
  },
  salesInputTitle: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  salesInputSubtitle: { fontSize: 12, color: Colors.muted, marginTop: 2 },

  // Entry Card
  entryCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },

  // Merchandise Name
  merchandiseNameContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    backgroundColor: Colors.background,
  },
  picker: {
    height: 40,
  },

  // Variations Input
  variationsContainer: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  checkbox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    backgroundColor: Colors.background,
    marginHorizontal: 4,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxText: {
    fontSize: 14,
    color: Colors.text,
  },

  // Variation Display
  variationBlock: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  variationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowLabel: {
    fontSize: 12,
    color: Colors.text,
  },
  rowValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  addVariationButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  addVariationText: {
    color: Colors.primary,
    fontSize: 14,
  },

  // Empty State
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.primary, marginTop: 8 },

  // Upload Button
  uploadButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 10,
    marginHorizontal:widthPercentageToDP(15),
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  uploadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
    textAlign: 'left',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currency: {
    fontSize: 14,
    color: Colors.text,
    marginRight: 8,
  },
  inputNoBorder: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 12,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});