// Quick test to decode a token and see what's inside
const token = "eyJpZCI6IjY4YWVmMTI3ZmFjM2FmMTUzZWY1YTIzZSIsImVtYWlsIjoibXVrdWxwcmFzYWQ5NTdAZ21haWwuY29tIiwibmFtZSI6Ik11a3VsIFByYXNhZCJ9"; // Replace with actual token

try {
  const userData = JSON.parse(Buffer.from(token, 'base64').toString());
  console.log('🔍 Token contains:');
  console.log('- ID:', userData.id);
  console.log('- Email:', userData.email);
  console.log('- Name:', userData.name);
  console.log('- Email length:', userData.email.length);
  console.log('- Email bytes:', Buffer.from(userData.email).toString('hex'));
} catch (error) {
  console.error('❌ Token decode error:', error);
}

// Also check what the user should provide
console.log('\n📧 Expected email: mukulprasad957@gmail.com');
console.log('📧 Expected length:', 'mukulprasad957@gmail.com'.length);
console.log('📧 Expected bytes:', Buffer.from('mukulprasad957@gmail.com').toString('hex'));