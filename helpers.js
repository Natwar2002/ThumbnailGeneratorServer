import sharp from "sharp";

/**
 * Crop image to 16:9 and return as Buffer
 * @param {Buffer} inputBuffer - Input image buffer
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @returns {Promise<Buffer>}
 */
export async function convertTo16by9(inputBuffer, targetWidth = 1920, targetHeight = 1080) {
    try {
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();

        const desiredHeight = Math.round(metadata.width * (9 / 16));
        let top = 0;

        if (metadata.height > desiredHeight) {
            const extraHeight = metadata.height - desiredHeight;
            top = Math.round(extraHeight * 0.2);
        }

        const outputBuffer = await image
            .extract({ left: 0, top, width: metadata.width, height: desiredHeight })
            .resize(targetWidth, targetHeight)
            .toBuffer();

        console.log(`✅ Converted to 16:9 image buffer`);
        return outputBuffer;
    } catch (err) {
        console.error("❌ Error converting image to 16:9:", err.message);
        throw err;
    }
}

/**
 * Crop image to 1:1 and return as Buffer
 * @param {Buffer} inputBuffer - Input image buffer
 * @param {number} size
 * @param {object} background
 * @returns {Promise<Buffer>}
 */
export async function convertTo1by1(inputBuffer, size = 1080, background = { r: 255, g: 255, b: 255 }) {
    try {
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();

        const minSide = Math.min(metadata.width, metadata.height);
        const left = Math.floor((metadata.width - minSide) / 2);
        const top = Math.floor((metadata.height - minSide) / 2);

        const outputBuffer = await image
            .extract({ left, top, width: minSide, height: minSide })
            .resize(size, size, { fit: "fill", background })
            .toBuffer();

        console.log(`✅ Converted to 1:1 image buffer`);
        return outputBuffer;
    } catch (err) {
        console.error("❌ Error converting image to 1:1:", err.message);
        throw err;
    }
}

export async function convertTo9by16(
    inputBuffer,
    targetWidth = 1080,
    targetHeight = 1920
) {
    try {
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();

        if (!metadata.width || !metadata.height) {
            throw new Error("Image metadata missing width/height");
        }

        let desiredWidth = Math.round(metadata.height * (9 / 16));
        if (desiredWidth > metadata.width) {
            desiredWidth = metadata.width; // clamp
        }

        let left = 0;
        if (metadata.width > desiredWidth) {
            const extraWidth = metadata.width - desiredWidth;
            left = Math.round(extraWidth * 0.2); // slight off-center crop
        }

        const outputBuffer = await image
            .extract({
                left,
                top: 0,
                width: desiredWidth,
                height: metadata.height,
            })
            .resize(targetWidth, targetHeight)
            .toBuffer();

        console.log(`✅ Converted to 9:16 image buffer`);
        return outputBuffer;
    } catch (err) {
        console.error("❌ Error converting image to 9:16:", err.message);
        throw err;
    }
}