import { MockAdapter } from './adapters/MockAdapter';
import { ICICIAdapter } from './adapters/ICICIAdapter';
import { SBIAdapter } from './adapters/SBIAdapter';
import { HDFCAdapter } from './adapters/HDFCAdapter';
import { AxisAdapter } from './adapters/AxisAdapter';

export class PaymentGatewayFactory {
    static getAdapter(provider, config) {
        // If testMode is enabled (default), always use MockAdapter for simulation
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
