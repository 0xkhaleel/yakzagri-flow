import { NextRequest, NextResponse } from 'next/server';
import { scrubPII } from '@/lib/analytics';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const scrubbed = scrubPII(payload);

  // Sink for client-side error reports. Log server-side so reports are
  // actually received instead of being silently 404'd.
  console.error('[client-error]', JSON.stringify(scrubbed));

  return NextResponse.json({ ok: true }, { status: 202 });
}
