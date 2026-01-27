"use client";

import { useRouter } from "next/navigation";
import { LogIn, User, Shield, Scan } from "lucide-react";

interface SomnusHeaderProps {
  user?: any;
  userRole?: string | null;
  showNav?: boolean;
}

export function SomnusHeader({ user, userRole, showNav = false }: SomnusHeaderProps) {
  const router = useRouter();

  return (
    <header className="somnus-header">
      {/* Versión móvil */}
      <div className="w-full flex lg:hidden items-center justify-between">
        <h1 className="somnus-logo" onClick={() => router.push("/")}>
          <span>S</span><span>O</span><span>M</span><span>N</span><span>U</span><span>S</span>
        </h1>
        {showNav && (
          <button
            onClick={() => router.push("/login")}
            className="somnus-header-item hover:opacity-70 transition-opacity"
          >
            <LogIn className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Versión desktop */}
      <div className="w-full hidden lg:flex items-center justify-between">
        <h1 className="somnus-logo" onClick={() => router.push("/")}>
          <span>S</span><span>O</span><span>M</span><span>N</span><span>U</span><span>S</span>
        </h1>
        
        {showNav && (
          <div className="flex items-center gap-6">
            {userRole === "ADMIN" && (
              <button
                onClick={() => router.push("/admin")}
                className="somnus-header-item hover:opacity-70 transition-opacity"
              >
                Admin
              </button>
            )}
            {(userRole === "ACCESOS" || userRole === "ADMIN") && (
              <button
                onClick={() => router.push("/accesos")}
                className="somnus-header-item hover:opacity-70 transition-opacity"
              >
                Accesos
              </button>
            )}
            {user ? (
              <button
                onClick={() => router.push("/login")}
                className="somnus-header-item hover:opacity-70 transition-opacity"
              >
                {user.name || user.email}
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="somnus-header-item hover:opacity-70 transition-opacity"
              >
                Login
              </button>
            )}
          </div>
        )}
        
        <h1 className="somnus-logo" onClick={() => router.push("/")}>
          <span>S</span><span>O</span><span>M</span><span>N</span><span>U</span><span>S</span>
        </h1>
      </div>
    </header>
  );
}
