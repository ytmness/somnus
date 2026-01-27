"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Ticket, Calendar, MapPin, User, ArrowLeft, Download, QrCode, Music, Shield, Scan, LogIn } from "lucide-react";
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
  const [userRole, setUserRole] = useState<string | null>(null);

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
        setUserRole(sessionData.user?.role || null);

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
      <div className="min-h-screen regia-bg-main">
        <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-6">
          <div className="w-full flex lg:hidden items-center justify-between">
            <Image
              src="/assets/logo-grupo-regia.png"
              alt="Grupo Regia"
              width={80}
              height={48}
              className="opacity-90 cursor-pointer"
              onClick={() => router.push("/")}
            />
          </div>
          <div className="w-full hidden lg:flex items-center justify-between">
            <Image
              src="/assets/logo-grupo-regia.png"
              alt="Grupo Regia"
              width={110}
              height={65}
              className="opacity-90 cursor-pointer"
              onClick={() => router.push("/")}
            />
            <Image
              src="/assets/rico-muerto-logo.png"
              alt="Rico o Muerto"
              width={100}
              height={50}
              className="opacity-90"
            />
          </div>
        </header>
        <main className="w-full py-8 pt-24 lg:pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <div className="w-16 h-16 border-4 border-regia-gold-bright border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="regia-text-body text-xl">Cargando tus boletos...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen regia-bg-main overflow-x-hidden">
      {/* Header flotante con logos y navegación integrada */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-6">
        {/* Versión móvil - Logos simplificados */}
        <div className="w-full flex lg:hidden items-center justify-between">
          <Image
            src="/assets/logo-grupo-regia.png"
            alt="Grupo Regia"
            width={80}
            height={48}
            className="opacity-90 cursor-pointer"
            onClick={() => router.push("/")}
          />
          <button
            onClick={() => router.push("/")}
            className="text-regia-gold-old hover:text-regia-gold-bright transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Versión desktop - Navegación completa */}
        <div className="w-full hidden lg:flex items-center justify-between">
          {/* Logo GRUPO REGIA */}
          <div className="flex-shrink-0">
            <Image
              src="/assets/logo-grupo-regia.png"
              alt="Grupo Regia"
              width={110}
              height={65}
              className="opacity-90 cursor-pointer"
              onClick={() => router.push("/")}
            />
          </div>

          {/* Eventos */}
          <button
            onClick={() => router.push("/#eventos")}
            className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
          >
            <Calendar className="w-4 h-4" />
            <span>Eventos</span>
          </button>

          {/* Mis Boletos */}
          <button
            onClick={() => router.push("/mis-boletos")}
            className="flex items-center gap-2 text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
          >
            <Music className="w-4 h-4" />
            <span>Mis Boletos</span>
          </button>

          {/* Admin - solo si tiene rol */}
          {userRole === "ADMIN" && (
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}

          {/* Accesos - solo si tiene rol */}
          {(userRole === "ACCESOS" || userRole === "ADMIN") && (
            <button
              onClick={() => router.push("/accesos")}
              className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
            >
              <Scan className="w-4 h-4" />
              <span>Accesos</span>
            </button>
          )}

          {/* Login / User */}
          {user ? (
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
            >
              <User className="w-4 h-4" />
              <span>{user.name || user.email}</span>
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}

          {/* Logo RICO O MUERTO */}
          <div className="flex-shrink-0">
            <Image
              src="/assets/rico-muerto-logo.png"
              alt="Rico o Muerto"
              width={100}
              height={50}
              className="opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </header>
      
      <main className="w-full py-8 pt-20 sm:pt-24 lg:pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 regia-text-body hover:text-regia-gold-bright transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Eventos
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="regia-title-main text-3xl sm:text-4xl mb-2">
                  Mis Boletos
                </h1>
                {user && (
                  <p className="regia-text-body">
                    {user.name} • {user.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lista de boletos */}
          {tickets.length === 0 ? (
            <div className="regia-ticket-card p-12 text-center">
              <div className="w-20 h-20 regia-gold-gradient rounded-full flex items-center justify-center mx-auto mb-6">
                <Ticket className="w-10 h-10 text-regia-black" />
              </div>
              <h3 className="regia-title-secondary text-2xl mb-3">
                No tienes boletos aún
              </h3>
              <p className="regia-text-body mb-6">
                Compra boletos para tus eventos favoritos
              </p>
              <Button
                onClick={() => router.push("/")}
                className="regia-btn-primary"
              >
                Ver Eventos
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="regia-ticket-card p-6"
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
                          <h3 className="regia-title-secondary text-2xl mb-2">
                            {ticket.event.name}
                          </h3>
                          <p className="regia-text-body mb-1">
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
                        <div className="flex items-center gap-2 regia-text-body">
                          <Calendar className="w-5 h-5 text-regia-gold-bright" />
                          <span>
                            {formatDate(ticket.event.eventDate)} •{" "}
                            {ticket.event.eventTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 regia-text-body">
                          <MapPin className="w-5 h-5 text-regia-gold-bright" />
                          <span>{ticket.event.venue}</span>
                        </div>
                        <div className="flex items-center gap-2 regia-text-body">
                          <Ticket className="w-5 h-5 text-regia-gold-bright" />
                          <span>
                            {ticket.ticketType.name} ({ticket.ticketType.category})
                          </span>
                        </div>
                        {ticket.tableNumber && (
                          <div className="flex items-center gap-2 regia-text-body">
                            <User className="w-5 h-5 text-regia-gold-bright" />
                            <span>
                              {ticket.tableNumber}
                              {ticket.seatNumber && ` • Asiento ${ticket.seatNumber}`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-regia-gold-old/20">
                        <div>
                          <p className="regia-text-body text-sm">Número de boleto</p>
                          <p className="text-regia-gold-bright font-bold text-lg">
                            {ticket.ticketNumber}
                          </p>
                        </div>
                        {ticket.pdfUrl && (
                          <Button
                            onClick={() => window.open(ticket.pdfUrl!, "_blank")}
                            className="regia-btn-secondary"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar PDF
                          </Button>
                        )}
                      </div>

                      {/* Código QR para acceso */}
                      <div className="mt-6 pt-6 border-t border-regia-gold-old/20">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <QrCode className="w-5 h-5 text-regia-gold-bright" />
                              <p className="regia-title-secondary">Código QR de Acceso</p>
                            </div>
                            <p className="regia-text-body text-sm">
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

