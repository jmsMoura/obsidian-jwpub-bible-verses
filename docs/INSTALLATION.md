# Installation Guide for JW Bible Verses Plugin

This guide provides step-by-step instructions for installing the JW Bible Verses plugin for Obsidian.

## Prerequisites

- [Obsidian](https://obsidian.md/) installed on your device
- A created vault in Obsidian

## Method 1: Manual Installation (Recommended)

1. **Download the Plugin**
   - Download the latest release ZIP file (`jwpub-bible-verses-v1.1.0.zip` or newer) from the [Releases page](https://github.com/jmsMoura/obsidian-jwpub-bible-verses/releases)

2. **Locate Your Plugins Folder**
   - Open Obsidian
   - Open the vault where you want to install the plugin
   - In Obsidian, click on Settings (gear icon in the bottom left)
   - Go to "Community plugins"
   - Click on the folder icon next to "Installed plugins" to open your plugins folder
   
3. **Create Plugin Directory**
   - In the plugins folder, create a new folder named `jwpub-bible-verses`
   
4. **Extract the Plugin Files**
   - Extract the contents of the downloaded ZIP file into the `jwpub-bible-verses` folder
   - The folder should now contain at least two files: `main.js` and `manifest.json`
   
5. **Enable the Plugin**
   - Return to Obsidian
   - In Settings > Community Plugins, click "Reload plugins"
   - Find "JW Bible Verses" in the list of installed plugins
   - Toggle the switch to enable the plugin
   
6. **Verify Installation**
   - Check the ribbon on the left side of Obsidian for the book icon (for inserting verses) and search icon (for converting references)
   - If you see these icons, the installation was successful

## Method 2: Installation via BRAT

If you have the BRAT (Beta Reviewer's Auto-update Tool) plugin installed, you can use it to install and keep the plugin updated.

1. **Install BRAT**
   - If you don't have BRAT installed, install it from Obsidian's Community Plugins marketplace
   - Open Obsidian Settings > Community Plugins
   - Click "Browse" and search for "BRAT"
   - Install and enable the BRAT plugin

2. **Add the JW Bible Verses Plugin via BRAT**
   - Open Obsidian Settings
   - Go to "BRAT" in the left sidebar
   - Click "Add Beta Plugin"
   - Enter the repository URL: `https://github.com/jmsMoura/obsidian-jwpub-bible-verses`
   - Click "Add Plugin"

3. **Enable the Plugin**
   - Go to Settings > Community Plugins
   - Find "JW Bible Verses" in the list
   - Toggle the switch to enable it

## First-Time Setup

After installation, it's recommended to configure the plugin for your language:

1. Open Obsidian Settings
2. Go to "JW Bible Verses" in the left sidebar
3. Set your preferred language code (e.g., "E" for English, "T" for Portuguese)
4. Click "Fetch Book Names" to download book names in your selected language
5. (Optional) Customize other settings to your liking

## Troubleshooting Installation Issues

If you encounter any issues during installation:

- **Plugin Not Appearing**: Make sure the files are in the correct folder structure
- **Plugin Not Working**: Check that both `main.js` and `manifest.json` are in the plugin folder
- **Cannot Enable Plugin**: Try restarting Obsidian
- **Missing Icons**: Check if the plugin is enabled in Settings > Community Plugins

For additional help, refer to the [main documentation](README.md) or contact the developer. 