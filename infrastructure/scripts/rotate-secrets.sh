#!/bin/bash

# Secret Rotation Script for Tax Optimizer Platform
# Version: 1.0.0
# Required tools: aws-cli (2.0+), supabase-cli (1.0+)
# Permissions: 0700
# Schedule: Monthly or on-demand

set -euo pipefail

# Global Configuration
readonly ENVIRONMENTS=("development" "staging" "production")
readonly SECRETS_TO_ROTATE=("SUPABASE_SERVICE_KEY" "OPENAI_API_KEY" "RESEND_API_KEY")
readonly LOG_FILE="/var/log/secret-rotation.log"
readonly ROTATION_WINDOW=3600  # 1 hour window for rotation
readonly MAX_RETRIES=3
readonly HEALTH_CHECK_TIMEOUT=300  # 5 minutes timeout for health checks

# Logging Configuration
log_rotation() {
    local environment=$1
    local secret_name=$2
    local status=$3
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local log_entry="{\"timestamp\":\"$timestamp\",\"environment\":\"$environment\",\"secret\":\"$secret_name\",\"status\":\"$status\",\"rotation_id\":\"$(uuidgen)\"}"
    
    # Write to log file with proper permissions
    echo "$log_entry" >> "$LOG_FILE"
    
    # Send metrics to monitoring system
    if command -v aws >/dev/null 2>&1; then
        aws cloudwatch put-metric-data \
            --namespace "SecretRotation" \
            --metric-name "RotationStatus" \
            --dimensions "Environment=$environment,Secret=$secret_name" \
            --value "$([ "$status" == "success" ] && echo 1 || echo 0)" \
            --unit Count
    fi
}

# Prerequisites Check
check_prerequisites() {
    # Check AWS CLI
    if ! command -v aws >/dev/null 2>&1; then
        echo "Error: aws-cli is not installed" >&2
        return 1
    fi

    # Check Supabase CLI
    if ! command -v supabase >/dev/null 2>&1; then
        echo "Error: supabase-cli is not installed" >&2
        return 1
    fi

    # Verify AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo "Error: Invalid AWS credentials" >&2
        return 1
    }

    # Check log file permissions
    if [ ! -w "$(dirname "$LOG_FILE")" ]; then
        echo "Error: Cannot write to log directory" >&2
        return 1
    fi

    return 0
}

# Supabase Key Rotation
rotate_supabase_keys() {
    local environment=$1
    local backup_key
    local new_key
    
    echo "Starting Supabase key rotation for $environment..."
    
    # Backup current key
    backup_key=$(aws secretsmanager get-secret-value \
        --secret-id "tax-optimizer/${environment}/SUPABASE_SERVICE_KEY" \
        --query 'SecretString' --output text) || return 1
    
    # Generate new key
    new_key=$(supabase keys create --name "service-key-$(date +%s)" \
        --expiration 365d --project-id "$SUPABASE_PROJECT_ID") || return 1
    
    # Verify new key format
    if [[ ! $new_key =~ ^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$ ]]; then
        echo "Error: Invalid key format generated" >&2
        return 1
    fi
    
    # Update environment with new key
    if ! update_environment "$environment" "SUPABASE_SERVICE_KEY" "$new_key"; then
        # Rollback on failure
        update_environment "$environment" "SUPABASE_SERVICE_KEY" "$backup_key"
        return 1
    fi
    
    log_rotation "$environment" "SUPABASE_SERVICE_KEY" "success"
    return 0
}

# OpenAI Key Rotation
rotate_openai_key() {
    local environment=$1
    local backup_key
    local new_key
    
    echo "Starting OpenAI key rotation for $environment..."
    
    # Backup current key
    backup_key=$(aws secretsmanager get-secret-value \
        --secret-id "tax-optimizer/${environment}/OPENAI_API_KEY" \
        --query 'SecretString' --output text) || return 1
    
    # Generate new key via OpenAI API
    new_key=$(curl -X POST "https://api.openai.com/v1/api-keys" \
        -H "Authorization: Bearer $backup_key" \
        -H "Content-Type: application/json" \
        --data '{"name":"tax-optimizer-'$environment'-'$(date +%s)'"}' \
        | jq -r '.key') || return 1
    
    # Verify new key
    if ! curl -s "https://api.openai.com/v1/models" \
        -H "Authorization: Bearer $new_key" >/dev/null; then
        echo "Error: New OpenAI key verification failed" >&2
        return 1
    fi
    
    # Update environment with new key
    if ! update_environment "$environment" "OPENAI_API_KEY" "$new_key"; then
        update_environment "$environment" "OPENAI_API_KEY" "$backup_key"
        return 1
    fi
    
    log_rotation "$environment" "OPENAI_API_KEY" "success"
    return 0
}

# Email Service Key Rotation
rotate_email_key() {
    local environment=$1
    local backup_key
    local new_key
    
    echo "Starting Resend key rotation for $environment..."
    
    # Backup current key
    backup_key=$(aws secretsmanager get-secret-value \
        --secret-id "tax-optimizer/${environment}/RESEND_API_KEY" \
        --query 'SecretString' --output text) || return 1
    
    # Generate new key via Resend API
    new_key=$(curl -X POST "https://api.resend.com/api/keys" \
        -H "Authorization: Bearer $backup_key" \
        -H "Content-Type: application/json" \
        --data '{"name":"tax-optimizer-'$environment'-'$(date +%s)'"}' \
        | jq -r '.key') || return 1
    
    # Verify new key with test email
    if ! curl -X POST "https://api.resend.com/api/email" \
        -H "Authorization: Bearer $new_key" \
        -H "Content-Type: application/json" \
        --data '{"to":"test@internal.taxoptimizer.dev","subject":"Key Rotation Test","text":"Test email"}' \
        >/dev/null; then
        echo "Error: New Resend key verification failed" >&2
        return 1
    fi
    
    # Update environment with new key
    if ! update_environment "$environment" "RESEND_API_KEY" "$new_key"; then
        update_environment "$environment" "RESEND_API_KEY" "$backup_key"
        return 1
    fi
    
    log_rotation "$environment" "RESEND_API_KEY" "success"
    return 0
}

# Environment Update
update_environment() {
    local environment=$1
    local secret_name=$2
    local secret_value=$3
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        # Update AWS Secrets Manager
        if aws secretsmanager update-secret \
            --secret-id "tax-optimizer/${environment}/${secret_name}" \
            --secret-string "$secret_value"; then
            
            # Update Vercel environment
            if vercel env add "${secret_name}" "$secret_value" \
                --environment "$environment" --yes; then
                
                # Trigger deployment
                if vercel deploy --environment "$environment" --yes; then
                    # Verify deployment health
                    sleep 30  # Wait for deployment to stabilize
                    if curl -s "https://${environment}.taxoptimizer.dev/api/health" \
                        | grep -q '"status":"healthy"'; then
                        return 0
                    fi
                fi
            fi
        fi
        
        ((retry_count++))
        sleep 10
    done
    
    return 1
}

# Main Rotation Process
main() {
    if ! check_prerequisites; then
        echo "Failed prerequisites check" >&2
        exit 1
    fi
    
    # Start rotation window timer
    local start_time=$(date +%s)
    
    for environment in "${ENVIRONMENTS[@]}"; do
        echo "Starting rotation for $environment environment..."
        
        # Check rotation window
        if [ $(($(date +%s) - start_time)) -gt $ROTATION_WINDOW ]; then
            echo "Rotation window exceeded" >&2
            exit 1
        fi
        
        # Rotate each secret
        if ! rotate_supabase_keys "$environment"; then
            log_rotation "$environment" "SUPABASE_SERVICE_KEY" "failure"
            exit 1
        fi
        
        if ! rotate_openai_key "$environment"; then
            log_rotation "$environment" "OPENAI_API_KEY" "failure"
            exit 1
        fi
        
        if ! rotate_email_key "$environment"; then
            log_rotation "$environment" "RESEND_API_KEY" "failure"
            exit 1
        fi
        
        echo "Completed rotation for $environment environment"
    done
    
    # Archive logs older than 90 days
    find "$(dirname "$LOG_FILE")" -name "secret-rotation*.log" -mtime +90 \
        -exec gzip {} \; -exec mv {}.gz /var/log/archive/ \;
    
    echo "Secret rotation completed successfully"
    exit 0
}

# Execute main function
main "$@"