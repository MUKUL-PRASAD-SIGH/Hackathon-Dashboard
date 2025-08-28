// Clear all browser storage and cache
console.log('🧹 Clearing all browser storage...');

try {
  // Clear localStorage
  localStorage.clear();
  console.log('✅ localStorage cleared');
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('✅ sessionStorage cleared');
  
  // Clear debug logs
  sessionStorage.removeItem('debugLogs');
  console.log('✅ Debug logs cleared');
  
  console.log('🎉 All storage cleared successfully!');
  console.log('💡 Please refresh the page to start fresh.');
  
} catch (error) {
  console.error('❌ Error clearing storage:', error);
}