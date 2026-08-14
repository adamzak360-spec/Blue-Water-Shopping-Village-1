const assert = require('assert');
const { normalizedStatus, normalizeVerification } = require('../api/flutterwave');

assert.equal(normalizedStatus('successful'), 'success');
assert.equal(normalizedStatus('failed'), 'failed');
assert.equal(normalizedStatus('refunded'), 'refunded');
assert.equal(normalizedStatus('unknown'), 'pending');

const normalized = normalizeVerification({
  status: 'success',
  data: {
    id: 12345,
    tx_ref: 'rlbl-test-1',
    flw_ref: 'FLW-1',
    status: 'successful',
    amount: 125.5,
    currency: 'GHS',
    charged_at: '2026-08-14T00:00:00Z',
  },
});

assert.deepEqual(normalized.provider, 'flutterwave');
assert.deepEqual(normalized.providerReference, 'rlbl-test-1');
assert.deepEqual(normalized.transactionId, '12345');
assert.deepEqual(normalized.status, 'success');
assert.deepEqual(normalized.amountMinor, 12550);
assert.deepEqual(normalized.currency, 'GHS');

console.log('Flutterwave adapter normalization tests passed');
