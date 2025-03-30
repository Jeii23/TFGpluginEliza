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
import { HDNode } from "ethers/lib/utils";
import { categoryIndexes } from "../type";
import { manageSubaccountsExamples } from "../example";


/**
 * Deriva una adreça Ethereum a partir d'una xpub i el nom d'una categoria.
 * La ruta s'assumeix com "m/<index>" (ajusta si necessites un altre esquema).
 */
function deriveAddress(xpub: string, category: string): string {
  const normalizedCategory = category.toLowerCase();
  const index = categoryIndexes[normalizedCategory];
  if (index === undefined) {
    throw new Error(`Categoria '${category}' no reconeguda.`);
  }
  const masterNode = HDNode.fromExtendedKey(xpub);
  const childNode = masterNode.derivePath(`m/${index}`);
  return childNode.address;
}

export const manageSubaccountsAction: Action = {
  name: "MANAGE_SUBACCOUNTS",
  similes: ["MANAGE_SUBACCOUNTS", "LIST_SUBACCOUNTS", "SUBACCOUNTS"],
  description: "Llista i gestiona els subcomptes derivats a partir de la xpub del wallet.",
  validate: async (runtime: IAgentRuntime) => {
    // Validem que la configuració inclogui la xpub
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
      // Validem la configuració per obtenir la xpub
      const config = await validateTFGConfig(runtime);

      // Derivem una adreça per a cada categoria definida
      const subaccounts: { [key: string]: string } = {};
      for (const category in categoryIndexes) {
        try {
          subaccounts[category] = deriveAddress(config.EVM_PUBLIC_XPUB, category);
        } catch (error) {
          elizaLogger.warn(`Error derivant l'adreça per a la categoria '${category}':`, error);
        }
      }
      
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
