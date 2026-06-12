export type CallDirection = "incoming" | "outgoing" | "missed" | "rejected";

export interface Call {
  id: string;
  /** Resolved contact name from device, null if unknown number. */
  contactName: string | null;
  phoneNumber: string;
  direction: CallDirection;
  /** Seconds. 0 for missed calls. */
  durationSec: number;
  /** ISO 8601 — when the call started on the device. */
  occurredAt: string;
  /** Storage URL of the synced recording, null when no recording matched. */
  recordingUrl: string | null;
  /** Whisper transcript, null until transcription runs. */
  transcript: string | null;
  /** LLM recap ("matter of the call"), null until generated. */
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Metadata sent alongside the audio file when the device syncs a recording. */
export interface UploadCallMeta {
  contactName: string | null;
  phoneNumber: string;
  direction: CallDirection;
  durationSec: number;
  occurredAt: string;
  /** Original filename in the Samsung recordings folder. */
  sourceFileName: string;
}

export interface CallListParams {
  page?: number;
  limit?: number;
  search?: string;
  direction?: CallDirection;
  /** ISO date (inclusive) range filters. */
  from?: string;
  to?: string;
}
