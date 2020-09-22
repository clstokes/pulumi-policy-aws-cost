import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
export const projectName = pulumi.getProject();

const businessUnitTag = config.get("businessUnit") || "ecommerce";
const costCenterTag = config.get("costCenter") || "8123";

export const BASE_TAGS = {
    "BusinessUnit": businessUnitTag,
    "CostCenter": costCenterTag,
};
