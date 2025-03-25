import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const TFGEnvSchema = z.object({
    PUBLIC_ADDRESS: z.string().min(1, "Public address is required"),
});

export type tfgConfig = z.infer<typeof TFGEnvSchema>;

export async function validateTFGConfig(
    runtime: IAgentRuntime
): Promise<tfgConfig> {
    try {
        const config = {
            PUBLIC_ADDRESS: runtime.getSetting("PUBLIC_ADDRESS"),
        };
        console.log('config: ', config)
        return TFGEnvSchema.parse(config);
    } catch (error) {
        console.log("error::::", error)
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Public address failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}