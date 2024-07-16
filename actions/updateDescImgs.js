const puppeteer = require('puppeteer-extra');
require("dotenv").config();
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const parentProjectSelectors = require('../selectors/parentProjectSelectors');
const { captureScreenshot, processImage } = require('../utils/jimpUtils');
const { uploadToGoogleDrive } = require('../utils/googleDriveUtils');
const { waitForImagesToLoad, getElementDimensions } = require('../utils/updateDescImg_helperFunctions');
const fetch = require('node-fetch'); // Ensure to install node-fetch if not already installed

async function updateDescImgs(projectName, skuList) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--single-process",
            "--no-zygote",
            "--enable-gpu",
            '--disable-features=site-per-process'
        ],
        executablePath: process.env.NODE_ENV === 'production' ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    const DEVICE_SCALE_FACTOR = 2.5;
    await page.setViewport({ width: 768, height: 1080, deviceScaleFactor: DEVICE_SCALE_FACTOR });

    const sendStatusUpdate = async (eventIndex, sku) => {
        try {
            await fetch('https://trendyadventurer.wixstudio.io/tb-redo/_functions/updateDescImgs_statusUpdate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ eventIndex, sku })
            });
        } catch (error) {
            console.error('Error sending status update:', error);
        }
    };

    try {
        const selectors = parentProjectSelectors[projectName];
        const url = selectors.targetUrl;
        console.log(`Navigating to URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 5000));

        await page.click(`#${selectors.dropdown}`);
        await page.waitForSelector(`#listModal_${selectors.dropdown}`, { visible: true });
        await page.evaluate((dropdownSelector, optionText) => {
            const optionList = document.querySelector(`#listModal_${dropdownSelector}`);
            const options = optionList.querySelectorAll('div');
            options.forEach(option => {
                if (option.innerText.includes(optionText)) {
                    option.click();
                }
            });
        }, selectors.dropdown, selectors.optionText);
        await page.mouse.move(0, 0);

        // Scroll to the bottom of the page
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for one second
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Scroll back to the top of the page
        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });

        for (let i = 0; i < skuList.length; i++) {
            const sku = skuList[i];
            let eventIndexCounter = 0;
            await sendStatusUpdate(++eventIndexCounter, sku); // Log the Processing SKU
            console.log(`Processing SKU: ${sku}`);
            const inputHandle = await page.$(`#${selectors.searchInput}`);
            if (inputHandle) {
                await sendStatusUpdate(++eventIndexCounter, sku); // Locate and Interact with the Input Field
                await page.waitForSelector(`#${selectors.searchInput}`, { visible: true, timeout: 30000 });
                await page.focus(`#${selectors.searchInput}`);
                await page.click(`#${selectors.searchInput}`);
                const inputValueBefore = await page.evaluate((selector) => {
                    return document.querySelector(selector).value;
                }, `#${selectors.searchInput}`);
                if (inputValueBefore !== "") {
                    await page.evaluate((selector) => {
                        document.querySelector(selector).value = '';
                    }, `#${selectors.searchInput}`);
                }
                await page.keyboard.type(sku);
                await page.keyboard.press('Enter');

                // Check if the specified section is visible
                const sectionVisible = await page.evaluate((selector) => {
                    const element = document.querySelector(`#${selector}`);
                    return element && element.offsetParent !== null;
                }, 'comp-lydv3ffl');

                if (sectionVisible) {
                    // Wait for page assets to load after SKU input
                    await sendStatusUpdate(++eventIndexCounter, sku); // Wait for Page Assets to Load
                    await waitForImagesToLoad(page, selectors.pageAssets.map(asset => `#${asset} img`));
                    await new Promise(resolve => setTimeout(resolve, 4000));  // Adjust the timeout as necessary

                    for (const section of selectors.sections) {
                        await page.waitForSelector(`#${section}`);
                    }

                    // Add an additional delay to ensure the page is fully loaded
                    await new Promise(resolve => setTimeout(resolve, 2000));  // Adjust the timeout as necessary

                    // Capture full-length screenshot of the page as a buffer
                    await sendStatusUpdate(++eventIndexCounter, sku); // Capture Screenshot of the Page
                    const screenshotBuffer = await page.screenshot({ fullPage: true });

                    const sectionURLs = [];
                    for (const section of selectors.sections) {
                        try {
                            const dimensions = await getElementDimensions(page, `#${section}`, DEVICE_SCALE_FACTOR);

                            // Process image with JIMP (crop and watermark) using the dimensions
                            await sendStatusUpdate(++eventIndexCounter, sku); // Process Each Section
                            const { buffer: processedImageBuffer, width, height } = await processImage(
                                screenshotBuffer,
                                selectors.watermarkUrl, // Use the URL for the watermark
                                dimensions
                            );

                            // Upload processed image to Google Drive
                            const { link: googleDriveLink } = await uploadToGoogleDrive(processedImageBuffer, selectors.googleDriveConfig, Math.round(width), Math.round(height));

                            sectionURLs.push(googleDriveLink);

                        } catch (error) {
                            console.error(`Error processing section #${section}:`, error.message);
                        }
                    }

                    // Input Google Drive URLs into the page
                    await sendStatusUpdate(++eventIndexCounter, sku); // Input Google Drive URLs into the Page
                    for (let j = 0; j < sectionURLs.length; j++) {
                        if (j > 0) await sendStatusUpdate(++eventIndexCounter, sku); // Input Google Drive URLs into the Page
                        const gURL = sectionURLs[j];
                        const inputSelector = `#${selectors.gURL_inputs[j]}`;
                        
                        const inputVisible = await page.evaluate((selector) => {
                            const element = document.querySelector(selector);
                            return element && element.offsetParent !== null;
                        }, inputSelector);

                        console.log(`input seems to be visible? `, inputVisible);

                        if (inputVisible) {
                            await page.waitForSelector(inputSelector, { visible: true, timeout: 30000 });
                            await page.focus(inputSelector);
                            await page.click(inputSelector);
                            const inputValueBefore = await page.evaluate((selector) => {
                                return document.querySelector(selector).value;
                            }, inputSelector);
                            if (inputValueBefore !== "") {
                                await page.evaluate((selector) => {
                                    document.querySelector(selector).value = '';
                                }, inputSelector);
                            }
                            await page.keyboard.type(gURL);
                            await page.mouse.move(0, 0); // Move mouse away to trigger onChange
                            await page.evaluate((selector) => {
                                const input = document.querySelector(selector);
                                input.blur(); // Explicitly trigger the blur event
                            }, inputSelector);
                        }
                    }

                    // Add an additional delay to ensure the inputs are processed
                    await new Promise(resolve => setTimeout(resolve, 2000));  // Adjust the timeout as necessary    
                }

            }
        }

    } catch (error) {
        console.error('Error in updateDescImgs:', error.message);
    } finally {
        console.log('All finished, closing browser.');
        await browser.close();
    }
}

module.exports = { updateDescImgs };
