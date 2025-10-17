import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView,
    Image,
    Modal,
    Pressable,
} from "react-native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { heightPercentageToDP, heightPercentageToDP as responsiveHeight } from "react-native-responsive-screen";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { uploadMessageFile, sendMessage } from '../../../api/messages';
import { searchUsers, listUnits } from '../../../api/search';
// ===== Types =====
type RootStackParamList = {
    NotificationsScreen: undefined;
    ComposeEmailScreen: { prefill?: { scope:'user'|'unit'; id:string; label:string } } | undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Attachment = {
    type: "image" | "file";
    uri: string;
    name: string;
};

// ===== Helper for file icons =====
const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <Feather name="file-text" size={28} color="#4091E5" />;
    if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext ?? "")) {
        return <Feather name="file" size={28} color="#4091E5" />;
    }
    return <Feather name="file" size={28} color="#4091E5" />;
};

export default function ComposeEmailScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = (require('@react-navigation/native') as any).useRoute?.();
        const [fromEmail, setFromEmail] = useState<string>("");
        const [me, setMe] = useState<any>(null);
        const [to, setTo] = useState<string>("");
        const [toSelection, setToSelection] = useState<{ scope:'user'|'unit'; id:string; label:string }|null>(null);
    const [subject, setSubject] = useState<string>("");
    const [body, setBody] = useState<string>("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [attachModal, setAttachModal] = useState<boolean>(false);
        const [options, setOptions] = useState<Array<{ label:string; id:string; scope:'user'|'unit' }>>([]);
        const [searching, setSearching] = useState(false);

                useEffect(()=>{
            (async()=>{
                try{ const raw = await AsyncStorage.getItem('user'); if(raw){ const u = JSON.parse(raw); setMe(u); setFromEmail(u?.email||''); } }catch{}
                                // Prefill recipient if provided
                                try{
                                    const pre = route?.params?.prefill;
                                    if(pre && pre.label){ setTo(pre.label); setToSelection({ scope: pre.scope, id: pre.id, label: pre.label }); }
                                }catch{}
            })();
        },[]);

    // ===== Open Attach Modal =====
    const handleAttach = () => {
        setAttachModal(true);
    };

    // ===== Pick Image =====
    const pickImage = async () => {
        setAttachModal(false);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Required", "Allow media library access to attach images.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
            setAttachments((prev) => [ ...prev, { type: "image", uri: result.assets[0].uri, name: (result.assets[0] as any).fileName || "image.jpg" } ]);
        }
    };

    // ===== Pick File =====
    const pickFile = async () => {
        setAttachModal(false);
        const result = await DocumentPicker.getDocumentAsync({
            type: "*/*",
            copyToCacheDirectory: true,
            multiple: false,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const file = result.assets[0];
            setAttachments((prev) => [
                ...prev,
                {
                    type: 'file',
                    uri: file.uri,
                    name: file.name ?? 'Unnamed file',
                },
            ]);
        }
    };

    // ===== Remove Attachment =====
    const removeAttachment = (idx: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== idx));
    };

        // ===== Live search users and units =====
        const onChangeTo = async (val: string) => {
            setTo(val); setToSelection(null);
            const q = val.trim(); if(!q || q.length < 2){ setOptions([]); return; }
            setSearching(true);
            try{
                const [users, units] = await Promise.all([
                    searchUsers(q),
                    listUnits({})
                ]);
                const unitOpts = (units||[]).filter((u:any)=> (u?.name||'').toLowerCase().includes(q.toLowerCase())).slice(0,10).map((u:any)=> ({ label:`${u.name} (Unit)`, id:String(u._id), scope:'unit' as const }));
                const userOpts = (users||[]).slice(0,10).map((u:any)=> ({ label:`${u.firstName||''} ${u.surname||''}`.trim() || u.email || u.phone, id:String(u._id), scope:'user' as const }));
                setOptions([ ...unitOpts, ...userOpts ]);
            } catch(e:any){ /* ignore */ }
            finally{ setSearching(false); }
        };

        const chooseOption = (opt: { label:string; id:string; scope:'user'|'unit' }) => {
            setTo(opt.label); setToSelection(opt); setOptions([]);
        };

        // ===== Send via backend =====
        const handleSend = async () => {
                if (!toSelection) {
                        Alert.alert("Recipient Required", "Please pick a user or unit from suggestions.");
                        return;
                }
                if (!subject.trim() && !body.trim() && attachments.length===0) {
                        Alert.alert("Empty message", "Type a message or add an attachment.");
                        return;
                }
                try{
                    // Upload attachments first
                    const uploaded: any[] = [];
                    for(const a of attachments){
                        if(a.uri){
                            try{ const up = await uploadMessageFile({ uri: a.uri, name: a.name }); if(up?.ok && up.url) uploaded.push({ url: up.url, name: a.name, type: a.type }); }
                            catch(e:any){ Toast.show({ type:'error', text1:'Upload failed', text2: a.name }); }
                        }
                    }
                    const payload: any = { subject: subject.trim(), text: body.trim(), attachments: uploaded };
                    if(toSelection.scope==='user') payload.toUserId = toSelection.id; else payload.toUnitId = toSelection.id;
                    const res = await sendMessage(payload);
                    if(res?.ok){
                        Toast.show({ type:'success', text1:'Message sent' });
                        navigation?.goBack();
                    } else {
                        Toast.show({ type:'error', text1:'Send failed', text2: res?.message || 'Unknown error' });
                    }
                }catch(e:any){
                    Toast.show({ type:'error', text1:'Send failed', text2: e?.message });
                }
        };

    return (
        <SafeAreaView style={styles.container}>
            {/* ===== Attach Modal ===== */}
            <Modal
                visible={attachModal}
                animationType="fade"
                transparent
                onRequestClose={() => setAttachModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setAttachModal(false)}>
                    <View style={styles.attachModal}>
                        <Text style={styles.attachTitle}>Attach File</Text>
                        <Text style={styles.attachSubtitle}>Choose the type of attachment</Text>
                        <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 24 }}>
                            <TouchableOpacity style={styles.attachOption} onPress={pickImage}>
                                <View style={styles.attachIconWrap}>
                                    <Feather name="image" size={30} color="#4091E5" />
                                </View>
                                <Text style={styles.attachOptionText}>Image</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.attachOption} onPress={pickFile}>
                                <View style={styles.attachIconWrap}>
                                    <Feather name="file" size={30} color="#4091E5" />
                                </View>
                                <Text style={styles.attachOptionText}>File</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.attachCancel} onPress={() => setAttachModal(false)}>
                            <Text style={{ color: "#4091E5", fontWeight: "700", fontSize: 15 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* ===== Header ===== */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation?.goBack()}>
                    <Ionicons name="arrow-back" size={26} color="#222" />
                </TouchableOpacity>
                <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={handleAttach}>
                        <Feather name="paperclip" size={22} color="#222" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSend} style={{ marginLeft: 18 }}>
                        <MaterialIcons name="send" size={26} color="#4091E5" />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginLeft: 18 }}>
                        <Feather name="more-vertical" size={22} color="#222" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ===== Form ===== */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView>
                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>From</Text>
                        <Text style={styles.inputValue}>{fromEmail}</Text>
                    </View>
                                        <View style={styles.inputRow}>
                                                <Text style={styles.inputLabel}>To</Text>
                                                <View style={{ flex:1 }}>
                                                    <TextInput
                                                            style={styles.inputValue}
                                                            placeholder="Type name, email, phone, or unit"
                                                            autoCapitalize="none"
                                                            value={to}
                                                            onChangeText={onChangeTo}
                                                            autoFocus
                                                    />
                                                    {options.length>0 && (
                                                        <View style={styles.suggestions}>
                                                            {options.map((opt, idx)=> (
                                                                <TouchableOpacity key={idx} style={styles.suggestionItem} onPress={()=> chooseOption(opt)}>
                                                                    <Text style={styles.suggestionText} numberOfLines={1}>{opt.label}</Text>
                                                                    <Text style={styles.suggestionTag}>{opt.scope==='unit'? 'Unit':'User'}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                        </View>
                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Subject</Text>
                        <TextInput
                            style={styles.inputValue}
                            placeholder="Subject"
                            value={subject}
                            onChangeText={setSubject}
                        />
                    </View>

                    {/* ===== Attachments Preview ===== */}
                    {attachments.length > 0 && (
                        <View style={styles.attachmentsPreview}>
                            {attachments.map((a, i) => (
                                <View key={i} style={styles.attachmentItem}>
                                    {a.type === "image" ? (
                                        <Image source={{ uri: a.uri }} style={styles.attachmentImage} />
                                    ) : (
                                        <View style={styles.attachmentFile}>{getFileIcon(a.name)}</View>
                                    )}
                                    <Text style={styles.attachmentName} numberOfLines={1}>
                                        {a.name}
                                    </Text>
                                    <TouchableOpacity onPress={() => removeAttachment(i)} style={styles.removeAttachmentBtn}>
                                        <Feather name="x-circle" size={18} color="#d22" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    <TextInput
                        style={styles.bodyInput}
                        placeholder="Compose email"
                        multiline
                        value={body}
                        onChangeText={setBody}
                        textAlignVertical="top"
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ===== Styles =====
const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: "#fff" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingTop: heightPercentageToDP('6%'),
        paddingBottom: 10,
        justifyContent: "space-between",
        borderBottomWidth: 0.6,
        borderBottomColor: "#ececec",
        backgroundColor: "#fff",
    },
    headerIcons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderColor: "#ececec",
        paddingHorizontal: 18,
        height: 50,
        backgroundColor: "#fff",
    },
    inputLabel: {
        width: 60,
        fontWeight: "500",
        color: "#222",
        fontSize: 14,
    },
    inputValue: {
        flex: 1,
        fontSize: 15,
        color: "#222",
        paddingLeft: 8,
        textAlignVertical: "center",
        height: 50,
    },
        suggestions: {
            position: 'absolute',
            top: 50,
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#ececec',
            borderRadius: 8,
            zIndex: 10,
            elevation: 4,
        },
        suggestionItem: {
            paddingHorizontal: 10,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#f5f5f5',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        suggestionText: { flex:1, color:'#222' },
        suggestionTag: { color:'#4091E5', fontWeight:'700' },
    attachmentsPreview: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: 18,
        marginVertical: 10,
        gap: 8,
    },
    attachmentItem: {
        alignItems: "center",
        marginRight: 15,
        marginBottom: 10,
        position: "relative",
        width: 70,
    },
    attachmentImage: {
        width: 50,
        height: 50,
        borderRadius: 10,
        backgroundColor: "#f0f0f0",
        marginBottom: 2,
    },
    attachmentFile: {
        width: 50,
        height: 50,
        borderRadius: 10,
        backgroundColor: "#f0f0f0",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 2,
    },
    attachmentName: {
        fontSize: 10,
        maxWidth: 60,
        color: "#333",
        marginBottom: 2,
        textAlign: "center",
    },
    removeAttachmentBtn: {
        position: "absolute",
        top: -8,
        right: -8,
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 1,
        zIndex: 2,
    },
    bodyInput: {
        minHeight: 200,
        fontSize: 16,
        color: "#222",
        paddingHorizontal: 18,
        paddingVertical: 16,
        backgroundColor: "#fff",
        textAlignVertical: "top",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.30)",
        justifyContent: "center",
        alignItems: "center",
    },
    attachModal: {
        backgroundColor: "#fff",
        borderRadius: 18,
        width: 310,
        alignItems: "center",
        padding: 26,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
        elevation: 6,
    },
    attachTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#222",
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    attachSubtitle: {
        fontSize: 14,
        color: "#777",
        marginBottom: 18,
        textAlign: "center",
    },
    attachOption: {
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 10,
        marginBottom: 2,
    },
    attachIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: "#F3F7FB",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
        borderWidth: 1.2,
        borderColor: "#E5ECF4",
    },
    attachOptionText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#4091E5",
    },
    attachCancel: {
        marginTop: 18,
        alignSelf: "center",
        paddingVertical: 7,
        paddingHorizontal: 30,
        borderRadius: 14,
        backgroundColor: "#F3F7FB",
        borderWidth: 1,
        borderColor: "#E5ECF4",
    },
});
