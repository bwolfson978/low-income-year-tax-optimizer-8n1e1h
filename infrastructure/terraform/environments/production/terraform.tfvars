# Production environment identifier
environment = "production"

# Primary AWS region for production deployment
region = "us-east-1"

# Production Supabase database configuration with enterprise-grade settings
database_config = {
  instance_size                  = "large"
  storage_size_gb               = 1024
  backup_retention_days         = 30
  enable_encryption            = true
  enable_ssl                   = true
  connection_limit            = 1000
  high_availability           = true
  auto_scaling_enabled        = true
  performance_insights_enabled = true
  maintenance_window          = "sun:04:00-sun:08:00"
}

# Production Vercel CDN configuration with enhanced security and performance settings
cdn_config = {
  edge_network_enabled      = true
  caching_enabled          = true
  cache_ttl_seconds       = 3600
  ddos_protection_enabled = true
  ssl_enforcement_enabled = true
  min_tls_version        = "1.3"
  custom_domains_enabled = true
  compression_enabled    = true
  rate_limiting_enabled  = true
  request_limit_per_minute = 100
}

# Production monitoring configuration with comprehensive observability settings
monitoring_config = {
  enable_performance_monitoring = true
  enable_error_tracking        = true
  enable_usage_analytics       = true
  monitoring_interval_seconds  = 60
  alert_notification_enabled   = true
  log_retention_days          = 90
  apm_enabled                 = true
  distributed_tracing_enabled = true
  custom_metrics_enabled      = true
  health_check_interval_seconds = 30
}

# Production resource tags for organization and cost tracking
tags = {
  Environment         = "production"
  Project            = "tax-optimizer"
  ManagedBy          = "terraform"
  CostCenter         = "prod-tax-opt"
  DataClassification = "sensitive"
  BackupPolicy       = "daily"
  SecurityCompliance = "high"
}