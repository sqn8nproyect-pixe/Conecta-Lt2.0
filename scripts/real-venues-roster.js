/**
 * Roster final de venues reales del municipio Guaicaipuro (v1).
 * Fuentes: datos Google Maps verificados por el usuario (source: "usuario")
 * + investigación web del agente (source: "agente", scripts/real-venues-research.json).
 *
 * mode "rename": renombra/recategoriza un slot de plantilla (conserva reviews,
 *                favoritos, ofertas, imágenes y horas de la ordenanza salvo hours custom)
 * mode "create": crea negocio nuevo (para venues del usuario que no caben en slots)
 *
 * hours: {open, close, closedDays[]} — closedDays 0=Dom. Convención: close<open = +1.
 * Coordenadas APROXIMADAS por zona/zona-vía (pendientes de GPS real del local).
 * Descriptions: borradores editoriales sin datos inventados, pendientes de dueño.
 */
module.exports = [
  // ── DISCOTECAS (7 slots de plantilla → 7 reales del agente) ──
  {
    mode: 'rename', oldSlug: 'discoteca-eclipse', source: 'agente',
    name: 'Discoteca Donato', slug: 'discoteca-donato', cat: 'discoteca',
    zone: 'Av. Boyacá, Los Teques', address: 'Av. Boyacá, Edif. Parayauta, Los Teques',
    ig: 'donato_disco', lat: 10.3501, lng: -66.8359,
    hours: { open: '19:00', close: '03:00', closedDays: [] },
    description: 'Discoteca sobre la avenida Boyacá, en pleno centro de Los Teques. Pista, sonido y ambiente de club nocturno para la rumba tequeña, abierta dentro del horario oficial del municipio.',
    specialty: 'Noches de rumba en el centro', valueProposition: 'El punto de encuentro nocturno de la avenida Boyacá: música alta, ambiente de club y salida directa al corazón de Los Teques.',
  },
  {
    mode: 'rename', oldSlug: 'discoteca-estelar', source: 'agente',
    name: 'Discoteca Medusa', slug: 'discoteca-medusa', cat: 'discoteca',
    zone: 'CC La Matica, Los Teques', address: 'CC La Matica, Km 25, Los Teques',
    ig: 'medusa.officcial', lat: 10.337378, lng: -67.0394874, // pin real Google Maps 2026-09
    hours: { open: '19:00', close: '03:00', closedDays: [] },
    description: 'Discoteca en el centro comercial La Matica, uno de los puntos de rumba más comentados de Los Teques. Música, luces y ambiente de club nocturno hasta el cierre oficial.',
    specialty: 'Rumba en CC La Matica', valueProposition: 'Discoteca de referencia en la zona de La Matica, con ambiente de club y programación nocturna activa en redes.',
  },
  {
    mode: 'rename', oldSlug: 'discoteca-glamour', source: 'agente',
    name: 'Disco El Emperador', slug: 'disco-el-emperador', cat: 'discoteca',
    zone: 'Carrizal', address: 'CC La Cascada, Local NT-14, Carrizal',
    ig: 'discoelemperador', lat: 10.3493, lng: -66.9921,
    hours: { open: '19:00', close: '03:00', closedDays: [] },
    description: 'Discoteca en el centro comercial La Cascada de Carrizal, destino nocturno de los Altos Mirandinos. Pista de baile y ambiente de club dentro del horario oficial de discotecas.',
    specialty: 'Disco en CC La Cascada', valueProposition: 'La opción de rumba de Carrizal: discoteca instalada en un centro comercial, con acceso directo y horario nocturno completo.',
  },
  {
    mode: 'rename', oldSlug: 'discoteca-la-luna', source: 'agente',
    name: 'Discoteca Koko Frappe', slug: 'discoteca-koko-frappe', cat: 'discoteca',
    zone: 'Av. Víctor Baptista, Los Teques', address: 'Av. Víctor Baptista, Los Teques',
    lat: 10.3494, lng: -66.8394,
    hours: { open: '19:00', close: '03:00', closedDays: [] },
    description: 'Discoteca en la avenida Víctor Baptista de Los Teques, con teléfono de contacto y presencia en directorios locales. Ambiente nocturno dentro del horario oficial del municipio.',
    specialty: 'Nocturno en Av. Víctor Baptista', valueProposition: 'Discoteca de contacto directo por teléfono en una de las avenidas de mayor movimiento nocturno de Los Teques.',
  },
  {
    mode: 'rename', oldSlug: 'discoteca-noche-eterna', source: 'agente',
    name: 'New Copacabana', slug: 'new-copacabana', cat: 'discoteca',
    zone: 'Centro, Los Teques', address: 'Sector Centro, Los Teques',
    lat: 10.3436, lng: -66.8330,
    hours: { open: '19:00', close: '03:00', closedDays: [] },
    description: 'Clásico de la noche tequeña en el sector centro. Discoteca con pista y barra, revalidada por la escena local de rumba como punto recurrente de las salidas en Los Teques.',
    specialty: 'Clásico nocturno del centro', valueProposition: 'Trayectoria en la rumba tequeña: un salón que sigue activo en el circuito de discotecas del centro de Los Teques.',
  },
  {
    mode: 'rename', oldSlug: 'discoteca-royal', source: 'agente',
    name: 'Club Centro de Amigos', slug: 'club-centro-de-amigos', cat: 'discoteca',
    zone: 'Centro, Los Teques', address: 'Sector Centro, Los Teques',
    lat: 10.3457, lng: -66.8365,
    hours: { open: '19:00', close: '03:00', closedDays: [] },
    description: 'Club nocturno con salón de baile (Salón Cacao) en el centro de Los Teques. Espacio de baile social y eventos dentro del horario oficial de discotecas y salones del municipio.',
    specialty: 'Salón de baile Cacao', valueProposition: 'Salón de baile tradicional para quienes buscan música bailable y eventos de club en el centro de Los Teques.',
  },
  {
    mode: 'rename', oldSlug: 'discoteca-vibra', source: 'agente',
    name: 'Evolution Bar & Restaurant', slug: 'evolution-bar-restaurant', cat: 'discoteca',
    zone: 'Las Minas, San Antonio de Los Altos', address: 'Zona Industrial Las Minas, San Antonio de Los Altos',
    lat: 10.3841, lng: -66.9438,
    hours: { open: '19:00', close: '03:00', closedDays: [] },
    description: 'Bar, restaurante y ambiente de disco en la zona industrial Las Minas de San Antonio de Los Altos. Propuesta mixta de cocina y rumba dentro del horario nocturno oficial.',
    specialty: 'Bar-restaurante con ambiente de disco', valueProposition: 'Combina carta de restaurante y ambiente nocturno en San Antonio: cena y rumba en un mismo lugar.',
  },

  // ── LICOBARES (JJ se conserva; 5 slots renombrados) ──
  {
    mode: 'rename', oldSlug: 'licobar-dona-rosa', source: 'agente',
    name: 'Jungla Bar', slug: 'jungla-bar', cat: 'licobar',
    zone: 'Los Teques', address: 'Los Teques, municipio Guaicaipuro',
    lat: 10.3422, lng: -66.8372,
    hours: { open: '11:00', close: '23:59', closedDays: [] },
    description: 'Bar de ambiente relajado en Los Teques, activo de jueves a domingo en el circuito de rumba local. Expendio de licores y consumo en el sitio dentro del horario oficial de licobares.',
    specialty: 'Bar de ambiente jungle', valueProposition: 'Bar con presencia activa en redes y horario extendido de fin de semana, dentro del circuito nocturno tequeño.',
  },
  {
    mode: 'rename', oldSlug: 'licobar-el-barrilito', source: 'agente',
    name: 'Bodegón El Toro', slug: 'bodegon-el-toro', cat: 'licobar',
    zone: 'Km 26, Los Teques', address: 'Carretera Panamericana, Km 26, Los Teques',
    phone: 'N/A', lat: 10.3311, lng: -67.0411, // pin real Google Maps 2026-09
    hours: { open: '11:00', close: '23:59', closedDays: [] },
    description: 'Bodegón con terraza en el Km 26 de la carretera Panamericana. Mixto: expendio de envase cerrado y consumo en el sitio, con el ambiente de bodegón que caracteriza la salida tequeña.',
    specialty: 'Terraza de bodegón Km 26', valueProposition: 'Terraza de bodegón en la Panamericana para el trago de la tarde-noche, con venta al detal y consumo en el lugar.',
  },
  {
    mode: 'rename', oldSlug: 'licobar-el-botellon', source: 'agente',
    name: 'Café Racer Bar', slug: 'cafe-racer-bar', cat: 'licobar',
    zone: 'Las Minas, San Antonio de Los Altos', address: 'Zona Industrial Las Minas, San Antonio de Los Altos',
    phone: 'N/A', lat: 10.3832, lng: -66.9451,
    hours: { open: '11:00', close: '23:59', closedDays: [] },
    description: 'Bar de ambiente motorizado en la zona industrial Las Minas de San Antonio de Los Altos. Muy bien documentado en directorios locales, con consumo en el sitio y ambiente casual.',
    specialty: 'Bar de ambiente motorizado', valueProposition: 'El bar de referencia de la zona Las Minas: ambiente casual, bien ubicado y con datos de contacto verificables.',
  },
  {
    mode: 'rename', oldSlug: 'licobar-el-tequeno', source: 'usuario',
    name: 'Mercaplus La Fortaleza', slug: 'mercaplus-la-fortaleza', cat: 'licobar',
    zone: 'Camatagua, Los Teques', address: 'Av. Bertorelli Cisneros, Sector Camatagua, Los Teques',
    ig: 'mercapluslafortaleza', lat: 10.332984, lng: -67.0424898, // pin real Google Maps 2026-09
    hours: { open: '11:00', close: '01:00', closedDays: [0] },
    description: 'Bodegón con modalidad mixta de expendio y consumo en la avenida Bertorelli Cisneros, sector Camatagua. Abre de lunes a sábado hasta la 1:00 a.m., de los más extensos del municipio.',
    specialty: 'Bodegón mixto hasta la 1:00 a.m.', valueProposition: 'Expendio de licor y consumo en el sitio con el horario más extendido de la zona Camatagua, según datos verificados en Google Maps.',
  },
  {
    mode: 'rename', oldSlug: 'licobar-la-esquina-del-frio', source: 'agente',
    name: 'La Estación de la Birra y el Licor', slug: 'la-estacion-de-la-birra', cat: 'licobar',
    zone: 'Los Teques', address: 'Los Teques, municipio Guaicaipuro',
    lat: 10.3338621, lng: -67.04263, // pin real Google Maps 2026-09
    hours: { open: '11:00', close: '23:59', closedDays: [] },
    description: 'Estación de cerveza y licores en Los Teques con opción de consumo en el sitio. Comercio mixto dentro del horario oficial de licobares del municipio Guaicaipuro.',
    specialty: 'Cerveza y licores al detalle', valueProposition: 'Estación especializada en birra y licor: compra tu envase o tómatelo en el sitio, en pleno Los Teques.',
  },

  // ── LICORERÍAS (Don Sancho se conserva; 6 slots renombrados con datos del usuario) ──
  {
    mode: 'rename', oldSlug: 'licoreria-central', source: 'usuario',
    name: 'Bodegón Naikel', slug: 'bodegon-naikel', cat: 'licoreria',
    zone: 'Centro, Los Teques', address: 'CC Ambrosi, Calle Boyacá, Sector Centro, Los Teques',
    phone: '+58 412-7320080', ig: 'bodegonnaikel', lat: 10.3462, lng: -66.8310,
    hours: { open: '09:00', close: '20:00', closedDays: [0] },
    description: 'Bodegón-licorería en el centro comercial Ambrosi, sobre la calle Boyacá del centro de Los Teques. Licores y envases cerrados de lunes a sábado, con contacto directo por teléfono e Instagram.',
    specialty: 'Bodegón en CC Ambrosi', valueProposition: 'Ubicación de centro comercial en la Boyacá con horario matinal extendido: licorería de paso fácil en el centro tequeño.',
  },
  {
    mode: 'rename', oldSlug: 'licoreria-la-botella', source: 'usuario',
    name: 'Licorería La Botella de Oro C.A.', slug: 'licoreria-la-botella-de-oro', cat: 'licoreria',
    zone: 'El Llano, Los Teques', address: 'Calle Arismendi, Local N° 6, Sector El Llano, Los Teques',
    phone: '+58 212-3281919', lat: 10.3410, lng: -66.8415,
    hours: { open: '10:00', close: '20:30', closedDays: [0] },
    description: 'Licorería formalmente constituida en la calle Arismendi, sector El Llano de Los Teques. Expendio de envase cerrado de lunes a sábado, con línea telefónica local (0212) de contacto.',
    specialty: 'Licorería de El Llano', valueProposition: 'Razón social registrada y teléfono fijo de contacto: una licorería estable y formal del sector El Llano.',
  },
  {
    mode: 'rename', oldSlug: 'licoreria-oro-negro', source: 'usuario',
    name: 'Bodegón Bravamar', slug: 'bodegon-bravamar', cat: 'licoreria',
    zone: 'Centro, Los Teques', address: 'Calle Ribas, Edif. Centro, al lado del CC, Los Teques',
    phone: '+58 424-7398291', ig: 'bodegonbravamar', lat: 10.3451, lng: -66.8338,
    hours: { open: '08:00', close: '20:00', closedDays: [0] },
    description: 'Bodegón en la calle Ribas, edificio Centro, al lado del centro comercial de Los Teques. Abre desde las 8:00 a.m. de lunes a sábado, con contacto por teléfono e Instagram.',
    specialty: 'Bodegón de la calle Ribas', valueProposition: 'El bodegón que abre más temprano del centro tequeño, con contacto directo por WhatsApp e Instagram verificado.',
  },
  {
    mode: 'rename', oldSlug: 'licoreria-premium-select', source: 'usuario',
    name: 'Licorería MIS AMORES', slug: 'licoreria-mis-amores', cat: 'licoreria',
    zone: 'El Llano, Los Teques', address: 'Calle 80 Livia, Sector El Llano y cercanías, Los Teques',
    phone: '+58 414-2168351', lat: 10.3402, lng: -66.8441,
    hours: { open: '11:00', close: '21:00', closedDays: [0] },
    description: 'Licorería de la calle 80 Livia, en el sector El Llano y alrededores de Los Teques. Expendio de envase cerrado hasta las 9:00 p.m. de lunes a sábado, con teléfono de contacto directo.',
    specialty: 'Licorería de El Llano/Livia', valueProposition: 'Cierre a las 9:00 p.m. (de los más tardíos del sector) y teléfono de contacto directo para pedidos y reservas de envase.',
  },
  {
    mode: 'rename', oldSlug: 'licoreria-selecta', source: 'usuario',
    name: 'Licorería El Barbecho', slug: 'licoreria-el-barbecho', cat: 'licoreria',
    zone: 'Urb. El Barbecho, Los Teques', address: 'Calle Acueducto, Urbanización El Barbecho, Los Teques',
    lat: 10.3518, lng: -66.8389,
    hours: { open: '11:00', close: '20:30', closedDays: [0] },
    description: 'Licorería de la calle Acueducto en la urbanización El Barbecho de Los Teques, confirmada tanto en Google Maps como en directorios web de la zona. Expendio de envase cerrado de lunes a sábado.',
    specialty: 'Licorería de Urb. El Barbecho', valueProposition: 'Doble verificación (Maps + directorios web) y plus code conocido: la licorería de referencia de la urbanización El Barbecho.',
  },
  {
    mode: 'rename', oldSlug: 'licoreria-vinos-del-valle', source: 'usuario',
    name: 'Licorería Cúrametono', slug: 'licoreria-curametono', cat: 'licoreria',
    zone: 'Casco Central, Los Teques', address: 'Casco Central, Los Teques',
    lat: 10.3447, lng: -66.8342,
    hours: { open: '11:00', close: '21:00', closedDays: [0] },
    description: 'Licorería del casco central de Los Teques, con horario de lunes a sábado hasta las 9:00 p.m. Expendio de envase cerrado en el corazón histórico y comercial de la ciudad.',
    specialty: 'Licorería del casco central', valueProposition: 'Cierre a las 9:00 p.m. en el casco central: la última parada de envase cerrado antes de la salida nocturna.',
  },
  {
    mode: 'rename', oldSlug: 'licobar-la-terraza', source: 'usuario',
    name: 'Bodegón Bicentenario', slug: 'bodegon-bicentenario', cat: 'licoreria',
    zone: 'El Rincón, Los Teques', address: 'Av. Juan Germán Roscio, frente al sector El Rincón, Los Teques',
    phone: '+58 212-3225443', lat: 10.3352, lng: -66.8478,
    hours: { open: '09:00', close: '20:00', closedDays: [0] },
    description: 'Bodegón sobre la avenida Juan Germán Roscio, frente al sector El Rincón de Los Teques. Abre a las 9:00 a.m. de lunes a sábado, con línea telefónica local de contacto.',
    specialty: 'Bodegón de Av. Roscio', valueProposition: 'Ubicación sobre la avenida principal con teléfono fijo de contacto y horario matinal temprano.',
  },

  // ── TASCAS (Africa Burguers se conserva; 6 slots renombrados) ──
  {
    mode: 'rename', oldSlug: 'tasca-el-rincon', source: 'agente',
    name: 'Scandalo Gastrobar', slug: 'scandalo-gastrobar', cat: 'tasca',
    zone: 'Galerías Las Américas, San Antonio de Los Altos', address: 'Galerías Las Américas, San Antonio de Los Altos',
    phone: 'N/A', ig: 'scandalogastrobar', lat: 10.3902, lng: -66.9499,
    hours: { open: '11:00', close: '01:00', closedDays: [] },
    description: 'Gastrobar en el centro comercial Galerías Las Américas de San Antonio de Los Altos, con presencia en guías gastronómicas nacionales e Instagram activo. Cocina y barra en ambiente de tasca moderna.',
    specialty: 'Gastrobar de Galerías Las Américas', valueProposition: 'La propuesta gastrobar mejor documentada de San Antonio: carta de cocina, barra y ubicación comercial premium.',
  },
  {
    mode: 'rename', oldSlug: 'tasca-el-sabor', source: 'agente',
    name: 'Daws Lounge & Delicious Food', slug: 'daws-lounge', cat: 'tasca',
    zone: 'Km 13, San Antonio de Los Altos', address: 'Carretera Panamericana, Km 13, San Antonio de Los Altos',
    ig: 'dawscasualfood', lat: 10.3912, lng: -66.9548,
    hours: { open: '11:00', close: '01:00', closedDays: [] },
    description: 'Lounge con cocina en el Km 13 de la Panamericana, San Antonio de Los Altos. Propuesta casual-food con ambiente lounge, reseña en TripAdvisor e Instagram activo.',
    specialty: 'Lounge con cocina casual', valueProposition: 'Lounge de carretera con cocina cuidada: el plan de comida + trago en la entrada de San Antonio de Los Altos.',
  },
  {
    mode: 'rename', oldSlug: 'tasca-la-cava', source: 'agente',
    name: 'Pasatiempos Grill', slug: 'pasatiempos-grill', cat: 'tasca',
    zone: 'Vía San Diego, Carrizal', address: 'Vía San Diego, Carrizal',
    phone: 'N/A', ig: 'pasatiemposgrill', lat: 10.3467, lng: -66.9851,
    hours: { open: '11:00', close: '01:00', closedDays: [] },
    description: 'Grill y bar en la vía San Diego de Carrizal, con carta de parrilla, Instagram activo y presencia en guías gastronómicas. Plan de comida y ambiente dentro del horario oficial de bares.',
    specialty: 'Parrilla y bar en Carrizal', valueProposition: 'Grill consolidado de Carrizal con barra completa: comida al carbón y ambiente de tasca en los Altos Mirandinos.',
  },
  {
    mode: 'rename', oldSlug: 'tasca-la-esquina', source: 'agente',
    name: 'La Casita de Maikel', slug: 'la-casita-de-maikel', cat: 'tasca',
    zone: 'Laguneta de la Montaña, Los Teques', address: 'Laguneta de la Montaña, Los Teques',
    lat: 10.3267369, lng: -67.1443813, // pin real Google Maps 2026-09-11
    hours: { open: '11:00', close: '01:00', closedDays: [] },
    description: 'Tasca-restaurante en la zona de Laguneta de la Montaña, Los Teques, con reseña en TripAdvisor y presencia en directorios. Ambiente de casita para comer y brindar fuera del bullicio del centro.',
    specialty: 'Tasca de Laguneta', valueProposition: 'El punto de comida y trago de Laguneta de la Montaña, recomendado en TripAdvisor por su ambiente acogedor.',
  },
  {
    mode: 'rename', oldSlug: 'tasca-la-parrilla', source: 'agente',
    name: 'Ranch Grill', slug: 'ranch-grill', cat: 'tasca',
    zone: 'Km 23, Los Cerritos, Los Teques', address: 'Carretera Panamericana, Km 23, Los Cerritos, Los Teques',
    lat: 10.347115, lng: -67.019501, // pin real Google Maps 2026-09
    hours: { open: '11:00', close: '01:00', closedDays: [] },
    description: 'Grill sobre la carretera Panamericana en el Km 23, sector Los Cerritos de Los Teques. Propuesta de parrilla y barra para el plan de carretera dentro del municipio Guaicaipuro.',
    specialty: 'Grill de carretera Km 23', valueProposition: 'Parrilla de carretera en Los Cerritos: parada de comida y trago en el corredor Panamericano sur de Los Teques.',
  },
  {
    mode: 'rename', oldSlug: 'tasca-los-amigos', source: 'usuario',
    name: 'Tasca Restaurante La Villa de San Pedro', slug: 'tasca-san-pedro', cat: 'tasca',
    zone: 'San Pedro de los Altos', address: '9W78+WGQ, Vía Principal de San Pedro, 1201, Miranda',
    lat: 10.3648294, lng: -67.0836514, // pin real Google Maps 2026-09-11
    hours: { open: '11:00', close: '20:00', closedDays: [0] },
    description: 'Tasca-bodegón en la calle principal del pueblo de San Pedro de los Altos, parroquia del municipio Guaicaipuro. Mixto de expendio y comida, con el horario tranquilo de pueblo de montaña.',
    specialty: 'Tasca-bodegón de pueblo', valueProposition: 'El punto de encuentro de San Pedro de los Altos: bodegón y tasca en la calle principal del pueblo.',
  },

  // ── NUEVOS NEGOCIOS (5 licorerías del usuario que no caben en slots) ──
  {
    mode: 'create', source: 'usuario',
    name: 'El Llanero', slug: 'el-llanero', cat: 'licoreria',
    zone: 'Centro, Los Teques', address: 'Calle El Carmen, Sector Centro, Los Teques',
    lat: 10.3438, lng: -66.8352,
    hours: { open: '10:00', close: '20:30', closedDays: [0] },
    description: 'Licorería de la calle El Carmen, en el sector centro de Los Teques. Expendio de envase cerrado de lunes a sábado, con horario matinal de 10:00 a.m. para la compra del momento.',
    specialty: 'Licorería de Calle El Carmen', valueProposition: 'Licorería céntrica sin intermediarios: calle El Carmen, abre a las 10:00 a.m. y cierra a las 8:30 p.m.',
  },
  {
    mode: 'create', source: 'usuario',
    name: 'Bodegón Panamericana', slug: 'bodegon-panamericana', cat: 'licoreria',
    zone: 'Carretera Panamericana, Los Teques', address: 'Carretera Panamericana, tramo urbano, Los Teques',
    lat: 10.3308, lng: -66.8552,
    hours: { open: '10:00', close: '20:30', closedDays: [0] },
    description: 'Bodegón sobre el tramo urbano de la carretera Panamericana en Los Teques. Expendio de envase cerrado de lunes a sábado, en el corredor de mayor tráfico vehicular de la ciudad.',
    specialty: 'Bodegón de la Panamericana', valueProposition: 'Compra de envase cerrado sin salir del corredor Panamericano, con horario amplio de lunes a sábado.',
  },
  {
    mode: 'create', source: 'usuario',
    name: 'Licorería La Macarena', slug: 'licoreria-la-macarena', cat: 'licoreria',
    zone: 'Sector La Macarena, Los Teques', address: 'Carretera Panamericana, Sector La Macarena, Los Teques',
    lat: 10.3289, lng: -66.8589,
    hours: { open: '10:30', close: '20:30', closedDays: [0] },
    description: 'Licorería en el sector que lleva su nombre, sobre la carretera Panamericana de Los Teques. Expendio de envase cerrado de lunes a sábado con apertura a las 10:30 a.m.',
    specialty: 'Licorería del sector La Macarena', valueProposition: 'Licorería de barrio sobre la Panamericana con horario estable de 10:30 a.m. a 8:30 p.m.',
  },
  {
    mode: 'create', source: 'usuario',
    name: 'Licorería La Llovizna', slug: 'licoreria-la-llovizna', cat: 'licoreria',
    zone: 'Vía Lagunetica, Los Teques', address: 'Carretera Los Teques - Lagunetica, Sector La Llovizna, Los Teques',
    lat: 10.3364, lng: -66.8731,
    hours: { open: '10:00', close: '20:30', closedDays: [0] },
    description: 'Licorería en el sector La Llovizna, sobre la carretera Los Teques - Lagunetica. Expendio de envase cerrado de lunes a sábado para la zona este de la ciudad.',
    specialty: 'Licorería vía Lagunetica', valueProposition: 'La licorería del corredor Lagunetica: envase cerrado de lunes a sábado en la zona este de Los Teques.',
  },
  {
    mode: 'create', source: 'usuario',
    name: 'Licorería Chuky', slug: 'licoreria-chuky', cat: 'licoreria',
    zone: 'Av. Víctor Baptista, Los Teques', address: 'Av. Víctor Baptista, Los Teques',
    lat: 10.3489, lng: -66.8401,
    hours: { open: '11:00', close: '21:00', closedDays: [0] },
    description: 'Licorería sobre la avenida Víctor Baptista de Los Teques, en pleno corredor comercial y nocturno de la ciudad. Expendio de envase cerrado de lunes a sábado hasta las 9:00 p.m.',
    specialty: 'Licorería de Av. Víctor Baptista', valueProposition: 'Envase cerrado hasta las 9:00 p.m. sobre la avenida de la rumba tequeña, misma zona de las discotecas.',
  },
];
