const assert = require('node:assert/strict');
const { getPaystackFeeConfig, calculatePayoutAmounts } = require('../lib/payout-fees');

const config = getPaystackFeeConfig({ country: 'GH', currency: 'GHS', payoutMethod: 'mobile_money' });
assert.equal(config.feeMinor, 100);
assert.equal(config.minimumTransferMinor, 1000);

const golden = calculatePayoutAmounts({
  sellerAmountBeforeFeeMinor: 190,
  feeMinor: config.feeMinor,
  minimumTransferMinor: config.minimumTransferMinor,
});
assert.equal(golden.sellerAmountSentMinor, 0);
assert.equal(golden.providerTotalDebitMinor, null);
assert.equal(golden.minimumTransferSatisfied, false);

const threshold = calculatePayoutAmounts({
  sellerAmountBeforeFeeMinor: 1100,
  feeMinor: config.feeMinor,
  minimumTransferMinor: config.minimumTransferMinor,
});
assert.equal(threshold.sellerAmountSentMinor, 1000);
assert.equal(threshold.providerTotalDebitMinor, 1100);
assert.equal(threshold.minimumTransferSatisfied, true);

console.log('wallet accumulation guard tests passed');

