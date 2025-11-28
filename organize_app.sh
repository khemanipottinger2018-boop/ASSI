#!/bin/bash
echo "🧹 Removing duplicate components structure..."
rm -rf ./app/components/

echo "📚 Organizing tutors folder..."
mkdir -p ./app/tutors/{live-chat,booking,browse,components}

echo "✅ Final structure:"
find ./app -type d | grep -v node_modules | sort

echo "🎉 ORGANIZATION COMPLETE! Structure is now clean and maintainable."
