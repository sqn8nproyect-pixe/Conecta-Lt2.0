// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Canal de contacto oficial
//
// Única fuente de verdad para el número de WhatsApp del equipo.
// Si el número cambia algún día, se actualiza SOLO aquí y el
// botón flotante, el footer y "Quiénes Somos" quedan al día.
// ─────────────────────────────────────────────────────────────

/** Número en formato internacional sin "+" ni símbolos (formato wa.me). */
export const CONTACT_WHATSAPP_NUMBER = '584220117206'; // +58 422-0117206

/** Número legible para mostrar en la interfaz. */
export const CONTACT_WHATSAPP_DISPLAY = '+58 422-0117206';

/** Mensaje pre-llenado por defecto al abrir el chat. */
export const CONTACT_WHATSAPP_MESSAGE = 'Hola CONECTA-LT, quiero hacer una consulta.';

/**
 * Construye un enlace wa.me con mensaje opcional pre-llenado.
 * Ejemplo: waLink() → https://wa.me/584220117206
 */
export function waLink(message: string = CONTACT_WHATSAPP_MESSAGE): string {
  const base = `https://wa.me/${CONTACT_WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
