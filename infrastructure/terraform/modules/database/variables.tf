# AWS Region configuration
variable "region" {
  type        = string
  description = "AWS region for database deployment"
  
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.region))
    error_message = "Region must be a valid AWS region identifier"
  }
}

# Database instance name
variable "database_name" {
  type        = string
  description = "Name of the Supabase PostgreSQL database instance"
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.database_name))
    error_message = "Database name must contain only lowercase letters, numbers, and hyphens"
  }
}

# Instance sizing configuration
variable "instance_size" {
  type        = string
  description = "Size of the database instance"
  default     = "db.t3.medium"
  
  validation {
    condition     = contains(["db.t3.medium", "db.t3.large", "db.r5.large", "db.r5.xlarge"], var.instance_size)
    error_message = "Instance size must be a valid Supabase instance type"
  }
}

# Storage configuration
variable "storage_size_gb" {
  type        = number
  description = "Storage size in GB for the database instance"
  default     = 100
  
  validation {
    condition     = var.storage_size_gb >= 100 && var.storage_size_gb <= 1024
    error_message = "Storage size must be between 100GB and 1TB"
  }
}

# Backup configuration
variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 7
  
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 1 and 35 days"
  }
}

# Connection configuration
variable "connection_limit" {
  type        = number
  description = "Maximum number of concurrent database connections"
  default     = 100
  
  validation {
    condition     = var.connection_limit >= 20 && var.connection_limit <= 1000
    error_message = "Connection limit must be between 20 and 1000"
  }
}

# Monitoring configuration
variable "enable_monitoring" {
  type        = bool
  description = "Enable enhanced monitoring for the database instance"
  default     = true
}

variable "monitoring_interval" {
  type        = number
  description = "Monitoring interval in seconds"
  default     = 60
  
  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of: 0, 1, 5, 10, 15, 30, 60"
  }
}

# Security configuration
variable "enable_ssl" {
  type        = bool
  description = "Enable SSL connections to the database"
  default     = true
}

variable "enable_encryption" {
  type        = bool
  description = "Enable encryption at rest using AES-256"
  default     = true
}

variable "allowed_ip_ranges" {
  type        = list(string)
  description = "List of CIDR blocks allowed to connect to the database"
  default     = ["0.0.0.0/0"]
  
  validation {
    condition     = alltrue([for cidr in var.allowed_ip_ranges : can(cidrhost(cidr, 0))])
    error_message = "All elements must be valid CIDR blocks"
  }
}