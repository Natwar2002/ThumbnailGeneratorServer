import sharp from "sharp";

export async function convertTo16by9(inputPath, outputPath, targetWidth = 1920, targetHeight = 1080) {
    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        let desiredHeight = Math.round(metadata.width * (9 / 16));
        if (desiredHeight > metadata.height) {
            desiredHeight = metadata.height; // clamp
        }

        let top = 0;
        if (metadata.height > desiredHeight) {
            const extraHeight = metadata.height - desiredHeight;
            top = Math.round(extraHeight * 0.2);
        }

        await image
            .extract({
                left: 0,
                top,
                width: metadata.width,
                height: desiredHeight,
            })
            .resize(targetWidth, targetHeight)
            .toFile(outputPath);

        console.log(`✅ Saved 16:9 image at ${outputPath}`);
    } catch (err) {
        console.error("❌ Error converting image to 16:9:", err.message);
    }
}

export async function convertTo1by1(inputPath, outputPath, size = 1080, background = { r: 255, g: 255, b: 255 }) {
    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        const minSide = Math.min(metadata.width, metadata.height);
        const left = Math.floor((metadata.width - minSide) / 2);
        const top = Math.floor((metadata.height - minSide) / 2);

        // Crop to square and resize
        await image
            .extract({ left, top, width: minSide, height: minSide })
            .resize(size, size, {
                fit: "fill",
                background
            })
            .toFile(outputPath);

        console.log(`✅ Saved 1:1 image at ${outputPath}`);
    } catch (err) {
        console.error("❌ Error converting image to 1:1:", err.message);
    }
}

export async function convertTo9by16(inputPath, outputPath, targetWidth = 1080, targetHeight = 1920) {
    try {
        const image = sharp(inputPath);
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
            left = Math.round(extraWidth * 0.2); // little off-center like your 16:9 crop
        }

        await image
            .extract({
                left,
                top: 0,
                width: desiredWidth,
                height: metadata.height,
            })
            .resize(targetWidth, targetHeight)
            .toFile(outputPath);

        console.log(`✅ Saved 9:16 image at ${outputPath}`);
    } catch (err) {
        console.error("❌ Error converting image to 9:16:", err.message);
    }
}