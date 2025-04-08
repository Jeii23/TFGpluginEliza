import { type Plugin } from "@elizaos/core";
import { createUnsignedTxAction } from "./actions/createUnsignedTx";
import { manageSubaccountsAction } from "./actions/manageSubaccountsAction";
import { subaccountProvider } from "./providers/subaccount";

export const tfgPlugin: Plugin = {
    name: "tfg",
    description: "TFG blockchain integration plugin",
    providers: [subaccountProvider],
    evaluators: [],
    services: [],
    actions: [createUnsignedTxAction, manageSubaccountsAction],
};

export default tfgPlugin;