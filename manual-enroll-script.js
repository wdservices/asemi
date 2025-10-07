// Manual enrollment script for users who paid but didn't get access
// Run this in the browser console on your app's admin page

const enrollUser = async (email, courseId) => {
  try {
    console.log(`Enrolling ${email} in course ${courseId}...`);
    
    const response = await fetch('/api/admin/enroll-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        courseId: courseId
      })
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log(`✅ SUCCESS: ${email} enrolled in course ${courseId}`);
      console.log('Details:', result.data);
    } else {
      console.error(`❌ FAILED: ${email} - ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ ERROR enrolling ${email}:`, error);
    return { status: 'error', message: error.message };
  }
};

const getAvailableCourses = async () => {
  try {
    const response = await fetch('/api/admin/enroll-user');
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('📚 Available Courses:');
      result.data.forEach(course => {
        console.log(`- ${course.id}: ${course.title} (${course.pricing?.type || 'free'})`);
      });
      return result.data;
    } else {
      console.error('Failed to fetch courses:', result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

// Main enrollment function
const enrollUsersInCourse = async (emails, courseId) => {
  console.log(`🚀 Starting enrollment for ${emails.length} users in course: ${courseId}`);
  
  const results = [];
  
  for (const email of emails) {
    const result = await enrollUser(email, courseId);
    results.push({ email, result });
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 ENROLLMENT SUMMARY:');
  const successful = results.filter(r => r.result.status === 'success');
  const failed = results.filter(r => r.result.status !== 'success');
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed enrollments:');
    failed.forEach(f => {
      console.log(`- ${f.email}: ${f.result.message}`);
    });
  }
  
  return results;
};

// Usage instructions
console.log(`
🔧 MANUAL ENROLLMENT SCRIPT LOADED

1. First, get available courses:
   await getAvailableCourses()

2. Then enroll users (replace COURSE_ID with actual course ID):
   await enrollUsersInCourse(['mitch@communionme.com', 'innocentodo41@gmail.com'], 'COURSE_ID')

3. Or enroll one user at a time:
   await enrollUser('mitch@communionme.com', 'COURSE_ID')
`);

// Auto-run to show available courses
getAvailableCourses();
