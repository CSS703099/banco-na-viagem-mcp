import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { connectDemo } from "../src/mcp-client.mjs";
import { interpret } from "../src/intent.mjs";

async function invoke(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  assert.equal(result.isError ?? false, false);
  return result.structuredContent;
}

test("MCP em memória: catálogo, saldos, extrato e agregados coerentes", async () => {
  const session = await connectDemo();
  try {
    const { tools } = await session.client.listTools();
    assert.deepEqual(tools.map(t => t.name).sort(), [
      "consultar_saldos", "listar_contas", "listar_transacoes", "resumir_gastos",
    ]);
    assert.ok(tools.every(t => t.annotations.readOnlyHint));
    const b = await invoke(session.client, "consultar_saldos");
    assert.equal(b.availableCash, 220000);
    assert.equal(b.debt, 91200);
    assert.equal(b.availableCredit, 49800);
    assert.equal(b.availableCreditKnown, 1);
    const l = await invoke(session.client, "listar_transacoes");
    assert.equal(l.count, 21);
    assert.equal(l.transactions.length, 5);
    assert.equal(l.transactions[0].date, "2026-09-25");
    assert.equal(l.transactions[0].pending, true);
    const g = await invoke(session.client, "resumir_gastos");
    assert.equal(g.confirmedCount, 19);
    assert.equal(g.transferCount, 4);
    assert.equal(g.pendingCount, 2);
    assert.equal(g.pendingOut, 26200);
    assert.equal(g.refunds, 1200);
    assert.equal(g.income, 180000);
    assert.equal(g.categories[0].category, "Hospedagem");
    const a = await invoke(session.client, "resumir_gastos", { category: "Alimentação" });
    assert.equal(a.spending, 14600);
    assert.equal(a.pendingOut, 5200);
    const c = await invoke(session.client, "listar_transacoes", {
      account: "cartao", from: "2026-09-23", to: "2026-09-23",
    });
    assert.equal(c.transactions[0].description, "Metrô e ônibus");
    const e = await invoke(session.client, "listar_transacoes", { from: "2026-10-01", to: "2026-10-03" });
    assert.deepEqual(e.transactions, []);
    for (const args of [{ from: "2026-09-25", to: "2026-09-01" }, { from: "2026-09-31" }, { account: "inexistente" }]) {
      assert.equal((await session.client.callTool({ name: "listar_transacoes", arguments: args })).isError, true);
    }
  } finally { await session.close(); }
});

test("MCP STDIO: inicializa e consulta um servidor externo ao cliente", async () => {
  const client = new Client({ name: "dio-smoke-test", version: "1.0.0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ["mcp-server.mjs"] }));
  try {
    const data = await invoke(client, "listar_contas");
    assert.equal(data.accounts.length, 4);
    assert.equal(data.reference.currency, "USD");
  } finally { await client.close(); }
});

test("Encaminhamento em português respeita filtros, datas e limite de escopo", () => {
  assert.deepEqual(interpret("Quanto gastei com alimentação?", { account: "cartao" }),
    { tool: "resumir_gastos", args: { account: "cartao", category: "Alimentação" } });
  assert.deepEqual(interpret("Últimas transações do cartão viagem nos últimos 3 dias"),
    { tool: "listar_transacoes", args: { account: "cartao", from: "2026-09-23", to: "2026-09-25", limit: 5 } });
  assert.equal(interpret("Quero pagar meu cartão").tool, undefined);
  assert.match(interpret("Qual é o saldo agora?").reply, /recorte fixo/);
  assert.match(interpret("Saldo do cartão empresarial").account, /cartao-empresa/);
});
