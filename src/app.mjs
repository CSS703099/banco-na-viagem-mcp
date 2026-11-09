import { accounts, categories, reference } from "./data.mjs";
import { accountName, interpret } from "./intent.mjs";
import { connectDemo } from "./mcp-client.mjs";

const el = id => document.getElementById(id);
const thread = el("thread");
const input = el("message");
const historyKey = "banco-na-viagem-conversas-v1";
const suggestions = [
  "Mostrar minhas contas", "Consultar meus saldos", "Ver últimas transações",
  "Quanto gastei com alimentação?", "Resumir minhas movimentações",
];
const money = cents => cents == null ? "Não informado" : `US$ ${(cents === 0 ? 0 : cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortDate = value => value.split("-").reverse().join("/");
const esc = value => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);
let conversations = [];
try {
  const saved = JSON.parse(localStorage.getItem(historyKey) ?? "[]");
  if (Array.isArray(saved)) {
    conversations = saved.filter(c => c && typeof c.id === "string" && typeof c.title === "string" &&
      Array.isArray(c.entries) && c.entries.every(e => e && typeof e.text === "string")).slice(0, 12);
  }
} catch { /* The demo also works with browser storage disabled. */ }
let active = conversations[0] ?? fresh();
let connection;
let pending = false;
let focusEntry = false;

function fresh() {
  return { id: Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, "0")).join(""), title: "Nova conversa", entries: [] };
}
function persist() {
  if (!active.entries.length) return;
  conversations = [active, ...conversations.filter(c => c.id !== active.id)].slice(0, 12);
  try { localStorage.setItem(historyKey, JSON.stringify(conversations)); } catch { /* Optional storage. */ }
}
function toggleSidebar(open) {
  el("sidebar").classList.toggle("open", open);
  el("toggle-sidebar").setAttribute("aria-expanded", String(open));
}
function renderHistory() {
  const nav = el("history");
  nav.replaceChildren();
  for (const item of conversations) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.title;
    if (item.id === active.id) button.setAttribute("aria-current", "true");
    button.addEventListener("click", () => {
      if (pending) return;
      active = item;
      toggleSidebar(false);
      render();
    });
    nav.append(button);
  }
}
function table(headers, rows) {
  const heading = headers.map(h => `<th scope="col">${esc(h)}</th>`).join("");
  const body = rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("");
  return `<div class="table-wrap" tabindex="0" aria-label="Tabela rolável"><table><thead><tr>${heading}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function metric(label, value) {
  return `<div class="metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
}
function answerText(tool, data, account) {
  if (tool === "listar_contas" || tool === "consultar_saldos") {
    const rows = account ? data.accounts.filter(a => a.id === account) : data.accounts;
    if (tool === "listar_contas") {
      return { text: `${rows.length} ${rows.length === 1 ? "conta no recorte" : "contas na amostra"}, em USD.`,
        headers: ["Conta", "Tipo", "Moeda"], rows: rows.map(a => [a.name, a.kind, data.reference.currency]) };
    }
    const balances = rows.map(a => [
      a.name, a.kind === "crédito" ? (a.current < 0 ? "Crédito a favor" : "Dívida") : "Saldo",
      money(a.kind === "crédito" && a.current != null ? Math.abs(a.current) : a.current),
      money(a.available), money(a.limit),
    ]);
    return { text: "Saldo de conta e dívida de cartão aparecem separados. Crédito disponível não é dinheiro em conta.",
      metrics: account ? [] : [["Dinheiro disponível", money(data.availableCash)], ["Dívida em cartões", money(data.debt)],
        [`Crédito disponível informado (${data.availableCreditKnown}/${data.creditCount})`, money(data.availableCredit)]],
      headers: ["Conta", "Tipo de saldo", "Atual", "Disponível", "Limite total"], rows: balances };
  }
  const period = `${shortDate(data.from)} a ${shortDate(data.to)}`;
  if (!data.count) return { text: `Nenhum registro da amostra corresponde ao recorte de ${period}. Ajuste os filtros ou volte ao período de 01 a 25/09/2026.` };
  if (tool === "listar_transacoes") {
    return { text: `Mostrando ${data.transactions.length} de ${data.count} registros entre ${period}. Saída e entrada seguem o sinal da transação.`,
      headers: ["Data", "Descrição", "Conta", "Valor", "Situação"],
      rows: data.transactions.map(t => [shortDate(t.date), t.description, accountName(t.account),
        `${t.cents < 0 ? "Entrada" : t.cents > 0 ? "Saída" : "Neutro"} · ${money(Math.abs(t.cents))}`,
        t.pending ? "Pendente" : "Confirmada"]) };
  }
  const observations = [];
  if (data.categories[0]) {
    const top = data.categories[0];
    observations.push(`Maior categoria por valor: ${top.category}, com ${money(top.cents)} em ${top.count} lançamentos confirmados.`);
  }
  if (data.topPurchase) observations.push(`Maior compra confirmada: ${data.topPurchase.description}, de ${money(data.topPurchase.cents)}.`);
  if (data.pendingCount) observations.push(`${data.pendingCount} pendência(s) foram excluídas do consumo. Saídas pendentes: ${money(data.pendingOut)}.`);
  return { text: `${data.count} registros de ${period}, com ${data.confirmedCount} confirmados. Compras, transferências, reembolsos e pendências são apresentados separadamente.`,
    metrics: [["Compras confirmadas", money(data.spending)], ["Entradas de renda", money(data.income)],
      ["Reembolsos confirmados", money(data.refunds)], ["Transferências confirmadas", String(data.transferCount)],
      ["Saídas pendentes", money(data.pendingOut)]],
    bars: data.categories.map(c => ({ label: c.category, value: c.cents, display: money(c.cents) })), observations };
}
function replyMarkup(entry) {
  if (entry.role === "user") return esc(entry.text);
  let html = `<p>${esc(entry.text)}</p>`;
  if (entry.metrics?.length) html += `<div class="metric-grid">${entry.metrics.map(([label, val]) => metric(label, val)).join("")}</div>`;
  if (entry.headers?.length && entry.rows?.length) html += table(entry.headers, entry.rows);
  if (entry.bars?.length) {
    const max = Math.max(...entry.bars.map(b => Number(b.value)));
    html += `<div class="bars" aria-label="Compras confirmadas por categoria">${entry.bars.map(b =>
      `<div class="bar"><span>${esc(b.label)}</span><meter value="${Number(b.value)}" min="0" max="${max}" aria-label="${esc(b.label)}"></meter><b>${esc(b.display)}</b></div>`
    ).join("")}</div>`;
  }
  if (entry.observations?.length) html += `<ol class="patterns">${entry.observations.map(line => `<li>${esc(line)}</li>`).join("")}</ol>`;
  if (entry.tool) html += `<div class="trace">MCP · ${esc(entry.tool)} · Dados fictícios em USD · Ref. 25/09/2026</div>`;
  return html;
}
function render() {
  renderHistory();
  if (!active.entries.length) {
    thread.innerHTML = `<div class="intro"><div class="hero"><span class="kicker">Seu roteiro, seus números</span><h1>Planeje a viagem com suas finanças em vista</h1><p>Sou o Nilo. Consulte saldos, cartões e gastos de uma carteira fictícia sem sair do planejamento da viagem.</p></div><div class="quick-title">Comece com uma pergunta</div><div class="quick"></div></div>`;
    const quick = thread.querySelector(".quick");
    for (const question of suggestions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = question;
      button.addEventListener("click", () => ask(question));
      quick.append(button);
    }
    return;
  }
  const entries = active.entries.map(entry => `<article class="entry ${entry.role === "user" ? "user" : "assistant"}">
    <span class="who">${entry.role === "user" ? "Você" : "Nilo"}</span><div class="bubble">${replyMarkup(entry)}</div></article>`).join("");
  thread.innerHTML = `<div class="transcript">${entries}${pending ? '<div class="entry"><div class="bubble" role="status">Consultando a demonstração…</div></div>' : ""}</div>`;
  if (focusEntry) {
    thread.scrollTop = thread.scrollHeight;
    focusEntry = false;
  }
}
function readFilters() {
  return Object.fromEntries(["account", "category", "from", "to"].map(id => [id, el(id).value]).filter(([, value]) => value));
}
async function ask(raw) {
  if (pending) return;
  const message = raw.trim().slice(0, 400);
  if (!message) { input.focus(); return; }
  if (!active.entries.length) active.title = message.length > 42 ? message.slice(0, 41) + "…" : message;
  active.entries = [...active.entries.slice(-38), { role: "user", text: message }];
  input.value = "";
  pending = true;
  el("send").disabled = true;
  focusEntry = true;
  render();
  let reply;
  try {
    const request = interpret(message, readFilters());
    if (!request.tool) {
      reply = { text: request.reply };
    } else {
      connection ??= connectDemo();
      const { client } = await connection;
      const result = await client.callTool({ name: request.tool, arguments: request.args });
      reply = result.isError || !result.structuredContent
        ? { text: "Não foi possível consultar esse recorte. Verifique as datas e os filtros." }
        : { ...answerText(request.tool, result.structuredContent, request.account), tool: request.tool };
    }
  } catch {
    connection = undefined;
    reply = { text: "A consulta falhou. Confira os filtros ou tente enviar a pergunta novamente." };
  }
  active.entries.push({ role: "assistant", ...reply });
  pending = false;
  el("send").disabled = false;
  persist();
  focusEntry = true;
  render();
}
el("composer").addEventListener("submit", event => {
  event.preventDefault();
  ask(input.value);
});
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    el("composer").requestSubmit();
  }
});
for (const account of accounts) el("account").add(new Option(account.name, account.id));
for (const category of categories) el("category").add(new Option(category, category));
el("from").placeholder = reference.start;
el("to").placeholder = reference.end;
el("clear-filters").addEventListener("click", () => ["account", "category", "from", "to"].forEach(id => { el(id).value = ""; }));
el("new").addEventListener("click", () => {
  if (pending) return;
  active = fresh();
  toggleSidebar(false);
  render();
  input.focus();
});
el("clear-history").addEventListener("click", () => {
  if (pending || !confirm("Apagar as conversas guardadas neste dispositivo?")) return;
  conversations = [];
  active = fresh();
  try { localStorage.removeItem(historyKey); } catch { /* Storage can be disabled. */ }
  render();
});
el("toggle-sidebar").addEventListener("click", () => toggleSidebar(!el("sidebar").classList.contains("open")));
el("about").addEventListener("click", () => el("about-dialog").showModal());
el("close-about").addEventListener("click", () => el("about-dialog").close());
render();
