# Main Terraform configuration for Tax Optimizer infrastructure
# Version: 1.0.0

terraform {
  required_version = ">= 1.0.0"

  # Configure remote state storage with encryption and locking
  backend "s3" {
    bucket         = "tax-optimizer-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    
    # Enhanced backend configuration
    versioning     = true
    kms_key_id     = "alias/terraform-state-key"
    
    # State locking configuration
    lock_table     = "terraform-state-lock"
    max_lock_attempts = 10
  }
}

# Define common tags for all resources
locals {
  common_tags = {
    Environment      = var.environment
    Project         = "tax-optimizer"
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    ComplianceLevel = "financial"
    BackupFrequency = "daily"
    LastUpdated     = timestamp()
  }
}

# Database Infrastructure Module
module "database" {
  source = "./modules/database"

  # Core configuration
  environment     = var.environment
  region          = var.region
  database_config = var.database_config

  # Enhanced database settings
  backup_retention = 30
  encryption_enabled = true
  high_availability = true
  performance_insights = true

  # Security configuration
  ssl_enforcement = "ENABLED"
  ip_whitelist    = var.database_config.allowed_ips
  audit_logging   = true

  # Scaling configuration
  auto_scaling = {
    min_capacity = 2
    max_capacity = 8
    target_cpu   = 70
  }

  tags = local.common_tags
}

# CDN and Edge Network Infrastructure Module
module "cdn" {
  source = "./modules/cdn"

  # Core configuration
  environment = var.environment
  cdn_config  = var.cdn_config

  # Edge network configuration
  edge_locations = ["na1", "eu1", "ap1"]
  ssl_enabled    = true
  edge_caching   = true
  ddos_protection = true

  # Performance configuration
  optimization_enabled = true
  compression = {
    enabled = true
    types   = ["text/html", "text/css", "application/javascript"]
  }

  # Security headers
  security_headers = {
    hsts_enabled = true
    xss_protection = true
    content_security_policy = true
  }

  tags = local.common_tags
}

# Monitoring and Observability Infrastructure Module
module "monitoring" {
  source = "./modules/monitoring"

  # Core configuration
  environment       = var.environment
  region           = var.region
  monitoring_config = var.monitoring_config

  # Alert thresholds
  alert_thresholds = {
    cpu_utilization    = 80
    memory_utilization = 80
    error_rate        = 1
    latency           = 500
    concurrent_users  = 1000
  }

  # Logging configuration
  logging = {
    retention_days = 90
    encryption    = true
    audit_enabled = true
  }

  # Metrics configuration
  metrics = {
    collection_interval = 60
    retention_period   = 90
    custom_metrics     = true
  }

  # Dashboard configuration
  dashboards = {
    performance = true
    security    = true
    costs      = true
  }

  tags = local.common_tags
}

# Output important infrastructure endpoints and information
output "database_endpoint" {
  description = "Supabase database endpoint URL"
  value       = module.database.database_endpoint
  sensitive   = true
}

output "database_connection_string" {
  description = "Database connection string for application"
  value       = module.database.database_connection_string
  sensitive   = true
}

output "cdn_endpoint" {
  description = "Vercel CDN endpoint URL"
  value       = module.cdn.cdn_endpoint
}

output "cdn_domain" {
  description = "Custom domain for CDN"
  value       = module.cdn.cdn_domain
}

output "monitoring_endpoints" {
  description = "Monitoring system endpoints"
  value       = module.monitoring.monitoring_endpoints
}

output "ssl_certificate_expiry" {
  description = "SSL certificate expiration date"
  value       = module.cdn.cdn_ssl_certificate.expiry_date
}

output "infrastructure_metrics" {
  description = "Infrastructure performance metrics"
  value = {
    database = module.database.database_metrics
    cdn      = module.cdn.cdn_metrics
    monitoring = module.monitoring.monitoring_metrics
  }
}