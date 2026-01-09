import axios from 'axios';

// CONFIGURATION
const BASE_URL = 'http://localhost:3000';
const VEHICLE_ID = process.argv[2]; // Pass vehicle ID as argument

if (!VEHICLE_ID) {
    console.error('❌ Please provide a Vehicle ID.');
    console.error('Usage: node scripts/stop-bus.js <vehicle_id>');
    process.exit(1);
}

async function stopBus() {
    try {
        console.log(`🛑 Stopping Bus: ${VEHICLE_ID}...`);

        // 1. Get last known location so we don't jump
        let lat = 20.5937;
        let lon = 78.9629;
        let heading = 0;

        try {
            const res = await axios.get(`${BASE_URL}/api/schools/transport/location/${VEHICLE_ID}`);
            if (res.data.currentLocation) {
                lat = res.data.currentLocation.latitude;
                lon = res.data.currentLocation.longitude;
                heading = res.data.currentLocation.heading || 0;
            }
        } catch (e) {
            console.log('⚠️ Could not fetch last location, using default.');
        }

        // 2. Send update with SPEED = 0
        const payload = {
            vehicleId: VEHICLE_ID,
            latitude: lat,
            longitude: lon,
            speed: 0, // <--- Stops the bus
            heading: heading,
            accuracy: 10,
            timestamp: new Date().toISOString()
        };

        const res = await axios.post(`${BASE_URL}/api/schools/transport/location/update`, payload);

        if (res.data.success) {
            console.log(`✅ Bus Stopped! Status: ${res.data.trackingStatus}`);
            console.log(`📍 Location: ${lat}, ${lon}`);
        } else {
            console.log('❌ Failed to stop:', res.data);
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

stopBus();
