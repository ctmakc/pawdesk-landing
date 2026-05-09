/**
 * CF Pages Function — POST /api/waitlist
 *
 * Accepts: { email: string, business_type: string, current_tool?: string }
 *
 * Priority:
 *   1. If RESEND_AUDIENCE_ID is set → add contact to Resend Audience
 *   2. Otherwise → store in CF KV namespace WAITLIST
 *
 * Env vars (set in CF Pages dashboard):
 *   RESEND_API_KEY       — Resend API key (required for Resend path)
 *   RESEND_AUDIENCE_ID   — Resend Audience ID (triggers Resend path)
 *   WAITLIST             — CF KV binding (fallback path)
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // -----------------------------------------------------------------------
  // 1. Parse + validate body
  // -----------------------------------------------------------------------
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const { email, business_type, current_tool } = body || {};

  if (!email || typeof email !== 'string') {
    return jsonResponse({ ok: false, error: 'Email is required.' }, 400);
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!isValidEmail(trimmedEmail)) {
    return jsonResponse({ ok: false, error: 'Please enter a valid email address.' }, 400);
  }

  // -----------------------------------------------------------------------
  // 2. Store the signup
  // -----------------------------------------------------------------------
  const ts = new Date().toISOString();
  const entry = {
    email: trimmedEmail,
    business_type: business_type || '',
    current_tool: current_tool || '',
    ts,
  };

  if (env.RESEND_AUDIENCE_ID && env.RESEND_API_KEY) {
    // --- Path A: Resend Audience ---
    const resendRes = await fetch(
      `https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          // Store extra fields as custom data if the audience supports it
          // Resend Audience API v1 only supports email + unsubscribed flag
          // Additional metadata goes in a separate KV record as a bonus
        }),
      }
    );

    // Resend returns 200 or 201 on success; 409 means already subscribed (treat as ok)
    if (!resendRes.ok && resendRes.status !== 409) {
      const errText = await resendRes.text().catch(() => '');
      console.error('[waitlist] Resend error', resendRes.status, errText);
      return jsonResponse({ ok: false, error: 'Could not add you to the list. Please try again.' }, 500);
    }

    // Optionally store metadata in KV if bound
    if (env.WAITLIST) {
      try {
        await env.WAITLIST.put(`contact:${trimmedEmail}`, JSON.stringify(entry), {
          expirationTtl: 60 * 60 * 24 * 730, // 2 years
        });
      } catch (kvErr) {
        // Non-fatal: Resend already has the contact
        console.warn('[waitlist] KV metadata write failed (non-fatal):', kvErr);
      }
    }
  } else if (env.WAITLIST) {
    // --- Path B: CF KV fallback ---
    try {
      await env.WAITLIST.put(`contact:${trimmedEmail}`, JSON.stringify(entry), {
        expirationTtl: 60 * 60 * 24 * 730, // 2 years
      });
    } catch (kvErr) {
      console.error('[waitlist] KV write error:', kvErr);
      return jsonResponse({ ok: false, error: 'Could not save your info. Please try again.' }, 500);
    }
  } else {
    // --- No storage configured ---
    // Still return success so the form works in preview deploys with no env set.
    // In production, set at least one of the storage options.
    console.warn('[waitlist] No storage configured (RESEND_AUDIENCE_ID or WAITLIST KV not set).');
  }

  return jsonResponse({ ok: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
