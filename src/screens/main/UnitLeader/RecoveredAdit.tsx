import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, SafeAreaView, Platform, ScrollView, StatusBar } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { heightPercentageToDP, widthPercentageToDP } from 'react-native-responsive-screen';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listRecovered, createRecovered, updateRecovered as apiUpdateRecovered, deleteRecovered as apiDeleteRecovered, Recovered as RecoveredDoc } from '../../../api/recovered';

const RecoveredAddictsScreen: React.FC = ({navigation, route}:any) => {
    const readOnlySuperAdmin = route?.params?.readOnlySuperAdmin;
    const [addicts, setAddicts] = useState<RecoveredDoc[]>([]);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [firstName, setFirstName] = useState<string>('');
    const [middleName, setMiddleName] = useState<string>('');
    const [surname, setSurname] = useState<string>('');
    const [gender, setGender] = useState<string>('');
    const [age, setAge] = useState<string>('');
    const [maritalStatus, setMaritalStatus] = useState<string>('');
    const [addictionType, setAddictionType] = useState<string>('');
    const [dateOfRecovery, setDateOfRecovery] = useState<Date>(new Date(2025, 5, 30));
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [showPicker, setShowPicker] = useState<boolean>(false);
    const [currentKey, setCurrentKey] = useState<string>('');
    const [currentOptions, setCurrentOptions] = useState<string[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedGender, setSelectedGender] = useState<string>('All');
    const [selectedMonth, setSelectedMonth] = useState<string>('All');
    const [selectedAddiction, setSelectedAddiction] = useState<string>('All');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editing, setEditing] = useState<RecoveredDoc | null>(null);

    const dynamicYears = React.useMemo(() => {
        const current = new Date().getFullYear();
        const start = 2014; // baseline
        const arr: string[] = ['All'];
        for (let y = current; y >= start; y--) arr.push(String(y));
        return arr;
    }, []);

    const optionsMap: { [key: string]: string[] } = {
        gender: ['Male', 'Female'],
        maritalStatus: ['Single', 'Married', 'Divorced', 'Widowed'],
        addictionType: ['Alchohol', 'Drugs', 'Pornography'],
        year: dynamicYears,
        genderFilter: ['All', 'Male', 'Female'],
        month: ['All', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        addictionFilter: ['All', 'Alchohol', 'Drugs', 'Pornography', 'Theif', 'Killing', 'Fight', 'Lazy'],
    };

    const openPicker = (key: string) => {
        setCurrentKey(key);
        setCurrentOptions(optionsMap[key]);
        setShowPicker(true);
    };

    const selectOption = (item: string) => {
        if (currentKey === 'gender') setGender(item);
        else if (currentKey === 'maritalStatus') setMaritalStatus(item);
        else if (currentKey === 'addictionType') setAddictionType(item);
        else if (currentKey === 'year') setSelectedYear(item);
        else if (currentKey === 'genderFilter') setSelectedGender(item);
        else if (currentKey === 'month') setSelectedMonth(item);
        else if (currentKey === 'addictionFilter') setSelectedAddiction(item);
        setShowPicker(false);
    };

    useEffect(() => {
        (async () => {
            try{
                setLoading(true);
                const tk = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('auth_token')) || '';
                if(!tk) return;
                const params: any = {};
                if (selectedYear !== 'All') params.year = selectedYear;
                if (selectedMonth !== 'All') params.month = selectedMonth;
                if (selectedGender !== 'All') params.gender = selectedGender;
                if (selectedAddiction !== 'All') params.addiction = selectedAddiction;
                const list = await listRecovered(tk, params);
                setAddicts(list);
            }catch(e){
                console.log('recovered load error', e);
            }finally{
                setLoading(false);
            }
        })();
    }, [selectedYear, selectedMonth, selectedGender, selectedAddiction]);

    const handleAddNew = () => {
        if (readOnlySuperAdmin) return;
        setEditing(null);
        setFirstName('');
        setMiddleName('');
        setSurname('');
        setGender('');
        setAge('');
        setMaritalStatus('');
        setAddictionType('');
        setDateOfRecovery(new Date());
        setPhoneNumber('');
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        if (readOnlySuperAdmin) return;
        const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${surname}`.trim();
        if(!fullName || !gender || !addictionType || !dateOfRecovery) return;
        try{
            setSubmitting(true);
            const tk = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('auth_token')) || '';
            const payload = {
                fullName,
                gender: gender as 'Male'|'Female',
                age: age? parseInt(age, 10) : undefined,
                maritalStatus,
                addictionType,
                dateOfRecovery: dateOfRecovery.toISOString(),
                phone: phoneNumber,
            };
            if (editing) {
                const updated = await apiUpdateRecovered(tk, editing._id, payload);
                setAddicts(prev => prev.map(a => a._id === updated._id ? updated : a));
            } else {
                const created = await createRecovered(tk, payload as any);
                setAddicts(prev => [created, ...prev]);
            }
            setModalVisible(false);
            setEditing(null);
        }catch(e){
            console.log('recovered submit error', e);
        }finally{
            setSubmitting(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || dateOfRecovery;
        setShowDatePicker(Platform.OS === 'ios');
        setDateOfRecovery(currentDate);
    };

    const renderItem = ({ item }: { item: RecoveredDoc }) => (
        <View style={styles.itemContainer}>
            <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Full Name</Text>
                <Text style={styles.itemValue}>{item.fullName}</Text>
            </View>
            <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Gender</Text>
                <Text style={styles.itemValue}>{item.gender}</Text>
            </View>
            <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Age</Text>
                <Text style={styles.itemValue}>{item.age}</Text>
            </View>
            <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Marital Status</Text>
                <Text style={styles.itemValue}>{item.maritalStatus}</Text>
            </View>
            <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Addiction Type</Text>
                <Text style={styles.itemValue}>{item.addictionType}</Text>
            </View>
            <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Date of Recovery</Text>
                <Text style={[styles.itemValue, { color: '#349DC5' }]}>{new Date(item.dateOfRecovery).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            </View>
            <View style={{ flexDirection:'row', gap:12, marginTop:8 }}>
                <TouchableOpacity style={styles.smallBtn} onPress={() => {
                    setEditing(item);
                    const parts = (item.fullName || '').split(' ');
                    setFirstName(parts[0] || '');
                    setMiddleName(parts.length > 2 ? parts.slice(1, -1).join(' ') : '');
                    setSurname(parts.length > 1 ? parts[parts.length -1] : '');
                    setGender(item.gender);
                    setAge(item.age ? String(item.age) : '');
                    setMaritalStatus(item.maritalStatus || '');
                    setAddictionType(item.addictionType);
                    setDateOfRecovery(new Date(item.dateOfRecovery));
                    setPhoneNumber(item.phone || '');
                    setModalVisible(true);
                }}><Text style={styles.smallBtnText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor:'#e74c3c' }]} onPress={async () => {
                    try{
                        const tk = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('auth_token')) || '';
                        await apiDeleteRecovered(tk, item._id);
                        setAddicts(prev => prev.filter(a => a._id !== item._id));
                    }catch(e){ console.log('recovered delete error', e); }
                }}><Text style={styles.smallBtnText}>Delete</Text></TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={"dark-content"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={()=>navigation.goBack()} style={{ paddingRight: 8 }}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
            </View>
            <View style={styles.subHeader}>
                <View style={styles.subHeaderLeft}>
                    <MaterialCommunityIcons name="email-receive" size={30} color="#494922" />
                    <Text style={styles.subTitle}>Recovered Addicts</Text>
                </View>
                <TouchableOpacity style={styles.dropdown} onPress={() => openPicker('year')}>
                    <Text style={styles.year}>{selectedYear === 'All' ? 'All Years' : selectedYear} ▼</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, addiction, or date"
                    placeholderTextColor="#aaa"
                />
            </View>
            <View style={styles.statsRow}>
                <View>
                    <Text style={styles.statsText}>Total Recovered</Text>
                    <Text style={[styles.statsText, { fontWeight: 800 }]}>{'20'}</Text>
                </View>
                <View>
                    <Text style={styles.statsText}>Last Recorded Recovery</Text>
                    <Text style={[styles.statsText, { fontWeight: 800 }]}>{'June 16, 2025'}</Text>
                </View>
            </View>
            {!readOnlySuperAdmin && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
                    <Text style={styles.addButtonText}>Add New</Text>
                </TouchableOpacity>
            )}
            <View style={styles.filtersRow}>
                <TouchableOpacity style={styles.filterButton} onPress={() => openPicker('genderFilter')}>
                    <Text style={styles.filterText}>{selectedGender} ▼</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton} onPress={() => openPicker('month')}>
                    <Text style={styles.filterText}>{selectedMonth} ▼</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton} onPress={() => openPicker('addictionFilter')}>
                    <Text style={styles.filterText}>{selectedAddiction} ▼</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={addicts}
                renderItem={renderItem}
                keyExtractor={(item, index) => item._id || String(index)}
                style={styles.list}
                scrollEnabled={true}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
            {!readOnlySuperAdmin && (
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ width: 10, height: 10 }}></View>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeButton}>X</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>First Name</Text>
                            <TextInput style={styles.input} placeholder="Enter Name" value={firstName} onChangeText={setFirstName} />
                            <Text style={styles.label}>Middle Name (Optional)</Text>
                            <TextInput style={styles.input} placeholder="Enter Name" value={middleName} onChangeText={setMiddleName} />
                            <Text style={styles.label}>Surname</Text>
                            <TextInput style={styles.input} placeholder="Enter Name" value={surname} onChangeText={setSurname} />
                            <Text style={styles.label}>Gender</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => openPicker('gender')}>
                                <Text style={[styles.dropdownText, gender ? styles.selectedText : styles.placeholderText]}>{gender || 'Select'}</Text>
                                <Text style={styles.arrow}>▼</Text>
                            </TouchableOpacity>
                            <Text style={styles.label}>Age</Text>
                            <TextInput style={styles.input} placeholder="" value={age} onChangeText={setAge} keyboardType="numeric" />
                            <Text style={styles.label}>Marital Status</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => openPicker('maritalStatus')}>
                                <Text style={[styles.dropdownText, maritalStatus ? styles.selectedText : styles.placeholderText]}>{maritalStatus || 'Select'}</Text>
                                <Text style={styles.arrow}>▼</Text>
                            </TouchableOpacity>
                            <Text style={styles.label}>Addiction Type</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => openPicker('addictionType')}>
                                <Text style={[styles.dropdownText, addictionType ? styles.selectedText : styles.placeholderText]}>{addictionType || 'e.g., Alchohol, Drugs, Pornography'}</Text>
                                <Text style={styles.arrow}>▼</Text>
                            </TouchableOpacity>
                            <Text style={styles.label}>Date of Recovery</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => setShowDatePicker(true)}>
                                <Text style={styles.dropdownText}>{dateOfRecovery.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                                <Text style={styles.arrow}>📅</Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    testID="dateTimePicker"
                                    value={dateOfRecovery}
                                    mode="date"
                                    is24Hour={true}
                                    display="default"
                                    onChange={onDateChange}
                                />
                            )}
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput style={styles.input} placeholder="e.g., 08064234542" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
                        </ScrollView>

                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
                            <Text style={styles.submitButtonText}>{submitting ? (editing? 'Updating...' : 'Submitting...') : (editing? 'Update' : 'Submit')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            )}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showPicker}
                onRequestClose={() => setShowPicker(false)}
            >
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContent}>
                        <FlatList
                            data={currentOptions}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.optionItem} onPress={() => selectOption(item)}>
                                    <Text style={styles.optionText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPicker(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: heightPercentageToDP(3)
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    backArrow: {
        fontSize: 24,
        marginRight: 8,
        color: '#333',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    subHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',

    },
    iconBg: {
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    icon: {
        fontSize: 14,
        color: '#666',
    },
    subTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
    },
    year: {
        fontSize: 16,
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        paddingHorizontal: 8,
        marginTop: 8,
    },
    searchIcon: {
        color: '#aaa',
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        padding: 14,
        color: '#000',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        margin: 8,
    },
    statsText: {
        fontSize: 14,
        color: '#333',
    },
    addButton: {
        backgroundColor: '#349DC5',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        margin: 8,
        marginLeft: widthPercentageToDP(55)
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    filtersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 14
    },
    filterButton: {
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    filterText: {
        fontSize: 14,
        color: '#000',
    },
    list: {
        marginTop: 8,
        flex: 1,
    },
    listContent: {
        paddingBottom: 20,
    },
    itemContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: "#999",
        borderStyle: "solid",
        margin: 4,
        shadowColor: '#999',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 1,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    itemLabel: {
        fontSize: 14,
        color: '#666',
    },
    itemValue: {
        fontSize: 14,
        color: '#000',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 8,
        height: heightPercentageToDP(90),
        padding: 16,
        width: widthPercentageToDP(90),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },

    closeButton: {
        fontSize: 18,
        color: '#999',
    },
    label: {
        fontSize: 14,
        color: '#000',
        marginBottom: 4,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        color: '#000',
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
    },
    dropdownText: {
        fontSize: 14,
        color: '#000',
    },
    placeholderText: {
        color: '#aaa',
    },
    selectedText: {
        color: '#000',
    },
    arrow: {
        fontSize: 14,
        color: '#aaa',
    },
    submitButton: {
        backgroundColor: '#349DC5',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    pickerOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    pickerContent: {
        backgroundColor: '#fff',
        borderRadius: 8,
        width: '80%',
        maxHeight: '50%',
    },
    optionItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    optionText: {
        fontSize: 16,
        color: '#000',
    },
    cancelButton: {
        padding: 16,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        color: '#349DC5',
    },
    smallBtn: {
        backgroundColor: '#349DC5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    smallBtnText: { color:'#fff', fontWeight:'600' },
});

export default RecoveredAddictsScreen;