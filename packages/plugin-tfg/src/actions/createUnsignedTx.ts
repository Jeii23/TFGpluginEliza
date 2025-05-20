import util from "util";

import {
  elizaLogger,
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  MemoryManager,
  State,
} from "@elizaos/core";
import { validateTFGConfig } from "../environment";
import { getCreateUnsignedTxExamples } from "../example";
import { createUnsignedTxService } from "../services";

export const createUnsignedTxAction: Action = {
  name: "CREATE_UNSIGNED_TX",
  similes: [
    "CREATE_UNSIGNED_TX",
    "UNSIGNED_TRANSACTION",
    "TX_JSON",
    "BUILD_TRANSACTION",
    "createUnsignedTx"
  ],
  description: "Generate a JSON for an unsigned transaction, with the fields 'from', 'to', and 'value'.",
  validate: async (runtime: IAgentRuntime) => {
    await validateTFGConfig(runtime);
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options,
    callback: HandlerCallback
  ) => {
    try {
      // 1) Validació i estat
      await validateTFGConfig(runtime);
      if (!state) {
        state = (await runtime.composeState(message)) as State;
      } else {
        state = await runtime.updateRecentMessageState(state);
      }

      // 2) Generació de la transacció unsigned
      const unsignedTxService = createUnsignedTxService(runtime);
      const unsignedTx = await unsignedTxService.createUnsignedTx(state);
      elizaLogger.success("Successfully created an unsigned transaction");

      if (callback) {
        // 3) Respondre al flux de conversa
        await callback({
          text: `Successfully created an unsigned transaction: ${JSON.stringify(unsignedTx, null, 2)}`,
          content: {
            success: true,
            unsignedTx,
          },
        });

        // 4) Generar embedding “dummy” de 1536 zeros
        const embeddingVector: number[] = new Array(1536).fill(0);

        // 5) Instanciar MemoryManager per “facts”
        const memoryManager = new MemoryManager({
          runtime,
          tableName: "facts",
        });

        // 6) Construir la memòria de fets
        const factMemory: Memory = {
          userId: message.userId,
          agentId: runtime.agentId,
          roomId: message.roomId,
          content: {
            text: `Unsigned TX created: ${JSON.stringify(unsignedTx)}`,
          },
          embedding: embeddingVector,
          unique: true,
        };

        // 7) Desa la memòria
        await memoryManager.createMemory(factMemory, false);
      }

      return true;
    } catch (error: any) {
      elizaLogger.error("Error in CREATE_UNSIGNED_TX handler:", error);
      if (callback) {
        await callback({
          text: `Error creating unsigned transaction: ${error.message}`,
          content: { error: error.message },
        });
      }
      return false;
    }
  },
  examples: getCreateUnsignedTxExamples as ActionExample[][],
} as Action;
