interface Env {
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  CONTACT_EMAIL: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { TURNSTILE_SECRET_KEY, RESEND_API_KEY, CONTACT_EMAIL } = context.env;

  const body = await context.request.json<{
    name: string;
    email: string;
    message: string;
    'cf-turnstile-response': string;
  }>();

  const { name, email, message } = body;
  const turnstileToken = body['cf-turnstile-response'];

  // Validate required fields
  if (!name || !email || !message) {
    return new Response(JSON.stringify({ error: 'Minden mező kitöltése kötelező.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify Turnstile token
  const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: TURNSTILE_SECRET_KEY,
      response: turnstileToken,
      remoteip: context.request.headers.get('CF-Connecting-IP') || '',
    }),
  });

  const turnstileData = await turnstileRes.json<{ success: boolean }>();

  if (!turnstileData.success) {
    return new Response(JSON.stringify({ error: 'Biztonsági ellenőrzés sikertelen.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send email via Resend
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Weboldal <uzenet@tagostonlaszlo.hu>',
      to: [CONTACT_EMAIL],
      subject: `Üzenet a weboldalról: ${name}`,
      reply_to: email,
      html: `
        <h2>Új üzenet a weboldalról</h2>
        <p><strong>Név:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <hr />
        <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
      `,
    }),
  });

  const resendData = await resendRes.json();

  if (!resendRes.ok) {
    console.error('Resend API hiba:', JSON.stringify(resendData));
    return new Response(JSON.stringify({ error: 'Hiba történt az üzenet küldésekor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('Email sikeresen elküldve:', JSON.stringify(resendData));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
