#!/bin/bash

# Create a new file or modify existing one
echo "Update" >> file.txt

# Loop through dates
for month in {1..12}; do
  for day in {1..28}; do
    # Skip weekends if you want a more realistic pattern
    # date -v${month}m -v${day}d +%u for Mac
    # date -d "2024-${month}-${day}" +%u for Linux
    
    export GIT_AUTHOR_DATE="2024-${month}-${day} 12:00:00"
    export GIT_COMMITTER_DATE="2024-${month}-${day} 12:00:00"
    
    # Add and commit changes
    git add .
    git commit -m "Update on 2024-${month}-${day}"
  done
done

# Push all commits
git push origin main
