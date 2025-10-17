import React, { useState, useMemo } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MUTED_GRAY, PRIMARY_BLUE } from './student/colors';

export type AchievementFormValues = {
  title: string;
  description?: string;
  date?: Date;
};

export default function AchievementModal({ visible, onClose, onSubmit, initialValues }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: AchievementFormValues) => Promise<void> | void;
  initialValues?: AchievementFormValues;
}) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [date, setDate] = useState<Date>(initialValues?.date || new Date());
  const [showDate, setShowDate] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setTitle(initialValues?.title || '');
      setDescription(initialValues?.description || '');
      setDate(initialValues?.date || new Date());
    }
  }, [visible, initialValues]);

  const canSave = useMemo(() => title.trim().length > 0, [title]);

  const handleSubmit = async () => {
    if (!canSave) return;
    try {
      setLoading(true);
      await onSubmit({ title: title.trim(), description: description.trim(), date });
      setLoading(false);
      onClose();
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'center', alignItems:'center', padding:16 }}>
        <View style={{ width:'100%', maxWidth:520, backgroundColor:'#fff', borderRadius:12, padding:16 }}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <Text style={{ fontSize:18, fontWeight:'700' }}>{initialValues ? 'Edit Achievement' : 'Add Achievement'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize:14, fontWeight:'600', marginBottom:6 }}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Organized Outreach to Community"
            style={{ borderWidth:1, borderColor:'#eee', borderRadius:8, paddingHorizontal:12, paddingVertical:10, marginBottom:12 }}
          />

          <Text style={{ fontSize:14, fontWeight:'600', marginBottom:6 }}>Date</Text>
          <TouchableOpacity onPress={() => setShowDate(true)} style={{ flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#eee', borderRadius:8, paddingHorizontal:12, paddingVertical:10, marginBottom:12 }}>
            <Ionicons name="calendar" size={18} color="#666" />
            <Text style={{ marginLeft:8 }}>{date.toDateString()}</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => { setShowDate(false); if (d) setDate(d); }}
            />
          )}

          <Text style={{ fontSize:14, fontWeight:'600', marginBottom:6 }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholder="Add details about the achievement"
            style={{ borderWidth:1, borderColor:'#eee', borderRadius:8, paddingHorizontal:12, paddingVertical:10, minHeight:90, textAlignVertical:'top' }}
          />

          <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop:16 }}>
            <TouchableOpacity onPress={onClose} style={{ paddingVertical:10, paddingHorizontal:16, marginRight:8 }}>
              <Text style={{ color:'#666' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={!canSave || loading} onPress={handleSubmit} style={{ backgroundColor: canSave ? PRIMARY_BLUE : MUTED_GRAY, paddingVertical:10, paddingHorizontal:16, borderRadius:8, flexDirection:'row', alignItems:'center' }}>
              {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="save" size={18} color="#fff" />}
              <Text style={{ color:'#fff', marginLeft:8 }}>{initialValues ? 'Save' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
