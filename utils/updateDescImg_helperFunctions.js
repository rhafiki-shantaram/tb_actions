// utils/updateDescImg_helperFunctions.js
const waitForImagesToLoad = async (page, imageSelectors) => {
    console.log('Waiting for images to load...');
    for (const selector of imageSelectors) {
        console.log(`Checking image ${selector}`);
        const imageLoaded = await page.evaluate(selector => {
            const img = document.querySelector(selector);
            return img && img.complete && img.naturalHeight !== 0;
        }, selector);
        if (!imageLoaded) {
            console.log(`Image ${selector} not loaded yet, waiting...`);
            await page.waitForFunction(selector => {
                const img = document.querySelector(selector);
                return img && img.complete && img.naturalHeight !== 0;
            }, { timeout: 360000 }, selector);
            console.log(`Image ${selector} loaded.`);
        } else {
            console.log(`Image ${selector} already loaded.`);
        }
    }
    console.log('All images loaded.');
};

const getElementDimensions = async (page, selector, scaleFactor) => {
    const dimensions = await page.evaluate(selector => {
        const element = document.querySelector(selector);
        if (element) {
            const rect = element.getBoundingClientRect();
            return {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            };
        } else {
            return null;
        }
    }, selector);

    if (dimensions) {
        return {
            x: dimensions.x * scaleFactor,
            y: dimensions.y * scaleFactor,
            width: dimensions.width * scaleFactor,
            height: dimensions.height * scaleFactor
        };
    } else {
        throw new Error(`Element with selector "${selector}" not found.`);
    }
};

module.exports = { waitForImagesToLoad, getElementDimensions };
