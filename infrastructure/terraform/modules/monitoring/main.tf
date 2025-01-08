# Configure required providers with version constraints
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# Provider configurations
provider "aws" {
  region = var.region
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.monitoring_cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.monitoring_cluster.certificate_authority[0].data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", var.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.monitoring_cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.monitoring_cluster.certificate_authority[0].data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", var.cluster_name]
    }
  }
}

# Data sources
data "aws_eks_cluster" "monitoring_cluster" {
  name = var.cluster_name
}

# Local variables
locals {
  monitoring_labels = {
    environment    = var.environment
    managed-by     = "terraform"
    component      = "monitoring"
    security-zone  = "restricted"
  }

  component_config = {
    prometheus = {
      retention       = "${var.retention_days}d"
      scrape_interval = var.metrics_scrape_interval
      storage_class   = "gp3"
      storage_size    = "100Gi"
    }
    grafana = {
      admin_password = var.grafana_admin_password
      plugins        = ["grafana-piechart-panel", "grafana-worldmap-panel"]
      security = {
        allow_embedding = false
        cookie_secure   = true
      }
    }
    alertmanager = {
      endpoints     = var.alert_endpoints
      retention     = "168h"
      storage_size  = "20Gi"
    }
  }
}

# Create monitoring namespace
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = var.monitoring_namespace
    labels = merge(local.monitoring_labels, {
      "kubernetes.io/metadata.name" = var.monitoring_namespace
    })
  }
}

# Deploy Prometheus stack via Helm
resource "helm_release" "prometheus_stack" {
  name       = "prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "45.7.1"  # Specify a stable version
  timeout    = 600
  wait       = true

  values = [
    templatefile("${path.module}/prometheus-values.yml", {
      retention_days        = local.component_config.prometheus.retention
      scrape_interval      = local.component_config.prometheus.scrape_interval
      storage_class        = local.component_config.prometheus.storage_class
      storage_size         = local.component_config.prometheus.storage_size
      grafana_password     = local.component_config.grafana.admin_password
      alert_endpoints      = local.component_config.alertmanager.endpoints
      performance_cpu      = var.performance_thresholds.cpu_threshold_percent
      performance_memory   = var.performance_thresholds.memory_threshold_percent
      performance_latency  = var.performance_thresholds.request_latency_ms
      performance_errors   = var.performance_thresholds.error_rate_percent
      max_users           = var.scaling_monitoring.max_concurrent_users
      daily_requests      = var.scaling_monitoring.requests_per_day
    })
  ]

  set {
    name  = "grafana.enabled"
    value = "true"
  }

  set {
    name  = "alertmanager.enabled"
    value = "true"
  }

  set {
    name  = "prometheus.prometheusSpec.retention"
    value = local.component_config.prometheus.retention
  }
}

# Create CloudWatch log group for monitoring
resource "aws_cloudwatch_log_group" "monitoring_logs" {
  name              = "/aws/eks/${var.cluster_name}/monitoring"
  retention_in_days = var.security_monitoring.log_retention_days
  
  tags = merge(local.monitoring_labels, {
    Name = "monitoring-logs-${var.environment}"
  })
}

# Create CloudWatch metrics for scaling monitoring
resource "aws_cloudwatch_metric_alarm" "concurrent_users" {
  alarm_name          = "concurrent-users-threshold-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "concurrent_users"
  namespace           = "CustomMetrics/Monitoring"
  period              = "300"
  statistic           = "Maximum"
  threshold           = var.scaling_monitoring.max_concurrent_users
  alarm_description   = "Monitors concurrent user count"
  alarm_actions      = [aws_sns_topic.monitoring_alerts.arn]

  tags = local.monitoring_labels
}

# Create SNS topic for monitoring alerts
resource "aws_sns_topic" "monitoring_alerts" {
  name = "monitoring-alerts-${var.environment}"
  
  tags = local.monitoring_labels
}

# Outputs
output "monitoring_endpoints" {
  description = "Endpoints for monitoring components"
  value = {
    prometheus_endpoint    = "${kubernetes_namespace.monitoring.metadata[0].name}-prometheus.${data.aws_eks_cluster.monitoring_cluster.endpoint}"
    grafana_endpoint      = "${kubernetes_namespace.monitoring.metadata[0].name}-grafana.${data.aws_eks_cluster.monitoring_cluster.endpoint}"
    alertmanager_endpoint = "${kubernetes_namespace.monitoring.metadata[0].name}-alertmanager.${data.aws_eks_cluster.monitoring_cluster.endpoint}"
  }
}

output "monitoring_namespace" {
  description = "Namespace where monitoring components are deployed"
  value = kubernetes_namespace.monitoring.metadata[0].name
}