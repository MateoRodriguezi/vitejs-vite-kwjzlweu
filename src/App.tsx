import { useState, useEffect } from "react";

const SUPABASE_URL = "https://wpwvfbgvpybaktthofrj.supabase.co";
const SUPABASE_KEY = "sb_publishable_VB0OGl00nJVPYqz_7Ykfhw_rwFdQUDK";

const SECTIONS = [
  { key: "highlights", label: "Highlights", emoji: "⚡", color: "#F59E0B", desc: "Logros o momentos destacados de la semana" },
  { key: "progress",   label: "Progress",   emoji: "📈", color: "#10B981", desc: "¿En qué avanzaste esta semana?" },
  { key: "problems",   label: "Problems",   emoji: "🚧", color: "#EF4444", desc: "Blockers o problemas que tenés ahora" },
  { key: "plans",      label: "Plans",      emoji: "🗓️", color: "#6366F1", desc: "¿Qué vas a hacer la próxima semana?" },
];

interface Entry {
  id: string;
  name: string;
  highlights: string;
  progress: string;
  problems: string;
  plans: string;
  week: string;
  date: string;
}

interface FormState {
  name: string;
  highlights: string;
  progress: string;
  problems: string;
  plans: string;
}

function getWeekLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  return `Semana del ${start.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
}

async function sbFetch(path: string, options: RequestInit & { prefer?: string } = {}) {
  const { prefer, ...rest } = options;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...rest,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": prefer || "return=representation",
      ...((rest.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

function AIInsights({ entries }: { entries: Entry[] }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateInsight() {
    if (!entries.length) return;
    setLoading(true);
    setInsight("");
    const summary = entries.map(e =>
      `${e.name}: Highlights: ${e.highlights} | Progress: ${e.progress} | Problems: ${e.problems} | Plans: ${e.plans}`
    ).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `Sos un lead de equipo. Analizá este HPPP semanal y generá un resumen ejecutivo breve en español (máx 150 palabras) con: principales logros del equipo, blockers críticos a resolver, y 2-3 recomendaciones accionables. Sé directo, sin preambles.\n\n${summary}` }]
        })
      });
      const data = await res.json();
      setInsight(data.content?.map((b: { text?: string }) => b.text || "").join("") || "No se pudo generar.");
    } catch {
      setInsight("Error al conectar con la IA.");
    }
    setLoading(false);
  }

  return (
    <div style={{ marginTop: 32, background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", borderRadius: 16, padding: 24, border: "1px solid #4338ca" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <span style={{ color: "#a5b4fc", fontFamily: "'Crimson Pro', serif", fontSize: 18, fontWeight: 600 }}>Análisis IA del equipo</span>
        </div>
        <button onClick={generateInsight} disabled={loading || !entries.length} style={{
          background: !entries.length ? "#374151" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "white", border: "none", borderRadius: 8, padding: "8px 18px",
          fontFamily: "'Space Mono', monospace", fontSize: 12,
          cursor: !entries.length ? "not-allowed" : "pointer", opacity: !entries.length ? 0.5 : 1,
        }}>
          {loading ? "Analizando..." : "Generar resumen"}
        </button>
      </div>
      {loading && <div style={{ color: "#c7d2fe", fontFamily: "'Space Mono', monospace", fontSize: 13, fontStyle: "italic" }}>✦ Procesando el estado del equipo...</div>}
      {insight && !loading && <div style={{ color: "#e0e7ff", fontFamily: "'Crimson Pro', serif", fontSize: 16, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{insight}</div>}
      {!insight && !loading && <div style={{ color: "#6366f1", fontFamily: "'Space Mono', monospace", fontSize: 12 }}>{!entries.length ? "Cargá al menos un HPPP para generar el análisis." : "Hacé clic en 'Generar resumen'."}</div>}
    </div>
  );
}

function EntryCard({ entry, onDelete }: { entry: Entry; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div onClick={() => setExpanded(e => !e)} style={{
      background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14,
      padding: 20, marginBottom: 14, cursor: "pointer",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14, color: "white"
          }}>
            {entry.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ color: "#f1f5f9", fontFamily: "'Crimson Pro', serif", fontSize: 17, fontWeight: 600 }}>{entry.name}</div>
            <div style={{ color: "#64748b", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{entry.week} · {entry.date}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {entry.problems?.trim() && <span title="Tiene blockers">🚧</span>}
          <button onClick={e => { e.stopPropagation(); onDelete(entry.id); }} style={{
            background: "transparent", border: "1px solid #374151", borderRadius: 6,
            color: "#64748b", padding: "4px 10px", cursor: "pointer",
            fontFamily: "'Space Mono', monospace", fontSize: 11
          }}>×</button>
          <span style={{ color: "#475569", fontSize: 18 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {SECTIONS.map(s => (
            <div key={s.key} style={{ background: "#1e293b", borderRadius: 10, padding: 14, borderLeft: `3px solid ${s.color}` }}>
              <div style={{ color: s.color, fontFamily: "'Space Mono', monospace", fontSize: 11, marginBottom: 6, letterSpacing: 1 }}>
                {s.emoji} {s.label.toUpperCase()}
              </div>
              <div style={{ color: "#cbd5e1", fontFamily: "'Crimson Pro', serif", fontSize: 15, lineHeight: 1.5 }}>
                {entry[s.key as keyof Entry] || <span style={{ color: "#475569", fontStyle: "italic" }}>—</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<"form" | "dashboard">("form");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({ name: "", highlights: "", progress: "", problems: "", plans: "" });

  async function loadEntries() {
    setLoading(true);
    setError("");
    try {
      const data = await sbFetch("hppp_entries?order=created_at.desc&limit=50");
      setEntries(data);
    } catch {
      setError("No se pudieron cargar los datos. Verificá que la tabla existe en Supabase.");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (view === "dashboard") loadEntries();
  }, [view]);

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await sbFetch("hppp_entries", {
        method: "POST",
        prefer: "return=minimal",
        body: JSON.stringify({
          ...form,
          week: getWeekLabel(),
          date: new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }),
        }),
      });
      setForm({ name: "", highlights: "", progress: "", problems: "", plans: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Error al guardar. Intentá de nuevo.");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    try {
      await sbFetch(`hppp_entries?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch {
      setError("No se pudo eliminar.");
    }
  }

  const hasBlockers = entries.filter(e => e.problems?.trim());

  return (
    <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "'Space Mono', monospace", paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <div style={{ background: "linear-gradient(180deg, #0a0f1e 0%, #020817 100%)", borderBottom: "1px solid #1e293b", padding: "28px 32px 24px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ color: "#6366f1", fontSize: 11, letterSpacing: 3, marginBottom: 6 }}>TEAM STATUS</div>
              <div style={{ color: "#f1f5f9", fontFamily: "'Crimson Pro', serif", fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>HPPP Tracker</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>{getWeekLabel()}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["form", "dashboard"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: view === v ? "#6366f1" : "transparent",
                  border: `1px solid ${view === v ? "#6366f1" : "#334155"}`,
                  color: view === v ? "white" : "#94a3b8", borderRadius: 8,
                  padding: "8px 18px", cursor: "pointer", fontFamily: "'Space Mono', monospace",
                  fontSize: 11, transition: "all 0.2s"
                }}>
                  {v === "form" ? "📝 Cargar mi HPPP" : `📊 Ver equipo (${entries.length})`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px 0" }}>
        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#fca5a5", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {view === "form" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, display: "block", marginBottom: 8 }}>TU NOMBRE</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ej. Martina López"
                style={{
                  width: "100%", background: "#0f172a", border: "1px solid #334155",
                  borderRadius: 10, padding: "12px 16px", color: "#f1f5f9",
                  fontFamily: "'Crimson Pro', serif", fontSize: 16, outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {SECTIONS.map(s => (
                <div key={s.key} style={{ background: "#0f172a", border: "1px solid #1e293b", borderTop: `3px solid ${s.color}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ color: s.color, fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>{s.emoji} {s.label.toUpperCase()}</div>
                  <div style={{ color: "#475569", fontSize: 12, marginBottom: 10, fontFamily: "'Crimson Pro', serif" }}>{s.desc}</div>
                  <textarea
                    value={form[s.key as keyof FormState]}
                    onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                    placeholder="Escribí aquí..."
                    rows={4}
                    style={{
                      width: "100%", background: "#1e293b", border: "1px solid #334155",
                      borderRadius: 8, padding: "10px 12px", color: "#cbd5e1",
                      fontFamily: "'Crimson Pro', serif", fontSize: 15, lineHeight: 1.5,
                      outline: "none", resize: "vertical", boxSizing: "border-box"
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || submitting}
                style={{
                  background: form.name.trim() ? "linear-gradient(135deg, #6366f1, #06b6d4)" : "#1e293b",
                  color: "white", border: "none", borderRadius: 10, padding: "14px 32px",
                  cursor: form.name.trim() ? "pointer" : "not-allowed",
                  fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: 1,
                }}>
                {submitting ? "Guardando..." : "Enviar HPPP →"}
              </button>
              {saved && <div style={{ color: "#10b981", fontSize: 12 }}>✓ Guardado en la base de datos</div>}
            </div>
          </div>
        )}

        {view === "dashboard" && (
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 18 }}>Cargando HPPPs del equipo...</div>
              </div>
            ) : (
              <>
                {hasBlockers.length > 0 && (
                  <div style={{
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 12, padding: "14px 20px", marginBottom: 24,
                    display: "flex", alignItems: "center", gap: 12
                  }}>
                    <span style={{ fontSize: 20 }}>🚧</span>
                    <div>
                      <span style={{ color: "#fca5a5", fontSize: 12, letterSpacing: 1 }}>BLOCKERS ACTIVOS — </span>
                      <span style={{ color: "#f87171", fontFamily: "'Crimson Pro', serif", fontSize: 15 }}>
                        {hasBlockers.map(e => e.name).join(", ")} {hasBlockers.length === 1 ? "tiene" : "tienen"} problemas reportados
                      </span>
                    </div>
                  </div>
                )}
                {entries.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "#334155" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                    <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 20, color: "#475569" }}>Todavía no hay HPPPs cargados</div>
                    <div style={{ fontSize: 12, marginTop: 8 }}>Compartí el link al equipo para que carguen el suyo</div>
                  </div>
                ) : (
                  entries.map(e => <EntryCard key={e.id} entry={e} onDelete={handleDelete} />)
                )}
                <AIInsights entries={entries} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
