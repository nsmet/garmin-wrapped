import page from '../ui/index.html?raw';
import { env } from 'cloudflare:workers';

export const dynamic = 'force-dynamic';
export function GET() {
  let html = page;
  if (import.meta.env.DEV && env.DEV_GARMIN_API_KEY) {
    const value = env.DEV_GARMIN_API_KEY.replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]!));
    html = html.replace('id="api-key"', `id="api-key" value="${value}"`);
  }
  return new Response(html, {headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}});
}
