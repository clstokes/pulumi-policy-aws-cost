# pulumi-policy-aws-cost

This Pulumi CrossGuard policy pack demonstrates a number of policy types for security and cost best 
practices. _Note: The `instance-cost-estimate` policy currently only uses pricing data for Linux EC2 instances in us-east-1._


## Usage

1. This example uses the [Bulk AWS Price List API](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-ppslong.html) 
for pricing data. The policy uses a file that is committed to this repo. To update the pricing data for 
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
    pulumi-policy-aws-cost % pulumi preview --policy-pack policy-as-code 
    Previewing update (cameron)

    View Live: https://app.pulumi.com/clstokes/pulumi-policy-aws-cost/cameron/previews/e53e358c-1e51-42ce-bed1-9fd5146bf98f

        Type                            Name                            Plan       
    +   pulumi:pulumi:Stack             pulumi-policy-aws-cost-cameron  create     
    +   ├─ aws:ec2:Vpc                  demo                            create     
    +   │  └─ aws:ec2:Subnet            demo                            create     
    +   ├─ aws:ec2:Eip                  demo                            create     
    +   ├─ aws:s3:Bucket                demo                            create     
    +   ├─ aws:ec2:NatGateway           demo                            create     
    +   ├─ aws:ec2:Instance             expensive-server                create     
    +   ├─ aws:ec2:LaunchTemplate       launchTemplate                  create     
    +   ├─ aws:ec2:Instance             demo-0                          create     
    +   ├─ aws:ec2:LaunchConfiguration  launchConfig                    create     
    +   ├─ aws:ec2:Instance             demo-2                          create     
    +   ├─ aws:ec2:Instance             demo-1                          create     
    +   ├─ aws:autoscaling:Group        launchTemplate                  create     
    +   └─ aws:autoscaling:Group        launchConfig                    create     
    
    Policy Violations:
        [advisory]  cost-optimization v0.1.20200903-2  aggregate-instance-cost-estimate (pulumi-policy-aws-cost-cameron: pulumi:pulumi:Stack)
        Estimated instance costs based on instance type.
        
        RESOURCE                       TYPE              QTY          PRICE   MONTHLY COST
        aws:ec2/instance:Instance      i3.16xlarge         1      $3,594.24      $3,594.24
        aws:ec2/instance:Instance      m5d.xlarge          3        $162.72        $488.16
        aws:autoscaling/group:Group    t3.2xlarge          5        $239.62      $1,198.08
        aws:ec2/natGateway:NatGateway                      1         $32.40         $32.40
        TOTAL                                                                    $5,312.88
        
        [advisory]  cost-optimization v0.1.20200903-2  budget-limit (pulumi-policy-aws-cost-cameron: pulumi:pulumi:Stack)
        Estimated costs must not exceed monthly budget.
        Estimated monthly cost [$5,312.88] exceeds [$50.00].

    ```
