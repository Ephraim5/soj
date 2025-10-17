import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, SafeAreaView, StatusBar, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, ActivityIndicator, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import ModernLoader from '../../../loader/load';

interface Activity { _id:string; title:string; description?:string; progressPercent?:number; status?:string; reviewStatus?:string; reviewRating?:number; reviewRejectionReason?:string; reviewComments?:{ _id:string; message:string; user?:string; createdAt?:string }[]; resources?:string[]; progressUpdates?: { _id:string; message?:string; progressPercent?:number; createdAt?:string; user?:{ firstName?:string; surname?:string } }[]; }
interface Plan { _id:string; title:string; activities: Activity[]; }
 interface WorkPlan { _id:string; title:string; generalGoal?:string; status:string; progressPercent:number; plans:Plan[]; startDate?:string; endDate?:string; reviewRating?:number; reviewComments?:{ _id:string; message:string; user?:string; createdAt?:string }[]; rejectionReason?:string; successRate?:number; successCategory?:'low'|'good'|'perfect'; successRatedAt?:string; successFeedback?:string; }

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://streamsofjoyumuahia-api.onrender.com';

const statusColor = (s:string) => ({ approved:'#0f766e', pending:'#f59e0b', draft:'#64748b', rejected:'#dc2626', ignored:'#475569' } as any)[s] || '#334155';

const AdminViewWorkPlanScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params || {};
  const [item, setItem] = useState<WorkPlan| null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [decisionModal, setDecisionModal] = useState<'approve'|'reject'|null>(null);
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);

  const [activityModal, setActivityModal] = useState<{ activity:Activity; mode:'approve'|'reject' }|null>(null);
  const [activityRating, setActivityRating] = useState('');
  const [activityComment, setActivityComment] = useState('');
  const [activityReason, setActivityReason] = useState('');
  const [savingActivityDecision, setSavingActivityDecision] = useState(false);
  // Success rate modal state
  const [successModal, setSuccessModal] = useState(false);
  const [successStars, setSuccessStars] = useState(0); // 0..5 half increments
  const [successSaving, setSuccessSaving] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<'low'|'good'|'perfect'|null>(null);
  const [successFeedback, setSuccessFeedback] = useState('');

  const togglePlan = (pid:string) => setExpandedPlans(p => ({ ...p, [pid]: !p[pid] }));

  const load = useCallback(async () => {
    if(!id) return; setLoading(true); setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if(!token) throw new Error('Missing auth token');
      const resp = await fetch(`${API_BASE}/api/workplans/${id}`, { headers:{ Authorization:`Bearer ${token}` } });
      if(!resp.ok){ const t = await resp.text(); throw new Error(`Fetch failed (${resp.status}) ${t}`); }
      const json = await resp.json();
      if(!json.ok) throw new Error(json.error||'Failed');
      setItem(json.item);
    } catch(e:any){ setError(e.message); } finally { setLoading(false); }
  }, [id]);

  useEffect(()=>{ load(); },[load]);

  const submitDecision = async (mode:'approve'|'reject') => {
    if(!item) return; setSavingDecision(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if(!token) throw new Error('Missing auth token');
      const body:any = { rating: rating? Number(rating): undefined, comment: comment || undefined };
      if(mode==='reject') body.reason = reason || 'No reason provided';
      const url = mode==='approve' ? `${API_BASE}/api/workplans/${item._id}/review/approve` : `${API_BASE}/api/workplans/${item._id}/review/reject`;
      const resp = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
      if(!resp.ok){ const t = await resp.text(); throw new Error(`Decision failed (${resp.status}) ${t}`); }
      const json = await resp.json();
      if(!json.ok) throw new Error(json.error||'Failed');
      setItem(json.item); setDecisionModal(null); setRating(''); setComment(''); setReason('');
    } catch(e:any){ setError(e.message); }
    finally { setSavingDecision(false); }
  };

  const submitActivityDecision = async () => {
    if(!item || !activityModal) return; setSavingActivityDecision(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if(!token) throw new Error('Missing auth token');
      const body:any = { activityId: activityModal.activity._id, decision: activityModal.mode==='approve'?'approve':'reject', rating: activityRating? Number(activityRating): undefined, comment: activityComment || undefined };
      if(activityModal.mode==='reject') body.reason = activityReason || 'No reason provided';
      const resp = await fetch(`${API_BASE}/api/workplans/${item._id}/review/activity`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
      if(!resp.ok){ const t = await resp.text(); throw new Error(`Activity decision failed (${resp.status}) ${t}`); }
      const json = await resp.json();
      if(!json.ok) throw new Error(json.error||'Failed');
      setItem(json.item); setActivityModal(null); setActivityRating(''); setActivityComment(''); setActivityReason('');
    } catch(e:any){ setError(e.message); } finally { setSavingActivityDecision(false); }
  };

  const starsToPercent = (s:number)=> Math.round(s*20); // 5 => 100
  const deriveCategory = (pct:number) => pct < 40 ? 'low' : pct < 85 ? 'good' : 'perfect';

  const openSuccessModal = () => {
    if(!item) return;
    // prefill from existing successRate if exists
    if(item.successRate !== undefined){ setSuccessStars(item.successRate/20); }
    else { setSuccessStars(item.progressPercent/20); }
  setSuccessFeedback(item.successFeedback || '');
    setSuccessModal(true);
  };

  const submitSuccessRate = async () => {
    if(!item) return; setSuccessSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if(!token) throw new Error('Missing auth token');
      const pct = starsToPercent(successStars);
      const category = deriveCategory(pct);
      const body:any = { rate: pct, category, feedback: successFeedback || undefined };
      const resp = await fetch(`${API_BASE}/api/workplans/${item._id}/success-rate`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
      if(!resp.ok){ const t = await resp.text(); throw new Error(`Success rate failed (${resp.status}) ${t}`); }
      const json = await resp.json();
      if(!json.ok) throw new Error(json.error||'Failed');
      setItem(json.item);
      setSuccessModal(false);
      setFeedbackCategory(category);
    } catch(e:any){ setError(e.message); }
    finally { setSuccessSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
  <StatusBar barStyle="dark-content" />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={()=> nav.goBack()} style={{ padding:4 }}><Ionicons name="chevron-back" size={24} color="#111" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{item?.title || 'Work Plan Review'}</Text>
        <View style={{ width:40 }} />
      </View>
      {loading && <View style={{ paddingTop:40 }}><ModernLoader fullscreen={false} /></View>}
      {error && !loading && <Text style={{ color:'#dc2626', margin:16 }}>{error}</Text>}
      {!loading && item && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.statusRow}>
            <View style={[styles.statusChip,{ backgroundColor: statusColor(item.status)}]}><Text style={styles.statusText}>{item.status}</Text></View>
            {typeof item.reviewRating === 'number' && item.reviewRating>0 && (
              <View style={{ flexDirection:'row', marginLeft:12, alignItems:'center' }}>
                <StarDisplay value={item.reviewRating} size={16} />
                <Text style={styles.ratingText}>{item.reviewRating.toFixed(1)}</Text>
              </View>
            )}
            {typeof item.successRate === 'number' && (
              <View style={{ flexDirection:'row', marginLeft:12, alignItems:'center' }}>
                <StarDisplay value={ (item.successRate/20) } size={16} />
                <Text style={styles.ratingText}>{item.successRate}%</Text>
              </View>
            )}
          </View>
          {!!item.successFeedback && (
            <View style={styles.successFeedbackCard}>
              <Text style={styles.successFeedbackTitle}>Final Feedback</Text>
              <Text style={styles.successFeedbackText}>{item.successFeedback}</Text>
            </View>
          )}
          {item.status === 'approved' && item.successRate === undefined && (
            <TouchableOpacity onPress={openSuccessModal} style={styles.rateSuccessBtn}>
              <Ionicons name="analytics" size={16} color="#fff" style={{ marginRight:6 }} />
              <Text style={styles.rateSuccessText}>Rate Success</Text>
            </TouchableOpacity>
          )}
          {item.status==='rejected' && !!item.rejectionReason && (
            <View style={styles.rejectCard}> 
              <Ionicons name="alert-circle" size={16} color="#b91c1c" style={{ marginRight:10, marginTop:2 }} />
              <View style={{ flex:1 }}>
                <Text style={styles.rejectLabel}>Rejected</Text>
                <Text style={styles.rejectReason}>{item.rejectionReason}</Text>
              </View>
            </View>
          )}
          <Text style={styles.sectionLabel}>General Goal</Text>
          <View style={styles.readonlyBox}><Text style={styles.readonlyText}>{item.generalGoal || '—'}</Text></View>
          {Array.isArray(item.reviewComments) && item.reviewComments.length > 0 && (
            <View style={{ marginTop:26 }}>
              <Text style={styles.sectionLabel}>Reviewer Comments</Text>
              <View style={styles.commentsWrap}>
                {item.reviewComments.map(c => (
                  <View key={c._id} style={styles.commentRow}>
                    <Ionicons name="chatbubble-ellipses" size={14} color="#349DC5" style={{ marginRight:8, marginTop:2 }} />
                    <View style={{ flex:1 }}>
                      <Text style={styles.commentText}>{c.message}</Text>
                      {c.createdAt && <Text style={styles.commentMeta}>{new Date(c.createdAt).toLocaleString(undefined,{ day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          <Text style={[styles.sectionLabel,{ marginTop:26 }]}>Plans</Text>
          {item.plans.map(plan => {
            const expanded = expandedPlans[plan._id];
            return (
              <View key={plan._id} style={styles.planWrapper}>
                <TouchableOpacity onPress={()=> togglePlan(plan._id)} style={styles.planHeaderRow}>
                  <Text style={styles.planTitle}>{plan.title}</Text>
                  <Ionicons name={expanded? 'chevron-up':'chevron-down'} size={18} color="#111" />
                </TouchableOpacity>
                {expanded && (
                  <View style={{ marginTop:12 }}>
                    {plan.activities.map(act => (
                      <View key={act._id} style={styles.activityCard}>
                        <View style={styles.activityHeaderRow}>
                          <Text style={styles.activityTitle}>{act.title}</Text>
                          <View style={[styles.activityReviewStatusChip, { backgroundColor: act.reviewStatus==='approved' ? '#0f766e' : act.reviewStatus==='rejected' ? '#dc2626' : '#f59e0b' }]}>
                            <Text style={styles.activityReviewStatusText}>{act.reviewStatus}</Text>
                          </View>
                        </View>
                        {act.description && <Text style={styles.descText}>{act.description}</Text>}
                        {!!(act.resources && act.resources.length) && (
                          <View style={styles.resourcesBlock}>
                            <View style={styles.resourcesHeaderRow}>
                              <Ionicons name="cube" size={14} color="#0369a1" style={{ marginRight:6 }} />
                              <Text style={styles.resourcesHeaderText}>Resources Needed</Text>
                            </View>
                            <View style={styles.resourceChipsRow}>
                              {act.resources.map(r => (
                                <View key={r} style={styles.resourceChip}><Text style={styles.resourceChipText}>{r}</Text></View>
                              ))}
                            </View>
                          </View>
                        )}
                        {act.reviewRejectionReason && (
                          <Text style={styles.activityRejectReason}>Reason: {act.reviewRejectionReason}</Text>
                        )}
                        {typeof act.reviewRating==='number' && act.reviewRating>0 && (
                          <View style={{ flexDirection:'row', alignItems:'center', marginTop:6 }}>
                            <StarDisplay value={act.reviewRating} size={14} />
                            <Text style={{ marginLeft:4, fontSize:11, fontWeight:'600', color:'#0f172a' }}>{act.reviewRating.toFixed(1)}</Text>
                          </View>
                        )}
                        {Array.isArray(act.reviewComments) && act.reviewComments.length > 0 && (
                          <View style={[styles.commentsWrap,{ marginTop:10 }]}> 
                            {act.reviewComments.map(rc => (
                              <View key={rc._id} style={styles.commentRow}>
                                <Ionicons name="chatbubble-ellipses" size={13} color="#349DC5" style={{ marginRight:8, marginTop:2 }} />
                                <View style={{ flex:1 }}>
                                  <Text style={styles.commentText}>{rc.message}</Text>
                                  {rc.createdAt && <Text style={styles.commentMeta}>{new Date(rc.createdAt).toLocaleString(undefined,{ month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</Text>}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                        {Array.isArray(act.progressUpdates) && act.progressUpdates.length>0 && (
                          <View style={styles.progressTimelineWrap}>
                            <Text style={styles.timelineLabel}>Progress Timeline</Text>
                            {act.progressUpdates.slice().sort((a,b)=> new Date(a.createdAt||'').getTime() - new Date(b.createdAt||'').getTime()).map(up => (
                              <View key={up._id} style={styles.timelineRow}>
                                <View style={styles.timelineDot} />
                                <View style={styles.timelineContent}>
                                  <Text style={styles.timelinePercent}>{typeof up.progressPercent === 'number' ? up.progressPercent+'%' : '—'}</Text>
                                  {!!up.message && <Text style={styles.timelineMessage}>{up.message}</Text>}
                                  <Text style={styles.timelineMeta}>{up.createdAt ? new Date(up.createdAt).toLocaleString(undefined,{ month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : ''}</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                        <View style={styles.activityActionsRow}>
                          {(act.reviewStatus==='pending' || !act.reviewStatus) && (
                            <>
                              <TouchableOpacity style={[styles.smallBtn, styles.approveBtnPrimary]} onPress={()=> setActivityModal({ activity: act, mode:'approve' })}>
                                <Text style={styles.smallBtnText}>Approve</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={[styles.smallBtn, styles.rejectBtn]} onPress={()=> setActivityModal({ activity: act, mode:'reject' })}>
                                <Text style={styles.smallBtnText}>Reject</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
      {!loading && item && item.status === 'pending' && (
        <View style={styles.footerBar}>
          <TouchableOpacity style={[styles.decisionBtn, styles.approveDecisionBtnPrimary]} onPress={()=> setDecisionModal('approve')}>
            <Text style={styles.decisionBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.decisionBtn, styles.rejectDecisionBtn]} onPress={()=> setDecisionModal('reject')}>
            <Text style={styles.decisionBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Decision Modal */}
      <Modal visible={!!decisionModal} transparent animationType="fade" onRequestClose={()=> !savingDecision && setDecisionModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{decisionModal==='approve'? 'Approve Work Plan':'Reject Work Plan'}</Text>
              <TouchableOpacity disabled={savingDecision} onPress={()=> setDecisionModal(null)} style={styles.closeIconBtn}><Ionicons name="close" size={20} color="#0f172a" /></TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Rating</Text>
            <StarRater value={Number(rating)||0} onChange={(v)=> setRating(String(v))} />
            <Text style={styles.inputLabel}>Comment</Text>
            <TextInput value={comment} onChangeText={setComment} style={[styles.textArea]} multiline placeholder="Optional reviewer comment" />
            {decisionModal==='reject' && (
              <>
                <Text style={styles.inputLabel}>Rejection Reason</Text>
                <TextInput value={reason} onChangeText={setReason} style={[styles.textArea]} multiline placeholder="Provide a reason" />
              </>
            )}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity disabled={savingDecision} onPress={()=> setDecisionModal(null)} style={[styles.modalBtn, styles.modalCancelBtn]}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={savingDecision} onPress={()=> submitDecision(decisionModal!)} style={[styles.modalBtn, styles.modalPrimaryBtn]}>
                {savingDecision ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalPrimaryText}>{decisionModal==='approve'?'Approve':'Reject'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activity Decision Modal */}
      <Modal visible={!!activityModal} transparent animationType="fade" onRequestClose={()=> !savingActivityDecision && setActivityModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{activityModal?.mode==='approve'?'Approve Activity':'Reject Activity'}</Text>
              <TouchableOpacity disabled={savingActivityDecision} onPress={()=> setActivityModal(null)} style={styles.closeIconBtn}><Ionicons name="close" size={20} color="#0f172a" /></TouchableOpacity>
            </View>
            <Text style={styles.metaLabel}>Activity</Text>
            <Text style={styles.metaValue}>{activityModal?.activity.title}</Text>
            <Text style={styles.inputLabel}>Rating</Text>
            <StarRater value={Number(activityRating)||0} onChange={(v)=> setActivityRating(String(v))} />
            <Text style={styles.inputLabel}>Comment</Text>
            <TextInput value={activityComment} onChangeText={setActivityComment} style={[styles.textArea]} multiline placeholder="Optional reviewer comment" />
            {activityModal?.mode==='reject' && (
              <>
                <Text style={styles.inputLabel}>Rejection Reason</Text>
                <TextInput value={activityReason} onChangeText={setActivityReason} style={[styles.textArea]} multiline placeholder="Provide a reason" />
              </>
            )}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity disabled={savingActivityDecision} onPress={()=> setActivityModal(null)} style={[styles.modalBtn, styles.modalCancelBtn]}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={savingActivityDecision} onPress={submitActivityDecision} style={[styles.modalBtn, styles.modalPrimaryBtn]}>
                {savingActivityDecision ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalPrimaryText}>{activityModal?.mode==='approve'?'Approve':'Reject'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Rate Modal */}
      <Modal visible={successModal} transparent animationType="fade" onRequestClose={()=> !successSaving && setSuccessModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{item?.successRate !== undefined ? 'Update Final Success Rate' : 'Final Success Rate'}</Text>
              <TouchableOpacity disabled={successSaving} onPress={()=> setSuccessModal(false)} style={styles.closeIconBtn}><Ionicons name="close" size={20} color="#0f172a" /></TouchableOpacity>
            </View>
            <Text style={{ fontSize:12, color:'#475569', marginTop:2, lineHeight:18 }}>Drag or tap stars to set outcome. Provide constructive feedback to guide the Unit Leader. Feedback is optional but encouraged.</Text>
            <View style={{ marginTop:10 }}>
              <StarRater value={successStars} onChange={setSuccessStars} />
              <Text style={{ textAlign:'center', fontSize:24, fontWeight:'800', color:'#0f172a', marginTop:0 }}>{starsToPercent(successStars)}%</Text>
              <Text style={{ textAlign:'center', fontSize:12, fontWeight:'600', color:'#6366f1', marginTop:2, textTransform:'uppercase' }}>{deriveCategory(starsToPercent(successStars))}</Text>
            </View>
            <Text style={[styles.inputLabel,{ marginTop:18 }]}>Feedback (optional)</Text>
            <TextInput
              value={successFeedback}
              onChangeText={setSuccessFeedback}
              multiline
              placeholder="Highlight achievements, call out gaps, and suggest next steps..."
              style={[styles.textArea,{ minHeight:120 }]} />
            {!!item?.successFeedback && !successFeedback && (
              <TouchableOpacity onPress={()=> setSuccessFeedback(item.successFeedback||'')} style={{ marginTop:8 }}>
                <Text style={{ fontSize:11, color:'#0369a1', fontWeight:'600' }}>Restore previous feedback</Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity disabled={successSaving} onPress={()=> setSuccessModal(false)} style={[styles.modalBtn, styles.modalCancelBtn]}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={successSaving} onPress={submitSuccessRate} style={[styles.modalBtn, styles.modalPrimaryBtn]}>
                {successSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalPrimaryText}>{item?.successRate !== undefined ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback Category Modal */}
      <Modal visible={!!feedbackCategory} transparent animationType="fade" onRequestClose={()=> setFeedbackCategory(null)}>
        <View style={styles.feedbackBackdrop}>
          <View style={[styles.feedbackCard, feedbackCategory==='low'? styles.feedbackLow : feedbackCategory==='good'? styles.feedbackGood : styles.feedbackPerfect ]}>
            <Ionicons name={feedbackCategory==='perfect'? 'trophy' : feedbackCategory==='good'? 'thumbs-up' : 'warning'} size={48} color="#fff" style={{ alignSelf:'center' }} />
            <Text style={styles.feedbackTitle}>{feedbackCategory==='low'?'Low Performance':'Success Rated'}</Text>
            <Text style={styles.feedbackSubtitle}>
              {feedbackCategory==='low'? 'This workplan has been flagged for low performance. Follow up with the unit leader for improvements.' : feedbackCategory==='good'? 'Solid results! There is room for more optimization.' : 'Outstanding execution! This plan achieved exceptional results.'}
            </Text>
            <TouchableOpacity onPress={()=> setFeedbackCategory(null)} style={styles.feedbackBtn}><Text style={styles.feedbackBtnText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Display-only star component (supports half by value .5 increments)
const StarDisplay: React.FC<{ value:number; size?:number }> = ({ value, size=16 }) => {
  return (
    <View style={{ flexDirection:'row' }}>
      {Array.from({ length:5 }).map((_,i)=>{
        const full = value >= i+1;
        const half = !full && value >= i+0.5;
        return <Ionicons key={i} name={full? 'star' : half? 'star-half' : 'star-outline'} size={size} color={full||half? '#fbbf24':'#cbd5e1'} style={{ marginRight:2 }} />;
      })}
    </View>
  );
};

// Interactive star rater with gesture (drag across stars). Value increments 0.5.
const StarRater: React.FC<{ value:number; onChange:(v:number)=>void }> = ({ value, onChange }) => {
  const containerRef = useRef<View|null>(null);
  const lastTap = useRef<number>(0);
  const handlePos = (x:number, width:number) => {
    const clamped = Math.max(0, Math.min(width, x));
    const percent = clamped / width; // 0..1
    let v = percent * 5; // 0..5
    // round to nearest 0.5
    v = Math.round(v * 2)/2;
    if(v < 0.5) v = 0.5; // minimum half star when interacting
    onChange(v);
  };
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: ()=> true,
    onPanResponderGrant: evt => {
      containerRef.current?.measure((fx,fy,w,h,px,py)=>{
        handlePos(evt.nativeEvent.locationX, w);
      });
    },
    onPanResponderMove: evt => {
      containerRef.current?.measure((fx,fy,w,h,px,py)=>{
        handlePos(evt.nativeEvent.locationX, w);
      });
    }
  })).current;
  return (
    <View ref={r => { containerRef.current = r; }} {...panResponder.panHandlers} style={{ flexDirection:'row', paddingVertical:12 }}>
      {Array.from({ length:5 }).map((_,i)=>{
        const threshold = i+1;
        const full = value >= threshold;
        const half = !full && value >= threshold - 0.5;
        const onStarPress = () => {
          const now = Date.now();
            if(now - lastTap.current < 300){
              // double tap -> set full star
              onChange(threshold);
            } else {
              // single tap -> toggle half / full logic
              if(full){
                // reduce to half if currently full
                onChange(threshold - 0.5);
              } else if(half){
                // increase to full
                onChange(threshold);
              } else {
                // set half first
                onChange(threshold - 0.5);
              }
            }
            lastTap.current = now;
        };
        return (
          <TouchableOpacity key={i} onPress={onStarPress} activeOpacity={0.7} style={{ paddingHorizontal:2 }}>
            <Ionicons name={full? 'star' : half? 'star-half' : 'star-outline'} size={26} color={full||half? '#fbbf24':'#cbd5e1'} />
          </TouchableOpacity>
        );
      })}
      <Text style={{ marginLeft:8, fontWeight:'700', color:'#0f172a' }}>{value.toFixed(1)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safe:{ flex:1, backgroundColor:'#fff' },
  headerRow:{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#e2e8f0' },
  headerTitle:{ flex:1, textAlign:'center', fontSize:16, fontWeight:'700' },
  scroll:{ padding:18, paddingBottom:120 },
  statusRow:{ flexDirection:'row', alignItems:'center', marginBottom:20 },
  statusChip:{ paddingHorizontal:12, paddingVertical:8, borderRadius:20 },
  statusText:{ fontSize:11, fontWeight:'700', color:'#fff', textTransform:'capitalize' },
  ratingText:{ marginLeft:12, fontSize:12, fontWeight:'600', color:'#0f172a' },
  rejectCard:{ flexDirection:'row', backgroundColor:'#fef2f2', borderWidth:1, borderColor:'#fecaca', padding:14, borderRadius:14, marginBottom:18, alignItems:'flex-start' },
  rejectLabel:{ fontSize:11, fontWeight:'700', color:'#b91c1c', textTransform:'uppercase', marginBottom:4 },
  rejectReason:{ fontSize:12, color:'#b91c1c', lineHeight:18 },
  sectionLabel:{ fontSize:14, fontWeight:'700', marginBottom:8, color:'#0f172a' },
  readonlyBox:{ backgroundColor:'#eef1f5', borderRadius:8, padding:12 },
  readonlyText:{ color:'#111' },
  planWrapper:{ borderWidth:1, borderColor:'#d0d7df', borderRadius:12, padding:16, marginTop:18 },
  planHeaderRow:{ flexDirection:'row', alignItems:'center' },
  planTitle:{ flex:1, fontSize:14, fontWeight:'700', color:'#0f172a' },
  activityCard:{ borderWidth:1, borderColor:'#cfd8e3', padding:14, borderRadius:10, marginBottom:16 },
  activityHeaderRow:{ flexDirection:'row', alignItems:'center' },
  activityTitle:{ flex:1, fontSize:13, fontWeight:'700', color:'#0f172a' },
  activityReviewStatusChip:{ paddingHorizontal:10, paddingVertical:4, borderRadius:14 },
  activityReviewStatusText:{ fontSize:11, fontWeight:'600', color:'#fff', textTransform:'capitalize' },
  descText:{ fontSize:12, color:'#334155', marginTop:6, lineHeight:18 },
  activityRejectReason:{ fontSize:11, color:'#b91c1c', marginTop:6 },
  activityActionsRow:{ flexDirection:'row', marginTop:10, gap:8 },
  smallBtn:{ paddingHorizontal:14, paddingVertical:8, borderRadius:8 },
  approveBtn:{ backgroundColor:'#0f766e' }, // legacy not used now
  approveBtnPrimary:{ backgroundColor:'#349DC5' },
  rejectBtn:{ backgroundColor:'#dc2626' },
  smallBtnText:{ color:'#fff', fontSize:12, fontWeight:'600' },
  footerBar:{ position:'absolute', left:0, right:0, bottom:0, flexDirection:'row', padding:12, gap:12, backgroundColor:'#fff', borderTopWidth:StyleSheet.hairlineWidth, borderTopColor:'#e2e8f0' },
  decisionBtn:{ flex:1, paddingVertical:14, borderRadius:10, alignItems:'center' },
  approveDecisionBtn:{ backgroundColor:'#0f766e' }, // legacy
  approveDecisionBtnPrimary:{ backgroundColor:'#349DC5' },
  rejectDecisionBtn:{ backgroundColor:'#dc2626' },
  decisionBtnText:{ color:'#fff', fontWeight:'700', fontSize:13 },
  modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', padding:24 },
  modalCard:{ width:'100%', backgroundColor:'#fff', borderRadius:20, padding:20 },
  modalHeaderRow:{ flexDirection:'row', alignItems:'center' },
  modalTitle:{ flex:1, fontSize:16, fontWeight:'700', color:'#0f172a' },
  closeIconBtn:{ padding:4 },
  inputLabel:{ fontSize:12, fontWeight:'600', color:'#0f172a', marginTop:14 },
  textInput:{ borderWidth:1, borderColor:'#cfd8e3', borderRadius:10, paddingHorizontal:14, paddingVertical:12, fontSize:14, marginTop:6 },
  textArea:{ borderWidth:1, borderColor:'#cfd8e3', borderRadius:12, paddingHorizontal:14, paddingVertical:12, fontSize:14, marginTop:6, minHeight:100, textAlignVertical:'top' },
  modalActionsRow:{ flexDirection:'row', justifyContent:'flex-end', gap:14, marginTop:24 },
  modalBtn:{ paddingHorizontal:20, paddingVertical:12, borderRadius:10 },
  modalCancelBtn:{ backgroundColor:'#f1f5f9' },
  modalPrimaryBtn:{ backgroundColor:'#349DC5' },
  modalCancelText:{ fontSize:13, fontWeight:'600', color:'#0f172a' },
  modalPrimaryText:{ fontSize:13, fontWeight:'600', color:'#fff' },
  metaLabel:{ marginTop:16, fontSize:12, fontWeight:'600', color:'#475569' },
  metaValue:{ fontSize:13, fontWeight:'700', color:'#0f172a', marginTop:4 },
  commentsWrap:{ backgroundColor:'#f1f5f9', borderRadius:12, padding:12 },
  commentRow:{ flexDirection:'row', marginBottom:12 },
  commentText:{ fontSize:12, color:'#0f172a', lineHeight:18 },
  commentMeta:{ fontSize:10, color:'#64748b', marginTop:4 },
  rateSuccessBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:'#6366f1', paddingHorizontal:16, paddingVertical:10, borderRadius:12, alignSelf:'flex-start', marginBottom:12 },
  rateSuccessText:{ color:'#fff', fontSize:12, fontWeight:'700' },
  successPreviewLabel:{ fontSize:12, fontWeight:'600', color:'#334155', marginTop:4 },
  feedbackBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', alignItems:'center', justifyContent:'center', padding:30 },
  feedbackCard:{ width:'100%', borderRadius:28, padding:26 },
  feedbackLow:{ backgroundColor:'#b91c1c' },
  feedbackGood:{ backgroundColor:'#2563eb' },
  feedbackPerfect:{ backgroundColor:'#0d9488' },
  feedbackTitle:{ textAlign:'center', color:'#fff', fontSize:20, fontWeight:'800', marginTop:14 },
  feedbackSubtitle:{ textAlign:'center', color:'#f1f5f9', fontSize:13, marginTop:12, lineHeight:20 },
  feedbackBtn:{ marginTop:24, backgroundColor:'rgba(255,255,255,0.15)', paddingVertical:12, borderRadius:14 },
  feedbackBtnText:{ textAlign:'center', color:'#fff', fontWeight:'700' },
  resourcesBlock:{ marginTop:10, backgroundColor:'#f1f5f9', borderRadius:10, padding:10 },
  resourcesHeaderRow:{ flexDirection:'row', alignItems:'center', marginBottom:6 },
  resourcesHeaderText:{ fontSize:11, fontWeight:'700', color:'#0369a1', textTransform:'uppercase', letterSpacing:0.5 },
  resourceChipsRow:{ flexDirection:'row', flexWrap:'wrap', marginTop:2 },
  resourceChip:{ backgroundColor:'#e2e8f0', paddingHorizontal:10, paddingVertical:6, borderRadius:18, marginRight:6, marginBottom:6 },
  resourceChipText:{ fontSize:11, fontWeight:'600', color:'#0f172a' },
  progressTimelineWrap:{ marginTop:12, backgroundColor:'#f8fafc', borderRadius:12, padding:12, borderWidth:1, borderColor:'#e2e8f0' },
  timelineLabel:{ fontSize:11, fontWeight:'700', color:'#0f172a', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 },
  timelineRow:{ flexDirection:'row', alignItems:'flex-start', marginBottom:10 },
  timelineDot:{ width:10, height:10, borderRadius:5, backgroundColor:'#349DC5', marginTop:4, marginRight:10 },
  timelineContent:{ flex:1 },
  timelinePercent:{ fontSize:12, fontWeight:'700', color:'#0f172a' },
  timelineMessage:{ fontSize:12, color:'#334155', marginTop:2, lineHeight:18 },
  timelineMeta:{ fontSize:10, color:'#64748b', marginTop:4 },
  successFeedbackCard:{ marginTop:14, backgroundColor:'#f0f9ff', borderWidth:1, borderColor:'#bae6fd', padding:14, borderRadius:14 },
  successFeedbackTitle:{ fontSize:12, fontWeight:'700', color:'#0369a1', textTransform:'uppercase', letterSpacing:0.5 },
  successFeedbackText:{ fontSize:13, marginTop:8, color:'#0f172a', lineHeight:20 },
});

export default AdminViewWorkPlanScreen;
