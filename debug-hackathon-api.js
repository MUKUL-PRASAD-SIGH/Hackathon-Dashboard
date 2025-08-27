// Debug hackathon API call - Run in browser console after login

console.log('🔍 Testing hackathon API call...');

const token = localStorage.getItem('token');
console.log('🎫 Token:', token ? 'Found' : 'Missing');

if (token) {
    // Test the exact API call
    fetch('http://localhost:5000/api/hackathons', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('📊 Response status:', response.status);
        console.log('📊 Response ok:', response.ok);
        return response.text();
    })
    .then(text => {
        console.log('📊 Raw response:', text);
        try {
            const data = JSON.parse(text);
            console.log('📊 Parsed data:', data);
        } catch (e) {
            console.log('❌ Failed to parse JSON:', e);
        }
    })
    .catch(error => {
        console.log('❌ Fetch error:', error);
    });
} else {
    console.log('❌ No token found');
}