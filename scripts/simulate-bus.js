import axios from 'axios';

// CONFIGURATION
const BASE_URL = 'http://localhost:3000';
const UPDATE_INTERVAL_MS = 3000; // Update every 3 seconds
const VEHICLE_ID = process.argv[2]; // Pass vehicle ID as argument

if (!VEHICLE_ID) {
    console.error('❌ Please provide a Vehicle ID.');
    console.error('Usage: node scripts/simulate-bus.js <vehicle_id>');
    process.exit(1);
}

// Starting point (approximate center of a city or school)
// Using Nagpur coordinates as seen in the codebase default
let lat = 20.5937;
let lon = 78.9629;
let heading = 0;
const speed = 40; // km/h

console.log(`🚌 Starting simulation for Vehicle: ${VEHICLE_ID}`);
console.log(`📍 Routes to: ${BASE_URL}/api/schools/transport/location/update`);
console.log(`⏱  Interval: ${UPDATE_INTERVAL_MS}ms`);

// Move in a circle
let angle = 0;
const radius = 0.02; // degrees ~ 2km

async function init() {
    try {
        console.log('🔄 Fetching last known location to avoid teleport detection...');
        const res = await axios.get(`${BASE_URL}/api/schools/transport/location/${VEHICLE_ID}`);
        if (res.data.currentLocation) {
            lat = res.data.currentLocation.latitude;
            lon = res.data.currentLocation.longitude;
            // Reverse engineering angle is hard, just start from here and assume angle 0 relative to center isn't critical
            console.log(`✅ Resuming from: ${lat}, ${lon}`);
        } else {
            console.log('ℹ️  No previous location found, starting from default.');
        }
    } catch (e) {
        console.log('ℹ️  Could not fetch last location, starting from default.');
    }

    sendUpdate();
    setInterval(sendUpdate, UPDATE_INTERVAL_MS);
}

init();

async function sendUpdate() {
    // Calculate new position (circular motion)
    // Reduce step size to avoid teleport detection
    angle += 0.01; // ~25-30 km/h
    lat = 20.5937 + Math.sin(angle) * radius;
    lon = 78.9629 + Math.cos(angle) * radius;
    heading = (heading + 10) % 360;

    const payload = {
        vehicleId: VEHICLE_ID,
        latitude: lat,
        longitude: lon,
        speed: speed,
        heading: heading,
        accuracy: 10,
        timestamp: new Date().toISOString()
    };

    try {
        const res = await axios.post(`${BASE_URL}/api/schools/transport/location/update`, payload);
        if (res.data.success) {
            console.log(`✅ [${new Date().toLocaleTimeString()}] Updated: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            console.log('   Response Data:', JSON.stringify(res.data));
        } else {
            console.log(`⚠️  Update skipped: ${res.data.skipped || 'Unknown reason'}`);
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.response) {
            console.error('   Response:', error.response.data);
        }
    }
}

// Loop handled in init()
