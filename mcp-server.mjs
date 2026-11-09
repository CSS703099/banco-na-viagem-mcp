import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createFinancialServer } from "./src/tools.mjs";

await createFinancialServer().connect(new StdioServerTransport());
