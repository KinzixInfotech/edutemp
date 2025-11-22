const axios = require('axios');

const partnerId = 'ef435be9-3ec2-449c-84b6-68afe5b9f6e5';

async function testEarningsAPI() {
    try {
        console.log('Testing /api/partners/earnings endpoint...');
        const response = await axios.get(`http://localhost:3000/api/partners/earnings?partnerId=${partnerId}`);

        console.log('✅ API Response Status:', response.status);
        console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));

        // Verify structure
        if (response.data.totalEarnings !== undefined) {
            console.log('✅ totalEarnings field present');
        }
        if (response.data.availableBalance !== undefined) {
            console.log('✅ availableBalance field present');
        }
        if (response.data.transactions !== undefined) {
            console.log('✅ transactions field present');
            console.log(`   Transaction count: ${response.data.transactions.length}`);
        }

    } catch (error) {
        console.error('❌ API Error:', error.response?.data || error.message);
    }
}

testEarningsAPI();
