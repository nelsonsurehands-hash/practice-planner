// The Extra Coach: email a coach when the team replies to their feedback.
// Called by the app right after the owner sends a reply (Settings → Usage → Feedback from coaches).
// Only the app's owner can call it, and only coaches who ticked "It's OK to email me back" are emailed.
// Secrets in Supabase → Edge Functions → Secrets:
//   RESEND_API_KEY  a key from resend.com (free plan: 3,000 emails a month)
//   NOTIFY_FROM     optional, default "The Extra Coach <hello@theextracoach.com>" (the domain must be verified in Resend)
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (s: string) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply(405, { error: "Use POST." });
  const key = (Deno.env.get("RESEND_API_KEY") || "").trim();
  if (!key) return reply(200, { sent: false, why: "no-key" });

  let body: { id?: number };
  try { body = await req.json(); } catch { return reply(400, { error: "Bad request." }); }
  if (!body.id) return reply(400, { error: "Bad request." });

  // Ask as the signed-in person: reply_email_target() only answers the app's owner.
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, (Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY"))!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data: t, error } = await asUser.rpc("reply_email_target", { p_id: body.id });
  if (error) return reply(403, { error: "Not allowed." });
  if (!t || !t.email || !t.reply) return reply(200, { sent: false, why: "nothing" });
  if (!t.ok) return reply(200, { sent: false, why: "no-consent" });

  const said = t.message ? `<p style="margin:0 0 16px;color:#5b6275;font-size:14px"><b style="display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase">You said</b>${esc(String(t.message).slice(0, 300))}</p>` : "";
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#17141c">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#e2672a">A reply to your feedback</p>
    <h1 style="margin:0 0 16px;font-size:22px">From The Extra Coach team</h1>${said}
    <div style="padding:14px 16px;border-radius:10px;background:#eef1f8;font-size:16px;line-height:1.5">${esc(t.reply).replace(/\n/g, "<br>")}</div>
    <p style="margin:22px 0"><a href="https://theextracoach.com/?ref=email" style="display:inline-block;background:#172a5e;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">Open the app to write back</a></p>
    <p style="margin:0;font-size:12px;color:#8a8f9e">You're getting this because you said it was OK to email you back about your feedback.</p></div>`;
  const text = `A reply to your feedback, from The Extra Coach team:\n\n${t.reply}\n\nWrite back in the app: https://theextracoach.com/?ref=email`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("NOTIFY_FROM") || "The Extra Coach <hello@theextracoach.com>",
      to: [t.email], subject: "The Extra Coach replied to your feedback", html, text,
    }),
  });
  if (!res.ok) { const m = await res.text().catch(() => ""); console.error("resend", res.status, m); return reply(200, { sent: false, why: "send-failed", status: res.status }); }
  return reply(200, { sent: true });
});
