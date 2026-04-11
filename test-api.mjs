fetch('http://127.0.0.1:3001/api/public/schools/flora-school-of-excellence-opposite-silwar-pahar-near-meru-hazaribagh-jharkhand')
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
