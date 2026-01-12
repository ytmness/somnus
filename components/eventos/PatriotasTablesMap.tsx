"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Info, Move } from "lucide-react";
import Image from "next/image";
import {
  VIP_TABLES_162,
  TABLE_ZONES_162,
  NON_VIP_SECTIONS_162,
  SVG_VIEWPORT_162,
  IndividualTable,
} from "@/lib/patriotas-tables-162";

interface Section {
  id: string;
  name: string;
  type: "GENERAL" | "PREFERENTE" | "PROTECCION";
  price: number;
  capacity: number;
  sold: number;
  color: string;
  description: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface PatriotasTablesMapProps {
  eventName: string;
  eventDate: string;
  tables?: IndividualTable[]; // Mesas con estado desde BD
  sections?: Section[]; // Secciones desde BD
  onSelectTable: (table: IndividualTable) => void;
  onSelectSection?: (section: Section, quantity: number) => void;
}

export function PatriotasTablesMap({
  eventName,
  eventDate,
  tables = VIP_TABLES_162,
  sections = NON_VIP_SECTIONS_162 as Section[],
  onSelectTable,
  onSelectSection,
}: PatriotasTablesMapProps) {
  const [selectedTable, setSelectedTable] = useState<IndividualTable | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [hoveredTable, setHoveredTable] = useState<number | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState(1); // Zoom inicial al 100%
  const [showLegend, setShowLegend] = useState(true);
  
  // Controles de ajuste manual - Valores calibrados para PATRIOTASDORADO.png
  const [debugMode, setDebugMode] = useState(false);
  const [offsetX, setOffsetX] = useState(441);
  const [offsetY, setOffsetY] = useState(-517);
  const [scale, setScale] = useState(1.84);

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
    if (!section) return;
    if (section.type === "PROTECCION") return;
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
    if (selectedTable?.id === table.id) return "#FFD700";
    if (hoveredTable === table.number) return "#FFA500";

    // Color por zona (9 filas: 1-3 frontal, 4-6 media, 7-9 trasera)
    if (table.row <= 3) return "#c4a905"; // Frontal
    if (table.row <= 6) return "#d4b815"; // Media
    return "#e4c825"; // Trasera
  };

  const getTableOpacity = (table: IndividualTable) => {
    if (table.status === "sold") return 0.3;
    if (table.status === "reserved") return 0.5;
    if (hoveredTable === table.number || selectedTable?.id === table.id)
      return 1;
    return 0.9;
  };

  // Manejar zoom con scroll del mouse
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prevZoom) => Math.max(0.3, Math.min(2.5, prevZoom + delta)));
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
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
              <p className="text-xs text-white/70">Total (162)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.min(2.5, zoom + 0.1))}
            className="border-[#c4a905]/50 text-white bg-transparent hover:bg-white/10"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
            className="border-[#c4a905]/50 text-white bg-transparent hover:bg-white/10"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(1)}
            className="border-[#c4a905]/50 text-white bg-transparent hover:bg-white/10"
          >
            Reset (100%)
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDebugMode(!debugMode)}
            className="border-[#c4a905]/50 text-white bg-transparent hover:bg-white/10"
          >
            <Move className="w-4 h-4 mr-2" />
            {debugMode ? "Ocultar" : "Ajustar"} Posición
          </Button>
        </div>

        <div className="text-white/70 text-sm">
          🖱️ Usa la rueda del mouse para zoom | Actual: {(zoom * 100).toFixed(0)}%
        </div>
      </div>

      {/* Panel de ajuste manual */}
      {debugMode && (
        <div className="mb-4 p-4 bg-[#c4a905]/10 border border-[#c4a905]/30 rounded-lg">
          <h3 className="text-white font-bold mb-3">Ajuste Manual de Posición</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-white/70 text-sm block mb-1">Offset X: {offsetX}px</label>
              <input
                type="range"
                min="-1000"
                max="1000"
                value={offsetX}
                onChange={(e) => setOffsetX(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm block mb-1">Offset Y: {offsetY}px</label>
              <input
                type="range"
                min="-1000"
                max="1000"
                value={offsetY}
                onChange={(e) => setOffsetY(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm block mb-1">Escala: {scale.toFixed(2)}</label>
              <input
                type="range"
                min="0.3"
                max="3"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => {
                setOffsetX(441);
                setOffsetY(-517);
                setScale(1.84);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition"
            >
              Resetear a Calibrado
            </button>
            <button
              onClick={() => {
                console.log(`Valores ajustados: offsetX=${offsetX}, offsetY=${offsetY}, scale=${scale}`);
                alert(`Valores guardados en consola:\nOffset X: ${offsetX}\nOffset Y: ${offsetY}\nEscala: ${scale}`);
              }}
              className="px-4 py-2 bg-[#c4a905] hover:bg-[#d4b815] text-white rounded-lg text-sm transition"
            >
              Copiar Valores
            </button>
          </div>
          <div className="mt-2 text-white/60 text-xs">
            💡 Usa estos controles para alinear las mesas con la imagen de fondo. Cuando esté perfecto, haz click en "Copiar Valores"
          </div>
        </div>
      )}

      {/* Mapa con imagen de fondo y overlay SVG */}
      <div 
        className="relative bg-[#1a1a1a] rounded-xl border border-[#c4a905]/20 overflow-auto"
        onWheel={handleWheel}
        style={{ cursor: "grab" }}
      >
        <div 
          style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: "top left",
            transition: "transform 0.2s ease",
            width: `${SVG_VIEWPORT_162.width}px`,
            height: `${SVG_VIEWPORT_162.height}px`,
          }}
          className="relative"
        >
          {/* Imagen de fondo */}
          <Image
            src="/assets/mapa-arena.png"
            alt="Mapa Arena Monterrey"
            width={SVG_VIEWPORT_162.width}
            height={SVG_VIEWPORT_162.height}
            className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
            priority
          />

          {/* Overlay SVG con mesas interactivas */}
          <svg
            viewBox={SVG_VIEWPORT_162.viewBox}
            width={SVG_VIEWPORT_162.width}
            height={SVG_VIEWPORT_162.height}
            className="absolute top-0 left-0 w-full h-full"
            style={{ pointerEvents: "none" }}
          >
            {/* Secciones GENERAL, PREFERENTE A y B - más visibles */}
            <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
              {sections.map((section) => {
                if (!section.x || !section.y || !section.width || !section.height) return null;
                const isSelected = selectedSection?.id === section.id;
                const isHovered = hoveredSection === section.id;
                const isClickable = section.type !== "PROTECCION";

                return (
                  <g key={section.id}>
                    <rect
                      x={section.x}
                      y={section.y}
                      width={section.width}
                      height={section.height}
                      fill={isSelected ? "#FFD700" : isHovered ? "#FFA500" : "#c4a905"}
                      stroke="#FFD700"
                      strokeWidth={isSelected ? 6 : isHovered ? 4 : 2}
                      opacity={isHovered || isSelected ? 0.6 : 0.2}
                      className={isClickable ? "cursor-pointer transition-all" : ""}
                      style={{ pointerEvents: isClickable ? "all" : "none" }}
                      onMouseEnter={() => isClickable && setHoveredSection(section.id)}
                      onMouseLeave={() => isClickable && setHoveredSection(null)}
                      onClick={() => isClickable && handleSectionClick(section)}
                    />
                    {(isHovered || isSelected) && (
                      <text
                        x={section.x + section.width / 2}
                        y={section.y + section.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#fff"
                        fontSize="40"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        {section.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Grupo de mesas con transformación aplicada */}
            <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
              {/* Renderizar las 162 mesas */}
              {tables.map((table) => (
                <g key={table.id}>
                  <circle
                    cx={table.x + table.width / 2}
                    cy={table.y + table.height / 2}
                    r={table.width / 2}
                    fill={getTableColor(table)}
                    stroke="#fff"
                    strokeWidth={selectedTable?.id === table.id ? 4 : 2}
                    opacity={getTableOpacity(table)}
                    className={
                      table.status === "available"
                        ? "cursor-pointer transition-all hover:stroke-[#FFD700] hover:stroke-4"
                        : "cursor-not-allowed"
                    }
                    style={{ pointerEvents: "all" }}
                    onMouseEnter={() => setHoveredTable(table.number)}
                    onMouseLeave={() => setHoveredTable(null)}
                    onClick={() => handleTableClick(table)}
                  />
                  <text
                    x={table.x + table.width / 2}
                    y={table.y + table.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#000"
                    fontSize="14"
                    fontWeight="bold"
                    pointerEvents="none"
                    opacity={getTableOpacity(table) * 1.2}
                  >
                    {table.number}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>

      {/* Leyenda */}
      {showLegend && (
        <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-[#c4a905]/20">
          <h3 className="text-white font-bold mb-3">Leyenda</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#c4a905]"></div>
              <span className="text-white/70 text-sm">Disponible (Frontal)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#d4b815]"></div>
              <span className="text-white/70 text-sm">Disponible (Media)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#e4c825]"></div>
              <span className="text-white/70 text-sm">Disponible (Trasera)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#666]"></div>
              <span className="text-white/70 text-sm">Vendida</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#c4a905]" style={{ opacity: 0.3 }}></div>
              <span className="text-white/70 text-sm">Secciones (hover)</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div className="text-white/60">
              <strong className="text-white">Frontal (1-3):</strong> {TABLE_ZONES_162.front.tables.length} mesas
            </div>
            <div className="text-white/60">
              <strong className="text-white">Media (4-6):</strong> {TABLE_ZONES_162.middle.tables.length} mesas
            </div>
            <div className="text-white/60">
              <strong className="text-white">Trasera (7-9):</strong> {TABLE_ZONES_162.back.tables.length} mesas
            </div>
          </div>
        </div>
      )}

      {/* Panel de selección de mesa */}
      {selectedTable && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#2a2c30] border-2 border-[#c4a905] rounded-lg shadow-2xl p-6 z-50 w-full max-w-md mx-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">
                Mesa #{selectedTable.number}
              </h3>
              <p className="text-white/70 text-sm">
                Fila {selectedTable.row} • Columna {selectedTable.column}
              </p>
              <p className="text-white/60 text-xs mt-1">
                {selectedTable.row <= 3 ? "Zona Frontal" : selectedTable.row <= 6 ? "Zona Media" : "Zona Trasera"}
              </p>
            </div>
            <button
              onClick={() => setSelectedTable(null)}
              className="text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70">Capacidad:</span>
              <span className="text-white font-bold">
                {selectedTable.seatsPerTable} personas
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Precio:</span>
              <span className="text-[#c4a905] font-bold text-2xl">
                ${selectedTable.price.toLocaleString()}
              </span>
            </div>
          </div>

          <Button
            onClick={handleConfirm}
            className="w-full bg-[#c4a905] text-white hover:bg-[#d4b815] h-12 text-lg"
          >
            Agregar al Carrito
          </Button>
        </div>
      )}

      {/* Panel de selección de sección */}
      {selectedSection && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#2a2c30] border-2 border-[#c4a905] rounded-lg shadow-2xl p-6 z-50 w-full max-w-md mx-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">
                {selectedSection.name}
              </h3>
              <p className="text-white/70 text-sm">
                {selectedSection.description}
              </p>
            </div>
            <button
              onClick={() => setSelectedSection(null)}
              className="text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70">Disponibles:</span>
              <span className="text-white font-bold">
                {selectedSection.capacity - selectedSection.sold} de {selectedSection.capacity}
              </span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/70">Precio unitario:</span>
              <span className="text-[#c4a905] font-bold text-xl">
                ${selectedSection.price.toLocaleString()}
              </span>
            </div>

            <div className="mb-4">
              <label className="text-white/70 text-sm block mb-2">
                Cantidad de boletos:
              </label>
              <input
                type="number"
                min="1"
                max={selectedSection.capacity - selectedSection.sold}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(selectedSection.capacity - selectedSection.sold, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#c4a905]"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-white/70">Total:</span>
              <span className="text-[#c4a905] font-bold text-2xl">
                ${(selectedSection.price * quantity).toLocaleString()}
              </span>
            </div>
          </div>

          <Button
            onClick={handleConfirmSection}
            className="w-full bg-[#c4a905] text-white hover:bg-[#d4b815] h-12 text-lg"
          >
            Agregar al Carrito
          </Button>
        </div>
      )}
    </div>
  );
}
