import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { AppDispatch, RootState } from './index';

/** Typed dispatch — knows about thunks (fetchBulkData, drainPendingOps). */
export const useAppDispatch = () => useDispatch<AppDispatch>();
/** Typed selector — `state` is fully inferred from the root reducer. */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
