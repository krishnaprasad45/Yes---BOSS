import { createAsyncThunk } from '@reduxjs/toolkit';
import { updateAutoReplyConfig } from '@/services/api/settings.api';
import type { RootState } from './index';
import { dequeueOp } from './slices/pendingOpsSlice';
import { setAutoReply } from './slices/settingsSlice';

/**
 * Replays queued offline writes FIFO. Server response is authoritative (server
 * wins): we overwrite the optimistic local value with whatever comes back.
 * Stops at the first failure so a still-flaky network doesn't burn the queue —
 * the next reconnect resumes from where it left off.
 */
export const drainPendingOps = createAsyncThunk<void, void, { state: RootState }>(
  'pendingOps/drain',
  async (_, { getState, dispatch }) => {
    const ops = [...getState().pendingOps.ops];
    for (const op of ops) {
      try {
        switch (op.type) {
          case 'updateAutoReply': {
            const res = await updateAutoReplyConfig(op.payload);
            dispatch(setAutoReply(res.data));
            break;
          }
        }
        dispatch(dequeueOp(op.id));
      } catch {
        break; // network still down / server error — retry next reconnect.
      }
    }
  },
);
