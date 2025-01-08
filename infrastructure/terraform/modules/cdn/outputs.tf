# Project Information
output "project_id" {
  description = "The unique identifier of the Vercel project"
  value       = vercel_project.tax_optimizer.id
}

output "project_name" {
  description = "The name of the Vercel project"
  value       = vercel_project.tax_optimizer.name
}

# Deployment Information
output "deployment_url" {
  description = "The URL of the deployed application on Vercel's edge network"
  value       = vercel_deployment.tax_optimizer.url
}

output "deployment_domains" {
  description = "List of domains associated with the deployment"
  value       = vercel_deployment.tax_optimizer.domains
}

# CDN Configuration
output "cdn_endpoints" {
  description = "Map of CDN endpoints for different regions"
  value = {
    primary = vercel_deployment.tax_optimizer.url
    domains = vercel_deployment.tax_optimizer.domains
  }
}