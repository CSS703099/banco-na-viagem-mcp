import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { accounts, categories, reference, transactions } from "./data.mjs";

const filter = {
  account: z.enum(accounts.map(a => a.id)).optional(),
  category: z.enum(categories).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
};
const selection = z.object(filter).strict();
const withLimit = z.object({ ...filter, limit: z.number().int().min(1).max(50).default(5) }).strict();
const readonly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const sum = (rows, get) => rows.reduce((total, row) => total + get(row), 0);

function select(args) {
  const from = args.from ?? reference.start;
  const to = args.to ?? reference.end;
  if (from > to) throw new Error("A data inicial precisa vir antes da data final.");
  const rows = transactions.filter(t =>
    t.date >= from && t.date <= to &&
    (!args.account || t.account === args.account) &&
    (!args.category || t.category === args.category)
  );
  return { rows, from, to };
}

function balance() {
  const deposit = accounts.filter(a => a.kind === "depósito");
  const credit = accounts.filter(a => a.kind === "crédito");
  return {
    accounts,
    availableCash: sum(deposit, a => a.available ?? 0),
    availableCashKnown: deposit.filter(a => a.available !== null).length,
    depositCount: deposit.length,
    debt: sum(credit, a => Math.max(a.current ?? 0, 0)),
    availableCredit: sum(credit, a => a.available ?? 0),
    availableCreditKnown: credit.filter(a => a.available !== null).length,
    creditCount: credit.length,
  };
}

function summarize(args) {
  const { rows, from, to } = select(args);
  const confirmed = rows.filter(t => !t.pending);
  const spending = confirmed.filter(t => t.cents > 0 && t.category !== "Transferência");
  const grouped = categories.map(category => {
    const items = spending.filter(t => t.category === category);
    return { category, count: items.length, cents: sum(items, t => t.cents) };
  }).filter(row => row.count > 0).sort((a, b) => b.cents - a.cents);
  const refunds = confirmed.filter(t => t.cents < 0 && t.category !== "Transferência" && t.category !== "Renda");
  const transfers = confirmed.filter(t => t.category === "Transferência");
  const pending = rows.filter(t => t.pending);
  return {
    from, to, count: rows.length, confirmedCount: confirmed.length,
    spending: sum(spending, t => t.cents), categories: grouped,
    refunds: -sum(refunds, t => t.cents),
    income: -sum(confirmed.filter(t => t.cents < 0 && t.category === "Renda"), t => t.cents),
    transferCount: transfers.length,
    pendingCount: pending.length,
    pendingOut: sum(pending.filter(t => t.cents > 0), t => t.cents),
    pendingIn: -sum(pending.filter(t => t.cents < 0), t => t.cents),
    topPurchase: [...spending].sort((a, b) => b.cents - a.cents)[0] ?? null,
  };
}

export const toolSpecs = {
  listar_contas: {
    description: "Lista contas, tipos e moeda da amostra fictícia.",
    schema: z.object({}).strict(),
    run: () => ({ accounts }),
  },
  consultar_saldos: {
    description: "Consulta saldos atuais e disponíveis. Separa dinheiro, dívida e crédito.",
    schema: z.object({}).strict(),
    run: balance,
  },
  listar_transacoes: {
    description: "Lista até 50 transações da amostra por conta, categoria e intervalo ISO, incluindo pendentes.",
    schema: withLimit,
    run(args) {
      const { rows, from, to } = select(args);
      const latest = [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
      return { from, to, count: rows.length, transactions: latest.slice(0, args.limit) };
    },
  },
  resumir_gastos: {
    description: "Soma compras confirmadas por categoria. Separa transferências, reembolsos e pendências.",
    schema: selection,
    run: summarize,
  },
};

export function createFinancialServer() {
  const server = new McpServer({ name: "banco-na-viagem-demo", version: "1.0.0" });
  for (const [name, { description, schema, run }] of Object.entries(toolSpecs)) {
    server.registerTool(name, { description, inputSchema: schema, annotations: readonly }, async (args) => {
      try {
        const payload = { source: "Amostra local fictícia", reference, ...run(schema.parse(args)) };
        return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
      } catch {
        return { isError: true, content: [{ type: "text", text: "Não foi possível consultar este recorte. Confira as datas e os filtros." }] };
      }
    });
  }
  return server;
}
