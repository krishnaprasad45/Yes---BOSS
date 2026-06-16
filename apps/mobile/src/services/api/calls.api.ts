import type {
  Call,
  CallListParams,
  ItemResponse,
  Paginated,
  UploadCallMeta,
} from '@yes-boss/shared';
import { apiFetch } from './client';

/** Call-log row pushed during a metadata sync (no audio). */
export interface CallSyncItem {
  contactName: string | null;
  phoneNumber: string;
  direction: Call['direction'];
  durationSec: number;
  occurredAt: string;
}

function buildQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      sp.append(key, String(value));
    }
  }
  return sp.toString();
}

const BASE = '/api/v1/calls';

export async function listCalls(params: CallListParams): Promise<Paginated<Call>> {
  const qs = buildQueryString({ ...params });
  return apiFetch<Paginated<Call>>(`${BASE}${qs ? `?${qs}` : ''}`);
}

export interface RecapStatus {
  transcription: boolean;
  summary: boolean;
}

export async function getRecapStatus(): Promise<ItemResponse<RecapStatus>> {
  return apiFetch<ItemResponse<RecapStatus>>(`${BASE}/recap/status`);
}

/** Generate (or regenerate) the transcript + summary for one call. */
export async function generateRecap(
  callId: string,
  force = false,
): Promise<ItemResponse<Call>> {
  return apiFetch<ItemResponse<Call>>(
    `${BASE}/${callId}/recap${force ? '?force=true' : ''}`,
    { method: 'POST' },
  );
}

export async function syncCalls(
  items: CallSyncItem[],
): Promise<ItemResponse<{ inserted: number; skipped: number }>> {
  return apiFetch(`${BASE}/sync`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

/** Multipart upload of one recording. `file.uri` is a content:// uri from MediaStore. */
export async function uploadRecording(
  meta: UploadCallMeta,
  file: { uri: string; name: string; type: string },
): Promise<ItemResponse<Call>> {
  const form = new FormData();
  // RN FormData accepts { uri, name, type } file parts directly.
  form.append('file', { uri: file.uri, name: file.name, type: file.type } as never);
  form.append('phoneNumber', meta.phoneNumber);
  if (meta.contactName) form.append('contactName', meta.contactName);
  form.append('direction', meta.direction);
  form.append('durationSec', String(meta.durationSec));
  form.append('occurredAt', meta.occurredAt);
  form.append('sourceFileName', meta.sourceFileName);

  return apiFetch<ItemResponse<Call>>(`${BASE}/upload`, {
    method: 'POST',
    body: form,
  });
}
