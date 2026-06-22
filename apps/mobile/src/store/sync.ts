import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  addManualTxn,
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '@/services/api/finance.api';
import { updateAutoReplyConfig } from '@/services/api/settings.api';
import type { RootState } from './index';
import { dequeueOp } from './slices/pendingOpsSlice';
import { setAutoReply } from './slices/settingsSlice';
import { removeCategoryOptimistic, removePendingTxn, setCategories } from './slices/financeSlice';

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
          case 'createCategory': {
            const { tempId, ...input } = op.payload;
            await createCategory(input);
            dispatch(removeCategoryOptimistic(tempId));
            break;
          }
          case 'updateCategory': {
            await updateCategory(op.payload.id, op.payload.patch);
            break;
          }
          case 'deleteCategory': {
            await deleteCategory(op.payload.id);
            break;
          }
          case 'addManualTxn': {
            const { localId, ...input } = op.payload;
            await addManualTxn(input);
            dispatch(removePendingTxn(localId));
            break;
          }
        }
        dispatch(dequeueOp(op.id));
      } catch {
        break; // network still down — retry next reconnect.
      }
    }
    // Re-fetch categories so optimistic temp IDs are replaced with real server IDs.
    try {
      const res = await getCategories();
      dispatch(setCategories(res.data));
    } catch {
      // best-effort
    }
  },
);
