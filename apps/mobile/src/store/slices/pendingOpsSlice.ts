import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  CreateCategoryInput,
  ManualTxnInput,
  UpdateAutoReplyConfig,
  UpdateCategoryInput,
} from '@yes-boss/shared';

export type PendingOp =
  | { id: string; type: 'updateAutoReply'; payload: UpdateAutoReplyConfig; createdAt: string }
  | { id: string; type: 'createCategory'; payload: CreateCategoryInput & { tempId: string }; createdAt: string }
  | { id: string; type: 'updateCategory'; payload: { id: string; patch: UpdateCategoryInput }; createdAt: string }
  | { id: string; type: 'deleteCategory'; payload: { id: string }; createdAt: string }
  | { id: string; type: 'addManualTxn'; payload: ManualTxnInput & { localId: string }; createdAt: string };

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
