import util from "util";
import {
  elizaLogger,
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
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
  description:
    "Generate a JSON for an unsigned transaction, with the fields 'from', 'to', and 'value'.",
  validate: async (runtime: IAgentRuntime) => {
    await validateTFGConfig(runtime);
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback: HandlerCallback
  ) => {
    try {
      // Registra l'estat inicial amb un inspect limitat
      elizaLogger.info("Initial state:", util.inspect(state, { depth: 2, maxArrayLength: 10 }));

      // Componem l'estat amb el missatge de l'usuari
      if (!state) {
        state = await runtime.composeState(message);
        elizaLogger.info("State after composeState:", util.inspect(state, { depth: 2, maxArrayLength: 10 }));
      } else {
        state = await runtime.updateRecentMessageState(state);
        elizaLogger.info("State after updateRecentMessageState:", util.inspect(state, { depth: 2, maxArrayLength: 10 }));
      }

      await validateTFGConfig(runtime);

      const unsignedTxService = createUnsignedTxService(runtime);
      const unsignedTx = await unsignedTxService.createUnsignedTx(state);

      elizaLogger.success("Successfully created an unsigned transaction");
      elizaLogger.info("Unsigned transaction details:", util.inspect(unsignedTx, { depth: 2 }));

      if (callback) {
        callback({
          text: `Successfully created an unsigned transaction: ${JSON.stringify(unsignedTx, null, 2)}`,
          content: {
            success: true,
            unsignedTx,
          },
        });
        return true;
      }
    } catch (error: any) {
      elizaLogger.error("Error in CREATE_UNSIGNED_TX handler:", error);
      if (callback) {
        callback({
          text: `Error creating unsigned transaction: ${error.message}`,
          content: { error: error.message },
        });
      }
      return false;
    }
  },
  examples: getCreateUnsignedTxExamples as ActionExample[][],
} as Action;
