import { NextRequest, NextResponse } from 'next/server';
import { enrollUserInCourse, createPaymentRecord } from '@/lib/mockData';

export async function POST(request: NextRequest) {
  try {
    const { reference, courseId, amount, pricingType, userId } = await request.json();

    if (!reference) {
      return NextResponse.json(
        { status: 'error', message: 'Payment reference is required' },
        { status: 400 }
      );
    }

    if (!userId || !courseId) {
      return NextResponse.json(
        { status: 'error', message: 'User ID and Course ID are required' },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.ok) {
      return NextResponse.json(
        { status: 'error', message: 'Failed to verify payment with Paystack' },
        { status: 500 }
      );
    }

    const paystackData = await paystackResponse.json();

    if (paystackData.data.status === 'success') {
      // Payment is successful
      const paymentData = paystackData.data;
      
      // Verify the amount matches what was expected
      const expectedAmount = amount * 100; // Convert to kobo
      if (paymentData.amount !== expectedAmount) {
        return NextResponse.json(
          { status: 'error', message: 'Payment amount mismatch' },
          { status: 400 }
        );
      }

      // Store payment record in Firestore
      console.log('Attempting to create payment record with:', {
        userId,
        courseId,
        amount: paymentData.amount / 100,
        reference: paymentData.reference
      });
      
      const paymentRecordCreated = await createPaymentRecord({
        userId,
        courseId,
        amount: paymentData.amount / 100,
        currency: paymentData.currency || 'NGN',
        reference: paymentData.reference,
        status: 'success',
        pricingType: pricingType || 'payment',
        customerEmail: paymentData.customer.email,
        paidAt: paymentData.paid_at
      });

      if (!paymentRecordCreated) {
        console.error('Failed to create payment record in Firestore');
      } else {
        console.log('Payment record created successfully in Firestore payments collection');
      }

      // Enroll the user in the course after successful payment
      try {
        const enrollmentSuccess = await enrollUserInCourse(userId, courseId);
        if (!enrollmentSuccess) {
          console.error('Failed to enroll user in course:', { userId, courseId });
          return NextResponse.json(
            { status: 'error', message: 'Payment verified but enrollment failed' },
            { status: 500 }
          );
        } else {
          console.log('User successfully enrolled in course:', { userId, courseId });
        }
      } catch (enrollmentError) {
        console.error('Error enrolling user in course:', enrollmentError);
        return NextResponse.json(
          { status: 'error', message: 'Payment verified but enrollment failed' },
          { status: 500 }
        );
      }
      
      console.log('Payment verified successfully:', {
        reference,
        courseId,
        amount: paymentData.amount / 100, // Convert back to naira
        pricingType,
        customerEmail: paymentData.customer.email,
        paidAt: paymentData.paid_at,
        userEnrolled: 'success',
      });
      
      return NextResponse.json({
        status: 'success',
        message: 'Payment verified and user enrolled successfully',
        data: {
          reference,
          courseId,
          amount: paymentData.amount / 100,
          pricingType,
          customerEmail: paymentData.customer.email,
          paidAt: paymentData.paid_at,
          enrolled: true
        },
      });
    } else {
      // Store failed payment record
      await createPaymentRecord({
        userId,
        courseId,
        amount: amount,
        currency: 'NGN',
        reference: reference,
        status: 'failed',
        pricingType: pricingType || 'payment',
        customerEmail: paystackData.data?.customer?.email || '',
        paidAt: new Date().toISOString()
      });

      return NextResponse.json(
        { status: 'failed', message: 'Payment verification failed', data: paystackData.data },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error during payment verification' },
      { status: 500 }
    );
  }
}

// Handle GET requests (optional - for webhook verification)
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { message: 'Payment verification endpoint is active' },
    { status: 200 }
  );
}