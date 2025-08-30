import express from 'express';
import cors from 'cors';
import rewriteQuery from './rewrite.js';
import { main } from './agent.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { convertTo16by9, convertTo1by1, convertTo9by16 } from './helpers.js';
import { uploadBuffer } from './cloudinaryConfig.js';

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

app.post('/generateThumbnail', upload.single("image"), async (req, res) => {
    if (!req.body.category || !req.body.platform) {
        return res.status(404).json({
            success: false,
            message: "Category and focus is required"
        });
    }
    if (!req.file) {
        return res.status(404).json({
            success: false,
            message: "Image not found"
        });
    }
    let filePath;
    try {
        const tempDir = path.join(process.cwd(), "tmp_uploads");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        filePath = path.join(tempDir, req.file.originalname);
        fs.writeFileSync(filePath, req.file.buffer);

        const buffer = req.file.buffer;

        // Save converted image to /public/temp
        const timestamp = Date.now();
        let convertedPath = "";

        // Crop image into ratios
        if (req.body.platform === 'youtube') {
            convertedPath = `./public/temp/output_${timestamp}_16by9.png`;
            await convertTo16by9(buffer, convertedPath);
        } else if (req.body.platform === 'x' || req.body.platform === 'insta-post') {
            convertedPath = `./public/temp/output_${timestamp}_1by1.png`;
            await convertTo1by1(buffer, convertedPath);
        } else if (req.body.platform === 'insta-reel') {
            convertedPath = `./public/temp/output_${timestamp}_9by16.png`;
            await convertTo9by16(buffer, convertedPath);
        } else {
            return res.status(404).json({
                success: false,
                message: 'Ratio not found'
            });
        }

        console.log('Converted Path: ', convertedPath);

        const rewritten = await rewriteQuery(req.body);
        await main(rewritten, convertedPath);

        // Take the first image from public/generate
        const generateDir = path.join(process.cwd(), "public", "generate");
        const files = fs.readdirSync(generateDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));

        if (!files.length) {
            throw new Error("No images found in public/generate");
        }

        // Pick the first generated image
        const imagePath = path.join(generateDir, files[0]);
        const imageBuffer = fs.readFileSync(imagePath);

        // Upload the image to Cloudinary
        const uploadResult = await uploadBuffer(imageBuffer, "thumbnails");

        // Cleanup local files
        try {
            if (fs.existsSync(convertedPath)) fs.unlinkSync(convertedPath);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (err) {
            console.warn("⚠ Cleanup failed:", err.message);
        }

        // Return Cloudinary URL
        return new Response(
            JSON.stringify({
                url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
            }),
            { status: 200 }
        );

    } catch (error) {
        console.log("Error in generateThumbnail", error);
        if (error.message || error.status) {
            res.status(error?.status || 500).json({
                success: false,
                message: error?.message
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Internal Server Error'
            });
        }
    }
});

app.listen(3000, async () => {
    try {
        console.log('server is running on port http://localhost:3000');
    } catch (error) {
        console.log('Error', error);
    }
})