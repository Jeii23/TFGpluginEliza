import type { Address } from "viem";

export interface BuildParams {
    fromAddress: Address;
    toAddress: Address;
    amount: string;
    data?: `0x${string}`;
    category?: string; // Afegida com a propietat opcional
}

// Mapping de categories amb els seus índexs associats
export const categoryIndexes: { [key: string]: number } = {
    "estalvi": 0,
    "viatges": 1,
    "hipoteca": 2,
    "estalvi_llarg_termini": 3,
    // Afegir altres categories si cal
};
/** Resultat estructurat que retornarà el servei */
export interface BalanceResult {
  address: string;
  balanceEth: string;
  transactions: {
    hash: string;
    from: string;
    to: string;
    value: string;   // valor en ETH
    blockNumber: number;
    timeStamp?: number;
  }[];
}