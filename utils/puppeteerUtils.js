const puppeteer = require('puppeteer');

async function captureScreenshot(page, sections) {
    const sectionElements = await Promise.all(
        sections.map(section => page.$(`#${section}`))
    );
    const boundingBoxes = await Promise.all(
        sectionElements.map(section => section.boundingBox())
    );

    const x = Math.min(...boundingBoxes.map(box => box.x));
    const y = Math.min(...boundingBoxes.map(box => box.y));
    const width = Math.max(...boundingBoxes.map(box => box.x + box.width)) - x;
    const height = Math.max(...boundingBoxes.map(box => box.y + box.height)) - y;

    const screenshotBuffer = await page.screenshot({
        clip: { x, y, width, height },
        encoding: 'binary'
    });

    return screenshotBuffer;
}

module.exports = { captureScreenshot };
