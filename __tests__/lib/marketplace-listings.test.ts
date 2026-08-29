import { describe, it, expect } from "vitest";
import {
  LISTING_STATUS,
  canSellerTransition,
  computeExpiry,
  computeFeaturedUntil,
  daysUntil,
  isExpired,
  normalizeListing,
} from "@/lib/marketplace-listings";

const NOW = new Date("2026-08-29T12:00:00.000Z");

function iso(daysFromNow: number): string {
  return new Date(NOW.getTime() + daysFromNow * 86_400_000).toISOString();
}

describe("isExpired", () => {
  it("treats a listing with no expiry date as never expired", () => {
    expect(isExpired(null, NOW)).toBe(false);
  });

  it("treats an unparseable date as not expired rather than hiding the listing", () => {
    expect(isExpired("not-a-date", NOW)).toBe(false);
  });

  it("is false while the paid period still runs", () => {
    expect(isExpired(iso(1), NOW)).toBe(false);
  });

  it("is true once the paid period has passed", () => {
    expect(isExpired(iso(-1), NOW)).toBe(true);
  });
});

describe("daysUntil", () => {
  it("returns null when there is no date", () => {
    expect(daysUntil(null, NOW)).toBeNull();
  });

  it("rounds up so a listing with hours left still reads as one day", () => {
    expect(daysUntil(new Date(NOW.getTime() + 3 * 3_600_000).toISOString(), NOW)).toBe(1);
  });

  it("counts whole days ahead", () => {
    expect(daysUntil(iso(10), NOW)).toBe(10);
  });

  it("goes negative once expired", () => {
    expect(daysUntil(iso(-3), NOW)).toBe(-3);
  });
});

describe("canSellerTransition", () => {
  it("allows an active listing to be reserved, sold or paused", () => {
    expect(canSellerTransition("active", "reservado")).toBe(true);
    expect(canSellerTransition("active", "vendido")).toBe(true);
    expect(canSellerTransition("active", "inativo")).toBe(true);
  });

  it("refuses to let a seller move a listing awaiting admin approval", () => {
    expect(canSellerTransition("pending", "active")).toBe(false);
    expect(canSellerTransition("pending", "vendido")).toBe(false);
  });

  it("refuses statuses that are not a seller's to set", () => {
    expect(canSellerTransition("active", "pending")).toBe(false);
    expect(canSellerTransition("active", "removido")).toBe(false);
  });

  it("refuses to republish an expired listing, which would be free visibility", () => {
    expect(canSellerTransition("inativo", "active", { expirado: true })).toBe(false);
    expect(canSellerTransition("vendido", "active", { expirado: true })).toBe(false);
  });

  it("still lets an expired listing be hidden or marked sold", () => {
    expect(canSellerTransition("active", "inativo", { expirado: true })).toBe(true);
    expect(canSellerTransition("active", "vendido", { expirado: true })).toBe(true);
  });
});

describe("computeExpiry / computeFeaturedUntil", () => {
  it("uses the tier duration", () => {
    // standard = 30 dias
    expect(computeExpiry("standard", NOW)?.toISOString()).toBe(iso(30));
    // premium = 60 dias
    expect(computeExpiry("premium", NOW)?.toISOString()).toBe(iso(60));
  });

  it("returns null for an unknown tier instead of inventing a period", () => {
    expect(computeExpiry("inexistente", NOW)).toBeNull();
    expect(computeFeaturedUntil("inexistente", NOW)).toBeNull();
  });

  it("gives no featured period to tiers that do not include one", () => {
    expect(computeFeaturedUntil("basico", NOW)).toBeNull();
    expect(computeFeaturedUntil("standard", NOW)).toBeNull();
  });

  it("uses the featured duration where the tier has one", () => {
    expect(computeFeaturedUntil("destaque", NOW)?.toISOString()).toBe(iso(14));
    expect(computeFeaturedUntil("premium", NOW)?.toISOString()).toBe(iso(30));
  });
});

describe("normalizeListing", () => {
  it("reads the column names written by the Stripe webhook", () => {
    const listing = normalizeListing(
      {
        id: "abc",
        nome: "Imperador",
        foto_principal: "https://example.com/a.jpg",
        status: "active",
        preco: 45000,
      },
      NOW
    );

    expect(listing.nome).toBe("Imperador");
    expect(listing.fotoPrincipal).toBe("https://example.com/a.jpg");
    expect(listing.preco).toBe(45000);
  });

  it("reads the older seed-script column names too", () => {
    const listing = normalizeListing(
      { id: "abc", nome_cavalo: "Duquesa", image_url: "https://example.com/b.jpg" },
      NOW
    );

    expect(listing.nome).toBe("Duquesa");
    expect(listing.fotoPrincipal).toBe("https://example.com/b.jpg");
  });

  it("falls back to a placeholder name rather than rendering an empty card", () => {
    expect(normalizeListing({ id: "abc" }, NOW).nome).toBe("Sem nome");
  });

  it("defaults a row with no status to pending", () => {
    expect(normalizeListing({ id: "abc" }, NOW).status).toBe(LISTING_STATUS.PENDING);
  });

  it("counts photos across both column shapes without double-counting", () => {
    const listing = normalizeListing(
      {
        id: "abc",
        foto_principal: "https://example.com/a.jpg",
        fotos: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
        image_urls: "https://example.com/c.jpg, https://example.com/b.jpg",
      },
      NOW
    );

    expect(listing.totalFotos).toBe(3);
  });

  it("derives expiry rather than trusting a stored flag", () => {
    const activo = normalizeListing(
      { id: "abc", status: "active", listing_expires_at: iso(5) },
      NOW
    );
    expect(activo.expirado).toBe(false);
    expect(activo.diasRestantes).toBe(5);
    expect(activo.publico).toBe(true);

    const expirado = normalizeListing(
      { id: "abc", status: "active", listing_expires_at: iso(-2) },
      NOW
    );
    expect(expirado.expirado).toBe(true);
    expect(expirado.publico).toBe(false);
  });

  it("counts a reserved listing as public and a paused or pending one as not", () => {
    expect(normalizeListing({ id: "a", status: "reservado" }, NOW).publico).toBe(true);
    expect(normalizeListing({ id: "a", status: "inativo" }, NOW).publico).toBe(false);
    expect(normalizeListing({ id: "a", status: "pending" }, NOW).publico).toBe(false);
    expect(normalizeListing({ id: "a", status: "vendido" }, NOW).publico).toBe(false);
  });

  it("resolves the tier display name and defaults to standard", () => {
    expect(normalizeListing({ id: "a", listing_tier: "premium" }, NOW).tierName).toBe("Premium");
    expect(normalizeListing({ id: "a" }, NOW).tier).toBe("standard");
  });

  it("coerces numeric strings that Supabase returns for decimal columns", () => {
    const listing = normalizeListing({ id: "a", preco: "45000.00", idade: "7" }, NOW);
    expect(listing.preco).toBe(45000);
    expect(listing.idade).toBe(7);
  });
});
