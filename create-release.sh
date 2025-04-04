#!/bin/bash

# Get the current version from manifest.json
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)",/\1/')

echo "Current version in manifest.json: $VERSION"
echo "This script will create and push a new tag v$VERSION"
echo "This will trigger the GitHub Action to create a release."
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create a tag
    git tag -a "v$VERSION" -m "Release v$VERSION"
    
    # Push the tag
    git push origin "v$VERSION"
    
    echo "Tag v$VERSION has been created and pushed to GitHub."
    echo "The GitHub Action will now create a release."
    echo "Check the status at: https://github.com/jmsMoura/obsidian-jwpub-bible-verses/actions"
    echo "The release will be available at: https://github.com/jmsMoura/obsidian-jwpub-bible-verses/releases"
else
    echo "Release creation canceled."
fi 