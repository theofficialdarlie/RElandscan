/**
 * Klang Valley local authorities (PBT). Zoning, plot ratio and density come from each
 * council's local plan (Rancangan Tempatan), so the council is the next stop after the map.
 * Websites are the councils' public homepages — verify before relying on them.
 */
export interface Council {
  code: string;
  name: string;
  state: string;
  website: string;
  /** Matched against OpenStreetMap administrative boundary names around the clicked point. */
  match: RegExp;
}

export const COUNCILS: Council[] = [
  { code: "DBKL", name: "Kuala Lumpur City Hall", state: "WP Kuala Lumpur", website: "https://www.dbkl.gov.my", match: /kuala lumpur/i },
  { code: "PPj", name: "Putrajaya Corporation", state: "WP Putrajaya", website: "https://www.ppj.gov.my", match: /putrajaya/i },
  { code: "MBPJ", name: "Petaling Jaya City Council", state: "Selangor", website: "https://www.mbpj.gov.my", match: /petaling jaya/i },
  { code: "MBSA", name: "Shah Alam City Council", state: "Selangor", website: "https://www.mbsa.gov.my", match: /shah alam/i },
  { code: "MBSJ", name: "Subang Jaya City Council", state: "Selangor", website: "https://www.mbsj.gov.my", match: /subang jaya/i },
  { code: "MBDK", name: "Klang Royal City Council", state: "Selangor", website: "https://www.mbdk.gov.my", match: /\bklang\b(?! valley)/i },
  { code: "MPAJ", name: "Ampang Jaya Municipal Council", state: "Selangor", website: "https://www.mpaj.gov.my", match: /ampang/i },
  { code: "MPS", name: "Selayang Council", state: "Selangor", website: "https://www.mps.gov.my", match: /selayang|gombak/i },
  { code: "MPKj", name: "Kajang Council", state: "Selangor", website: "https://www.mpkj.gov.my", match: /kajang|hulu langat/i },
  { code: "MPSepang", name: "Sepang Municipal Council", state: "Selangor", website: "https://www.mpsepang.gov.my", match: /sepang|cyberjaya/i },
];

/**
 * Pick the council from a list of boundary names (most specific first works best,
 * but any order is fine since city-level names are checked before districts).
 */
export function findCouncil(boundaryNames: string[]): Council | undefined {
  for (const council of COUNCILS) {
    if (boundaryNames.some((n) => council.match.test(n))) return council;
  }
  return undefined;
}
