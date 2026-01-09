"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/eventos/Header";
import { Button } from "@/components/ui/button";
import { Ticket, Calendar, MapPin, User, ArrowLeft, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface TicketData {
  id: string;
  ticketNumber: string;
  qrCode: string;
  status: string;
  tableNumber: string | null;
  seatNumber: number | null;
  pdfUrl: string | null;
  createdAt: string;
  event: {
    id: string;
    name: string;
    artist: string;
    venue: string;
    eventDate: string;
    eventTime: string;
    imageUrl: string | null;
  };
  ticketType: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  sale: {
    id: string;
    total: number;
    buyerName: string;
    buyerEmail: string;
    createdAt: string;
  };
}

export default function MisBoletosPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setIsLoading(true);
        
        // Verificar sesión
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/mis-boletos/page.tsx:55',message:'Before session check',data:{pathname:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        const sessionResponse = await fetch("/api/auth/session");
        const sessionData = await sessionResponse.json();
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/mis-boletos/page.tsx:59',message:'Session check result in mis-boletos',data:{hasUser:!!sessionData.user,userRole:sessionData.user?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        if (!sessionData.user) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/mis-boletos/page.tsx:62',message:'Redirecting to login - no user',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          toast.error("Debes iniciar sesión");
          router.push("/login");
          return;
        }

        if (sessionData.user.role !== "CLIENTE") {
          toast.error("Esta página es solo para clientes");
          router.push("/");
          return;
        }

        setUser(sessionData.user);

        // Cargar boletos
        const response = await fetch("/api/tickets/my-tickets");
        const data = await response.json();

        if (data.success && data.data) {
          setTickets(data.data.tickets || []);
        } else {
          toast.error(data.error || "Error al cargar boletos");
        }
      } catch (error) {
        console.error("Error al cargar boletos:", error);
        toast.error("Error al cargar tus boletos");
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, [router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VALID":
        return "text-green-400";
      case "USED":
        return "text-yellow-400";
      case "CANCELLED":
        return "text-red-400";
      default:
        return "text-white/70";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "VALID":
        return "Válido";
      case "USED":
        return "Usado";
      case "CANCELLED":
        return "Cancelado";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2a2c30] to-[#49484e]">
        <Header cartItemsCount={0} onCartClick={() => {}} />
        <main className="w-full py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <p className="text-white/70 text-xl">Cargando tus boletos...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a2c30] to-[#49484e]">
      <Header cartItemsCount={0} onCartClick={() => {}} />
      
      <main className="w-full py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="mb-6 border-white/30 text-white bg-transparent hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Eventos
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Mis Boletos
                </h1>
                {user && (
                  <p className="text-white/70">
                    {user.name} • {user.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lista de boletos */}
          {tickets.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 border border-[#c4a905]/20 text-center">
              <Ticket className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                No tienes boletos aún
              </h3>
              <p className="text-white/70 mb-6">
                Compra boletos para tus eventos favoritos
              </p>
              <Button
                onClick={() => router.push("/")}
                className="bg-[#c4a905] text-white hover:bg-[#d4b815]"
              >
                Ver Eventos
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#c4a905]/20"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Imagen del evento */}
                    {ticket.event.imageUrl && (
                      <div className="md:w-48 flex-shrink-0">
                        <img
                          src={ticket.event.imageUrl}
                          alt={ticket.event.name}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Información del boleto */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">
                            {ticket.event.name}
                          </h3>
                          <p className="text-white/70 mb-1">
                            {ticket.event.artist}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            ticket.status
                          )} bg-white/10`}
                        >
                          {getStatusText(ticket.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-white/70">
                          <Calendar className="w-5 h-5 text-[#c4a905]" />
                          <span>
                            {formatDate(ticket.event.eventDate)} •{" "}
                            {ticket.event.eventTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                          <MapPin className="w-5 h-5 text-[#c4a905]" />
                          <span>{ticket.event.venue}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                          <Ticket className="w-5 h-5 text-[#c4a905]" />
                          <span>
                            {ticket.ticketType.name} ({ticket.ticketType.category})
                          </span>
                        </div>
                        {ticket.tableNumber && (
                          <div className="flex items-center gap-2 text-white/70">
                            <User className="w-5 h-5 text-[#c4a905]" />
                            <span>
                              {ticket.tableNumber}
                              {ticket.seatNumber && ` • Asiento ${ticket.seatNumber}`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div>
                          <p className="text-white/70 text-sm">Número de boleto</p>
                          <p className="text-[#c4a905] font-bold">
                            {ticket.ticketNumber}
                          </p>
                        </div>
                        {ticket.pdfUrl && (
                          <Button
                            onClick={() => window.open(ticket.pdfUrl!, "_blank")}
                            variant="outline"
                            className="border-white/30 text-white bg-transparent hover:bg-white/10"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar PDF
                          </Button>
                        )}
                      </div>

                      {/* Código QR para acceso */}
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <QrCode className="w-5 h-5 text-[#c4a905]" />
                              <p className="text-white font-medium">Código QR de Acceso</p>
                            </div>
                            <p className="text-white/70 text-sm">
                              Presenta este código QR en la entrada del evento para validar tu boleto
                            </p>
                          </div>
                          <div className="bg-white p-4 rounded-lg shadow-lg">
                            <QRCodeSVG
                              value={JSON.stringify({
                                ticketId: ticket.id,
                                qrHash: ticket.qrCode,
                                timestamp: Date.now()
                              })}
                              size={180}
                              level="H"
                              includeMargin={true}
                            />
                            <p className="text-center text-xs text-gray-600 mt-2 font-mono">
                              {ticket.ticketNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

