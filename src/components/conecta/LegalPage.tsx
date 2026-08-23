'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Páginas legales (SPA views)
//
// Dos vistas accedidas vía state.view: 'privacy' | 'terms'
// Implementadas como SPA (sin rutas nuevas) para respetar la
// restricción de "solo ruta /" del proyecto.
//
// Contenido:
//   - Política de Privacidad (cumple con Google OAuth disclosure
//     requirements + Ley venezolana de protección de datos)
//   - Términos de Uso (incluye disclaimer de alcohol, menores,
//     responsabilidad del usuario)
//
// Estilo: consistente con el sitio (glass-card, gold accents,
// tipografía serif para títulos, font-mono para meta labels).
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { ArrowLeft, Shield, FileText, Wine } from 'lucide-react';
import { useAppStore } from '@/lib/store';

type LegalKind = 'privacy' | 'terms';

interface LegalPageProps {
  kind: LegalKind;
}

export function LegalPage({ kind }: LegalPageProps) {
  const setView = useAppStore((s) => s.setView);

  const isPrivacy = kind === 'privacy';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Back button */}
      <button
        onClick={() => setView('home')}
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-gold transition-colors mb-8 font-mono tracking-wider"
      >
        <ArrowLeft size={16} /> VOLVER AL INICIO
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card border border-white/10 rounded-3xl p-6 sm:p-10 mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
            {isPrivacy ? <Shield size={22} /> : <FileText size={22} />}
          </div>
          <div>
            <div className="text-[10px] tracking-[3px] font-mono text-gold/80">
              {isPrivacy ? 'PRIVACIDAD' : 'TÉRMINOS LEGALES'}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-white">
              {isPrivacy ? 'Política de Privacidad' : 'Términos de Uso'}
            </h1>
          </div>
        </div>
        <div className="text-xs text-white/40 font-mono">
          Última actualización: 23 de agosto de 2026
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card border border-white/10 rounded-3xl p-6 sm:p-10 space-y-8 text-white/80 leading-relaxed"
      >
        {isPrivacy ? <PrivacyContent /> : <TermsContent />}
      </motion.div>

      {/* Footer navigation between legal pages */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {!isPrivacy ? (
          <button
            onClick={() => setView('privacy')}
            className="flex-1 glass-card border border-white/10 rounded-2xl p-4 text-left hover:border-gold/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-gold" />
              <div>
                <div className="text-[10px] tracking-[2px] font-mono text-gold/70">
                  SIGUIENTE
                </div>
                <div className="font-semibold text-white group-hover:text-gold transition-colors">
                  Política de Privacidad →
                </div>
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setView('terms')}
            className="flex-1 glass-card border border-white/10 rounded-2xl p-4 text-left hover:border-gold/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-gold" />
              <div>
                <div className="text-[10px] tracking-[2px] font-mono text-gold/70">
                  SIGUIENTE
                </div>
                <div className="font-semibold text-white group-hover:text-gold transition-colors">
                  Términos de Uso →
                </div>
              </div>
            </div>
          </button>
        )}
        <button
          onClick={() => setView('home')}
          className="flex-1 glass-card border border-white/10 rounded-2xl p-4 text-left hover:border-gold/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <ArrowLeft size={18} className="text-gold" />
            <div>
              <div className="text-[10px] tracking-[2px] font-mono text-gold/70">
                VOLVER
              </div>
              <div className="font-semibold text-white group-hover:text-gold transition-colors">
                Volver al inicio
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Contenido: Política de Privacidad
// ─────────────────────────────────────────────────────────────

function PrivacyContent() {
  return (
    <>
      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          1. Información que recopilamos
        </h2>
        <p className="mb-3">
          CONECTA-LT (&quot;nosotros&quot;, &quot;el servicio&quot;) recopila los siguientes
          datos personales cuando decides utilizar nuestras funciones:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>
            <strong className="text-white">Datos de cuenta Google:</strong> nombre,
            correo electrónico e imagen de perfil pública, obtenidos a través de
            Google OAuth 2.0 cuando eliges &quot;Continuar con Google&quot;.
          </li>
          <li>
            <strong className="text-white">Reservas:</strong> fecha, hora, número
            de invitados y datos de contacto que proporciones al reservar.
          </li>
          <li>
            <strong className="text-white">Reseñas y favoritos:</strong> contenido
            que publicas sobre los comercios y lista de locales marcados como
            favoritos.
          </li>
          <li>
            <strong className="text-white">Datos de uso:</strong> páginas
            visitadas, eventos analíticos anónimos (apertura del planner,
            recomendaciones vistas) y métricas de rendimiento.
          </li>
          <li>
            <strong className="text-white">Datos técnicos:</strong> cookies de
            sesión esenciales (no usamos cookies publicitarias ni de
            terceros).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          2. Cómo usamos tu información
        </h2>
        <p className="mb-3">Utilizamos tus datos para:</p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>Autenticarte y mantener tu sesión activa.</li>
          <li>Procesar y gestionar tus reservas en comercios afiliados.</li>
          <li>Mostrar tus favoritos y reseñas en tu perfil.</li>
          <li>Personalizar tus recomendaciones del Night Planner.</li>
          <li>Mejorar el servicio mediante análisis agregados y anónimos.</li>
          <li>Enviar notificaciones in-app sobre reservas, promociones o novedades.</li>
          <li>Cumplir con obligaciones legales aplicables en Venezuela.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          3. Base legal del tratamiento
        </h2>
        <p className="mb-3">
          Tratamos tus datos personales bajo las siguientes bases legales, en
          cumplimiento de la <strong className="text-white">Constitución de la
          República Bolivariana de Venezuela</strong> (Art. 60 — protección del
          honor, reputación y vida privada) y la <strong className="text-white">
          Ley Especial contra los Delitos Informáticos</strong>:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li><strong className="text-white">Consentimiento:</strong> al registrarte con Google o usar el servicio.</li>
          <li><strong className="text-white">Ejecución de contrato:</strong> para procesar tus reservas y solicitudes.</li>
          <li><strong className="text-white">Interés legítimo:</strong> para mejorar la seguridad y el servicio.</li>
          <li><strong className="text-white">Obligación legal:</strong> para conservar registros cuando sea exigido.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          4. Compartición de datos con terceros
        </h2>
        <p className="mb-3">
          <strong className="text-white">No vendemos ni alquilamos</strong> tus datos
          personales. Compartimos información mínima solo en estos casos:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>
            <strong className="text-white">Google LLC:</strong> para autenticación
            OAuth (nombre, email, foto de perfil).
          </li>
          <li>
            <strong className="text-white">Comercios afiliados:</strong> cuando
            haces una reserva, el negocio recibe tu nombre y datos de contacto
            para gestionar la reservación.
          </li>
          <li>
            <strong className="text-white">Vercel Inc.:</strong> proveedor de
            hosting donde se almacenan los datos.
          </li>
          <li>
            <strong className="text-white">Neon:</strong> proveedor de base de
            datos PostgreSQL administrada.
          </li>
          <li>
            <strong className="text-white">Autoridades competentes:</strong> si
            somos requeridos por orden judicial o legal válida.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          5. Cookies y almacenamiento
        </h2>
        <p className="mb-3">
          Utilizamos <strong className="text-white">cookies esenciales</strong>{' '}
          para el funcionamiento del sitio (sesión, autenticación, prevención
          CSRF). <strong className="text-white">No utilizamos cookies
          publicitarias</strong>, de seguimiento comercial, ni píxeles de
          redes sociales.
        </p>
        <p className="mb-3">
          Almacenamos en tu navegador (sessionStorage) el hecho de que
          verificaste ser mayor de 18 años, para no pedirte la verificación en
          cada navegación dentro de la misma sesión. Este dato se elimina al
          cerrar el navegador.
        </p>
        <p className="text-sm text-white/60">
          Puedes deshabilitar las cookies en tu navegador, pero el inicio de
          sesión y otras funciones dejarán de funcionar.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          6. Verificación de edad
        </h2>
        <p>
          Al ser un directorio de establecimientos que venden bebidas
          alcohólicas, requerimos que confirmes tener al menos <strong className="text-white">
          18 años</strong> para acceder al contenido. No recopilamos tu edad
          exacta ni tu fecha de nacimiento; solo registramos la confirmación
          booleana (&quot;mayor de 18&quot;) en sessionStorage. Si eres menor de edad,
          por favor abandona este sitio.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          7. Tus derechos ARCO
        </h2>
        <p className="mb-3">Como titular de datos personales, tienes derecho a:</p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li><strong className="text-white">Acceso:</strong> solicitar copia de tus datos.</li>
          <li><strong className="text-white">Rectificación:</strong> corregir datos inexactos.</li>
          <li><strong className="text-white">Cancelación:</strong> solicitar la eliminación de tu cuenta.</li>
          <li><strong className="text-white">Oposición:</strong> oponerte al tratamiento de tus datos.</li>
          <li><strong className="text-white">Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
        </ul>
        <p className="mt-3">
          Para ejercer estos derechos, escríbenos a:{' '}
          <a
            href="mailto:sqn8nproyect@gmail.com"
            className="text-gold hover:underline"
          >
            sqn8nproyect@gmail.com
          </a>
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          8. Seguridad de los datos
        </h2>
        <p className="mb-3">
          Implementamos medidas técnicas y organizativas para proteger tus
          datos:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>Cifrado HTTPS/TLS en todo el tráfico.</li>
          <li>Hashing de contraseñas (cuando aplica) con bcrypt.</li>
          <li>Base de datos PostgreSQL con acceso restringido por IP.</li>
          <li>Variables de entorno protegidas en Vercel (no en código).</li>
          <li>Control de acceso basado en roles (RBAC).</li>
          <li>Revisión periódica de logs y monitoreo de actividad.</li>
        </ul>
        <p className="mt-3 text-sm text-white/60">
          En caso de una brecha de seguridad que afecte tus datos, te
          notificaremos dentro de las 72 horas siguientes conforme a las
          mejores prácticas internacionales.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          9. Retención de datos
        </h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si solicitas
          la eliminación de tu cuenta, borraremos tus datos personales en un
          plazo máximo de 30 días, salvo que estemos obligados legalmente a
          conservar cierta información por un periodo más largo (por ejemplo,
          registros de reservas para fines contables o fiscales).
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          10. Menores de edad
        </h2>
        <p>
          El servicio está dirigido exclusivamente a personas mayores de 18
          años. No recopilamos conscientemente datos de menores. Si detectamos
          que un menor nos ha proporcionado datos personales, eliminaremos esa
          información de forma inmediata.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          11. Cambios a esta política
        </h2>
        <p>
          Podemos actualizar esta Política de Privacidad cuando sea necesario.
          Te notificaremos sobre cambios significativos mediante un aviso
          visible en el sitio o por correo electrónico. La fecha de
          &quot;última actualización&quot; en la parte superior indica cuándo se
          modificó por última vez.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          12. Contacto
        </h2>
        <p>
          Si tienes preguntas sobre esta Política de Privacidad o sobre tus
          datos personales, contáctanos en:
        </p>
        <div className="mt-3 glass-card border border-white/10 rounded-2xl p-4 text-sm">
          <div className="text-white/60 font-mono text-[10px] tracking-wider mb-1">
            RESPONSABLE DEL TRATAMIENTO
          </div>
          <div className="text-white font-semibold">CONECTA-LT</div>
          <div className="text-white/70">Los Teques, Miranda, Venezuela</div>
          <div className="mt-2">
            Email:{' '}
            <a
              href="mailto:sqn8nproyect@gmail.com"
              className="text-gold hover:underline"
            >
              sqn8nproyect@gmail.com
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Contenido: Términos de Uso
// ─────────────────────────────────────────────────────────────

function TermsContent() {
  return (
    <>
      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          1. Aceptación de los términos
        </h2>
        <p>
          Al acceder y utilizar CONECTA-LT (https://conectalt.com), aceptas
          estar sujeto a estos Términos de Uso. Si no estás de acuerdo con
          alguno de los términos, por favor no utilices el servicio. El uso
          del sitio implica la aceptación plena de estos términos y de la
          Política de Privacidad.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          2. Descripción del servicio
        </h2>
        <p>
          CONECTA-LT es un directorio digital de vida nocturna de Los Teques,
          Miranda, Venezuela. Ofrece:
        </p>
        <ul className="list-disc pl-6 mt-3 space-y-2 text-sm">
          <li>Catálogo de licorerías, tascas y discotecas afiliadas.</li>
          <li>Sistema de reservas online.</li>
          <li>Promociones y cupones de descuento.</li>
          <li>Reseñas y calificaciones de usuarios.</li>
          <li>Recomendador inteligente (Night Planner).</li>
          <li>Panel de gestión para dueños de comercios.</li>
        </ul>
        <p className="mt-3 text-sm text-white/60">
          El servicio no vende directamente bebidas alcohólicas ni productos
          de ningún tipo. Las transacciones se realizan directamente con los
          comercios afiliados.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          3. Restricción de edad (IMPORTANTE)
        </h2>
        <div className="glass-card border border-amber/30 bg-amber/5 rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <Wine size={18} className="text-amber shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber">BEBIDAS ALCOHÓLICAS — SOLO MAYORES DE 18 AÑOS</strong>
              <p className="text-sm text-amber/90 mt-1">
                De conformidad con la legislación venezolana vigente, el consumo
                de alcohol está prohibido para menores de edad. Al usar este
                servicio confirmas tener al menos 18 años.
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm">
          Si eres menor de edad, por favor abandona inmediatamente este sitio.
          CONECTA-LT no se hace responsable si un menor evade la verificación
          de edad del AgeGate.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          4. Registro de cuenta
        </h2>
        <p className="mb-3">
          Para usar funciones como reservas, reseñas o favoritos, debes
          registrarte con tu cuenta de Google. Al hacerlo, aceptas:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>Proporcionar información veraz y actualizada.</li>
          <li>Ser responsable de mantener la confidencialidad de tu sesión.</li>
          <li>Notificarnos inmediatamente sobre cualquier uso no autorizado.</li>
          <li>No crear cuentas falsas ni suplantar a otras personas.</li>
          <li>No usar el servicio para fines ilegales o no autorizados.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          5. Reservas y transacciones
        </h2>
        <p className="mb-3">
          Las reservas realizadas a través de CONECTA-LT son gestionadas
          directamente por el comercio afiliado. CONECTA-LT actúa únicamente
          como intermediario tecnológico y:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>No garantiza la disponibilidad real del aforo reportado.</li>
          <li>No se responsabiliza por cancelaciones, cobros o disputas con el comercio.</li>
          <li>Las promociones mostradas están sujetas a cambios sin previo aviso.</li>
          <li>Los códigos de canje son emitidos y validados por cada comercio.</li>
          <li>Verifica siempre las condiciones directamente con el establecimiento.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          6. Contenido del usuario
        </h2>
        <p className="mb-3">
          Eres responsable del contenido que publiques (reseñas, fotos,
          comentarios). Al publicar, nos otorgas una licencia no exclusiva,
          mundial y gratuita para mostrar ese contenido en relación con el
          servicio. Te comprometes a:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>No publicar contenido difamatorio, ofensivo o ilegal.</li>
          <li>No infringir derechos de propiedad intelectual de terceros.</li>
          <li>No publicar información personal de otras personas sin su consentimiento.</li>
          <li>No publicar contenido que promueva el consumo irresponsable de alcohol.</li>
          <li>No usar bots ni scripts para automatizar publicaciones.</li>
        </ul>
        <p className="mt-3 text-sm text-white/60">
          Nos reservamos el derecho de eliminar contenido que infrinja estos
          términos o que consideremos inapropiado, sin previo aviso.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          7. Panel de dueños (Owner Dashboard)
        </h2>
        <p className="mb-3">
          Los dueños de comercios afiliados pueden reclamar la gestión de su
          ficha y acceder a un panel de administración. Al hacerlo, aceptas:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>Proporcionar información veraz sobre tu negocio.</li>
          <li>Mantener actualizados horarios, promociones y datos de contacto.</li>
          <li>No publicar promociones falsas o engañosas.</li>
          <li>Responder a las reservas en un plazo razonable.</li>
          <li>No usar el panel para publicar contenido malicioso o spam.</li>
          <li>Aceptar que el rol de &quot;dueño&quot; puede ser revocado en caso de abuso.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          8. Propiedad intelectual
        </h2>
        <p className="mb-3">
          Todo el contenido del sitio (logos, textos, diseño, código,
          imágenes generadas) es propiedad de CONECTA-LT o de sus licenciantes,
          protegido por las leyes venezolanas e internacionales de propiedad
          intelectual. Queda prohibido:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>Copiar, modificar o distribuir el contenido sin autorización.</li>
          <li>Usar el branding de CONECTA-LT para fines comerciales.</li>
          <li>Hacer ingeniería inversa del código o extraer datos masivamente (scraping).</li>
          <li>Usar marcas registradas de los comercios afiliados sin su autorización.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          9. Exención de responsabilidad
        </h2>
        <p className="mb-3">
          El servicio se proporciona &quot;tal cual&quot; sin garantías de ningún tipo.
          CONECTA-LT no garantiza que:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>La información de los comercios sea 100% precisa o actualizada.</li>
          <li>El sitio esté libre de errores o interrupciones.</li>
          <li>Las reservas se cumplan efectivamente por parte del comercio.</li>
          <li>Las promociones estén vigentes al momento del canje.</li>
        </ul>
        <p className="mt-3">
          CONECTA-LT no se responsabiliza por daños directos, indirectos,
          incidentales o consecuentes derivados del uso del servicio.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          10. Consumo responsable de alcohol
        </h2>
        <div className="glass-card border border-amber/30 bg-amber/5 rounded-2xl p-4 mb-4">
          <div className="text-amber font-bold mb-1">⚠ SI BEBES, NO CONDUZCAS</div>
          <p className="text-sm text-amber/90">
            El consumo excesivo de alcohol es perjudicial para la salud.
            CONECTA-LT promueve el consumo responsable. Si vas a consumir
            bebidas alcohólicas, designa un conductor sobrio o utiliza
            servicios de transporte.
          </p>
        </div>
        <p className="text-sm">
          Las leyes venezolanas sancionan la conducción bajo influencia de
          alcohol. El límite máximo es de 0.5 g/L de alcohol en sangre. Las
          sanciones incluyen multas, retención del vehículo y privativa de
          libertad.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          11. Suspensión y terminación de cuentas
        </h2>
        <p>
          Nos reservamos el derecho de suspender o eliminar cuentas que
          infrinjan estos términos, sin previo aviso. Los motivos incluyen:
          suplantación de identidad, fraude, spam, acoso, publicación de
          contenido ilegal, evasión del AgeGate, o uso del servicio para fines
          no autorizados.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          12. Limitación de responsabilidad
        </h2>
        <p>
          En ningún caso CONECTA-LT, sus propietarios, empleados o afiliados
          serán responsables por daños indirectos, incidentales, especiales,
          consecuentes o punitivos, incluyendo pérdida de datos, ingresos o
          beneficios, derivados del uso o incapacidad de usar el servicio.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          13. Ley aplicable y jurisdicción
        </h2>
        <p>
          Estos términos se rigen por las leyes de la <strong className="text-white">
          República Bolivariana de Venezuela</strong>. Cualquier disputa
          derivada del uso del servicio será resuelta ante los tribunales
          competentes de Los Teques, Miranda, Venezuela.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          14. Cambios a los términos
        </h2>
        <p>
          Podemos modificar estos Términos de Uso en cualquier momento. Te
          notificaremos sobre cambios significativos mediante un aviso visible
          en el sitio. El uso continuado del servicio después de los cambios
          implica la aceptación de los términos modificados.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-gold font-bold mb-3">
          15. Contacto
        </h2>
        <p>Para consultas sobre estos Términos de Uso, contáctanos:</p>
        <div className="mt-3 glass-card border border-white/10 rounded-2xl p-4 text-sm">
          <div className="text-white/60 font-mono text-[10px] tracking-wider mb-1">
            CONTACTO LEGAL
          </div>
          <div className="text-white font-semibold">CONECTA-LT</div>
          <div className="text-white/70">Los Teques, Miranda, Venezuela</div>
          <div className="mt-2">
            Email:{' '}
            <a
              href="mailto:sqn8nproyect@gmail.com"
              className="text-gold hover:underline"
            >
              sqn8nproyect@gmail.com
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
