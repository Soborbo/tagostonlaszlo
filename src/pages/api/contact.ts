import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Minden mező kitöltése kötelező.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Weboldal <onboarding@resend.dev>',
      to: 'golaxo@gmail.com',
      subject: `Új üzenet a weboldalról: ${name}`,
      html: `
        <h2>Új üzenet érkezett a weboldalról</h2>
        <p><strong>Név:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Üzenet:</strong></p>
        <p>${message}</p>
      `,
      replyTo: email,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Email küldési hiba:', error);
    return new Response(JSON.stringify({ error: 'Hiba történt az email küldése során.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
