# pulumi-policy-aws-cost

This Pulumi CrossGuard policy pack demonstrates a number of policy types for security and cost best 
practices. _Note: The `instance-cost-estimate` policy currently only uses pricing data for Linux EC2 instances in us-east-1._


## Usage

1. This example uses the [Bulk AWS Price List API](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-ppslong.html) 
for pricing data. The policy uses a file thats committed to this repo. To update the pricing data for 
run `make bootstrap` from the `policy-as-code` directory:

    ```
    % make bootstrap
    ==> Started target 'bootstrap'
    ==> Downloading EC2 offers file...
    mkdir -p resources
    curl https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json \
                    -o resources/offers-ec2-us-east-1.json
    % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                    Dload  Upload   Total   Spent    Left  Speed
    100 87.6M  100 87.6M    0     0  8842k      0  0:00:10  0:00:10 --:--:-- 6735k
    gzip -f resources/offers-ec2-us-east-1.json
    ==> Completed target 'bootstrap'
    ```

1. Run a `pulumi up` using the `--policy-pack` argument:

    ```
    % pulumi preview --policy-pack policy-as-code
    Previewing update (dev):
        Type                  Name                        Plan       Info
    +   pulumi:pulumi:Stack   pulumi-policy-aws-cost-dev  create     1 error
    +   ├─ aws:ec2:Vpc        demo                        create     
    +   │  └─ aws:ec2:Subnet  demo                        create     
    +   ├─ aws:s3:Bucket      demo                        create     
    +   ├─ aws:ec2:Instance   demo-1                      create     
    +   ├─ aws:ec2:Instance   demo-3                      create     
    +   ├─ aws:ec2:Instance   demo-2                      create     
    +   ├─ aws:ec2:Instance   demo-0                      create     
    +   └─ aws:ec2:Instance   demo-4                      create     
    
    Diagnostics:
    pulumi:pulumi:Stack (pulumi-policy-aws-cost-dev):
        error: preview failed
    
    Policy Violations:
        [mandatory]  aws-policies v0.0.1  instance-cost-estimate (pulumi-policy-aws-cost-dev: pulumi:pulumi:Stack)
        Estimated costs must not exceed monthly budget.
        Estimated monthly cost [$813.60] exceeds [$500.00].
        
        [mandatory]  aws-policies v0.0.1  s3-bucket-public-read-prohibited (demo: aws:s3/bucket:Bucket)
        S3 bucket must not be publicly accessible.
        Bucket ACL must not be set to 'public-read' or 'public-read-write'.
        
        [mandatory]  aws-policies v0.0.1  s3-static-website-prohibited (demo: aws:s3/bucket:Bucket)
        No static website hosting.
        Website hosting must not be enabled.
        
    Permalink: https://app.pulumi.com/clstokes/pulumi-policy-aws-cost/dev/previews/9a918b65-c618-4868-b02e-5e36dc7b1562
    ```
