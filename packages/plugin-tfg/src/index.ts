import { type Plugin } from "@elizaos/core";
import { createUnsignedTxAction } from "./actions/createUnsignedTx";
import { manageSubaccountsAction } from "./actions/manageSubaccountsAction";
import { subaccountProvider } from "./providers/subaccount";
import { seeBalancesAction } from "./actions/seeBalances";

export const tfgPlugin: Plugin = {
    name: "tfg",
    description: "TFG blockchain integration plugin",
    providers: [subaccountProvider],
    evaluators: [],
    services: [],
    actions: [createUnsignedTxAction, manageSubaccountsAction,seeBalancesAction],
};

export default tfgPlugin;