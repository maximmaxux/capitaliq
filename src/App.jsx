import { useState, useEffect, useMemo, createContext, useContext, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
         BarChart, Bar, ReferenceLine, LineChart, Line, ComposedChart } from "recharts";

/* ─── Supabase ─────────────────────────────────────────────────────── */
const SUPABASE_URL      = 'https://zbluszpcsztpzoskzkiz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-amT-RfNBnJHgM7M-UNPVg_WEtnxFK6';

const sb = (() => {
  const h  = { 'Content-Type':'application/json', 'apikey':SUPABASE_ANON_KEY, 'Authorization':`Bearer ${SUPABASE_ANON_KEY}` };
  const ah = t => ({ ...h, 'Authorization':`Bearer ${t}` });
  return {
    auth: {
      async signUp({ email, password, name }) {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method:'POST', headers:h, body:JSON.stringify({ email, password, data:{ full_name:name } }) });
        return r.json();
      },
      async signIn({ email, password }) {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method:'POST', headers:h, body:JSON.stringify({ email, password }) });
        return r.json();
      },
      async resetPassword(email) {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/recover`, { method:'POST', headers:h, body:JSON.stringify({ email, redirect_to:window.location.origin }) });
        return r.json();
      },
      async signOut(token) { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method:'POST', headers:ah(token) }); },
      async getUser(token) { const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers:ah(token) }); return r.json(); },
      async updatePassword(token, password) {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method:'PUT', headers:ah(token), body:JSON.stringify({ password }) });
        return r.json();
      },
    },
    db: {
      async getProjects(token) { const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=*&order=updated_at.desc`, { headers:ah(token) }); return r.json(); },
      async createProject(token, data) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/projects`, { method:'POST', headers:{...ah(token),'Prefer':'return=representation'}, body:JSON.stringify(data) });
        const j = await r.json(); return Array.isArray(j) ? j[0] : j;
      },
      async updateProject(token, id, data) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, { method:'PATCH', headers:{...ah(token),'Prefer':'return=representation'}, body:JSON.stringify({...data, updated_at:new Date().toISOString()}) });
        const j = await r.json(); return Array.isArray(j) ? j[0] : j;
      },
      async deleteProject(token, id) { await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, { method:'DELETE', headers:ah(token) }); },
    },
  };
})();

function parseSessionFromURL() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.replace('#',''));
    const token = params.get('access_token');
    if (token) { window.history.replaceState(null,'',window.location.pathname); return { access_token:token }; }
  }
  return null;
}

/* ─── Currency ─────────────────────────────────────────────────────── */
const CURRENCIES = [
  { code:"USD", symbol:"$",   name:"US Dollar",         locale:"en-US" },
  { code:"EUR", symbol:"€",   name:"Euro",              locale:"de-DE" },
  { code:"GBP", symbol:"£",   name:"British Pound",     locale:"en-GB" },
  { code:"CHF", symbol:"Fr",  name:"Swiss Franc",       locale:"de-CH" },
  { code:"SEK", symbol:"kr",  name:"Swedish Krona",     locale:"sv-SE" },
  { code:"NOK", symbol:"kr",  name:"Norwegian Krone",   locale:"nb-NO" },
  { code:"DKK", symbol:"kr",  name:"Danish Krone",      locale:"da-DK" },
  { code:"PLN", symbol:"zł",  name:"Polish Złoty",      locale:"pl-PL" },
  { code:"CZK", symbol:"Kč",  name:"Czech Koruna",      locale:"cs-CZ" },
  { code:"JPY", symbol:"¥",   name:"Japanese Yen",      locale:"ja-JP" },
  { code:"INR", symbol:"₹",   name:"Indian Rupee",      locale:"en-IN" },
  { code:"AUD", symbol:"A$",  name:"Australian Dollar", locale:"en-AU" },
  { code:"CAD", symbol:"C$",  name:"Canadian Dollar",   locale:"en-CA" },
  { code:"BRL", symbol:"R$",  name:"Brazilian Real",    locale:"pt-BR" },
  { code:"AED", symbol:"د.إ", name:"UAE Dirham",        locale:"ar-AE" },
  { code:"TRY", symbol:"₺",   name:"Turkish Lira",      locale:"tr-TR" },
  { code:"ZAR", symbol:"R",   name:"South African Rand",locale:"en-ZA" },
];
const CurrencyCtx = createContext({ code:"USD", symbol:"$", locale:"en-US" });
const useCur = () => useContext(CurrencyCtx);
function useFmt() {
  const c = useCur();
  const fmt  = n => new Intl.NumberFormat(c.locale,{ style:"currency", currency:c.code, maximumFractionDigits:0 }).format(n);
  const fmtK = n => {
    const a = Math.abs(n);
    if (a>=1e9) return `${c.symbol}${(n/1e9).toFixed(1)}B`;
    if (a>=1e6) return `${c.symbol}${(n/1e6).toFixed(1)}M`;
    if (a>=1e3) return `${c.symbol}${(n/1e3).toFixed(0)}K`;
    return fmt(n);
  };
  return { fmt, fmtK, symbol:c.symbol, code:c.code };
}
const pct = n => `${Number(n).toFixed(1)}%`;

/* ─── Default project inputs ───────────────────────────────────────── */
const DEFAULT_INPUTS = {
  // Basic
  projectName: "New Investment Project",
  currency: "USD",
  constructionYears: 1,
  operationYears: 5,
  discountRate: 10,        // WACC %
  taxRate: 21,             // %
  inflationRate: 2,        // %
  // Revenue drivers (up to 5 revenue lines)
  revenueLines: [
    { name:"Product Revenue", driver1:1000, driver1Label:"Units", driver2:50, driver2Label:"Price/unit", driver3:1, driver3Label:"Factor", growthRate:5, enabled:true },
    { name:"Service Revenue", driver1:0, driver1Label:"Units", driver2:0, driver2Label:"Price/unit", driver3:1, driver3Label:"Factor", growthRate:0, enabled:false },
  ],
  // Costs
  costLines: [
    { name:"Raw Materials / COGS", value:25000, pctOfRevenue:true, pct:55, growthRate:0, enabled:true },
    { name:"Personnel / Salaries", value:15000, pctOfRevenue:false, pct:0, growthRate:3, enabled:true },
    { name:"Rent & Facilities",    value:5000,  pctOfRevenue:false, pct:0, growthRate:2, enabled:true },
    { name:"Sales & Marketing",    value:3000,  pctOfRevenue:false, pct:0, growthRate:5, enabled:true },
    { name:"General & Admin",      value:2000,  pctOfRevenue:false, pct:0, growthRate:2, enabled:true },
    { name:"R&D",                  value:1000,  pctOfRevenue:false, pct:0, growthRate:0, enabled:false },
  ],
  // CAPEX rows (up to 10)
  capexRows: [
    { name:"Machinery & Equipment", amounts:[50000,0,0,0,0,0,0], deprMethod:"SL", deprYears:10, deprStart:1, category:"Fixed Assets", enabled:true },
    { name:"IT & Software",         amounts:[10000,0,0,0,0,0,0], deprMethod:"SL", deprYears:5,  deprStart:1, category:"Fixed Assets", enabled:true },
    { name:"Building / Property",   amounts:[0,0,0,0,0,0,0],     deprMethod:"SL", deprYears:30, deprStart:1, category:"Fixed Assets", enabled:false },
    { name:"Vehicles",              amounts:[0,0,0,0,0,0,0],     deprMethod:"SL", deprYears:5,  deprStart:1, category:"Fixed Assets", enabled:false },
    { name:"Intangibles / Licences",amounts:[0,0,0,0,0,0,0],     deprMethod:"SL", deprYears:5,  deprStart:1, category:"Intangibles",  enabled:false },
  ],
  // Working capital
  receivablesDays: 30,
  payablesDays: 45,
  inventoryDays: 30,
  // Financing
  equityAmount: 50000,
  debtAmount: 30000,
  interestRate: 5.5,
  loanTermYears: 5,
  // Terminal value
  terminalGrowthRate: 2,
  useTerminalValue: true,
  terminalMethod: "perpetuity",  // perpetuity | multiple
  evMultiple: 8,
  // Monthly portfolio contribution (personal investment mode)
  monthlyContrib: 500,
  initialPortfolio: 10000,
  portfolioReturn: 7,
  compounding: "monthly",
};

/* ─── Core financial engine ────────────────────────────────────────── */
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, Number(v)||0)); }

function calcFinancials(inp) {
  const totalYears = clamp(inp.constructionYears,0,5) + clamp(inp.operationYears,1,30);
  const opStart    = clamp(inp.constructionYears,0,5);
  const disc  = clamp(inp.discountRate,0.1,100)/100;
  const tax   = clamp(inp.taxRate,0,99)/100;
  const inf   = clamp(inp.inflationRate,0,50)/100;
  const realWACC = (1+disc)/(1+inf)-1;

  // ── Revenue per year ────────────────────────────────────────────────
  const revenues = Array.from({length:totalYears}, (_,yi) => {
    if (yi < opStart) return 0;
    const opYear = yi - opStart + 1;
    return (inp.revenueLines||[]).filter(r=>r.enabled).reduce((sum,rl) => {
      const base = Number(rl.driver1||0) * Number(rl.driver2||0) * Number(rl.driver3||1);
      return sum + base * Math.pow(1 + clamp(rl.growthRate,-50,100)/100, opYear-1);
    }, 0);
  });

  // ── Costs per year ──────────────────────────────────────────────────
  const costs = Array.from({length:totalYears}, (_,yi) => {
    if (yi < opStart) return 0;
    const opYear = yi - opStart + 1;
    return (inp.costLines||[]).filter(c=>c.enabled).reduce((sum,cl) => {
      const base = cl.pctOfRevenue
        ? revenues[yi] * clamp(cl.pct,0,100)/100
        : Number(cl.value||0) * Math.pow(1 + clamp(cl.growthRate,-50,100)/100, opYear-1);
      return sum + base;
    }, 0);
  });

  // ── CAPEX & Depreciation ────────────────────────────────────────────
  const capexPerYear = Array(totalYears).fill(0);
  const deprPerYear  = Array(totalYears).fill(0);
  const bookValues   = [];

  (inp.capexRows||[]).filter(r=>r.enabled).forEach(cr => {
    let bv = 0;
    (cr.amounts||[]).forEach((amt,i) => { if (i < totalYears) { capexPerYear[i] += Number(amt||0); bv += Number(amt||0); } });
    const deprYrs = clamp(cr.deprYears,1,50);
    const start   = clamp(cr.deprStart,1,totalYears) - 1;
    const annualDepr = bv / deprYrs;
    for (let y = start; y < Math.min(start+deprYrs, totalYears); y++) {
      deprPerYear[y] += annualDepr;
    }
  });

  const totalCapex = capexPerYear.reduce((a,b)=>a+b,0);

  // ── Loan repayment schedule ─────────────────────────────────────────
  const debtAmt  = Number(inp.debtAmount||0);
  const intRate  = clamp(inp.interestRate,0,50)/100;
  const loanTerm = clamp(inp.loanTermYears,1,30);
  const annualRepay = debtAmt / loanTerm;
  let   debtBalance = debtAmt;
  const interestPerYear = Array(totalYears).fill(0);
  const repayPerYear    = Array(totalYears).fill(0);
  for (let y = 0; y < Math.min(loanTerm, totalYears); y++) {
    interestPerYear[y] = debtBalance * intRate;
    repayPerYear[y]    = annualRepay;
    debtBalance = Math.max(0, debtBalance - annualRepay);
  }

  // ── Working capital ─────────────────────────────────────────────────
  const wcPerYear = revenues.map((rev,yi) => {
    if (yi < opStart) return 0;
    const rec = rev * clamp(inp.receivablesDays,0,365)/365;
    const pay = costs[yi] * clamp(inp.payablesDays,0,365)/365;
    const inv = costs[yi] * clamp(inp.inventoryDays,0,365)/365;
    return rec + inv - pay;
  });
  const wcChanges = wcPerYear.map((wc,i) => wc - (i>0?wcPerYear[i-1]:0));

  // ── P&L ────────────────────────────────────────────────────────────
  const grossProfit = revenues.map((r,i) => r - costs[i]);
  const ebitda      = grossProfit.map((gp,i) => gp);
  const ebit        = ebitda.map((e,i) => e - deprPerYear[i]);
  const ebt         = ebit.map((e,i) => e - interestPerYear[i]);
  const taxAmt      = ebt.map(e => Math.max(0, e*tax));
  const netIncome   = ebt.map((e,i) => e - taxAmt[i]);

  // ── Free Cash Flow ──────────────────────────────────────────────────
  // FCF = EBIT*(1-tax) + Depreciation - CAPEX - ΔWC
  const fcf = Array.from({length:totalYears}, (_,i) =>
    ebit[i]*(1-tax) + deprPerYear[i] - capexPerYear[i] - wcChanges[i]
  );

  // ── Terminal Value ──────────────────────────────────────────────────
  let terminalValue = 0;
  if (inp.useTerminalValue && fcf.length > 0) {
    const lastFCF = fcf[fcf.length-1];
    const tg = clamp(inp.terminalGrowthRate,-5,20)/100;
    if (inp.terminalMethod === "perpetuity") {
      terminalValue = disc > tg ? lastFCF*(1+tg)/(disc-tg) : lastFCF*15;
    } else {
      const lastEBITDA = ebitda[ebitda.length-1];
      terminalValue = lastEBITDA * clamp(inp.evMultiple,1,50);
    }
  }

  // ── NPV & IRR ───────────────────────────────────────────────────────
  const totalInitial = totalCapex + Number(inp.equityAmount||0) * 0; // equity already in capex
  const allFCF = [-totalCapex, ...fcf];
  const tvPV   = terminalValue / Math.pow(1+disc, totalYears);

  let npvNom = -totalCapex + tvPV;
  let npvReal = -totalCapex + tvPV/(Math.pow(1+inf,totalYears));
  const cumNPV = [];
  for (let i = 0; i < fcf.length; i++) {
    npvNom  += fcf[i] / Math.pow(1+disc, i+1);
    const fcfReal = fcf[i] / Math.pow(1+inf, i+1);
    npvReal += fcfReal / Math.pow(1+realWACC, i+1);
    cumNPV.push(Math.round(npvNom));
  }

  // IRR
  let irr = 0.1;
  const irrFCF = [...allFCF];
  if (terminalValue > 0) irrFCF[irrFCF.length-1] += terminalValue;
  for (let k=0; k<300; k++) {
    const v = irrFCF.reduce((s,v,t)=>s+v/Math.pow(1+irr,t),0);
    const d = irrFCF.reduce((s,v,t)=>s-t*v/Math.pow(1+irr,t+1),0);
    if (!d||Math.abs(d)<1e-10) break;
    const n = irr - v/d;
    if (n<-0.99){irr=-0.99;break;} irr=n;
  }

  // Payback
  let cumCF = -totalCapex;
  let payback = -1;
  for (let i=0; i<fcf.length; i++) {
    cumCF += fcf[i];
    if (cumCF >= 0 && payback < 0) payback = i+1;
  }

  // RONA: Net Income / Net Assets
  const netAssets = totalCapex - deprPerYear.reduce((a,b)=>a+b,0);
  const avgNetIncome = netIncome.reduce((a,b)=>a+b,0) / Math.max(netIncome.filter(v=>v!==0).length,1);
  const rona = netAssets > 0 ? avgNetIncome/netAssets : 0;

  // EVA: NOPAT - (WACC × Invested Capital)
  const investedCapital = totalCapex;
  const nopat = ebit.map(e => e*(1-tax));
  const eva   = nopat.map(n => n - disc*investedCapital);

  // MIRR
  let pv_neg = 0, fv_pos = 0;
  allFCF.forEach((v,t) => {
    if (v < 0) pv_neg += Math.abs(v)/Math.pow(1+disc,t);
    if (v > 0) fv_pos += v*Math.pow(1+disc,allFCF.length-1-t);
  });
  const mirr = pv_neg > 0 ? Math.pow(fv_pos/pv_neg, 1/(allFCF.length-1))-1 : 0;

  // PI
  const pi = totalCapex > 0 ? (Math.round(npvNom)+totalCapex)/totalCapex : 0;

  // Schedule
  const schedule = Array.from({length:totalYears}, (_,i) => ({
    year: i+1,
    phase: i < opStart ? "Construction" : "Operation",
    revenue:      Math.round(revenues[i]),
    costs:        Math.round(costs[i]),
    grossProfit:  Math.round(grossProfit[i]),
    ebitda:       Math.round(ebitda[i]),
    ebit:         Math.round(ebit[i]),
    ebt:          Math.round(ebt[i]),
    netIncome:    Math.round(netIncome[i]),
    depreciation: Math.round(deprPerYear[i]),
    capex:        Math.round(capexPerYear[i]),
    interest:     Math.round(interestPerYear[i]),
    wcChange:     Math.round(wcChanges[i]),
    fcf:          Math.round(fcf[i]),
    cumNPV:       cumNPV[i],
    eva:          Math.round(eva[i]),
  }));

  return {
    schedule,
    totals: {
      totalRevenue:   revenues.reduce((a,b)=>a+b,0),
      totalCosts:     costs.reduce((a,b)=>a+b,0),
      totalCapex,
      totalDepr:      deprPerYear.reduce((a,b)=>a+b,0),
      totalNetIncome: netIncome.reduce((a,b)=>a+b,0),
      totalFCF:       fcf.reduce((a,b)=>a+b,0),
      npv:            Math.round(npvNom),
      npvReal:        Math.round(npvReal),
      irr:            isFinite(irr) ? irr : null,
      mirr:           isFinite(mirr) ? mirr : 0,
      payback,
      pi,
      rona,
      totalEVA:       eva.reduce((a,b)=>a+b,0),
      terminalValue:  Math.round(terminalValue),
      tvPV:           Math.round(tvPV),
    },
  };
}

/* ─── Break-even finder ────────────────────────────────────────────── */
function findBreakEven(inp, variable) {
  const target = 0; // NPV = 0
  let lo, hi, val;
  if (variable === "discountRate")     { lo=0.1; hi=100; }
  else if (variable === "revenueGrowth") { lo=-50; hi=200; }
  else if (variable === "taxRate")     { lo=0; hi=99; }
  else if (variable === "inflationRate") { lo=0; hi=50; }
  else return null;

  for (let i=0; i<100; i++) {
    val = (lo+hi)/2;
    const test = { ...inp, [variable]: val };
    const npv = calcFinancials(test).totals.npv;
    if (Math.abs(npv) < 10) break;
    if (npv > target) lo = val; else hi = val;
  }
  return val;
}

/* ─── Helpers ──────────────────────────────────────────────────────── */
function heatBg(val, min, max) {
  const t = max===min ? 0.5 : (val-min)/(max-min);
  if (t < 0.5) return `rgba(192,57,43,${0.15+t*0.5})`;
  return `rgba(13,122,85,${0.1+(t-0.5)*0.7})`;
}
function heatFg(val, min, max) {
  const t = max===min ? 0.5 : (val-min)/(max-min);
  return t < 0.3 ? "#7f1d1d" : t > 0.7 ? "#064e3b" : "#374151";
}

function AnimatedNum({ target, symbol }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts-start)/1800, 1);
      const e = 1-Math.pow(1-p,3);
      setDisplay(Math.round(e*target));
      if (p<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{symbol}{display.toLocaleString()}</>;
}

const ChartTip = ({ active, payload, label }) => {
  const { fmtK } = useFmt();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
      <div style={{ color:"#8a8fa8", fontSize:10, marginBottom:4, fontWeight:600, textTransform:"uppercase" }}>Year {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:p.color, fontWeight:600 }}>{p.name}: {fmtK(p.value)}</div>
      ))}
    </div>
  );
};
/* ─── Global styles ────────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html { scroll-behavior:smooth; }
    body { background:#f7f4ef; font-family:'DM Sans',sans-serif; color:#0f1117; overflow-x:hidden; }
    :root {
      --ink:#0f1117; --ink2:#3d4152; --ink3:#8a8fa8; --ink4:#c5c9d6;
      --cream:#f7f4ef; --cream2:#eeead8; --card:#ffffff;
      --emerald:#0d7a55; --emerald2:#0a6347; --emerald-l:#e6f4ee;
      --gold:#c8960c; --gold-l:#fdf6e3;
      --red:#c0392b; --red-l:#fde8e8;
      --blue:#1565c0; --blue-l:#e3f2fd;
      --border:#e0dbd0;
      --serif:'Playfair Display',Georgia,serif;
      --sans:'DM Sans',system-ui,sans-serif;
      --shadow:0 1px 3px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);
      --shadow-lg:0 4px 6px rgba(0,0,0,0.05),0 24px 64px rgba(0,0,0,0.12);
    }

    /* Nav */
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; background:rgba(247,244,239,0.93); backdrop-filter:blur(12px); border-bottom:1px solid var(--border); padding:0 32px; height:64px; display:flex; align-items:center; justify-content:space-between; }
    .nav-logo { font-family:var(--serif); font-size:22px; color:var(--ink); font-weight:700; letter-spacing:-0.5px; cursor:pointer; }
    .nav-logo span { color:var(--emerald); }
    .nav-links { display:flex; align-items:center; gap:28px; }
    .nav-link { font-size:14px; color:var(--ink2); cursor:pointer; transition:color 0.15s; font-weight:500; }
    .nav-link:hover { color:var(--emerald); }
    .nav-cta { background:var(--ink); color:#fff; padding:9px 20px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; border:none; font-family:var(--sans); transition:background 0.15s; }
    .nav-cta:hover { background:var(--emerald); }

    /* Landing hero */
    .hero { min-height:100vh; padding:120px 32px 80px; display:flex; align-items:center; max-width:1200px; margin:0 auto; gap:64px; }
    .hero-left { flex:1; min-width:0; }
    .hero-eyebrow { display:inline-flex; align-items:center; gap:8px; background:var(--emerald-l); color:var(--emerald); font-size:12px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; padding:5px 12px; border-radius:4px; margin-bottom:24px; }
    .hero-eyebrow::before { content:''; width:6px; height:6px; background:var(--emerald); border-radius:50%; }
    .hero-h1 { font-family:var(--serif); font-size:clamp(36px,5vw,58px); line-height:1.1; letter-spacing:-1px; color:var(--ink); margin-bottom:22px; }
    .hero-h1 em { font-style:italic; color:var(--emerald); }
    .hero-sub { font-size:17px; color:var(--ink2); line-height:1.65; max-width:480px; margin-bottom:36px; }
    .hero-actions { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
    .btn-primary { background:var(--emerald); color:#fff; padding:14px 28px; border-radius:7px; font-size:15px; font-weight:600; cursor:pointer; border:none; font-family:var(--sans); transition:all 0.15s; }
    .btn-primary:hover { background:var(--emerald2); transform:translateY(-1px); box-shadow:0 8px 24px rgba(13,122,85,0.3); }
    .btn-secondary { background:transparent; color:var(--ink); padding:14px 24px; border-radius:7px; font-size:15px; font-weight:500; cursor:pointer; border:1.5px solid var(--border); font-family:var(--sans); transition:all 0.15s; }
    .btn-secondary:hover { border-color:var(--ink); background:var(--cream2); }

    /* Section */
    .section { padding:96px 32px; }
    .section-inner { max-width:1200px; margin:0 auto; }
    .section-label { font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:var(--emerald); margin-bottom:14px; }
    .section-h2 { font-family:var(--serif); font-size:clamp(28px,4vw,44px); line-height:1.15; letter-spacing:-0.5px; color:var(--ink); margin-bottom:16px; }
    .section-h2 em { font-style:italic; color:var(--emerald); }
    .section-sub { font-size:16px; color:var(--ink2); line-height:1.6; max-width:520px; }

    /* Features dark section */
    .features-bg { background:var(--ink); }
    .features-bg .section-label { color:#7dd3b0; }
    .features-bg .section-h2 { color:#fff; }
    .features-bg .section-h2 em { color:#7dd3b0; }
    .features-bg .section-sub { color:#9ca3b8; }
    .features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:#1e2233; margin-top:48px; border-radius:12px; overflow:hidden; }
    .feature-cell { background:#141827; padding:28px; transition:background 0.2s; }
    .feature-cell:hover { background:#1a2135; }
    .feature-num { font-family:var(--serif); font-size:34px; color:#2a3350; font-weight:700; margin-bottom:14px; }
    .feature-title { font-family:var(--serif); font-size:18px; color:#fff; margin-bottom:10px; }
    .feature-text { font-size:13px; color:#7a84a0; line-height:1.6; }
    .feature-tag { display:inline-block; margin-top:12px; background:#1e2a1a; color:#5cb88a; font-size:10px; font-weight:700; letter-spacing:0.6px; padding:3px 8px; border-radius:3px; text-transform:uppercase; }

    /* CTA banner */
    .cta-banner { background:var(--emerald); padding:80px 32px; text-align:center; }
    .cta-banner h2 { font-family:var(--serif); font-size:40px; color:#fff; margin-bottom:16px; }
    .cta-banner p { font-size:16px; color:rgba(255,255,255,0.8); margin-bottom:32px; }
    .btn-cta-white { background:#fff; color:var(--emerald); padding:16px 36px; border-radius:8px; font-size:15px; font-weight:700; cursor:pointer; border:none; font-family:var(--sans); transition:all 0.15s; display:inline-flex; align-items:center; gap:8px; }
    .btn-cta-white:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(0,0,0,0.2); }

    /* Footer */
    .footer { background:var(--ink); padding:48px 32px 32px; }
    .footer-inner { max-width:1200px; margin:0 auto; }
    .footer-logo { font-family:var(--serif); font-size:20px; color:#fff; margin-bottom:10px; }
    .footer-logo span { color:#7dd3b0; }
    .footer-tagline { font-size:13px; color:#6b7280; max-width:220px; line-height:1.5; }
    .footer-links h4 { font-size:12px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#6b7280; margin-bottom:14px; }
    .footer-links a { display:block; font-size:13px; color:#9ca3af; margin-bottom:8px; cursor:pointer; transition:color 0.15s; }
    .footer-links a:hover { color:#fff; }
    .footer-bottom { border-top:1px solid #1e2233; padding-top:24px; display:flex; justify-content:space-between; }
    .footer-copy { font-size:12px; color:#4b5563; }

    /* Auth */
    .auth-wrap { min-height:100vh; display:flex; background:var(--cream); }
    .auth-left { flex:1; background:var(--ink); display:flex; flex-direction:column; justify-content:center; align-items:center; padding:60px; position:relative; overflow:hidden; }
    .auth-left::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 30% 50%,rgba(13,122,85,0.25) 0%,transparent 70%); }
    .auth-left-content { position:relative; z-index:1; max-width:400px; }
    .auth-brand { font-family:var(--serif); font-size:28px; color:#fff; margin-bottom:40px; }
    .auth-brand span { color:#7dd3b0; }
    .auth-tagline { font-family:var(--serif); font-size:34px; color:#fff; line-height:1.2; margin-bottom:20px; letter-spacing:-0.5px; }
    .auth-tagline em { color:#7dd3b0; font-style:italic; }
    .auth-sub { font-size:15px; color:#9ca3b8; line-height:1.6; margin-bottom:32px; }
    .auth-features { display:flex; flex-direction:column; gap:12px; }
    .auth-feature { display:flex; align-items:center; gap:12px; }
    .auth-feature-icon { width:30px; height:30px; border-radius:8px; background:rgba(13,122,85,0.2); display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
    .auth-feature-text { font-size:13px; color:#9ca3b8; }
    .auth-feature-text strong { color:#e2e8f0; }
    .auth-right { width:480px; flex-shrink:0; display:flex; flex-direction:column; justify-content:center; padding:60px 48px; background:#fff; overflow-y:auto; }
    .auth-form-logo { font-family:var(--serif); font-size:20px; color:var(--ink); margin-bottom:32px; display:flex; align-items:center; gap:8px; }
    .auth-form-logo span { color:var(--emerald); }
    .auth-form-logo-dot { width:8px; height:8px; border-radius:50%; background:var(--emerald); }
    .auth-title { font-family:var(--serif); font-size:28px; color:var(--ink); margin-bottom:6px; }
    .auth-title-sub { font-size:14px; color:var(--ink3); margin-bottom:28px; }
    .auth-field { margin-bottom:14px; }
    .auth-field label { display:block; font-size:12px; font-weight:600; color:var(--ink2); margin-bottom:5px; }
    .auth-input { width:100%; padding:11px 14px; border:1.5px solid var(--border); border-radius:8px; font-family:var(--sans); font-size:14px; color:var(--ink); background:var(--cream); outline:none; transition:border-color 0.15s; }
    .auth-input:focus { border-color:var(--emerald); background:#fff; }
    .auth-input.error { border-color:var(--red); }
    .auth-btn { width:100%; padding:13px; background:var(--emerald); color:#fff; border:none; border-radius:8px; font-family:var(--sans); font-size:15px; font-weight:600; cursor:pointer; transition:all 0.15s; margin-top:6px; display:flex; align-items:center; justify-content:center; }
    .auth-btn:hover:not(:disabled) { background:var(--emerald2); transform:translateY(-1px); }
    .auth-btn:disabled { opacity:0.6; cursor:not-allowed; }
    .auth-btn.loading::after { content:''; width:16px; height:16px; border:2px solid rgba(255,255,255,0.4); border-top-color:#fff; border-radius:50%; animation:spin 0.6s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .auth-divider { display:flex; align-items:center; gap:12px; margin:18px 0; }
    .auth-divider::before,.auth-divider::after { content:''; flex:1; height:1px; background:var(--border); }
    .auth-divider-text { font-size:12px; color:var(--ink3); }
    .auth-switch { text-align:center; font-size:13px; color:var(--ink3); margin-top:18px; }
    .auth-switch a { color:var(--emerald); font-weight:600; cursor:pointer; }
    .auth-error { background:var(--red-l); border:1px solid #fca5a5; border-radius:7px; padding:10px 14px; font-size:13px; color:#b91c1c; margin-bottom:14px; }
    .auth-success { background:var(--emerald-l); border:1px solid #86efac; border-radius:7px; padding:10px 14px; font-size:13px; color:var(--emerald); margin-bottom:14px; }
    .auth-password-wrap { position:relative; }
    .auth-password-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--ink3); font-size:13px; }
    .auth-terms { font-size:11px; color:var(--ink3); text-align:center; margin-top:12px; }
    .auth-terms a { color:var(--emerald); cursor:pointer; }

    /* Dashboard */
    .dash-wrap { min-height:100vh; background:var(--cream); }
    .dash-topbar { background:#fff; border-bottom:1px solid var(--border); height:64px; display:flex; align-items:center; padding:0 28px; gap:12px; position:sticky; top:0; z-index:50; }
    .dash-logo { font-family:var(--serif); font-size:20px; color:var(--ink); cursor:pointer; }
    .dash-logo span { color:var(--emerald); }
    .dash-body { max-width:1140px; margin:0 auto; padding:32px 24px; }
    .dash-greeting { font-family:var(--serif); font-size:26px; color:var(--ink); margin-bottom:4px; }
    .dash-greeting-sub { font-size:14px; color:var(--ink3); }
    .dash-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
    .dash-stat { background:#fff; border:1px solid var(--border); border-radius:10px; padding:16px 18px; }
    .dash-stat-label { font-size:11px; font-weight:600; letter-spacing:0.6px; text-transform:uppercase; color:var(--ink3); margin-bottom:5px; }
    .dash-stat-value { font-family:var(--serif); font-size:24px; color:var(--ink); }
    .dash-stat-value.green { color:var(--emerald); }
    .dash-new-btn { background:var(--emerald); color:#fff; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; font-family:var(--sans); transition:all 0.15s; display:flex; align-items:center; gap:6px; }
    .dash-new-btn:hover { background:var(--emerald2); }
    .projects-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    .project-card { background:#fff; border:1.5px solid var(--border); border-radius:12px; padding:20px; cursor:pointer; transition:all 0.15s; position:relative; overflow:hidden; }
    .project-card:hover { border-color:var(--emerald); transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.08); }
    .project-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--emerald); opacity:0; transition:opacity 0.15s; }
    .project-card:hover::before { opacity:1; }
    .project-card-name { font-family:var(--serif); font-size:15px; color:var(--ink); margin-bottom:3px; font-weight:600; }
    .project-card-date { font-size:11px; color:var(--ink3); margin-bottom:12px; }
    .project-card-kpis { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:12px; }
    .project-card-kpi { background:var(--cream); border-radius:6px; padding:7px 9px; }
    .project-card-kpi-val { font-size:14px; font-weight:700; color:var(--emerald); }
    .project-card-kpi-lbl { font-size:10px; color:var(--ink3); text-transform:uppercase; letter-spacing:0.4px; }
    .project-card-footer { display:flex; align-items:center; justify-content:space-between; }
    .project-card-tag { font-size:10px; font-weight:700; letter-spacing:0.5px; padding:2px 7px; border-radius:3px; text-transform:uppercase; }
    .tag-active { background:var(--emerald-l); color:var(--emerald); }
    .tag-draft  { background:var(--cream2); color:var(--ink3); }
    .project-action-btn { background:none; border:1px solid var(--border); border-radius:5px; padding:3px 7px; font-size:11px; cursor:pointer; font-family:var(--sans); color:var(--ink2); transition:all 0.15s; }
    .project-action-btn:hover { border-color:var(--ink); }
    .project-action-btn.del:hover { border-color:var(--red); color:var(--red); background:var(--red-l); }
    .project-new-card { background:var(--cream); border:2px dashed var(--border); border-radius:12px; padding:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:all 0.15s; min-height:170px; gap:8px; }
    .project-new-card:hover { border-color:var(--emerald); background:var(--emerald-l); }
    .project-new-icon { font-size:26px; }
    .project-new-text { font-size:13px; font-weight:600; color:var(--ink3); }
    .project-new-card:hover .project-new-text { color:var(--emerald); }

    /* App screen */
    .app-screen { min-height:100vh; background:var(--cream); padding-top:108px; }
    .app-topbar { position:fixed; top:0; left:0; right:0; z-index:100; background:#fff; border-bottom:1px solid var(--border); height:56px; display:flex; align-items:center; padding:0 20px; gap:10px; }
    .app-logo { font-family:var(--serif); font-size:17px; }
    .app-logo span { color:var(--emerald); }
    .app-tabs { position:fixed; top:56px; left:0; right:0; z-index:99; background:#fff; border-bottom:1px solid var(--border); display:flex; padding:0 20px; overflow-x:auto; scrollbar-width:none; }
    .app-tabs::-webkit-scrollbar { display:none; }
    .app-tab { padding:10px 16px; font-size:12px; font-weight:500; color:var(--ink3); cursor:pointer; border-bottom:2px solid transparent; white-space:nowrap; transition:all 0.15s; border:none; background:none; font-family:var(--sans); flex-shrink:0; }
    .app-tab.active { color:var(--emerald); border-bottom-color:var(--emerald); }
    .app-tab:hover:not(.active) { color:var(--ink); }
    .app-body { max-width:1100px; margin:0 auto; padding:24px 20px; }

    /* Cards */
    .acard { background:#fff; border:1px solid var(--border); border-radius:12px; overflow:hidden; margin-bottom:18px; }
    .acard-header { padding:14px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
    .acard-title { font-size:12px; font-weight:700; color:var(--ink); text-transform:uppercase; letter-spacing:0.5px; }
    .acard-sub { font-size:11px; color:var(--ink3); }
    .acard-body { padding:18px; }

    /* KPI grid */
    .kpi-bar { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:18px; }
    .kpi-box { background:#fff; border:1px solid var(--border); border-radius:10px; padding:16px 18px; }
    .kpi-box-label { font-size:10px; font-weight:600; letter-spacing:0.6px; text-transform:uppercase; color:var(--ink3); margin-bottom:5px; }
    .kpi-box-value { font-family:var(--serif); font-size:24px; color:var(--ink); letter-spacing:-0.5px; }
    .kpi-box-value.green { color:var(--emerald); }
    .kpi-box-value.red   { color:var(--red); }
    .kpi-box-value.gold  { color:var(--gold); }
    .kpi-badge { display:inline-flex; align-items:center; gap:3px; margin-top:4px; font-size:10px; font-weight:600; padding:2px 7px; border-radius:3px; }
    .kpi-badge.good { background:var(--emerald-l); color:var(--emerald); }
    .kpi-badge.bad  { background:var(--red-l); color:var(--red); }
    .kpi-badge.warn { background:var(--gold-l); color:var(--gold); }

    /* Input */
    .input-group { display:flex; flex-direction:column; gap:4px; }
    .input-label { font-size:11px; font-weight:600; color:var(--ink2); }
    .input-row-app { display:flex; align-items:center; background:var(--cream); border:1.5px solid var(--border); border-radius:7px; overflow:hidden; transition:border-color 0.15s; }
    .input-row-app:focus-within { border-color:var(--emerald); }
    .input-prefix,.input-suffix { padding:0 9px; font-size:12px; color:var(--ink3); background:var(--cream2); border-right:1px solid var(--border); height:36px; display:flex; align-items:center; flex-shrink:0; }
    .input-suffix { border-right:none; border-left:1px solid var(--border); }
    .input-field-app { flex:1; background:none; border:none; outline:none; font-family:var(--sans); font-size:13px; font-weight:500; color:#0000FF; padding:0 10px; height:36px; text-align:right; min-width:0; }
    .select-app { flex:1; background:none; border:none; outline:none; font-family:var(--sans); font-size:13px; color:var(--ink); padding:0 10px; height:36px; cursor:pointer; }
    .input-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .input-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }

    /* Table */
    .data-table { width:100%; border-collapse:collapse; font-size:12px; }
    .data-table th { background:var(--cream); color:var(--ink2); font-size:10px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; padding:8px 12px; text-align:right; border-bottom:1.5px solid var(--border); }
    .data-table th:first-child { text-align:left; }
    .data-table td { padding:8px 12px; text-align:right; border-bottom:1px solid var(--border); color:var(--ink); font-variant-numeric:tabular-nums; }
    .data-table td:first-child { text-align:left; font-weight:500; }
    .data-table tr:last-child td { border-bottom:none; }
    .data-table tr:hover td { background:var(--cream); }
    .data-table .total-row td { background:var(--emerald-l); color:var(--emerald); font-weight:700; border-top:2px solid var(--emerald); }

    /* Phase badge */
    .phase-construction { background:#fff3e0; color:#e65100; font-size:9px; font-weight:700; padding:1px 5px; border-radius:3px; text-transform:uppercase; }
    .phase-operation { background:var(--emerald-l); color:var(--emerald); font-size:9px; font-weight:700; padding:1px 5px; border-radius:3px; text-transform:uppercase; }

    /* Heat map */
    .heat-wrap { overflow-x:auto; }
    .heat-table { border-collapse:collapse; font-size:11px; }
    .heat-table th { background:var(--cream2); color:var(--ink2); padding:6px 10px; border:1px solid var(--border); font-size:10px; text-align:center; white-space:nowrap; }
    .heat-table td { padding:6px 8px; border:1px solid var(--border); text-align:center; white-space:nowrap; }
    .heat-base { outline:2px solid var(--emerald); outline-offset:-2px; font-weight:700; }

    /* Scenario pill */
    .scenario-pills { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
    .scenario-pill { padding:6px 16px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid var(--border); background:#fff; color:var(--ink2); transition:all 0.15s; font-family:var(--sans); }
    .scenario-pill.active { background:var(--emerald); color:#fff; border-color:var(--emerald); }

    /* Modal */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; }
    .modal-box { background:#fff; border-radius:14px; padding:26px; width:100%; max-width:440px; box-shadow:0 24px 64px rgba(0,0,0,0.2); }
    .modal-title { font-family:var(--serif); font-size:22px; color:var(--ink); margin-bottom:5px; }
    .modal-sub { font-size:13px; color:var(--ink3); margin-bottom:20px; }
    .modal-actions { display:flex; gap:10px; margin-top:20px; }
    .modal-cancel { flex:1; padding:10px; border:1.5px solid var(--border); border-radius:7px; background:none; font-family:var(--sans); font-size:13px; cursor:pointer; }
    .modal-confirm { flex:1; padding:10px; background:var(--emerald); border:none; border-radius:7px; font-family:var(--sans); font-size:13px; font-weight:600; cursor:pointer; color:#fff; }

    /* Tab pills */
    .tab-pills { display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap; }
    .tab-pill { padding:6px 14px; border-radius:20px; font-size:12px; font-weight:500; cursor:pointer; border:1.5px solid var(--border); background:#fff; color:var(--ink2); transition:all 0.15s; font-family:var(--sans); }
    .tab-pill.active { background:var(--emerald); color:#fff; border-color:var(--emerald); font-weight:700; }

    /* CAPEX row */
    .capex-row { display:grid; grid-template-columns:180px repeat(7,80px) 90px 80px 100px 28px; gap:4px; align-items:center; padding:5px 0; border-bottom:1px solid var(--border); }
    .capex-row:last-child { border-bottom:none; }
    .capex-input { width:100%; padding:4px 6px; border:1px solid var(--border); border-radius:4px; font-size:11px; font-family:var(--sans); text-align:right; background:var(--cream); color:#0000FF; outline:none; }
    .capex-input:focus { border-color:var(--emerald); }

    /* Print */
    @media print {
      .app-topbar,.app-tabs,.no-print { display:none !important; }
      .app-screen { padding-top:0 !important; }
      .app-body { padding:0 !important; max-width:100% !important; }
      .acard { break-inside:avoid; box-shadow:none !important; border:1px solid #ddd !important; }
      body { background:white !important; }
      @page { margin:15mm; size:A4; }
      .print-header { display:block !important; }
    }
    .print-header { display:none; }

    /* Animations */
    @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    .fade-up   { animation:fadeUp 0.35s ease both; }
    .fade-up-1 { animation-delay:0.07s; }
    .fade-up-2 { animation-delay:0.14s; }
    .fade-up-3 { animation-delay:0.21s; }
    .live-dot  { width:7px; height:7px; border-radius:50%; background:var(--emerald); display:inline-block; animation:pulse 2s infinite; }

    @media (max-width:900px) {
      .auth-left { display:none; }
      .auth-right { width:100%; padding:36px 24px; }
      .hero { flex-direction:column; padding:100px 20px 60px; gap:36px; }
      .features-grid,.projects-grid { grid-template-columns:1fr; }
      .kpi-bar,.dash-stats { grid-template-columns:1fr 1fr; }
      .input-grid-2,.input-grid-3 { grid-template-columns:1fr; }
      .nav-links { display:none; }
    }
  `}</style>
);
/* ─── Main App ─────────────────────────────────────────────────────── */
export default function App() {
  const [screen, setScreen]             = useState("landing");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [session, setSession]           = useState(null);
  const [projects, setProjects]         = useState([]);
  const [projLoading, setProjLoading]   = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [showNewModal, setShowNewModal]   = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const cur = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

  useEffect(() => {
    const urlSession = parseSessionFromURL();
    if (urlSession?.access_token) {
      sb.auth.getUser(urlSession.access_token).then(user => {
        if (user?.id) {
          const sess = { access_token:urlSession.access_token, user:{ id:user.id, email:user.email, name:user.user_metadata?.full_name||user.email.split('@')[0] } };
          setSession(sess); localStorage.setItem('ciq_session',JSON.stringify(sess)); setScreen("dashboard");
        }
      }); return;
    }
    const stored = localStorage.getItem('ciq_session');
    if (stored) {
      try {
        const sess = JSON.parse(stored);
        sb.auth.getUser(sess.access_token).then(user => {
          if (user?.id) { setSession(sess); setScreen("dashboard"); }
          else localStorage.removeItem('ciq_session');
        });
      } catch { localStorage.removeItem('ciq_session'); }
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    setProjLoading(true);
    sb.db.getProjects(session.access_token).then(data => {
      if (Array.isArray(data)) {
        setProjects(data.map(p => ({
          id:p.id, name:p.name, status:p.status,
          npv:p.npv||0, irr:p.irr||0, finalValue:p.final_value||0,
          date:new Date(p.updated_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
          inputs:p.inputs||DEFAULT_INPUTS,
        })));
      }
      setProjLoading(false);
    });
  }, [session]);

  const handleLogin = sess => {
    setSession(sess); localStorage.setItem('ciq_session',JSON.stringify(sess)); setScreen("dashboard");
  };
  const handleLogout = async () => {
    if (session) await sb.auth.signOut(session.access_token);
    localStorage.removeItem('ciq_session'); setSession(null); setProjects([]); setScreen("landing");
  };
  const openProject = p => { setActiveProject(p); setScreen("app"); };

  const createProject = async () => {
    if (!newProjectName.trim()||!session) return;
    const data = { user_id:session.user.id, name:newProjectName.trim(), inputs:DEFAULT_INPUTS, npv:0, irr:0, final_value:0, status:"draft" };
    const created = await sb.db.createProject(session.access_token, data);
    if (created?.id) {
      const proj = { id:created.id, name:created.name, status:"draft", npv:0, irr:0, finalValue:0, date:"Just now", inputs:DEFAULT_INPUTS };
      setProjects(p=>[proj,...p]); setNewProjectName(""); setShowNewModal(false); openProject(proj);
    }
  };

  const deleteProject = async id => {
    if (!session) return;
    await sb.db.deleteProject(session.access_token, id);
    setProjects(p=>p.filter(pr=>pr.id!==id));
  };

  const saveProject = async (id, updatedInputs, updatedTotals) => {
    if (!session) return;
    const data = { inputs:updatedInputs, npv:updatedTotals.npv, irr:updatedTotals.irr?updatedTotals.irr*100:0, final_value:updatedTotals.totalCapex||0, status:"active" };
    await sb.db.updateProject(session.access_token, id, data);
    setProjects(p=>p.map(pr=>pr.id===id?{...pr,...data,finalValue:data.final_value,date:"Just now"}:pr));
  };

  return (
    <CurrencyCtx.Provider value={cur}>
      <GlobalStyles />
      {screen==="landing"   && <LandingPage onLaunch={()=>setScreen("login")} onDashboard={session?()=>setScreen("dashboard"):null} />}
      {screen==="login"     && <LoginPage  onLogin={handleLogin} onSignup={()=>setScreen("signup")} onForgot={()=>setScreen("forgot")} onBack={()=>setScreen("landing")} />}
      {screen==="signup"    && <SignupPage onLogin={handleLogin} onSignin={()=>setScreen("login")} onBack={()=>setScreen("landing")} />}
      {screen==="forgot"    && <ForgotPage onBack={()=>setScreen("login")} />}
      {screen==="dashboard" && <Dashboard session={session} projects={projects} loading={projLoading} onOpen={openProject} onDelete={deleteProject} onLogout={handleLogout} onNew={()=>setShowNewModal(true)} currencyCode={currencyCode} setCurrencyCode={setCurrencyCode} onProfile={()=>setScreen("profile")} onHome={()=>setScreen("landing")} />}
      {screen==="app"       && <AppScreen onBack={()=>setScreen("dashboard")} currencyCode={currencyCode} setCurrencyCode={setCurrencyCode} project={activeProject} onSave={saveProject} session={session} onShowProfile={()=>setScreen("profile")} />}
      {screen==="profile"   && <ProfilePage session={session} onBack={()=>setScreen(activeProject?"app":"dashboard")} onLogout={handleLogout} />}
      {showNewModal && (
        <div className="modal-overlay" onClick={()=>setShowNewModal(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">New Project</div>
            <div className="modal-sub">Give your investment analysis a name.</div>
            <div className="auth-field">
              <label>Project Name</label>
              <input className="auth-input" placeholder="e.g. Hotel Construction 2025" value={newProjectName}
                onChange={e=>setNewProjectName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createProject()} autoFocus />
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={()=>setShowNewModal(false)}>Cancel</button>
              <button className="modal-confirm" onClick={createProject}>Create Project →</button>
            </div>
          </div>
        </div>
      )}
    </CurrencyCtx.Provider>
  );
}

/* ─── Login Page ───────────────────────────────────────────────────── */
function LoginPage({ onLogin, onSignup, onForgot, onBack }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!email||!password) { setError("Please fill in all fields."); return; }
    if (!email.includes("@")) { setError("Invalid email address."); return; }
    if (password.length<6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const data = await sb.auth.signIn({ email, password });
    setLoading(false);
    if (data.error||!data.access_token) { setError(data.error?.message||data.msg||"Invalid email or password."); return; }
    const user = await sb.auth.getUser(data.access_token);
    onLogin({ access_token:data.access_token, user:{ id:user.id, email:user.email, name:user.user_metadata?.full_name||user.email.split('@')[0] } });
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">Capital<span>IQ</span></div>
          <div className="auth-tagline">Professional investment analysis.<br /><em>For every business.</em></div>
          <div className="auth-sub">DCF valuation, scenario planning, sensitivity analysis and board-ready reports — in minutes.</div>
          <div className="auth-features">
            {[["📊","Unlimited projects","Save and revisit any analysis"],["🔄","Sync everywhere","Access from any device"],["📄","PDF reports","Board-ready in one click"],["🔒","Bank-grade security","Your data is encrypted"]].map(([i,t,d])=>(
              <div className="auth-feature" key={t}><div className="auth-feature-icon">{i}</div><div className="auth-feature-text"><strong>{t}</strong> — {d}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-logo"><div className="auth-form-logo-dot"/>Capital<span>IQ</span></div>
        <div className="auth-title">Welcome back</div>
        <div className="auth-title-sub">Sign in to your account to continue</div>
        {error && <div className="auth-error">⚠ {error}</div>}
        <div className="auth-field"><label>Email address</label>
          <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} /></div>
        <div className="auth-field">
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <label style={{margin:0}}>Password</label>
            <span onClick={onForgot} style={{fontSize:12,color:"var(--emerald)",cursor:"pointer",fontWeight:600}}>Forgot password?</span>
          </div>
          <div className="auth-password-wrap">
            <input className="auth-input" type={showPw?"text":"password"} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={{paddingRight:40}} />
            <button className="auth-password-toggle" onClick={()=>setShowPw(p=>!p)}>{showPw?"Hide":"Show"}</button>
          </div>
        </div>
        <button className={`auth-btn ${loading?"loading":""}`} onClick={submit} disabled={loading}>{loading?"":"Sign in →"}</button>
        <div className="auth-switch">Don't have an account? <a onClick={onSignup}>Create one free →</a></div>
        <div className="auth-switch" style={{marginTop:8}}><a onClick={onBack} style={{color:"var(--ink3)"}}>← Back to home</a></div>
      </div>
    </div>
  );
}

/* ─── Signup Page ──────────────────────────────────────────────────── */
function SignupPage({ onLogin, onSignin, onBack }) {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState(""); const [showPw,setShowPw]=useState(false);
  const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [success,setSuccess]=useState(false);
  const strength = !password.length?0:password.length<6?1:password.length<10?2:/[A-Z]/.test(password)&&/[0-9]/.test(password)?4:3;
  const sLabel=["","Weak","Fair","Good","Strong"]; const sColor=["","var(--red)","var(--gold)","var(--emerald)","var(--emerald)"];

  const submit = async () => {
    setError("");
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.includes("@")) { setError("Invalid email address."); return; }
    if (password.length<6) { setError("Password must be at least 6 characters."); return; }
    if (password!==confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const data = await sb.auth.signUp({ email, password, name:name.trim() });
    setLoading(false);
    if (data.error) { setError(data.error.message||"Sign up failed."); return; }
    if (data.access_token) { const user=await sb.auth.getUser(data.access_token); onLogin({ access_token:data.access_token, user:{ id:user.id, email:user.email, name:name.trim() } }); }
    else setSuccess(true);
  };

  if (success) return (
    <div className="auth-wrap" style={{justifyContent:"center"}}>
      <div className="auth-right" style={{width:"100%",maxWidth:480}}>
        <div className="auth-form-logo"><div className="auth-form-logo-dot"/>Capital<span>IQ</span></div>
        <div className="auth-success">✓ Check your email for a confirmation link sent to <strong>{email}</strong>.</div>
        <button className="auth-btn" onClick={onSignin} style={{marginTop:16}}>Back to sign in →</button>
      </div>
    </div>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">Capital<span>IQ</span></div>
          <div className="auth-tagline">Start making<br /><em>smarter decisions</em><br />today.</div>
          <div className="auth-sub">Join businesses using CapitalIQ for professional investment appraisal.</div>
          <div className="auth-features">
            {[["🆓","Free to start","No credit card required"],["⚡","60-second setup","Analyse immediately"],["🔒","Secure","Encrypted, never shared"],["📈","Professional","Goldman Sachs-standard DCF"]].map(([i,t,d])=>(
              <div className="auth-feature" key={t}><div className="auth-feature-icon">{i}</div><div className="auth-feature-text"><strong>{t}</strong> — {d}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-logo"><div className="auth-form-logo-dot"/>Capital<span>IQ</span></div>
        <div className="auth-title">Create your account</div>
        <div className="auth-title-sub">Free on your first project</div>
        {error && <div className="auth-error">⚠ {error}</div>}
        <div className="auth-field"><label>Full name</label><input className="auth-input" type="text" placeholder="Your Name" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="auth-field"><label>Email</label><input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div className="auth-field">
          <label>Password</label>
          <div className="auth-password-wrap">
            <input className="auth-input" type={showPw?"text":"password"} placeholder="Min. 6 characters" value={password} onChange={e=>setPassword(e.target.value)} style={{paddingRight:40}} />
            <button className="auth-password-toggle" onClick={()=>setShowPw(p=>!p)}>{showPw?"Hide":"Show"}</button>
          </div>
          {password.length>0&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:5}}>
            <div style={{flex:1,height:3,borderRadius:99,background:"var(--border)",overflow:"hidden"}}><div style={{width:`${(strength/4)*100}%`,height:"100%",background:sColor[strength],borderRadius:99,transition:"all 0.3s"}} /></div>
            <span style={{fontSize:11,color:sColor[strength],fontWeight:600}}>{sLabel[strength]}</span>
          </div>}
        </div>
        <div className="auth-field">
          <label>Confirm password</label>
          <input className={`auth-input ${confirm&&confirm!==password?"error":""}`} type={showPw?"text":"password"} placeholder="Repeat password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
          {confirm&&confirm!==password&&<div style={{fontSize:11,color:"var(--red)",marginTop:3}}>Passwords don't match</div>}
        </div>
        <button className={`auth-btn ${loading?"loading":""}`} onClick={submit} disabled={loading}>{loading?"":"Create free account →"}</button>
        <div className="auth-terms">By signing up you agree to our <a>Terms</a> and <a>Privacy Policy</a></div>
        <div className="auth-switch">Already have an account? <a onClick={onSignin}>Sign in →</a></div>
      </div>
    </div>
  );
}

/* ─── Forgot Password ──────────────────────────────────────────────── */
function ForgotPage({ onBack }) {
  const [email,setEmail]=useState(""); const [loading,setLoading]=useState(false);
  const [sent,setSent]=useState(false); const [error,setError]=useState("");
  const submit = async () => {
    if (!email.includes("@")) { setError("Please enter a valid email."); return; }
    setLoading(true); await sb.auth.resetPassword(email); setLoading(false); setSent(true);
  };
  return (
    <div className="auth-wrap">
      <div className="auth-left"><div className="auth-left-content">
        <div className="auth-brand">Capital<span>IQ</span></div>
        <div className="auth-tagline">We'll get you<br /><em>back in</em><br />quickly.</div>
        <div className="auth-sub">Enter your email and we'll send a secure reset link.</div>
      </div></div>
      <div className="auth-right">
        <div className="auth-form-logo"><div className="auth-form-logo-dot"/>Capital<span>IQ</span></div>
        <div className="auth-title">Reset password</div>
        <div className="auth-title-sub">We'll email you a reset link</div>
        {sent ? (<>
          <div className="auth-success">✓ Reset link sent! Check your inbox and spam folder.</div>
          <button className="auth-btn" onClick={onBack} style={{marginTop:14}}>Back to sign in →</button>
        </>) : (<>
          {error&&<div className="auth-error">⚠ {error}</div>}
          <div className="auth-field"><label>Email address</label>
            <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoFocus /></div>
          <button className={`auth-btn ${loading?"loading":""}`} onClick={submit} disabled={loading}>{loading?"":"Send reset link →"}</button>
          <div className="auth-switch"><a onClick={onBack}>← Back to sign in</a></div>
        </>)}
      </div>
    </div>
  );
}

/* ─── Dashboard ────────────────────────────────────────────────────── */
function Dashboard({ session, projects, loading, onOpen, onDelete, onLogout, onNew, currencyCode, setCurrencyCode, onProfile, onHome }) {
  const { fmtK } = useFmt();
  const user = session?.user||{};
  const initials = user.name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"U";
  const totalNPV = projects.reduce((s,p)=>s+(p.npv||0),0);
  const profitable = projects.filter(p=>p.npv>0).length;
  const avgIRR = projects.length ? projects.reduce((s,p)=>s+(p.irr||0),0)/projects.length : 0;

  return (
    <div className="dash-wrap">
      <div className="dash-topbar">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div className="dash-logo" onClick={onHome}>Capital<span>IQ</span></div>
          <button onClick={onHome} style={{fontSize:11,color:"var(--ink3)",background:"none",border:"1px solid var(--border)",borderRadius:5,padding:"3px 9px",cursor:"pointer",fontFamily:"var(--sans)"}}>🏠 Home</button>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <select value={currencyCode} onChange={e=>setCurrencyCode(e.target.value)}
            style={{background:"var(--cream)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 7px",fontSize:12,fontWeight:600,color:"var(--emerald)",fontFamily:"var(--sans)",cursor:"pointer",outline:"none"}}>
            {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
          </select>
          <button onClick={onProfile}
            style={{display:"flex",alignItems:"center",gap:8,background:"var(--cream)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 12px 5px 5px",cursor:"pointer",fontFamily:"var(--sans)",transition:"all 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--emerald)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"var(--emerald-l)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"var(--emerald)"}}>{initials}</div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>{user.name||"Account"}</div>
              <div style={{fontSize:10,color:"var(--ink3)"}}>View profile</div>
            </div>
          </button>
          <button style={{fontSize:12,color:"var(--red)",background:"none",border:"1px solid #fca5a5",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontFamily:"var(--sans)"}} onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <div className="dash-body">
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <div className="dash-greeting">Good day, {user.name?.split(" ")[0]||"there"} 👋</div>
            <div className="dash-greeting-sub">{loading?"Loading...":projects.length===0?"No projects yet — create your first below":`${projects.length} investment ${projects.length===1?"project":"projects"}`}</div>
          </div>
          <button className="dash-new-btn" onClick={onNew}>+ New Project</button>
        </div>

        {projects.length>0 && (
          <div className="dash-stats">
            {[
              {label:"Total Projects",value:projects.length,cls:""},
              {label:"Total NPV",value:fmtK(totalNPV),cls:totalNPV>=0?"green":""},
              {label:"Profitable",value:`${profitable}/${projects.length}`,cls:profitable>0?"green":""},
              {label:"Avg IRR",value:pct(avgIRR),cls:""},
            ].map(s=>(
              <div className="dash-stat" key={s.label}>
                <div className="dash-stat-label">{s.label}</div>
                <div className={`dash-stat-value ${s.cls}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && projects.length===0 && (
          <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:16,border:"2px dashed var(--border)",marginBottom:20}}>
            <div style={{fontSize:48,marginBottom:14}}>📊</div>
            <div style={{fontFamily:"var(--serif)",fontSize:24,color:"var(--ink)",marginBottom:8}}>Welcome to CapitalIQ</div>
            <div style={{fontSize:14,color:"var(--ink2)",maxWidth:440,margin:"0 auto 24px",lineHeight:1.6}}>
              Create your first investment project to get started. Professional DCF analysis, scenario planning, sensitivity analysis and board-ready proposals — all in one place.
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
              {[["💰","DCF & NPV/IRR"],["🏗️","Construction + Operation phases"],["📊","Sensitivity heatmaps"],["📄","PDF Proposals"]].map(([i,t])=>(
                <div key={t} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:"var(--cream)",borderRadius:7,fontSize:12,color:"var(--ink2)"}}><span>{i}</span><span>{t}</span></div>
              ))}
            </div>
            <button className="dash-new-btn" onClick={onNew} style={{margin:"0 auto"}}>+ Create your first project</button>
          </div>
        )}

        {loading && <div style={{textAlign:"center",padding:"40px",color:"var(--ink3)",fontSize:14}}>Loading your projects...</div>}

        <div style={{fontSize:11,fontWeight:700,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:12}}>Your Projects</div>
        <div className="projects-grid">
          {projects.map(p => (
            <div className="project-card" key={p.id} onClick={()=>onOpen(p)}>
              <div className="project-card-name">{p.name}</div>
              <div className="project-card-date">Last edited {p.date}</div>
              <div className="project-card-kpis">
                <div className="project-card-kpi">
                  <div className="project-card-kpi-val" style={{color:p.npv>=0?"var(--emerald)":"var(--red)"}}>{fmtK(p.npv)}</div>
                  <div className="project-card-kpi-lbl">NPV</div>
                </div>
                <div className="project-card-kpi">
                  <div className="project-card-kpi-val">{pct(p.irr)}</div>
                  <div className="project-card-kpi-lbl">IRR</div>
                </div>
              </div>
              <div className="project-card-footer">
                <span className={`project-card-tag ${p.status==="active"?"tag-active":"tag-draft"}`}>{p.status}</span>
                <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
                  <button className="project-action-btn" onClick={()=>onOpen(p)}>Open</button>
                  <button className="project-action-btn del" onClick={()=>onDelete(p.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {projects.length>0 && (
            <div className="project-new-card" onClick={onNew}>
              <div className="project-new-icon">＋</div>
              <div className="project-new-text">New Project</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Profile Page ─────────────────────────────────────────────────── */
function ProfilePage({ session, onBack, onLogout }) {
  const user = session?.user||{};
  const initials = user.name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"U";
  const [newPw,setNewPw]=useState(""); const [confirmPw,setConfirmPw]=useState("");
  const [showPw,setShowPw]=useState(false); const [loading,setLoading]=useState(false);
  const [success,setSuccess]=useState(false); const [error,setError]=useState("");

  const changePw = async () => {
    setError(""); setSuccess(false);
    if (newPw.length<6) { setError("Password must be at least 6 characters."); return; }
    if (newPw!==confirmPw) { setError("Passwords do not match."); return; }
    setLoading(true);
    const data = await sb.auth.updatePassword(session.access_token, newPw);
    setLoading(false);
    if (data.error) setError(data.error.message||"Failed to update password.");
    else { setSuccess(true); setNewPw(""); setConfirmPw(""); }
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--cream)",fontFamily:"var(--sans)"}}>
      <div style={{background:"#fff",borderBottom:"1px solid var(--border)",height:56,display:"flex",alignItems:"center",padding:"0 24px",gap:14,position:"sticky",top:0,zIndex:50}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",color:"var(--ink2)",fontSize:13,fontFamily:"var(--sans)"}}>← Back</button>
        <div style={{fontFamily:"var(--serif)",fontSize:17,color:"var(--ink)"}}>Capital<span style={{color:"var(--emerald)"}}>IQ</span></div>
        <div style={{fontSize:13,color:"var(--ink3)"}}>/ My Profile</div>
      </div>
      <div style={{maxWidth:640,margin:"0 auto",padding:"36px 20px"}}>
        <div className="acard fade-up" style={{marginBottom:16}}>
          <div style={{padding:"24px",display:"flex",alignItems:"center",gap:18}}>
            <div style={{width:60,height:60,borderRadius:"50%",background:"var(--emerald-l)",border:"2px solid var(--emerald)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"var(--emerald)",flexShrink:0}}>{initials}</div>
            <div>
              <div style={{fontFamily:"var(--serif)",fontSize:20,color:"var(--ink)",marginBottom:2}}>{user.name||"My Account"}</div>
              <div style={{fontSize:13,color:"var(--ink3)"}}>{user.email}</div>
              <span style={{display:"inline-block",marginTop:5,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:3,background:"var(--emerald-l)",color:"var(--emerald)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Free Plan</span>
            </div>
          </div>
        </div>

        <div className="acard fade-up fade-up-1" style={{marginBottom:16}}>
          <div className="acard-header"><span className="acard-title">Account Details</span></div>
          <div className="acard-body" style={{padding:0}}>
            {[{l:"Full Name",v:user.name||"—"},{l:"Email",v:user.email||"—"},{l:"Account Type",v:"Email & Password"},{l:"Plan",v:"Free"}].map((r,i,arr)=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"11px 18px",borderBottom:i<arr.length-1?"1px solid var(--border)":"none"}}>
                <span style={{fontSize:13,color:"var(--ink3)",fontWeight:500}}>{r.l}</span>
                <span style={{fontSize:13,color:"var(--ink)",fontWeight:500}}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="acard fade-up fade-up-2" style={{marginBottom:16}}>
          <div className="acard-header"><span className="acard-title">Change Password</span></div>
          <div className="acard-body">
            {success && <div className="auth-success" style={{marginBottom:14}}>✓ Password updated successfully!</div>}
            {error   && <div className="auth-error"   style={{marginBottom:14}}>⚠ {error}</div>}
            <div className="auth-field"><label>New Password</label>
              <div className="auth-password-wrap">
                <input className="auth-input" type={showPw?"text":"password"} placeholder="Min. 6 characters" value={newPw} onChange={e=>setNewPw(e.target.value)} style={{paddingRight:40}} />
                <button className="auth-password-toggle" onClick={()=>setShowPw(p=>!p)}>{showPw?"Hide":"Show"}</button>
              </div>
            </div>
            <div className="auth-field"><label>Confirm New Password</label>
              <input className={`auth-input ${confirmPw&&confirmPw!==newPw?"error":""}`} type={showPw?"text":"password"} placeholder="Repeat new password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&changePw()} />
              {confirmPw&&confirmPw!==newPw&&<div style={{fontSize:11,color:"var(--red)",marginTop:3}}>Passwords don't match</div>}
            </div>
            <button className={`auth-btn ${loading?"loading":""}`} onClick={changePw} disabled={loading} style={{marginTop:4}}>{loading?"":"Update Password →"}</button>
          </div>
        </div>

        <div className="acard fade-up fade-up-3" style={{border:"1.5px solid #fca5a5"}}>
          <div className="acard-header" style={{background:"#fde8e8",borderBottom:"1px solid #fca5a5"}}><span className="acard-title" style={{color:"var(--red)"}}>⚠ Account Actions</span></div>
          <div className="acard-body">
            <p style={{fontSize:13,color:"var(--ink2)",marginBottom:14,lineHeight:1.6}}>Signing out ends your current session. You can sign back in at any time.</p>
            <button onClick={onLogout} style={{padding:"9px 18px",borderRadius:7,border:"1.5px solid var(--red)",background:"none",color:"var(--red)",fontFamily:"var(--sans)",fontSize:13,fontWeight:600,cursor:"pointer"}}>Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ─── AppScreen ────────────────────────────────────────────────────── */
const SCENARIO_PRESETS = {
  Base:   { discountRate:10, taxRate:21, inflationRate:2, constructionYears:1, operationYears:5, terminalGrowthRate:2 },
  Bull:   { discountRate:8,  taxRate:19, inflationRate:1.5, constructionYears:1, operationYears:7, terminalGrowthRate:3 },
  Bear:   { discountRate:13, taxRate:25, inflationRate:4, constructionYears:1, operationYears:5, terminalGrowthRate:1 },
  Stress: { discountRate:16, taxRate:28, inflationRate:6, constructionYears:2, operationYears:4, terminalGrowthRate:0 },
};

function AppScreen({ onBack, currencyCode, setCurrencyCode, project, onSave, session, onShowProfile }) {
  const { symbol } = useCur();
  const [appTab, setAppTab] = useState("setup");
  const [scenario, setScenario] = useState("Base");
  const [saved, setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [projectName, setProjectName] = useState(project?.name||"New Investment Project");
  const [inputs, setInputs] = useState({ ...DEFAULT_INPUTS, ...(project?.inputs||{}) });

  const setI = useCallback((k, v) => setInputs(p => ({ ...p, [k]:v })), []);

  const applyScenario = s => { setScenario(s); setInputs(p => ({ ...p, ...SCENARIO_PRESETS[s] })); };

  const { schedule, totals } = useMemo(() => calcFinancials(inputs), [inputs]);

  const handleSave = async () => {
    if (project && onSave) {
      await onSave(project.id, inputs, totals);
      setSaved(true); setTimeout(()=>setSaved(false),2500);
    }
  };

  const totalYears = clamp(inputs.constructionYears,0,5) + clamp(inputs.operationYears,1,30);

  const TABS = [
    { id:"setup",       label:"⚙ Setup" },
    { id:"capex",       label:"🏗 CAPEX" },
    { id:"revenue",     label:"📈 Revenue" },
    { id:"costs",       label:"💸 Costs" },
    { id:"workingcap",  label:"💧 Working Capital" },
    { id:"results",     label:"🏆 Results" },
    { id:"cashflow",    label:"💰 Cash Flow" },
    { id:"sensitivity", label:"🔬 Sensitivity" },
    { id:"scenarios",   label:"🎭 Scenarios" },
    { id:"proposal",    label:"📄 Proposal" },
  ];

  return (
    <div className="app-screen">
      <div className="app-topbar">
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={onBack}>
          <span style={{fontSize:16,color:"var(--ink3)"}}>←</span>
          <div className="app-logo">Capital<span>IQ</span></div>
        </div>
        <input value={projectName} onChange={e=>setProjectName(e.target.value)}
          style={{background:"var(--cream)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px",fontSize:13,color:"var(--ink)",outline:"none",flex:1,maxWidth:260}} />
        <select value={currencyCode} onChange={e=>setCurrencyCode(e.target.value)}
          style={{background:"var(--cream)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 8px",fontSize:12,fontWeight:600,color:"var(--emerald)",fontFamily:"var(--sans)",cursor:"pointer",outline:"none",minWidth:80}}>
          {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
        </select>
        <button onClick={handleSave}
          style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--sans)",border:"none",background:saved?"var(--emerald-l)":"var(--emerald)",color:saved?"var(--emerald)":"#fff",transition:"all 0.15s"}}>
          {saved?"✓ Saved":"Save"}
        </button>
        <button onClick={()=>{setAppTab("proposal");setTimeout(()=>window.print(),300)}}
          style={{padding:"6px 12px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--sans)",border:"1px solid var(--border)",background:"var(--cream)",color:"var(--ink)"}}>
          📄 PDF
        </button>
        <button onClick={onShowProfile}
          style={{width:32,height:32,borderRadius:"50%",background:"var(--emerald-l)",border:"1.5px solid var(--emerald)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"var(--emerald)",flexShrink:0}}>
          {session?.user?.name?.[0]?.toUpperCase()||"U"}
        </button>
      </div>

      <div className="app-tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`app-tab ${appTab===t.id?"active":""}`} onClick={()=>setAppTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div className="app-body">
        <div className="print-header" style={{marginBottom:14,paddingBottom:10,borderBottom:"2px solid #0d7a55"}}>
          <div style={{fontFamily:"var(--serif)",fontSize:20,color:"#0f1117"}}>CapitalIQ — Investment Report</div>
          <div style={{fontSize:12,color:"#8a8fa8",marginTop:3}}>{projectName} · {new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
        </div>

        {appTab==="setup"       && <SetupTab       inputs={inputs} setI={setI} totals={totals} schedule={schedule} />}
        {appTab==="capex"       && <CapexTab        inputs={inputs} setI={setI} totalYears={totalYears} />}
        {appTab==="revenue"     && <RevenueTab      inputs={inputs} setI={setI} schedule={schedule} />}
        {appTab==="costs"       && <CostsTab        inputs={inputs} setI={setI} schedule={schedule} />}
        {appTab==="workingcap"  && <WorkingCapTab   inputs={inputs} setI={setI} schedule={schedule} />}
        {appTab==="results"     && <ResultsTab      totals={totals} schedule={schedule} inputs={inputs} />}
        {appTab==="cashflow"    && <CashFlowTab     schedule={schedule} totals={totals} />}
        {appTab==="sensitivity" && <SensitivityTab  inputs={inputs} totals={totals} />}
        {appTab==="scenarios"   && <ScenariosTab    inputs={inputs} scenario={scenario} applyScenario={applyScenario} />}
        {appTab==="proposal"    && <ProposalTab     inputs={inputs} totals={totals} schedule={schedule} projectName={projectName} />}
      </div>
    </div>
  );
}

/* ─── Setup Tab ────────────────────────────────────────────────────── */
function SetupTab({ inputs, setI, totals, schedule }) {
  const { fmtK, symbol } = useFmt();
  const good = totals.npv > 0;

  const InputRow = ({ label, k, pre, suf, min=0, max=9999, step=1, note }) => (
    <div className="input-group">
      <label className="input-label">{label}{note&&<span style={{color:"var(--ink3)",fontWeight:400,marginLeft:4}}>({note})</span>}</label>
      <div className="input-row-app">
        {pre&&<span className="input-prefix">{pre}</span>}
        <input className="input-field-app" type="number" value={inputs[k]??""} min={min} max={max} step={step}
          onChange={e=>setI(k,e.target.value)}
          onBlur={e=>setI(k,Math.max(min,Math.min(max,Number(e.target.value)||min)))}
          inputMode="decimal" />
        {suf&&<span className="input-suffix">{suf}</span>}
      </div>
    </div>
  );

  return (
    <div>
      {/* KPI bar */}
      <div className="kpi-bar fade-up">
        {[
          {label:"NPV (Nominal)",  v:fmtK(totals.npv),     cls:good?"green":"red",   badge:good?"good":"bad", bt:good?"✓ Creates Value":"✗ Destroys Value"},
          {label:"NPV (Real)",     v:fmtK(totals.npvReal||0), cls:(totals.npvReal||0)>0?"green":"red"},
          {label:"IRR",            v:totals.irr?pct(totals.irr*100):"N/A", cls:totals.irr&&totals.irr>inputs.discountRate/100?"green":"red"},
          {label:"Total CAPEX",    v:fmtK(totals.totalCapex), cls:"gold"},
        ].map(k=>(
          <div className="kpi-box" key={k.label}>
            <div className="kpi-box-label">{k.label}</div>
            <div className={`kpi-box-value ${k.cls}`}>{k.v}</div>
            {k.badge&&<div className={`kpi-badge ${k.badge}`}>{k.bt}</div>}
          </div>
        ))}
      </div>

      {/* Inflation impact */}
      {Number(inputs.inflationRate)>0 && (
        <div style={{background:"var(--gold-l)",border:"1px solid #e6c874",borderRadius:8,padding:"9px 13px",marginBottom:14,fontSize:12,color:"#7a5c13",display:"flex",gap:7}}>
          <span>ℹ️</span>
          <span>Inflation {inputs.inflationRate}% → Real WACC = <strong>{(((1+Number(inputs.discountRate)/100)/(1+Number(inputs.inflationRate)/100)-1)*100).toFixed(1)}%</strong> (Fisher equation). Nominal NPV: <strong>{fmtK(totals.npv)}</strong> · Real NPV: <strong>{fmtK(totals.npvReal||0)}</strong></span>
        </div>
      )}

      <div className="input-grid-2">
        {/* Basic parameters */}
        <div className="acard fade-up fade-up-1">
          <div className="acard-header"><span className="acard-title">Basic Parameters</span></div>
          <div className="acard-body">
            <div className="input-grid-2">
              <InputRow label="Construction Phase" k="constructionYears" suf="years" min={0} max={5} />
              <InputRow label="Operation Phase"    k="operationYears"    suf="years" min={1} max={30} />
              <InputRow label="Discount Rate (WACC)" k="discountRate"   suf="%"    min={0.1} max={100} step={0.1} />
              <InputRow label="Corporate Tax Rate"   k="taxRate"         suf="%"    min={0} max={99} step={0.1} />
              <InputRow label="Inflation Rate"        k="inflationRate"  suf="%"    min={0} max={50} step={0.1} />
            </div>
          </div>
        </div>

        {/* Financing */}
        <div className="acard fade-up fade-up-1">
          <div className="acard-header"><span className="acard-title">Financing Plan</span></div>
          <div className="acard-body">
            <div className="input-grid-2">
              <InputRow label="Equity Investment" k="equityAmount"  pre={symbol} min={0} max={1e10} />
              <InputRow label="Debt / Loan"        k="debtAmount"   pre={symbol} min={0} max={1e10} />
              <InputRow label="Interest Rate"       k="interestRate" suf="%"     min={0} max={50} step={0.1} />
              <InputRow label="Loan Term"           k="loanTermYears" suf="years" min={1} max={30} />
            </div>
          </div>
        </div>

        {/* Terminal value */}
        <div className="acard fade-up fade-up-2">
          <div className="acard-header">
            <span className="acard-title">Terminal / Residual Value</span>
            <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
              <input type="checkbox" checked={!!inputs.useTerminalValue} onChange={e=>setI("useTerminalValue",e.target.checked)} />
              Enable
            </label>
          </div>
          {inputs.useTerminalValue && (
            <div className="acard-body">
              <div style={{marginBottom:10}}>
                <label className="input-label">Calculation Method</label>
                <div className="input-row-app" style={{marginTop:4}}>
                  <select className="select-app" value={inputs.terminalMethod||"perpetuity"} onChange={e=>setI("terminalMethod",e.target.value)}>
                    <option value="perpetuity">Gordon Growth / Perpetuity</option>
                    <option value="multiple">EV/EBITDA Multiple</option>
                  </select>
                </div>
              </div>
              {(inputs.terminalMethod||"perpetuity")==="perpetuity"
                ? <InputRow label="Terminal Growth Rate" k="terminalGrowthRate" suf="%" min={-5} max={20} step={0.1} note="perpetual growth" />
                : <InputRow label="EV/EBITDA Multiple"   k="evMultiple"          min={1} max={50} step={0.5} />
              }
              <div style={{marginTop:10,padding:"10px 12px",background:"var(--emerald-l)",borderRadius:7,fontSize:12,color:"var(--emerald)"}}>
                Terminal Value: <strong>{fmtK(totals.terminalValue)}</strong> · PV of TV: <strong>{fmtK(totals.tvPV)}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Quick results */}
        <div className="acard fade-up fade-up-2">
          <div className="acard-header"><span className="acard-title">Key Results Summary</span></div>
          <div className="acard-body" style={{padding:0}}>
            {[
              {l:"NPV (Nominal)",   v:fmtK(totals.npv),                     c:good?"var(--emerald)":"var(--red)"},
              {l:"NPV (Real)",      v:fmtK(totals.npvReal||0),              c:(totals.npvReal||0)>0?"var(--emerald)":"var(--red)"},
              {l:"IRR",             v:totals.irr?pct(totals.irr*100):"N/A", c:"var(--ink)"},
              {l:"MIRR",            v:pct((totals.mirr||0)*100),             c:"var(--ink)"},
              {l:"Payback Period",  v:totals.payback>=0?`${totals.payback} years`:">projection",c:"var(--ink)"},
              {l:"Profitability Index",v:totals.pi.toFixed(2)+"×",          c:totals.pi>1?"var(--emerald)":"var(--red)"},
              {l:"RONA",            v:pct((totals.rona||0)*100),             c:"var(--ink)"},
              {l:"Total EVA",       v:fmtK(totals.totalEVA),                c:totals.totalEVA>0?"var(--emerald)":"var(--red)"},
            ].map((r,i,arr)=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"9px 16px",borderBottom:i<arr.length-1?"1px solid var(--border)":"none"}}>
                <span style={{fontSize:12,color:"var(--ink3)",fontWeight:500}}>{r.l}</span>
                <span style={{fontSize:13,fontWeight:700,color:r.c}}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Growth chart */}
      {schedule.length > 0 && (
        <div className="acard fade-up" style={{marginTop:4}}>
          <div className="acard-header"><span className="acard-title">Revenue & Net Income Overview</span></div>
          <div style={{padding:"12px 0 8px"}}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={schedule} margin={{top:5,right:20,left:0,bottom:0}}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d7a55" stopOpacity={0.2}/><stop offset="95%" stopColor="#0d7a55" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" />
                <XAxis dataKey="year" tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v=>fmtK(v)} tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<ChartTip/>} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0d7a55" fill="url(#gRev)" strokeWidth={2} />
                <Bar dataKey="netIncome" name="Net Income" fill="#6366f1" radius={[3,3,0,0]} opacity={0.8} />
                <ReferenceLine y={0} stroke="#d1d5db" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── CAPEX Tab ────────────────────────────────────────────────────── */
function CapexTab({ inputs, setI, totalYears }) {
  const { fmtK, symbol } = useFmt();
  const years = Array.from({length:Math.min(totalYears,7)}, (_,i)=>i);

  const updateCapex = (idx, field, val) => {
    const rows = [...(inputs.capexRows||[])];
    rows[idx] = { ...rows[idx], [field]:val };
    setI("capexRows", rows);
  };
  const updateAmount = (idx, yi, val) => {
    const rows = [...(inputs.capexRows||[])];
    const amounts = [...(rows[idx].amounts||[0,0,0,0,0,0,0])];
    amounts[yi] = Number(val)||0;
    rows[idx] = { ...rows[idx], amounts };
    setI("capexRows", rows);
  };

  const totalPerYear = years.map(yi =>
    (inputs.capexRows||[]).filter(r=>r.enabled).reduce((s,r)=>s+(Number((r.amounts||[])[yi])||0),0)
  );
  const grandTotal = totalPerYear.reduce((a,b)=>a+b,0);

  return (
    <div>
      <div className="acard fade-up">
        <div className="acard-header">
          <span className="acard-title">Capital Expenditure Schedule</span>
          <span className="acard-sub">Grand Total: {fmtK(grandTotal)}</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
            <thead>
              <tr style={{background:"var(--cream)"}}>
                <th style={{padding:"8px 10px",textAlign:"left",fontWeight:600,fontSize:10,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:"0.5px",borderBottom:"1.5px solid var(--border)",minWidth:160}}>Item</th>
                {years.map(yi=>(
                  <th key={yi} style={{padding:"8px 8px",textAlign:"right",fontWeight:600,fontSize:10,color:"var(--ink2)",borderBottom:"1.5px solid var(--border)",minWidth:80}}>
                    Year {yi+1}
                    {yi < clamp(inputs.constructionYears,0,5) ? <span className="phase-construction" style={{display:"block",marginTop:2}}>Construction</span> : <span className="phase-operation" style={{display:"block",marginTop:2}}>Operation</span>}
                  </th>
                ))}
                <th style={{padding:"8px 8px",textAlign:"right",fontWeight:600,fontSize:10,color:"var(--ink2)",borderBottom:"1.5px solid var(--border)",minWidth:80}}>Depr. Method</th>
                <th style={{padding:"8px 8px",textAlign:"right",fontWeight:600,fontSize:10,color:"var(--ink2)",borderBottom:"1.5px solid var(--border)",minWidth:70}}>Depr. Years</th>
                <th style={{padding:"8px 8px",textAlign:"center",fontWeight:600,fontSize:10,color:"var(--ink2)",borderBottom:"1.5px solid var(--border)",width:40}}>✓</th>
              </tr>
            </thead>
            <tbody>
              {(inputs.capexRows||[]).map((row,idx)=>(
                <tr key={idx} style={{background:idx%2===0?"#fafafa":"#fff",opacity:row.enabled?1:0.45}}>
                  <td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}>
                    <input value={row.name||""} onChange={e=>updateCapex(idx,"name",e.target.value)}
                      style={{width:"100%",border:"1px solid var(--border)",borderRadius:4,padding:"3px 6px",fontSize:11,fontFamily:"var(--sans)",background:"var(--cream)",color:"var(--ink)",outline:"none"}} />
                  </td>
                  {years.map(yi=>(
                    <td key={yi} style={{padding:"5px 5px",borderBottom:"1px solid var(--border)",textAlign:"right"}}>
                      <input type="number" value={(row.amounts||[])[yi]||""} onChange={e=>updateAmount(idx,yi,e.target.value)}
                        disabled={!row.enabled}
                        style={{width:72,border:"1px solid var(--border)",borderRadius:4,padding:"3px 5px",fontSize:11,fontFamily:"var(--sans)",textAlign:"right",background:"var(--cream)",color:"#0000FF",outline:"none"}} />
                    </td>
                  ))}
                  <td style={{padding:"5px 6px",borderBottom:"1px solid var(--border)",textAlign:"right"}}>
                    <select value={row.deprMethod||"SL"} onChange={e=>updateCapex(idx,"deprMethod",e.target.value)} disabled={!row.enabled}
                      style={{fontSize:11,border:"1px solid var(--border)",borderRadius:4,padding:"3px 5px",fontFamily:"var(--sans)",background:"var(--cream)"}}>
                      <option value="SL">Straight-Line</option>
                      <option value="DB">Declining Balance</option>
                      <option value="None">No Depreciation</option>
                    </select>
                  </td>
                  <td style={{padding:"5px 6px",borderBottom:"1px solid var(--border)",textAlign:"right"}}>
                    <input type="number" value={row.deprYears||10} onChange={e=>updateCapex(idx,"deprYears",Number(e.target.value)||1)}
                      disabled={!row.enabled||row.deprMethod==="None"}
                      style={{width:50,border:"1px solid var(--border)",borderRadius:4,padding:"3px 5px",fontSize:11,textAlign:"right",background:"var(--cream)",color:"#0000FF",outline:"none"}} />
                  </td>
                  <td style={{padding:"5px 8px",borderBottom:"1px solid var(--border)",textAlign:"center"}}>
                    <input type="checkbox" checked={!!row.enabled} onChange={e=>updateCapex(idx,"enabled",e.target.checked)} style={{cursor:"pointer"}} />
                  </td>
                </tr>
              ))}
              {/* Total row */}
              <tr style={{background:"var(--emerald-l)"}}>
                <td style={{padding:"8px 10px",fontWeight:700,color:"var(--emerald)",fontSize:12,borderTop:"2px solid var(--emerald)"}}>Total CAPEX</td>
                {years.map(yi=>(
                  <td key={yi} style={{padding:"8px 8px",textAlign:"right",fontWeight:700,color:"var(--emerald)",fontSize:12,borderTop:"2px solid var(--emerald)"}}>{fmtK(totalPerYear[yi])}</td>
                ))}
                <td colSpan={3} style={{padding:"8px 8px",textAlign:"right",fontWeight:700,color:"var(--emerald)",fontSize:12,borderTop:"2px solid var(--emerald)"}}>{fmtK(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="acard fade-up fade-up-1">
        <div className="acard-header"><span className="acard-title">Depreciation by Year</span></div>
        <div style={{overflowX:"auto"}}>
          <table className="data-table">
            <thead>
              <tr><th>CAPEX Item</th>{years.map(yi=><th key={yi}>Yr {yi+1}</th>)}<th>Total Depr.</th></tr>
            </thead>
            <tbody>
              {(inputs.capexRows||[]).filter(r=>r.enabled&&r.deprMethod!=="None").map((row,idx)=>{
                const total = Number((row.amounts||[]).reduce((a,b)=>a+(Number(b)||0),0));
                const deprYrs = clamp(row.deprYears,1,50);
                const annualDepr = total/deprYrs;
                const start = clamp(row.deprStart||1,1,totalYears)-1;
                return (
                  <tr key={idx}>
                    <td>{row.name}</td>
                    {years.map(yi=>(
                      <td key={yi} style={{color:"var(--ink2)"}}>{yi>=start&&yi<start+deprYrs?fmtK(annualDepr):"—"}</td>
                    ))}
                    <td style={{fontWeight:600}}>{fmtK(annualDepr*deprYrs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Revenue Tab ──────────────────────────────────────────────────── */
function RevenueTab({ inputs, setI, schedule }) {
  const { fmtK, symbol } = useFmt();
  const opStart = clamp(inputs.constructionYears,0,5);

  const updateLine = (idx, field, val) => {
    const lines = [...(inputs.revenueLines||[])];
    lines[idx] = { ...lines[idx], [field]:val };
    setI("revenueLines", lines);
  };

  return (
    <div>
      <div className="acard fade-up">
        <div className="acard-header">
          <span className="acard-title">Revenue Lines</span>
          <span className="acard-sub">Each line = Driver1 × Driver2 × Driver3 × Growth</span>
        </div>
        <div className="acard-body">
          {(inputs.revenueLines||[]).map((line, idx) => (
            <div key={idx} style={{borderBottom:"1px solid var(--border)",paddingBottom:16,marginBottom:16,opacity:line.enabled?1:0.5}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <input type="checkbox" checked={!!line.enabled} onChange={e=>updateLine(idx,"enabled",e.target.checked)} style={{cursor:"pointer"}} />
                <input value={line.name||""} onChange={e=>updateLine(idx,"name",e.target.value)}
                  style={{flex:1,border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px",fontSize:13,fontFamily:"var(--sans)",fontWeight:600,color:"var(--ink)",background:"var(--cream)",outline:"none"}} />
              </div>
              <div className="input-grid-3">
                <div className="input-group">
                  <label className="input-label">
                    <input value={line.driver1Label||"Units"} onChange={e=>updateLine(idx,"driver1Label",e.target.value)}
                      style={{border:"none",background:"none",fontWeight:600,fontSize:11,color:"var(--ink2)",width:"100%",outline:"none",fontFamily:"var(--sans)"}} />
                  </label>
                  <div className="input-row-app">
                    <input className="input-field-app" type="number" value={line.driver1||""} onChange={e=>updateLine(idx,"driver1",Number(e.target.value)||0)} disabled={!line.enabled} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">
                    <input value={line.driver2Label||"Price/unit"} onChange={e=>updateLine(idx,"driver2Label",e.target.value)}
                      style={{border:"none",background:"none",fontWeight:600,fontSize:11,color:"var(--ink2)",width:"100%",outline:"none",fontFamily:"var(--sans)"}} />
                  </label>
                  <div className="input-row-app">
                    <span className="input-prefix">{symbol}</span>
                    <input className="input-field-app" type="number" value={line.driver2||""} onChange={e=>updateLine(idx,"driver2",Number(e.target.value)||0)} disabled={!line.enabled} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Annual Growth Rate</label>
                  <div className="input-row-app">
                    <input className="input-field-app" type="number" value={line.growthRate??""} onChange={e=>updateLine(idx,"growthRate",Number(e.target.value)||0)} disabled={!line.enabled} />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
              </div>
              {line.enabled && (
                <div style={{marginTop:8,fontSize:11,color:"var(--ink3)"}}>
                  Year 1 Base Revenue: <strong style={{color:"var(--emerald)"}}>{fmtK((line.driver1||0)*(line.driver2||0)*(line.driver3||1))}</strong>
                  {line.growthRate ? ` · Growing at ${line.growthRate}%/yr` : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Revenue schedule preview */}
      {schedule.length > 0 && (
        <div className="acard fade-up fade-up-1">
          <div className="acard-header"><span className="acard-title">Revenue Projection</span></div>
          <div style={{padding:"12px 0 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={schedule.filter(r=>r.revenue>0)} margin={{top:5,right:20,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" />
                <XAxis dataKey="year" tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v=>fmtK(v)} tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<ChartTip/>} />
                <Bar dataKey="revenue" name="Revenue" fill="#0d7a55" radius={[3,3,0,0]} />
                <Bar dataKey="grossProfit" name="Gross Profit" fill="#6366f1" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Costs Tab ────────────────────────────────────────────────────── */
function CostsTab({ inputs, setI, schedule }) {
  const { fmtK, symbol } = useFmt();

  const updateLine = (idx, field, val) => {
    const lines = [...(inputs.costLines||[])];
    lines[idx] = { ...lines[idx], [field]:val };
    setI("costLines", lines);
  };

  return (
    <div>
      <div className="acard fade-up">
        <div className="acard-header"><span className="acard-title">Operating Cost Lines</span></div>
        <div className="acard-body">
          {(inputs.costLines||[]).map((line, idx) => (
            <div key={idx} style={{borderBottom:"1px solid var(--border)",paddingBottom:12,marginBottom:12,opacity:line.enabled?1:0.5}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <input type="checkbox" checked={!!line.enabled} onChange={e=>updateLine(idx,"enabled",e.target.checked)} style={{cursor:"pointer"}} />
                <input value={line.name||""} onChange={e=>updateLine(idx,"name",e.target.value)}
                  style={{flex:1,border:"1px solid var(--border)",borderRadius:6,padding:"4px 9px",fontSize:13,fontFamily:"var(--sans)",fontWeight:600,color:"var(--ink)",background:"var(--cream)",outline:"none"}} />
                <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,cursor:"pointer",color:"var(--ink2)"}}>
                  <input type="checkbox" checked={!!line.pctOfRevenue} onChange={e=>updateLine(idx,"pctOfRevenue",e.target.checked)} />
                  % of Revenue
                </label>
              </div>
              <div className="input-grid-3">
                {line.pctOfRevenue ? (
                  <div className="input-group">
                    <label className="input-label">% of Revenue</label>
                    <div className="input-row-app">
                      <input className="input-field-app" type="number" value={line.pct||""} onChange={e=>updateLine(idx,"pct",Number(e.target.value)||0)} disabled={!line.enabled} />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>
                ) : (
                  <div className="input-group">
                    <label className="input-label">Annual Base Amount (Year 1)</label>
                    <div className="input-row-app">
                      <span className="input-prefix">{symbol}</span>
                      <input className="input-field-app" type="number" value={line.value||""} onChange={e=>updateLine(idx,"value",Number(e.target.value)||0)} disabled={!line.enabled} />
                    </div>
                  </div>
                )}
                <div className="input-group">
                  <label className="input-label">Annual Growth Rate</label>
                  <div className="input-row-app">
                    <input className="input-field-app" type="number" value={line.growthRate??""} onChange={e=>updateLine(idx,"growthRate",Number(e.target.value)||0)} disabled={!line.enabled||line.pctOfRevenue} />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {schedule.length > 0 && (
        <div className="acard fade-up fade-up-1">
          <div className="acard-header"><span className="acard-title">Cost Structure</span></div>
          <div style={{padding:"12px 0 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={schedule.filter(r=>r.revenue>0)} margin={{top:5,right:20,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" />
                <XAxis dataKey="year" tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v=>fmtK(v)} tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<ChartTip/>} />
                <Bar dataKey="costs" name="Total Costs" fill="#e57373" radius={[3,3,0,0]} />
                <Bar dataKey="ebitda" name="EBITDA" fill="#0d7a55" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
/* ─── Working Capital Tab ──────────────────────────────────────────── */
function WorkingCapTab({ inputs, setI, schedule }) {
  const { fmtK, symbol } = useFmt();

  const InputRow = ({ label, k, suf, min=0, max=999, note }) => (
    <div className="input-group">
      <label className="input-label">{label}{note&&<span style={{color:"var(--ink3)",fontWeight:400,marginLeft:4}}>({note})</span>}</label>
      <div className="input-row-app">
        <input className="input-field-app" type="number" value={inputs[k]??""} min={min} max={max}
          onChange={e=>setI(k,e.target.value)}
          onBlur={e=>setI(k,Math.max(min,Math.min(max,Number(e.target.value)||min)))}
          inputMode="decimal" />
        {suf&&<span className="input-suffix">{suf}</span>}
      </div>
    </div>
  );

  const wcSchedule = schedule.map((r,i) => {
    const rev = r.revenue||0, cost = r.costs||0;
    const rec = rev  * clamp(inputs.receivablesDays,0,365)/365;
    const pay = cost * clamp(inputs.payablesDays,0,365)/365;
    const inv = cost * clamp(inputs.inventoryDays,0,365)/365;
    const wc  = rec + inv - pay;
    const prev = i > 0 ? (() => {
      const pr = schedule[i-1].revenue||0, pc = schedule[i-1].costs||0;
      return pr*clamp(inputs.receivablesDays,0,365)/365 + pc*clamp(inputs.inventoryDays,0,365)/365 - pc*clamp(inputs.payablesDays,0,365)/365;
    })() : 0;
    return { year:r.year, phase:r.phase, receivables:Math.round(rec), payables:Math.round(pay), inventory:Math.round(inv), wc:Math.round(wc), wcChange:Math.round(wc-prev) };
  });

  return (
    <div>
      <div style={{background:"var(--blue-l)",border:"1px solid #90caf9",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#1565c0",display:"flex",gap:8}}>
        <span>💡</span>
        <span>Working capital = Receivables + Inventory − Payables. Enter average payment delays in days. Changes in working capital affect free cash flow each year.</span>
      </div>

      <div className="input-grid-3 fade-up">
        <div className="acard">
          <div className="acard-header"><span className="acard-title">📥 Receivables</span></div>
          <div className="acard-body"><InputRow label="Customer Payment Delay" k="receivablesDays" suf="days" max={365} note="avg days to receive cash" /></div>
        </div>
        <div className="acard">
          <div className="acard-header"><span className="acard-title">📤 Payables</span></div>
          <div className="acard-body"><InputRow label="Supplier Payment Delay" k="payablesDays" suf="days" max={365} note="avg days to pay suppliers" /></div>
        </div>
        <div className="acard">
          <div className="acard-header"><span className="acard-title">📦 Inventory</span></div>
          <div className="acard-body"><InputRow label="Inventory Holding Period" k="inventoryDays" suf="days" max={365} note="avg days stock held" /></div>
        </div>
      </div>

      <div className="acard fade-up fade-up-1" style={{marginTop:4}}>
        <div className="acard-header"><span className="acard-title">Working Capital Schedule</span></div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{textAlign:"left"}}>Year</th>
              <th>Phase</th>
              <th>Receivables</th>
              <th>Inventory</th>
              <th>Payables</th>
              <th>Net WC</th>
              <th>ΔWC (FCF Impact)</th>
            </tr>
          </thead>
          <tbody>
            {wcSchedule.map(r=>(
              <tr key={r.year}>
                <td style={{textAlign:"left",fontWeight:600}}>{r.year}</td>
                <td><span className={r.phase==="Construction"?"phase-construction":"phase-operation"}>{r.phase}</span></td>
                <td style={{color:"var(--blue)"}}>{fmtK(r.receivables)}</td>
                <td style={{color:"var(--gold)"}}>{fmtK(r.inventory)}</td>
                <td style={{color:"var(--emerald)"}}>{fmtK(r.payables)}</td>
                <td style={{fontWeight:600}}>{fmtK(r.wc)}</td>
                <td style={{color:r.wcChange<0?"var(--emerald)":r.wcChange>0?"var(--red)":"var(--ink3)",fontWeight:600}}>
                  {r.wcChange>0?"+":""}{fmtK(r.wcChange)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Results Tab ──────────────────────────────────────────────────── */
function ResultsTab({ totals, schedule, inputs }) {
  const { fmtK } = useFmt();
  const good = totals.npv > 0;

  return (
    <div>
      {/* Main KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        {[
          {l:"NPV (Nominal)",   v:fmtK(totals.npv),              c:good?"green":"red",   b:good?"good":"bad", bt:good?"✓ Creates Value":"✗ Destroys Value"},
          {l:"NPV (Real)",      v:fmtK(totals.npvReal||0),       c:(totals.npvReal||0)>0?"green":"red"},
          {l:"IRR",             v:totals.irr?pct(totals.irr*100):"N/A", c:totals.irr&&totals.irr>inputs.discountRate/100?"green":"red"},
          {l:"MIRR",            v:pct((totals.mirr||0)*100),      c:"gold"},
          {l:"Payback Period",  v:totals.payback>=0?`${totals.payback} yrs`:">proj", c:""},
          {l:"Profitability Index",v:`${totals.pi.toFixed(2)}×`,  c:totals.pi>1?"green":"red"},
          {l:"RONA",            v:pct((totals.rona||0)*100),      c:""},
          {l:"Total EVA",       v:fmtK(totals.totalEVA),          c:totals.totalEVA>0?"green":"red"},
        ].map(k=>(
          <div className="kpi-box fade-up" key={k.l}>
            <div className="kpi-box-label">{k.l}</div>
            <div className={`kpi-box-value ${k.c}`}>{k.v}</div>
            {k.b&&<div className={`kpi-badge ${k.b}`}>{k.bt}</div>}
          </div>
        ))}
      </div>

      {/* Terminal value banner */}
      {inputs.useTerminalValue && totals.terminalValue > 0 && (
        <div style={{background:"var(--emerald-l)",border:"1px solid #86efac",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"var(--emerald)",display:"flex",gap:8,alignItems:"center"}}>
          <span>🏁</span>
          <span>Terminal value ({inputs.terminalMethod==="perpetuity"?"Gordon Growth Perpetuity":"EV Multiple"}): <strong>{fmtK(totals.terminalValue)}</strong> · Present value: <strong>{fmtK(totals.tvPV)}</strong> · TV as % of total NPV: <strong>{totals.npv>0?pct((totals.tvPV/totals.npv)*100):"n/a"}</strong></span>
        </div>
      )}

      {/* P&L Summary table */}
      <div className="acard fade-up">
        <div className="acard-header"><span className="acard-title">Income Statement Summary</span></div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{textAlign:"left"}}>Line Item</th>
              {schedule.map(r=><th key={r.year}>
                <div>Yr {r.year}</div>
                <span className={r.phase==="Construction"?"phase-construction":"phase-operation"} style={{display:"block",marginTop:2}}>{r.phase.slice(0,4)}</span>
              </th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              {l:"Revenue",     k:"revenue",    c:"var(--emerald)"},
              {l:"Total Costs", k:"costs",      c:"var(--red)"},
              {l:"Gross Profit",k:"grossProfit",c:"var(--ink)"},
              {l:"EBITDA",      k:"ebitda",     c:"var(--ink)"},
              {l:"Depreciation",k:"depreciation",c:"var(--ink3)"},
              {l:"EBIT",        k:"ebit",       c:"var(--ink)"},
              {l:"Interest",    k:"interest",   c:"var(--ink3)"},
              {l:"Net Income",  k:"netIncome",  c:"var(--blue)"},
              {l:"FCF",         k:"fcf",        c:"var(--emerald)"},
              {l:"EVA",         k:"eva",        c:"var(--gold)"},
            ].map(row=>{
              const total = schedule.reduce((s,r)=>s+(r[row.k]||0),0);
              return (
                <tr key={row.l}>
                  <td style={{fontWeight:600}}>{row.l}</td>
                  {schedule.map(r=>(
                    <td key={r.year} style={{color:(r[row.k]||0)<0?"var(--red)":row.c}}>{fmtK(r[row.k]||0)}</td>
                  ))}
                  <td style={{fontWeight:700,color:total<0?"var(--red)":row.c}}>{fmtK(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* EVA & NPV charts */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:4}}>
        <div className="acard fade-up fade-up-1">
          <div className="acard-header"><span className="acard-title">Cumulative NPV</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={schedule} margin={{top:5,right:16,left:0,bottom:0}}>
              <defs><linearGradient id="gNpv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d7a55" stopOpacity={0.2}/><stop offset="95%" stopColor="#0d7a55" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da"/>
              <XAxis dataKey="year" tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>fmtK(v)} tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} width={55}/>
              <Tooltip content={<ChartTip/>}/>
              <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 2"/>
              <Area type="monotone" dataKey="cumNPV" name="Cumulative NPV" stroke="#0d7a55" fill="url(#gNpv)" strokeWidth={2.5} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="acard fade-up fade-up-2">
          <div className="acard-header"><span className="acard-title">EVA by Year</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={schedule} margin={{top:5,right:16,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da"/>
              <XAxis dataKey="year" tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>fmtK(v)} tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} width={55}/>
              <Tooltip content={<ChartTip/>}/>
              <ReferenceLine y={0} stroke="#d1d5db"/>
              <Bar dataKey="eva" name="EVA" fill="#c8960c" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─── Cash Flow Tab ────────────────────────────────────────────────── */
function CashFlowTab({ schedule, totals }) {
  const { fmtK } = useFmt();
  let cumCF = -totals.totalCapex;

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16}}>
        {[
          {l:"Total FCF",      v:fmtK(totals.totalFCF),   c:totals.totalFCF>0?"green":"red"},
          {l:"Total Revenue",  v:fmtK(totals.totalRevenue),c:""},
          {l:"Total CAPEX",    v:fmtK(totals.totalCapex),  c:"red"},
        ].map(k=>(
          <div className="kpi-box fade-up" key={k.l}>
            <div className="kpi-box-label">{k.l}</div>
            <div className={`kpi-box-value ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="acard fade-up">
        <div className="acard-header"><span className="acard-title">Cash Flow Statement</span></div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{textAlign:"left"}}>Item</th>
              {schedule.map(r=><th key={r.year}>Yr {r.year}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              {l:"Revenue",            k:"revenue",     section:"Operating"},
              {l:"Operating Costs",    k:"costs",       negate:true},
              {l:"EBITDA",             k:"ebitda",      bold:true},
              {l:"Interest Paid",      k:"interest",    negate:true},
              {l:"Net Income",         k:"netIncome",   bold:true, c:"var(--blue)"},
              {l:"(+) Depreciation",   k:"depreciation",c:"var(--ink3)"},
              {l:"(−) CAPEX",          k:"capex",       negate:true, c:"var(--red)"},
              {l:"(−) ΔWorking Cap",   k:"wcChange",    negate:true, c:"var(--gold)"},
              {l:"Free Cash Flow",     k:"fcf",         bold:true, c:"var(--emerald)", total:true},
            ].map(row=>{
              const vals = schedule.map(r=>row.negate?-(r[row.k]||0):(r[row.k]||0));
              const tot  = vals.reduce((a,b)=>a+b,0);
              return (
                <tr key={row.l} className={row.total?"total-row":""}>
                  <td style={{fontWeight:row.bold?700:500,paddingLeft:row.section?8:16}}>{row.l}</td>
                  {vals.map((v,i)=>(
                    <td key={i} style={{color:v<0?"var(--red)":(row.c||"var(--ink)"),fontWeight:row.bold?600:400}}>{fmtK(v)}</td>
                  ))}
                  <td style={{fontWeight:700,color:tot<0?"var(--red)":(row.c||"var(--ink)")}}>{fmtK(tot)}</td>
                </tr>
              );
            })}
            {/* Cumulative */}
            <tr>
              <td style={{fontWeight:700,color:"var(--blue)"}}>Cumulative Cash Flow</td>
              {schedule.map(r=>{ cumCF+=r.fcf; return <td key={r.year} style={{fontWeight:600,color:cumCF>=0?"var(--emerald)":"var(--red)"}}>{fmtK(cumCF)}</td>; })}
              <td/>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Waterfall chart */}
      <div className="acard fade-up fade-up-1" style={{marginTop:4}}>
        <div className="acard-header"><span className="acard-title">FCF vs Cumulative Cash Flow</span></div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={schedule} margin={{top:5,right:16,left:0,bottom:0}}>
            <defs><linearGradient id="gCum" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da"/>
            <XAxis dataKey="year" tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>fmtK(v)} tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} width={55}/>
            <Tooltip content={<ChartTip/>}/>
            <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 2"/>
            <Bar dataKey="fcf" name="Annual FCF" fill="#0d7a55" radius={[3,3,0,0]}/>
            <Area type="monotone" dataKey="cumNPV" name="Cumulative NPV" stroke="#6366f1" fill="url(#gCum)" strokeWidth={2}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Sensitivity Tab ──────────────────────────────────────────────── */
function SensitivityTab({ inputs, totals }) {
  const { fmtK } = useFmt();
  const [view, setView] = useState("heatmap");
  const [beVar, setBeVar] = useState("discountRate");

  // Variables to test
  const vars = [
    { key:"discountRate",     label:"WACC",             base:Number(inputs.discountRate), delta:3,   suf:"%"},
    { key:"taxRate",          label:"Tax Rate",          base:Number(inputs.taxRate),      delta:5,   suf:"%"},
    { key:"inflationRate",    label:"Inflation",         base:Number(inputs.inflationRate),delta:2,   suf:"%"},
    { key:"terminalGrowthRate",label:"Terminal Growth", base:Number(inputs.terminalGrowthRate||2),delta:1,suf:"%"},
    { key:"interestRate",     label:"Interest Rate",     base:Number(inputs.interestRate), delta:2,   suf:"%"},
    { key:"operationYears",   label:"Op. Years",         base:Number(inputs.operationYears),delta:2,  suf:"yr"},
  ];

  const steps = [-30,-20,-10,0,10,20,30];

  // Heatmap data
  const heatData = vars.map(v => {
    const row = { label:v.label };
    steps.forEach(s => {
      const newVal = v.base + (v.base * s/100);
      const npv = calcFinancials({...inputs,[v.key]:newVal}).totals.npv;
      row[`s${s}`] = Math.round(npv);
    });
    return row;
  });

  const allVals = heatData.flatMap(r=>steps.map(s=>r[`s${s}`]));
  const hMin = Math.min(...allVals), hMax = Math.max(...allVals);

  // Tornado data
  const tornadoData = vars.map(v => {
    const lo = calcFinancials({...inputs,[v.key]:v.base*(1-0.2)}).totals.npv;
    const hi = calcFinancials({...inputs,[v.key]:v.base*(1+0.2)}).totals.npv;
    return { label:v.label, lo:Math.round(Math.min(lo,hi)), hi:Math.round(Math.max(lo,hi)), impact:Math.abs(hi-lo) };
  }).sort((a,b)=>b.impact-a.impact);

  // Break-even
  const beResult = useMemo(()=>findBreakEven(inputs,beVar), [inputs,beVar]);
  const beVarDef = vars.find(v=>v.key===beVar)||vars[0];

  return (
    <div>
      <div className="tab-pills">
        {[["heatmap","🔥 Heat Map"],["tornado","🌪 Tornado"],["breakeven","🎯 Break-Even"]].map(([id,label])=>(
          <button key={id} className={`tab-pill ${view===id?"active":""}`} onClick={()=>setView(id)}>{label}</button>
        ))}
      </div>

      {view==="heatmap" && (
        <div className="acard fade-up">
          <div className="acard-header">
            <span className="acard-title">NPV Sensitivity — % change from base</span>
            <span className="acard-sub">Green = better NPV · Red = worse NPV</span>
          </div>
          <div className="heat-wrap" style={{padding:12}}>
            <table className="heat-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  {steps.map(s=><th key={s}>{s>0?"+":""}{s}%</th>)}
                </tr>
              </thead>
              <tbody>
                {heatData.map(row=>(
                  <tr key={row.label}>
                    <th style={{textAlign:"left",fontWeight:600,background:"var(--cream2)"}}>{row.label}</th>
                    {steps.map(s=>(
                      <td key={s} className={s===0?"heat-base":""}
                        style={{background:heatBg(row[`s${s}`],hMin,hMax),color:heatFg(row[`s${s}`],hMin,hMax)}}>
                        {fmtK(row[`s${s}`])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view==="tornado" && (
        <div className="acard fade-up">
          <div className="acard-header"><span className="acard-title">Tornado Chart — NPV impact of ±20% change</span></div>
          <div className="acard-body">
            {tornadoData.map((item,i) => {
              const range = hMax - hMin || 1;
              const loW = ((totals.npv - item.lo) / range)*100;
              const hiW = ((item.hi - totals.npv) / range)*100;
              return (
                <div key={item.label} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                    <span style={{fontWeight:600,color:"var(--ink2)"}}>{item.label}</span>
                    <span style={{color:"var(--ink3)"}}>Range: {fmtK(item.lo)} → {fmtK(item.hi)}</span>
                  </div>
                  <div style={{display:"flex",height:24,borderRadius:4,overflow:"hidden",background:"var(--cream)"}}>
                    <div style={{width:`${Math.min(loW,50)}%`,background:"rgba(192,57,43,0.7)",transition:"width 0.4s"}}/>
                    <div style={{width:2,background:"var(--border)"}}/>
                    <div style={{width:`${Math.min(hiW,50)}%`,background:"rgba(13,122,85,0.7)",transition:"width 0.4s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view==="breakeven" && (
        <div className="acard fade-up">
          <div className="acard-header"><span className="acard-title">Break-Even Finder</span></div>
          <div className="acard-body">
            <div style={{marginBottom:14}}>
              <label className="input-label" style={{marginBottom:6,display:"block"}}>Find break-even value for:</label>
              <div className="input-row-app" style={{maxWidth:280}}>
                <select className="select-app" value={beVar} onChange={e=>setBeVar(e.target.value)}>
                  {vars.map(v=><option key={v.key} value={v.key}>{v.label}</option>)}
                </select>
              </div>
            </div>
            {beResult !== null && (
              <div>
                <div style={{background:"var(--emerald-l)",border:"1px solid #86efac",borderRadius:10,padding:"20px 24px",marginBottom:14}}>
                  <div style={{fontSize:12,color:"var(--ink3)",marginBottom:4}}>Break-Even {beVarDef.label}</div>
                  <div style={{fontFamily:"var(--serif)",fontSize:32,color:"var(--emerald)",fontWeight:700}}>{beResult.toFixed(2)}{beVarDef.suf}</div>
                  <div style={{fontSize:12,color:"var(--ink2)",marginTop:6}}>
                    At this value, NPV = 0 · Current base: <strong>{beVarDef.base.toFixed(2)}{beVarDef.suf}</strong>
                    {" · "}Difference: <strong style={{color:beResult>beVarDef.base?"var(--red)":"var(--emerald)"}}>{(beResult-beVarDef.base)>0?"+":""}{(beResult-beVarDef.base).toFixed(2)}{beVarDef.suf}</strong>
                  </div>
                </div>
                {/* Break-even sweep chart */}
                {(() => {
                  const sweepPoints = Array.from({length:21},(_,i)=>{
                    const v = beVarDef.base * (0.5 + i*0.05);
                    const npv = calcFinancials({...inputs,[beVar]:v}).totals.npv;
                    return {value:Math.round(v*100)/100, npv:Math.round(npv)};
                  });
                  return (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={sweepPoints} margin={{top:5,right:16,left:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da"/>
                        <XAxis dataKey="value" tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false}/>
                        <YAxis tickFormatter={v=>fmtK(v)} tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} width={55}/>
                        <Tooltip formatter={(v)=>fmtK(v)} labelFormatter={v=>`${beVarDef.label}: ${v}${beVarDef.suf}`}/>
                        <ReferenceLine y={0} stroke="#c0392b" strokeDasharray="5 3" label={{value:"Break-even",fill:"#c0392b",fontSize:10}}/>
                        <ReferenceLine x={beResult} stroke="#0d7a55" strokeDasharray="5 3"/>
                        <Line type="monotone" dataKey="npv" stroke="#0d7a55" strokeWidth={2.5} dot={false} name="NPV"/>
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Scenarios Tab ────────────────────────────────────────────────── */
function ScenariosTab({ inputs, scenario, applyScenario }) {
  const { fmtK } = useFmt();

  const scenarioResults = Object.entries(SCENARIO_PRESETS).map(([name, overrides]) => {
    const merged = { ...inputs, ...overrides };
    const { totals, schedule } = calcFinancials(merged);
    return { name, overrides, totals, finalFCF: schedule[schedule.length-1]?.fcf||0 };
  });

  const metrics = [
    {l:"Discount Rate",     k:"discountRate",     suf:"%",  src:"overrides"},
    {l:"Tax Rate",          k:"taxRate",          suf:"%",  src:"overrides"},
    {l:"Inflation",         k:"inflationRate",    suf:"%",  src:"overrides"},
    {l:"Op. Years",         k:"operationYears",   suf:"yr", src:"overrides"},
    {l:"Terminal Growth",   k:"terminalGrowthRate",suf:"%", src:"overrides"},
    {l:"NPV (Nominal)",     k:"npv",              fmt:"money", src:"totals"},
    {l:"NPV (Real)",        k:"npvReal",          fmt:"money", src:"totals"},
    {l:"IRR",               k:"irr",              fmt:"pct100",src:"totals"},
    {l:"MIRR",              k:"mirr",             fmt:"pct100",src:"totals"},
    {l:"Payback",           k:"payback",          suf:"yr", src:"totals"},
    {l:"PI",                k:"pi",               fmt:"x",  src:"totals"},
    {l:"RONA",              k:"rona",             fmt:"pct100",src:"totals"},
  ];

  return (
    <div>
      <div className="scenario-pills">
        {Object.keys(SCENARIO_PRESETS).map(s=>(
          <button key={s} className={`scenario-pill ${scenario===s?"active":""}`} onClick={()=>applyScenario(s)}>{s}</button>
        ))}
      </div>
      <div style={{fontSize:12,color:"var(--ink3)",marginBottom:14}}>Click a scenario to apply it to all calculations. Current: <strong style={{color:"var(--emerald)"}}>{scenario}</strong></div>

      {/* Side-by-side comparison */}
      <div className="acard fade-up">
        <div className="acard-header"><span className="acard-title">Scenario Comparison</span></div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{textAlign:"left"}}>Metric</th>
              {scenarioResults.map(s=>(
                <th key={s.name} style={{color:s.name===scenario?"var(--emerald)":"var(--ink2)"}}>{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(m=>(
              <tr key={m.l}>
                <td style={{fontWeight:500}}>{m.l}</td>
                {scenarioResults.map(s=>{
                  const raw = m.src==="totals" ? s.totals[m.k] : (s.overrides[m.k]??inputs[m.k]);
                  let display, color = "var(--ink)";
                  if (m.fmt==="money") { display=fmtK(raw||0); color=(raw||0)>=0?"var(--emerald)":"var(--red)"; }
                  else if (m.fmt==="pct100") { display=raw?pct(raw*100):"N/A"; color=raw>0?"var(--emerald)":"var(--red)"; }
                  else if (m.fmt==="x") { display=`${(raw||0).toFixed(2)}×`; color=(raw||0)>1?"var(--emerald)":"var(--red)"; }
                  else display = `${raw??"-"}${m.suf||""}`;
                  return (
                    <td key={s.name} style={{color,fontWeight:s.name===scenario?700:400}}>{display}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual comparison */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:4}}>
        <div className="acard fade-up fade-up-1">
          <div className="acard-header"><span className="acard-title">NPV Comparison</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scenarioResults.map(s=>({name:s.name,npv:s.totals.npv}))} margin={{top:5,right:16,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da"/>
              <XAxis dataKey="name" tick={{fill:"#8a8fa8",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>fmtK(v)} tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} width={55}/>
              <Tooltip formatter={v=>fmtK(v)}/>
              <ReferenceLine y={0} stroke="#d1d5db"/>
              <Bar dataKey="npv" name="NPV" radius={[4,4,0,0]}
                fill="#0d7a55" label={{position:"top",fontSize:9,formatter:v=>fmtK(v),fill:"#8a8fa8"}}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="acard fade-up fade-up-2">
          <div className="acard-header"><span className="acard-title">IRR Comparison</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scenarioResults.map(s=>({name:s.name,irr:(s.totals.irr||0)*100}))} margin={{top:5,right:16,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da"/>
              <XAxis dataKey="name" tick={{fill:"#8a8fa8",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>`${v.toFixed(0)}%`} tick={{fill:"#8a8fa8",fontSize:10}} axisLine={false} tickLine={false} width={40}/>
              <Tooltip formatter={v=>`${Number(v).toFixed(1)}%`}/>
              <ReferenceLine y={Number(inputs.discountRate)} stroke="#c0392b" strokeDasharray="4 2" label={{value:`WACC ${inputs.discountRate}%`,fill:"#c0392b",fontSize:9}}/>
              <Bar dataKey="irr" name="IRR %" fill="#6366f1" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─── Proposal Tab ─────────────────────────────────────────────────── */
function ProposalTab({ inputs, totals, schedule, projectName }) {
  const { fmtK, code } = useFmt();
  const today = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const good  = totals.npv > 0;
  const opStart = clamp(inputs.constructionYears,0,5);
  const totalYears = schedule.length;

  return (
    <div>
      {/* Report header */}
      <div className="acard fade-up" style={{marginBottom:16}}>
        <div style={{background:"var(--ink)",padding:"26px 28px 22px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontFamily:"var(--serif)",fontSize:10,color:"#7dd3b0",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:6}}>Investment Proposal</div>
            <div style={{fontFamily:"var(--serif)",fontSize:24,color:"#fff",marginBottom:3}}>{projectName}</div>
            <div style={{fontSize:12,color:"#9ca3b8"}}>Prepared by CapitalIQ · {today}</div>
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:good?"rgba(13,122,85,0.2)":"rgba(192,57,43,0.2)",padding:"8px 14px",borderRadius:6,border:`1px solid ${good?"#0d7a55":"#c0392b"}`}}>
            <span style={{fontSize:16}}>{good?"✅":"⚠️"}</span>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:good?"#7dd3b0":"#f87171"}}>{good?"RECOMMENDED":"NEEDS REVISION"}</div>
              <div style={{fontSize:10,color:"#9ca3b8"}}>NPV: {fmtK(totals.npv)}</div>
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:"1px solid var(--border)"}}>
          {[
            {l:"NPV",     v:fmtK(totals.npv),           c:good?"var(--emerald)":"var(--red)"},
            {l:"IRR",     v:totals.irr?pct(totals.irr*100):"N/A", c:"var(--ink)"},
            {l:"Payback", v:totals.payback>=0?`${totals.payback} yrs`:">proj", c:"var(--ink)"},
            {l:"PI",      v:`${totals.pi.toFixed(2)}×`,  c:totals.pi>1?"var(--emerald)":"var(--red)"},
          ].map((k,i)=>(
            <div key={k.l} style={{padding:"14px 18px",borderRight:i<3?"1px solid var(--border)":"none"}}>
              <div style={{fontSize:10,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:3,fontWeight:600}}>{k.l}</div>
              <div style={{fontFamily:"var(--serif)",fontSize:20,color:k.c,fontWeight:700}}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>

      {[
        {n:"01", title:"Executive Summary", content:
          `This investment proposal analyses the financial viability of "${projectName}". The project spans ${opStart>0?`a ${opStart}-year construction phase followed by `:""}a ${clamp(inputs.operationYears,1,30)}-year operation phase.\n\nAt a discount rate (WACC) of ${inputs.discountRate}% and corporate tax rate of ${inputs.taxRate}%, the project generates a Net Present Value (NPV) of ${fmtK(totals.npv)}${inputs.inflationRate>0?` (real NPV: ${fmtK(totals.npvReal||0)} adjusting for ${inputs.inflationRate}% inflation)`:""}. The Internal Rate of Return (IRR) is ${totals.irr?pct(totals.irr*100):"unable to be calculated"}, ${totals.irr&&totals.irr>inputs.discountRate/100?`which exceeds the cost of capital by ${((totals.irr-inputs.discountRate/100)*100).toFixed(1)} percentage points — value is being created`:`which is below the required WACC of ${inputs.discountRate}%`}.\n\nDecision: ${good?"✅ PROCEED WITH INVESTMENT":"⚠️ REVISE AND RESUBMIT"}`
        },
        {n:"02", title:"Investment Overview", table:[
          {l:"Project Name",         v:projectName},
          {l:"Analysis Date",        v:today},
          {l:"Currency",             v:code},
          {l:"Construction Phase",   v:`${inputs.constructionYears} year(s)`},
          {l:"Operation Phase",      v:`${inputs.operationYears} year(s)`},
          {l:"Total Projection",     v:`${totalYears} years`},
          {l:"Total CAPEX",          v:fmtK(totals.totalCapex)},
          {l:"Equity Contribution",  v:fmtK(Number(inputs.equityAmount||0))},
          {l:"Debt Financing",       v:fmtK(Number(inputs.debtAmount||0))},
          {l:"Discount Rate (WACC)", v:pct(inputs.discountRate)},
          {l:"Tax Rate",             v:pct(inputs.taxRate)},
          {l:"Inflation Rate",       v:pct(inputs.inflationRate)},
          {l:"Terminal Value Method",v:inputs.useTerminalValue?(inputs.terminalMethod==="perpetuity"?`Perpetuity @ ${inputs.terminalGrowthRate}% growth`:`EV Multiple ${inputs.evMultiple}×`):"Not included"},
        ]},
        {n:"03", title:"Financial Results", table:[
          {l:"NPV (Nominal)",        v:fmtK(totals.npv),              h:true},
          {l:"NPV (Real)",           v:fmtK(totals.npvReal||0),       h:true},
          {l:"IRR",                  v:totals.irr?pct(totals.irr*100):"N/A", h:true},
          {l:"MIRR",                 v:pct((totals.mirr||0)*100)},
          {l:"Payback Period",       v:totals.payback>=0?`${totals.payback} years`:">projection"},
          {l:"Profitability Index",  v:`${totals.pi.toFixed(2)}×`},
          {l:"RONA",                 v:pct((totals.rona||0)*100)},
          {l:"Total EVA",            v:fmtK(totals.totalEVA)},
          {l:"Terminal Value (TV)",  v:fmtK(totals.terminalValue)},
          {l:"PV of TV",             v:fmtK(totals.tvPV)},
          {l:"Total Revenue",        v:fmtK(totals.totalRevenue)},
          {l:"Total FCF",            v:fmtK(totals.totalFCF)},
        ]},
        {n:"04", title:"Risk Assessment", content:
          `The following risk factors have been identified:\n\n• Discount Rate Risk: A 1% increase in WACC would reduce NPV by approximately ${fmtK(Math.abs(totals.npv*0.08))}.\n• Inflation Risk: At ${inputs.inflationRate}% annual inflation, the real NPV (${fmtK(totals.npvReal||0)}) is ${fmtK(Math.abs((totals.npvReal||0)-totals.npv))} ${(totals.npvReal||0)<totals.npv?"lower":"higher"} than the nominal NPV.\n• Revenue Risk: If revenues underperform by 10%, significant revision to NPV is expected.\n• Execution Risk: Construction overruns and delays would increase CAPEX and reduce returns.\n• Financing Risk: Debt obligations of ${fmtK(Number(inputs.debtAmount||0))} at ${inputs.interestRate}% must be serviced.`
        },
        {n:"05", title:"Recommendation", content:
          good
            ? `Based on the comprehensive analysis, this investment is RECOMMENDED FOR APPROVAL.\n\n✅ NPV of ${fmtK(totals.npv)} confirms value creation above the cost of capital.\n✅ IRR of ${totals.irr?pct(totals.irr*100):"N/A"} ${totals.irr&&totals.irr>inputs.discountRate/100?`exceeds WACC by ${((totals.irr-inputs.discountRate/100)*100).toFixed(1)}pp`:""}\n✅ Payback period of ${totals.payback>=0?`${totals.payback} years`:"beyond projection"} is within acceptable range.\n✅ Profitability Index of ${totals.pi.toFixed(2)}× indicates efficient use of capital.\n\nPROCEED WITH INVESTMENT.`
            : `Based on the analysis, this investment REQUIRES REVISION before approval.\n\n❌ NPV of ${fmtK(totals.npv)} indicates value destruction at the current WACC of ${inputs.discountRate}%.\n\nRecommended actions:\n1. Review revenue projections for optimistic assumptions.\n2. Reduce CAPEX or negotiate better terms.\n3. Explore debt refinancing to lower WACC.\n4. Extend the operation period to improve return.\n5. Consider reducing tax exposure through structuring.\n\nREVISE AND RESUBMIT.`
        },
      ].map((sec,i)=>(
        <div className="acard fade-up" key={sec.n} style={{marginBottom:12}}>
          <div className="acard-header">
            <span style={{fontSize:11,color:"var(--ink3)",fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase"}}>{sec.n} — {sec.title}</span>
          </div>
          <div className="acard-body">
            {sec.content&&<div style={{fontSize:13,color:"var(--ink2)",lineHeight:1.75,whiteSpace:"pre-line"}}>{sec.content}</div>}
            {sec.table&&(
              <table className="data-table">
                <tbody>
                  {sec.table.map(r=>(
                    <tr key={r.l} style={{background:r.h?"var(--emerald-l)":"transparent"}}>
                      <td style={{textAlign:"left",fontWeight:500,color:r.h?"var(--emerald)":"var(--ink2)",width:"50%"}}>{r.l}</td>
                      <td style={{fontWeight:r.h?700:400,color:r.h?"var(--emerald)":"var(--ink)"}}>{r.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ))}

      <div style={{textAlign:"center",padding:"16px 0",fontSize:12,color:"var(--ink3)"}}>
        💡 <strong>Cmd+P</strong> (Mac) or <strong>Ctrl+P</strong> (Windows) → Save as PDF
      </div>
    </div>
  );
}

/* ─── Landing Page ─────────────────────────────────────────────────── */
function LandingPage({ onLaunch, onDashboard }) {
  const FEATURES = [
    {n:"01",title:"DCF Valuation",text:"Full discounted cash flow with NPV, IRR, MIRR, Payback and Profitability Index. Nominal and real (inflation-adjusted) values using the Fisher equation.",tag:"Core"},
    {n:"02",title:"Construction + Operation Phases",text:"Model a construction phase separately from the operation phase with different periodization and cash flow profiles.",tag:"New"},
    {n:"03",title:"Multi-row CAPEX & Depreciation",text:"Up to 10 CAPEX line items each with their own depreciation method (straight-line or declining balance), timeframe and start date.",tag:"New"},
    {n:"04",title:"Revenue Driver Model",text:"Build revenue from components: units × price × factor × growth rate. Multiple revenue streams. Fully customizable labels.",tag:"New"},
    {n:"05",title:"Working Capital from Days",text:"Enter receivable days, payable days and inventory days. Working capital and its cash flow impact is calculated automatically each year.",tag:"New"},
    {n:"06",title:"Break-Even Finder",text:"Select any key variable (WACC, tax, inflation, growth rate) and the model instantly finds the exact value that makes NPV = 0.",tag:"New"},
    {n:"07",title:"Terminal / Residual Value",text:"Gordon Growth perpetuity or EV/EBITDA multiple. See the PV of terminal value and its contribution to total NPV.",tag:"Pro"},
    {n:"08",title:"EVA & RONA",text:"Economic Value Added and Return on Net Assets calculated alongside standard metrics. Understand true economic profit.",tag:"Pro"},
    {n:"09",title:"Scenario Comparison",text:"Base, Bull, Bear and Stress scenarios compared side-by-side with visual NPV and IRR charts.",tag:"Analysis"},
    {n:"10",title:"Sensitivity Heatmaps",text:"Interactive heat map showing NPV impact of ±30% change across 6 variables. Tornado chart and break-even sweep chart included.",tag:"Analysis"},
    {n:"11",title:"Auto Investment Proposal",text:"One-click professional PDF proposal with executive summary, full financials, risk assessment and recommendation.",tag:"Export"},
    {n:"12",title:"Multi-currency · 17 currencies",text:"Switch between USD, EUR, GBP, CHF, JPY and 12 more. Currency context applied to all calculations and displays.",tag:"Global"},
  ];

  return (
    <div>
      <nav className="nav">
        <div className="nav-logo" onClick={onDashboard||onLaunch}>Capital<span>IQ</span></div>
        <div className="nav-links">
          <span className="nav-link" onClick={()=>document.getElementById("features")?.scrollIntoView({behavior:"smooth"})}>Features</span>
          <span className="nav-link">Docs</span>
          <span className="nav-link">Blog</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          {onDashboard
            ? <><button className="nav-cta" style={{background:"transparent",color:"var(--ink)",border:"1.5px solid var(--border)"}} onClick={onDashboard}>My Dashboard</button><button className="nav-cta" onClick={onDashboard}>Go to app →</button></>
            : <><button className="nav-cta" style={{background:"transparent",color:"var(--ink)",border:"1.5px solid var(--border)"}} onClick={onLaunch}>Sign in</button><button className="nav-cta" onClick={onLaunch}>Get started free →</button></>
          }
        </div>
      </nav>

      <div className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">Professional Investment Analysis</div>
          <h1 className="hero-h1">Investment appraisal.<br /><em>Done properly.</em></h1>
          <p className="hero-sub">DCF valuation, multi-phase modelling, scenario analysis and board-ready proposals — for SMEs who make serious investment decisions.</p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={onDashboard||onLaunch}>{onDashboard?"Go to my dashboard →":"Create free account →"}</button>
            <button className="btn-secondary" onClick={onDashboard||onLaunch}>{onDashboard?"Open a project":"⚡ Try demo"}</button>
          </div>
          <div style={{marginTop:28,display:"flex",gap:20,flexWrap:"wrap"}}>
            {["✓ Construction + Operation phases","✓ Break-even finder","✓ Terminal value","✓ EVA & RONA","✓ Working capital from days"].map(t=>(
              <span key={t} style={{fontSize:12,color:"var(--ink3)",fontWeight:500}}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{flex:"0 0 400px",background:"var(--ink)",borderRadius:16,padding:24,boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
          <div style={{fontSize:11,color:"#7dd3b0",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:16}}>Live Preview</div>
          {[
            {l:"NPV (Nominal)",  v:"€ 284,500",  c:"#7dd3b0"},
            {l:"NPV (Real)",     v:"€ 241,200",  c:"#7dd3b0"},
            {l:"IRR",            v:"14.2%",       c:"#fff"},
            {l:"MIRR",           v:"11.8%",       c:"#fff"},
            {l:"Payback",        v:"4 years",     c:"#fff"},
            {l:"PI",             v:"1.38×",       c:"#7dd3b0"},
            {l:"RONA",           v:"18.4%",       c:"#7dd3b0"},
            {l:"Total EVA",      v:"€ 142,000",   c:"#7dd3b0"},
          ].map((r,i,arr)=>(
            <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:i<arr.length-1?"1px solid #1e2233":"none"}}>
              <span style={{fontSize:12,color:"#6b7280"}}>{r.l}</span>
              <span style={{fontSize:13,fontWeight:700,color:r.c}}>{r.v}</span>
            </div>
          ))}
          <div style={{marginTop:16,background:"rgba(13,122,85,0.15)",borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14}}>✅</span>
            <span style={{fontSize:12,color:"#7dd3b0",fontWeight:600}}>RECOMMENDED — Value created above WACC</span>
          </div>
        </div>
      </div>

      <section className="section features-bg" id="features">
        <div className="section-inner">
          <div className="section-label">What You Get</div>
          <h2 className="section-h2">Everything a finance team has.<br /><em>Without the finance team.</em></h2>
          <p className="section-sub">Every feature modelled on professional investment appraisal methodology used by investment banks — accessible to any business.</p>
          <div className="features-grid">
            {FEATURES.map(f=>(
              <div className="feature-cell" key={f.n}>
                <div className="feature-num">{f.n}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-text">{f.text}</div>
                <div className="feature-tag">{f.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="cta-banner">
        <h2>Start your first analysis today</h2>
        <p>Free forever on your first project. No credit card required.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button className="btn-cta-white" onClick={onDashboard||onLaunch}>{onDashboard?"Go to my dashboard →":"Create free account →"}</button>
          {!onDashboard&&(
            <button onClick={onLaunch} style={{padding:"16px 28px",borderRadius:8,fontSize:15,fontWeight:600,cursor:"pointer",border:"2px solid rgba(255,255,255,0.4)",background:"transparent",color:"#fff",fontFamily:"var(--sans)",transition:"all 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.8)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.4)"}>
              ⚡ Try demo — no sign up
            </button>
          )}
        </div>
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:32,marginBottom:32}}>
            <div>
              <div className="footer-logo">Capital<span>IQ</span></div>
              <div className="footer-tagline">Professional investment analysis for businesses that mean business.</div>
            </div>
            <div style={{display:"flex",gap:48,flexWrap:"wrap"}}>
              {[{title:"Product",links:["Features","Changelog","Roadmap"]},{title:"Company",links:["About","Blog","Contact"]},{title:"Legal",links:["Privacy","Terms","Security"]}].map(col=>(
                <div className="footer-links" key={col.title}>
                  <h4>{col.title}</h4>
                  {col.links.map(l=><a key={l}>{l}</a>)}
                </div>
              ))}
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© {new Date().getFullYear()} CapitalIQ. All rights reserved.</div>
            <div className="footer-copy">Made for SMEs who think big.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
