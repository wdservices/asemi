import { NextRequest, NextResponse } from 'next/server';
import { createSampleCourse } from '@/lib/mockData';

export async function POST(request: NextRequest) {
  try {
    const course = await createSampleCourse();
    
    if (course) {
      return NextResponse.json({ 
        success: true, 
        message: 'Sample course created successfully',
        course: course 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create sample course' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating sample course:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}