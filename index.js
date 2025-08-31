import express from 'express';
import cors from 'cors';
import rewriteQuery from './rewrite.js';
import { main } from './agent.js';
import multer from 'multer';
import path from 'path';
import jwt from "jsonwebtoken";
import fs from 'fs';
import { convertTo16by9, convertTo1by1, convertTo9by16 } from './helpers.js';
import { uploadFile } from './cloudinaryConfig.js';
import cleanupFiles from './cleanup.js';

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
    if (!req.body.category || !req.body.platform) {
        return res.status(404).json({
            success: false,
            message: "Category and focus is required"
        });
    }
    let filePath;
    let convertedPath;
    let imagePath;

    try {
        // Ensure tmp_uploads dir exists
        const tempDir = path.join(process.cwd(), "tmp_uploads");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        // Save uploaded file temporarily
        filePath = path.join(tempDir, `${Date.now()}_${req.file.originalname}`);
        fs.writeFileSync(filePath, req.file.buffer);

        const buffer = req.file.buffer;
        const timestamp = Date.now();

        // Convert image to correct ratio
        if (req.body.platform === "youtube") {
            convertedPath = `./public/temp/output_${timestamp}_16by9.png`;
            await convertTo16by9(buffer, convertedPath);
        } else if (req.body.platform === "x" || req.body.platform === "insta-post") {
            convertedPath = `./public/temp/output_${timestamp}_1by1.png`;
            await convertTo1by1(buffer, convertedPath);
        } else if (req.body.platform === "insta-reel") {
            convertedPath = `./public/temp/output_${timestamp}_9by16.png`;
            await convertTo9by16(buffer, convertedPath);
        } else {
            return res.status(400).json({
                success: false,
                message: "Unsupported platform ratio",
            });
        }

        // Rewrite query + call AI pipeline
        const rewritten = await rewriteQuery(req.body);
        await main(rewritten, convertedPath);

        console.log("Done..");

        // Take the first image from public/generate
        const generateDir = path.join(process.cwd(), "public", "generate");
        const files = fs
            .readdirSync(generateDir)
            .filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

        if (!files.length) {
            throw new Error("No images found in public/generate");
        }

        imagePath = path.join(generateDir, files[0]);

        // Upload to Cloudinary
        const uploadResult = await uploadFile(imagePath, "thumbnails");

        // ✅ Cleanup temp files
        cleanupFiles([filePath, convertedPath, imagePath]);

        // Return response
        return res.status(201).json({
            success: true,
            message: "Successfully generated the thumbnail",
            data: {
                public_id: uploadResult.public_id,
                url: uploadResult.url,
            },
        });
    } catch (error) {
        console.error("Error in generateThumbnail:", error);

        // Cleanup even on failure
        cleanupFiles([filePath, convertedPath, imagePath]);

        return res.status(error?.status || 500).json({
            success: false,
            message: error?.message || "Internal Server Error",
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