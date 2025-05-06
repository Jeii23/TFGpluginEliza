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


export const getSeeBalancesExamples: ActionExample[][] = [
  [
    {
      user: "{{user1}}",
      content: {
        text: "Digues‑me el balanç de l'adreça de la hipoteca, si us plau.",
      },
    },
    {
      user: "{{agent}}",
      content: {
        text: "Aquí tens el balanç i les darreres transaccions de l'adreça de la hipoteca.",
        action: "SEE_BALANCES",
      },
    },
  ],
  [
    {
      user: "{{user1}}",
      content: {
        text: "What’s the current balance of 0x111122223333444455556666777788889999AAAA?",
      },
    },
    {
      user: "{{agent}}",
      content: {
        text: "Fetching the balance for 0x1111…AAAA",
        action: "SEE_BALANCES",
      },
    },
  ],
];
