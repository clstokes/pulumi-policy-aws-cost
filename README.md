# pulumi-policy-aws-cost

This Pulumi CrossGuard policy pack demonstrates a number of policy types for security and cost best 
practices. _Note: The `instance-cost-estimate` policy currently only uses pricing data for Linux EC2 instances 
in us-east-1._


## Usage

1. This example uses the [Bulk AWS Price List API](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-ppslong.html) 
for pricing data. Currently it expects this file to already be downloaded. To download the pricing data for `us-east-1` 
run `make bootstrap`:

    ```
    % make bootstrap
    ==> Started target 'bootstrap'
    ==> Downloading EC2 offers file...
    mkdir -p resources
    curl https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json \
                    -o resources/offers-ec2-us-east-1.json
    % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                    Dload  Upload   Total   Spent    Left  Speed
    100 80.7M  100 80.7M    0     0  18.8M      0  0:00:04  0:00:04 --:--:-- 18.8M
    ==> Completed target 'bootstrap'
    ```

1. Run a `pulumi up` using the `--policy-pack` argument:

    ```
    % pulumi preview --policy-pack policy-as-code
    Previewing update (dev):

        Type                       Name                        Plan       Info
    +   pulumi:pulumi:Stack        pulumi-policy-aws-cost-dev  create     2 errors
    +   ├─ aws:ec2:Vpc             demo                        create
    +   │  ├─ aws:ec2:Subnet       demo-0                      create     1 error
    +   │  │  └─ aws:ec2:Instance  demo-0                      create     1 error
    +   │  ├─ aws:ec2:Subnet       demo-3                      create     1 error
    +   │  │  └─ aws:ec2:Instance  demo-3                      create     1 error
    +   │  ├─ aws:ec2:Subnet       demo-2                      create     1 error
    +   │  │  └─ aws:ec2:Instance  demo-2                      create     1 error
    +   │  └─ aws:ec2:Subnet       demo-1                      create     1 error
    +   │     └─ aws:ec2:Instance  demo-1                      create     1 error
    +   └─ aws:s3:Bucket           demo                        create     2 errors

    Diagnostics:
    pulumi:pulumi:Stack (pulumi-policy-aws-cost-dev):
        mandatory: [instance-cost-estimate] Limit instance costs to $500.
        Estimated monthly cost [$650.88] exceeds [$500.00].
        error: preview failed

    aws:s3:Bucket (demo):
        mandatory: [s3-bucket-public-read-prohibited] S3 bucket must not be publicly accessible.
        Bucket ACL must not be set to 'public-read' or 'public-read-write'.
        mandatory: [s3-static-website-prohibited] No static website hosting.
        Website hosting must not be enabled.

    aws:ec2:Subnet (demo-1):
        mandatory: [subnet-sizing] Subnets must be /24 or smaller.
        Address space [10.0.1.0/22] is too large. Must be [/24] or smaller.

    aws:ec2:Instance (demo-1):
        mandatory: [instance-required-tags] Instances must have required tags.
        Tag [Name] must be defined.

    aws:ec2:Instance (demo-3):
        mandatory: [instance-required-tags] Instances must have required tags.
        Tag [Name] must be defined.

    aws:ec2:Instance (demo-2):
        mandatory: [instance-required-tags] Instances must have required tags.
        Tag [Name] must be defined.

    aws:ec2:Subnet (demo-0):
        mandatory: [subnet-sizing] Subnets must be /24 or smaller.
        Address space [10.0.0.0/22] is too large. Must be [/24] or smaller.

    aws:ec2:Subnet (demo-3):
        mandatory: [subnet-sizing] Subnets must be /24 or smaller.
        Address space [10.0.3.0/22] is too large. Must be [/24] or smaller.

    aws:ec2:Subnet (demo-2):
        mandatory: [subnet-sizing] Subnets must be /24 or smaller.
        Address space [10.0.2.0/22] is too large. Must be [/24] or smaller.

    aws:ec2:Instance (demo-0):
        mandatory: [instance-required-tags] Instances must have required tags.
        Tag [Name] must be defined.

    Permalink: https://app.pulumi.com/clstokes/pulumi-policy-aws-cost/dev/previews/75c29228-1623-4323-bd96-e228ca211fdd
    ```
