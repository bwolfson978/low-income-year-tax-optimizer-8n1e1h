# Terraform outputs for the Low Income Year Tax Optimizer Tool infrastructure
# AWS Provider version: ~> 4.0

# General environment information output
output "environment_info" {
  description = "General environment information for the deployment"
  value = {
    environment           = var.environment
    region               = var.region
    project              = "tax-optimizer"
    version              = var.infrastructure_version
    deployment_timestamp = timestamp()
  }
  sensitive = false
}

# Database endpoints and configuration
output "database_endpoints" {
  description = "Database connection endpoints and configuration"
  value = {
    primary_host      = aws_db_instance.primary.endpoint
    read_replicas     = aws_db_instance.replicas[*].endpoint
    port             = aws_db_instance.primary.port
    database_name    = aws_db_instance.primary.db_name
    connection_string = aws_db_instance.primary.connection_string
  }
  sensitive = true
}

# CDN configuration and endpoints
output "cdn_configuration" {
  description = "CDN distribution endpoints and settings"
  value = {
    distribution_domain     = aws_cloudfront_distribution.main.domain_name
    distribution_id        = aws_cloudfront_distribution.main.id
    origin_access_identity = aws_cloudfront_origin_access_identity.main.iam_arn
    custom_domains         = aws_route53_record.cdn[*].fqdn
    cache_settings = {
      default_ttl         = var.cdn_default_ttl
      max_ttl            = var.cdn_max_ttl
      compression_enabled = true
    }
  }
  sensitive = false
}

# Monitoring and logging configuration
output "monitoring_endpoints" {
  description = "Monitoring and logging configuration endpoints"
  value = {
    log_groups = {
      application = aws_cloudwatch_log_group.application.name
      api        = aws_cloudwatch_log_group.api.name
      database   = aws_cloudwatch_log_group.database.name
    }
    metrics_namespace = var.metrics_namespace
    alarm_topics = {
      critical = aws_sns_topic.critical_alarms.arn
      warning  = aws_sns_topic.warning_alarms.arn
    }
    dashboard_url = aws_cloudwatch_dashboard.main.dashboard_url
  }
  sensitive = false
}

# Security configuration and endpoints
output "security_configuration" {
  description = "Security-related endpoints and configuration"
  value = {
    auth_endpoint = aws_cognito_user_pool.main.endpoint
    api_endpoints = {
      main      = aws_apigateway_stage.main.invoke_url
      websocket = aws_apigatewayv2_stage.websocket.invoke_url
    }
    certificate_arns = {
      api = aws_acm_certificate.api.arn
      cdn = aws_acm_certificate.cdn.arn
    }
    vpc_endpoints = {
      api = aws_vpc_endpoint.api.dns_entry
      s3  = aws_vpc_endpoint.s3.dns_entry
    }
  }
  sensitive = true
}