#!/usr/bin/env bash

# CONFIG
MAX_BACKUPS=7
BACKUP_DIR="."
BACKUP_TARGETS=("Database" "logs")
BACKUP_LOCATION="/root/OSL/backups/slapbot/data"

# Check if backup directory exists and create it if not
if [ ! -d "$BACKUP_LOCATION" ]; then
    mkdir -p "$BACKUP_LOCATION"
fi

# Make new backup folder with current timestamp
timestamp=$(date +"%Y%m%d%H%M")
mkdir -p "$BACKUP_LOCATION/$timestamp"

# Make the backups
for target in "${BACKUP_TARGETS[@]}"; do
    echo "- Backing up $BACKUP_DIR/$target"
    cp -r $BACKUP_DIR/$target $BACKUP_LOCATION/$timestamp
done

# Check if max number of backups reaches
dir_count=$(find "$BACKUP_LOCATION" -mindepth 1 -maxdepth 1 -type d | wc -l)
if [ "$dir_count" -gt "$MAX_BACKUPS" ]; then
    smallest_dir=$(find "$BACKUP_LOCATION" -mindepth 1 -maxdepth 1 -type d | \
        sed 's#.*/##' | sort -n | head -n 1)
    rm -r $BACKUP_LOCATION/$smallest_dir
fi
