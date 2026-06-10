import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import path from "node:path";
import { bunjangSearchAgent } from "./agents/bunjang-agent";

const storageUrl = process.env.MASTRA_STORAGE_DB_URL ?? `file:${path.join(process.env.INIT_CWD ?? process.cwd(), "mastra-memory.db")}`;

export const mastra = new Mastra({
  storage: new LibSQLStore({
    id: "bunjang-mastra-storage",
    url: storageUrl,
  }),
  agents: {
    bunjangSearchAgent,
  },
});
