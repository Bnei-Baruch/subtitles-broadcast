#!/bin/bash

HOOKS_DIR=".git/hooks"
SHARED_HOOKS_DIR=".hooks"

echo "Setting up Git hooks..."

if [ -d "$HOOKS_DIR" ] && [ -d "$SHARED_HOOKS_DIR" ]; then
  cp "$SHARED_HOOKS_DIR/pre-push" "$HOOKS_DIR/pre-push"
  chmod +x "$HOOKS_DIR/pre-push"
  echo "Pre-push hook installed successfully."
else
  echo "Error: Hooks directory not found!"
  exit 1
fi
