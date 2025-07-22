#!/bin/bash

# Caffeine Tracker - Test Runner Script
# This script cleans up test database files before running the test suite

set -e  # Exit on any error

echo "🧹 Cleaning up test database files..."

# Remove all test-*.sqlite files in the prisma directory
if ls prisma/test-*.sqlite 1> /dev/null 2>&1; then
    echo "  Removing test-*.sqlite files..."
    rm -f prisma/test-*.sqlite
    echo "  ✅ Removed test-*.sqlite files"
else
    echo "  ℹ️  No test-*.sqlite files found"
fi

# Also remove any test-*.sqlite-journal files specifically
if ls prisma/test-*.sqlite-journal 1> /dev/null 2>&1; then
    echo "  Removing test-*.sqlite-journal files..."
    rm -f prisma/test-*.sqlite-journal
    echo "  ✅ Removed test-*.sqlite-journal files"
else
    echo "  ℹ️  No test-*.sqlite-journal files found"
fi



echo "Creating database..."

DATABASE_URL=file:./test-0.sqlite npx prisma db push --skip-generate 

for i in {1..8}; do
  cp ./prisma/test-0.sqlite "./prisma/test-${i}.sqlite"
done



echo ""
echo "🚀 Running test suite..."
echo ""

# Run the test suite
vitest run

echo ""
echo "✅ Test run completed!" 