import axios from 'axios';

/**
 * Paystack Serverless API
 * 
 * Handles payment initialization and verification server-side
 * to keep the secret key secure and avoid CORS issues.
 * 
 * Vercel Serverless Function
 */

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

interface PaystackRequest {
  action: 'initialize' | 'verify';
  email?: string;
  amount?: number;
  reference?: string;
  metadata?: Record<string, any>;
}

export default async function handler(req: any, res: any) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, amount, reference, metadata } = req.body as PaystackRequest;

  if (!PAYSTACK_SECRET_KEY) {
    console.error('[PAYSTACK API] PAYSTACK_SECRET_KEY is not set');
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  try {
    let response;

    if (action === 'initialize') {
      // Initialize payment
      if (!email || !amount) {
        return res.status(400).json({ error: 'Email and amount are required for initialization' });
      }

      response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email,
          amount,
          reference,
          metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } else if (action === 'verify') {
      // Verify payment
      if (!reference) {
        return res.status(400).json({ error: 'Reference is required for verification' });
      }

      response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "initialize" or "verify"' });
    }

    console.log(`[PAYSTACK API] ${action} successful`);
    return res.status(200).json(response.data);
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error(`[PAYSTACK API] ${action} failed:`, errorData);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Payment operation failed',
      details: errorData,
    });
  }
}
