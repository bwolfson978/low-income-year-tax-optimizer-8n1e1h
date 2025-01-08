# Project Configuration
variable "project_name" {
  type        = string
  description = "Name of the Vercel project for the tax optimizer application"
  
  validation {
    condition     = length(var.project_name) > 0
    error_message = "Project name cannot be empty"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (production, staging)"
  
  validation {
    condition     = contains(["production", "staging"], var.environment)
    error_message = "Environment must be either production or staging"
  }
}

# Edge Network Configuration
variable "regions" {
  type        = list(string)
  description = "List of Vercel edge regions for content distribution"
  default     = ["na1", "eu1", "ap1"]
  
  validation {
    condition     = length(var.regions) > 0
    error_message = "At least one region must be specified"
  }
}

variable "domain" {
  type        = string
  description = "Custom domain for the CDN endpoint"
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.[a-zA-Z]{2,}$", var.domain))
    error_message = "Domain must be a valid domain name"
  }
}

# Cache Configuration
variable "cache_ttl" {
  type        = number
  description = "Cache time-to-live in seconds for static assets"
  default     = 3600 # 1 hour
  
  validation {
    condition     = var.cache_ttl >= 0
    error_message = "Cache TTL must be non-negative"
  }
}

variable "stale_ttl" {
  type        = number
  description = "Stale cache time-to-live in seconds for static assets"
  default     = 7200 # 2 hours
  
  validation {
    condition     = var.stale_ttl >= var.cache_ttl
    error_message = "Stale TTL must be greater than or equal to Cache TTL"
  }
}

variable "static_cache_rules" {
  type = map(object({
    path = string
    ttl  = number
  }))
  description = "Cache rules for different static asset paths"
  default = {
    images = {
      path = "/images/*"
      ttl  = 86400 # 24 hours
    }
    assets = {
      path = "/_next/static/*"
      ttl  = 31536000 # 1 year
    }
  }
}

# Security Configuration
variable "enable_ddos_protection" {
  type        = bool
  description = "Enable DDoS protection on the CDN"
  default     = true
}