import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { calculatePayoutAmounts, getPaystackFeeConfig, normalizePayoutMethod } = require('../lib/payout-fees.js');

assert.equal(normalizePayoutMethod('momo'), 'mobile_money');
assert.equal(normalizePayoutMethod('ghipss'), 'bank');
assert.equal(normalizePayoutMethod('unknown'), null);

const mobile = getPaystackFeeConfig({ country: 'GH', currency: 'GHS', payoutMethod: 'mobile_money' });
assert.equal(mobile.feeMinor, 100);
const mobileAmounts = calculatePayoutAmounts({ sellerAmountBeforeFeeMinor: 190, feeMinor: mobile.feeMinor });
assert.deepEqual(mobileAmounts, {
  sellerAmountBeforeFeeMinor: 190,
  payoutFeeMinor: 100,
  sellerAmountSentMinor: 90,
  providerTotalDebitMinor: 190,
  feeSufficient: true,
  minimumTransferSatisfied: true,
});

const bank = getPaystackFeeConfig({ country: 'GH', currency: 'GHS', payoutMethod: 'bank' });
assert.equal(bank.feeMinor, 800);
const bankAmounts = calculatePayoutAmounts({ sellerAmountBeforeFeeMinor: 190, feeMinor: bank.feeMinor });
assert.equal(bankAmounts.feeSufficient, false);
assert.equal(bankAmounts.sellerAmountSentMinor, 0);
assert.equal(bankAmounts.providerTotalDebitMinor, null);

const changedFee = calculatePayoutAmounts({ sellerAmountBeforeFeeMinor: 250, feeMinor: 125 });
assert.equal(changedFee.sellerAmountSentMinor, 125);
assert.equal(changedFee.providerTotalDebitMinor, 250);

const belowMinimum = calculatePayoutAmounts({ sellerAmountBeforeFeeMinor: 101, feeMinor: 100, minimumTransferMinor: 2 });
assert.equal(belowMinimum.minimumTransferSatisfied, false);
assert.equal(belowMinimum.providerTotalDebitMinor, null);

console.log('payout fee tests passed');
