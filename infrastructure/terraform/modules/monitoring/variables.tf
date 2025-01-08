# Core environment variables
variable "environment" {
  type        = string
  description = "Environment name (e.g., production, staging)"
  validation {
    condition     = can(regex("^(production|staging|development)$", var.environment))
    error_message = "Environment must be production, staging, or development"
  }
}

variable "region" {
  type        = string
  description = "AWS region for monitoring resources"
  default     = "us-east-1"
}

variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster for monitoring deployment"
}

# Monitoring configuration variables
variable "monitoring_namespace" {
  type        = string
  description = "Kubernetes namespace for monitoring components"
  default     = "monitoring"
}

variable "retention_days" {
  type        = number
  description = "Number of days to retain monitoring data"
  default     = 90
  validation {
    condition     = var.retention_days >= 30 && var.retention_days <= 365
    error_message = "Retention days must be between 30 and 365"
  }
}

variable "metrics_scrape_interval" {
  type        = string
  description = "Interval for scraping metrics"
  default     = "30s"
  validation {
    condition     = can(regex("^[0-9]+[smh]$", var.metrics_scrape_interval))
    error_message = "Scrape interval must be in format: 30s, 1m, 1h"
  }
}

# Security and access variables
variable "grafana_admin_password" {
  type        = string
  description = "Admin password for Grafana dashboard"
  sensitive   = true
}

# Alert configuration
variable "alert_endpoints" {
  type = map(object({
    type   = string
    target = string
  }))
  description = "Map of alert endpoints configurations"
  default     = {}

  validation {
    condition = alltrue([
      for k, v in var.alert_endpoints : contains(["email", "slack", "pagerduty"], v.type)
    ])
    error_message = "Alert endpoint type must be one of: email, slack, pagerduty"
  }
}

# Performance monitoring thresholds
variable "performance_thresholds" {
  type = object({
    cpu_threshold_percent    = number
    memory_threshold_percent = number
    request_latency_ms      = number
    error_rate_percent      = number
  })
  description = "Performance monitoring threshold configurations"
  default = {
    cpu_threshold_percent    = 80
    memory_threshold_percent = 85
    request_latency_ms      = 500
    error_rate_percent      = 5
  }

  validation {
    condition = (
      var.performance_thresholds.cpu_threshold_percent >= 0 &&
      var.performance_thresholds.cpu_threshold_percent <= 100 &&
      var.performance_thresholds.memory_threshold_percent >= 0 &&
      var.performance_thresholds.memory_threshold_percent <= 100 &&
      var.performance_thresholds.request_latency_ms > 0 &&
      var.performance_thresholds.error_rate_percent >= 0 &&
      var.performance_thresholds.error_rate_percent <= 100
    )
    error_message = "Invalid performance threshold values"
  }
}

# Security monitoring configuration
variable "security_monitoring" {
  type = object({
    enable_audit_logging = bool
    log_retention_days  = number
    alert_severity_levels = list(string)
  })
  description = "Security monitoring configurations"
  default = {
    enable_audit_logging   = true
    log_retention_days    = 90
    alert_severity_levels = ["critical", "high", "medium"]
  }

  validation {
    condition = (
      var.security_monitoring.log_retention_days >= 30 &&
      var.security_monitoring.log_retention_days <= 365
    )
    error_message = "Log retention days must be between 30 and 365"
  }
}

# Scaling monitoring configuration
variable "scaling_monitoring" {
  type = object({
    max_concurrent_users = number
    requests_per_day    = number
    enable_autoscaling  = bool
  })
  description = "Scaling monitoring configurations"
  default = {
    max_concurrent_users = 1000
    requests_per_day    = 100000
    enable_autoscaling  = true
  }

  validation {
    condition = (
      var.scaling_monitoring.max_concurrent_users > 0 &&
      var.scaling_monitoring.requests_per_day > 0
    )
    error_message = "Scaling thresholds must be positive numbers"
  }
}