import { Mastra } from "@mastra/core";
import { bunjangSearchAgent } from "./agents/bunjang-agent";

export const mastra = new Mastra({
  agents: {
    bunjangSearchAgent,
  },
});
