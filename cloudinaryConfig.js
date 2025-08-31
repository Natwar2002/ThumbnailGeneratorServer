// import { v2 as cloudinary } from 'cloudinary';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv'
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

export async function uploadBufferToCloudinary(buffer, folder = "uploads", mimeType = "image/png") {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
            {
                resource_type: "auto",
                folder: folder,
                format: "png", // Force PNG format for consistency
                quality: "auto:good"
            },
            (error, result) => {
                if (error) {
                    console.error("❌ Cloudinary upload error:", error);
                    reject(error);
                } else {
                    console.log("✅ Cloudinary upload success:", result?.secure_url);
                    resolve(result);
                }
            }
        );

        // Push buffer into the stream
        stream.end(buffer);
    });
}

export const deleteImageCloudinary = async (publicId) => {
    try {
        const response = await cloudinary.v2.uploader.destroy(publicId);
        console.log("cloudinary response", response);
    } catch (error) {
        console.log('unable to delete image', error);
        throw error
    }
};