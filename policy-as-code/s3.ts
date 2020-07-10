import * as aws from "@pulumi/aws";
import { validateResourceOfType, Policies, } from "@pulumi/policy";

export const s3Policies: Policies = [
    {
        name: "s3-bucket-public-read-prohibited",
        description: "S3 bucket must not be publicly accessible.",
        enforcementLevel: "mandatory",
        validateResource: validateResourceOfType(aws.s3.Bucket, (resource, _, reportViolation) => {
            if (resource.acl === "public-read" || resource.acl === "public-read-write") {
                reportViolation("Bucket ACL must not be set to 'public-read' or 'public-read-write'.");
            }
        }),
    },
    {
        name: "s3-bucket-versioning-enabled",
        description: "Object versioning must be enabled.",
        enforcementLevel: "mandatory",
        validateResource: validateResourceOfType(aws.s3.Bucket, (resource, _, reportViolation) => {
            if (resource.versioning === undefined || resource.versioning.enabled === false) {
                reportViolation("Object versioning must be enabled.");
            }
        }),
    },
    {
        name: "s3-static-website-prohibited",
        description: "No static website hosting.",
        enforcementLevel: "mandatory",
        validateResource: validateResourceOfType(aws.s3.Bucket, (resource, _, reportViolation) => {
            if (resource.website !== undefined) {
                reportViolation("Website hosting must not be enabled.");
            }
        }),
    },
    {
        name: "s3-bucket-server-side-encryption-enabled",
        description: "Server-side encryption with KMS must be enabled.",
        enforcementLevel: "mandatory",
        validateResource: validateResourceOfType(aws.s3.Bucket, (reource, _, reportViolation) => {
            const sse = reource.serverSideEncryptionConfiguration;
            if (sse === undefined
                || sse.rule === undefined
                || sse.rule.applyServerSideEncryptionByDefault === undefined
                || sse.rule.applyServerSideEncryptionByDefault.sseAlgorithm !== "aws:kms") {
                reportViolation("Server-side encryption with KMS must be enabled.");
            }
        }),
    },
];
