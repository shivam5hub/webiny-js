const uniqueId = require("uniqid");
const sanitizeFilename = require("sanitize-filename");
const S3 = require("aws-sdk/clients/s3");
const mime = require("mime");
const createHandler = require("../utils/createHandler");

module.exports.handler = createHandler(async event => {
    console.log("EVENAT:::", JSON.stringify(event, null, 2));

    const file = JSON.parse(event.body);

    if (!file) {
        throw Error(`Field "file" is missing.`);
    }

    if (!file.name) {
        throw Error(`File "name" missing.`);
    }

    const contentType = mime.getType(file.name);
    if (!contentType) {
        throw Error(`File's content type could not be resolved.`);
    }

    let key = sanitizeFilename(file.name);
    if (key) {
        key = uniqueId() + "_" + key;
    }

    // Replace all whitespace.
    key = key.replace(/\s/g, "");

    return new Promise((resolve, reject) => {
        const params = {
            Expires: 60,
            Bucket: process.env.S3_BUCKET || "webiny-files",
            Conditions: [["content-length-range", 100, 26214400]], // 100Byte - 25MB
            Fields: {
                "Content-Type": contentType,
                key
            }
        };

        if (params.Fields.key.startsWith("/")) {
            params.Fields.key = params.Fields.key.substr(1);
        }

        const s3 = new S3();
        s3.createPresignedPost(params, (err, data) => {
            if (err) {
                return reject(err.message);
            }

            resolve({
                data,
                file: {
                    name: key,
                    type: contentType,
                    size: file.size,
                    src: "/files/" + key
                }
            });
        });
    });
});
