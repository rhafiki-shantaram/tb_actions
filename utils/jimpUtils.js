const Jimp = require('jimp');
const axios = require('axios');

const processImage = async (imageBuffer, watermarkUrl, dimensions) => {
    if (!dimensions) {
        throw new Error('No dimensions provided for cropping and watermark positioning.');
    }

    try {
        const image = await Jimp.read(imageBuffer);

        // Download the watermark image from the URL
        const response = await axios({
            url: watermarkUrl,
            responseType: 'arraybuffer'
        });
        const watermarkBuffer = Buffer.from(response.data, 'binary');
        const watermark = await Jimp.read(watermarkBuffer);

        // Resize watermark only once
        watermark.resize(dimensions.width * 0.33, Jimp.AUTO);

        const x = dimensions.x + (dimensions.width - watermark.bitmap.width) / 2;
        const y = dimensions.y + (dimensions.height - watermark.bitmap.height) / 2;

        // Composite watermark onto the image
        image.composite(watermark, x, y, {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacitySource: 0.05 
        });

        // Crop the image to the specified dimensions
        image.crop(dimensions.x, dimensions.y, dimensions.width, dimensions.height);

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
            width: Math.round(dimensions.width),
            height: Math.round(dimensions.height)
        };
    } catch (error) {
        console.error('Error processing image:', error.message);
        throw new Error('Failed to process image with watermark.');
    }
};

module.exports = { processImage };
