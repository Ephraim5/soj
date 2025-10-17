import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://streamsofjoyumuahia-api.onrender.com';

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing auth token');
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers||{})
    }
  });
  let data: any = null;
  try { data = await resp.json(); } catch {}
  if(!resp.ok || !data?.ok) {
    const msg = data?.error || `Request failed (${resp.status})`;
    throw new Error(msg);
  }
  return data;
}

export interface ActivityPayload { title: string; description?: string; resources?: string[]; estimatedHours?: number; startDate?: string; endDate?: string; }
export interface PlanPayload { title: string; activities: ActivityPayload[]; }
export interface WorkPlanPayload { title?: string; startDate?: string; endDate?: string; generalGoal?: string; notes?: string; plans: PlanPayload[]; }

export async function listWorkPlans() {
  return authFetch('/api/workplans');
}
export async function getWorkPlan(id: string) {
  return authFetch(`/api/workplans/${id}`);
}
export async function createWorkPlan(body: WorkPlanPayload) {
  return authFetch('/api/workplans', { method:'POST', body: JSON.stringify(body) });
}
export async function updateWorkPlan(id: string, body: WorkPlanPayload) {
  return authFetch(`/api/workplans/${id}`, { method:'PUT', body: JSON.stringify(body) });
}
export async function submitWorkPlan(id: string) {
  return authFetch(`/api/workplans/${id}/submit`, { method:'POST' });
}
export async function approveWorkPlan(id: string) {
  return authFetch(`/api/workplans/${id}/approve`, { method:'POST' });
}
export async function rejectWorkPlan(id: string, reason?: string) {
  return authFetch(`/api/workplans/${id}/reject`, { method:'POST', body: JSON.stringify({ reason }) });
}
export async function updateActivityProgress(workPlanId: string, activityId: string, progressPercent: number, completionSummary?: string, message?: string) {
  const body: any = { activityId, progressPercent, completionSummary };
  if(message) body.message = message;
  if(progressPercent >= 100) body.dateOfCompletion = new Date().toISOString();
  return authFetch(`/api/workplans/${workPlanId}/activity-progress`, { method:'POST', body: JSON.stringify(body) });
}

// ----- SuperAdmin Review API -----
export interface ReviewDecisionPayload { rating?: number; comment?: string; reason?: string; }
export async function reviewApproveWorkPlan(id: string, payload: ReviewDecisionPayload = {}) {
  return authFetch(`/api/workplans/${id}/review/approve`, { method:'POST', body: JSON.stringify(payload) });
}
export async function reviewRejectWorkPlan(id: string, payload: ReviewDecisionPayload = {}) {
  return authFetch(`/api/workplans/${id}/review/reject`, { method:'POST', body: JSON.stringify(payload) });
}
export async function addWorkPlanReviewComment(id: string, message: string) {
  return authFetch(`/api/workplans/${id}/review/comment`, { method:'POST', body: JSON.stringify({ message }) });
}
export interface ActivityReviewPayload { activityId: string; decision: 'approve'|'reject'; rating?: number; comment?: string; reason?: string; }
export async function reviewActivityDecision(workPlanId: string, payload: ActivityReviewPayload) {
  return authFetch(`/api/workplans/${workPlanId}/review/activity`, { method:'POST', body: JSON.stringify(payload) });
}
export async function addActivityReviewComment(workPlanId: string, activityId: string, message: string) {
  return authFetch(`/api/workplans/${workPlanId}/review/activity/comment`, { method:'POST', body: JSON.stringify({ activityId, message }) });
}

// Utility to calculate weighted progress locally (mirrors backend logic)
export function calcWeightedProgress(plans: { activities: { progressPercent?: number; estimatedHours?: number }[] }[]) {
  let totalWeighted = 0; let totalHours = 0;
  plans.forEach(p => {
    p.activities.forEach(a => {
      const hours = a.estimatedHours || 1;
      totalHours += hours;
      totalWeighted += (a.progressPercent || 0) * hours;
    });
  });
  if(totalHours === 0) return 0;
  return Number((totalWeighted / totalHours).toFixed(2));
}
