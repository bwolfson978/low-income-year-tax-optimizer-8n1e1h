#!/bin/bash

# Tax Optimizer Platform Health Check Script
# Version: 1.0.0
# Dependencies: curl (latest), jq (latest)

# Global constants
readonly BACKEND_SERVICE="tax-optimizer-backend.production.svc.cluster.local"
readonly WEB_SERVICE="tax-optimizer-web.production.svc.cluster.local"
readonly HEALTH_CHECK_TIMEOUT=5
readonly MAX_RESPONSE_TIME=500
readonly MAX_RETRIES=3
readonly RETRY_DELAY=2
readonly LOG_PATH="/var/log/tax-optimizer/health-checks"
readonly CORRELATION_ID_PREFIX="hc"

# Ensure log directory exists
mkdir -p "${LOG_PATH}"

# Generate unique correlation ID for this execution
generate_correlation_id() {
    echo "${CORRELATION_ID_PREFIX}-$(date +%s)-$(openssl rand -hex 4)"
}

# Check if required dependencies are installed
check_dependencies() {
    local status=0

    # Check curl
    if ! command -v curl &> /dev/null; then
        echo "ERROR: curl is not installed" >&2
        status=1
    fi

    # Check jq
    if ! command -v jq &> /dev/null; then
        echo "ERROR: jq is not installed" >&2
        status=1
    fi

    # Check TLS certificates
    if [ ! -f "/etc/ssl/certs/ca-certificates.crt" ]; then
        echo "ERROR: TLS certificates not found" >&2
        status=1
    fi

    # Check log directory permissions
    if [ ! -w "${LOG_PATH}" ]; then
        echo "ERROR: Cannot write to log directory ${LOG_PATH}" >&2
        status=1
    fi

    return $status
}

# Log health metrics to monitoring system
log_health_metrics() {
    local service_name=$1
    local response_time=$2
    local status_code=$3
    local correlation_id=$4
    local timestamp=$(date +%s)
    local log_file="${LOG_PATH}/metrics-${timestamp}.log"

    # Format metric data
    local metric_data=$(cat <<EOF
{
    "timestamp": ${timestamp},
    "correlation_id": "${correlation_id}",
    "service": "${service_name}",
    "response_time_ms": ${response_time},
    "status_code": ${status_code},
    "environment": "production"
}
EOF
)

    # Write to log file
    echo "${metric_data}" >> "${log_file}"
    
    return $?
}

# Check backend service health
check_backend_health() {
    local correlation_id=$1
    local retry_count=0
    local status=1

    while [ $retry_count -lt $MAX_RETRIES ]; do
        local start_time=$(date +%s%N)
        local response=$(curl -s -w "\n%{http_code}" \
            --max-time $HEALTH_CHECK_TIMEOUT \
            --cacert /etc/ssl/certs/ca-certificates.crt \
            -H "X-Correlation-ID: ${correlation_id}" \
            "https://${BACKEND_SERVICE}/health")
        
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        local http_body=$(echo "$response" | head -n 1)
        local http_code=$(echo "$response" | tail -n 1)

        if [ "$http_code" = "200" ] && [ $response_time -le $MAX_RESPONSE_TIME ]; then
            # Validate JSON response
            if echo "$http_body" | jq -e '.status == "healthy"' &> /dev/null; then
                log_health_metrics "backend" $response_time $http_code $correlation_id
                status=0
                break
            fi
        fi

        retry_count=$((retry_count + 1))
        [ $retry_count -lt $MAX_RETRIES ] && sleep $RETRY_DELAY
    done

    return $status
}

# Check web service health
check_web_health() {
    local correlation_id=$1
    local retry_count=0
    local status=1

    while [ $retry_count -lt $MAX_RETRIES ]; do
        local start_time=$(date +%s%N)
        local response=$(curl -s -w "\n%{http_code}" \
            --max-time $HEALTH_CHECK_TIMEOUT \
            --cacert /etc/ssl/certs/ca-certificates.crt \
            -H "X-Correlation-ID: ${correlation_id}" \
            "https://${WEB_SERVICE}/api/health")
        
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        local http_body=$(echo "$response" | head -n 1)
        local http_code=$(echo "$response" | tail -n 1)

        if [ "$http_code" = "200" ] && [ $response_time -le $MAX_RESPONSE_TIME ]; then
            if echo "$http_body" | jq -e '.status == "healthy" and .cdn == "available"' &> /dev/null; then
                log_health_metrics "web" $response_time $http_code $correlation_id
                status=0
                break
            fi
        fi

        retry_count=$((retry_count + 1))
        [ $retry_count -lt $MAX_RETRIES ] && sleep $RETRY_DELAY
    done

    return $status
}

# Check database connection
check_database_connection() {
    local correlation_id=$1
    local retry_count=0
    local status=1

    while [ $retry_count -lt $MAX_RETRIES ]; do
        local start_time=$(date +%s%N)
        local response=$(curl -s -w "\n%{http_code}" \
            --max-time $HEALTH_CHECK_TIMEOUT \
            --cacert /etc/ssl/certs/ca-certificates.crt \
            -H "X-Correlation-ID: ${correlation_id}" \
            "https://${BACKEND_SERVICE}/health/database")
        
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        local http_body=$(echo "$response" | head -n 1)
        local http_code=$(echo "$response" | tail -n 1)

        if [ "$http_code" = "200" ] && [ $response_time -le $MAX_RESPONSE_TIME ]; then
            if echo "$http_body" | jq -e '.status == "connected" and .replication == "healthy"' &> /dev/null; then
                log_health_metrics "database" $response_time $http_code $correlation_id
                status=0
                break
            fi
        fi

        retry_count=$((retry_count + 1))
        [ $retry_count -lt $MAX_RETRIES ] && sleep $RETRY_DELAY
    done

    return $status
}

# Main function
main() {
    local correlation_id=$(generate_correlation_id)
    local exit_status=0

    # Check dependencies
    if ! check_dependencies; then
        echo "ERROR: Dependency check failed" >&2
        return 1
    fi

    # Run health checks
    if ! check_backend_health "$correlation_id"; then
        echo "ERROR: Backend health check failed" >&2
        exit_status=1
    fi

    if ! check_web_health "$correlation_id"; then
        echo "ERROR: Web health check failed" >&2
        exit_status=1
    fi

    if ! check_database_connection "$correlation_id"; then
        echo "ERROR: Database connection check failed" >&2
        exit_status=1
    fi

    # Cleanup old log files (keep last 7 days)
    find "${LOG_PATH}" -type f -mtime +7 -delete

    return $exit_status
}

# Execute main function
main "$@"