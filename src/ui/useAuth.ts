import { useSyncExternalStore } from 'react';
import { auth } from '../core/auth';
export const useAuth = () => useSyncExternalStore(auth.subscribe, auth.getSnapshot);
