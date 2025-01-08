#!/usr/bin/env bash

# restore-database.sh
# Database restoration script for Tax Optimizer platform
# Version: 1.0.0
# Requires: PostgreSQL 15+, GnuPG 2.0+

set -euo pipefail
IFS=$'\n\t'

# Global variables
BACKUP_DIR="/var/backups/tax-optimizer/db"
GPG_RECIPIENT="backup-encryption-key"
RESTORE_LOG="/var/log/tax-optimizer/db-restore.log"
TEMP_DIR="/tmp/tax-optimizer-restore"
LOCK_FILE="/var/run/tax-optimizer-restore.lock"
MAX_PARALLEL_JOBS="4"
SCRIPT_NAME=$(basename "$0")
CORRELATION_ID=$(uuidgen)

# Logging function with JSON formatting
log_restore_status() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    local log_entry="{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"correlation_id\":\"$CORRELATION_ID\",\"message\":\"$message\"}"
    
    echo "$log_entry" | tee -a "$RESTORE_LOG"
    
    # Forward critical errors to system logger
    if [[ "$level" == "ERROR" ]]; then
        logger -t "$SCRIPT_NAME" -p user.err "$message"
    fi
}

# Cleanup handler for secure removal of temporary files
cleanup() {
    local exit_code=$?
    log_restore_status "INFO" "Initiating cleanup procedure"
    
    # Secure deletion of temporary files
    if [[ -d "$TEMP_DIR" ]]; then
        find "$TEMP_DIR" -type f -exec shred -u {} \;
        rm -rf "$TEMP_DIR"
    fi
    
    # Release lock file
    if [[ -f "$LOCK_FILE" ]]; then
        rm -f "$LOCK_FILE"
    fi
    
    # Log final status
    if [[ $exit_code -eq 0 ]]; then
        log_restore_status "INFO" "Restoration completed successfully"
    else
        log_restore_status "ERROR" "Restoration failed with exit code $exit_code"
    fi
    
    exit $exit_code
}

# Set up trap handlers
trap cleanup EXIT
trap 'exit 2' SIGINT SIGTERM SIGQUIT SIGHUP

# Dependency verification
check_dependencies() {
    log_restore_status "INFO" "Checking dependencies"
    
    # Check PostgreSQL client
    if ! command -v pg_restore >/dev/null 2>&1; then
        log_restore_status "ERROR" "pg_restore not found. Please install postgresql-client-15"
        return 1
    fi
    
    # Check GPG
    if ! command -v gpg >/dev/null 2>&1; then
        log_restore_status "ERROR" "gpg not found. Please install gnupg"
        return 1
    fi
    
    # Verify environment variables
    local required_vars=("DB_HOST" "DB_PORT" "DB_NAME" "DB_USER" "DB_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_restore_status "ERROR" "Required environment variable $var is not set"
            return 1
        fi
    done
    
    # Check GPG key
    if ! gpg --list-keys "$GPG_RECIPIENT" >/dev/null 2>&1; then
        log_restore_status "ERROR" "GPG key $GPG_RECIPIENT not found"
        return 1
    fi
    
    return 0
}

# List and validate available backups
list_available_backups() {
    log_restore_status "INFO" "Listing available backups"
    
    local backups=()
    while IFS= read -r backup; do
        # Verify backup file integrity
        if gpg --verify "$backup.sha256" "$backup" 2>/dev/null; then
            local timestamp=$(stat -c %Y "$backup")
            local size=$(stat -c %s "$backup")
            backups+=("$backup|$timestamp|$size")
        else
            log_restore_status "WARNING" "Backup integrity check failed for $backup"
        fi
    done < <(find "$BACKUP_DIR" -name "*.gpg" -type f)
    
    # Sort by timestamp descending
    printf '%s\n' "${backups[@]}" | sort -t'|' -k2 -nr
    
    return 0
}

# Decrypt backup file
decrypt_backup() {
    local backup_file="$1"
    local decrypted_file="$TEMP_DIR/$(basename "$backup_file" .gpg)"
    
    log_restore_status "INFO" "Decrypting backup file $backup_file"
    
    # Create secure temporary directory
    mkdir -p "$TEMP_DIR"
    chmod 700 "$TEMP_DIR"
    
    # Decrypt backup
    if ! gpg --decrypt --recipient "$GPG_RECIPIENT" --output "$decrypted_file" "$backup_file"; then
        log_restore_status "ERROR" "Failed to decrypt backup file"
        return 1
    fi
    
    # Verify decrypted file
    if [[ ! -f "$decrypted_file" ]]; then
        log_restore_status "ERROR" "Decrypted file not found"
        return 1
    fi
    
    echo "$decrypted_file"
    return 0
}

# Perform database restoration
restore_database() {
    local decrypted_backup="$1"
    
    log_restore_status "INFO" "Starting database restoration from $decrypted_backup"
    
    # Acquire lock
    if ! mkdir "$LOCK_FILE" 2>/dev/null; then
        log_restore_status "ERROR" "Another restoration process is running"
        return 1
    fi
    
    # Verify database connection
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
        log_restore_status "ERROR" "Failed to connect to database"
        return 1
    fi
    
    # Perform restoration
    if ! PGPASSWORD="$DB_PASSWORD" pg_restore \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --jobs="$MAX_PARALLEL_JOBS" \
        --verbose \
        --clean \
        --if-exists \
        "$decrypted_backup" 2>&1 | tee -a "$RESTORE_LOG"; then
        log_restore_status "ERROR" "Database restoration failed"
        return 1
    fi
    
    # Verify restoration
    local validation_query="
        SELECT COUNT(*) as table_count FROM information_schema.tables 
        WHERE table_schema = 'public';"
    
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$validation_query")
    
    if [[ $table_count -eq 0 ]]; then
        log_restore_status "ERROR" "Validation failed: No tables found after restoration"
        return 1
    fi
    
    log_restore_status "INFO" "Database restoration completed successfully"
    return 0
}

# Main execution
main() {
    log_restore_status "INFO" "Starting database restoration process"
    
    # Check dependencies
    if ! check_dependencies; then
        log_restore_status "ERROR" "Dependency check failed"
        exit 1
    fi
    
    # List available backups
    local backups=($(list_available_backups))
    if [[ ${#backups[@]} -eq 0 ]]; then
        log_restore_status "ERROR" "No valid backup files found"
        exit 1
    fi
    
    # Use latest backup
    local latest_backup=$(echo "${backups[0]}" | cut -d'|' -f1)
    
    # Decrypt backup
    local decrypted_backup
    if ! decrypted_backup=$(decrypt_backup "$latest_backup"); then
        log_restore_status "ERROR" "Backup decryption failed"
        exit 1
    fi
    
    # Restore database
    if ! restore_database "$decrypted_backup"; then
        log_restore_status "ERROR" "Database restoration failed"
        exit 1
    fi
    
    log_restore_status "INFO" "Restoration process completed successfully"
    exit 0
}

main "$@"