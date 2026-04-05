const http = require('http');

async function testPipeline() {
  console.log("1. Seeding pincodes...");
  const seedReq = await fetch('http://localhost:3000/api/edubreezyatlas/seed-pincodes');
  console.log(await seedReq.json());

  console.log("2. Spawning Cron orchestrator...");
  const cronReq = await fetch('http://localhost:3000/api/cron/atlas-import', {
     headers: { 'Authorization': 'Bearer 21126ed8b80e875a280fe23617b3c07d80ba8f34f4289cf169bc7de5fb44a6ab' }
  });
  const cronRes = await cronReq.json();
  console.log(cronRes);

  if (!cronRes.jobId) return console.log("NO JOB ID");

  console.log("3. Executing Background worker payload manually...");
  const workerReq = await fetch('http://localhost:3000/api/cron/atlas-import/worker', {
     method: 'POST',
     body: JSON.stringify({ jobId: cronRes.jobId }),
     headers: { 'Content-Type': 'application/json', 'x-internal-key': '21126ed8b80e875a280fe23617b3c07d80ba8f34f4289cf169bc7de5fb44a6ab' }
  });
  const workerRes = await workerReq.json();
  console.log("Worker Completed Response:", workerRes);
}

testPipeline().catch(console.error);
