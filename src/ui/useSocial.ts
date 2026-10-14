import { useSyncExternalStore } from 'react';
import { social } from '../core/social';
export const useSocial = () => useSyncExternalStore(social.subscribe, social.getSnapshot);
