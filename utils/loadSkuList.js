const fs = require('fs');
const path = require('path');

async function loadSkuList(projectName) {
    const projectDir = path.join(__dirname, '..', 'skuLists', projectName, 'toProcess');
    const files = fs.readdirSync(projectDir).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
        throw new Error(`No SKU list found in ${projectDir}`);
    }

    const skuListPath = path.join(projectDir, files[0]);
    const skuList = JSON.parse(fs.readFileSync(skuListPath, 'utf8'));

    return { skuList, skuListPath };
}

module.exports = loadSkuList;
