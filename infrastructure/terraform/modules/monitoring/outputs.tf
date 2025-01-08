# Monitoring namespace output
output "monitoring_namespace" {
  description = "Kubernetes namespace where monitoring components are deployed for system and security monitoring"
  value       = kubernetes_namespace.monitoring.metadata[0].name
}

# Prometheus endpoint output
output "prometheus_endpoint" {
  description = "Endpoint URL for Prometheus metrics server providing application performance and event monitoring"
  value       = "${kubernetes_namespace.monitoring.metadata[0].name}-prometheus.${data.aws_eks_cluster.monitoring_cluster.endpoint}"
}

# Grafana endpoint output
output "grafana_endpoint" {
  description = "Endpoint URL for Grafana dashboard providing visualization of system metrics and security events"
  value       = "${kubernetes_namespace.monitoring.metadata[0].name}-grafana.${data.aws_eks_cluster.monitoring_cluster.endpoint}"
}

# AlertManager endpoint output
output "alertmanager_endpoint" {
  description = "Endpoint URL for AlertManager handling system and security alerts with configurable notification channels"
  value       = "${kubernetes_namespace.monitoring.metadata[0].name}-alertmanager.${data.aws_eks_cluster.monitoring_cluster.endpoint}"
}

# CloudWatch log group output
output "log_group_name" {
  description = "Name of the CloudWatch log group for centralized monitoring and security event logging"
  value       = aws_cloudwatch_log_group.monitoring_logs.name
}

# Grafana admin password output
output "grafana_admin_password" {
  description = "Secure admin password for Grafana dashboard access with elevated privileges"
  value       = var.grafana_admin_password
  sensitive   = true
}

# Monitoring alerts topic output
output "monitoring_alerts_topic_arn" {
  description = "ARN of the SNS topic used for monitoring and security alerts"
  value       = aws_sns_topic.monitoring_alerts.arn
}

# Performance monitoring thresholds output
output "performance_thresholds" {
  description = "Configured thresholds for performance monitoring alerts"
  value = {
    cpu_threshold_percent    = var.performance_thresholds.cpu_threshold_percent
    memory_threshold_percent = var.performance_thresholds.memory_threshold_percent
    request_latency_ms      = var.performance_thresholds.request_latency_ms
    error_rate_percent      = var.performance_thresholds.error_rate_percent
  }
}

# Security monitoring configuration output
output "security_monitoring_config" {
  description = "Security monitoring configuration including audit logging and retention settings"
  value = {
    enable_audit_logging   = var.security_monitoring.enable_audit_logging
    log_retention_days    = var.security_monitoring.log_retention_days
    alert_severity_levels = var.security_monitoring.alert_severity_levels
  }
}

# Scaling monitoring configuration output
output "scaling_monitoring_config" {
  description = "Configuration for monitoring system scaling and capacity"
  value = {
    max_concurrent_users = var.scaling_monitoring.max_concurrent_users
    requests_per_day    = var.scaling_monitoring.requests_per_day
    enable_autoscaling  = var.scaling_monitoring.enable_autoscaling
  }
}