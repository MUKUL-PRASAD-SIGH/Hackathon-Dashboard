const fetch = require('node-fetch');

async function fixHackathonOwner() {
  try {
    // Test API call to fix hackathon owner email
    const response = await fetch('http://localhost:10000/api/hackathons/68b1fb8f3c155441bf55c934', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer eyJpZCI6IjY4YjFlZWQ3ZWUyNmIyZmY5ZjBkMmYzOCIsImVtYWlsIjoibXVrdWxwcmFzYWQ5NTdAZ21haWwuY29tIiwibmFtZSI6Ik1VS1VMIFBSQVNBRCJ9',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'mukulprasad957@gmail.com'
      })
    });
    
    const data = await response.json();
    console.log('✅ Fixed hackathon owner email:', data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixHackathonOwner();