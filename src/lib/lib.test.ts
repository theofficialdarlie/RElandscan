import { describe, expect, it } from "vitest";
import { distanceM, polygonAreaM2, type LngLat } from "./geo";
import { runFeasibility } from "./feasibility";
import { findCouncil } from "./councils";
import { parseOverpass } from "./osm";

describe("geo", () => {
  it("measures one degree of latitude as ~111.2 km", () => {
    expect(distanceM([101.7, 3], [101.7, 4])).toBeCloseTo(111_195, -1);
  });

  it("computes the area of a ~100 m square near KL", () => {
    const dLat = 100 / 111_195;
    const dLng = dLat / Math.cos((3.14 * Math.PI) / 180);
    const ring: LngLat[] = [[101.7, 3.14], [101.7 + dLng, 3.14], [101.7 + dLng, 3.14 + dLat], [101.7, 3.14 + dLat]];
    expect(polygonAreaM2(ring)).toBeCloseTo(10_000, -2);
  });

  it("returns zero for degenerate rings", () => {
    expect(polygonAreaM2([[101.7, 3.14], [101.71, 3.14]])).toBe(0);
  });
});

describe("feasibility", () => {
  it("derives a residual land value", () => {
    const r = runFeasibility({
      landAreaSqft: 10_000,
      plotRatio: 4,
      efficiency: 0.75,
      avgUnitSqft: 1000,
      sellingPricePsf: 600,
      constructionPsf: 250,
      otherCostsPct: 0.15,
      profitPct: 0.2,
    });
    expect(r.gfaSqft).toBe(40_000);
    expect(r.nsaSqft).toBe(30_000);
    expect(r.units).toBe(30);
    expect(r.gdv).toBe(18_000_000);
    // 18m - 10m construction - 2.7m other - 3.6m profit
    expect(r.residualLandValue).toBeCloseTo(1_700_000);
    expect(r.residualLandPsf).toBeCloseTo(170);
  });
});

describe("councils", () => {
  it("prefers city councils over the district they sit in", () => {
    expect(findCouncil(["Selangor", "Klang", "Shah Alam"])?.code).toBe("MBSA");
    expect(findCouncil(["Selangor", "Petaling", "Petaling Jaya"])?.code).toBe("MBPJ");
    expect(findCouncil(["Kuala Lumpur"])?.code).toBe("DBKL");
  });

  it("does not treat 'Klang Valley' as Klang", () => {
    expect(findCouncil(["Klang Valley"])).toBeUndefined();
  });
});

describe("parseOverpass", () => {
  it("splits boundaries, land use, stations, amenities and waterways", () => {
    const origin: LngLat = [101.6864, 3.1343];
    const r = parseOverpass(
      [
        { type: "area", tags: { boundary: "administrative", admin_level: "4", name: "Kuala Lumpur" } },
        { type: "area", tags: { landuse: "commercial" } },
        { type: "node", lat: 3.1343, lon: 101.6864, tags: { railway: "station", name: "KL Sentral", network: "KTM Komuter" } },
        { type: "node", lat: 3.128, lon: 101.6788, tags: { railway: "station", name: "Bangsar", station: "light_rail" } },
        { type: "node", lat: 3.128, lon: 101.6788, tags: { railway: "station", name: "Bangsar", station: "light_rail" } },
        { type: "way", center: { lat: 3.14, lon: 101.69 }, tags: { amenity: "hospital", name: "Some Hospital" } },
        { type: "way", tags: { waterway: "river", name: "Sungai Klang" } },
      ],
      origin,
    );
    expect(r.boundaries).toEqual([{ name: "Kuala Lumpur", level: 4 }]);
    expect(r.landuse).toEqual(["commercial"]);
    expect(r.stations.map((s) => `${s.kind}:${s.name}`)).toEqual(["KTM:KL Sentral", "LRT:Bangsar"]);
    expect(r.amenities[0].kind).toBe("Hospital");
    expect(r.waterways).toEqual(["Sungai Klang"]);
  });
});
