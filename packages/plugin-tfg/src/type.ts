import type {
    Address,
} from "viem";
export interface BuildParams {
    fromAddress: Address;
    toAddress: Address;
    amount: string;
    data?: `0x${string}`;
}