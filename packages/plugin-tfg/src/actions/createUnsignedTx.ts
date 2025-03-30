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
  description: "Generate a JSON for an unsigned transaction, with the fields 'from', 'to', and 'value'.",
  validate: async (runtime: IAgentRuntime) => {
    // Validem la configuració del TFG per assegurar-nos que el camp PUBLIC_ADDRESS està definit
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
      // Validem la configuració
      await validateTFGConfig(runtime);

      // **** Canvi Realitzat: Actualitzem l'estat per incloure el missatge recent ****
      if (!state) {
        state = (await runtime.composeState(message)) as State;
      } else {
        state = await runtime.updateRecentMessageState(state);
      }
      // Log per comprovar l'estat actualitzat
      //elizaLogger.debug("State actualitzat:",util.inspect(message, { depth: 2, maxArrayLength: 10 }));

      // ***************************************************************************

      // Creem el servei per construir la transacció unsigned
      const unsignedTxService = createUnsignedTxService(runtime);

      // Generem la transacció unsigned a partir de l'estat actual (ara amb el missatge actualitzat)
      const unsignedTx = await unsignedTxService.createUnsignedTx(state);

      elizaLogger.success("Successfully created an unsigned transaction");

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
