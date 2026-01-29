import { MockAdapter } from './adapters/MockAdapter';
import { ICICIAdapter } from './adapters/ICICIAdapter';
import { RazorpayAdapter } from './adapters/RazorpayAdapter';

import { HDFCAdapter } from './adapters/HDFCAdapter';
import { AxisAdapter } from './adapters/AxisAdapter';
import { SBIAdapter } from './adapters/SBIAdapter';

export class PaymentGatewayFactory {
    static getAdapter(provider, config) {
        // Razorpay handles its own Test/Live mode via keys, so we always use the real adapter
        if (provider === 'RAZORPAY') {
            return new RazorpayAdapter(config);
        }

        // If testMode is enabled (default), always use MockAdapter for simulation
        // (Except for Razorpay as handled above)
        if (config.testMode !== false) {
            return new MockAdapter({ ...config, provider });
        }

        // Live mode - use real bank adapters
        switch (provider) {
            case 'ICICI_EAZYPAY':
                return new ICICIAdapter(config);
            case 'SBI_COLLECT':
                return new SBIAdapter(config);
            case 'HDFC_SMARTHUB':
                return new HDFCAdapter(config);
            case 'AXIS_EASYPAY':
                return new AxisAdapter(config);
            case 'MANUAL':
            case 'MOCK':
            default:
                return new MockAdapter({ ...config, provider });
        }
    }
}
