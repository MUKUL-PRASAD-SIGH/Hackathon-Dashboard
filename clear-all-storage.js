// Run this in browser console to clear all storage
console.log('🧹 Clearing all localStorage...');
localStorage.clear();

console.log('🧹 Clearing all sessionStorage...');
sessionStorage.clear();

console.log('🧹 Clearing all cookies...');
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('✅ All storage cleared! Refresh the page.');