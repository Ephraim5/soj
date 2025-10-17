import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalWorkPlanDraft {
  id: string; // local_<timestamp>_<rand>
  status: 'draft';
  title?: string;
  generalGoal?: string;
  startDate?: string | null;
  endDate?: string | null;
  plans: any[];
  owner?: string;
  createdAt: string;
  updatedAt: string;
  local: true;
}

const KEY = 'workplan_drafts_v1';

export async function loadLocalDrafts(): Promise<LocalWorkPlanDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as LocalWorkPlanDraft[];
  } catch {
    return [];
  }
}

async function saveAll(list: LocalWorkPlanDraft[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertLocalDraft(draft: LocalWorkPlanDraft) {
  const list = await loadLocalDrafts();
  const i = list.findIndex(d => d.id === draft.id);
  if (i >= 0) list[i] = draft; else list.push(draft);
  await saveAll(list);
}

export async function removeLocalDraft(id: string) {
  const list = await loadLocalDrafts();
  const next = list.filter(d => d.id !== id);
  await saveAll(next);
}

export function generateLocalDraftId() {
  return 'local_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8);
}
