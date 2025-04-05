# Developer Guide for JW Bible Verses Plugin

This document provides information for developers who want to modify, contribute to, or understand the structure of the JW Bible Verses Plugin.

## Project Structure

The plugin has the following main files:

- `main.ts`: The main TypeScript source file with all plugin functionality
- `main.js`: The compiled JavaScript file (compiled from main.ts)
- `manifest.json`: Plugin metadata and configuration
- `package.json`: Node.js project configuration and dependencies
- `tsconfig.json`: TypeScript compiler configuration
- `esbuild.config.mjs`: Build configuration for esbuild

## Code Organization

The main TypeScript file is organized into the following major components:

### 1. BibleService Class

This class handles the core Bible verse functionality:

- `parseReference(reference: string)`: Parses Bible references into standardized format
- `generateUrl(referenceCode: string)`: Generates JW.org URLs for Bible verses
- `fetchVerse(referenceCode: string)`: Fetches verse content from JW.org
- `extractVerseFromHtml(...)`: Extracts verse text from HTML
- `extractVerseRangeFromHtml(...)`: Extracts verse ranges from HTML (new in v1.1.0)
- Book name management functions (getBookNameFromCode, fetchLocalizedBookNames, etc.)

### 2. JWPubPlugin Class

The main plugin class that extends Obsidian's `Plugin` class:

- `onload()`: Sets up commands, event handlers, and ribbons
- `insertBibleVerse(editor, reference)`: Inserts a Bible verse
- `insertBibleVerseAsLink(editor, reference)`: Inserts a verse as a link
- `updateAllVerses(editor)`: Updates all verses in the current note
- `findAndConvertReferences(editor)`: Finds and converts Bible references
- Settings management functions

### 3. UI Classes

- `JWPubSettingTab`: Settings tab UI
- `BibleReferenceModal`: Modal for inserting Bible references
- `ConfirmModal`: Confirmation dialog
- `BibleBookCustomizationModal`: Modal for customizing Bible book names

## Building the Plugin

To build the plugin from source:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the plugin: `npm run build`

For development, you can use:
- `npm run dev` to watch for changes and rebuild automatically

## Verse Range Implementation

The verse range feature (added in v1.1.0) works as follows:

1. The `parseReference` method now detects and extracts the end verse from the range
2. The reference code format was extended to support ranges: `BBCCCVVV-BBCCCVVV` 
   (e.g., "43001001-43001003" for John 1:1-3)
3. The `generateUrl` method formats URLs for ranges by using the hyphen syntax
4. The new `extractVerseRangeFromHtml` method:
   - Loops through each verse in the range
   - Extracts the text for each verse
   - Combines them with verse numbers for readability

## Testing

For testing modifications:

1. Make your changes in `main.ts`
2. Run `npm run build` to compile and bundle
3. Copy the resulting `main.js` and `manifest.json` to your Obsidian test vault
4. Check that your changes work as expected

## Common Customization Points

If you want to enhance the plugin, consider these areas:

1. **Book name recognition**: Add more book names or abbreviations to the `bibleBooks` object
2. **Language support**: Improve handling of different language book names
3. **Verse display format**: Customize how verses are displayed in notes
4. **HTML parsing**: Enhance the verse extraction from HTML
5. **Error handling**: Add more robust error handling for edge cases

## Contributing

To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear comments
4. Test thoroughly
5. Submit a pull request with a detailed description of your changes

## License

This plugin is distributed under the MIT license. 