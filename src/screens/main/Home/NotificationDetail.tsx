import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ListRenderItemInfo,
  Image,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import Toast from 'react-native-toast-message';
import { heightPercentageToDP as responsiveHeight } from "react-native-responsive-screen";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { eventBus } from '../../../utils/eventBus';

// ----- Types -----
interface ConversationRef {
  id: string; // 'user:<id>' | 'unit:<id>'
  latest: any;
  isUnit: boolean;
  peer: any;
}

type RootStackParamList = {
    NotificationsScreen: undefined;
  NotificationDetail: { notification: any };
    ComposeEmailScreen: undefined;
};


type NotificationDetailNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "NotificationDetail"
>;
type NotificationDetailRouteProp = RouteProp<
  RootStackParamList,
  "NotificationDetail"
>;

// ----- Component -----
export default function NotificationDetailScreen() {
  const navigation = useNavigation<NotificationDetailNavProp>();
  const route = useRoute<NotificationDetailRouteProp>();
  const { notification } = route.params as any as { notification: ConversationRef };

  const [replyModalVisible, setReplyModalVisible] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>("");
  const [replyAttachments, setReplyAttachments] = useState<Array<{ type:'image'|'file'; uri:string; name:string }>>([]);

  const [messages, setMessages] = useState<any[]>([]);
  const [preview, setPreview] = useState<{ visible:boolean; url?:string }>(()=>({ visible:false }));
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [scope, peerId] = (notification?.id || '').split(':') as ['user'|'unit', string];
  const [meId, setMeId] = useState<string | null>(null);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [emojiPicker, setEmojiPicker] = useState<{ visible:boolean; msg?:any }>({ visible:false });
  const [ownerAction, setOwnerAction] = useState<{ visible:boolean; msg?:any }>({ visible:false });
  const [singleDelete, setSingleDelete] = useState<{ visible:boolean; id?:string }>({ visible:false });
  const commonEmoji = ['👍','❤️','😂','🙏','👏','🎉','🔥','📝'];

  const load = useCallback(async()=>{
    try {
      const api = await import('../../../api/messages');
      const res = await api.fetchConversation(scope, peerId);
      setMessages(res.messages||[]);
      await api.markRead(scope, peerId);
      // notify others to refresh counts fast
      eventBus.emit('SOJ_MESSAGE');
    } catch(e){ /* noop */ }
  }, [scope, peerId]);

  useEffect(()=>{ load(); }, [load]);

  useEffect(()=>{
    (async()=>{
      try{ const raw = await AsyncStorage.getItem('user'); if(raw){ const u = JSON.parse(raw); if(u?._id) setMeId(String(u._id)); } }catch{}
    })();
  },[]);

  // Live refresh on incoming messages and presence
  useEffect(()=>{
    const off = eventBus.on('SOJ_MESSAGE', ()=>{ load(); });
    const off2 = eventBus.on('SOJ_PRESENCE', (ids:string[])=> setOnlineIds(ids||[]));
    return () => { off && off(); off2 && off2(); };
  }, [load]);

  const handleReply = () => {
    setReplyModalVisible(true);
  };

  const handleSendReply = async () => {
    if (replyText.trim().length === 0 && replyAttachments.length===0) return;
    setSending(true);
    const tempId = 'temp-' + Date.now();
    try{
      const api = await import('../../../api/messages');
      // optimistic add to UI for responsiveness
      const optimisticMsg: any = {
        _id: tempId,
        from: { _id: meId },
        to: scope==='user' ? { _id: peerId } : undefined,
        toUnit: scope==='unit' ? { _id: peerId } : undefined,
        text: replyText.trim(),
        attachments: replyAttachments.map(a=> ({ url: a.uri, name: a.name, type: a.type })),
        reactions: [],
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages(prev => [...prev, optimisticMsg]);
      // close modal immediately for perceived performance
      setReplyModalVisible(false);

      // upload attachments in parallel
      const uploaded = await Promise.all(replyAttachments.map(async a => {
        try{
          const up = await (await import('../../../api/messages')).uploadMessageFile({ uri: a.uri, name: a.name });
          if(up?.ok && up.url) return { url: up.url, name: a.name, type: a.type, publicId: up.public_id, resourceType: up.resource_type };
        }catch{}
        return null;
      }));
      const cleanUploaded = uploaded.filter(Boolean);
      const payload: any = { subject: '', text: replyText.trim(), attachments: cleanUploaded };
      if(scope==='user') payload.toUserId = peerId; else payload.toUnitId = peerId;
      const sentRes = await api.sendMessage(payload);
      // swap temp with server message if available
      if(sentRes?.message){
        setMessages(prev => prev.map(m => String(m._id)===String(tempId) ? sentRes.message : m));
      } else {
        // if no server message returned, fallback to full reload
        await load();
      }
      // clear input
      setReplyText(''); setReplyAttachments([]);
      eventBus.emit('SOJ_MESSAGE');
      Toast.show({ type:'success', text1:'Sent', text2:'Your message was delivered.' });
    } catch(e:any){
      // rollback optimistic on error
      setMessages(prev => prev.filter(m => String(m._id) !== String(tempId)));
      Toast.show({ type:'error', text1:'Failed to send', text2: e?.message || 'Please try again.' });
    } finally{ setSending(false); }
  };

  const pickImage = async () => {
    try{
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(status !== 'granted') return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if(!result.canceled && result.assets?.[0]?.uri){
        setReplyAttachments(prev=>[...prev, { type:'image', uri: result.assets[0].uri, name: (result.assets[0] as any).fileName || 'image.jpg' }]);
      }
    }catch{}
  };
  const pickFile = async () => {
    try{
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({ type:'*/*', copyToCacheDirectory:true, multiple:false });
      if(!result.canceled && result.assets && result.assets.length>0){
        const f = result.assets[0];
        setReplyAttachments(prev=>[...prev, { type:'file', uri: f.uri, name: f.name || 'file' }]);
      }
    }catch{}
  };

  const handleDelete = () => { setConfirmVisible(true); };
  const confirmDeleteConversation = async () => {
    setConfirmVisible(false);
    try{
      const api = await import('../../../api/messages');
      await api.deleteConversation(scope, peerId);
      eventBus.emit('SOJ_MESSAGE');
      navigation.goBack();
    }catch(e:any){ Toast.show({ type:'error', text1:'Delete failed', text2: e?.message || 'Please try again.' }); }
  };

  const onLongPressMessage = (item:any) => {
    const isMine = meId && item?.from && String(item.from._id) === String(meId);
    const isPending = String(item?._id||'').startsWith('temp-') || !!item?.pending;
    if (isMine) {
      if (isPending) {
        Toast.show({ type:'info', text1:'Please wait', text2:'You can delete after it sends.' });
        return;
      }
      setOwnerAction({ visible:true, msg:item });
    } else {
      // quick picker of emoji reactions for others' messages
      setEmojiPicker({ visible:true, msg:item });
    }
  };

  const toggleReaction = async(emoji:string)=>{
    try{
      const has = (emojiPicker.msg?.reactions||[]).some((r:any)=> r.emoji===emoji && (r.users||[]).some((u:any)=> String(u)===String(meId)));
      const api = await import('../../../api/messages');
      if(has) await api.removeReaction(emojiPicker.msg._id, emoji); else await api.addReaction(emojiPicker.msg._id, emoji);
      await load();
    }finally{ setEmojiPicker({ visible:false }); }
  };

  const deleteSingleMessage = async(id:string)=>{
    try{ const api = await import('../../../api/messages'); await api.deleteMessage(id); await load(); eventBus.emit('SOJ_MESSAGE'); }
    catch{}
  };

  const renderMsg = ({ item }: ListRenderItemInfo<any>) => {
  const right = meId ? (item?.from && String(item.from._id) === meId) : false;
  const isPending = String(item?._id||'').startsWith('temp-') || !!item?.pending;
    return (
      <TouchableOpacity activeOpacity={0.8} onLongPress={()=> onLongPressMessage(item)} style={[styles.msgRow, right? styles.right: styles.left]}>
        {!right && (
          <View style={styles.msgAvatar}>
            <Ionicons name="person" size={18} color="#fff"/>
            <View style={{ position:'absolute', bottom:-1, right:-1, width:9, height:9, borderRadius:5, backgroundColor: onlineIds.includes(String(item?.from?._id)) ? '#349DC5' : '#ef4444', borderWidth:1, borderColor:'#fff' }} />
          </View>
        )}
        <View style={[styles.bubble, right? styles.bubbleRight: styles.bubbleLeft]}>
          {!!item.subject && <Text style={styles.msgSubject} numberOfLines={1}>{item.subject}</Text>}
          {!!item.text && <Text style={styles.msgText}>{item.text}</Text>}
          {/* attachments preview */}
          {(item.attachments||[]).map((a:any, idx:number)=> {
            const isImg = (a.type||'').startsWith('image') || /\.(png|jpg|jpeg|gif|webp|heic|bmp)$/i.test(a.url||'');
            if(isImg){
              return (
                <TouchableOpacity onPress={()=> setPreview({ visible:true, url: a.url })} key={idx} style={{ marginTop:6 }}>
                  <Image source={{ uri: a.url }} style={{ width:180, height:120, backgroundColor:'#f1f5f9', borderRadius:10 }} resizeMode="cover"/>
                  {!!a.name && <Text style={{ fontSize:12, color:'#475569', marginTop:4 }} numberOfLines={1}>{a.name}</Text>}
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity key={idx} onPress={()=> Linking.openURL(a.url)}>
                <Text style={styles.attachmentLink} numberOfLines={1}>Attachment: {a.name||a.url}</Text>
              </TouchableOpacity>
            );
          })}
          {/* Reaction row */}
          {(item.reactions && item.reactions.length>0) && (
            <View style={{ flexDirection:'row', marginTop:6, gap:8 }}>
              {item.reactions.map((r:any)=> (
                <View key={r.emoji} style={{ flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:12, paddingHorizontal:8, paddingVertical:2, borderWidth:1, borderColor:'#e5e7eb' }}>
                  <Text style={{ fontSize:12 }}>{r.emoji}</Text>
                  <Text style={{ fontSize:10, color:'#475569', marginLeft:4 }}>{(r.users||[]).length}</Text>
                </View>
              ))}
            </View>
          )}
          {/* Pending/sending indicator for optimistic messages */}
          {right && isPending && (
            <View style={{ flexDirection:'row', alignItems:'center', alignSelf:'flex-end', marginTop:6 }}>
              <ActivityIndicator size="small" color="#64748b" style={{ marginRight:6 }} />
              <Text style={{ fontSize:11, color:'#64748b' }}>Sending…</Text>
            </View>
          )}
          {/* deletion moved to long-press owner action sheet */}
        </View>
        {right && (
          <View style={styles.msgAvatar}>
            <Ionicons name="person" size={18} color="#fff"/>
            <View style={{ position:'absolute', bottom:-1, right:-1, width:9, height:9, borderRadius:5, backgroundColor: onlineIds.includes(String(meId||'')) ? '#349DC5' : '#ef4444', borderWidth:1, borderColor:'#fff' }} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#222" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {notification?.latest?.subject || (notification?.isUnit ? notification?.peer?.name : `${notification?.peer?.firstName||''} ${notification?.peer?.surname||''}`.trim()) || 'Conversation'}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <MaterialIcons name="delete" size={22} color="#222" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton}>
            <Feather name="archive" size={22} color="#222" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton}>
            <Feather name="more-vertical" size={22} color="#222" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color="#fff" />
          </View>

          <Text style={styles.emailText} numberOfLines={1}>
            {notification?.isUnit ? notification?.peer?.name : `${notification?.peer?.firstName||''} ${notification?.peer?.surname||''}`.trim()}
          </Text>

          <Text style={styles.daysAgoText}>
            {new Date(notification?.latest?.createdAt||Date.now()).toLocaleDateString('en-NG', { year:'numeric', month:'short', day:'numeric', timeZone:'Africa/Lagos' })}
          </Text>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(it, idx) => it._id || String(idx)}
          renderItem={renderMsg}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Reply Bar */}
      <View style={styles.replyBar}>
        <TouchableOpacity
          style={styles.replyButton}
          activeOpacity={0.7}
          onPress={handleReply}
        >
          <Ionicons name="arrow-undo" size={20} color="#aaa" />
          <Text style={styles.replyLabel}>Reply</Text>
        </TouchableOpacity>
      </View>

      {/* Reply Modal */}
      <Modal visible={replyModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.replyModal}>
            <Text style={styles.modalTitle}>
              Reply to {notification?.isUnit ? (notification?.peer?.name||'Unit') : (`${notification?.peer?.firstName||''} ${notification?.peer?.surname||''}`.trim() || 'User')}
            </Text>

            <TextInput
              style={styles.replyInput}
              placeholder="Type your reply..."
              multiline
              value={replyText}
              onChangeText={setReplyText}
              placeholderTextColor="#999"
            />

            {/* Reply attachments preview */}
            {replyAttachments.length>0 && (
              <View style={{ flexDirection:'row', flexWrap:'wrap', marginTop:8 }}>
                {replyAttachments.map((a, idx)=> (
                  <View key={idx} style={{ width:64, marginRight:10, marginBottom:10 }}>
                    {a.type==='image' ? (
                      <View style={{ width:56, height:56, borderRadius:10, backgroundColor:'#f0f0f0', overflow:'hidden' }}>
                        {/* Lightweight image preview; can replace with expo-image for skeletons */}
                        <Feather name="image" size={22} color="#94a3b8" style={{ position:'absolute', top:17, left:17 }} />
                      </View>
                    ) : (
                      <View style={{ width:56, height:56, borderRadius:10, backgroundColor:'#f8fafc', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#e5e7eb' }}>
                        <Feather name="file" size={20} color="#64748b" />
                      </View>
                    )}
                    <Text numberOfLines={1} style={{ fontSize:10, color:'#334155', marginTop:4 }}>{a.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Attach buttons */}
            <View style={{ flexDirection:'row', alignItems:'center', marginTop:8, gap:14 }}>
              <TouchableOpacity onPress={pickImage} style={{ paddingVertical:8, paddingHorizontal:12, backgroundColor:'#F3F7FB', borderRadius:10, borderWidth:1, borderColor:'#E5ECF4', flexDirection:'row', alignItems:'center' }}>
                <Feather name="image" size={18} color="#4091E5" />
                <Text style={{ marginLeft:8, color:'#4091E5', fontWeight:'700' }}>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickFile} style={{ paddingVertical:8, paddingHorizontal:12, backgroundColor:'#F3F7FB', borderRadius:10, borderWidth:1, borderColor:'#E5ECF4', flexDirection:'row', alignItems:'center' }}>
                <Feather name="paperclip" size={18} color="#4091E5" />
                <Text style={{ marginLeft:8, color:'#4091E5', fontWeight:'700' }}>File</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendReply} disabled={sending}>
                <Text style={[styles.sendText, sending && { opacity: 0.5 }]}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={preview.visible} transparent animationType="fade" onRequestClose={()=> setPreview({ visible:false })}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.9)', alignItems:'center', justifyContent:'center' }}>
          <TouchableOpacity onPress={()=> setPreview({ visible:false })} style={{ position:'absolute', top:50, right:20 }}>
            <Feather name="x" color="#fff" size={28} />
          </TouchableOpacity>
          {preview.url && (
            <Image source={{ uri: preview.url }} style={{ width:'92%', height:'70%' }} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Emoji picker sheet */}
      <Modal visible={emojiPicker.visible} transparent animationType="fade" onRequestClose={()=> setEmojiPicker({ visible:false })}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', alignItems:'center', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:14, width:'80%', padding:16 }}>
            <Text style={{ fontWeight:'700', color:'#0f172a', marginBottom:10 }}>React</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10 }}>
              {commonEmoji.map(e=> (
                <TouchableOpacity key={e} onPress={()=> toggleReaction(e)} style={{ padding:10, borderRadius:8, borderWidth:1, borderColor:'#e5e7eb' }}>
                  <Text style={{ fontSize:22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ alignItems:'flex-end', marginTop:12 }}>
              <TouchableOpacity onPress={()=> setEmojiPicker({ visible:false })}><Text style={{ color:'#64748B', fontWeight:'700' }}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Owner action sheet */}
      <Modal visible={ownerAction.visible} transparent animationType="fade" onRequestClose={()=> setOwnerAction({ visible:false })}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', alignItems:'center', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:14, width:'86%', padding:18 }}>
            <Text style={{ fontWeight:'800', fontSize:16, color:'#0f172a', marginBottom:6 }}>Message options</Text>
            <TouchableOpacity onPress={()=> { setOwnerAction({ visible:false, msg: ownerAction.msg }); setSingleDelete({ visible:true, id: ownerAction.msg?._id }); }} style={{ paddingVertical:12, borderBottomWidth:1, borderColor:'#eef2f7' }}>
              <Text style={{ color:'#ef4444', fontWeight:'700' }}>Delete message</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=> { setOwnerAction({ visible:false }); setEmojiPicker({ visible:true, msg: ownerAction.msg }); }} style={{ paddingVertical:12 }}>
              <Text style={{ color:'#0f172a', fontWeight:'700' }}>Add reaction</Text>
            </TouchableOpacity>
            <View style={{ alignItems:'flex-end', marginTop:8 }}>
              <TouchableOpacity onPress={()=> setOwnerAction({ visible:false })}><Text style={{ color:'#64748B', fontWeight:'700' }}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Single message delete confirmation (primary-accented) */}
      <Modal visible={singleDelete.visible} transparent animationType="fade" onRequestClose={()=> setSingleDelete({ visible:false })}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', alignItems:'center', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:16, width:'86%', padding:18 }}>
            <View style={{ alignItems:'center', marginBottom:10 }}>
              <View style={{ width:56, height:56, borderRadius:28, backgroundColor:'#e6f2fa', alignItems:'center', justifyContent:'center' }}>
                <Feather name="trash-2" size={24} color="#349DC5" />
              </View>
            </View>
            <Text style={{ fontWeight:'800', fontSize:16, color:'#0f172a', textAlign:'center' }}>Delete this message?</Text>
            <Text style={{ marginTop:8, color:'#334155', textAlign:'center' }}>This action can’t be undone.</Text>
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop:16 }}>
              <TouchableOpacity onPress={()=> setSingleDelete({ visible:false })} style={{ paddingVertical:10, paddingHorizontal:16, marginRight:8, borderWidth:1, borderColor:'#cbd5e1', borderRadius:8 }}>
                <Text style={{ color:'#0f172a', fontWeight:'700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async()=>{ const id = singleDelete.id; setSingleDelete({ visible:false }); if(id) { await deleteSingleMessage(id); } }} style={{ paddingVertical:10, paddingHorizontal:16, backgroundColor:'#ef4444', borderRadius:8 }}>
                <Text style={{ color:'#fff', fontWeight:'800' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modern confirm modal for conversation delete */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={()=> setConfirmVisible(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', alignItems:'center', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:14, width:'86%', padding:18 }}>
            <Text style={{ fontWeight:'700', fontSize:16, color:'#0f172a' }}>Delete conversation?</Text>
            <Text style={{ marginTop:8, color:'#334155' }}>This will remove the entire thread from your view.</Text>
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop:12 }}>
              <TouchableOpacity onPress={()=> setConfirmVisible(false)} style={{ paddingVertical:10, paddingHorizontal:16, marginRight:6 }}><Text style={{ color:'#64748B', fontWeight:'700' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteConversation} style={{ paddingVertical:10, paddingHorizontal:16, backgroundColor:'#e11d48', borderRadius:8 }}><Text style={{ color:'#fff', fontWeight:'800' }}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ----- Styles -----
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: responsiveHeight(5) },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    flex: 1,
    textAlign: "left",
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginHorizontal: 8,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    flex: 1,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2C94C",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emailText: {
    fontWeight: "600",
    color: "#222",
    fontSize: 14,
    flex: 1,
  },
  daysAgoText: {
    fontSize: 12,
    color: "#888",
    marginLeft: 8,
  },
  bodyText: {
    fontSize: 15,
    color: "#222",
    lineHeight: 24,
  },
  // chat styles
  msgRow:{ flexDirection:'row', alignItems:'flex-end', marginTop:10 },
  left:{ justifyContent:'flex-start' },
  right:{ justifyContent:'flex-end' },
  msgAvatar:{ width:26, height:26, borderRadius:13, backgroundColor:'#F2C94C', alignItems:'center', justifyContent:'center', marginHorizontal:8 },
  bubble:{ maxWidth:'70%', paddingHorizontal:12, paddingVertical:8, borderRadius:12 },
  bubbleLeft:{ backgroundColor:'#f3f4f6', borderTopLeftRadius:4 },
  bubbleRight:{ backgroundColor:'#dbeafe', borderTopRightRadius:4 },
  msgSubject:{ color:'#0f172a', fontWeight:'700', marginBottom:2 },
  msgText:{ color:'#111827' },
  attachmentLink:{ marginTop:4, color:'#2563eb', textDecorationLine:'underline' },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderTopColor: "#f0f0f0",
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingBottom: 60,
    backgroundColor: "#fff",
  },
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 32,
    paddingVertical: 10,
    elevation: 1,
  },
  replyLabel: {
    color: "#aaa",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  replyModal: {
    backgroundColor: "#fff",
    padding: 24,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    minHeight: 220,
  },
  modalTitle: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 12,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    minHeight: 60,
    padding: 12,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#fafafa",
    textAlignVertical: "top",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  cancelText: {
    color: "#888",
    marginRight: 24,
    fontWeight: "600",
  },
  sendText: {
    color: "#4091E5",
    fontWeight: "800",
    fontSize: 15,
  },
});
