'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Star } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Category, Establishment } from '@/lib/types';

const LOS_TEQUES_CENTER: [number, number] = [10.3444, -67.0428];

/** Radio de proximidad para "opciones cercanas" (en metros). 1000m = 1km. */
export const NEARBY_RADIUS_M = 1000;

type PinColor = 'gold' | 'amber' | 'purple';

function colorForCategory(cat: Category): PinColor {
  if (cat === 'licorería') return 'gold';
  if (cat === 'tasca') return 'amber';
  return 'purple';
}

function makeIcon(color: PinColor): L.DivIcon {
  return L.divIcon({
    className: 'conecta-marker',
    html: `<div class="conecta-marker-pin ${color}"><div class="pin-body"></div><div class="pin-tail"></div></div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
  });
}

/** Icono del usuario: punto rojo pulsante con halo animado. */
function makeUserIcon(): L.DivIcon {
  return L.divIcon({
    className: 'conecta-user-marker',
    html: `<div class="conecta-user-dot"></div><div class="conecta-user-pulse"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Flies the map to the selected establishment whenever it changes.
 * Lives inside <MapContainer> so it can use the useMap() hook.
 */
function FlyTo({ selected }: { selected: Establishment | null }) {
  const map = useMap();
  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat, selected.lng], 16, { duration: 0.8 });
    }
  }, [selected, map]);
  return null;
}

/**
 * Flies the map to the user's location when it first becomes available.
 * Runs inside <MapContainer>.
 */
function FlyToUser({ userLocation }: { userLocation: UserLocation | null }) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 0.9 });
    }
  }, [userLocation, map]);
  return null;
}

/**
 * Real Leaflet map. Dynamically imported with `ssr: false` from MapPage
 * because leaflet/react-leaflet access `window` at module evaluation.
 */
export function LeafletMap({
  searchQuery,
  userLocation,
  establishments,
}: {
  searchQuery: string;
  userLocation: UserLocation | null;
  establishments: Establishment[];
}) {
  const selectedEst = useAppStore((s) => s.selectedMapEstablishment);
  const setSelectedEst = useAppStore((s) => s.setSelectedMapEstablishment);
  const goToDetail = useAppStore((s) => s.goToDetail);

  // Build the three colored pin icons + the user icon once.
  const icons = useMemo(
    () => ({
      gold: makeIcon('gold'),
      amber: makeIcon('amber'),
      purple: makeIcon('purple'),
    }),
    [],
  );
  const userIcon = useMemo(() => makeUserIcon(), []);

  // Filter markers by name or category when the search box is used.
  const filteredEst = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return establishments;
    return establishments.filter(
      (est) =>
        est.name.toLowerCase().includes(q) ||
        est.category.toLowerCase().includes(q),
    );
  }, [searchQuery, establishments]);

  const handleViewDetails = (est: Establishment) => {
    setSelectedEst(null);
    goToDetail(est.slug);
  };

  return (
    <MapContainer
      center={LOS_TEQUES_CENTER}
      zoom={14}
      scrollWheelZoom
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
      className="conecta-map"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {/* Native Leaflet zoom, positioned bottom-right to avoid the
          top-left search overlay (the default top-left placement would
          overlap the search box, especially on mobile). */}
      <ZoomControl position="bottomright" />
      <FlyTo selected={selectedEst} />
      <FlyToUser userLocation={userLocation} />

      {filteredEst.map((est) => {
        const rating = { avg: est.avgRating, count: est.reviewCount };
        return (
          <Marker
            key={est.id}
            position={[est.lat, est.lng]}
            icon={icons[colorForCategory(est.category)]}
            eventHandlers={{ click: () => setSelectedEst(est) }}
          >
            <Popup>
              <div className="conecta-popup">
                <div className="conecta-popup-cat">{est.category}</div>
                <div className="conecta-popup-name">{est.name}</div>
                <div className="conecta-popup-meta">
                  <Star size={12} fill="#d4af37" color="#d4af37" />
                  <span className="conecta-popup-rating">{rating.avg}</span>
                  <span>({rating.count} reseñas)</span>
                </div>
                <div className="conecta-popup-addr">{est.address}</div>
                <button
                  type="button"
                  className="conecta-popup-btn"
                  onClick={() => handleViewDetails(est)}
                >
                  Ver detalles
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* === Marcador del usuario + círculo de proximidad (1km) === */}
      {userLocation && (
        <>
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="conecta-popup">
                <div className="conecta-popup-cat" style={{ color: '#ef4444' }}>
                  TU UBICACIÓN
                </div>
                <div className="conecta-popup-name">Estás aquí</div>
                <div className="conecta-popup-addr">
                  Mostrando opciones a menos de 1 km
                </div>
              </div>
            </Popup>
          </Marker>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={NEARBY_RADIUS_M}
            pathOptions={{
              color: '#ef4444',
              weight: 2,
              fillColor: '#ef4444',
              fillOpacity: 0.06,
              dashArray: '6 6',
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
