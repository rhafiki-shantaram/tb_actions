const { google } = require('googleapis');
const { Readable } = require('stream');

async function uploadToGoogleDrive(buffer, projectConfig, width, height) {
    const auth = await authorize(projectConfig);
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
        name: 'processed_image.png',
        parents: [projectConfig.drive_folder_id]
    };
    const media = {
        mimeType: 'image/png',
        body: new Readable({
            read() {
                this.push(buffer);
                this.push(null); // Indicates end-of-file
            }
        })
    };

    const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webContentLink'
    });

    // Set permissions so the uploaded file is readable by anyone with the link
    await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    });

    const file = await drive.files.get({
        fileId: response.data.id,
        fields: 'webContentLink'
    });

    const linkWithResolution = `${file.data.webContentLink}?width=${width}&height=${height}`;

    return {
        link: linkWithResolution,
        width: width,
        height: height
    };
}

async function authorize(projectConfig) {
    const { private_key, client_email } = projectConfig;

    const auth = new google.auth.JWT(
        client_email,
        null,
        private_key,
        ['https://www.googleapis.com/auth/drive.file']
    );

    await auth.authorize();
    return auth;
}

module.exports = { uploadToGoogleDrive };
