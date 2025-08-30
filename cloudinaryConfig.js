import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv'
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

export const uploadBuffer = async (buffer, folder = "uploads") => {
    try {
        return await new Promise((resolve, reject) => {
            cloudinary.uploader
                .upload_stream({ folder }, (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                })
                .end(buffer);
        });
    } catch (err) {
        console.error("❌ Cloudinary Upload Error:", err.message);
        throw err;
    }
};