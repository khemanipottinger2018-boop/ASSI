#!/bin/bash

# List of files that need fixing
files=(
  "./components/tutors/common/AvailabilityBadge.tsx"
  "./components/tutors/common/TutorCard.tsx" 
  "./components/tutors/live-chat/ChatRequestModal.tsx"
  "./components/tutors/live-chat/ChatRequestView.tsx"
  "./components/tutors/live-chat/LiveChatClient.tsx"
  "./components/tutors/live-chat/TutorLiveChatClient.tsx"
)

# Fix each file
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing: $file"
    # Remove the extra single quote at the end of tutor.types imports
    sed -i 's/|"'';|/";|/' "$file" 2>/dev/null || sed -i "s/';$/';/" "$file" 2>/dev/null || sed -i 's/\"\x27;/";/' "$file"
  fi
done

# Also check for any other files with the issue
find ./components ./app -name "*.tsx" -o -name "*.ts" -exec grep -l 'tutor\.types.*"'"'" {} \; | while read file; do
  echo "Also fixing: $file"
  perl -i -pe "s/from [\"'].*tutor\.types[\"']\x27;/from \"..\/..\/types\/tutor.types\";/" "$file"
done
