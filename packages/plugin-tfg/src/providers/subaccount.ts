import { HDNode } from "ethers/lib/utils";
import { type IAgentRuntime, type Provider, type Memory, type State } from "@elizaos/core";
import { categoryIndexes } from "../type";
import { validateTFGConfig } from "../environment";


function deriveAddress(xpub: string, category: string, indexOverride?: number): string {
  const normalizedCategory = category.toLowerCase();
  let index: number;
  if (indexOverride !== undefined) {
    index = indexOverride;
  } else {
    index = categoryIndexes[normalizedCategory];
    if (index === undefined) {
      throw new Error(`Categoria '${category}' no reconeguda.`);
    }
  }
  const masterNode = HDNode.fromExtendedKey(xpub);
  // Derivació relativa sense el prefix "m/"
  const childNode = masterNode.derivePath(String(index));
  return childNode.address;
}

export class SubaccountProvider {
  private xpub: string;
  private subaccounts: { [key: string]: string } = {};

  constructor(xpub: string) {
    this.xpub = xpub;
    this.initializeSubaccounts();
  }

  private initializeSubaccounts() {
    // Carreguem les categories predefinides
    for (const category in categoryIndexes) {
      try {
        this.subaccounts[category] = this.deriveAddress(category);
      } catch (error) {
        console.warn(`Error deriving address for category '${category}':`, error);
      }
    }
  }

  private deriveAddress(category: string): string {
    return deriveAddress(this.xpub, category);
  }
  
  getSubaccount(category: string): string | null {
    return this.subaccounts[category.toLowerCase()] || null;
  }

  getAllSubaccounts(): { [key: string]: string } {
    return { ...this.subaccounts };
  }

  createSubaccount(category: string): string {
    const normalizedCategory = category.toLowerCase();
    if (this.subaccounts[normalizedCategory]) {
      return this.subaccounts[normalizedCategory];
    }
    // Determinem el màxim índex utilitzat en les categories predefinides.
    let maxPredefinedIndex = -1;
    for (const cat in categoryIndexes) {
      if (categoryIndexes[cat] > maxPredefinedIndex) {
        maxPredefinedIndex = categoryIndexes[cat];
      }
    }
    // Comptem els subcomptes creats que no formen part de les predefinides.
    const dynamicCount = Object.keys(this.subaccounts).filter(
      cat => !(cat in categoryIndexes)
    ).length;
    const newIndex = maxPredefinedIndex + dynamicCount + 1;
    const newAddress = deriveAddress(this.xpub, normalizedCategory, newIndex);
    this.subaccounts[normalizedCategory] = newAddress;
    return newAddress;
  }
}

// Variable per emmagatzemar la instància (singleton)
let cachedSubaccountProvider: SubaccountProvider | null = null;

export const initSubaccountProvider = async (runtime: IAgentRuntime): Promise<SubaccountProvider> => {
  if (cachedSubaccountProvider) {
    return cachedSubaccountProvider;
  }
  const config = await validateTFGConfig(runtime);
  cachedSubaccountProvider = new SubaccountProvider(config.EVM_PUBLIC_XPUB);
  return cachedSubaccountProvider;
};

export const subaccountProvider: Provider = {
  async get(
    runtime: IAgentRuntime,
    _message: Memory,
    state?: State
  ): Promise<string | null> {
    try {
      const provider = await initSubaccountProvider(runtime);
      const subaccounts = provider.getAllSubaccounts();
      const agentName = state?.agentName || "The agent";
      
      return `${agentName}'s Subaccounts:\n${JSON.stringify(subaccounts, null, 2)}`;
    } catch (error) {
      console.error("Error in subaccount provider:", error);
      return null;
    }
  },
};
