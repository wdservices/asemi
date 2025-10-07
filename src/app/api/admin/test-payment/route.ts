import { NextRequest, NextResponse } from 'next/server';
import { createPaymentRecord } from '@/lib/mockData';

// Test endpoint to create a sample payment record
export async function POST(request: NextRequest) {
  try {
    const samplePayment = {
      userId: 'test-user-123',
      courseId: 'test-course-456',
      amount: 5000,
      currency: 'NGN',
      reference: `test_payment_${Date.now()}`,
      status: 'success' as const,
      pricingType: 'payment',
      customerEmail: 'test@example.com',
      paidAt: new Date().toISOString()
    };

    console.log('Creating test payment record:', samplePayment);
    const success = await createPaymentRecord(samplePayment);

    if (success) {
      return NextResponse.json({
        status: 'success',
        message: 'Test payment record created successfully',
        data: samplePayment
      });
    } else {
      return NextResponse.json(
        { status: 'error', message: 'Failed to create test payment record' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating test payment:', error);
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
    message: 'Test payment creation endpoint',
    description: 'POST to this endpoint to create a test payment record'
  });
}
