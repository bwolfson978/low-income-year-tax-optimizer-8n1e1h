# Terraform configuration for Supabase PostgreSQL database infrastructure
# Version: 1.0.0
# Provider version: supabase/supabase ~> 1.0

terraform {
  required_version = ">= 1.0.0"
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

# Main Supabase PostgreSQL database instance
resource "supabase_database" "main" {
  name                = var.database_name
  region              = var.region
  instance_size       = var.instance_size
  storage_size_gb     = var.storage_size_gb
  version            = "15"
  
  # High availability configuration
  high_availability  = true
  
  # Backup configuration
  backup_retention_days = var.backup_retention_days
  point_in_time_recovery = true
  
  # Connection management
  connection_limit = var.connection_limit
  
  # Monitoring configuration
  enable_monitoring = true
  monitoring_interval = var.monitoring_interval
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Maintenance window configuration
  maintenance_window {
    day              = "Sunday"
    hour             = 2
    duration_minutes = 60
  }

  # Database parameter configuration
  parameter_group_settings = {
    "max_connections"                  = var.connection_limit
    "shared_buffers"                  = "256MB"
    "effective_cache_size"            = "768MB"
    "work_mem"                        = "4MB"
    "maintenance_work_mem"            = "64MB"
    "min_wal_size"                    = "1GB"
    "max_wal_size"                    = "4GB"
    "checkpoint_completion_target"     = "0.9"
    "wal_buffers"                     = "16MB"
    "default_statistics_target"        = "100"
    "random_page_cost"                = "1.1"
    "effective_io_concurrency"        = "200"
    "autovacuum"                      = "on"
    "log_min_duration_statement"      = "1000"
  }

  tags = {
    Environment = "production"
    Project     = "tax-optimizer"
    ManagedBy   = "terraform"
  }
}

# Database security configuration
resource "supabase_database_security_config" "main" {
  database_id = supabase_database.main.id
  
  # SSL configuration
  enable_ssl       = true
  ssl_enforcement  = true
  
  # Encryption configuration
  enable_encryption = true
  encryption_at_rest {
    enabled                  = true
    algorithm                = "AES-256"
    key_rotation_period_days = 90
  }
  
  # Network security configuration
  network_security {
    enable_private_endpoint = true
    enable_public_access    = false
    allowed_ip_ranges      = var.allowed_ip_ranges
  }
  
  # Audit logging configuration
  audit_logging {
    enabled         = true
    retention_days  = 90
    log_types      = ["ddl", "dml", "connection"]
    
    log_settings {
      log_connections          = true
      log_disconnections       = true
      log_checkpoints         = true
      log_lock_waits          = true
      log_temp_files          = 0
      log_autovacuum_min_duration = 250
    }
  }
}

# Database monitoring configuration
resource "supabase_database_monitoring" "main" {
  database_id = supabase_database.main.id
  
  # Enhanced monitoring settings
  enhanced_monitoring {
    enabled           = true
    retention_period  = "7d"
    granularity      = var.monitoring_interval
  }
  
  # Performance insights configuration
  performance_insights {
    enabled            = true
    retention_period   = "7d"
    collection_interval = 60
  }
  
  # Alert configuration
  alerts {
    cpu_utilization {
      threshold_percent = 80
      evaluation_periods = 5
    }
    
    memory_utilization {
      threshold_percent = 80
      evaluation_periods = 5
    }
    
    storage_utilization {
      threshold_percent = 85
      evaluation_periods = 5
    }
    
    connection_count {
      threshold = floor(var.connection_limit * 0.9)
      evaluation_periods = 3
    }
  }
}

# Outputs for use by other modules
output "database_id" {
  value = supabase_database.main.id
  description = "ID of the created Supabase database instance"
}

output "database_endpoint" {
  value = supabase_database.main.endpoint
  description = "Endpoint URL for the database instance"
}

output "monitoring_endpoint" {
  value = supabase_database.main.monitoring_endpoint
  description = "Endpoint URL for database monitoring"
}

output "connection_string" {
  value = supabase_database.main.connection_string
  sensitive = true
  description = "Database connection string"
}

output "backup_configuration" {
  value = {
    retention_days = supabase_database.main.backup_retention_days
    point_in_time_recovery = supabase_database.main.point_in_time_recovery
  }
  description = "Backup configuration details"
}

output "security_config" {
  value = {
    ssl_enabled = supabase_database_security_config.main.enable_ssl
    encryption_enabled = supabase_database_security_config.main.enable_encryption
    allowed_ip_ranges = supabase_database_security_config.main.network_security.allowed_ip_ranges
  }
  description = "Security configuration details"
}