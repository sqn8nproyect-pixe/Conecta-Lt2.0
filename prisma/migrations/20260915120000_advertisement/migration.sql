-- Sprint 8.12 — Carrusel de publicidad (Advertisement)
-- Anuncios vendidos por el admin, mostrados en el carrusel de la
-- portada (home). Arte en R2 (ads/<uuid>.<ext>), ventana opcional
-- de campaña y métricas views/clicks.

CREATE TABLE IF NOT EXISTS "Advertisement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageKey" TEXT,
    "linkUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Advertisement_active_sortOrder_idx" ON "Advertisement"("active", "sortOrder");
