#!/bin/bash

# Database Backup Script for Tax Optimizer Platform
# Version: 1.0.0
# Dependencies:
# - postgresql-client-15 (15+)
# - gnupg (2.0+)

set -euo pipefail

# Global Configuration
BACKUP_DIR="/var/backups/tax-optimizer/db"
LOG_DIR="/var/log/tax-optimizer"
BACKUP_PREFIX="tax_optimizer_db"
RETENTION_DAYS=2555  # 7 years retention
GPG_RECIPIENT="backup-encryption-key"
COMPRESSION_LEVEL=9
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/db-backup.log"

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM SIGQUIT ERR

# Cleanup function for handling interrupts and errors
cleanup() {
    local exit_code=$?
    local error_line=$BASH_LINENO
    
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ")|ERROR|cleanup|Backup script interrupted or failed at line ${error_line}|exit_code=${exit_code}" >> "${LOG_FILE}"
    
    # Remove incomplete backup files
    rm -f "${BACKUP_DIR}/incomplete_${TIMESTAMP}"*
    
    # Release any hanging connections
    if [[ -n "${PG_CONN_PID:-}" ]]; then
        kill -9 "${PG_CONN_PID}" 2>/dev/null || true
    fi
    
    exit "${exit_code}"
}

# Logging function
log_backup_status() {
    local level=$1
    local operation=$2
    local message=$3
    local metrics=${4:-}
    
    local log_entry="$(date -u +"%Y-%m-%dT%H:%M:%SZ")|${level}|${operation}|${message}|${metrics}"
    echo "${log_entry}" >> "${LOG_FILE}"
    
    # Log critical errors to syslog
    if [[ "${level}" == "ERROR" ]]; then
        logger -t tax-optimizer-backup -p daemon.error "${message}"
    fi
}

# Check required dependencies and configurations
check_dependencies() {
    local missing_deps=0
    
    # Check PostgreSQL client
    if ! command -v pg_dump >/dev/null; then
        log_backup_status "ERROR" "dependency_check" "pg_dump not found"
        missing_deps=1
    fi
    
    # Check GPG
    if ! command -v gpg >/dev/null; then
        log_backup_status "ERROR" "dependency_check" "gpg not found"
        missing_deps=1
    fi
    
    # Verify GPG recipient key
    if ! gpg --list-keys "${GPG_RECIPIENT}" >/dev/null 2>&1; then
        log_backup_status "ERROR" "dependency_check" "GPG recipient key not found"
        missing_deps=1
    fi
    
    # Check required environment variables
    for var in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD; do
        if [[ -z "${!var:-}" ]]; then
            log_backup_status "ERROR" "dependency_check" "Missing required environment variable: ${var}"
            missing_deps=1
        fi
    done
    
    # Check directories
    for dir in "${BACKUP_DIR}" "${LOG_DIR}"; do
        if [[ ! -d "${dir}" ]]; then
            mkdir -p "${dir}"
            chmod 700 "${dir}"
        fi
        if [[ ! -w "${dir}" ]]; then
            log_backup_status "ERROR" "dependency_check" "Directory not writable: ${dir}"
            missing_deps=1
        fi
    done
    
    # Check available disk space (require at least 10GB)
    local available_space=$(df -BG "${BACKUP_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if (( available_space < 10 )); then
        log_backup_status "ERROR" "dependency_check" "Insufficient disk space" "available_space=${available_space}G"
        missing_deps=1
    fi
    
    return "${missing_deps}"
}

# Create encrypted backup
create_backup() {
    local backup_file="${BACKUP_DIR}/${BACKUP_PREFIX}_${TIMESTAMP}.sql.gz.gpg"
    local start_time=$(date +%s)
    
    log_backup_status "INFO" "backup_start" "Starting database backup" "timestamp=${TIMESTAMP}"
    
    # Create backup with compression and encryption
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --format=plain \
        --no-owner \
        --no-acl \
        2> >(tee -a "${LOG_FILE}") \
        | gzip -"${COMPRESSION_LEVEL}" \
        | gpg --encrypt \
            --recipient "${GPG_RECIPIENT}" \
            --trust-model always \
            --compress-algo none \
            -o "${backup_file}"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local backup_size=$(stat -f %z "${backup_file}")
    
    # Calculate checksum
    sha256sum "${backup_file}" > "${backup_file}.sha256"
    
    # Update backup manifest
    echo "${TIMESTAMP}|${backup_file}|${backup_size}|${duration}" >> "${BACKUP_DIR}/manifest.log"
    
    log_backup_status "INFO" "backup_complete" "Backup completed successfully" "duration=${duration}s,size=${backup_size}bytes"
    
    return 0
}

# Cleanup old backups
cleanup_old_backups() {
    local deleted_count=0
    local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
    
    log_backup_status "INFO" "cleanup_start" "Starting cleanup of old backups" "retention_days=${RETENTION_DAYS}"
    
    while IFS= read -r backup_file; do
        local backup_date=$(echo "${backup_file}" | grep -oP '\d{8}' || echo "")
        if [[ -n "${backup_date}" && "${backup_date}" < "${cutoff_date}" ]]; then
            # Verify backup integrity before deletion
            if sha256sum -c "${backup_file}.sha256" >/dev/null 2>&1; then
                rm -f "${backup_file}" "${backup_file}.sha256"
                ((deleted_count++))
            else
                log_backup_status "WARNING" "cleanup_integrity" "Backup integrity check failed" "file=${backup_file}"
            fi
        fi
    done < <(find "${BACKUP_DIR}" -name "${BACKUP_PREFIX}_*.sql.gz.gpg" -type f)
    
    log_backup_status "INFO" "cleanup_complete" "Cleanup completed" "deleted_count=${deleted_count}"
    
    return "${deleted_count}"
}

# Main execution
main() {
    log_backup_status "INFO" "script_start" "Starting backup script" "version=1.0.0"
    
    # Check dependencies
    if ! check_dependencies; then
        log_backup_status "ERROR" "main" "Dependency check failed"
        exit 1
    fi
    
    # Create backup
    if ! create_backup; then
        log_backup_status "ERROR" "main" "Backup creation failed"
        exit 1
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    log_backup_status "INFO" "script_complete" "Backup script completed successfully"
    exit 0
}

# Execute main function
main