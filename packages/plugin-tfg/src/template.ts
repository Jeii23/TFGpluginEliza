export const unsignedTxTemplate = `You are an AI assistant specialized in constructing Ethereum unsigned transactions. Your task is to extract specific information from user messages and format it into a structured JSON response.

First, review the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract the following information about the requested unsigned transaction:
1. "fromAddress": the sender's Ethereum address. If not provided in the message, determine it based on the user's category: if a category is specified, use the Ethereum subaccount address derived for that category; if no category is provided, use "ElTeuCompte".
2. "toAddress": the recipient's Ethereum address as provided in the message.
3. "amount": the amount in ETH as a string. If the amount is written with a comma (e.g., "0,0001"), convert it to use a dot (e.g., "0.0001").

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify the relevant parts of the user's message:
   - Quote the segment that mentions the recipient address.
   - Quote the segment that mentions the amount.
   - Quote the segment that might indicate the sender address, if present.

2. Validate the extracted information:
   - For "fromAddress", if missing or invalid, default to "ElTeuCompte".
   - For "toAddress", ensure it starts with "0x" and is 42 characters long.
   - For "amount", ensure the format is correct (convert commas to dots if needed).

3. Summarize your analysis.

4. Provide the final JSON output with exactly these keys and no additional text.

After your analysis, provide the final output in a JSON markdown block. The JSON should have the following structure:

\`\`\`json
{
  "fromAddress": string,
  "toAddress": string,
  "amount": string
}
\`\`\`


Now, process the user's request and provide your response.
`;

export const manageSubaccountsTemplate = `You are an AI assistant specialized in managing Ethereum wallet subaccounts derived from an XPUB. Your task is to extract specific information from user messages and format it into a structured JSON response.

First, review the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract the following information about the requested subaccount management action:
1. "action": the subaccount management action requested by the user. It can be "list" or "create". If no clear action is provided, default to "list".
2. "category": (only required if the action is "create") the name of the category for which a new subaccount should be derived. The category name should be in lowercase. If the category is not provided when the action is "create", then return an error message indicating the missing category.

After your analysis, provide the final output in a JSON markdown block. The response must be a valid JSON object with exactly these keys and no additional text or HTML tags.

For action "list", the output should be:

\`\`\`json
{
  "action": "list"
}
\`\`\`

For action "create", the output should be:
\`\`\`json
{
  "action": "create",
  "category": string
}
\`\`\`

If there's an error, the output should be:
\`\`\`json
{
  "action": "create",
  "error": "error message"
}
\`\`\`

Now, process the user's request and provide your response.
`;
