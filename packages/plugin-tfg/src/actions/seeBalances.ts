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
import { balanceService, addressService, deriveAddress} from "../services";
import { getSeeBalancesExamples } from "../example";
import type { BalanceResult } from "../type";
import  { categoryIndexes } from "../type";


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
      // Debug: veure estat i message.content
      elizaLogger.debug("💡 [DEBUG] State after updateRecentMessageState:", util.inspect(state, { depth: null }));
      elizaLogger.debug("💡 [DEBUG] message.content:", util.inspect(message.content, { depth: null }));

      // 2) Determina l'adreça a consultar
      const content = message.content as {
        text?: unknown;
        address?: unknown;
        alias?: unknown;
        error?: unknown;
      };

      // 2.a) Extreu adreça 0x… si n’hi ha una al text
      if (typeof content.address !== "string" && typeof content.text === "string") {
        const m = (content.text as string).match(/(0x[a-fA-F0-9]{40})/);
        if (m) {
          content.address = m[1].trim();
        }
      }

      /* ──────────────── [NOU] ──────────────── */

      // 2.b) Construeix aliasMap
      let aliasMap: Record<string, string> | undefined;

      if (state.aliases && typeof state.aliases === "object") {
        aliasMap = state.aliases as Record<string, string>;
      } else if (typeof state.providers === "string") {
        const match = state.providers.match(/\{[\s\S]*?\}/);  // ← no greedy
        if (match) {
          try {
            aliasMap = JSON.parse(match[0]);
          } catch {
            const cleaned = match[0]
              .replace(/\/\/.*$/gm, "")
              .replace(/,\s*}/g, "}");
            aliasMap = JSON.parse(cleaned);
          }
        }
      }

      if (!aliasMap && runtime.getSetting("XPUB")) {
        aliasMap = {};
        for (const cat of Object.keys(categoryIndexes)) {
          aliasMap[cat] = deriveAddress(runtime.getSetting("XPUB"), cat);
        }
      }

      if (aliasMap) state.aliases = aliasMap;

      // 2.d) Si encara no tenim address ni alias, mira si el text conté un àlies
      if (
        !content.alias &&
        typeof content.text === "string" &&
        aliasMap
      ) {
        for (const alias of Object.keys(aliasMap)) {
          if (new RegExp(`\\b${alias}\\b`, "i").test(content.text as string)) {
            content.alias = alias;          // ← «hipoteca», «cotxe», …
            break;
          }
        }
      }

      /* ──────────────── FI BLOCS NOUS ──────────────── */

      // 2.e) Ara sí, resol l’adreça
      const { resolveAddress } = addressService(runtime);
      const address = resolveAddress(state, content);

      // 3) Crida al servei
      elizaLogger.info(`Calling balanceService.getBalanceAndTx for ${address}`);
      const { getBalanceAndTx } = balanceService(runtime);
      const balRes: BalanceResult = await getBalanceAndTx(address);

      // 4) Preparar map d'àlies (subcomptes)
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

      // 8) Debug del payload i crida al callback
      const payload = {
        action: seeBalancesAction.name,
        text: textResp,
        success: true,
        balanceEth: balRes.balanceEth,
        transactions: balRes.transactions,

        attachments: [
          {
            id: "balance-json",
            url: "",
            title: "Balance JSON",
            source: seeBalancesAction.name,
            description: "Datos de saldo en formato JSON",
            text: JSON.stringify(balRes),
            contentType: "application/json",
          }
        ]
      };

      elizaLogger.debug("💡 [DEBUG] Payload for callback:", util.inspect(payload, { depth: null }));


      if (callback) {
        await callback(payload);

        // 1) Genera un vector "dummy" de 1536 dimensions
        //    Si més endavant vols posar valors reals, simplement reemplaca aquest array.
        const embeddingVector: number[] = new Array(1536).fill(0);

        // 2) Instancia el MemoryManager pel canal "facts"
        const memoryManager = new MemoryManager({
          runtime,
          tableName: "facts",
        });

        // 3) Construeix l'objecte Memory
        const factMemory: Memory = {

          userId: message.userId,
          agentId: runtime.agentId,
          roomId: message.roomId,
          content: { text: `Saldo: ${balRes.balanceEth}` },
          embedding: embeddingVector,   // <-- vector de longitud 1536
          unique: true,
        };

        // 4) Desa la memòria
        await memoryManager.createMemory(factMemory, false);
      }



      elizaLogger.success(
        `SEE_BALANCES successful for ${address}: ${balRes.balanceEth} ETH`
      );
      return true;
    } catch (err: any) {
      elizaLogger.error("Error in SEE_BALANCES handler:", err);
      await callback({
        text: `⚠️ Error obtenint balanç: ${err.message}`,
      });
      return false;
    }
  },
  examples: getSeeBalancesExamples as ActionExample[][],
} as Action;
