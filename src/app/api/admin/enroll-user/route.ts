import { NextRequest, NextResponse } from 'next/server';
import { enrollUserInCourse, getUserByEmail, getAllCourses } from '@/lib/mockData';

export async function POST(request: NextRequest) {
  try {
    const { email, courseId } = await request.json();

    if (!email || !courseId) {
      return NextResponse.json(
        { status: 'error', message: 'Email and Course ID are required' },
        { status: 400 }
      );
    }

    console.log(`Attempting to enroll user with email: ${email} in course: ${courseId}`);

    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { status: 'error', message: `User with email ${email} not found` },
        { status: 404 }
      );
    }

    console.log(`Found user: ${user.id} (${user.email})`);

    // Enroll the user in the course
    const enrollmentSuccess = await enrollUserInCourse(user.id, courseId);
    
    if (enrollmentSuccess) {
      console.log(`Successfully enrolled user ${user.email} in course ${courseId}`);
      return NextResponse.json({
        status: 'success',
        message: `User ${email} enrolled successfully in course ${courseId}`,
        data: { 
          userId: user.id, 
          email: user.email,
          courseId,
          enrolledAt: new Date().toISOString()
        }
      });
    } else {
      console.error(`Failed to enroll user ${user.email} in course ${courseId}`);
      return NextResponse.json(
        { status: 'error', message: 'Enrollment failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Admin enrollment error:', error);
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

// GET endpoint to list available courses
export async function GET(request: NextRequest) {
  try {
    const courses = await getAllCourses();
    return NextResponse.json({
      status: 'success',
      message: 'Available courses',
      data: courses.map(course => ({
        id: course.id,
        title: course.title,
        slug: course.slug,
        price: course.price,
        pricing: course.pricing
      }))
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
