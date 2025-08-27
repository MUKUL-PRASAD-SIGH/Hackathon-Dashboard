// Debug User ID Mismatch - Run in browser console after login

console.log('🔍 Debugging User ID Mismatch...');

// Get current user data
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

console.log('📋 Current Authentication State:');
console.log('Token exists:', !!token);
console.log('User exists:', !!userStr);

if (token) {
    try {
        // Decode token to see user ID
        const tokenData = JSON.parse(atob(token));
        console.log('🎫 Token Data:', tokenData);
        console.log('🆔 User ID from token:', tokenData.id);
    } catch (e) {
        console.log('❌ Failed to decode token:', e);
    }
}

if (userStr) {
    try {
        const userData = JSON.parse(userStr);
        console.log('👤 User Data:', userData);
        console.log('🆔 User ID from user data:', userData._id || userData.id);
    } catch (e) {
        console.log('❌ Failed to parse user data:', e);
    }
}

// Test API call to get hackathons
async function testHackathonAPI() {
    try {
        console.log('🚀 Testing hackathon API...');
        const response = await fetch('/api/hackathons', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        console.log('📊 API Response:', data);
        
        if (data.debug) {
            console.log('🔍 Debug Info:', data.debug);
        }
        
    } catch (error) {
        console.log('❌ API Error:', error);
    }
}

if (token) {
    testHackathonAPI();
}