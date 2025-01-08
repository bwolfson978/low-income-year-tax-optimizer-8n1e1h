# Environment identifier
# Must be 'staging' for this environment
environment = "staging"

# AWS region for infrastructure deployment
# Must follow format: <region>-<direction>-<number> (e.g. us-east-1)
region = "us-east-1"

# Supabase database configuration for staging environment
# Reduced capacity configuration suitable for pre-production testing
database_config = {
  instance_size         = "small"
  storage_size_gb      = 100
  backup_retention_days = 7
  enable_encryption    = true
  enable_ssl           = true
  connection_limit     = 50
}

# Vercel CDN configuration for staging environment
# Enables core CDN features with moderate caching
cdn_config = {
  edge_network_enabled     = true
  caching_enabled         = true
  cache_ttl_seconds       = 1800  # 30 minutes
  ddos_protection_enabled = true
}

# Infrastructure monitoring configuration for staging
# Enables comprehensive monitoring with frequent checks
monitoring_config = {
  enable_performance_monitoring = true
  enable_error_tracking        = true
  enable_usage_analytics       = true
  monitoring_interval_seconds  = 30
}

# Resource tagging configuration
# Consistent tagging strategy for resource management
tags = {
  Environment = "staging"
  Project     = "tax-optimizer"
  ManagedBy   = "terraform"
}