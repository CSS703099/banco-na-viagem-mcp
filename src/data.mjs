export const reference = { start: "2026-09-01", end: "2026-09-25", currency: "USD" };
export const accounts = [
  { id: "corrente", name: "Conta corrente", kind: "depósito", current: 110000, available: 100000, limit: null },
  { id: "reserva", name: "Reserva de viagem", kind: "depósito", current: 121000, available: 120000, limit: null },
  { id: "cartao", name: "Cartão viagem", kind: "crédito", current: 41000, available: null, limit: null },
  { id: "cartao-empresa", name: "Cartão empresarial", kind: "crédito", current: 50200, available: 49800, limit: 100000 },
];

const samples = [
  ["01","corrente","Recebimento mensal","Renda",-180000],
  ["03","corrente","Aporte para viagem","Transferência",35000],
  ["03","reserva","Aporte recebido","Transferência",-35000],
  ["04","cartao","Reserva da pousada","Hospedagem",18500],
  ["05","corrente","Mercado da estação","Alimentação",4265],
  ["07","cartao","Bilhete intermunicipal","Transporte",6100],
  ["09","corrente","Café da praça","Alimentação",1890],
  ["10","cartao","Passeio guiado","Lazer",6800],
  ["11","cartao-empresa","Hospedagem de trabalho","Hospedagem",14600],
  ["12","corrente","Pagamento de cartão","Transferência",9500],
  ["12","cartao","Pagamento recebido","Transferência",-9500],
  ["14","cartao","Reembolso de tarifa","Transporte",-1200],
  ["15","corrente","Mercado da estação","Alimentação",3550],
  ["16","cartao","Almoço no centro","Alimentação",3270],
  ["17","cartao-empresa","Táxi aeroporto","Transporte",4950],
  ["18","cartao","Ingresso do museu","Lazer",2450],
  ["20","cartao","Segunda diária","Hospedagem",14800],
  ["22","corrente","Café da praça","Alimentação",1625],
  ["23","cartao","Metrô e ônibus","Transporte",2240],
  ["24","cartao","Reserva de jantar","Alimentação",5200,true],
  ["25","cartao-empresa","Pré-autorização de hotel","Hospedagem",21000,true],
];
export const transactions = samples.map(([day, account, description, category, cents, pending = false], index) => ({
  id: index + 1, date: `2026-09-${day}`, account, description, category, cents, pending,
}));
export const categories = [...new Set(transactions.map(t => t.category))];
