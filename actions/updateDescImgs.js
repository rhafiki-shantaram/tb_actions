const puppeteer = require('puppeteer-extra');
require("dotenv").config();
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const parentProjectSelectors = require('../selectors/parentProjectSelectors');
const { processImage } = require('../utils/jimpUtils');
const { uploadToGoogleDrive } = require('../utils/googleDriveUtils');
const { waitForImagesToLoad } = require('../utils/updateDescImg_helperFunctions');
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
        console.log(`update at step ${eventIndex}`);
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

                await new Promise(resolve => setTimeout(resolve, 2000));  // Adjust the timeout as necessary

                // Check if the specified sections are visible dynamically
                const visibleSections = await page.evaluate((sections) => {
                    return sections.filter(selector => {
                        const element = document.querySelector(`#${selector}`);
                        if (!element) return false;

                        const style = window.getComputedStyle(element);
                        const isVisible = style.display !== 'none' &&
                                        style.visibility !== 'hidden' &&
                                        style.opacity !== '0' &&
                                        element.offsetHeight > 0 &&
                                        element.offsetWidth > 0;

                        return isVisible;
                    });
                }, selectors.sections);

                if (visibleSections.length > 0) {
                    // Wait for page assets to load after SKU input
                    await sendStatusUpdate(++eventIndexCounter, sku); // Wait for Page Assets to Load
                    await waitForImagesToLoad(page, selectors.pageAssets.map(asset => `#${asset} img`));
                    await new Promise(resolve => setTimeout(resolve, 4000));  // Adjust the timeout as necessary

                    const sectionURLs = [];
                    for (const section of visibleSections) {
                        try {
                            // Capture screenshot of the element directly
                            await sendStatusUpdate(++eventIndexCounter, sku); // Capture Screenshot of the Element
                            const elementHandle = await page.$(`#${section}`);
                            const screenshotBuffer = await elementHandle.screenshot();

                            // Process image with JIMP (crop and watermark) using the element screenshot
                            await sendStatusUpdate(++eventIndexCounter, sku); // Process Each Section
                            const { buffer: processedImageBuffer, width, height } = await processImage(
                                screenshotBuffer,
                                selectors.watermarkUrl // Use the URL for the watermark
                            );

                            // Upload processed image to Google Drive
                            const { link: googleDriveLink } = await uploadToGoogleDrive(processedImageBuffer, selectors.googleDriveConfig, Math.round(width), Math.round(height));

                            sectionURLs.push({ section, googleDriveLink });

                        } catch (error) {
                            console.error(`Error processing section #${section}:`, error.message);
                        }
                    }
                    console.log(`sectionURLs: `, sectionURLs);

                    // Input Google Drive URLs into the page
                    await sendStatusUpdate(++eventIndexCounter, sku); // Input Google Drive URLs into the Page

                    for (let j = 0; j < selectors.gURL_inputs.length; j++) {
                        const inputSelector = `#${selectors.gURL_inputs[j]}`;

                        await new Promise(resolve => setTimeout(resolve, 2000));  // Adjust the timeout as necessary

                        const inputVisible = await page.evaluate((selector) => {
                            const element = document.querySelector(selector);
                            if (!element) return false;

                            const style = window.getComputedStyle(element);
                            const isVisible = style.display !== 'none' &&
                                            style.visibility !== 'hidden' &&
                                            style.opacity !== '0' &&
                                            element.offsetHeight > 0 &&
                                            element.offsetWidth > 0;

                            return isVisible;
                        }, inputSelector);

                        console.log(`input seems to be visible? `, inputVisible);

                        if (inputVisible) {
                            const sectionIndex = sectionURLs.findIndex(urlObj => urlObj.section === selectors.sections[j]);
                            if (sectionIndex !== -1) {
                                const gURL = sectionURLs[sectionIndex].googleDriveLink; // Match section with its URL
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
                    }
                }
            }
            // Explicitly trigger garbage collection after each SKU is processed
            if (global.gc) {
                global.gc();
            } else {
                console.warn('No GC hook! Start your program as `node --expose-gc file.js`.');
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
