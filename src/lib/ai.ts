import OpenAI from "openai";

// Define a type for MongoDB ObjectId for proper TypeScript handling
// We'll assume the external type is available, or use a basic shape if not.
// In a real Node/Mongoose environment, you might import ObjectId from 'bson' or 'mongodb'.
interface ObjectIdLike {
    toString(): string;
    // ... potentially other ObjectId methods you don't need
}

/**
 * Interface representing the required structure for a category object.
 * We define _id as potentially an ObjectId object (or a string if already processed).
 */
export interface Category {
    _id: string | ObjectIdLike; // <-- UPDATED to handle ObjectId objects
    name: string;
    // Other fields like color, user, createdAt are ignored for API processing
}

/**
 * Interface for the final transaction object to be returned.
 */
export interface Transaction {
    title?: string;
    amount: number;
    currency: string;
    kind: 'expense';
    notes?: string;
    category: string | null; // categoryId (string or null)
    categoryName: string | null; // categoryName (string or null)
    paymentMethod?: 'cash' | 'credit_card' | 'debit_card' | 'upi' | 'net_banking' | 'wallet' | 'other';
}

// ... (ExtractedLineItem, RawResponse, client, and transactionSchema remain the same) ...

/**
 * Interface for a single line item extracted by the AI, before post-processing.
 */
interface ExtractedLineItem {
    title: string;
    amount: number;
    currency: string;
    kind: 'expense';
    notes: string;
    category: string; // Category ID
    categoryName: string; // Category Name
    paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'upi' | 'net_banking' | 'wallet' | 'other';
}

/**
 * Interface for the raw JSON response from the OpenAI model.
 */
interface RawResponse {
    transactions: ExtractedLineItem[];
    storeName: string;
    suggestedPaymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'upi' | 'net_banking' | 'wallet' | 'other';
    suggestedCurrency: string;
}

// Initialize the OpenAI client
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "YOUR_OPENAI_API_KEY_HERE",
});

// Define the strict JSON schema for the OpenAI API
const transactionSchema = {
    type: "json_schema",
    json_schema: {
        name: "transaction_extraction",
        schema: {
            type: "object",
            properties: {
                transactions: {
                    type: "array",
                    description: "A list of expense transactions extracted from the receipt.",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string", description: "The name of the purchased item." },
                            amount: { type: "number", description: "The total price for this specific item (not unit price)." },
                            currency: { type: "string", description: "The currency code (e.g., 'USD', 'INR')." },
                            kind: { type: "string", enum: ['expense'], description: "Must always be 'expense'." },
                            notes: { type: "string", description: "The name of the store. Return an empty string if the store name cannot be identified." },
                            category: { type: "string", description: "The _id of the category." },
                            categoryName: { type: "string", description: "The name of the category matching the selected _id." },
                            paymentMethod: {
                                type: "string",
                                enum: ['cash', 'credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'other'],
                                description: "The payment method used. Return 'other' if not found."
                            },
                        },
                        required: ["title", "amount", "currency", "kind", "category", "categoryName", "paymentMethod", "notes"],
                        additionalProperties: false
                    }
                },
                storeName: { type: "string", description: "The name of the store/restaurant on the receipt. Return an empty string if not found." },
                suggestedPaymentMethod: {
                    type: "string",
                    enum: ['cash', 'credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'other'],
                    description: "The most likely payment method used for the entire bill. Default to 'other'."
                },
                suggestedCurrency: { type: "string", description: "The currency code used on the bill (e.g., 'USD', 'INR'). Default to 'INR' if not specified." }
            },
            required: ["transactions", "storeName", "suggestedPaymentMethod", "suggestedCurrency"],
            additionalProperties: false
        },
        strict: true
    }
} as const;

// --- Main Function ---

/**
 * Parses a receipt image (provided as a Base64 Data URL) to extract and categorize transaction data.
 * @param {string} imageData The Base64 encoded string of the image (e.g., "data:image/jpeg;base64,.....").
 * @param {Category[]} availableCategories A list of category objects. Their _id fields will be converted to strings.
 * @returns {Promise<Transaction[]>} A promise that resolves to an array of formatted transaction objects.
 */
export async function parseReceipt(imageData: string, availableCategories: Category[]): Promise<Transaction[]> {
    if (!imageData) {
        throw new Error("Image data (Base64 string or URL) must be provided.");
    }

    const categoriesAvailable = availableCategories && availableCategories.length > 0;

    // --- CRITICAL CHANGE: Ensure _id is a string before putting it in the prompt ---
    const categoryMap = categoriesAvailable
        ? availableCategories.map(c => {
            // Convert ObjectId or string to a string ID
            const idString = typeof c._id === 'string' ? c._id : c._id.toString();
            return `"${c.name}": { "id": "${idString}", "name": "${c.name}" }`;
        }).join(',\n')
        : '';

    // Create a map for quick ID to Name lookup in post-processing (using string keys)
    const categoryLookup = new Map<string, string>(
        categoriesAvailable
            ? availableCategories.map(c => {
                const idString = typeof c._id === 'string' ? c._id : c._id.toString();
                return [idString, c.name];
            })
            : []
    );
    // ----------------------------------------------------------------------------------

    const categoryInstruction = categoriesAvailable
        ? `For each transaction, look up the best fit category from this map and return its 'id' for the 'category' field and its 'name' for the 'categoryName' field. CATEGORY MAP: { ${categoryMap} }`
        : `Since no categories are provided, set both 'category' and 'categoryName' to the string 'UNCATEGORIZED'.`;

    const systemPrompt = `You are a receipt assistant. Extract all line items from the image into the requested JSON array structure 'transactions'.
        
        **CRITICAL INSTRUCTIONS:**
        1. **Title and Amount:** Extract the name of each purchased item for 'title' and its **TOTAL PRICE** for 'amount'.
        2. **Category Mapping:** ${categoryInstruction}
        3. **Store Name/Notes:** The general store name should be placed in the 'storeName' field. This name will be used for the 'notes' field in the final output.
        4. **Currency and Payment:** Infer the 'currency' and 'paymentMethod' from the bill.
        
        Extract the data into the final JSON structure.`;


    const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: [
                    { type: "text", text: "Analyze this bill and extract the data as a list of financial transactions." },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageData // Accepts the Base64 Data URL string
                        }
                    },
                ],
            },
        ],
        response_format: transactionSchema as any,
    });

    try {
        const result: RawResponse = JSON.parse(response.choices[0].message.content || '{}');

        // Post-processing converts the placeholder 'UNCATEGORIZED' to null.
        const finalTransactions: Transaction[] = result.transactions.map(transaction => {

            const isUncategorized = transaction.category === 'UNCATEGORIZED';

            return {
                ...transaction,

                // Convert placeholder string to null if needed
                category: isUncategorized ? null : transaction.category,
                categoryName: isUncategorized ? null : transaction.categoryName,

                // Override with standardized values
                notes: result.storeName || "",
                currency: result.suggestedCurrency || 'INR',
                paymentMethod: result.suggestedPaymentMethod,
                kind: 'expense'
            };
        });

        return finalTransactions;

    } catch (e) {
        console.error("Error parsing AI response or processing transactions:", e);
        throw new Error("Failed to process the receipt. Check the image data and API key.");
    }
}

// ----------------------------------------------------
// Example Usage and Base64 Utility
// ----------------------------------------------------

/**
 * Utility function to convert a Buffer (from file upload) to a Base64 Data URL string.
 */
export function bufferToBase64(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// NOTE: For testing purposes, you would need to mock or manually create an ObjectId-like structure:
// const mockObjectId = { toString: () => '692443e233d7a8a1373c940b' };
// const exampleCategories: Category[] = [{ _id: mockObjectId, name: "Food" }];