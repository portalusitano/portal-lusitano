"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useToast } from "./ToastContext";
import { useLanguage } from "./LanguageContext";
import { createTranslator } from "@/lib/tr";
import { useAuth } from "@/components/auth/AuthProvider";

export interface FavoriteHorse {
  id: string;
  slug: string;
  name: string;
  breed?: string;
  age?: number;
  price?: number;
  image?: string;
  location?: string;
}

interface HorseFavoritesContextType {
  favorites: FavoriteHorse[];
  addToFavorites: (horse: FavoriteHorse) => void;
  removeFromFavorites: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearFavorites: () => void;
  favoritesCount: number;
}

const HorseFavoritesContext = createContext<HorseFavoritesContextType | undefined>(undefined);

const STORAGE_KEY = "horse_favorites";

function readLocalStorage(): FavoriteHorse[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // silenced
  }
  return [];
}

export function HorseFavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteHorse[]>(readLocalStorage);
  const { showToast } = useToast();
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);
  const { user } = useAuth();

  // Persist to localStorage whenever favorites change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // silenced
    }
  }, [favorites]);

  // On mount (or when user logs in): sync from backend and merge with localStorage
  useEffect(() => {
    if (!user) return;

    async function syncFromBackend() {
      try {
        const res = await fetch("/api/favoritos");
        if (!res.ok) return;
        const json = await res.json();
        const apiItems: Array<{
          item_id: string;
          item_type: string;
          cavalos_venda?: {
            id: string;
            slug: string;
            nome: string;
            foto_principal?: string;
            preco?: number;
            localizacao?: string;
          } | null;
        }> = json.favoritos || [];

        // Build FavoriteHorse objects from API data (cavalo items only)
        const apiFavorites: FavoriteHorse[] = apiItems
          .filter((f) => f.item_type === "cavalo" && f.cavalos_venda)
          .map((f) => ({
            id: f.item_id,
            slug: f.cavalos_venda!.slug || f.item_id,
            name: f.cavalos_venda!.nome,
            price: f.cavalos_venda!.preco,
            image: f.cavalos_venda!.foto_principal ?? undefined,
            location: f.cavalos_venda!.localizacao ?? undefined,
          }));

        // Merge: start with local favorites, add any from API that aren't already present
        setFavorites((local) => {
          const localIds = new Set(local.map((h) => h.id));
          const toAdd = apiFavorites.filter((h) => !localIds.has(h.id));
          return toAdd.length > 0 ? [...local, ...toAdd] : local;
        });
      } catch {
        // Network error — keep local state
      }
    }

    syncFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isFavorite = useCallback(
    (id: string) => favorites.some((horse) => horse.id === id),
    [favorites]
  );

  const addToFavorites = useCallback(
    (horse: FavoriteHorse) => {
      setFavorites((prev) => {
        if (prev.some((h) => h.id === horse.id)) return prev;
        showToast(
          "success",
          tr(`${horse.name} adicionado aos favoritos`, `${horse.name} added to favorites`)
        );
        // Sync to backend (fire-and-forget)
        if (user) {
          fetch("/api/favoritos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: horse.id, item_type: "cavalo" }),
          }).catch(() => {});
        }
        return [...prev, horse];
      });
    },
    [showToast, tr, user]
  );

  const removeFromFavorites = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const horse = prev.find((h) => h.id === id);
        if (horse) {
          showToast(
            "info",
            tr(`${horse.name} removido dos favoritos`, `${horse.name} removed from favorites`)
          );
        }
        // Sync to backend (fire-and-forget)
        if (user) {
          fetch(`/api/favoritos?item_id=${id}&item_type=cavalo`, { method: "DELETE" }).catch(
            () => {}
          );
        }
        return prev.filter((h) => h.id !== id);
      });
    },
    [showToast, tr, user]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    showToast("info", tr("Favoritos limpos", "Favorites cleared"));
    // Sync to backend (fire-and-forget)
    if (user) {
      fetch("/api/favoritos?all=true", { method: "DELETE" }).catch(() => {
        /* best-effort backend sync — localStorage is primary store */
      });
    }
  }, [showToast, language, user]);

  const value = useMemo(
    () => ({
      favorites,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      clearFavorites,
      favoritesCount: favorites.length,
    }),
    [favorites, addToFavorites, removeFromFavorites, isFavorite, clearFavorites]
  );

  return <HorseFavoritesContext.Provider value={value}>{children}</HorseFavoritesContext.Provider>;
}

export function useHorseFavorites() {
  const context = useContext(HorseFavoritesContext);
  if (!context) {
    throw new Error("useHorseFavorites must be used within a HorseFavoritesProvider");
  }
  return context;
}
