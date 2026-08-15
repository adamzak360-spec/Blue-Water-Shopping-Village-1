import payouts from '../api/payouts.js'
import recipient from '../api/paystack-recipient.js'

function responseCapture() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(value) { this.body = value; return this },
    end() { return this },
  }
}

process.env.PAYOUT_AUTOMATION_ENABLED = ''

const workerRes = responseCapture()
await payouts({ method: 'POST', query: { action: 'process-queue' }, headers: {}, body: {} }, workerRes)
if (workerRes.statusCode !== 409 || workerRes.body?.disabled !== true) {
  throw new Error(`Worker safety gate failed: ${JSON.stringify(workerRes)}`)
}

const recipientRes = responseCapture()
await recipient({ method: 'POST', headers: {}, body: {} }, recipientRes)
if (recipientRes.statusCode !== 409 || recipientRes.body?.disabled !== true) {
  throw new Error(`Recipient safety gate failed: ${JSON.stringify(recipientRes)}`)
}

console.log('Payout safety smoke test passed: automated worker and Paystack recipient onboarding are disabled by default.')
