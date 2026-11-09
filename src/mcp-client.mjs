import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createFinancialServer } from "./tools.mjs";

export async function connectDemo() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createFinancialServer();
  const client = new Client({ name: "banco-na-viagem-chat", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, close: async () => { await client.close(); await server.close(); } };
}
