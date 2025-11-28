#!/bin/bash

echo "🔧 FIXING ALL TYPE ERRORS..."

# File path
FILE="./components/tutors/live-chat/TutorLiveChatClient.tsx"
MODAL_FILE="./components/tutors/live-chat/ChatRequestModal.tsx"

# 1. Fix import path for tutor.types
echo "1. Fixing tutor.types import..."
sed -i '3s|from.*tutor\.types.*|from "@/types/tutor.types";|' "$FILE"

# 2. Fix TutorCard import (change to named import)
echo "2. Fixing TutorCard import..."
sed -i '8s|import TutorCard from.*|import { TutorCard } from "../common/TutorCard";|' "$FILE"

# 3. Fix NoTutorsAvailable props - add subjectName
echo "3. Fixing NoTutorsAvailable props..."
sed -i '110s|<NoTutorsAvailable />|<NoTutorsAvailable subjectName={subjectName || "this subject"} />|' "$FILE"

# 4. Fix SessionLayout - remove children and make self-closing
echo "4. Fixing SessionLayout..."
# Replace opening tag and remove children content
sed -i '127,129d' "$FILE"  # Delete lines 127-129
# Re-add SessionLayout without children
sed -i '127i\      <SessionLayout sidebar={sidebar} mainContent={mainContent} theme={theme} />' "$FILE"

# 5. Fix ChatRequestModal function signature
echo "5. Fixing ChatRequestModal function..."
# Find and replace the function signature
sed -i 's/const handleRequestConfirm = async (notes: string, urgency: string) => {/const handleRequestConfirm = async (notes?: string) => {/' "$FILE"

# 6. Fix subjectName prop in ChatRequestModal
echo "6. Fixing subjectName prop..."
sed -i 's/subjectName={subjectName}/subjectName={subjectName || ""}/' "$FILE"

# 7. Make subjectName required in ChatRequestModal component
echo "7. Making subjectName required in modal..."
sed -i '9s/subjectName?: string/subjectName: string/' "$MODAL_FILE"

# 8. Remove urgency from the function body (if it exists)
echo "8. Cleaning up urgency parameter..."
sed -i '/urgency/d' "$FILE"

echo "✅ ALL ERRORS SHOULD BE FIXED!"
echo "📝 Run: npm run build"
