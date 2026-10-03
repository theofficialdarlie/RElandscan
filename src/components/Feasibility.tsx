import { useEffect, useState } from "react";
import { formatRM, runFeasibility, type FeasibilityInputs } from "../lib/feasibility";
import { SQFT_PER_M2 } from "../lib/geo";

type Field = { key: keyof FeasibilityInputs; label: string; percent?: boolean; hint?: string };

const FIELDS: Field[] = [
  { key: "landAreaSqft", label: "Land area (sq ft)", hint: "Filled in from the site you draw" },
  { key: "plotRatio", label: "Plot ratio", hint: "From the local plan, e.g. 1:4 = 4" },
  { key: "efficiency", label: "Efficiency (NSA / GFA)", percent: true },
  { key: "avgUnitSqft", label: "Average unit size (sq ft)" },
  { key: "sellingPricePsf", label: "Selling price (RM psf)" },
  { key: "constructionPsf", label: "Construction cost (RM psf GFA)" },
  { key: "otherCostsPct", label: "Fees, levies, financing", percent: true, hint: "% of GDV" },
  { key: "profitPct", label: "Target profit", percent: true, hint: "% of GDV" },
];

/** Illustrative starting assumptions for a Klang Valley high-rise; every one should be replaced. */
const DEFAULTS: FeasibilityInputs = {
  landAreaSqft: 43560,
  plotRatio: 4,
  efficiency: 0.75,
  avgUnitSqft: 900,
  sellingPricePsf: 650,
  constructionPsf: 250,
  otherCostsPct: 0.15,
  profitPct: 0.2,
};

export default function Feasibility({ siteAreaM2 }: { siteAreaM2: number }) {
  const [inputs, setInputs] = useState<FeasibilityInputs>(DEFAULTS);

  useEffect(() => {
    if (siteAreaM2 > 0) setInputs((i) => ({ ...i, landAreaSqft: Math.round(siteAreaM2 * SQFT_PER_M2) }));
  }, [siteAreaM2]);

  const r = runFeasibility(inputs);
  const rows: [string, string][] = [
    ["Gross floor area", `${Math.round(r.gfaSqft).toLocaleString("en-MY")} sq ft`],
    ["Net saleable area", `${Math.round(r.nsaSqft).toLocaleString("en-MY")} sq ft`],
    ["Units (approx.)", r.units.toLocaleString("en-MY")],
    ["GDV", formatRM(r.gdv)],
    ["Construction cost", formatRM(-r.constructionCost)],
    ["Fees, levies, financing", formatRM(-r.otherCosts)],
    ["Target profit", formatRM(-r.targetProfit)],
  ];

  return (
    <section className="card">
      <h2>Quick feasibility</h2>
      <p className="muted small">
        Residual land value: the most you could pay for the land and still hit your target profit. All inputs are
        assumptions, so replace them with real numbers.
      </p>
      <div className="form">
        {FIELDS.map((f) => {
          const raw = inputs[f.key];
          return (
            <label key={f.key}>
              <span>
                {f.label}
                {f.hint && <em> · {f.hint}</em>}
              </span>
              <input
                type="number"
                min={0}
                step="any"
                value={f.percent ? Math.round(raw * 1000) / 10 : raw}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setInputs((i) => ({ ...i, [f.key]: f.percent ? v / 100 : v }));
                }}
              />
            </label>
          );
        })}
      </div>
      <table className="results-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{v}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Residual land value</td>
            <td>{formatRM(r.residualLandValue)}</td>
          </tr>
          <tr className="total">
            <td>Per sq ft of land</td>
            <td>RM {Math.round(r.residualLandPsf).toLocaleString("en-MY")} psf</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
