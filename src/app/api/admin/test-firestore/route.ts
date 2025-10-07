import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Test endpoint to directly check Firestore connection and courses
export async function GET(request: NextRequest) {
  try {
    console.log('Testing Firestore connection...');
    
    // Test basic Firestore connection
    const coursesCol = collection(db, 'courses');
    console.log('Created courses collection reference');
    
    const snapshot = await getDocs(coursesCol);
    console.log('Got snapshot, size:', snapshot.size);
    console.log('Snapshot empty:', snapshot.empty);
    
    const courses: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Document ID:', doc.id);
      console.log('Document data:', data);
      courses.push({
        id: doc.id,
        ...data
      });
    });
    
    return NextResponse.json({
      status: 'success',
      message: 'Firestore test completed',
      data: {
        connectionWorking: true,
        coursesCollectionExists: true,
        totalCourses: snapshot.size,
        isEmpty: snapshot.empty,
        courses: courses
      }
    });
  } catch (error) {
    console.error('Firestore test error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Firestore test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
