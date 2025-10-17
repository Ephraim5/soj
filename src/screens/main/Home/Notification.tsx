import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
    ListRenderItem,
    StatusBar,
    Modal,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { heightPercentageToDP, heightPercentageToDP as responsiveHeight } from "react-native-responsive-screen";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp ,useNavigation} from "@react-navigation/native";
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listConversations, deleteConversation } from '../../../api/messages';
import { eventBus } from '../../../utils/eventBus';

// Types for navigation
interface Conversation {
  id: string; // key: user:<id> or unit:<id>
  latest: any;
  unread: number;
  peer: any; // user or unit (name/avatar)
  isUnit: boolean;
}

type RootStackParamList = {
    NotificationsScreen: undefined;
    NotificationDetail: { notification: any };
    ComposeEmailScreen: undefined;
};

type NotificationsScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    "NotificationsScreen"
>;

type NotificationsScreenRouteProp = RouteProp<
    RootStackParamList,
    "NotificationsScreen"
>;

interface NotificationsScreenProps {
    navigation: NotificationsScreenNavigationProp;
    route: NotificationsScreenRouteProp;
}

function fmtTime(t?: string){
  if(!t) return '';
  try{
    const d = new Date(t);
    // West Africa Time format, 12-hour
    return d.toLocaleTimeString('en-NG', { hour:'numeric', minute:'2-digit', hour12: true, timeZone: 'Africa/Lagos' });
  }catch{return ''}
}

export default function NotificationScreen() {
    const navigation = useNavigation<NotificationsScreenProps["navigation"]>();
    const [items, setItems] = useState<Conversation[]>([]);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{scope:'user'|'unit', id:string}|null>(null);
    const [onlineIds, setOnlineIds] = useState<string[]>([]);

    const load = useCallback(async()=>{
      try{ const res = await listConversations(); setItems(res.conversations||[]); }
      catch(e:any){ Toast.show({ type:'error', text1:'Failed to load', text2: e?.message }); }
    },[]);

        useEffect(()=>{ load(); }, [load]);

        // Live refresh when new messages arrive (from socket event bus)
        useEffect(()=>{
            const off = eventBus.on('SOJ_MESSAGE', ()=> { load(); });
            const off2 = eventBus.on('SOJ_PRESENCE', (ids:string[])=> setOnlineIds(ids||[]));
            return () => { off && off(); off2 && off2(); };
        }, [load]);

    const askDelete = (conv: Conversation)=>{
      const [scope, id] = conv.id.split(':') as ['user'|'unit', string];
      setPendingDelete({ scope, id }); setConfirmVisible(true);
    };

        const confirmDelete = async ()=>{
      if(!pendingDelete) return; setConfirmVisible(false);
            try{ await deleteConversation(pendingDelete.scope, pendingDelete.id); await load(); eventBus.emit('SOJ_MESSAGE'); }
      catch(e:any){ Toast.show({ type:'error', text1:'Delete failed', text2: e?.message }); }
      finally{ setPendingDelete(null); }
    };

        const handleDeleteAll = ()=>{
      // For now, iterate delete of each conversation for the user
      (async()=>{
                for(const c of items){
          const [scope, id] = c.id.split(':') as ['user'|'unit', string];
          try{ await deleteConversation(scope, id); }catch{}
        }
                await load();
                eventBus.emit('SOJ_MESSAGE');
      })();
    };

    const renderItem: ListRenderItem<Conversation> = ({ item }) => (
        <TouchableOpacity
            style={styles.notificationItem}
            onPress={() => navigation.navigate("NotificationDetail", { notification: item } as any)}
            onLongPress={() => askDelete(item)}
        >
                        <View style={styles.avatar}>
                <Ionicons name="person" size={28} color="#fff" />
                                {!item.isUnit && (
                                    <View style={{ position:'absolute', bottom:-1, right:-1, width:10, height:10, borderRadius:5, backgroundColor: onlineIds.includes(String(item.peer?._id)) ? '#349DC5' : '#ef4444', borderWidth:1, borderColor:'#fff' }} />
                                )}
            </View>
            <View style={styles.notificationText}>
                <Text style={styles.senderName} numberOfLines={1}>
                  {item.isUnit ? (item.peer?.name || 'Group') : `${item.peer?.firstName||''} ${item.peer?.surname||''}`.trim() || 'User'}
                </Text>
                <Text style={styles.groupName} numberOfLines={1}>
                  {item.isUnit ? 'Unit' : 'Direct message'}
                </Text>
                <Text style={styles.messageText} numberOfLines={1}>
                  {(item.latest?.subject ? item.latest.subject + ' · ' : '') + (item.latest?.text || '')}
                </Text>
            </View>
                        <View style={styles.notificationMeta}>
                                <Text style={styles.timeText}>{fmtTime(item.latest?.createdAt)}</Text>
                                {item.unread > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{item.unread}</Text>
                                    </View>
                                )}
                        </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={26} color="#222" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity onPress={handleDeleteAll}>
                    <MaterialIcons name="delete" size={26} color="#222" />
                </TouchableOpacity>
            </View>
            {/* List */}
            <FlatList
                                data={items}
                renderItem={renderItem}
                                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 32 }}
            />
            {/* Floating Edit Icon */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("ComposeEmailScreen")}
            >
                <MaterialIcons name="edit" size={26} color="#222" />
            </TouchableOpacity>

                        {/* Modern confirm modal */}
                        <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={()=> setConfirmVisible(false)}>
                            <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', alignItems:'center', justifyContent:'center', padding:24 }}>
                                <View style={{ backgroundColor:'#fff', borderRadius:14, width:'86%', padding:18 }}>
                                    <Text style={{ fontWeight:'700', fontSize:16, color:'#0f172a' }}>Delete conversation?</Text>
                                    <Text style={{ marginTop:8, color:'#334155' }}>This will remove the entire thread from your view.</Text>
                                    <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop:12 }}>
                                        <TouchableOpacity onPress={()=> setConfirmVisible(false)} style={{ paddingVertical:10, paddingHorizontal:16, marginRight:6 }}><Text style={{ color:'#64748B', fontWeight:'700' }}>Cancel</Text></TouchableOpacity>
                                        <TouchableOpacity onPress={confirmDelete} style={{ paddingVertical:10, paddingHorizontal:16, backgroundColor:'#e11d48', borderRadius:8 }}><Text style={{ color:'#fff', fontWeight:'800' }}>Delete</Text></TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: "#fff", height:heightPercentageToDP('100%')},
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: heightPercentageToDP('6%'),
        paddingBottom: 12,
        justifyContent: "space-between",
        backgroundColor: "#fff",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#222",
    },
    notificationItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderBottomColor: "#f0f0f0",
        borderBottomWidth: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F2C94C",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    notificationText: { flex: 1 },
    senderName: { fontWeight: "700", fontSize: 15, color: "#222" },
    groupName: { fontWeight: "400", fontSize: 13, color: "#555" },
    messageText: {
        fontSize: 13,
        color: "#888",
        marginTop: 2,
    },
    notificationMeta: {
        alignItems: "flex-end",
        justifyContent: "flex-end",
    },
    timeText: {
        fontSize: 13,
        color: "#4091E5",
        fontWeight: "600",
    },
    unreadBadge: {
        marginTop: 6,
        backgroundColor: "#4091E5",
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    unreadText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
    fab: {
        position: "absolute",
        bottom: 28,
        right: 28,
        backgroundColor: "#fff",
        borderRadius: 32,
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
});
