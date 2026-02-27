// LINE AI Partner – Payment service
//
// Apple IAP / キャリア決済（docomo/au/SoftBank）/ LINE Pay 統合
//
// ターゲット: 若年層（クレジットカード不要）
// プラン構成: Free(50msg/月) / Standard(¥980/月) / Premium(¥1,980/月)
//
// 各決済プロバイダはインターフェースで統一し、validateReceipt() で
// プロバイダを判定して適切なバリデーションを実行する。

import { createSubsystemLogger } from "../../logging/subsystem.js";
import type { Plan } from "./plans.js";
import { setUserPlan, getActivePlan } from "./stripe-service.js";

const log = createSubsystemLogger("line-ai-partner");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported payment providers */
export type PaymentProvider =
  | "apple_iap"
  | "carrier_docomo"
  | "carrier_au"
  | "carrier_softbank"
  | "line_pay";

/** Receipt submitted by the client for validation */
export type PaymentReceipt = {
  provider: PaymentProvider;
  /** Provider-specific receipt data (e.g. App Store transaction ID, carrier auth token) */
  receiptData: string;
  /** LINE user ID */
  userId: string;
  /** Plan being purchased */
  planId: string;
};

/** Result of receipt validation */
export type ValidationResult = {
  valid: boolean;
  provider: PaymentProvider;
  transactionId?: string;
  expiresAt?: string;
  error?: string;
};

/** Subscription status from any payment provider */
export type PaymentSubscription = {
  userId: string;
  planId: string;
  provider: PaymentProvider;
  status: "active" | "expired" | "canceled" | "pending";
  transactionId: string;
  expiresAt: string;
  autoRenewing: boolean;
};

// ---------------------------------------------------------------------------
// Apple IAP (App Store Server API v2)
// ---------------------------------------------------------------------------

/**
 * Validate an Apple IAP receipt using App Store Server API v2.
 *
 * Required env vars:
 *   APP_STORE_CONNECT_ISSUER_ID
 *   APP_STORE_CONNECT_KEY_ID
 *   APP_STORE_CONNECT_PRIVATE_KEY (PEM)
 *   APP_STORE_BUNDLE_ID
 *
 * @see https://developer.apple.com/documentation/appstoreserverapi
 */
async function validateAppleReceipt(_receipt: PaymentReceipt): Promise<ValidationResult> {
  // TODO: Implement Apple App Store Server API v2 integration
  //
  // Steps:
  // 1. Generate JWT using App Store Connect API key
  // 2. POST to https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}
  // 3. Decode the JWS (JSON Web Signature) signed transaction
  // 4. Verify the transaction's productId matches the plan
  // 5. Check expiresDate for subscription validity
  //
  // For sandbox testing:
  //   https://api.storekit-sandbox.itunes.apple.com/

  log.warn("Apple IAP validation not yet implemented");
  return {
    valid: false,
    provider: "apple_iap",
    error: "Apple IAP validation not yet implemented. Set APP_STORE_CONNECT_* env vars.",
  };
}

// ---------------------------------------------------------------------------
// キャリア決済 (docomo/au/SoftBank)
// ---------------------------------------------------------------------------

/**
 * Validate a carrier billing transaction.
 *
 * Carrier billing in Japan typically goes through an aggregator service
 * (e.g. SB Payment Service, GMO Payment Gateway, or LINE Pay's carrier billing).
 *
 * Required env vars:
 *   CARRIER_BILLING_API_KEY
 *   CARRIER_BILLING_API_SECRET
 *   CARRIER_BILLING_ENDPOINT
 */
async function validateCarrierReceipt(receipt: PaymentReceipt): Promise<ValidationResult> {
  // TODO: Implement carrier billing validation via payment aggregator
  //
  // Common flow:
  // 1. User initiates payment → redirect to carrier auth page
  // 2. Carrier authenticates user (via SIM/phone number)
  // 3. Aggregator returns transaction token
  // 4. Server validates token with aggregator API
  // 5. Aggregator confirms charge → activate subscription
  //
  // Supported carriers:
  //   - docomo (d払い / ドコモ払い)
  //   - au (auかんたん決済)
  //   - SoftBank (ソフトバンクまとめて支払い)

  const carrier = receipt.provider.replace("carrier_", "");
  log.warn(`Carrier billing (${carrier}) validation not yet implemented`);
  return {
    valid: false,
    provider: receipt.provider,
    error: `Carrier billing (${carrier}) validation not yet implemented. Set CARRIER_BILLING_* env vars.`,
  };
}

// ---------------------------------------------------------------------------
// LINE Pay
// ---------------------------------------------------------------------------

/**
 * Validate a LINE Pay transaction.
 *
 * LINE Pay supports carrier billing, credit cards, and LINE Pay balance —
 * making it ideal as a single integration point for multiple payment methods.
 *
 * Required env vars:
 *   LINE_PAY_CHANNEL_ID
 *   LINE_PAY_CHANNEL_SECRET
 *
 * @see https://pay.line.me/documents/online_v3.html
 */
async function validateLinePayReceipt(_receipt: PaymentReceipt): Promise<ValidationResult> {
  // TODO: Implement LINE Pay API v3 integration
  //
  // Flow:
  // 1. Server calls Reserve API to create payment reservation
  // 2. User redirects to LINE Pay approval page
  // 3. User approves payment (via LINE Pay balance, credit card, or carrier)
  // 4. LINE Pay redirects back to confirmUrl
  // 5. Server calls Confirm API with transactionId
  // 6. LINE Pay processes payment → activate subscription
  //
  // Recurring payments (auto-charge):
  //   Reserve API with "capture": false + preapproved payment regKey

  log.warn("LINE Pay validation not yet implemented");
  return {
    valid: false,
    provider: "line_pay",
    error: "LINE Pay validation not yet implemented. Set LINE_PAY_* env vars.",
  };
}

// ---------------------------------------------------------------------------
// Unified Payment API
// ---------------------------------------------------------------------------

/**
 * Validate a payment receipt from any supported provider.
 * On success, activates the user's subscription plan.
 */
export async function validateReceipt(receipt: PaymentReceipt): Promise<ValidationResult> {
  let result: ValidationResult;

  switch (receipt.provider) {
    case "apple_iap":
      result = await validateAppleReceipt(receipt);
      break;
    case "carrier_docomo":
    case "carrier_au":
    case "carrier_softbank":
      result = await validateCarrierReceipt(receipt);
      break;
    case "line_pay":
      result = await validateLinePayReceipt(receipt);
      break;
    default: {
      const unknownProvider = receipt.provider as string;
      return {
        valid: false,
        provider: unknownProvider as PaymentProvider,
        error: `Unsupported payment provider: ${unknownProvider}`,
      };
    }
  }

  // If validation succeeds, activate the plan
  if (result.valid) {
    await setUserPlan(receipt.userId, receipt.planId);
    log.info(
      `Payment validated: userId=${receipt.userId} plan=${receipt.planId} provider=${receipt.provider}`,
    );
  }

  return result;
}

/**
 * Check the current subscription status for a user.
 * Reads from the local billing store.
 */
export async function checkSubscriptionStatus(
  userId: string,
): Promise<{ plan: Plan; active: boolean }> {
  const plan = await getActivePlan(userId);
  return {
    plan,
    active: plan.id !== "free",
  };
}

/**
 * Handle payment webhooks from any provider.
 * Routes to the appropriate handler based on provider identification.
 */
export async function handlePaymentWebhook(
  provider: PaymentProvider,
  _payload: Record<string, unknown>,
): Promise<void> {
  // TODO: Implement webhook handlers for each provider
  //
  // Apple IAP:
  //   App Store Server Notifications v2
  //   Types: DID_RENEW, DID_FAIL_TO_RENEW, EXPIRED, REFUND
  //
  // Carrier billing:
  //   Aggregator webhook notifications
  //   Types: payment.completed, payment.failed, subscription.canceled
  //
  // LINE Pay:
  //   No webhook — poll Confirm API or use preapproved payment status check

  log.warn(`Payment webhook handler not yet implemented for provider: ${provider}`);
}

/**
 * Cancel a user's subscription.
 */
export async function cancelPaymentSubscription(userId: string): Promise<void> {
  // Downgrade to free plan
  await setUserPlan(userId, "free");
  log.info(`Subscription canceled for userId=${userId}`);
}

/**
 * Get available payment methods for the user's environment.
 * Used to show appropriate payment options in LINE UI.
 */
export function getAvailablePaymentMethods(): PaymentProvider[] {
  const methods: PaymentProvider[] = [];

  if (process.env.APP_STORE_CONNECT_KEY_ID) {
    methods.push("apple_iap");
  }
  if (process.env.CARRIER_BILLING_API_KEY) {
    methods.push("carrier_docomo", "carrier_au", "carrier_softbank");
  }
  if (process.env.LINE_PAY_CHANNEL_ID) {
    methods.push("line_pay");
  }

  return methods;
}
