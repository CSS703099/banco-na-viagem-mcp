# Especificação do Banco na Viagem

## Contexto

Uma pessoa planeja uma viagem no app de uma agência e quer entender saldo, dívida e gastos sem sair do contexto do roteiro. A interface se chama Banco na Viagem. O assistente se chama Nilo. Use português do Brasil, verde profundo, fundo claro e componentes legíveis em telas pequenas.

## Escopo da primeira entrega

- O chat ocupa o centro da tela, com histórico local, botão de nova conversa, sugestões que enviam perguntas e campo fixo no rodapé. Enter envia e Shift+Enter quebra a linha.
- A interface avisa que os dados são fictícios, com recorte fixo de 01 a 25/09/2026 em USD. O app pode consultar quatro contas de amostra, saldos e 21 movimentações.
- A interpretação de intenções deve chamar apenas ferramentas MCP de leitura. Os valores e tabelas vêm dos resultados das ferramentas. O app mostra o nome da ferramenta na resposta.
- Contas de depósito e cartões têm semânticas diferentes. A apresentação separa dinheiro em conta, dívida e limite de crédito. Valores ausentes aparecem como “Não informado”.
- Transações recentes mostram até cinco registros. Consultas por conta, categoria ou datas usam o período escolhido. O resumo separa compras, reembolsos, renda, transferências e pendências.
- Mensagem fora de escopo, dado ausente e recorte vazio recebem respostas próprias. Bloqueie pedidos de pagamento, transferência, contratação e atualização em tempo real.
- A amostra pode ser consultada sem credenciais. O app não deve solicitar, armazenar nem mostrar credenciais ou dados financeiros reais.

## Critérios de aceite

1. Consultar saldo retorna US$ 2.200,00 de dinheiro disponível, US$ 912,00 de dívida e US$ 498,00 de crédito disponível informado.
2. Alimentação retorna US$ 146,00 de compras confirmadas e US$ 52,00 em saídas pendentes.
3. Extrato do cartão viagem de 23 a 25/09/2026 contém dois registros e distingue seus estados.
4. Interface utilizável a 390 px, com tabelas roláveis, composer visível e menu lateral acionável.
5. Histórico, nova conversa, envio por Enter, botão, sugestões e limpeza de filtros funcionam.
6. Em recorte inválido ou vazio, a resposta explica o problema sem inventar valores.

## Implementação e revisão

O app foi implementado diretamente com HTML, CSS e JavaScript, com o SDK MCP via transporte em memória e a opção STDIO. As ferramentas usam centavos inteiros e esquemas de entrada Zod. Adicionamos filtros também na pergunta, indicação de procedência da resposta e distinção explícita entre crédito conhecido e indisponível.

A segunda etapa é conectar uma fonte de Sandbox atrás de um backend protegido por sessão, manter chaves e tokens no servidor, tratar paginação e disponibilidade da Plaid e, se necessário, adicionar interpretação por modelo de linguagem. A interface mantém a indicação de demonstração até haver uma integração testada.
