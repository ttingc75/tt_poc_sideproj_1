import { create } from 'zustand';

import * as db from '../db/database';
import { canAddSubscription, sortByUpcoming, type NewSubscription, type Subscription } from '../domain/subscription';
import { cancelReminder, scheduleReminder } from '../services/notifications';

const PRO_SETTING_KEY = 'isPro';

interface SubscriptionState {
  subscriptions: Subscription[];
  isPro: boolean;
  isLoaded: boolean;
  load: () => Promise<void>;
  addSubscription: (input: NewSubscription) => Promise<{ ok: true } | { ok: false; reason: 'limit-reached' }>;
  editSubscription: (id: number, input: NewSubscription) => Promise<void>;
  removeSubscription: (id: number) => Promise<void>;
  setPro: (value: boolean) => Promise<void>;
  canAddMore: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  isPro: false,
  isLoaded: false,

  load: async () => {
    const [subscriptions, proSetting] = await Promise.all([
      db.listSubscriptions(),
      db.getSetting(PRO_SETTING_KEY),
    ]);
    set({
      subscriptions: sortByUpcoming(subscriptions),
      isPro: proSetting === 'true',
      isLoaded: true,
    });
  },

  canAddMore: () => canAddSubscription(get().subscriptions.length, get().isPro),

  addSubscription: async (input) => {
    if (!get().canAddMore()) {
      return { ok: false, reason: 'limit-reached' };
    }
    const id = await db.insertSubscription(input);
    await scheduleReminder({ ...input, id });
    await get().load();
    return { ok: true };
  },

  editSubscription: async (id, input) => {
    await db.updateSubscription(id, input);
    await cancelReminder(id);
    await scheduleReminder({ ...input, id });
    await get().load();
  },

  removeSubscription: async (id) => {
    await cancelReminder(id);
    await db.deleteSubscription(id);
    await get().load();
  },

  setPro: async (value) => {
    await db.setSetting(PRO_SETTING_KEY, value ? 'true' : 'false');
    set({ isPro: value });
  },
}));
