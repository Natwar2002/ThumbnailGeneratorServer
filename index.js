import express from 'express';
import cors from 'cors';
import fs from "fs";
import path from "path";
import rewriteQuery from './rewrite';
import { uploader } from './cloudinaryConfig';

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

app.post('/generateThumbnail', uploader.single("image"), async (req, res) => {
    if (!req.body.image || !req.body.category || !req.body.focus) {
        return res.status(404).json({
            success: false,
            message: "Image, category and focus is required"
        });
    }
    const rewritten = await rewriteQuery(req.body);
})


server.listen(3000, async () => {
    try {
        console.log('server is running on port http://localhost:3000');
    } catch (error) {
        console.log('Error', error);
    }
})