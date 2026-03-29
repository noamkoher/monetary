import { useState, useEffect, useRef, useCallback } from "react";

const PURPLE = { bg: "#EEEDFE", text: "#3C3489", accent: "#534AB7" };
const TEAL = { bg: "#E1F5EE", text: "#085041", accent: "#0F6E56" };
const CORAL = { bg: "#FAECE7", text: "#712B13", accent: "#D85A30" };
const RED = { bg: "#FCEBEB", text: "#791F1F", accent: "#E24B4A" };
const BLUE = { bg: "#E6F1FB", text: "#0C447C", accent: "#185FA5" };
const AMBER = { bg: "#FAEEDA", text: "#633806", accent: "#BA7517" };

function solveModel(B1, bl, phi, eStar) {
  const Cl2 = eStar + phi * (1 - bl);
  const Cb2 = eStar - phi * (1 - bl);
  const rSS = 1 / bl - 1;
  const ClBar = Cl2 / bl;
  const Bbar = ClBar + phi - eStar;
  const atZLB = B1 > Bbar;
  let r1, e1, Cl1, Cb1;
  if (atZLB) {
    r1 = 0;
    Cl1 = ClBar;
    e1 = ClBar - (B1 - phi);
    Cb1 = e1 - B1 + phi;
  } else {
    e1 = eStar;
    const denom = eStar + B1;
    if (denom <= 0) { r1 = rSS; Cl1 = eStar; Cb1 = eStar; }
    else {
      const R = (ClBar + phi) / denom;
      r1 = R - 1;
      Cl1 = eStar + B1 - phi / R;
      Cb1 = eStar - B1 + phi / R;
    }
  }
  return { r1, e1, Cl1, Cb1, Cl2, Cb2, Bbar, rSS, atZLB, eStar, ClBar, phi, bl, B1 };
}

function curveData(bl, phi, eStar, field) {
  const pts = [];
  for (let b = 0.05; b <= 2.0; b += 0.01) {
    const m = solveModel(b, bl, phi, eStar);
    pts.push({ x: b, y: m[field] });
  }
  return pts;
}

function Tex({ math, display }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try {
        window.katex.render(math, ref.current, { displayMode: !!display, throwOnError: false });
      } catch {}
    }
  }, [math, display]);
  return <span ref={ref} />;
}

function Slider({ label, value, onChange, min, max, step, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ minWidth: 60 }}><Tex math={label} /></div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: color || PURPLE.accent }} />
      <span style={{ minWidth: 50, textAlign: "right", fontWeight: 500, fontSize: 14, fontFamily: "var(--font-mono, monospace)" }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: color?.bg || "var(--color-background-secondary)", borderRadius: 8, padding: "10px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 12, color: color?.text || "var(--color-text-secondary)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: color?.text || "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: color?.text || "var(--color-text-secondary)", marginTop: 2, opacity: 0.8 }}>{sub}</div>}
    </div>
  );
}

function Chart({ data, B1, Bbar, yLabel, refLine, refLabel, lineColor, height, currentY, dotColor }) {
  const canvasRef = useRef(null);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = height || 180;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 50, r: 16, t: 20, b: 28 };
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
    const xMin = 0.05, xMax = 2.0;
    let yVals = data.map(p => p.y);
    if (refLine !== undefined) yVals.push(refLine);
    let yMin = Math.min(...yVals), yMax = Math.max(...yVals);
    const yPad = (yMax - yMin) * 0.15 || 0.05;
    yMin -= yPad; yMax += yPad;
    const tx = x => pad.l + (x - xMin) / (xMax - xMin) * cw;
    const ty = y => pad.t + (yMax - y) / (yMax - yMin) * ch;
    const cs = getComputedStyle(document.documentElement);
    const txtCol = cs.getPropertyValue("--color-text-secondary") || "#888";
    const brdCol = cs.getPropertyValue("--color-border-tertiary") || "#ddd";
    ctx.strokeStyle = brdCol; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke();
    ctx.font = "11px sans-serif"; ctx.fillStyle = txtCol; ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const yv = yMin + (yMax - yMin) * i / 4, yy = ty(yv);
      ctx.fillText(yv.toFixed(2), pad.l - 6, yy + 3);
      ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(W - pad.r, yy); ctx.strokeStyle = brdCol; ctx.lineWidth = 0.3; ctx.stroke();
    }
    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) {
      const xv = xMin + (xMax - xMin) * i / 4;
      ctx.fillText(xv.toFixed(1), tx(xv), H - pad.b + 15);
    }
    if (refLine !== undefined) {
      ctx.strokeStyle = TEAL.accent; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(pad.l, ty(refLine)); ctx.lineTo(W - pad.r, ty(refLine)); ctx.stroke();
      ctx.setLineDash([]);
      if (refLabel) { ctx.fillStyle = TEAL.accent; ctx.font = "11px sans-serif"; ctx.textAlign = "left"; ctx.fillText(refLabel, W - pad.r - 36, ty(refLine) - 6); }
    }
    ctx.strokeStyle = PURPLE.accent; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(tx(Bbar), pad.t); ctx.lineTo(tx(Bbar), H - pad.b); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = PURPLE.accent; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("\u0042\u0305", tx(Bbar), pad.t - 5);
    ctx.beginPath(); ctx.strokeStyle = lineColor || CORAL.accent; ctx.lineWidth = 2;
    data.forEach((p, i) => { const px = tx(p.x), py = ty(p.y); i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); });
    ctx.stroke();
    const cy = currentY !== undefined ? currentY : data.find(p => Math.abs(p.x - B1) < 0.02)?.y;
    if (cy !== undefined) {
      const cx = tx(B1), cyy = ty(cy);
      ctx.beginPath(); ctx.arc(cx, cyy, 6, 0, Math.PI * 2); ctx.fillStyle = dotColor || (B1 > Bbar ? RED.accent : PURPLE.accent); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cyy, 2.5, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    }
    ctx.fillStyle = cs.getPropertyValue("--color-text-primary") || "#000"; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(yLabel, pad.l + 4, pad.t - 5);
  }, [data, B1, Bbar, yLabel, refLine, refLabel, lineColor, height, currentY, dotColor]);
  useEffect(() => { draw(); }, [draw]);
  useEffect(() => { window.addEventListener("resize", draw); return () => window.removeEventListener("resize", draw); }, [draw]);
  return <canvas ref={canvasRef} style={{ width: "100%", height: height || 180 }} />;
}

function DualChart({ dataA, dataB, B1, Bbar, labelA, labelB, colorA, colorB, height, curA, curB }) {
  const canvasRef = useRef(null);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = height || 180;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
    const pad = { l: 50, r: 16, t: 20, b: 28 };
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
    const xMin = 0.05, xMax = 2.0;
    const allY = [...dataA.map(p => p.y), ...dataB.map(p => p.y)];
    let yMin = Math.min(...allY), yMax = Math.max(...allY);
    const yPad = (yMax - yMin) * 0.15 || 0.05; yMin -= yPad; yMax += yPad;
    const tx = x => pad.l + (x - xMin) / (xMax - xMin) * cw;
    const ty = y => pad.t + (yMax - y) / (yMax - yMin) * ch;
    const cs = getComputedStyle(document.documentElement);
    const txtCol = cs.getPropertyValue("--color-text-secondary") || "#888";
    const brdCol = cs.getPropertyValue("--color-border-tertiary") || "#ddd";
    ctx.strokeStyle = brdCol; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke();
    ctx.font = "11px sans-serif"; ctx.fillStyle = txtCol; ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) { const yv = yMin + (yMax - yMin) * i / 4, yy = ty(yv); ctx.fillText(yv.toFixed(2), pad.l - 6, yy + 3); ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(W - pad.r, yy); ctx.strokeStyle = brdCol; ctx.lineWidth = 0.3; ctx.stroke(); }
    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) { const xv = xMin + (xMax - xMin) * i / 4; ctx.fillText(xv.toFixed(1), tx(xv), H - pad.b + 15); }
    ctx.strokeStyle = PURPLE.accent; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(tx(Bbar), pad.t); ctx.lineTo(tx(Bbar), H - pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = PURPLE.accent; ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.fillText("\u0042\u0305", tx(Bbar), pad.t - 5);
    [{ d: dataA, c: colorA }, { d: dataB, c: colorB }].forEach(({ d, c }) => {
      ctx.beginPath(); ctx.strokeStyle = c; ctx.lineWidth = 2;
      d.forEach((p, i) => { const px = tx(p.x), py = ty(Math.max(p.y, yMin)); i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); });
      ctx.stroke();
    });
    [{ y: curA, c: colorA }, { y: curB, c: colorB }].forEach(({ y, c }) => {
      if (y === undefined) return;
      const cx = tx(B1), cy = ty(Math.max(y, yMin));
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    });
    const txtPri = cs.getPropertyValue("--color-text-primary") || "#000";
    ctx.font = "12px sans-serif"; ctx.textAlign = "left";
    ctx.fillStyle = colorA; ctx.fillText(labelA, pad.l + 4, pad.t - 5);
    ctx.fillStyle = colorB; ctx.fillText(labelB, pad.l + 80, pad.t - 5);
  }, [dataA, dataB, B1, Bbar, labelA, labelB, colorA, colorB, height, curA, curB]);
  useEffect(() => { draw(); }, [draw]);
  useEffect(() => { window.addEventListener("resize", draw); return () => window.removeEventListener("resize", draw); }, [draw]);
  return <canvas ref={canvasRef} style={{ width: "100%", height: height || 180 }} />;
}

function EqBlock({ title, tex, note, color, values }) {
  return (
    <div style={{ background: color?.bg || "var(--color-background-secondary)", borderRadius: 8, padding: "12px 16px", marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: color?.text || "var(--color-text-secondary)", marginBottom: 6 }}>{title}</div>
      <div style={{ textAlign: "center", margin: "8px 0" }}><Tex math={tex} display /></div>
      {values && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {values.map((v, i) => (
            <span key={i} style={{ fontSize: 12, background: "rgba(0,0,0,0.04)", borderRadius: 6, padding: "3px 8px" }}>
              <Tex math={v} />
            </span>
          ))}
        </div>
      )}
      {note && <div style={{ fontSize: 12, color: color?.text || "var(--color-text-secondary)", marginTop: 6, opacity: 0.8 }}>{note}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8 }}>{title}</h3>
      {children}
    </div>
  );
}

export default function App() {
  const [B1, setB1] = useState(1.05);
  const [bl, setBl] = useState(0.92);
  const [phi, setPhi] = useState(0.50);
  const [eStar, setEStar] = useState(1.0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const check = () => { if (window.katex) setLoaded(true); };
    check();
    const iv = setInterval(check, 200);
    return () => clearInterval(iv);
  }, []);

  const m = solveModel(B1, bl, phi, eStar);
  const rData = curveData(bl, phi, eStar, "r1");
  const eData = curveData(bl, phi, eStar, "e1");
  const clData = curveData(bl, phi, eStar, "Cl1");
  const cbData = curveData(bl, phi, eStar, "Cb1");

  const f = (n, d = 3) => n.toFixed(d);
  const pct = n => (n * 100).toFixed(2) + "\\%";

  if (!loaded) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading KaTeX...</div>;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1rem 0", fontFamily: "var(--font-sans, sans-serif)", color: "var(--color-text-primary)" }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css" />

      <Section title="Parameters">
        <Slider label="B_1" value={B1} onChange={setB1} min={0.1} max={1.9} step={0.01} color={PURPLE.accent} />
        <Slider label="\\beta^l" value={bl} onChange={setBl} min={0.80} max={0.99} step={0.01} color={TEAL.accent} />
        <Slider label="\\phi" value={phi} onChange={setPhi} min={0.1} max={1.2} step={0.01} color={CORAL.accent} />
        <Slider label="e^*" value={eStar} onChange={setEStar} min={0.5} max={2.0} step={0.01} color={BLUE.accent} />
      </Section>

      <Section title="Regime">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
          <MetricCard label="Regime" value={m.atZLB ? "ZLB binds" : "Rate adjusts"} color={m.atZLB ? RED : TEAL} />
          <MetricCard label="B-bar" value={f(m.Bbar)} color={PURPLE} />
          <MetricCard label="r₁" value={pct(m.r1).replace("\\%", "%")} color={m.atZLB ? RED : TEAL} />
          <MetricCard label="e₁" value={f(m.e1)} color={m.e1 < eStar - 0.001 ? RED : TEAL} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
          <MetricCard label="C̃ lender (t=1)" value={f(m.Cl1)} color={CORAL} />
          <MetricCard label="C̃ borrower (t=1)" value={f(Math.max(m.Cb1, 0))} color={BLUE} />
          <MetricCard label="C̃ lender (t=2)" value={f(m.Cl2)} color={{ bg: "#F1EFE8", text: "#5F5E5A" }} />
          <MetricCard label="C̃ borrower (t=2)" value={f(m.Cb2)} color={{ bg: "#F1EFE8", text: "#5F5E5A" }} />
        </div>
      </Section>

      <Section title="Charts">
        <Chart data={rData} B1={B1} Bbar={m.Bbar} yLabel="r₁ (interest rate)" refLine={0} refLabel="r=0" lineColor={CORAL.accent} currentY={m.r1} />
        <div style={{ height: 12 }} />
        <Chart data={eData} B1={B1} Bbar={m.Bbar} yLabel="e₁ (net income)" refLine={eStar} refLabel="e*" lineColor={BLUE.accent} currentY={m.e1} />
        <div style={{ height: 12 }} />
        <DualChart dataA={clData} dataB={cbData} B1={B1} Bbar={m.Bbar} labelA="C̃ lender" labelB="C̃ borrower" colorA={CORAL.accent} colorB={BLUE.accent} curA={m.Cl1} curB={Math.max(m.Cb1, 0)} />
      </Section>

      <Section title="Steady state (t ≥ 2)">
        <EqBlock title="Lender's Euler pins the rate" color={TEAL}
          tex={`r_t = \\frac{1}{\\beta^l} - 1 = \\frac{1}{${f(bl,2)}} - 1 = ${pct(m.rSS)}`}
          note="Borrower at constraint, lender unconstrained with constant consumption."
        />
        <EqBlock title="Lender steady-state consumption" color={TEAL}
          tex={`\\tilde{C}^l_2 = e^* + \\phi(1-\\beta^l) = ${f(eStar)} + ${f(phi)}(1-${f(bl,2)}) = ${f(m.Cl2)}`}
        />
        <EqBlock title="Borrower steady-state consumption" color={BLUE}
          tex={`\\tilde{C}^b_2 = e^* - \\phi(1-\\beta^l) = ${f(eStar)} - ${f(phi)}(1-${f(bl,2)}) = ${f(m.Cb2)}`}
        />
        <EqBlock title="B-bar threshold" color={PURPLE}
          tex={`\\bar{B} = \\frac{\\tilde{C}^l_2}{\\beta^l} + \\phi - e^* = \\frac{${f(m.Cl2)}}{${f(bl,2)}} + ${f(phi)} - ${f(eStar)} = ${f(m.Bbar)}`}
          note="The debt level at which r₁ = 0 and e₁ = e*. Beyond this, ZLB binds."
        />
      </Section>

      <Section title={m.atZLB ? "Period 1: ZLB binding (B₁ > B̄)" : "Period 1: rate adjusts (B₁ ≤ B̄)"}>
        {m.atZLB ? (
          <>
            <EqBlock title="Step 1: Lender consumption (Euler at ZLB, r₁ = 0)" color={CORAL}
              tex={`u'(\\bar{C}^l_1) = \\beta^l\\, u'(\\tilde{C}^l_2) \\quad\\Rightarrow\\quad \\bar{C}^l_1 = \\frac{\\tilde{C}^l_2}{\\beta^l} = \\frac{${f(m.Cl2)}}{${f(bl,2)}} = ${f(m.ClBar)}`}
              note="With log utility, u'(c) = 1/c, so C̄ˡ₁ = C̃ˡ₂ / βˡ. Fixed constant — does not depend on e₁ or B₁."
            />
            <EqBlock title="Step 2: Borrower consumption (budget constraint)" color={BLUE}
              tex={`\\tilde{C}^b_1 = e_1 - B_1 + \\phi = e_1 - ${f(B1)} + ${f(phi)} = e_1 - ${f(B1 - phi)}`}
              note="Borrower is constrained: not on Euler. BC with Bᵇ₁ = -B₁, Bᵇ₂ = -φ, r₁ = 0."
            />
            <EqBlock title="Step 3: Goods market clearing → solve for e₁" color={PURPLE}
              tex={`e_1 = \\frac{1}{2}\\bigl(\\bar{C}^l_1 + \\tilde{C}^b_1\\bigr) = \\frac{1}{2}\\bigl(${f(m.ClBar)} + e_1 - ${f(B1 - phi)}\\bigr)`}
            />
            <EqBlock title="Result" color={m.e1 < eStar - 0.001 ? RED : TEAL}
              tex={`\\boxed{\\;e_1 = \\bar{C}^l_1 - (B_1 - \\phi) = ${f(m.ClBar)} - (${f(B1)} - ${f(phi)}) = ${f(m.e1)}\\;}`}
              values={[
                `\\frac{\\partial e_1}{\\partial B_1} = -1`,
                `e_1 - e^* = ${f(m.e1 - eStar)}`,
              ]}
              note="A unit of extra debt lowers income by exactly 1. Keynesian multiplier: borrower (mass ½) cuts spending by 1 → demand falls ½ → income falls ½ → spending falls ¼ → ... Geometric series = 1."
            />
          </>
        ) : (
          <>
            <EqBlock title="Rate adjusts to clear goods market" color={TEAL}
              tex={`e_1 = e^* = ${f(eStar)}`}
              note="ZLB not binding. Interest rate absorbs the deleveraging shock. No output loss."
            />
            <EqBlock title="Equilibrium rate" color={TEAL}
              tex={`1 + r_1 = \\frac{\\bar{C}^l_1 + \\phi}{e^* + B_1} \\quad\\Rightarrow\\quad r_1 = ${pct(m.r1)}`}
              note="Rate falls as B₁ rises toward B̄, incentivising lenders to consume more and offset borrower deleveraging."
            />
            <EqBlock title="Consumption" color={CORAL}
              tex={`\\tilde{C}^l_1 = ${f(m.Cl1)} \\qquad \\tilde{C}^b_1 = ${f(Math.max(m.Cb1, 0))}`}
              note="Lower rate → lenders consume more today. Borrowers consume less as they deleverage. But total demand = e*."
            />
          </>
        )}
      </Section>

      <Section title="Aggregate demand externality">
        {m.atZLB ? (
          <EqBlock title="Both households lose from more debt (Pareto-improvable)" color={RED}
            tex={`\\frac{\\partial V^j}{\\partial B_1} = \\frac{de_1}{dB_1}\\, u'(\\tilde{C}^j_1) = -u'(\\tilde{C}^j_1) < 0 \\quad \\text{for } j = b, l`}
            note="At the ZLB, my spending is your income — but I don't internalise this. Less debt would make everyone better off."
            values={[
              `\\partial V^b/\\partial B_1 = -u'(${f(Math.max(m.Cb1,0.01))})`,
              `\\partial V^l/\\partial B_1 = -u'(${f(m.Cl1)})`,
            ]}
          />
        ) : (
          <EqBlock title="Pure redistribution — no Pareto improvement" color={AMBER}
            tex={`\\frac{\\partial V^j}{\\partial B_1} = \\frac{\\phi}{(1+r_1)^2}\\frac{dr_1}{dB_1}\\, u'(\\tilde{C}^j_1) \\times \\begin{cases} -1 & j=b \\\\ +1 & j=l \\end{cases}`}
            note="Below B̄: more debt lowers rates. Borrowers gain (cheaper debt), lenders lose (lower return). Zero-sum — no externality."
          />
        )}
      </Section>

      <Section title="Why monetary policy fails">
        <EqBlock title="Raising r₀ to discourage borrowing" color={AMBER}
          tex={`r_0 \\uparrow \\;\\Rightarrow\\; \\underbrace{B_1 \\downarrow}_{\\text{substitution}} + \\underbrace{B_1 \\uparrow}_{\\text{income}} \\;=\\; ?`}
          note="SE: saving more attractive → borrow less. IE: recession in period 0 → income falls → borrow more to smooth. Korinek & Simsek show IE dominates — r₀↑ is counterproductive. Also: one instrument (r₀), two targets (clear period-0 market + discourage borrowing)."
        />
      </Section>
    </div>
  );
}
