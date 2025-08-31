import fs from 'fs';

export default function cleanupFiles(paths) {
    for (const p of paths) {
        if (p && fs.existsSync(p)) {
            try {
                fs.unlinkSync(p);
                console.log("🗑 Deleted temp file:", p);
            } catch (err) {
                console.warn("⚠ Cleanup failed for:", p, err.message);
            }
        }
    }
}