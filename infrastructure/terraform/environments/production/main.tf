# Production environment Terraform configuration for Tax Optimizer Tool
# Version: 1.0.0

terraform {
  required_version = ">= 1.0.0"

  # Configure remote state storage with encryption and locking
  backend "s3" {
    bucket         = "tax-optimizer-terraform-state-prod"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock-prod"
    
    # Enhanced backend configuration for production
    versioning     = true
    kms_key_id     = "alias/terraform-state-key-prod"
    
    # State locking configuration
    lock_table     = "terraform-state-lock-prod"
    max_lock_attempts = 10
  }
}

# Define production-specific local variables
locals {
  environment = "production"
  common_tags = {
    Environment     = local.environment
    Project         = "tax-optimizer"
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    ComplianceLevel = "financial"
    BackupFrequency = "daily"
    LastUpdated     = timestamp()
  }
}

# Production Database Infrastructure
module "database" {
  source = "../../modules/database"

  environment = local.environment
  region      = "us-east-1"

  database_config = {
    instance_size         = "large"
    storage_size_gb      = 1024
    backup_retention_days = 30
    enable_encryption    = true
    enable_ssl           = true
    connection_limit     = 1000
    high_availability    = true
    auto_scaling = {
      min_capacity        = 2
      max_capacity        = 8
      target_cpu_percent = 70
    }
  }

  # Production-specific database settings
  backup_config = {
    enabled             = true
    retention_days      = 30
    point_in_time       = true
    geo_redundant       = true
    backup_window       = "03:00-04:00"
    maintenance_window  = "Sun:04:00-Sun:05:00"
  }

  monitoring = {
    detailed_monitoring = true
    log_retention_days = 90
    performance_insights = true
    enhanced_monitoring = true
  }

  tags = local.common_tags
}

# Production CDN and Edge Network Infrastructure
module "cdn" {
  source = "../../modules/cdn"

  environment = local.environment

  cdn_config = {
    edge_network_enabled     = true
    caching_enabled         = true
    cache_ttl_seconds      = 3600
    ddos_protection_enabled = true
    ssl_configuration = {
      min_tls_version       = "1.3"
      certificate_management = "automatic"
    }
    edge_functions = {
      enabled      = true
      memory_size = 1024
    }
  }

  # Production-specific CDN settings
  edge_locations = ["na1", "eu1", "ap1"]
  performance_config = {
    optimization_enabled = true
    compression         = true
    minification        = true
    image_optimization  = true
  }

  security_headers = {
    hsts_enabled            = true
    xss_protection         = true
    content_security_policy = true
    frame_options          = "DENY"
    content_type_options   = "nosniff"
  }

  tags = local.common_tags
}

# Production Monitoring Infrastructure
module "monitoring" {
  source = "../../modules/monitoring"

  environment = local.environment
  region      = "us-east-1"

  monitoring_config = {
    enable_performance_monitoring = true
    enable_error_tracking        = true
    enable_usage_analytics       = true
    monitoring_interval_seconds  = 60
    alerting = {
      cpu_threshold_percent    = 80
      memory_threshold_percent = 80
      error_rate_threshold     = 1
      latency_threshold_ms     = 500
    }
    logging = {
      retention_days    = 90
      encryption_enabled = true
    }
  }

  # Production-specific monitoring settings
  alert_channels = {
    email     = ["ops@taxoptimizer.com"]
    slack     = "ops-alerts"
    pagerduty = "production"
  }

  dashboard_config = {
    performance_metrics = true
    error_tracking     = true
    cost_analysis      = true
    security_events    = true
    custom_widgets     = true
  }

  tags = local.common_tags
}

# Production environment outputs
output "database_endpoint" {
  description = "Production Supabase database endpoint URL"
  value       = module.database.database_endpoint
  sensitive   = true
}

output "cdn_endpoint" {
  description = "Production Vercel CDN endpoint URL"
  value       = module.cdn.cdn_endpoint
}

output "monitoring_endpoints" {
  description = "Production monitoring component endpoints and dashboards"
  value       = module.monitoring.monitoring_endpoints
}

output "infrastructure_health" {
  description = "Production infrastructure health metrics"
  value = {
    database_status = module.database.health_status
    cdn_status      = module.cdn.health_status
    monitoring_status = module.monitoring.health_status
  }
}