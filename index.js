import express from 'express';
import cors from 'cors';
import rewriteQuery from './rewrite.js';
import { main } from './agent.js';
import multer from 'multer';
// import path from 'path';
import jwt from "jsonwebtoken";
// import fs from 'fs';
import { convertTo16by9, convertTo1by1, convertTo9by16 } from './helpers.js';
import { deleteImageCloudinary, uploadBufferToCloudinary } from './cloudinaryConfig.js';
// import cleanupFiles from './cleanup.js';

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

app.get('/ping', (req, res) => {
    res.status(200).json({
        message: 'Pong'
    })
});

const users = [
    { username: "hitesh", password: "hitesh@chaicode" },
    { username: "piyush", password: "piyush@chaicode" }
];

// Signin endpoint
app.post("/signin", (req, res) => {
    const { username, password } = req.body;

    const user = users.find(
        (u) => u.username === username && u.password === password
    );

    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign({ username: user.username }, "my_JWT_Secret-for-this-app", {
        expiresIn: "1h",
    });

    res.json({ success: true, token });
});

app.post('/generateThumbnail', upload.single("image"), async (req, res) => {
    // Validate required fields
    if (!req.body.category || !req.body.platform) {
        return res.status(400).json({
            success: false,
            message: "Category and platform are required"
        });
    }

    // Validate file upload
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No valid file uploaded or file buffer is empty"
        });
    }

    // Validate file type (Gemini supported formats)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
            success: false,
            message: "Unsupported file type. Only JPEG, PNG, WebP, HEIC, and HEIF are allowed"
        });
    }

    // Supported platforms
    const SUPPORTED_PLATFORMS = {
        youtube: "16:9",
        x: "1:1",
        "insta-post": "1:1",
        "insta-reel": "9:16"
    };

    const platform = req.body.platform;

    if (!SUPPORTED_PLATFORMS[platform]) {
        return res.status(400).json({
            success: false,
            message: `Unsupported platform. Supported platforms: ${Object.keys(SUPPORTED_PLATFORMS).join(', ')}`
        });
    }

    let croppedUploadResult;
    let finalUploadResult;

    try {
        const inputBuffer = req.file.buffer;
        console.log("📁 Original file:", {
            size: inputBuffer.length,
            type: req.file.mimetype,
            filename: req.file.originalname
        });

        // Step 1: Crop buffer using helpers
        let croppedBuffer;
        console.log("✂️ Starting image cropping for platform:", platform);

        try {
            if (platform === "youtube") {
                croppedBuffer = await convertTo16by9(inputBuffer);
            } else if (platform === "x" || platform === "insta-post") {
                croppedBuffer = await convertTo1by1(inputBuffer);
            } else if (platform === "insta-reel") {
                croppedBuffer = await convertTo9by16(inputBuffer);
            }
        } catch (cropError) {
            console.error("❌ Cropping failed:", cropError);
            throw new Error(`Image cropping failed: ${cropError.message}`);
        }

        // Validate cropped buffer
        if (!croppedBuffer || !Buffer.isBuffer(croppedBuffer) || croppedBuffer.length === 0) {
            throw new Error("Cropping resulted in empty or invalid buffer");
        }

        console.log("✅ Cropped image size:", croppedBuffer.length, "bytes");

        // Step 2: Upload cropped image to Cloudinary
        console.log("☁️ Uploading cropped image to Cloudinary...");
        try {
            croppedUploadResult = await uploadBufferToCloudinary(
                croppedBuffer,
                "cropped_thumbnails",
                req.file.mimetype
            );
        } catch (uploadError) {
            console.error("❌ Cloudinary upload failed:", uploadError);
            throw new Error(`Failed to upload cropped image: ${uploadError.message}`);
        }

        if (!croppedUploadResult || !croppedUploadResult.secure_url) {
            throw new Error("Failed to get Cloudinary URL for cropped image");
        }

        console.log("✅ Cropped image uploaded:", croppedUploadResult.secure_url);

        // Step 3: Rewrite query for AI
        console.log("🔄 Rewriting query for AI...");
        let rewritten;
        try {
            rewritten = await rewriteQuery(req.body);
            console.log("✅ Query rewritten:", rewritten);
        } catch (rewriteError) {
            console.error("❌ Query rewrite failed:", rewriteError);
            throw new Error(`Query rewrite failed: ${rewriteError.message}`);
        }

        // Step 4: Generate new image using main() with Cloudinary URL
        console.log("🎨 Generating thumbnail with AI...");

        let generatedBuffers;
        try {
            // FIXED: Pass prompt and URL in correct order
            generatedBuffers = await main(rewritten, croppedUploadResult.secure_url);

        } catch (aiError) {
            console.error("❌ AI Generation Error:", aiError);
            throw new Error(`AI generation failed: ${aiError.message}`);
        }

        // Validate generated result
        if (!generatedBuffers || !Array.isArray(generatedBuffers) || generatedBuffers.length === 0) {
            throw new Error("AI generated no image buffers");
        }

        // Combine all generated buffers (in case there are multiple chunks)
        let finalBuffer;
        if (generatedBuffers.length === 1) {
            finalBuffer = generatedBuffers[0];
        } else {
            // Concatenate multiple buffers
            finalBuffer = Buffer.concat(generatedBuffers);
        }

        if (!finalBuffer || finalBuffer.length === 0) {
            throw new Error("AI generated an empty image");
        }

        console.log("✅ Generated image size:", finalBuffer.length, "bytes");

        // Validate image header
        const header = finalBuffer.slice(0, 10).toString('hex');
        const isValidImage =
            header.startsWith('ffd8ff') ||  // JPEG
            header.startsWith('89504e47') || // PNG
            header.startsWith('52494646') || // WebP/RIFF
            header.startsWith('424d');       // BMP

        if (!isValidImage) {
            console.warn("⚠️ Generated buffer may not be a valid image, header:", header);
        }

        // Step 5: Upload final generated image to Cloudinary
        console.log("☁️ Uploading final thumbnail to Cloudinary...");
        try {
            finalUploadResult = await uploadBufferToCloudinary(
                finalBuffer,
                "thumbnails",
                "image/png"
            );
        } catch (finalUploadError) {
            console.error("❌ Final upload failed:", finalUploadError);
            throw new Error(`Failed to upload generated thumbnail: ${finalUploadError.message}`);
        }

        if (!finalUploadResult || !finalUploadResult.secure_url) {
            throw new Error("Failed to get final Cloudinary URL");
        }

        console.log("✅ Final thumbnail uploaded:", finalUploadResult.secure_url);

        // Step 6: Delete cropped image from Cloudinary
        console.log("🗑️ Cleaning up temporary cropped image...");
        if (croppedUploadResult?.public_id) {
            deleteImageCloudinary(croppedUploadResult.public_id)
                .catch(err => console.error("⚠️ Failed to delete cropped image:", err.message));
        }

        return res.status(201).json({
            success: true,
            message: "Thumbnail generated successfully",
            data: {
                public_id: finalUploadResult.public_id,
                url: finalUploadResult.secure_url,
                platform: platform,
                category: req.body.category,
                original_size: inputBuffer.length,
                generated_size: finalBuffer.length
            },
        });

    } catch (error) {
        console.error("❌ Error in generateThumbnail:", error);

        // Comprehensive cleanup
        const cleanupPromises = [];

        if (croppedUploadResult?.public_id) {
            cleanupPromises.push(
                deleteImageCloudinary(croppedUploadResult.public_id)
                    .catch(err => console.error("⚠️ Failed to delete cropped image during cleanup:", err.message))
            );
        }

        if (finalUploadResult?.public_id) {
            cleanupPromises.push(
                deleteImageCloudinary(finalUploadResult.public_id)
                    .catch(err => console.error("⚠️ Failed to delete final image during cleanup:", err.message))
            );
        }

        Promise.allSettled(cleanupPromises);

        let statusCode = 500;
        let errorMessage = error?.message || "Internal Server Error";

        if (errorMessage.includes('required') || errorMessage.includes('Unsupported') || errorMessage.includes('empty')) {
            statusCode = 400;
        } else if (errorMessage.includes('Timeout') || errorMessage.includes('fetch')) {
            statusCode = 408;
        } else if (errorMessage.includes('Cloudinary')) {
            statusCode = 503;
        } else if (errorMessage.includes('AI generation') || errorMessage.includes('Main function')) {
            statusCode = 502;
        } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            statusCode = 429;
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error_type: error.name || "UnknownError",
            platform: platform
        });
    }
});

app.listen(3000, async () => {
    try {
        console.log('server is running on port http://localhost:3000');
    } catch (error) {
        console.log('Error', error);
    }
})