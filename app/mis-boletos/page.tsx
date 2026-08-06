"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Calendar, MapPin, User, ArrowLeft, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { formatEventCalendarDate } from "@/lib/utils";
import { SiteHeader, type SessionUser } from "@/components/layout/SiteHeader";

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
  const [authRequired, setAuthRequired] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  const handleUserChange = useCallback((sessionUser: SessionUser | null) => {
    setUser(sessionUser);
  }, []);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setIsLoading(true);
        const sessionResponse = await fetch("/api/auth/session", { credentials: "include" });
        const sessionData = await sessionResponse.json();

        if (!sessionData.user) {
          setAuthRequired(true);
          toast.error("Sign in required");
          router.push("/login");
          return;
        }

        setUser(sessionData.user);

        const response = await fetch("/api/tickets/my-tickets");
        const data = await response.json();

        if (data.success && data.data) {
          setTickets(data.data.tickets || []);
        } else {
          toast.error(data.error || "Failed to load tickets");
        }
      } catch (error) {
        console.error("Error loading tickets:", error);
        toast.error("Failed to load your tickets");
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, [router]);

  const getStatusText = (status: string) => {
    switch (status) {
      case "VALID":
        return "Valid";
      case "USED":
        return "Used";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main">
        <SiteHeader eventsHref="/" onUserChange={handleUserChange} />
        <main className="w-full py-8 pt-24 lg:pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <div className="w-16 h-16 border-4 border-white/50 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="somnus-text-body text-xl">Loading your tickets...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="min-h-screen somnus-bg-main">
        <SiteHeader eventsHref="/" onUserChange={handleUserChange} />
        <main className="w-full py-8 pt-24 lg:pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <h1 className="somnus-display text-2xl sm:text-3xl text-white mb-3 uppercase tracking-wider">
                Sign in required
              </h1>
              <p className="somnus-text-body text-white/60 mb-8">
                Redirecting you to sign in…
              </p>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="somnus-btn px-8 py-3.5"
              >
                Sign in
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      <SiteHeader eventsHref="/" onUserChange={handleUserChange} />

      <main className="w-full py-8 pt-20 sm:pt-24 lg:pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="somnus-nav-link inline-flex items-center gap-2 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Events
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="somnus-display text-3xl sm:text-4xl mb-2 uppercase tracking-wider">
                  My Tickets
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
                No tickets yet
              </h3>
              <p className="somnus-text-body mb-6">
                Buy tickets for your favorite events
              </p>
              <p className="somnus-text-body text-sm text-white/60 mb-6 max-w-md mx-auto">
                Just paid? Sign out and sign back in with the <strong>same email</strong> you used at checkout. Tickets are linked to that address.
              </p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="somnus-btn px-8 py-3.5"
              >
                View Events
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
                            {formatEventCalendarDate(ticket.event.eventDate)} •{" "}
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
                              {ticket.seatNumber && ` • Seat ${ticket.seatNumber}`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div>
                          <p className="somnus-text-body text-sm">Ticket number</p>
                          <p className="text-white font-bold text-lg">
                            {ticket.ticketNumber}
                          </p>
                        </div>
                        {ticket.pdfUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(ticket.pdfUrl!, "_blank")}
                            className="somnus-btn px-6 py-3 text-sm"
                          >
                            <Download className="w-4 h-4 mr-2 inline" />
                            Download PDF
                          </button>
                        )}
                      </div>

                      {(ticket.event.showQR !== false) && ticket.qrCode && ticket.qrCode !== "TEMP" && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <QrCode className="w-5 h-5 text-white/80" />
                                <p className="somnus-title-secondary">Entry QR code</p>
                              </div>
                              <p className="somnus-text-body text-sm">
                                Show this QR code at the event entrance to validate your ticket
                              </p>
                            </div>
                            <div className="liquid-glass rounded-xl border border-white/10 bg-[#141414]/80 p-3 sm:p-4">
                              <div className="bg-white p-3 rounded-md inline-block">
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
                              </div>
                              <p className="text-center text-xs text-white/50 mt-2.5 font-mono tracking-wide">
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
