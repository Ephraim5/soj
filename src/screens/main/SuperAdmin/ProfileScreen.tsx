import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    TextInput,
    ScrollView,
    Platform,
    Switch,
    StatusBar

} from 'react-native';
import { Ionicons, MaterialIcons, Feather, AntDesign } from '@expo/vector-icons';
import { widthPercentageToDP as responsiveScreenWidth } from 'react-native-responsive-screen';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import Toast from 'react-native-toast-message';
import LoadingOverlay from '../../../components/LoadingOverlay';
import useMinimumLoader from '../../../hooks/useMinimumLoader';

interface MenuButtonProps {
    label: string;
    icon: React.ReactNode;
    danger?: boolean;
    onPress?: () => void;
}

interface NotificationSwitchProps {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}

type RootStackParamList = {
    Dashboard: {
        surname: string;
        firstName: string;
        profileImage: string | null;
    };
};

export default function ProfileScreen(): React.ReactElement {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [notificationModalVisible, setNotificationModalVisible] = useState(false);
    const [addRoleModalVisible, setAddRoleModalVisible] = useState(false);
    const [roleSuccessModalVisible, setRoleSuccessModalVisible] = useState(false);
    const [addingRole, setAddingRole] = useState(false);
    const [selectedNewRole, setSelectedNewRole] = useState<string>('');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [units, setUnits] = useState<Array<{ _id:string; name:string }>>([]);
    const [roles, setRoles] = useState<Array<any>>([]);
    const [activeRole, setActiveRole] = useState<string>('');

    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [surname, setSurname] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [title, setTitle] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [savingProfile, setSavingProfile] = useState<boolean>(false);
    const [changingPassword, setChangingPassword] = useState<boolean>(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [notifUnitReports, setNotifUnitReports] = useState(true);
    const [notifChurchAnnouncements, setNotifChurchAnnouncements] = useState(true);
    const [notifFinancial, setNotifFinancial] = useState(true);
    const [notifEvents, setNotifEvents] = useState(true);

    const isSuperAdmin = roles.some(r=>r.role==='SuperAdmin');

    const ensureMediaLibraryPermission = async (): Promise<boolean> => {
        try {
            if (Platform.OS === 'web') return true;
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({ type: 'error', text1: 'Permission required', text2: 'Please allow Photos access to pick an image.' });
                return false;
            }
            return true;
        } catch {
            return true; // fail-open, ImagePicker will handle
        }
    };

    const pickImage = async () => {
        try {
            const ok = await ensureMediaLibraryPermission();
            if (!ok) return;
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });
            if (result.canceled || !result.assets?.length) return;
            const asset = result.assets[0];
            const cropped = await ImageManipulator.manipulateAsync(
                asset.uri,
                [{ resize: { width: 600 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            // Optimistic show
            setProfileImage(cropped.uri);
            // Upload to backend
            if (!userId) {
                Toast.show({ type: 'error', text1: 'Cannot upload', text2: 'Missing user id' });
                return;
            }
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Toast.show({ type: 'error', text1: 'Not authenticated' });
                return;
            }
            const formData = new FormData();
            formData.append('file', {
                uri: cropped.uri,
                name: 'avatar.jpg',
                type: 'image/jpeg'
            } as any);
            formData.append('userId', userId);
            try {
                const uploadRes = await fetch(`${BASE_URl}/api/upload/profile`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData as any
                });
                const data = await uploadRes.json();
                if (data?.ok && data.url) {
                    setProfileImage(data.url);
                    // Update cached user profile.avatar
                    const raw = await AsyncStorage.getItem('user');
                    if (raw) {
                        const cached = JSON.parse(raw);
                        cached.profile = cached.profile || {};
                        cached.profile.avatar = data.url;
                        await AsyncStorage.setItem('user', JSON.stringify(cached));
                    }
                    Toast.show({ type: 'success', text1: 'Avatar updated' });
                } else {
                    Toast.show({ type: 'error', text1: 'Upload failed', text2: data?.error || 'Unknown error' });
                }
            } catch (e: any) {
                Toast.show({ type: 'error', text1: 'Upload error', text2: e.message });
            }
        } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Image pick failed', text2: e.message });
        }
    };

    const loadUser = useCallback(async () => {
        try {
            setLoading(true);
            const raw = await AsyncStorage.getItem('user');
            const token = await AsyncStorage.getItem('token');
            if (raw) {
                const u = JSON.parse(raw);
                setUserId(u._id);
            }
            if (token) {
                const res = await axios.get(`${BASE_URl}/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.ok) {
                    const u = res.data.user;
                    setFirstName(u.firstName || '');
                    setMiddleName(u.middleName || '');
                    setSurname(u.surname || '');
                    setPhone(u.phone || '');
                    setEmail(u.email || '');
                    setTitle(u.title || '');
                    setProfileImage(u?.profile?.avatar || null);
                    setRoles(u.roles || []);
                    setActiveRole(u.activeRole || (u.roles?.[0]?.role || ''));
                    // cache full user
                    await AsyncStorage.setItem('user', JSON.stringify({ ...(JSON.parse(raw||'{}')), ...u }));
                }
            }
        } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Failed to load profile', text2: e.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const saveProfile = async () => {
        if (!userId) return;
        try {
            setSavingProfile(true);
            const token = await AsyncStorage.getItem('token');
            const res = await axios.put(`${BASE_URl}/api/users/${userId}`, {
                firstName, middleName, surname, phone, title
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data?.ok) {
                Toast.show({ type: 'success', text1: 'Profile updated' });
                // Update cached user minimal
                const cachedRaw = await AsyncStorage.getItem('user');
                if (cachedRaw) {
                    const cached = JSON.parse(cachedRaw);
                    cached.firstName = firstName;
                    cached.surname = surname;
                    cached.middleName = middleName;
                    cached.title = title;
                    await AsyncStorage.setItem('user', JSON.stringify(cached));
                }
                setEditModalVisible(false);
            } else {
                Toast.show({ type: 'error', text1: 'Update failed', text2: res.data?.message || 'Unknown error' });
            }
        } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Update failed', text2: e?.response?.data?.message || e.message });
        } finally {
            setSavingProfile(false);
        }
    };

    const submitChangePassword = async () => {
        if (!currentPassword || !newPassword) {
            Toast.show({ type: 'error', text1: 'Fill all password fields' });
            return;
        }
        if (newPassword !== confirmPassword) {
            Toast.show({ type: 'error', text1: 'Passwords do not match' });
            return;
        }
        try {
            setChangingPassword(true);
            const token = await AsyncStorage.getItem('token');
            const res = await axios.post(`${BASE_URl}/api/users/change-password`, {
                currentPassword, newPassword
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data?.ok) {
                Toast.show({ type: 'success', text1: 'Password changed' });
                setPasswordModalVisible(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                Toast.show({ type: 'error', text1: 'Change failed', text2: res.data?.message || 'Unknown error' });
            }
        } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Change failed', text2: e?.response?.data?.message || e.message });
        } finally {
            setChangingPassword(false);
        }
    };

    const showProfileLoader = useMinimumLoader(loading, { minVisibleMs: 800, showDelayMs: 120 });

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#333333" />
            </TouchableOpacity>
            <StatusBar barStyle="dark-content" />


            {/* Avatar */}
            <View style={styles.avatarContainer}>
                <TouchableOpacity onPress={() => setModalVisible(true)} >
                    {profileImage ? (
                        <Image
                            source={{ uri: profileImage }}
                            style={styles.avatar}
                        />
                    ) : (
                        <Image
                            source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5yTxBxqX7UPLILheEuZbgOuYver2PQLQxuQ&s' }}
                            style={styles.avatar}
                        />)}
                </TouchableOpacity>

                <TouchableOpacity style={styles.editAvatar} onPress={pickImage}>
                    <Feather name="edit" size={22} color="#349DC5" />
                </TouchableOpacity>
            </View>
            {/*preview */}
            <Modal visible={modalVisible} transparent={true} animationType="fade">
                <View style={styles.modalBackground}>
                    {/* Full screen image */}
                    <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                        <Text style={styles.closeText}>×</Text>
                    </TouchableOpacity>
                    <Image
                        source={{
                            uri: profileImage == null
                                ? 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5yTxBxqX7UPLILheEuZbgOuYver2PQLQxuQ&s'
                                : profileImage
                        }}
                        style={styles.fullImage}
                        resizeMethod='auto'
                        resizeMode="contain"
                    />
                </View>
            </Modal>

            {/* User Info */}
            <View style={styles.infoBlock}>
                {showProfileLoader ? (
                    <View style={{marginTop:10}}>
                        <LoadingOverlay visible={false} fullscreen={false} message="Loading profile" />
                    </View>
                ) : (
                    <>
                        <Text style={styles.role}>{[title, firstName, middleName, surname].filter(Boolean).join(' ') || 'Unnamed User'}</Text>
                        <Text style={styles.role}>{deriveRoleScopeLabel(activeRole, roles)}</Text>
                        <View style={styles.infoRow}>
                            <Feather name="phone" size={18} color="#333" />
                            <Text style={styles.infoText}> {phone || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Feather name="mail" size={18} color="#333" />
                            <Text style={styles.infoText}> {email || 'N/A'}</Text>
                        </View>
                    </>
                )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Buttons/Settings */}
            <View style={styles.menuBlock}>
                <MenuButton
                    label="Edit Personal Info"
                    icon={<Feather name="edit" size={20} color="#333" />}
                    onPress={() => setEditModalVisible(true)}
                />
                {/* Add Role (SuperAdmin only) */}
                {isSuperAdmin && (
                    <MenuButton
                        label="Add Role"
                        icon={<Feather name="user-plus" size={20} color="#333" />}
                        onPress={() => {
                            setSelectedNewRole('');
                            setSelectedUnitId('');
                            (async ()=>{
                                try {
                                    const token = await AsyncStorage.getItem('token');
                                    if(token){
                                        const res = await axios.get(`${BASE_URl}/api/units`, { headers:{ Authorization:`Bearer ${token}` }}).catch(()=>null);
                                        // backend returns { units: [...] }
                                        if(res?.data?.units && Array.isArray(res.data.units)){
                                            setUnits(res.data.units.map((u:any)=>({_id:u._id,name:u.name})));
                                        }
                                    }
                                } catch(e:any){
                                    console.log('load units failed', e?.message);
                                } finally {
                                    setAddRoleModalVisible(true);
                                }
                            })();
                        }}
                    />
                )}
                <MenuButton
                    label="Password Setting"
                    icon={<Feather name="lock" size={20} color="#333" />}
                    onPress={() => setPasswordModalVisible(true)}
                />
                <MenuButton
                    label="Notification Setting"
                    icon={<Ionicons name="notifications-outline" size={20} color="#333" />}
                    onPress={() => setNotificationModalVisible(true)}
                />
                <MenuButton
                    label="Logout"
                    icon={<MaterialIcons name="logout" size={20} color="#333" />}
                />
                <MenuButton
                    label="Delete Account"
                    icon={<AntDesign name="delete" size={20} color="#ff3b30" />}
                    danger
                />
            </View>

            {/* Edit Personal Info Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.editModalView}>
                        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 24 }}>
                            {/* Camera Avatar */}
                            <TouchableOpacity onPress={pickImage} style={styles.editPhotoCircle}>
                                {profileImage ? (
                                    <Image
                                        source={{ uri: profileImage }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <Ionicons name="camera" size={40} color="#fff" />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.changePhotoBtn} onPress={pickImage}>
                                <Text style={styles.changePhotoText}>Change Photo</Text>
                            </TouchableOpacity>

                            {/* Form Inputs */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>First Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    placeholder="First Name"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Middle Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={middleName}
                                    onChangeText={setMiddleName}
                                    placeholder="Middle Name"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Surname</Text>
                                <TextInput
                                    style={styles.input}
                                    value={surname}
                                    onChangeText={setSurname}
                                    placeholder="Surname"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                                <TextInput
                                    style={styles.input}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="Phone Number"
                                    keyboardType="phone-pad"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Email Address"
                                    keyboardType="email-address"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Title</Text>
                                <View style={styles.dropdownInput}>
                                    <TextInput
                                        style={{ flex: 1, fontSize: 15 }}
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="Title"
                                    />
                                    <Ionicons name="chevron-down" size={18} color="#999" style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                            <TouchableOpacity style={styles.saveBtn} disabled={savingProfile} onPress={saveProfile}>
                                <Text style={styles.saveBtnText}>{savingProfile ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Add Role Modal */}
            <Modal
                visible={addRoleModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setAddRoleModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={[styles.passwordModalView,{maxHeight:'80%'}]}>
                        <Text style={{fontSize:16,fontWeight:'600',marginBottom:12}}>Add New Role</Text>
                        <Text style={styles.inputLabel}>Select Role</Text>
                        <View style={styles.dropdownInput}>
                            <TouchableOpacity style={{flex:1}} onPress={() => { /* simple cycle */
                                const order = ['UnitLeader','Member'];
                                const idx = order.indexOf(selectedNewRole);
                                setSelectedNewRole(order[(idx+1)%order.length]);
                            }}>
                                <Text style={{paddingVertical:10}}>{selectedNewRole || 'Tap to cycle roles'}</Text>
                            </TouchableOpacity>
                            <Ionicons name="chevron-down" size={18} color="#999" />
                        </View>
                        {(selectedNewRole === 'UnitLeader' || selectedNewRole === 'Member') && (
                            <>
                                <Text style={[styles.inputLabel,{marginTop:16}]}>Select Unit</Text>
                                <View style={styles.dropdownListBox}>
                                    <ScrollView style={{maxHeight:160}}>
                                        {units.map(u => (
                                            <TouchableOpacity key={u._id} style={styles.dropdownListItem} onPress={() => setSelectedUnitId(u._id)}>
                                                <Text style={{color: selectedUnitId===u._id ? '#349DC5':'#222'}}>{u.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        {units.length===0 && <View style={{paddingVertical:8}}>
                                            <Text style={{color:'#666', marginBottom:8}}>No units loaded</Text>
                                            <TouchableOpacity onPress={async ()=>{
                                                try {
                                                    const token = await AsyncStorage.getItem('token');
                                                    if(token){
                                                        const res = await axios.get(`${BASE_URl}/api/units`, { headers:{ Authorization:`Bearer ${token}` }}).catch(()=>null);
                                                        if(res?.data?.units && Array.isArray(res.data.units)){
                                                            setUnits(res.data.units.map((u:any)=>({_id:u._id,name:u.name})));
                                                        }
                                                    }
                                                } catch(err:any) {
                                                    Toast.show({ type:'error', text1:'Retry failed', text2: err.message });
                                                }
                                            }} style={{alignSelf:'flex-start', backgroundColor:'#349DC5', paddingHorizontal:12, paddingVertical:6, borderRadius:6}}>
                                                <Text style={{color:'#fff'}}>Retry</Text>
                                            </TouchableOpacity>
                                        </View>}
                                    </ScrollView>
                                </View>
                            </>
                        )}
                        <TouchableOpacity
                            disabled={addingRole || !selectedNewRole || ((selectedNewRole==='UnitLeader'||selectedNewRole==='Member') && !selectedUnitId)}
                            style={[styles.saveBtn,{opacity: (addingRole || !selectedNewRole || ((selectedNewRole==='UnitLeader'||selectedNewRole==='Member') && !selectedUnitId))?0.6:1}]}
                            onPress={async () => {
                                if(!userId) return;
                                try {
                                    setAddingRole(true);
                                    // fetch units list if needed
                                    const token = await AsyncStorage.getItem('token');
                                    const payload:any = { role: selectedNewRole };
                                    if(selectedUnitId) payload.unitId = selectedUnitId;
                                    const res = await axios.post(`${BASE_URl}/api/users/${userId}/add-role`, payload,{ headers:{ Authorization:`Bearer ${token}` }});
                                    if(res.data?.ok){
                                        // update cache
                                        const uRes = await axios.get(`${BASE_URl}/api/users/me`,{ headers:{ Authorization:`Bearer ${token}` }});
                                        if(uRes.data?.ok){
                                            await AsyncStorage.setItem('user', JSON.stringify(uRes.data.user));
                                        }
                                        setAddRoleModalVisible(false);
                                        setRoleSuccessModalVisible(true);
                                    } else {
                                        Toast.show({ type:'error', text1:'Failed', text2: res.data?.message || 'Unable to add role' });
                                    }
                                } catch(e:any){
                                    Toast.show({ type:'error', text1:'Add role failed', text2: e?.response?.data?.message || e.message });
                                } finally {
                                    setAddingRole(false);
                                    loadUser();
                                }
                            }}>
                            <Text style={styles.saveBtnText}>{addingRole?'Adding...':'Confirm'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={()=>setAddRoleModalVisible(false)} style={[styles.saveBtn,{backgroundColor:'#ccc',marginTop:10}]}> 
                            <Text style={[styles.saveBtnText,{color:'#222'}]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal visible={roleSuccessModalVisible} animationType='fade' transparent onRequestClose={()=>setRoleSuccessModalVisible(false)}>
                <View style={styles.modalBackground}> 
                    <View style={styles.successBox}> 
                        <Ionicons name='checkmark-circle' size={64} color='#22c55e' />
                        <Text style={{fontSize:18,fontWeight:'600',marginTop:10}}>Add Role</Text>
                        <Text style={{color:'#555',marginTop:4,textAlign:'center'}}>New role has been added successfully.</Text>
                        <TouchableOpacity style={[styles.saveBtn,{marginTop:20}]} onPress={()=>{ setRoleSuccessModalVisible(false); }}>
                            <Text style={styles.saveBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Password Setting Modal */}
            <Modal
                visible={passwordModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPasswordModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.passwordModalView}>
                        <Text style={styles.passwordLabel}>Current Password</Text>
                        <View style={styles.passwordInputRow}>
                            <TextInput
                                style={styles.passwordInput}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="Enter Password"
                                secureTextEntry={!showCurrent}
                            />
                            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                                <Ionicons
                                    name={showCurrent ? "eye-off-outline" : "eye-outline"}
                                    size={22}
                                    color="#349DC5"
                                />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.passwordLabel}>New Password</Text>
                        <View style={styles.passwordInputRow}>
                            <TextInput
                                style={styles.passwordInput}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Enter Password"
                                secureTextEntry={!showNew}
                            />
                            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                <Ionicons
                                    name={showNew ? "eye-off-outline" : "eye-outline"}
                                    size={22}
                                    color="#349DC5"
                                />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.passwordLabel}>Confirm New Password</Text>
                        <View style={styles.passwordInputRow}>
                            <TextInput
                                style={styles.passwordInput}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Re-enter Password"
                                secureTextEntry={!showConfirm}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                <Ionicons
                                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                                    size={22}
                                    color="#349DC5"
                                />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.saveBtn} disabled={changingPassword} onPress={submitChangePassword}>
                            <Text style={styles.saveBtnText}>{changingPassword ? 'Saving...' : 'Save'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Notification Setting Modal */}
            <Modal
                visible={notificationModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setNotificationModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.notificationModalView}>
                        <NotificationSwitch
                            label="Unit Reports & Updates"
                            value={notifUnitReports}
                            onValueChange={setNotifUnitReports}
                        />
                        <NotificationSwitch
                            label="Church Announcements"
                            value={notifChurchAnnouncements}
                            onValueChange={setNotifChurchAnnouncements}
                        />
                        <NotificationSwitch
                            label="Financial & Attendance Reports"
                            value={notifFinancial}
                            onValueChange={setNotifFinancial}
                        />
                        <NotificationSwitch
                            label="Upcoming Events Reminders"
                            value={notifEvents}
                            onValueChange={setNotifEvents}
                        />
                        <TouchableOpacity style={styles.saveBtn} onPress={() => setNotificationModalVisible(false)}>
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function deriveRoleScopeLabel(activeRole: string, roles: any[]): string {
    const roleLabel = activeRole === 'SuperAdmin' ? 'Super Admin'
        : activeRole === 'MinistryAdmin' ? 'Ministry Admin'
        : activeRole === 'UnitLeader' ? 'Unit Leader'
        : activeRole === 'Member' ? 'Member'
        : (activeRole || 'User');

    // Try to find a matching role detail
    const match = roles?.find((r:any) => r?.role === activeRole) || roles?.[0] || {};

    // Scope resolution by role
    let scope = '';
    if (activeRole === 'SuperAdmin') {
        // prefer explicit names if available
        scope = match?.churchName || match?.church?.name || match?.churchTitle || 'Church';
    } else if (activeRole === 'MinistryAdmin') {
        scope = match?.ministryName || '—';
    } else if (activeRole === 'UnitLeader' || activeRole === 'Member') {
        // unit roles: prefer ministryName if available, else unit name
        scope = match?.ministryName || match?.unit?.ministryName || match?.unit?.name || '—';
    }
    return scope ? `${roleLabel} - ${scope}` : roleLabel;
}

function MenuButton({ label, icon, danger = false, onPress }: MenuButtonProps): React.ReactElement {
    return (
        <TouchableOpacity style={[styles.menuButton, danger && styles.dangerButton]} onPress={onPress}>
            <Text style={[styles.menuText, danger && styles.dangerText]}>{label}</Text>
            <View style={styles.menuIcon}>{icon}</View>
        </TouchableOpacity>
    );
}

function NotificationSwitch({ label, value, onValueChange }: NotificationSwitchProps): React.ReactElement {
    return (
        <View style={styles.notificationRow}>
            <Text style={styles.notificationLabel}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#d1e8fd', true: '#349DC5' }}
                thumbColor={'#fff'}
            />
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 50,
        backgroundColor: '#fff',
    },
    backButton: {
        marginBottom: 10,
        alignSelf: 'flex-start',
    },
    avatarContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        position: 'relative',
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
    },
    editAvatar: {
        position: 'absolute',
        bottom: responsiveScreenWidth(-1),
        right: responsiveScreenWidth(35),
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    infoBlock: {
        alignItems: 'center',
        marginBottom: 16,
    },
    role: {
        fontWeight: '600',
        fontSize: 15,
        color: '#333',
        marginBottom: 4,
        textAlign: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 2,
    },
    infoText: {
        fontSize: 14,
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 14,
    },
    menuBlock: {
        marginTop: 0,
    },
    //preview
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(8,8.7,20,0.50)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
    },
    closeText: {
        color: '#fff',
        fontSize: 38,
        fontWeight: 'semibold',
    },
    //endpreview
    menuButton: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 11,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#F3F3F3',
    },
    menuText: {
        fontSize: 15,
        color: '#222',
        fontWeight: '500',
    },
    menuIcon: {
        marginLeft: 10,
    },
    dangerButton: {
        borderColor: '#f89590',
        borderWidth: 1,
    },
    dangerText: {
        color: '#ff3b30',
    },

    // Edit Modal
    centeredView: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.16)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editModalView: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 22,
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 7,
    },
    editPhotoCircle: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: '#0B2346',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 18,
        borderWidth: 2,
        borderColor: '#349DC5',
    },
    changePhotoBtn: {
        backgroundColor: '#349DC5',
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 18,
        marginBottom: 18,
    },
    changePhotoText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    inputGroup: {
        width: '100%',
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 13,
        color: '#222',
        marginBottom: 3,
        marginLeft: 2,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#d3e0ea',
        borderRadius: 7,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 11 : 7,
        fontSize: 15,
        backgroundColor: '#fafcff',
    },
    dropdownInput: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d3e0ea',
        borderRadius: 7,
        backgroundColor: '#fafcff',
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 11 : 7,
    },
    saveBtn: {
        backgroundColor: '#349DC5',
        borderRadius: 7,
        marginTop: 15,
        width: '100%',
        paddingVertical: 13,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 0.3,
    },
    // Password Modal
    passwordModalView: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 22,
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 7,
    },
    passwordLabel: {
        alignSelf: 'flex-start',
        marginBottom: 4,
        fontSize: 14,
        color: '#222',
        fontWeight: '600',
        marginTop: 10,
    },
    passwordInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#d3e0ea',
        borderRadius: 7,
        backgroundColor: '#fafcff',
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 11 : 7,
    },
    passwordInput: {
        flex: 1,
        fontSize: 15,
        color: '#222',
        padding: 0,
        backgroundColor: 'transparent',
    },

    // Notification Modal
    notificationModalView: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 20,
        alignItems: 'stretch',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 7,
        marginBottom: 0,
    },
    notificationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        borderBottomWidth: 0.7,
        borderBottomColor: '#e0e0e0',
    },
    notificationLabel: {
        fontSize: 15,
        color: '#222',
        fontWeight: '500',
    },
    dropdownListBox:{
        width:'100%',
        borderWidth:1,
        borderColor:'#e0e0e0',
        borderRadius:10,
        paddingHorizontal:10,
        paddingVertical:6,
        backgroundColor:'#fafafa',
        marginTop:6
    },
    dropdownListItem:{
        paddingVertical:8,
        borderBottomWidth:1,
        borderColor:'#eee'
    },
    successBox:{
        width:'80%',
        backgroundColor:'#fff',
        padding:24,
        borderRadius:20,
        alignItems:'center'
    }
});
