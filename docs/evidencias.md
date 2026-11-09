# Evidências de execução

## MCP da Pluggy

O cliente MCP inicializou em `https://mcp.pluggy.ai/mcp` e consultou `search_docs` em português sobre o conceito de Item. A resposta incluiu páginas oficiais de visão geral, glossário e Item. A reprodução está em `node scripts/pluggy-docs.mjs`.

## MCP de demonstração

`npm test` executa três suítes curtas: consultas e validação de argumentos via transporte em memória, conexão com processo separado via STDIO e roteamento de intenções. As verificações cobrem estados pendentes, recortes vazios, datas inválidas, conta desconhecida e recusa de operação de escrita.

| Entrada no chat | Resultado observado |
| --- | --- |
| Consultar meus saldos | US$ 2.200,00 disponíveis, US$ 912,00 de dívida e US$ 498,00 de crédito disponível informado em um de dois cartões. |
| Quanto gastei com alimentação? | Cinco compras confirmadas somaram US$ 146,00. A pendência de US$ 52,00 apareceu separadamente. |
| Últimas transações do cartão viagem nos últimos 3 dias | Dois lançamentos de 23 a 25/09/2026. Reserva de jantar pendente, US$ 52,00. Metrô e ônibus confirmado, US$ 22,40. |

Os valores vêm da amostra local do projeto, em USD. O chat registra a ferramenta MCP ao final de cada resposta que usa dados.
