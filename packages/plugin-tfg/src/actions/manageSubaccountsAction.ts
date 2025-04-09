import util from "util";
import {
  elizaLogger,
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
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

export const manageSubaccountsAction: Action = {
  name: "MANAGE_SUBACCOUNTS",
  similes: ["MANAGE_SUBACCOUNTS", "LIST_SUBACCOUNTS", "SUBACCOUNTS"],
  description: "Llista i gestiona els subcomptes derivats a partir de la xpub del wallet.",
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
      if (!state) {
        state = (await runtime.composeState(message)) as State;
      } else {
        state = await runtime.updateRecentMessageState(state);
      }

      const context = composeContext({
        state,
        template: manageSubaccountsTemplate,
      });

      const params = await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
      });

      const subaccountProvider = await initSubaccountProvider(runtime);
      
      switch (params.action) {
        case "list":
          const subaccounts = subaccountProvider.getAllSubaccounts();
          elizaLogger.success("Subcomptes derivats correctament.");
          if (callback) {
            callback({
              text: `Subcomptes:\n${util.inspect(subaccounts, { depth: null })}`,
              content: {
                success: true,
                subaccounts,
              },
            });
          }
          break;

        case "create":
          // Per a crear un nou subcompte, utilitzem el mètode createSubaccount
          const category = params.category.toLowerCase();
          const subaccount = subaccountProvider.getSubaccount(category) ||
                             subaccountProvider.createSubaccount(category);
          
          if (subaccount) {
            elizaLogger.success(`Subcompte per a la categoria '${category}' creat correctament.`);
            if (callback) {
              callback({
                text: `Subcompte per a la categoria '${category}' creat correctament.\nAdreça: ${subaccount}`,
                content: {
                  success: true,
                  category,
                  address: subaccount,
                },
              });
            }
          } else {
            throw new Error(`No s'ha pogut crear el subcompte per a la categoria '${category}'`);
          }
          break;

        case "delete":
          throw new Error("L'acció 'delete' no està implementada encara");
          
        default:
          throw new Error(`Acció '${params.action}' no reconeguda`);
      }
      
      return true;
    } catch (error: any) {
      elizaLogger.error("Error en la gestió de subcomptes:", error);
      if (callback) {
        callback({
          text: `Error en la gestió de subcomptes: ${error.message}`,
          content: { error: error.message },
        });
      }
      return false;
    }
  },
  examples: manageSubaccountsExamples as ActionExample[][],
} as Action;
