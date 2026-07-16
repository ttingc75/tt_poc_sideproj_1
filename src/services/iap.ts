import {
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';

/**
 * Placeholder product id — must be created in App Store Connect / Google Play
 * Console before this can complete a real purchase. See README for setup steps.
 */
export const PRO_UNLOCK_SKU = 'subradar_pro_unlock';

let initialized = false;

export async function initIAP(onProUnlocked: () => void): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    await initConnection();
  } catch (error) {
    console.warn('IAP connection unavailable (expected in Expo Go):', error);
    return;
  }

  purchaseUpdatedListener(async (purchase: Purchase) => {
    await finishTransaction({ purchase, isConsumable: false });
    onProUnlocked();
  });

  purchaseErrorListener((error: PurchaseError) => {
    console.warn('IAP purchase error:', error);
  });
}

export async function purchasePro(): Promise<void> {
  await requestPurchase({
    request: {
      apple: { sku: PRO_UNLOCK_SKU, quantity: 1 },
      google: { skus: [PRO_UNLOCK_SKU] },
    },
    type: 'in-app',
  });
}

/** Re-checks past purchases (e.g. after reinstalling) and reports whether the pro unlock is owned. */
export async function restorePurchases(): Promise<boolean> {
  const purchases = await getAvailablePurchases();
  return purchases.some((p) => p.productId === PRO_UNLOCK_SKU);
}
