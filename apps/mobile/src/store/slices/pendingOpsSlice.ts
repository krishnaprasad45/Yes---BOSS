import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UpdateAutoReplyConfig } from '@yes-boss/shared';

/**
 * A write the user made while offline (or that failed in flight). Queued here,
 * persisted to MMKV, and drained FIFO on reconnect. Add new op `type`s as more
 * mutable features land (notes, profile, preferences) — the drain loop in
 * `sync.ts` switches on `type`.
 */
export interface PendingOp {
  /** Client-generated id (also used for idempotent dequeue). */
  id: string;
  type: 'updateAutoReply';
  payload: UpdateAutoReplyConfig;
  createdAt: string;
}

interface PendingOpsState {
  ops: PendingOp[];
}

const initialState: PendingOpsState = { ops: [] };

const pendingOpsSlice = createSlice({
  name: 'pendingOps',
  initialState,
  reducers: {
    enqueueOp(state, action: PayloadAction<PendingOp>) {
      state.ops.push(action.payload);
    },
    dequeueOp(state, action: PayloadAction<string>) {
      state.ops = state.ops.filter(op => op.id !== action.payload);
    },
    clearOps(state) {
      state.ops = [];
    },
  },
});

export const { enqueueOp, dequeueOp, clearOps } = pendingOpsSlice.actions;
export default pendingOpsSlice.reducer;
