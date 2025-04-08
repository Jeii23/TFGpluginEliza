import { HDNode } from "ethers/lib/utils";
import { type IAgentRuntime, type Provider, type Memory, type State } from "@elizaos/core";
import { categoryIndexes } from "../type";
import { validateTFGConfig } from "../environment";

export class SubaccountProvider {
  private xpub: string;
  private subaccounts: { [key: string]: string } = {};

  constructor(xpub: string) {
    this.xpub = xpub;
    this.initializeSubaccounts();
  }

  private initializeSubaccounts() {
    for (const category in categoryIndexes) {
      try {
        this.subaccounts[category] = this.deriveAddress(category);
      } catch (error) {
        console.warn(`Error deriving address for category '${category}':`, error);
      }
    }
  }

  private deriveAddress(category: string): string {
    const normalizedCategory = category.toLowerCase();
    const index = categoryIndexes[normalizedCategory];
    if (index === undefined) {
      throw new Error(`Category '${category}' not recognized.`);
    }
    const masterNode = HDNode.fromExtendedKey(this.xpub);
    // Deriva només amb el component no-hardened, ja que el xpub no permet derivar camins hardened.
    const childNode = masterNode.derivePath(String(index));
    return childNode.address;
  }
  
  getSubaccount(category: string): string | null {
    return this.subaccounts[category.toLowerCase()] || null;
  }

  getAllSubaccounts(): { [key: string]: string } {
    return { ...this.subaccounts };
  }
}

export const initSubaccountProvider = async (runtime: IAgentRuntime): Promise<SubaccountProvider> => {
  const config = await validateTFGConfig(runtime);
  return new SubaccountProvider(config.EVM_PUBLIC_XPUB);
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