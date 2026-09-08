'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — QRCode
//
// Componente reutilizable que genera un código QR real (no decorativo)
// usando la librería `qrcode`. El QR codifica una URL pública que
// apunta a la página de la reserva: /r/[confirmationCode].
//
// El dueño del negocio puede escanear este QR o dictar el código,
// y el sistema le muestra la reserva + botón "Confirmar llegada".
//
// Uso:
//   <QRCode value="LT-4243-F" size={200} />
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  /** Código de confirmación de la reserva (ej: "LT-4243-F") */
  value: string;
  /** Tamaño en píxeles del QR (default 200) */
  size?: number;
  /** Clase CSS extra para el contenedor */
  className?: string;
}

export function QRCode({ value, size = 200, className = '' }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // Genera la URL pública absoluta. En el navegador usamos window.location.origin
    // para que el QR apunte al dominio correcto (localhost en dev, vercel.app en prod).
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/r/${encodeURIComponent(value)}`;

    QRCodeLib.toDataURL(url, {
      width: size,
      margin: 1,
      color: {
        dark: '#0A0A0F', // obsidian (foreground)
        light: '#FFFFFF', // blanco (background)
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setDataUrl(url);
        setError(false);
      })
      .catch((err) => {
        console.error('[QRCode] generation failed:', err);
        setError(true);
      });
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-white rounded-lg ${className}`}
        style={{ width: size, height: size }}
        aria-label={`Código ${value}`}
      >
        <span className="text-obsidian font-mono text-xs font-bold">
          {value}
        </span>
      </div>
    );
  }

  if (!dataUrl) {
    // Placeholder mientras genera
    return (
      <div
        className={`flex items-center justify-center bg-white/5 rounded-lg animate-pulse ${className}`}
        style={{ width: size, height: size }}
        aria-label="Generando código QR..."
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`Código QR de la reserva ${value}`}
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
    />
  );
}
