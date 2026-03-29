import { useState, useEffect, useCallback, useRef } from "react";
import nttLogo from "./assets/ntt-data-logo.png";

const TWO_H = 7200000;
const WARN_T = 300000;
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const SEED = {
  clients: [
    { id: "c1", nome: "Cliente1" },
    { id: "c2", nome: "Cliente2" },
    { id: "c3", nome: "Cliente3" },
    { id: "c4", nome: "Cliente4" },
  ],
  tokens: [
    { id: "t1", nome: "VPN 1", clientId: "c1", status: "livre", consultorId: null, loginVPN: "cli1_vpn1", senhaVPN: "Abc@1234", startTime: null },
    { id: "t2", nome: "VPN 2", clientId: "c1", status: "livre", consultorId: null, loginVPN: "cli1_vpn2", senhaVPN: "Abc@5678", startTime: null },
    { id: "t3", nome: "VPN 3", clientId: "c1", status: "livre", consultorId: null, loginVPN: "cli1_vpn3", senhaVPN: "Abc@9012", startTime: null },
    { id: "t4", nome: "VPN 1", clientId: "c2", status: "livre", consultorId: null, loginVPN: "cli2_vpn1", senhaVPN: "Def@1111", startTime: null },
    { id: "t5", nome: "VPN 2", clientId: "c2", status: "livre", consultorId: null, loginVPN: "cli2_vpn2", senhaVPN: "Def@2222", startTime: null },
    { id: "t6", nome: "VPN 1", clientId: "c3", status: "livre", consultorId: null, loginVPN: "cli3_vpn1", senhaVPN: "Ghi@3333", startTime: null },
    { id: "t7", nome: "VPN 1", clientId: "c4", status: "livre", consultorId: null, loginVPN: "cli4_vpn1", senhaVPN: "Jkl@4444", startTime: null },
  ],
  consultants: [
    { id: "cn1", nome: "João Silva", clientId: "c1" },
    { id: "cn2", nome: "Maria Santos", clientId: "c1" },
    { id: "cn3", nome: "Pedro Oliveira", clientId: "c2" },
    { id: "cn4", nome: "Ana Costa", clientId: "c3" },
    { id: "cn5", nome: "Carlos Lima", clientId: "c4" },
  ],
  users: [
    { id: "admin", username: "admin", password: "admin123", role: "admin", nome: "Administrador", consultorId: null },
    { id: "u1", username: "joao", password: "123456", role: "consultant", nome: "João Silva", consultorId: "cn1" },
    { id: "u2", username: "maria", password: "123456", role: "consultant", nome: "Maria Santos", consultorId: "cn2" },
    { id: "u3", username: "pedro", password: "123456", role: "consultant", nome: "Pedro Oliveira", consultorId: "cn3" },
    { id: "u4", username: "ana", password: "123456", role: "consultant", nome: "Ana Costa", consultorId: "cn4" },
    { id: "u5", username: "carlos", password: "123456", role: "consultant", nome: "Carlos Lima", consultorId: "cn5" },
  ],
  logs: [],
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

function useTimer(startTime) {
  const [rem, setRem] = useState(null);

  useEffect(() => {
    if (!startTime) {
      setRem(null);
      return;
    }

    const tick = () => setRem(TWO_H - (Date.now() - startTime));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

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

function WarningModal({ token, onExtend, onRelease }) {
  const [rem, setRem] = useState(WARN_T);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const r = WARN_T - (Date.now() - start);
      setRem(r);
      if (r <= 0) {
        clearInterval(id);
        onRelease();
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 150,
      background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: K.card, border: `2px solid ${K.yellow}`, borderRadius: "20px",
        padding: "40px", maxWidth: "420px", width: "90%", textAlign: "center",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ color: K.yellow, margin: "0 0 12px", fontSize: "20px" }}>Sessão Expirando!</h2>
        <p style={{ color: K.muted, margin: "0 0 8px", fontSize: "15px" }}>
          Sua sessão na <strong style={{ color: K.text }}>{token.nome}</strong> encerra em:
        </p>
        <div style={{ fontSize: "40px", fontFamily: "monospace", color: K.red, fontWeight: "700", margin: "12px 0 8px" }}>
          {fmtMs(Math.max(0, rem))}
        </div>
        <p style={{ color: K.dim, fontSize: "13px", marginBottom: "28px" }}>
          Você será desconectado automaticamente se não agir.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onExtend} style={btn(K.green, { padding: "12px 24px", fontSize: "14px" })}>
            🔄 Estender +2h
          </button>
          <button onClick={onRelease} style={btn(K.red, { padding: "12px 24px", fontSize: "14px" })}>
            🔓 Liberar VPN
          </button>
        </div>
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
          <div style={{ color: K.dim }}> <span style={{ color: K.blue, fontFamily: "monospace" }}>Lucas de Sá © 2026</span></div>
        </div>
      </div>
    </div>
  );
}

function TokenCard({ token, consultant, myConsultorId, isAdmin, onReserve, onRelease }) {
  const rem = useTimer(token.status === "ocupado" ? token.startTime : null);
  const isFree = token.status === "livre";
  const isWarning = rem !== null && rem > 0 && rem <= WARN_T;
  const isExpired = rem !== null && rem <= 0;
  const isMyToken = token.consultorId === myConsultorId;
  const borderColor = isFree ? K.green : isWarning ? K.yellow : K.red;

  return (
    <div style={{
      background: isFree ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)",
      border: `1px solid ${borderColor}`, borderRadius: "12px", padding: "16px",
      minWidth: "195px", flex: "1", maxWidth: "260px", position: "relative",
    }}>
      <div style={{
        position: "absolute", top: "14px", right: "14px",
        width: "10px", height: "10px", borderRadius: "50%",
        background: isFree ? K.green : K.red,
      }} />
      <div style={{ fontWeight: "700", color: K.text, fontSize: "14px", marginBottom: "10px" }}>{token.nome}</div>

      {isFree ? (
        <>
          <div style={{ fontSize: "11px", color: K.dim, marginBottom: "2px" }}>Login VPN</div>
          <div style={{ fontFamily: "monospace", color: K.green, fontSize: "13px", marginBottom: "8px" }}>{token.loginVPN}</div>
          <div style={{ fontSize: "11px", color: K.dim, marginBottom: "2px" }}>Senha VPN</div>
          <div style={{ fontFamily: "monospace", color: K.green, fontSize: "13px", marginBottom: "10px" }}>{token.senhaVPN}</div>
          <div style={{ color: K.green, fontSize: "12px", fontWeight: "600", marginBottom: "10px" }}>🟢 Livre</div>
          {!isAdmin && (
            <button onClick={() => onReserve(token)} style={btn(K.green, { padding: "6px 14px", fontSize: "12px" })}>
              🔐 Usar VPN
            </button>
          )}
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
            <div style={{
              fontFamily: "monospace", fontSize: "12px", marginBottom: "10px",
              color: isExpired ? K.red : isWarning ? K.yellow : K.muted,
            }}>
              {isExpired ? "⚠️ EXPIRADO" : `⏱ ${fmtMs(rem)}`}
            </div>
          )}
          {(isMyToken || isAdmin) && (
            <button onClick={() => onRelease(token)} style={btn(K.red, { padding: "6px 14px", fontSize: "12px" })}>
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

            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
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
    const matchClient = !filterClient || client?.nome.toLowerCase().includes(filterClient.toLowerCase());
    const matchCons = !filterCons || cons?.nome.toLowerCase().includes(filterCons.toLowerCase());
    return matchClient && matchCons;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input style={inp({ width: "220px" })} placeholder="🔍 Filtrar por cliente..." value={filterClient} onChange={(e) => setFilterClient(e.target.value)} />
        <input style={inp({ width: "220px" })} placeholder="🔍 Filtrar por consultor..." value={filterCons} onChange={(e) => setFilterCons(e.target.value)} />
        <button style={btn(K.dim, { padding: "8px 14px" })} onClick={() => { setFilterClient(""); setFilterCons(""); }}>Limpar</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: K.card, borderRadius: "12px", padding: "40px", textAlign: "center", color: K.dim, border: `1px solid ${K.border}` }}>
          Nenhum registro encontrado.
        </div>
      ) : (
        <div style={{ background: K.card, borderRadius: "12px", border: `1px solid ${K.border}`, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${K.border}` }}>
                  {["Token", "Cliente", "Consultor", "Início", "Fim", "Duração", "Motivo"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: K.muted, fontWeight: "700", fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const client = data.clients.find((c) => c.id === log.clientId);
                  const cons = data.consultants.find((c) => c.id === log.consultorId);
                  return (
                    <tr key={log.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${K.border}` : "none" }}>
                      <td style={{ padding: "12px 16px", color: K.text, fontWeight: "600" }}>{log.tokenNome}</td>
                      <td style={{ padding: "12px 16px", color: K.muted }}>{client?.nome || "—"}</td>
                      <td style={{ padding: "12px 16px", color: K.muted }}>{cons?.nome || "—"}</td>
                      <td style={{ padding: "12px 16px", color: K.muted, fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmtDate(log.inicio)}</td>
                      <td style={{ padding: "12px 16px", color: K.muted, fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmtDate(log.fim)}</td>
                      <td style={{ padding: "12px 16px", color: K.blue }}>{fmtDur(log.inicio, log.fim)}</td>
                      <td style={{ padding: "12px 16px", color: K.dim, fontSize: "12px" }}>{log.motivo}</td>
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

function AdminDashboard({ data, user, onSave, onRelease, onLogout, showToast, setConfirm }) {
  const [tab, setTab] = useState("overview");
  const tabs = [
    { id: "overview", label: "📊 Visão Geral" },
    { id: "clients", label: "🏢 Clientes" },
    { id: "tokens", label: "🔐 Tokens VPN" },
    { id: "consultants", label: "👥 Consultores" },
    { id: "logs", label: "📋 Logs" },
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
        </div>
      </div>
    </>
  );
}

function ConsultantDashboard({ data, user, myConsultant, onRelease, onReserve, onLogout, showToast }) {
  const [search, setSearch] = useState("");
  const filteredClients = data.clients.filter((c) => !search || c.nome.toLowerCase().includes(search.toLowerCase()));
  const myActiveToken = data.tokens.find((t) => t.consultorId === myConsultant?.id && t.status === "ocupado");

  const handleReserve = (token) => {
    if (!myConsultant) {
      showToast("Erro: consultor não encontrado.", "error");
      return;
    }
    if (myActiveToken) {
      showToast("Você já possui uma VPN ativa. Libere-a antes de usar outra.", "error");
      return;
    }
    onReserve(token, myConsultant.id);
    showToast(`VPN reservada! Login: ${token.loginVPN}`, "success");
  };

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {myActiveToken && (() => {
            const client = data.clients.find((c) => c.id === myActiveToken.clientId);
            return (
              <div style={{
                background: "rgba(16,185,129,0.1)", border: `1px solid ${K.green}`,
                borderRadius: "12px", padding: "16px 22px", marginBottom: "20px",
                display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: K.green, fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>
                    🔐 Minha VPN Ativa
                  </div>
                  <div style={{ color: K.muted, fontSize: "13px" }}>
                    {myActiveToken.nome} · {client?.nome} · Login: <span style={{ fontFamily: "monospace", color: K.text }}>{myActiveToken.loginVPN}</span>
                  </div>
                </div>
                <button onClick={() => onRelease(myActiveToken, "Liberado pelo consultor")} style={btn(K.red, { padding: "8px 18px" })}>
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
              <div key={client.id} style={{
                background: K.card, borderRadius: "12px", padding: "22px",
                border: `1px solid ${K.border}`, marginBottom: "16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <span style={{ color: K.text, fontWeight: "700", fontSize: "15px" }}>🏢 {client.nome}</span>
                  {freeCount === 0 && clientTokens.length > 0 ? (
                    <span style={{
                      background: "rgba(239,68,68,0.15)", color: K.red,
                      fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "99px",
                    }}>🔴 Todas as VPNs estão em uso</span>
                  ) : (
                    <span style={{
                      background: "rgba(16,185,129,0.15)", color: K.green,
                      fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "99px",
                    }}>{freeCount} livre{freeCount !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {clientTokens.length === 0 ? (
                  <p style={{ color: K.dim, margin: 0, fontSize: "13px" }}>Nenhum token cadastrado.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
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
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState({ clients: [], tokens: [], consultants: [], users: [], logs: [] });
  const [user, setUser] = useState(null);
  const [warnToken, setWarnToken] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const seenWarns = useRef(new Set());
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    (async () => {
      const init = await db.get("init");
      if (!init) {
        await Promise.all([
          db.set("clients", SEED.clients), db.set("tokens", SEED.tokens),
          db.set("consultants", SEED.consultants), db.set("users", SEED.users),
          db.set("logs", SEED.logs), db.set("init", 1),
        ]);
        setData(SEED);
      } else {
        const [cl, tk, cn, us, lg] = await Promise.all([
          db.get("clients"), db.get("tokens"), db.get("consultants"), db.get("users"), db.get("logs"),
        ]);
        setData({
          clients: cl || SEED.clients,
          tokens: tk || SEED.tokens,
          consultants: cn || SEED.consultants,
          users: us || SEED.users,
          logs: lg || SEED.logs,
        });
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(async () => {
      const [tk, lg] = await Promise.all([db.get("tokens"), db.get("logs")]);
      if (tk) setData((p) => ({ ...p, tokens: tk, logs: lg || p.logs }));
    }, 5000);
    return () => clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (!user || user.role !== "consultant") return;
    const myId = user.consultorId;

    const check = () => {
      const { tokens, logs } = dataRef.current;
      const now = Date.now();
      let needsUpdate = false;

      const newTokens = tokens.map((t) => {
        if (t.status !== "ocupado" || !t.startTime) return t;
        const rem = TWO_H - (now - t.startTime);

        if (t.consultorId === myId && rem <= WARN_T && rem > 0 && !seenWarns.current.has(t.id)) {
          seenWarns.current.add(t.id);
          setWarnToken(t);
        }

        if (rem <= -WARN_T) {
          needsUpdate = true;
          const newLog = {
            id: genId(), tokenId: t.id, tokenNome: t.nome, clientId: t.clientId,
            consultorId: t.consultorId,
            inicio: new Date(t.startTime).toISOString(),
            fim: new Date(now).toISOString(), motivo: "Tempo expirado automaticamente",
          };
          const newLogs = [newLog, ...logs];
          db.set("logs", newLogs);
          setData((p) => ({ ...p, logs: newLogs }));
          seenWarns.current.delete(t.id);
          if (warnToken?.id === t.id) setWarnToken(null);
          return { ...t, status: "livre", consultorId: null, startTime: null };
        }

        return t;
      });

      if (needsUpdate) {
        db.set("tokens", newTokens);
        setData((p) => ({ ...p, tokens: newTokens }));
      }
    };

    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [user, warnToken]);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const saveKey = useCallback(async (key, val) => {
    await db.set(key, val);
    setData((p) => ({ ...p, [key]: val }));
  }, []);

  const doRelease = useCallback(async (token, motivo = "Liberado manualmente") => {
    const now = new Date().toISOString();
    const { tokens, logs } = dataRef.current;
    const newLog = {
      id: genId(), tokenId: token.id, tokenNome: token.nome, clientId: token.clientId,
      consultorId: token.consultorId,
      inicio: token.startTime ? new Date(token.startTime).toISOString() : null,
      fim: now, motivo,
    };
    const newTokens = tokens.map((t) => t.id === token.id ? { ...t, status: "livre", consultorId: null, startTime: null } : t);
    const newLogs = [newLog, ...logs];
    await db.set("tokens", newTokens);
    await db.set("logs", newLogs);
    setData((p) => ({ ...p, tokens: newTokens, logs: newLogs }));
    seenWarns.current.delete(token.id);
    if (warnToken?.id === token.id) setWarnToken(null);
    showToast("VPN liberada.", "success");
  }, [warnToken, showToast]);

  const doReserve = useCallback(async (token, consultorId) => {
    const { tokens } = dataRef.current;
    const newTokens = tokens.map((t) => t.id === token.id ? { ...t, status: "ocupado", consultorId, startTime: Date.now() } : t);
    await db.set("tokens", newTokens);
    setData((p) => ({ ...p, tokens: newTokens }));
  }, []);

  const doExtend = useCallback(async (token) => {
    const { tokens } = dataRef.current;
    const newTokens = tokens.map((t) => t.id === token.id ? { ...t, startTime: Date.now() } : t);
    await db.set("tokens", newTokens);
    setData((p) => ({ ...p, tokens: newTokens }));
    seenWarns.current.delete(token.id);
    setWarnToken(null);
    showToast("Sessão estendida por mais 2 horas!", "success");
  }, [showToast]);

  const currentWarnToken = warnToken ? data.tokens.find((t) => t.id === warnToken.id) : null;
  const showWarn = currentWarnToken?.status === "ocupado";
  const myConsultant = user?.role === "consultant" ? data.consultants.find((c) => c.id === user.consultorId) : null;

  if (!ready) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: K.bg, color: K.muted, fontFamily: "sans-serif", fontSize: "15px",
      }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: K.bg, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      position: "relative", overflow: "hidden",
    }}>
      {toast && <Toast toast={toast} />}
      {showWarn && (
        <WarningModal
          token={currentWarnToken}
          onExtend={() => doExtend(currentWarnToken)}
          onRelease={() => doRelease(currentWarnToken, "Sessão encerrada — tempo expirado")}
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
          onReserve={doReserve}
          onLogout={() => setUser(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}