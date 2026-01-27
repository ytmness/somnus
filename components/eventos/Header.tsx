"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Calendar, Info, Mail, User, Ticket, LogOut, ScanLine, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface HeaderProps {
  cartItemsCount: number;
  onCartClick: () => void;
}

export function Header({ cartItemsCount, onCartClick }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      toast.success("Sesión cerrada");
      setMobileMenuOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error("Error al cerrar sesión");
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-[#49484e] border-b border-[#c4a905]/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 py-3">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 h-full" onClick={closeMobileMenu}>
            <img src="/assets/logo.png" alt="Somnus" className="h-full w-auto object-contain" />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href="/#eventos" className="flex items-center gap-2 text-[#f9fbf6] hover:text-[#c4a905] transition-colors text-base font-medium">
              <Calendar className="w-5 h-5" />
              <span>Eventos</span>
            </Link>
            <Link href="/#nosotros" className="flex items-center gap-2 text-[#f9fbf6] hover:text-[#c4a905] transition-colors text-base font-medium">
              <Info className="w-5 h-5" />
              <span>Nosotros</span>
            </Link>
            <Link href="/#contacto" className="flex items-center gap-2 text-[#f9fbf6] hover:text-[#c4a905] transition-colors text-base font-medium">
              <Mail className="w-5 h-5" />
              <span>Contacto</span>
            </Link>
            {!isLoading && (
              <>
                {user ? (
                  <>
                    {user.role === "CLIENTE" && (
                      <Link href="/mis-boletos" className="flex items-center gap-2 text-[#f9fbf6] hover:text-[#c4a905] transition-colors text-base font-medium">
                        <Ticket className="w-5 h-5" />
                        <span>Mis Boletos</span>
                      </Link>
                    )}
                    {(user.role === "ACCESOS" || user.role === "ADMIN") && (
                      <Link href="/accesos" className="flex items-center gap-2 text-[#f9fbf6] hover:text-[#c4a905] transition-colors text-base font-medium">
                        <ScanLine className="w-5 h-5" />
                        <span>Escáner</span>
                      </Link>
                    )}
                    <div className="flex items-center gap-2 text-[#f9fbf6]">
                      <User className="w-5 h-5" />
                      <span className="text-sm">{user.name}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-[#f9fbf6] hover:text-[#c4a905] transition-colors text-base font-medium"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Salir</span>
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="flex items-center gap-2 text-[#f9fbf6] hover:text-[#c4a905] transition-colors text-base font-medium">
                    <User className="w-5 h-5" />
                    <span>Mi Cuenta</span>
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Mobile & Desktop Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className="relative flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-[#c4a905] text-[#f9fbf6] hover:bg-[#d4b815] active:bg-[#b49805] transition-colors font-medium text-sm sm:text-base"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Carrito</span>
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-[#49484e] rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm font-bold">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center p-2 rounded-lg text-[#f9fbf6] hover:bg-[#5a595f] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#2a2c30] border-t border-[#c4a905]/20">
          <nav className="max-w-7xl mx-auto px-3 py-4 flex flex-col gap-1">
            <Link 
              href="/#eventos" 
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 text-[#f9fbf6] hover:bg-[#49484e] rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5 text-[#c4a905]" />
              <span className="font-medium">Eventos</span>
            </Link>
            
            <Link 
              href="/#nosotros" 
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 text-[#f9fbf6] hover:bg-[#49484e] rounded-lg transition-colors"
            >
              <Info className="w-5 h-5 text-[#c4a905]" />
              <span className="font-medium">Nosotros</span>
            </Link>
            
            <Link 
              href="/#contacto" 
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 text-[#f9fbf6] hover:bg-[#49484e] rounded-lg transition-colors"
            >
              <Mail className="w-5 h-5 text-[#c4a905]" />
              <span className="font-medium">Contacto</span>
            </Link>

            {!isLoading && (
              <>
                {user ? (
                  <>
                    <div className="border-t border-[#49484e] my-2"></div>
                    
                    <div className="flex items-center gap-3 px-4 py-3 text-[#c4a905]">
                      <User className="w-5 h-5" />
                      <span className="font-medium">{user.name}</span>
                    </div>

                    {user.role === "CLIENTE" && (
                      <Link 
                        href="/mis-boletos" 
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 px-4 py-3 text-[#f9fbf6] hover:bg-[#49484e] rounded-lg transition-colors"
                      >
                        <Ticket className="w-5 h-5 text-[#c4a905]" />
                        <span className="font-medium">Mis Boletos</span>
                      </Link>
                    )}

                    {(user.role === "ACCESOS" || user.role === "ADMIN") && (
                      <Link 
                        href="/accesos" 
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 px-4 py-3 text-[#f9fbf6] hover:bg-[#49484e] rounded-lg transition-colors"
                      >
                        <ScanLine className="w-5 h-5 text-[#c4a905]" />
                        <span className="font-medium">Escáner</span>
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 text-[#f9fbf6] hover:bg-[#49484e] rounded-lg transition-colors text-left w-full"
                    >
                      <LogOut className="w-5 h-5 text-red-400" />
                      <span className="font-medium">Cerrar Sesión</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="border-t border-[#49484e] my-2"></div>
                    <Link 
                      href="/login" 
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 px-4 py-3 text-[#f9fbf6] hover:bg-[#49484e] rounded-lg transition-colors"
                    >
                      <User className="w-5 h-5 text-[#c4a905]" />
                      <span className="font-medium">Mi Cuenta</span>
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}


