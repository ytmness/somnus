"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Info } from "lucide-react";
import {
  VIP_TABLES,
  TABLE_ZONES,
  NON_VIP_SECTIONS,
  IndividualTable,
  getTableStats,
} from "@/lib/patriotas-individual-tables";

interface Section {
  id: string;
  name: string;
  type: "GENERAL" | "PREFERENTE" | "PROTECCION";
  price: number;
  capacity: number;
  sold: number;
  color: string;
  description: string;
}

interface IndividualTablesMapProps {
  eventName: string;
  eventDate: string;
  tables?: IndividualTable[]; // Mesas con estado desde BD
  sections?: Section[]; // Secciones desde BD
  onSelectTable: (table: IndividualTable) => void;
  onSelectSection?: (section: Section, quantity: number) => void; // Nueva prop para secciones
}

export function IndividualTablesMap({
  eventName,
  eventDate,
  tables = VIP_TABLES, // Usar mesas desde BD o las por defecto
  sections = NON_VIP_SECTIONS, // Usar secciones desde BD o las por defecto
  onSelectTable,
  onSelectSection,
}: IndividualTablesMapProps) {
  const [selectedTable, setSelectedTable] = useState<IndividualTable | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [hoveredTable, setHoveredTable] = useState<number | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState(0.75); // Zoom inicial más pequeño para ver todo mejor
  const [showLegend, setShowLegend] = useState(true);

  const stats = useMemo(() => {
    const available = tables.filter((t) => t.status === "available").length;
    const reserved = tables.filter((t) => t.status === "reserved").length;
    const sold = tables.filter((t) => t.status === "sold").length;
    return {
      total: tables.length,
      available,
      reserved,
      sold,
      occupancyRate: ((reserved + sold) / tables.length) * 100,
      revenue: sold * 2500,
      potentialRevenue: tables.length * 2500,
    };
  }, [tables]);

  const handleTableClick = (table: IndividualTable) => {
    if (table.status !== "available") return;
    setSelectedTable(table);
    setSelectedSection(null);
  };

  const handleSectionClick = (section: Section | undefined) => {
    if (!section) return; // Si no se encuentra la sección, no hacer nada
    if (section.type === "PROTECCION") return; // No clickeable
    const available = section.capacity - section.sold;
    if (available === 0) return;
    setSelectedSection(section);
    setSelectedTable(null);
    setQuantity(1);
  };

  const handleConfirm = () => {
    if (selectedTable) {
      onSelectTable(selectedTable);
      setSelectedTable(null);
    }
  };

  const handleConfirmSection = () => {
    if (selectedSection && onSelectSection) {
      onSelectSection(selectedSection, quantity);
      setSelectedSection(null);
      setQuantity(1);
    }
  };

  const getTableColor = (table: IndividualTable) => {
    if (table.status === "sold") return "#666";
    if (table.status === "reserved") return "#ff9800";
    if (selectedTable?.id === table.id) return "#c4a905";
    if (hoveredTable === table.number) return "#d4b815";

    // Color por zona (8 filas: 1-3 frontal, 4-6 media, 7-8 trasera)
    if (table.row <= 3) return "#c4a905"; // Frontal (filas 1-3) - Oro
    if (table.row <= 6) return "#d4b815"; // Media (filas 4-6) - Oro claro
    return "#e4c825"; // Trasera (filas 7-8) - Amarillo
  };

  const getTableOpacity = (table: IndividualTable) => {
    if (table.status === "sold") return 0.3;
    if (table.status === "reserved") return 0.5;
    if (hoveredTable === table.number || selectedTable?.id === table.id)
      return 1;
    return 0.8;
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{eventName}</h2>
            <p className="text-white/70">{eventDate}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#c4a905]">
                {stats.available}
              </p>
              <p className="text-xs text-white/70">Disponibles</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{stats.sold}</p>
              <p className="text-xs text-white/70">Vendidas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-white/70">Total Mesas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
            className="border-[#c4a905]/50 text-white bg-transparent hover:bg-white/10"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="border-[#c4a905]/50 text-white bg-transparent hover:bg-white/10"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(0.75)}
            className="border-[#c4a905]/50 text-white bg-transparent hover:bg-white/10"
          >
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLegend(!showLegend)}
            className="border-[#c4a905]/50 text-white bg-transparent hover:bg-white/10"
          >
            <Info className="w-4 h-4 mr-2" />
            {showLegend ? "Ocultar" : "Mostrar"} Leyenda
          </Button>
        </div>

        <div className="text-white/70 text-sm">
          Click en una mesa para seleccionar | Zoom: {(zoom * 100).toFixed(0)}%
        </div>
      </div>

      {/* Mapa con scroll */}
      <div className="relative bg-[#2a2c30] rounded-xl border border-[#c4a905]/20 overflow-auto flex items-center justify-center min-h-[500px]">
        <div 
          style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: "center center",
            transition: "transform 0.2s ease"
          }}
          className="w-full"
        >
          <svg
            viewBox="0 0 1000 800"
            className="w-full h-auto"
            style={{ maxWidth: "100%", height: "auto", display: "block" }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* PASILLO IZQUIERDO */}
            <rect x="20" y="30" width="80" height="750" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="5,5" opacity="0.3" />
            <text x="60" y="400" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold" transform="rotate(-90 60 400)">
              PASILLO
            </text>

            {/* PASILLO DERECHO */}
            <rect x="900" y="30" width="80" height="750" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="5,5" opacity="0.3" />
            <text x="940" y="400" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold" transform="rotate(90 940 400)">
              PASILLO
            </text>

            {/* ZONA PROTECCIÓN CIVIL / AMBULANCIAS - Arriba */}
            <rect x="120" y="30" width="760" height="70" fill="#e0e0e0" stroke="#333" strokeWidth="2" />
            <text x="500" y="70" textAnchor="middle" fill="#333" fontSize="16" fontWeight="bold">
              ZONA PROTECCIÓN CIVIL / AMBULANCIAS
            </text>

            {/* GENERAL - Zona amplia (clickeable) */}
            {(() => {
              const generalSection = sections.find(s => s.type === "GENERAL");
              const isSelected = selectedSection?.type === "GENERAL";
              const isHovered = hoveredSection === generalSection?.id;
              return generalSection ? (
                <>
                  <rect 
                    x="120" 
                    y="120" 
                    width="760" 
                    height="260" 
                    fill={isSelected ? "#c4a905" : isHovered ? "#b0b0b0" : generalSection.color || "#95a5a6"} 
                    stroke="#f9fbf6" 
                    strokeWidth={isSelected ? "4" : "3"} 
                    opacity={isHovered || isSelected ? 0.9 : 0.7}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredSection(generalSection.id)}
                    onMouseLeave={() => setHoveredSection(null)}
                    onClick={() => handleSectionClick(generalSection)}
                  />
                  <text x="500" y="250" textAnchor="middle" fill="#fff" fontSize="32" fontWeight="bold" pointerEvents="none">
                    {generalSection.name.toUpperCase()}
                  </text>
                </>
              ) : null;
            })()}

            {/* PREFERENTE - Dividido en A y B si hay múltiples, o una sola si solo hay una */}
            {(() => {
              const preferenteSections = sections.filter(s => s.type === "PREFERENTE");
              const preferenteA = preferenteSections[0];
              const preferenteB = preferenteSections[1];
              
              // Si hay dos secciones PREFERENTE, mostrar A y B
              if (preferenteB) {
                return (
                  <>
                    {/* PREFERENTE A - Izquierda */}
                    <rect 
                      x="120" 
                      y="400" 
                      width="365" 
                      height="80" 
                      fill={selectedSection?.id === preferenteA.id ? "#c4a905" : hoveredSection === preferenteA.id ? "#5a9ff2" : preferenteA.color || "#4a90e2"} 
                      stroke="#f9fbf6" 
                      strokeWidth={selectedSection?.id === preferenteA.id ? "4" : "3"} 
                      opacity={hoveredSection === preferenteA.id || selectedSection?.id === preferenteA.id ? 0.9 : 0.7}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredSection(preferenteA.id)}
                      onMouseLeave={() => setHoveredSection(null)}
                      onClick={() => handleSectionClick(preferenteA)}
                    />
                    <text x="302" y="445" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="bold" pointerEvents="none">
                      {preferenteA.name.toUpperCase()} A
                    </text>

                    {/* PREFERENTE B - Derecha */}
                    <rect 
                      x="515" 
                      y="400" 
                      width="365" 
                      height="80" 
                      fill={selectedSection?.id === preferenteB.id ? "#c4a905" : hoveredSection === preferenteB.id ? "#5a9ff2" : preferenteB.color || "#4a90e2"} 
                      stroke="#f9fbf6" 
                      strokeWidth={selectedSection?.id === preferenteB.id ? "4" : "3"} 
                      opacity={hoveredSection === preferenteB.id || selectedSection?.id === preferenteB.id ? 0.9 : 0.7}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredSection(preferenteB.id)}
                      onMouseLeave={() => setHoveredSection(null)}
                      onClick={() => handleSectionClick(preferenteB)}
                    />
                    <text x="697" y="445" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="bold" pointerEvents="none">
                      {preferenteB.name.toUpperCase()} B
                    </text>
                  </>
                );
              }
              
              // Si solo hay una sección PREFERENTE, mostrar una sola área grande
              if (preferenteA) {
                const isSelected = selectedSection?.id === preferenteA.id;
                const isHovered = hoveredSection === preferenteA.id;
                return (
                  <>
                    <rect 
                      x="120" 
                      y="400" 
                      width="760" 
                      height="80" 
                      fill={isSelected ? "#c4a905" : isHovered ? "#5a9ff2" : preferenteA.color || "#4a90e2"} 
                      stroke="#f9fbf6" 
                      strokeWidth={isSelected ? "4" : "3"} 
                      opacity={isHovered || isSelected ? 0.9 : 0.7}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredSection(preferenteA.id)}
                      onMouseLeave={() => setHoveredSection(null)}
                      onClick={() => handleSectionClick(preferenteA)}
                    />
                    <text x="500" y="445" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="bold" pointerEvents="none">
                      {preferenteA.name.toUpperCase()}
                    </text>
                  </>
                );
              }
              
              return null;
            })()}

            {/* Grid de referencia para mesas (8 filas) - ajustado según nuevo espaciado */}
            {[...Array(9)].map((_, i) => {
              const yPos = 490 + i * 28; // 22 (altura) + 6 (espaciado) = 28
              return (
                <line
                  key={`h-${i}`}
                  x1="100"
                  y1={yPos}
                  x2="900"
                  y2={yPos}
                  stroke="#fff"
                  strokeWidth="0.5"
                  opacity="0.1"
                />
              );
            })}

            {/* Renderizar las mesas */}
            {tables.map((table) => {
              const isHovered = hoveredTable === table.number;
              const isSelected = selectedTable?.number === table.number;
              const isAvailable = table.status === "available";

              return (
                <g key={table.id}>
                  {/* Mesa (rectángulo) */}
                  <rect
                    x={table.x}
                    y={table.y}
                    width={table.width}
                    height={table.height}
                    fill={getTableColor(table)}
                    stroke="#f9fbf6"
                    strokeWidth={isSelected ? "3" : "1.5"}
                    opacity={getTableOpacity(table)}
                    rx="2"
                    className={`transition-all duration-150 ${
                      isAvailable ? "cursor-pointer" : "cursor-not-allowed"
                    }`}
                    onMouseEnter={() => isAvailable && setHoveredTable(table.number)}
                    onMouseLeave={() => setHoveredTable(null)}
                    onClick={() => isAvailable && handleTableClick(table)}
                  />

                  {/* Número de mesa - ajustado para mesas más pequeñas */}
                  <text
                    x={table.x + table.width / 2}
                    y={table.y + table.height / 2 + 3}
                    textAnchor="middle"
                    fill={table.status === "sold" ? "#999" : "#2a2c30"}
                    fontSize="10"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {table.number}
                  </text>

                  {/* Indicador de estado */}
                  {table.status === "sold" && (
                    <text
                      x={table.x + table.width / 2}
                      y={table.y + table.height / 2 + 15}
                      textAnchor="middle"
                      fill="#ff4444"
                      fontSize="8"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      VENDIDA
                    </text>
                  )}
                  {table.status === "reserved" && (
                    <text
                      x={table.x + table.width / 2}
                      y={table.y + table.height / 2 + 15}
                      textAnchor="middle"
                      fill="#ff9800"
                      fontSize="8"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      RESERVADA
                    </text>
                  )}
                </g>
              );
            })}

            {/* Etiquetas de filas (8 filas) - alineadas con el centro de cada fila de mesas */}
            {[...Array(8)].map((_, i) => {
              const yPos = 490 + i * 28 + 11; // Centrado verticalmente en cada fila (22/2 = 11)
              return (
                <text
                  key={`row-${i}`}
                  x="95"
                  y={yPos}
                  textAnchor="end"
                  fill="#fff"
                  fontSize="14"
                  opacity="0.6"
                  fontWeight="500"
                >
                  Fila {i + 1}
                </text>
              );
            })}

            {/* TARIMA - Más abajo, separada de las mesas */}
            <rect x="300" y="710" width="400" height="60" fill="#c4a905" stroke="#f9fbf6" strokeWidth="3" rx="3" />
            <text x="500" y="745" textAnchor="middle" fill="#2a2c30" fontSize="24" fontWeight="bold">
              TARIMA
            </text>

            {/* BACKLINE - Línea detrás de tarima, más separada */}
            <rect x="250" y="775" width="500" height="3" fill="#666" />
            <text x="500" y="790" textAnchor="middle" fill="#999" fontSize="10">
              BACKLINE
            </text>

            {/* BACKSTAGE - Más abajo, bien separado de la tarima */}
            <rect x="350" y="785" width="300" height="50" fill="#666" stroke="#999" strokeWidth="2" rx="2" />
            <text x="500" y="815" textAnchor="middle" fill="#ccc" fontSize="14" fontWeight="bold">
              BACKSTAGE
            </text>
          </svg>
        </div>

        {/* Tooltip hover */}
        {(hoveredTable || hoveredSection) && !selectedTable && !selectedSection && (
          <div className="absolute top-4 right-4 bg-black/95 text-white p-4 rounded-lg shadow-xl border border-[#c4a905]/30 min-w-[220px] pointer-events-none z-10">
            {hoveredTable && (() => {
              const table = tables.find((t) => t.number === hoveredTable);
              if (!table) return null;
              return (
                <div>
                  <h4 className="font-bold text-lg mb-2">Mesa #{table.number}</h4>
                  <p className="text-sm text-white/70 mb-1">
                    Fila {table.row} • Columna {table.column}
                  </p>
                  <p className="text-[#c4a905] text-xl font-bold mb-2">
                    ${table.price.toLocaleString()} MXN
                  </p>
                  <p className="text-sm text-white/80">
                    {table.seatsPerTable} personas por mesa
                  </p>
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <p className="text-xs text-white/60">
                      Estado:{" "}
                      <span
                        className={
                          table.status === "available"
                            ? "text-green-400"
                            : table.status === "reserved"
                            ? "text-orange-400"
                            : "text-red-400"
                        }
                      >
                        {table.status === "available"
                          ? "DISPONIBLE"
                          : table.status === "reserved"
                          ? "RESERVADA"
                          : "VENDIDA"}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })()}
            
            {hoveredSection && (() => {
              const section = sections.find((s) => s.id === hoveredSection);
              if (!section || section.type === "PROTECCION") return null;
              const available = section.capacity - section.sold;
              return (
                <div>
                  <h4 className="font-bold text-lg mb-2">{section.name}</h4>
                  <p className="text-[#c4a905] text-xl font-bold mb-2">
                    ${section.price.toLocaleString()} MXN
                  </p>
                  <p className="text-sm text-white/80 mb-1">
                    {available} disponibles de {section.capacity}
                  </p>
                  <p className="text-xs text-white/60">
                    {section.description}
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Leyenda */}
      {showLegend && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded bg-[#c4a905]" />
            <div>
              <p className="text-white text-sm font-medium">Zona Frontal</p>
              <p className="text-white/60 text-xs">Filas 1-4</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded bg-[#d4b815]" />
            <div>
              <p className="text-white text-sm font-medium">Zona Media</p>
              <p className="text-white/60 text-xs">Filas 5-8</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded bg-[#e4c825]" />
            <div>
              <p className="text-white text-sm font-medium">Zona Trasera</p>
              <p className="text-white/60 text-xs">Filas 9-12</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded bg-[#ff9800] opacity-50" />
            <div>
              <p className="text-white text-sm font-medium">Reservada</p>
              <p className="text-white/60 text-xs">Temporal</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded bg-[#666] opacity-30" />
            <div>
              <p className="text-white text-sm font-medium">Vendida</p>
              <p className="text-white/60 text-xs">No disponible</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#2a2c30] rounded-xl border border-[#c4a905]/30 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                Mesa #{selectedTable.number}
              </h3>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-white/60 text-sm">Ubicación</p>
                  <p className="text-white font-medium">
                    Fila {selectedTable.row}, Col {selectedTable.column}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Capacidad</p>
                  <p className="text-white font-medium">
                    {selectedTable.seatsPerTable} personas
                  </p>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-white/70">Precio por mesa:</span>
                  <span className="text-white font-bold text-xl">
                    ${selectedTable.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-white/70">IVA (16%):</span>
                  <span className="text-white font-bold">
                    ${(selectedTable.price * 0.16).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-white font-bold">Total:</span>
                    <span className="text-[#c4a905] font-bold text-2xl">
                      ${(selectedTable.price * 1.16).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-white/60 text-xs mt-3 text-center">
                * Incluye acceso para {selectedTable.seatsPerTable} personas
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setSelectedTable(null)}
                variant="outline"
                className="flex-1 border-white/30 text-white bg-transparent hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirm} className="flex-1 bg-[#c4a905] text-white hover:bg-[#d4b815]">
                Agregar al Carrito
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para secciones */}
      {selectedSection && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#2a2c30] rounded-xl border border-[#c4a905]/30 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">{selectedSection.name}</h3>
              <button
                onClick={() => setSelectedSection(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-[#c4a905] text-3xl font-bold mb-2">
                ${selectedSection.price.toLocaleString()} MXN
              </p>
              <p className="text-white/70 mb-4">
                {selectedSection.capacity - selectedSection.sold} disponibles de {selectedSection.capacity}
              </p>
              <p className="text-white/60 text-sm mb-4">{selectedSection.description}</p>

              <div className="mb-4">
                <label className="block text-white/90 font-medium mb-3">Cantidad de boletos</label>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    variant="outline"
                    size="icon"
                    className="border-white/30 text-white bg-transparent hover:bg-white/10"
                  >
                    -
                  </Button>
                  <div className="flex-1 text-center">
                    <p className="text-4xl font-bold text-white">{quantity}</p>
                  </div>
                  <Button
                    onClick={() =>
                      setQuantity(Math.min(selectedSection.capacity - selectedSection.sold, quantity + 1))
                    }
                    variant="outline"
                    size="icon"
                    className="border-white/30 text-white bg-transparent hover:bg-white/10 disabled:opacity-50"
                    disabled={quantity >= selectedSection.capacity - selectedSection.sold}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-white/70">Subtotal:</span>
                  <span className="text-white font-bold text-xl">
                    ${(selectedSection.price * quantity).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-white/70">IVA (16%):</span>
                  <span className="text-white font-bold">
                    ${(selectedSection.price * quantity * 0.16).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-white font-bold">Total:</span>
                    <span className="text-[#c4a905] font-bold text-2xl">
                      ${(selectedSection.price * quantity * 1.16).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setSelectedSection(null)}
                variant="outline"
                className="flex-1 border-white/30 text-white bg-transparent hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmSection}
                className="flex-1 bg-[#c4a905] text-white hover:bg-[#d4b815]"
                disabled={!onSelectSection}
              >
                Agregar al Carrito
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


