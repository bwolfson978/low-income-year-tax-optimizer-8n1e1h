# Environment variable with validation
variable "environment" {
  type        = string
  description = "Deployment environment (development, staging, production)"

  validation {
    condition     = can(regex("^(development|staging|production)$", var.environment))
    error_message = "Environment must be one of: development, staging, production"
  }
}

# Region variable with default and validation
variable "region" {
  type        = string
  description = "AWS region for infrastructure deployment"
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.region))
    error_message = "Region must be in the format: us-east-1"
  }
}

# Database configuration object
variable "database_config" {
  type = object({
    instance_size         = string
    storage_size_gb      = number
    backup_retention_days = number
    enable_encryption    = bool
    enable_ssl          = bool
    connection_limit    = number
  })
  description = "Supabase database configuration object"

  default = {
    instance_size         = "medium"
    storage_size_gb      = 1024
    backup_retention_days = 30
    enable_encryption    = true
    enable_ssl          = true
    connection_limit    = 100
  }

  validation {
    condition     = contains(["small", "medium", "large"], var.database_config.instance_size)
    error_message = "Instance size must be one of: small, medium, large"
  }

  validation {
    condition     = var.database_config.storage_size_gb >= 100 && var.database_config.storage_size_gb <= 4096
    error_message = "Storage size must be between 100GB and 4096GB"
  }

  validation {
    condition     = var.database_config.backup_retention_days >= 7 && var.database_config.backup_retention_days <= 35
    error_message = "Backup retention days must be between 7 and 35 days"
  }
}

# CDN configuration object
variable "cdn_config" {
  type = object({
    edge_network_enabled     = bool
    caching_enabled         = bool
    cache_ttl_seconds      = number
    ddos_protection_enabled = bool
  })
  description = "Vercel CDN configuration object"

  default = {
    edge_network_enabled     = true
    caching_enabled         = true
    cache_ttl_seconds      = 3600
    ddos_protection_enabled = true
  }

  validation {
    condition     = var.cdn_config.cache_ttl_seconds >= 0 && var.cdn_config.cache_ttl_seconds <= 86400
    error_message = "Cache TTL must be between 0 and 86400 seconds (24 hours)"
  }
}

# Monitoring configuration object
variable "monitoring_config" {
  type = object({
    enable_performance_monitoring = bool
    enable_error_tracking        = bool
    enable_usage_analytics       = bool
    monitoring_interval_seconds  = number
  })
  description = "Infrastructure monitoring configuration object"

  default = {
    enable_performance_monitoring = true
    enable_error_tracking        = true
    enable_usage_analytics       = true
    monitoring_interval_seconds  = 60
  }

  validation {
    condition     = var.monitoring_config.monitoring_interval_seconds >= 30 && var.monitoring_config.monitoring_interval_seconds <= 300
    error_message = "Monitoring interval must be between 30 and 300 seconds"
  }
}

# Common resource tags
variable "tags" {
  type        = map(string)
  description = "Common resource tags"
  default = {
    Project    = "tax-optimizer"
    ManagedBy  = "terraform"
  }

  validation {
    condition     = length(var.tags) > 0
    error_message = "At least one tag must be specified"
  }
}