"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, UserMinus } from "lucide-react";

interface FollowButtonProps {
  organizationId: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
  onFollowChange?: (following: boolean, followersCount?: number) => void;
  className?: string;
}

export function FollowButton({
  organizationId,
  initialFollowing,
  isLoggedIn,
  onFollowChange,
  className = "",
}: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!isLoggedIn) {
      toast.info("Inicia sesión para seguir organizaciones");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/follow`, {
        method: following ? "DELETE" : "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const next = !following;
      setFollowing(next);
      onFollowChange?.(next, data.data?.followersCount);
      toast.success(next ? "Ahora sigues esta organización" : "Dejaste de seguir");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar seguimiento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-colors disabled:opacity-50 ${
        following
          ? "bg-white/10 border border-white/30 text-white hover:bg-white/20"
          : "bg-white text-black hover:bg-white/90"
      } ${className}`}
    >
      {following ? (
        <>
          <UserMinus className="w-4 h-4" />
          Siguiendo
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Seguir
        </>
      )}
    </button>
  );
}
