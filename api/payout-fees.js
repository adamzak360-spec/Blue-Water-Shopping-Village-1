const CURRENT_GH_PAYSTACK_FEES_MINOR = Object.freeze({
  mobile_money: 100,
  bank: 800,
});

const PAYSTACK_FEE_SOURCE = 'paystack_ghana_config_v1';

function integerEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer minor-unit amount`);
  }
  return value;
}

function normalizePayoutMethod(value) {
  const method = String(value || '').trim().toLowerCase();
  if (method === 'mobile_money' || method === 'mobile-money' || method === 'momo') return 'mobile_money';
  if (method === 'ghipss' || method === 'bank' || method === 'bank_account') return 'bank';
  return null;
}

function getPaystackFeeConfig({ country = 'GH', currency = 'GHS', payoutMethod }) {
  const normalizedCountry = String(country || '').trim().toUpperCase();
  const normalizedCurrency = String(currency || '').trim().toUpperCase();
  const method = normalizePayoutMethod(payoutMethod);
  if (normalizedCountry !== 'GH' || normalizedCurrency !== 'GHS' || !method) {
    return null;
  }

  const feeMinor = method === 'mobile_money'
    ? integerEnv('PAYSTACK_GHS_MOBILE_MONEY_FEE_MINOR', CURRENT_GH_PAYSTACK_FEES_MINOR.mobile_money)
    : integerEnv('PAYSTACK_GHS_BANK_FEE_MINOR', CURRENT_GH_PAYSTACK_FEES_MINOR.bank);

  return {
    provider: 'paystack',
    country: normalizedCountry,
    currency: normalizedCurrency,
    payoutMethod: method,
    feeMinor,
    minimumTransferMinor: integerEnv('PAYSTACK_GHS_MINIMUM_TRANSFER_MINOR', 1),
    source: PAYSTACK_FEE_SOURCE,
  };
}

function calculatePayoutAmounts({ sellerAmountBeforeFeeMinor, feeMinor, minimumTransferMinor = 1 }) {
  if (!Number.isInteger(sellerAmountBeforeFeeMinor) || sellerAmountBeforeFeeMinor < 0) {
    throw new Error('sellerAmountBeforeFeeMinor must be a non-negative integer');
  }
  if (!Number.isInteger(feeMinor) || feeMinor < 0) {
    throw new Error('feeMinor must be a non-negative integer');
  }
  const sellerAmountSentMinor = sellerAmountBeforeFeeMinor - feeMinor;
  const validPositiveTransfer = sellerAmountSentMinor >= Math.max(1, minimumTransferMinor);
  return {
    sellerAmountBeforeFeeMinor,
    payoutFeeMinor: feeMinor,
    sellerAmountSentMinor: validPositiveTransfer ? sellerAmountSentMinor : 0,
    providerTotalDebitMinor: validPositiveTransfer ? sellerAmountSentMinor + feeMinor : null,
    feeSufficient: sellerAmountBeforeFeeMinor >= feeMinor,
    minimumTransferSatisfied: validPositiveTransfer,
  };
}

module.exports = {
  CURRENT_GH_PAYSTACK_FEES_MINOR,
  PAYSTACK_FEE_SOURCE,
  normalizePayoutMethod,
  getPaystackFeeConfig,
  calculatePayoutAmounts,
};

// Fee source of truth: this module plus the two server environment overrides.
// Current published Ghana defaults are GHS 1.00 for mobile money and GHS 8.00
// for bank transfers. Update the environment values when Paystack pricing changes.
// All arithmetic uses minor units (pesewas); no Paystack secret is handled here.
