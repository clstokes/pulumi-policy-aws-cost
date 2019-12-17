import * as s3 from "./s3";
import * as compute from "./compute";

export const bucketName = s3.bucketName;

export const vpcId = compute.vpcId;
export const subnetIds = compute.subnetIds;
export const instanceIds = compute.instanceIds;
