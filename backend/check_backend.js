const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function main() {
  try {
    console.log('Requesting /api/salons...');
    const res = await get('http://127.0.0.1:5000/api/salons');
    console.log('Status:', res.status);
    console.log('Data:', res.data.slice(0, 500));
  } catch (err) {
    console.error('API Request Failed:', err.message);
  }
}

main();
