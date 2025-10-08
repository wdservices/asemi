import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Get admin settings
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching admin settings...');
    
    const settingsRef = doc(db, 'admin_settings', 'global');
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      const settings = settingsSnap.data();
      console.log('Found settings:', settings);
      
      return NextResponse.json({
        status: 'success',
        data: {
          minimumDonation: settings.minimumDonation || 100,
          suggestedAmounts: settings.suggestedAmounts || [2000, 5000, 7000, 15000, 20000, 25000],
          updatedAt: settings.updatedAt || null
        }
      });
    } else {
      // Return default settings if none exist
      console.log('No settings found, returning defaults');
      return NextResponse.json({
        status: 'success',
        data: {
          minimumDonation: 100,
          suggestedAmounts: [2000, 5000, 7000, 15000, 20000, 25000],
          updatedAt: null
        }
      });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to fetch settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Update admin settings
export async function POST(request: NextRequest) {
  try {
    const { minimumDonation, suggestedAmounts } = await request.json();
    
    console.log('Updating admin settings:', { minimumDonation, suggestedAmounts });
    
    // Validate inputs
    if (typeof minimumDonation !== 'number' || minimumDonation < 1) {
      return NextResponse.json(
        { status: 'error', message: 'Minimum donation must be a positive number' },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(suggestedAmounts) || suggestedAmounts.some(amt => typeof amt !== 'number' || amt < 1)) {
      return NextResponse.json(
        { status: 'error', message: 'Suggested amounts must be an array of positive numbers' },
        { status: 400 }
      );
    }
    
    const settingsData = {
      minimumDonation,
      suggestedAmounts,
      updatedAt: new Date().toISOString()
    };
    
    const settingsRef = doc(db, 'admin_settings', 'global');
    await setDoc(settingsRef, settingsData, { merge: true });
    
    console.log('Settings updated successfully');
    
    return NextResponse.json({
      status: 'success',
      message: 'Settings updated successfully',
      data: settingsData
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to update settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
