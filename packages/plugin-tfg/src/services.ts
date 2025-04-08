import { parseEther } from "viem";
import util from "util";
import { HDNode } from "ethers/lib/utils";

import {
  elizaLogger,
  composeContext,
  generateObjectDeprecated,
  ModelClass,
  type IAgentRuntime,
  type State,
} from "@elizaos/core";

import type { BuildParams } from "./type";
import { unsignedTxTemplate } from "./template";
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
function deriveAddress(xpub: string, category: string): string {
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
  
    // Validem que existeixi el camp 'toAddress'.
    if (!unsignedTx.toAddress || unsignedTx.toAddress.trim() === "") {
      throw new Error("Error: Falta 'toAddress' en els paràmetres de la transacció unsigned.");
    }
  
    // Tractem el fromAddress de la mateixa manera que toAddress:
    // Si el model ha retornat un valor vàlid per fromAddress, l'utilitzem; en cas contrari, fem fallback a EVM_PUBLIC_ADDRESS.
    if (unsignedTx.fromAddress && unsignedTx.fromAddress.trim() !== "") {
      unsignedTx.fromAddress = unsignedTx.fromAddress.trim() as `0x${string}`;
    } else {
      const envFromAddress = runtime.getSetting("EVM_PUBLIC_ADDRESS");
      if (envFromAddress && envFromAddress.trim().startsWith("0x")) {
        unsignedTx.fromAddress = envFromAddress.trim() as `0x${string}`;
      } else {
        unsignedTx.fromAddress = "0xElTeuCompte" as `0x${string}`;
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
        from: params.fromAddress ? params.fromAddress.trim() : "0xElTeuCompte",
        to: params.toAddress ? params.toAddress.trim() : "0xReceptorAddress1234567890abcdef",
        value: valueHex,
      }, null, 2));

      return {
        from: params.fromAddress ? params.fromAddress.trim() : "0xElTeuCompte",
        to: params.toAddress ? params.toAddress.trim() : "0xReceptorAddress1234567890abcdef",
        value: valueHex,
      };

    } catch (error: any) {
      console.error("Error creating unsigned transaction:", error.message);
      throw error;
    }
  };

  return { createUnsignedTx };
};
