"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface GlobalCartItem {
  eventId: string;
  concertName: string;
  section: string;
  ticketTypeId: string;
  price: number;
  quantity: number;
  date: string;
}

interface CartContextValue {
  items: GlobalCartItem[];
  itemCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItems: (incoming: GlobalCartItem[], opts?: { open?: boolean }) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  setItems: (items: GlobalCartItem[]) => void;
}

const STORAGE_KEY = "somnus-cart-v1";

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): GlobalCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItemsState] = useState<GlobalCartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItemsState(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota
    }
  }, [items, hydrated]);

  const setItems = useCallback((next: GlobalCartItem[]) => {
    setItemsState(next);
  }, []);

  const addItems = useCallback((incoming: GlobalCartItem[], opts?: { open?: boolean }) => {
    setItemsState((prev) => {
      const next = [...prev];
      for (const item of incoming) {
        const existing = next.find(
          (c) =>
            c.eventId === item.eventId && c.ticketTypeId === item.ticketTypeId
        );
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          next.push({ ...item });
        }
      }
      return next;
    });
    if (opts?.open !== false) {
      setIsOpen(true);
    }
  }, []);

  const removeItem = useCallback((index: number) => {
    setItemsState((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setItemsState([]);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toggleCart: () => setIsOpen((v) => !v),
      addItems,
      removeItem,
      clearCart,
      setItems,
    }),
    [items, isOpen, addItems, removeItem, clearCart, setItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}

export function useCartOptional() {
  return useContext(CartContext);
}
