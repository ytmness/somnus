"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

type SlotInvite = {
  id: string;
  seatNumber: number;
  name: string;
  status: string;
  pricePerSeat: number;
};

export default function MesaHostPage({
  params,
}: {
  params: { eventId: string; tableNumber: string };
}) {
  const router = useRouter();
  const tableNumber = decodeURIComponent(params.tableNumber);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [pool, setPool] = useState<{
    tableNumber: string;
    splitAmong: number;
    minPaidToConfirm: number;
    slotInvites: Array<{
      id: string;
      seatNumber: number;
      invitedName: string;
      status: string;
    }>;
  } | null>(null);
  const [eventName, setEventName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
        const session = await sessionRes.json();
        if (!session.user) {
          router.push(
            `/login?redirect=/mesa/${params.eventId}/${encodeURIComponent(tableNumber)}`
          );
          return;
        }

        const assignRes = await fetch("/api/staff/my-assignments", {
          credentials: "include",
        });
        const assignData = await assignRes.json();
        const isHost =
          session.user.role === "ADMIN" ||
          assignData.data?.tableAssignments?.some(
            (t: { eventId: string; tableNumber: string }) =>
              t.eventId === params.eventId && t.tableNumber === tableNumber
          );

        if (!isHost) {
          toast.error("No tienes acceso a esta mesa");
          router.push("/");
          return;
        }
        setAuthorized(true);

        const [eventRes, invitesRes] = await Promise.all([
          fetch(`/api/events/${params.eventId}`),
          fetch(
            `/api/events/${params.eventId}/tables/${encodeURIComponent(tableNumber)}/invites`
          ),
        ]);

        const eventData = await eventRes.json();
        if (eventRes.ok) setEventName(eventData.data?.name || eventData.name || "");

        const invitesData = await invitesRes.json();
        if (invitesRes.ok && invitesData.data?.invites?.length) {
          const invites = invitesData.data.invites as SlotInvite[];
          setPool({
            tableNumber,
            splitAmong: invites.length,
            minPaidToConfirm: 1,
            slotInvites: invites.map((inv) => ({
              id: inv.id,
              seatNumber: inv.seatNumber,
              invitedName: inv.name,
              status: inv.status,
            })),
          });
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.eventId, tableNumber, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!authorized) return null;

  const paidCount =
    pool?.slotInvites.filter((s) => s.status === "PAID").length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <div>
              <h1 className="font-bold">Mesa {tableNumber}</h1>
              <p className="text-white/50 text-sm">{eventName}</p>
            </div>
          </div>
          <Link href="/" className="text-white/60 text-sm hover:text-white">
            Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {!pool ? (
          <p className="text-white/60">
            No hay invitaciones activas para esta mesa.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-white/50 text-xs">Pagados</p>
                <p className="text-2xl font-bold">{paidCount}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-white/50 text-xs">Total asientos</p>
                <p className="text-2xl font-bold">{pool.splitAmong}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-white/50 text-xs">Pendientes</p>
                <p className="text-2xl font-bold">{pool.splitAmong - paidCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/60 bg-white/5">
                    <th className="text-left p-3">Asiento</th>
                    <th className="text-left p-3">Invitado</th>
                    <th className="text-left p-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pool.slotInvites.map((slot) => (
                    <tr key={slot.id} className="border-b border-white/5">
                      <td className="p-3">{slot.seatNumber}</td>
                      <td className="p-3">{slot.invitedName}</td>
                      <td className="p-3">
                        <span
                          className={
                            slot.status === "PAID"
                              ? "text-green-400"
                              : slot.status === "PENDING"
                                ? "text-amber-400"
                                : "text-red-400"
                          }
                        >
                          {slot.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Link
              href={`/eventos/${params.eventId}/mesa/${encodeURIComponent(tableNumber)}/invitar`}
              className="block text-center py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium"
            >
              Gestionar invitaciones
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
