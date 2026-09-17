/** Same number used everywhere on the site (footer, hero, PDP, floating button). */
export const WHATSAPP_NUMBER = '923175791001';

export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
