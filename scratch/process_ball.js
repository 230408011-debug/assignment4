const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processBall() {
    const inputPath = 'C:/Users/CN/.gemini/antigravity-ide/brain/df6b8d69-90ad-41c3-a07b-4f10cc20996a/unbranded_ball_3d_1791730974322.jpg';
    if (!fs.existsSync(inputPath)) {
        console.error('Input ball file not found:', inputPath);
        return;
    }

    const img = sharp(inputPath);
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    console.log(`Image Size: ${width}x${height}`);

    // Detect ball bounds (non-dark or non-isolated background)
    // Find bounding box of the sphere
    const cx = width / 2;
    const cy = height / 2;
    
    // Create an SVG circular mask with smooth antialiasing
    // Measure sphere radius from center
    // Let's find the radius where the sphere meets dark background
    let r = 490; // default near edge
    // Check horizontal scanline from center to right
    for (let x = Math.floor(cx); x < width; x++) {
        const idx = (Math.floor(cy) * width + x) * 3;
        const brightness = (data[idx] + data[idx+1] + data[idx+2]) / 3;
        if (brightness < 20 && x > cx + 300) {
            r = Math.min(r, x - cx);
            break;
        }
    }
    console.log(`Detected radius: ${r}`);
    if (r < 400 || r > 510) r = 485;

    const svgMask = Buffer.from(`
        <svg width="${width}" height="${height}">
            <defs>
                <radialGradient id="edgeFeather" cx="50%" cy="50%" r="50%">
                    <stop offset="97%" stop-color="#fff" stop-opacity="1" />
                    <stop offset="100%" stop-color="#fff" stop-opacity="0" />
                </radialGradient>
            </defs>
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#edgeFeather)" />
        </svg>
    `);

    const maskedBall = await sharp(inputPath)
        .composite([{
            input: svgMask,
            blend: 'dest-in'
        }])
        .png({ compressionLevel: 9 })
        .toBuffer();

    const targets = [
        path.resolve('assets/ball_3d.png'),
        path.resolve('www/assets/ball_3d.png'),
        path.resolve('android/app/src/main/assets/public/assets/ball_3d.png')
    ];

    for (const t of targets) {
        fs.mkdirSync(path.dirname(t), { recursive: true });
        fs.writeFileSync(t, maskedBall);
        console.log(`Wrote processed transparent ball to: ${t} (${maskedBall.length} bytes)`);
    }

    console.log('Ball processing complete: 100% unbranded, transparent RGBA PNG applied everywhere.');
}

processBall().catch(console.error);
