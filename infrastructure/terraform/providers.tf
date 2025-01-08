# Configure Terraform settings and required providers
terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
    supabase = {
      source  = "supabase/supabase" 
      version = "~> 1.0"
    }
  }
}

# AWS Provider configuration with enhanced security and resource management
provider "aws" {
  region = var.region

  # Common tags for all AWS resources
  default_tags {
    Environment        = var.environment
    Project           = "tax-optimizer"
    ManagedBy         = "terraform"
    SecurityLevel     = "high"
    DataClassification = "sensitive"
    CostCenter        = "tax-optimization"
  }

  # Enhanced security configuration
  assume_role {
    role_arn     = var.aws_role_arn
    session_name = "terraform-${var.environment}"
  }

  # Account restriction for security
  allowed_account_ids = [var.aws_account_id]

  # Retry configuration for improved reliability
  max_retries = 3

  # Custom endpoints for VPC endpoints if needed
  endpoints {
    s3        = var.aws_s3_endpoint
    dynamodb  = var.aws_dynamodb_endpoint
  }
}

# Vercel Provider configuration for edge network and deployment management
provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team

  # Project configuration
  project = "tax-optimizer"

  # Git repository configuration
  git_repo {
    type   = "github"
    repo   = "tax-optimizer"
    branch = var.environment
  }

  # Deployment hooks for CI/CD
  deploy_hooks {
    production = var.vercel_prod_hook
    preview    = var.vercel_preview_hook
  }
}

# Supabase Provider configuration for secure database infrastructure
provider "supabase" {
  project_ref       = var.supabase_project_ref
  access_token     = var.supabase_access_token
  database_password = var.database_password

  # Enhanced security configuration
  security_config {
    ssl_mode            = "require"
    connection_timeout  = 30
    statement_timeout   = 60
    
    pool_settings {
      max_connections = 20
      idle_timeout    = 300
    }
  }
}