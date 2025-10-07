import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Simple verify-payment endpoint called');
    
    const body = await request.json();
    console.log('Received payment data:', body);
    
    const { reference, courseId, amount, pricingType, userId } = body;

    if (!reference || !courseId || !userId) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For now, just auto-approve everything in development
    console.log('Auto-approving payment for development');
    
    return NextResponse.json({
      status: 'success',
      message: 'Development mode: Payment verified and user enrolled successfully',
      data: {
        reference,
        courseId,
        amount,
        pricingType,
        customerEmail: 'dev@example.com',
        paidAt: new Date().toISOString(),
        enrolled: true,
        developmentMode: true
      },
    });
    
  } catch (error) {
    console.error('Simple payment verification error:', error);
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

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { message: 'Simple payment verification endpoint is active' },
    { status: 200 }
  );
}
