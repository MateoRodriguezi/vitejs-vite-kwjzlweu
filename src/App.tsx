import { useState, useEffect } from "react";

const SUPABASE_URL = "https://wpwvfbgvpybaktthofrj.supabase.co";
const SUPABASE_KEY = "sb_publishable_VB0OGl00nJVPYqz_7Ykfhw_rwFdQUDK";

// Configuración de API key de Anthropic (debe estar en variables de entorno en producción)
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

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

    if (!ANTHROPIC_API_KEY) {
      setInsight("⚠️ API key no configurada. Agregá VITE_ANTHROPIC_API_KEY en tu archivo .env");
      return;
    }

    setLoading(true);
    setInsight("");
    const summary = entries.map(e =>
      `${e.name}: Highlights: ${e.highlights} | Progress: ${e.progress} | Problems: ${e.problems} | Plans: ${e.plans}`
    ).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `Sos un lead de equipo. Analizá este HPPP semanal y generá un resumen ejecutivo breve en español (máx 150 palabras) con: principales logros del equipo, blockers críticos a resolver, y 2-3 recomendaciones accionables. Sé directo, sin preambles.\n\n${summary}` }]
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Error en la API");
      }

      const data = await res.json();
      setInsight(data.content?.map((b: { text?: string }) => b.text || "").join("") || "No se pudo generar.");
    } catch (err) {
      setInsight(`❌ Error: ${err instanceof Error ? err.message : "No se pudo conectar con la IA"}`);
    }
    setLoading(false);
  }

  return (
    <div style={{
      marginTop: 32,
      background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
      borderRadius: 16,
      padding: 24,
      border: "1px solid #4338ca",
      boxShadow: "0 4px 24px rgba(99, 102, 241, 0.1)",
      transition: "all 0.3s ease"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, animation: loading ? "pulse 2s infinite" : "none" }}>🤖</span>
          <span style={{ color: "#a5b4fc", fontFamily: "'Crimson Pro', serif", fontSize: 18, fontWeight: 600 }}>Análisis IA del equipo</span>
        </div>
        <button onClick={generateInsight} disabled={loading || !entries.length} style={{
          background: !entries.length ? "#374151" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "10px 20px",
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
          cursor: !entries.length || loading ? "not-allowed" : "pointer",
          opacity: !entries.length || loading ? 0.5 : 1,
          transition: "all 0.2s ease",
          transform: "scale(1)",
          boxShadow: !entries.length ? "none" : "0 2px 8px rgba(99, 102, 241, 0.3)"
        }}
        onMouseEnter={e => {
          if (!loading && entries.length) {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.4)";
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(99, 102, 241, 0.3)";
        }}>
          {loading ? "⏳ Analizando..." : "✨ Generar resumen"}
        </button>
      </div>
      {loading && (
        <div style={{
          color: "#c7d2fe",
          fontFamily: "'Space Mono', monospace",
          fontSize: 13,
          fontStyle: "italic",
          padding: "16px 0",
          animation: "fadeIn 0.3s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ animation: "spin 1s linear infinite" }}>⚙️</span>
            <span>Procesando el estado del equipo...</span>
          </div>
        </div>
      )}
      {insight && !loading && (
        <div style={{
          color: "#e0e7ff",
          fontFamily: "'Crimson Pro', serif",
          fontSize: 16,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          background: "rgba(15, 23, 42, 0.4)",
          borderRadius: 10,
          padding: 16,
          border: "1px solid rgba(99, 102, 241, 0.2)",
          animation: "fadeIn 0.5s ease"
        }}>
          {insight}
        </div>
      )}
      {!insight && !loading && (
        <div style={{
          color: "#6366f1",
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
          padding: "12px 0"
        }}>
          {!entries.length ? "📝 Cargá al menos un HPPP para generar el análisis." : "👆 Hacé clic en 'Generar resumen' para comenzar."}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, onDelete }: { entry: Entry; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? "#1a1f35" : "#0f172a",
        border: isHovered ? "1px solid #334155" : "1px solid #1e293b",
        borderRadius: 14,
        padding: 20,
        marginBottom: 14,
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: isHovered ? "0 4px 16px rgba(0, 0, 0, 0.3)" : "none",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            fontSize: 14,
            color: "white",
            boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
            transition: "transform 0.2s ease",
            transform: isHovered ? "scale(1.1)" : "scale(1)"
          }}>
            {entry.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ color: "#f1f5f9", fontFamily: "'Crimson Pro', serif", fontSize: 17, fontWeight: 600 }}>{entry.name}</div>
            <div style={{ color: "#64748b", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{entry.week} · {entry.date}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {entry.problems?.trim() && (
            <span
              title="Tiene blockers"
              style={{
                animation: "pulse 2s infinite",
                fontSize: 18
              }}
            >
              🚧
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar el HPPP de ${entry.name}?`)) onDelete(entry.id); }}
            style={{
              background: "transparent",
              border: "1px solid #374151",
              borderRadius: 6,
              color: "#64748b",
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              fontSize: 14,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#ef4444";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "#ef4444";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#64748b";
              e.currentTarget.style.borderColor = "#374151";
            }}
          >
            ×
          </button>
          <span style={{
            color: "#475569",
            fontSize: 16,
            transition: "transform 0.3s ease",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-block"
          }}>
            ▼
          </span>
        </div>
      </div>
      {expanded && (
        <div style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 12,
          animation: "fadeIn 0.3s ease"
        }}>
          {SECTIONS.map(s => (
            <div
              key={s.key}
              style={{
                background: "#1e293b",
                borderRadius: 10,
                padding: 14,
                borderLeft: `3px solid ${s.color}`,
                transition: "transform 0.2s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateX(4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateX(0)"}
            >
              <div style={{
                color: s.color,
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                marginBottom: 6,
                letterSpacing: 1
              }}>
                {s.emoji} {s.label.toUpperCase()}
              </div>
              <div style={{
                color: "#cbd5e1",
                fontFamily: "'Crimson Pro', serif",
                fontSize: 15,
                lineHeight: 1.5
              }}>
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
    } catch (err) {
      setError(`No se pudieron cargar los datos. ${err instanceof Error ? err.message : "Verificá tu conexión a Supabase."}`);
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
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          #root {
            padding: 0 12px;
          }
        }
      `}</style>

      <div style={{
        background: "linear-gradient(180deg, #0a0f1e 0%, #020817 100%)",
        borderBottom: "1px solid #1e293b",
        padding: "28px 24px 24px"
      }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16
          }}>
            <div>
              <div style={{
                color: "#6366f1",
                fontSize: 11,
                letterSpacing: 3,
                marginBottom: 6,
                fontWeight: 700
              }}>
                TEAM STATUS
              </div>
              <div style={{
                color: "#f1f5f9",
                fontFamily: "'Crimson Pro', serif",
                fontSize: "clamp(24px, 5vw, 34px)",
                fontWeight: 600,
                lineHeight: 1.1
              }}>
                HPPP Tracker
              </div>
              <div style={{
                color: "#475569",
                fontSize: 12,
                marginTop: 6
              }}>
                {getWeekLabel()}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["form", "dashboard"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    background: view === v ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
                    border: `1px solid ${view === v ? "#6366f1" : "#334155"}`,
                    color: view === v ? "white" : "#94a3b8",
                    borderRadius: 8,
                    padding: "10px 20px",
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    transition: "all 0.2s ease",
                    boxShadow: view === v ? "0 2px 8px rgba(99, 102, 241, 0.3)" : "none",
                    transform: "scale(1)"
                  }}
                  onMouseEnter={e => {
                    if (view !== v) {
                      e.currentTarget.style.borderColor = "#6366f1";
                      e.currentTarget.style.color = "#a5b4fc";
                    }
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={e => {
                    if (view !== v) {
                      e.currentTarget.style.borderColor = "#334155";
                      e.currentTarget.style.color = "#94a3b8";
                    }
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {v === "form" ? "📝 Cargar mi HPPP" : `📊 Ver equipo (${entries.length})`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px 0" }}>
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 20,
            color: "#fca5a5",
            fontSize: 13,
            display: "flex",
            alignItems: "start",
            gap: 10,
            animation: "fadeIn 0.3s ease"
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: "#f87171" }}>Error</div>
              <div>{error}</div>
            </div>
            <button
              onClick={() => setError("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#fca5a5",
                cursor: "pointer",
                fontSize: 18,
                padding: 0,
                lineHeight: 1
              }}
            >
              ×
            </button>
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
                  width: "100%",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 10,
                  padding: "12px 16px",
                  color: "#f1f5f9",
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 16,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "all 0.2s ease"
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = "#334155";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16
            }}>
              {SECTIONS.map(s => (
                <div
                  key={s.key}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderTop: `3px solid ${s.color}`,
                    borderRadius: 12,
                    padding: 20,
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = s.color;
                    e.currentTarget.style.boxShadow = `0 4px 16px ${s.color}20`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "#1e293b";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ color: s.color, fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>
                    {s.emoji} {s.label.toUpperCase()}
                  </div>
                  <div style={{ color: "#475569", fontSize: 12, marginBottom: 10, fontFamily: "'Crimson Pro', serif" }}>
                    {s.desc}
                  </div>
                  <textarea
                    value={form[s.key as keyof FormState]}
                    onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                    placeholder="Escribí aquí..."
                    rows={4}
                    style={{
                      width: "100%",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#cbd5e1",
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 15,
                      lineHeight: 1.5,
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box",
                      transition: "all 0.2s ease"
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = s.color;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${s.color}20`;
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = "#334155";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || submitting}
                style={{
                  background: form.name.trim() && !submitting ? "linear-gradient(135deg, #6366f1, #06b6d4)" : "#1e293b",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "14px 32px",
                  cursor: form.name.trim() && !submitting ? "pointer" : "not-allowed",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 1,
                  transition: "all 0.2s ease",
                  boxShadow: form.name.trim() ? "0 4px 16px rgba(99, 102, 241, 0.3)" : "none",
                  transform: "scale(1)",
                  opacity: !form.name.trim() || submitting ? 0.5 : 1
                }}
                onMouseEnter={e => {
                  if (form.name.trim() && !submitting) {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(99, 102, 241, 0.4)";
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = form.name.trim() ? "0 4px 16px rgba(99, 102, 241, 0.3)" : "none";
                }}
              >
                {submitting ? "⏳ Guardando..." : "✨ Enviar HPPP →"}
              </button>
              {saved && (
                <div style={{
                  color: "#10b981",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  animation: "fadeIn 0.3s ease",
                  background: "rgba(16, 185, 129, 0.1)",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid rgba(16, 185, 129, 0.3)"
                }}>
                  <span style={{ fontSize: 16 }}>✓</span>
                  <span>Guardado en la base de datos</span>
                </div>
              )}
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
                  <div style={{
                    textAlign: "center",
                    padding: "80px 20px",
                    color: "#334155",
                    animation: "fadeIn 0.5s ease"
                  }}>
                    <div style={{
                      fontSize: 64,
                      marginBottom: 20,
                      opacity: 0.6
                    }}>
                      📭
                    </div>
                    <div style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 24,
                      color: "#64748b",
                      marginBottom: 12,
                      fontWeight: 600
                    }}>
                      Todavía no hay HPPPs cargados
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: "#475569",
                      marginBottom: 24
                    }}>
                      Compartí el link al equipo para que carguen el suyo
                    </div>
                    <button
                      onClick={() => setView("form")}
                      style={{
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "12px 24px",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 12,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(99, 102, 241, 0.4)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "0 4px 16px rgba(99, 102, 241, 0.3)";
                      }}
                    >
                      ✨ Cargar el primero
                    </button>
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
