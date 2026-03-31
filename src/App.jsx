import { useState, useEffect, useCallback, useRef } from "react";

const MIN_MS = 10 * 60 * 1000;      // 10 minutos
const MAX_MS = 2 * 60 * 60 * 1000;  // 2 horas
const WARN_MS = 5 * 60 * 1000;      // últimos 5 minutos (aviso)

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const SEED = {
  clients: [
    { id: "c1", nome: "Cliente1" },
    { id: "c2", nome: "Cliente2" },
    { id: "c3", nome: "Cliente3" },
    { id: "c4", nome: "Cliente4" },
  ],
  tokens: [
    { id: "t1", nome: "VPN 1", clientId: "c1", status: "livre", consultorId: null, loginVPN: "cli1_vpn1", senhaVPN: "Abc@1234", startTime: null, durationMs: null, expiresAt: null },
    { id: "t2", nome: "VPN 2", clientId: "c1", status: "livre", consultorId: null, loginVPN: "cli1_vpn2", senhaVPN: "Abc@4234", startTime: null, durationMs: null, expiresAt: null },
    { id: "t3", nome: "VPN 3", clientId: "c1", status: "livre", consultorId: null, loginVPN: "cli1_vpn3", senhaVPN: "Abc@4125", startTime: null, durationMs: null, expiresAt: null },
    { id: "t4", nome: "VPN 1", clientId: "c2", status: "livre", consultorId: null, loginVPN: "cli2_vpn1", senhaVPN: "Def@1111", startTime: null, durationMs: null, expiresAt: null },
    { id: "t5", nome: "VPN 2", clientId: "c2", status: "livre", consultorId: null, loginVPN: "cli2_vpn2", senhaVPN: "Def@2222", startTime: null, durationMs: null, expiresAt: null },
    { id: "t6", nome: "VPN 1", clientId: "c3", status: "livre", consultorId: null, loginVPN: "cli3_vpn1", senhaVPN: "Ghi@3333", startTime: null, durationMs: null, expiresAt: null  },
    { id: "t7", nome: "VPN 1", clientId: "c4", status: "livre", consultorId: null, loginVPN: "cli4_vpn1", senhaVPN: "Jkl@4444", startTime: null, durationMs: null, expiresAt: null  },
  ],
  consultants: [
    { id: "cn1", nome: "João Silva", clientId: "c1" },
    { id: "cn2", nome: "Maria Santos", clientId: "c1" },
    { id: "cn3", nome: "Pedro Oliveira", clientId: "c2" },
    { id: "cn4", nome: "Ana Costa", clientId: "c3" },
    { id: "cn5", nome: "Carlos Lima", clientId: "c4" },
    { id: "cn6", nome: "Bruno", clientId: "c1" }
  ],
  users: [
    { id: "admin", username: "admin", password: "admin123", role: "admin", nome: "Administrador", consultorId: null },
    { id: "u1", username: "joao", password: "123456", role: "consultant", nome: "João Silva", consultorId: "cn1" },
    { id: "u2", username: "maria", password: "123456", role: "consultant", nome: "Maria Santos", consultorId: "cn2" },
    { id: "u3", username: "pedro", password: "123456", role: "consultant", nome: "Pedro Oliveira", consultorId: "cn3" },
    { id: "u4", username: "ana", password: "123456", role: "consultant", nome: "Ana Costa", consultorId: "cn4" },
    { id: "u5", username: "carlos", password: "123456", role: "consultant", nome: "Carlos Lima", consultorId: "cn5" },
    { id: "u6", username: "bruno", password: "123456", role: "consultant", nome: "Bruno", consultorId: "cn6" },
    { id: "u7", username: "mat", password: "123456", role: "consultant", nome: "Mateus", consultorId: "cn7" },
  ],
  
  logs: [],

  sapAccesses: [],
};

const db = {
  get: async (k) => {
    try {
      const r = localStorage.getItem("vpn:" + k);
      return r ? JSON.parse(r) : null;
    } catch {
      return null;
    }
  },
  set: async (k, v) => {
    try {
      localStorage.setItem("vpn:" + k, JSON.stringify(v));
    } catch {}
  },
};


const fmtMs = (ms) => {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const fmtDate = (iso) => iso ? new Date(iso).toLocaleString("pt-BR") : "—";

const fmtDur = (a, b) => {
  if (!a || !b) return "—";
  const ms = new Date(b) - new Date(a), h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}min`;
};

const K = {
  bg: "#0f172a", card: "#1e293b", card2: "#263347", border: "#334155",
  text: "#f1f5f9", muted: "#94a3b8", dim: "#64748b",
  green: "#10b981", red: "#ef4444", yellow: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6",
};

const btn = (bg, extra = {}) => ({
  background: bg, color: "white", border: "none", borderRadius: "8px",
  padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontWeight: "600",
  transition: "filter 0.15s", ...extra,
});

const inp = (extra = {}) => ({
  background: K.bg, border: `1px solid ${K.border}`, borderRadius: "8px",
  color: "#e2e8f0", padding: "10px 14px", fontSize: "14px", boxSizing: "border-box", outline: "none", ...extra,
});

function useRemaining(expiresAt) {
  const [rem, setRem] = useState(null);

  useEffect(() => {
    if (!expiresAt) {
      setRem(null);
      return;
    }
    const tick = () => setRem(expiresAt - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return rem;
}

function Toast({ toast }) {
  if (!toast) return null;
  const colors = { success: K.green, error: K.red, info: K.blue };

  return (
    <div style={{
      position: "absolute", top: "80px", right: "20px", zIndex: 200,
      background: colors[toast.type] || K.blue, color: "white", borderRadius: "10px",
      padding: "12px 20px", fontSize: "14px", fontWeight: "600",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)", maxWidth: "320px",
    }}>
      {toast.message}
    </div>
  );
}

function WarningModal({ token, remainingMs, onRenew, onClose }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 150,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: K.card,
          border: `2px solid ${K.yellow}`,
          borderRadius: "20px",
          padding: "36px",
          maxWidth: "440px",
          width: "92%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "10px" }}>⚠️</div>

        <h2 style={{ color: K.yellow, margin: "0 0 10px", fontSize: "18px" }}>
          Tempo de VPN quase acabando!
        </h2>

        <p style={{ color: K.muted, margin: "0 0 6px", fontSize: "14px" }}>
          Sua sessão na <strong style={{ color: K.text }}>{token?.nome}</strong> expira em:
        </p>

        <div
          style={{
            fontSize: "38px",
            fontFamily: "monospace",
            color: K.yellow,
            fontWeight: "800",
            margin: "10px 0 14px",
          }}
        >
          {fmtMs(Math.max(0, remainingMs))}
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onRenew} style={btn(K.green, { padding: "10px 18px" })}>
            🔄 Renovar
          </button>
          <button onClick={onClose} style={btn(K.dim, { padding: "10px 18px" })}>
            Fechar
          </button>
        </div>

        <p style={{ color: K.dim, fontSize: "12px", marginTop: "14px" }}>
          Se você fechar, a VPN será liberada automaticamente ao final do tempo.
        </p>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 150,
      background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: K.card, border: `1px solid ${K.border}`, borderRadius: "16px",
        padding: "32px", maxWidth: "380px", width: "90%", textAlign: "center",
      }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
        <p style={{ color: K.text, fontSize: "15px", marginBottom: "24px" }}>{message}</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button onClick={onConfirm} style={btn(K.red, { padding: "10px 24px" })}>Confirmar</button>
          <button onClick={onCancel} style={btn(K.dim, { padding: "10px 24px" })}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}


function DurationModal({ title, initialMinutes = 120, onConfirm, onCancel }) {
  const [minutes, setMinutes] = useState(initialMinutes);

  const clamp = (m) => Math.max(10, Math.min(120, Number(m) || 10));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 160,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: K.card,
          border: `1px solid ${K.border}`,
          borderRadius: "16px",
          padding: "24px",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <h3 style={{ margin: "0 0 10px", color: K.text }}>{title}</h3>
        <p style={{ margin: "0 0 16px", color: K.dim, fontSize: "13px" }}>
          Selecione o tempo de uso (10 min até 2h).
        </p>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(clamp(e.target.value))}
            style={{ flex: 1 }}
          />
          <input
            style={inp({ width: "90px", textAlign: "center" })}
            value={minutes}
            onChange={(e) => setMinutes(clamp(e.target.value))}
          />
          <span style={{ color: K.muted, fontSize: "12px" }}>min</span>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onCancel} style={btn(K.dim, { padding: "8px 14px" })}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(clamp(minutes))} style={btn(K.blue, { padding: "8px 14px" })}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}


function Navbar({ user, onLogout }) {
  return (
    <div style={{
      background: K.card, borderBottom: `1px solid ${K.border}`,
      padding: "0 24px", display: "flex", alignItems: "center",
      justifyContent: "space-between", height: "60px", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "22px" }}>🛡️</span>
        <span style={{ color: K.text, fontWeight: "700", fontSize: "17px" }}>VPN Manager</span>
        {user.role === "admin" && (
          <span style={{
            background: K.purple, color: "white", fontSize: "10px", fontWeight: "700",
            padding: "2px 8px", borderRadius: "99px", letterSpacing: "0.08em",
          }}>ADMIN</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <span style={{ color: K.muted, fontSize: "13px" }}>
          Olá, <strong style={{ color: K.text }}>{user.nome}</strong>
        </span>
        <button onClick={onLogout} style={btn("#374151", { padding: "6px 14px", fontSize: "12px" })}>
          Sair
        </button>
      </div>
    </div>
  );
}

function LoginPage({ users, onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    const u = users.find((u) => u.username === form.username.trim() && u.password === form.password);
    if (u) onLogin(u);
    else setErr("Usuário ou senha incorretos.");
  };

  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        background: K.card, borderRadius: "20px", padding: "48px 40px",
        width: "100%", maxWidth: "400px", border: `1px solid ${K.border}`,
      }}>
        
<div style={{ textAlign: "center", marginBottom: "36px" }}>
  <div style={{ fontSize: "52px", marginBottom: "12px" }}>🛡️</div>
  <h1 style={{ color: K.text, margin: "0 0 6px", fontSize: "24px", fontWeight: "700" }}>
    VPN Manager
  </h1>

  <p style={{ color: K.dim, margin: 0, fontSize: "13px" }}>
    Sistema de Gerenciamento de Tokens VPN
  </p>
</div>


        {[["username", "USUÁRIO", "text", "Digite seu usuário"], ["password", "SENHA", "password", "••••••••"]].map(([k, label, type, ph]) => (
          <div key={k} style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", color: K.muted, fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "8px" }}>{label}</label>
            <input
              style={inp({ width: "100%" })}
              type={type}
              value={form[k]}
              placeholder={ph}
              onChange={upd(k)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        ))}

        {err && <p style={{ color: K.red, textAlign: "center", marginBottom: "12px", fontSize: "13px" }}>{err}</p>}

        <button style={btn(K.blue, { width: "100%", padding: "13px", fontSize: "15px" })} onClick={submit}>
          Entrar →
        </button>

        <div style={{ marginTop: "24px", background: K.bg, borderRadius: "10px", padding: "14px", fontSize: "12px" }}>
          <div style={{ color: K.dim, fontWeight: "700", letterSpacing: "0.06em", marginBottom: "8px" }}>NTT Data BS</div>
          <div style={{ color: K.dim }}> <span style={{ color: K.blue, fontFamily: "monospace" }}>lds © 2026</span></div>
        </div>
      </div>
    </div>
  );
}

function TokenCard({ token, consultant, myConsultorId, isAdmin, onReserve, onRelease }) {
  const rem = useRemaining(token.status === "ocupado" ? token.expiresAt : null);
  const isFree = token.status === "livre";
  const isWarning = rem !== null && rem > 0 && rem <= WARN_MS;
  const isExpired = rem !== null && rem <= 0;
  const isMyToken = token.consultorId === myConsultorId;

  const borderColor = isFree ? K.green : isWarning ? K.yellow : K.red;

  return (
    <div
      style={{
        background: isFree ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)",
        border: `1px solid ${borderColor}`,
        borderRadius: "12px",
        padding: "16px",
        minWidth: "195px",
        flex: "1",
        maxWidth: "260px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: isFree ? K.green : K.red,
        }}
      />

      <div style={{ fontWeight: "700", color: K.text, fontSize: "14px", marginBottom: "10px" }}>
        {token.nome}
      </div>

      {isFree ? (
        <>
          {/* ✅ NÃO mostrar login/senha quando estiver livre */}
          <div style={{ color: K.green, fontSize: "12px", fontWeight: "600", marginBottom: "10px" }}>
            🟢 Livre
          </div>

          {/* Consultor vê apenas o botão para reservar */}
          {!isAdmin && (
            <>
              <div style={{ color: K.dim, fontSize: "12px", marginBottom: "10px" }}>
                🔒 Login e senha serão exibidos apenas enquanto você estiver usando a VPN.
              </div>

              <button
                onClick={() => onReserve(token)}
                style={btn(K.green, { padding: "6px 14px", fontSize: "12px" })}
              >
                🔐 Usar VPN
              </button>
            </>
          )}

          {/* Admin: por segurança, também não mostra credenciais quando livre.
              Se você quiser que admin veja quando livre, eu ajusto, mas sua regra atual é "só quando estiver usando". */}
        </>
      ) : (
        <>
          <div style={{ color: isWarning ? K.yellow : K.red, fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
            🔴 Ocupado
          </div>

          <div style={{ fontSize: "12px", color: K.muted, marginBottom: "6px" }}>
            Por: <strong style={{ color: K.text }}>{consultant?.nome || "—"}</strong>
          </div>

          {rem !== null && (
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                marginBottom: "10px",
                color: isExpired ? K.red : isWarning ? K.yellow : K.muted,
              }}
            >
              {isExpired ? "⚠️ EXPIRADO" : `⏱ ${fmtMs(rem)}`}
            </div>
          )}

          {/* ✅ Só o consultor dono da sessão vê login/senha */}
          {!isAdmin && isMyToken && (
            <>
              <div style={{ fontSize: "11px", color: K.dim, marginBottom: "2px" }}>Login VPN</div>
              <div style={{ fontFamily: "monospace", color: K.green, fontSize: "13px", marginBottom: "8px" }}>
                {token.loginVPN}
              </div>

              <div style={{ fontSize: "11px", color: K.dim, marginBottom: "2px" }}>Senha VPN</div>
              <div style={{ fontFamily: "monospace", color: K.green, fontSize: "13px", marginBottom: "10px" }}>
                {token.senhaVPN}
              </div>
            </>
          )}

          {(isMyToken || isAdmin) && (
            <button
              onClick={() => onRelease(token)}
              style={btn(K.red, { padding: "6px 14px", fontSize: "12px" })}
            >
              🔓 Liberar
            </button>
          )}
        </>
      )}
    </div>
  );
}

function OverviewTab({ data, onRelease }) {
  const free = data.tokens.filter((t) => t.status === "livre").length;
  const busy = data.tokens.filter((t) => t.status === "ocupado").length;
  const stats = [
    { label: "Clientes", val: data.clients.length, color: K.blue, icon: "🏢" },
    { label: "Tokens Livres", val: free, color: K.green, icon: "🟢" },
    { label: "Tokens em Uso", val: busy, color: K.red, icon: "🔴" },
    { label: "Consultores", val: data.consultants.length, color: K.purple, icon: "👥" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "14px", marginBottom: "28px" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: K.card, borderRadius: "12px", padding: "18px", border: `1px solid ${K.border}` }}>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>{s.icon}</div>
            <div style={{ fontSize: "30px", fontWeight: "700", color: s.color }}>{s.val}</div>
            <div style={{ color: K.muted, fontSize: "12px", marginTop: "4px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {data.clients.map((client) => {
        const clientTokens = data.tokens.filter((t) => t.clientId === client.id);
        const freeCount = clientTokens.filter((t) => t.status === "livre").length;

        return (
          <div key={client.id} style={{ background: K.card, borderRadius: "12px", padding: "22px", border: `1px solid ${K.border}`, marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span style={{ color: K.text, fontWeight: "700", fontSize: "15px" }}>🏢 {client.nome}</span>
              <span style={{
                background: freeCount === 0 ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                color: freeCount === 0 ? K.red : K.green,
                fontSize: "11px", fontWeight: "700", padding: "2px 10px", borderRadius: "99px",
              }}>
                {freeCount} livre{freeCount !== 1 ? "s" : ""} / {clientTokens.length} total
              </span>
            </div>

            {clientTokens.length === 0 ? (
              <p style={{ color: K.dim, margin: 0, fontSize: "13px" }}>Nenhum token cadastrado.</p>
            ) : freeCount === 0 ? (
              <div style={{ marginBottom: "12px" }}>
                <span style={{ color: K.red, fontSize: "13px", fontWeight: "600" }}>
                  🔴 Todas as VPNs estão em uso
                </span>
              </div>
            ) : null}

            <div className="token-grid">
              {clientTokens.map((token) => {
                const cons = data.consultants.find((c) => c.id === token.consultorId);
                return (
                  <TokenCard
                    key={token.id}
                    token={token}
                    consultant={cons}
                    myConsultorId={null}
                    isAdmin={true}
                    onReserve={() => {}}
                    onRelease={onRelease}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClientsTab({ data, onSave, showToast, setConfirm }) {
  const [nome, setNome] = useState("");

  const addClient = () => {
    if (!nome.trim()) return;
    if (data.clients.find((c) => c.nome.toLowerCase() === nome.trim().toLowerCase())) {
      showToast("Cliente já existe.", "error");
      return;
    }
    const newClient = { id: "c" + genId(), nome: nome.trim() };
    onSave("clients", [...data.clients, newClient]);
    setNome("");
    showToast("Cliente adicionado!", "success");
  };

  const removeClient = (client) => {
    setConfirm({
      message: `Remover "${client.nome}" e todos os seus tokens e consultores?`,
      onConfirm: () => {
        onSave("sapAccesses", (data.sapAccesses || []).filter((a) => a.clientId !== client.id));
        onSave("clients", data.clients.filter((c) => c.id !== client.id));
        onSave("tokens", data.tokens.filter((t) => t.clientId !== client.id));
        onSave("consultants", data.consultants.filter((c) => c.clientId !== client.id));
        onSave("users", data.users.filter((u) => {
          const cons = data.consultants.find((c) => c.id === u.consultorId);
          return !cons || cons.clientId !== client.id;
        }));
        showToast("Cliente removido.", "success");
      }
    });
  };

  return (
    <div>
      <div style={{ background: K.card, borderRadius: "12px", padding: "22px", border: `1px solid ${K.border}`, marginBottom: "20px" }}>
        <h3 style={{ color: K.text, margin: "0 0 16px", fontSize: "15px" }}>Adicionar Novo Cliente</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            style={inp({ flex: 1 })}
            placeholder="Nome do cliente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addClient()}
          />
          <button style={btn(K.blue)} onClick={addClient}>+ Adicionar</button>
        </div>
      </div>

      <div style={{ background: K.card, borderRadius: "12px", border: `1px solid ${K.border}`, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${K.border}` }}>
          <span style={{ color: K.muted, fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em" }}>
            CLIENTES CADASTRADOS ({data.clients.length})
          </span>
        </div>

        {data.clients.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: K.dim }}>Nenhum cliente cadastrado.</div>
        ) : data.clients.map((client, i) => {
          const tokenCount = data.tokens.filter((t) => t.clientId === client.id).length;
          const consCount = data.consultants.filter((c) => c.clientId === client.id).length;
          return (
            <div key={client.id} style={{
              display: "flex", alignItems: "center", padding: "16px 22px",
              borderBottom: i < data.clients.length - 1 ? `1px solid ${K.border}` : "none",
            }}>
              <div style={{ fontSize: "18px", marginRight: "12px" }}>🏢</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: K.text, fontWeight: "600", fontSize: "14px" }}>{client.nome}</div>
                <div style={{ color: K.dim, fontSize: "12px", marginTop: "2px" }}>
                  {tokenCount} token{tokenCount !== 1 ? "s" : ""} · {consCount} consultor{consCount !== 1 ? "es" : ""}
                </div>
              </div>
              <button onClick={() => removeClient(client)} style={btn(K.red, { padding: "6px 12px", fontSize: "12px" })}>
                Remover
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TokensTab({ data, onSave, showToast, setConfirm }) {
  const [form, setForm] = useState({ nome: "", clientId: "", loginVPN: "", senhaVPN: "" });
  const [filter, setFilter] = useState("");

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addToken = () => {
    if (!form.nome.trim() || !form.clientId || !form.loginVPN.trim() || !form.senhaVPN.trim()) {
      showToast("Preencha todos os campos.", "error");
      return;
    }
    const newToken = {
      id: "t" + genId(), nome: form.nome.trim(), clientId: form.clientId,
      status: "livre", consultorId: null, loginVPN: form.loginVPN.trim(),
      senhaVPN: form.senhaVPN.trim(), startTime: null,
    };
    onSave("tokens", [...data.tokens, newToken]);
    setForm({ nome: "", clientId: form.clientId, loginVPN: "", senhaVPN: "" });
    showToast("Token adicionado!", "success");
  };

  const removeToken = (token) => {
    if (token.status === "ocupado") {
      showToast("Libere o token antes de removê-lo.", "error");
      return;
    }
    setConfirm({
      message: `Remover o token "${token.nome}"?`,
      onConfirm: () => {
        onSave("tokens", data.tokens.filter((t) => t.id !== token.id));
        showToast("Token removido.", "success");
      }
    });
  };

  const filtered = data.clients.filter((c) => !filter || c.nome.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <div style={{ background: K.card, borderRadius: "12px", padding: "22px", border: `1px solid ${K.border}`, marginBottom: "20px" }}>
        <h3 style={{ color: K.text, margin: "0 0 16px", fontSize: "15px" }}>Adicionar Novo Token VPN</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          <div>
            <label style={{ display: "block", color: K.muted, fontSize: "11px", fontWeight: "700", marginBottom: "6px" }}>NOME DO TOKEN</label>
            <input style={inp({ width: "100%" })} placeholder="ex: VPN 1" value={form.nome} onChange={upd("nome")} />
          </div>
          <div>
            <label style={{ display: "block", color: K.muted, fontSize: "11px", fontWeight: "700", marginBottom: "6px" }}>CLIENTE</label>
            <select style={inp({ width: "100%" })} value={form.clientId} onChange={upd("clientId")}>
              <option value="">Selecione...</option>
              {data.clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", color: K.muted, fontSize: "11px", fontWeight: "700", marginBottom: "6px" }}>LOGIN VPN</label>
            <input style={inp({ width: "100%" })} placeholder="Login de acesso" value={form.loginVPN} onChange={upd("loginVPN")} />
          </div>
          <div>
            <label style={{ display: "block", color: K.muted, fontSize: "11px", fontWeight: "700", marginBottom: "6px" }}>SENHA VPN</label>
            <input style={inp({ width: "100%" })} placeholder="Senha de acesso" value={form.senhaVPN} onChange={upd("senhaVPN")} />
          </div>
        </div>
        <button style={btn(K.blue)} onClick={addToken}>+ Adicionar Token</button>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <input
          style={inp({ width: "100%", maxWidth: "320px" })}
          placeholder="🔍 Filtrar por cliente..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {filtered.map((client) => {
        const clientTokens = data.tokens.filter((t) => t.clientId === client.id);
        return (
          <div key={client.id} style={{ background: K.card, borderRadius: "12px", border: `1px solid ${K.border}`, marginBottom: "16px", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.border}`, display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: K.text, fontWeight: "700", fontSize: "14px" }}>🏢 {client.nome}</span>
              <span style={{ color: K.dim, fontSize: "12px" }}>({clientTokens.length} token{clientTokens.length !== 1 ? "s" : ""})</span>
            </div>

            {clientTokens.length === 0 ? (
              <div style={{ padding: "20px", color: K.dim, fontSize: "13px" }}>Nenhum token.</div>
            ) : clientTokens.map((token, i) => {
              const cons = data.consultants.find((c) => c.id === token.consultorId);
              return (
                <div key={token.id} style={{
                  display: "flex", alignItems: "center", padding: "14px 20px",
                  borderBottom: i < clientTokens.length - 1 ? `1px solid ${K.border}` : "none",
                }}>
                  <div style={{
                    width: "10px", height: "10px", borderRadius: "50%",
                    background: token.status === "livre" ? K.green : K.red, marginRight: "14px", flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ color: K.text, fontWeight: "600", fontSize: "14px" }}>{token.nome}</span>
                    {token.status === "livre" ? (
                      <span style={{ color: K.dim, fontSize: "12px", marginLeft: "12px" }}>
                        {token.loginVPN} / {token.senhaVPN}
                      </span>
                    ) : (
                      <span style={{ color: K.red, fontSize: "12px", marginLeft: "12px" }}>
                        Em uso por {cons?.nome || "?"}
                      </span>
                    )}
                  </div>
                  <button onClick={() => removeToken(token)} style={btn(token.status === "ocupado" ? K.dim : K.red, { padding: "5px 12px", fontSize: "12px" })}>
                    Remover
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ConsultantsTab({ data, onSave, showToast, setConfirm }) {
  const [form, setForm] = useState({
    nome: "",
    clientId: "",
    username: "",
    password: "",
    isAdmin: false,
  });

  const [search, setSearch] = useState("");

  const upd = (k) => (e) => {
    const value = k === "isAdmin" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
  };

  const addConsultant = () => {
    if (
      !form.nome.trim() ||
      !form.clientId ||
      !form.username.trim() ||
      !form.password.trim()
    ) {
      showToast("Preencha todos os campos.", "error");
      return;
    }

    if (data.users.find((u) => u.username === form.username.trim())) {
      showToast("Nome de usuário já existe.", "error");
      return;
    }

    const consId = "cn" + genId();
    const userId = "u" + genId();

    const newCons = {
      id: consId,
      nome: form.nome.trim(),
      clientId: form.clientId,
    };

    const newUser = {
      id: userId,
      username: form.username.trim(),
      password: form.password.trim(),
      role: form.isAdmin ? "admin" : "consultant",
      nome: form.nome.trim(),
      consultorId: consId,
    };

    onSave("consultants", [...data.consultants, newCons]);
    onSave("users", [...data.users, newUser]);

    setForm({
      nome: "",
      clientId: form.clientId,
      username: "",
      password: "",
      isAdmin: false,
    });

    showToast(
      form.isAdmin
        ? "Consultor adicionado com acesso admin!"
        : "Consultor adicionado!",
      "success"
    );
  };

  const removeConsultant = (cons) => {
    const hasActiveToken = data.tokens.find(
      (t) => t.consultorId === cons.id && t.status === "ocupado"
    );

    if (hasActiveToken) {
      showToast(
        "Consultor possui VPN ativa. Libere antes de remover.",
        "error"
      );
      return;
    }

    setConfirm({
      message: `Remover o consultor "${cons.nome}" e seu acesso ao sistema?`,
      onConfirm: () => {
        onSave(
          "consultants",
          data.consultants.filter((c) => c.id !== cons.id)
        );
        onSave(
          "users",
          data.users.filter((u) => u.consultorId !== cons.id)
        );
        showToast("Consultor removido.", "success");
      },
    });
  };

  const toggleAdminAccess = (cons) => {
    const user = data.users.find((u) => u.consultorId === cons.id);

    if (!user) {
      showToast("Usuário vinculado ao consultor não encontrado.", "error");
      return;
    }

    const newRole = user.role === "admin" ? "consultant" : "admin";

    setConfirm({
      message:
        newRole === "admin"
          ? `Conceder acesso ADMIN para "${cons.nome}"?`
          : `Remover acesso ADMIN de "${cons.nome}"?`,
      onConfirm: () => {
        const updatedUsers = data.users.map((u) =>
          u.id === user.id ? { ...u, role: newRole } : u
        );

        onSave("users", updatedUsers);

        showToast(
          newRole === "admin"
            ? "Acesso admin concedido com sucesso."
            : "Acesso admin removido com sucesso.",
          "success"
        );
      },
    });
  };

  const filteredConsultants = data.consultants.filter((cons) => {
    const client = data.clients.find((c) => c.id === cons.clientId);
    const user = data.users.find((u) => u.consultorId === cons.id);

    const term = search.trim().toLowerCase();
    if (!term) return true;

    const roleLabel = user?.role === "admin" ? "admin" : "consultor";

    return (
      cons.nome.toLowerCase().includes(term) ||
      (client?.nome || "").toLowerCase().includes(term) ||
      (user?.username || "").toLowerCase().includes(term) ||
      roleLabel.includes(term)
    );
  });

  return (
    <div>
      <div
        style={{
          background: K.card,
          borderRadius: "12px",
          padding: "22px",
          border: `1px solid ${K.border}`,
          marginBottom: "20px",
        }}
      >
        <h3 style={{ color: K.text, margin: "0 0 16px", fontSize: "15px" }}>
          Adicionar Novo Consultor
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                color: K.muted,
                fontSize: "11px",
                fontWeight: "700",
                marginBottom: "6px",
              }}
            >
              NOME COMPLETO
            </label>
            <input
              style={inp({ width: "100%" })}
              placeholder="Nome do consultor"
              value={form.nome}
              onChange={upd("nome")}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                color: K.muted,
                fontSize: "11px",
                fontWeight: "700",
                marginBottom: "6px",
              }}
            >
              CLIENTE
            </label>
            <select
              style={inp({ width: "100%" })}
              value={form.clientId}
              onChange={upd("clientId")}
            >
              <option value="">Selecione...</option>
              {data.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                color: K.muted,
                fontSize: "11px",
                fontWeight: "700",
                marginBottom: "6px",
              }}
            >
              LOGIN DE ACESSO
            </label>
            <input
              style={inp({ width: "100%" })}
              placeholder="Nome de usuário"
              value={form.username}
              onChange={upd("username")}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                color: K.muted,
                fontSize: "11px",
                fontWeight: "700",
                marginBottom: "6px",
              }}
            >
              SENHA DE ACESSO
            </label>
            <input
              style={inp({ width: "100%" })}
              type="password"
              placeholder="Senha"
              value={form.password}
              onChange={upd("password")}
            />
          </div>
        </div>

        <div
          style={{
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: K.text,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.isAdmin}
              onChange={upd("isAdmin")}
            />
            Criar este perfil com acesso ADMIN
          </label>
        </div>

        <button style={btn(K.blue)} onClick={addConsultant}>
          + Adicionar Consultor
        </button>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <input
          style={inp({ width: "100%", maxWidth: "360px" })}
          placeholder="🔍 Pesquisar consultor, login, cliente ou perfil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div
        style={{
          background: K.card,
          borderRadius: "12px",
          border: `1px solid ${K.border}`,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${K.border}` }}>
          <span
            style={{
              color: K.muted,
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "0.06em",
            }}
          >
            CONSULTORES ({filteredConsultants.length})
          </span>
        </div>

        {filteredConsultants.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: K.dim }}>
            Nenhum consultor encontrado.
          </div>
        ) : (
          filteredConsultants.map((cons, i) => {
            const client = data.clients.find((c) => c.id === cons.clientId);
            const user = data.users.find((u) => u.consultorId === cons.id);
            const activeToken = data.tokens.find(
              (t) => t.consultorId === cons.id && t.status === "ocupado"
            );

            const isAdminUser = user?.role === "admin";

            return (
              <div
                key={cons.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 22px",
                  borderBottom:
                    i < filteredConsultants.length - 1
                      ? `1px solid ${K.border}`
                      : "none",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: K.purple + "33",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "700",
                    color: K.purple,
                    flexShrink: 0,
                  }}
                >
                  {cons.nome.charAt(0)}
                </div>

                <div style={{ flex: 1, minWidth: "240px" }}>
                  <div
                    style={{
                      color: K.text,
                      fontWeight: "600",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {cons.nome}

                    <span
                      style={{
                        background: isAdminUser
                          ? "rgba(139,92,246,0.18)"
                          : "rgba(59,130,246,0.18)",
                        color: isAdminUser ? K.purple : K.blue,
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "3px 8px",
                        borderRadius: "999px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {isAdminUser ? "ADMIN" : "CONSULTOR"}
                    </span>
                  </div>

                  <div style={{ color: K.dim, fontSize: "12px", marginTop: "2px" }}>
                    {client?.nome || "—"} · login:{" "}
                    <span style={{ color: K.muted, fontFamily: "monospace" }}>
                      {user?.username || "—"}
                    </span>
                    {activeToken && (
                      <span style={{ color: K.red, marginLeft: "8px" }}>
                        · em uso: {activeToken.nome}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => toggleAdminAccess(cons)}
                    style={btn(
                      isAdminUser ? "#6b7280" : K.purple,
                      { padding: "5px 12px", fontSize: "12px" }
                    )}
                  >
                    {isAdminUser ? "Remover admin" : "Tornar admin"}
                  </button>

                  <button
                    onClick={() => removeConsultant(cons)}
                    style={btn(K.red, { padding: "5px 12px", fontSize: "12px" })}
                  >
                    Remover
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


function LogsTab({ data }) {
  const [filterClient, setFilterClient] = useState("");
  const [filterCons, setFilterCons] = useState("");

  const filtered = data.logs.filter((log) => {
    const client = data.clients.find((c) => c.id === log.clientId);
    const cons = data.consultants.find((c) => c.id === log.consultorId);

    const matchClient =
      !filterClient || client?.nome.toLowerCase().includes(filterClient.toLowerCase());

    const matchCons =
      !filterCons || cons?.nome.toLowerCase().includes(filterCons.toLowerCase());

    return matchClient && matchCons;
  });

  const exportLogsToExcel = async () => {
    if (filtered.length === 0) {
      alert("Nenhum registro encontrado para exportar.");
      return;
    }

    // Import dinâmico pra não pesar o bundle
    const XLSXMod = await import("xlsx-js-style");
    const XLSX = XLSXMod?.default ?? XLSXMod;

    const rows = filtered.map((log) => {
      const client = data.clients.find((c) => c.id === log.clientId);
      const cons = data.consultants.find((c) => c.id === log.consultorId);

      return {
        Token: log.tokenNome ?? "",
        Cliente: client?.nome ?? "—",
        Consultor: cons?.nome ?? "—",
        Inicio: fmtDate(log.inicio),
        Fim: fmtDate(log.fim),
        "Duração": fmtDur(log.inicio, log.fim),
        Motivo: log.motivo ?? "",
      };
    });

    const headers = ["Token", "Cliente", "Consultor", "Inicio", "Fim", "Duração", "Motivo"];

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:G1");

      // Bordas em todas as direções (thin)
      const borderAllThin = {
      top: { style: "thin", color: { rgb: "334155" } },
      bottom: { style: "thin", color: { rgb: "334155" } },
      left: { style: "thin", color: { rgb: "334155" } },
      right: { style: "thin", color: { rgb: "334155" } },
      };

      // Cabeçalho (linha 1 => r:0)
      for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cellAddr]) continue;

      ws[cellAddr].s = {
        fill: { patternType: "solid", fgColor: { rgb: "1E3A8A" } }, // Azul escuro
        font: { bold: true, color: { rgb: "FFFFFF" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderAllThin,
      };
    }

// Bordas + alinhamento nas células com conteúdo
for (let R = range.s.r; R <= range.e.r; R++) {
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = ws[cellAddr];
    if (!cell) continue;

    cell.s = cell.s || {};
    cell.s.border = borderAllThin;

    // Dados (não cabeçalho)
    if (R !== 0) {
      cell.s.alignment = { vertical: "center", horizontal: "left", wrapText: true };
    }
  }
}

// (Opcional) Altura do cabeçalho
ws["!rows"] = ws["!rows"] || [];
ws["!rows"][0] = { hpt: 20 };

// (Opcional) Congelar primeira linha
ws["!freeze"] = { xSplit: 0, ySplit: 1 };

    ws["!cols"] = [
      { wch: 18 }, // Token
      { wch: 22 }, // Cliente
      { wch: 22 }, // Consultor
      { wch: 22 }, // Inicio
      { wch: 22 }, // Fim
      { wch: 14 }, // Duração
      { wch: 40 }, // Motivo
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs");

    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, "0");
    const filename = `relatorio-logs_${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
      now.getDate()
    )}_${pad2(now.getHours())}${pad2(now.getMinutes())}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          style={inp({ width: "220px" })}
          placeholder="🔍 Filtrar por cliente..."
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
        />
        <input
          style={inp({ width: "220px" })}
          placeholder="🔍 Filtrar por consultor..."
          value={filterCons}
          onChange={(e) => setFilterCons(e.target.value)}
        />

        <button
          style={btn(K.blue, { padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" })}
          onClick={exportLogsToExcel}
          title="Extrair relatório"
        >
          📋
        </button>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            background: K.card,
            borderRadius: "12px",
            padding: "40px",
            textAlign: "center",
            color: K.dim,
            border: `1px solid ${K.border}`,
          }}
        >
          Nenhum registro encontrado.
        </div>
      ) : (
        <div
          style={{
            background: K.card,
            borderRadius: "12px",
            border: `1px solid ${K.border}`,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${K.border}` }}>
                  {["Token", "Cliente", "Consultor", "Início", "Fim", "Duração", "Motivo"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        color: K.muted,
                        fontWeight: "700",
                        fontSize: "11px",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const client = data.clients.find((c) => c.id === log.clientId);
                  const cons = data.consultants.find((c) => c.id === log.consultorId);

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? `1px solid ${K.border}` : "none",
                      }}
                    >
                      <td style={{ padding: "12px 16px", color: K.text, fontWeight: "600" }}>
                        {log.tokenNome}
                      </td>
                      <td style={{ padding: "12px 16px", color: K.muted }}>{client?.nome || "—"}</td>
                      <td style={{ padding: "12px 16px", color: K.muted }}>{cons?.nome || "—"}</td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: K.muted,
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(log.inicio)}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: K.muted,
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(log.fim)}
                      </td>
                      <td style={{ padding: "12px 16px", color: K.blue }}>
                        {fmtDur(log.inicio, log.fim)}
                      </td>
                      <td style={{ padding: "12px 16px", color: K.dim, fontSize: "12px" }}>
                        {log.motivo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SapAccessesTab({ data, onSave, showToast, setConfirm, canEdit = true }) {
  
  const [clientId, setClientId] = useState(data.clients[0]?.id || "");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({ login: "", senha: "" });
  const [showNew, setShowNew] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ login: "", senha: "" });

  // IDs que estão “visíveis” (olho aberto)
  const [visibleIds, setVisibleIds] = useState(() => new Set());

  useEffect(() => {
    // se não tiver cliente selecionado e existir cliente, seta o primeiro
    if (!clientId && data.clients.length > 0) {
      setClientId(data.clients[0].id);
    }
  }, [data.clients, clientId]);

  // --- Helpers (máscara / toggle)
  const mask = (value) => (value ? "••••••••" : "—");
  const isVisible = (id) => visibleIds.has(id);

  const toggleVisible = (id) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Lista filtrada
  const list = (data.sapAccesses || [])
    .filter((a) => a.clientId === clientId)
    .filter((a) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (a.login || "").toLowerCase().includes(term);
    });

  // --- Ações (CRUD) - somente admin
  const addAccess = () => {
    if (!canEdit) return;

    if (!clientId) {
      showToast("Selecione um cliente.", "error");
      return;
    }
    if (!form.login.trim() || !form.senha.trim()) {
      showToast("Preencha login e senha.", "error");
      return;
    }

    const newItem = {
      id: "sa" + genId(),
      clientId,
      login: form.login.trim(),
      senha: form.senha.trim(),
    };

    onSave("sapAccesses", [newItem, ...(data.sapAccesses || [])]);
    setForm({ login: "", senha: "" });
    setShowNew(false);
    showToast("Acesso SAP adicionado!", "success");
  };

  const startEdit = (item) => {
    if (!canEdit) return;
    setEditingId(item.id);
    setEditForm({ login: item.login || "", senha: item.senha || "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ login: "", senha: "" });
  };

  const saveEdit = () => {
    if (!canEdit) return;

    if (!editForm.login.trim() || !editForm.senha.trim()) {
      showToast("Preencha login e senha.", "error");
      return;
    }

    const updated = (data.sapAccesses || []).map((a) =>
      a.id === editingId
        ? { ...a, login: editForm.login.trim(), senha: editForm.senha.trim() }
        : a
    );

    onSave("sapAccesses", updated);
    showToast("Acesso SAP atualizado!", "success");
    cancelEdit();
  };

  const removeAccess = (item) => {
    if (!canEdit) return;

    setConfirm({
      message: `Excluir o acesso SAP "${item.login}"?`,
      onConfirm: () => {
        onSave("sapAccesses", (data.sapAccesses || []).filter((a) => a.id !== item.id));
        showToast("Acesso SAP removido.", "success");
      },
    });
  };

  const currentClient = data.clients.find((c) => c.id === clientId);

  return (
    <div>
      {/* CARD: seleção de cliente + pesquisa + (admin) cadastro */}
      <div
        style={{
          background: K.card,
          borderRadius: "12px",
          padding: "22px",
          border: `1px solid ${K.border}`,
          marginBottom: "20px",
        }}
      >
        <h3 style={{ color: K.text, margin: "0 0 16px", fontSize: "15px" }}>
          Acessos SAP
        </h3>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
          {/* Select Cliente (todos) */}
          <div style={{ minWidth: "260px", flex: 1 }}>
            <label
              style={{
                display: "block",
                color: K.muted,
                fontSize: "11px",
                fontWeight: "700",
                marginBottom: "6px",
              }}
            >
              CLIENTE
            </label>
            <select
              style={inp({ width: "100%" })}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              {data.clients.length === 0 ? (
                <option value="">Nenhum cliente cadastrado</option>
              ) : (
                data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Pesquisa (todos) */}
          <div style={{ minWidth: "260px", flex: 1 }}>
            <label
              style={{
                display: "block",
                color: K.muted,
                fontSize: "11px",
                fontWeight: "700",
                marginBottom: "6px",
              }}
            >
              PESQUISAR LOGIN
            </label>
            <input
              style={inp({ width: "100%" })}
              placeholder="🔍 Pesquisar por login SAP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* (admin) Cadastro */}
          {canEdit && (
            <>
              <div style={{ minWidth: "220px", flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    color: K.muted,
                    fontSize: "11px",
                    fontWeight: "700",
                    marginBottom: "6px",
                  }}
                >
                  LOGIN SAP
                </label>
                <input
                  style={inp({ width: "100%" })}
                  type={showNew ? "text" : "password"}
                  placeholder="Ex: T3LUCASS"
                  value={form.login}
                  onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
                />
              </div>

              <div style={{ minWidth: "220px", flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    color: K.muted,
                    fontSize: "11px",
                    fontWeight: "700",
                    marginBottom: "6px",
                  }}
                >
                  SENHA SAP
                </label>
                <input
                  style={inp({ width: "100%" })}
                  type={showNew ? "text" : "password"}
                  placeholder="Ex: 12345"
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addAccess()}
                />
              </div>

              <button style={btn(K.blue)} onClick={addAccess}>
                + Adicionar Acesso
              </button>
            </>
          )}
        </div>

        {currentClient && (
          <div style={{ marginTop: "6px", color: K.dim, fontSize: "12px" }}>
            Cliente selecionado:{" "}
            <strong style={{ color: K.text }}>{currentClient.nome}</strong>
          </div>
        )}
      </div>

      {/* LISTA */}
      <div
        style={{
          background: K.card,
          borderRadius: "12px",
          border: `1px solid ${K.border}`,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${K.border}` }}>
          <span
            style={{
              color: K.muted,
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "0.06em",
            }}
          >
            ACESSOS SAP ({list.length})
          </span>
        </div>

        {data.clients.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: K.dim }}>
            Cadastre um cliente primeiro na aba “Clientes”.
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: K.dim }}>
            Nenhum acesso SAP cadastrado para este cliente.
          </div>
        ) : (
          list.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 22px",
                borderBottom: i < list.length - 1 ? `1px solid ${K.border}` : "none",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "320px" }}>
                {editingId === item.id ? (
                  // Edição (apenas admin entra aqui)
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <input
                      style={inp({ width: "220px" })}
                      type={isVisible(item.id) ? "text" : "password"}
                      value={editForm.login}
                      onChange={(e) => setEditForm((f) => ({ ...f, login: e.target.value }))}
                    />
                    <input
                      style={inp({ width: "220px" })}
                      type={isVisible(item.id) ? "text" : "password"}
                      value={editForm.senha}
                      onChange={(e) => setEditForm((f) => ({ ...f, senha: e.target.value }))}
                    />
                  </div>
                ) : (
                  // Visualização (todos)
                  <>
                    <div style={{ color: K.text, fontWeight: "700", fontSize: "14px" }}>
                      login: {isVisible(item.id) ? item.login : mask(item.login)}
                    </div>
                    <div
                      style={{
                        color: K.dim,
                        fontSize: "12px",
                        marginTop: "2px",
                        fontFamily: "monospace",
                      }}
                    >
                      senha: {isVisible(item.id) ? item.senha : mask(item.senha)}
                    </div>
                  </>
                )}
              </div>

              {/* OLHO (sempre aparece para todos) */}
              <button
                style={btn(K.dim, { padding: "6px 12px", fontSize: "12px" })}
                onClick={() => toggleVisible(item.id)}
                title={isVisible(item.id) ? "Ocultar" : "Mostrar"}
              >
                {isVisible(item.id) ? "👁️‍🗨️" : "👁️"}
              </button>

              {/* AÇÕES (somente admin) */}
              {canEdit && (
                <div style={{ display: "flex", gap: "8px" }}>
                  {editingId === item.id ? (
                    <>
                      <button
                        style={btn(K.green, { padding: "6px 12px", fontSize: "12px" })}
                        onClick={saveEdit}
                      >
                        Salvar
                      </button>
                      <button
                        style={btn(K.dim, { padding: "6px 12px", fontSize: "12px" })}
                        onClick={cancelEdit}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        style={btn(K.purple, { padding: "6px 12px", fontSize: "12px" })}
                        onClick={() => startEdit(item)}
                      >
                        Editar
                      </button>
                      <button
                        style={btn(K.red, { padding: "6px 12px", fontSize: "12px" })}
                        onClick={() => removeAccess(item)}
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ data, user, onSave, onRelease, onLogout, showToast, setConfirm }) {
  const [tab, setTab] = useState("overview");
  const tabs = [
    { id: "overview", label: "📊 Visão Geral" },
    { id: "clients", label: "🏢 Clientes" },
    { id: "tokens", label: "🔐 Tokens VPN" },
    { id: "consultants", label: "👥 Consultores" },
    { id: "logs", label: "📋 Logs" },
    { id: "sap", label: "🧩 Acessos SAP" },
  ];

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div style={{
        background: K.card, borderBottom: `1px solid ${K.border}`,
        display: "flex", overflowX: "auto", flexShrink: 0,
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none",
              color: tab === t.id ? K.blue : K.muted,
              padding: "15px 20px", cursor: "pointer", fontSize: "13px",
              fontWeight: tab === t.id ? "700" : "400",
              borderBottom: tab === t.id ? `2px solid ${K.blue}` : "2px solid transparent",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {tab === "overview" && <OverviewTab data={data} onRelease={(t) => onRelease(t, "Liberado pelo admin")} />}
          {tab === "clients" && <ClientsTab data={data} onSave={onSave} showToast={showToast} setConfirm={setConfirm} />}
          {tab === "tokens" && <TokensTab data={data} onSave={onSave} showToast={showToast} setConfirm={setConfirm} />}
          {tab === "consultants" && <ConsultantsTab data={data} onSave={onSave} showToast={showToast} setConfirm={setConfirm} />}
          {tab === "logs" && <LogsTab data={data} />}
          
          {tab === "sap" && (
            <SapAccessesTab
            data={data}
            onSave={onSave}
            showToast={showToast}
            setConfirm={setConfirm}          
            />
          )}
          </div>
      </div>
    </>
  );
}

function ConsultantDashboard({ data, user, myConsultant, onRelease, onRequestReserve, onLogout, showToast }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("vpn");

  const filteredClients = data.clients.filter(
    (c) => !search || c.nome.toLowerCase().includes(search.toLowerCase())
  );

  const myActiveToken = data.tokens.find(
    (t) => t.consultorId === myConsultant?.id && t.status === "ocupado"
  );

  const handleReserve = (token) => {
    if (!myConsultant) {
      showToast("Erro: consultor não encontrado.", "error");
      return;
    }
    if (myActiveToken) {
      showToast("Você já possui uma VPN ativa. Libere-a antes de usar outra.", "error");
      return;
    }
      onRequestReserve(token, myConsultant.id);
      showToast("Selecione o tempo de uso da VPN.", "info");
  };

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />

      {/* Barra de abas do consultor */}
      <div
        style={{
          background: K.card,
          borderBottom: `1px solid ${K.border}`,
          display: "flex",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setTab("vpn")}
          style={{
            background: "none",
            border: "none",
            color: tab === "vpn" ? K.blue : K.muted,
            padding: "15px 20px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: tab === "vpn" ? "700" : "400",
            borderBottom: tab === "vpn" ? `2px solid ${K.blue}` : "2px solid transparent",
            whiteSpace: "nowrap",
          }}
        >
          🔐 Tokens VPN
        </button>

        <button
          onClick={() => setTab("sap")}
          style={{
            background: "none",
            border: "none",
            color: tab === "sap" ? K.blue : K.muted,
            padding: "15px 20px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: tab === "sap" ? "700" : "400",
            borderBottom: tab === "sap" ? `2px solid ${K.blue}` : "2px solid transparent",
            whiteSpace: "nowrap",
          }}
        >
          🧩 Acessos SAP
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* ✅ Aba VPN (conteúdo atual) */}
          {tab === "vpn" && (
            <>
              {myActiveToken &&
                (() => {
                  const client = data.clients.find((c) => c.id === myActiveToken.clientId);
                  return (
                    <div
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        border: `1px solid ${K.green}`,
                        borderRadius: "12px",
                        padding: "16px 22px",
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            color: K.green,
                            fontWeight: "700",
                            fontSize: "14px",
                            marginBottom: "4px",
                          }}
                        >
                          🔐 Minha VPN Ativa
                        </div>
                        <div style={{ color: K.muted, fontSize: "13px" }}>
                          {myActiveToken.nome} · {client?.nome} · Login:{" "}
                          <span style={{ fontFamily: "monospace", color: K.text }}>
                            {myActiveToken.loginVPN}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onRelease(myActiveToken, "Liberado pelo consultor")}
                        style={btn(K.red, { padding: "8px 18px" })}
                      >
                        🔓 Liberar VPN
                      </button>
                    </div>
                  );
                })()}

              <div style={{ marginBottom: "20px" }}>
                <input
                  style={inp({ width: "100%", maxWidth: "360px" })}
                  placeholder="🔍 Pesquisar por nome do cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {filteredClients.map((client) => {
                const clientTokens = data.tokens.filter((t) => t.clientId === client.id);
                const freeCount = clientTokens.filter((t) => t.status === "livre").length;

                return (
                  <div
                    key={client.id}
                    style={{
                      background: K.card,
                      borderRadius: "12px",
                      padding: "22px",
                      border: `1px solid ${K.border}`,
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ color: K.text, fontWeight: "700", fontSize: "15px" }}>
                        🏢 {client.nome}
                      </span>

                      {freeCount === 0 && clientTokens.length > 0 ? (
                        <span
                          style={{
                            background: "rgba(239,68,68,0.15)",
                            color: K.red,
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "3px 10px",
                            borderRadius: "99px",
                          }}
                        >
                          🔴 Todas as VPNs estão em uso
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "rgba(16,185,129,0.15)",
                            color: K.green,
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "3px 10px",
                            borderRadius: "99px",
                          }}
                        >
                          {freeCount} livre{freeCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {clientTokens.length === 0 ? (
                      <p style={{ color: K.dim, margin: 0, fontSize: "13px" }}>
                        Nenhum token cadastrado.
                      </p>
                    ) : (
                      <div className="token-grid">
                        {clientTokens.map((token) => {
                          const cons = data.consultants.find((c) => c.id === token.consultorId);
                          return (
                            <TokenCard
                              key={token.id}
                              token={token}
                              consultant={cons}
                              myConsultorId={myConsultant?.id}
                              isAdmin={false}
                              onReserve={handleReserve}
                              onRelease={(t) => onRelease(t, "Liberado pelo consultor")}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredClients.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: K.dim }}>
                  Nenhum cliente encontrado.
                </div>
              )}
            </>
          )}

          {/* ✅ Aba SAP (consultor: somente visualizar/pesquisar + olho) */}
          {tab === "sap" && (
            <SapAccessesTab
              data={data}
              onSave={() => {}}
              showToast={showToast}
              setConfirm={() => {}}
              canEdit={false}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState({
    clients: [],
    tokens: [],
    consultants: [],
    users: [],
    logs: [],
    sapAccesses: [],
  });

  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Aviso últimos 5 min
  const [warnToken, setWarnToken] = useState(null);
  const seenWarns = useRef(new Set());

  // Modal de duração (reservar/renovar)
  const [durationModal, setDurationModal] = useState(null);
  // { mode: "reserve" | "renew", tokenId, consultorId, initialMinutes }

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Toast helper
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Persist helper
  const saveKey = useCallback(async (key, val) => {
  await db.set(key, val);
  setData((p) => ({ ...p, [key]: val }));
}, []);


  // ---- INIT DB
  useEffect(() => {
    (async () => {
      try {
        const init = await db.get("init");
        if (!init) {
          await Promise.all([
            db.set("clients", SEED.clients),
            db.set("tokens", SEED.tokens),
            db.set("consultants", SEED.consultants),
            db.set("users", SEED.users),
            db.set("sapAccesses", SEED.sapAccesses),
            db.set("logs", SEED.logs),
            db.set("init", 1),
          ]);
          setData(SEED);
        } else {
          const [cl, tk, cn, us, lg, sa] = await Promise.all([
            db.get("clients"),
            db.get("tokens"),
            db.get("consultants"),
            db.get("users"),
            db.get("logs"),
            db.get("sapAccesses"),
          ]);

          setData({
            clients: cl || SEED.clients,
            tokens: tk || SEED.tokens,
            consultants: cn || SEED.consultants,
            users: us || SEED.users,
            logs: lg || SEED.logs,
            sapAccesses: sa || SEED.sapAccesses,
          });
        }
      } catch (e) {
        console.error("Falha ao inicializar dados:", e);
        setData(SEED);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Atualização periódica (tokens/logs)
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(async () => {
      const [tk, lg] = await Promise.all([db.get("tokens"), db.get("logs")]);
      if (tk) setData((p) => ({ ...p, tokens: tk, logs: lg || p.logs }));
    }, 5000);
    return () => clearInterval(id);
  }, [ready]);

  // ---- RELEASE (manual)
  const doRelease = useCallback(
    async (token, motivo = "Liberado manualmente") => {
      const nowIso = new Date().toISOString();
      const { tokens, logs } = dataRef.current;

      const newLog = {
        id: genId(),
        tokenId: token.id,
        tokenNome: token.nome,
        clientId: token.clientId,
        consultorId: token.consultorId,
        inicio: token.startTime ? new Date(token.startTime).toISOString() : null,
        fim: nowIso,
        motivo,
      };

      const newTokens = tokens.map((t) =>
        t.id === token.id
          ? { ...t, status: "livre", consultorId: null, startTime: null, durationMs: null, expiresAt: null }
          : t
      );

      const newLogs = [newLog, ...logs];

      await db.set("tokens", newTokens);
      await db.set("logs", newLogs);
      setData((p) => ({ ...p, tokens: newTokens, logs: newLogs }));

      seenWarns.current.delete(token.id);
      setWarnToken(null);

      showToast("VPN liberada.", "success");
    },
    [showToast]
  );

  // ---- RESERVE / RENEW (com duração)
  const doReserve = useCallback(async (token, consultorId, durationMs) => {
    const { tokens } = dataRef.current;
    const now = Date.now();
    const expiresAt = now + durationMs;

    const newTokens = tokens.map((t) =>
      t.id === token.id ? { ...t, status: "ocupado", consultorId, startTime: now, durationMs, expiresAt } : t
    );

    await db.set("tokens", newTokens);
    setData((p) => ({ ...p, tokens: newTokens }));
  }, []);

  const doRenew = useCallback(async (tokenId, durationMs) => {
    const { tokens } = dataRef.current;
    const now = Date.now();
    const expiresAt = now + durationMs;

    const newTokens = tokens.map((t) => (t.id === tokenId ? { ...t, startTime: now, durationMs, expiresAt } : t));

    await db.set("tokens", newTokens);
    setData((p) => ({ ...p, tokens: newTokens }));
  }, []);

  // ---- Duration modal helpers
  const minutesToMs = useCallback((m) => Math.max(MIN_MS, Math.min(MAX_MS, m * 60 * 1000)), []);

  const openReserveDuration = useCallback((token, consultorId) => {
    setDurationModal({ mode: "reserve", tokenId: token.id, consultorId, initialMinutes: 120 });
  }, []);

  const openRenewDuration = useCallback((token) => {
    setDurationModal({ mode: "renew", tokenId: token.id, consultorId: token.consultorId, initialMinutes: 120 });
  }, []);

  const confirmDuration = useCallback(
    async (minutes) => {
      const modal = durationModal;
      if (!modal) return;

      const durationMs = minutesToMs(minutes);

      if (modal.mode === "reserve") {
        const token = dataRef.current.tokens.find((t) => t.id === modal.tokenId);
        if (!token) return;
        await doReserve(token, modal.consultorId, durationMs);
        showToast(`VPN reservada por ${minutes} min.`, "success");
      } else {
        await doRenew(modal.tokenId, durationMs);
        showToast(`VPN renovada por ${minutes} min.`, "success");
      }

      // permite avisar novamente no próximo ciclo
      seenWarns.current.delete(modal.tokenId);
      setWarnToken(null);
      setDurationModal(null);
    },
    [durationModal, minutesToMs, doReserve, doRenew, showToast]
  );

  // ---- WARN nos últimos 5 min (somente consultor, somente token dele)
  useEffect(() => {
    if (!user || user.role !== "consultant") return;
    const myId = user.consultorId;

    const checkWarn = () => {
      const { tokens } = dataRef.current;
      const now = Date.now();

      const myToken = tokens.find((t) => t.status === "ocupado" && t.consultorId === myId && t.expiresAt);
      if (!myToken) return;

      const rem = myToken.expiresAt - now;

      if (rem > 0 && rem <= WARN_MS && !seenWarns.current.has(myToken.id)) {
        seenWarns.current.add(myToken.id);
        setWarnToken(myToken);
      }
    };

    checkWarn();
    const id = setInterval(checkWarn, 5000);
    return () => clearInterval(id);
  }, [user]);

  // ---- Expiração global: quando acabar o tempo, libera automaticamente e loga
  useEffect(() => {
    if (!ready) return;

    const id = setInterval(async () => {
      const { tokens, logs } = dataRef.current;
      const now = Date.now();

      let changed = false;
      let newLogs = logs;

      const newTokens = tokens.map((t) => {
        if (t.status !== "ocupado") return t;

        // migração segura (se existir token antigo sem expiresAt)
        const effectiveExpiresAt =
          t.expiresAt || (t.startTime ? t.startTime + (t.durationMs || MAX_MS) : null);

        if (!effectiveExpiresAt) return t;

        if (!t.expiresAt && effectiveExpiresAt) {
          changed = true;
          return { ...t, expiresAt: effectiveExpiresAt };
        }

        if (now < effectiveExpiresAt) return t;

        changed = true;

        const log = {
          id: genId(),
          tokenId: t.id,
          tokenNome: t.nome,
          clientId: t.clientId,
          consultorId: t.consultorId,
          inicio: t.startTime ? new Date(t.startTime).toISOString() : null,
          fim: new Date(now).toISOString(),
          motivo: "Tempo expirado automaticamente",
        };

        newLogs = [log, ...newLogs];

        return { ...t, status: "livre", consultorId: null, startTime: null, durationMs: null, expiresAt: null };
      });

      if (changed) {
        await db.set("tokens", newTokens);
        await db.set("logs", newLogs);
        setData((p) => ({ ...p, tokens: newTokens, logs: newLogs }));
        setWarnToken(null);
      }
    }, 10000);

    return () => clearInterval(id);
  }, [ready]);

  // ---- Modal state derived
  const currentWarnToken = warnToken ? data.tokens.find((t) => t.id === warnToken.id) : null;
  const showWarn = currentWarnToken?.status === "ocupado";
  const remainingWarnMs = (currentWarnToken?.expiresAt || 0) - Date.now();

  const myConsultant =
    user?.role === "consultant" ? data.consultants.find((c) => c.id === user.consultorId) : null;

  if (!ready) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: K.bg,
          color: K.muted,
          fontFamily: "sans-serif",
          fontSize: "15px",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: K.bg,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {toast && <Toast toast={toast} />}

      {/* Aviso últimos 5 min (Renovar/Fechar) */}
      {showWarn && remainingWarnMs > 0 && (
        <WarningModal
          token={currentWarnToken}
          remainingMs={remainingWarnMs}
          onRenew={() => {
            setWarnToken(null);
            openRenewDuration(currentWarnToken);
          }}
          onClose={() => setWarnToken(null)}
        />
      )}

      {/* Modal de duração (serve para reservar e renovar) */}
      {durationModal && (
        <DurationModal
          title={durationModal.mode === "reserve" ? "Definir tempo de uso da VPN" : "Renovar tempo de VPN"}
          initialMinutes={durationModal.initialMinutes || 120}
          onCancel={() => setDurationModal(null)}
          onConfirm={confirmDuration}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {!user ? (
        <LoginPage users={data.users} onLogin={setUser} />
      ) : user.role === "admin" ? (
        <AdminDashboard
          data={data}
          user={user}
          onSave={saveKey}
          onRelease={doRelease}
          onLogout={() => setUser(null)}
          showToast={showToast}
          setConfirm={setConfirm}
        />
      ) : (
        <ConsultantDashboard
          data={data}
          user={user}
          myConsultant={myConsultant}
          onRelease={doRelease}
          onRequestReserve={openReserveDuration}
          onLogout={() => setUser(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}