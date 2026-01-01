# ICICI Bank Live Integration Guide

## Current Status: Test Mode Active ✅

The payment system is currently configured to use **Test Mode with MockAdapter** for development and testing. This allows full functionality without requiring actual bank integration.

---

## To Enable ICICI Live Integration

When you're ready to go live with ICICI Bank UPI payments, follow these steps:

### 1. Obtain Required Credentials from ICICI

Contact ICICI Bank API support and request:

#### a. Public Key Certificate (.cer file)
- Used for RSA encryption of session keys
- Required for all API requests
- File format: PEM-encoded X.509 certificate

#### b. IP Whitelisting
- Provide your server's public IP address to ICICI
- They'll whitelist it for both UAT and Production environments
- **Find your IP:** Run `curl ifconfig.me` from your server

#### c. Confirm Merchant Details
- Merchant ID: `106088`
- API Key: `rPHqfAq57eJRgslqTkq34cIs6iHXk8fa`
- Merchant Category Code (MCC): `MCCOL11`

---

### 2. Implementation Checklist

Once you have credentials:

#### [ ] Add Public Key Storage
1. Update database schema:
```prisma
model SchoolPaymentSettings {
  // ... existing fields
  iciciPublicKey  String?  // Store public key certificate content
}
```

2. Run migration:
```bash
npx prisma migrate dev --name add_icici_public_key
```

#### [ ] Update Fee Settings UI
1. Add file upload field for public key certificate
2. Read and store certificate content in database

#### [ ] Implement RSA+AES Encryption
The `ICICIAdapter.js` needs encryption methods:
- RSA/ECB/PKCS1 for session key encryption
- AES/CBC/PKCS5 for payload encryption
- Base64 encoding for all encrypted data

#### [ ] Update API Request Format
Change from plain JSON to encrypted format:
```json
{
  "requestId": "unique-id",
  "service": "CollectPay",
  "encryptedKey": "<RSA encrypted session key>",
  "oaepHashingAlgorithm": "NONE",
  "iv": "<Base64 IV>",
  "encryptedData": "<AES encrypted payload>",
  "clientInfo": "",
  "optionalParam": ""
}
```

#### [ ] Test in UAT Environment
- Use sandbox URL: `https://apibankingonesandbox.icicibank.com`
- Test with real UPI IDs
- Verify encryption/decryption works

#### [ ] Go Live
- Switch to production URL: `https://apibankingone.icicibank.com`
- Set `testMode: false` in fee settings
- Monitor transactions

---

## Current Test Mode Usage

**For Development:**
1. Go to `/dashboard/fees/settings`
2. Ensure "Test Mode" toggle is **ON** (yellow indicator)
3. All payments use MockAdapter (simulated payment page)
4. No real money transactions

**Test Flow:**
1. Student/parent goes to `/pay/dashboard`
2. Enters UPI ID (any format for testing)
3. Clicks "Proceed to Pay"
4. Redirected to mock payment page
5. Can simulate success or failure
6. Callback updates payment status

---

## API Endpoints Reference

### ICICI Collect Pay API

**UAT:**
```
POST https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/CollectPay
```

**Production:**
```
POST https://apibankingone.icicibank.com/api/MerchantAPI/UPI2/v1/CollectPay
```

### Transaction Status API

**UAT:**
```
POST https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/TransactionStatus
```

---

## Security Notes

1. **API Key** must be in both:
   - Request header: `apikey: <your-key>`
   - Request body parameter: `apikey: <your-key>`

2. **All requests must be encrypted** using RSA+AES

3. **IP whitelisting is mandatory** - requests from non-whitelisted IPs get 403 Forbidden

4. **UPI ID format:** `username@bankname` (e.g., `8789752300@ybl`, `customer@paytm`)

---

## Troubleshooting

### 403 Forbidden Error
- ✅ Check IP is whitelisted by ICICI
- ✅ Verify request is properly encrypted
- ✅ Confirm API key is in header and body

### Encryption Errors
- ✅ Ensure public key is loaded correctly
- ✅ Use 16-byte session key for AES-128
- ✅ Verify Base64 encoding

### Payment Not Completing
- ✅ Check UPI ID is valid
- ✅ Verify customer approves in UPI app
- ✅ Monitor webhook callbacks

---

## Support Contacts

**ICICI API Banking Support:**
- Email: (request from your relationship manager)
- Portal: ICICI API Banking Portal
- Documentation: Eazypay 2.0 API Documentation (input.md)

**For Integration Issues:**
- Check logs in browser console (F12)
- Review server logs for API errors
- Use Transaction Status API to query payment state

---

## Files Modified

- `/src/lib/payment/adapters/ICICIAdapter.js` - Main adapter (currently basic, needs encryption)
- `/src/app/api/payment/initiate/route.js` - Payment initiation API
- `/src/app/pay/dashboard/page.jsx` - Payment form with UPI ID input
- `/dashboard/fees/settings/page.jsx` - Payment settings UI

