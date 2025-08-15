# Deploy Command

Builds project and deploys to GitHub dist branch for vanilla hosting.

## Usage
```bash
/deploy
```

## What it does:
1. Builds production bundle (`npm run build`)
2. Creates/switches to `dist` branch
3. Removes all files from git tracking
4. Adds only built files from `/dist` folder
5. Commits with timestamp
6. Pushes to GitHub `origin/dist`
7. Returns to main branch

## Implementation:

```bash
#!/bin/bash

# Deploy to GitHub dist branch
# Usage: /deploy

set -e  # Exit on any error

echo "🚀 Starting deployment to dist branch..."

# Store current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Ensure we're on main and clean
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "⚠️  Switching to main branch..."
    git checkout main
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
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

echo "✅ Build completed successfully"

# Switch to dist branch (create if doesn't exist)
echo "🌿 Switching to dist branch..."
if git show-ref --verify --quiet refs/heads/dist; then
    git checkout dist
else
    git checkout -b dist
fi

# Remove all files from git index
echo "🧹 Cleaning dist branch..."
git rm -rf --cached . >/dev/null 2>&1 || true

# Add only dist files
echo "📦 Adding build files..."
git add dist/

# Check if there are any changes to commit
if git diff --cached --quiet; then
    echo "ℹ️  No changes to deploy"
    git checkout "$CURRENT_BRANCH"
    exit 0
fi

# Commit with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "Deploy build - $TIMESTAMP

🤖 Automated deployment
📦 Build: $(ls -lah dist/ | wc -l) files
🕐 Deployed: $TIMESTAMP"

# Push to GitHub
echo "🚁 Pushing to GitHub..."
git push -u origin dist

echo "✅ Deployment successful!"
echo "🌐 Your build is now live on the dist branch"
echo "📍 Branch URL: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git/\1/')/tree/dist"

# Return to original branch
git checkout "$CURRENT_BRANCH"
echo "🔄 Returned to $CURRENT_BRANCH branch"
```

## Alternative One-liner:
```bash
npm run build && git checkout -B dist && git rm -rf --cached . && git add dist/ && git commit -m "Deploy $(date)" && git push -fu origin dist && git checkout main
```

## Error Handling:
- Validates build output exists
- Checks for uncommitted changes
- Confirms before deploying with local changes
- Automatically returns to original branch
- Provides helpful error messages

## Output Example:
```
🚀 Starting deployment to dist branch...
📍 Current branch: main
🔨 Building production bundle...
✅ Build completed successfully
🌿 Switching to dist branch...
🧹 Cleaning dist branch...
📦 Adding build files...
🚁 Pushing to GitHub...
✅ Deployment successful!
🌐 Your build is now live on the dist branch
🔄 Returned to main branch
```

## Notes:
- Safe: Always returns to original branch
- Fast: Only commits actual changes
- Clean: Removes old build files automatically
- Informative: Shows deployment URL and statistics
- Robust: Handles edge cases and errors gracefully