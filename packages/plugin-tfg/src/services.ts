import { parseEther } from "viem";
import {
  composeContext,
  generateObjectDeprecated,
  ModelClass,
  type IAgentRuntime,
  type State,
} from "@elizaos/core";

import type { BuildParams } from "./type";
import { unsignedTxTemplate } from "./template";

/**
 * Aquest servei encapsula la creació d'una transacció unsigned.
 * A partir de l'estat actual i la plantilla definida, valida i genera
 * un objecte JSON amb els camps 'from', 'to' i 'value'.
 */
export const createUnsignedTxService = (runtime: IAgentRuntime) => {
  
  // Funció per construir els paràmetres de la transacció unsigned
  const buildUnsignedTx = async (state: State): Promise<BuildParams> => {
    // Componem el context a partir de la plantilla i l'estat actual
    const context = composeContext({
      state,
      template: unsignedTxTemplate,
    });
  
    // Generem els paràmetres utilitzant el model especificat
    const unsignedTx = (await generateObjectDeprecated({
      runtime,
      context,
      modelClass: ModelClass.SMALL,
    })) as BuildParams;
  
    // Validem que s'hagi generat un objecte vàlid
    if (!unsignedTx) {
      throw new Error("Error: No s'han pogut generar els paràmetres per la transacció unsigned.");
    }
  
    // Validem que existeixi el camp 'toAddress'
    if (!unsignedTx.toAddress || unsignedTx.toAddress.trim() === "") {
      throw new Error("Error: Falta 'toAddress' en els paràmetres de la transacció unsigned.");
    }
  
    // Obtenim el valor de 'EVM_PUBLIC_ADDRESS' des de la configuració i validem
    const envFromAddress = runtime.getSetting("EVM_PUBLIC_ADDRESS");
    if (envFromAddress) {
      const trimmedEnv = envFromAddress.trim();
      if (trimmedEnv.startsWith("0x")) {
        unsignedTx.fromAddress = trimmedEnv as `0x${string}`;
      } else {
        throw new Error("EVM_PUBLIC_ADDRESS must be a valid hex string starting with '0x'");
      }
    } else {
      unsignedTx.fromAddress = unsignedTx.fromAddress
        ? (unsignedTx.fromAddress.trim() as `0x${string}`)
        : "0xElTeuCompte" as `0x${string}`;
    }
  
    // Neteja d'espais en els camps d'adreces
    unsignedTx.toAddress = unsignedTx.toAddress.trim() as `0x${string}`;
    if (unsignedTx.fromAddress) {
      unsignedTx.fromAddress = unsignedTx.fromAddress.trim() as `0x${string}`;
    }
  
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
      // Convertim la quantitat (ethers) a la representació hexadecimal en wei
      const valueHex = "0x" + parseEther(params.amount || "1").toString(16);
  
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
