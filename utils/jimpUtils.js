const Jimp = require('jimp');
const axios = require('axios');

const processImage = async (imageBuffer, watermarkUrl, dimensions) => {
    if (!dimensions) {
        throw new Error('No dimensions provided for cropping and watermark positioning.');
    }

    const image = await Jimp.read(imageBuffer);

    try {
        // Download the watermark image from the URL
        const response = await axios({
            url: watermarkUrl,
            responseType: 'arraybuffer'
        });
        const watermarkBuffer = Buffer.from(response.data, 'binary');
        const watermark = await Jimp.read(watermarkBuffer);

        watermark.resize(dimensions.width * 0.33, Jimp.AUTO);

        const x = dimensions.x + (dimensions.width - watermark.bitmap.width) / 2;
        const y = dimensions.y + (dimensions.height - watermark.bitmap.height) / 2;

        image.composite(watermark, x, y, {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacitySource: 0.05 
        });

        image.crop(dimensions.x, dimensions.y, dimensions.width, dimensions.height);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
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
