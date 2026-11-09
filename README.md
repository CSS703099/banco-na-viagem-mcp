# Banco na Viagem

Chat financeiro em português para um cliente que já está no app de uma agência de viagens e quer consultar seus números antes de planejar o roteiro. **Nilo** é o assistente da demonstração. Projeto educacional de Caio Siqueira para a trilha Bradesco Agentes de IA do Zero à Prática, da DIO.

**Dados fictícios · USD · 01 a 25/09/2026.** A amostra foi criada para o projeto. Ela tem quatro contas e 21 movimentações e segue a convenção de sinais da Plaid. As perguntas são interpretadas por regras determinísticas. Cada consulta do chat chama uma ferramenta pelo SDK oficial MCP e mostra qual ferramenta foi usada. O servidor e o cliente rodam em memória no navegador. O mesmo servidor pode rodar via STDIO para uso em um cliente MCP local.

[Abrir a demonstração publicada](https://banco-na-viagem-caio.caio-loguslog.chatgpt.site/)

## O que dá para consultar

| Pergunta | Ferramenta MCP | Dado exibido |
| --- | --- | --- |
| Mostrar minhas contas | `listar_contas` | Conta, tipo e moeda |
| Consultar meus saldos | `consultar_saldos` | Saldo atual, disponível, dívida e limite em campos separados |
| Últimas transações do cartão viagem nos últimos 3 dias | `listar_transacoes` | Até cinco lançamentos, com conta, período e estado |
| Quanto gastei com alimentação? | `resumir_gastos` | Compras confirmadas por categoria, com pendências separadas |
| Resumir minhas movimentações | `resumir_gastos` | Categorias e até três observações calculadas sobre o recorte |

A melhoria escolhida foi permitir filtros por conta, categoria e período tanto na interface quanto na pergunta. Datas explícitas usam AAAA-MM-DD. Períodos relativos são ancorados na data de referência da amostra. O histórico fica no dispositivo e pode ser limpo. A aplicação recusa pedidos de escrita e perguntas sobre dados em tempo real.

## Como rodar

Requer Node.js 22 ou mais recente. Em um terminal, a partir deste diretório:

```bash
npm ci
npm test
npm run build
python -m http.server 8000 --directory dist
```

Abra [http://localhost:8000](http://localhost:8000). Se você já tem a pasta `dist/` pronta, basta o último comando. O app é estático e pode ser hospedado servindo os arquivos dessa pasta.

Para iniciar o servidor MCP local via STDIO, configure o host com comando `node` e argumento de caminho absoluto para `mcp-server.mjs`. Exemplo para o Codex:

```toml
[mcp_servers.banco_na_viagem_demo]
command = "node"
args = ["/caminho/absoluto/banco-na-viagem/mcp-server.mjs"]
```

### Pluggy e Plaid

- **Pluggy Docs** fornece documentação pelo MCP remoto Streamable HTTP `https://mcp.pluggy.ai/mcp`, sem chave para leitura anônima. No Codex, use `[mcp_servers.pluggy_docs]` com `url = "https://mcp.pluggy.ai/mcp"`. `node scripts/pluggy-docs.mjs` reproduz a consulta de documentação. A busca retornou o [guia de Item](https://docs.pluggy.ai/pt/docs/connections/item), que descreve um Item como a conexão associada a um conector de uma instituição e ao consentimento do usuário. A Pluggy não é a origem dos valores do chat.
- **Plaid Sandbox** pode ser configurada no cliente MCP via STDIO com comando `uvx`, argumento `mcp-server-plaid` e `PLAID_CLIENT_ID` e `PLAID_SECRET` fornecidos pelo ambiente seguro do cliente. Confirme as ferramentas disponíveis e use `get_sandbox_access_token` para gerar um Item de laboratório. Contas e transações podem então ser consultadas por `/accounts/get` e `/transactions/get` exclusivamente em `https://sandbox.plaid.com`; o segundo endpoint exige paginação. O token fica no servidor e fora de mensagens, prints e commits. O protótipo usa a **Etapa 1**, sem uma sessão Plaid ativa.
- A [documentação Plaid de transações](https://plaid.com/docs/api/products/transactions/) orienta a interpretação de saída positiva e entrada negativa. O app soma centavos inteiros, separa gastos de transferências, preserva USD e mantém pendências e reembolsos fora do total bruto de compras confirmadas. Um saldo positivo em conta de crédito é exibido como dívida.

## Especificação e validação

- [Especificação para Lovable](docs/openspec-lovable.md), com as diferenças da implementação. O código desta versão foi construído diretamente e a especificação pode ser reutilizada no Lovable.
- [Evidências das consultas e dos testes](docs/evidencias.md).
- [Enunciado na DIO](https://web.dio.me/lab/levando-o-banco-para-onde-o-cliente-ja-esta-um-agente-financeiro-com-mcp/learning/6636d9c7-b6d4-464f-9bca-c65f1c7e8627?back=/track/bradesco-agentes-de-ia-do-zero-a-pratica).
