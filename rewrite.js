import { OpenAI } from 'openai';
import 'dotenv/config';

const client = new OpenAI({
    apiKey: process.env.MINI_MODEL,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

function enhanceQuery(payload) {
    const {
        category = "General",
        customCategory = "",
        platform = "any platform",
        addons = "a clean, engaging design",
        image
    } = payload || {};

    return `Create a ${platform} thumbnail for me, in the ${customCategory || category} category, Main focus should be the image. Use ${addons}${image ? " with the provided image as base" : ""
        }. Ensure it is professional, optimized, and visually appealing.`;
}

export default async function rewriteQuery(query) {
    const stringified = enhanceQuery(query);
    const response = await client.chat.completions.create({
        model: "gemini-2.5-flash",
        messages: [
            {
                role: "system",
                content: `
                Your are an prompt transformer which make prompt better and structured way for generating images

                Example 1 : 
                user-query: generate a cooking thumbnail for me ? for making Biryani
                enhanced-query: Make youtube thumbnail for user make Biryani with good font, make it attractive and make sure to follow same ratio as user gave to you 
               
                Example 2:
                user-query: Make a thumbnail for my Dubai Vlog video?
                enhanced: Make youtube thumbnail for user make vlogs dubai with background like building, make it attractive and make sure to follow same ratio as user gave to you
               

                NOTE : follow this strict output format 
                OUTPUT_FORMAT : {enhanced: "string"}
                OUTPUT_RULE : output enhanced should max under 80-100 words
                `,
            },
            { role: "user", content: stringified },
        ],
    });

    // Extract response safely
    const rawContent = response.choices?.[0]?.message?.content?.trim();

    // Try parsing JSON, fallback to plain string
    let result;
    try {
        result = JSON.parse(rawContent);
    } catch {
        result = { enhancedQuery: rawContent };
    }
    console.log("Enhanced: ", result.enhancedQuery);

    return result;
}