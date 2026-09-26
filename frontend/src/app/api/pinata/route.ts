import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for Pinata operations that require the secret key.
 *
 * The Pinata secret must never be exposed to the browser, so any call that
 * needs `PINATA_SECRET` is routed through this handler. The client only ever
 * talks to this route using the safe-to-expose `NEXT_PUBLIC_PINATA_*` config.
 */

const PINATA_API_URL = 'https://api.pinata.cloud';

function getServerConfig() {
  const apiKey = process.env.PINATA_API_KEY;
  const secret = process.env.PINATA_SECRET;

  if (!apiKey || !secret) {
    return null;
  }

  return { apiKey, secret };
}

export async function POST(request: NextRequest) {
  const config = getServerConfig();

  if (!config) {
    return NextResponse.json(
      { error: 'Pinata server credentials are not configured' },
      { status: 500 },
    );
  }

  let body: { action?: string; payload?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, payload } = body;

  if (action !== 'pinJSONToIPFS') {
    return NextResponse.json(
      { error: `Unsupported Pinata action: ${action ?? 'undefined'}` },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: config.apiKey,
        pinata_secret_api_key: config.secret,
      },
      body: JSON.stringify(payload ?? {}),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to reach Pinata',
      },
      { status: 502 },
    );
  }
}
