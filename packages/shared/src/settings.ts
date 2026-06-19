/** Missed-call auto-reply configuration (Phase 3). */
export interface AutoReplyConfig {
  enabled: boolean;
  /** Body sent to a missed caller (signature appended separately). */
  message: string;
  /** Appended to every auto-reply, e.g. "— AI Assistant". */
  signature: string;
  /** Suppress repeat replies to the same number within this window. */
  cooldownMinutes: number;
  /** Auto-text a post-call recap to the owner after a recorded call. */
  recapEnabled: boolean;
  /** Owner's own number — where the self-recap SMS is sent. */
  recapNumber: string;
  updatedAt: string;
}

/** All fields optional — partial update of the auto-reply config. */
export type UpdateAutoReplyConfig = Partial<
  Pick<
    AutoReplyConfig,
    | "enabled"
    | "message"
    | "signature"
    | "cooldownMinutes"
    | "recapEnabled"
    | "recapNumber"
  >
>;
