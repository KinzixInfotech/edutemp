import { PaymentAdapter } from '../PaymentAdapter';

export class MockAdapter extends PaymentAdapter {
    async initiatePayment(paymentData) {
        // Mock Redirect URL (In reality this would be the bank page)
        // We simulate a page that just redirects back with success/failure
        // In Dev mode, force pay.localhost:3000 as requested
        const baseUrl = process.env.NODE_ENV === 'development'
            ? 'http://pay.localhost:3000'
            : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

        // This is a simulation URL. In production, this would be the Bank's URL.
        // We will create a local page /pay/mock-bank-page to simulate the bank.
        // Append params to URL for GET redirect (Frontend uses window.location.href)
        const params = new URLSearchParams({
            merchantId: this.config.merchantId || 'MOCK_MERCHANT',
            amount: paymentData.amount,
            orderId: paymentData.orderId,
            returnUrl: paymentData.returnUrl,
            provider: this.config.provider || 'TEST_BANK'
        });

        const redirectUrl = `${baseUrl}/pay/mock-bank-page?${params.toString()}`;

        return {
            url: redirectUrl,
            method: 'GET',
            params: {} // Params already in URL
        };
    }

    async verifyPayment(responseParams) {
        // Expecting status='success' or 'failure'
        const status = responseParams.status?.toLowerCase() === 'success' ? 'SUCCESS' : 'FAILED';

        return {
            status,
            transactionId: responseParams.transactionId || `MOCK_TXN_${Date.now()}`,
            amount: parseFloat(responseParams.amount || 0),
            rawResponse: responseParams
        };
    }
}
