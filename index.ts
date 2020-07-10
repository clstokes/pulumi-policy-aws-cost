import * as s3 from "./s3";
import * as compute from "./compute";

export const bucketName = s3.bucketName;

export const vpcId = compute.vpc.id;
export const subnetId = compute.subnet.id;
export const instanceIds = compute.instances.map(i => i.id);
