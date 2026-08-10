'use client';

import { useCallback, useRef } from 'react';
import { trackAnalyticsEvent } from '@/lib/api';
import type { AnalyticsEventType } from '@/lib/types';

/**
 * useAnalytics — Multi-instance analytics hook.
 *
 * Each component that needs tracking instantiates it. All calls are
 * fire-and-forget (no React Query mutation — just call
 * `trackAnalyticsEvent` directly, which swallows errors).
 *
 * Exposes:
 *  - track(type, opts?)         — fire a single event
 *  - trackPageView(slug)        — convenience for BUSINESS_VIEW (deduped per-mount)
 *  - trackWhatsAppClick(slug)   — convenience for WHATSAPP_CLICK
 *  - trackInstagramClick(slug)  — convenience for INSTAGRAM_CLICK
 *  - trackMapsClick(slug)       — convenience for MAPS_CLICK
 *  - trackSearch(query)         — convenience for SEARCH
 *  - trackReserveClick(slug)    — convenience for RESERVE_CLICK
 *  - trackRedeemClick(slug)     — convenience for REDEEM_CLICK
 *
 * `trackPageView(slug)` is DEDUPED PER MOUNT — calling it repeatedly
 * for the same slug within a single component lifecycle logs ONE event.
 * This matches user intent: "the user opened this page" not "the user
 * re-rendered this page". Use it in a useEffect([]) at the top of
 * EstablishmentPage.
 *
 * For the click events (WhatsApp, Instagram, Maps, Reserve, Redeem),
 * each click should fire one event — no dedup.
 */
export function useAnalytics() {
  const trackedSlugRef = useRef<string | null>(null);

  const track = useCallback(
    (
      type: AnalyticsEventType,
      opts?: {
        businessSlug?: string;
        metadata?: Record<string, unknown>;
      },
    ) => {
      trackAnalyticsEvent({ type, ...opts });
    },
    [],
  );

  const trackPageView = useCallback((slug: string) => {
    if (trackedSlugRef.current === slug) return; // dedupe per-mount
    trackedSlugRef.current = slug;
    trackAnalyticsEvent({ type: 'BUSINESS_VIEW', businessSlug: slug });
  }, []);

  const trackWhatsAppClick = useCallback((slug: string) => {
    trackAnalyticsEvent({ type: 'WHATSAPP_CLICK', businessSlug: slug });
  }, []);

  const trackInstagramClick = useCallback((slug: string) => {
    trackAnalyticsEvent({ type: 'INSTAGRAM_CLICK', businessSlug: slug });
  }, []);

  const trackMapsClick = useCallback((slug: string) => {
    trackAnalyticsEvent({ type: 'MAPS_CLICK', businessSlug: slug });
  }, []);

  const trackSearch = useCallback((query: string) => {
    trackAnalyticsEvent({ type: 'SEARCH', metadata: { query } });
  }, []);

  const trackReserveClick = useCallback((slug: string) => {
    trackAnalyticsEvent({ type: 'RESERVE_CLICK', businessSlug: slug });
  }, []);

  const trackRedeemClick = useCallback((slug: string) => {
    trackAnalyticsEvent({ type: 'REDEEM_CLICK', businessSlug: slug });
  }, []);

  return {
    track,
    trackPageView,
    trackWhatsAppClick,
    trackInstagramClick,
    trackMapsClick,
    trackSearch,
    trackReserveClick,
    trackRedeemClick,
  };
}
