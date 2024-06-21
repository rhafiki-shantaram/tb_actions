const { updateDescImgs } = require('./actions/updateDescImgs');
const loadSkuList = require('./utils/loadSkuList');

(async () => {
    try {
        const { skuList, skuListPath } = await loadSkuList('LadyGrayy');
        await updateDescImgs('LadyGrayy', 'updateDescImgs', skuList);
        
        // Move processed SKU list to completed directory
        const completedDir = skuListPath.replace('toProcess', 'completed');
        fs.renameSync(skuListPath, completedDir);
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
