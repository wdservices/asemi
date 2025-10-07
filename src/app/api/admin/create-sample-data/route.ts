import { NextRequest, NextResponse } from 'next/server';
import { createSampleCourse } from '@/lib/mockData';

// Endpoint to create sample data for testing
export async function POST(request: NextRequest) {
  try {
    console.log('Creating sample course...');
    
    const course = await createSampleCourse();
    
    if (course) {
      return NextResponse.json({
        status: 'success',
        message: 'Sample course created successfully',
        data: {
          courseId: course.id,
          courseTitle: course.title
        }
      });
    } else {
      return NextResponse.json(
        { status: 'error', message: 'Failed to create sample course' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating sample data:', error);
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

// GET endpoint to check if sample data exists
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    message: 'Sample data creation endpoint',
    description: 'POST to this endpoint to create sample course data'
  });
}
