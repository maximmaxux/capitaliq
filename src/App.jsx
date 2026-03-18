import { useState, useEffect, useMemo, useCallback, createContext, useContext } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
         BarChart, Bar, ReferenceLine, LineChart, Line, ComposedChart } from "recharts";

/* ══ SUPABASE ══════════════════════════════════════════════════════════ */
const SB_URL = 'https://zbluszpcsztpzoskzkiz.supabase.co';
const SB_KEY = 'sb_publishable_-amT-RfNBnJHgM7M-UNPVg_WEtnxFK6';
const sbH  = { 'Content-Type':'application/json', apikey:SB_KEY, Authorization:`Bearer ${SB_KEY}` };
const sbAH = t => ({ ...sbH, Authorization:`Bearer ${t}` });
const sb = {
  auth:{
    signUp:async({email,password,name})=>(await fetch(`${SB_URL}/auth/v1/signup`,{method:'POST',headers:sbH,body:JSON.stringify({email,password,data:{full_name:name}})})).json(),
    signIn:async({email,password})=>(await fetch(`${SB_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:sbH,body:JSON.stringify({email,password})})).json(),
    signOut:async t=>fetch(`${SB_URL}/auth/v1/logout`,{method:'POST',headers:sbAH(t)}),
    getUser:async t=>(await fetch(`${SB_URL}/auth/v1/user`,{headers:sbAH(t)})).json(),
    resetPw:async email=>(await fetch(`${SB_URL}/auth/v1/recover`,{method:'POST',headers:sbH,body:JSON.stringify({email,redirect_to:window.location.origin})})).json(),
    updatePw:async(t,password)=>(await fetch(`${SB_URL}/auth/v1/user`,{method:'PUT',headers:sbAH(t),body:JSON.stringify({password})})).json(),
  },
  db:{
    list:  async t=>(await fetch(`${SB_URL}/rest/v1/projects?select=*&order=updated_at.desc`,{headers:sbAH(t)})).json(),
    create:async(t,d)=>{const r=await fetch(`${SB_URL}/rest/v1/projects`,{method:'POST',headers:{...sbAH(t),Prefer:'return=representation'},body:JSON.stringify(d)});const j=await r.json();return Array.isArray(j)?j[0]:j;},
    update:async(t,id,d)=>{const r=await fetch(`${SB_URL}/rest/v1/projects?id=eq.${id}`,{method:'PATCH',headers:{...sbAH(t),Prefer:'return=representation'},body:JSON.stringify({...d,updated_at:new Date().toISOString()})});const j=await r.json();return Array.isArray(j)?j[0]:j;},
    del:   async(t,id)=>fetch(`${SB_URL}/rest/v1/projects?id=eq.${id}`,{method:'DELETE',headers:sbAH(t)}),
  },
};
function getURLToken(){const h=window.location.hash;if(h&&h.includes('access_token')){const p=new URLSearchParams(h.replace('#',''));const tk=p.get('access_token');if(tk){window.history.replaceState(null,'',window.location.pathname);return tk;}}return null;}

/* ══ CURRENCY ══════════════════════════════════════════════════════════ */
const CURRENCIES=[
  {code:"USD",sym:"$",locale:"en-US"},{code:"EUR",sym:"€",locale:"de-DE"},
  {code:"GBP",sym:"£",locale:"en-GB"},{code:"CHF",sym:"Fr",locale:"de-CH"},
  {code:"SEK",sym:"kr",locale:"sv-SE"},{code:"NOK",sym:"kr",locale:"nb-NO"},
  {code:"PLN",sym:"zł",locale:"pl-PL"},{code:"JPY",sym:"¥",locale:"ja-JP"},
  {code:"INR",sym:"₹",locale:"en-IN"},{code:"AUD",sym:"A$",locale:"en-AU"},
  {code:"CAD",sym:"C$",locale:"en-CA"},{code:"BRL",sym:"R$",locale:"pt-BR"},
  {code:"AED",sym:"د.إ",locale:"ar-AE"},{code:"TRY",sym:"₺",locale:"tr-TR"},
];
const CurCtx=createContext({code:"EUR",sym:"€",locale:"de-DE"});
const useCur=()=>useContext(CurCtx);
function useFmt(){
  const c=useCur();
  const fmt=n=>{
    if(n===null||n===undefined||!isFinite(n)) return "—";
    const a=Math.abs(n);
    if(a>=1e9) return`${n<0?"-":""}${c.sym}${(Math.abs(n)/1e9).toFixed(2)}B`;
    if(a>=1e6) return`${n<0?"-":""}${c.sym}${(Math.abs(n)/1e6).toFixed(2)}M`;
    if(a>=1e3) return`${n<0?"-":""}${c.sym}${(Math.abs(n)/1e3).toFixed(0)}K`;
    return new Intl.NumberFormat(c.locale,{style:"currency",currency:c.code,maximumFractionDigits:0}).format(n);
  };
  return{fmt,sym:c.sym,code:c.code};
}
const pct=(n,d=1)=>(n===null||!isFinite(n)||Math.abs(n)>500)?'—':`${Number(n).toFixed(d)}%`;
const xN=(n,d=2)=>(n===null||!isFinite(n)||Math.abs(n)>500)?'—':`${Number(n).toFixed(d)}×`;

/* ══ FINANCIAL ENGINE ══════════════════════════════════════════════════ */
const clamp=(v,mn,mx)=>Math.max(mn,Math.min(mx,isFinite(Number(v))?Number(v):mn));

function calcIRR(cfs){
  // Require at least one sign change
  const hasPos=cfs.some(v=>v>0), hasNeg=cfs.some(v=>v<0);
  if(!hasPos||!hasNeg) return null;
  const npvAt=r=>cfs.reduce((s,v,t)=>s+v/Math.pow(1+r,t),0);
  const dnpv=r=>cfs.reduce((s,v,t)=>s-t*v/Math.pow(1+r,t+1),0);
  for(const g of [0.1,0.2,0.5,0.01,-0.05,0.3,0.8]){
    let r=g;
    for(let i=0;i<300;i++){
      const v=npvAt(r),d=dnpv(r);
      if(!d||!isFinite(d)) break;
      const nr=r-v/d;
      if(!isFinite(nr)) break;
      if(Math.abs(nr-r)<1e-10){r=nr;break;}
      r=Math.max(-0.999,Math.min(50,nr));
    }
    const check=npvAt(r);
    // Accept only if NPV≈0 and rate is in realistic range
    if(isFinite(r)&&Math.abs(check)<1&&r>-0.999&&r<50) return r;
  }
  return null;
}

function calcMIRR(cfs,disc){
  const n=cfs.length-1;
  if(n<1) return null;
  let pvN=0,fvP=0;
  cfs.forEach((v,t)=>{
    if(v<0) pvN+=Math.abs(v)/Math.pow(1+disc,t);
    if(v>0) fvP+=v*Math.pow(1+disc,n-t);
  });
  if(pvN<=0||fvP<=0) return null;
  const r=Math.pow(fvP/pvN,1/n)-1;
  return isFinite(r)&&r>-0.999&&r<50?r:null;
}

/* ── Default inputs ── */
const DEF={
  constructionYears:1,operationYears:5,
  discountRate:10,taxRate:21,inflationRate:2,
  revenueLines:[
    {id:1,name:"Product Sales",d1:1000,d1l:"Units",d2:50,d2l:"Price/unit",growth:5,on:true},
    {id:2,name:"Service Revenue",d1:0,d1l:"Contracts",d2:0,d2l:"Value each",growth:0,on:false},
    {id:3,name:"Licensing",d1:0,d1l:"Licences",d2:0,d2l:"Fee each",growth:0,on:false},
  ],
  // costLines: isCOGS=true means COGS (used for WC payables/inventory), false = OpEx
  costLines:[
    {id:1,name:"COGS / Materials",val:0,pctRev:true,pct:55,growth:0,on:true,isCOGS:true},
    {id:2,name:"Personnel",val:8000,pctRev:false,pct:0,growth:3,on:true,isCOGS:false},
    {id:3,name:"Rent & Facilities",val:3000,pctRev:false,pct:0,growth:2,on:true,isCOGS:false},
    {id:4,name:"Sales & Marketing",val:2000,pctRev:false,pct:0,growth:5,on:true,isCOGS:false},
    {id:5,name:"G&A",val:1500,pctRev:false,pct:0,growth:2,on:true,isCOGS:false},
    {id:6,name:"R&D",val:0,pctRev:false,pct:0,growth:0,on:false,isCOGS:false},
  ],
  capexRows:[
    {id:1,name:"Machinery & Equipment",amts:[50000,0,0,0,0,0,0],deprM:"SL",deprY:10,on:true},
    {id:2,name:"IT Systems",amts:[10000,0,0,0,0,0,0],deprM:"SL",deprY:5,on:true},
    {id:3,name:"Building / Property",amts:[0,0,0,0,0,0,0],deprM:"SL",deprY:30,on:false},
    {id:4,name:"Vehicles",amts:[0,0,0,0,0,0,0],deprM:"SL",deprY:5,on:false},
    {id:5,name:"Intangibles",amts:[0,0,0,0,0,0,0],deprM:"SL",deprY:5,on:false},
  ],
  receivDays:30,payablDays:45,inventDays:30,
  debtAmt:30000,intRate:5.5,loanYrs:5,
  useTv:true,tvMethod:"perpetuity",tvGrowth:2,evMult:8,
};

function calcFinancials(raw){
  const inp={...DEF,...raw};
  const opsY=clamp(inp.constructionYears,0,5);
  const opY=clamp(inp.operationYears,1,30);
  const yrs=opsY+opY;
  const disc=clamp(inp.discountRate,0.1,100)/100;
  const tax=clamp(inp.taxRate,0,99)/100;
  const inf=clamp(inp.inflationRate,0,50)/100;

  // ── 1. REVENUE (compound growth) ──────────────────────────────────────
  const rev=Array.from({length:yrs},(_,yi)=>{
    if(yi<opsY) return 0;
    const oy=yi-opsY+1; // operation year 1,2,3...
    return(inp.revenueLines||[]).filter(r=>r.on).reduce((s,r)=>{
      const base=(Number(r.d1)||0)*(Number(r.d2)||0);
      // Compound growth: base × (1+g)^(oy-1)
      return s+base*Math.pow(1+clamp(r.growth,-50,100)/100,oy-1);
    },0);
  });

  // ── 2. COSTS: separate COGS from OpEx ─────────────────────────────────
  // isCOGS=true → COGS (used for WC: payables/inventory based on COGS)
  // isCOGS=false or undefined with id≠1 → OpEx
  // Default: id===1 is COGS, everything else is OpEx (matches DEF defaults)
  const isCOGSLine=(c)=>c.isCOGS===true||(c.isCOGS===undefined&&c.id===1);

  const calcCostLine=(cl,yi,revYi,oy)=>{
    if(yi<opsY) return 0;
    return cl.pctRev
      ? revYi*clamp(cl.pct,0,100)/100
      : Number(cl.val||0)*Math.pow(1+clamp(cl.growth,-50,100)/100,oy-1);
  };

  const cogs=Array.from({length:yrs},(_,yi)=>{
    if(yi<opsY) return 0;
    const oy=yi-opsY+1;
    return(inp.costLines||[]).filter(c=>c.on&&isCOGSLine(c))
      .reduce((s,c)=>s+calcCostLine(c,yi,rev[yi],oy),0);
  });

  const opex=Array.from({length:yrs},(_,yi)=>{
    if(yi<opsY) return 0;
    const oy=yi-opsY+1;
    return(inp.costLines||[]).filter(c=>c.on&&!isCOGSLine(c))
      .reduce((s,c)=>s+calcCostLine(c,yi,rev[yi],oy),0);
  });

  const totalCost=cogs.map((g,i)=>g+opex[i]);

  // ── 3. CAPEX + DEPRECIATION ───────────────────────────────────────────
  const capex=Array(yrs).fill(0),depr=Array(yrs).fill(0);
  (inp.capexRows||[]).filter(r=>r.on).forEach(cr=>{
    let total=0;
    (cr.amts||[]).forEach((a,i)=>{if(i<yrs){const v=Number(a)||0;capex[i]+=v;total+=v;}});
    if(total<=0||cr.deprM==="None") return;
    const dy=clamp(cr.deprY,1,50);
    const ann=total/dy; // straight-line annual depreciation
    const st=(cr.amts||[]).findIndex(a=>Number(a)>0);
    const s=st>=0?st:0;
    // Depreciate exactly dy years from start of CAPEX (no depreciation beyond useful life)
    for(let y=s;y<Math.min(s+dy,yrs);y++) depr[y]+=ann;
  });
  const totCapex=capex.reduce((a,b)=>a+b,0);

  // ── 4. DEBT SERVICE ───────────────────────────────────────────────────
  const intArr=Array(yrs).fill(0);
  let bal=Number(inp.debtAmt)||0;
  const iR=clamp(inp.intRate,0,50)/100;
  const lT=clamp(inp.loanYrs,1,30);
  const annRepay=lT>0?bal/lT:0;
  for(let y=0;y<Math.min(lT,yrs);y++){
    intArr[y]=bal>0?bal*iR:0; // only charge interest while balance > 0
    bal=Math.max(0,bal-annRepay);
  }

  // ── 5. WORKING CAPITAL ────────────────────────────────────────────────
  // Per spec: Receivables = Rev × DSO/365; Payables = COGS × DPO/365; Inventory = COGS × DIO/365
  const wc=Array.from({length:yrs},(_,yi)=>{
    if(yi<opsY) return 0;
    const rec=rev[yi]*clamp(inp.receivDays,0,365)/365;
    const pay=cogs[yi]*clamp(inp.payablDays,0,365)/365; // payables based on COGS only
    const inv=cogs[yi]*clamp(inp.inventDays,0,365)/365; // inventory based on COGS only
    return rec+inv-pay;
  });
  // ΔNWC: positive = cash outflow (increase in NWC); negative = cash inflow
  const dwc=wc.map((w,i)=>w-(i>0?wc[i-1]:0));

  // ── 6. INCOME STATEMENT ───────────────────────────────────────────────
  // Revenue
  // − COGS
  // = Gross Profit
  // − OpEx (Personnel, S&M, Admin, R&D)
  // = EBITDA
  // − Depreciation
  // = EBIT
  // − Interest
  // = EBT
  // − Tax (on positive EBT only)
  // = Net Income
  const gp    = rev.map((r,i)=>r-cogs[i]);              // Gross Profit
  const ebitda= gp.map((g,i)=>g-opex[i]);               // EBITDA = GP - OpEx
  const ebit  = ebitda.map((e,i)=>e-depr[i]);           // EBIT = EBITDA - D&A
  const ebt   = ebit.map((e,i)=>e-intArr[i]);           // EBT = EBIT - Interest
  const txA   = ebt.map(e=>Math.max(0,e*tax));           // Tax (no tax on losses)
  const ni    = ebt.map((e,i)=>e-txA[i]);               // Net Income

  // ── 7. FREE CASH FLOW (Option A: EBIT-based, single formula) ─────────
  // FCF = EBIT × (1 − tax) + Depreciation − CAPEX − ΔNWC
  // This is the standard unlevered (operating) FCF
  const fcf=Array.from({length:yrs},(_,i)=>
    ebit[i]*(1-tax)+depr[i]-capex[i]-dwc[i]
  );

  // ── 8. TERMINAL VALUE ─────────────────────────────────────────────────
  let tv=0;
  if(inp.useTv&&fcf.length>0){
    const lastFCF=fcf[fcf.length-1];
    const tg=clamp(inp.tvGrowth,-5,20)/100;
    if((inp.tvMethod||"perpetuity")==="perpetuity"){
      // Gordon Growth: TV = FCF_last × (1+g) / (WACC - g)
      // Only valid if WACC > g and last FCF > 0
      tv=(disc>tg&&lastFCF>0)?lastFCF*(1+tg)/(disc-tg):0;
    } else {
      // Exit multiple: TV = last EBITDA × multiple
      const lastEBITDA=ebitda[ebitda.length-1];
      tv=lastEBITDA>0?lastEBITDA*clamp(inp.evMult,1,50):0;
    }
  }
  // PV of terminal value (always discount at nominal WACC over full project life)
  const tvPV=tv>0?tv/Math.pow(1+disc,yrs):0;

  // ── 9. NOMINAL NPV ────────────────────────────────────────────────────
  // NPV = -InitialCapex + Σ FCF_t/(1+WACC)^t + TV/(1+WACC)^n
  let npvNom = -totCapex;
  const cumNpv = [];
  for (let i = 0; i < fcf.length; i++) {
    npvNom += fcf[i] / Math.pow(1 + disc, i + 1);
    // Add PV of terminal value only in the final year — it is a Year-N receipt,
    // not a Year-0 item. This keeps the cumulative chart correctly in negative
    // territory early on and only inflects upward as cash flows accumulate.
    const cumWithTv = i === fcf.length - 1 ? npvNom + tvPV : npvNom;
    cumNpv.push(cumWithTv);
  }
  const npv = Math.round(npvNom + tvPV);

  // ── 10. REAL NPV ──────────────────────────────────────────────────────
  //
  // Real WACC (Fisher): r_real = (1 + r_nom) / (1 + inflation) − 1
  //
  // Real NPV = nominal FCFs discounted at the real WACC.
  //
  // This answers: "Does the project create value above the real (inflation-
  // adjusted) cost of capital?" Because r_real < r_nom when inflation > 0,
  // Real NPV > Nominal NPV for positive FCF streams — the gap widens with
  // higher inflation. When inflation = 0, r_real = r_nom and the two are equal.
  //
  // Note: deflating FCFs first then discounting at real WACC produces the
  // same result as nominal NPV (algebraic identity), so we do NOT deflate.
  //
  const realW = (1 + disc) / (1 + inf) - 1;  // Fisher real WACC

  // TV in real terms: discount TV at real WACC (TV is a nominal future value)
  const tvPVReal = tv > 0 ? tv / Math.pow(1 + realW, yrs) : 0;

  // Real NPV: nominal FCFs at real WACC
  let npvReal = -totCapex + tvPVReal;
  for (let i = 0; i < fcf.length; i++) {
    npvReal += fcf[i] / Math.pow(1 + realW, i + 1);
  }
  const npvR = Math.round(npvReal);

  // ── 11. IRR & MIRR ────────────────────────────────────────────────────
  // Build single FCF array: [−totCapex, FCF_1, FCF_2, ..., FCF_n+TV]
  const irrCFs=[-totCapex,...fcf];
  if(tv>0) irrCFs[irrCFs.length-1]+=tv; // add TV to final year
  const irr=totCapex>10?calcIRR(irrCFs):null;
  const mirr=totCapex>10?calcMIRR(irrCFs,disc):null;

  // ── 12. PAYBACK PERIOD ────────────────────────────────────────────────
  // Interpolated payback from cumulative undiscounted FCF
  let cumPb=-totCapex, pb=-1, pbPartial=null;
  for(let i=0;i<fcf.length;i++){
    const prevCum=cumPb;
    cumPb+=fcf[i];
    if(cumPb>=0&&pb<0){
      // Interpolate: pb = i+1 - cumPb/fcf[i] (fraction of year)
      const frac=fcf[i]>0?Math.abs(prevCum)/fcf[i]:0;
      pbPartial=i+frac; // e.g. 3.7 years
      pb=i+1; // integer year when cumulative first ≥ 0
    }
  }

  // ── 13. EVA per year ─────────────────────────────────────────────────
  // EVA_t = NOPAT_t − (WACC × InvestedCapital_t)
  // NOPAT = EBIT × (1 − tax)
  // InvestedCapital_t = cumulative CAPEX − cumulative Depreciation + NWC_t
  const cumCapex=Array(yrs).fill(0), cumDepr=Array(yrs).fill(0);
  for(let i=0;i<yrs;i++){
    cumCapex[i]=(i>0?cumCapex[i-1]:0)+capex[i];
    cumDepr[i]=(i>0?cumDepr[i-1]:0)+depr[i];
  }
  const nopat=ebit.map(e=>e*(1-tax));
  const eva=Array.from({length:yrs},(_,i)=>{
    const ic=Math.max(0,cumCapex[i]-cumDepr[i])+Math.max(0,wc[i]);
    return nopat[i]-disc*ic;
  });
  const totalEVA=eva.reduce((a,b)=>a+b,0);

  // ── 14. RONA ──────────────────────────────────────────────────────────
  // RONA = EBIT / (Net Fixed Assets + NWC)
  // Use average EBIT across operating years and average invested capital
  const opEBIT=ebit.filter((_,i)=>i>=opsY);
  const avgEBIT=opEBIT.length?opEBIT.reduce((a,b)=>a+b,0)/opEBIT.length:0;
  const avgIC=Array.from({length:yrs},(_,i)=>Math.max(0,cumCapex[i]-cumDepr[i])+Math.max(0,wc[i]))
    .filter((_,i)=>i>=opsY);
  const avgICVal=avgIC.length?avgIC.reduce((a,b)=>a+b,0)/avgIC.length:1;
  const rona=avgICVal>0?avgEBIT/avgICVal:0;

  // ── 15. PI (Profitability Index) ──────────────────────────────────────
  // PI = 1 + NPV / |Initial Investment|
  // A PI > 1 means NPV > 0 (value creating)
  const pi=totCapex>0?1+(npvNom/totCapex):0;

  // ── 16. SCHEDULE ──────────────────────────────────────────────────────
  const sched=Array.from({length:yrs},(_,i)=>({
    year:i+1,
    phase:i<opsY?"Construction":"Operation",
    revenue:   Math.round(rev[i]),
    cogs:      Math.round(cogs[i]),
    opex:      Math.round(opex[i]),
    costs:     Math.round(totalCost[i]),      // total = COGS + OpEx
    grossProfit:Math.round(gp[i]),
    ebitda:    Math.round(ebitda[i]),
    depreciation:Math.round(depr[i]),
    ebit:      Math.round(ebit[i]),
    interest:  Math.round(intArr[i])===0&&bal<=0?0:Math.round(intArr[i]), // no -0
    ebt:       Math.round(ebt[i]),
    tax:       Math.round(txA[i]),
    netIncome: Math.round(ni[i]),
    capex:     Math.round(capex[i]),
    wcChange:  Math.round(dwc[i]),
    fcf:       Math.round(fcf[i]),
    cumNPV:    Math.round(cumNpv[i]),
    eva:       Math.round(eva[i]),
    nopat:     Math.round(nopat[i]),
    nwc:       Math.round(wc[i]),
  }));

  // ── 17. INTERNAL VALIDATION (runtime checks) ──────────────────────────
  if(typeof console!=="undefined"){
    // Check: total EVA == sum of yearly EVA
    const sumEVA=sched.reduce((s,r)=>s+r.eva,0);
    if(Math.abs(sumEVA-Math.round(totalEVA))>2)
      console.warn(`[CIQ] EVA mismatch: sum=${sumEVA} total=${Math.round(totalEVA)}`);
    // Check: FCF consistency
    sched.forEach(r=>{
      const expected=Math.round(r.ebit*(1-tax)+r.depreciation-r.capex-r.wcChange);
      if(Math.abs(r.fcf-expected)>2)
        console.warn(`[CIQ] FCF mismatch yr${r.year}: sched=${r.fcf} expected=${expected}`);
    });
    // Check: NPV recomputed
    let npvCheck=-totCapex;
    sched.forEach((r,i)=>{npvCheck+=r.fcf/Math.pow(1+disc,i+1);});
    if(tv>0) npvCheck+=tvPV;
    if(Math.abs(npvCheck-npv)>5)
      console.warn(`[CIQ] NPV mismatch: displayed=${npv} recomputed=${Math.round(npvCheck)}`);
  }

  // ── TV DRIVEN WARNING ─────────────────────────────────────────────────
  // Flag if cumulative operating FCF (without TV) is negative — NPV relies on TV
  const operatingNPV=npv-Math.round(tvPV);
  const tvDriven=tvPV>0&&operatingNPV<0;

  // ── REAL IRR (Fisher deflation of nominal IRR) ────────────────────────
  // Real IRR = (1 + nominal IRR) / (1 + inflation) - 1
  // This IS genuinely different from nominal IRR whenever inflation > 0.
  // It answers: "What is the return above inflation?"
  const realIRR = irr != null ? (1 + irr) / (1 + inf) - 1 : null;

  // Note on npvR: as proved mathematically, deflating FCFs then discounting
  // at real WACC is algebraically identical to nominal NPV. npvR will equal
  // npv (up to floating-point rounding). We retain it for display transparency.
  // The meaningful inflation metric is realIRR.

  return{
    sched,
    npv, npvR,
    irr, mirr, realIRR,
    pb,           // integer year, -1 if not reached
    pbPartial,    // decimal year (e.g. 3.7), null if not reached
    pi:isFinite(pi)?pi:0,
    rona:isFinite(rona)?rona:0,
    totalEVA,
    totCapex,
    totRev:rev.reduce((a,b)=>a+b,0),
    totCost:totalCost.reduce((a,b)=>a+b,0),
    totCOGS:cogs.reduce((a,b)=>a+b,0),
    totOpex:opex.reduce((a,b)=>a+b,0),
    totFCF:fcf.reduce((a,b)=>a+b,0),
    tv:Math.round(tv), tvPV:Math.round(tvPV),
    tvDriven, realW,
  };
}

function doBreakEven(inp,key){
  const bounds={discountRate:[0.5,80],taxRate:[1,98],inflationRate:[0.1,40],tvGrowth:[-4,18],intRate:[0,40]};
  const[lo0,hi0]=bounds[key]||[0,100];
  const npvAt=v=>{
    try{return calcFinancials({...DEF,...inp,[key]:v}).npv;}catch{return null;}
  };
  const vLo=npvAt(lo0),vHi=npvAt(hi0);
  if(vLo===null||vHi===null||!isFinite(vLo)||!isFinite(vHi)) return null;
  if(vLo*vHi>0) return null; // no sign change → no break-even in range
  let lo=lo0,hi=hi0;
  for(let i=0;i<120;i++){
    const mid=(lo+hi)/2,v=npvAt(mid);
    if(v===null||!isFinite(v)) return null;
    if(Math.abs(v)<5) return mid;
    if((vLo<0)===(v<0)) lo=mid; else hi=mid;
  }
  return(lo+hi)/2;
}

/* ══ APPLE HIG DESIGN SYSTEM — PREMIUM TIER ════════════════════════════ */
const Styles=()=>(
<style>{`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{font-size:15px;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;scroll-behavior:smooth;}
  body{font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;background:var(--bg);color:var(--text-primary);overflow-x:hidden;}

  /* ── LIGHT MODE TOKENS ── */
  :root{
    /* Backgrounds — layered depth */
    --bg:#f5f5f7;
    --bg2:#ffffff;
    --bg3:#f0f0f5;
    --bg-mesh:linear-gradient(135deg,#f5f5f7 0%,#efeff4 50%,#f5f5f7 100%);

    /* Glassmorphism surfaces */
    --surface:rgba(255,255,255,0.78);
    --surface2:rgba(255,255,255,0.92);
    --surface-solid:#ffffff;
    --glass:rgba(255,255,255,0.62);
    --glass-stroke:rgba(255,255,255,0.9);
    --glass-inner:rgba(255,255,255,0.4);

    /* Text — Apple's exact system grays */
    --text-primary:#1d1d1f;
    --text-secondary:#424245;
    --text-tertiary:#86868b;
    --text-quaternary:#b0b0b6;

    /* Separators */
    --sep:rgba(0,0,0,0.08);
    --sep2:rgba(0,0,0,0.05);
    --sep-solid:#e0e0e5;

    /* SF System Colors */
    --blue:#0071e3;
    --blue-light:#147ce5;
    --blue-bg:rgba(0,113,227,0.09);
    --blue-ring:rgba(0,113,227,0.25);
    --green:#1d8348;
    --green-vivid:#34c759;
    --green-bg:rgba(29,131,72,0.09);
    --red:#d93025;
    --red-vivid:#ff3b30;
    --red-bg:rgba(217,48,37,0.09);
    --amber:#b45309;
    --amber-vivid:#ff9500;
    --amber-bg:rgba(180,83,9,0.09);
    --purple:#6b21a8;
    --purple-vivid:#af52de;
    --purple-bg:rgba(107,33,168,0.09);
    --indigo:#4f46e5;

    /* Fills */
    --fill1:rgba(0,0,0,0.05);
    --fill2:rgba(0,0,0,0.08);
    --fill3:rgba(0,0,0,0.12);
    --fill4:rgba(0,0,0,0.18);

    /* Elevation shadows — Apple's exact multi-layer approach */
    --elev0:none;
    --elev1:0 1px 2px rgba(0,0,0,0.05),0 0 0 0.5px rgba(0,0,0,0.04);
    --elev2:0 2px 6px rgba(0,0,0,0.06),0 0 0 0.5px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.9);
    --elev3:0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.04),0 0 0 0.5px rgba(0,0,0,0.04);
    --elev4:0 8px 28px rgba(0,0,0,0.10),0 3px 8px rgba(0,0,0,0.06),0 0 0 0.5px rgba(0,0,0,0.04);
    --elev5:0 20px 60px rgba(0,0,0,0.14),0 8px 20px rgba(0,0,0,0.08),0 0 0 0.5px rgba(0,0,0,0.04);

    /* Glass shadow */
    --glass-shadow:0 8px 32px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.9);

    /* Geometry */
    --r-xs:6px;--r-sm:10px;--r:14px;--r-lg:18px;--r-xl:22px;--r-2xl:28px;--r-3xl:36px;
    --sidebar-w:252px;
    --topbar-h:50px;

    /* Motion */
    --ease-spring:cubic-bezier(0.34,1.56,0.64,1);
    --ease-out:cubic-bezier(0.16,1,0.3,1);
    --dur-fast:120ms;--dur:200ms;--dur-slow:350ms;
  }

  /* ── DARK MODE — TRUE OLED BLACK ── */
  @media(prefers-color-scheme:dark){:root{
    --bg:#000000;
    --bg2:#0a0a0a;
    --bg3:#111111;
    --bg-mesh:linear-gradient(135deg,#000 0%,#080808 50%,#000 100%);

    --surface:rgba(28,28,28,0.88);
    --surface2:rgba(36,36,36,0.94);
    --surface-solid:#1a1a1a;
    --glass:rgba(26,26,26,0.72);
    --glass-stroke:rgba(255,255,255,0.07);
    --glass-inner:rgba(255,255,255,0.04);

    --text-primary:#f5f5f7;
    --text-secondary:rgba(245,245,247,0.65);
    --text-tertiary:rgba(245,245,247,0.38);
    --text-quaternary:rgba(245,245,247,0.22);

    --sep:rgba(255,255,255,0.08);
    --sep2:rgba(255,255,255,0.04);
    --sep-solid:#2a2a2a;

    --blue:#2196f3;
    --blue-light:#42a5f5;
    --blue-bg:rgba(33,150,243,0.14);
    --blue-ring:rgba(33,150,243,0.3);
    --green:#22c55e;
    --green-vivid:#30d158;
    --green-bg:rgba(34,197,94,0.13);
    --red:#f44336;
    --red-vivid:#ff453a;
    --red-bg:rgba(244,67,54,0.13);
    --amber:#f59e0b;
    --amber-vivid:#ff9f0a;
    --amber-bg:rgba(245,158,11,0.13);
    --purple:#a855f7;
    --purple-vivid:#bf5af2;
    --purple-bg:rgba(168,85,247,0.13);
    --indigo:#6366f1;

    --fill1:rgba(255,255,255,0.05);
    --fill2:rgba(255,255,255,0.09);
    --fill3:rgba(255,255,255,0.14);
    --fill4:rgba(255,255,255,0.20);

    --elev0:none;
    --elev1:0 1px 2px rgba(0,0,0,0.5),0 0 0 0.5px rgba(255,255,255,0.06);
    --elev2:0 2px 8px rgba(0,0,0,0.6),0 0 0 0.5px rgba(255,255,255,0.07),inset 0 1px 0 rgba(255,255,255,0.06);
    --elev3:0 4px 16px rgba(0,0,0,0.7),0 1px 4px rgba(0,0,0,0.5),0 0 0 0.5px rgba(255,255,255,0.07);
    --elev4:0 8px 28px rgba(0,0,0,0.8),0 3px 8px rgba(0,0,0,0.6),0 0 0 0.5px rgba(255,255,255,0.07);
    --elev5:0 20px 60px rgba(0,0,0,0.9),0 8px 20px rgba(0,0,0,0.7),0 0 0 0.5px rgba(255,255,255,0.07);
    --glass-shadow:0 8px 32px rgba(0,0,0,0.5),0 2px 8px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.06);
  }}

  /* ── TYPOGRAPHY — DM Sans (SF Pro feel) ── */
  .t-display{font-size:36px;font-weight:700;letter-spacing:-1px;line-height:1.08;}
  .t-title1{font-size:26px;font-weight:700;letter-spacing:-0.6px;line-height:1.15;}
  .t-title2{font-size:20px;font-weight:700;letter-spacing:-0.4px;line-height:1.2;}
  .t-title3{font-size:17px;font-weight:600;letter-spacing:-0.2px;line-height:1.3;}
  .t-headline{font-size:14px;font-weight:600;line-height:1.4;letter-spacing:-0.1px;}
  .t-body{font-size:14px;font-weight:400;line-height:1.55;}
  .t-callout{font-size:13px;font-weight:400;line-height:1.45;}
  .t-footnote{font-size:12px;font-weight:400;color:var(--text-tertiary);line-height:1.4;}
  .t-caption{font-size:11px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase;color:var(--text-tertiary);}
  .t-num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1,"salt" 1;}
  .t-mono{font-family:'DM Mono',ui-monospace,monospace;font-size:13px;letter-spacing:-0.2px;}

  /* ── SHELL LAYOUT ── */
  .app-shell{display:flex;height:100dvh;overflow:hidden;background:var(--bg);}

  /* ── SIDEBAR — TRUE GLASSMORPHISM ── */
  .sidebar{
    width:var(--sidebar-w);flex-shrink:0;
    display:flex;flex-direction:column;
    position:relative;z-index:20;
    /* Multi-layer glass */
    background:var(--surface);
    backdrop-filter:saturate(200%) blur(28px);
    -webkit-backdrop-filter:saturate(200%) blur(28px);
    border-right:1px solid var(--sep);
    /* Inner highlight */
    box-shadow:inset -1px 0 0 var(--glass-stroke);
  }
  /* Subtle noise texture on sidebar */
  .sidebar::before{
    content:'';position:absolute;inset:0;pointer-events:none;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    opacity:0.4;z-index:0;border-radius:inherit;
  }
  .sidebar>*{position:relative;z-index:1;}

  .sidebar-logo{
    height:var(--topbar-h);display:flex;align-items:center;
    padding:0 16px;gap:9px;
    border-bottom:1px solid var(--sep);
    cursor:pointer;flex-shrink:0;
  }
  .logo-mark{
    width:26px;height:26px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
  }
  .logo-mark svg{display:block;}
  .logo-text{font-size:16px;font-weight:700;letter-spacing:-0.4px;color:var(--text-primary);}
  .logo-text span{color:var(--blue);}

  .sidebar-section-label{
    font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;
    color:var(--text-quaternary);padding:16px 18px 6px;
  }
  .sidebar-nav{flex:1;overflow-y:auto;padding:6px 8px;scrollbar-width:none;}
  .sidebar-nav::-webkit-scrollbar{display:none;}

  .nav-item{
    display:flex;align-items:center;gap:9px;
    padding:7px 10px;border-radius:var(--r-sm);
    cursor:pointer;transition:background var(--dur) var(--ease-out),color var(--dur) var(--ease-out);
    font-size:13.5px;font-weight:500;
    color:var(--text-tertiary);border:none;background:none;
    font-family:inherit;width:100%;text-align:left;position:relative;
  }
  .nav-item:hover{background:var(--fill1);color:var(--text-primary);}
  .nav-item.active{background:var(--blue-bg);color:var(--blue);font-weight:600;}
  .nav-item.active::before{
    content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);
    width:3px;height:60%;background:var(--blue);border-radius:0 2px 2px 0;
  }
  .nav-icon{
    width:26px;height:26px;border-radius:7px;
    display:flex;align-items:center;justify-content:center;
    font-size:13px;flex-shrink:0;
    background:var(--fill1);
    transition:all var(--dur);
  }
  .nav-item.active .nav-icon{background:var(--blue-bg);}
  .nav-item:hover .nav-icon{background:var(--fill2);}

  .sidebar-bottom{
    padding:10px 8px;border-top:1px solid var(--sep);flex-shrink:0;
  }
  .sidebar-result-pill{
    background:var(--fill1);border-radius:var(--r);
    padding:12px 14px;margin-bottom:8px;
  }
  .sidebar-result-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}
  .sidebar-result-row:last-child{margin-bottom:0;}
  .sidebar-result-label{font-size:11px;font-weight:600;color:var(--text-quaternary);text-transform:uppercase;letter-spacing:0.4px;}
  .sidebar-result-val{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;}

  /* ── MAIN CONTENT AREA ── */
  .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:var(--bg);}

  /* ── TOPBAR — GLASS CHROME ── */
  .topbar{
    height:var(--topbar-h);flex-shrink:0;
    display:flex;align-items:center;gap:8px;
    padding:0 18px;
    background:var(--surface);
    backdrop-filter:saturate(200%) blur(28px);
    -webkit-backdrop-filter:saturate(200%) blur(28px);
    border-bottom:1px solid var(--sep);
    box-shadow:0 1px 0 var(--glass-stroke);
    position:relative;z-index:10;
  }

  /* ── CONTENT SCROLL ── */
  .content{
    flex:1;overflow-y:auto;
    padding:24px 24px 40px;
    scrollbar-width:thin;
    scrollbar-color:var(--fill3) transparent;
  }
  .content::-webkit-scrollbar{width:5px;}
  .content::-webkit-scrollbar-track{background:transparent;}
  .content::-webkit-scrollbar-thumb{background:var(--fill3);border-radius:99px;}

  /* ── CARDS — LAYERED GLASS ── */
  .card{
    background:var(--surface-solid);
    border:1px solid var(--sep);
    border-radius:var(--r-xl);
    overflow:hidden;
    box-shadow:var(--elev2);
    position:relative;
  }
  /* Top-edge highlight for depth */
  .card::before{
    content:'';position:absolute;top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent,var(--glass-stroke) 30%,var(--glass-stroke) 70%,transparent);
    pointer-events:none;z-index:1;
  }
  .card-glass{
    background:var(--glass);
    backdrop-filter:blur(20px);
    -webkit-backdrop-filter:blur(20px);
    border:1px solid var(--sep);
    border-radius:var(--r-xl);
    box-shadow:var(--glass-shadow);
  }
  .card-header{
    padding:14px 18px 13px;
    border-bottom:1px solid var(--sep);
    display:flex;align-items:center;justify-content:space-between;
    background:linear-gradient(180deg,var(--fill1) 0%,transparent 100%);
  }
  .card-body{padding:18px;}
  .card-body-sm{padding:12px 16px;}

  /* ── KPI CARDS ── */
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;}
  .kpi-card{
    background:var(--surface-solid);
    border:1px solid var(--sep);
    border-radius:var(--r-lg);
    padding:14px 16px 15px;
    box-shadow:var(--elev1);
    transition:transform var(--dur) var(--ease-out),box-shadow var(--dur) var(--ease-out);
    position:relative;overflow:hidden;
  }
  .kpi-card::after{
    content:'';position:absolute;bottom:0;left:0;right:0;height:2px;
    background:var(--accent-bar,transparent);border-radius:0 0 var(--r-lg) var(--r-lg);
  }
  .kpi-card:hover{transform:translateY(-2px);box-shadow:var(--elev3);}
  .kpi-card.kpi-green{--accent-bar:var(--green-vivid);}
  .kpi-card.kpi-red{--accent-bar:var(--red-vivid);}
  .kpi-card.kpi-blue{--accent-bar:var(--blue);}
  .kpi-card.kpi-amber{--accent-bar:var(--amber-vivid);}

  .kpi-label{font-size:10.5px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:7px;}
  .kpi-value{font-size:24px;font-weight:700;letter-spacing:-0.6px;color:var(--text-primary);font-variant-numeric:tabular-nums;line-height:1;}
  .kpi-value.green{color:var(--green);}
  .kpi-value.red{color:var(--red);}
  .kpi-value.blue{color:var(--blue);}
  .kpi-value.amber{color:var(--amber);}
  .kpi-badge{
    display:inline-flex;align-items:center;gap:3px;
    margin-top:6px;font-size:10.5px;font-weight:600;
    padding:2px 7px;border-radius:99px;
  }
  .badge-green{background:var(--green-bg);color:var(--green);}
  .badge-red{background:var(--red-bg);color:var(--red);}
  .badge-blue{background:var(--blue-bg);color:var(--blue);}
  .badge-amber{background:var(--amber-bg);color:var(--amber);}

  /* ── PILL SEGMENTED CONTROL — Apple native style ── */
  .pill-tabs{
    display:inline-flex;gap:2px;padding:3px;
    background:var(--fill1);
    border:1px solid var(--sep);
    border-radius:var(--r-sm);
    margin-bottom:18px;
  }
  .pill-tab{
    padding:5px 14px;border-radius:calc(var(--r-sm) - 2px);
    font-size:13px;font-weight:500;cursor:pointer;
    border:none;background:none;font-family:inherit;
    color:var(--text-tertiary);
    transition:all var(--dur) var(--ease-out);
    white-space:nowrap;
  }
  .pill-tab.active{
    background:var(--surface-solid);color:var(--text-primary);
    font-weight:600;
    box-shadow:var(--elev1);
  }

  /* ── INPUTS — Apple form style ── */
  .input-field{
    width:100%;height:36px;padding:0 10px;
    background:var(--fill1);
    border:1px solid var(--sep);
    border-radius:var(--r-sm);
    font-family:inherit;font-size:13px;
    color:var(--blue);font-weight:600;
    outline:none;transition:all var(--dur) var(--ease-out);
    -webkit-appearance:none;appearance:none;
  }
  .input-field:focus{
    border-color:var(--blue);
    background:var(--bg2);
    box-shadow:0 0 0 3px var(--blue-ring);
  }
  .input-field::placeholder{color:var(--text-quaternary);font-weight:400;}
  .input-field:disabled{opacity:0.4;cursor:not-allowed;}
  .input-wrap{position:relative;display:flex;align-items:center;}
  .input-prefix,.input-suffix{
    position:absolute;font-size:11px;font-weight:700;
    color:var(--text-quaternary);pointer-events:none;
  }
  .input-prefix{left:9px;}
  .input-suffix{right:9px;}
  .input-field.has-prefix{padding-left:20px;}
  .input-field.has-suffix{padding-right:22px;}
  .input-label{font-size:11.5px;font-weight:600;color:var(--text-secondary);margin-bottom:5px;display:block;letter-spacing:-0.1px;}
  .input-group{display:flex;flex-direction:column;gap:0;}
  .select-field{
    width:100%;height:36px;padding:0 10px;
    background:var(--fill1);border:1px solid var(--sep);
    border-radius:var(--r-sm);
    font-family:inherit;font-size:13px;color:var(--text-primary);
    outline:none;cursor:pointer;
    transition:border-color var(--dur);
  }
  .select-field:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-ring);}

  /* ── TOGGLE SWITCH — Apple system style ── */
  .toggle{
    width:38px;height:22px;border-radius:11px;
    background:var(--fill3);cursor:pointer;border:none;
    position:relative;transition:background var(--dur) var(--ease-out);
    flex-shrink:0;
  }
  .toggle.on{background:var(--green-vivid);}
  .toggle::after{
    content:'';position:absolute;
    width:18px;height:18px;border-radius:50%;
    background:#fff;top:2px;left:2px;
    transition:transform var(--dur) var(--ease-spring);
    box-shadow:0 1px 4px rgba(0,0,0,0.25);
  }
  .toggle.on::after{transform:translateX(16px);}

  /* ── DATA TABLE ── */
  .data-table{width:100%;border-collapse:collapse;font-size:12.5px;}
  .data-table th{
    padding:8px 12px;text-align:right;
    font-size:10.5px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;
    color:var(--text-tertiary);background:var(--fill1);
    border-bottom:1px solid var(--sep);
  }
  .data-table th:first-child{text-align:left;}
  .data-table td{
    padding:8px 12px;text-align:right;
    border-bottom:1px solid var(--sep2);
    color:var(--text-primary);font-variant-numeric:tabular-nums;
  }
  .data-table td:first-child{text-align:left;font-weight:500;color:var(--text-secondary);}
  .data-table tr:last-child td{border-bottom:none;}
  .data-table tr:hover td{background:var(--fill1);}
  .data-table .total-row td{background:var(--green-bg);color:var(--green);font-weight:700;border-top:1px solid var(--green-vivid);}

  /* ── PHASE PILLS ── */
  .phase-c{display:inline-block;background:var(--amber-bg);color:var(--amber);font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:0.4px;}
  .phase-o{display:inline-block;background:var(--green-bg);color:var(--green);font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:0.4px;}

  /* ── BUTTON SYSTEM ── */
  .btn{
    display:inline-flex;align-items:center;justify-content:center;gap:5px;
    padding:8px 16px;border-radius:var(--r-sm);
    font-family:inherit;font-size:13px;font-weight:600;
    cursor:pointer;border:none;
    transition:all var(--dur) var(--ease-out);
    white-space:nowrap;letter-spacing:-0.1px;
  }
  .btn-primary{
    background:var(--blue);color:#fff;
    box-shadow:0 1px 3px rgba(0,113,227,0.3);
  }
  .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,113,227,0.35);}
  .btn-primary:active{transform:translateY(0);filter:brightness(0.95);}
  .btn-secondary{
    background:var(--fill1);color:var(--text-primary);
    border:1px solid var(--sep);
  }
  .btn-secondary:hover{background:var(--fill2);}
  .btn-destructive{background:var(--red-bg);color:var(--red);border:1px solid rgba(217,48,37,0.2);}
  .btn-destructive:hover{background:var(--red);color:#fff;}
  .btn-ghost{background:none;color:var(--blue);padding:6px 10px;}
  .btn-ghost:hover{background:var(--blue-bg);}
  .btn-sm{padding:4px 10px;font-size:12px;border-radius:var(--r-xs);}
  .btn:disabled{opacity:0.45;cursor:not-allowed;transform:none !important;filter:none !important;}
  .btn.loading::after{content:'';width:13px;height:13px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}

  /* ── GRIDS ── */
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
  .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}

  /* ── SCENARIO BUTTONS ── */
  .scenario-btn{
    padding:6px 16px;border-radius:var(--r-sm);
    font-size:13px;font-weight:500;cursor:pointer;
    border:1px solid var(--sep);
    background:var(--surface-solid);color:var(--text-secondary);
    transition:all var(--dur);font-family:inherit;
  }
  .scenario-btn.active{background:var(--blue);color:#fff;border-color:var(--blue);box-shadow:0 2px 8px rgba(0,113,227,0.3);}
  .scenario-btn:hover:not(.active){background:var(--fill2);}

  /* ── INFO BANNERS ── */
  .info-banner{
    display:flex;gap:10px;align-items:flex-start;
    padding:11px 14px;border-radius:var(--r);
    margin-bottom:14px;font-size:13px;line-height:1.5;
  }
  .info-blue{background:var(--blue-bg);border:1px solid rgba(0,113,227,0.15);color:var(--blue);}
  .info-green{background:var(--green-bg);border:1px solid rgba(29,131,72,0.15);color:var(--green);}
  .info-amber{background:var(--amber-bg);border:1px solid rgba(180,83,9,0.15);color:var(--amber);}
  .info-red{background:var(--red-bg);border:1px solid rgba(217,48,37,0.15);color:var(--red);}

  /* ── MODAL ── */
  .modal-overlay{
    position:fixed;inset:0;
    background:rgba(0,0,0,0.45);
    backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px);
    z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;
  }
  .modal-box{
    background:var(--surface-solid);
    border-radius:var(--r-2xl);padding:26px;width:100%;max-width:440px;
    box-shadow:var(--elev5);
    border:1px solid var(--sep);
    animation:modalIn 0.25s var(--ease-spring) both;
  }
  @keyframes modalIn{from{opacity:0;transform:scale(0.95) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);}}

  /* ── AUTH PAGES ── */
  .auth-page{min-height:100dvh;display:flex;background:var(--bg);}
  .auth-left{
    flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;
    padding:60px;
    background:linear-gradient(150deg,#000814 0%,#001233 40%,#0a1628 70%,#000d1a 100%);
    position:relative;overflow:hidden;
  }
  .auth-left::before{
    content:'';position:absolute;inset:0;
    background:radial-gradient(ellipse at 25% 55%,rgba(0,113,227,0.18) 0%,transparent 65%),
              radial-gradient(ellipse at 75% 30%,rgba(79,70,229,0.12) 0%,transparent 55%);
  }
  .auth-left::after{
    content:'';position:absolute;inset:0;
    background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='30' cy='30' r='0.5' fill='rgba(255,255,255,0.08)'/%3E%3C/svg%3E");
  }
  .auth-right{
    width:460px;flex-shrink:0;background:var(--bg2);
    display:flex;flex-direction:column;justify-content:center;
    padding:52px 44px;overflow-y:auto;
    box-shadow:-20px 0 40px rgba(0,0,0,0.1);
  }
  .auth-input{
    width:100%;height:42px;padding:0 13px;
    background:var(--fill1);border:1px solid var(--sep);
    border-radius:var(--r-sm);
    font-family:inherit;font-size:14px;color:var(--text-primary);
    outline:none;transition:all var(--dur) var(--ease-out);
  }
  .auth-input:focus{border-color:var(--blue);background:var(--bg2);box-shadow:0 0 0 3px var(--blue-ring);}
  .auth-input.err{border-color:var(--red);box-shadow:0 0 0 3px var(--red-bg);}
  .auth-label{font-size:12.5px;font-weight:600;color:var(--text-secondary);margin-bottom:5px;display:block;}
  .auth-btn{
    width:100%;height:44px;background:var(--blue);color:#fff;
    border:none;border-radius:var(--r-sm);
    font-family:inherit;font-size:14px;font-weight:600;
    cursor:pointer;transition:all var(--dur) var(--ease-out);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,113,227,0.3);
  }
  .auth-btn:hover:not(:disabled){filter:brightness(1.08);box-shadow:0 4px 16px rgba(0,113,227,0.4);}
  .auth-btn:disabled{opacity:0.55;cursor:not-allowed;}
  .auth-err{background:var(--red-bg);border:1px solid rgba(217,48,37,0.2);border-radius:var(--r-sm);padding:10px 13px;font-size:13px;color:var(--red);margin-bottom:13px;}
  .auth-ok{background:var(--green-bg);border:1px solid rgba(29,131,72,0.2);border-radius:var(--r-sm);padding:10px 13px;font-size:13px;color:var(--green);margin-bottom:13px;}
  .auth-link{color:var(--blue);cursor:pointer;font-weight:600;}
  .pw-wrap{position:relative;}
  .pw-toggle{position:absolute;right:11px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-size:11.5px;font-family:inherit;font-weight:600;}

  /* ── DASHBOARD ── */
  .dash-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
  .project-card{
    background:var(--surface-solid);
    border:1px solid var(--sep);
    border-radius:var(--r-xl);
    padding:18px;cursor:pointer;
    transition:transform var(--dur) var(--ease-out),box-shadow var(--dur) var(--ease-out),border-color var(--dur);
    position:relative;overflow:hidden;
  }
  .project-card::before{
    content:'';position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,var(--blue),var(--indigo));
    opacity:0;transition:opacity var(--dur);
  }
  .project-card:hover{transform:translateY(-3px);box-shadow:var(--elev4);border-color:var(--blue-bg);}
  .project-card:hover::before{opacity:1;}
  .project-kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:11px 0;}
  .project-kpi{background:var(--fill1);border-radius:var(--r);padding:8px 10px;}

  /* ── SECTION DIVIDER ── */
  .section-label{
    font-size:10.5px;font-weight:700;letter-spacing:0.6px;
    text-transform:uppercase;color:var(--text-quaternary);
    padding:0 8px;margin-bottom:5px;
  }

  /* ── PRINT ── */
  @media print{
    .sidebar,.topbar,.no-print{display:none!important;}
    .app-shell{display:block;height:auto;}
    .main{display:block;height:auto;}
    .content{padding:0;overflow:visible;}
    .card{box-shadow:none!important;break-inside:avoid;border:1px solid #ddd!important;}
    @page{margin:15mm;size:A4;}
    .print-header{display:block!important;}
  }
  .print-header{display:none;}

  /* ── ANIMATIONS ── */
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.97);}to{opacity:1;transform:scale(1);}}
  .fade-up{animation:fadeUp 0.32s var(--ease-out) both;}
  .fade-up-1{animation-delay:0.05s;}
  .fade-up-2{animation-delay:0.1s;}
  .fade-up-3{animation-delay:0.15s;}
  .fade-up-4{animation-delay:0.2s;}
  .fade-in{animation:fadeIn 0.2s ease both;}
  .scale-in{animation:scaleIn 0.25s var(--ease-out) both;}

  /* ── RESPONSIVE ── */
  @media(max-width:900px){
    .sidebar{display:none;}
    .auth-left{display:none;}
    .auth-right{width:100%;padding:32px 22px;}
    .dash-grid,.grid-3,.grid-4,.kpi-grid{grid-template-columns:1fr 1fr;}
    .grid-2{grid-template-columns:1fr;}
  }
  @media(max-width:600px){
    .dash-grid,.kpi-grid{grid-template-columns:1fr;}
  }
`}</style>
);

/* ══ CHART TOOLTIP ═════════════════════════════════════════════════════ */
function ChartTip({active,payload,label}){
  const{fmt}=useFmt();
  if(!active||!payload?.length) return null;
  return(
    <div className="chart-tooltip" style={{background:"var(--surface-solid)",border:"1px solid var(--sep)",borderRadius:"var(--r-sm)",padding:"10px 14px",boxShadow:"var(--shadow)"}}>
      <div style={{fontSize:11,color:"var(--text-tertiary)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.3px",marginBottom:5}}>Year {label}</div>
      {payload.map(p=>(
        <div key={p.name} style={{display:"flex",justifyContent:"space-between",gap:16,fontSize:13}}>
          <span style={{color:"var(--text-secondary)",display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:8,height:8,borderRadius:2,background:p.color,display:"inline-block"}}/>
            {p.name}
          </span>
          <span style={{fontWeight:700,color:p.color,fontVariantNumeric:"tabular-nums"}}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
/* ══ FOX LOGO SVG ══════════════════════════════════════════════════════ */
// Minimal sitting fox silhouette — navy blue, matches uploaded brand mark
function FoxLogo({size=26}){
  return(
    <img
      src="data:image/png;base64,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"
      width={size}
      height={size}
      alt="Foxinvest"
      style={{display:"block",objectFit:"contain"}}
    />
  );
}

/* ══ MAIN APP ══════════════════════════════════════════════════════════ */
export default function App(){
  const[screen,setScreen]=useState("landing");
  const[currency,setCurrency]=useState("EUR");
  const[session,setSession]=useState(null);
  const[projects,setProjects]=useState([]);
  const[loading,setLoading]=useState(false);
  const[activeProj,setActiveProj]=useState(null);
  const[showNew,setShowNew]=useState(false);
  const[newName,setNewName]=useState("");
  const cur=CURRENCIES.find(c=>c.code===currency)||CURRENCIES[1];

  useEffect(()=>{
    const tk=getURLToken();
    if(tk){
      sb.auth.getUser(tk).then(u=>{
        if(u?.id){
          const sess={token:tk,user:{id:u.id,email:u.email,name:u.user_metadata?.full_name||u.email.split('@')[0]}};
          setSession(sess);localStorage.setItem('ciq',JSON.stringify(sess));setScreen("dashboard");
        }
      });return;
    }
    const stored=localStorage.getItem('ciq');
    if(stored){try{
      const sess=JSON.parse(stored);
      sb.auth.getUser(sess.token).then(u=>{
        if(u?.id){setSession(sess);setScreen("dashboard");}
        else localStorage.removeItem('ciq');
      });
    }catch{localStorage.removeItem('ciq');}}
  },[]);

  useEffect(()=>{
    if(!session) return;
    setLoading(true);
    sb.db.list(session.token).then(data=>{
      if(Array.isArray(data)) setProjects(data.map(p=>({
        id:p.id,name:p.name,status:p.status,
        npv:p.npv||0,irr:p.irr||0,
        date:new Date(p.updated_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
        inputs:p.inputs||DEF,
      })));
      setLoading(false);
    });
  },[session]);

  const login=sess=>{setSession(sess);localStorage.setItem('ciq',JSON.stringify(sess));setScreen("dashboard");};
  const logout=async()=>{if(session)await sb.auth.signOut(session.token);localStorage.removeItem('ciq');setSession(null);setProjects([]);setScreen("landing");};
  const openProj=p=>{setActiveProj(p);setScreen("app");};

  const createProj=async()=>{
    if(!newName.trim()||!session) return;
    const d={user_id:session.user.id,name:newName.trim(),inputs:DEF,npv:0,irr:0,final_value:0,status:"draft"};
    const created=await sb.db.create(session.token,d);
    if(created?.id){
      const p={id:created.id,name:created.name,status:"draft",npv:0,irr:0,date:"Just now",inputs:DEF};
      setProjects(x=>[p,...x]);setNewName("");setShowNew(false);openProj(p);
    }
  };

  const deleteProj=async id=>{
    if(!session) return;
    await sb.db.del(session.token,id);
    setProjects(x=>x.filter(p=>p.id!==id));
  };

  const saveProj=async(id,inputs,results)=>{
    if(!session) return;
    const d={inputs,npv:results.npv,irr:results.irr?results.irr*100:0,final_value:results.totCapex||0,status:"active"};
    await sb.db.update(session.token,id,d);
    setProjects(x=>x.map(p=>p.id===id?{...p,...d,finalValue:d.final_value,date:"Just now"}:p));
  };

  return(
    <CurCtx.Provider value={cur}>
      <Styles/>
      {screen==="landing"   && <LandingPage onLaunch={()=>setScreen("login")} onDash={session?()=>setScreen("dashboard"):null}/>}
      {screen==="login"     && <LoginPage   onLogin={login} onSignup={()=>setScreen("signup")} onForgot={()=>setScreen("forgot")} onBack={()=>setScreen("landing")}/>}
      {screen==="signup"    && <SignupPage  onLogin={login} onSignin={()=>setScreen("login")} onBack={()=>setScreen("landing")}/>}
      {screen==="forgot"    && <ForgotPage  onBack={()=>setScreen("login")}/>}
      {screen==="dashboard" && <Dashboard   session={session} projects={projects} loading={loading} onOpen={openProj} onDelete={deleteProj} onLogout={logout} onNew={()=>setShowNew(true)} currency={currency} setCurrency={setCurrency} onProfile={()=>setScreen("profile")} onHome={()=>setScreen("landing")}/>}
      {screen==="app"       && <AppShell    project={activeProj} onBack={()=>setScreen("dashboard")} onSave={saveProj} session={session} onProfile={()=>setScreen("profile")} currency={currency} setCurrency={setCurrency}/>}
      {screen==="profile"   && <ProfilePage session={session} onBack={()=>setScreen(activeProj?"app":"dashboard")} onLogout={logout}/>}
      {showNew&&(
        <div className="modal-overlay" onClick={()=>setShowNew(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="t-title3" style={{marginBottom:4}}>New Project</div>
            <div className="t-callout" style={{color:"var(--text-tertiary)",marginBottom:18}}>Give your investment analysis a name to get started.</div>
            <div className="input-group" style={{marginBottom:16}}>
              <label className="input-label">Project Name</label>
              <input className="auth-input" placeholder="e.g. Hotel Construction 2025" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createProj()} autoFocus/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-secondary" onClick={()=>setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" style={{flex:1}} onClick={createProj}>Create Project →</button>
            </div>
          </div>
        </div>
      )}
    </CurCtx.Provider>
  );
}

/* ══ AUTH PAGES ════════════════════════════════════════════════════════ */
function LoginPage({onLogin,onSignup,onForgot,onBack}){
  const[email,setEmail]=useState(""); const[pw,setPw]=useState("");
  const[show,setShow]=useState(false); const[loading,setLoading]=useState(false); const[err,setErr]=useState("");

  const submit=async()=>{
    setErr("");
    if(!email||!pw){setErr("Please fill in all fields.");return;}
    if(!email.includes("@")){setErr("Invalid email address.");return;}
    if(pw.length<6){setErr("Password must be at least 6 characters.");return;}
    setLoading(true);
    const d=await sb.auth.signIn({email,password:pw});
    setLoading(false);
    if(d.error||!d.access_token){setErr(d.error?.message||d.msg||"Invalid email or password.");return;}
    const u=await sb.auth.getUser(d.access_token);
    onLogin({token:d.access_token,user:{id:u.id,email:u.email,name:u.user_metadata?.full_name||u.email.split('@')[0]}});
  };

  return(
    <div className="auth-page">
      <div className="auth-left">
        <div style={{position:"relative",zIndex:1,maxWidth:380}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:40}}>
            <div className="sidebar-logo" style={{background:"none",padding:0,border:"none",height:"auto"}}>
              <FoxLogo/>
              <span style={{color:"#fff",fontSize:19}}>Foxinvest</span>
            </div>
          </div>
          <div style={{fontFamily:"Inter",fontSize:34,fontWeight:800,color:"#fff",lineHeight:1.15,marginBottom:14,letterSpacing:"-0.8px"}}>Professional investment analysis.</div>
          <div style={{fontSize:15,color:"rgba(255,255,255,0.55)",lineHeight:1.65,marginBottom:36}}>DCF valuation, scenario planning, sensitivity analysis and board-ready proposals — for businesses that make serious investment decisions.</div>
          {[["📊","Save unlimited projects","All analyses in one place"],["⚡","Real-time calculations","Instant results as you type"],["📄","PDF proposals","Board-ready in one click"],["🔒","Bank-grade security","Encrypted and private"]].map(([i,t,d])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{i}</div>
              <div><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{t}</div><div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>{d}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-right">
        <div style={{marginBottom:32}}>
          <div style={{fontSize:13,color:"var(--text-tertiary)",marginBottom:8}}>Welcome back</div>
          <div className="t-title2">Sign in to Foxinvest</div>
        </div>
        {err&&<div className="auth-err">{err}</div>}
        <div style={{marginBottom:14}}>
          <label className="auth-label">Email address</label>
          <input className={`auth-input${err&&!email?" err":""}`} type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <label className="auth-label" style={{margin:0}}>Password</label>
            <span className="auth-link" style={{fontSize:13}} onClick={onForgot}>Forgot password?</span>
          </div>
          <div className="pw-wrap">
            <input className="auth-input" type={show?"text":"password"} placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={{paddingRight:50}}/>
            <button className="pw-toggle" onClick={()=>setShow(s=>!s)}>{show?"Hide":"Show"}</button>
          </div>
        </div>
        <div style={{height:16}}/>
        <button className={`auth-btn${loading?" loading":""}`} onClick={submit} disabled={loading}>{loading?"":"Sign in →"}</button>
        <div style={{textAlign:"center",marginTop:18,fontSize:14,color:"var(--text-tertiary)"}}>
          No account? <span className="auth-link" onClick={onSignup}>Create one free →</span>
        </div>
        <div style={{textAlign:"center",marginTop:8,fontSize:13}}>
          <span className="auth-link" style={{color:"var(--text-tertiary)",fontWeight:400}} onClick={onBack}>← Back to home</span>
        </div>
      </div>
    </div>
  );
}

function SignupPage({onLogin,onSignin,onBack}){
  const[name,setName]=useState(""); const[email,setEmail]=useState(""); const[pw,setPw]=useState("");
  const[confirm,setConfirm]=useState(""); const[show,setShow]=useState(false);
  const[loading,setLoading]=useState(false); const[err,setErr]=useState(""); const[done,setDone]=useState(false);
  const str=!pw.length?0:pw.length<6?1:pw.length<10?2:/[A-Z]/.test(pw)&&/[0-9]/.test(pw)?4:3;
  const strC=["","var(--red)","var(--amber)","var(--blue)","var(--green)"];
  const strL=["","Weak","Fair","Good","Strong"];

  const submit=async()=>{
    setErr("");
    if(!name.trim()){setErr("Please enter your name.");return;}
    if(!email.includes("@")){setErr("Invalid email.");return;}
    if(pw.length<6){setErr("Password must be at least 6 characters.");return;}
    if(pw!==confirm){setErr("Passwords do not match.");return;}
    setLoading(true);
    const d=await sb.auth.signUp({email,password:pw,name:name.trim()});
    setLoading(false);
    if(d.error){setErr(d.error.message||"Sign up failed.");return;}
    if(d.access_token){const u=await sb.auth.getUser(d.access_token);onLogin({token:d.access_token,user:{id:u.id,email:u.email,name:name.trim()}});}
    else setDone(true);
  };

  if(done) return(
    <div className="auth-page" style={{justifyContent:"center",alignItems:"center"}}>
      <div style={{maxWidth:400,textAlign:"center",padding:40}}>
        <div style={{fontSize:48,marginBottom:16}}>✉️</div>
        <div className="t-title2" style={{marginBottom:10}}>Check your email</div>
        <div className="t-body" style={{color:"var(--text-secondary)",marginBottom:24}}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</div>
        <button className="btn btn-primary" onClick={onSignin}>Back to sign in →</button>
      </div>
    </div>
  );

  return(
    <div className="auth-page">
      <div className="auth-left">
        <div style={{position:"relative",zIndex:1,maxWidth:380}}>
          <div className="sidebar-logo" style={{background:"none",padding:0,border:"none",height:"auto",marginBottom:36}}><FoxLogo/><span style={{color:"#fff",fontSize:19}}>Foxinvest</span></div>
          <div style={{fontFamily:"Inter",fontSize:32,fontWeight:800,color:"#fff",lineHeight:1.15,marginBottom:14,letterSpacing:"-0.6px"}}>Start making smarter decisions.</div>
          <div style={{fontSize:15,color:"rgba(255,255,255,0.5)",lineHeight:1.65}}>Join businesses using Foxinvest for professional investment appraisal with real DCF models and proper financial analysis.</div>
        </div>
      </div>
      <div className="auth-right">
        <div style={{marginBottom:28}}>
          <div style={{fontSize:13,color:"var(--text-tertiary)",marginBottom:8}}>Get started for free</div>
          <div className="t-title2">Create your account</div>
        </div>
        {err&&<div className="auth-err">{err}</div>}
        <div style={{marginBottom:12}}><label className="auth-label">Full name</label><input className="auth-input" type="text" placeholder="Your Name" value={name} onChange={e=>setName(e.target.value)}/></div>
        <div style={{marginBottom:12}}><label className="auth-label">Email</label><input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
        <div style={{marginBottom:12}}>
          <label className="auth-label">Password</label>
          <div className="pw-wrap"><input className="auth-input" type={show?"text":"password"} placeholder="Min. 6 characters" value={pw} onChange={e=>setPw(e.target.value)} style={{paddingRight:50}}/><button className="pw-toggle" onClick={()=>setShow(s=>!s)}>{show?"Hide":"Show"}</button></div>
          {pw.length>0&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
            <div style={{flex:1,height:3,borderRadius:99,background:"var(--fill3)",overflow:"hidden"}}><div style={{width:`${(str/4)*100}%`,height:"100%",background:strC[str],transition:"all 0.3s"}}/></div>
            <span style={{fontSize:11,color:strC[str],fontWeight:600}}>{strL[str]}</span>
          </div>}
        </div>
        <div style={{marginBottom:20}}>
          <label className="auth-label">Confirm password</label>
          <input className={`auth-input${confirm&&confirm!==pw?" err":""}`} type={show?"text":"password"} placeholder="Repeat password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          {confirm&&confirm!==pw&&<div style={{fontSize:11,color:"var(--red)",marginTop:3}}>Passwords don't match</div>}
        </div>
        <button className={`auth-btn${loading?" loading":""}`} onClick={submit} disabled={loading}>{loading?"":"Create free account →"}</button>
        <div style={{textAlign:"center",marginTop:16,fontSize:13,color:"var(--text-tertiary)"}}>Already have an account? <span className="auth-link" onClick={onSignin}>Sign in →</span></div>
      </div>
    </div>
  );
}

function ForgotPage({onBack}){
  const[email,setEmail]=useState(""); const[loading,setLoading]=useState(false);
  const[sent,setSent]=useState(false); const[err,setErr]=useState("");
  const submit=async()=>{if(!email.includes("@")){setErr("Enter a valid email.");return;}setLoading(true);await sb.auth.resetPw(email);setLoading(false);setSent(true);};
  return(
    <div className="auth-page">
      <div className="auth-left"><div style={{position:"relative",zIndex:1,maxWidth:380}}>
        <div className="sidebar-logo" style={{background:"none",padding:0,border:"none",height:"auto",marginBottom:36}}><FoxLogo/><span style={{color:"#fff",fontSize:19}}>Foxinvest</span></div>
        <div style={{fontFamily:"Inter",fontSize:32,fontWeight:800,color:"#fff",lineHeight:1.15,marginBottom:14,letterSpacing:"-0.6px"}}>Reset your password.</div>
        <div style={{fontSize:15,color:"rgba(255,255,255,0.5)",lineHeight:1.65}}>Enter your email and we'll send a secure reset link in seconds.</div>
      </div></div>
      <div className="auth-right">
        <div style={{marginBottom:28}}><div className="t-title2">Reset password</div></div>
        {sent?(<>
          <div className="auth-ok">✓ Reset link sent. Check your inbox and spam folder.</div>
          <button className="btn btn-primary" style={{width:"100%"}} onClick={onBack}>Back to sign in →</button>
        </>):(<>
          {err&&<div className="auth-err">{err}</div>}
          <div style={{marginBottom:16}}><label className="auth-label">Email address</label><input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoFocus/></div>
          <button className={`auth-btn${loading?" loading":""}`} onClick={submit} disabled={loading}>{loading?"":"Send reset link →"}</button>
          <div style={{textAlign:"center",marginTop:16}}><span className="auth-link" style={{color:"var(--text-tertiary)",fontWeight:400,fontSize:13}} onClick={onBack}>← Back to sign in</span></div>
        </>)}
      </div>
    </div>
  );
}

/* ══ DASHBOARD ═════════════════════════════════════════════════════════ */
function Dashboard({session,projects,loading,onOpen,onDelete,onLogout,onNew,currency,setCurrency,onProfile,onHome}){
  const{fmt}=useFmt();
  const u=session?.user||{};
  const init=(u.name||"U").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const totNPV=projects.reduce((s,p)=>s+(p.npv||0),0);
  const profitable=projects.filter(p=>p.npv>0).length;
  const avgIRR=projects.length?projects.reduce((s,p)=>s+(p.irr||0),0)/projects.length:0;

  return(
    <div style={{minHeight:"100dvh",background:"var(--bg)",fontFamily:"Inter,sans-serif"}}>
      {/* Topbar */}
      <div style={{background:"var(--surface)",backdropFilter:"saturate(180%) blur(24px)",WebkitBackdropFilter:"saturate(180%) blur(24px)",borderBottom:"1px solid var(--sep)",height:52,display:"flex",alignItems:"center",padding:"0 24px",gap:12,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={onHome}>
          <FoxLogo/>
          <span style={{fontWeight:700,fontSize:16,color:"var(--text-primary)",letterSpacing:"-0.2px"}}>Foxinvest</span>
        </div>
        <button onClick={onHome} style={{fontSize:12,color:"var(--text-tertiary)",background:"none",border:"1px solid var(--sep)",borderRadius:6,padding:"3px 9px",cursor:"pointer",fontFamily:"inherit"}}>Home</button>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <select value={currency} onChange={e=>setCurrency(e.target.value)}
            style={{background:"var(--fill)",border:"1px solid var(--sep)",borderRadius:7,padding:"4px 8px",fontSize:12,fontWeight:600,color:"var(--blue)",fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
            {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.sym} {c.code}</option>)}
          </select>
          <button onClick={onProfile} style={{display:"flex",alignItems:"center",gap:8,background:"var(--fill)",border:"1px solid var(--sep)",borderRadius:10,padding:"5px 12px 5px 5px",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--blue)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--sep)"}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{init}</div>
            <div style={{textAlign:"left"}}><div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)"}}>{u.name||"Account"}</div><div style={{fontSize:10,color:"var(--text-tertiary)"}}>View profile</div></div>
          </button>
          <button className="btn btn-sm" style={{background:"var(--red-bg)",color:"var(--red)",border:"none"}} onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <div style={{maxWidth:1120,margin:"0 auto",padding:"32px 24px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <div className="t-title1" style={{marginBottom:4}}>Good day, {u.name?.split(" ")[0]||"there"} 👋</div>
            <div style={{color:"var(--text-tertiary)",fontSize:14}}>{loading?"Loading...":`${projects.length} investment ${projects.length===1?"project":"projects"}`}</div>
          </div>
          <button className="btn btn-primary" onClick={onNew}>+ New Project</button>
        </div>

        {projects.length>0&&(
          <div className="kpi-grid" style={{marginBottom:28}}>
            {[
              {l:"Total Projects",v:String(projects.length),c:""},
              {l:"Portfolio NPV",v:fmt(totNPV),c:totNPV>=0?"green":"red"},
              {l:"Profitable",v:`${profitable}/${projects.length}`,c:profitable>0?"green":""},
              {l:"Avg IRR",v:pct(avgIRR),c:""},
            ].map(k=>(
              <div className="kpi-card" key={k.l}>
                <div className="kpi-label">{k.l}</div>
                <div className={`kpi-value t-num ${k.c==="amber"?"amber":k.c}`}>{k.v}</div>
              </div>
            ))}
          </div>
        )}

        {!loading&&projects.length===0&&(
          <div style={{textAlign:"center",padding:"72px 24px",background:"var(--surface-solid)",borderRadius:"var(--r-xl)",border:"1.5px dashed var(--sep)",marginBottom:20}}>
            <div style={{width:64,height:64,borderRadius:18,background:"var(--blue-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 18px"}}>📊</div>
            <div className="t-title3" style={{marginBottom:8}}>Welcome to Foxinvest</div>
            <div style={{fontSize:14,color:"var(--text-secondary)",maxWidth:440,margin:"0 auto 24px",lineHeight:1.6}}>Create your first investment project to get professional DCF analysis, scenario planning, sensitivity analysis and a board-ready proposal.</div>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
              {[["🏗","Construction phases"],["📈","Revenue drivers"],["🎯","Break-even finder"],["📄","Auto proposals"]].map(([i,t])=>(
                <div key={t} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"var(--fill)",borderRadius:8,fontSize:12,color:"var(--text-secondary)"}}><span>{i}</span>{t}</div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={onNew}>+ Create your first project</button>
          </div>
        )}

        {loading&&<div style={{textAlign:"center",padding:"48px",color:"var(--text-tertiary)"}}>Loading your projects...</div>}

        {projects.length>0&&(
          <>
            <div className="t-caption" style={{marginBottom:12}}>Projects</div>
            <div className="dash-grid">
              {projects.map(p=>(
                <div className="project-card" key={p.id} onClick={()=>onOpen(p)}>
                  <div className="t-headline" style={{marginBottom:2}}>{p.name}</div>
                  <div className="t-footnote" style={{marginBottom:12}}>Last edited {p.date}</div>
                  <div className="project-kpi-grid">
                    <div className="project-kpi">
                      <div style={{fontSize:15,fontWeight:700,color:p.npv>=0?"var(--green)":"var(--red)",fontVariantNumeric:"tabular-nums"}}>{fmt(p.npv)}</div>
                      <div style={{fontSize:10,color:"var(--text-tertiary)",textTransform:"uppercase",letterSpacing:"0.3px",marginTop:1}}>NPV</div>
                    </div>
                    <div className="project-kpi">
                      <div style={{fontSize:15,fontWeight:700,color:"var(--blue)",fontVariantNumeric:"tabular-nums"}}>{pct(p.irr)}</div>
                      <div style={{fontSize:10,color:"var(--text-tertiary)",textTransform:"uppercase",letterSpacing:"0.3px",marginTop:1}}>IRR</div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:p.status==="active"?"var(--green-bg)":"var(--fill2)",color:p.status==="active"?"var(--green)":"var(--text-tertiary)",textTransform:"uppercase",letterSpacing:"0.3px"}}>{p.status}</span>
                    <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
                      <button className="btn btn-sm btn-secondary" onClick={()=>onOpen(p)}>Open</button>
                      <button className="btn btn-sm btn-destructive" onClick={()=>onDelete(p.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{background:"var(--fill)",border:"1.5px dashed var(--sep)",borderRadius:"var(--r-xl)",padding:20,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",minHeight:180,gap:8,transition:"all 0.15s"}} onClick={onNew} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--blue)";e.currentTarget.style.background="var(--blue-bg)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--sep)";e.currentTarget.style.background="var(--fill)";}}>
                <div style={{fontSize:24,color:"var(--text-tertiary)"}}>＋</div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text-tertiary)"}}>New Project</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══ PROFILE PAGE ══════════════════════════════════════════════════════ */
function ProfilePage({session,onBack,onLogout}){
  const u=session?.user||{};
  const init=(u.name||"U").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const[newPw,setNewPw]=useState(""); const[conf,setConf]=useState("");
  const[show,setShow]=useState(false); const[loading,setLoading]=useState(false);
  const[ok,setOk]=useState(false); const[err,setErr]=useState("");

  const changePw=async()=>{
    setErr("");setOk(false);
    if(newPw.length<6){setErr("Password must be at least 6 characters.");return;}
    if(newPw!==conf){setErr("Passwords do not match.");return;}
    setLoading(true);
    const d=await sb.auth.updatePw(session.token,newPw);
    setLoading(false);
    if(d.error) setErr(d.error.message||"Update failed.");
    else{setOk(true);setNewPw("");setConf("");}
  };

  return(
    <div style={{minHeight:"100dvh",background:"var(--bg)"}}>
      <div style={{background:"var(--surface)",backdropFilter:"saturate(180%) blur(24px)",WebkitBackdropFilter:"saturate(180%) blur(24px)",borderBottom:"1px solid var(--sep)",height:52,display:"flex",alignItems:"center",padding:"0 20px",gap:12,position:"sticky",top:0,zIndex:50}}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <div style={{fontWeight:700,fontSize:16,letterSpacing:"-0.2px"}}>Foxinvest</div>
        <div style={{fontSize:13,color:"var(--text-tertiary)"}}>/</div>
        <div style={{fontSize:14,color:"var(--text-secondary)"}}>My Profile</div>
      </div>
      <div style={{maxWidth:640,margin:"0 auto",padding:"32px 20px"}}>
        <div className="card fade-up" style={{marginBottom:14}}>
          <div style={{padding:24,display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:60,height:60,borderRadius:"50%",background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#fff",flexShrink:0}}>{init}</div>
            <div>
              <div className="t-title3" style={{marginBottom:2}}>{u.name||"My Account"}</div>
              <div style={{fontSize:13,color:"var(--text-tertiary)"}}>{u.email}</div>
              <span style={{display:"inline-block",marginTop:6,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"var(--blue-bg)",color:"var(--blue)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Free Plan</span>
            </div>
          </div>
        </div>
        <div className="card fade-up" style={{marginBottom:14}}>
          <div className="card-header"><div className="t-headline">Account Details</div></div>
          {[{l:"Full Name",v:u.name||"—"},{l:"Email",v:u.email||"—"},{l:"Account Type",v:"Email & Password"},{l:"Plan",v:"Free"}].map((r,i,arr)=>(
            <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 20px",borderBottom:i<arr.length-1?"1px solid var(--sep)":"none"}}>
              <span style={{fontSize:13,color:"var(--text-tertiary)",fontWeight:500}}>{r.l}</span>
              <span style={{fontSize:13,fontWeight:500}}>{r.v}</span>
            </div>
          ))}
        </div>
        <div className="card fade-up" style={{marginBottom:14}}>
          <div className="card-header"><div className="t-headline">Change Password</div></div>
          <div className="card-body">
            {ok&&<div className="auth-ok">✓ Password updated successfully!</div>}
            {err&&<div className="auth-err">⚠ {err}</div>}
            <div style={{marginBottom:12}}>
              <label className="auth-label">New Password</label>
              <div className="pw-wrap"><input className="auth-input" type={show?"text":"password"} placeholder="Min. 6 characters" value={newPw} onChange={e=>setNewPw(e.target.value)} style={{paddingRight:50}}/><button className="pw-toggle" onClick={()=>setShow(s=>!s)}>{show?"Hide":"Show"}</button></div>
            </div>
            <div style={{marginBottom:16}}>
              <label className="auth-label">Confirm Password</label>
              <input className={`auth-input${conf&&conf!==newPw?" err":""}`} type={show?"text":"password"} placeholder="Repeat password" value={conf} onChange={e=>setConf(e.target.value)} onKeyDown={e=>e.key==="Enter"&&changePw()}/>
              {conf&&conf!==newPw&&<div style={{fontSize:11,color:"var(--red)",marginTop:3}}>Passwords don't match</div>}
            </div>
            <button className={`auth-btn${loading?" loading":""}`} onClick={changePw} disabled={loading}>{loading?"":"Update Password →"}</button>
          </div>
        </div>
        <div className="card fade-up" style={{border:"1px solid var(--red)"}}>
          <div className="card-header" style={{background:"var(--red-bg)"}}><div className="t-headline" style={{color:"var(--red)"}}>⚠ Account Actions</div></div>
          <div className="card-body">
            <p style={{fontSize:13,color:"var(--text-secondary)",marginBottom:14,lineHeight:1.6}}>Signing out ends your current session. You can sign back in at any time.</p>
            <button className="btn btn-destructive" onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ══ APP SHELL WITH SIDEBAR ════════════════════════════════════════════ */
const SCENARIOS={
  Base:  {discountRate:10,taxRate:21,inflationRate:2,operationYears:5,tvGrowth:2},
  Bull:  {discountRate:8, taxRate:19,inflationRate:1.5,operationYears:7,tvGrowth:3},
  Bear:  {discountRate:13,taxRate:25,inflationRate:4,operationYears:5,tvGrowth:1},
  Stress:{discountRate:16,taxRate:28,inflationRate:6,operationYears:4,tvGrowth:0},
};

const NAV_ITEMS=[
  {id:"overview",  icon:"⬛",label:"Overview"},
  {id:"capex",     icon:"🏗",label:"CAPEX"},
  {id:"revenue",   icon:"📈",label:"Revenue"},
  {id:"costs",     icon:"💸",label:"Costs"},
  {id:"wc",        icon:"💧",label:"Working Capital"},
  {id:"results",   icon:"🏆",label:"Results"},
  {id:"cashflow",  icon:"💰",label:"Cash Flow"},
  {id:"sensitivity",icon:"🔬",label:"Sensitivity"},
  {id:"scenarios", icon:"🎭",label:"Scenarios"},
  {id:"proposal",  icon:"📄",label:"Proposal"},
];

function AppShell({project,onBack,onSave,session,onProfile,currency,setCurrency}){
  const{sym}=useCur();
  const[tab,setTab]=useState("overview");
  const[scenario,setScenario]=useState("Base");
  const[saved,setSaved]=useState(false);
  const[projName,setProjName]=useState(project?.name||"New Investment Project");
  const[inputs,setInputs]=useState({...DEF,...(project?.inputs||{})});
  const setI=useCallback((k,v)=>setInputs(p=>({...p,[k]:v})),[]);
  const results=useMemo(()=>calcFinancials(inputs),[inputs]);
  const totalYears=clamp(inputs.constructionYears,0,5)+clamp(inputs.operationYears,1,30);

  const applyScenario=s=>{setScenario(s);setInputs(p=>({...p,...SCENARIOS[s]}));};

  const handleSave=async()=>{
    if(project&&onSave){await onSave(project.id,inputs,results);setSaved(true);setTimeout(()=>setSaved(false),2500);}
  };

  const good=results.npv>0;

  return(
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={onBack}>
          <FoxLogo/>
          <span className="logo-text">Foxinvest</span>
        </div>
        <div className="sidebar-nav">
          <div className="sidebar-section-label">Analysis</div>
          {NAV_ITEMS.map(n=>(
            <button key={n.id} className={`nav-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
              <div className="nav-icon">{n.icon}</div>
              {n.label}
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-result-pill">
            <div className="sidebar-result-row">
              <span className="sidebar-result-label">NPV</span>
              <span className="sidebar-result-val" style={{color:good?"var(--green)":"var(--red)"}}>{(() => {const c=CURRENCIES.find(x=>x.code===currency)||CURRENCIES[1];const n=results.npv;if(!isFinite(n))return"—";const a=Math.abs(n);if(a>=1e6)return`${n<0?"-":""}${c.sym}${(Math.abs(n)/1e6).toFixed(1)}M`;if(a>=1e3)return`${c.sym}${(Math.abs(n)/1e3).toFixed(0)}K`;return`${c.sym}${Math.round(n)}`;})()}</span>
            </div>
            <div className="sidebar-result-row">
              <span className="sidebar-result-label">IRR</span>
              <span className="sidebar-result-val" style={{color:"var(--blue)"}}>{pct(results.irr?results.irr*100:null)}</span>
            </div>
            <div className="sidebar-result-row" style={{marginTop:4}}>
              <span className="sidebar-result-label">Verdict</span>
              <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:good?"var(--green-bg)":"var(--red-bg)",color:good?"var(--green)":"var(--red)"}}>{good?"✓ Viable":"✗ Review"}</span>
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" style={{width:"100%",justifyContent:"flex-start",gap:8}} onClick={onProfile}>
            <div style={{width:22,height:22,borderRadius:"50%",background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>{(session?.user?.name||"U")[0].toUpperCase()}</div>
            {session?.user?.name||"Profile"}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        {/* TOPBAR */}
        <div className="topbar">
          <button className="btn btn-ghost btn-sm no-print" onClick={onBack}>← Dashboard</button>
          <input value={projName} onChange={e=>setProjName(e.target.value)}
            style={{flex:1,maxWidth:280,height:32,padding:"0 10px",background:"var(--fill)",border:"1px solid var(--sep)",borderRadius:"var(--r-sm)",fontFamily:"inherit",fontSize:13,fontWeight:600,color:"var(--text-primary)",outline:"none"}}/>
          <select value={currency} onChange={e=>setCurrency(e.target.value)}
            style={{background:"var(--fill)",border:"1px solid var(--sep)",borderRadius:7,padding:"4px 8px",fontSize:12,fontWeight:700,color:"var(--blue)",fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
            {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.sym} {c.code}</option>)}
          </select>
          <button className="btn btn-sm no-print" style={{background:saved?"var(--green-bg)":"var(--blue)",color:saved?"var(--green)":"#fff",border:saved?"1px solid var(--green)":"none"}} onClick={handleSave}>
            {saved?"✓ Saved":"Save"}
          </button>
          <button className="btn btn-sm btn-secondary no-print" onClick={()=>{setTab("proposal");setTimeout(()=>window.print(),300);}}>📄 PDF</button>
        </div>

        {/* CONTENT */}
        <div className="content">
          <div className="print-header" style={{marginBottom:14,paddingBottom:10,borderBottom:"2px solid var(--blue)"}}>
            <div style={{fontSize:20,fontWeight:700}}>Foxinvest — {projName}</div>
            <div style={{fontSize:12,color:"var(--text-tertiary)",marginTop:3}}>{new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
          </div>
          {tab==="overview"    && <OverviewTab    inputs={inputs} setI={setI} results={results} totalYears={totalYears}/>}
          {tab==="capex"       && <CapexTab       inputs={inputs} setI={setI} results={results} totalYears={totalYears}/>}
          {tab==="revenue"     && <RevenueTab     inputs={inputs} setI={setI} results={results}/>}
          {tab==="costs"       && <CostsTab       inputs={inputs} setI={setI} results={results}/>}
          {tab==="wc"          && <WCTab          inputs={inputs} setI={setI} results={results}/>}
          {tab==="results"     && <ResultsTab     inputs={inputs} results={results}/>}
          {tab==="cashflow"    && <CashFlowTab    results={results}/>}
          {tab==="sensitivity" && <SensitivityTab inputs={inputs} results={results}/>}
          {tab==="scenarios"   && <ScenariosTab   inputs={inputs} scenario={scenario} applyScenario={applyScenario}/>}
          {tab==="proposal"    && <ProposalTab    inputs={inputs} results={results} projName={projName}/>}
        </div>
      </div>
    </div>
  );
}

// small helper for sidebar
function var_(k,fallback){return`var(--${k},${fallback})`;}
function var__(k){return`var(--${k})`;}

/* ── Shared input helper ── */
// Uses local string state so the user can clear and retype freely.
// Only converts to number on blur.
function Inp({label,value,onChange,pre,suf,min=0,max=Infinity,step=1,type="number",note,disabled}){
  const[raw,setRaw]=useState(String(value??''));
  // Sync when value changes from outside (e.g. scenario switch)
  const prev=useState(value)[0];
  useEffect(()=>{
    setRaw(String(value??''));
  },[value]);

  const commit=rawVal=>{
    if(type!=="number"){onChange(rawVal);return;}
    const n=rawVal===''||rawVal==='-'?0:Number(rawVal);
    const safe=isFinite(n)?Math.max(min,max===Infinity?n:Math.min(max,n)):min;
    onChange(safe);
    setRaw(String(safe));
  };

  return(
    <div className="input-group">
      {label&&<label className="input-label">{label}{note&&<span style={{color:"var(--text-quaternary)",fontWeight:400,marginLeft:4}}>({note})</span>}</label>}
      <div className="input-wrap">
        {pre&&<span className="input-prefix">{pre}</span>}
        <input
          className={`input-field${pre?" has-prefix":""}${suf?" has-suffix":""}`}
          type="text"
          inputMode={type==="number"?"decimal":"text"}
          value={raw}
          disabled={disabled}
          onChange={e=>{
            const v=e.target.value;
            // Allow empty, minus sign, digits, one decimal point — anything the user needs to type
            setRaw(v);
            // Live-update only if it's a valid complete number (not mid-typing)
            if(v!==''&&v!=='-'&&v!=='.'){
              const n=Number(v);
              if(isFinite(n)) onChange(n);
            }
          }}
          onBlur={e=>commit(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter') commit(e.target.value);}}
        />
        {suf&&<span className="input-suffix">{suf}</span>}
      </div>
    </div>
  );
}

/* ══ OVERVIEW TAB ══════════════════════════════════════════════════════ */
function OverviewTab({inputs,setI,results,totalYears}){
  const{fmt,sym}=useFmt();
  const good=results.npv>0;
  const{sched}=results;

  return(
    <div className="fade-up">
      {/* KPI row — 3 columns, 9 cards */}
      <div className="kpi-grid" style={{marginBottom:20,gridTemplateColumns:"repeat(3,1fr)"}}>
        {[
          {l:"NPV (Nominal)",  v:fmt(results.npv),  c:good?"green":"red", b:good?"badge-green":"badge-red", bt:good?"✓ Creates Value":"✗ Destroys Value"},
          {l:"NPV (Real)",     v:fmt(results.npvR),  c:(results.npvR||0)>0?"green":"red",
            note:"Real NPV discounts nominal cash flows at the real WACC (Fisher equation: real WACC = nominal WACC / (1 + inflation) − 1). When inflation > 0, real WACC < nominal WACC, so Real NPV > Nominal NPV. When inflation = 0, they are equal."},
          {l:"Real IRR",       v:pct(results.realIRR!=null?results.realIRR*100:null), c:results.realIRR!=null&&results.realIRR>0?"green":"red"},
          {l:"IRR (Nominal)",  v:pct(results.irr!=null?results.irr*100:null),          c:results.irr!=null&&results.irr>inputs.discountRate/100?"green":"red"},
          {l:"MIRR",           v:pct(results.mirr!=null?results.mirr*100:null),         c:""},
          {l:"Payback Period", v:results.pb>=0?`${results.pb} years`:"Beyond projection period", c:""},
          {l:"PI",             v:xN(results.pi),     c:results.pi>1?"green":"red"},
          {l:"RONA",           v:pct((results.rona||0)*100), c:""},
          {l:"Total CAPEX",    v:fmt(results.totCapex), c:"amber"},
        ].map(k=>(
          <div className={`kpi-card${k.c==="green"?" kpi-green":k.c==="red"?" kpi-red":k.c==="blue"?" kpi-blue":k.c==="amber"?" kpi-amber":""}`} key={k.l}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>
              {k.l}
              {k.note&&(
                <span title={k.note} style={{cursor:"help",fontSize:10,color:"var(--text-quaternary)",fontWeight:700,lineHeight:1,background:"var(--fill2)",borderRadius:"50%",width:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>?</span>
              )}
            </div>
            <div className={`kpi-value t-num ${k.c==="amber"?"amber":k.c}`}>{k.v}</div>
            {k.b&&<div className={`kpi-badge ${k.b}`}>{k.bt}</div>}
            {k.note&&<div style={{fontSize:10,color:"var(--text-quaternary)",marginTop:4,lineHeight:1.4,fontStyle:"italic"}}>{k.note}</div>}
          </div>
        ))}
      </div>

      {/* TV-driven warning */}
      {results.tvDriven&&(
        <div className="info-banner info-amber" style={{marginBottom:14}}>
          <span>⚠️</span>
          <span><strong>NPV is driven primarily by terminal value.</strong> Operating cash flows alone do not recover the investment. TV contribution: <strong>{results.npv>0?pct((results.tvPV/results.npv)*100):"n/a"}</strong>. Consider whether the terminal value assumption is realistic.</span>
        </div>
      )}

      {/* Inflation note */}
      {Number(inputs.inflationRate)>0&&(
        <div className="info-banner info-blue" style={{marginBottom:14}}>
          <span>ℹ️</span>
          <span>
            Inflation {inputs.inflationRate}% · Real WACC = <strong>{((results.realW||0)*100).toFixed(2)}%</strong> (Fisher).{" "}
            Real NPV <strong>{fmt(results.npvR)}</strong> vs Nominal NPV <strong>{fmt(results.npv)}</strong> — Real NPV is higher because the lower real discount rate reduces the penalty on future cash flows.{" "}
            Real IRR <strong>{pct(results.realIRR!=null?results.realIRR*100:null)}</strong> is your return above inflation.
          </span>
        </div>
      )}

      {results.tv>0&&(
        <div className="info-banner info-green" style={{marginBottom:14}}>
          <span>🏁</span>
          <span>Terminal value ({inputs.tvMethod==="perpetuity"?`Gordon Growth @ ${inputs.tvGrowth}%`:`EV Multiple ${inputs.evMult}×`}): <strong>{fmt(results.tv)}</strong> · PV of TV: <strong>{fmt(results.tvPV)}</strong> · TV share of NPV: <strong>{results.npv>0?pct((results.tvPV/results.npv)*100):"n/a"}</strong></span>
        </div>
      )}

      <div className="grid-2">
        {/* Parameters */}
        <div className="card">
          <div className="card-header"><div className="t-headline">Project Parameters</div></div>
          <div className="card-body">
            <div className="grid-2">
              <Inp label="Construction Phase" value={inputs.constructionYears} onChange={v=>setI("constructionYears",v)} suf="years" min={0} max={5}/>
              <Inp label="Operation Phase"    value={inputs.operationYears}    onChange={v=>setI("operationYears",v)}    suf="years" min={1} max={30}/>
              <Inp label="WACC / Discount Rate" value={inputs.discountRate}   onChange={v=>setI("discountRate",v)}  suf="%" min={0.1} max={100} step={0.1}/>
              <Inp label="Corporate Tax Rate"   value={inputs.taxRate}         onChange={v=>setI("taxRate",v)}        suf="%" min={0} max={99} step={0.1}/>
              <Inp label="Inflation Rate"        value={inputs.inflationRate}  onChange={v=>setI("inflationRate",v)}  suf="%" min={0} max={50} step={0.1}/>
            </div>
          </div>
        </div>

        {/* Financing + TV */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="card">
            <div className="card-header"><div className="t-headline">Financing</div></div>
            <div className="card-body">
              <div className="grid-2">
                <Inp label="Debt Amount"   value={inputs.debtAmt}  onChange={v=>setI("debtAmt",v)}  pre={sym} min={0}/>
                <Inp label="Interest Rate" value={inputs.intRate}   onChange={v=>setI("intRate",v)}   suf="%" min={0} max={50} step={0.1}/>
                <Inp label="Loan Term"     value={inputs.loanYrs}   onChange={v=>setI("loanYrs",v)}   suf="yrs" min={1} max={30}/>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="t-headline">Terminal Value</div>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
                <button className={`toggle${inputs.useTv?" on":""}`} onClick={()=>setI("useTv",!inputs.useTv)}/>
                <span style={{color:"var(--text-secondary)"}}>{inputs.useTv?"Enabled":"Disabled"}</span>
              </label>
            </div>
            {inputs.useTv&&(
              <div className="card-body">
                <div style={{marginBottom:12}}>
                  <label className="input-label">Method</label>
                  <select className="select-field" value={inputs.tvMethod||"perpetuity"} onChange={e=>setI("tvMethod",e.target.value)}>
                    <option value="perpetuity">Gordon Growth / Perpetuity</option>
                    <option value="multiple">EV / EBITDA Multiple</option>
                  </select>
                </div>
                {(inputs.tvMethod||"perpetuity")==="perpetuity"
                  ? <Inp label="Terminal Growth Rate" value={inputs.tvGrowth} onChange={v=>setI("tvGrowth",v)} suf="%" min={-5} max={20} step={0.1}/>
                  : <Inp label="EV/EBITDA Multiple"   value={inputs.evMult}  onChange={v=>setI("evMult",v)}   min={1} max={50} step={0.5}/>
                }
                {results.tv>0&&<div style={{marginTop:10,padding:"9px 12px",background:"var(--green-bg)",borderRadius:"var(--r-sm)",fontSize:12,color:"var(--green)",fontWeight:500}}>TV: {fmt(results.tv)} · PV: {fmt(results.tvPV)}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue overview chart - only operation years */}
      {sched.filter(r=>r.revenue>0).length>0&&(
        <div className="card" style={{marginTop:14}}>
          <div className="card-header"><div className="t-headline">Revenue & Net Income</div></div>
          <div style={{padding:"14px 16px 8px"}}>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={sched.filter(r=>r.revenue>0)} margin={{top:5,right:16,left:0,bottom:0}}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--blue)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--blue)" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" vertical={false}/>
                <XAxis dataKey="year" tick={{fill:"var(--text-tertiary)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>fmt(v)} tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false} width={60}/>
                <Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--blue)" fill="url(#gR)" strokeWidth={2}/>
                <Bar dataKey="netIncome" name="Net Income" fill="var(--green)" radius={[4,4,0,0]} opacity={0.85}/>
                <ReferenceLine y={0} stroke="var(--sep)"/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ CAPEX TAB ═════════════════════════════════════════════════════════ */
function CapexTab({inputs,setI,results,totalYears}){
  const{fmt,sym}=useFmt();
  const yrs=Array.from({length:Math.min(totalYears,7)},(_,i)=>i);
  const opsY=clamp(inputs.constructionYears,0,5);

  const upd=(idx,field,val)=>{const rows=[...(inputs.capexRows||[])];rows[idx]={...rows[idx],[field]:val};setI("capexRows",rows);};
  const updAmt=(idx,yi,val)=>{const rows=[...(inputs.capexRows||[])];const amts=[...(rows[idx].amts||Array(7).fill(0))];amts[yi]=Number(val)||0;rows[idx]={...rows[idx],amts};setI("capexRows",rows);};
  const totPerYr=yrs.map(yi=>(inputs.capexRows||[]).filter(r=>r.on).reduce((s,r)=>s+(Number((r.amts||[])[yi])||0),0));

  return(
    <div className="fade-up">
      <div className="card" style={{marginBottom:14}}>
        <div className="card-header">
          <div className="t-headline">Capital Expenditure Schedule</div>
          <div style={{fontSize:13,color:"var(--text-tertiary)"}}>Grand Total: <strong style={{color:"var(--amber)"}}>{fmt(results.totCapex)}</strong></div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:800}}>
            <thead>
              <tr style={{background:"var(--fill)"}}>
                <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600,fontSize:11,color:"var(--text-tertiary)",textTransform:"uppercase",letterSpacing:"0.3px",borderBottom:"1px solid var(--sep)",minWidth:160}}>Item</th>
                {yrs.map(yi=>(
                  <th key={yi} style={{padding:"9px 8px",textAlign:"right",fontWeight:600,fontSize:11,color:"var(--text-tertiary)",borderBottom:"1px solid var(--sep)",minWidth:80}}>
                    <div>Year {yi+1}</div>
                    <div style={{marginTop:2}}>{yi<opsY?<span className="phase-c">Const.</span>:<span className="phase-o">Oper.</span>}</div>
                  </th>
                ))}
                <th style={{padding:"9px 8px",fontWeight:600,fontSize:11,color:"var(--text-tertiary)",borderBottom:"1px solid var(--sep)",minWidth:90}}>Depr.</th>
                <th style={{padding:"9px 8px",fontWeight:600,fontSize:11,color:"var(--text-tertiary)",borderBottom:"1px solid var(--sep)",minWidth:55}}>Years</th>
                <th style={{padding:"9px 8px",textAlign:"center",fontWeight:600,fontSize:11,color:"var(--text-tertiary)",borderBottom:"1px solid var(--sep)",width:36}}>On</th>
              </tr>
            </thead>
            <tbody>
              {(inputs.capexRows||[]).map((row,idx)=>(
                <tr key={idx} style={{background:idx%2?"var(--fill)":"var(--surface-solid)",opacity:row.on?1:0.4}}>
                  <td style={{padding:"7px 10px",borderBottom:"1px solid var(--sep)"}}>
                    <input value={row.name||""} onChange={e=>upd(idx,"name",e.target.value)}
                      style={{width:"100%",border:"1px solid var(--sep)",borderRadius:"var(--r-sm)",padding:"4px 8px",fontSize:12,fontFamily:"inherit",background:"var(--fill)",color:"var(--text-primary)",outline:"none"}}/>
                  </td>
                  {yrs.map(yi=>(
                    <td key={yi} style={{padding:"5px 4px",borderBottom:"1px solid var(--sep)",textAlign:"right"}}>
                      <input type="number" value={(row.amts||[])[yi]||""} onChange={e=>updAmt(idx,yi,e.target.value)} disabled={!row.on}
                        style={{width:72,border:"1px solid var(--sep)",borderRadius:"var(--r-sm)",padding:"4px 6px",fontSize:12,fontFamily:"inherit",textAlign:"right",background:"var(--fill)",color:"var(--blue)",fontWeight:600,outline:"none"}}/>
                    </td>
                  ))}
                  <td style={{padding:"5px 6px",borderBottom:"1px solid var(--sep)"}}>
                    <select value={row.deprM||"SL"} onChange={e=>upd(idx,"deprM",e.target.value)} disabled={!row.on}
                      style={{fontSize:11,border:"1px solid var(--sep)",borderRadius:"var(--r-sm)",padding:"3px 5px",fontFamily:"inherit",background:"var(--fill)",color:"var(--text-primary)"}}>
                      <option value="SL">Straight-Line</option>
                      <option value="None">None</option>
                    </select>
                  </td>
                  <td style={{padding:"5px 6px",borderBottom:"1px solid var(--sep)",textAlign:"right"}}>
                    <input type="number" value={row.deprY||10} onChange={e=>upd(idx,"deprY",Number(e.target.value)||1)} disabled={!row.on||row.deprM==="None"}
                      style={{width:46,border:"1px solid var(--sep)",borderRadius:"var(--r-sm)",padding:"3px 5px",fontSize:12,textAlign:"right",background:"var(--fill)",color:"var(--blue)",fontWeight:600,outline:"none"}}/>
                  </td>
                  <td style={{padding:"5px 8px",borderBottom:"1px solid var(--sep)",textAlign:"center"}}>
                    <button className={`toggle${row.on?" on":""}`} onClick={()=>upd(idx,"on",!row.on)}/>
                  </td>
                </tr>
              ))}
              <tr style={{background:"var(--green-bg)"}}>
                <td style={{padding:"9px 12px",fontWeight:700,color:"var(--green)",fontSize:13,borderTop:"1.5px solid var(--green)"}}>Total CAPEX</td>
                {yrs.map(yi=><td key={yi} style={{padding:"9px 8px",textAlign:"right",fontWeight:700,color:"var(--green)",borderTop:"1.5px solid var(--green)"}}>{fmt(totPerYr[yi])}</td>)}
                <td colSpan={3} style={{padding:"9px 8px",textAlign:"right",fontWeight:700,color:"var(--green)",borderTop:"1.5px solid var(--green)"}}>{fmt(results.totCapex)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="t-headline">Depreciation Schedule</div></div>
        <div style={{overflowX:"auto"}}>
          <table className="data-table">
            <thead><tr><th>Item</th>{yrs.map(yi=><th key={yi}>Yr {yi+1}</th>)}<th>In-Period Total</th><th>Asset Cost</th></tr></thead>
            <tbody>
              {(inputs.capexRows||[]).filter(r=>r.on&&r.deprM!=="None").map((row,idx)=>{
                const total=(row.amts||[]).reduce((a,b)=>a+(Number(b)||0),0);
                const dy=clamp(row.deprY,1,50);
                const ann=total/dy;
                const st=(row.amts||[]).findIndex(a=>Number(a)>0);
                const s=st>=0?st:0;
                // Total depr that falls within the projection period
                const periodsInProj=Math.min(s+dy,yrs.length)-s;
                const inPeriodTotal=Math.max(0,periodsInProj)*ann;
                return(
                  <tr key={idx}>
                    <td>{row.name}</td>
                    {yrs.map(yi=><td key={yi} style={{color:yi>=s&&yi<s+dy?"var(--blue)":"var(--text-quaternary)"}}>{yi>=s&&yi<s+dy?fmt(ann):"—"}</td>)}
                    <td style={{fontWeight:600,color:"var(--amber)"}}>{fmt(inPeriodTotal)}</td>
                    <td style={{color:"var(--text-tertiary)",fontSize:11}}>{fmt(total)}</td>
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

/* ══ REVENUE TAB ═══════════════════════════════════════════════════════ */
function RevenueTab({inputs,setI,results}){
  const{fmt,sym}=useFmt();
  const upd=(idx,k,v)=>{const lines=[...(inputs.revenueLines||[])];lines[idx]={...lines[idx],[k]:v};setI("revenueLines",lines);};

  return(
    <div className="fade-up">
      <div className="card" style={{marginBottom:14}}>
        <div className="card-header">
          <div className="t-headline">Revenue Lines</div>
          <div className="t-footnote">Revenue = Driver 1 × Driver 2 · grows annually</div>
        </div>
        <div className="card-body">
          {(inputs.revenueLines||[]).map((line,idx)=>(
            <div key={idx} style={{borderBottom:"1px solid var(--sep)",paddingBottom:16,marginBottom:16,opacity:line.on?1:0.45}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <button className={`toggle${line.on?" on":""}`} onClick={()=>upd(idx,"on",!line.on)}/>
                <input value={line.name||""} onChange={e=>upd(idx,"name",e.target.value)}
                  style={{flex:1,border:"1px solid var(--sep)",borderRadius:"var(--r-sm)",padding:"6px 12px",fontSize:14,fontFamily:"inherit",fontWeight:600,color:"var(--text-primary)",background:"var(--fill)",outline:"none"}}/>
                {line.on&&<div style={{fontSize:12,color:"var(--green)",fontWeight:600}}>Base: {fmt((line.d1||0)*(line.d2||0))}</div>}
              </div>
              <div className="grid-3">
                <div className="input-group">
                  <input value={line.d1l||"Units"} onChange={e=>upd(idx,"d1l",e.target.value)}
                    style={{border:"none",background:"none",fontWeight:600,fontSize:11,color:"var(--text-secondary)",outline:"none",fontFamily:"inherit",marginBottom:5,display:"block"}}/>
                  <Inp value={line.d1??0} onChange={v=>upd(idx,"d1",v)} disabled={!line.on}/>
                </div>
                <div className="input-group">
                  <input value={line.d2l||"Price/unit"} onChange={e=>upd(idx,"d2l",e.target.value)}
                    style={{border:"none",background:"none",fontWeight:600,fontSize:11,color:"var(--text-secondary)",outline:"none",fontFamily:"inherit",marginBottom:5,display:"block"}}/>
                  <Inp value={line.d2??0} onChange={v=>upd(idx,"d2",v)} pre={sym} disabled={!line.on}/>
                </div>
                <Inp label="Annual Growth" value={line.growth??0} onChange={v=>upd(idx,"growth",v)} suf="%" min={-50} max={200} disabled={!line.on}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {results.sched.filter(r=>r.revenue>0).length>0&&(
        <div className="card">
          <div className="card-header"><div className="t-headline">Revenue Projection</div></div>
          <div style={{padding:"12px 16px 8px"}}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={results.sched.filter(r=>r.revenue>0)} margin={{top:5,right:16,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" vertical={false}/>
                <XAxis dataKey="year" tick={{fill:"var(--text-tertiary)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>fmt(v)} tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false} width={60}/>
                <Tooltip content={<ChartTip/>}/>
                <Bar dataKey="revenue" name="Revenue" fill="var(--blue)" radius={[4,4,0,0]}/>
                <Bar dataKey="grossProfit" name="Gross Profit" fill="var(--green)" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ COSTS TAB ═════════════════════════════════════════════════════════ */
function CostsTab({inputs,setI,results}){
  const{fmt,sym}=useFmt();
  const upd=(idx,k,v)=>{const lines=[...(inputs.costLines||[])];lines[idx]={...lines[idx],[k]:v};setI("costLines",lines);};

  return(
    <div className="fade-up">
      <div className="info-banner info-blue" style={{marginBottom:14}}>
        <span>ℹ️</span>
        <span><strong>P&L structure:</strong> Revenue − COGS = Gross Profit → GP − OpEx = EBITDA. Mark each cost line as COGS or OpEx. Payables and inventory days are applied to COGS only.</span>
      </div>
      <div className="card" style={{marginBottom:14}}>
        <div className="card-header">
          <div className="t-headline">Cost Lines</div>
          <div style={{fontSize:11,color:"var(--text-tertiary)"}}>Total Year 1 COGS: <strong style={{color:"var(--red)"}}>{fmt(results.sched.find(r=>r.cogs>0)?.cogs||0)}</strong> · OpEx: <strong style={{color:"var(--amber)"}}>{fmt(results.sched.find(r=>r.opex>0)?.opex||0)}</strong></div>
        </div>
        <div className="card-body">
          {(inputs.costLines||[]).map((line,idx)=>(
            <div key={idx} style={{borderBottom:"1px solid var(--sep)",paddingBottom:14,marginBottom:14,opacity:line.on?1:0.45}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <button className={`toggle${line.on?" on":""}`} onClick={()=>upd(idx,"on",!line.on)}/>
                <input value={line.name||""} onChange={e=>upd(idx,"name",e.target.value)}
                  style={{flex:1,border:"1px solid var(--sep)",borderRadius:"var(--r-sm)",padding:"5px 10px",fontSize:14,fontFamily:"inherit",fontWeight:600,color:"var(--text-primary)",background:"var(--fill1)",outline:"none"}}/>
                {/* COGS vs OpEx toggle — matches engine isCOGSLine() */}
                <div style={{display:"flex",gap:0,border:"1px solid var(--sep)",borderRadius:"var(--r-sm)",overflow:"hidden",flexShrink:0}}>
                  {(()=>{const isC=line.isCOGS===true||(line.isCOGS===undefined&&line.id===1);return(<>
                    <button onClick={()=>upd(idx,"isCOGS",true)}
                      style={{padding:"4px 9px",fontSize:11,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"inherit",background:isC?"var(--red-bg)":"var(--fill1)",color:isC?"var(--red)":"var(--text-tertiary)"}}>COGS</button>
                    <button onClick={()=>upd(idx,"isCOGS",false)}
                      style={{padding:"4px 9px",fontSize:11,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"inherit",background:!isC?"var(--amber-bg)":"var(--fill1)",color:!isC?"var(--amber)":"var(--text-tertiary)"}}>OpEx</button>
                  </>);})()} 
                </div>
                <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,cursor:"pointer",color:"var(--text-secondary)",flexShrink:0}}>
                  <input type="checkbox" checked={!!line.pctRev} onChange={e=>upd(idx,"pctRev",e.target.checked)}/>
                  % Rev
                </label>
              </div>
              <div className="grid-3">
                {line.pctRev
                  ? <Inp label="% of Revenue" value={line.pct??0} onChange={v=>upd(idx,"pct",v)} suf="%" min={0} max={100} disabled={!line.on}/>
                  : <Inp label="Annual Amount (Year 1)" value={line.val??0} onChange={v=>upd(idx,"val",v)} pre={sym} min={0} disabled={!line.on}/>
                }
                <Inp label="Annual Growth" value={line.growth??0} onChange={v=>upd(idx,"growth",v)} suf="%" min={-50} max={100} disabled={!line.on||line.pctRev}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {results.sched.filter(r=>r.revenue>0).length>0&&(
        <div className="card">
          <div className="card-header"><div className="t-headline">Cost Structure vs EBITDA</div></div>
          <div style={{padding:"12px 16px 8px"}}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={results.sched.filter(r=>r.revenue>0)} margin={{top:5,right:16,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" vertical={false}/>
                <XAxis dataKey="year" tick={{fill:"var(--text-tertiary)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>fmt(v)} tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false} width={60}/>
                <Tooltip content={<ChartTip/>}/>
                <Bar dataKey="cogs" name="COGS" fill="var(--red)" radius={[0,0,0,0]} opacity={0.8} stackId="costs"/>
                <Bar dataKey="opex" name="OpEx" fill="var(--amber)" radius={[3,3,0,0]} opacity={0.8} stackId="costs"/>
                <Bar dataKey="ebitda" name="EBITDA" fill="var(--green)" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ WORKING CAPITAL TAB ═══════════════════════════════════════════════ */
function WCTab({inputs,setI,results}){
  const{fmt}=useFmt();
  // Use NWC values already computed in the engine (via sched.nwc and sched.wcChange)
  // Reconstruct display values for the schedule table
  const wcSched=results.sched.map(r=>({
    year:r.year,
    phase:r.phase,
    rec:  Math.round(r.revenue*clamp(inputs.receivDays,0,365)/365),
    inv:  Math.round(r.cogs*clamp(inputs.inventDays,0,365)/365),
    pay:  Math.round(r.cogs*clamp(inputs.payablDays,0,365)/365),
    wc:   r.nwc,
    dwc:  r.wcChange, // from engine — single source of truth
  }));

  return(
    <div className="fade-up">
      <div className="info-banner info-blue" style={{marginBottom:16}}>
        <span>💡</span><span>Working capital = Receivables + Inventory − Payables. Changes in WC reduce free cash flow in years of growth.</span>
      </div>
      <div className="grid-3" style={{marginBottom:14}}>
        {[
          {l:"Receivables Days",k:"receivDays",icon:"📥",desc:"Customer payment delay"},
          {l:"Payables Days",k:"payablDays",icon:"📤",desc:"Supplier payment delay"},
          {l:"Inventory Days",k:"inventDays",icon:"📦",desc:"Stock holding period"},
        ].map(f=>(
          <div className="card" key={f.k}>
            <div className="card-header"><div className="t-headline">{f.icon} {f.l}</div></div>
            <div className="card-body">
              <div style={{fontSize:12,color:"var(--text-tertiary)",marginBottom:10}}>{f.desc}</div>
              <Inp value={inputs[f.k]??30} onChange={v=>setI(f.k,v)} suf="days" min={0} max={365}/>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><div className="t-headline">Working Capital Schedule</div></div>
        <table className="data-table">
          <thead><tr><th>Year</th><th>Phase</th><th>Receivables</th><th>Inventory</th><th>Payables</th><th>Net WC</th><th>ΔWC (FCF impact)</th></tr></thead>
          <tbody>
            {wcSched.map(r=>(
              <tr key={r.year}>
                <td style={{fontWeight:600}}>{r.year}</td>
                <td>{r.phase==="Construction"?<span className="phase-c">{r.phase}</span>:<span className="phase-o">{r.phase}</span>}</td>
                <td style={{color:"var(--blue)"}}>{fmt(r.rec)}</td>
                <td style={{color:"var(--amber)"}}>{fmt(r.inv)}</td>
                <td style={{color:"var(--green)"}}>{fmt(r.pay)}</td>
                <td style={{fontWeight:600}}>{fmt(r.wc)}</td>
                <td style={{color:r.dwc<0?"var(--green)":r.dwc>0?"var(--red)":"var(--text-tertiary)",fontWeight:600}}>{r.dwc>0?"+":""}{fmt(r.dwc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
/* ══ RESULTS TAB ═══════════════════════════════════════════════════════ */
function ResultsTab({inputs,results}){
  const{fmt}=useFmt();
  const good=results.npv>0;
  const{sched}=results;

  return(
    <div className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
        {[
          {l:"NPV (Nominal)",  v:fmt(results.npv),   c:good?"green":"red", b:good?"badge-green":"badge-red", bt:good?"✓ Creates Value":"✗ Destroys Value"},
          {l:"NPV (Real)",     v:fmt(results.npvR),   c:(results.npvR||0)>0?"green":"red",
            note:"Real NPV discounts nominal cash flows at the real WACC (Fisher equation: real WACC = nominal WACC / (1 + inflation) − 1). When inflation > 0, real WACC < nominal WACC, so Real NPV > Nominal NPV. When inflation = 0, they are equal."},
          {l:"Real IRR",       v:pct(results.realIRR!=null?results.realIRR*100:null), c:results.realIRR!=null&&results.realIRR>0?"green":"red"},
          {l:"IRR (Nominal)",  v:pct(results.irr!=null?results.irr*100:null),          c:results.irr!=null&&results.irr>inputs.discountRate/100?"green":"red"},
          {l:"MIRR",           v:pct(results.mirr!=null?results.mirr*100:null),         c:""},
          {l:"Payback",        v:results.pb>=0?`${results.pb} yrs`:"Beyond projection period", c:""},
          {l:"PI",             v:xN(results.pi),      c:results.pi>1?"green":"red"},
          {l:"RONA",           v:pct((results.rona||0)*100), c:""},
          {l:"Total EVA",      v:fmt(results.totalEVA), c:results.totalEVA>0?"green":"red"},
        ].map(k=>(
          <div className="kpi-card" key={k.l}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>
              {k.l}
              {k.note&&(
                <span title={k.note} style={{cursor:"help",fontSize:10,color:"var(--text-quaternary)",fontWeight:700,lineHeight:1,background:"var(--fill2)",borderRadius:"50%",width:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>?</span>
              )}
            </div>
            <div className={`kpi-value t-num ${k.c}`}>{k.v}</div>
            {k.b&&<div className={`kpi-badge ${k.b}`}>{k.bt}</div>}
            {k.note&&<div style={{fontSize:10,color:"var(--text-quaternary)",marginTop:4,lineHeight:1.4,fontStyle:"italic"}}>{k.note}</div>}
          </div>
        ))}
      </div>

      {results.tvDriven&&(
        <div className="info-banner info-amber" style={{marginBottom:14}}>
          <span>⚠️</span><span><strong>NPV is driven primarily by terminal value</strong> (TV share: {results.npv>0?pct((results.tvPV/results.npv)*100):"n/a"}). Operating FCFs alone do not recover the investment.</span>
        </div>
      )}

      {results.tv>0&&(
        <div className="info-banner info-green" style={{marginBottom:14}}>
          <span>🏁</span>
          <span>Terminal value ({inputs.tvMethod==="perpetuity"?`perpetuity @ ${inputs.tvGrowth}% growth`:`EV multiple ${inputs.evMult}×`}): <strong>{fmt(results.tv)}</strong> · PV of TV: <strong>{fmt(results.tvPV)}</strong> · TV contribution: <strong>{results.npv>0?pct((results.tvPV/results.npv)*100):"n/a"}</strong></span>
        </div>
      )}

      {/* Full P&L cascade — single source of truth from sched */}
      <div className="card" style={{marginBottom:14}}>
        <div className="card-header"><div className="t-headline">Income Statement — Full Cascade</div></div>
        <div style={{overflowX:"auto"}}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{textAlign:"left"}}>Line Item</th>
                {sched.map(r=><th key={r.year}><div>Yr {r.year}</div><div style={{marginTop:2}}>{r.phase==="Construction"?<span className="phase-c">C</span>:<span className="phase-o">O</span>}</div></th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                {l:"Revenue",          k:"revenue",      c:"var(--blue)",bold:false},
                {l:"− COGS",           k:"cogs",         c:"var(--red)",  neg:true},
                {l:"= Gross Profit",   k:"grossProfit",  c:"",            bold:true,sep:true},
                {l:"− Operating Exp.", k:"opex",         c:"var(--red)",  neg:true},
                {l:"= EBITDA",         k:"ebitda",       c:"",            bold:true,sep:true},
                {l:"− Depreciation",   k:"depreciation", c:"var(--text-tertiary)",neg:true},
                {l:"= EBIT",           k:"ebit",         c:"",            bold:true,sep:true},
                {l:"− Interest",       k:"interest",     c:"var(--text-tertiary)",neg:true},
                {l:"= EBT",            k:"ebt",          c:""},
                {l:"− Tax",            k:"tax",          c:"var(--text-tertiary)",neg:true},
                {l:"= Net Income",     k:"netIncome",    c:"var(--blue)", bold:true,sep:true},
                {l:"FCF",              k:"fcf",          c:"var(--green)",bold:true},
                {l:"EVA",              k:"eva",          c:"var(--amber)"},
              ].map(row=>{
                const tot=sched.reduce((s,r)=>s+(r[row.k]||0),0);
                return(
                  <tr key={row.l} style={{borderTop:row.sep?"2px solid var(--sep)":"none"}}>
                    <td style={{fontWeight:row.bold?700:500,paddingLeft:row.neg?20:12}}>{row.l}</td>
                    {sched.map(r=>{
                      const v=r[row.k]||0;
                      const display=row.neg?-v:v;
                      return(
                        <td key={r.year} style={{color:display<0?"var(--red)":(row.c||"var(--text-primary)"),fontWeight:row.bold?600:400}}>{fmt(display)}</td>
                      );
                    })}
                    {(()=>{const display=row.neg?-tot:tot;return<td style={{fontWeight:700,color:display<0?"var(--red)":(row.c||"var(--text-primary)")}}>{fmt(display)}</td>;})()} 
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="t-headline">Cumulative NPV</div></div>
          <div style={{padding:"12px 16px 8px"}}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={sched} margin={{top:5,right:12,left:0,bottom:0}}>
                <defs><linearGradient id="gNpv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--blue)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--blue)" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" vertical={false}/>
                <XAxis dataKey="year" tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>fmt(v)} tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false} width={60}/>
                <Tooltip content={<ChartTip/>}/>
                <ReferenceLine y={0} stroke="var(--sep)" strokeDasharray="4 2"/>
                <Area type="monotone" dataKey="cumNPV" name="Cum. NPV" stroke="var(--blue)" fill="url(#gNpv)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="t-headline">EVA by Year</div></div>
          <div style={{padding:"12px 16px 8px"}}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sched} margin={{top:5,right:12,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" vertical={false}/>
                <XAxis dataKey="year" tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>fmt(v)} tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false} width={60}/>
                <Tooltip content={<ChartTip/>}/>
                <ReferenceLine y={0} stroke="var(--sep)"/>
                <Bar dataKey="eva" name="EVA" fill="var(--amber)" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ CASH FLOW TAB ═════════════════════════════════════════════════════ */
function CashFlowTab({results}){
  const{fmt}=useFmt();
  const{sched}=results;

  // Cumulative undiscounted cash flow starting from -totCapex
  const cumRows=[];
  let cumCF=-results.totCapex;
  sched.forEach(r=>{cumCF+=r.fcf;cumRows.push(Math.round(cumCF));});

  return(
    <div className="fade-up">
      <div className="grid-3" style={{marginBottom:14}}>
        {[
          {l:"Total FCF",    v:fmt(results.totFCF),c:results.totFCF>0?"green":"red"},
          {l:"Total Revenue",v:fmt(results.totRev),c:""},
          {l:"Total CAPEX",  v:fmt(results.totCapex),c:"amber"},
        ].map(k=>(
          <div className={`kpi-card${k.c==="amber"?" kpi-amber":k.c==="green"?" kpi-green":k.c==="red"?" kpi-red":""}`} key={k.l}>
            <div className="kpi-label">{k.l}</div>
            <div className={`kpi-value t-num ${k.c==="amber"?"amber":k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="info-banner info-blue" style={{marginBottom:14}}>
        <span>ℹ️</span>
        <span>FCF = EBIT × (1−tax) + Depreciation − CAPEX − ΔNWC. This is unlevered (operating) free cash flow — independent of financing. Interest is shown for reference only.</span>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div className="card-header"><div className="t-headline">Free Cash Flow Bridge</div></div>
        <div style={{overflowX:"auto"}}>
          <table className="data-table">
            <thead><tr><th>Item</th>{sched.map(r=><th key={r.year}>Yr {r.year}</th>)}<th>Total</th></tr></thead>
            <tbody>
              {[
                {l:"Revenue",               k:"revenue",     neg:false},
                {l:"− COGS",                k:"cogs",        neg:true, c:"var(--text-secondary)"},
                {l:"= Gross Profit",        k:"grossProfit", neg:false, bold:true},
                {l:"− Operating Expenses",  k:"opex",        neg:true, c:"var(--text-secondary)"},
                {l:"= EBITDA",              k:"ebitda",      neg:false, bold:true,sep:true},
                {l:"− Depreciation",        k:"depreciation",neg:true, c:"var(--text-tertiary)"},
                {l:"= EBIT",                k:"ebit",        neg:false, bold:true,sep:true},
                {l:"× (1−tax) = NOPAT",    k:"nopat",       neg:false, c:"var(--blue)"},
                {l:"+ Depreciation (add back)",k:"depreciation",neg:false,c:"var(--text-tertiary)"},
                {l:"− CAPEX",               k:"capex",       neg:true, c:"var(--red)"},
                {l:"− ΔNWC",                k:"wcChange",    neg:true, c:"var(--amber)"},
                {l:"= Free Cash Flow",      k:"fcf",         neg:false, bold:true,c:"var(--green)",total:true,sep:true},
              ].map(row=>{
                const vals=sched.map(r=>row.neg?-(r[row.k]||0):(r[row.k]||0));
                const tot=vals.reduce((a,b)=>a+b,0);
                return(
                  <tr key={row.l} className={row.total?"total-row":""} style={{borderTop:row.sep?"2px solid var(--sep)":"none"}}>
                    <td style={{fontWeight:row.bold?700:400,paddingLeft:row.neg?20:12,fontSize:row.bold?13:12}}>{row.l}</td>
                    {vals.map((v,i)=><td key={i} style={{color:v<0?"var(--red)":(row.c||"var(--text-primary)"),fontWeight:row.bold?600:400}}>{fmt(v)}</td>)}
                    <td style={{fontWeight:700,color:tot<0?"var(--red)":(row.c||"var(--text-primary)")}}>{fmt(tot)}</td>
                  </tr>
                );
              })}
              {/* Interest for reference only */}
              <tr style={{background:"var(--fill1)"}}>
                <td style={{fontWeight:400,fontSize:11,color:"var(--text-tertiary)",paddingLeft:12,fontStyle:"italic"}}>Interest paid (memo)</td>
                {sched.map(r=><td key={r.year} style={{color:"var(--text-tertiary)",fontSize:11,fontStyle:"italic"}}>{r.interest>0?fmt(-r.interest):fmt(0)}</td>)}
                <td style={{color:"var(--text-tertiary)",fontSize:11}}>{fmt(-sched.reduce((s,r)=>s+r.interest,0))}</td>
              </tr>
              {/* Cumulative cash flow */}
              <tr>
                <td style={{fontWeight:700,color:"var(--blue)"}}>Cumulative CF (incl. CAPEX)</td>
                {cumRows.map((v,i)=><td key={i} style={{fontWeight:600,color:v>=0?"var(--green)":"var(--red)"}}>{fmt(v)}</td>)}
                <td/>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="t-headline">FCF & Cumulative NPV</div></div>
        <div style={{padding:"12px 16px 8px"}}>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={sched} margin={{top:5,right:12,left:0,bottom:0}}>
              <defs><linearGradient id="gCum2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5856d6" stopOpacity={0.2}/><stop offset="95%" stopColor="#5856d6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" vertical={false}/>
              <XAxis dataKey="year" tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>fmt(v)} tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false} width={60}/>
              <Tooltip content={<ChartTip/>}/>
              <ReferenceLine y={0} stroke="var(--sep)" strokeDasharray="4 2"/>
              <Bar dataKey="fcf" name="Annual FCF" fill="var(--green)" radius={[4,4,0,0]}/>
              <Area type="monotone" dataKey="cumNPV" name="Cumulative NPV" stroke="#5856d6" fill="url(#gCum2)" strokeWidth={2}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ══ SENSITIVITY TAB ═══════════════════════════════════════════════════ */
function SensitivityTab({inputs,results}){
  const{fmt}=useFmt();
  const[view,setView]=useState("heatmap");
  const[beKey,setBeKey]=useState("discountRate");

  // Use safe non-zero bases: if base=0 use a small delta-based approach
  const vars=useMemo(()=>[
    {key:"discountRate",   label:"WACC",           base:Math.max(1,Number(inputs.discountRate)),    suf:"%"},
    {key:"taxRate",        label:"Tax Rate",        base:Math.max(1,Number(inputs.taxRate)),         suf:"%"},
    {key:"inflationRate",  label:"Inflation",       base:Math.max(0.5,Number(inputs.inflationRate)), suf:"%"},
    {key:"tvGrowth",       label:"Terminal Growth", base:Math.max(0.5,Number(inputs.tvGrowth||2)),   suf:"%"},
    {key:"intRate",        label:"Interest Rate",   base:Math.max(1,Number(inputs.intRate)),         suf:"%"},
    {key:"operationYears", label:"Op. Years",       base:Math.max(1,Number(inputs.operationYears)),  suf:"yr"},
  ],[inputs]);

  const steps=[-30,-20,-10,0,10,20,30];

  // Memoize heatData to avoid recomputing on every render
  const heatData=useMemo(()=>vars.map(v=>{
    const row={label:v.label};
    steps.forEach(s=>{
      try{
        const nv=v.base*(1+s/100);
        const safeNv=v.key==="operationYears"?Math.max(1,Math.round(nv)):Math.max(0.1,nv);
        const res=calcFinancials({...DEF,...inputs,[v.key]:safeNv});
        row[`s${s}`]=isFinite(res.npv)?Math.round(res.npv):null;
      }catch{row[`s${s}`]=null;}
    });
    return row;
  }),[inputs,vars]);

  const allVals=heatData.flatMap(r=>steps.map(s=>r[`s${s}`])).filter(v=>v!=null&&isFinite(v));
  const hMin=allVals.length?Math.min(...allVals):0;
  const hMax=allVals.length?Math.max(...allVals):0;

  // Memoize tornado (also expensive)
  const tornado=useMemo(()=>vars.map(v=>{
    try{
      const lo=calcFinancials({...DEF,...inputs,[v.key]:Math.max(0.1,v.base*0.8)}).npv;
      const hi=calcFinancials({...DEF,...inputs,[v.key]:v.base*1.2}).npv;
      const safeLo=isFinite(lo)?lo:0;
      const safeHi=isFinite(hi)?hi:0;
      return{label:v.label,lo:Math.min(safeLo,safeHi),hi:Math.max(safeLo,safeHi),impact:Math.abs(safeHi-safeLo)};
    }catch{return{label:v.label,lo:0,hi:0,impact:0};}
  }).sort((a,b)=>b.impact-a.impact),[inputs,vars]);

  const beResult=useMemo(()=>doBreakEven({...DEF,...inputs},beKey),[inputs,beKey]);
  const beVar=vars.find(v=>v.key===beKey)||vars[0];

  const hBg=(v,mn,mx)=>{
    if(v==null||!isFinite(v)) return"var(--fill1)";
    const t=mx===mn?0.5:(v-mn)/(mx-mn);
    if(t<0.5) return`rgba(255,59,48,${0.06+t*0.28})`;
    return`rgba(52,199,89,${0.04+(t-0.5)*0.45})`;
  };
  const hFg=(v,mn,mx)=>{
    if(v==null||!isFinite(v)) return"var(--text-tertiary)";
    const t=mx===mn?0.5:(v-mn)/(mx-mn);
    return t<0.3?"var(--red)":t>0.7?"var(--green)":"var(--text-primary)";
  };

  return(
    <div className="fade-up">
      <div className="pill-tabs">
        {[["heatmap","Heat Map"],["tornado","Tornado"],["breakeven","Break-Even"]].map(([id,l])=>(
          <button key={id} className={`pill-tab${view===id?" active":""}`} onClick={()=>setView(id)}>{l}</button>
        ))}
      </div>

      {view==="heatmap"&&(
        <div className="card">
          <div className="card-header">
            <div className="t-headline">NPV Sensitivity — % change from base inputs</div>
            <div className="t-footnote">Green = higher NPV · Red = lower NPV · Outlined = base case</div>
          </div>
          <div style={{overflowX:"auto",padding:16}}>
            <table style={{borderCollapse:"collapse",fontSize:12,width:"100%"}}>
              <thead>
                <tr>
                  <th style={{padding:"8px 12px",textAlign:"left",background:"var(--fill1)",fontWeight:600,fontSize:11,color:"var(--text-tertiary)",textTransform:"uppercase",letterSpacing:"0.3px",borderBottom:"1px solid var(--sep)"}}>Variable</th>
                  {steps.map(s=><th key={s} style={{padding:"8px 10px",textAlign:"center",background:"var(--fill1)",fontWeight:600,fontSize:11,color:"var(--text-tertiary)",borderBottom:"1px solid var(--sep)",minWidth:80}}>{s>0?"+":""}{s}%</th>)}
                </tr>
              </thead>
              <tbody>
                {heatData.map(row=>(
                  <tr key={row.label}>
                    <td style={{padding:"7px 12px",fontWeight:600,fontSize:12,borderBottom:"1px solid var(--sep)",color:"var(--text-secondary)",whiteSpace:"nowrap"}}>{row.label}</td>
                    {steps.map(s=>(
                      <td key={s} style={{padding:"6px 8px",borderBottom:"1px solid var(--sep)",textAlign:"center",background:hBg(row[`s${s}`],hMin,hMax),color:hFg(row[`s${s}`],hMin,hMax),fontWeight:s===0?700:500,outline:s===0?"2px solid var(--blue)":"none",outlineOffset:"-2px",fontVariantNumeric:"tabular-nums"}}>
                        {row[`s${s}`]!=null?fmt(row[`s${s}`]):"—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view==="tornado"&&(
        <div className="card">
          <div className="card-header">
            <div className="t-headline">Tornado Chart — NPV impact of ±20% change</div>
            <div className="t-footnote">Sorted by magnitude of impact</div>
          </div>
          <div className="card-body">
            {tornado.map(item=>{
              const range=Math.max(hMax-hMin,1);
              const loW=Math.min(((results.npv-item.lo)/range)*50,48);
              const hiW=Math.min(((item.hi-results.npv)/range)*50,48);
              return(
                <div key={item.label} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{item.label}</span>
                    <span style={{fontSize:11,color:"var(--text-tertiary)"}}>{fmt(item.lo)} → {fmt(item.hi)} <strong style={{color:"var(--amber)"}}>Δ{fmt(item.impact)}</strong></span>
                  </div>
                  <div style={{display:"flex",height:28,borderRadius:6,overflow:"hidden",background:"var(--fill1)",alignItems:"stretch"}}>
                    <div style={{flex:1,display:"flex",justifyContent:"flex-end"}}>
                      <div style={{width:`${Math.max(0,loW)}%`,background:"var(--red)",opacity:0.7,transition:"width 0.4s",borderRadius:"4px 0 0 4px"}}/>
                    </div>
                    <div style={{width:2,background:"var(--sep)"}}/>
                    <div style={{flex:1}}>
                      <div style={{width:`${Math.max(0,hiW)}%`,height:"100%",background:"var(--green)",opacity:0.7,transition:"width 0.4s",borderRadius:"0 4px 4px 0"}}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view==="breakeven"&&(
        <div className="card">
          <div className="card-header"><div className="t-headline">Break-Even Finder</div></div>
          <div className="card-body">
            <div style={{marginBottom:16}}>
              <label className="input-label" style={{marginBottom:8,display:"block"}}>Find break-even value for:</label>
              <select className="select-field" style={{maxWidth:280}} value={beKey} onChange={e=>setBeKey(e.target.value)}>
                {vars.map(v=><option key={v.key} value={v.key}>{v.label}</option>)}
              </select>
            </div>
            {beResult!==null?(
              <>
                <div style={{background:"var(--green-bg)",border:"1px solid var(--green)",borderRadius:"var(--r-lg)",padding:"20px 24px",marginBottom:16}}>
                  <div className="t-footnote" style={{marginBottom:4,color:"var(--green)"}}>Break-Even {beVar.label}</div>
                  <div style={{fontSize:36,fontWeight:800,color:"var(--green)",letterSpacing:"-1px",fontVariantNumeric:"tabular-nums"}}>{beResult.toFixed(2)}{beVar.suf}</div>
                  <div style={{fontSize:13,color:"var(--text-secondary)",marginTop:6}}>
                    At this value NPV = 0 · Current: <strong>{beVar.base.toFixed(2)}{beVar.suf}</strong>
                    {" · "}Change needed: <strong style={{color:beResult>beVar.base?"var(--red)":"var(--green)"}}>{(beResult-beVar.base)>0?"+":""}{(beResult-beVar.base).toFixed(2)}{beVar.suf}</strong>
                  </div>
                </div>
                {(()=>{
                  const pts=Array.from({length:21},(_,i)=>{
                    try{
                      const v=Math.max(0.1,beVar.base*(0.5+i*0.05));
                      const npv=calcFinancials({...DEF,...inputs,[beKey]:v}).npv;
                      return{value:Math.round(v*100)/100,npv:isFinite(npv)?Math.round(npv):null};
                    }catch{return{value:0,npv:null};}
                  }).filter(p=>p.npv!=null);
                  return(
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={pts} margin={{top:5,right:12,left:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" vertical={false}/>
                        <XAxis dataKey="value" tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false}/>
                        <YAxis tickFormatter={v=>fmt(v)} tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false} width={60}/>
                        <Tooltip formatter={(v,n)=>[fmt(v),n]} labelFormatter={v=>`${beVar.label}: ${v}${beVar.suf}`}/>
                        <ReferenceLine y={0} stroke="var(--red)" strokeDasharray="5 3"/>
                        {beResult!=null&&<ReferenceLine x={Math.round(beResult*100)/100} stroke="var(--green)" strokeDasharray="5 3"/>}
                        <Line type="monotone" dataKey="npv" stroke="var(--blue)" strokeWidth={2.5} dot={false} name="NPV" connectNulls={false}/>
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()}
              </>
            ):(
              <div className="info-banner info-amber">
                <span>⚠️</span><span>No break-even found in the feasible range for <strong>{beVar.label}</strong>. NPV may be positive or negative throughout the entire range — check if revenue covers costs.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ SCENARIOS TAB ═════════════════════════════════════════════════════ */
function ScenariosTab({inputs,scenario,applyScenario}){
  const{fmt}=useFmt();

  const scenResults=Object.entries(SCENARIOS).map(([name,ovr])=>{
    const merged={...DEF,...inputs,...ovr};
    const r=calcFinancials(merged);
    return{name,ovr,r};
  });

  const metrics=[
    {l:"WACC",k:"discountRate",suf:"%",src:"ovr"},
    {l:"Tax Rate",k:"taxRate",suf:"%",src:"ovr"},
    {l:"Inflation",k:"inflationRate",suf:"%",src:"ovr"},
    {l:"Op. Years",k:"operationYears",suf:"yr",src:"ovr"},
    {l:"NPV",k:"npv",fmt:"money",src:"r"},
    {l:"NPV (Real)",k:"npvR",fmt:"money",src:"r",note:true},
    {l:"Real IRR",k:"realIRR",fmt:"pct100",src:"r"},
    {l:"IRR (Nominal)",k:"irr",fmt:"pct100",src:"r"},
    {l:"MIRR",k:"mirr",fmt:"pct100",src:"r"},
    {l:"Payback",k:"pb",suf:"yr",src:"r",fmt:"pb"},
    {l:"PI",k:"pi",fmt:"x",src:"r"},
    {l:"RONA",k:"rona",fmt:"pct100",src:"r"},
  ];

  return(
    <div className="fade-up">
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {Object.keys(SCENARIOS).map(s=>(
          <button key={s} className={`scenario-btn${scenario===s?" active":""}`} onClick={()=>applyScenario(s)}>{s}</button>
        ))}
      </div>
      <div className="info-banner info-blue" style={{marginBottom:14}}>
        <span>ℹ️</span><span>Click a scenario to apply it. Current: <strong>{scenario}</strong>. Changes are applied to all tabs.</span>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div className="card-header"><div className="t-headline">Scenario Comparison</div></div>
        <div style={{overflowX:"auto"}}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{textAlign:"left"}}>Metric</th>
                {scenResults.map(s=><th key={s.name} style={{color:s.name===scenario?"var(--blue)":"var(--text-tertiary)"}}>{s.name}{s.name===scenario&&<span style={{marginLeft:5,fontSize:9,background:"var(--blue-bg)",color:"var(--blue)",padding:"1px 5px",borderRadius:99,fontWeight:700}}>ACTIVE</span>}</th>)}
              </tr>
            </thead>
            <tbody>
              {metrics.map(m=>(
                <tr key={m.l}>
                  <td style={{fontWeight:500}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                      {m.l}
                      {m.note&&(
                        <span title="Real NPV discounts nominal cash flows at the real WACC (Fisher equation: real WACC = nominal WACC / (1 + inflation) − 1). When inflation > 0, real WACC < nominal WACC, so Real NPV > Nominal NPV. When inflation = 0, they are equal."
                          style={{cursor:"help",fontSize:10,color:"var(--text-quaternary)",fontWeight:700,lineHeight:1,background:"var(--fill2)",borderRadius:"50%",width:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>?</span>
                      )}
                    </span>
                  </td>
                  {scenResults.map(s=>{
                    const raw=m.src==="r"?s.r[m.k]:(s.ovr[m.k]??inputs[m.k]);
                    let display,color="var(--text-primary)";
                    if(m.fmt==="money"){display=fmt(raw||0);color=(raw||0)>=0?"var(--green)":"var(--red)";}
                    else if(m.fmt==="pct100"){display=pct(raw!=null?raw*100:null);color=(raw||0)>0?"var(--green)":"var(--text-tertiary)";}
                    else if(m.fmt==="x"){display=xN(raw||0);color=(raw||0)>1?"var(--green)":"var(--red)";}
                    else if(m.fmt==="pb"){display=raw>=0?`${raw}yr`:"—";color="var(--text-primary)";}
                    else display=`${raw??"-"}${m.suf||""}`;
                    return<td key={s.name} style={{color,fontWeight:s.name===scenario?700:400,fontVariantNumeric:"tabular-nums"}}>{display}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="t-headline">NPV Comparison</div></div>
          <div style={{padding:"12px 16px 8px"}}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scenResults.map(s=>({name:s.name,npv:s.r.npv}))} margin={{top:5,right:12,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" vertical={false}/>
                <XAxis dataKey="name" tick={{fill:"var(--text-tertiary)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>fmt(v)} tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false} width={60}/>
                <Tooltip formatter={v=>fmt(v)}/>
                <ReferenceLine y={0} stroke="var(--sep)"/>
                <Bar dataKey="npv" name="NPV" fill="var(--blue)" radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="t-headline">IRR vs WACC</div></div>
          <div style={{padding:"12px 16px 8px"}}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scenResults.map(s=>({name:s.name,irr:(s.r.irr||0)*100,wacc:s.ovr.discountRate||inputs.discountRate}))} margin={{top:5,right:12,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" vertical={false}/>
                <XAxis dataKey="name" tick={{fill:"var(--text-tertiary)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${v.toFixed(0)}%`} tick={{fill:"var(--text-tertiary)",fontSize:10}} axisLine={false} tickLine={false} width={36}/>
                <Tooltip formatter={v=>`${Number(v).toFixed(1)}%`}/>
                <Bar dataKey="irr" name="IRR" fill="var(--green)" radius={[5,5,0,0]}/>
                <Bar dataKey="wacc" name="WACC" fill="var(--red)" radius={[5,5,0,0]} opacity={0.6}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ PROPOSAL TAB ══════════════════════════════════════════════════════ */
function ProposalTab({inputs,results,projName}){
  const{fmt,code}=useFmt();
  const today=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const good=results.npv>0;
  const opsY=clamp(inputs.constructionYears,0,5);

  const Row=({l,v,h})=>(
    <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid var(--sep)"}}>
      <span style={{fontSize:13,color:"var(--text-secondary)",fontWeight:500}}>{l}</span>
      <span style={{fontSize:13,fontWeight:h?700:400,color:h?"var(--green)":"var(--text-primary)"}}>{v}</span>
    </div>
  );

  return(
    <div className="fade-up">
      {/* Header */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{background:"linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%)",padding:"28px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:6}}>Investment Proposal</div>
            <div style={{fontSize:24,fontWeight:800,color:"#fff",letterSpacing:"-0.5px",marginBottom:4}}>{projName}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Prepared by Foxinvest · {today}</div>
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:good?"rgba(52,199,89,0.15)":"rgba(255,59,48,0.15)",padding:"10px 16px",borderRadius:12,border:`1px solid ${good?"var(--green)":"var(--red)"}`}}>
            <span style={{fontSize:16}}>{good?"✅":"⚠️"}</span>
            <div><div style={{fontSize:13,fontWeight:700,color:good?"var(--green)":"var(--red)"}}>{good?"RECOMMENDED":"NEEDS REVISION"}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>NPV: {fmt(results.npv)}</div></div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:"1px solid var(--sep)"}}>
          {[
            {l:"NPV",    v:fmt(results.npv),        c:good?"var(--green)":"var(--red)"},
            {l:"IRR",    v:pct(results.irr!=null?results.irr*100:null), c:"var(--text-primary)"},
            {l:"Payback",v:results.pb>=0?`${results.pb} yrs`:"—",c:"var(--text-primary)"},
            {l:"PI",     v:xN(results.pi),           c:results.pi>1?"var(--green)":"var(--red)"},
          ].map((k,i)=>(
            <div key={k.l} style={{padding:"14px 18px",borderRight:i<3?"1px solid var(--sep)":"none"}}>
              <div className="kpi-label">{k.l}</div>
              <div style={{fontSize:20,fontWeight:700,color:k.c,fontVariantNumeric:"tabular-nums"}}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>

      {[
        {n:"01",title:"Executive Summary",content:
          `This investment proposal analyses the financial viability of "${projName}". The project spans ${opsY>0?`a ${opsY}-year construction phase followed by `:""}a ${clamp(inputs.operationYears,1,30)}-year operation phase.\n\nAt a discount rate (WACC) of ${inputs.discountRate}% and corporate tax rate of ${inputs.taxRate}%, the analysis returns a Net Present Value (NPV) of ${fmt(results.npv)}${Number(inputs.inflationRate)>0?`. Real IRR: ${pct(results.realIRR!=null?results.realIRR*100:null)} (return above ${inputs.inflationRate}% inflation; real WACC = ${((results.realW||0)*100).toFixed(2)}% via Fisher equation)`:""}.The nominal IRR is ${pct(results.irr!=null?results.irr*100:null)}, ${results.irr!=null&&results.irr>inputs.discountRate/100?`exceeding the cost of capital by ${((results.irr-inputs.discountRate/100)*100).toFixed(1)} percentage points`:`below the required WACC of ${inputs.discountRate}%`}.\n\n${good?"✅ RECOMMENDATION: PROCEED WITH INVESTMENT":"⚠️ RECOMMENDATION: REVISE AND RESUBMIT"}`
        },
        {n:"02",title:"Investment Overview",rows:[
          {l:"Project Name",v:projName},{l:"Analysis Date",v:today},{l:"Currency",v:code},
          {l:"Construction Phase",v:`${inputs.constructionYears} year(s)`},{l:"Operation Phase",v:`${inputs.operationYears} year(s)`},
          {l:"Total CAPEX",v:fmt(results.totCapex)},{l:"Debt Financing",v:fmt(Number(inputs.debtAmt||0))},
          {l:"WACC / Discount Rate",v:pct(inputs.discountRate)},{l:"Tax Rate",v:pct(inputs.taxRate)},{l:"Inflation Rate",v:pct(inputs.inflationRate)},
          {l:"Terminal Value",v:inputs.useTv?(inputs.tvMethod==="perpetuity"?`Perpetuity @ ${inputs.tvGrowth}% growth`:`EV Multiple ${inputs.evMult}×`):"Not included"},
        ]},
        {n:"03",title:"Financial Results",rows:[
          {l:"NPV (Nominal)",v:fmt(results.npv),h:true},{l:"NPV (Real)",v:fmt(results.npvR),h:true},
          {l:"IRR",v:pct(results.irr?results.irr*100:null),h:true},{l:"MIRR",v:pct(results.mirr?results.mirr*100:null)},
          {l:"Payback Period",v:results.pb>=0?`${results.pb} years`:"Beyond projection period"},{l:"PI",v:xN(results.pi)},
          {l:"RONA",v:pct((results.rona||0)*100)},{l:"Total EVA",v:fmt(results.totalEVA)},
          {l:"Terminal Value",v:fmt(results.tv)},{l:"PV of Terminal Value",v:fmt(results.tvPV)},
        ]},
        {n:"04",title:"Risk Assessment",content:
          `Key risk factors identified:\n\n• WACC Risk: A 1% increase in discount rate would reduce NPV by approximately ${fmt(Math.abs(results.npv*0.08))}.\n• Inflation Risk: At ${inputs.inflationRate}% inflation, real NPV (${fmt(results.npvR)}) is ${fmt(Math.abs(results.npvR-results.npv))} ${results.npvR<results.npv?"lower":"higher"} than nominal.\n• Revenue Risk: A 10% revenue shortfall would materially impact NPV and IRR.\n• Financing Risk: Debt of ${fmt(Number(inputs.debtAmt||0))} at ${inputs.intRate}% requires consistent debt service.\n• Execution Risk: CAPEX overruns of ${fmt(results.totCapex)} base investment would reduce returns.`
        },
        {n:"05",title:"Recommendation",content:
          good
            ? `✅ RECOMMENDED FOR APPROVAL\n\nNPV of ${fmt(results.npv)} confirms value creation above the cost of capital.\nIRR of ${pct(results.irr!=null?results.irr*100:null)} ${results.irr!=null&&results.irr>inputs.discountRate/100?`exceeds WACC by ${((results.irr-inputs.discountRate/100)*100).toFixed(1)}pp`:""}\nPayback of ${results.pb>=0?`${results.pb} years`:"beyond projection"} is within acceptable range.\nProfitability Index ${xN(results.pi)} indicates efficient capital utilisation.\n\nPROCEED WITH INVESTMENT.`
            : `⚠️ REVISE AND RESUBMIT\n\nNPV of ${fmt(results.npv)} indicates value destruction at current assumptions.\n\nRecommended actions:\n1. Review revenue assumptions for realism.\n2. Reduce CAPEX or phase investment differently.\n3. Refinance debt to lower interest burden.\n4. Extend operation period to improve return.\n5. Explore tax optimisation opportunities.`
        },
      ].map((sec,i)=>(
        <div className="card fade-up" key={sec.n} style={{marginBottom:10}}>
          <div className="card-header">
            <span style={{fontSize:11,color:"var(--text-tertiary)",fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase"}}>{sec.n} — {sec.title}</span>
          </div>
          <div className="card-body">
            {sec.content&&<div style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.75,whiteSpace:"pre-line"}}>{sec.content}</div>}
            {sec.rows&&sec.rows.map(r=><Row key={r.l} l={r.l} v={r.v} h={r.h}/>)}
          </div>
        </div>
      ))}
      <div style={{textAlign:"center",padding:"16px",fontSize:12,color:"var(--text-tertiary)"}}>
        💡 Press <strong>Cmd+P</strong> (Mac) or <strong>Ctrl+P</strong> (Windows) → Save as PDF
      </div>
    </div>
  );
}

/* ══ LANDING PAGE ══════════════════════════════════════════════════════ */
function LandingPage({onLaunch,onDash}){
  const FEATS=[
    {n:"01",t:"Multi-phase DCF",d:"Model a construction phase separately from operations. Each phase has its own cash flow profile and periodisation.",tag:"Core"},
    {n:"02",t:"Multi-row CAPEX",d:"Up to 5 CAPEX items, each with name, annual payment schedule, and individual straight-line depreciation.",tag:"Core"},
    {n:"03",t:"Revenue Drivers",d:"Build revenue from components: Driver1 × Driver2 × annual growth. Multiple revenue streams, fully customisable.",tag:"Core"},
    {n:"04",t:"Working Capital",d:"Enter receivable days, payable days, inventory days. WC and its FCF impact calculated automatically each year.",tag:"New"},
    {n:"05",t:"Break-Even Finder",d:"Instantly find the WACC, tax rate, inflation or growth rate at which NPV = 0. With sweep chart.",tag:"New"},
    {n:"06",t:"Terminal Value",d:"Gordon Growth perpetuity or EV/EBITDA multiple. See PV of TV and its contribution to total NPV.",tag:"Pro"},
    {n:"07",t:"EVA & RONA",d:"Economic Value Added and Return on Net Assets alongside standard metrics. True economic profit visibility.",tag:"Pro"},
    {n:"08",t:"Real NPV via Fisher",d:"Inflation properly handled using the Fisher equation. Both nominal and real WACC, NPV and IRR shown.",tag:"Pro"},
    {n:"09",t:"Sensitivity Heatmap",d:"Interactive heat map showing NPV impact of ±30% change across 6 variables. Tornado chart included.",tag:"Analysis"},
    {n:"10",t:"Scenario Manager",d:"Base, Bull, Bear and Stress scenarios compared side by side with visual NPV and IRR charts.",tag:"Analysis"},
    {n:"11",t:"Auto Proposal PDF",d:"One-click professional investment proposal: executive summary, financials, risk assessment, recommendation.",tag:"Export"},
    {n:"12",t:"14 Currencies",d:"Switch between USD, EUR, GBP, CHF, JPY and more. Applied consistently across all calculations.",tag:"Global"},
  ];

  return(
    <div style={{fontFamily:"Inter,sans-serif",background:"var(--bg)",minHeight:"100dvh",color:"var(--text-primary)"}}>
      {/* Nav */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"var(--surface)",backdropFilter:"saturate(180%) blur(24px)",WebkitBackdropFilter:"saturate(180%) blur(24px)",borderBottom:"1px solid var(--sep)",height:52,display:"flex",alignItems:"center",padding:"0 32px",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <FoxLogo/>
          <span style={{fontWeight:700,fontSize:17,letterSpacing:"-0.3px"}}>Foxinvest</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          {onDash
            ?<><button className="btn btn-secondary btn-sm" onClick={onDash}>Dashboard</button><button className="btn btn-primary btn-sm" onClick={onDash}>Go to app →</button></>
            :<><button className="btn btn-secondary btn-sm" onClick={onLaunch}>Sign in</button><button className="btn btn-primary btn-sm" onClick={onLaunch}>Get started free →</button></>
          }
        </div>
      </nav>

      {/* Hero */}
      <div style={{paddingTop:100,paddingBottom:80,paddingLeft:32,paddingRight:32,maxWidth:1120,margin:"0 auto",display:"flex",alignItems:"center",gap:64,minHeight:"90dvh"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"var(--blue-bg)",color:"var(--blue)",fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"4px 12px",borderRadius:99,marginBottom:22}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"var(--blue)",display:"inline-block"}}/>
            Professional Investment Analysis
          </div>
          <div style={{fontSize:"clamp(38px,5vw,64px)",fontWeight:800,letterSpacing:"-1.5px",lineHeight:1.08,marginBottom:20,color:"var(--text-primary)"}}>Investment appraisal,<br/><span style={{color:"var(--blue)"}}>done properly.</span></div>
          <div style={{fontSize:17,color:"var(--text-secondary)",lineHeight:1.65,maxWidth:480,marginBottom:32}}>DCF valuation, multi-phase modelling, scenario analysis and board-ready proposals — for businesses that make serious investment decisions.</div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:28}}>
            <button className="btn btn-primary" style={{fontSize:15,padding:"12px 24px"}} onClick={onDash||onLaunch}>{onDash?"Go to my dashboard →":"Create free account →"}</button>
            <button className="btn btn-secondary" style={{fontSize:15,padding:"12px 24px"}} onClick={onDash||onLaunch}>{onDash?"Open a project":"Try demo"}</button>
          </div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {["✓ Real DCF with Fisher equation","✓ Break-even finder","✓ EVA & RONA","✓ Auto PDF proposals"].map(t=>(
              <span key={t} style={{fontSize:12,color:"var(--text-tertiary)",fontWeight:500}}>{t}</span>
            ))}
          </div>
        </div>

        {/* Preview card */}
        <div style={{flex:"0 0 380px",background:"linear-gradient(145deg,#1a1a2e,#0f3460)",borderRadius:24,padding:24,boxShadow:"0 32px 80px rgba(0,0,0,0.3)"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:16}}>Live Results Preview</div>
          {[
            {l:"NPV (Nominal)",v:"€ 284,500",c:"var(--green)"},
            {l:"NPV (Real)",v:"€ 241,200",c:"var(--green)"},
            {l:"IRR",v:"14.2%",c:"rgba(255,255,255,0.9)"},
            {l:"MIRR",v:"11.8%",c:"rgba(255,255,255,0.9)"},
            {l:"Payback",v:"4 years",c:"rgba(255,255,255,0.9)"},
            {l:"PI",v:"1.38×",c:"var(--green)"},
            {l:"RONA",v:"18.4%",c:"var(--green)"},
            {l:"Total EVA",v:"€ 142,000",c:"var(--green)"},
          ].map((r,i,arr)=>(
            <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,0.08)":"none"}}>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:500}}>{r.l}</span>
              <span style={{fontSize:13,fontWeight:700,color:r.c,fontVariantNumeric:"tabular-nums"}}>{r.v}</span>
            </div>
          ))}
          <div style={{marginTop:16,background:"rgba(52,199,89,0.15)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
            <span>✅</span>
            <span style={{fontSize:12,color:"var(--green)",fontWeight:600}}>RECOMMENDED — Creates value above WACC</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{background:"var(--bg2)",borderTop:"1px solid var(--sep)",padding:"80px 32px"}}>
        <div style={{maxWidth:1120,margin:"0 auto"}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:"var(--blue)",marginBottom:14}}>What You Get</div>
          <div style={{fontSize:"clamp(28px,4vw,40px)",fontWeight:800,letterSpacing:"-1px",marginBottom:14}}>Everything a finance team has.<br/><span style={{color:"var(--blue)"}}>Without the finance team.</span></div>
          <div style={{fontSize:16,color:"var(--text-secondary)",marginBottom:52,maxWidth:500}}>Every feature modelled on professional investment appraisal methodology used by investment banks.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"var(--sep)",borderRadius:16,overflow:"hidden"}}>
            {FEATS.map(f=>(
              <div key={f.n} style={{background:"var(--bg2)",padding:"24px",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="var(--fill)"} onMouseLeave={e=>e.currentTarget.style.background="var(--bg2)"}>
                <div style={{fontSize:28,fontWeight:800,color:"var(--sep)",marginBottom:12,fontVariantNumeric:"tabular-nums"}}>{f.n}</div>
                <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>{f.t}</div>
                <div style={{fontSize:13,color:"var(--text-tertiary)",lineHeight:1.6,marginBottom:12}}>{f.d}</div>
                <div style={{display:"inline-block",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"var(--blue-bg)",color:"var(--blue)",textTransform:"uppercase",letterSpacing:"0.5px"}}>{f.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{background:"var(--blue)",padding:"80px 32px",textAlign:"center"}}>
        <div style={{fontSize:"clamp(28px,4vw,42px)",fontWeight:800,color:"#fff",letterSpacing:"-1px",marginBottom:16}}>Start your first analysis today</div>
        <div style={{fontSize:16,color:"rgba(255,255,255,0.7)",marginBottom:32}}>Free forever on your first project. No credit card required.</div>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button style={{background:"#fff",color:"var(--blue)",padding:"14px 28px",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",border:"none",fontFamily:"inherit",transition:"all 0.15s"}} onClick={onDash||onLaunch} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>{onDash?"Go to my dashboard →":"Create free account →"}</button>
          {!onDash&&<button style={{background:"transparent",color:"#fff",padding:"14px 24px",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",border:"2px solid rgba(255,255,255,0.4)",fontFamily:"inherit"}} onClick={onLaunch}>Try demo first</button>}
        </div>
      </div>

      {/* Footer */}
      <div style={{background:"var(--bg2)",borderTop:"1px solid var(--sep)",padding:"32px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <FoxLogo/>
          <span style={{fontWeight:700,fontSize:15}}>Foxinvest</span>
          <span style={{color:"var(--text-tertiary)",fontSize:13}}>© {new Date().getFullYear()}</span>
        </div>
        <div style={{fontSize:13,color:"var(--text-tertiary)"}}>Professional investment analysis for businesses that mean business.</div>
      </div>
    </div>
  );
}
