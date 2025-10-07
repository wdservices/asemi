import { NextRequest, NextResponse } from 'next/server';
import { enrollUserInCourse, getUserByEmail, getAllCourses } from '@/lib/mockData';

// Specific endpoint to enroll the users who made payments but didn't get access
export async function POST(request: NextRequest) {
  try {
    const specificUsers = [
      'mitch@communionme.com',
      'innocentodo41@gmail.com'
    ];

    const results = [];
    
    // Get all courses to enroll them in the first available course
    const courses = await getAllCourses();
    if (courses.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'No courses available for enrollment' },
        { status: 400 }
      );
    }

    const courseId = courses[0].id; // Enroll in first course
    const courseName = courses[0].title;

    for (const email of specificUsers) {
      try {
        console.log(`Processing enrollment for ${email}`);
        
        // Find user by email
        const user = await getUserByEmail(email);
        if (!user) {
          console.log(`User ${email} not found in database`);
          results.push({
            email,
            status: 'error',
            message: 'User not found in database'
          });
          continue;
        }

        console.log(`Found user: ${user.id} (${user.email})`);

        // Enroll the user in the course
        const enrollmentSuccess = await enrollUserInCourse(user.id, courseId);
        
        if (enrollmentSuccess) {
          console.log(`Successfully enrolled ${email} in ${courseName}`);
          results.push({
            email,
            status: 'success',
            message: `Enrolled in ${courseName}`,
            userId: user.id,
            courseId
          });
        } else {
          console.log(`Failed to enroll ${email}`);
          results.push({
            email,
            status: 'error',
            message: 'Enrollment failed'
          });
        }
      } catch (error) {
        console.error(`Error processing ${email}:`, error);
        results.push({
          email,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');

    return NextResponse.json({
      status: 'completed',
      message: `Enrollment process completed. ${successful.length} successful, ${failed.length} failed.`,
      data: {
        successful: successful.length,
        failed: failed.length,
        results,
        courseEnrolled: courseName
      }
    });

  } catch (error) {
    console.error('Manual enrollment error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    message: 'Manual enrollment endpoint for specific users',
    users: [
      'mitch@communionme.com',
      'innocentodo41@gmail.com'
    ]
  });
}
