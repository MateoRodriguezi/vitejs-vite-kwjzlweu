import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";

const SUPABASE_URL = "https://wpwvfbgvpybaktthofrj.supabase.co";
const SUPABASE_KEY = "sb_publishable_VB0OGl00nJVPYqz_7Ykfhw_rwFdQUDK";

const SECTIONS = [
  { key: "highlights", label: "Highlights", emoji: "⚡", color: "#F59E0B", desc: "Logros o momentos destacados de la semana" },
  { key: "progress",   label: "Progress",   emoji: "📈", color: "#10B981", desc: "¿En qué avanzaste esta semana?" },
  { key: "problems",   label: "Problems",   emoji: "🚧", color: "#EF4444", desc: "Blockers o problemas que tenés ahora" },
  { key: "plans",      label: "Plans",      emoji: "🗓️", color: "#6366F1", desc: "¿Qué vas a hacer la próxima semana?" },
];

// Nombres con tildes correctas para mostrar en el selector
// Al guardar, se normalizarán automáticamente (sin tildes)
const TEAM_MEMBERS = [
  "Andrés Rodríguez",
  "Camila Becerra",
  "Emmanuel Casa",
  "Germán Giraldo",
  "Javier Sarasua",
  "Laura Pinilla",
  "Luis García",
  "Martha Torres",
  "Mateo Rodríguez",
  "Naomi Leiva",
  "Sebastián González",
  "Verónica Torricos"
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
  created_at?: string;
}

interface FormState {
  name: string;
  highlights: string;
  progress: string;
  problems: string;
  plans: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface Modal {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "info";
}

function getWeekLabel(date?: Date) {
  const now = date || new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  return `Semana del ${start.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
}

// Normaliza nombres: quita tildes, convierte a Title Case, trim espacios
function normalizeName(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita tildes/acentos
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[], onDismiss: (id: number) => void }) {
  return (
    <div style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      maxWidth: "90vw",
      width: 400
    }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{
          background: toast.type === "success" ? "rgba(16, 185, 129, 0.95)" : toast.type === "error" ? "rgba(239, 68, 68, 0.95)" : "rgba(99, 102, 241, 0.95)",
          color: "white",
          padding: "14px 18px",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          animation: "slideInRight 0.3s ease, fadeIn 0.3s ease",
          backdropFilter: "blur(10px)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <span style={{ fontSize: 20 }}>
              {toast.type === "success" ? "✓" : toast.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13 }}>{toast.message}</span>
          </div>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
                borderRadius: 6,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "'Space Mono', monospace",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => onDismiss(toast.id)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 20,
              padding: 0,
              lineHeight: 1,
              opacity: 0.7,
              transition: "opacity 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function ModalDialog({ modal, darkMode }: { modal: Modal | null, darkMode: boolean }) {
  if (!modal) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 10000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      animation: "fadeIn 0.2s ease"
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) modal.onCancel();
    }}>
      {/* Backdrop */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)"
      }} />

      {/* Modal */}
      <div style={{
        position: "relative",
        background: darkMode ? "#0f172a" : "#ffffff",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
        maxWidth: 440,
        width: "100%",
        animation: "scaleIn 0.2s ease",
        border: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0"
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 16px",
          borderBottom: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: modal.type === "danger" ? "rgba(239, 68, 68, 0.1)" : "rgba(99, 102, 241, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20
            }}>
              {modal.type === "danger" ? "⚠️" : "ℹ️"}
            </div>
            <h3 style={{
              margin: 0,
              color: darkMode ? "#f1f5f9" : "#0f172a",
              fontFamily: "'Crimson Pro', serif",
              fontSize: 20,
              fontWeight: 600
            }}>
              {modal.title}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div style={{
          padding: "20px 24px",
          color: darkMode ? "#cbd5e1" : "#64748b",
          fontFamily: "'Crimson Pro', serif",
          fontSize: 15,
          lineHeight: 1.6
        }}>
          {modal.message}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px 24px",
          display: "flex",
          gap: 12,
          justifyContent: "flex-end"
        }}>
          <button
            onClick={modal.onCancel}
            style={{
              background: "transparent",
              border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
              color: darkMode ? "#94a3b8" : "#64748b",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              transition: "all 0.2s"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = darkMode ? "#1e293b" : "#f8fafc";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {modal.cancelText || "Cancelar"}
          </button>
          <button
            onClick={modal.onConfirm}
            style={{
              background: modal.type === "danger" ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.2s",
              boxShadow: modal.type === "danger" ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "0 4px 12px rgba(99, 102, 241, 0.3)"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = modal.type === "danger" ? "0 6px 16px rgba(239, 68, 68, 0.4)" : "0 6px 16px rgba(99, 102, 241, 0.4)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = modal.type === "danger" ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "0 4px 12px rgba(99, 102, 241, 0.3)";
            }}
          >
            {modal.confirmText || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 14,
          padding: 20,
          animation: "pulse 2s infinite"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#1e293b"
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: "40%", height: 16, background: "#1e293b", borderRadius: 4, marginBottom: 8 }} />
              <div style={{ width: "60%", height: 12, background: "#1e293b", borderRadius: 4 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TypingAnimation({ text, onComplete }: { text: string, onComplete?: () => void }) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 15); // velocidad de typing
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return <>{displayText}</>;
}

function AIInsights({ entries, darkMode }: { entries: Entry[], darkMode: boolean }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [rawInsight, setRawInsight] = useState("");
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("aiLanguage") || "es";
  });
  const insightRef = useRef<HTMLDivElement>(null);

  // Guardar preferencia de idioma
  useEffect(() => {
    localStorage.setItem("aiLanguage", language);
  }, [language]);

  async function generateInsight() {
    if (!entries.length) return;

    setLoading(true);
    setInsight("");
    setRawInsight("");
    setTyping(false);

    // Auto-scroll al análisis
    setTimeout(() => {
      insightRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);

    // Usar solo los entries que se están mostrando actualmente (filtrados)
    // Si no hay filtros, usar todos los entries
    const entriesToAnalyze = entries.length > 0 ? entries : entries;

    const summary = entriesToAnalyze.map(e =>
      `${e.name} (${e.week}):\n- Highlights: ${e.highlights || 'N/A'}\n- Progress: ${e.progress || 'N/A'}\n- Problems: ${e.problems || 'Ninguno'}\n- Plans: ${e.plans || 'N/A'}`
    ).join("\n\n");

    const totalPeople = new Set(entriesToAnalyze.map(e => e.name)).size;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary,
          language,
          totalPeople,
          totalEntries: entriesToAnalyze.length
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error en el análisis");
      }

      const data = await res.json();
      const result = data.insight || "No se pudo generar.";
      setRawInsight(result);
      setLoading(false);
      setTyping(true);
    } catch (err) {
      setInsight(`❌ Error: ${err instanceof Error ? err.message : "No se pudo conectar con la IA"}`);
      setLoading(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(insight);
    // Trigger confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
  }

  function exportAnalysis() {
    const blob = new Blob([`HPPP Tracker - Análisis del equipo\n${getWeekLabel()}\n\n${insight}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analisis-hppp-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div ref={insightRef} style={{
      marginTop: 32,
      background: darkMode ? "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" : "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
      borderRadius: 16,
      padding: 24,
      border: darkMode ? "1px solid #4338ca" : "1px solid #7dd3fc",
      boxShadow: darkMode ? "0 4px 24px rgba(99, 102, 241, 0.1)" : "0 4px 24px rgba(14, 165, 233, 0.1)",
      transition: "all 0.3s ease"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, animation: loading ? "pulse 2s infinite" : "none" }}>🤖</span>
          <span style={{ color: darkMode ? "#a5b4fc" : "#0369a1", fontFamily: "'Crimson Pro', serif", fontSize: 18, fontWeight: 600 }}>
            Análisis IA del equipo {loading && <span style={{ fontSize: 14 }}>⚡</span>}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            disabled={loading}
            style={{
              background: darkMode ? "rgba(99, 102, 241, 0.15)" : "rgba(14, 165, 233, 0.1)",
              border: darkMode ? "1px solid #6366f1" : "1px solid #0ea5e9",
              color: darkMode ? "#a5b4fc" : "#0369a1",
              borderRadius: 6,
              padding: "8px 12px",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              cursor: loading ? "not-allowed" : "pointer",
              outline: "none",
              opacity: loading ? 0.5 : 1,
              transition: "all 0.2s ease"
            }}
            title="Seleccionar idioma del resumen"
          >
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇺🇸 English</option>
            <option value="pt">🇧🇷 Português</option>
          </select>
          {insight && !loading && (
            <>
              <button onClick={copyToClipboard} style={{
                background: darkMode ? "rgba(99, 102, 241, 0.2)" : "rgba(14, 165, 233, 0.2)",
                color: darkMode ? "#a5b4fc" : "#0369a1",
                border: darkMode ? "1px solid #6366f1" : "1px solid #0ea5e9",
                borderRadius: 6,
                padding: "8px 14px",
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                📋 Copiar
              </button>
              <button onClick={exportAnalysis} style={{
                background: darkMode ? "rgba(99, 102, 241, 0.2)" : "rgba(14, 165, 233, 0.2)",
                color: darkMode ? "#a5b4fc" : "#0369a1",
                border: darkMode ? "1px solid #6366f1" : "1px solid #0ea5e9",
                borderRadius: 6,
                padding: "8px 14px",
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                💾 Exportar
              </button>
            </>
          )}
          <button onClick={generateInsight} disabled={loading || !entries.length} style={{
            background: !entries.length ? "#374151" : darkMode ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "linear-gradient(135deg, #0ea5e9, #06b6d4)",
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
            boxShadow: !entries.length ? "none" : darkMode ? "0 2px 8px rgba(99, 102, 241, 0.3)" : "0 2px 8px rgba(14, 165, 233, 0.3)"
          }}
          onMouseEnter={e => {
            if (!loading && entries.length) {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = darkMode ? "0 4px 12px rgba(99, 102, 241, 0.4)" : "0 4px 12px rgba(14, 165, 233, 0.4)";
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = !entries.length ? "none" : darkMode ? "0 2px 8px rgba(99, 102, 241, 0.3)" : "0 2px 8px rgba(14, 165, 233, 0.3)";
          }}>
            {loading ? "⏳ Analizando..." : "✨ Generar resumen"}
          </button>
        </div>
      </div>
      {!loading && !insight && entries.length > 0 && (
        <div style={{
          color: darkMode ? "#6366f1" : "#0369a1",
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          padding: "12px 0",
          opacity: 0.8
        }}>
          📊 Se analizarán {entries.length} HPPP{entries.length !== 1 ? 's' : ''} de {new Set(entries.map(e => e.name)).size} persona{new Set(entries.map(e => e.name)).size !== 1 ? 's' : ''}
        </div>
      )}
      {loading && (
        <div style={{
          color: darkMode ? "#c7d2fe" : "#0369a1",
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
      {typing && rawInsight && (
        <div style={{
          color: darkMode ? "#e0e7ff" : "#0c4a6e",
          fontFamily: "'Crimson Pro', serif",
          fontSize: 16,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          background: darkMode ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.6)",
          borderRadius: 10,
          padding: 16,
          border: darkMode ? "1px solid rgba(99, 102, 241, 0.2)" : "1px solid rgba(14, 165, 233, 0.2)",
          animation: "fadeIn 0.5s ease"
        }}>
          <TypingAnimation text={rawInsight} onComplete={() => setInsight(rawInsight)} />
          <span style={{ animation: "blink 1s infinite" }}>|</span>
        </div>
      )}
      {insight && !loading && !typing && (
        <div style={{
          color: darkMode ? "#e0e7ff" : "#0c4a6e",
          fontFamily: "'Crimson Pro', serif",
          fontSize: 16,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          background: darkMode ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.6)",
          borderRadius: 10,
          padding: 16,
          border: darkMode ? "1px solid rgba(99, 102, 241, 0.2)" : "1px solid rgba(14, 165, 233, 0.2)",
          animation: "fadeIn 0.5s ease"
        }}>
          {insight}
        </div>
      )}
      {!insight && !loading && (
        <div style={{
          color: darkMode ? "#6366f1" : "#0369a1",
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

function EntryCard({ entry, darkMode, onDeleteClick, onEditClick }: { entry: Entry; darkMode: boolean; onDeleteClick: (entry: Entry) => void; onEditClick: (entry: Entry) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? (darkMode ? "#1a1f35" : "#f1f5f9") : (darkMode ? "#0f172a" : "#ffffff"),
        border: isHovered ? (darkMode ? "1px solid #334155" : "1px solid #cbd5e1") : (darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0"),
        borderRadius: 14,
        padding: 20,
        marginBottom: 14,
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: isHovered ? (darkMode ? "0 4px 16px rgba(0, 0, 0, 0.3)" : "0 4px 16px rgba(0, 0, 0, 0.1)") : "none",
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
            <div style={{ color: darkMode ? "#f1f5f9" : "#0f172a", fontFamily: "'Crimson Pro', serif", fontSize: 17, fontWeight: 600 }}>{entry.name}</div>
            <div style={{ color: darkMode ? "#64748b" : "#94a3b8", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{entry.week} · {entry.date}</div>
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
            onClick={e => { e.stopPropagation(); onEditClick(entry); }}
            style={{
              background: "transparent",
              border: darkMode ? "1px solid #374151" : "1px solid #cbd5e1",
              borderRadius: 6,
              color: darkMode ? "#64748b" : "#94a3b8",
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              fontSize: 14,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = darkMode ? "#6366f1" : "#0ea5e9";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = darkMode ? "#6366f1" : "#0ea5e9";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = darkMode ? "#64748b" : "#94a3b8";
              e.currentTarget.style.borderColor = darkMode ? "#374151" : "#cbd5e1";
            }}
            title="Editar HPPP"
          >
            ✏️
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDeleteClick(entry); }}
            style={{
              background: "transparent",
              border: darkMode ? "1px solid #374151" : "1px solid #cbd5e1",
              borderRadius: 6,
              color: darkMode ? "#64748b" : "#94a3b8",
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
              e.currentTarget.style.color = darkMode ? "#64748b" : "#94a3b8";
              e.currentTarget.style.borderColor = darkMode ? "#374151" : "#cbd5e1";
            }}
          >
            ×
          </button>
          <span style={{
            color: darkMode ? "#475569" : "#94a3b8",
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
                background: darkMode ? "#1e293b" : "#f8fafc",
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
                color: darkMode ? "#cbd5e1" : "#334155",
                fontFamily: "'Crimson Pro', serif",
                fontSize: 15,
                lineHeight: 1.5
              }}>
                {entry[s.key as keyof Entry] || <span style={{ color: darkMode ? "#475569" : "#94a3b8", fontStyle: "italic" }}>—</span>}
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
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({ name: "", highlights: "", progress: "", problems: "", plans: "" });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [selectedPerson, setSelectedPerson] = useState<string>("all");
  const [shake, setShake] = useState(false);
  const [isFirstHPPP, setIsFirstHPPP] = useState(true);
  const [modal, setModal] = useState<Modal | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    // Filtrar entries por búsqueda, semana y persona
    let filtered = entries;

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedWeek !== "all") {
      filtered = filtered.filter(e => e.week === selectedWeek);
    }

    if (selectedPerson !== "all") {
      filtered = filtered.filter(e => e.name === selectedPerson);
    }

    setFilteredEntries(filtered);
  }, [entries, searchTerm, selectedWeek, selectedPerson]);

  useEffect(() => {
    // Keyboard shortcuts
    function handleKeyPress(e: KeyboardEvent) {
      // Ctrl/Cmd + Enter para enviar formulario
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && view === "form") {
        handleSubmit();
      }
      // Esc para limpiar formulario
      if (e.key === "Escape" && view === "form") {
        clearForm();
      }
      // Ctrl/Cmd + D para toggle dark mode
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        setDarkMode((d: boolean) => !d);
      }
    }

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [view, form]);

  async function loadEntries() {
    setLoading(true);
    setError("");
    try {
      const data = await sbFetch("hppp_entries?order=created_at.desc&limit=100");
      setEntries(data);
      if (data.length > 0) {
        setIsFirstHPPP(false);
      }
    } catch (err) {
      setError(`No se pudieron cargar los datos. ${err instanceof Error ? err.message : "Verificá tu conexión a Supabase."}`);
      showToast("Error al cargar datos", "error");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (view === "dashboard") loadEntries();
  }, [view]);

  // Cargar entries al iniciar la app para que el contador siempre esté actualizado
  useEffect(() => {
    loadEntries();
  }, []);

  function showToast(message: string, type: Toast["type"], action?: Toast["action"]) {
    const id = Date.now();
    setToasts((prev: Toast[]) => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts((prev: Toast[]) => prev.filter(t => t.id !== id));
    }, 6000);
  }

  function clearForm() {
    setForm({ name: "", highlights: "", progress: "", problems: "", plans: "" });
    nameInputRef.current?.focus();
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      showToast("Por favor ingresá tu nombre", "error");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      // Normalizar el nombre antes de guardar
      const normalizedName = normalizeName(form.name);

      if (editingEntry) {
        // Actualizar entry existente
        await sbFetch(`hppp_entries?id=eq.${editingEntry.id}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify({
            ...form,
            name: normalizedName,
            week: getWeekLabel(),
            date: new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }),
          }),
        });
        showToast("HPPP actualizado exitosamente! ✏️", "success", {
          label: "Ver Dashboard",
          onClick: () => setView("dashboard")
        });
        setEditingEntry(null);
      } else {
        // Crear nuevo entry
        await sbFetch("hppp_entries", {
          method: "POST",
          prefer: "return=minimal",
          body: JSON.stringify({
            ...form,
            name: normalizedName,
            week: getWeekLabel(),
            date: new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }),
          }),
        });

        // Confetti si es el primer HPPP
        if (isFirstHPPP) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          setIsFirstHPPP(false);
        }

        showToast("HPPP guardado exitosamente! 🎉", "success", {
          label: "Ver Dashboard",
          onClick: () => setView("dashboard")
        });
      }

      setForm({ name: "", highlights: "", progress: "", problems: "", plans: "" });

      // Recargar entries automáticamente
      await loadEntries();
    } catch {
      setError(editingEntry ? "Error al actualizar. Intentá de nuevo." : "Error al guardar. Intentá de nuevo.");
      showToast(editingEntry ? "Error al actualizar HPPP" : "Error al guardar HPPP", "error");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    try {
      await sbFetch(`hppp_entries?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
      setEntries(prev => prev.filter(e => e.id !== id));
      showToast("HPPP eliminado", "success");
    } catch {
      setError("No se pudo eliminar.");
      showToast("Error al eliminar", "error");
    }
  }

  const hasBlockers = filteredEntries.filter(e => e.problems?.trim());
  const uniqueBlockerNames = Array.from(new Set(hasBlockers.map(e => e.name)));
  const uniqueWeeks = Array.from(new Set(entries.map(e => e.week)));
  const uniqueParticipants = Array.from(new Set(entries.map(e => e.name)));

  const stats = {
    total: entries.length,
    blockers: entries.filter(e => e.problems?.trim()).length,
    withHighlights: entries.filter(e => e.highlights?.trim()).length,
    withPlans: entries.filter(e => e.plans?.trim()).length,
    participation: Math.round((uniqueParticipants.length / TEAM_MEMBERS.length) * 100)
  };

  // Calcular quién falta completar el HPPP esta semana
  const currentWeek = getWeekLabel();
  const completedThisWeekNormalized = entries
    .filter(e => e.week === currentWeek)
    .map(e => normalizeName(e.name));
  const missingThisWeek = TEAM_MEMBERS.filter(
    member => !completedThisWeekNormalized.includes(normalizeName(member))
  );

  // Función para exportar a CSV
  function exportToCSV() {
    const headers = ["Nombre", "Semana", "Fecha", "Highlights", "Progress", "Problems", "Plans"];
    const rows = entries.map(e => [
      e.name,
      e.week,
      e.date,
      e.highlights?.replace(/\n/g, " ") || "",
      e.progress?.replace(/\n/g, " ") || "",
      e.problems?.replace(/\n/g, " ") || "",
      e.plans?.replace(/\n/g, " ") || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hppp-tracker-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Datos exportados a CSV", "success");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: darkMode ? "#020817" : "#f8fafc",
      fontFamily: "'Space Mono', monospace",
      paddingBottom: 60,
      transition: "background 0.3s ease"
    }}>
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

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          #root {
            padding: 0 12px;
          }
        }
      `}</style>

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev: Toast[]) => prev.filter(t => t.id !== id))} />
      <ModalDialog modal={modal} darkMode={darkMode} />

      <div style={{
        background: darkMode ? "linear-gradient(180deg, #0a0f1e 0%, #020817 100%)" : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        borderBottom: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
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
                color: darkMode ? "#6366f1" : "#0ea5e9",
                fontSize: 11,
                letterSpacing: 3,
                marginBottom: 6,
                fontWeight: 700
              }}>
                TEAM STATUS
              </div>
              <div style={{
                color: darkMode ? "#f1f5f9" : "#0f172a",
                fontFamily: "'Crimson Pro', serif",
                fontSize: "clamp(24px, 5vw, 34px)",
                fontWeight: 600,
                lineHeight: 1.1
              }}>
                HPPP Tracker
              </div>
              <div style={{
                color: darkMode ? "#475569" : "#64748b",
                fontSize: 12,
                marginTop: 6
              }}>
                {getWeekLabel()} · {stats.total} HPPPs · {uniqueParticipants.length}/{TEAM_MEMBERS.length} del equipo ({stats.participation}%)
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => setDarkMode((d: boolean) => !d)}
                style={{
                  background: "transparent",
                  border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                  color: darkMode ? "#94a3b8" : "#64748b",
                  borderRadius: 8,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 16,
                  transition: "all 0.2s ease",
                  transform: "scale(1)"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                title="Toggle Dark Mode (Ctrl/Cmd+D)"
              >
                {darkMode ? "🌙" : "☀️"}
              </button>
              {(["form", "dashboard"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    background: view === v ? (darkMode ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "linear-gradient(135deg, #0ea5e9, #06b6d4)") : "transparent",
                    border: view === v ? (darkMode ? "1px solid #6366f1" : "1px solid #0ea5e9") : (darkMode ? "1px solid #334155" : "1px solid #cbd5e1"),
                    color: view === v ? "white" : (darkMode ? "#94a3b8" : "#64748b"),
                    borderRadius: 8,
                    padding: "10px 20px",
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    transition: "all 0.2s ease",
                    boxShadow: view === v ? (darkMode ? "0 2px 8px rgba(99, 102, 241, 0.3)" : "0 2px 8px rgba(14, 165, 233, 0.3)") : "none",
                    transform: "scale(1)"
                  }}
                  onMouseEnter={e => {
                    if (view !== v) {
                      e.currentTarget.style.borderColor = darkMode ? "#6366f1" : "#0ea5e9";
                      e.currentTarget.style.color = darkMode ? "#a5b4fc" : "#38bdf8";
                    }
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={e => {
                    if (view !== v) {
                      e.currentTarget.style.borderColor = darkMode ? "#334155" : "#cbd5e1";
                      e.currentTarget.style.color = darkMode ? "#94a3b8" : "#64748b";
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
            background: darkMode ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.05)",
            border: darkMode ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 20,
            color: darkMode ? "#fca5a5" : "#dc2626",
            fontSize: 13,
            display: "flex",
            alignItems: "start",
            gap: 10,
            animation: "fadeIn 0.3s ease"
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: darkMode ? "#f87171" : "#dc2626" }}>Error</div>
              <div>{error}</div>
            </div>
            <button
              onClick={() => setError("")}
              style={{
                background: "transparent",
                border: "none",
                color: darkMode ? "#fca5a5" : "#dc2626",
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
            {editingEntry && (
              <div style={{
                background: darkMode ? "rgba(99, 102, 241, 0.1)" : "rgba(14, 165, 233, 0.1)",
                border: darkMode ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(14, 165, 233, 0.3)",
                borderRadius: 12,
                padding: "14px 18px",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                animation: "fadeIn 0.3s ease"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✏️</span>
                  <div>
                    <div style={{
                      color: darkMode ? "#a5b4fc" : "#0369a1",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 13,
                      fontWeight: 600
                    }}>
                      Editando HPPP de {editingEntry.name}
                    </div>
                    <div style={{
                      color: darkMode ? "#6366f1" : "#0ea5e9",
                      fontSize: 11,
                      marginTop: 2
                    }}>
                      Modificá los campos y guardá los cambios
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingEntry(null);
                    setForm({ name: "", highlights: "", progress: "", problems: "", plans: "" });
                  }}
                  style={{
                    background: "transparent",
                    border: darkMode ? "1px solid #6366f1" : "1px solid #0ea5e9",
                    color: darkMode ? "#a5b4fc" : "#0369a1",
                    borderRadius: 6,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "'Space Mono', monospace",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = darkMode ? "rgba(99, 102, 241, 0.2)" : "rgba(14, 165, 233, 0.2)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Cancelar edición
                </button>
              </div>
            )}
            <div style={{ marginBottom: 24, animation: shake ? "shake 0.5s" : "none" }}>
              <label style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: 11, letterSpacing: 2, display: "block", marginBottom: 8 }}>TU NOMBRE</label>
              <select
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{
                  width: "100%",
                  background: darkMode ? "#0f172a" : "#ffffff",
                  border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                  borderRadius: 10,
                  padding: "12px 16px",
                  color: darkMode ? "#f1f5f9" : "#0f172a",
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 16,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "all 0.2s ease",
                  cursor: "pointer"
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = darkMode ? "#6366f1" : "#0ea5e9";
                  e.currentTarget.style.boxShadow = darkMode ? "0 0 0 3px rgba(99, 102, 241, 0.1)" : "0 0 0 3px rgba(14, 165, 233, 0.1)";
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = darkMode ? "#334155" : "#cbd5e1";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <option value="" disabled>Seleccioná tu nombre</option>
                {TEAM_MEMBERS.map(member => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
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
                    background: darkMode ? "#0f172a" : "#ffffff",
                    border: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
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
                    e.currentTarget.style.borderColor = darkMode ? "#1e293b" : "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ color: s.color, fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>
                    {s.emoji} {s.label.toUpperCase()}
                  </div>
                  <div style={{ color: darkMode ? "#475569" : "#64748b", fontSize: 12, marginBottom: 10, fontFamily: "'Crimson Pro', serif" }}>
                    {s.desc}
                  </div>
                  <textarea
                    value={form[s.key as keyof FormState]}
                    onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                    placeholder="Escribí aquí..."
                    rows={4}
                    style={{
                      width: "100%",
                      background: darkMode ? "#1e293b" : "#f8fafc",
                      border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: darkMode ? "#cbd5e1" : "#334155",
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
                      e.currentTarget.style.borderColor = darkMode ? "#334155" : "#cbd5e1";
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
                  background: form.name.trim() && !submitting ? (darkMode ? "linear-gradient(135deg, #6366f1, #06b6d4)" : "linear-gradient(135deg, #0ea5e9, #06b6d4)") : (darkMode ? "#1e293b" : "#e2e8f0"),
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
                  boxShadow: form.name.trim() ? (darkMode ? "0 4px 16px rgba(99, 102, 241, 0.3)" : "0 4px 16px rgba(14, 165, 233, 0.3)") : "none",
                  transform: "scale(1)",
                  opacity: !form.name.trim() || submitting ? 0.5 : 1
                }}
                onMouseEnter={e => {
                  if (form.name.trim() && !submitting) {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = darkMode ? "0 6px 20px rgba(99, 102, 241, 0.4)" : "0 6px 20px rgba(14, 165, 233, 0.4)";
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = form.name.trim() ? (darkMode ? "0 4px 16px rgba(99, 102, 241, 0.3)" : "0 4px 16px rgba(14, 165, 233, 0.3)") : "none";
                }}
              >
                {submitting ? (editingEntry ? "⏳ Actualizando..." : "⏳ Guardando...") : (editingEntry ? "💾 Guardar cambios (Ctrl+Enter)" : "✨ Enviar HPPP (Ctrl+Enter)")}
              </button>
              <button
                onClick={clearForm}
                style={{
                  background: "transparent",
                  border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                  color: darkMode ? "#94a3b8" : "#64748b",
                  borderRadius: 10,
                  padding: "14px 24px",
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 13,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                🗑️ Limpiar (Esc)
              </button>
            </div>
          </div>
        )}

        {view === "dashboard" && (
          <div>
            {/* Stats y filtros */}
            {selectedPerson !== "all" && (
              <div style={{
                background: darkMode ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.05)",
                border: darkMode ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
                animation: "fadeIn 0.3s ease"
              }}>
                <div style={{
                  color: darkMode ? "#a5b4fc" : "#4f46e5",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  marginBottom: 8,
                  fontWeight: 700
                }}>
                  HISTORIAL DE {selectedPerson.toUpperCase()}
                </div>
                <div style={{
                  color: darkMode ? "#c7d2fe" : "#6366f1",
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 14
                }}>
                  {filteredEntries.length} HPPP{filteredEntries.length !== 1 ? "s" : ""} registrado{filteredEntries.length !== 1 ? "s" : ""}
                  {filteredEntries.length > 0 && ` • ${filteredEntries.filter(e => e.problems?.trim()).length} con blockers`}
                </div>
              </div>
            )}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 24
            }}>
              <div style={{
                background: darkMode ? "#0f172a" : "#ffffff",
                border: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 16,
                textAlign: "center"
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>📊</div>
                <div style={{ color: darkMode ? "#6366f1" : "#0ea5e9", fontSize: 20, fontWeight: 700 }}>{stats.total}</div>
                <div style={{ color: darkMode ? "#64748b" : "#94a3b8", fontSize: 11 }}>Total HPPPs</div>
              </div>
              <div style={{
                background: darkMode ? "#0f172a" : "#ffffff",
                border: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 16,
                textAlign: "center"
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🚧</div>
                <div style={{ color: "#EF4444", fontSize: 20, fontWeight: 700 }}>{stats.blockers}</div>
                <div style={{ color: darkMode ? "#64748b" : "#94a3b8", fontSize: 11 }}>Con Blockers</div>
              </div>
              <div style={{
                background: darkMode ? "#0f172a" : "#ffffff",
                border: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 16,
                textAlign: "center"
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>⚡</div>
                <div style={{ color: "#F59E0B", fontSize: 20, fontWeight: 700 }}>{stats.withHighlights}</div>
                <div style={{ color: darkMode ? "#64748b" : "#94a3b8", fontSize: 11 }}>Con Highlights</div>
              </div>
              <div style={{
                background: darkMode ? "#0f172a" : "#ffffff",
                border: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 16,
                textAlign: "center"
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🗓️</div>
                <div style={{ color: "#6366F1", fontSize: 20, fontWeight: 700 }}>{stats.withPlans}</div>
                <div style={{ color: darkMode ? "#64748b" : "#94a3b8", fontSize: 11 }}>Con Planes</div>
              </div>
            </div>

            {/* Indicador de quién falta completar HPPP esta semana */}
            {missingThisWeek.length > 0 && (
              <div style={{
                background: darkMode ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.05)",
                border: darkMode ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: 12,
                padding: "14px 20px",
                marginBottom: 20,
                animation: "fadeIn 0.3s ease"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>⏳</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: darkMode ? "#fbbf24" : "#d97706",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      letterSpacing: 2,
                      marginBottom: 6,
                      fontWeight: 700
                    }}>
                      PENDIENTES ESTA SEMANA ({missingThisWeek.length}/{TEAM_MEMBERS.length})
                    </div>
                    <div style={{
                      color: darkMode ? "#fcd34d" : "#b45309",
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 15,
                      lineHeight: 1.5
                    }}>
                      {missingThisWeek.length === TEAM_MEMBERS.length ? (
                        "Nadie ha completado su HPPP esta semana todavía"
                      ) : (
                        <>
                          Falta{missingThisWeek.length > 1 ? "n" : ""}: <strong>{missingThisWeek.join(", ")}</strong>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HPPPs completados esta semana */}
            {completedThisWeekNormalized.length > 0 && missingThisWeek.length < TEAM_MEMBERS.length && (
              <div style={{
                background: darkMode ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.05)",
                border: darkMode ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: 12,
                padding: "14px 20px",
                marginBottom: 20,
                animation: "fadeIn 0.3s ease"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: darkMode ? "#34d399" : "#059669",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      letterSpacing: 2,
                      marginBottom: 6,
                      fontWeight: 700
                    }}>
                      COMPLETADOS ESTA SEMANA ({completedThisWeekNormalized.length}/{TEAM_MEMBERS.length})
                    </div>
                    <div style={{
                      color: darkMode ? "#6ee7b7" : "#047857",
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 15,
                      lineHeight: 1.5
                    }}>
                      {entries
                        .filter(e => e.week === currentWeek)
                        .map(e => e.name)
                        .join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros */}
            <div style={{
              display: "flex",
              gap: 12,
              marginBottom: 24,
              flexWrap: "wrap",
              alignItems: "center"
            }}>
              <input
                type="text"
                placeholder="🔍 Buscar por nombre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 200,
                  background: darkMode ? "#0f172a" : "#ffffff",
                  border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "10px 16px",
                  color: darkMode ? "#f1f5f9" : "#0f172a",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 13,
                  outline: "none",
                  transition: "all 0.2s ease"
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = darkMode ? "#6366f1" : "#0ea5e9";
                  e.currentTarget.style.boxShadow = darkMode ? "0 0 0 3px rgba(99, 102, 241, 0.1)" : "0 0 0 3px rgba(14, 165, 233, 0.1)";
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = darkMode ? "#334155" : "#cbd5e1";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <select
                value={selectedPerson}
                onChange={e => setSelectedPerson(e.target.value)}
                style={{
                  background: darkMode ? "#0f172a" : "#ffffff",
                  border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "10px 16px",
                  color: darkMode ? "#f1f5f9" : "#0f172a",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 13,
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">👥 Todas las personas</option>
                {TEAM_MEMBERS.map(member => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
              <select
                value={selectedWeek}
                onChange={e => setSelectedWeek(e.target.value)}
                style={{
                  background: darkMode ? "#0f172a" : "#ffffff",
                  border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "10px 16px",
                  color: darkMode ? "#f1f5f9" : "#0f172a",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 13,
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">📅 Todas las semanas</option>
                {uniqueWeeks.map(week => (
                  <option key={week} value={week}>{week}</option>
                ))}
              </select>
              <button
                onClick={exportToCSV}
                disabled={entries.length === 0}
                style={{
                  background: entries.length === 0 ? (darkMode ? "#1e293b" : "#e2e8f0") : (darkMode ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)"),
                  border: entries.length === 0 ? (darkMode ? "1px solid #334155" : "1px solid #cbd5e1") : (darkMode ? "1px solid #10b981" : "1px solid #10b981"),
                  color: entries.length === 0 ? (darkMode ? "#475569" : "#94a3b8") : (darkMode ? "#34d399" : "#059669"),
                  borderRadius: 8,
                  padding: "10px 16px",
                  cursor: entries.length === 0 ? "not-allowed" : "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 13,
                  transition: "all 0.2s ease",
                  opacity: entries.length === 0 ? 0.5 : 1,
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={e => {
                  if (entries.length > 0) {
                    e.currentTarget.style.background = darkMode ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.15)";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = entries.length === 0 ? (darkMode ? "#1e293b" : "#e2e8f0") : (darkMode ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)");
                  e.currentTarget.style.transform = "scale(1)";
                }}
                title="Exportar todos los datos a CSV"
              >
                📥 Exportar CSV
              </button>
              {(searchTerm || selectedPerson !== "all" || selectedWeek !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedPerson("all");
                    setSelectedWeek("all");
                  }}
                  style={{
                    background: "transparent",
                    border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                    color: darkMode ? "#94a3b8" : "#64748b",
                    borderRadius: 8,
                    padding: "10px 16px",
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = darkMode ? "#1e293b" : "#f8fafc";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  title="Limpiar todos los filtros"
                >
                  🔄 Limpiar filtros
                </button>
              )}
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : (
              <>
                {hasBlockers.length > 0 && (
                  <div style={{
                    background: darkMode ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)",
                    border: darkMode ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 12,
                    padding: "14px 20px",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}>
                    <span style={{ fontSize: 20 }}>🚧</span>
                    <div>
                      <span style={{ color: darkMode ? "#fca5a5" : "#dc2626", fontSize: 12, letterSpacing: 1 }}>BLOCKERS ACTIVOS — </span>
                      <span style={{ color: darkMode ? "#f87171" : "#dc2626", fontFamily: "'Crimson Pro', serif", fontSize: 15 }}>
                        {uniqueBlockerNames.join(", ")} {uniqueBlockerNames.length === 1 ? "tiene" : "tienen"} problemas reportados
                      </span>
                    </div>
                  </div>
                )}
                {filteredEntries.length === 0 && entries.length > 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    color: darkMode ? "#334155" : "#94a3b8"
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                    <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 20 }}>No se encontraron resultados</div>
                    <div style={{ fontSize: 13, marginTop: 8 }}>Probá con otro término de búsqueda o semana</div>
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "80px 20px",
                    color: darkMode ? "#334155" : "#94a3b8",
                    animation: "fadeIn 0.5s ease"
                  }}>
                    <div style={{ fontSize: 64, marginBottom: 20, opacity: 0.6 }}>📭</div>
                    <div style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 24,
                      color: darkMode ? "#64748b" : "#64748b",
                      marginBottom: 12,
                      fontWeight: 600
                    }}>
                      Todavía no hay HPPPs cargados
                    </div>
                    <div style={{ fontSize: 14, color: darkMode ? "#475569" : "#64748b", marginBottom: 24 }}>
                      Compartí el link al equipo para que carguen el suyo
                    </div>
                    <button
                      onClick={() => setView("form")}
                      style={{
                        background: darkMode ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "12px 24px",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 12,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: darkMode ? "0 4px 16px rgba(99, 102, 241, 0.3)" : "0 4px 16px rgba(14, 165, 233, 0.3)"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.boxShadow = darkMode ? "0 6px 20px rgba(99, 102, 241, 0.4)" : "0 6px 20px rgba(14, 165, 233, 0.4)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = darkMode ? "0 4px 16px rgba(99, 102, 241, 0.3)" : "0 4px 16px rgba(14, 165, 233, 0.3)";
                      }}
                    >
                      ✨ Cargar el primero
                    </button>
                  </div>
                ) : (
                  filteredEntries.map(e => <EntryCard
                    key={e.id}
                    entry={e}
                    darkMode={darkMode}
                    onEditClick={(entry) => {
                      setEditingEntry(entry);
                      setForm({
                        name: entry.name,
                        highlights: entry.highlights,
                        progress: entry.progress,
                        problems: entry.problems,
                        plans: entry.plans
                      });
                      setView("form");
                      setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }, 100);
                    }}
                    onDeleteClick={(entry) => {
                      setModal({
                        title: "Eliminar HPPP",
                        message: `¿Estás seguro que querés eliminar el HPPP de ${entry.name}? Esta acción no se puede deshacer.`,
                        type: "danger",
                        confirmText: "Eliminar",
                        cancelText: "Cancelar",
                        onConfirm: () => {
                          handleDelete(entry.id);
                          setModal(null);
                        },
                        onCancel: () => setModal(null)
                      });
                    }}
                  />)
                )}
                {entries.length > 0 && <AIInsights entries={filteredEntries} darkMode={darkMode} />}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
