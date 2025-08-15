#!/bin/bash

# Deploy to GitHub dist branch - Global deployment script
# Usage: ./scripts/deploy.sh

set -e  # Exit on any error

echo "🚀 Starting deployment to dist branch..."

# Store current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
echo "📍 Current branch: $CURRENT_BRANCH"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Check if package.json exists (Node.js project)
if [[ ! -f "package.json" ]]; then
    echo "❌ No package.json found - not a Node.js project"
    exit 1
fi

# Check for build script
if ! grep -q '"build"' package.json; then
    echo "❌ No 'build' script found in package.json"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
    echo "⚠️  You have uncommitted changes. Deploy anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Build production bundle
echo "🔨 Building production bundle..."
npm run build

if [[ ! -d "dist" ]]; then
    echo "❌ Build failed - no dist directory found"
    exit 1
fi

# Get build statistics
BUILD_SIZE=$(du -sh dist/ | cut -f1)
FILE_COUNT=$(find dist/ -type f | wc -l | tr -d ' ')
echo "✅ Build completed: $FILE_COUNT files, $BUILD_SIZE total"

# Switch to dist branch (create if doesn't exist)
echo "🌿 Switching to dist branch..."
if git show-ref --verify --quiet refs/heads/dist 2>/dev/null; then
    git checkout dist
else
    git checkout --orphan dist
    git rm -rf --cached . >/dev/null 2>&1 || true
fi

# Remove all files from git index (clean slate)
echo "🧹 Cleaning dist branch..."
git rm -rf --cached . >/dev/null 2>&1 || true

# Add only dist files
echo "📦 Adding build files..."
git add dist/

# Check if there are any changes to commit
if git diff --cached --quiet 2>/dev/null; then
    echo "ℹ️  No changes to deploy - build is identical"
    git checkout "$CURRENT_BRANCH"
    echo "🔄 Returned to $CURRENT_BRANCH branch"
    exit 0
fi

# Commit with timestamp and build info
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "Deploy build - $TIMESTAMP

🤖 Automated deployment
📦 Build: $FILE_COUNT files ($BUILD_SIZE)
🕐 Deployed: $TIMESTAMP
🌿 Branch: dist
📍 From: $CURRENT_BRANCH"

# Push to GitHub
echo "🚁 Pushing to GitHub..."
if git push -u origin dist 2>/dev/null; then
    echo "✅ Deployment successful!"
else
    echo "🔄 Force pushing (dist branch updated)..."
    git push -fu origin dist
    echo "✅ Deployment successful!"
fi

# Get repository info for URL
REPO_URL=$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/' | sed 's/\.git$//')
if [[ -n "$REPO_URL" ]]; then
    echo "🌐 Live on: https://github.com/$REPO_URL/tree/dist"
fi

echo "📊 Deployment Summary:"
echo "   • Files: $FILE_COUNT"
echo "   • Size: $BUILD_SIZE" 
echo "   • Time: $TIMESTAMP"

# Return to original branch
git checkout "$CURRENT_BRANCH"
echo "🔄 Returned to $CURRENT_BRANCH branch"

echo ""
echo "🎉 Deployment complete! Your build is now available on the dist branch."