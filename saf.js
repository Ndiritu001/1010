require('dotenv').config();
const axios = require('axios');

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const OAUTH_PATH = '/oauth/v1/generate?grant_type=client_credentials';
const STK_PUSH_PATH = '/mpesa/stkpush/v1/processrequest';

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || '';
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '174379';
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/path/to/callback';
const MPESA_PARTYA = process.env.MPESA_PARTYA || '254700000000';
const MPESA_PHONE_NUMBER = process.env.MPESA_PHONE_NUMBER || MPESA_PARTYA;

const args = process.argv.slice(2);
const CLI_PARTYA = args[0] || MPESA_PARTYA;
const CLI_AMOUNT = args[1] || '1';
const CLI_CALLBACK_URL = args[2] || MPESA_CALLBACK_URL;

const placeholders = [
  'your_mpesa_consumer_key_here',
  'your_mpesa_consumer_secret_here',
  'your_mpesa_passkey_here',
  'YOUR_CONSUMER_KEY',
  'YOUR_CONSUMER_SECRET'
];

if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_PASSKEY || placeholders.includes(MPESA_CONSUMER_KEY) || placeholders.includes(MPESA_CONSUMER_SECRET) || placeholders.includes(MPESA_PASSKEY)) {
  console.warn('⚠️  M-Pesa env config is missing or still using placeholders.');
  console.warn('   Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, and MPESA_PASSKEY in .env or h.env.');
}

async function getAccessToken() {
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
    throw new Error('Missing MPESA consumer credentials.');
  }

  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');

  try {
    const response = await axios.get(`${SANDBOX_BASE}${OAUTH_PATH}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json'
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Token generation failed:', error.response ? error.response.data : error.message);
    return null;
  }
}

async function initiateSTKPush() {
  const token = await getAccessToken();
  if (!token) return;

  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).toString('base64');

  const requestBody = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: CLI_AMOUNT,
    PartyA: CLI_PARTYA,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: MPESA_PHONE_NUMBER,
    CallBackURL: CLI_CALLBACK_URL,
    AccountReference: 'brisamotors',
    TransactionDesc: 'Payment for goods'
  };

  try {
    const response = await axios.post(`${SANDBOX_BASE}${STK_PUSH_PATH}`, requestBody, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('STK Push initiated:', response.data);
  } catch (error) {
    console.error('STK Push failed:', error.response ? error.response.data : error.message);
  }
}

initiateSTKPush();
