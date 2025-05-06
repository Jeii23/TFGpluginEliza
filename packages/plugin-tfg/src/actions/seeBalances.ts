// seeBalancesAction.ts (refactoritzat)
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
import { balanceService, addressService } from "../services";
import { getSeeBalancesExamples } from "../example";
import type { BalanceResult } from "../type";
export const seeBalancesAction: Action = {
    name: "SEE_BALANCES",
    similes: ["seeBalances", "BALANCE", "CHECK_BALANCE", "WALLET_STATUS"],
    description:
      "Obté el saldo actual i les últimes transaccions d'una adreça Ethereum a Sepolia",
    validate: async (runtime: IAgentRuntime) => {
      await validateTFGConfig(runtime);
      return true;
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State,
      _opts,
      callback: HandlerCallback
    ) => {
      try {
        elizaLogger.info("=== SEE_BALANCES handler start ===");
        elizaLogger.debug("Incoming message:", util.inspect(message, { depth: 2 }));
  
        // 1) Actualitza estat
        if (!state) {
          state = (await runtime.composeState(message)) as State;
          elizaLogger.info("State composed for first time");
        } else {
          state = await runtime.updateRecentMessageState(state);
          elizaLogger.info("State updated with recent message");
        }
        elizaLogger.debug("Current state:", util.inspect(state, { depth: 2 }));
  
        // 2) Determina l'adreça a consultar
        const content = message.content as {
          text?: unknown;
          address?: unknown;
          alias?: unknown;
          error?: unknown;
        };
  
        // Extreure adreça del text si no existeix ja
        if (typeof content.address !== "string" && typeof content.text === "string") {
          const regex = /(0x[a-fA-F0-9]{40})/;
          const m = (content.text as string).match(regex);
          if (m) {
            content.address = m[1].trim();
            elizaLogger.info(`Parsed address from text: ${content.address}`);
          }
        }
  
        const { resolveAddress } = addressService(runtime);
        const address = resolveAddress(state, content);
        elizaLogger.info(`Resolved address: ${address}`);
  
        // 3) Crida al servei
        elizaLogger.info(`Calling balanceService.getBalanceAndTx for ${address}`);
        const { getBalanceAndTx } = balanceService(runtime);
        const balRes: BalanceResult = await getBalanceAndTx(address);
        elizaLogger.debug("Raw balance result:", util.inspect(balRes, { depth: 2 }));
  
        // 4) Preparar map d'àlies (subcomptes)
        let aliasMap: Record<string, string> | undefined;
        if (state.aliases && typeof state.aliases === 'object') {
          aliasMap = state.aliases as Record<string, string>;
        } else if (typeof state.providers === 'string') {
          const match = state.providers.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              aliasMap = JSON.parse(match[0]) as Record<string, string>;
            } catch {
              elizaLogger.warn('Could not parse alias map from providers');
            }
          }
        }
  
        // 5) Funció per mostrar àlies o adreça bruta
        const displayAddr = (addr: string): string => {
          if (aliasMap) {
            for (const [alias, aAddr] of Object.entries(aliasMap)) {
              if (aAddr.toLowerCase() === addr.toLowerCase()) {
                return alias;
              }
            }
          }
          return addr;
        };
  
        // 6) Format llegible de transaccions
        let txInfo = "No s'han trobat moviments recents.";
        if (balRes.transactions.length) {
          txInfo =
            "\nDarreres moviments:\n" +
            balRes.transactions
              .map(tx => {
                const from = displayAddr(tx.from);
                const to = displayAddr(tx.to);
                return `- De ${from} a ${to} per ${tx.value} ETH`;
              })
              .join("\n");
        }
  
        // 7) Text de resposta final
        const textResp =
          `El balanç actual de ${displayAddr(address)} és ${balRes.balanceEth} ETH.` +
          txInfo;
  
        // 8) Retorn al callback
        elizaLogger.info("Invoking callback with formatted response");
        callback({
          text: textResp,
          content: { success: true, ...balRes },
        });
  
        elizaLogger.success(
          `SEE_BALANCES successful for ${address}: ${balRes.balanceEth} ETH`
        );
        return true;
      } catch (err: any) {
        elizaLogger.error("Error in SEE_BALANCES handler:", err);
        callback({
          text: `⚠️ Error obtenint balanç: ${err.message}`,
          content: { error: err.message },
        });
        return false;
      }
    },
    examples: getSeeBalancesExamples as ActionExample[][],
  } as Action;
  