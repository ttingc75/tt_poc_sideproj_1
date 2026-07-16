import { create } from 'zustand';

import * as db from '../db/database';
import { canAddSubscription, sortByUpcoming, type NewSubscription, type Subscription } from '../domain/subscription';
import { cancelReminder, scheduleReminder } from '../services/notifications';

const PRO_SETTING_KEY = 'isPro';
const ONBOARDED_SETTING_KEY = 'hasOnboarded';

interface SubscriptionState {
  subscriptions: Subscription[];
  isPro: boolean;
  isLoaded: boolean;
  hasOnboarded: boolean;
  load: () => Promise<void>;
  addSubscription: (input: NewSubscription) => Promise<{ ok: true } | { ok: false; reason: 'limit-reached' }>;
  editSubscription: (id: number, input: NewSubscription) => Promise<void>;
  removeSubscription: (id: number) => Promise<void>;
  importSubscriptions: (inputs: NewSubscription[]) => Promise<{ imported: number; skippedForLimit: number }>;
  setPro: (value: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  canAddMore: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  isPro: false,
  isLoaded: false,
  hasOnboarded: false,

  load: async () => {
    const [subscriptions, proSetting, onboardedSetting] = await Promise.all([
      db.listSubscriptions(),
      db.getSetting(PRO_SETTING_KEY),
      db.getSetting(ONBOARDED_SETTING_KEY),
    ]);
    set({
      subscriptions: sortByUpcoming(subscriptions),
      isPro: proSetting === 'true',
      hasOnboarded: onboardedSetting === 'true',
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

  importSubscriptions: async (inputs) => {
    const isPro = get().isPro;
    const startingCount = get().subscriptions.length;
    let imported = 0;

    for (const input of inputs) {
      if (!canAddSubscription(startingCount + imported, isPro)) {
        break;
      }
      const id = await db.insertSubscription(input);
      await scheduleReminder({ ...input, id });
      imported++;
    }

    await get().load();
    return { imported, skippedForLimit: inputs.length - imported };
  },

  setPro: async (value) => {
    await db.setSetting(PRO_SETTING_KEY, value ? 'true' : 'false');
    set({ isPro: value });
  },

  completeOnboarding: async () => {
    await db.setSetting(ONBOARDED_SETTING_KEY, 'true');
    set({ hasOnboarded: true });
  },
}));
