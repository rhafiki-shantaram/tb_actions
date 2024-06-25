const express = require("express");
const { updateDescImgs } = require('./actions/updateDescImgs.js'); // Adjust the path as needed
const app = express();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});

app.get("/action", async (req, res) => {
    const { projectName, actionName, skuList } = req.query;
    try {
        if (!projectName || !actionName || !skuList) {
            return res.status(400).send('Missing required query parameters.');
        }
        const parsedSkuList = JSON.parse(decodeURIComponent(skuList));
        await updateDescImgs(projectName, parsedSkuList);
        res.status(200).send('Process completed successfully.');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred.');
    }
});

app.get("/", (req, res) => {
    res.send("Server up and running..");
});
