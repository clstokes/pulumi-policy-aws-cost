import * as aws from "@pulumi/aws";

const bucket = new aws.s3.Bucket("demo", {
    acl: "public-read",

    versioning: {
        enabled: true,
    },
    website: { indexDocument: "index.html"},

    serverSideEncryptionConfiguration: {
        rule: {
            applyServerSideEncryptionByDefault: {
                sseAlgorithm: "aws:kms",
                kmsMasterKeyId: "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
            }
        }
    },
});

export const bucketName = bucket.id;
