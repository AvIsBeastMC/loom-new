import { env } from '../../env';
import { createStore } from 'zustand/vanilla';

interface StoreState {
  allTestMode: boolean;
  isDev: boolean;
}

export const store = createStore<StoreState>((set) => ({
  // You could alter allTestMode for node server instance regardless of isDev or running environment but isDev cannot be changed after definition based on deployment.
  allTestMode: env.RUN_TYPE == 'dev',
  isDev: env.RUN_TYPE == 'dev'
}));