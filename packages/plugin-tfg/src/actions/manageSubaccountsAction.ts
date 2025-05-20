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
  composeContext,
  generateObjectDeprecated,
  ModelClass,
} from "@elizaos/core";
import { categoryIndexes } from "../type";
import { validateTFGConfig } from "../environment";
import { manageSubaccountsExamples } from "../example";
import { initSubaccountProvider } from "../providers/subaccount";
import { manageSubaccountsTemplate } from "../template";

// Extensió de la interfície State per incloure objectius de subcomptes
interface ExtendedState extends State {
  aliasGoals?: Record<string, string>;
}

export const manageSubaccountsAction: Action = {
  name: "MANAGE_SUBACCOUNTS",
  similes: ["MANAGE_SUBACCOUNTS", "LIST_SUBACCOUNTS", "SUBACCOUNTS", "SET_GOAL"],
  description:
    "Llista i gestiona els subcomptes derivats a partir de la xpub del wallet, incloent fixar objectius (goals).",
  validate: async (runtime: IAgentRuntime) => {
    await validateTFGConfig(runtime);
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: ExtendedState,
    _options: { [key: string]: unknown },
    callback: HandlerCallback
  ) => {
    try {
      // 1) Componem o actualitzem l'estat
      if (!state) {
        state = (await runtime.composeState(message)) as ExtendedState;
      } else {
        state = (await runtime.updateRecentMessageState(state)) as ExtendedState;
      }

      // 2) Generem paràmetres des del template
      const context = composeContext({ state, template: manageSubaccountsTemplate });
      const params = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
      })) as { action: string; category?: string; goal?: string };

      // 3) Inicialitzem el provider de subcomptes
      const subaccountProvider = await initSubaccountProvider(runtime);

      // Helper per desar memòria “facts”
      const saveFact = async (factText: string) => {
        const embeddingVector: number[] = new Array(1536).fill(0);
        const memoryManager = new MemoryManager({ runtime, tableName: "facts" });
        const factMemory: Memory = {
          userId: message.userId,
          agentId: runtime.agentId,
          roomId: message.roomId,
          content: { text: factText },
          embedding: embeddingVector,
          unique: true,
        };
        await memoryManager.createMemory(factMemory, false);
      };

      switch (params.action) {
        case "list": {
          const subaccounts = subaccountProvider.getAllSubaccounts();
          elizaLogger.success("Subcomptes derivats correctament.");
          await callback({
            text: `Subcomptes:\n${util.inspect(subaccounts, { depth: null })}`,
            content: { success: true, subaccounts },
          });
          // Desa el fet
          await saveFact(`Llistat de subcomptes: ${Object.keys(subaccounts).join(", ")}`);
          break;
        }

        case "create": {
          if (!params.category) throw new Error("Falta la categoria per crear subcompte.");
          const category = params.category.toLowerCase();
          const subaccount =
            subaccountProvider.getSubaccount(category) ||
            subaccountProvider.createSubaccount(category);
          if (!subaccount) throw new Error(`No s'ha pogut crear subcompte '${category}'.`);
          elizaLogger.success(`Subcompte '${category}' creat amb èxit.`);
          await callback({
            text: `Subcompte '${category}' creat correctament.\nAdreça: ${subaccount}`,
            content: { success: true, category, address: subaccount },
          });
          // Desa el fet
          await saveFact(`Subcompte creat: ${category} → ${subaccount}`);
          break;
        }

        case "set_goal":
        case "setGoal": {
          if (!params.category || !params.goal) {
            throw new Error(
              "Per establir un objectiu, cal indicar categoria i quantitat (e.g. '10 ETH')."
            );
          }
          const category = params.category.toLowerCase();
          // Emmagatzemar l'objectiu al state
          state.aliasGoals = { ...(state.aliasGoals || {}), [category]: params.goal };

          elizaLogger.success(`Objectiu per '${category}' establert a ${params.goal}.`);
          await callback({
            text: `🎯 Objectiu per a '${category}' establert: ${params.goal}.`,
            content: { success: true, category, goal: params.goal },
          });
          // Desa el fet
          await saveFact(`Objectiu establert: ${category} = ${params.goal}`);
          break;
        }

        default:
          throw new Error(`Acció '${params.action}' no reconeguda.`);
      }

      return true;
    } catch (error: any) {
      elizaLogger.error("Error en MANAGE_SUBACCOUNTS action:", error);
      await callback({
        text: `⚠️ Error en gestió de subcomptes: ${error.message}`,
        content: { error: error.message },
      });
      return false;
    }
  },
  examples: manageSubaccountsExamples as ActionExample[][],
} as Action;
