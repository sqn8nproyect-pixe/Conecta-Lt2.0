import type { Establishment, Offer, Review, User } from './types';

// 21 Establishments with enhanced properties
export const establishments: Establishment[] = [
  {
    id: 1, name: 'Licorería Don Sancho', category: 'licorería',
    description: 'Licorería ubicada en pleno centro de Los Teques, entre el Palacio de Deporte y el Banco Los Teques. Gran variedad de whiskies, rones, vinos espumantes (Prosecco, Cava), cervezas y licores especiales. Venta al mayor y menor con delivery por WhatsApp.',
    lat: 10.347347, lng: -67.042951, address: 'Av. Bolívar con C. Ayacucho, Los Teques 1201, Miranda', phone: '+584245697620', instagram: '@licoreriadonsancho',
    coverImage: '/images/licoreria.png',
    images: ['/images/licoreria.png', '/images/gallery1.png', '/images/offer2.png'],
    avgRating: 4.5, reviewCount: 12, priceRange: '$$', schedule: '08:00 AM - 08:30 PM (Lun-Sáb)',
    subRatings: { ambiente: 4.3, servicio: 4.6, precioCalidad: 4.5 },
    specialty: 'Vinos Espumantes & Whiskies',
    valueProposition: 'Tu licorería de confianza en el centro de Los Teques: entre el Palacio de Deporte y el Banco Los Teques, con delivery por WhatsApp y la mejor variedad de espumantes.',
    gallery: ['/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/licoreriadonsancho' },
  },
  {
    id: 2, name: 'Tasca La Cava', category: 'tasca',
    description: 'Ambiente cálido, música acústica en vivo y los cócteles de autor más famosos de la ciudad. Gastronomía gallega y criolla.',
    lat: 10.3482, lng: -67.0389, address: 'Av. Bolívar, Los Teques', phone: '+584145552345', instagram: '@lacavalt',
    coverImage: '/images/tasca.png',
    images: ['/images/tasca.png', '/images/gallery1.png', '/images/offer1.png'],
    avgRating: 4.5, reviewCount: 34, priceRange: '$$', schedule: '12:00 PM - 02:00 AM',
    subRatings: { ambiente: 4.8, servicio: 4.4, precioCalidad: 4.3 },
    specialty: 'Coctelería de Autor',
    valueProposition: 'El bar de cócteles más premiado de la ciudad, donde cada trago es una obra de arte líquida.',
    gallery: ['/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/lacavalt', tiktok: 'https://tiktok.com/@lacavalt' },
    activePromotion: { label: '2x1 en Cócteles', validUntil: '2026-08-15' },
  },
  {
    id: 3, name: 'Discoteca Eclipse', category: 'discoteca',
    description: 'La mejor pista de baile, espectáculos de luces robóticas y alineación semanal de DJs internacionales de renombre.',
    lat: 10.3411, lng: -67.0456, address: 'Calle Sucre, Los Teques', phone: '+584145553456', instagram: '@eclipselt',
    coverImage: '/images/discoteca.png',
    images: ['/images/discoteca.png', '/images/gallery1.png', '/images/hero.png'],
    avgRating: 4.8, reviewCount: 41, priceRange: '$$$', schedule: '09:00 PM - 05:00 AM',
    subRatings: { ambiente: 4.9, servicio: 4.7, precioCalidad: 4.6 },
    specialty: 'DJs Internacionales',
    valueProposition: 'La única pista de Los Teques con Funktion-One y alineación semanal de DJs de talla mundial.',
    gallery: ['/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    website: 'https://eclipselt.com',
    socialMedia: { instagram: 'https://instagram.com/eclipselt', tiktok: 'https://tiktok.com/@eclipselt', facebook: 'https://facebook.com/eclipselt' },
    activePromotion: { label: 'Lista VIP Jueves', validUntil: '2026-12-31' },
  },
  {
    id: 4, name: 'Licorería Premium Select', category: 'licorería',
    description: 'Importación directa y exclusiva de vinos europeos, whiskies añejos y destilados artesanales raros.',
    lat: 10.3501, lng: -67.0402, address: 'Plaza Bolívar, Los Teques', phone: '+584145554567', instagram: '@premiumselectlt',
    coverImage: '/images/licoreria.png',
    images: ['/images/licoreria.png', '/images/gallery1.png', '/images/offer2.png'],
    avgRating: 4.3, reviewCount: 19, priceRange: '$$$', schedule: '11:00 AM - 10:00 PM',
    subRatings: { ambiente: 3.9, servicio: 4.6, precioCalidad: 4.2 },
    specialty: 'Importación Exclusiva',
    valueProposition: 'Vinos europeos y destilados artesanales que llegan directamente desde las bodegas más exclusivas del mundo.',
    gallery: ['/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/premiumselectlt', facebook: 'https://facebook.com/premiumselectlt' },
  },
  {
    id: 5, name: 'Tasca Los Amigos', category: 'tasca',
    description: 'Clásica tasca con deliciosos platos tradicionales venezolanos, cerveza polar bien fría y un ambiente ideal para compartir con panas.',
    lat: 10.3459, lng: -67.0367, address: 'Av. Miranda, Los Teques', phone: '+584145555678', instagram: '@losamigoslt',
    coverImage: '/images/tasca.png',
    images: ['/images/tasca.png', '/images/gallery1.png', '/images/offer1.png'],
    avgRating: 4.6, reviewCount: 52, priceRange: '$', schedule: '11:30 AM - 01:00 AM',
    subRatings: { ambiente: 4.5, servicio: 4.7, precioCalidad: 4.8 },
    specialty: 'Cocina Criolla Tradicional',
    valueProposition: 'El rincón donde la cerveza siempre está helada y la comida te hace sentir en casa de la abuela.',
    gallery: ['/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/losamigoslt', facebook: 'https://facebook.com/losamigoslt' },
    activePromotion: { label: 'Cerveza Polar 2x1', validUntil: '2026-09-30' },
  },
  {
    id: 6, name: 'Discoteca Noche Eterna', category: 'discoteca',
    description: 'Luces de neón intensas, sistemas de sonido Funktion-One y el mejor ambiente urbano de Los Teques.',
    lat: 10.3398, lng: -67.0491, address: 'Zona Industrial, Los Teques', phone: '+584145556789', instagram: '@nocheeternalt',
    coverImage: '/images/discoteca.png',
    images: ['/images/discoteca.png', '/images/gallery1.png', '/images/hero.png'],
    avgRating: 4.4, reviewCount: 37, priceRange: '$$', schedule: '10:00 PM - 06:00 AM',
    subRatings: { ambiente: 4.6, servicio: 4.1, precioCalidad: 4.3 },
    specialty: 'Música Urbana & Reggaetón',
    valueProposition: 'El templo del perreo en Los Teques, con el sonido más crudo y la energía más densa de la zona industrial.',
    gallery: ['/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/nocheeternalt', tiktok: 'https://tiktok.com/@nocheeternalt' },
  },
  {
    id: 7, name: 'Licorería Vinos del Valle', category: 'licorería',
    description: 'Especialistas en vinos de altura nacionales e internacionales. Catas privadas todos los fines de semana.',
    lat: 10.3524, lng: -67.0428, address: 'Calle 5, Los Teques', phone: '+584145557890', instagram: '@vinosdelvalle',
    coverImage: '/images/licoreria.png',
    images: ['/images/licoreria.png', '/images/gallery1.png'],
    avgRating: 4.9, reviewCount: 23, priceRange: '$$', schedule: '10:00 AM - 08:00 PM',
    subRatings: { ambiente: 4.8, servicio: 5.0, precioCalidad: 4.8 },
    specialty: 'Vinos de Altura & Catas',
    valueProposition: 'La única licorería con sommelier certificado y catas guiadas cada fin de semana en Los Teques.',
    gallery: ['/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    website: 'https://vinosdelvalle.ve',
    socialMedia: { instagram: 'https://instagram.com/vinosdelvalle', facebook: 'https://facebook.com/vinosdelvalle' },
    activePromotion: { label: 'Cata de Vinos $18', validUntil: '2026-10-15' },
  },
  {
    id: 8, name: 'Tasca El Rincón', category: 'tasca',
    description: 'Auténtico sabor español en Los Teques. Tapas variadas, tortillas y sangría casera artesanal.',
    lat: 10.3473, lng: -67.0445, address: 'Barrio El Carmen, Los Teques', phone: '+584145558901', instagram: '@elrinconlt',
    coverImage: '/images/tasca.png',
    images: ['/images/tasca.png', '/images/gallery1.png'],
    avgRating: 4.2, reviewCount: 29, priceRange: '$$', schedule: '12:00 PM - 12:00 AM',
    subRatings: { ambiente: 4.0, servicio: 4.3, precioCalidad: 4.3 },
    specialty: 'Tapas Españolas Auténticas',
    valueProposition: 'Un pedazo de Galicia en Los Teques: tortilla de patatas, sangría casera y jamón ibérico curado 36 meses.',
    gallery: ['/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/elrinconlt' },
  },
  {
    id: 9, name: 'Discoteca La Luna', category: 'discoteca',
    description: 'Un club exclusivo con terraza al aire libre, cócteles premium y una mezcla inigualable de música pop y electrónica.',
    lat: 10.3433, lng: -67.0321, address: 'Av. Principal, Los Teques', phone: '+584145559012', instagram: '@lalunalt',
    coverImage: '/images/discoteca.png',
    images: ['/images/discoteca.png', '/images/gallery1.png'],
    avgRating: 4.7, reviewCount: 44, priceRange: '$$$', schedule: '09:00 PM - 04:00 AM',
    subRatings: { ambiente: 4.8, servicio: 4.6, precioCalidad: 4.5 },
    specialty: 'Terraza Panorámica & Electrónica',
    valueProposition: 'El único rooftop de Los Teques con vista 360° de la ciudad y la mejor música electrónica bajo las estrellas.',
    gallery: ['/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    website: 'https://lalunalt.com',
    socialMedia: { instagram: 'https://instagram.com/lalunalt', tiktok: 'https://tiktok.com/@lalunalt', facebook: 'https://facebook.com/lalunalt' },
    activePromotion: { label: 'Ladies Night Miércoles', validUntil: '2026-12-31' },
  },
  {
    id: 10, name: 'Licorería Central', category: 'licorería',
    description: 'Tu parada rápida de licores y snacks antes de la fiesta. Ubicación céntrica con estacionamiento vigilado.',
    lat: 10.3468, lng: -67.0472, address: 'Centro Comercial Plaza, Los Teques', phone: '+584145550123', instagram: '@centrallicor',
    coverImage: '/images/licoreria.png',
    images: ['/images/licoreria.png', '/images/gallery1.png'],
    avgRating: 4.1, reviewCount: 16, priceRange: '$', schedule: '09:00 AM - 11:00 PM',
    subRatings: { ambiente: 3.5, servicio: 4.3, precioCalidad: 4.5 },
    specialty: 'Compra Rápida & Estacionamiento',
    valueProposition: 'Tu parada exprés antes de la fiesta: licores fríos en 5 minutos y estacionamiento vigilado gratis.',
    gallery: ['/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/centrallicor' },
  },
  {
    id: 11, name: 'Tasca El Sabor', category: 'tasca',
    description: 'Comida familiar de día, tasca animada de noche. Karaoke interactivo y promociones de cervezas.',
    lat: 10.3495, lng: -67.0394, address: 'Calle Real, Los Teques', phone: '+584145551122', instagram: '@elsaborlt',
    coverImage: '/images/tasca.png',
    images: ['/images/tasca.png', '/images/gallery1.png'],
    avgRating: 4.8, reviewCount: 31, priceRange: '$', schedule: '11:00 AM - 02:00 AM',
    subRatings: { ambiente: 4.7, servicio: 4.9, precioCalidad: 4.8 },
    specialty: 'Karaoke & Almuerzo Ejecutivo',
    valueProposition: 'El lugar donde el karaoke de los viernes se vuelve leyenda y el almuerzo ejecutivo te mantiene volviendo toda la semana.',
    gallery: ['/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/elsaborlt', tiktok: 'https://tiktok.com/@elsaborlt', facebook: 'https://facebook.com/elsaborlt' },
    activePromotion: { label: 'Karaoke + Trago $8', validUntil: '2026-11-30' },
  },
  {
    id: 12, name: 'Discoteca Estelar', category: 'discoteca',
    description: 'La discoteca con el diseño más futurista de Miranda. Pistas LED interactivas y palcos VIP de lujo.',
    lat: 10.3402, lng: -67.0513, address: 'Sector La Morita, Los Teques', phone: '+584145552233', instagram: '@estelarlt',
    coverImage: '/images/discoteca.png',
    images: ['/images/discoteca.png', '/images/gallery1.png'],
    avgRating: 4.6, reviewCount: 38, priceRange: '$$$', schedule: '10:00 PM - 05:00 AM',
    subRatings: { ambiente: 4.9, servicio: 4.4, precioCalidad: 4.3 },
    specialty: 'Pistas LED & Palcos VIP',
    valueProposition: 'Diseño futurista con pistas LED interactivas y palcos VIP con servicio de mayordomo privado.',
    gallery: ['/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    website: 'https://estelarlt.com',
    socialMedia: { instagram: 'https://instagram.com/estelarlt', tiktok: 'https://tiktok.com/@estelarlt', facebook: 'https://facebook.com/estelarlt' },
  },
  {
    id: 13, name: 'Licorería Oro Negro', category: 'licorería',
    description: 'Selección especializada de rones añejos venezolanos de prestigio e importaciones distinguidas.',
    lat: 10.3517, lng: -67.0419, address: 'Calle 9, Los Teques', phone: '+584145553344', instagram: '@oronegro',
    coverImage: '/images/licoreria.png',
    images: ['/images/licoreria.png', '/images/gallery1.png'],
    avgRating: 4.5, reviewCount: 25, priceRange: '$$', schedule: '10:00 AM - 09:00 PM',
    subRatings: { ambiente: 4.0, servicio: 4.6, precioCalidad: 4.7 },
    specialty: 'Ron Venezolano Añejo',
    valueProposition: 'La mayor curaduría de rones venezolanos de Los Teques: desde el Santa Teresa 1796 hasta ediciones especiales.',
    gallery: ['/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/oronegro', facebook: 'https://facebook.com/oronegro' },
    activePromotion: { label: 'Tour de Ron $22', validUntil: '2026-09-15' },
  },
  {
    id: 14, name: 'Tasca La Parrilla', category: 'tasca',
    description: 'Exquisitas carnes a la parrilla acompañadas de tragos tradicionales y música llanera en vivo los fines de semana.',
    lat: 10.3448, lng: -67.0378, address: 'Av. Los Teques, Los Teques', phone: '+584145554455', instagram: '@laparrillalt',
    coverImage: '/images/tasca.png',
    images: ['/images/tasca.png', '/images/gallery1.png'],
    avgRating: 4.3, reviewCount: 27, priceRange: '$$', schedule: '12:00 PM - 12:00 AM',
    subRatings: { ambiente: 4.3, servicio: 4.2, precioCalidad: 4.4 },
    specialty: 'Parrilla Llanera en Vivo',
    valueProposition: 'Carnes a la leña con música llanera en vivo los viernes: el sabor más criollo de Los Teques.',
    gallery: ['/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/laparrillalt', facebook: 'https://facebook.com/laparrillalt' },
  },
  {
    id: 15, name: 'Discoteca Glamour', category: 'discoteca',
    description: 'Una experiencia inmersiva para los amantes del tech-house y la música urbana. Código de vestimenta elegante.',
    lat: 10.3421, lng: -67.0487, address: 'Zona Rosa, Los Teques', phone: '+584145555566', instagram: '@glamourlt',
    coverImage: '/images/discoteca.png',
    images: ['/images/discoteca.png', '/images/gallery1.png', '/images/offer2.png'],
    avgRating: 4.9, reviewCount: 49, priceRange: '$$$', schedule: '10:00 PM - 06:00 AM',
    subRatings: { ambiente: 5.0, servicio: 4.8, precioCalidad: 4.7 },
    specialty: 'Tech-House & Código Elegante',
    valueProposition: 'La experiencia más inmersiva de Los Teques para amantes del tech-house, con código de vestimenta que eleva la noche.',
    gallery: ['/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    website: 'https://glamourlt.com',
    socialMedia: { instagram: 'https://instagram.com/glamourlt', tiktok: 'https://tiktok.com/@glamourlt', facebook: 'https://facebook.com/glamourlt' },
    activePromotion: { label: 'Entrada VIP + 2 bebidas', validUntil: '2026-10-31' },
  },
  {
    id: 16, name: 'Licorería La Botella', category: 'licorería',
    description: 'Las mejores promociones semanales en cervezas nacionales e importadas. Todo tipo de licores al mejor precio.',
    lat: 10.3489, lng: -67.0435, address: 'Calle Libertador, Los Teques', phone: '+584145556677', instagram: '@labotellalt',
    coverImage: '/images/licoreria.png',
    images: ['/images/licoreria.png', '/images/gallery1.png'],
    avgRating: 4.0, reviewCount: 14, priceRange: '$', schedule: '09:00 AM - 10:00 PM',
    subRatings: { ambiente: 3.3, servicio: 4.2, precioCalidad: 4.6 },
    specialty: 'Promociones Semanales',
    valueProposition: 'Los precios más bajos de Los Teques en cervezas nacionales e importadas, con promos distintas cada semana.',
    gallery: ['/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/labotellalt' },
  },
  {
    id: 17, name: 'Tasca El Patio', category: 'tasca',
    description: 'Un jardín colonial reformado en tasca. Excelente coctelería tropical, pizzas a la leña y acústicos los viernes.',
    lat: 10.3452, lng: -67.0354, address: 'Plaza Sucre, Los Teques', phone: '+584145557788', instagram: '@elpatio',
    coverImage: '/images/tasca.png',
    images: ['/images/tasca.png', '/images/gallery1.png'],
    avgRating: 4.7, reviewCount: 33, priceRange: '$$', schedule: '06:00 PM - 01:00 AM',
    subRatings: { ambiente: 4.9, servicio: 4.6, precioCalidad: 4.5 },
    specialty: 'Jardín Colonial & Pizza a la Leña',
    valueProposition: 'Un jardín colonial reformado en tasca: la única pizza a la leña de Los Teques con acústicos en vivo los viernes.',
    gallery: ['/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    website: 'https://elpatiolt.com',
    socialMedia: { instagram: 'https://instagram.com/elpatio', tiktok: 'https://tiktok.com/@elpatio', facebook: 'https://facebook.com/elpatio' },
    activePromotion: { label: 'Pizza a la Leña 2x1', validUntil: '2026-09-30' },
  },
  {
    id: 18, name: 'Discoteca Vibra', category: 'discoteca',
    description: 'El templo de los ritmos latinos, reggaetón de la vieja escuela y noches temáticas emocionantes.',
    lat: 10.3419, lng: -67.0463, address: 'Av. Miranda Este, Los Teques', phone: '+584145558899', instagram: '@vibralt',
    coverImage: '/images/discoteca.png',
    images: ['/images/discoteca.png', '/images/gallery1.png'],
    avgRating: 4.4, reviewCount: 22, priceRange: '$$', schedule: '09:00 PM - 05:00 AM',
    subRatings: { ambiente: 4.5, servicio: 4.2, precioCalidad: 4.4 },
    specialty: 'Reggaetón Old School & Noches Temáticas',
    valueProposition: 'El templo de los ritmos latinos con noches temáticas únicas que cambian cada semana en Los Teques.',
    gallery: ['/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/vibralt', tiktok: 'https://tiktok.com/@vibralt' },
  },
  {
    id: 19, name: 'Licorería Selecta', category: 'licorería',
    description: 'Un espacio boutique elegante con la mayor colección de licores importados exclusivos y asesoramiento personalizado.',
    lat: 10.3531, lng: -67.0398, address: 'Calle 12, Los Teques', phone: '+584145559900', instagram: '@selectalt',
    coverImage: '/images/licoreria.png',
    images: ['/images/licoreria.png', '/images/gallery1.png'],
    avgRating: 4.6, reviewCount: 18, priceRange: '$$$', schedule: '10:00 AM - 09:00 PM',
    subRatings: { ambiente: 4.3, servicio: 4.8, precioCalidad: 4.4 },
    specialty: 'Boutique de Licores Importados',
    valueProposition: 'Un espacio boutique con asesoramiento de sommelier privado y la mayor colección de tequilas premium del estado.',
    gallery: ['/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/licoreria.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    website: 'https://selectalt.com',
    socialMedia: { instagram: 'https://instagram.com/selectalt', facebook: 'https://facebook.com/selectalt' },
    activePromotion: { label: 'Tequila Don Julio 1942', validUntil: '2026-12-15' },
  },
  {
    id: 20, name: 'Tasca La Esquina', category: 'tasca',
    description: 'El lugar perfecto para tomar algo después del trabajo. Excelente surtido de picoteo y jarras de sangría heladas.',
    lat: 10.3479, lng: -67.0411, address: 'Esquina El Carmen, Los Teques', phone: '+584145550099', instagram: '@laesquinalt',
    coverImage: '/images/tasca.png',
    images: ['/images/tasca.png', '/images/gallery1.png'],
    avgRating: 4.2, reviewCount: 21, priceRange: '$', schedule: '04:00 PM - 12:00 AM',
    subRatings: { ambiente: 4.1, servicio: 4.1, precioCalidad: 4.3 },
    specialty: 'After Office & Sangría Casera',
    valueProposition: 'El after office más animado de Los Teques: sangría helada de 1L y picada generosa para compartir con los panas.',
    gallery: ['/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/tasca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    socialMedia: { instagram: 'https://instagram.com/laesquinalt' },
  },
  {
    id: 21, name: 'Discoteca Royal', category: 'discoteca',
    description: 'Elegancia nocturna sin límites. Zonas VIP privadas, barras premium, y los espectáculos artísticos más atrevidos del estado.',
    lat: 10.3395, lng: -67.0505, address: 'Sector Los Rosales, Los Teques', phone: '+584145551188', instagram: '@royallt',
    coverImage: '/images/discoteca.png',
    images: ['/images/discoteca.png', '/images/gallery1.png', '/images/hero.png'],
    avgRating: 4.8, reviewCount: 36, priceRange: '$$$', schedule: '10:00 PM - 06:00 AM',
    subRatings: { ambiente: 5.0, servicio: 4.7, precioCalidad: 4.6 },
    specialty: 'VIP Suites & Espectáculos Artísticos',
    valueProposition: 'Elegancia nocturna sin límites: suites VIP privadas con bartender dedicado y los espectáculos más atrevidos de Miranda.',
    gallery: ['/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png', '/images/discoteca.png', '/images/gallery1.png', '/images/offer1.png', '/images/offer2.png', '/images/hero.png'],
    website: 'https://royallt.com',
    socialMedia: { instagram: 'https://instagram.com/royallt', tiktok: 'https://tiktok.com/@royallt', facebook: 'https://facebook.com/royallt' },
    activePromotion: { label: 'VIP Royal Suite', validUntil: '2026-11-15' },
  },
];

// 42 Offers — 2 per establishment
export const offers: Offer[] = [
  // Licorería Don Sancho (1)
  { id: 1, establishmentId: 1, title: 'Whisky Premium 18 años', description: 'Botella de 750ml. Reserva limitada de malta única. Consulta disponibilidad por WhatsApp.', price: '$89', discount: '20% OFF', image: '/images/offer2.png', code: 'SANCHO18' },
  { id: 2, establishmentId: 1, title: 'Pack Cervezas Artesanales', description: '6 cervezas nacionales + vaso de regalo. Sabores exclusivos.', price: '$24', discount: '15% OFF', image: '/images/offer1.png', code: 'SANCHO6' },
  // Tasca La Cava (2)
  { id: 3, establishmentId: 2, title: 'Cóctel Noche Dorada', description: 'Gin premium + tónica especial + infusión de cítricos.', price: '$12', discount: '2x1', image: '/images/offer1.png', code: 'CAVA2X1' },
  { id: 4, establishmentId: 2, title: 'Tabla de Quesos + Vino', description: 'Selección de 5 quesos + botella de tinto reserva.', price: '$35', discount: 'COMBO', image: '/images/offer2.png', code: 'CAVAQ' },
  // Discoteca Eclipse (3)
  { id: 5, establishmentId: 3, title: 'Botella de Champagne', description: 'Veuve Clicquot Brut 750ml helada con copa VIP.', price: '$75', discount: 'PROMO VIP', image: '/images/offer2.png', code: 'ECLIPSEVIP' },
  { id: 6, establishmentId: 3, title: 'Lista VIP Jueves', description: 'Entrada sin cola + 2 tragos de cortesía para mujeres.', price: '$0', discount: 'GRATIS', image: '/images/offer1.png', code: 'ECLIPSEJ' },
  // Licorería Premium Select (4)
  { id: 7, establishmentId: 4, title: 'Vino Español Reserva', description: 'Rioja Crianza 750ml. Cosecha seleccionada 2019.', price: '$42', discount: '25% OFF', image: '/images/offer2.png', code: 'RIOJA19' },
  { id: 8, establishmentId: 4, title: 'Set de Cata', description: '3 mini botellas premium + guía de catas profesional.', price: '$28', discount: 'KIT', image: '/images/offer1.png', code: 'CATA3' },
  // Tasca Los Amigos (5)
  { id: 9, establishmentId: 5, title: 'Ron Añejo + 2 Raciones', description: 'Combo especial con ración de tequeños y empanaditas.', price: '$28', discount: 'POPULAR', image: '/images/offer1.png', code: 'AMIGOSPACK' },
  { id: 10, establishmentId: 5, title: 'Cerveza Polar 2x1', description: 'Doble polar bien fría de 9 a 11pm todos los días.', price: '$4', discount: '2x1', image: '/images/offer2.png', code: 'POLAR2X1' },
  // Discoteca Noche Eterna (6)
  { id: 11, establishmentId: 6, title: 'Botella + 4 Entradas', description: 'Whisky + 4 accesos generales + mesa reservada.', price: '$120', discount: 'PACK', image: '/images/offer2.png', code: 'NOCHEDARK' },
  { id: 12, establishmentId: 6, title: 'Cumpleañeros Free', description: 'Entrada gratis en tu cumpleaños + botella de champagne.', price: '$0', discount: 'CUMPLE', image: '/images/offer1.png', code: 'ETERNABC' },
  // Licorería Vinos del Valle (7)
  { id: 13, establishmentId: 7, title: 'Cata de Vinos', description: 'Experiencia de cata guiada de 5 vinos premium sábados.', price: '$18', discount: 'EVENTO', image: '/images/offer2.png', code: 'CATAVALLE' },
  { id: 14, establishmentId: 7, title: '6 Vinos Mix-and-Match', description: 'Arma tu pack de 6 vinos con descuento por volumen.', price: '$65', discount: 'BULK', image: '/images/offer1.png', code: 'MIX6VINOS' },
  // Tasca El Rincón (8)
  { id: 15, establishmentId: 8, title: 'Tapas 3x2', description: 'Paga 2 tapas y llévate 3. Incluye sangría de la casa.', price: '$22', discount: '3x2', image: '/images/offer1.png', code: 'TAPAS32' },
  { id: 16, establishmentId: 8, title: 'Paella Domingo', description: 'Paella valenciana para 2 + jarra de sangría.', price: '$38', discount: 'DOMINGO', image: '/images/offer2.png', code: 'PAELLAD' },
  // Discoteca La Luna (9)
  { id: 17, establishmentId: 9, title: 'Mesa VIP Terraza', description: 'Reserva de mesa en terraza + botella + 4 entradas.', price: '$140', discount: 'TERRAZA', image: '/images/offer2.png', code: 'LUNATERR' },
  { id: 18, establishmentId: 9, title: 'Ladies Night Miércoles', description: 'Mujeres entran gratis hasta 11pm + cóctel de bienvenida.', price: '$0', discount: 'LADIES', image: '/images/offer1.png', code: 'LUNALADIES' },
  // Licorería Central (10)
  { id: 19, establishmentId: 10, title: 'Combo Pre-Fiesta', description: 'Hielo + 2 mixers + botella de ron nacional.', price: '$25', discount: 'PRE', image: '/images/offer2.png', code: 'PREFIESTA' },
  { id: 20, establishmentId: 10, title: 'Cervezas 12-Pack', description: '12 cervezas nacionales surtidas a precio mayorista.', price: '$15', discount: 'MAYOR', image: '/images/offer1.png', code: 'PACK12' },
  // Tasca El Sabor (11)
  { id: 21, establishmentId: 11, title: 'Karaoke + Trago', description: 'Participa del karaoke y llévate un trago cortesía.', price: '$8', discount: 'KARAOKE', image: '/images/offer1.png', code: 'SABORK' },
  { id: 22, establishmentId: 11, title: 'Almuerzo Ejecutivo', description: 'Plato del día + bebida + postre de lunes a viernes.', price: '$12', discount: 'EJEC', image: '/images/offer2.png', code: 'SABOREJEC' },
  // Discoteca Estelar (12)
  { id: 23, establishmentId: 12, title: 'Palco VIP 8 personas', description: 'Palco privado + 2 botellas + accesos VIP para 8.', price: '$280', discount: 'PALCO', image: '/images/offer2.png', code: 'ESTELARP' },
  { id: 24, establishmentId: 12, title: 'Estudiante 2x1', description: '2 entradas por 1 con carnet estudiantil vigente.', price: '$10', discount: '2x1', image: '/images/offer1.png', code: 'ESTELEST' },
  // Licorería Oro Negro (13)
  { id: 25, establishmentId: 13, title: 'Ron Venezolano 7 años', description: 'Santa Teresa 1796 + 2 copas de cristal.', price: '$45', discount: 'CRIOLLO', image: '/images/offer2.png', code: 'ORO7' },
  { id: 26, establishmentId: 13, title: 'Tour de Ron', description: 'Degustación de 4 rones venezolanos con guía experto.', price: '$22', discount: 'TOUR', image: '/images/offer1.png', code: 'RONTOUR' },
  // Tasca La Parrilla (14)
  { id: 27, establishmentId: 14, title: 'Parrilla para 2', description: 'Chorizo, chuleta, pollo + 2 acompañantes + 2 cervezas.', price: '$40', discount: 'PARRILLA', image: '/images/offer1.png', code: 'PARRI2' },
  { id: 28, establishmentId: 14, title: 'Happy Hour Llanero', description: '2x1 en cócteles tropicales de 5 a 8pm los viernes.', price: '$7', discount: '2x1', image: '/images/offer2.png', code: 'LLANERO2' },
  // Discoteca Glamour (15)
  { id: 29, establishmentId: 15, title: 'Entrada VIP + 2 bebidas', description: 'Acceso preferente sin cola + 2 cócteles a elección.', price: '$35', discount: 'EXCLUSIVO', image: '/images/offer2.png', code: 'GLAMOURVIP' },
  { id: 30, establishmentId: 15, title: 'Mesa Glow 4 personas', description: 'Mesa con iluminación LED + 1 botella premium.', price: '$160', discount: 'GLOW', image: '/images/offer1.png', code: 'GLAMGLOW' },
  // Licorería La Botella (16)
  { id: 31, establishmentId: 16, title: 'Cervezas 3x2 Nacional', description: 'Lleva 3 paga 2 en cervezas nacionales de 330ml.', price: '$6', discount: '3x2', image: '/images/offer1.png', code: 'BOT32' },
  { id: 32, establishmentId: 16, title: 'Whisky Barato', description: 'Old Parr 12 años al mejor precio de Los Teques.', price: '$55', discount: 'OFERTÓN', image: '/images/offer2.png', code: 'BOTOPARR' },
  // Tasca El Patio (17)
  { id: 33, establishmentId: 17, title: 'Pizza a la Leña 2x1', description: '2 pizzas medianas artesanales al horno de leña.', price: '$22', discount: '2x1', image: '/images/offer1.png', code: 'PATIO2X1' },
  { id: 34, establishmentId: 17, title: 'Acústico Viernes', description: 'Música en vivo + cóctel de bienvenida de cortesía.', price: '$15', discount: 'ACÚSTICO', image: '/images/offer2.png', code: 'PATIOV' },
  // Discoteca Vibra (18)
  { id: 35, establishmentId: 18, title: 'Reggaetón Night Pack', description: 'Entrada + chupa de regalo + 1 trago de la casa.', price: '$20', discount: 'PERREO', image: '/images/offer1.png', code: 'VIBRARREG' },
  { id: 36, establishmentId: 18, title: 'Mesa Temática', description: 'Mesa con decoración temática + 1 botella + 6 entradas.', price: '$130', discount: 'TEMA', image: '/images/offer2.png', code: 'VIBRATEMA' },
  // Licorería Selecta (19)
  { id: 37, establishmentId: 19, title: 'Tequila Reserva', description: 'Don Julio 1942 + 2 caballitos de cristal soplado.', price: '$120', discount: 'PREMIUM', image: '/images/offer2.png', code: 'TEQUILA42' },
  { id: 38, establishmentId: 19, title: 'Asesoría Personalizada', description: 'Sommelier privado 1 hora + descuento en tu compra.', price: '$15', discount: 'EXPERTO', image: '/images/offer1.png', code: 'SELECTAEXP' },
  // Tasca La Esquina (20)
  { id: 39, establishmentId: 20, title: 'Sangría 1L + Picada', description: 'Jarra de sangría casera + tabla de embutidos.', price: '$20', discount: 'Tarde', image: '/images/offer1.png', code: 'ESQUINASANG' },
  { id: 40, establishmentId: 20, title: 'After Office 2x1', description: '2x1 en cervezas de 5 a 8pm de lunes a jueves.', price: '$3', discount: '2x1', image: '/images/offer2.png', code: 'ESQUINAOFF' },
  // Discoteca Royal (21)
  { id: 41, establishmentId: 21, title: 'VIP Royal Suite', description: 'Suite privada con bartender + 2 botellas + 10 entradas.', price: '$450', discount: 'ROYAL', image: '/images/offer2.png', code: 'ROYALSUITE' },
  { id: 42, establishmentId: 21, title: 'Aniversario Royal', description: 'Celebra tu aniversario: mesa VIP + champagne de cortesía.', price: '$80', discount: 'ANIV', image: '/images/offer1.png', code: 'ROYALANIV' },
];

// Pool of review authors (varied Venezuelan names)
const reviewUsers = [
  { id: 'u1', name: 'Carlos Mendoza', avatar: 'https://i.pravatar.cc/40?img=12' },
  { id: 'u2', name: 'María López', avatar: 'https://i.pravatar.cc/40?img=28' },
  { id: 'u3', name: 'Jean Gómez', avatar: 'https://i.pravatar.cc/40?img=33' },
  { id: 'u4', name: 'Andrea Fernández', avatar: 'https://i.pravatar.cc/40?img=5' },
  { id: 'u5', name: 'José Pereira', avatar: 'https://i.pravatar.cc/40?img=15' },
  { id: 'u6', name: 'Luisana Ramírez', avatar: 'https://i.pravatar.cc/40?img=44' },
  { id: 'u7', name: 'Roberto Silva', avatar: 'https://i.pravatar.cc/40?img=51' },
  { id: 'u8', name: 'Daniela Torres', avatar: 'https://i.pravatar.cc/40?img=9' },
  { id: 'u9', name: 'Francisco Herrera', avatar: 'https://i.pravatar.cc/40?img=60' },
  { id: 'u10', name: 'Carolina Vargas', avatar: 'https://i.pravatar.cc/40?img=20' },
  { id: 'u11', name: 'Eduardo Marín', avatar: 'https://i.pravatar.cc/40?img=68' },
  { id: 'u12', name: 'Sofía Castro', avatar: 'https://i.pravatar.cc/40?img=30' },
  { id: 'u13', name: 'Manuel Rojas', avatar: 'https://i.pravatar.cc/40?img=14' },
  { id: 'u14', name: 'Valentina Díaz', avatar: 'https://i.pravatar.cc/40?img=23' },
  { id: 'u15', name: 'Ricardo Blanco', avatar: 'https://i.pravatar.cc/40?img=58' },
  { id: 'u16', name: 'Gabriela Mora', avatar: 'https://i.pravatar.cc/40?img=49' },
];

// Comments pool, varied by category tone
const commentTemplates = {
  licorería: [
    'Excelente selección de whiskies. La atención de su personal es de primera, te asesoran muy bien.',
    'Precios justos y variedad increíble. Encontré vinos que no había visto en otros lados.',
    'El local es pequeño pero surtido. Los enviadores son rápidos y amables.',
    'Buena opción para comprar antes de una fiesta. Tienen de todo y a buen precio.',
    'Me encanta que tienen catas los fines de semana. Aprendí muchísimo sobre rones venezolanos.',
    'Atención personalizada de otro nivel. El sommelier me recomendó un tinto espectacular.',
    'Podrían mejorar el estacionamiento pero la calidad de los licores es indiscutible.',
    'Mi licorería de cabecera desde hace años. Nunca me defrauda.',
  ],
  tasca: [
    'La mejor música acústica en vivo de Los Teques. El ambiente es super íntimo, ideal para parejas.',
    'Las tapas son generosas y deliciosas. La sangría de la casa es única.',
    'Ambiente relajado para compartir con panas. Las cervezas siempre bien frías.',
    'La comida tardó un poco pero valió la pena. Platos bien presentados y sabrosos.',
    'El karaoke de los viernes es lo mejor. Súper recomendado para grupos.',
    'Sitio perfecto para after office. Buen precio y porciones abundantes.',
    'La parrilla es espectacular, cares jugosas y bien sazonadas. Volveré seguro.',
    'Un rinconcito español en Los Teques. La tortilla me recordó a la de mi abuela.',
  ],
  discoteca: [
    'El juego de luces y el sonido en este local son de otro planeta. Definitivamente volveré.',
    'Ambiente increíble, DJs que saben lo que hacen. La pista LED es brutal.',
    'Caro pero vale cada centavo. El servicio VIP es de primera categoría.',
    'La terraza al aire libre es un plus enorme. Cócteles premium y buena música.',
    'Noche temática de reggaetón vieja escuela estuvo brutal. Pura energía.',
    'Staff atento y profesional. Las botellas llegaron rápido y bien servidas.',
    'El código de vestimenta le da un toque elegante. Gente bien vestida y ambiente top.',
    'Mejor discoteca de Los Teques sin duda. Ya he ido 3 veces este mes.',
  ],
};

const dates = [
  '2026-07-20', '2026-07-25', '2026-07-28', '2026-08-02', '2026-08-09',
  '2026-08-15', '2026-08-22', '2026-08-30', '2026-09-05', '2026-09-12',
  '2026-09-19', '2026-09-26', '2026-10-03', '2026-10-10', '2026-10-17',
];

function buildReviews(): Review[] {
  const reviews: Review[] = [];
  let reviewId = 1;
  establishments.forEach((est) => {
    const pool = commentTemplates[est.category];
    // pick 4 distinct comments; ratings biased to est.avgRating ± small variance
    const usedComments = new Set<number>();
    for (let i = 0; i < 4; i++) {
      let cIdx = (est.id * 3 + i * 5) % pool.length;
      while (usedComments.has(cIdx)) {
        cIdx = (cIdx + 1) % pool.length;
      }
      usedComments.add(cIdx);
      const uIdx = (est.id * 2 + i * 3) % reviewUsers.length;
      const user = reviewUsers[uIdx];
      // Rating: most around avgRating, some lower/higher
      const variance = ((est.id + i) % 3) - 1; // -1, 0, or 1
      let rating = Math.round(est.avgRating + variance);
      rating = Math.max(3, Math.min(5, rating));
      const dateIdx = (est.id + i * 2) % dates.length;
      reviews.push({
        id: reviewId++,
        establishmentId: est.id,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        rating,
        comment: pool[cIdx],
        date: dates[dateIdx],
      });
    }
  });
  return reviews;
}

export const initialReviews: Review[] = buildReviews();

// Simulated Google user
export const mockGoogleUser: User = {
  id: 'currentUser',
  name: 'Ana Rodríguez',
  email: 'ana.rodriguez@gmail.com',
  avatar: 'https://i.pravatar.cc/40?img=47',
};
