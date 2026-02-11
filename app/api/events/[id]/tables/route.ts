import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { IndividualTable } from "@/lib/patriotas-individual-tables";

/**
 * GET /api/events/[id]/tables
 * Obtener las mesas de un evento con su estado real desde la BD
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Obtener el evento con TODOS sus ticketTypes (para poder mostrar mejor el error)
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        ticketTypes: true, // Obtener todos los tipos de boletos
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    // Obtener el ticketType de mesas VIP (debe haber uno con isTable=true)
    const tableTicketType = event.ticketTypes.find((tt) => tt.isTable === true);

    if (!tableTicketType) {
      console.error(`[Tables API] Evento ${params.id} no tiene TicketType con isTable=true`);
      console.error(`[Tables API] TicketTypes disponibles:`, event.ticketTypes.map(tt => ({
        id: tt.id,
        name: tt.name,
        isTable: tt.isTable,
        category: tt.category
      })));
      return NextResponse.json(
        { 
          error: "Este evento no tiene mesas configuradas",
          details: "No se encontró un TicketType con isTable=true para este evento",
          availableTicketTypes: event.ticketTypes.map(tt => ({
            id: tt.id,
            name: tt.name,
            isTable: tt.isTable,
            category: tt.category
          }))
        },
        { status: 404 }
      );
    }

    console.log(`[Tables API] TicketType de mesas encontrado:`, {
      id: tableTicketType.id,
      name: tableTicketType.name,
      price: tableTicketType.price,
      maxQuantity: tableTicketType.maxQuantity,
      soldQuantity: tableTicketType.soldQuantity
    });

    // Obtener todos los tickets vendidos para este tipo de boleto
    // Una mesa tiene 4 tickets (uno por asiento), así que necesitamos agrupar por tableNumber
    const soldTickets = await prisma.ticket.findMany({
      where: {
        ticketTypeId: tableTicketType.id,
        status: {
          in: ["VALID", "USED"], // Solo boletos válidos o usados (no cancelados)
        },
        tableNumber: {
          not: null,
        },
        sale: {
          status: "COMPLETED", // Solo ventas completadas
        },
      },
      select: {
        tableNumber: true,
      },
    });

    // Crear un Set de mesas vendidas
    // Agrupar por tableNumber único (una mesa tiene múltiples tickets)
    const soldTableNumbers = new Set<string>();
    const tableNumberSet = new Set<string>();
    
    soldTickets.forEach((ticket) => {
      if (ticket.tableNumber) {
        // Agregar el tableNumber completo al set para evitar duplicados
        tableNumberSet.add(ticket.tableNumber);
      }
    });

    // Extraer números de mesa de cada tableNumber único
    tableNumberSet.forEach((tableNumberStr) => {
      // Extraer número de mesa (ej: "Mesa 100" -> "100", "Mesa 5" -> "5")
      const match = tableNumberStr.match(/\d+/);
      if (match) {
        soldTableNumbers.add(match[0]);
      }
    });

    console.log(`[Tables API] Evento ${params.id}: ${soldTableNumbers.size} mesas vendidas`, Array.from(soldTableNumbers));

    // Generar las 162 mesas base (estructura fija del plano: 9 filas × 18 columnas)
    // Esto debería venir de la configuración del evento, pero por ahora usamos la estructura estándar
    const ROWS = 9;
    const COLS = 18;
    const TABLE_WIDTH = 22;
    const TABLE_HEIGHT = 22;
    const SPACING_X = 6;
    const SPACING_Y = 6;
    const TOTAL_WIDTH = COLS * (TABLE_WIDTH + SPACING_X) - SPACING_X;
    const START_X = 100 + (800 - TOTAL_WIDTH) / 2;
    const START_Y = 490;

    const tables: IndividualTable[] = [];
    let tableNumber = 1;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = START_X + col * (TABLE_WIDTH + SPACING_X);
        const y = START_Y + row * (TABLE_HEIGHT + SPACING_Y);

        const isSold = soldTableNumbers.has(String(tableNumber));

        tables.push({
          id: `mesa-${tableNumber}`,
          number: tableNumber,
          row: row + 1,
          column: col + 1,
          x,
          y,
          width: TABLE_WIDTH,
          height: TABLE_HEIGHT,
          price: Number(tableTicketType.price),
          seatsPerTable: (tableTicketType.seatsPerTable || 4) as 4,
          status: isSold ? "sold" : "available",
        });

        tableNumber++;
      }
    }

    // Obtener secciones (GENERAL, PREFERENTE) desde TicketTypes
    const sectionTicketTypes = event.ticketTypes.filter(
      (tt) => !tt.isTable && (tt.category === "GENERAL" || tt.category === "PREFERENTE")
    );

    // Crear secciones con coordenadas fijas (siempre 3: GENERAL, PREFERENTE A, PREFERENTE B)
    const sections: Array<{
      id: string;
      name: string;
      type: "GENERAL" | "PREFERENTE" | "PROTECCION";
      price: number;
      capacity: number;
      sold: number;
      color: string;
      description: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    // Buscar sección GENERAL en BD
    const generalTicketType = sectionTicketTypes.find(tt => tt.category === "GENERAL");
    if (generalTicketType) {
      sections.push({
        id: generalTicketType.id,
        name: "GENERAL",
        type: "GENERAL",
        price: Number(generalTicketType.price),
        capacity: generalTicketType.maxQuantity,
        sold: generalTicketType.soldQuantity,
        color: "#8B7355",
        description: generalTicketType.description || "Zona general de pie",
        x: 859,
        y: 952,
        width: 1000,
        height: 534,
      });
    }

    // Buscar secciones PREFERENTE A y B en BD (si existen por separado)
    const preferenteA = sectionTicketTypes.find(tt => tt.category === "PREFERENTE" && tt.name.toLowerCase().includes("a"));
    const preferenteB = sectionTicketTypes.find(tt => tt.category === "PREFERENTE" && tt.name.toLowerCase().includes("b"));
    const preferenteGeneric = sectionTicketTypes.find(tt => tt.category === "PREFERENTE" && !tt.name.toLowerCase().includes("a") && !tt.name.toLowerCase().includes("b"));

    // Si existen Preferente A y B por separado, usarlos directamente
    if (preferenteA && preferenteB) {
      sections.push({
        id: preferenteA.id,
        name: "PREFERENTE A",
        type: "PREFERENTE",
        price: Number(preferenteA.price),
        capacity: preferenteA.maxQuantity,
        sold: preferenteA.soldQuantity,
        color: "#C5A059",
        description: "Zona preferente izquierda",
        x: 859,
        y: 754,
        width: 483,
        height: 151,
      });

      sections.push({
        id: preferenteB.id,
        name: "PREFERENTE B",
        type: "PREFERENTE",
        price: Number(preferenteB.price),
        capacity: preferenteB.maxQuantity,
        sold: preferenteB.soldQuantity,
        color: "#C5A059",
        description: "Zona preferente derecha",
        x: 1375,
        y: 756,
        width: 486,
        height: 152,
      });
    } 
    // Si solo existe un "Preferente" genérico, dividirlo en A y B
    else if (preferenteGeneric) {
      sections.push({
        id: `${preferenteGeneric.id}-a`,
        name: "PREFERENTE A",
        type: "PREFERENTE",
        price: Number(preferenteGeneric.price),
        capacity: Math.floor(preferenteGeneric.maxQuantity / 2),
        sold: Math.floor(preferenteGeneric.soldQuantity / 2),
        color: "#C5A059",
        description: "Zona preferente izquierda",
        x: 859,
        y: 754,
        width: 483,
        height: 151,
      });

      sections.push({
        id: `${preferenteGeneric.id}-b`,
        name: "PREFERENTE B",
        type: "PREFERENTE",
        price: Number(preferenteGeneric.price),
        capacity: Math.ceil(preferenteGeneric.maxQuantity / 2),
        sold: Math.ceil(preferenteGeneric.soldQuantity / 2),
        color: "#C5A059",
        description: "Zona preferente derecha",
        x: 1375,
        y: 756,
        width: 486,
        height: 152,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        tables,
        sections,
        ticketType: {
          id: tableTicketType.id,
          name: tableTicketType.name,
          price: Number(tableTicketType.price),
          maxQuantity: tableTicketType.maxQuantity,
          soldQuantity: tableTicketType.soldQuantity,
          seatsPerTable: tableTicketType.seatsPerTable,
        },
      },
    });
  } catch (error) {
    console.error("Get tables error:", error);
    return NextResponse.json(
      { error: "Error al obtener mesas" },
      { status: 500 }
    );
  }
}

