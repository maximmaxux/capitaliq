import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";

/* ─── Fonts & global reset ─────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: #f7f4ef; font-family: 'DM Sans', sans-serif; color: #0f1117; overflow-x: hidden; }

    :root {
      --ink:      #0f1117;
      --ink2:     #3d4152;
      --ink3:     #8a8fa8;
      --cream:    #f7f4ef;
      --cream2:   #eeead8;
      --emerald:  #0d7a55;
      --emerald2: #0a6347;
      --emerald-l:#e6f4ee;
      --gold:     #c8960c;
      --gold-l:   #fdf6e3;
      --red:      #c0392b;
      --border:   #e0dbd0;
      --card:     #ffffff;
      --serif:    'Playfair Display', Georgia, serif;
      --sans:     'DM Sans', system-ui, sans-serif;
      --shadow:   0 1px 3px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06);
      --shadow-lg:0 4px 6px rgba(0,0,0,0.05), 0 24px 64px rgba(0,0,0,0.12);
    }

    /* ── Nav ── */
    .nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: rgba(247,244,239,0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 0 32px;
      height: 64px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .nav-logo { font-family: var(--serif); font-size: 22px; color: var(--ink); font-weight: 700; letter-spacing: -0.5px; cursor:pointer; }
    .nav-logo span { color: var(--emerald); }
    .nav-links { display: flex; align-items: center; gap: 28px; }
    .nav-link { font-size: 14px; color: var(--ink2); text-decoration: none; cursor: pointer; transition: color 0.15s; font-weight: 500; }
    .nav-link:hover { color: var(--emerald); }
    .nav-cta {
      background: var(--ink); color: #fff;
      padding: 9px 20px; border-radius: 6px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      border: none; font-family: var(--sans);
      transition: background 0.15s;
    }
    .nav-cta:hover { background: var(--emerald); }

    /* ── Hero ── */
    .hero {
      min-height: 100vh;
      padding: 120px 32px 80px;
      display: flex; align-items: center;
      max-width: 1200px; margin: 0 auto;
      gap: 64px;
    }
    .hero-left { flex: 1; min-width: 0; }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--emerald-l); color: var(--emerald);
      font-size: 12px; font-weight: 700; letter-spacing: 0.8px;
      text-transform: uppercase; padding: 5px 12px; border-radius: 4px;
      margin-bottom: 24px;
    }
    .hero-eyebrow::before { content: ''; width: 6px; height: 6px; background: var(--emerald); border-radius: 50%; }
    .hero-h1 {
      font-family: var(--serif);
      font-size: clamp(38px, 5vw, 60px);
      line-height: 1.1;
      letter-spacing: -1px;
      color: var(--ink);
      margin-bottom: 22px;
    }
    .hero-h1 em { font-style: italic; color: var(--emerald); }
    .hero-sub {
      font-size: 17px; color: var(--ink2); line-height: 1.65;
      max-width: 480px; margin-bottom: 36px; font-weight: 400;
    }
    .hero-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .btn-primary {
      background: var(--emerald); color: #fff;
      padding: 14px 28px; border-radius: 7px;
      font-size: 15px; font-weight: 600; cursor: pointer;
      border: none; font-family: var(--sans);
      transition: all 0.15s; display: flex; align-items: center; gap: 8px;
    }
    .btn-primary:hover { background: var(--emerald2); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(13,122,85,0.3); }
    .btn-secondary {
      background: transparent; color: var(--ink);
      padding: 14px 24px; border-radius: 7px;
      font-size: 15px; font-weight: 500; cursor: pointer;
      border: 1.5px solid var(--border); font-family: var(--sans);
      transition: all 0.15s;
    }
    .btn-secondary:hover { border-color: var(--ink); background: var(--cream2); }
    .hero-proof { display: flex; align-items: center; gap: 16px; margin-top: 28px; }
    .hero-proof-text { font-size: 13px; color: var(--ink3); }
    .hero-proof-text strong { color: var(--ink); }
    .hero-stars { color: var(--gold); font-size: 14px; letter-spacing: 1px; }

    /* ── Hero card ── */
    .hero-right { flex: 0 0 420px; }
    .hero-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }
    .hcard-header {
      background: var(--ink);
      padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .hcard-title { font-family: var(--serif); color: #fff; font-size: 14px; }
    .hcard-dots { display: flex; gap: 5px; }
    .hcard-dot { width: 9px; height: 9px; border-radius: 50%; }
    .hcard-body { padding: 20px; }
    .hcard-value {
      font-family: var(--serif);
      font-size: 42px; color: var(--emerald);
      letter-spacing: -1px; line-height: 1;
      margin-bottom: 4px;
    }
    .hcard-label { font-size: 12px; color: var(--ink3); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 16px; }
    .hcard-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .hcard-stat { background: var(--cream); border-radius: 8px; padding: 10px 12px; }
    .hcard-stat-val { font-weight: 700; font-size: 16px; color: var(--ink); }
    .hcard-stat-lbl { font-size: 10px; color: var(--ink3); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

    /* ── Section ── */
    .section { padding: 96px 32px; }
    .section-inner { max-width: 1200px; margin: 0 auto; }
    .section-label {
      font-size: 11px; font-weight: 700; letter-spacing: 1.2px;
      text-transform: uppercase; color: var(--emerald);
      margin-bottom: 14px;
    }
    .section-h2 {
      font-family: var(--serif);
      font-size: clamp(28px, 4vw, 44px);
      line-height: 1.15; letter-spacing: -0.5px;
      color: var(--ink); margin-bottom: 16px;
    }
    .section-h2 em { font-style: italic; color: var(--emerald); }
    .section-sub { font-size: 16px; color: var(--ink2); line-height: 1.6; max-width: 520px; }

    /* ── Problem section ── */
    .problem-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 48px; }
    .problem-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: 12px; padding: 28px;
      position: relative; overflow: hidden;
    }
    .problem-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0;
      height: 3px; background: var(--border);
    }
    .problem-icon { font-size: 28px; margin-bottom: 14px; }
    .problem-title { font-family: var(--serif); font-size: 17px; color: var(--ink); margin-bottom: 8px; font-weight: 600; }
    .problem-text { font-size: 14px; color: var(--ink2); line-height: 1.6; }

    /* ── Features ── */
    .features-bg { background: var(--ink); }
    .features-bg .section-label { color: var(--emerald); }
    .features-bg .section-h2 { color: #fff; }
    .features-bg .section-h2 em { color: #7dd3b0; }
    .features-bg .section-sub { color: #9ca3b8; }
    .features-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: #1e2233; margin-top: 56px; border-radius: 12px; overflow: hidden; }
    .feature-cell {
      background: #141827;
      padding: 32px 28px;
      transition: background 0.2s;
    }
    .feature-cell:hover { background: #1a2135; }
    .feature-num {
      font-family: var(--serif); font-size: 36px;
      color: #2a3350; font-weight: 700;
      margin-bottom: 16px; line-height: 1;
    }
    .feature-title { font-family: var(--serif); font-size: 18px; color: #fff; margin-bottom: 10px; }
    .feature-text { font-size: 13px; color: #7a84a0; line-height: 1.6; }
    .feature-tag {
      display: inline-block; margin-top: 12px;
      background: #1e2a1a; color: #5cb88a;
      font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
      padding: 3px 8px; border-radius: 3px; text-transform: uppercase;
    }

    /* ── Pricing ── */
    .pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 52px; }
    .pricing-card {
      background: var(--card); border: 1.5px solid var(--border);
      border-radius: 14px; padding: 32px 28px;
      position: relative; transition: all 0.2s;
    }
    .pricing-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
    .pricing-card.featured {
      border-color: var(--emerald);
      box-shadow: 0 0 0 4px rgba(13,122,85,0.08), var(--shadow-lg);
    }
    .pricing-badge {
      position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
      background: var(--emerald); color: #fff;
      font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
      padding: 4px 14px; border-radius: 20px;
    }
    .pricing-tier { font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--ink3); margin-bottom: 10px; }
    .pricing-price { font-family: var(--serif); font-size: 44px; color: var(--ink); letter-spacing: -1px; line-height: 1; }
    .pricing-price sup { font-size: 20px; vertical-align: super; font-family: var(--sans); font-weight: 600; }
    .pricing-price-sub { font-size: 13px; color: var(--ink3); margin-top: 4px; margin-bottom: 6px; }
    .pricing-desc { font-size: 13px; color: var(--ink2); margin-bottom: 24px; line-height: 1.5; }
    .pricing-divider { height: 1px; background: var(--border); margin-bottom: 20px; }
    .pricing-feature { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
    .pricing-check { color: var(--emerald); font-size: 14px; flex-shrink: 0; margin-top: 1px; }
    .pricing-feat-text { font-size: 13px; color: var(--ink2); }
    .btn-plan {
      width: 100%; padding: 12px; border-radius: 7px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      border: none; font-family: var(--sans); margin-top: 20px;
      transition: all 0.15s;
    }
    .btn-plan-outline { background: transparent; color: var(--ink); border: 1.5px solid var(--border); }
    .btn-plan-outline:hover { border-color: var(--ink); background: var(--cream2); }
    .btn-plan-filled { background: var(--emerald); color: #fff; }
    .btn-plan-filled:hover { background: var(--emerald2); }
    .btn-plan-dark { background: var(--ink); color: #fff; }
    .btn-plan-dark:hover { background: #222; }

    /* ── Testimonials ── */
    .testi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 48px; }
    .testi-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: 12px; padding: 28px;
    }
    .testi-stars { color: var(--gold); font-size: 13px; margin-bottom: 14px; letter-spacing: 2px; }
    .testi-quote { font-family: var(--serif); font-size: 15px; color: var(--ink); line-height: 1.65; margin-bottom: 18px; font-style: italic; }
    .testi-author { display: flex; align-items: center; gap: 10px; }
    .testi-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--emerald-l); display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; color: var(--emerald);
    }
    .testi-name { font-size: 13px; font-weight: 600; color: var(--ink); }
    .testi-role { font-size: 11px; color: var(--ink3); }

    /* ── CTA Banner ── */
    .cta-banner {
      background: var(--emerald);
      padding: 80px 32px;
      text-align: center;
    }
    .cta-banner h2 { font-family: var(--serif); font-size: 40px; color: #fff; margin-bottom: 16px; }
    .cta-banner p { font-size: 16px; color: rgba(255,255,255,0.8); margin-bottom: 32px; }
    .btn-cta-white {
      background: #fff; color: var(--emerald);
      padding: 16px 36px; border-radius: 8px;
      font-size: 15px; font-weight: 700; cursor: pointer;
      border: none; font-family: var(--sans);
      transition: all 0.15s; display: inline-flex; align-items: center; gap: 8px;
    }
    .btn-cta-white:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.2); }

    /* ── Footer ── */
    .footer {
      background: var(--ink); padding: 48px 32px 32px;
    }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-top { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .footer-logo { font-family: var(--serif); font-size: 20px; color: #fff; margin-bottom: 10px; }
    .footer-logo span { color: #7dd3b0; }
    .footer-tagline { font-size: 13px; color: #6b7280; max-width: 220px; line-height: 1.5; }
    .footer-links h4 { font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #6b7280; margin-bottom: 14px; }
    .footer-links a { display: block; font-size: 13px; color: #9ca3af; margin-bottom: 8px; cursor: pointer; text-decoration: none; transition: color 0.15s; }
    .footer-links a:hover { color: #fff; }
    .footer-bottom { border-top: 1px solid #1e2233; padding-top: 24px; display: flex; justify-content: space-between; align-items: center; }
    .footer-copy { font-size: 12px; color: #4b5563; }

    /* ── App screen ── */
    .app-screen {
      min-height: 100vh;
      background: var(--cream);
      padding-top: 64px;
    }
    .app-topbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: var(--card); border-bottom: 1px solid var(--border);
      height: 64px; display: flex; align-items: center;
      padding: 0 24px; gap: 16px;
    }
    .app-logo { font-family: var(--serif); font-size: 18px; cursor: pointer; }
    .app-logo span { color: var(--emerald); }
    .app-project-name {
      flex: 1; font-size: 14px; font-weight: 500; color: var(--ink2);
      padding: 6px 12px; border-radius: 6px; background: var(--cream);
      border: 1px solid var(--border); cursor: text;
    }
    .app-tabs {
      display: flex; border-bottom: 1px solid var(--border);
      background: var(--card); padding: 0 24px; gap: 0;
      overflow-x: auto; scrollbar-width: none;
    }
    .app-tabs::-webkit-scrollbar { display: none; }
    .app-tab {
      padding: 12px 20px; font-size: 13px; font-weight: 500;
      color: var(--ink3); cursor: pointer; border-bottom: 2px solid transparent;
      white-space: nowrap; transition: all 0.15s; border: none; background: none;
      font-family: var(--sans);
    }
    .app-tab.active { color: var(--emerald); border-bottom-color: var(--emerald); }
    .app-tab:hover:not(.active) { color: var(--ink); }
    .app-body { max-width: 1100px; margin: 0 auto; padding: 28px 24px; }

    /* ── App cards ── */
    .acard { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
    .acard-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
    .acard-title { font-size: 13px; font-weight: 600; color: var(--ink); }
    .acard-sub { font-size: 12px; color: var(--ink3); }
    .acard-body { padding: 20px; }

    /* ── KPI bar ── */
    .kpi-bar { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 20px; }
    .kpi-box { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; }
    .kpi-box-label { font-size: 11px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; color: var(--ink3); margin-bottom: 6px; }
    .kpi-box-value { font-family: var(--serif); font-size: 26px; color: var(--ink); letter-spacing: -0.5px; }
    .kpi-box-value.green { color: var(--emerald); }
    .kpi-box-value.red   { color: var(--red); }
    .kpi-box-value.gold  { color: var(--gold); }
    .kpi-badge { display: inline-flex; align-items: center; gap: 4px; margin-top: 5px; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 3px; }
    .kpi-badge.good { background: var(--emerald-l); color: var(--emerald); }
    .kpi-badge.bad  { background: #fde8e8; color: var(--red); }

    /* ── Input grid ── */
    .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .input-group { display: flex; flex-direction: column; gap: 5px; }
    .input-label { font-size: 12px; font-weight: 600; color: var(--ink2); letter-spacing: 0.3px; }
    .input-row-app {
      display: flex; align-items: center;
      background: var(--cream); border: 1.5px solid var(--border);
      border-radius: 7px; overflow: hidden; transition: border-color 0.15s;
    }
    .input-row-app:focus-within { border-color: var(--emerald); }
    .input-prefix { padding: 0 10px; font-size: 13px; color: var(--ink3); background: var(--cream2); border-right: 1px solid var(--border); height: 38px; display: flex; align-items: center; }
    .input-suffix { padding: 0 10px; font-size: 13px; color: var(--ink3); background: var(--cream2); border-left: 1px solid var(--border); height: 38px; display: flex; align-items: center; }
    .input-field-app {
      flex: 1; background: none; border: none; outline: none;
      font-family: var(--sans); font-size: 14px; font-weight: 500;
      color: var(--ink); padding: 0 12px; height: 38px; text-align: right;
    }
    .select-app {
      flex: 1; background: none; border: none; outline: none;
      font-family: var(--sans); font-size: 14px; color: var(--ink);
      padding: 0 12px; height: 38px; cursor: pointer;
    }

    /* ── Scenario pills ── */
    .scenario-pills { display: flex; gap: 8px; margin-bottom: 20px; }
    .scenario-pill {
      padding: 7px 18px; border-radius: 6px; font-size: 13px; font-weight: 600;
      cursor: pointer; border: 1.5px solid var(--border); background: var(--card);
      color: var(--ink2); transition: all 0.15s; font-family: var(--sans);
    }
    .scenario-pill:hover { border-color: var(--emerald); color: var(--emerald); }
    .scenario-pill.active { background: var(--emerald); color: #fff; border-color: var(--emerald); }
    .scenario-pill.bull { }
    .scenario-pill.bear { }
    .scenario-pill.stress { }

    /* ── Table ── */
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { background: var(--cream); color: var(--ink2); font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; padding: 9px 14px; text-align: right; border-bottom: 1.5px solid var(--border); }
    .data-table th:first-child { text-align: left; }
    .data-table td { padding: 9px 14px; text-align: right; border-bottom: 1px solid var(--border); color: var(--ink); font-variant-numeric: tabular-nums; }
    .data-table td:first-child { text-align: left; font-weight: 500; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: var(--cream); }

    /* ── Heat map ── */
    .heat-wrap { overflow-x: auto; }
    .heat-table { border-collapse: collapse; font-size: 12px; }
    .heat-table th { background: var(--cream2); color: var(--ink2); padding: 7px 12px; border: 1px solid var(--border); font-size: 11px; text-align: center; white-space: nowrap; }
    .heat-table td { padding: 7px 10px; border: 1px solid var(--border); text-align: center; white-space: nowrap; font-size: 12px; font-variant-numeric: tabular-nums; }
    .heat-base-cell { outline: 2px solid var(--emerald); outline-offset: -2px; font-weight: 700; }

    /* ── Tooltip ── */
    .chart-tip { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; font-size: 12px; box-shadow: var(--shadow); }
    .chart-tip-label { color: var(--ink3); font-size: 10px; margin-bottom: 5px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }

    /* ── Animations ── */
    @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes countUp { from { opacity:0; } to { opacity:1; } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    .fade-up { animation: fadeUp 0.4s ease both; }
    .fade-up-1 { animation-delay: 0.08s; }
    .fade-up-2 { animation-delay: 0.16s; }
    .fade-up-3 { animation-delay: 0.24s; }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--emerald); display: inline-block; animation: pulse 2s infinite; }

    @media print {
      .app-topbar, .app-tabs, .no-print { display: none !important; }
      .app-screen { padding-top: 0 !important; }
      .app-body { padding: 0 !important; max-width: 100% !important; }
      .acard { break-inside: avoid; box-shadow: none !important; border: 1px solid #ddd !important; margin-bottom: 12px !important; }
      body { background: white !important; }
      .fade-up { animation: none !important; }
      @page { margin: 15mm; size: A4; }
      .print-header { display: block !important; }
    }
    .print-header { display: none; }
      .hero { flex-direction: column; padding: 100px 20px 60px; gap: 40px; }
      .hero-right { flex: none; width: 100%; }
      .problem-grid, .features-grid, .pricing-grid, .testi-grid { grid-template-columns: 1fr; }
      .kpi-bar { grid-template-columns: 1fr 1fr; }
      .input-grid { grid-template-columns: 1fr; }
      .nav-links { display: none; }
    }
  `}</style>
);

/* ─── Currencies ───────────────────────────────────────────────────── */
const CURRENCIES = [
  { code: "USD", symbol: "$",  name: "US Dollar",         locale: "en-US"  },
  { code: "EUR", symbol: "€",  name: "Euro",              locale: "de-DE"  },
  { code: "GBP", symbol: "£",  name: "British Pound",     locale: "en-GB"  },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc",       locale: "de-CH"  },
  { code: "SEK", symbol: "kr", name: "Swedish Krona",     locale: "sv-SE"  },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone",   locale: "nb-NO"  },
  { code: "DKK", symbol: "kr", name: "Danish Krone",      locale: "da-DK"  },
  { code: "PLN", symbol: "zł", name: "Polish Złoty",      locale: "pl-PL"  },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna",      locale: "cs-CZ"  },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint",  locale: "hu-HU"  },
  { code: "RON", symbol: "lei",name: "Romanian Leu",      locale: "ro-RO"  },
  { code: "JPY", symbol: "¥",  name: "Japanese Yen",      locale: "ja-JP"  },
  { code: "CNY", symbol: "¥",  name: "Chinese Yuan",      locale: "zh-CN"  },
  { code: "INR", symbol: "₹",  name: "Indian Rupee",      locale: "en-IN"  },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU"  },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar",   locale: "en-CA"  },
  { code: "BRL", symbol: "R$", name: "Brazilian Real",    locale: "pt-BR"  },
  { code: "AED", symbol: "د.إ",name: "UAE Dirham",        locale: "ar-AE"  },
  { code: "TRY", symbol: "₺",  name: "Turkish Lira",      locale: "tr-TR"  },
  { code: "ZAR", symbol: "R",  name: "South African Rand",locale: "en-ZA"  },
];

const CurrencyContext = createContext({ code: "USD", symbol: "$", locale: "en-US" });
const useCurrency = () => useContext(CurrencyContext);

/* ─── Helpers ──────────────────────────────────────────────────────── */
const makeFmt = (code, locale) => (n) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(n);

const makeFmtK = (code, locale, symbol) => (n) => {
  const a = Math.abs(n);
  const fmt = makeFmt(code, locale);
  if (a >= 1e9) return `${symbol}${(n/1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${symbol}${(n/1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${symbol}${(n/1e3).toFixed(0)}K`;
  return fmt(n);
};

// Default (USD) — overridden by CurrencyContext consumers
const fmt  = makeFmt("USD", "en-US");
const fmtK = makeFmtK("USD", "en-US", "$");
const pct  = (n) => `${Number(n).toFixed(1)}%`;

// Hook that returns currency-aware formatters
function useFmt() {
  const cur = useCurrency();
  return {
    fmt:  makeFmt(cur.code, cur.locale),
    fmtK: makeFmtK(cur.code, cur.locale, cur.symbol),
    symbol: cur.symbol,
    code: cur.code,
  };
}

function calcSchedule(inputs) {
  const { principal, monthly, rate, years, compound, inflation, wacc } = inputs;
  const ppy = compound === "monthly" ? 12 : compound === "quarterly" ? 4 : 1;
  const rp  = (Number(rate)/100) / ppy;
  const inf = Number(inflation)/100;
  const disc = Number(wacc)/100;
  let bal = Number(principal), contrib = Number(principal), npvAcc = -Number(principal);
  const sched = [];
  for (let y = 1; y <= Number(years); y++) {
    const ys = bal;
    for (let p = 0; p < ppy; p++) { bal += Number(monthly)*(12/ppy); contrib += Number(monthly)*(12/ppy); bal *= 1+rp; }
    const yearGrowth = bal - ys;
    const fcf = yearGrowth * 0.6 * (1 - 0.21);
    npvAcc += fcf / Math.pow(1+disc, y);
    sched.push({ year: y, balance: Math.round(bal), contributions: Math.round(contrib), interest: Math.round(bal-contrib), inflationAdj: Math.round(bal/Math.pow(1+inf,y)), yearGrowth: Math.round(yearGrowth), fcf: Math.round(fcf), cumNPV: Math.round(npvAcc) });
  }
  const last = sched[sched.length-1] || {};
  const allFCF = [-Number(principal), ...sched.map(r => r.fcf)];
  let irr = 0.1;
  for (let i = 0; i < 100; i++) {
    const v = allFCF.reduce((s,v,t) => s+v/Math.pow(1+irr,t), 0);
    const d = allFCF.reduce((s,v,t) => s-t*v/Math.pow(1+irr,t+1), 0);
    if (!d || Math.abs(d) < 1e-10) break;
    irr -= v/d;
    if (irr < -1) { irr = -0.99; break; }
  }
  return {
    schedule: sched,
    totals: {
      finalBalance: last.balance||0, totalContrib: last.contributions||0,
      totalInterest: last.interest||0, inflationAdj: last.inflationAdj||0,
      roi: last.contributions > 0 ? ((last.balance-last.contributions)/last.contributions)*100 : 0,
      npv: last.cumNPV||0, irr: isFinite(irr) ? irr : null,
      payback: sched.findIndex((r,i) => sched.slice(0,i+1).reduce((s,x)=>s+x.fcf,0) >= Number(principal)),
    }
  };
}

function heatBg(val, min, max) {
  const t = max === min ? 0.5 : (val-min)/(max-min);
  if (t < 0.5) return `rgba(192,57,43,${0.15+t*0.5})`;
  return `rgba(13,122,85,${0.1+(t-0.5)*0.7})`;
}

function heatColor(val, min, max) {
  const t = max === min ? 0.5 : (val-min)/(max-min);
  return t < 0.3 ? "#7f1d1d" : t > 0.7 ? "#064e3b" : "#374151";
}

/* ─── Animated counter ─────────────────────────────────────────────── */
function AnimatedNum({ target }) {
  const { symbol } = useCurrency();
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let startTime = null;
    const dur = 1800;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts-startTime)/dur, 1);
      const ease = 1 - Math.pow(1-p, 3);
      setDisplay(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{symbol}{display.toLocaleString()}</>;
}

/* ─── Custom chart tooltip ─────────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  const { fmtK } = useFmt();
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-label">Year {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600, fontSize: 13 }}>
          {p.name}: {fmtK(p.value)}
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   AUTH STYLES
══════════════════════════════════════════════════════════════════════ */
const AuthStyles = () => (
  <style>{`
    .auth-wrap {
      min-height: 100vh; display: flex;
      background: var(--cream);
    }
    .auth-left {
      flex: 1; background: var(--ink);
      display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      padding: 60px; position: relative; overflow: hidden;
    }
    .auth-left::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(ellipse at 30% 50%, rgba(13,122,85,0.25) 0%, transparent 70%),
                  radial-gradient(ellipse at 80% 20%, rgba(13,122,85,0.1) 0%, transparent 60%);
    }
    .auth-left-content { position: relative; z-index: 1; max-width: 400px; }
    .auth-brand { font-family: var(--serif); font-size: 28px; color: #fff; margin-bottom: 40px; }
    .auth-brand span { color: #7dd3b0; }
    .auth-tagline { font-family: var(--serif); font-size: 36px; color: #fff; line-height: 1.2; margin-bottom: 20px; letter-spacing: -0.5px; }
    .auth-tagline em { color: #7dd3b0; font-style: italic; }
    .auth-sub { font-size: 15px; color: #9ca3b8; line-height: 1.6; margin-bottom: 40px; }
    .auth-features { display: flex; flex-direction: column; gap: 14px; }
    .auth-feature { display: flex; align-items: center; gap: 12px; }
    .auth-feature-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(13,122,85,0.2); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
    .auth-feature-text { font-size: 13px; color: #9ca3b8; }
    .auth-feature-text strong { color: #e2e8f0; }

    .auth-right {
      width: 480px; flex-shrink: 0;
      display: flex; flex-direction: column;
      justify-content: center; padding: 60px 48px;
      background: #fff;
    }
    .auth-form-logo { font-family: var(--serif); font-size: 20px; color: var(--ink); margin-bottom: 32px; display: flex; align-items: center; gap: 8px; }
    .auth-form-logo span { color: var(--emerald); }
    .auth-form-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--emerald); }
    .auth-title { font-family: var(--serif); font-size: 28px; color: var(--ink); margin-bottom: 6px; }
    .auth-title-sub { font-size: 14px; color: var(--ink3); margin-bottom: 32px; }

    .auth-field { margin-bottom: 16px; }
    .auth-field label { display: block; font-size: 12px; font-weight: 600; color: var(--ink2); margin-bottom: 6px; letter-spacing: 0.3px; }
    .auth-input {
      width: 100%; padding: 11px 14px;
      border: 1.5px solid var(--border); border-radius: 8px;
      font-family: var(--sans); font-size: 14px; color: var(--ink);
      background: var(--cream); outline: none;
      transition: border-color 0.15s;
    }
    .auth-input:focus { border-color: var(--emerald); background: #fff; }
    .auth-input::placeholder { color: var(--ink3); }
    .auth-input.error { border-color: var(--red); }

    .auth-btn {
      width: 100%; padding: 13px;
      background: var(--emerald); color: #fff;
      border: none; border-radius: 8px;
      font-family: var(--sans); font-size: 15px; font-weight: 600;
      cursor: pointer; transition: all 0.15s; margin-top: 8px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .auth-btn:hover:not(:disabled) { background: var(--emerald2); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(13,122,85,0.3); }
    .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .auth-btn.loading::after { content: ''; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .auth-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
    .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .auth-divider-text { font-size: 12px; color: var(--ink3); white-space: nowrap; }

    .auth-switch { text-align: center; font-size: 13px; color: var(--ink3); margin-top: 20px; }
    .auth-switch a { color: var(--emerald); font-weight: 600; cursor: pointer; text-decoration: none; }
    .auth-switch a:hover { text-decoration: underline; }

    .auth-error {
      background: #fde8e8; border: 1px solid #fca5a5; border-radius: 7px;
      padding: 10px 14px; font-size: 13px; color: #b91c1c;
      margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
    }
    .auth-success {
      background: var(--emerald-l); border: 1px solid #86efac; border-radius: 7px;
      padding: 10px 14px; font-size: 13px; color: var(--emerald);
      margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
    }
    .auth-password-wrap { position: relative; }
    .auth-password-toggle {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; color: var(--ink3);
      font-size: 13px; padding: 2px;
    }
    .auth-terms { font-size: 11px; color: var(--ink3); text-align: center; margin-top: 14px; line-height: 1.5; }
    .auth-terms a { color: var(--emerald); cursor: pointer; }

    /* ── Projects Dashboard ── */
    .dash-wrap { min-height: 100vh; background: var(--cream); }
    .dash-topbar {
      background: #fff; border-bottom: 1px solid var(--border);
      height: 64px; display: flex; align-items: center;
      padding: 0 32px; gap: 16px; position: sticky; top: 0; z-index: 50;
    }
    .dash-logo { font-family: var(--serif); font-size: 20px; color: var(--ink); }
    .dash-logo span { color: var(--emerald); }
    .dash-user { margin-left: auto; display: flex; align-items: center; gap: 12px; }
    .dash-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: var(--emerald-l); display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: var(--emerald);
    }
    .dash-user-name { font-size: 13px; font-weight: 500; color: var(--ink); }
    .dash-logout { font-size: 13px; color: var(--ink3); cursor: pointer; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); background: none; font-family: var(--sans); transition: all 0.15s; }
    .dash-logout:hover { border-color: var(--red); color: var(--red); background: #fde8e8; }

    .dash-body { max-width: 1100px; margin: 0 auto; padding: 36px 32px; }
    .dash-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; }
    .dash-greeting { font-family: var(--serif); font-size: 28px; color: var(--ink); margin-bottom: 4px; }
    .dash-greeting-sub { font-size: 14px; color: var(--ink3); }
    .dash-new-btn {
      background: var(--emerald); color: #fff;
      padding: 11px 22px; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      border: none; font-family: var(--sans);
      display: flex; align-items: center; gap: 8px;
      transition: all 0.15s;
    }
    .dash-new-btn:hover { background: var(--emerald2); transform: translateY(-1px); }

    .dash-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 32px; }
    .dash-stat { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; }
    .dash-stat-label { font-size: 11px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; color: var(--ink3); margin-bottom: 6px; }
    .dash-stat-value { font-family: var(--serif); font-size: 26px; color: var(--ink); }
    .dash-stat-value.green { color: var(--emerald); }

    .dash-section-title { font-size: 13px; font-weight: 700; color: var(--ink2); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 14px; }

    .projects-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
    .project-card {
      background: #fff; border: 1.5px solid var(--border);
      border-radius: 12px; padding: 22px; cursor: pointer;
      transition: all 0.15s; position: relative; overflow: hidden;
    }
    .project-card:hover { border-color: var(--emerald); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .project-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--emerald); opacity: 0; transition: opacity 0.15s; }
    .project-card:hover::before { opacity: 1; }
    .project-card-name { font-family: var(--serif); font-size: 16px; color: var(--ink); margin-bottom: 4px; font-weight: 600; }
    .project-card-date { font-size: 11px; color: var(--ink3); margin-bottom: 14px; }
    .project-card-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
    .project-card-kpi { background: var(--cream); border-radius: 6px; padding: 8px 10px; }
    .project-card-kpi-val { font-size: 14px; font-weight: 700; color: var(--emerald); }
    .project-card-kpi-lbl { font-size: 10px; color: var(--ink3); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 1px; }
    .project-card-footer { display: flex; align-items: center; justify-content: space-between; }
    .project-card-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; padding: 3px 8px; border-radius: 3px; text-transform: uppercase; }
    .tag-active { background: var(--emerald-l); color: var(--emerald); }
    .tag-draft  { background: var(--cream2); color: var(--ink3); }
    .project-card-actions { display: flex; gap: 6px; }
    .project-action-btn { background: none; border: 1px solid var(--border); border-radius: 5px; padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: var(--sans); color: var(--ink2); transition: all 0.15s; }
    .project-action-btn:hover { border-color: var(--ink); color: var(--ink); }
    .project-action-btn.del:hover { border-color: var(--red); color: var(--red); background: #fde8e8; }

    .project-new-card {
      background: var(--cream); border: 2px dashed var(--border);
      border-radius: 12px; padding: 22px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s; min-height: 180px; gap: 10px;
    }
    .project-new-card:hover { border-color: var(--emerald); background: var(--emerald-l); }
    .project-new-icon { font-size: 28px; }
    .project-new-text { font-size: 13px; font-weight: 600; color: var(--ink3); }
    .project-new-card:hover .project-new-text { color: var(--emerald); }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-box { background: #fff; border-radius: 14px; padding: 28px; width: 100%; max-width: 440px; box-shadow: 0 24px 64px rgba(0,0,0,0.2); }
    .modal-title { font-family: var(--serif); font-size: 22px; color: var(--ink); margin-bottom: 6px; }
    .modal-sub { font-size: 13px; color: var(--ink3); margin-bottom: 22px; }
    .modal-actions { display: flex; gap: 10px; margin-top: 22px; }
    .modal-cancel { flex: 1; padding: 11px; border: 1.5px solid var(--border); border-radius: 7px; background: none; font-family: var(--sans); font-size: 14px; cursor: pointer; color: var(--ink2); }
    .modal-cancel:hover { border-color: var(--ink); }
    .modal-confirm { flex: 1; padding: 11px; background: var(--emerald); border: none; border-radius: 7px; font-family: var(--sans); font-size: 14px; font-weight: 600; cursor: pointer; color: #fff; }
    .modal-confirm:hover { background: var(--emerald2); }

    @media (max-width: 768px) {
      .auth-left { display: none; }
      .auth-right { width: 100%; padding: 40px 24px; }
      .projects-grid { grid-template-columns: 1fr; }
      .dash-stats { grid-template-columns: 1fr 1fr; }
    }
  `}</style>
);

/* ══════════════════════════════════════════════════════════════════════
   SUPABASE CONFIG  —  replace with your own keys
══════════════════════════════════════════════════════════════════════ */
const SUPABASE_URL      = https://zbluszpcsztpzoskzkiz.supabase.co;
const SUPABASE_ANON_KEY = sb_publishable_-amT-RfNBnJHgM7M-UNPVg_WEtnxFK6;

// Minimal Supabase client (no npm package needed)
const sb = (() => {
  const headers = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` };

  const authHeaders = (token) => ({ ...headers, 'Authorization': `Bearer ${token}` });

  return {
    auth: {
      async signUp({ email, password, name }) {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method:'POST', headers, body: JSON.stringify({ email, password, data: { full_name: name } }) });
        return r.json();
      },
      async signIn({ email, password }) {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method:'POST', headers, body: JSON.stringify({ email, password }) });
        return r.json();
      },
      async signInWithGoogle() {
        window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${window.location.origin}`;
      },
      async resetPassword(email) {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/recover`, { method:'POST', headers, body: JSON.stringify({ email }) });
        return r.json();
      },
      async signOut(token) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method:'POST', headers: authHeaders(token) });
      },
      async getUser(token) {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: authHeaders(token) });
        return r.json();
      },
    },
    db: {
      async getProjects(token) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=*&order=updated_at.desc`, { headers: authHeaders(token) });
        return r.json();
      },
      async createProject(token, data) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/projects`, { method:'POST', headers: { ...authHeaders(token), 'Prefer': 'return=representation' }, body: JSON.stringify(data) });
        const json = await r.json();
        return Array.isArray(json) ? json[0] : json;
      },
      async updateProject(token, id, data) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, { method:'PATCH', headers: { ...authHeaders(token), 'Prefer': 'return=representation' }, body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }) });
        const json = await r.json();
        return Array.isArray(json) ? json[0] : json;
      },
      async deleteProject(token, id) {
        await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, { method:'DELETE', headers: authHeaders(token) });
      },
    },
  };
})();

// Helper: parse Supabase session from URL hash (after Google OAuth redirect)
function parseSessionFromHash() {
  const hash = window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash.replace('#', ''));
  const token = params.get('access_token');
  if (!token) return null;
  window.history.replaceState(null, '', window.location.pathname);
  return { access_token: token, token_type: params.get('token_type') };
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen]             = useState("landing");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [session, setSession]           = useState(null);   // { access_token, user: { id, email, name } }
  const [projects, setProjects]         = useState([]);
  const [projLoading, setProjLoading]   = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [showNewModal, setShowNewModal]   = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const cur = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

  // On mount: check for OAuth redirect or stored session
  useEffect(() => {
    const oauthSession = parseSessionFromHash();
    if (oauthSession) {
      sb.auth.getUser(oauthSession.access_token).then(user => {
        if (user?.id) {
          const sess = { access_token: oauthSession.access_token, user: { id: user.id, email: user.email, name: user.user_metadata?.full_name || user.email.split('@')[0] } };
          setSession(sess);
          localStorage.setItem('ciq_session', JSON.stringify(sess));
          setScreen("dashboard");
        }
      });
      return;
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

  // Load projects when session changes
  useEffect(() => {
    if (!session) return;
    setProjLoading(true);
    sb.db.getProjects(session.access_token).then(data => {
      if (Array.isArray(data)) {
        setProjects(data.map(p => ({
          id: p.id, name: p.name, status: p.status,
          npv: p.npv || 0, irr: p.irr || 0, finalValue: p.final_value || 0,
          date: new Date(p.updated_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }),
          inputs: p.inputs || { principal:10000, monthly:500, rate:7, years:20, compound:"monthly", inflation:2, wacc:10, tax:21 },
        })));
      }
      setProjLoading(false);
    });
  }, [session]);

  const handleLogin = (sess) => {
    setSession(sess);
    localStorage.setItem('ciq_session', JSON.stringify(sess));
    setScreen("dashboard");
  };

  const handleLogout = async () => {
    if (session) await sb.auth.signOut(session.access_token);
    localStorage.removeItem('ciq_session');
    setSession(null);
    setProjects([]);
    setScreen("landing");
  };

  const openProject = (project) => { setActiveProject(project); setScreen("app"); };

  const createProject = async () => {
    if (!newProjectName.trim() || !session) return;
    const data = { user_id: session.user.id, name: newProjectName.trim(), inputs: { principal:10000, monthly:500, rate:7, years:20, compound:"monthly", inflation:2, wacc:10, tax:21 }, npv:0, irr:0, final_value:0, status:"draft" };
    const created = await sb.db.createProject(session.access_token, data);
    if (created?.id) {
      const proj = { id:created.id, name:created.name, status:"draft", npv:0, irr:0, finalValue:0, date:"Just now", inputs: data.inputs };
      setProjects(p => [proj, ...p]);
      setNewProjectName("");
      setShowNewModal(false);
      openProject(proj);
    }
  };

  const deleteProject = async (id) => {
    if (!session) return;
    await sb.db.deleteProject(session.access_token, id);
    setProjects(p => p.filter(pr => pr.id !== id));
  };

  const saveProject = async (id, updatedInputs, updatedTotals) => {
    if (!session) return;
    const data = { inputs: updatedInputs, npv: updatedTotals.npv, irr: updatedTotals.irr ? updatedTotals.irr * 100 : 0, final_value: updatedTotals.finalBalance, status:"active" };
    await sb.db.updateProject(session.access_token, id, data);
    setProjects(p => p.map(pr => pr.id === id ? { ...pr, ...data, finalValue: data.final_value, date:"Just now" } : pr));
  };

  return (
    <CurrencyContext.Provider value={cur}>
      <GlobalStyles />
      <AuthStyles />
      {screen === "landing"   && <LandingPage onLaunch={() => setScreen("login")} />}
      {screen === "login"     && <LoginPage   onLogin={handleLogin} onSignup={() => setScreen("signup")} onForgot={() => setScreen("forgot")} onBack={() => setScreen("landing")} />}
      {screen === "signup"    && <SignupPage  onLogin={handleLogin} onSignin={() => setScreen("login")} onBack={() => setScreen("landing")} />}
      {screen === "forgot"    && <ForgotPage  onBack={() => setScreen("login")} />}
      {screen === "dashboard" && <Dashboard   session={session} projects={projects} loading={projLoading} onOpen={openProject} onDelete={deleteProject} onLogout={handleLogout} onNew={() => setShowNewModal(true)} currencyCode={currencyCode} setCurrencyCode={setCurrencyCode} />}
      {screen === "app"       && <AppScreen   onBack={() => setScreen("dashboard")} currencyCode={currencyCode} setCurrencyCode={setCurrencyCode} project={activeProject} onSave={saveProject} />}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Project</div>
            <div className="modal-sub">Give your investment analysis a name to get started.</div>
            <div className="auth-field">
              <label>Project Name</label>
              <input className="auth-input" placeholder="e.g. Factory Expansion 2025" value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createProject()} autoFocus />
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowNewModal(false)}>Cancel</button>
              <button className="modal-confirm" onClick={createProject}>Create Project →</button>
            </div>
          </div>
        </div>
      )}
    </CurrencyContext.Provider>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin, onSignup, onForgot, onBack }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (!email.includes("@")) { setError("Please enter a valid email address."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const data = await sb.auth.signIn({ email, password });
    setLoading(false);
    if (data.error || !data.access_token) {
      setError(data.error?.message || data.msg || "Invalid email or password.");
      return;
    }
    const user = await sb.auth.getUser(data.access_token);
    onLogin({ access_token: data.access_token, user: { id: user.id, email: user.email, name: user.user_metadata?.full_name || user.email.split('@')[0] } });
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    sb.auth.signInWithGoogle();
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">Capital<span>IQ</span></div>
          <div className="auth-tagline">Your investments.<br /><em>Analysed properly.</em></div>
          <div className="auth-sub">Professional DCF valuation and scenario analysis for businesses that make serious investment decisions.</div>
          <div className="auth-features">
            {[
              { icon: "📊", title: "Save unlimited projects", desc: "All your investment analyses in one place" },
              { icon: "🔄", title: "Sync across devices",     desc: "Access from laptop, phone or tablet" },
              { icon: "👥", title: "Share with your team",    desc: "Collaborate on investment decisions together" },
              { icon: "📄", title: "Export PDF reports",      desc: "Board-ready reports in one click" },
            ].map(f => (
              <div className="auth-feature" key={f.title}>
                <div className="auth-feature-icon">{f.icon}</div>
                <div className="auth-feature-text"><strong>{f.title}</strong> — {f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-logo"><div className="auth-form-logo-dot" />Capital<span>IQ</span></div>
        <div className="auth-title">Welcome back</div>
        <div className="auth-title-sub">Sign in to your account to continue</div>

        {error && <div className="auth-error">⚠ {error}</div>}

        {/* Google */}
        <button onClick={handleGoogle} disabled={googleLoading}
          style={{ width:"100%", padding:"11px", border:"1.5px solid var(--border)", borderRadius:8, background:"#fff", fontFamily:"var(--sans)", fontSize:14, fontWeight:500, cursor:"pointer", color:"var(--ink)", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16, transition:"all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor="var(--ink)"}
          onMouseLeave={e => e.currentTarget.style.borderColor="var(--border)"}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <div className="auth-divider"><span className="auth-divider-text">or sign in with email</span></div>

        <div className="auth-field">
          <label>Email address</label>
          <input className={`auth-input ${error && !email ? "error" : ""}`} type="email" placeholder="you@company.com"
            value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>

        <div className="auth-field">
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <label style={{ margin:0 }}>Password</label>
            <span onClick={onForgot} style={{ fontSize:12, color:"var(--emerald)", cursor:"pointer", fontWeight:600 }}>Forgot password?</span>
          </div>
          <div className="auth-password-wrap">
            <input className="auth-input" type={showPw ? "text" : "password"} placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} style={{ paddingRight:40 }} />
            <button className="auth-password-toggle" onClick={() => setShowPw(p => !p)}>{showPw ? "Hide" : "Show"}</button>
          </div>
        </div>

        <button className={`auth-btn ${loading ? "loading" : ""}`} onClick={handleSubmit} disabled={loading}>
          {loading ? "" : "Sign in →"}
        </button>

        <div className="auth-switch">Don't have an account? <a onClick={onSignup}>Create one free →</a></div>
        <div className="auth-switch" style={{ marginTop:8 }}><a onClick={onBack} style={{ color:"var(--ink3)" }}>← Back to home</a></div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SIGNUP PAGE
══════════════════════════════════════════════════════════════════════ */
function SignupPage({ onLogin, onSignin, onBack }) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "var(--red)", "var(--gold)", "var(--emerald)", "var(--emerald)"];

  const handleSubmit = async () => {
    setError("");
    if (!name.trim())         { setError("Please enter your name."); return; }
    if (!email.includes("@")) { setError("Please enter a valid email address."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    setLoading(true);
    const data = await sb.auth.signUp({ email, password, name: name.trim() });
    setLoading(false);
    if (data.error) { setError(data.error.message || "Sign up failed. Please try again."); return; }
    if (data.access_token) {
      const user = await sb.auth.getUser(data.access_token);
      onLogin({ access_token: data.access_token, user: { id: user.id, email: user.email, name: name.trim() } });
    } else {
      setSuccess(true);
    }
  };

  const handleGoogle = () => { setGoogleLoading(true); sb.auth.signInWithGoogle(); };

  if (success) return (
    <div className="auth-wrap" style={{ justifyContent:"center" }}>
      <div className="auth-right" style={{ width:"100%", maxWidth:480 }}>
        <div className="auth-form-logo"><div className="auth-form-logo-dot" />Capital<span>IQ</span></div>
        <div className="auth-success">✓ Check your email! We sent a confirmation link to <strong>{email}</strong>.</div>
        <button className="auth-btn" onClick={onSignin} style={{ marginTop:16 }}>Back to sign in →</button>
      </div>
    </div>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">Capital<span>IQ</span></div>
          <div className="auth-tagline">Start making<br /><em>smarter decisions</em><br />today.</div>
          <div className="auth-sub">Join businesses who use CapitalIQ to analyse investments, reduce risk, and grow with confidence.</div>
          <div className="auth-features">
            {[
              { icon: "🆓", title: "Free to start",         desc: "No credit card required" },
              { icon: "⚡", title: "Ready in 60 seconds",   desc: "Run your first analysis immediately" },
              { icon: "🔒", title: "Bank-grade security",   desc: "Your data is encrypted and never shared" },
              { icon: "📈", title: "Proven methodology",    desc: "Goldman Sachs-standard DCF models" },
            ].map(f => (
              <div className="auth-feature" key={f.title}>
                <div className="auth-feature-icon">{f.icon}</div>
                <div className="auth-feature-text"><strong>{f.title}</strong> — {f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-logo"><div className="auth-form-logo-dot" />Capital<span>IQ</span></div>
        <div className="auth-title">Create your account</div>
        <div className="auth-title-sub">Free forever on your first project</div>
        {error && <div className="auth-error">⚠ {error}</div>}

        <button onClick={handleGoogle} disabled={googleLoading}
          style={{ width:"100%", padding:"11px", border:"1.5px solid var(--border)", borderRadius:8, background:"#fff", fontFamily:"var(--sans)", fontSize:14, fontWeight:500, cursor:"pointer", color:"var(--ink)", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16, transition:"all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor="var(--ink)"}
          onMouseLeave={e => e.currentTarget.style.borderColor="var(--border)"}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {googleLoading ? "Redirecting..." : "Sign up with Google"}
        </button>

        <div className="auth-divider"><span className="auth-divider-text">or sign up with email</span></div>

        <div className="auth-field">
          <label>Full name</label>
          <input className="auth-input" type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="auth-field">
          <label>Work email</label>
          <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="auth-field">
          <label>Password</label>
          <div className="auth-password-wrap">
            <input className="auth-input" type={showPw ? "text" : "password"} placeholder="Min. 6 characters"
              value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight:40 }} />
            <button className="auth-password-toggle" onClick={() => setShowPw(p => !p)}>{showPw ? "Hide" : "Show"}</button>
          </div>
          {password.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
              <div style={{ flex:1, height:3, borderRadius:99, background:"var(--border)", overflow:"hidden" }}>
                <div style={{ width:`${(strength/4)*100}%`, height:"100%", background: strengthColor[strength], borderRadius:99, transition:"all 0.3s" }} />
              </div>
              <span style={{ fontSize:11, color: strengthColor[strength], fontWeight:600 }}>{strengthLabel[strength]}</span>
            </div>
          )}
        </div>
        <div className="auth-field">
          <label>Confirm password</label>
          <input className={`auth-input ${confirm && confirm !== password ? "error" : ""}`}
            type={showPw ? "text" : "password"} placeholder="Repeat password"
            value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          {confirm && confirm !== password && <div style={{ fontSize:11, color:"var(--red)", marginTop:4 }}>Passwords don't match</div>}
        </div>

        <button className={`auth-btn ${loading ? "loading" : ""}`} onClick={handleSubmit} disabled={loading}>
          {loading ? "" : "Create free account →"}
        </button>
        <div className="auth-terms">By signing up you agree to our <a>Terms of Service</a> and <a>Privacy Policy</a></div>
        <div className="auth-switch">Already have an account? <a onClick={onSignin}>Sign in →</a></div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   FORGOT PASSWORD PAGE
══════════════════════════════════════════════════════════════════════ */
function ForgotPage({ onBack }) {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async () => {
    if (!email.includes("@")) { setError("Please enter a valid email."); return; }
    setLoading(true);
    await sb.auth.resetPassword(email);
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">Capital<span>IQ</span></div>
          <div className="auth-tagline">We'll get you<br /><em>back in</em><br />quickly.</div>
          <div className="auth-sub">Enter your email and we'll send a secure reset link. Takes less than a minute.</div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-logo"><div className="auth-form-logo-dot" />Capital<span>IQ</span></div>
        <div className="auth-title">Reset password</div>
        <div className="auth-title-sub">We'll email you a reset link</div>
        {sent ? (
          <>
            <div className="auth-success">✓ Reset link sent! Check your inbox and spam folder.</div>
            <button className="auth-btn" onClick={onBack} style={{ marginTop:16 }}>Back to sign in →</button>
          </>
        ) : (
          <>
            {error && <div className="auth-error">⚠ {error}</div>}
            <div className="auth-field">
              <label>Email address</label>
              <input className="auth-input" type="email" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} autoFocus />
            </div>
            <button className={`auth-btn ${loading ? "loading" : ""}`} onClick={handleSubmit} disabled={loading}>
              {loading ? "" : "Send reset link →"}
            </button>
            <div className="auth-switch"><a onClick={onBack}>← Back to sign in</a></div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PROJECTS DASHBOARD
══════════════════════════════════════════════════════════════════════ */
function Dashboard({ session, projects, loading, onOpen, onDelete, onLogout, onNew, currencyCode, setCurrencyCode }) {
  const { fmtK } = useFmt();
  const user     = session?.user || {};
  const initials = user.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) || "U";
  const totalValue = projects.reduce((s,p) => s + (p.finalValue||0), 0);
  const avgIrr     = projects.length ? projects.reduce((s,p) => s + (p.irr||0), 0) / projects.length : 0;
  const profitable = projects.filter(p => p.npv > 0).length;

  return (
    <div className="dash-wrap">
      <div className="dash-topbar">
        <div className="dash-logo">Capital<span>IQ</span></div>
        <div className="dash-user">
          <select value={currencyCode} onChange={e => setCurrencyCode(e.target.value)}
            style={{ background:"var(--cream)", border:"1px solid var(--border)", borderRadius:6, padding:"5px 8px", fontSize:12, fontWeight:600, color:"var(--emerald)", fontFamily:"var(--sans)", cursor:"pointer", outline:"none" }}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
          </select>
          <div className="dash-avatar">{initials}</div>
          <div className="dash-user-name">{user.name || user.email}</div>
          <button className="dash-logout" onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <div className="dash-body">
        <div className="dash-header">
          <div>
            <div className="dash-greeting">Good day, {user.name?.split(" ")[0] || "there"} 👋</div>
            <div className="dash-greeting-sub">{loading ? "Loading your projects..." : `You have ${projects.length} investment ${projects.length === 1 ? "project" : "projects"}`}</div>
          </div>
          <button className="dash-new-btn" onClick={onNew}>+ New Project</button>
        </div>

        <div className="dash-stats">
          {[
            { label: "Total Projects",    value: projects.length,          cls: "",      suffix: "" },
            { label: "Combined Value",    value: fmtK(totalValue),         cls: "green", suffix: "" },
            { label: "Profitable",        value: `${profitable}/${projects.length}`, cls: "green", suffix: "" },
            { label: "Avg IRR",           value: pct(avgIrr),              cls: "",      suffix: "" },
          ].map(s => (
            <div className="dash-stat" key={s.label}>
              <div className="dash-stat-label">{s.label}</div>
              <div className={`dash-stat-value ${s.cls}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="dash-section-title">Your Projects</div>
        <div className="projects-grid">
          {projects.map(p => (
            <div className="project-card" key={p.id} onClick={() => onOpen(p)}>
              <div className="project-card-name">{p.name}</div>
              <div className="project-card-date">Last edited {p.date}</div>
              <div className="project-card-kpis">
                <div className="project-card-kpi">
                  <div className="project-card-kpi-val" style={{ color: p.npv >= 0 ? "var(--emerald)" : "var(--red)" }}>{fmtK(p.npv)}</div>
                  <div className="project-card-kpi-lbl">NPV</div>
                </div>
                <div className="project-card-kpi">
                  <div className="project-card-kpi-val">{pct(p.irr)}</div>
                  <div className="project-card-kpi-lbl">IRR</div>
                </div>
                <div className="project-card-kpi">
                  <div className="project-card-kpi-val">{fmtK(p.finalValue)}</div>
                  <div className="project-card-kpi-lbl">Final Value</div>
                </div>
                <div className="project-card-kpi">
                  <div className="project-card-kpi-val" style={{ color: p.npv >= 0 ? "var(--emerald)" : "var(--red)" }}>{p.npv >= 0 ? "✓ Go" : "✗ Review"}</div>
                  <div className="project-card-kpi-lbl">Decision</div>
                </div>
              </div>
              <div className="project-card-footer">
                <span className={`project-card-tag ${p.status === "active" ? "tag-active" : "tag-draft"}`}>{p.status}</span>
                <div className="project-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="project-action-btn" onClick={() => onOpen(p)}>Open</button>
                  <button className="project-action-btn del" onClick={() => onDelete(p.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}

          <div className="project-new-card" onClick={onNew}>
            <div className="project-new-icon">＋</div>
            <div className="project-new-text">New Project</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════════════════════ */
function LandingPage({ onLaunch }) {
  const demoInputs = { principal: 10000, monthly: 500, rate: 7, years: 20, compound: "monthly", inflation: 2, wacc: 10 };
  const { totals, schedule } = useMemo(() => calcSchedule(demoInputs), []);

  return (
    <div>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">Capital<span>IQ</span></div>
        <div className="nav-links">
          <span className="nav-link" onClick={() => document.getElementById("features")?.scrollIntoView({behavior:"smooth"})}>Features</span>
          <span className="nav-link">Docs</span>
          <span className="nav-link">Blog</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="nav-cta" style={{ background:"transparent", color:"var(--ink)", border:"1.5px solid var(--border)" }} onClick={onLaunch}>Sign in</button>
          <button className="nav-cta" onClick={onLaunch}>Get started free →</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: "var(--cream)" }}>
        <div className="hero">
          <div className="hero-left fade-up">
            <div className="hero-eyebrow">Investment Analysis Platform</div>
            <h1 className="hero-h1">
              Make better investments.<br />
              <em>In minutes, not days.</em>
            </h1>
            <p className="hero-sub">
              Professional DCF valuation, Monte Carlo simulation and scenario analysis — built for SMEs who need Goldman Sachs-quality decisions without the Goldman Sachs price tag.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={onLaunch}>
                Create free account →
              </button>
              <button className="btn-secondary" onClick={onLaunch}>⚡ Try demo instantly</button>
            </div>
            <div className="hero-proof">
              <div className="hero-stars">★★★★★</div>
              <div className="hero-proof-text">
                <strong>4.9/5</strong> from 200+ businesses · No credit card required
              </div>
            </div>
          </div>

          <div className="hero-right fade-up fade-up-1">
            <div className="hero-card">
              <div className="hcard-header">
                <span className="hcard-title">New Factory Investment — Base Case</span>
                <div className="hcard-dots">
                  <div className="hcard-dot" style={{ background: "#ef4444" }} />
                  <div className="hcard-dot" style={{ background: "#f59e0b" }} />
                  <div className="hcard-dot" style={{ background: "#22c55e" }} />
                </div>
              </div>
              <div className="hcard-body">
                <div className="hcard-label">Final Portfolio Value</div>
                <div className="hcard-value">
                  <AnimatedNum target={totals.finalBalance} />
                </div>
                <div className="hcard-stats">
                  {[
                    { label: "NPV", value: fmtK(totals.npv), color: totals.npv >= 0 ? "var(--emerald)" : "var(--red)" },
                    { label: "IRR", value: totals.irr ? pct(totals.irr*100) : "N/A", color: "var(--ink)" },
                    { label: "ROI", value: pct(totals.roi), color: "var(--emerald)" },
                    { label: "Payback", value: totals.payback >= 0 ? `${totals.payback+1} yrs` : ">10y", color: "var(--ink)" },
                  ].map(s => (
                    <div className="hcard-stat" key={s.label}>
                      <div className="hcard-stat-val" style={{ color: s.color }}>{s.value}</div>
                      <div className="hcard-stat-lbl">{s.label}</div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={90}>
                  <AreaChart data={schedule} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gHero" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0d7a55" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0d7a55" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="balance" stroke="#0d7a55" fill="url(#gHero)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: 11, color: "var(--ink3)" }}>Live calculation · Updates as you type</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="section" style={{ background: "var(--cream2)" }}>
        <div className="section-inner">
          <div className="section-label">The Problem</div>
          <h2 className="section-h2">Investment analysis is <em>broken</em> for SMEs</h2>
          <p className="section-sub">Most small businesses make €500,000+ investment decisions with a gut feeling and a basic spreadsheet.</p>
          <div className="problem-grid">
            {[
              { icon: "💸", title: "Enterprise tools cost a fortune", text: "Invest for Excel charges €400–900 per license. Bloomberg Terminal is €25,000/year. Built for banks, priced for banks." },
              { icon: "😵", title: "Excel models are error-prone", text: "88% of spreadsheets contain errors. One wrong formula in a CAPEX model and you approve a project that loses money." },
              { icon: "⏳", title: "Consultants take weeks", text: "Hiring an analyst to build a DCF model takes 2–4 weeks and costs €5,000–20,000. Decisions can't wait that long." },
            ].map(p => (
              <div className="problem-card" key={p.title}>
                <div className="problem-icon">{p.icon}</div>
                <div className="problem-title">{p.title}</div>
                <div className="problem-text">{p.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-bg" id="features">
        <div className="section-inner">
          <div className="section-label">What You Get</div>
          <h2 className="section-h2">Everything a finance team has.<br /><em>Without the finance team.</em></h2>
          <p className="section-sub" style={{ color: "#9ca3b8" }}>Every feature modelled on professional investment appraisal methodology — accessible to anyone.</p>
          <div className="features-grid">
            {[
              { n: "01", title: "DCF Valuation", text: "Full discounted cash flow with NPV, IRR, MIRR, Payback Period and Profitability Index. The same methodology used by investment banks.", tag: "Core" },
              { n: "02", title: "Scenario Manager", text: "Switch between Base, Bull, Bear and Stress Test scenarios with one click. See exactly how your investment performs when things go wrong.", tag: "Scenarios" },
              { n: "03", title: "Monte Carlo", text: "Run 1,000 simulations with randomised inputs. Know the probability your investment hits €1M. Quantify risk properly.", tag: "Pro" },
              { n: "04", title: "Sensitivity Analysis", text: "Heat map tables and tornado charts showing which variables matter most. WACC sensitivity, revenue sensitivity, CAPEX overrun impact.", tag: "Analysis" },
              { n: "05", title: "3-Statement Model", text: "Income Statement, Cash Flow, and Balance Sheet all linked and auto-calculated. Professional financial modelling, zero manual work.", tag: "Pro" },
              { n: "06", title: "Export to Excel & PDF", text: "One-click export to a fully formatted Excel file or a board-ready PDF report. Industry-standard colour coding included.", tag: "Export" },
            ].map(f => (
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

      {/* CTA */}
      <div className="cta-banner">
        <h2>Start your first analysis today</h2>
        <p>Free forever on your first project. No credit card required.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <button className="btn-cta-white" onClick={onLaunch}>
            Create free account →
          </button>
          <button onClick={onLaunch} style={{ padding:"16px 28px", borderRadius:8, fontSize:15, fontWeight:600, cursor:"pointer", border:"2px solid rgba(255,255,255,0.4)", background:"transparent", color:"#fff", fontFamily:"var(--sans)", transition:"all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.8)"}
            onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.4)"}>
            ⚡ Try demo — no sign up
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-logo">Capital<span>IQ</span></div>
              <div className="footer-tagline">Professional investment analysis for businesses that mean business.</div>
            </div>
            <div style={{ display: "flex", gap: 48 }}>
              {[
                { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
                { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
                { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
              ].map(col => (
                <div className="footer-links" key={col.title}>
                  <h4>{col.title}</h4>
                  {col.links.map(l => <a key={l}>{l}</a>)}
                </div>
              ))}
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2025 CapitalIQ. All rights reserved.</div>
            <div className="footer-copy">Made for SMEs who think big.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   FINANCIAL RATIOS TAB
══════════════════════════════════════════════════════════════════════ */
function RatiosTab({ inputs, totals, schedule }) {
  const { fmtK, symbol } = useFmt();

  // Derive approximate financials from inputs & schedule
  const lastYr   = schedule[schedule.length - 1] || {};
  const midYr    = schedule[Math.floor(schedule.length / 2)] || lastYr;
  const revenue  = lastYr.balance   * 0.18 || 0;   // approx revenue as % of portfolio
  const cogs     = revenue * 0.55;
  const grossP   = revenue - cogs;
  const opex     = revenue * 0.15;
  const ebitda   = grossP - opex;
  const ebit     = ebitda - (lastYr.balance * 0.03 || 0);
  const interest = Number(inputs.principal) * 0.055;
  const ebt      = ebit - interest;
  const tax      = Math.max(0, ebt * (Number(inputs.tax) / 100));
  const netInc   = ebt - tax;
  const totalAssets = lastYr.balance || 1;
  const equity   = totalAssets * 0.55;
  const debt     = totalAssets * 0.45;
  const currAssets = totalAssets * 0.35;
  const currLiab   = totalAssets * 0.20;
  const inventory  = currAssets * 0.30;
  const cash       = currAssets * 0.25;

  const ratioGroups = [
    {
      group: "📈 Profitability Ratios",
      color: "#0d7a55",
      ratios: [
        { name: "Gross Profit Margin",    value: revenue > 0 ? (grossP/revenue)*100 : 0,      fmt: "pct",   bench: "> 40%",  good: grossP/revenue > 0.40 },
        { name: "EBITDA Margin",          value: revenue > 0 ? (ebitda/revenue)*100 : 0,       fmt: "pct",   bench: "> 20%",  good: ebitda/revenue > 0.20 },
        { name: "Net Profit Margin",      value: revenue > 0 ? (netInc/revenue)*100 : 0,       fmt: "pct",   bench: "> 10%",  good: netInc/revenue > 0.10 },
        { name: "Return on Assets (ROA)", value: totalAssets > 0 ? (netInc/totalAssets)*100 : 0, fmt: "pct", bench: "> 5%",   good: netInc/totalAssets > 0.05 },
        { name: "Return on Equity (ROE)", value: equity > 0 ? (netInc/equity)*100 : 0,          fmt: "pct", bench: "> 15%",  good: netInc/equity > 0.15 },
        { name: "Return on Investment",   value: totals.roi,                                     fmt: "pct", bench: "> 20%",  good: totals.roi > 20 },
      ],
    },
    {
      group: "💧 Liquidity Ratios",
      color: "#1565c0",
      ratios: [
        { name: "Current Ratio",          value: currLiab > 0 ? currAssets/currLiab : 0,         fmt: "x",   bench: "> 1.5×", good: currAssets/currLiab > 1.5 },
        { name: "Quick Ratio",            value: currLiab > 0 ? (currAssets-inventory)/currLiab : 0, fmt: "x", bench: "> 1.0×", good: (currAssets-inventory)/currLiab > 1.0 },
        { name: "Cash Ratio",             value: currLiab > 0 ? cash/currLiab : 0,                fmt: "x",   bench: "> 0.5×", good: cash/currLiab > 0.5 },
        { name: "Operating Cash Flow Ratio", value: currLiab > 0 ? (lastYr.fcf||0)/currLiab : 0, fmt: "x",   bench: "> 0.8×", good: (lastYr.fcf||0)/currLiab > 0.8 },
      ],
    },
    {
      group: "⚖️ Leverage / Solvency Ratios",
      color: "#7b1fa2",
      ratios: [
        { name: "Debt-to-Equity",         value: equity > 0 ? debt/equity : 0,                  fmt: "x",   bench: "< 2.0×", good: debt/equity < 2.0 },
        { name: "Debt-to-Assets",         value: totalAssets > 0 ? debt/totalAssets : 0,         fmt: "x",   bench: "< 0.6×", good: debt/totalAssets < 0.6 },
        { name: "Interest Coverage (ICR)",value: interest > 0 ? ebit/interest : 0,               fmt: "x",   bench: "> 3.0×", good: ebit/interest > 3.0 },
        { name: "Debt Service Coverage",  value: interest > 0 ? ebitda/interest : 0,             fmt: "x",   bench: "> 2.0×", good: ebitda/interest > 2.0 },
        { name: "Equity Multiplier",      value: equity > 0 ? totalAssets/equity : 0,            fmt: "x",   bench: "< 3.0×", good: totalAssets/equity < 3.0 },
      ],
    },
    {
      group: "⚙️ Efficiency Ratios",
      color: "#e65100",
      ratios: [
        { name: "Asset Turnover",         value: totalAssets > 0 ? revenue/totalAssets : 0,      fmt: "x",   bench: "> 0.5×", good: revenue/totalAssets > 0.5 },
        { name: "Inventory Turnover",     value: inventory > 0 ? cogs/inventory : 0,             fmt: "x",   bench: "> 4.0×", good: cogs/inventory > 4.0 },
        { name: "Receivables Turnover",   value: revenue > 0 ? revenue/(currAssets*0.4) : 0,     fmt: "x",   bench: "> 6.0×", good: revenue/(currAssets*0.4) > 6.0 },
        { name: "Days Sales Outstanding", value: revenue > 0 ? ((currAssets*0.4)/revenue)*365 : 0, fmt: "days", bench: "< 45 days", good: ((currAssets*0.4)/revenue)*365 < 45 },
        { name: "Capital Employed Return",value: (totalAssets-currLiab) > 0 ? (ebit/(totalAssets-currLiab))*100 : 0, fmt: "pct", bench: "> 12%", good: ebit/(totalAssets-currLiab) > 0.12 },
      ],
    },
    {
      group: "📊 Investment Ratios",
      color: "#c8960c",
      ratios: [
        { name: "NPV",                    value: totals.npv,                                     fmt: "money", bench: "> 0",   good: totals.npv > 0 },
        { name: "IRR",                    value: totals.irr ? totals.irr * 100 : 0,              fmt: "pct",   bench: `> ${inputs.wacc}%`, good: totals.irr > inputs.wacc/100 },
        { name: "Profitability Index",    value: Number(inputs.principal) > 0 ? (totals.npv + Number(inputs.principal)) / Number(inputs.principal) : 0, fmt: "x", bench: "> 1.0×", good: totals.npv > 0 },
        { name: "Payback Period",         value: totals.payback >= 0 ? totals.payback + 1 : 99,  fmt: "yrs",   bench: "< 7 yrs", good: totals.payback >= 0 && totals.payback < 6 },
        { name: "ROI",                    value: totals.roi,                                     fmt: "pct",   bench: "> 0%",  good: totals.roi > 0 },
      ],
    },
  ];

  const fmtVal = (v, fmt) => {
    if (fmt === "pct")   return `${v.toFixed(1)}%`;
    if (fmt === "x")     return `${v.toFixed(2)}×`;
    if (fmt === "days")  return `${v.toFixed(0)} days`;
    if (fmt === "yrs")   return v >= 99 ? ">10 yrs" : `${v.toFixed(0)} yrs`;
    if (fmt === "money") return fmtK(v);
    return v.toFixed(2);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily:"var(--serif)", fontSize:24, color:"var(--ink)", marginBottom:4 }}>Financial Ratios</div>
        <div style={{ fontSize:13, color:"var(--ink3)" }}>Comprehensive ratio analysis derived from your investment parameters · Green = meets benchmark</div>
      </div>

      {ratioGroups.map(group => (
        <div className="acard fade-up" key={group.group} style={{ marginBottom: 16 }}>
          <div className="acard-header">
            <span className="acard-title" style={{ color: group.color }}>{group.group}</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign:"left" }}>Ratio</th>
                <th>Value</th>
                <th>Benchmark</th>
                <th>Status</th>
                <th>Assessment</th>
              </tr>
            </thead>
            <tbody>
              {group.ratios.map(r => (
                <tr key={r.name}>
                  <td style={{ textAlign:"left", fontWeight:500 }}>{r.name}</td>
                  <td style={{ fontWeight:700, color: r.good ? "var(--emerald)" : "var(--red)" }}>
                    {fmtVal(r.value, r.fmt)}
                  </td>
                  <td style={{ color:"var(--ink3)", fontSize:12 }}>{r.bench}</td>
                  <td>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:3, fontSize:11, fontWeight:700,
                      background: r.good ? "var(--emerald-l)" : "#fde8e8",
                      color: r.good ? "var(--emerald)" : "var(--red)" }}>
                      {r.good ? "✓ Good" : "✗ Review"}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:"var(--ink3)" }}>
                    {r.good ? "Within healthy range" : "Below target — consider optimising"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   DUPONT ANALYSIS TAB
══════════════════════════════════════════════════════════════════════ */
function DuPontTab({ inputs, totals, schedule }) {
  const { fmtK } = useFmt();
  const lastYr     = schedule[schedule.length - 1] || {};
  const revenue    = (lastYr.balance || 0) * 0.18;
  const netInc     = revenue * 0.09;
  const totalAssets = lastYr.balance || 1;
  const equity     = totalAssets * 0.55;
  const debt       = totalAssets * 0.45;
  const ebit       = revenue * 0.14;
  const interest   = Number(inputs.principal) * 0.055;
  const ebt        = ebit - interest;
  const tax        = Math.max(0, ebt * (Number(inputs.tax) / 100));

  // 3-Factor DuPont: ROE = Net Profit Margin × Asset Turnover × Equity Multiplier
  const npm   = revenue > 0 ? netInc / revenue : 0;
  const at    = totalAssets > 0 ? revenue / totalAssets : 0;
  const em    = equity > 0 ? totalAssets / equity : 0;
  const roe3  = npm * at * em;

  // 5-Factor DuPont: ROE = Tax Burden × Interest Burden × EBIT Margin × Asset Turnover × Equity Multiplier
  const taxBurden  = ebt !== 0 ? (ebt - tax) / ebt : 0;
  const intBurden  = ebit !== 0 ? ebt / ebit : 0;
  const ebitMargin = revenue > 0 ? ebit / revenue : 0;
  const roe5 = taxBurden * intBurden * ebitMargin * at * em;

  const box = (label, value, fmt, sub, color = "var(--ink)") => (
    <div style={{ background:"var(--cream)", border:"1.5px solid var(--border)", borderRadius:10, padding:"14px 16px", textAlign:"center", minWidth:120 }}>
      <div style={{ fontSize:10, color:"var(--ink3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:5, fontWeight:600 }}>{label}</div>
      <div style={{ fontFamily:"var(--serif)", fontSize:22, color, fontWeight:700 }}>
        {fmt === "pct" ? `${(value*100).toFixed(1)}%` : fmt === "x" ? `${value.toFixed(2)}×` : fmtK(value)}
      </div>
      {sub && <div style={{ fontSize:10, color:"var(--ink3)", marginTop:3 }}>{sub}</div>}
    </div>
  );

  const op = (symbol) => (
    <div style={{ fontSize:22, color:"var(--ink3)", display:"flex", alignItems:"center", padding:"0 8px" }}>{symbol}</div>
  );

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"var(--serif)", fontSize:24, color:"var(--ink)", marginBottom:4 }}>DuPont Analysis</div>
        <div style={{ fontSize:13, color:"var(--ink3)" }}>Decompose Return on Equity into its underlying drivers</div>
      </div>

      {/* 3-Factor */}
      <div className="acard fade-up" style={{ marginBottom:16 }}>
        <div className="acard-header">
          <span className="acard-title">3-Factor DuPont Model</span>
          <span className="acard-sub">ROE = Net Profit Margin × Asset Turnover × Equity Multiplier</span>
        </div>
        <div className="acard-body">
          <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4, marginBottom:20 }}>
            {box("Net Profit Margin", npm, "pct", "Profitability", "var(--emerald)")}
            {op("×")}
            {box("Asset Turnover", at, "x", "Efficiency", "#1565c0")}
            {op("×")}
            {box("Equity Multiplier", em, "x", "Leverage", "#7b1fa2")}
            {op("=")}
            {box("ROE", roe3, "pct", "Return on Equity", "var(--gold)")}
          </div>
          <table className="data-table">
            <thead><tr><th style={{textAlign:"left"}}>Factor</th><th>Value</th><th>Formula</th><th>Driver</th><th>Insight</th></tr></thead>
            <tbody>
              {[
                { factor:"Net Profit Margin", value:`${(npm*100).toFixed(1)}%`, formula:"Net Income ÷ Revenue", driver:"Profitability", insight: npm > 0.10 ? "Strong margin — good cost control" : "Margin below 10% — review pricing or costs" },
                { factor:"Asset Turnover",    value:`${at.toFixed(2)}×`,        formula:"Revenue ÷ Total Assets", driver:"Efficiency", insight: at > 0.5 ? "Efficient use of assets" : "Low asset utilisation — consider optimising asset base" },
                { factor:"Equity Multiplier", value:`${em.toFixed(2)}×`,        formula:"Total Assets ÷ Equity", driver:"Leverage",  insight: em < 3 ? "Conservative leverage" : "High leverage — monitor debt levels" },
                { factor:"ROE (3-Factor)",    value:`${(roe3*100).toFixed(1)}%`, formula:"NPM × AT × EM",         driver:"Combined",  insight: roe3 > 0.15 ? "Strong ROE — value being created" : "ROE below 15% target" },
              ].map(r => (
                <tr key={r.factor}>
                  <td style={{textAlign:"left", fontWeight:500}}>{r.factor}</td>
                  <td style={{fontWeight:700, color:"var(--emerald)"}}>{r.value}</td>
                  <td style={{color:"var(--ink3)", fontSize:12}}>{r.formula}</td>
                  <td><span style={{fontSize:11, padding:"2px 7px", borderRadius:3, background:"var(--cream2)", color:"var(--ink2)", fontWeight:600}}>{r.driver}</span></td>
                  <td style={{fontSize:12, color:"var(--ink2)"}}>{r.insight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5-Factor */}
      <div className="acard fade-up fade-up-1" style={{ marginBottom:16 }}>
        <div className="acard-header">
          <span className="acard-title">5-Factor DuPont Model</span>
          <span className="acard-sub">ROE = Tax Burden × Interest Burden × EBIT Margin × Asset Turnover × Equity Multiplier</span>
        </div>
        <div className="acard-body">
          <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4, marginBottom:20 }}>
            {box("Tax Burden", taxBurden, "x", "(1 - tax rate)", "#c8960c")}
            {op("×")}
            {box("Interest Burden", intBurden, "x", "EBT ÷ EBIT", "#e65100")}
            {op("×")}
            {box("EBIT Margin", ebitMargin, "pct", "Operating margin", "#0d7a55")}
            {op("×")}
            {box("Asset Turnover", at, "x", "Efficiency", "#1565c0")}
            {op("×")}
            {box("Equity Multiplier", em, "x", "Leverage", "#7b1fa2")}
            {op("=")}
            {box("ROE", roe5, "pct", "5-Factor ROE", "var(--gold)")}
          </div>
          <table className="data-table">
            <thead><tr><th style={{textAlign:"left"}}>Factor</th><th>Value</th><th>Formula</th><th>What it measures</th></tr></thead>
            <tbody>
              {[
                { factor:"Tax Burden",       value:`${(taxBurden*100).toFixed(1)}%`, formula:"Net Income ÷ EBT",   what:"How much profit survives after tax" },
                { factor:"Interest Burden",  value:`${(intBurden*100).toFixed(1)}%`, formula:"EBT ÷ EBIT",         what:"How much operating profit survives interest" },
                { factor:"EBIT Margin",      value:`${(ebitMargin*100).toFixed(1)}%`,formula:"EBIT ÷ Revenue",      what:"Core operating profitability" },
                { factor:"Asset Turnover",   value:`${at.toFixed(2)}×`,              formula:"Revenue ÷ Assets",    what:"Revenue generated per unit of asset" },
                { factor:"Equity Multiplier",value:`${em.toFixed(2)}×`,              formula:"Assets ÷ Equity",     what:"Degree of financial leverage" },
                { factor:"ROE (5-Factor)",   value:`${(roe5*100).toFixed(1)}%`,      formula:"All 5 multiplied",    what:"Total return attributable to each factor" },
              ].map(r => (
                <tr key={r.factor}>
                  <td style={{textAlign:"left",fontWeight:500}}>{r.factor}</td>
                  <td style={{fontWeight:700, color:"var(--emerald)"}}>{r.value}</td>
                  <td style={{color:"var(--ink3)",fontSize:12}}>{r.formula}</td>
                  <td style={{fontSize:12,color:"var(--ink2)"}}>{r.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROE Waterfall */}
      <div className="acard fade-up fade-up-2">
        <div className="acard-header"><span className="acard-title">ROE Driver Waterfall</span></div>
        <div className="acard-body">
          <div style={{ fontSize:12, color:"var(--ink3)", marginBottom:12 }}>Each bar shows the contribution of each factor to total ROE</div>
          {[
            { label:"Tax Burden",        contribution: taxBurden,                color:"#c8960c" },
            { label:"× Interest Burden", contribution: taxBurden * intBurden,   color:"#e65100" },
            { label:"× EBIT Margin",     contribution: taxBurden * intBurden * ebitMargin, color:"#0d7a55" },
            { label:"× Asset Turnover",  contribution: taxBurden * intBurden * ebitMargin * at, color:"#1565c0" },
            { label:"× Equity Mult.",    contribution: roe5,                    color:"#7b1fa2" },
          ].map((f, i, arr) => {
            const maxVal = Math.max(...arr.map(x => Math.abs(x.contribution)));
            const w = maxVal > 0 ? (Math.abs(f.contribution) / maxVal) * 100 : 0;
            return (
              <div key={f.label} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <div style={{ width:140, fontSize:11, color:"var(--ink2)", textAlign:"right", fontWeight:500 }}>{f.label}</div>
                <div style={{ flex:1, height:22, background:"var(--cream)", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${w}%`, height:"100%", background:f.color, borderRadius:4, transition:"width 0.6s ease", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:6 }}>
                    {w > 20 && <span style={{ fontSize:10, color:"#fff", fontWeight:700 }}>{(f.contribution*100).toFixed(1)}%</span>}
                  </div>
                </div>
                <div style={{ width:50, fontSize:11, fontWeight:700, color:f.color }}>{(f.contribution*100).toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   INVESTMENT PROPOSAL TAB
══════════════════════════════════════════════════════════════════════ */
function ProposalTab({ inputs, totals, schedule, projectName }) {
  const { fmtK, symbol, code } = useFmt();
  const today = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const good  = totals.npv > 0;
  const lastYr = schedule[schedule.length - 1] || {};

  const sections = [
    {
      title: "Executive Summary",
      content: `This investment proposal analyses the financial viability of "${projectName}". Based on a ${inputs.years}-year projection with an initial investment of ${fmtK(Number(inputs.principal))} and monthly contributions of ${fmtK(Number(inputs.monthly))}, the analysis indicates that the project is ${good ? "financially viable and recommended for approval" : "currently below the required return threshold and requires revision"}.
      
The project generates a Net Present Value (NPV) of ${fmtK(totals.npv)} at a discount rate (WACC) of ${inputs.wacc}%, delivering an Internal Rate of Return (IRR) of ${totals.irr ? `${(totals.irr*100).toFixed(1)}%` : "N/A"}${totals.irr && totals.irr > inputs.wacc/100 ? `, which exceeds the cost of capital by ${((totals.irr - inputs.wacc/100)*100).toFixed(1)} percentage points` : ""}. The final projected portfolio value is ${fmtK(totals.finalBalance)}.`,
    },
    {
      title: "Investment Overview",
      content: null,
      table: [
        { label: "Project Name",            value: projectName },
        { label: "Analysis Date",           value: today },
        { label: "Currency",                value: code },
        { label: "Initial Investment",      value: fmtK(Number(inputs.principal)) },
        { label: "Monthly Contribution",    value: fmtK(Number(inputs.monthly)) },
        { label: "Annual Return Rate",      value: `${inputs.rate}%` },
        { label: "Projection Period",       value: `${inputs.years} years` },
        { label: "Compounding",             value: inputs.compound.charAt(0).toUpperCase() + inputs.compound.slice(1) },
        { label: "Discount Rate (WACC)",    value: `${inputs.wacc}%` },
        { label: "Corporate Tax Rate",      value: `${inputs.tax}%` },
        { label: "Inflation Assumption",    value: `${inputs.inflation}%` },
      ],
    },
    {
      title: "Financial Results",
      content: null,
      table: [
        { label: "Final Portfolio Value",   value: fmtK(totals.finalBalance),   highlight: true },
        { label: "Total Capital Invested",  value: fmtK(totals.totalContrib) },
        { label: "Total Interest Earned",   value: fmtK(totals.totalInterest) },
        { label: "Inflation-Adjusted Value",value: fmtK(totals.inflationAdj) },
        { label: "Net Present Value (NPV)", value: fmtK(totals.npv),            highlight: true },
        { label: "IRR",                     value: totals.irr ? `${(totals.irr*100).toFixed(2)}%` : "N/A", highlight: true },
        { label: "Return on Investment",    value: `${totals.roi.toFixed(1)}%` },
        { label: "Payback Period",          value: totals.payback >= 0 ? `${totals.payback+1} years` : ">10 years" },
        { label: "Profitability Index",     value: Number(inputs.principal) > 0 ? ((totals.npv + Number(inputs.principal)) / Number(inputs.principal)).toFixed(2) + "×" : "N/A" },
      ],
    },
    {
      title: "Risk Assessment",
      content: `The following risk factors have been identified for this investment:

• Interest Rate Risk: A 1% increase in WACC would reduce NPV by approximately ${fmtK(Math.abs((totals.npv * 0.08)))}.
• Market Risk: The assumed annual return of ${inputs.rate}% is subject to market volatility. A Bear scenario (${Number(inputs.rate)-3}% return) would significantly alter outcomes.
• Inflation Risk: At ${inputs.inflation}% annual inflation, the inflation-adjusted value is ${fmtK(totals.inflationAdj)}, representing a real-terms reduction of ${fmtK(totals.finalBalance - totals.inflationAdj)}.
• Liquidity Risk: Monthly contributions of ${fmtK(Number(inputs.monthly))} represent an ongoing cash commitment over ${inputs.years} years.`,
    },
    {
      title: "Recommendation",
      content: good
        ? `Based on the analysis, this investment is RECOMMENDED FOR APPROVAL. The project demonstrates a positive NPV of ${fmtK(totals.npv)}, indicating value creation above the cost of capital. The IRR of ${totals.irr ? `${(totals.irr*100).toFixed(1)}%` : "N/A"} provides a ${totals.irr && totals.irr > inputs.wacc/100 ? Math.abs(((totals.irr - inputs.wacc/100)*100)).toFixed(1) + "% buffer" : "margin"} above the required return.

Decision: ✅ PROCEED WITH INVESTMENT`
        : `Based on the analysis, this investment REQUIRES REVISION before approval. The project's current NPV of ${fmtK(totals.npv)} indicates it does not meet the minimum return threshold at the current WACC of ${inputs.wacc}%.

Recommended actions: (1) Review cost structure to improve margins; (2) Negotiate better financing terms to reduce WACC; (3) Explore revenue enhancement opportunities; (4) Consider extending the investment horizon.

Decision: ⚠️ REVISE AND RESUBMIT`,
    },
  ];

  return (
    <div>
      {/* Report header */}
      <div className="acard fade-up" style={{ marginBottom:16 }}>
        <div style={{ background:"var(--ink)", padding:"28px 28px 24px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:"var(--serif)", fontSize:11, color:"#7dd3b0", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:8 }}>Investment Proposal</div>
            <div style={{ fontFamily:"var(--serif)", fontSize:26, color:"#fff", marginBottom:4 }}>{projectName}</div>
            <div style={{ fontSize:12, color:"#9ca3b8" }}>Prepared by CapitalIQ · {today}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background: good ? "rgba(13,122,85,0.2)" : "rgba(192,57,43,0.2)", padding:"8px 16px", borderRadius:6, border: `1px solid ${good ? "#0d7a55" : "#c0392b"}` }}>
              <span style={{ fontSize:18 }}>{good ? "✅" : "⚠️"}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color: good ? "#7dd3b0" : "#f87171" }}>{good ? "RECOMMENDED" : "NEEDS REVISION"}</div>
                <div style={{ fontSize:10, color:"#9ca3b8" }}>NPV: {fmtK(totals.npv)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key metrics strip */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", borderTop:"1px solid var(--border)" }}>
          {[
            { label:"Final Value",  value: fmtK(totals.finalBalance), color:"var(--emerald)" },
            { label:"NPV",          value: fmtK(totals.npv),          color: good ? "var(--emerald)" : "var(--red)" },
            { label:"IRR",          value: totals.irr ? `${(totals.irr*100).toFixed(1)}%` : "N/A", color:"var(--ink)" },
            { label:"Payback",      value: totals.payback >= 0 ? `${totals.payback+1} yrs` : ">10y", color:"var(--ink)" },
          ].map((k,i) => (
            <div key={k.label} style={{ padding:"16px 20px", borderRight: i<3 ? "1px solid var(--border)" : "none" }}>
              <div style={{ fontSize:10, color:"var(--ink3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:4, fontWeight:600 }}>{k.label}</div>
              <div style={{ fontFamily:"var(--serif)", fontSize:20, color:k.color, fontWeight:700 }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Report sections */}
      {sections.map((sec, i) => (
        <div className="acard fade-up" key={sec.title} style={{ marginBottom:12, animationDelay:`${i*0.06}s` }}>
          <div className="acard-header">
            <span style={{ fontSize:11, color:"var(--ink3)", fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase" }}>
              {String(i+1).padStart(2,"0")} — {sec.title}
            </span>
          </div>
          <div className="acard-body">
            {sec.content && (
              <div style={{ fontSize:13, color:"var(--ink2)", lineHeight:1.7, whiteSpace:"pre-line" }}>{sec.content}</div>
            )}
            {sec.table && (
              <table className="data-table">
                <tbody>
                  {sec.table.map(r => (
                    <tr key={r.label} style={{ background: r.highlight ? "var(--emerald-l)" : "transparent" }}>
                      <td style={{ textAlign:"left", fontWeight:500, color: r.highlight ? "var(--emerald)" : "var(--ink2)", width:"50%" }}>{r.label}</td>
                      <td style={{ fontWeight: r.highlight ? 700 : 400, color: r.highlight ? "var(--emerald)" : "var(--ink)" }}>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ))}

      {/* Print hint */}
      <div style={{ textAlign:"center", padding:"20px 0", fontSize:12, color:"var(--ink3)" }}>
        💡 To save as PDF: press <strong>Cmd+P</strong> (Mac) or <strong>Ctrl+P</strong> (Windows) → "Save as PDF"
      </div>
    </div>
  );
}

const SCENARIO_PRESETS = {
  Base:   { rate: 7,  monthly: 500,  wacc: 10, principal: 10000, years: 20 },
  Bull:   { rate: 11, monthly: 750,  wacc: 8,  principal: 15000, years: 25 },
  Bear:   { rate: 4,  monthly: 250,  wacc: 13, principal: 5000,  years: 15 },
  Stress: { rate: 1.5,monthly: 100, wacc: 16, principal: 2000,  years: 10 },
};

function AppScreen({ onBack, currencyCode, setCurrencyCode, project, onSave }) {
  const { symbol } = useCurrency();
  const [appTab, setAppTab]     = useState("calculator");
  const [scenario, setScenario] = useState("Base");
  const [saved, setSaved]       = useState(false);
  const [projectName, setProjectName] = useState(project?.name || "New Investment Project");
  const [inputs, setInputs] = useState(project?.inputs || {
    principal: 10000, monthly: 500, rate: 7, years: 20,
    compound: "monthly", inflation: 2, wacc: 10, tax: 21,
  });

  const setI = (k, v) => { setInputs(p => ({ ...p, [k]: v })); setSaved(false); };

  const applyScenario = (s) => {
    setScenario(s);
    setInputs(p => ({ ...p, ...SCENARIO_PRESETS[s] }));
    setSaved(false);
  };

  const handleSave = () => {
    if (project && onSave) {
      onSave(project.id, inputs, totals);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const { schedule, totals } = useMemo(() => calcSchedule(inputs), [inputs]);

  const TABS = [
    { id: "calculator",  label: "Calculator" },
    { id: "scenarios",   label: "Scenarios" },
    { id: "dcf",         label: "DCF / IRR" },
    { id: "ratios",      label: "Fin. Ratios" },
    { id: "dupont",      label: "DuPont" },
    { id: "schedule",    label: "Schedule" },
    { id: "sensitivity", label: "Sensitivity" },
    { id: "charts",      label: "Charts" },
    { id: "proposal",    label: "Proposal" },
  ];

  return (
    <div className="app-screen">
      <div className="app-topbar">
        <div style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }} onClick={onBack}>
          <span style={{ fontSize:18, color:"var(--ink3)" }}>←</span>
          <div className="app-logo">Capital<span>IQ</span></div>
        </div>
        <input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          style={{ background:"var(--cream)", border:"1px solid var(--border)", borderRadius:6, padding:"6px 12px", fontSize:14, color:"var(--ink)", outline:"none", flex:1, maxWidth:320 }}
        />
        <select value={currencyCode} onChange={e => setCurrencyCode(e.target.value)}
          style={{ background:"var(--cream)", border:"1px solid var(--border)", borderRadius:6, padding:"7px 10px", fontSize:13, fontWeight:600, color:"var(--emerald)", fontFamily:"var(--sans)", cursor:"pointer", outline:"none", minWidth:90 }}>
          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
        </select>
        <button onClick={handleSave}
          style={{ padding:"7px 16px", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"var(--sans)", border:"none", transition:"all 0.15s",
            background: saved ? "var(--emerald-l)" : "var(--emerald)",
            color: saved ? "var(--emerald)" : "#fff" }}>
          {saved ? "✓ Saved" : "Save"}
        </button>
        <button onClick={() => {
            // Switch to proposal tab for best print output, then print
            setAppTab("proposal");
            setTimeout(() => window.print(), 300);
          }}
          style={{ padding:"7px 16px", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"var(--sans)", border:"1px solid var(--border)", background:"var(--cream)", color:"var(--ink)", transition:"all 0.15s", display:"flex", alignItems:"center", gap:6 }}
          title="Export as PDF">
          📄 PDF
        </button>
        <button className="nav-cta" style={{ fontSize:12, padding:"7px 14px", background:"var(--ink2)" }}>↓ Excel</button>
      </div>

      <div className="app-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`app-tab ${appTab===t.id?"active":""}`} onClick={() => setAppTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="app-body">
        {/* Print-only header */}
        <div className="print-header" style={{ marginBottom:16, paddingBottom:12, borderBottom:"2px solid #0d7a55" }}>
          <div style={{ fontFamily:"var(--serif)", fontSize:22, color:"#0f1117" }}>CapitalIQ — Investment Report</div>
          <div style={{ fontSize:13, color:"#8a8fa8", marginTop:4 }}>{projectName} · {new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
        </div>
        {appTab === "calculator"  && <CalcTab    inputs={inputs} setI={setI} totals={totals} schedule={schedule} />}
        {appTab === "scenarios"   && <ScenTab    inputs={inputs} applyScenario={applyScenario} scenario={scenario} />}
        {appTab === "dcf"         && <DCFTab2    totals={totals} schedule={schedule} inputs={inputs} />}
        {appTab === "ratios"      && <RatiosTab  inputs={inputs} totals={totals} schedule={schedule} />}
        {appTab === "dupont"      && <DuPontTab  inputs={inputs} totals={totals} schedule={schedule} />}
        {appTab === "schedule"    && <SchedTab2  schedule={schedule} />}
        {appTab === "sensitivity" && <SensTab2   inputs={inputs} />}
        {appTab === "charts"      && <ChartsTab2 schedule={schedule} />}
        {appTab === "proposal"    && <ProposalTab inputs={inputs} totals={totals} schedule={schedule} projectName={projectName} />}
      </div>
    </div>
  );
}

/* ── Calculator Tab ──────────────────────────────────────────────────── */
function CalcTab({ inputs, setI, totals, schedule }) {
  const { fmtK, symbol } = useFmt();
  const good = totals.npv > 0;
  return (
    <div>
      <div className="kpi-bar fade-up">
        {[
          { label: "Final Value",  value: fmtK(totals.finalBalance), cls: "gold" },
          { label: "NPV",          value: fmtK(totals.npv),          cls: good ? "green" : "red", badge: good ? "good" : "bad", badgeText: good ? "✓ Creates Value" : "✗ Destroys Value" },
          { label: "IRR",          value: totals.irr ? pct(totals.irr*100) : "N/A", cls: totals.irr > inputs.wacc/100 ? "green" : "red" },
          { label: "ROI",          value: pct(totals.roi),           cls: totals.roi > 0 ? "green" : "red" },
        ].map(k => (
          <div className="kpi-box" key={k.label}>
            <div className="kpi-box-label">{k.label}</div>
            <div className={`kpi-box-value ${k.cls}`}>{k.value}</div>
            {k.badge && <div className={`kpi-badge ${k.badge}`}>{k.badgeText}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="acard fade-up fade-up-1">
          <div className="acard-header">
            <span className="acard-title">Investment Parameters</span>
            <span className="acard-sub">Blue = inputs</span>
          </div>
          <div className="acard-body">
            <div className="input-grid">
              {[
                { label: "Initial Investment", key: "principal", pre: symbol },
                { label: "Monthly Contribution", key: "monthly", pre: symbol },
                { label: "Annual Return Rate", key: "rate", suf: "%" },
                { label: "Time Horizon", key: "years", suf: "yrs" },
                { label: "Inflation Rate", key: "inflation", suf: "%" },
                { label: "Discount Rate (WACC)", key: "wacc", suf: "%" },
              ].map(f => (
                <div className="input-group" key={f.key}>
                  <label className="input-label">{f.label}</label>
                  <div className="input-row-app">
                    {f.pre && <span className="input-prefix">{f.pre}</span>}
                    <input className="input-field-app" type="number" value={inputs[f.key]}
                      onChange={e => setI(f.key, e.target.value)} inputMode="decimal"
                      style={{ color: "#0000FF" }} />
                    {f.suf && <span className="input-suffix">{f.suf}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <label className="input-label" style={{ display: "block", marginBottom: 5 }}>Compounding Frequency</label>
              <div className="input-row-app">
                <select className="select-app" value={inputs.compound} onChange={e => setI("compound", e.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="acard fade-up fade-up-2">
          <div className="acard-header"><span className="acard-title">Portfolio Growth</span></div>
          <div style={{ padding: "16px 0 8px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={schedule} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBal2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0d7a55" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0d7a55" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gCon2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" />
                <XAxis dataKey="year" tick={{ fill: "#8a8fa8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtK(v)} tick={{ fill: "#8a8fa8", fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="contributions" name="Contributed" stroke="#6366f1" fill="url(#gCon2)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="balance" name="Balance" stroke="#0d7a55" fill="url(#gBal2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ display: "flex", gap: 1, height: 8, borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
              {[
                { value: Number(inputs.principal), color: "#6366f1" },
                { value: totals.totalContrib - Number(inputs.principal), color: "#8b5cf6" },
                { value: totals.totalInterest, color: "#0d7a55" },
              ].map((s, i) => {
                const p = totals.finalBalance > 0 ? (s.value/totals.finalBalance)*100 : 0;
                return <div key={i} style={{ width: `${p}%`, background: s.color }} />;
              })}
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Principal", value: Number(inputs.principal), color: "#6366f1" },
                { label: "Contributions", value: totals.totalContrib - Number(inputs.principal), color: "#8b5cf6" },
                { label: "Interest", value: totals.totalInterest, color: "#0d7a55" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                  <span style={{ fontSize: 11, color: "var(--ink3)" }}>{s.label}: <strong style={{ color: "var(--ink)" }}>{fmtK(s.value)}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Scenarios Tab ─────────────────────────────────────────────────── */
function ScenTab({ inputs, applyScenario, scenario }) {
  const { fmtK } = useFmt();
  const results = Object.entries(SCENARIO_PRESETS).map(([name, overrides]) => {
    const merged = { ...inputs, ...overrides };
    const { totals } = calcSchedule(merged);
    return { name, ...overrides, ...totals };
  });

  return (
    <div>
      <div className="acard fade-up">
        <div className="acard-header">
          <span className="acard-title">Active Scenario</span>
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>Click a scenario to apply its assumptions</span>
        </div>
        <div className="acard-body">
          <div className="scenario-pills">
            {["Base","Bull","Bear","Stress"].map(s => {
              const colors = { Base: "", Bull: "var(--emerald)", Bear: "var(--red)", Stress: "var(--gold)" };
              return (
                <button key={s} className={`scenario-pill ${scenario===s?"active":""}`}
                  onClick={() => applyScenario(s)}
                  style={scenario===s ? {} : { "--hover-color": colors[s] }}>
                  {s === "Bull" ? "🐂" : s === "Bear" ? "🐻" : s === "Stress" ? "⚡" : "📊"} {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="acard fade-up fade-up-1">
        <div className="acard-header"><span className="acard-title">Scenario Comparison</span></div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Return</th>
              <th>Monthly</th>
              <th>WACC</th>
              <th>Years</th>
              <th>Final Value</th>
              <th>NPV</th>
              <th>IRR</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => {
              const isCurrent = r.name === scenario;
              return (
                <tr key={r.name} style={{ background: isCurrent ? "var(--emerald-l)" : "", cursor: "pointer" }}
                  onClick={() => applyScenario(r.name)}>
                  <td style={{ fontWeight: 700, color: isCurrent ? "var(--emerald)" : "var(--ink)" }}>
                    {isCurrent ? "▶ " : ""}{r.name}
                  </td>
                  <td>{pct(r.rate)}</td>
                  <td>{fmtK(r.monthly)}</td>
                  <td>{pct(r.wacc)}</td>
                  <td>{r.years}y</td>
                  <td style={{ fontWeight: 600, color: "var(--emerald)" }}>{fmtK(r.finalBalance)}</td>
                  <td style={{ color: r.npv >= 0 ? "var(--emerald)" : "var(--red)", fontWeight: 600 }}>{fmtK(r.npv)}</td>
                  <td style={{ color: r.irr > 0.1 ? "var(--emerald)" : "var(--ink2)" }}>{r.irr ? pct(r.irr*100) : "N/A"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="acard fade-up fade-up-2">
        <div className="acard-header"><span className="acard-title">Final Value — Scenario Comparison</span></div>
        <div style={{ padding: "16px 0 8px" }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={results} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" />
              <XAxis dataKey="name" tick={{ fill: "#8a8fa8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtK(v)} tick={{ fill: "#8a8fa8", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="finalBalance" name="Final Value" radius={[5,5,0,0]}
                fill="#0d7a55"
                label={{ position: "top", formatter: v => fmtK(v), fontSize: 11, fill: "#3d4152" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ── DCF Tab ─────────────────────────────────────────────────────────── */
function DCFTab2({ totals, schedule, inputs }) {
  const { fmtK } = useFmt();
  const good = totals.npv > 0;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { label: "NPV", value: fmtK(totals.npv), good: totals.npv > 0, sub: totals.npv>0?"Creates value":"Destroys value" },
          { label: "IRR", value: totals.irr ? pct(totals.irr*100) : "N/A", good: totals.irr > inputs.wacc/100, sub: `vs WACC ${inputs.wacc}%` },
          { label: "Payback", value: totals.payback >= 0 ? `${totals.payback+1} yrs` : ">10 yrs", good: totals.payback >= 0 && totals.payback <= 6, sub: "Target < 7 yrs" },
          { label: "Prof. Index", value: totals.npv > 0 ? ((totals.npv + Number(inputs.principal)) / Number(inputs.principal)).toFixed(2)+"×" : "< 1×", good: totals.npv > 0, sub: totals.npv>0?"Value creating":"Revise plan" },
        ].map(k => (
          <div className="kpi-box fade-up" key={k.label}>
            <div className="kpi-box-label">{k.label}</div>
            <div className={`kpi-box-value ${k.good?"green":"red"}`}>{k.value}</div>
            <div className={`kpi-badge ${k.good?"good":"bad"}`}>{k.good?"✓":"✗"} {k.sub}</div>
          </div>
        ))}
      </div>

      <div className="acard fade-up fade-up-1">
        <div className="acard-header">
          <span className="acard-title">DCF Schedule</span>
          <span className="acard-sub">WACC: {inputs.wacc}% · Tax: {inputs.tax}%</span>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Year</th><th>FCF</th><th>Discount Factor</th><th>PV of FCF</th><th>Cumulative NPV</th></tr>
          </thead>
          <tbody>
            {schedule.map(r => {
              const df = 1/Math.pow(1+Number(inputs.wacc)/100, r.year);
              return (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td style={{ color: r.fcf >= 0 ? "var(--emerald)" : "var(--red)" }}>{fmtK(r.fcf)}</td>
                  <td style={{ color: "var(--ink3)" }}>{df.toFixed(4)}</td>
                  <td>{fmtK(Math.round(r.fcf*df))}</td>
                  <td style={{ color: r.cumNPV >= 0 ? "var(--emerald)" : "var(--red)", fontWeight: 600 }}>{fmtK(r.cumNPV)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Schedule Tab ─────────────────────────────────────────────────────── */
function SchedTab2({ schedule }) {
  const { fmtK } = useFmt();
  return (
    <div className="acard fade-up">
      <div className="acard-header">
        <span className="acard-title">Year-by-Year Schedule</span>
        <span className="acard-sub">{schedule.length} projection years</span>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Year</th><th>Balance</th><th>Contributed</th><th>Interest Earned</th><th>Year Growth</th><th>Inflation Adj.</th></tr>
        </thead>
        <tbody>
          {schedule.map(r => (
            <tr key={r.year}>
              <td style={{ color: "var(--emerald)", fontWeight: 700 }}>{r.year}</td>
              <td style={{ fontWeight: 600 }}>{fmtK(r.balance)}</td>
              <td style={{ color: "var(--ink2)" }}>{fmtK(r.contributions)}</td>
              <td style={{ color: "var(--emerald)" }}>+{fmtK(r.interest)}</td>
              <td style={{ color: "var(--emerald)" }}>+{fmtK(r.yearGrowth)}</td>
              <td style={{ color: "var(--ink3)" }}>{fmtK(r.inflationAdj)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Sensitivity Tab ─────────────────────────────────────────────────── */
function SensTab2({ inputs }) {
  const { fmtK, symbol } = useFmt();
  const [sensView, setSensView] = useState("heatmap");
  const [rowV, setRowV] = useState("rate");
  const [colV, setColV] = useState("wacc");

  const varDefs = { rate: "Return %", wacc: "WACC %", years: "Years", monthly: "Monthly $" };
  const getSteps = (k) => {
    const b = Number(inputs[k]);
    if (k==="rate")    return [-3,-2,-1,0,1,2,3].map(d => Math.max(0.5,b+d));
    if (k==="wacc")    return [-3,-2,-1,0,1,2,3].map(d => Math.max(1,b+d));
    if (k==="years")   return [-8,-5,-3,0,3,5,8].map(d => Math.max(1,Math.round(b+d)));
    if (k==="monthly") return [-300,-200,-100,0,100,200,300].map(d => Math.max(0,b+d));
  };
  const fmtS = (k,v) => k==="rate"||k==="wacc" ? `${v}%` : k==="years" ? `${v}y` : `$${v}`;

  const rs = getSteps(rowV), cs = getSteps(colV);
  const calcNPV = (overrides) => {
    const { totals } = calcSchedule({ ...inputs, ...overrides });
    return totals.npv;
  };

  const grid = useMemo(() => rs.map(rv => cs.map(cv => {
    const ov = {};
    ov[rowV] = rv; ov[colV] = cv;
    return calcNPV(ov);
  })), [rowV, colV, inputs]);

  const allV = grid.flat(), minV = Math.min(...allV), maxV = Math.max(...allV);
  const baseNPV = calcNPV({});

  const tornado = Object.keys(varDefs).map(k => {
    const vals = getSteps(k).map(sv => { const ov = {}; ov[k]=sv; return calcNPV(ov); });
    return { key: k, label: varDefs[k], low: Math.min(...vals), high: Math.max(...vals) };
  }).sort((a,b) => (b.high-b.low)-(a.high-a.low));
  const tMax = Math.max(...tornado.map(s => Math.max(Math.abs(s.high-baseNPV), Math.abs(s.low-baseNPV))));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["heatmap","Heat Map"],["tornado","Tornado Chart"],["breakeven","Break-Even"]].map(([id,lbl]) => (
          <button key={id} onClick={() => setSensView(id)}
            style={{ padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: sensView===id ? "var(--emerald)" : "var(--card)",
              color: sensView===id ? "#fff" : "var(--ink2)",
              border: sensView===id ? "1.5px solid var(--emerald)" : "1.5px solid var(--border)",
              fontFamily: "var(--sans)", transition: "all 0.15s" }}>
            {lbl}
          </button>
        ))}
      </div>

      {sensView === "heatmap" && (
        <div className="acard fade-up">
          <div className="acard-header">
            <span className="acard-title">NPV Sensitivity — Heat Map</span>
            <div style={{ display: "flex", gap: 8 }}>
              {[["Row", rowV, setRowV, colV],["Col", colV, setColV, rowV]].map(([lbl, val, setter, excl]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 11, color: "var(--ink3)" }}>{lbl}:</span>
                  <select value={val} onChange={e => { if(e.target.value!==excl) setter(e.target.value); }}
                    style={{ fontSize: 12, border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px", background: "var(--cream)", fontFamily: "var(--sans)" }}>
                    {Object.entries(varDefs).filter(([k]) => k!==excl).map(([k,l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="acard-body">
            <div className="heat-wrap">
              <table className="heat-table">
                <thead>
                  <tr>
                    <th>↓{varDefs[rowV].split(" ")[0]} \ {varDefs[colV].split(" ")[0]}→</th>
                    {cs.map((c,i) => <th key={i}>{fmtS(colV,c)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rs.map((r,ri) => (
                    <tr key={ri}>
                      <th style={{ background: "var(--cream2)", color: "var(--ink2)" }}>{fmtS(rowV,r)}</th>
                      {cs.map((c,ci) => {
                        const val = grid[ri][ci];
                        const isBase = Math.abs(r-Number(inputs[rowV]))<0.01 && Math.abs(c-Number(inputs[colV]))<0.01;
                        const diff = val - baseNPV;
                        return (
                          <td key={ci} style={{ background: heatBg(val,minV,maxV), color: heatColor(val,minV,maxV) }}
                            className={isBase ? "heat-base-cell" : ""}>
                            <div style={{ fontWeight: isBase ? 700 : 400 }}>{fmtK(val)}</div>
                            {!isBase && <div style={{ fontSize: 10, opacity: 0.75 }}>{diff>=0?"+":""}{fmtK(diff)}</div>}
                            {isBase && <div style={{ fontSize: 10, color: "var(--emerald)", fontWeight: 700 }}>◀ BASE</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "var(--ink3)" }}>Low NPV</span>
              {[0,.25,.5,.75,1].map(t => <div key={t} style={{ width: 22, height: 10, borderRadius: 2, background: heatBg(t,0,1) }} />)}
              <span style={{ fontSize: 11, color: "var(--ink3)" }}>High NPV</span>
            </div>
          </div>
        </div>
      )}

      {sensView === "tornado" && (
        <div className="acard fade-up">
          <div className="acard-header">
            <span className="acard-title">Tornado Chart — Impact on NPV</span>
            <span className="acard-sub">Base NPV: {fmtK(baseNPV)}</span>
          </div>
          <div className="acard-body" style={{ paddingTop: 24 }}>
            {tornado.map(s => {
              const lp = tMax > 0 ? ((baseNPV-s.low)/tMax)*45 : 0;
              const hp = tMax > 0 ? ((s.high-baseNPV)/tMax)*45 : 0;
              return (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 120, textAlign: "right", fontSize: 12, color: "var(--ink2)", fontWeight: 500 }}>{s.label}</div>
                  <div style={{ flex: 1, position: "relative", height: 28, display: "flex", alignItems: "center" }}>
                    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--border)" }} />
                    <div style={{ position: "absolute", right: "50%", width: `${lp}%`, height: 18, background: "var(--red)", opacity: 0.7, borderRadius: "3px 0 0 3px" }} />
                    <div style={{ position: "absolute", left: "50%", width: `${hp}%`, height: 18, background: "var(--emerald)", opacity: 0.7, borderRadius: "0 3px 3px 0" }} />
                  </div>
                  <div style={{ width: 140, fontSize: 11, color: "var(--ink2)" }}>
                    <span style={{ color: "var(--red)" }}>{fmtK(s.low-baseNPV)}</span>
                    {" / "}
                    <span style={{ color: "var(--emerald)" }}>+{fmtK(s.high-baseNPV)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sensView === "breakeven" && (() => {
        const { totals: beT } = calcSchedule(inputs);
        const beNPV = beT.npv;
        const beRows = [
          {
            label: "IRR (= Break-even WACC)",
            value: beT.irr != null ? pct(beT.irr * 100) : "N/A",
            note: "If your WACC exceeds this, NPV turns negative",
          },
          {
            label: "Payback Period",
            value: beT.payback >= 0 ? `${beT.payback + 1} years` : "> projection period",
            note: "Years until cumulative FCF recovers the initial investment",
          },
          {
            label: `NPV sensitivity — WACC ±1%`,
            value: (() => {
              const lo = calcSchedule({ ...inputs, wacc: Math.max(0.5, Number(inputs.wacc) - 1) }).totals.npv;
              const hi = calcSchedule({ ...inputs, wacc: Number(inputs.wacc) + 1 }).totals.npv;
              const loD = lo - beNPV, hiD = hi - beNPV;
              return `${loD >= 0 ? "+" : ""}${fmtK(loD)}  /  ${hiD >= 0 ? "+" : ""}${fmtK(hiD)}`;
            })(),
            note: "NPV change when WACC drops 1% (left) or rises 1% (right)",
          },
          {
            label: `NPV sensitivity — Return ±1%`,
            value: (() => {
              const lo = calcSchedule({ ...inputs, rate: Math.max(0.5, Number(inputs.rate) - 1) }).totals.npv;
              const hi = calcSchedule({ ...inputs, rate: Number(inputs.rate) + 1 }).totals.npv;
              const loD = lo - beNPV, hiD = hi - beNPV;
              return `${loD >= 0 ? "+" : ""}${fmtK(loD)}  /  +${fmtK(hiD)}`;
            })(),
            note: "NPV change when return drops 1% (left) or rises 1% (right)",
          },
          {
            label: `Break-even monthly (to reach ${symbol}1M)`,
            value: (() => {
              for (let m = 0; m <= 10000; m += 50) {
                if (calcSchedule({ ...inputs, monthly: m }).totals.finalBalance >= 1_000_000)
                  return fmtK(m) + " /mo";
              }
              return `> ${symbol}10,000 /mo`;
            })(),
            note: "Minimum monthly contribution to hit 1 million by end of horizon",
          },
          {
            label: "Break-even time horizon (NPV = 0)",
            value: (() => {
              for (let y = 1; y <= 50; y++) {
                if (calcSchedule({ ...inputs, years: y }).totals.npv >= 0) return `${y} years`;
              }
              return "> 50 years";
            })(),
            note: "Minimum years needed for this investment to break even on NPV",
          },
          {
            label: "Profitability Index",
            value: Number(inputs.principal) > 0
              ? ((beNPV + Number(inputs.principal)) / Number(inputs.principal)).toFixed(2) + "×"
              : "N/A",
            note: "PI > 1.0 means value is created. PI < 1.0 means value is destroyed.",
          },
        ];
        return (
          <div className="acard fade-up">
            <div className="acard-header">
              <span className="acard-title">Break-Even Analysis</span>
              <span className="acard-sub">Base NPV: {fmtK(beNPV)}</span>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Metric</th><th>Value</th><th>Interpretation</th></tr>
              </thead>
              <tbody>
                {beRows.map(r => (
                  <tr key={r.label}>
                    <td style={{ fontWeight: 500 }}>{r.label}</td>
                    <td style={{ color: "var(--emerald)", fontWeight: 700 }}>{r.value}</td>
                    <td style={{ color: "var(--ink3)", fontSize: 12 }}>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}

/* ── Charts Tab ───────────────────────────────────────────────────────── */
function ChartsTab2({ schedule }) {
  const { fmtK } = useFmt();
  const [chartV, setChartV] = useState("growth");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["growth","Growth"],["fcf","Free Cash Flow"],["breakdown","Breakdown"],["npv","NPV Curve"]].map(([id,lbl]) => (
          <button key={id} onClick={() => setChartV(id)}
            style={{ padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: chartV===id ? "var(--emerald)" : "var(--card)",
              color: chartV===id ? "#fff" : "var(--ink2)",
              border: chartV===id ? "1.5px solid var(--emerald)" : "1.5px solid var(--border)",
              fontFamily: "var(--sans)", transition: "all 0.15s" }}>
            {lbl}
          </button>
        ))}
      </div>
      <div className="acard fade-up">
        <div className="acard-header">
          <span className="acard-title">
            {chartV==="growth" ? "Portfolio Growth Over Time" : chartV==="fcf" ? "Annual Free Cash Flow" : chartV==="breakdown" ? "Contributions vs Interest" : "Cumulative NPV Curve"}
          </span>
        </div>
        <div style={{ padding: "16px 0 12px" }}>
          <ResponsiveContainer width="100%" height={280}>
            {chartV === "growth" ? (
              <AreaChart data={schedule} margin={{ top: 5, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d7a55" stopOpacity={0.2}/><stop offset="95%" stopColor="#0d7a55" stopOpacity={0}/></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" />
                <XAxis dataKey="year" tick={{ fill: "#8a8fa8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtK(v)} tick={{ fill: "#8a8fa8", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="contributions" name="Contributed" stroke="#6366f1" fill="url(#g2)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="balance" name="Balance" stroke="#0d7a55" fill="url(#g1)" strokeWidth={2.5} />
              </AreaChart>
            ) : chartV === "fcf" ? (
              <BarChart data={schedule} margin={{ top: 5, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" />
                <XAxis dataKey="year" tick={{ fill: "#8a8fa8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtK(v)} tick={{ fill: "#8a8fa8", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine y={0} stroke="#d1d5db" />
                <Bar dataKey="fcf" name="FCF" fill="#0d7a55" radius={[3,3,0,0]} />
              </BarChart>
            ) : chartV === "breakdown" ? (
              <BarChart data={schedule} margin={{ top: 5, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" />
                <XAxis dataKey="year" tick={{ fill: "#8a8fa8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtK(v)} tick={{ fill: "#8a8fa8", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="contributions" name="Contributions" stackId="a" fill="#6366f1" />
                <Bar dataKey="interest" name="Interest" stackId="a" fill="#0d7a55" radius={[3,3,0,0]} />
              </BarChart>
            ) : (
              <AreaChart data={schedule} margin={{ top: 5, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d7a55" stopOpacity={0.2}/><stop offset="95%" stopColor="#0d7a55" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" />
                <XAxis dataKey="year" tick={{ fill: "#8a8fa8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtK(v)} tick={{ fill: "#8a8fa8", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 2" />
                <Area type="monotone" dataKey="cumNPV" name="Cumulative NPV" stroke="#0d7a55" fill="url(#gN)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
