import { fetchSchoolsByPincode, transformSchool, isOperational } from './src/lib/udise-client.js';

async function mock() {
  try {
    const apiData = await fetchSchoolsByPincode('110001');
    const operationalSchools = apiData.data.content.filter(isOperational);
    const apiSchool = operationalSchools[0];
    const { school, profile } = transformSchool(apiSchool, 'test-slug');

    // Make an API call to a specific local dummy endpoint that will attempt the upsert and return error!
    // Since we cannot run Prisma outside next.js context right now without huge pain:
    const insertReq = await fetch('http://localhost:3000/api/edubreezyatlas/test-prisma', {
       method: 'POST', body: JSON.stringify({ school, profile }), headers: {'Content-Type': 'application/json'}
    });
    console.log(await insertReq.json());
  } catch(e) {
    console.error(e);
  }
}
mock();
