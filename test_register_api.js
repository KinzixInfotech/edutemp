const fetch = require('node-fetch');

async function testRegister() {
    const email = `api_test_${Date.now()}@example.com`;
    const data = {
        name: "API Test Partner",
        email: email,
        password: "password123",
        confirmPassword: "password123",
        contactPerson: "API Tester",
        contactPhone: "9876543210",
        role: "AFFILIATE"
    };

    console.log("Sending registration request for:", email);

    try {
        const response = await fetch('http://localhost:3000/api/partners/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log("Status:", response.status);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

testRegister();
