import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv'
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

export const uploadFile = async (filePath, folder = "uploads") => {
    try {
        const result = await cloudinary.uploader.upload(filePath, { folder });
        return result;
    } catch (err) {
        console.error("❌ Cloudinary File Upload Error:", err.message);
        throw err;
    }
};