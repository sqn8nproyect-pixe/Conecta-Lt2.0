-- Sprint SEO — Historial de slugs para renombres con redirect
-- Cuando un local cambia de nombre, el slug se regenera y el viejo
-- se guarda en Business.formerSlugs. La ficha /local/[slug] consulta
-- esta lista para redirigir (308 permanente) al slug actual, de modo
-- que los enlaces externos (Google, WhatsApp, favoritos) no se rompan.

ALTER TABLE "Business" ADD COLUMN "formerSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
