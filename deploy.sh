#!/bin/bash
# Usage: ./deploy.sh "your commit message"

MESSAGE=${1:-"Update app"}

echo "📦 Committing and pushing to GitHub..."
git add -A
git commit -m "$MESSAGE"
git push

echo "🚀 Publishing OTA update to users..."
eas update --branch production --message "$MESSAGE"

echo "✅ Done!"
