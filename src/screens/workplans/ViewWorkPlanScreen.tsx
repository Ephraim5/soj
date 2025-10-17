import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Pressable } from 'react-native';
import ModernLoader from '../../loader/load';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Activity {
  _id: string;
  title: string;
  description?: string;
  resources?: string[];
  progressPercent?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  completionSummary?: string;
  dateOfCompletion?: string;
  estimatedHours?: number;
  reviewStatus?: string;
  reviewRating?: number;
  reviewRejectionReason?: string;
  reviewComments?: ReviewComment[];
  progressUpdates?: ProgressUpdate[];
}
interface Plan { _id: string; title: string; activities: Activity[]; }
interface ReviewComment { _id: string; message: string; createdAt?: string; user?: { firstName?: string; surname?: string }; }
interface ProgressUpdate { _id: string; message?: string; progressPercent?: number; createdAt?: string; user?: { firstName?: string; surname?: string }; }
interface WorkPlan { _id: string; title: string; generalGoal?: string; status: string; progressPercent: number; plans: Plan[]; startDate?: string; endDate?: string; reviewRating?: number; rejectionReason?: string; reviewComments?: ReviewComment[]; successRate?: number; successCategory?: 'low' | 'good' | 'perfect'; successFeedback?: string; }

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://streamsofjoyumuahia-api.onrender.com';

const ViewWorkPlanScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params || {};
  const [item, setItem] = useState<WorkPlan | null>(null);
  const [userRole, setUserRole] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  // Progress Modal State
  const [progressFor, setProgressFor] = useState<Activity | null>(null);
  const [progressValue, setProgressValue] = useState<string>('0');
  const [completionSummary, setCompletionSummary] = useState<string>('');
  const [starValue, setStarValue] = useState<number>(0); // 0 - 5 in 0.5 increments
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [progressError, setProgressError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [celebratePercent, setCelebratePercent] = useState<number>(0);
  const [lowPerfModal, setLowPerfModal] = useState(false);

  const togglePlan = (pid: string) => setExpandedPlans(p => ({ ...p, [pid]: !p[pid] }));

  const load = useCallback(async () => {
    if (!id) return; setLoading(true); setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Missing auth token. Please sign in again.');
      const resp = await fetch(`${API_BASE}/api/workplans/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Fetch failed (${resp.status}) ${txt}`);
      }
      const json = await resp.json();
      if (!json.ok) throw new Error(json.error || 'Failed');
      setItem(json.item);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Role check: if SuperAdmin, redirect to admin view equivalent
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          setUserRole(u?.activeRole);
          if (u?.activeRole === 'SuperAdmin' && id) {
            nav.replace('AdminViewWorkPlan' as any, { id });
          }
        }
      } catch { }
    })();
  }, [id]);

  const pctToStars = (pct: number) => Math.round((pct / 20) * 2) / 2; // 100% =>5, 50=>2.5 etc
  const starsToPct = (stars: number) => Math.round(stars * 20); // 0.5 ->10%

  const openProgressModal = (act: Activity) => {
    setProgressFor(act);
    setProgressValue(String(act.progressPercent ?? 0));
    setCompletionSummary(act.completionSummary || '');
    setStarValue(pctToStars(act.progressPercent ?? 0));
    setProgressError(null);
    setProgressMessage('');
  };

  const closeProgressModal = () => {
    if (savingProgress) return; // prevent closing mid-save
    setProgressFor(null);
    setProgressValue('0');
    setCompletionSummary('');
    setStarValue(0);
    setProgressError(null);
    setProgressMessage('');
  };

  const saveProgress = useCallback(async () => {
    if (!progressFor || !id) return;
    // derive percent from starValue (primary control)
    const parsed = Number(progressValue); // keep backwards compatibility if needed
    const starPercent = starsToPct(starValue);
    const finalPercent = starValue > 0 ? starPercent : parsed;
    if (isNaN(finalPercent) || finalPercent < 0 || finalPercent > 100) {
      setProgressError('Progress must be between 0% and 100%.');
      return;
    }
    setSavingProgress(true); setProgressError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Missing auth token. Please sign in again.');
      const body: any = {
        activityId: progressFor._id,
        progressPercent: finalPercent,
        completionSummary: completionSummary || undefined,
        message: progressMessage || undefined
      };
      if (finalPercent >= 100) body.dateOfCompletion = new Date().toISOString();
      const resp = await fetch(`${API_BASE}/api/workplans/${id}/activity-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Update failed (${resp.status}) ${txt}`);
      }
      const json = await resp.json();
      if (!json.ok) throw new Error(json.error || 'Failed');
      setItem(json.item);
      // trigger celebration if threshold reached (and increased)
      if (finalPercent >= 90 && finalPercent > (progressFor.progressPercent || 0)) {
        setCelebratePercent(finalPercent);
        setShowCelebrate(true);
      }
      closeProgressModal();
    } catch (e: any) {
      setProgressError(e.message);
    } finally { setSavingProgress(false); }
  }, [progressFor, progressValue, completionSummary, progressMessage, id]);

  const statusColor = (s: string) => ({
    approved: '#0f766e',
    pending: '#f59e0b',
    draft: '#64748b',
    rejected: '#dc2626',
    ignored: '#475569'
  } as any)[s] || '#334155';

  const withinDateWindow = (wp: WorkPlan) => {
    if (!wp.startDate || !wp.endDate) return false;
    const sd = new Date(wp.startDate); const ed = new Date(wp.endDate); const now = new Date();
    return sd <= now && ed >= now;
  };

  // Low performance one-time modal logic
  useEffect(() => {
    (async () => {
      if (item?.successCategory === 'low') {
        try {
          const seenKey = `low_perf_seen_${item._id}`;
          const seen = await AsyncStorage.getItem(seenKey);
          if (!seen) { setLowPerfModal(true); await AsyncStorage.setItem(seenKey, '1'); }
        } catch { }
      }
    })();
  }, [item?.successCategory, item?._id]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 4 }}><Ionicons name="chevron-back" size={24} color="#111" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{item?.title || 'Work Plan'}</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading && <ModernLoader fullscreen={false} style={{ marginTop: 30 }} />}
      {error && !loading && <Text style={{ color: '#dc2626', margin: 16 }}>{error}</Text>}
      {!loading && item && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.topMetaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              {item.startDate && item.endDate && (
                <Text style={styles.periodText}>{new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}</Text>
              )}
            </View>
            <View style={[styles.planStatusChip, { backgroundColor: statusColor(item.status) }]}>
              <Text style={styles.planStatusText}>{item.status}</Text>
            </View>
          </View>
          {typeof item.successRate === 'number' && (
            <View style={styles.successWrap}>
              <Text style={styles.sectionLabel}>Final Success Rating</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const val = (item.successRate || 0) / 20; const full = val >= i + 1; const half = !full && val >= i + 0.5;
                  return <Ionicons key={i} name={full ? 'star' : half ? 'star-half' : 'star-outline'} size={18} color={full || half ? '#6366f1' : '#cbd5e1'} style={{ marginRight: 2 }} />;
                })}
                <Text style={styles.ratingText}>{item.successRate}% ({item.successCategory})</Text>
              </View>
              {!!item.successFeedback && (
                <View style={styles.successFeedbackCard}>
                  <Text style={styles.successFeedbackTitle}>Supervisor Feedback</Text>
                  <Text style={styles.successFeedbackText}>{item.successFeedback}</Text>
                </View>
              )}
            </View>
          )}
          {item.status === 'approved' && withinDateWindow(item) && (
            <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active Period</Text></View>
          )}
          {item.status === 'rejected' && !!item.rejectionReason && (
            <View style={styles.rejectCard}>
              <Ionicons name="alert-circle" size={16} color="#b91c1c" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rejectLabel}>Rejected</Text>
                <Text style={styles.rejectReason}>{item.rejectionReason}</Text>
              </View>
            </View>
          )}
          <Text style={[styles.sectionLabel, { marginTop: item.rejectionReason ? 8 : 24 }]}>General Goal</Text>
          <View style={styles.readonlyBox}><Text style={styles.readonlyText}>{item.generalGoal || '—'}</Text></View>
          {typeof item.reviewRating === 'number' && item.reviewRating > 0 && (
            <View style={{ flexDirection: 'row', marginTop: 20, alignItems: 'center' }}>
              {Array.from({ length: 5 }).map((_, i) => {
                const full = item.reviewRating && item.reviewRating >= i + 1;
                const half = !full && item.reviewRating && item.reviewRating >= i + 0.5;
                return <Ionicons key={i} name={full ? 'star' : half ? 'star-half' : 'star-outline'} size={18} color={full || half ? '#fbbf24' : '#cbd5e1'} style={{ marginRight: 2 }} />;
              })}
              <Text style={styles.ratingText}>{item.reviewRating?.toFixed(1)}</Text>
            </View>
          )}
          {Array.isArray(item.reviewComments) && item.reviewComments.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionLabel}>Reviewer Comments</Text>
              <View style={styles.commentsWrap}>
                {item.reviewComments.map(c => (
                  <View key={c._id} style={styles.commentRow}>
                    <Ionicons name="chatbubble-ellipses" size={14} color="#349DC5" style={{ marginRight: 8, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.commentText}>{c.message}</Text>
                      {c.createdAt && <Text style={styles.commentMeta}>{new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          <Text style={[styles.sectionLabel, { marginTop: 26 }]}>Plans</Text>
          {item.plans.map(plan => {
            const expanded = expandedPlans[plan._id];
            return (
              <View key={plan._id} style={styles.planWrapper}>
                <TouchableOpacity onPress={() => togglePlan(plan._id)} style={styles.planHeaderRow}>
                  <Text style={styles.planTitle}>{plan.title}</Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#111" />
                </TouchableOpacity>
                {expanded && (
                  <View style={{ marginTop: 12 }}>
                    {plan.activities.map(act => (
                      <View key={act._id} style={styles.activityCard}>
                        <Text style={styles.activityTitle}>{act.title}</Text>
                        {act.startDate && act.endDate && (
                          <Text style={styles.dateText}>Date: {new Date(act.startDate).toLocaleDateString()} - {new Date(act.endDate).toLocaleDateString()}</Text>
                        )}
                        {act.description ? (<View style={{ marginTop: 6 }}><Text style={styles.subLabel}>Description:</Text><Text style={styles.descText}>{act.description}</Text></View>) : null}
                        {!!(act.resources && act.resources.length) && (
                          <View style={{ marginTop: 6 }}>
                            <Text style={styles.subLabel}>Resources:</Text>
                            <View style={styles.resourceRow}>
                              {act.resources.map(r => (<View key={r} style={styles.resourceChip}><Text style={styles.resourceChipText}>{r}</Text></View>))}
                            </View>
                          </View>
                        )}
                        {typeof act.reviewRating === 'number' && act.reviewRating > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            {Array.from({ length: 5 }).map((_, i) => {
                              const full = (act.reviewRating || 0) >= i + 1;
                              const half = !full && (act.reviewRating || 0) >= i + 0.5;
                              return <Ionicons key={i} name={full ? 'star' : 'star-half'} size={14} color={full || half ? '#fbbf24' : '#cbd5e1'} style={{ marginRight: 2 }} />;
                            })}
                            <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: '600', color: '#0f172a' }}>{act.reviewRating?.toFixed(1)}</Text>
                          </View>
                        )}
                        {Array.isArray(act.reviewComments) && act.reviewComments.length > 0 && (
                          <View style={[styles.commentsWrap, { marginTop: 10 }]}>
                            {act.reviewComments.map(c => (
                              <View key={c._id} style={styles.commentRow}>
                                <Ionicons name="chatbubble-ellipses" size={13} color="#349DC5" style={{ marginRight: 8, marginTop: 2 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.commentText}>{c.message}</Text>
                                  {c.createdAt && <Text style={styles.commentMeta}>{new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                        {Array.isArray(act.progressUpdates) && act.progressUpdates.length > 0 && (
                          <View style={styles.progressTimelineWrap}>
                            <Text style={styles.timelineLabel}>Progress Timeline</Text>
                            {act.progressUpdates.slice().sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()).map(up => (
                              <TouchableOpacity key={up._id} >
                                <View style={styles.timelineRow}>
                                  <View style={styles.timelineDot} />
                                  <View style={styles.timelineContent}>
                                    <Text style={styles.timelinePercent}>{typeof up.progressPercent === 'number' ? up.progressPercent + '%' : '—'}</Text>
                                    {!!up.message && <Text style={styles.timelineMessage}>{up.message}</Text>}
                                    <Text style={styles.timelineMeta}>{up.createdAt ? new Date(up.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                                  </View>
                                </View>
                              </TouchableOpacity>

                            ))}
                          </View>
                        )}
                        <View style={styles.activityFooterRow}>
                          <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{act.status || 'Not Started'}</Text></View>
                          {item.status === 'approved' && userRole !== 'SuperAdmin' && item.successRate === undefined && (
                            <TouchableOpacity style={styles.progressBtn} onPress={() => openProgressModal(act)}>
                              <Ionicons name="checkbox-outline" color="#fff" size={16} />
                              <Text style={styles.progressBtnText}> Mark Progress</Text>
                            </TouchableOpacity>
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

      <Modal visible={!!progressFor} transparent animationType="fade" onRequestClose={closeProgressModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Mark Progress</Text>
              <TouchableOpacity onPress={closeProgressModal} disabled={savingProgress} style={styles.closeIconBtn}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            {progressFor && (
              <View style={styles.activityMetaBox}>
                <Text style={styles.metaLabel}>Activity</Text>
                <Text style={styles.metaValue}>{progressFor.title}</Text>
                {!!progressFor.endDate && (
                  <Text style={styles.metaDate}>Target Deadline:{' '}<Text style={styles.metaDateValue}>{new Date(progressFor.endDate).toLocaleDateString()}</Text></Text>
                )}
                {!!progressFor.description && (
                  <View style={{ marginTop: 10 }}>
                    <TouchableOpacity>
                      <Text style={styles.originalDescLabel}>Original Description ▾</Text>
                    </TouchableOpacity>
                    <View style={styles.originalDescBox}><Text style={styles.originalDescText}>{progressFor.description}</Text></View>
                  </View>
                )}
              </View>
            )}
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Progress</Text>
            <View style={styles.starRow}>
              {Array.from({ length: 5 }).map((_, i) => {
                const starIndex = i + 1;
                const isFull = starValue >= starIndex;
                const isHalf = !isFull && starValue >= starIndex - 0.5;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      // single tap toggles between half and full for that star
                      let newVal = starValue;
                      if (isFull) {
                        // reduce to half if currently full
                        newVal = starIndex - 0.5;
                      } else if (isHalf) {
                        // increase to full
                        newVal = starIndex;
                      } else {
                        // set to half first
                        newVal = starIndex - 0.5;
                      }
                      // ensure floor at 0.5 if setting first star
                      if (newVal < 0.5) newVal = 0.5;
                      setStarValue(newVal);
                      setProgressValue(String(Math.round(newVal * 20)));
                    }}
                    onLongPress={() => {
                      // long press sets exact full star directly
                      setStarValue(starIndex);
                      setProgressValue(String(starIndex * 20));
                    }}
                    style={{ padding: 4 }}>
                    <Ionicons
                      name={isFull ? 'star' : isHalf ? 'star-half' : 'star-outline'}
                      size={30}
                      color={isFull || isHalf ? '#fbbf24' : '#cbd5e1'}
                    />
                  </Pressable>
                );
              })}
              <TouchableOpacity onPress={() => { setStarValue(0); setProgressValue('0'); }} style={{ marginLeft: 12, padding: 6 }}>
                <Ionicons name="refresh" size={20} color="#334155" />
              </TouchableOpacity>
            </View>
            <Text style={styles.starValueLabel}>{Math.round(starValue * 20)}%</Text>
            <Text style={styles.altInputNote}>Tap stars (half/full). Long-press sets full. Refresh resets.</Text>
            <Text style={[styles.fallbackLabel]}>Or enter % manually</Text>
            <TextInput value={progressValue} onChangeText={(t) => { setProgressValue(t); const num = Number(t); if (!isNaN(num)) setStarValue(Math.round(((num / 20)) * 2) / 2); }} keyboardType="number-pad" style={styles.textInput} placeholder="0 - 100" />
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Completion Summary</Text>
            <TextInput value={completionSummary} onChangeText={setCompletionSummary} multiline numberOfLines={4} style={[styles.textArea]} placeholder="Describe how this was achieved..." />
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Progress Note (optional)</Text>
            <TextInput value={progressMessage} onChangeText={setProgressMessage} multiline numberOfLines={3} style={[styles.textArea, { minHeight: 80 }]} placeholder="Add a note for this update (visible to reviewer)" />
            {!!progressError && <Text style={styles.modalError}>{progressError}</Text>}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity disabled={savingProgress} onPress={closeProgressModal} style={[styles.modalBtn, styles.modalCancelBtn]}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={savingProgress} onPress={saveProgress} style={[styles.modalBtn, styles.modalPrimaryBtn]}>
                {savingProgress ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalPrimaryText}>Submit for Review</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={lowPerfModal} transparent animationType="fade" onRequestClose={() => setLowPerfModal(false)}>
        <View style={styles.celebrateBackdrop}>
          <View style={[styles.celebrateCard, { backgroundColor: '#b91c1c' }]}>
            <Ionicons name="warning" size={54} color="#fff" style={{ alignSelf: 'center' }} />
            <Text style={[styles.celebrateTitle, { color: '#fff' }]}>Low Performance</Text>
            <Text style={[styles.celebrateSubtitle, { color: '#f1f5f9' }]}>This work plan was rated as low performance. Please review activities and consider improvement actions.</Text>
            <TouchableOpacity onPress={() => setLowPerfModal(false)} style={[styles.celebrateBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Text style={styles.celebrateBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={showCelebrate} transparent animationType="fade" onRequestClose={() => setShowCelebrate(false)}>
        <View style={styles.celebrateBackdrop}>
          <View style={styles.celebrateCard}>
            <Ionicons name="trophy" size={54} color="#fbbf24" style={{ alignSelf: 'center' }} />
            <Text style={styles.celebrateTitle}>Fantastic Progress!</Text>
            <Text style={styles.celebrateSubtitle}>You've reached {celebratePercent}% on an activity. Keep the momentum!</Text>
            <View style={styles.celebrateStarsRow}>
              {Array.from({ length: 7 }).map((_, i) => (
                <Ionicons key={i} name="star" size={20} color={i < 5 ? '#fbbf24' : '#fde68a'} style={{ transform: [{ rotate: `${(i - 3) * 10}deg` }], opacity: i < 5 ? 1 : 0.65, marginHorizontal: 2 }} />
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowCelebrate(false)} style={styles.celebrateBtn}>
              <Text style={styles.celebrateBtnText}>Awesome!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', flex: 1 },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8, color: '#0f172a' },
  readonlyBox: { backgroundColor: '#eef1f5', borderRadius: 8, padding: 12 },
  readonlyText: { color: '#111' },
  topMetaRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  periodText: { fontSize: 12, color: '#475569', marginTop: 4 },
  planStatusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  planStatusText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },
  ratingText: { marginLeft: 8, fontSize: 12, fontWeight: '600', color: '#0f172a' },
  rejectCard: { flexDirection: 'row', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 14, borderRadius: 14, marginTop: 20, alignItems: 'flex-start' },
  rejectLabel: { fontSize: 11, fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase', marginBottom: 4 },
  rejectReason: { fontSize: 12, color: '#b91c1c', lineHeight: 18 },
  commentsWrap: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12 },
  commentRow: { flexDirection: 'row', marginBottom: 12 },
  commentText: { fontSize: 12, color: '#0f172a', lineHeight: 18 },
  commentMeta: { fontSize: 10, color: '#64748b', marginTop: 4 },
  activeBadge: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  activeBadgeText: { fontSize: 11, fontWeight: '600', color: '#0369a1' },
  planWrapper: { borderWidth: 1, borderColor: '#d0d7df', borderRadius: 12, padding: 16, marginTop: 18 },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  planTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  activityCard: { borderWidth: 1, borderColor: '#cfd8e3', padding: 14, borderRadius: 10, marginBottom: 16 },
  activityTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  dateText: { fontSize: 12, color: '#475569', marginTop: 4 },
  subLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  descText: { fontSize: 12, color: '#334155', marginTop: 2, lineHeight: 17 },
  resourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  resourceChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, marginRight: 6, marginBottom: 6 },
  resourceChipText: { fontSize: 11, color: '#0f172a', fontWeight: '600' },
  activityFooterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  statusBadge: { backgroundColor: '#616161', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  progressBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#349DC5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginLeft: 'auto' },
  progressBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  successWrap: { marginTop: 16, backgroundColor: '#f5f3ff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e0e7ff' },
  successFeedbackCard: { backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#bbf7d0', marginTop: 12 },
  successFeedbackTitle: { fontSize: 11, fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 },
  successFeedbackText: { fontSize: 13, color: '#14532d', lineHeight: 20, marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
  closeIconBtn: { padding: 4 },
  activityMetaBox: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 14, marginTop: 18 },
  metaLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  metaDate: { fontSize: 11, color: '#475569', marginTop: 10 },
  metaDateValue: { fontWeight: '600', color: '#0f172a' },
  originalDescLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  originalDescBox: { marginTop: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe3ef', padding: 12, borderRadius: 10 },
  originalDescText: { fontSize: 12, color: '#334155', lineHeight: 18 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a', marginTop: 8 },
  textInput: { borderWidth: 1, borderColor: '#cfd8e3', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginTop: 6 },
  textArea: { borderWidth: 1, borderColor: '#cfd8e3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginTop: 6, minHeight: 110, textAlignVertical: 'top' },
  modalActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 20, gap: 14 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  modalCancelBtn: { backgroundColor: '#f1f5f9' },
  modalPrimaryBtn: { backgroundColor: '#349DC5' },
  modalCancelText: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  modalPrimaryText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  modalError: { color: '#dc2626', fontSize: 12, marginTop: 10 },
  helperNote: { fontSize: 11, color: '#475569', marginTop: 16, lineHeight: 16 }
  , scrollContainer: { padding: 18, paddingBottom: 54 }
  , starRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 }
  , starValueLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a', marginTop: 4 }
  , altInputNote: { fontSize: 10, color: '#64748b', marginTop: 6 }
  , fallbackLabel: { fontSize: 11, color: '#475569', marginTop: 14, fontWeight: '600' }
  , celebrateBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 30 }
  , celebrateCard: { width: '100%', backgroundColor: '#fff', borderRadius: 26, padding: 26, elevation: 6 }
  , celebrateTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#0f172a', marginTop: 18 }
  , celebrateSubtitle: { fontSize: 13, color: '#334155', textAlign: 'center', marginTop: 12, lineHeight: 20 }
  , celebrateStarsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 }
  , celebrateBtn: { marginTop: 26, backgroundColor: '#349DC5', paddingVertical: 14, borderRadius: 16 }
  , celebrateBtnText: { textAlign: 'center', color: '#fff', fontWeight: '700', fontSize: 15 }
  , progressTimelineWrap: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' }
  , timelineLabel: { fontSize: 11, fontWeight: '700', color: '#0f172a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }
  , timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }
  , timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#349DC5', marginTop: 4, marginRight: 10 }
  , timelineContent: { flex: 1 }
  , timelinePercent: { fontSize: 12, fontWeight: '700', color: '#0f172a' }
  , timelineMessage: { fontSize: 12, color: '#334155', marginTop: 2, lineHeight: 18 }
  , timelineMeta: { fontSize: 10, color: '#64748b', marginTop: 4 }
});

export default ViewWorkPlanScreen;
