import { parseEther } from "viem";
import util from "util";
import { HDNode } from "ethers/lib/utils";
import { ethers } from "ethers";

import {
  elizaLogger,
  composeContext,
  generateObjectDeprecated,
  ModelClass,
  type IAgentRuntime,
  type State,
} from "@elizaos/core";

import type { BuildParams,BalanceResult } from "./type";
import { unsignedTxTemplate,seeBalancesTemplate } from "./template";
import { categoryIndexes } from "./type";
import { initSubaccountProvider } from "./providers/subaccount";

/**
 * Deriva una adreça Ethereum a partir de la xpub i la categoria especificada.
 * La derivació es fa a partir d'un índex que s'obté del mapping "categoryIndexes".
 * 
 * @param xpub Clau pública estesa (xpub) del wallet.
 * @param category Nom de la categoria (per exemple, "viatges").
 * @returns Adreça Ethereum derivada corresponent a la categoria.
 */
export const deriveAddress = (xpub: string, category: string) => {
  const normalizedCategory = category.toLowerCase();
  const index = categoryIndexes[normalizedCategory];
  if (index === undefined) {
    throw new Error(`Categoria '${category}' no reconeguda.`);
  }
  const masterNode = HDNode.fromExtendedKey(xpub);
  // Derivació relativa sense el prefix "m/"
  const childNode = masterNode.derivePath(String(index));
  return childNode.address;
}

/**
 * Aquest servei encapsula la creació d'una transacció unsigned.
 * A partir de l'estat actual i la plantilla definida, valida i genera
 * un objecte JSON amb els camps 'from', 'to' i 'value'.
 */
export const createUnsignedTxService = (runtime: IAgentRuntime) => {
  // Funció per construir els paràmetres de la transacció unsigned
  const buildUnsignedTx = async (state: State): Promise<BuildParams> => {
    // Componem el context a partir de la plantilla i l'estat actual.
    const context = composeContext({
      state,
      template: unsignedTxTemplate,
    });
  
    // Generem els paràmetres utilitzant el model especificat.
    const unsignedTx = (await generateObjectDeprecated({
      runtime,
      context,
      modelClass: ModelClass.SMALL,
    })) as BuildParams;
  
    // Validem que s'hagi generat un objecte vàlid.
    if (!unsignedTx) {
      throw new Error("Error: No s'han pogut generar els paràmetres per la transacció unsigned.");
    }
  /*
    // Validem que existeixi el camp 'toAddress'.
    if (!unsignedTx.toAddress || unsignedTx.toAddress.trim() === "") {
      throw new Error("Error: Falta 'toAddress' en els paràmetres de la transacció unsigned.");
    }
  */
    // Tractem el fromAddress de la mateixa manera que toAddress:
    // Si el model ha retornat un valor vàlid per fromAddress, l'utilitzem; en cas contrari, fem fallback a EVM_PUBLIC_ADDRESS.
    if (unsignedTx.fromAddress && unsignedTx.fromAddress.trim().startsWith("0x")) {
      elizaLogger.info(`S'ha trobat un fromAddress vàlid: ${unsignedTx.fromAddress.trim()}`);
      unsignedTx.fromAddress = unsignedTx.fromAddress.trim() as `0x${string}`;
    } else {
      const envFromAddress = runtime.getSetting("EVM_PUBLIC_ADDRESS");
      if (envFromAddress && envFromAddress.trim().startsWith("0x")) {
        unsignedTx.fromAddress = envFromAddress.trim() as `0x${string}`;
      }
    }
  
    // Neteja d'espais en els camps d'adreces.
    unsignedTx.toAddress = unsignedTx.toAddress.trim() as `0x${string}`;
  
    return unsignedTx;
  };
  

  /**
   * Crea una transacció unsigned en format JSON.
   * @param state - Estat actual que conté els paràmetres.
   * @returns Un objecte JSON amb els camps 'from', 'to' i 'value'.
   */
  const createUnsignedTx = async (state: State): Promise<object> => {
    try {
      const params = await buildUnsignedTx(state);
      // Convertim la quantitat (en ETH) a la representació hexadecimal en wei
      const valueHex = "0x" + parseEther(params.amount || "1").toString(16);

      // Log abans de retornar
      elizaLogger.debug("Transacció unsigned final:", JSON.stringify({
        from: params.fromAddress ,
        to: params.toAddress ,
        value: valueHex,
        data: params.data,

      }, null, 2));

      return {
        from: params.fromAddress,
        to: params.toAddress ,
        value: valueHex,
        data: params.data,

      };

    } catch (error: any) {
      console.error("Error creating unsigned transaction:", error.message);
      throw error;
    }
  };

  return { createUnsignedTx };
};





/**
 * Servei que consulta saldo i històric de transaccions a Sepolia.
 * Cal que la variable d’entorn EVM_PROVIDER_URL estigui definida.
 */
export const balanceService = (runtime: IAgentRuntime) => {
  const getProvider = () =>
    new ethers.providers.JsonRpcProvider(
      runtime.getSetting("EVM_PROVIDER_URL") || process.env.EVM_PROVIDER_URL
    );

  /** Consulta el balanç i (opcionalment) les darreres N transaccions */
  const getBalanceAndTx = async (
    address: string,
    txLimit = 5
  ): Promise<BalanceResult> => {
    const provider = getProvider();

    // --- SALDO ---
    const balanceWei = await provider.getBalance(address);
    const balanceEth = ethers.utils.formatEther(balanceWei);

    // --- TRANSACCIONS ---
    // QuickNode RPC personalitzat
    let txs: BalanceResult["transactions"] = [];
    try {
      const txHistory = await provider.send("qn_getTransactionsByAddress", [
        { address, page: 1, perPage: txLimit },
      ]);
      // 1) Extreiem correctament la llista:
      const items: any[] = txHistory.paginatedItems || [];
      // 2) Mapegem amb els noms reals:
      txs = items.map(tx => ({
        hash: tx.transactionHash,
        from: tx.fromAddress,
        to: tx.toAddress,
        value: ethers.utils.formatEther(tx.value ?? "0"),
        blockNumber: Number(tx.blockNumber),
        timeStamp: tx.blockTimestamp
          ? Math.floor(new Date(tx.blockTimestamp).getTime() / 1000)
          : undefined,
      }));
    } catch (err) {
      elizaLogger.warn(
        "No s'ha pogut obtenir l'històric via qn_getTransactionsByAddress – potser el teu endpoint no té el mòdul activat."
      );
    }
    

    return { address, balanceEth, transactions: txs };
  };

  return { getBalanceAndTx };
};
export const createSeeBalancesService = (runtime: IAgentRuntime) => {
  // 1) Build params via model (determina adreça)
  const buildParams = async (state: State): Promise<{ address: string }> => {
    const context = composeContext({ state, template: seeBalancesTemplate });
    const params = (await generateObjectDeprecated({
      runtime,
      context,
      modelClass: ModelClass.SMALL,
    })) as { address?: string };

    let addr = params.address?.trim();
    if (!addr || !addr.startsWith("0x")) {
      const fallback = runtime.getSetting("EVM_PUBLIC_ADDRESS");
      if (!fallback || !fallback.startsWith("0x")) {
        throw new Error("No s'ha pogut determinar cap adreça Ethereum.");
      }
      addr = fallback.trim();
    }
    return { address: addr };
  };

  // 2) Crida al servei real
  const seeBalances = async (state: State): Promise<BalanceResult> => {
    const { address } = await buildParams(state);
    return balanceService(runtime).getBalanceAndTx(address);
  };

  return { seeBalances };
};
export const addressService = (runtime: IAgentRuntime) => {
  /**
   * Resoldrà la adreça Ethereum a partir de:
   * 1) message.content.address
   * 2) message.content.alias → state.aliases
   * 3) state.targetAddress
   * 4) fallback a EVM_PUBLIC_ADDRESS d’entorn
   */
  const resolveAddress = (
    state: State,
    content: { address?: unknown; alias?: unknown; error?: unknown }
  ): string => {
    if (typeof content.error === "string") {
      throw new Error(content.error);
    }

    let addr: string | undefined;
    if (typeof content.address === "string") {
      addr = content.address.trim();
      elizaLogger.info(`Address from content.address: ${addr}`);
    } else if (
      typeof content.alias === "string" &&
      state.aliases &&
      typeof state.aliases[content.alias] === "string"
    ) {
      addr = (state.aliases[content.alias] as string).trim();
      elizaLogger.info(`Address from alias '${content.alias}': ${addr}`);
    } else if (typeof state.targetAddress === "string") {
      addr = state.targetAddress.trim();
      elizaLogger.info(`Address from state.targetAddress: ${addr}`);
    } else {
      // fallback a la variable d’entorn
      const envAddr = runtime.getSetting("EVM_PUBLIC_ADDRESS");
      if (envAddr && envAddr.trim().startsWith("0x")) {
        addr = envAddr.trim();
        elizaLogger.info(`Fallback address from EVM_PUBLIC_ADDRESS: ${addr}`);
      }
    }

    if (!addr) {
      throw new Error(
        "No s'ha pogut determinar cap adreça Ethereum de la qual mostrar el balanç."
      );
    }
    return addr;
  };

  return { resolveAddress };
};

export function generateUUIDv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}