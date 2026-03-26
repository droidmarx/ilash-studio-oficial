import { NextResponse } from 'next/server';
import { getTelegramToken } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = await getTelegramToken();
  return NextResponse.json({
    status: 'ok',
    hasToken: !!token,
    tokenPrefix: token ? token.substring(0, 5) + '...' : null
  });
}
