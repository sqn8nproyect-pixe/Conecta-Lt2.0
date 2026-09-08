// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Menú digital (tascas y licobares)
//
// Lógica de negocio de la carta editable por el dueño:
//   - Estructura: Business → MenuSection[] → MenuItem[]
//   - La visibilidad pública vive en Business.menuVisible (el
//     switch del panel del dueño). Aquí se gestiona el contenido
//     (secciones/ítems) y el propio switch.
//   - Todos los helpers de mutación reciben (userId, slug) y
//     verifican ownership vía assertBusinessOwnership (con
//     override ADMIN), lanzando Response 404/403/400 que el
//     route handler propaga con `if (e instanceof Response)`.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import {
  assertBusinessOwnership,
} from '@/server/services/business.service';
import type { MenuItem, MenuSection } from '@prisma/client';

export type MenuSectionWithItems = MenuSection & { items: MenuItem[] };

/** Límites anti-abuso (v1 — de sobra para cualquier carta real). */
export const MAX_SECTIONS_PER_BUSINESS = 20;
export const MAX_ITEMS_PER_SECTION = 60;

/** Nombre de sección/ítem: 1–60 caracteres. */
const NAME_MAX = 60;
/** Descripción de ítem: máx 200 caracteres. */
const DESCRIPTION_MAX = 200;
/** Precio: 0–999.99 USD. */
const PRICE_MAX = 999.99;

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Validación ───────────────────────────────────────────────

function validateName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > NAME_MAX) return null;
  return trimmed;
}

/** null/undefined/'' → null (sin descripción); >200 chars → 400. */
function cleanDescription(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw jsonError('Descripción inválida', 400);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > DESCRIPTION_MAX) {
    throw jsonError(
      `La descripción no puede pasar de ${DESCRIPTION_MAX} caracteres`,
      400,
    );
  }
  return trimmed;
}

function validatePrice(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw jsonError('Precio inválido', 400);
  }
  const rounded = Math.round(value * 100) / 100;
  if (rounded < 0 || rounded > PRICE_MAX) {
    throw jsonError(`El precio debe estar entre 0 y ${PRICE_MAX} USD`, 400);
  }
  return rounded;
}

function validateSortOrder(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw jsonError('sortOrder inválido (entero ≥ 0)', 400);
  }
  return value;
}

// ── Lectura ──────────────────────────────────────────────────

/** Carta completa de un negocio (secciones e ítems ordenados). */
export async function getBusinessMenu(
  businessId: string,
): Promise<MenuSectionWithItems[]> {
  return db.menuSection.findMany({
    where: { businessId },
    orderBy: { sortOrder: 'asc' },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
}

// ── Visibilidad (el switch del dueño) ────────────────────────

export async function setMenuVisible(
  userId: string,
  slug: string,
  visible: boolean,
): Promise<{ menuVisible: boolean }> {
  const biz = await assertBusinessOwnership(userId, slug);
  const updated = await db.business.update({
    where: { id: biz.id },
    data: { menuVisible: visible },
    select: { menuVisible: true },
  });
  return { menuVisible: updated.menuVisible };
}

// ── Secciones ────────────────────────────────────────────────

export async function createSection(
  userId: string,
  slug: string,
  rawName: unknown,
): Promise<MenuSectionWithItems> {
  const biz = await assertBusinessOwnership(userId, slug);
  const name = validateName(rawName);
  if (!name) {
    throw jsonError('Nombre de sección inválido (1-60 caracteres)', 400);
  }

  const count = await db.menuSection.count({ where: { businessId: biz.id } });
  if (count >= MAX_SECTIONS_PER_BUSINESS) {
    throw jsonError(
      `Límite de ${MAX_SECTIONS_PER_BUSINESS} secciones alcanzado`,
      400,
    );
  }

  const max = await db.menuSection.aggregate({
    where: { businessId: biz.id },
    _max: { sortOrder: true },
  });
  return db.menuSection.create({
    data: {
      businessId: biz.id,
      name,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function updateSection(
  userId: string,
  slug: string,
  sectionId: string,
  body: Record<string, unknown>,
): Promise<MenuSectionWithItems> {
  const biz = await assertBusinessOwnership(userId, slug);
  const section = await db.menuSection.findFirst({
    where: { id: sectionId, businessId: biz.id },
    select: { id: true },
  });
  if (!section) throw jsonError('Sección no encontrada', 404);

  const data: { name?: string; sortOrder?: number } = {};
  if (body.name !== undefined) {
    const name = validateName(body.name);
    if (!name) {
      throw jsonError('Nombre de sección inválido (1-60 caracteres)', 400);
    }
    data.name = name;
  }
  if (body.sortOrder !== undefined) {
    data.sortOrder = validateSortOrder(body.sortOrder);
  }
  if (Object.keys(data).length === 0) {
    throw jsonError('Nada que actualizar', 400);
  }

  return db.menuSection.update({
    where: { id: section.id },
    data,
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function deleteSection(
  userId: string,
  slug: string,
  sectionId: string,
): Promise<{ ok: true }> {
  const biz = await assertBusinessOwnership(userId, slug);
  const section = await db.menuSection.findFirst({
    where: { id: sectionId, businessId: biz.id },
    select: { id: true },
  });
  if (!section) throw jsonError('Sección no encontrada', 404);

  // onDelete: Cascade borra también sus ítems.
  await db.menuSection.delete({ where: { id: section.id } });
  return { ok: true };
}

// ── Ítems ────────────────────────────────────────────────────

export async function createItem(
  userId: string,
  slug: string,
  body: Record<string, unknown>,
): Promise<MenuItem> {
  const biz = await assertBusinessOwnership(userId, slug);

  const name = validateName(body.name);
  if (!name) {
    throw jsonError('Nombre del ítem inválido (1-60 caracteres)', 400);
  }
  const price = validatePrice(body.price);
  const description = cleanDescription(body.description);

  const sectionId = typeof body.sectionId === 'string' ? body.sectionId : '';
  const section = await db.menuSection.findFirst({
    where: { id: sectionId, businessId: biz.id },
    select: { id: true },
  });
  if (!section) throw jsonError('Sección no encontrada', 404);

  const count = await db.menuItem.count({ where: { sectionId: section.id } });
  if (count >= MAX_ITEMS_PER_SECTION) {
    throw jsonError(
      `Límite de ${MAX_ITEMS_PER_SECTION} ítems por sección alcanzado`,
      400,
    );
  }

  const max = await db.menuItem.aggregate({
    where: { sectionId: section.id },
    _max: { sortOrder: true },
  });
  return db.menuItem.create({
    data: {
      sectionId: section.id,
      name,
      description,
      price,
      featured: body.featured === true,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateItem(
  userId: string,
  slug: string,
  itemId: string,
  body: Record<string, unknown>,
): Promise<MenuItem> {
  const biz = await assertBusinessOwnership(userId, slug);
  const item = await db.menuItem.findFirst({
    where: { id: itemId, section: { businessId: biz.id } },
    select: { id: true },
  });
  if (!item) throw jsonError('Ítem no encontrado', 404);

  const data: {
    name?: string;
    description?: string | null;
    price?: number;
    available?: boolean;
    featured?: boolean;
    sortOrder?: number;
  } = {};

  if (body.name !== undefined) {
    const name = validateName(body.name);
    if (!name) {
      throw jsonError('Nombre del ítem inválido (1-60 caracteres)', 400);
    }
    data.name = name;
  }
  if (body.description !== undefined) {
    data.description = cleanDescription(body.description);
  }
  if (body.price !== undefined) {
    data.price = validatePrice(body.price);
  }
  if (body.available !== undefined) {
    if (typeof body.available !== 'boolean') {
      throw jsonError('available debe ser true o false', 400);
    }
    data.available = body.available;
  }
  if (body.featured !== undefined) {
    if (typeof body.featured !== 'boolean') {
      throw jsonError('featured debe ser true o false', 400);
    }
    data.featured = body.featured;
  }
  if (body.sortOrder !== undefined) {
    data.sortOrder = validateSortOrder(body.sortOrder);
  }
  if (Object.keys(data).length === 0) {
    throw jsonError('Nada que actualizar', 400);
  }

  return db.menuItem.update({ where: { id: item.id }, data });
}

export async function deleteItem(
  userId: string,
  slug: string,
  itemId: string,
): Promise<{ ok: true }> {
  const biz = await assertBusinessOwnership(userId, slug);
  const item = await db.menuItem.findFirst({
    where: { id: itemId, section: { businessId: biz.id } },
    select: { id: true },
  });
  if (!item) throw jsonError('Ítem no encontrado', 404);

  await db.menuItem.delete({ where: { id: item.id } });
  return { ok: true };
}
