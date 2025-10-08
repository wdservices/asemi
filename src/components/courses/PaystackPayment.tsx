'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CoursePricing } from '@/lib/types';
import { formatCoursePricing } from '@/lib/utils';
import { Heart, DollarSign, Gift, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaystackPaymentProps {
  courseId: string;
  courseTitle: string;
  pricing: CoursePricing;
  fallbackPrice?: number;
  userEmail: string;
  userId: string;
  onSuccess: (reference: string, amount?: number) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: any) => {
        openIframe: () => void;
      };
    };
  }
}

export default function PaystackPayment({
  courseId,
  courseTitle,
  pricing,
  fallbackPrice,
  userEmail,
  userId,
  onSuccess,
  onClose
}: PaystackPaymentProps) {
  const [donationAmount, setDonationAmount] = useState<string>('1500');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getPaymentAmount = (): number => {
    console.log('🔍 getPaymentAmount called');
    console.log('  - pricing:', pricing);
    console.log('  - donationAmount:', donationAmount);
    console.log('  - fallbackPrice:', fallbackPrice);
    
    if (!pricing || typeof pricing !== 'object') {
      console.log('  - No pricing object, using fallback:', fallbackPrice || 0);
      return fallbackPrice || 0;
    }
    
    if (pricing.type === 'free') {
      console.log('  - Free course, returning 0');
      return 0;
    }
    
    if (pricing.type === 'donation') {
      const amount = parseFloat(donationAmount);
      const result = isNaN(amount) ? 0 : amount;
      console.log('  - Donation type, parsed amount:', result);
      return result;
    }
    
    if (pricing.type === 'payment' && pricing.amount && typeof pricing.amount === 'number') {
      console.log('  - Payment type, using pricing.amount:', pricing.amount);
      return pricing.amount;
    }
    
    console.log('  - Fallback to:', fallbackPrice || 0);
    return fallbackPrice || 0;
  };

  const handlePaystackCallback = (response: any) => {
    console.log('Payment successful:', response);
    
    const actualAmount = getPaymentAmount();
    const paymentData = {
      reference: response.reference,
      courseId,
      amount: actualAmount,
      pricingType: pricing.type,
      userId
    };
    
    console.log('Sending payment verification request with amount:', actualAmount, paymentData);
    
    // Verify payment on backend
    fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    })
    .then(res => {
      console.log('Raw response status:', res.status);
      console.log('Raw response ok:', res.ok);
      if (!res.ok) {
        console.error('Response not ok:', res.status, res.statusText);
      }
      return res.json();
    })
    .then(data => {
      console.log('Payment verification response:', data);
      
      if (data.status === 'success' && data.data?.enrolled) {
        // Payment verified and user enrolled successfully
        const successMessage = data.data.developmentMode 
          ? `Development mode: You have been enrolled in ${courseTitle}!`
          : `You have been enrolled in ${courseTitle}!`;
          
        toast({
          title: "Payment Successful",
          description: successMessage,
        });
        
        // Call onSuccess which will handle the enrollment state update
        // Pass the actual amount that was paid
        onSuccess(response.reference, actualAmount);
      } else {
        console.error('Payment verification failed:', data);
        toast({
          title: "Payment Verification Failed",
          description: data.message || "Please contact support for assistance.",
          variant: "destructive",
        });
      }
    })
    .catch(error => {
      console.error('Verification error:', error);
      toast({
        title: "Verification Error",
        description: "Payment completed but verification failed. Please contact support.",
        variant: "destructive",
      });
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  const handlePaystackClose = () => {
    setIsLoading(false);
    if (onClose) onClose();
  };

  const handlePayment = async () => {
    const amount = getPaymentAmount();
    
    // Handle free courses
    if (amount === 0) {
      try {
        setIsLoading(true);
        // For free courses, we can directly call the success callback
        // In a real app, you might still want to register the enrollment
        const freeReference = `free_${courseId}_${Date.now()}`;
        console.log('Free course enrollment with reference:', freeReference);
        onSuccess(freeReference, 0);
        toast({
          title: "Enrollment Successful",
          description: "You have been enrolled in this free course!",
        });
      } catch (error) {
        toast({
          title: "Enrollment Failed",
          description: "There was an error enrolling you in this course.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Handle paid courses and donations
    if (!window.PaystackPop) {
      toast({
        title: "Payment Error",
        description: "Payment system is not available. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_live_1788e59565979a32b6c87507bf7033c57614cce4',
        email: userEmail,
        amount: amount * 100, // Convert to kobo
        currency: "NGN",
        ref: `course_${courseId}_${Date.now()}`,
        metadata: {
          courseId,
          courseTitle,
          pricingType: pricing.type,
          custom_fields: [
            {
              display_name: "Course",
              variable_name: "course_title",
              value: courseTitle
            },
            {
              display_name: "Pricing Type",
              variable_name: "pricing_type",
              value: pricing.type
            }
          ]
        },
        callback: handlePaystackCallback,
        onClose: handlePaystackClose
      });

      handler.openIframe();
    } catch (error) {
      setIsLoading(false);
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderPaymentContent = () => {
    if (!pricing || typeof pricing !== 'object' || !pricing.type) {
      // Fallback for malformed pricing data
      const amount = fallbackPrice || 0;
      if (amount === 0) {
        return (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span className="text-lg font-semibold">Free Course</span>
            </div>
            <p className="text-gray-600">This course is available at no cost!</p>
          </div>
        );
      } else {
        return (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <DollarSign className="h-6 w-6" />
              <span className="text-lg font-semibold">Course Price</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ₦{amount.toLocaleString()}
            </div>
            <p className="text-gray-600">One-time payment for lifetime access</p>
          </div>
        );
      }
    }

    if (pricing.type === 'free') {
      return (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-green-600">
            <Gift className="h-6 w-6" />
            <span className="text-lg font-semibold">Free Course</span>
          </div>
          <p className="text-gray-600">This course is completely free. Click below to enroll!</p>
        </div>
      );
    }

    if (pricing.type === 'donation') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-pink-600">
            <Heart className="h-6 w-6" />
            <span className="text-lg font-semibold">Support with a Donation</span>
          </div>
          <p className="text-gray-600 text-center">
            This course is available for any donation amount. Your support helps us create more content!
          </p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="donationAmount">Donation Amount (₦)</Label>
              <Input
                id="donationAmount"
                type="number"
                step="1"
                min="1500"
                placeholder="1500"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="mt-1"
              />
              {pricing.suggestedDonation && (
                <p className="text-sm text-muted-foreground mt-1">
                  Suggested: ₦{pricing.suggestedDonation.toLocaleString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Enter amount in Nigerian Naira (minimum ₦1,500)
              </p>
              
              {/* Quick donation buttons */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[2000, 5000, 7000, 15000, 20000, 25000].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    onClick={() => setDonationAmount(amount.toString())}
                    className="text-xs"
                  >
                    ₦{amount.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          {pricing.suggestedDonation && (
            <p className="text-sm text-gray-500 text-center">
              Suggested amount: ₦{pricing.suggestedDonation.toLocaleString()}
            </p>
          )}
        </div>
      );
    }

    if (pricing.type === 'payment') {
      const amount = pricing.amount || fallbackPrice || 0;
      return (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <DollarSign className="h-6 w-6" />
            <span className="text-lg font-semibold">Course Price</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            ₦{amount.toLocaleString()}
          </div>
          <p className="text-gray-600">One-time payment for lifetime access</p>
        </div>
      );
    }

    return null;
  };

  const getButtonText = () => {
    if (!pricing || typeof pricing !== 'object' || !pricing.type) {
      const amount = fallbackPrice || 0;
      return amount === 0 ? 'Enroll for Free' : `Pay ₦${amount.toLocaleString()} & Enroll`;
    }
    
    if (pricing.type === 'free') return 'Enroll for Free';
    if (pricing.type === 'donation') {
      const amount = parseFloat(donationAmount);
      if (isNaN(amount) || amount <= 0) return 'Enroll with Donation';
      return `Donate ₦${amount.toLocaleString()} & Enroll`;
    }
    const amount = (pricing.amount && typeof pricing.amount === 'number') ? pricing.amount : (fallbackPrice || 0);
    return `Pay ₦${amount.toLocaleString()} & Enroll`;
  };

  const isButtonDisabled = () => {
    if (isLoading) return true;
    if (!pricing || typeof pricing !== 'object' || !pricing.type) {
      return false; // Allow enrollment for fallback cases
    }
    if (pricing.type === 'donation') {
      const amount = parseFloat(donationAmount);
      return isNaN(amount) || amount < 1500;
    }
    return false;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Enroll in Course</CardTitle>
        <CardDescription>{courseTitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderPaymentContent()}
        
        <Button
          onClick={handlePayment}
          disabled={isButtonDisabled()}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Processing...' : getButtonText()}
        </Button>
      </CardContent>
    </Card>
  );
}