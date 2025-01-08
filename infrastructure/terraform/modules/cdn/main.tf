# Configure Vercel provider requirements
terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }
}

# Vercel project configuration for the tax optimizer application
resource "vercel_project" "tax_optimizer" {
  name        = var.project_name
  framework   = "nextjs"
  environment = var.environment

  git_repository = {
    type              = "github"
    repo              = "tax-optimizer"
    production_branch = "main"
  }

  build_command    = "pnpm build"
  output_directory = ".next"
  ignore_command   = "git diff --quiet HEAD^ HEAD ./"
  root_directory   = "src/web"
}

# Enhanced Vercel deployment configuration with advanced caching and security
resource "vercel_deployment" "tax_optimizer" {
  project_id = vercel_project.tax_optimizer.id
  production = var.environment == "production"
  regions    = var.regions

  edge_config {
    cache_ttl = var.cache_ttl
    stale_ttl = var.stale_ttl
    rules     = var.static_cache_rules

    cache_by_header = [
      "Accept-Language",
      "Accept-Encoding"
    ]

    bypass_cache = [
      "Cookie",
      "Authorization"
    ]

    cache_optimization {
      auto_minify = true
      brotli      = true
      http2_push  = true
    }
  }

  edge_functions {
    runtime      = "nodejs18.x"
    memory       = 1024
    maxDuration  = 10
    concurrency  = 50
    timeout      = 10
  }

  protection {
    ddos = var.enable_ddos_protection
    bot  = true

    rate_limit {
      requests_per_minute = 100
      burst              = 200
    }

    headers = {
      "X-Frame-Options"           = "DENY"
      "X-Content-Type-Options"    = "nosniff"
      "Strict-Transport-Security" = "max-age=31536000; includeSubDomains"
      "Content-Security-Policy"   = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
      "Permissions-Policy"        = "camera=(), microphone=(), geolocation=()"
      "Referrer-Policy"          = "strict-origin-when-cross-origin"
    }
  }
}

# Custom domain configuration for the CDN
resource "vercel_domain" "tax_optimizer_domain" {
  name       = var.domain
  project_id = vercel_project.tax_optimizer.id
  git_branch = var.environment == "production" ? "main" : "develop"
  redirect   = null
  zone      = var.domain
}

# Output values for use in other modules
output "project_id" {
  value       = vercel_project.tax_optimizer.id
  description = "The ID of the created Vercel project"
}

output "project_name" {
  value       = vercel_project.tax_optimizer.name
  description = "The name of the created Vercel project"
}

output "deployment_url" {
  value       = vercel_deployment.tax_optimizer.url
  description = "The URL of the Vercel deployment"
}

output "deployment_domains" {
  value       = vercel_deployment.tax_optimizer.domains
  description = "The domains associated with the Vercel deployment"
}