

import { Plugin } from "@elizaos/core";
import {createUnsignedTxAction } from "./actions/createUnsignedTx";


export const tfgPlugin: Plugin = {
    name: "tfg",
    description: "TFG to secure tx",
    actions: [ createUnsignedTxAction],

    evaluators: [],
    providers: [],
};

export default tfgPlugin;