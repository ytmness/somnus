// Configuración con 162 mesas VIP en formato 9x18 según el nuevo plano
// 9 filas × 18 columnas = 162 mesas
// Basado en coordenadas reales del image-map

export interface IndividualTable {
  id: string;
  number: number;
  row: number; // Fila (1-9)
  column: number; // Columna (1-18)
  x: number;
  y: number;
  width: number;
  height: number;
  price: number;
  seatsPerTable: 4;
  status: "available" | "reserved" | "sold";
  reservedBy?: string;
}

// Generar las 162 mesas en formato 9x18 según el plano real
function generateVIPTables9x18(): IndividualTable[] {
  const tables: IndividualTable[] = [];
  const ROWS = 9; // 9 filas (se agregó 1 fila extra)
  const COLS = 18; // 18 columnas
  
  // Coordenadas reales desde image-map.net
  // Mesa 1 (fila 1, col 1): (924, 291, radio 26) = esquina superior izquierda
  // Mesa 9 (fila 9, col 1): (924, 699, radio 29) = esquina inferior izquierda  
  // Mesa 19 (fila 1, col 19): (1796, 293, radio 27) = esquina superior derecha
  // Mesa 171 (fila 9, col 19): (1794, 699, radio 27) = esquina inferior derecha
  
  const START_X = 924; // X inicial (esquina izquierda)
  const START_Y = 291; // Y inicial (fila 1)
  const END_X = 1794; // X final (esquina derecha, ajustado)
  const END_Y = 699; // Y final (fila 9)
  
  // Calcular espaciado basado en las coordenadas reales
  const TOTAL_WIDTH = END_X - START_X; // 870px de ancho total
  const TOTAL_HEIGHT = END_Y - START_Y; // 408px de alto total
  
  // Espaciado entre centros de mesas
  const SPACING_X = TOTAL_WIDTH / (COLS - 1); // ~51px entre centros
  const SPACING_Y = TOTAL_HEIGHT / (ROWS - 1); // ~51px entre centros
  
  // Tamaño de mesa (radio aproximado 27px = diámetro ~54px)
  const TABLE_SIZE = 52; // Radio promedio de 26px = diámetro ~52px
  
  let tableNumber = 1;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      // Calcular centro de la mesa
      const centerX = START_X + col * SPACING_X;
      const centerY = START_Y + row * SPACING_Y;
      
      // Convertir a esquina superior izquierda para SVG rect
      const x = centerX - TABLE_SIZE / 2;
      const y = centerY - TABLE_SIZE / 2;

      tables.push({
        id: `mesa-${tableNumber}`,
        number: tableNumber,
        row: row + 1,
        column: col + 1,
        x,
        y,
        width: TABLE_SIZE,
        height: TABLE_SIZE,
        price: 2500,
        seatsPerTable: 4,
        status: "available",
      });

      tableNumber++;
    }
  }

  return tables;
}

// Generar todas las mesas
export const VIP_TABLES_162 = generateVIPTables9x18();

// Zonas de mesas por fila (9 filas)
export const TABLE_ZONES_162 = {
  front: {
    name: "Zona Frontal",
    description: "Vista directa al escenario",
    tables: VIP_TABLES_162.filter((t) => t.row <= 3), // Filas 1-3 (54 mesas)
    color: "#c4a905",
  },
  middle: {
    name: "Zona Media",
    description: "Excelente vista",
    tables: VIP_TABLES_162.filter((t) => t.row > 3 && t.row <= 6), // Filas 4-6 (54 mesas)
    color: "#d4b815",
  },
  back: {
    name: "Zona Trasera",
    description: "Vista completa",
    tables: VIP_TABLES_162.filter((t) => t.row > 6), // Filas 7-9 (54 mesas)
    color: "#e4c825",
  },
};

// Secciones no-VIP según el plano (usando coordenadas del image-map)
export const NON_VIP_SECTIONS_162 = [
  {
    id: "general",
    name: "GENERAL",
    type: "GENERAL" as const,
    price: 500,
    capacity: 1000,
    sold: 0,
    color: "#8B7355",
    description: "Zona general de pie",
    // Coordenadas del image-map: (1859, 1486, 859, 952) = rect
    x: 859,
    y: 952,
    width: 1859 - 859, // 1000px
    height: 1486 - 952, // 534px
  },
  {
    id: "preferente-a",
    name: "PREFERENTE A",
    type: "PREFERENTE" as const,
    price: 800,
    capacity: 300,
    sold: 0,
    color: "#C5A059",
    description: "Zona preferente izquierda",
    // Coordenadas del image-map: (859, 754, 1342, 905) = rect
    x: 859,
    y: 754,
    width: 1342 - 859, // 483px
    height: 905 - 754, // 151px
  },
  {
    id: "preferente-b",
    name: "PREFERENTE B",
    type: "PREFERENTE" as const,
    price: 800,
    capacity: 300,
    sold: 0,
    color: "#C5A059",
    description: "Zona preferente derecha",
    // Coordenadas del image-map: (1861, 908, 1375, 756) = rect
    // (x1, y1, x2, y2) format
    x: 1375,
    y: 756,
    width: 1861 - 1375, // 486px
    height: 908 - 756, // 152px
  },
  {
    id: "tarima",
    name: "TARIMA",
    type: "PROTECCION" as const,
    price: 0,
    capacity: 0,
    sold: 0,
    color: "#4A4A4A",
    description: "Escenario / Tarima",
    // Estimado (parte superior del mapa)
    x: 680,
    y: 50,
    width: 800,
    height: 200,
  },
];

// Configuración del viewport SVG basada en la imagen real
export const SVG_VIEWPORT_162 = {
  width: 2720, // Ancho de PATRIOTASDORADO.png
  height: 1800, // Alto aproximado para incluir todo
  viewBox: "0 0 2720 1800",
};

