import { OpenAI } from 'openai';
import 'dotenv/config';

const client = new OpenAI({
    apiKey: process.env.MINI_MODEL,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

function enhanceQuery(payload) {
    const {
        category = "",
        customCategory = "",
        addons = "a clean, engaging design",
        focus = "",
    } = payload || {};

    let rewritten = `
        Generate a thumbnail that focuses on the ${focus ? `provided image and ${focus}` : "provided image"}, for ${category || customCategory} category, 
        with ${addons}.`
    return rewritten;
}

export default async function rewriteQuery(query) {
    const stringified = enhanceQuery(query);
    const response = await client.chat.completions.create({
        model: "gemini-2.5-flash",
        response_format: { type: 'json_object' },
        messages: [
            {
                role: "system",
                content: `
                Your are an prompt transformer which make prompt better and structured way for generating images.
                Always ask to use the image while generating a thumbnail, and use the image after removing the background of the image,
                Mostly transform the image according to user's qeury.

                Example 1 : 
                user-query: Generate a thumbnail that focuses on the bgmi and provided image and for gaming category, with a clean, engaging design.
                enhanced: Design a visually striking thumbnail for the Gaming category, focusing specifically on BGMI while integrating the 
                    provided image seamlessly by transforming it according to the userquery focus and category. Use a clean, modern, and engaging layout that captures attention instantly. 
                    Highlight energy, competitiveness, and excitement associated with BGMI, while maintaining clarity and readability. 
                    Ensure balanced use of text, background, and visual effects to create an outstanding, professional-quality thumbnail optimized for maximum audience appeal.

                Example 2:
                user-query: Generate a thumbnail that focuses on the dubai and provided image and for vlog category, with a clean, engaging design.
                enhanced: Design an outstanding thumbnail for a vlog category that highlights Dubai’s iconic skyline and landmarks while 
                    seamlessly integrating the provided image by transforming it according to the userquery focus and category. Ensure the design is clean, modern, and visually engaging, with vibrant colors, 
                    clear text placement, and strong contrast to grab attention. The layout should convey energy and travel excitement, making it 
                    instantly recognizable and appealing for viewers on social platforms.

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
    return result;
}