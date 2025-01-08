# Terraform configuration for staging environment of Tax Optimizer Tool
# Version: 1.0.0

terraform {
  required_version = ">= 1.0.0"

  # Configure remote state storage with encryption and locking
  backend "s3" {
    bucket         = "tax-optimizer-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    
    # Enhanced backend configuration
    versioning     = true
    kms_key_id     = "alias/terraform-state-key"
  }

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

# Define local variables for staging environment
locals {
  environment = "staging"
  region     = "us-east-1"
  common_tags = {
    Environment       = "staging"
    Project          = "tax-optimizer"
    ManagedBy        = "terraform"
    CostCenter       = "staging-testing"
    DataClassification = "non-production"
    SecurityLevel    = "moderate"
    BackupFrequency  = "daily"
    LastUpdated      = timestamp()
  }
}

# Root module configuration for staging environment
module "root_module" {
  source = "../../../terraform"

  environment = local.environment
  region     = local.region

  # Database configuration with reduced capacity for staging
  database_config = {
    instance_size         = "small"
    storage_size_gb      = 100
    backup_retention_days = 7
    enable_encryption    = true
    enable_ssl          = true
    connection_limit    = 50
    auto_cleanup_enabled = true
    cleanup_retention_days = 30
  }

  # CDN configuration for staging environment
  cdn_config = {
    edge_network_enabled     = true
    caching_enabled         = true
    cache_ttl_seconds      = 1800  # 30 minutes for staging
    ddos_protection_enabled = true
    staging_domain         = "staging.tax-optimizer.dev"
  }

  # Monitoring configuration for staging environment
  monitoring_config = {
    enable_performance_monitoring = true
    enable_error_tracking        = true
    enable_usage_analytics       = true
    monitoring_interval_seconds  = 30
    alert_thresholds = {
      cpu_utilization    = 80
      memory_utilization = 80
      error_rate        = 5
      response_time_ms  = 1000
    }
  }

  tags = local.common_tags
}

# Output staging environment endpoints and metrics
output "database_endpoint" {
  description = "Staging Supabase database endpoint URL"
  value       = module.root_module.database_endpoint
  sensitive   = true
}

output "cdn_endpoint" {
  description = "Staging Vercel CDN endpoint URL"
  value       = module.root_module.cdn_endpoint
}

output "monitoring_endpoints" {
  description = "Staging monitoring component endpoints"
  value       = module.root_module.monitoring_endpoints
}

output "resource_metrics" {
  description = "Staging environment resource utilization metrics"
  value       = module.root_module.resource_metrics
}