const Jimp = require('jimp');
const axios = require('axios');

const processImage = async (imageBuffer, watermarkUrl) => {
    try {
        const image = await Jimp.read(imageBuffer);

        if (watermarkUrl) {
            // Download the watermark image from the URL
            const response = await axios({
                url: watermarkUrl,
                responseType: 'arraybuffer'
            });
            const watermarkBuffer = Buffer.from(response.data, 'binary');
            const watermark = await Jimp.read(watermarkBuffer);

            // Resize watermark to 33% of the image width
            const watermarkWidth = image.bitmap.width * 0.33;
            watermark.resize(watermarkWidth, Jimp.AUTO);

            const x = (image.bitmap.width - watermark.bitmap.width) / 2;
            const y = (image.bitmap.height - watermark.bitmap.height) / 2;

            // Composite watermark onto the image
            image.composite(watermark, x, y, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacitySource: 0.05
            });
        } else {
            console.log('No watermark URL provided, skipping watermark overlay.');
        }

        // Get the buffer directly in the desired format
        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);

        // Explicitly trigger garbage collection
        if (global.gc) {
            global.gc();
        } else {
            console.warn('No GC hook! Start your program as `node --expose-gc file.js`.');
        }

        return {
            buffer,
            width: image.bitmap.width,
            height: image.bitmap.height
        };
    } catch (error) {
        console.error('Error processing image:', error.message);
        throw new Error('Failed to process image.');
    }
};

module.exports = { processImage };
