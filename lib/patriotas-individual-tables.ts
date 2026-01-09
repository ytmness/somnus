// Configuración con 144 mesas VIP en formato 8x18 según el plano real
// 8 filas × 18 columnas = 144 mesas

export interface IndividualTable {
  id: string;
  number: number;
  row: number; // Fila (1-8)
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

// Generar las 144 mesas en formato 8x18 según el plano
function generateVIPTables8x18(): IndividualTable[] {
  const tables: IndividualTable[] = [];
  const ROWS = 8; // 8 filas
  const COLS = 18; // 18 columnas
  const TABLE_WIDTH = 22; // Ancho de mesa (más pequeñas para que quepan mejor)
  const TABLE_HEIGHT = 22; // Alto de mesa (cuadradas, más pequeñas)
  const SPACING_X = 6; // Espacio horizontal entre mesas (aumentado)
  const SPACING_Y = 6; // Espacio vertical entre mesas
  
  // Calcular ancho total del grid de mesas
  const TOTAL_WIDTH = COLS * (TABLE_WIDTH + SPACING_X) - SPACING_X;
  // Centrar en el viewBox (1000px de ancho, con pasillos de 100px cada lado = 800px disponible)
  // Pasillo izquierdo (100px) + espacio + mesas centradas
  const START_X = 100 + (800 - TOTAL_WIDTH) / 2; // Centrado en el área disponible
  const START_Y = 490; // Inicio Y (más abajo, después de PREFERENTE A/B que termina en y=480)

  let tableNumber = 1;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = START_X + col * (TABLE_WIDTH + SPACING_X);
      const y = START_Y + row * (TABLE_HEIGHT + SPACING_Y);

      tables.push({
        id: `mesa-${tableNumber}`,
        number: tableNumber,
        row: row + 1,
        column: col + 1,
        x,
        y,
        width: TABLE_WIDTH,
        height: TABLE_HEIGHT,
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
export const VIP_TABLES = generateVIPTables8x18();
export const VIP_TABLES_8x18 = VIP_TABLES; // Alias para compatibilidad

// Zonas de mesas por fila (8 filas)
export const TABLE_ZONES = {
  front: {
    name: "Zona Frontal",
    description: "Vista directa al escenario",
    tables: VIP_TABLES.filter((t) => t.row <= 3), // Filas 1-3 (54 mesas)
    color: "#c4a905",
  },
  middle: {
    name: "Zona Media",
    description: "Excelente vista",
    tables: VIP_TABLES.filter((t) => t.row > 3 && t.row <= 6), // Filas 4-6 (54 mesas)
    color: "#d4b815",
  },
  back: {
    name: "Zona Trasera",
    description: "Vista completa",
    tables: VIP_TABLES.filter((t) => t.row > 6), // Filas 7-8 (36 mesas)
    color: "#e4c825",
  },
};

export const TABLE_ZONES_8x18 = TABLE_ZONES; // Alias para compatibilidad

// Secciones no-VIP según el plano
export const NON_VIP_SECTIONS = [
  {
    id: "proteccion-civil",
    name: "ZONA PROTECCIÓN CIVIL / AMBULANCIAS",
    type: "PROTECCION" as const,
    price: 0,
    capacity: 0,
    sold: 0,
    color: "#e0e0e0",
    description: "Zona de emergencias",
    path: "M 120 30 L 880 30 L 880 100 L 120 100 Z",
  },
  {
    id: "general",
    name: "GENERAL",
    type: "GENERAL" as const,
    price: 850,
    capacity: 1000,
    sold: 0,
    color: "#95a5a6",
    description: "De pie, zona general",
    path: "M 120 120 L 880 120 L 880 380 L 120 380 Z",
  },
  {
    id: "preferente-a",
    name: "PREFERENTE A",
    type: "PREFERENTE" as const,
    price: 1500,
    capacity: 300,
    sold: 0,
    color: "#4a90e2",
    description: "Asientos numerados, lateral izquierdo",
    path: "M 120 400 L 485 400 L 485 480 L 120 480 Z",
  },
  {
    id: "preferente-b",
    name: "PREFERENTE B",
    type: "PREFERENTE" as const,
    price: 1500,
    capacity: 300,
    sold: 0,
    color: "#4a90e2",
    description: "Asientos numerados, lateral derecho",
    path: "M 515 400 L 880 400 L 880 480 L 515 480 Z",
  },
];

// Funciones útiles
export function getTableByNumber(number: number): IndividualTable | undefined {
  return VIP_TABLES.find((t) => t.number === number);
}

export function getAvailableTables(): IndividualTable[] {
  return VIP_TABLES.filter((t) => t.status === "available");
}

export function getTablesByZone(
  zone: "front" | "middle" | "back"
): IndividualTable[] {
  return TABLE_ZONES[zone].tables;
}

export function reserveTable(tableNumber: number, reservedBy: string): boolean {
  const table = getTableByNumber(tableNumber);
  if (!table || table.status !== "available") {
    return false;
  }
  table.status = "reserved";
  table.reservedBy = reservedBy;
  return true;
}

export function markTableAsSold(tableNumber: number, saleId: string): boolean {
  const table = getTableByNumber(tableNumber);
  if (!table || table.status !== "reserved") {
    return false;
  }
  table.status = "sold";
  table.reservedBy = saleId;
  return true;
}

// Estadísticas de mesas
export function getTableStats() {
  const available = VIP_TABLES.filter((t) => t.status === "available").length;
  const reserved = VIP_TABLES.filter((t) => t.status === "reserved").length;
  const sold = VIP_TABLES.filter((t) => t.status === "sold").length;
  const total = VIP_TABLES.length;

  return {
    total,
    available,
    reserved,
    sold,
    occupancyRate: ((reserved + sold) / total) * 100,
    revenue: sold * 2500,
    potentialRevenue: total * 2500,
  };
}

// Configuración completa del evento
export const PATRIOTAS_EVENT_CONFIG = {
  eventName: "Víctor Mendivil en Patriotas",
  eventDate: "24 de Diciembre, 2025",
  eventTime: "21:00 hrs",
  venue: "Estadio Patriotas",
  location: "Zona 1, Colonia El Empleado, 62250 Cuernavaca, Morelos",
  totalCapacity: 144 * 4 + 300 + 300 + 1000, // 2,176 personas
  vipTables: VIP_TABLES,
  sections: NON_VIP_SECTIONS,
};
