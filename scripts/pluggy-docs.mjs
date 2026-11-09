import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "banco-na-viagem-docs", version: "1.0.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL("https://mcp.pluggy.ai/mcp")));
  const { tools } = await client.listTools();
  if (!tools.some(tool => tool.name === "search_docs")) throw new Error("Ferramenta de documentação indisponível.");
  const result = await client.callTool({ name: "search_docs", arguments: {
    query: "O que é um Item na Pluggy? Conexão com um Connector e dados de contas e transações.",
    locale: "pt", limit: 5,
  } });
  if (result.isError) throw new Error("A consulta à documentação falhou.");
  const { results } = JSON.parse(result.content.find(item => item.type === "text").text);
  for (const doc of results) console.log(doc.title + " — " + new URL(doc.url, "https://docs.pluggy.ai"));
} finally {
  await client.close();
}
