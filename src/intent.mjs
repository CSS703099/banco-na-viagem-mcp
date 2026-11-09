import { accounts, categories, reference } from "./data.mjs";
const normalize = text => text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
const aliases = [
  ["cartao-empresa", /cartao empresarial|cartao empresa/],
  ["cartao", /cartao viagem|cartao de viagem/],
  ["reserva", /reserva de viagem|poupanca/],
  ["corrente", /conta corrente/],
];

export function interpret(message, filters = {}) {
  const text = normalize(message.trim());
  if (!text) return { reply: "Escreva uma pergunta para consultar a demonstração." };
  if (/\b(pague|pagar|transfira|transferir|enviar pix|fazer pix|contrate|contratar|bloqueie|desbloqueie|cancele|cancelar|solicite|aumentar|invista|investir|compre|comprar passagem)\b/.test(text)) {
    return { reply: "O assistente é somente de consulta. Posso listar contas, saldos, transações e gastos da amostra." };
  }
  if (/\b(hoje|agora|tempo real|atualiz[ea]r|ontem|semana passada|mes passado)\b/.test(text)) {
    return { reply: "A demonstração usa um recorte fixo de 01 a 25/09/2026. Use esse período ou informe duas datas no formato AAAA-MM-DD." };
  }
  const filtersFound = { ...filters };
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (dates?.length) {
    filtersFound.from = dates[0];
    filtersFound.to = dates[1] ?? dates[0];
  }
  const relative = text.match(/ultim[oa]s?\s+(\d+)\s+dias?/);
  if (relative && !dates) {
    const days = Number(relative[1]);
    if (!Number.isSafeInteger(days) || days < 1 || days > 365) {
      return { reply: "Informe um período entre 1 e 365 dias ou escolha datas no filtro." };
    }
    const start = new Date(reference.end + "T00:00:00Z");
    start.setUTCDate(start.getUTCDate() - days + 1);
    filtersFound.from = start.toISOString().slice(0, 10);
    filtersFound.to = reference.end;
  }
  const account = aliases.find(([, pattern]) => pattern.test(text))?.[0];
  if (account) filtersFound.account = account;
  const category = categories.find(c => text.includes(normalize(c)));
  if (category) filtersFound.category = category;

  if (/saldo|divid|limite|credito disponivel|dinheiro disponivel/.test(text)) {
    return { tool: "consultar_saldos", args: {}, account: account ?? filters.account };
  }
  if (/transac|extrato|ultimas compras|movimentacoes recentes/.test(text)) {
    return { tool: "listar_transacoes", args: { ...filtersFound, limit: 5 } };
  }
  if (/gast|categor|resum|padro|consumo/.test(text)) {
    return { tool: "resumir_gastos", args: filtersFound };
  }
  if (/contas?|carteira/.test(text)) {
    return { tool: "listar_contas", args: {}, account: account ?? filters.account };
  }
  if (/^\s*(oi|ola|bom dia|boa tarde|boa noite)[!.?\s]*$/.test(text)) {
    return { reply: "Olá! Posso mostrar suas contas, consultar saldos, listar as últimas transações ou resumir seus gastos de viagem." };
  }
  return { reply: "Posso responder sobre contas, saldos, transações e gastos da amostra. Experimente “Quanto gastei com alimentação?” ou “Últimas transações do cartão viagem”." };
}

export function accountName(id) {
  return accounts.find(account => account.id === id)?.name ?? "Conta";
}
