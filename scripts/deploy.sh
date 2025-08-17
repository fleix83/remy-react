#!/bin/bash

# Deploy React build to GitHub dist branch
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

# Handle uncommitted changes (auto-commit build files)
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
    # Check if only build files are uncommitted
    UNCOMMITTED=$(git status --porcelain 2>/dev/null)
    if echo "$UNCOMMITTED" | grep -v '^?? ' | grep -v ' dist/' | grep -v ' node_modules/' > /dev/null; then
        # There are non-build uncommitted changes
        echo "⚠️  You have uncommitted changes (non-build files). Deploy anyway? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "❌ Deployment cancelled"
            exit 1
        fi
    else
        # Only build files or untracked files - auto-handle
        echo "📝 Auto-committing build file changes..."
        git add dist/ node_modules/.tmp/ 2>/dev/null || true
        git commit -m "Update build files for deployment" 2>/dev/null || true
    fi
fi

# Build production bundle
echo "🔨 Building production bundle..."
npm run build

if [[ ! -d "dist" ]]; then
    echo "❌ Build failed - no dist directory found"
    exit 1
fi

# Create proper .htaccess file
echo "📝 Creating .htaccess file..."
cat > dist/.htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Erlaube statische Dateien und index.html
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Alle anderen Anfragen gehen an index.html
  RewriteRule . /index.html [L]
</IfModule>
EOF

# Get build statistics and store absolute paths
BUILD_SIZE=$(du -sh dist/ | cut -f1)
FILE_COUNT=$(find dist/ -type f | wc -l | tr -d ' ')
echo "✅ Build completed: $FILE_COUNT files, $BUILD_SIZE total"

# Store absolute paths to build files before switching branches
CURRENT_DIR=$(pwd)
DIST_DIR="$CURRENT_DIR/dist"

# Verify relative paths in the build before proceeding
echo "🔍 Verifying build has relative paths..."
if ! grep -q 'href="./assets/' "$DIST_DIR/index.html" || ! grep -q 'src="./assets/' "$DIST_DIR/index.html"; then
    echo "❌ Build doesn't have relative paths! Something is wrong with Vite config."
    cat "$DIST_DIR/index.html" | grep -E "(href|src)="
    exit 1
fi
echo "✅ Build has correct relative paths"

# Switch to dist branch (create if doesn't exist)
echo "🌿 Switching to dist branch..."
if git show-ref --verify --quiet refs/heads/dist 2>/dev/null; then
    git checkout dist
else
    git checkout --orphan dist
    git rm -rf --cached . >/dev/null 2>&1 || true
fi

# Remove all files from git index and working directory (clean slate)
echo "🧹 Cleaning dist branch..."
git rm -rf --cached . >/dev/null 2>&1 || true
# Remove files but preserve .git directory
find . -maxdepth 1 ! -name . ! -name .. ! -name .git -exec rm -rf {} + 2>/dev/null || true

# Copy only essential build files to root using absolute paths
echo "📦 Adding build files to root..."
# Copy specific files to preserve relative paths exactly as built
if [[ -f "$DIST_DIR/index.html" ]]; then
    cp "$DIST_DIR/index.html" .
    echo "✅ Copied index.html"
else
    echo "❌ index.html not found in build"
    exit 1
fi

if [[ -d "$DIST_DIR/assets" ]]; then
    cp -r "$DIST_DIR/assets" .
    echo "✅ Copied assets directory"
else
    echo "❌ assets directory not found in build"
    exit 1
fi

if [[ -f "$DIST_DIR/vite.svg" ]]; then
    cp "$DIST_DIR/vite.svg" .
    echo "✅ Copied vite.svg"
fi

if [[ -f "$DIST_DIR/.htaccess" ]]; then
    cp "$DIST_DIR/.htaccess" .
    echo "✅ Copied .htaccess"
fi

# Verify the paths are still relative before adding to git
echo "🔍 Verifying relative paths in copied files..."
if [[ -f "index.html" ]] && grep -q 'href="./assets/' index.html && grep -q 'src="./assets/' index.html; then
    echo "✅ Relative paths preserved in copied files"
else
    echo "❌ Relative paths were corrupted during copy"
    if [[ -f "index.html" ]]; then
        echo "Current paths in index.html:"
        cat index.html | grep -E "(href|src)=" | head -5
    else
        echo "index.html not found after copy"
    fi
    exit 1
fi

# Add only these specific files, not everything
echo "📝 Adding files to git..."
git add index.html assets/
[[ -f "vite.svg" ]] && git add vite.svg
[[ -f ".htaccess" ]] && git add .htaccess
echo "✅ Files added to git"

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

# Push to GitHub dist branch
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
    echo "🌐 Deployed to: https://github.com/$REPO_URL/tree/dist"
    echo "📁 Build files are now in the root of the dist branch"
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