// utils/updateDescImg_helperFunctions.js
const waitForImagesToLoad = async (page, imageSelectors) => {
    console.log('Waiting for images to load...');
    for (const selector of imageSelectors) {
        console.log(`Checking image ${selector}`);

        const imageExists = await page.evaluate(selector => {
            const img = document.querySelector(selector);
            if (!img) return false;

            const style = window.getComputedStyle(img);
            const isVisible = style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0' &&
                img.offsetHeight > 0 &&
                img.offsetWidth > 0;

            return isVisible;
        }, selector);

        if (!imageExists) {
            console.log(`Image ${selector} does not exist or is not visible, skipping...`);
            continue; // Skip if image does not exist or is invisible
        }

        let imageLoaded = await page.evaluate(selector => {
            const img = document.querySelector(selector);
            return img && img.complete && img.naturalHeight !== 0;
        }, selector);

        if (!imageLoaded) {
            console.log(`Image ${selector} not loaded yet, waiting...`);
            
            try {
                await page.waitForFunction(selector => {
                    const img = document.querySelector(selector);
                    return img && img.complete && img.naturalHeight !== 0;
                }, { timeout: 7500 }, selector); // Use a shorter timeout
            } catch (error) {
                console.warn(`Image ${selector} failed to load within the timeout, skipping...`);
                continue; // Skip if the image doesn't load in the defined timeout
            }

            // Re-check if the image loaded after waiting
            imageLoaded = await page.evaluate(selector => {
                const img = document.querySelector(selector);
                return img && img.complete && img.naturalHeight !== 0;
            }, selector);

            if (imageLoaded) {
                console.log(`Image ${selector} loaded after waiting.`);
            } else {
                console.log(`Image ${selector} did not load, skipping...`);
                continue; // Skip if the image is still not loaded
            }
        } else {
            console.log(`Image ${selector} already loaded.`);
        }
    }
    console.log('Finished checking all images.');
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
