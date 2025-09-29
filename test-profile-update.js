// Simple test script to verify the profile update functionality
const testProfileUpdate = async () => {
  const baseUrl = 'http://localhost:3001';
  
  try {
    console.log('Testing profile update API...');
    
    // First, let's check if we can get users (to test basic connectivity)
    const usersResponse = await fetch(`${baseUrl}/api/users`);
    const users = await usersResponse.json();
    
    console.log('✅ Successfully connected to backend');
    console.log(`📊 Found ${users.length} users in database`);
    
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`🧪 Test user: ${testUser.email} (ID: ${testUser.id})`);
      
      // Test the new profile endpoint with a simple update
      const profileUpdateData = {
        email: testUser.email, // Same email to avoid conflicts
        // We won't test password change without knowing the current password
      };
      
      const profileResponse = await fetch(`${baseUrl}/api/users/${testUser.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileUpdateData),
      });
      
      const profileResult = await profileResponse.json();
      
      if (profileResponse.ok) {
        console.log('✅ Profile update endpoint is working');
        console.log(`📧 User email confirmed: ${profileResult.user?.email || profileResult.email}`);
      } else {
        console.log('⚠️ Profile update response:', profileResult);
      }
      
    } else {
      console.log('ℹ️ No users found in database for testing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testProfileUpdate();

module.exports = { testProfileUpdate };