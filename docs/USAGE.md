# JW Bible Verses Plugin: Usage Guide

This guide explains how to use the JW Bible Verses plugin effectively in your Obsidian notes.

## Basic Usage

### Inserting a Bible Verse

There are two ways to insert a Bible verse:

1. **Using the Ribbon Icon**:
   - Click on the book icon in the left ribbon sidebar
   - Enter a Bible reference in the format "Book Chapter:Verse" (e.g., "John 3:16")
   - Click "Insert" to add the verse at your cursor position

2. **Using the Command Palette**:
   - Press `Ctrl+P` (or `Cmd+P` on Mac) to open the command palette
   - Search for "JW Bible Verses: Insert Bible Verse"
   - Enter a Bible reference when prompted
   - The verse will be inserted at your cursor position

The inserted verse will include:
- A link to the verse on JW.org
- The full text of the verse
- (Optional) Custom formatting based on your settings

### Converting Existing References

If you already have Bible references in your notes, you can convert them to live verses:

1. **Using the Ribbon Icon**:
   - Click on the search icon in the left ribbon sidebar
   - The plugin will scan your note for Bible references
   - Confirm the conversion when prompted

2. **Using the Command Palette**:
   - Press `Ctrl+P` (or `Cmd+P` on Mac) to open the command palette
   - Search for "JW Bible Verses: Convert Bible References to Live Verses"
   - Confirm the conversion when prompted

## Advanced Usage

### Supported Reference Formats

The plugin recognizes a wide variety of Bible reference formats:

- **Full Book Names**: 
  - "Genesis 1:1", "Revelation 21:3,4"
  
- **Standard Abbreviations**: 
  - "Gen. 1:1", "Rev. 21:3,4"
  
- **Alternate Abbreviations**: 
  - "Ge 1:1", "Re 21:3,4"
  
- **Numbered Books**: 
  - "1 Samuel 1:1", "2 Peter 1:5-7", "1 John 4:8"
  
- **Compressed Numbering**: 
  - "1Sa 1:1", "2Pe 1:5-7", "1Jo 4:8"
  
- **International Book Names**: 
  - "João 3:16" (Portuguese), "Gênesis 1:3" (Portuguese with diacritics)
  
- **References with Ranges**: 
  - "Matthew 5:3-10", "John 3:16,36"

### Working with Multiple Languages

To change the language of the Bible verses:

1. Open Obsidian Settings
2. Go to "JW Bible Verses" settings
3. Change the "Language Code" field
   - English: "E"
   - Spanish: "S"
   - Portuguese: "T"
   - French: "F"
   - And many more (use the language code from JW.org URLs)
4. Click "Fetch Book Names" to update book names for the new language
5. Save settings

### Automatic Updates

The plugin can automatically check for updated verse content:

1. Enable "Auto-update verses" in settings
2. Set your preferred update interval (in days)
3. When you open a note with Bible verses, they will be checked for updates if older than the specified interval

### Customizing Verse Display

You can customize how verses appear in your notes:

1. **Link-only Mode**:
   - Enable "Insert link only" to only insert the reference link without verse content
   
2. **Custom Formatting**:
   - Set "Link Prefix" and "Link Suffix" to add text before/after the reference link
   - Set "Verse Prefix" and "Verse Suffix" to add text before/after the verse content
   - Common prefixes/suffixes: quotation marks, blockquote symbols, etc.

## Tips and Tricks

### Keyboard Shortcuts

Create keyboard shortcuts for faster access:

1. Go to Obsidian Settings > Hotkeys
2. Search for "JW Bible Verses"
3. Assign hotkeys to common commands:
   - "Insert Bible Verse" - e.g., `Ctrl+B` then `V`
   - "Convert Bible References" - e.g., `Ctrl+B` then `C`

### Using with Templates

You can include Bible reference patterns in your templates:

```
## Daily Scripture
[[INSERT SCRIPTURE HERE - e.g., John 3:16]]
```

Later, replace the placeholder with a real reference and use the conversion feature.

### Bible Study Notes

For Bible study notes, try this workflow:

1. Take notes using regular Bible references:
   ```
   Today I studied John 3:16 and Romans 5:8. These verses show God's love...
   ```

2. Run the "Convert Bible References" command to convert all references at once

3. The references will be replaced with full verse content, making your notes more complete:
   ```
   Today I studied [John 3:16](https://www.jw.org/finder?wtlocale=E&bible=43003016)
   
   "For God loved the world so much that he gave his only-begotten Son, so that everyone exercising faith in him might not be destroyed but have everlasting life."
   
   and [Romans 5:8](https://www.jw.org/finder?wtlocale=E&bible=45005008)
   
   "But God recommends his own love to us in that, while we were yet sinners, Christ died for us."
   
   These verses show God's love...
   ```

## Troubleshooting

### Reference Not Converting

If a reference isn't converting:

1. Check the format - it should match standard Bible reference format (Book Chapter:Verse)
2. For languages with diacritics, ensure the book name matches the official JW.org spelling
3. Try using the "Fetch Book Names" button to update book names database

### Verse Content Not Loading

If links work but verse content doesn't load:

1. Check your internet connection
2. Verify the language code is correct
3. Try inserting a common verse (like "John 3:16") to test functionality

### Language-Specific Issues

For non-English languages:
1. Run "Fetch Book Names" after changing the language
2. Test with a well-known verse in that language
3. Try using both full names and abbreviations

## Need More Help?

Refer to the [README](README.md) or [Installation Guide](INSTALLATION.md) for more information. 