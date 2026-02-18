"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Ticket, Calendar, MapPin, User, ArrowLeft, Download, QrCode, Shield, Scan, LogIn } from "lucide-react";
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
    showQR?: boolean;
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
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setIsLoading(true);
        const sessionResponse = await fetch("/api/auth/session");
        const sessionData = await sessionResponse.json();

        if (!sessionData.user) {
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
        setUserRole(sessionData.user?.role || null);

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
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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
      <div className="min-h-screen somnus-bg-main">
        <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            SOMNUS
          </button>
          <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <button
              onClick={() => router.push("/")}
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
            >
              Eventos
            </button>
            <button
              onClick={() => router.push("/galeria")}
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
            >
              Galería
            </button>
            <button
              onClick={() => router.push("/mis-boletos")}
              className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1"
            >
              Mis Boletos
            </button>
          </nav>
        </header>
        <main className="w-full py-8 pt-24 lg:pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <div className="w-16 h-16 border-4 border-white/50 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="somnus-text-body text-xl">Cargando tus boletos...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      {/* Navbar igual que página principal */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          aria-label="SOMNUS"
        >
          SOMNUS
        </button>

        <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          <button
            onClick={() => router.push("/")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            Eventos
          </button>
          <button
            onClick={() => router.push("/galeria")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Galería
          </button>
          {userRole === "ADMIN" && (
            <Link
              href="/admin"
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
            >
              Panel
            </Link>
          )}
          {(userRole === "ACCESOS" || userRole === "ADMIN") && (
            <button
              onClick={() => router.push("/accesos")}
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden md:inline"
            >
              Accesos
            </button>
          )}
          <button
            onClick={() => router.push("/mis-boletos")}
            className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1"
          >
            Mis Boletos
          </button>
          <button
            onClick={() => router.push("/login")}
            className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1"
          >
            {user?.name || user?.email || "Login"}
          </button>
        </nav>
      </header>

      <main className="w-full py-8 pt-20 sm:pt-24 lg:pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 somnus-text-body hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Eventos
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="somnus-title-secondary text-3xl sm:text-4xl mb-2 uppercase">
                  Mis Boletos
                </h1>
                {user && (
                  <p className="somnus-text-body">
                    {user.name} • {user.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {tickets.length === 0 ? (
            <div className="somnus-card p-12 text-center">
              <div className="w-20 h-20 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Ticket className="w-10 h-10 text-white" />
              </div>
              <h3 className="somnus-title-secondary text-2xl mb-3 uppercase">
                No tienes boletos aún
              </h3>
              <p className="somnus-text-body mb-6">
                Compra boletos para tus eventos favoritos
              </p>
              <button
                onClick={() => router.push("/")}
                className="somnus-btn px-8 py-3.5"
              >
                Ver Eventos
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="somnus-card p-6"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {ticket.event.imageUrl && (
                      <div className="md:w-48 flex-shrink-0">
                        <img
                          src={ticket.event.imageUrl}
                          alt={ticket.event.name}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="somnus-title-secondary text-2xl mb-2 uppercase">
                            {ticket.event.name}
                          </h3>
                          <p className="somnus-text-body mb-1">
                            {ticket.event.artist}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            ticket.status === "VALID"
                              ? "text-green-400 bg-green-400/20"
                              : ticket.status === "USED"
                              ? "text-yellow-400 bg-yellow-400/20"
                              : "text-red-400 bg-red-400/20"
                          }`}
                        >
                          {getStatusText(ticket.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 somnus-text-body">
                          <Calendar className="w-5 h-5 text-white/80" />
                          <span>
                            {formatDate(ticket.event.eventDate)} •{" "}
                            {ticket.event.eventTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 somnus-text-body">
                          <MapPin className="w-5 h-5 text-white/80" />
                          <span>{ticket.event.venue}</span>
                        </div>
                        <div className="flex items-center gap-2 somnus-text-body">
                          <Ticket className="w-5 h-5 text-white/80" />
                          <span>
                            {ticket.ticketType.name} ({ticket.ticketType.category})
                          </span>
                        </div>
                        {ticket.tableNumber && (
                          <div className="flex items-center gap-2 somnus-text-body">
                            <User className="w-5 h-5 text-white/80" />
                            <span>
                              {ticket.tableNumber}
                              {ticket.seatNumber && ` • Asiento ${ticket.seatNumber}`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div>
                          <p className="somnus-text-body text-sm">Número de boleto</p>
                          <p className="text-white font-bold text-lg">
                            {ticket.ticketNumber}
                          </p>
                        </div>
                        {ticket.pdfUrl && (
                          <button
                            onClick={() => window.open(ticket.pdfUrl!, "_blank")}
                            className="somnus-btn px-6 py-3 text-sm"
                          >
                            <Download className="w-4 h-4 mr-2 inline" />
                            Descargar PDF
                          </button>
                        )}
                      </div>

                      {ticket.event.showQR !== false && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <QrCode className="w-5 h-5 text-white/80" />
                                <p className="somnus-title-secondary">Código QR de Acceso</p>
                              </div>
                              <p className="somnus-text-body text-sm">
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
                      )}
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
