#!/bin/bash
set -euo pipefail

# check-env.sh
# Checks if the environment is ready for Antigravity Workflows

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking Antigravity Environment..."
echo "-----------------------------------"

check_tool() {
    local cmd=$1
    local name=$2
    local required_msg=$3

    if command -v "$cmd" &> /dev/null; then
        local version=""
        if [[ "$cmd" == "python3" ]]; then
            version=$($cmd --version 2>&1)
        else
            version=$($cmd --version 2>&1 | head -n 1) # Capture first line only
        fi
        echo -e "${GREEN}✅ ${name}:${NC} $version"
        return 0
    else
        echo -e "${RED}❌ ${name}:${NC} Not found ($required_msg)"
        return 1
    fi
}

# Track status
ALL_GOOD=true

# Check Node.js
check_tool "node" "Node.js" "Required for frontend workflows" || ALL_GOOD=false

# Check Python
check_tool "python3" "Python" "Required for testing/scripting" || ALL_GOOD=false

# Check Git
check_tool "git" "Git" "Required" || ALL_GOOD=false

# Check Playwright (Python package)
if pip3 show playwright &> /dev/null; then
    echo -e "${GREEN}✅ Playwright (Python):${NC} Installed"
else
    echo -e "${YELLOW}⚠️  Playwright (Python):${NC} Not found (Install for webapp-testing)"
    # Optional, doesn't fail ALL_GOOD
fi

echo "-----------------------------------"
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}🚀 Good to go! Your environment is ready.${NC}"
else
    echo -e "${YELLOW}⚠️  Some dependencies are missing. Please install them.${NC}"
    exit 1
fi
