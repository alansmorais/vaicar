#!/usr/bin/env bash
# Gradle Wrapper replacement in pure bash
# Downloads and runs the exact Gradle version needed to prevent incompatibilities with system Gradle

set -e

GRADLE_VERSION="8.4"
DIST_URL="https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"
GRADLE_USER_HOME="${HOME}/.gradle"
DIST_DIR="${GRADLE_USER_HOME}/wrapper/dists/gradle-${GRADLE_VERSION}-bin"
BIN_PATH="${DIST_DIR}/gradle-${GRADLE_VERSION}/bin/gradle"

if [ ! -f "$BIN_PATH" ]; then
    echo "Downloading Gradle ${GRADLE_VERSION}..."
    mkdir -p "${GRADLE_USER_HOME}/wrapper/dists"
    TMP_ZIP=$(mktemp)
    curl -sSL "$DIST_URL" -o "$TMP_ZIP"
    
    echo "Extracting Gradle ${GRADLE_VERSION}..."
    mkdir -p "$DIST_DIR"
    unzip -q "$TMP_ZIP" -d "$DIST_DIR"
    rm -f "$TMP_ZIP"
    chmod +x "$BIN_PATH"
fi

exec "$BIN_PATH" "$@"
