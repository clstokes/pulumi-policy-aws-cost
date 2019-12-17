import * as aws from "@pulumi/aws";
import { validateTypedResource, Policies, } from "@pulumi/policy";

export const s3Policies: Policies = [
    {
        name: "s3-bucket-public-read-prohibited",
        description: "S3 bucket must not be publicly accessible.",
        enforcementLevel: "mandatory",
        validateResource: validateTypedResource(aws.s3.Bucket, (bucket, _, reportViolation) => {
            if (bucket.acl === "public-read" || bucket.acl === "public-read-write") {
                reportViolation("Bucket ACL must not be set to 'public-read' or 'public-read-write'.");
            }
        }),
    },
    {
        name: "s3-bucket-versioning-enabled",
        description: "Object versioning must be enabled.",
        enforcementLevel: "mandatory",
        validateResource: validateTypedResource(aws.s3.Bucket, (bucket, _, reportViolation) => {
            if (bucket.versioning === undefined || bucket.versioning.enabled === false) {
                reportViolation("Object versioning must be enabled.");
            }
        }),
    },
    {
        name: "s3-static-website-prohibited",
        description: "No static website hosting.",
        enforcementLevel: "mandatory",
        validateResource: validateTypedResource(aws.s3.Bucket, (bucket, _, reportViolation) => {
            if (bucket.website !== undefined) {
                reportViolation("Website hosting must not be enabled.");
            }
        }),
    },
    {
        name: "s3-bucket-server-side-encryption-enabled",
        description: "Server-side encryption with KMS must be enabled.",
        enforcementLevel: "mandatory",
        validateResource: validateTypedResource(aws.s3.Bucket, (bucket, _, reportViolation) => {
            const sse = bucket.serverSideEncryptionConfiguration;
            if (sse === undefined
                || sse.rule === undefined
                || sse.rule.applyServerSideEncryptionByDefault === undefined
                || sse.rule.applyServerSideEncryptionByDefault.sseAlgorithm !== "aws:kms") {
                reportViolation("Server-side encryption with KMS must be enabled.");
            }
        }),
    },
];
