import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/database';

export async function GET() {
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database connected successfully with Windows Authentication' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Test route error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Connection test failed' 
    }, { status: 500 });
  }
}