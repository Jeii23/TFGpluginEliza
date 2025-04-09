import { ActionExample } from "@elizaos/core";


export const manageSubaccountsExamples: ActionExample[][] = [
    [
        {
          user: "assistant",
          content: {
            text: "Llista els meus subcomptes",
            action: "MANAGE_SUBACCOUNTS",
          },
        },
        {
          user: "user",
          content: {
            text: "Mostra'm els meus subcomptes",
            action: "MANAGE_SUBACCOUNTS",
          },
        },
      ],
];


export const getCreateUnsignedTxExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Create an unsigned transaction from ElTeuCompte to 0xReceptorAddress1234567890abcdef",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Generating an unsigned transaction from ElTeuCompte to 0xReceptorAddress1234567890abcdef",
                action: "CREATE_UNSIGNED_TX",
            },
        }
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Can you prepare an unsigned transaction for sending 1.0 ETH to 0xFEDCBA9876543210FEDCBA9876543210FEDCBA9?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Here is your unsigned transaction for transferring 1.0 ETH.",
                action: "CREATE_UNSIGNED_TX",
            },
        }
    ],
];
