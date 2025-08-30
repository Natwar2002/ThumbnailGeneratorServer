import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import fs from "fs";
import path from "path";
import 'dotenv/config';

// ✅ Safe binary writer
function saveBinaryFile(fileName, content) {
    fs.writeFile(fileName, content, (err) => {
        if (err) {
            console.error(`❌ Error writing file ${fileName}:`, err);
            return;
        }
        console.log(`✅ File saved: ${fileName}`);
    });
}

export async function main(input, imagePath) {

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    // Read input image
    let buffer, base64Image, mimeType;
    try {
        buffer = fs.readFileSync(imagePath);
        base64Image = buffer.toString("base64");
        mimeType = mime.getType(imagePath) || "image/png";
    } catch (err) {
        console.error("❌ Failed to read input image:", err);
        return [];
    }

    const config = { responseModalities: ["IMAGE", "TEXT"] };
    const model = "gemini-2.5-flash-image-preview";

    const contents = [
        {
            role: "user",
            parts: [
                { text: input?.enhanced || "Generate an image" },
                {
                    inlineData: {
                        mimeType,
                        data: base64Image,
                    },
                },
            ],
        },
    ];

    const response = await ai.models.generateContentStream({
        model,
        config,
        contents,
    });

    const outputFiles = [];
    let fileIndex = 0;

    for await (const chunk of response) {
        const parts = chunk?.candidates?.[0]?.content?.parts;
        if (!parts?.length) continue;

        const part = parts[0];

        // ✅ Handle IMAGE output
        if (part.inlineData?.data) {
            const fileExtension = mime.getExtension(part.inlineData.mimeType || "png");
            const fileName = `output_${Date.now()}_${fileIndex++}.${fileExtension}`;
            const filePath = path.join(process.cwd(), "public", "generate", fileName);

            fs.mkdirSync(path.dirname(filePath), { recursive: true });

            const buffer = Buffer.from(part.inlineData.data, "base64");
            saveBinaryFile(filePath, buffer);

            outputFiles.push(filePath);
        }

        // ✅ Handle TEXT output
        if (chunk.text) {
            console.log("📝 Text Output:", chunk.text);
        }
    }

    console.log("📂 Final Output Files:", outputFiles);
    return outputFiles;
}