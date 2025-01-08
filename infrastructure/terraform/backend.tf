# Backend configuration for Terraform state management
# Version: ~> 1.0
# Provider: hashicorp/aws ~> 4.0

terraform {
  # Specify minimum Terraform version
  required_version = ">= 1.0.0"

  # Configure required providers
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  # S3 backend configuration for state management
  backend "s3" {
    # Environment-specific state bucket with dynamic naming
    bucket = "tax-optimizer-terraform-state-${var.environment}"
    
    # State file path within bucket
    key = "terraform.tfstate"
    
    # AWS region from variables
    region = var.region
    
    # Enable state encryption using AWS KMS
    encrypt = true
    
    # Use AWS KMS managed key for encryption
    kms_key_id = "aws/s3"
    
    # Enable server-side encryption
    server_side_encryption = "aws:kms"
    
    # DynamoDB table for state locking
    dynamodb_table = "tax-optimizer-terraform-locks-${var.environment}"
    
    # Enforce private ACL
    acl = "private"
    
    # Enable versioning for state history
    versioning = true
    
    # Environment-specific workspace prefix
    workspace_key_prefix = var.environment
    
    # Prevent accidental bucket deletion
    force_destroy = false
    
    # Lifecycle rules for state management
    lifecycle_rule {
      enabled = true
      
      # Expire non-current versions after 90 days
      noncurrent_version_expiration {
        days = 90
      }
    }
  }
}

# Output backend configuration for reference
output "backend_configuration" {
  value = {
    bucket         = "tax-optimizer-terraform-state-${var.environment}"
    dynamodb_table = "tax-optimizer-terraform-locks-${var.environment}"
    region         = var.region
    encryption     = "aws:kms"
  }
  description = "Backend configuration details for state management"
}