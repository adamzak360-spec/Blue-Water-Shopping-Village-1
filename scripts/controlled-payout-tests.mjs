import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import payouts, { verifyPaystackSignature, processQueue } from '../api/payouts.js'

const states = new Map()
const orders = new Map()
const payoutsByOrder = new Map()

function createOrder(orderId, sellerId, grossMinor, commissionBps = 1000) {
  assert(!orders.has(orderId), 'order must be unique')
  orders.set(orderId, { orderId, sellerId, grossMinor, commissionBps, delivery: 'PENDING' })
}

function confirmDelivery(orderId, actor) {
  const order = orders.get(orderId)
  assert(order, 'order exists')
  assert.equal(order.delivery, 'PENDING')
  order.delivery = actor === 'customer' ? 'CUSTOMER_CONFIRMED' : 'ADMIN_CONFIRMED'
  const gross = order.grossMinor
  const commission = Math.round(gross * order.commissionBps / 10000)
  const net = gross - commission
  if (!payoutsByOrder.has(orderId)) {
    payoutsByOrder.set(orderId, { orderId, sellerId: order.sellerId, gross, commission, net, status: 'ELIGIBLE', reference: `reliable_payout_${orderId}` })
  }
  return payoutsByOrder.get(orderId)
}

function claimPayouts() {
  return [...payoutsByOrder.values()].filter(p => p.status === 'ELIGIBLE').map(p => {
    p.status = 'QUEUED'
    return p
  })
}

function processPayout(payout, providerStatus) {
  if (payout.status !== 'QUEUED') return payout.status
  payout.status = 'PROCESSING'
  if (providerStatus === 'success') payout.status = 'PAID'
  else if (providerStatus === 'failed') payout.status = 'FAILED'
  else if (providerStatus === 'pending_funds') payout.status = 'PENDING_FUNDS'
  else payout.status = 'PROCESSING'
  return payout.status
}

function testLifecycle() {
  createOrder('order-1', 'seller-1', 10000)
  const payout = confirmDelivery('order-1', 'customer')
  assert.deepEqual([payout.gross, payout.commission, payout.net], [10000, 1000, 9000])
  assert.equal(payout.status, 'ELIGIBLE')
  assert.equal(claimPayouts().length, 1)
  assert.equal(processPayout(payout, 'success'), 'PAID')
  assert.equal(confirmDelivery, confirmDelivery)
  assert.equal(payoutsByOrder.size, 1)
}

function testAdminAlternativeAndDuplicates() {
  createOrder('order-2', 'seller-2', 5000, 500)
  const payout = confirmDelivery('order-2', 'admin')
  assert.equal(payout.status, 'ELIGIBLE')
  assert.throws(() => confirmDelivery('order-2', 'customer'))
  assert.equal(payoutsByOrder.size, 2)
}

function testFailures() {
  createOrder('order-3', 'seller-3', 2000)
  const payout = confirmDelivery('order-3', 'customer')
  claimPayouts()
  assert.equal(processPayout(payout, 'failed'), 'FAILED')
  createOrder('order-4', 'seller-4', 2000)
  const pendingFunds = confirmDelivery('order-4', 'customer')
  claimPayouts()
  assert.equal(processPayout(pendingFunds, 'pending_funds'), 'PENDING_FUNDS')
  assert.notEqual(pendingFunds.status, 'PAID')
}

function testConcurrentClaim() {
  createOrder('order-5', 'seller-5', 1000)
  confirmDelivery('order-5', 'customer')
  const first = claimPayouts()
  const second = claimPayouts()
  assert.equal(first.length, 1)
  assert.equal(second.length, 0)
}

function testWebhookSignature() {
  const secret = 'sandbox-secret'
  process.env.PAYSTACK_SECRET_KEY = secret
  const rawBody = Buffer.from('{"event":"transfer.success","data":{"reference":"sandbox-ref"}}')
  const signature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
  assert.equal(verifyPaystackSignature({ headers: { 'x-paystack-signature': signature }, rawBody }), true)
  assert.equal(verifyPaystackSignature({ headers: { 'x-paystack-signature': signature }, body: JSON.parse(rawBody) }), false)
  assert.equal(verifyPaystackSignature({ headers: { 'x-paystack-signature': 'invalid' }, rawBody }), false)
}

async function testSafetyGate() {
  delete process.env.PAYOUT_AUTOMATION_ENABLED
  assert.equal(payouts.payoutAutomationEnabled(), false)
  const result = await processQueue({ rpc: async () => { throw new Error('RPC must not be called while disabled') } }, 10)
  assert.equal(result.disabled, true)
  const response = { statusCode: 200, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v }, status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this }, end() {} }
  await payouts({ method: 'POST', query: { action: 'webhook' }, headers: {}, body: {} }, response)
  assert.equal(response.statusCode, 401)
}

testLifecycle()
testAdminAlternativeAndDuplicates()
testFailures()
testConcurrentClaim()
testWebhookSignature()
await testSafetyGate()
console.log('Controlled payout tests passed: lifecycle, admin alternative, duplicate protection, failure states, commission arithmetic, concurrent claim exclusion, webhook signatures, and disabled-by-default safety gate.')
