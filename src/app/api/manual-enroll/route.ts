import { NextRequest, NextResponse } from 'next/server';
import { enrollUserInCourse } from '@/lib/mockData';

// This is a temporary endpoint to manually enroll users who paid before the automated system
// TODO: Remove this after migrating all old payments
export async function POST(request: NextRequest) {
  try {
    const { userId, courseId, adminKey } = await request.json();

    // Simple admin key check (you should use a proper admin check in production)
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!userId || !courseId) {
      return NextResponse.json(
        { status: 'error', message: 'User ID and Course ID are required' },
        { status: 400 }
      );
    }

    // Enroll the user in the course
    const enrollmentSuccess = await enrollUserInCourse(userId, courseId);
    
    if (enrollmentSuccess) {
      return NextResponse.json({
        status: 'success',
        message: 'User enrolled successfully',
        data: { userId, courseId }
      });
    } else {
      return NextResponse.json(
        { status: 'error', message: 'Enrollment failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Manual enrollment error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
