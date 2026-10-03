export interface FeasibilityInputs {
  landAreaSqft: number;
  plotRatio: number;
  /** Net saleable area as a fraction of gross floor area. */
  efficiency: number;
  avgUnitSqft: number;
  sellingPricePsf: number;
  /** Construction cost per sqft of gross floor area. */
  constructionPsf: number;
  /** Fees, contributions, financing etc. as a fraction of GDV. */
  otherCostsPct: number;
  /** Target developer profit as a fraction of GDV. */
  profitPct: number;
}

export interface FeasibilityResult {
  gfaSqft: number;
  nsaSqft: number;
  units: number;
  gdv: number;
  constructionCost: number;
  otherCosts: number;
  targetProfit: number;
  residualLandValue: number;
  residualLandPsf: number;
}

/** Back-of-envelope residual land valuation: what could a developer afford to pay for the land? */
export function runFeasibility(i: FeasibilityInputs): FeasibilityResult {
  const gfaSqft = i.landAreaSqft * i.plotRatio;
  const nsaSqft = gfaSqft * i.efficiency;
  const units = i.avgUnitSqft > 0 ? Math.floor(nsaSqft / i.avgUnitSqft) : 0;
  const gdv = nsaSqft * i.sellingPricePsf;
  const constructionCost = gfaSqft * i.constructionPsf;
  const otherCosts = gdv * i.otherCostsPct;
  const targetProfit = gdv * i.profitPct;
  const residualLandValue = gdv - constructionCost - otherCosts - targetProfit;
  const residualLandPsf = i.landAreaSqft > 0 ? residualLandValue / i.landAreaSqft : 0;
  return {
    gfaSqft,
    nsaSqft,
    units,
    gdv,
    constructionCost,
    otherCosts,
    targetProfit,
    residualLandValue,
    residualLandPsf,
  };
}

export function formatRM(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${sign}RM ${(abs / 1e9).toFixed(2)} bil`;
  if (abs >= 1e6) return `${sign}RM ${(abs / 1e6).toFixed(2)} mil`;
  return `${sign}RM ${Math.round(abs).toLocaleString("en-MY")}`;
}
