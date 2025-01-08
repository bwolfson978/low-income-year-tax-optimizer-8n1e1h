# Database instance identifier output
output "database_id" {
  description = "Unique identifier of the Supabase database instance used for cross-module references and resource dependencies"
  value       = supabase_database.main.id
  sensitive   = false
}

# Database connection endpoint output
output "database_endpoint" {
  description = "Connection endpoint URL for the Supabase database in format: https://<project-id>.supabase.co:6543/postgres"
  value       = supabase_database.main.endpoint
  sensitive   = false
}

# Secure database connection string output
output "database_connection_string" {
  description = "Full PostgreSQL connection string containing credentials and configuration parameters - must be handled securely"
  value       = supabase_database.main.connection_string
  sensitive   = true
}

# SSL enforcement status output
output "ssl_enabled" {
  description = "Boolean flag indicating if SSL/TLS encryption is enforced for all database connections as per security requirements"
  value       = supabase_database_security_config.main.ssl_enforcement
  sensitive   = false
}

# Network security allowed IP ranges output
output "allowed_ip_ranges" {
  description = "List of CIDR-formatted IP ranges allowed to connect to the database through network security rules"
  value       = supabase_database_security_config.main.allowed_ip_ranges
  sensitive   = false
}

# Database monitoring status output
output "monitoring_enabled" {
  description = "Boolean flag indicating if enhanced database monitoring and metrics collection is enabled for observability"
  value       = supabase_database.main.enable_monitoring
  sensitive   = false
}