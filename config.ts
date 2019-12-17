import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();

const businessUnitTag = config.get("businessUnit") || "ecommerce";
const costCenterTag = config.get("costCenter") || "8123";

export const BASE_TAGS = {
    "BusinessUnit": businessUnitTag,
    "CostCenter": costCenterTag,
};

// export const zoneIds = ["usw2-az1", "usw2-az2", "usw2-az3", "usw2-az4"]; // us-west-2
export const zoneIds = aws.getAvailabilityZones().zoneIds;

// export const amiId = "ami-0a7d051a1c4b54f65"; // us-west-2
export const amiId = aws.getAmi({
    owners: ["099720109477"], // Ubuntu
    mostRecent: true,
    filters: [
        { name: "name", values: ["ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*"] },
    ],
}).then(x => x.id);
