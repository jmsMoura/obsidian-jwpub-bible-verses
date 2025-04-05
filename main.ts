import { App, Plugin, PluginSettingTab, Setting, Notice, MarkdownView, MarkdownFileInfo, Editor, Modal, requestUrl } from 'obsidian';

interface JWPubPluginSettings {
  language: string;
  autoUpdate: boolean;
  updateInterval: number; // in days
  insertLinkOnly: boolean; // Whether to insert only the link without verse content
  linkPrefix: string; // Prefix for the link
  linkSuffix: string; // Suffix for the link
  versePrefix: string; // Prefix for the verse content
  verseSuffix: string; // Suffix for the verse content
  customBookNames: Record<string, string>; // Custom book names mapping - key: book number, value: custom name
  standardAbbreviations: Record<string, string>; // Standard abbreviations for books - key: book number, value: abbreviation
  alternateAbbreviations: Record<string, string>; // Alternate abbreviations for books - key: book number, value: abbreviation
  localizedBookNames: Record<string, Record<string, number>>; // Localized book names by language - key: language, value: mapping of book name to number
  lastLanguageUpdate: Record<string, number>; // Last time book names were updated for a language (timestamp)
}

const DEFAULT_SETTINGS: JWPubPluginSettings = {
  language: 'E', // Default to English
  autoUpdate: true,
  updateInterval: 14, // days
  insertLinkOnly: false, // Default to inserting verses
  linkPrefix: '',
  linkSuffix: '',
  versePrefix: '',
  verseSuffix: '',
  customBookNames: {},
  standardAbbreviations: {},
  alternateAbbreviations: {},
  localizedBookNames: {},
  lastLanguageUpdate: {}
};

// Define the default version of the plugin
export const VERSION = "1.1.8";

// Bible service to handle references and fetching
class BibleService {
  private settings: JWPubPluginSettings;
  
  constructor(settings: JWPubPluginSettings) {
    this.settings = settings;
  }
  
  /**
   * Parse a Bible reference string into a standardized format for JW.org URLs.
   * @param reference The Bible reference (e.g., "John 3:16", "1 Peter 5:7")
   * @returns URL-friendly Bible reference code like "40001001" for Matthews 1:1
   */
  parseReference(reference: string): string | null {
    // Dictionary of book names to their Bible number
    // Include various abbreviations and alternate spellings
    const bibleBooks: Record<string, number> = {
      // Old Testament
      "genesis": 1, "gen": 1, "gn": 1,
      "exodus": 2, "exod": 2, "ex": 2,
      "leviticus": 3, "lev": 3, "lv": 3,
      "numbers": 4, "num": 4, "nm": 4, "nb": 4,
      "deuteronomy": 5, "deut": 5, "dt": 5,
      "joshua": 6, "josh": 6, "jos": 6,
      "judges": 7, "judg": 7, "jdg": 7,
      "ruth": 8, "ru": 8, "rt": 8,
      "1 samuel": 9, "1samuel": 9, "1 sam": 9, "1sam": 9, "1 sa": 9, "1sa": 9,
      "2 samuel": 10, "2samuel": 10, "2 sam": 10, "2sam": 10, "2 sa": 10, "2sa": 10,
      "1 kings": 11, "1kings": 11, "1 kgs": 11, "1kgs": 11, "1 ki": 11, "1ki": 11,
      "2 kings": 12, "2kings": 12, "2 kgs": 12, "2kgs": 12, "2 ki": 12, "2ki": 12,
      "1 chronicles": 13, "1chronicles": 13, "1 chron": 13, "1chron": 13, "1 chr": 13, "1chr": 13,
      "2 chronicles": 14, "2chronicles": 14, "2 chron": 14, "2chron": 14, "2 chr": 14, "2chr": 14,
      "ezra": 15, "ezr": 15, "ez": 15,
      "nehemiah": 16, "neh": 16, "ne": 16,
      "esther": 17, "est": 17, "es": 17,
      "job": 18, "jb": 18,
      "psalms": 19, "psalm": 19, "ps": 19, "psa": 19, "psm": 19,
      "proverbs": 20, "prov": 20, "pr": 20, "prv": 20,
      "ecclesiastes": 21, "eccl": 21, "ec": 21, "qoh": 21,
      "song of solomon": 22, "song of songs": 22, "song": 22, "songs": 22, 
      "song of sol": 22, "sos": 22, "ss": 22, "canticle of canticles": 22,
      "isaiah": 23, "isa": 23, "is": 23,
      "jeremiah": 24, "jer": 24, "je": 24,
      "lamentations": 25, "lam": 25, "la": 25,
      "ezekiel": 26, "ezek": 26, "eze": 26, "ezk": 26,
      "daniel": 27, "dan": 27, "da": 27, "dn": 27,
      "hosea": 28, "hos": 28, "ho": 28,
      "joel": 29, "jl": 29,
      "amos": 30, "am": 30,
      "obadiah": 31, "obad": 31, "ob": 31,
      "jonah": 32, "jon": 32, "jnh": 32,
      "micah": 33, "mic": 33, "mi": 33,
      "nahum": 34, "nah": 34, "na": 34,
      "habakkuk": 35, "hab": 35, "hb": 35,
      "zephaniah": 36, "zeph": 36, "zep": 36, "zp": 36,
      "haggai": 37, "hag": 37, "hg": 37,
      "zechariah": 38, "zech": 38, "zec": 38, "zc": 38,
      "malachi": 39, "mal": 39, "ml": 39,
      
      // New Testament
      "matthew": 40, "matthews": 40, "matt": 40, "mat": 40, "mt": 40,
      "mark": 41, "mrk": 41, "mk": 41, "mr": 41,
      "luke": 42, "luk": 42, "lk": 42, "lu": 42,
      "john": 43, "joh": 43, "jhn": 43, "jn": 43,
      "acts": 44, "act": 44, "ac": 44, "acts of the apostles": 44,
      "romans": 45, "rom": 45, "ro": 45, "rm": 45,
      "1 corinthians": 46, "1corinthians": 46, "1 cor": 46, "1cor": 46, "1 co": 46, "1co": 46,
      "2 corinthians": 47, "2corinthians": 47, "2 cor": 47, "2cor": 47, "2 co": 47, "2co": 47,
      "galatians": 48, "gal": 48, "ga": 48,
      "ephesians": 49, "eph": 49, "ep": 49,
      "philippians": 50, "phil": 50, "php": 50, "pp": 50,
      "colossians": 51, "col": 51, "co": 51,
      "1 thessalonians": 52, "1thessalonians": 52, "1 thess": 52, "1thess": 52, "1 thes": 52, "1thes": 52, "1 th": 52, "1th": 52,
      "2 thessalonians": 53, "2thessalonians": 53, "2 thess": 53, "2thess": 53, "2 thes": 53, "2thes": 53, "2 th": 53, "2th": 53,
      "1 timothy": 54, "1timothy": 54, "1 tim": 54, "1tim": 54, "1 ti": 54, "1ti": 54,
      "2 timothy": 55, "2timothy": 55, "2 tim": 55, "2tim": 55, "2 ti": 55, "2ti": 55,
      "titus": 56, "tit": 56, "ti": 56,
      "philemon": 57, "philem": 57, "phm": 57, "pm": 57,
      "hebrews": 58, "heb": 58, "he": 58,
      "james": 59, "jas": 59, "jm": 59, "ja": 59,
      "1 peter": 60, "1peter": 60, "1 pet": 60, "1pet": 60, "1 pe": 60, "1pe": 60, "1 pt": 60, "1pt": 60,
      "2 peter": 61, "2peter": 61, "2 pet": 61, "2pet": 61, "2 pe": 61, "2pe": 61, "2 pt": 61, "2pt": 61,
      "1 john": 62, "1john": 62, "1 jn": 62, "1jn": 62, "1 jo": 62, "1jo": 62,
      "2 john": 63, "2john": 63, "2 jn": 63, "2jn": 63, "2 jo": 63, "2jo": 63,
      "3 john": 64, "3john": 64, "3 jn": 64, "3jn": 64, "3 jo": 64, "3jo": 64,
      "jude": 65, "jud": 65, "jd": 65,
      "revelation": 66, "rev": 66, "re": 66, "rv": 66, "apocalypse": 66
    };
    
    // Create ordered sources of book names with priorities
    // 1. Custom book names (highest priority)
    // 2. Original full book names from JW.org
    // 3. Localized book names for the current language
    // 4. Standard abbreviations
    // 5. Alternate abbreviations
    
    const bookNameSources: Record<string, number>[] = [
      {}, // Custom book names - will be filled if available
      {}, // Full book names - will be filled if available
      {}, // Localized book names - will be filled if available
      {}, // Standard abbreviations - will be filled if available
      {}  // Alternate abbreviations - will be filled if available
    ];
    
    // Add custom book names (highest priority)
    if (this.settings.customBookNames) {
      for (let i = 1; i <= 66; i++) {
        const bookCode = i.toString().padStart(2, '0');
        if (this.settings.customBookNames[bookCode]) {
          const customName = this.settings.customBookNames[bookCode].toLowerCase();
          bookNameSources[0][customName] = i;
        }
      }
    }
    
    // Add original full book names from JW.org
    for (let i = 1; i <= 66; i++) {
      const fullName = this.getOriginalFullName(i);
      if (fullName) {
        bookNameSources[1][fullName.toLowerCase()] = i;
      }
    }
    
    // Add localized book names for the current language
    if (this.settings.localizedBookNames && this.settings.localizedBookNames[this.settings.language]) {
      Object.entries(this.settings.localizedBookNames[this.settings.language]).forEach(([name, number]) => {
        bookNameSources[2][name.toLowerCase()] = number;
      });
    }
    
    // Add standard abbreviations
    if (this.settings.standardAbbreviations) {
      for (let i = 1; i <= 66; i++) {
        const bookCode = i.toString().padStart(2, '0');
        if (this.settings.standardAbbreviations[bookCode]) {
          const stdAbbrev = this.settings.standardAbbreviations[bookCode].toLowerCase();
          bookNameSources[3][stdAbbrev] = i;
        }
      }
    }
    
    // Add alternate abbreviations
    if (this.settings.alternateAbbreviations) {
      for (let i = 1; i <= 66; i++) {
        const bookCode = i.toString().padStart(2, '0');
        if (this.settings.alternateAbbreviations[bookCode]) {
          const altAbbrev = this.settings.alternateAbbreviations[bookCode].toLowerCase();
          bookNameSources[4][altAbbrev] = i;
        }
      }
    }
    
    // Combine all sources with the default Bible books
    const combinedBooks = {...bibleBooks};
    
    // First, normalize the input by removing any periods after book abbreviations
    // and making it lowercase for case-insensitive matching
    const normalizedReference = reference.replace(/\./g, '').toLowerCase().trim();
    
    console.log(`Parsing reference: "${normalizedReference}"`);
    
    // Step 1: Try to identify and extract the book name
    let bookName = '';
    let bookNumber = 0;
    let remainingText = '';
    
    // First try all prioritized sources in order
    for (const source of bookNameSources) {
      // Sort book names by length (descending) to match longest first
      // This ensures "1 john" matches before just "john"
      const sortedBookNames = Object.keys(source).sort((a, b) => b.length - a.length);
      
      for (const name of sortedBookNames) {
        if (normalizedReference.startsWith(name) && 
           (normalizedReference.length === name.length || 
            !(/[a-z]/).test(normalizedReference.charAt(name.length)))) { // Make sure it's a full word match
          bookName = name;
          bookNumber = source[name];
          remainingText = normalizedReference.substring(name.length).trim();
          break;
        }
      }
      
      // If we found a match, break out of the sources loop
      if (bookName && bookNumber) {
        break;
      }
    }
    
    // If no match found in prioritized sources, fall back to the default list
    if (!bookName || !bookNumber) {
      // Sort book names by length (descending) to match longest first
      const sortedBookNames = Object.keys(combinedBooks).sort((a, b) => b.length - a.length);
      
      for (const name of sortedBookNames) {
        if (normalizedReference.startsWith(name) && 
           (normalizedReference.length === name.length || 
            !(/[a-z]/).test(normalizedReference.charAt(name.length)))) { // Make sure it's a full word match
          bookName = name;
          bookNumber = combinedBooks[name];
          remainingText = normalizedReference.substring(name.length).trim();
          break;
        }
      }
    }
    
    if (!bookName || !bookNumber) {
      console.log(`Could not identify book name in: "${normalizedReference}"`);
      return null;
    }
    
    console.log(`Identified book: "${bookName}" (${bookNumber}), remaining text: "${remainingText}"`);
    
    // Step 2: Extract chapter and verse
    // Matches patterns like "1:2", "1:2-3", "1:2,3", etc.
    const chapterVerseRegex = /^(\d+):(\d+)(?:[-,](\d+))?/;
    const chapterVerseMatch = remainingText.match(chapterVerseRegex);
    
    if (!chapterVerseMatch) {
      console.log(`Could not extract chapter and verse from: "${remainingText}"`);
      return null;
    }
    
    const chapter = chapterVerseMatch[1];
    const verse = chapterVerseMatch[2];
    const endVerse = chapterVerseMatch[3]; // Extract end verse if it exists
    
    console.log(`Extracted chapter: ${chapter}, verse: ${verse}${endVerse ? `, end verse: ${endVerse}` : ''}`);
    
    // Format: BBCCCVVV (book, chapter, verse) - e.g., 40001001 for Matthew 1:1
    const paddedBookNumber = bookNumber.toString().padStart(2, '0');
    const paddedChapter = chapter.padStart(3, '0');
    const paddedVerse = verse.padStart(3, '0');
    
    const finalCode = `${paddedBookNumber}${paddedChapter}${paddedVerse}`;
    console.log(`Generated reference code: ${finalCode}`);
    
    // If we have an end verse, include it in the code
    if (endVerse) {
      const paddedEndVerse = endVerse.padStart(3, '0');
      return `${finalCode}-${paddedBookNumber}${paddedChapter}${paddedEndVerse}`;
    }
    
    return finalCode;
  }
  
  /**
   * Generate a JW.org URL for a Bible reference
   * @param referenceCode The Bible reference code (e.g., "40001001" for Matthew 1:1)
   * @returns Full JW.org URL to fetch the Bible verse
   */
  generateUrl(referenceCode: string): string {
    // Check if the reference code contains a range (indicated by a hyphen)
    const isRange = referenceCode.includes('-');
    
    if (isRange) {
      // Split the range into start and end codes
      const [startCode, endCode] = referenceCode.split('-');
      
      // Extract book number from the start code
      const bookNumber = parseInt(startCode.substring(0, 2));
      
      // For books 1-9, remove the leading zero in the URL
      const urlStartCode = bookNumber <= 9 
        ? `${bookNumber}${startCode.substring(2)}` 
        : startCode;
      
      const urlEndCode = bookNumber <= 9 
        ? `${bookNumber}${endCode.substring(2)}` 
        : endCode;
      
      return `https://www.jw.org/finder?wtlocale=${this.settings.language}&bible=${urlStartCode}-${urlEndCode}`;
    } else {
      // Extract book number to check if it's one of the first 9 books
      const bookNumber = parseInt(referenceCode.substring(0, 2));
      
      // For books 1-9, remove the leading zero in the URL
      const urlReferenceCode = bookNumber <= 9 
        ? `${bookNumber}${referenceCode.substring(2)}` 
        : referenceCode;
        
      return `https://www.jw.org/finder?wtlocale=${this.settings.language}&bible=${urlReferenceCode}`;
    }
  }
  
  /**
   * Fetch the Bible verse text from JW.org
   * @param referenceCode Bible reference code
   * @returns The verse text or null if not found
   */
  async fetchVerse(referenceCode: string): Promise<{text: string, reference: string} | null> {
    try {
      // Check if this is a range reference
      const isRange = referenceCode.includes('-');
      let bookNumber, chapter, verse, endVerse, book, formattedReference;
      
      if (isRange) {
        // Split the range into start and end codes
        const [startCode, endCode] = referenceCode.split('-');
        
        // Extract details from the start code
        bookNumber = parseInt(startCode.substring(0, 2));
        chapter = parseInt(startCode.substring(2, 5)).toString();
        verse = parseInt(startCode.substring(5, 8)).toString();
        
        // Extract the end verse from the end code
        endVerse = parseInt(endCode.substring(5, 8)).toString();
        
        book = this.getBookNameFromCode(bookNumber.toString().padStart(2, '0'));
        formattedReference = `${book} ${chapter}:${verse}-${endVerse}`;
        
        console.log(`Fetching verse range: ${formattedReference} with code ${referenceCode}`);
      } else {
        // Extract the book, chapter, and verse from the reference code
        bookNumber = parseInt(referenceCode.substring(0, 2));
        chapter = parseInt(referenceCode.substring(2, 5)).toString();
        verse = parseInt(referenceCode.substring(5, 8)).toString();
        book = this.getBookNameFromCode(bookNumber.toString().padStart(2, '0'));
        formattedReference = `${book} ${chapter}:${verse}`;
        
        console.log(`Fetching verse: ${formattedReference} with code ${referenceCode}`);
      }
      
      // First try the finder URL for the specific verse or verse range
      const finderUrl = this.generateUrl(referenceCode);
      console.log(`Using URL: ${finderUrl}`);
      
      try {
        const response = await requestUrl({
          url: finderUrl,
          method: 'GET',
          headers: {
            'Accept': 'text/html',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        // Check if we were redirected - we can't rely on response.url in Obsidian's requestUrl
        const originalUrl = finderUrl;
        const redirectedPattern = response.text.includes("Found. Redirecting to");
        if (redirectedPattern) {
          console.log(`Response contains redirect information`);
        }
        
        const html = response.text;
        console.log(`Received HTML response, length: ${html.length}`);
        
        // Always follow redirects if they exist - this is important for both OT and NT verses
        let redirectUrl = null;
        const redirectMatch = html.match(/Found\.\s*Redirecting to\s*(https:\/\/[^"'\s]+)/i);
        if (redirectMatch && redirectMatch[1]) {
          redirectUrl = redirectMatch[1];
          console.log(`Detected redirect to: ${redirectUrl}`);
          
          try {
            const redirectResponse = await requestUrl({
              url: redirectUrl,
              method: 'GET',
              headers: {
                'Accept': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            
            // Use the redirected HTML for further processing
            const redirectHtml = redirectResponse.text;
            console.log(`Received redirected HTML, length: ${redirectHtml.length}`);
            
            if (isRange && endVerse) {
              return this.extractVerseRangeFromHtml(redirectHtml, referenceCode, formattedReference, bookNumber, verse, endVerse);
            } else {
              return this.extractVerseFromHtml(redirectHtml, referenceCode, formattedReference, bookNumber, verse);
            }
            
          } catch (error) {
            console.error(`Error following redirect: ${error}`);
            // Continue with original HTML if redirect fails
          }
        }
        
        // If we didn't follow a redirect or redirect request failed, use the original HTML
        if (isRange && endVerse) {
          return this.extractVerseRangeFromHtml(html, referenceCode, formattedReference, bookNumber, verse, endVerse);
        } else {
          return this.extractVerseFromHtml(html, referenceCode, formattedReference, bookNumber, verse);
        }
        
      } catch (error) {
        console.error(`Error accessing URL: ${error}`);
        return {
          text: "Error fetching verse. Please check your connection and try again.",
          reference: formattedReference
        };
      }
    } catch (error) {
      console.error(`Error in fetchVerse: ${error}`);
      return null;
    }
  }
  
  /**
   * Extract a range of verses from HTML content
   * @param html HTML content to extract verses from
   * @param referenceCode Bible reference code
   * @param formattedReference Formatted reference string
   * @param bookNumber Bible book number
   * @param startVerse Starting verse number
   * @param endVerse Ending verse number
   * @returns Extracted verses or error message
   */
  private extractVerseRangeFromHtml(
    html: string, 
    referenceCode: string, 
    formattedReference: string,
    bookNumber: number,
    startVerse: string,
    endVerse: string
  ): {text: string, reference: string} {
    try {
      console.log(`Extracting verse range: ${formattedReference} (${startVerse}-${endVerse})`);
      
      // Extract the chapter from the reference code
      const chapter = referenceCode.split('-')[0].substring(2, 5);
      
      // Create an array to store all verse texts
      const verses: string[] = [];
      
      // Check if this is a single verse range (e.g., Psalms 23:1-1)
      const isSingleVerse = startVerse === endVerse;
      
      // Check if this is a Psalms/Salmos verse - needs special handling
      const isPsalmsVerse = bookNumber === 19;
      
      // Method 1: Attempt to extract each verse individually using the verse ID pattern
      for (let verseNum = parseInt(startVerse); verseNum <= parseInt(endVerse); verseNum++) {
        // Create the reference code for this individual verse
        const paddedVerse = verseNum.toString().padStart(3, '0');
        const verseReferenceCode = `${referenceCode.split('-')[0].substring(0, 5)}${paddedVerse}`;
        
        // Create the HTML verse ID
        const htmlVerseId = `v${verseReferenceCode}`;
        
        console.log(`Looking for verse ID: ${htmlVerseId}`);
        
        // Find where this verse starts in the HTML
        const verseStartPattern = new RegExp(`<span class="verse" id="${htmlVerseId}">`);
        const verseStartMatch = html.match(verseStartPattern);
        
        if (verseStartMatch && verseStartMatch.index !== undefined) {
          // Look for the next verse tag or the end of chapter marker
          const nextVersePattern = /<span class="verse" id="v[0-9]+"|<div class="chapterContent/;
          const remainingHtml = html.substring(verseStartMatch.index + verseStartMatch[0].length);
          const nextVerseMatch = remainingHtml.match(nextVersePattern);
          
          let verseHtml;
          if (nextVerseMatch && nextVerseMatch.index !== undefined) {
            // Extract everything between this verse start and the next verse or chapter end
            verseHtml = remainingHtml.substring(0, nextVerseMatch.index);
          } else {
            // If no next verse found, take all remaining HTML after the verse start
            verseHtml = remainingHtml;
          }
          
          // Clean the HTML to get only the text content
          let cleanedText = isPsalmsVerse ? 
            this.cleanPsalmsText(verseHtml) : 
            this.cleanHtmlFragment(verseHtml);
          
          if (cleanedText.trim()) {
            // Only include verse numbers if it's not a single verse and we have multiple verses to add
            if (isSingleVerse || parseInt(startVerse) === parseInt(endVerse)) {
              // For single verse, just remove any verse number that might be there
              verses.push(cleanedText.trim().replace(/^\d+\s+/, ''));
            } else {
              // For multiple verses, add the verse number with backticks
              // First check if the text already starts with this verse number
              const verseNumPattern = new RegExp(`^${verseNum}\\s+`);
              if (verseNumPattern.test(cleanedText.trim())) {
                // Replace existing number with backtick-wrapped version
                verses.push(cleanedText.trim().replace(
                  new RegExp(`^${verseNum}\\s+`), 
                  `\`${verseNum}\` `
                ));
              } else {
                // Add the verse number with backticks since it's not already there
                verses.push(`\`${verseNum}\` ${cleanedText.trim()}`);
              }
            }
            
            console.log(`Found verse ${verseNum}: ${cleanedText.substring(0, 50)}...`);
          }
        } else {
          console.log(`Could not find verse ID ${htmlVerseId} in HTML`);
          
          // Try extracting this verse using the single verse extraction method
          const singleVerseResult = this.extractVerseFromHtml(
            html, 
            verseReferenceCode, 
            `${formattedReference.split(':')[0]}:${verseNum}`, 
            bookNumber, 
            verseNum.toString()
          );
          
          if (singleVerseResult && !singleVerseResult.text.includes("Could not extract verse content")) {
            let extractedText = singleVerseResult.text;
            
            // Only include verse numbers if it's a multiple verse range
            if (isSingleVerse || parseInt(startVerse) === parseInt(endVerse)) {
              // For single verse, remove any verse number that might be there
              verses.push(extractedText.replace(/^\d+\s+/, ''));
            } else {
              // For multiple verses, add the verse number with backticks
              // First check if the text already starts with this verse number
              const verseNumPattern = new RegExp(`^${verseNum}\\s+`);
              if (verseNumPattern.test(extractedText)) {
                // Replace existing number with backtick-wrapped version
                verses.push(extractedText.replace(
                  new RegExp(`^${verseNum}\\s+`), 
                  `\`${verseNum}\` `
                ));
              } else {
                // Add the verse number with backticks since it's not already there
                verses.push(`\`${verseNum}\` ${extractedText}`);
              }
            }
            
            console.log(`Found verse ${verseNum} using single verse extraction`);
          }
        }
      }
      
      // If we still couldn't extract any verses, try another method
      if (verses.length === 0) {
        console.log("Trying alternative method for extracting verse range");
        
        // Method 2: Look for the chapter content and extract all verses from it
        const chapterContentPattern = /<article[^>]*?class="[^"]*?bibleCitation[^"]*?"[^>]*?>([\s\S]*?)<\/article>/i;
        const chapterMatch = html.match(chapterContentPattern);
        
        if (chapterMatch && chapterMatch[1]) {
          const chapterHtml = chapterMatch[1];
          
          // Extract each verse by looking for verse spans
          for (let verseNum = parseInt(startVerse); verseNum <= parseInt(endVerse); verseNum++) {
            const paddedVerse = verseNum.toString().padStart(3, '0');
            const verseReferenceCode = `${referenceCode.split('-')[0].substring(0, 5)}${paddedVerse}`;
            const htmlVerseId = `v${verseReferenceCode}`;
            
            const versePattern = new RegExp(`<span[^>]*?class="verse"[^>]*?id="${htmlVerseId}"[^>]*?>(.*?)<\/span>\\s*(?:<span class="verse"|<\/div>)`, 's');
            const verseMatch = chapterHtml.match(versePattern);
            
            if (verseMatch && verseMatch[1]) {
              const verseText = isPsalmsVerse ? 
                this.cleanPsalmsText(verseMatch[1]) : 
                this.cleanHtmlFragment(verseMatch[1]);
              
              if (verseText.trim()) {
                // Only include verse numbers if it's a multiple verse range
                if (isSingleVerse || parseInt(startVerse) === parseInt(endVerse)) {
                  // For single verse, remove any verse number that might be there
                  verses.push(verseText.trim().replace(/^\d+\s+/, ''));
                } else {
                  // For multiple verses, add the verse number with backticks
                  // First check if the text already starts with this verse number
                  const verseNumPattern = new RegExp(`^${verseNum}\\s+`);
                  if (verseNumPattern.test(verseText.trim())) {
                    // Replace existing number with backtick-wrapped version
                    verses.push(verseText.trim().replace(
                      new RegExp(`^${verseNum}\\s+`), 
                      `\`${verseNum}\` `
                    ));
                  } else {
                    // Add the verse number with backticks since it's not already there
                    verses.push(`\`${verseNum}\` ${verseText.trim()}`);
                  }
                }
                
                console.log(`Found verse ${verseNum} in chapter content`);
              }
            }
          }
        }
      }
      
      // Combine all verses with proper spacing
      let combinedText = verses.join(" ");
      
      // Fix any missing spaces (ensure space between sentences)
      combinedText = combinedText
        .replace(/([.,:;!?])([A-ZÀ-ÚÄ-Ü])/g, '$1 $2') // Add space between punctuation and capital letter
        .replace(/([a-záàâãéèêíïóôõöúçñ])([A-ZÀ-ÚÄ-Ü])/g, '$1 $2'); // Add space between lowercase and uppercase letter
      
      // If the text is still empty, return an error
      if (!combinedText) {
        console.error(`Could not extract verse range ${startVerse}-${endVerse}`);
        return {
          text: `Could not extract verse range ${startVerse}-${endVerse}`,
          reference: formattedReference
        };
      }
      
      return {
        text: combinedText,
        reference: formattedReference
      };
    } catch (error) {
      console.error(`Error extracting verse range:`, error);
      return {
        text: `Error extracting verse range: ${error}`,
        reference: formattedReference
      };
    }
  }
  
  /**
   * Extract verse text from HTML content
   * @param html HTML content to extract verse from
   * @param referenceCode Bible reference code
   * @param formattedReference Formatted reference string
   * @param bookNumber Bible book number
   * @param verse Verse number
   * @returns Extracted verse or error message
   */
  private extractVerseFromHtml(
    html: string, 
    referenceCode: string, 
    formattedReference: string,
    bookNumber: number,
    verse: string
  ): {text: string, reference: string} {
    // Determine if this is a Hebrew Scripture (Old Testament) or Greek Scripture (New Testament)
    // Old Testament books have book numbers 1-39, New Testament is 40-66
    const isHebrewScripture = bookNumber >= 1 && bookNumber <= 39;
    const isGreekScripture = bookNumber >= 40 && bookNumber <= 66;
    
    // Special case for first verse in a chapter (e.g., Matthew 1:1, Genesis 1:1)
    const isFirstVerseInChapter = verse === '1';
    
    // Create a reference code for the HTML verse tag ID
    // For John 1:1, the ID in the HTML is "v43001001"
    const chapter = referenceCode.substring(2, 5);
    const htmlVerseId = `v${referenceCode}`;
    
    console.log(`Extracting verse with HTML ID: ${htmlVerseId}, IsHebrewScripture: ${isHebrewScripture}`);
    
    let extractedText = "";
    
    // Strategy 1: Handle verse with paragraph break
    if (!extractedText) {
      console.log('Strategy 1: Checking for paragraph breaks');
      
      try {
        // This pattern specifically looks for verses with paragraph breaks
        const mainVersePattern = new RegExp(`<span class="verse" id="${htmlVerseId}">([\\s\\S]*?)(?:</span>\\s*<span class="parabreak">|</span>\\s*</span>)`, 's');
        const mainVerseMatch = html.match(mainVersePattern);
        
        if (mainVerseMatch && mainVerseMatch[1]) {
          // We need to extract all text parts from style spans
          const textParts = [];
          const styleRegex = /<span class="style-[a-z]">([^<]+)<\/span>/g;
          let styleMatch;
          
          // Extract text from all style-* spans
          while ((styleMatch = styleRegex.exec(mainVerseMatch[1])) !== null) {
            if (styleMatch[1]) {
              textParts.push(styleMatch[1]);
            }
          }
          
          // If we didn't find any style spans, just use the full content
          if (textParts.length === 0) {
            const cleanedText = this.cleanHtmlFragment(mainVerseMatch[1]);
            if (cleanedText.trim()) {
              textParts.push(cleanedText.trim());
            }
          }
          
          // Join all text parts with spaces
          extractedText = textParts.join(" ");
          console.log(`Parabreak handling found: ${extractedText.substring(0, 50)}...`);
          
          // SPECIAL FIX FOR JOHN 1:1-3
          // Check if this is John/João chapter 1 verses 1 or 2
          if (bookNumber === 43 && chapter === '001' && (verse === '1' || verse === '2')) {
            // Check if the text contains the problematic phrase "What has come into existence" or "O que veio a existir"
            const englishPhraseIndex = extractedText.indexOf("What has come into existence");
            const portuguesePhraseIndex = extractedText.indexOf("O que veio a existir");
            
            if (englishPhraseIndex !== -1) {
              // Remove everything from this phrase onward (it belongs to verse 3)
              extractedText = extractedText.substring(0, englishPhraseIndex).trim();
              console.log(`Fixed John 1:${verse} by removing verse 3 content (English)`);
            } else if (portuguesePhraseIndex !== -1) {
              // Remove everything from this phrase onward (it belongs to verse 3)
              extractedText = extractedText.substring(0, portuguesePhraseIndex).trim();
              console.log(`Fixed João 1:${verse} by removing verse 3 content (Portuguese)`);
            }
          }
        }
      } catch (e) {
        console.error("Error in paragraph break handling:", e);
      }
    }
    
    // Strategy 2: Special handling for Hebrew Scripture (Old Testament) first verses
    if (!extractedText && isFirstVerseInChapter && isHebrewScripture) {
      console.log('Strategy 2: Hebrew Scripture first verse specific handling');
      
      try {
        // Different patterns for Hebrew Scripture first verses
        const hebrewFirstVersePatterns = [
          // Pattern 1: Most common Hebrew Scripture first verse pattern
          new RegExp(`<span class="verse" id="${htmlVerseId}"><span class="style-b"><span class="chapterNum"><a[^>]*?>[^<]*?</a></span>([^<]+)`, 's'),
          
          // Pattern 2: Alternative pattern with whitespace variations
          new RegExp(`<span class="verse" id="${htmlVerseId}">\\s*<span class="style-b">\\s*<span class="chapterNum">.*?</span>\\s*([^<]+)`, 's'),
          
          // Pattern 3: Broader pattern that captures more context
          new RegExp(`<span class="verse" id="${htmlVerseId}"><span class="style-b"><span class="chapterNum">.*?</span>([\\s\\S]*?)(?:<a class|</span>)`, 's')
        ];
        
        // Try each pattern in order until we find a match
        for (const pattern of hebrewFirstVersePatterns) {
          if (extractedText) break;
          
          const match = html.match(pattern);
          if (match && match[1]) {
            extractedText = this.cleanHtmlFragment(match[1]);
            console.log(`Hebrew Scripture first verse pattern matched: ${extractedText.substring(0, 50)}...`);
            break;
          }
        }
        
        // If none of the patterns worked, try a more direct approach
        if (!extractedText) {
          const chapterNumIndex = html.indexOf(`id="${htmlVerseId}"`);
          if (chapterNumIndex > 0) {
            const verseSpanStart = html.substring(chapterNumIndex - 100, chapterNumIndex + 400);
            const chapterEndIndex = verseSpanStart.indexOf('</span>', verseSpanStart.indexOf('<span class="chapterNum">'));
            
            if (chapterEndIndex > 0) {
              const afterChapterNum = verseSpanStart.substring(chapterEndIndex + 7, chapterEndIndex + 200);
              const endOfVerse = afterChapterNum.indexOf('<');
              
              if (endOfVerse > 0) {
                const verseText = afterChapterNum.substring(0, endOfVerse).trim();
                if (verseText) {
                  extractedText = verseText;
                  console.log(`Extracted text after chapter number: ${extractedText}`);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error in Hebrew Scripture first verse handling:", e);
      }
    }
    
    // Strategy 3: Match verse span element with all child content
    if (!extractedText) {
      console.log('Strategy 3: Matching verse span element with all child content');
      
      // Try to find the verse span and its content
      const verseRegex = new RegExp(`<span[^>]*?class="verse"[^>]*?id="${htmlVerseId}"[^>]*?>([\\s\\S]*?)(?:<\\/span>(?:<span class="parabreak"><\\/span>)?<\\/span>|<\\/span>\\s*<span class="verse")`, 's');
      const match = html.match(verseRegex);
      
      if (match && match[1]) {
        const verseContent = match[1];
        const textFragments = [];
        
        // Try to extract style spans first - this often gives better results
        const styleSpanRegex = /<span class="style-[^"]*?">(.*?)<\/span>/gs;
        let styleMatch;
        let foundStyleSpans = false;
        
        while ((styleMatch = styleSpanRegex.exec(verseContent)) !== null) {
          foundStyleSpans = true;
          if (styleMatch[1]) {
            const cleanedText = this.cleanHtmlFragment(styleMatch[1]);
            if (cleanedText.trim()) {
              textFragments.push(cleanedText.trim());
            }
          }
        }
        
        if (foundStyleSpans) {
          console.log(`Found ${textFragments.length} style spans within verse`);
          extractedText = textFragments.join(" ");
        } else {
          // If no style spans were found, use the entire content
          extractedText = this.cleanHtmlFragment(verseContent);
        }
        
        console.log(`Extracted text: ${extractedText.substring(0, 50)}...`);
      }
    }
    
    // Strategy 4: Special handling for first verse in chapter
    if (!extractedText && isFirstVerseInChapter) {
      console.log('Strategy 4: First verse in chapter special handling');
      
      try {
        const firstVerseRegex = new RegExp(`<span class="verse" id="${htmlVerseId}">([\\s\\S]*?)<\\/span>(?:\\s*<span class="parabreak")|<\\/span>`, 's');
        const firstVerseMatch = html.match(firstVerseRegex);
        
        if (firstVerseMatch && firstVerseMatch[1]) {
          const styleSpanRegex = /<span class="style-[^"]*?">(.*?)<\/span>/gs;
          let styleMatch;
          const textParts = [];
          
          while ((styleMatch = styleSpanRegex.exec(firstVerseMatch[1])) !== null) {
            if (styleMatch[1]) {
              const cleanedText = this.cleanHtmlFragment(styleMatch[1]);
              if (cleanedText.trim()) {
                textParts.push(cleanedText.trim());
              }
            }
          }
          
          if (textParts.length > 0) {
            extractedText = textParts.join(" ");
            console.log(`First verse with style spans: ${extractedText.substring(0, 50)}...`);
          } else {
            extractedText = this.cleanHtmlFragment(firstVerseMatch[1]);
            console.log(`First verse full content: ${extractedText.substring(0, 50)}...`);
          }
        }
      } catch (e) {
        console.error(`Error in first verse special handling: ${e}`);
      }
    }
    
    // Strategy 5: Use a simpler pattern as a fallback
    if (!extractedText) {
      console.log('Strategy 5: Simple pattern fallback');
      
      try {
        const simpleVerseRegex = new RegExp(`<span class="verse" id="${htmlVerseId}">(.*?)</span>`, 's');
        const simpleMatch = html.match(simpleVerseRegex);
        
        if (simpleMatch && simpleMatch[1]) {
          extractedText = this.cleanHtmlFragment(simpleMatch[1]);
          console.log(`Simple pattern match: ${extractedText.substring(0, 50)}...`);
        }
      } catch (e) {
        console.error(`Error in simple pattern fallback: ${e}`);
      }
    }
    
    // If all strategies failed, return an error message
    if (!extractedText) {
      console.log('Could not extract verse with any strategy');
      return {
        text: `Could not extract verse content. Please click the link to view on jw.org.`,
        reference: formattedReference
      };
    }
    
    return {
      text: extractedText,
      reference: formattedReference
    };
  }
  
  /**
   * Clean HTML fragment and ensure proper spacing
   */
  private cleanHtmlFragment(html: string): string {
    // First, remove all HTML tags
    let plainText = html
      .replace(/<a[^>]*?class="[^"]*?\b(?:xref|footnote)\b[^"]*?"[^>]*?>([^<]*?)<\/a>/g, '') // Remove cross-references and footnotes
      .replace(/<a[^>]*?id="[^"]*?_crossreference[^"]*?"[^>]*?>.*?<\/a>/g, '') // Remove cross-reference elements
      .replace(/<a[^>]*?id="[^"]*?_footnote[^"]*?"[^>]*?>.*?<\/a>/g, '') // Remove footnote elements
      .replace(/<sup[^>]*?class="[^"]*?footnote[^"]*?"[^>]*?>.*?<\/sup>/g, '') // Remove footnote superscripts
      .replace(/<span class="lineBreak"><br><\/span>/g, ' ') // Replace line break spans with space
      .replace(/<[^>]+>/g, ' ') // Replace all HTML tags with spaces
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
      
      // Fix missing spaces between sentences
      .replace(/([.,:;!?])([A-ZÀ-ÚÄ-Ü])/g, '$1 $2') // Add space between punctuation and capital letter
      .replace(/([a-záàâãéèêíïóôõöúçñ])([A-ZÀ-ÚÄ-Ü])/g, '$1 $2') // Add space between lowercase and uppercase letter
      
      // Remove footnote markers and special characters
      .replace(/[†‡§¶*]/g, '') // Remove specific footnote symbols
      .replace(/\s([a-z])\s/g, ' ') // Remove isolated single lowercase letters (likely footnotes)
      .replace(/\s([a-z])(?=[.,;:!?])/g, '') // Remove single letters before punctuation
      .replace(/\s+[eE]\s+/g, ' ') // Remove 'e' footnote markers
      .replace(/\+/g, '') // Remove '+' symbols completely
      .replace(/\-(?!\w)/g, '') // Remove '-' symbols that aren't part of words or numbers
      .replace(/(?<!\w)\-/g, '') // Remove '-' symbols that aren't part of words or numbers
      .replace(/E(?=\s|$)/g, '') // Remove 'E' at end of words or standalone
      .replace(/\s+/g, ' ') // Clean up multiple spaces again after all replacements
      .trim();
    
    return plainText;
  }
  
  /**
   * Clean HTML fragments from Psalms/poetry text
   * Special handling for poetic content with line breaks
   */
  private cleanPsalmsText(html: string): string {
    // Remove footnote and cross-reference links/markers
    let cleanedText = html
      .replace(/<a[^>]*?class="[^"]*?\b(?:xref|footnote)\b[^"]*?"[^>]*?>([^<]*?)<\/a>/g, '') // Remove cross-references and footnotes
      .replace(/<a[^>]*?id="[^"]*?_crossreference[^"]*?"[^>]*?>.*?<\/a>/g, '') // Remove cross-reference elements
      .replace(/<a[^>]*?id="[^"]*?_footnote[^"]*?"[^>]*?>.*?<\/a>/g, '') // Remove footnote elements
      .replace(/<sup[^>]*?class="[^"]*?footnote[^"]*?"[^>]*?>.*?<\/sup>/g, '') // Remove footnote superscripts
      
      // Convert line break spans to spaces to maintain poetry formatting
      .replace(/<span class="lineBreak"><br><\/span>/g, ' ')
      
      // Remove other HTML tags
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      
      // Fix spaces between sentences
      .replace(/([.,:;!?])([A-ZÀ-ÚÄ-Ü])/g, '$1 $2') // Add space between punctuation and capital letter
      .replace(/([a-záàâãéèêíïóôõöúçñ])([A-ZÀ-ÚÄ-Ü])/g, '$1 $2') // Add space between lowercase and uppercase letter
      
      // Remove footnote markers and clean up special characters
      .replace(/[†‡§¶*]/g, '') // Remove specific footnote symbols
      .replace(/\s([a-z])\s/g, ' ') // Remove isolated single lowercase letters (likely footnotes)
      .replace(/\s([a-z])(?=[.,;:!?])/g, '') // Remove single letters before punctuation
      .replace(/\s+[eE]\s+/g, ' ') // Remove 'e' footnote markers
      .replace(/\+/g, '') // Remove '+' symbols
      .replace(/\-(?!\w)/g, '') // Remove standalone hyphens
      .replace(/(?<!\w)\-/g, '')
      .replace(/E(?=\s|$)/g, '') // Remove E at end of words or standalone
      .replace(/\s+/g, ' ') // Clean up spaces
      .trim();
      
    return cleanedText;
  }
  
  /**
   * Get the book name from a book code
   * @param bookCode Two-digit book code
   * @returns Book name or "Unknown Book"
   */
  getBookNameFromCode(bookCode: string): string {
    const bookNumber = parseInt(bookCode);
    
    // First check if there's a custom name defined for this book number
    if (this.settings.customBookNames && this.settings.customBookNames[bookCode]) {
      return this.settings.customBookNames[bookCode];
    }
    
    // Otherwise use the standard book names
    const books = [
      "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
      "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
      "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", 
      "Ezra", "Nehemiah", "Esther", "Job", "Psalms", 
      "Proverbs", "Ecclesiastes", "Song of Solomon", 
      "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
      "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
      "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
      "Malachi", "Matthew", "Mark", "Luke", "John",
      "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians",
      "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
      "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
      "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John",
      "3 John", "Jude", "Revelation"
    ];
    
    return bookNumber > 0 && bookNumber <= books.length ? books[bookNumber - 1] : "Unknown Book";
  }

  /**
   * Fetch Bible book names and abbreviations from JW.org in the specified language
   * This uses multiple strategies to extract data from different parts of the JW.org Bible interface
   * @param language Language code (e.g., 'E' for English, 'T' for Portuguese)
   * @returns A mapping of book names to book numbers
   */
  async fetchLocalizedBookNames(language: string): Promise<Record<string, number>> {
    try {
      console.log(`Fetching localized book names for language: ${language}`);
      
      // Use the main Bible display page - this has the full book list with names and abbreviations
      const mainUrl = `https://www.jw.org/finder?wtlocale=${language}&pub=nwtsty`;
      console.log(`Fetching main Bible URL: ${mainUrl}`);
      
      const response = await requestUrl({
        url: mainUrl,
        method: 'GET',
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = response.text;
      
      // Store book names (key: name, value: book number)
      const bookNames: Record<string, number> = {};
      
      // For looking up later
      const bookNumberToName: Record<number, string> = {};
      
      // Store abbreviations
      const standardAbbrevs: Record<number, string> = {};
      const alternateAbbrevs: Record<number, string> = {};
      
      // Store the original capitalization for fullNames, longAbbrNames, and abbrNames
      const originalFullNames: Record<number, string> = {};
      const originalLongAbbrs: Record<number, string> = {};
      const originalShortAbbrs: Record<number, string> = {};
      
      // Look for the Bible book elements with the specific structure shown in the example
      // Each book has a structure like:
      // <a class="bibleBook ..." data-book="1">
      //    ...
      //    <span class="fullName">Genesis</span>
      //    <span class="longAbbrName" aria-hidden="true">Gen.</span>
      //    <span class="abbrName" aria-hidden="true">Ge</span>
      // </a>
      
      console.log("Looking for Bible books with fullName, longAbbrName and abbrName spans");
      
      // First, try to find book elements with the bibleBook class and data-book attribute
      const bookElementPattern = /<a[^>]*?class=[^>]*?bibleBook[^>]*?data-book=['"]([\d]+)['"]\s*[^>]*?>[\s\S]*?<span[^>]*?class=['"]\s*fullName\s*['"]\s*[^>]*?>([^<]+)<\/span>[\s\S]*?<span[^>]*?class=['"]\s*longAbbrName\s*['"]\s*[^>]*?>([^<]+)<\/span>[\s\S]*?<span[^>]*?class=['"]\s*abbrName\s*['"]\s*[^>]*?>([^<]+)<\/span>/gi;
      
      let match;
      let booksFound = 0;
      
      while ((match = bookElementPattern.exec(html)) !== null) {
        const bookNumber = parseInt(match[1]);
        const fullName = match[2].trim();
        const longAbbr = match[3].trim();
        const shortAbbr = match[4].trim();
        
        if (bookNumber > 0 && bookNumber <= 66) {
          booksFound++;
          console.log(`Found book #${bookNumber}: ${fullName} (Long abbr: ${longAbbr}, Short abbr: ${shortAbbr})`);
          
          // Store the original capitalization
          originalFullNames[bookNumber] = fullName;
          originalLongAbbrs[bookNumber] = longAbbr;
          originalShortAbbrs[bookNumber] = shortAbbr;
          
          // Store full name (normalized for lookups, but we'll use the original capitalization later)
          const normalizedName = fullName.toLowerCase();
          bookNames[normalizedName] = bookNumber;
          bookNumberToName[bookNumber] = fullName;
          
          // Store the standard abbreviation (with period)
          standardAbbrevs[bookNumber] = longAbbr;
          const normalizedLongAbbr = longAbbr.toLowerCase();
          if (!bookNames[normalizedLongAbbr]) {
            bookNames[normalizedLongAbbr] = bookNumber;
          }
          
          // Store the alternate abbreviation (short form)
          alternateAbbrevs[bookNumber] = shortAbbr;
          const normalizedShortAbbr = shortAbbr.toLowerCase();
          if (!bookNames[normalizedShortAbbr]) {
            bookNames[normalizedShortAbbr] = bookNumber;
          }
          
          // Create additional common abbreviations based on the book name
          this.addBookAbbreviations(bookNames, normalizedName, bookNumber);
        }
      }
      
      console.log(`Found ${booksFound} books using main pattern.`);
      
      // If we didn't find books using the main pattern, try alternate approaches
      if (booksFound < 40) {
        console.log("Trying alternate pattern for finding Bible books");
        
        // Try a more flexible pattern to find book elements
        const altPattern = /<div[^>]*?data-pid=['"]([\d]+)['"]\s*[^>]*?>\s*<div[^>]*?>\s*([^<]+)<\/div>/gi;
        
        while ((match = altPattern.exec(html)) !== null) {
          const bookId = match[1];
          const bookName = match[2].trim();
          
          // Convert the ID to a Bible book number if needed
          const bookNumber = this.getBookNumberFromHtmlId(bookId);
          
          if (bookNumber > 0 && bookNumber <= 66) {
            console.log(`Found book with alternate pattern: ${bookName} (${bookNumber})`);
            
            // Store the original capitalization
            originalFullNames[bookNumber] = bookName;
            
            // Store normalized name for lookups
            const normalizedName = bookName.toLowerCase();
            bookNames[normalizedName] = bookNumber;
            bookNumberToName[bookNumber] = bookName;
            
            // Generate abbreviations since we don't have them directly
            if (!standardAbbrevs[bookNumber]) {
              const stdAbbrev = this.generateStandardAbbreviation(bookName);
              standardAbbrevs[bookNumber] = stdAbbrev;
              originalLongAbbrs[bookNumber] = stdAbbrev;
              
              const normalizedStdAbbrev = stdAbbrev.toLowerCase();
              if (!bookNames[normalizedStdAbbrev]) {
                bookNames[normalizedStdAbbrev] = bookNumber;
              }
            }
            
            if (!alternateAbbrevs[bookNumber]) {
              const altAbbrev = this.generateAlternateAbbreviation(bookName);
              alternateAbbrevs[bookNumber] = altAbbrev;
              originalShortAbbrs[bookNumber] = altAbbrev;
              
              const normalizedAltAbbrev = altAbbrev.toLowerCase();
              if (!bookNames[normalizedAltAbbrev]) {
                bookNames[normalizedAltAbbrev] = bookNumber;
              }
            }
            
            // Add more abbreviations
            this.addBookAbbreviations(bookNames, normalizedName, bookNumber);
          }
        }
      }
      
      // For books where we still don't have standard or alternate abbreviations,
      // generate them from the full names
      for (let i = 1; i <= 66; i++) {
        if (bookNumberToName[i]) {
          const fullName = bookNumberToName[i];
          
          // Generate standard abbreviation if not found
          if (!standardAbbrevs[i]) {
            let stdAbbrev = this.generateStandardAbbreviation(fullName);
            standardAbbrevs[i] = stdAbbrev;
            originalLongAbbrs[i] = stdAbbrev;
            console.log(`Generated standard abbreviation for book ${i}: ${stdAbbrev}`);
          }
          
          // Generate alternate abbreviation if not found
          if (!alternateAbbrevs[i]) {
            let altAbbrev = this.generateAlternateAbbreviation(fullName);
            alternateAbbrevs[i] = altAbbrev;
            originalShortAbbrs[i] = altAbbrev;
            console.log(`Generated alternate abbreviation for book ${i}: ${altAbbrev}`);
          }
        }
      }
      
      // Store the abbreviations in the class instance for later use
      this.standardAbbreviations = standardAbbrevs;
      this.alternateAbbreviations = alternateAbbrevs;
      
      // Store the original capitalization data
      this.originalFullNames = originalFullNames;
      this.originalLongAbbrs = originalLongAbbrs;
      this.originalShortAbbrs = originalShortAbbrs;
      
      console.log(`Successfully fetched ${Object.keys(bookNames).length} book names and ${Object.keys(standardAbbrevs).length} abbreviations`);
      
      return bookNames;
    } catch (error) {
      console.error(`Error fetching localized book names: ${error}`);
      return {};
    }
  }
  
  /**
   * Store standard abbreviations for books
   */
  private standardAbbreviations: Record<number, string> = {};
  
  /**
   * Store alternate abbreviations for books
   */
  private alternateAbbreviations: Record<number, string> = {};
  
  /**
   * Store original capitalization of full names from JW.org
   */
  private originalFullNames: Record<number, string> = {};
  
  /**
   * Store original capitalization of long abbreviations from JW.org
   */
  private originalLongAbbrs: Record<number, string> = {};
  
  /**
   * Store original capitalization of short abbreviations from JW.org
   */
  private originalShortAbbrs: Record<number, string> = {};
  
  /**
   * Get original full name (with proper capitalization) for a book by number
   */
  getOriginalFullName(bookNumber: number): string | undefined {
    return this.originalFullNames[bookNumber];
  }
  
  /**
   * Get original long abbreviation (with proper capitalization) for a book by number
   */
  getOriginalLongAbbr(bookNumber: number): string | undefined {
    return this.originalLongAbbrs[bookNumber];
  }
  
  /**
   * Get original short abbreviation (with proper capitalization) for a book by number
   */
  getOriginalShortAbbr(bookNumber: number): string | undefined {
    return this.originalShortAbbrs[bookNumber];
  }
  
  /**
   * Get book number from HTML ID in JW.org Bible interface
   */
  private getBookNumberFromHtmlId(htmlId: string): number {
    const id = parseInt(htmlId);
    
    // In some JW.org HTML, the book IDs are:
    // 1-39: Hebrew Scriptures (Old Testament) with direct mapping
    // 40-66: Christian Greek Scriptures (New Testament) with +27 offset
    if (id >= 1 && id <= 39) {
      return id;
    } else if (id >= 40 && id <= 66) {
      return id;
    } else if (id >= 200 && id <= 226) {
      // In some pages, New Testament books are numbered 200-226
      return id - 200 + 40;
    }
    
    return 0;
  }
  
  /**
   * Generate a standard abbreviation (with period) for a book name
   */
  private generateStandardAbbreviation(bookName: string): string {
    // Handle numbered books separately (1, 2, 3 prefixes)
    const numericPrefixMatch = bookName.match(/^(\d+)\s+(.+)$/);
    
    if (numericPrefixMatch) {
      const prefix = numericPrefixMatch[1];
      const baseName = numericPrefixMatch[2];
      
      // For numbered books, use number + first 2-3 letters + period
      return `${prefix} ${baseName.substring(0, Math.min(3, baseName.length))}.`;
    }
    
    // For regular books, use first 3-4 letters + period
    return `${bookName.substring(0, Math.min(3, bookName.length))}.`;
  }
  
  /**
   * Generate an alternate abbreviation (without period) for a book name
   */
  private generateAlternateAbbreviation(bookName: string): string {
    // Handle numbered books separately (1, 2, 3 prefixes)
    const numericPrefixMatch = bookName.match(/^(\d+)\s+(.+)$/);
    
    if (numericPrefixMatch) {
      const prefix = numericPrefixMatch[1];
      const baseName = numericPrefixMatch[2];
      
      // For numbered books, use number + first 2 letters
      return `${prefix}${baseName.substring(0, Math.min(2, baseName.length))}`;
    }
    
    // For regular books, use first 2 letters
    return bookName.substring(0, Math.min(2, bookName.length));
  }
  
  /**
   * Generate common abbreviations for a book name and add them to the book names mapping
   * @param bookNames The book names mapping to add abbreviations to
   * @param fullName The full book name
   * @param bookNumber The book number
   */
  private addBookAbbreviations(bookNames: Record<string, number>, fullName: string, bookNumber: number): void {
    try {
      // Handle numeric prefixes (1, 2, 3) separately
      const numericPrefixMatch = fullName.match(/^(\d+)\s+(.+)$/);
      let prefix = '';
      let baseName = fullName;
      
      if (numericPrefixMatch) {
        prefix = numericPrefixMatch[1];
        baseName = numericPrefixMatch[2];
        
        // Add variations with the number both with and without space
        bookNames[`${prefix}${baseName}`] = bookNumber; // "1john"
      }
      
      // Add short abbreviations (first 3 letters)
      const shortAbbrev = prefix ? `${prefix} ${baseName.substring(0, 3)}` : baseName.substring(0, 3);
      bookNames[shortAbbrev] = bookNumber;
      
      if (prefix) {
        bookNames[`${prefix}${baseName.substring(0, 3)}`] = bookNumber; // "1joh"
      }
      
      // Add very short abbreviations (first 2 letters) for longer names
      if (baseName.length > 3) {
        const veryShortAbbrev = prefix ? `${prefix} ${baseName.substring(0, 2)}` : baseName.substring(0, 2);
        bookNames[veryShortAbbrev] = bookNumber;
        
        if (prefix) {
          bookNames[`${prefix}${baseName.substring(0, 2)}`] = bookNumber; // "1jo"
        }
      }
    } catch (error) {
      console.error(`Error creating abbreviations for "${fullName}": ${error}`);
    }
  }
  
  /**
   * Get the standard abbreviation for a book by number
   */
  getStandardAbbreviation(bookNumber: number): string | undefined {
    return this.standardAbbreviations[bookNumber];
  }
  
  /**
   * Get the alternate abbreviation for a book by number
   */
  getAlternateAbbreviation(bookNumber: number): string | undefined {
    return this.alternateAbbreviations[bookNumber];
  }
}

export default class JWPubPlugin extends Plugin {
  settings: JWPubPluginSettings = DEFAULT_SETTINGS;
  bibleService!: BibleService; // Use definite assignment assertion
  settingsTab!: JWPubSettingTab; // Use definite assignment assertion

  async onload() {
    await this.loadSettings();
    this.bibleService = new BibleService(this.settings);

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.settingsTab = new JWPubSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    
    // Auto-fetch English Bible book names if this is the first time loading the plugin
    // or if we don't have book names for the current language
    const language = this.settings.language;
    const hasBookNames = this.settings.localizedBookNames && 
                        this.settings.localizedBookNames[language] &&
                        Object.keys(this.settings.localizedBookNames[language]).length > 0;
                        
    if (!hasBookNames) {
      // Run in the background to not block plugin loading
      this.fetchAndSetupBookNames(language).catch(error => {
        console.error(`Error auto-fetching book names: ${error}`);
      });
    }

    // Register the command to insert a Bible verse
    this.addCommand({
      id: 'insert-bible-verse',
      name: 'Insert Bible Verse',
      editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
        if (ctx instanceof MarkdownView) {
          new BibleReferenceModal(this.app, this, editor).open();
        }
      }
    });

    // Register the command to update all Bible verses in the current note
    this.addCommand({
      id: 'update-bible-verses',
      name: 'Update All Bible Verses',
      editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
        this.updateAllVerses(editor);
      }
    });
    
    // Register the command to find and convert Bible references in the current note
    this.addCommand({
      id: 'convert-bible-references',
      name: 'Convert Bible References to Live Verses',
      editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
        this.findAndConvertReferences(editor);
      }
    });

    // This adds a ribbon icon for quick access
    const ribbonIconEl = this.addRibbonIcon('book', 'Insert Bible Verse', (evt: MouseEvent) => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) {
        new BibleReferenceModal(this.app, this, view.editor).open();
      } else {
        new Notice('Open a markdown file first');
      }
    });
    
    // Add a second ribbon icon for finding and converting Bible references
    this.addRibbonIcon('search', 'Find and Convert Bible References', (evt: MouseEvent) => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) {
        this.findAndConvertReferences(view.editor);
      } else {
        new Notice('Open a markdown file first');
      }
    });
    
    // Set up auto-update if enabled
    if (this.settings.autoUpdate) {
      this.registerEvent(
        this.app.workspace.on('file-open', () => {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (view) {
            this.updateAllVerses(view.editor);
          }
        })
      );
    }
  }
  
  /**
   * Helper method to fetch and setup Bible book names for a language
   * This is used for auto-fetching on first load and when changing languages
   */
  async fetchAndSetupBookNames(language: string): Promise<void> {
    console.log(`Auto-fetching Bible book names for language: ${language}`);
    
    try {
      // Fetch book names from JW.org
      const bookNames = await this.bibleService.fetchLocalizedBookNames(language);
      const bookCount = Object.keys(bookNames).length;
      
      if (bookCount > 0) {
        // Set up localized book names in settings if not already initialized
        if (!this.settings.localizedBookNames) {
          this.settings.localizedBookNames = {};
        }
        
        this.settings.localizedBookNames[language] = bookNames;
        this.settings.lastLanguageUpdate[language] = Date.now();
        
        // Update the book names and abbreviations with proper capitalization
        for (let i = 1; i <= 66; i++) {
          const bookCode = i.toString().padStart(2, '0');
          
          // Get original names with proper capitalization
          const fullName = this.bibleService.getOriginalFullName(i);
          const stdAbbrev = this.bibleService.getOriginalLongAbbr(i);
          const altAbbrev = this.bibleService.getOriginalShortAbbr(i);
          
          // Only update if we have valid data
          if (fullName) {
            this.settings.customBookNames[bookCode] = fullName;
          }
          
          if (stdAbbrev) {
            this.settings.standardAbbreviations[bookCode] = stdAbbrev;
          }
          
          if (altAbbrev) {
            this.settings.alternateAbbreviations[bookCode] = altAbbrev;
          }
        }
        
        await this.saveSettings();
        console.log(`Auto-fetched ${bookCount} Bible book names for language: ${language}`);
      } else {
        console.warn(`Could not auto-fetch Bible book names for language: ${language}`);
      }
    } catch (error) {
      console.error(`Error auto-fetching Bible book names: ${error}`);
    }
  }

  onunload() {
    // Clean up any resources
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Update the Bible service with the new settings
    this.bibleService = new BibleService(this.settings);
  }

  /**
   * Insert a Bible verse at the current cursor position
   */
  async insertBibleVerse(editor: Editor, reference: string) {
    try {
      const referenceCode = this.bibleService.parseReference(reference);
      
      if (!referenceCode) {
        new Notice(`Invalid Bible reference: ${reference}`);
        return;
      }
      
      new Notice(`Fetching verse: ${reference}...`);
      
      // Generate URL for the Bible reference regardless of content fetching success
      const url = this.bibleService.generateUrl(referenceCode);
      
      // Attempt to fetch the verse content
      const verse = await this.bibleService.fetchVerse(referenceCode);
      
      let verseText = "";
      let formattedReference = reference; // Default to what the user entered
      
      if (verse) {
        // Use the verse content if successfully fetched
        verseText = verse.text;
        formattedReference = verse.reference;
      } else {
        // If fetching failed, still create the link but with a message in Obsidian comment format
        verseText = "%% Could not fetch verse content. Click the link to view on jw.org. %%";
        new Notice(`Could not fetch verse: ${reference}. Creating link only.`);
      }
      
      // Create a special format that can be parsed later for updates - without the timestamp
      // Format: > [Bible Verse: Reference](URL) Text
      const verseBlock = `> [Bible: ${formattedReference}](${url})\n> ${verseText}\n\n`;
      
      // First try to insert at cursor position
      try {
        // Important: Always save the cursor position BEFORE making any changes
        const cursor = editor.getCursor();
        console.log(`Before insertion - Cursor position: Line ${cursor.line}, Ch ${cursor.ch}`);
        
        // Check if we have a valid cursor
        if (cursor && cursor.line >= 0) {
          // Insert at the current cursor position
          editor.replaceSelection(verseBlock);
          
          // Calculate the new cursor position
          const insertedLines = verseBlock.split('\n').length - 1;
          const newPosition = {
            line: cursor.line + insertedLines,
            ch: 0
          };
          
          // Move the cursor to after the inserted content
          editor.setCursor(newPosition);
          
          console.log(`After insertion - Set cursor to: Line ${newPosition.line}, Ch ${newPosition.ch}`);
        } else {
          // Fallback: Insert at the end of the document
          console.log("No valid cursor position, inserting at end of document");
          this.insertVerseAtEnd(editor, verseBlock);
        }
      } catch (error) {
        // Fallback: If cursor insertion fails, insert at the end of the document
        console.error("Error inserting at cursor position:", error);
        this.insertVerseAtEnd(editor, verseBlock);
      }
      
      new Notice(`Inserted: ${formattedReference}`);
    } catch (error: any) {
      console.error("Error inserting Bible verse:", error);
      new Notice(`Error inserting Bible verse: ${error.message || String(error)}`);
    }
  }

  /**
   * Insert a Bible verse as a link with verse content below
   */
  async insertBibleVerseAsLink(editor: Editor, reference: string) {
    try {
      const referenceCode = this.bibleService.parseReference(reference);
      
      if (!referenceCode) {
        new Notice(`Invalid Bible reference: ${reference}`);
        return;
      }
      
      new Notice(`Fetching verse: ${reference}...`);
      
      // Generate URL for the Bible reference regardless of content fetching success
      const url = this.bibleService.generateUrl(referenceCode);
      
      // Attempt to fetch the verse content
      const verse = await this.bibleService.fetchVerse(referenceCode);
      
      let verseText = "";
      let formattedReference = reference; // Default to what the user entered
      
      if (verse) {
        // Use the verse content if successfully fetched
        verseText = verse.text;
        formattedReference = verse.reference;
      } else {
        // If fetching failed, still create the link but with a message in Obsidian comment format
        verseText = "%% Could not fetch verse content. Click the link to view on jw.org. %%";
        new Notice(`Could not fetch verse: ${reference}. Creating link only.`);
      }
      
      let verseBlock = '';
      
      // Create the link with custom prefix/suffix
      const linkPart = `${this.settings.linkPrefix}[${formattedReference}](${url})${this.settings.linkSuffix}`;
      
      // If set to insert link only, don't include the verse content
      if (this.settings.insertLinkOnly) {
        verseBlock = `${linkPart}\n\n`;
      } else {
        // Otherwise include the verse content with its custom prefix/suffix
        verseBlock = verseText.includes('%%') 
          ? `${linkPart}\n\n${verseText}\n\n`
          : `${linkPart}\n\n${this.settings.versePrefix}${verseText}${this.settings.verseSuffix}\n\n`;
      }
      
      // First try to insert at cursor position
      try {
        // Important: Always save the cursor position BEFORE making any changes
        const cursor = editor.getCursor();
        console.log(`Before insertion - Cursor position: Line ${cursor.line}, Ch ${cursor.ch}`);
        
        // Check if we have a valid cursor
        if (cursor && cursor.line >= 0) {
          // Insert at the current cursor position
          editor.replaceSelection(verseBlock);
          
          // Calculate the new cursor position
          const insertedLines = verseBlock.split('\n').length - 1;
          const newPosition = {
            line: cursor.line + insertedLines,
            ch: 0
          };
          
          // Move the cursor to after the inserted content
          editor.setCursor(newPosition);
          
          console.log(`After insertion - Set cursor to: Line ${newPosition.line}, Ch ${newPosition.ch}`);
        } else {
          // Fallback: Insert at the end of the document
          console.log("No valid cursor position, inserting at end of document");
          this.insertVerseAtEnd(editor, verseBlock);
        }
      } catch (error) {
        // Fallback: If cursor insertion fails, insert at the end of the document
        console.error("Error inserting at cursor position:", error);
        this.insertVerseAtEnd(editor, verseBlock);
      }
      
      new Notice(`Inserted: ${formattedReference}`);
    } catch (error: any) {
      console.error("Error inserting Bible verse:", error);
      new Notice(`Error inserting Bible verse: ${error.message || String(error)}`);
    }
  }
  
  /**
   * Helper method to insert verse text at the end of the document
   */
  private insertVerseAtEnd(editor: Editor, verseBlock: string) {
    try {
      // Get the current document length
      const docLength = editor.lineCount();
      
      // Go to the end of the document
      const endPosition = {
        line: docLength,
        ch: 0
      };
      
      // Insert the verse block at the end
      editor.replaceRange(verseBlock, endPosition);
      
      // Move the cursor to after the inserted content
      const newPosition = {
        line: docLength + verseBlock.split('\n').length - 1,
        ch: 0
      };
      
      editor.setCursor(newPosition);
      console.log(`Inserted at end - Set cursor to: Line ${newPosition.line}, Ch ${newPosition.ch}`);
    } catch (error) {
      console.error("Error inserting at end of document:", error);
    }
  }

  /**
   * Update all Bible verses in the current note
   */
  async updateAllVerses(editor: Editor) {
    const content = editor.getValue();
    let updatedCount = 0;
    let failedCount = 0;
    let content2 = content;
    
    // First check for blockquote format - updated to also match entries without timestamp
    const blockquoteRegex = /> \[Bible: (.*?)\]\((https:\/\/www\.jw\.org\/finder\?wtlocale=.*?&bible=.*?)\)\n> (.*?)(?:\n> \*Last updated: (.*?)\*)?/g;
    
    // Find all blockquote format verses
    const blockquoteMatches = [];
    let match;
    while ((match = blockquoteRegex.exec(content)) !== null) {
      blockquoteMatches.push({
        fullMatch: match[0],
        reference: match[1],
        url: match[2],
        text: match[3],
        lastUpdated: match[4], // This may be undefined if there's no timestamp
        index: match.index,
        length: match[0].length,
        format: 'blockquote'
      });
    }
    
    // Next check for link format - updated to also match entries without timestamp
    const linkRegex = /\[(.*?)\]\((https:\/\/www\.jw\.org\/finder\?wtlocale=.*?&bible=.*?)\)\s*\n\s*(?:"(.*?)"|([^*\n]+))(?:\s*\n\s*\*Last updated: (.*?)\*)?/g;
    
    // Find all link format verses
    const linkMatches = [];
    while ((match = linkRegex.exec(content)) !== null) {
      linkMatches.push({
        fullMatch: match[0],
        reference: match[1],
        url: match[2],
        text: match[3] || match[4], // Either quoted text or unquoted text
        lastUpdated: match[5], // This may be undefined
        index: match.index,
        length: match[0].length,
        format: 'link'
      });
    }
    
    // Combine and sort all matches
    const allMatches = [...blockquoteMatches, ...linkMatches];
    allMatches.sort((a, b) => b.index - a.index);
    
    // Process in reverse order to avoid index shifting
    for (const match of allMatches) {
      // Extract the Bible reference code from the URL
      const urlRegex = /bible=(\d+)/;
      const urlMatch = match.url.match(urlRegex);
      
      if (!urlMatch) continue;
      
      const referenceCode = urlMatch[1];
      
      // If there's no timestamp or it's too old, update the verse
      let shouldUpdate = true;
      if (match.lastUpdated) {
        const lastUpdatedDate = new Date(match.lastUpdated);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdatedDate.getTime()) / (1000 * 3600 * 24);
        shouldUpdate = daysSinceUpdate >= this.settings.updateInterval;
      }
      
      if (!shouldUpdate) {
        continue;
      }
      
      // Fetch the updated verse
      const verse = await this.bibleService.fetchVerse(referenceCode);
      
      // Generate the URL with the correct format for book numbers
      const url = this.bibleService.generateUrl(referenceCode);
      let updatedVerseBlock;
      
      // Default to the original reference and text if we can't fetch new content
      let referenceText = match.reference;
      let verseText = match.text;
      
      if (verse) {
        // Update with new content if fetched successfully
        referenceText = verse.reference;
        verseText = verse.text;
        updatedCount++;
      } else {
        // Keep the old verse text if we can't fetch new content
        failedCount++;
      }
      
      // Create the link with custom prefix/suffix
      const linkPart = `${this.settings.linkPrefix}[${referenceText}](${url})${this.settings.linkSuffix}`;
      
      // For verses found in blockquote format, maintain that format
      if (match.format === 'blockquote') {
        updatedVerseBlock = `> [Bible: ${referenceText}](${url})\n> ${verseText}`;
      } else {
        // For verses in link format, use the current settings for insertLinkOnly
        if (this.settings.insertLinkOnly) {
          updatedVerseBlock = `${linkPart}`;
        } else {
          // Otherwise include the verse content with its custom prefix/suffix
          updatedVerseBlock = verseText.includes('%%') 
            ? `${linkPart}\n\n${verseText}`
            : `${linkPart}\n\n${this.settings.versePrefix}${verseText}${this.settings.verseSuffix}`;
        }
      }
      
      // Replace the old verse block with the updated one
      content2 = content2.substring(0, match.index) + updatedVerseBlock + content2.substring(match.index + match.length);
    }
    
    if (updatedCount > 0 || failedCount > 0) {
      editor.setValue(content2);
      let message = `Updated ${updatedCount + failedCount} Bible verses.`;
      if (failedCount > 0) {
        message += ` (${failedCount} couldn't fetch new content)`;
      }
      new Notice(message);
    }
  }

  /**
   * Find all Bible references in the text and convert them to live verses
   */
  async findAndConvertReferences(editor: Editor) {
    // Get the current document content
    const content = editor.getValue();
    
    // First, identify already converted "live" verses to avoid duplicates
    // Match both formats: blockquote style and link style
    const liveVerseRegex = /(\> \[Bible: .*?\]\(https:\/\/www\.jw\.org\/finder\?.*?\)|(\[.*?\]\(https:\/\/www\.jw\.org\/finder\?.*?\))(?:\s*\n\s*(?:\".*?\"|(?:[^*\n]+))))/g;
    const liveVerses: {start: number, end: number}[] = [];
    
    let liveMatch: RegExpExecArray | null;
    while ((liveMatch = liveVerseRegex.exec(content)) !== null) {
      liveVerses.push({
        start: liveMatch.index,
        end: liveMatch.index + liveMatch[0].length
      });
    }
    
    console.log(`Found ${liveVerses.length} already converted live verses to avoid duplicating.`);
    
    // Regular expression to find Bible references in text
    // This matches common Bible reference formats like:
    // - Matthew 1:1
    // - 1 John 2:3-4
    // - Gen. 1:1
    // - Revelation 21:3,4
    // - 1Sa 1:1 (without space between number and abbreviation)
    // - João 3:16 (with diacritics)
    // - Gênesis 1:3 (with diacritics)
    // Updated to handle diacritics and a wider range of formats
    const referenceRegex = /\b((?:\d\s*)?[\p{L}]+\.?)\s+(\d+):(\d+)(?:[-,]\d+)?\b/gu;
    
    // Find all matches
    const references: { text: string, index: number, length: number }[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = referenceRegex.exec(content)) !== null) {
      // Check if this reference is part of an already converted verse
      const isAlreadyConverted = liveVerses.some(liveVerse => 
        match !== null && match.index >= liveVerse.start && (match.index + match[0].length) <= liveVerse.end
      );
      
      if (!isAlreadyConverted) {
        references.push({
          text: match[0],
          index: match.index,
          length: match[0].length
        });
      }
    }
    
    if (references.length === 0) {
      new Notice('No new Bible references found to convert');
      return;
    }
    
    // Ask user if they want to convert all references
    const modal = new ConfirmModal(
      this.app,
      `Found ${references.length} new Bible references. Convert them to live verses?`,
      async (confirmed) => {
        if (confirmed) {
          await this.convertReferences(editor, references);
        }
      }
    );
    
    modal.open();
  }
  
  /**
   * Convert Bible references to live verses
   */
  async convertReferences(editor: Editor, references: { text: string, index: number, length: number }[]) {
    // Process references in reverse order to maintain indices
    references.sort((a, b) => b.index - a.index);
    
    let content = editor.getValue();
    let successCount = 0;
    let failCount = 0;
    let partialCount = 0; // Count for references where we could create the link but not fetch content
    
    new Notice(`Converting ${references.length} Bible references to live verses...`);
    
    for (const ref of references) {
      const referenceCode = this.bibleService.parseReference(ref.text);
      
      if (!referenceCode) {
        failCount++;
        continue;
      }
      
      // Generate URL with the correct format for book numbers
      const url = this.bibleService.generateUrl(referenceCode);
      
      // Try to fetch the verse content
      const verse = await this.bibleService.fetchVerse(referenceCode);
      
      let verseText = "";
      let formattedReference = ref.text; // Default to what was in the text
      
      if (verse) {
        // Successfully fetched verse content
        verseText = verse.text;
        formattedReference = verse.reference;
        successCount++;
      } else {
        // Could not fetch verse content, but we can still create a link with a message in Obsidian comment format
        verseText = "%% Could not fetch verse content. Click the link to view on jw.org. %%";
        partialCount++;
      }
      
      // Create the verse block using the link format with custom prefix/suffix
      let verseBlock = '';
      
      // Create the link with custom prefix/suffix
      const linkPart = `${this.settings.linkPrefix}[${formattedReference}](${url})${this.settings.linkSuffix}`;
      
      // If set to insert link only, don't include the verse content
      if (this.settings.insertLinkOnly) {
        verseBlock = `${linkPart}\n\n`;
      } else {
        // Otherwise include the verse content with its custom prefix/suffix
        verseBlock = verseText.includes('%%') 
          ? `${linkPart}\n\n${verseText}\n\n`
          : `${linkPart}\n\n${this.settings.versePrefix}${verseText}${this.settings.verseSuffix}\n\n`;
      }
      
      // Replace the reference with the verse block
      content = content.substring(0, ref.index) + verseBlock + content.substring(ref.index + ref.length);
    }
    
    // Update the editor content
    editor.setValue(content);
    
    // Show a notification with the results
    if (successCount > 0 || partialCount > 0) {
      let message = `Converted ${successCount + partialCount} Bible references to live verses.`;
      if (successCount > 0 && partialCount > 0) {
        message += ` (${successCount} with content, ${partialCount} with links only)`;
      } else if (partialCount > 0) {
        message += ` (content could not be fetched, links only)`;
      }
      if (failCount > 0) {
        message += ` (${failCount} failed completely)`;
      }
      new Notice(message);
    } else if (failCount > 0) {
      new Notice(`Failed to convert ${failCount} Bible references.`);
    }
  }
}

class JWPubSettingTab extends PluginSettingTab {
  plugin: JWPubPlugin;

  constructor(app: App, plugin: JWPubPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;

    containerEl.empty();

    containerEl.createEl('h2', {text: 'JW Bible Verses Plugin Settings'});

    // Enhanced language selection with instructions
    const languageContainer = containerEl.createEl('div', { cls: 'language-setting-container' });
    
    // Language setting heading
    languageContainer.createEl('h3', {text: 'Language Settings'});
    
    // Language field with description
    const languageSetting = new Setting(languageContainer)
      .setName('Language Code')
      .setDesc('Set the language code for Bible verses. Use the instructions below to find your preferred language code.')
      .addText(text => text
        .setPlaceholder('E')
        .setValue(this.plugin.settings.language)
        .onChange(async (value) => {
          // Parse language code from the input
          // This can be a full URL or just the language code
          let language = value.trim();
          
          // If it's a URL, extract the language code
          const wtlocaleMatch = language.match(/wtlocale=([A-Za-z0-9_-]+)/i);
          if (wtlocaleMatch) {
            language = wtlocaleMatch[1];
          }
          
          // Only proceed if the language code is valid
          if (language && language.length >= 1 && language.length <= 10) {
            // Check if the language has changed
            const oldLanguage = this.plugin.settings.language;
            
            if (language !== oldLanguage) {
              this.plugin.settings.language = language;
              await this.plugin.saveSettings();
              
              // Auto-fetch book names for the new language
              try {
                new Notice(`Language changed to ${language}. Fetching Bible book names...`);
                await this.plugin.fetchAndSetupBookNames(language);
                this.display(); // Refresh the settings UI
              } catch (error) {
                console.error(`Error fetching book names for new language: ${error}`);
              }
            }
          }
        }));
        
    // Instructions for finding language codes
    const instructionsContainer = languageContainer.createEl('details', { cls: 'language-instructions' });
    instructionsContainer.createEl('summary', { text: 'How to find your language code' });
    
    const instructionsList = instructionsContainer.createEl('ol', { cls: 'instructions-list' });
    
    instructionsList.createEl('li', { 
      text: 'Click this link to open Matthew 1:1 in English on JW.org:'
    }).appendChild(
      createEl('a', {
        text: 'Matthew 1:1 (English)',
        href: 'https://www.jw.org/finder?pub=nwtsty&bible=40001000&wtlocale=E',
        attr: { target: '_blank' }
      })
    );
    
    instructionsList.createEl('li', {
      text: 'On the JW.org website, change the language to your desired language (e.g., Portuguese, Spanish, etc.).'
    });
    
    instructionsList.createEl('li', {
      text: 'Scroll down to the end of the chapter and click the "Share" button.'
    });
    
    instructionsList.createEl('li', {
      text: 'Copy the link provided in the share dialog.'
    });
    
    instructionsList.createEl('li', {
      text: 'Paste the copied link into the Language Code field above. The plugin will automatically extract your language code.'
    });
    
    instructionsList.createEl('li', {
      text: 'The language code will be extracted and saved (e.g., "T" for Portuguese, "S" for Spanish).'
    });
    
    // Add a sample that shows what the user should be looking for
    const exampleContainer = instructionsContainer.createEl('div', { cls: 'example-container' });
    exampleContainer.createEl('p', { 
      text: 'Example: In a link like "https://www.jw.org/finder?pub=nwtsty&bible=40001000&wtlocale=T&srcid=share", the language code is "T".' 
    });
    
    // Add CSS to style the instructions
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .language-setting-container {
        margin-bottom: 24px;
        border: 1px solid var(--background-modifier-border);
        padding: 16px;
        border-radius: 4px;
      }
      .language-setting-container h3 {
        margin-top: 0;
      }
      .language-instructions {
        margin-top: 12px;
        padding: 8px;
        background-color: var(--background-secondary);
        border-radius: 4px;
      }
      .language-instructions summary {
        cursor: pointer;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .instructions-list li {
        margin-bottom: 8px;
      }
      .example-container {
        margin-top: 12px;
        padding: 8px;
        background-color: var(--background-modifier-form-field);
        border-radius: 4px;
        font-family: monospace;
      }
    `;
    languageContainer.appendChild(styleElement);

    // Display localized book names information if available
    if (this.plugin.settings.localizedBookNames && 
        this.plugin.settings.localizedBookNames[this.plugin.settings.language]) {
      
      const language = this.plugin.settings.language;
      const lastUpdate = this.plugin.settings.lastLanguageUpdate[language];
      const bookNames = this.plugin.settings.localizedBookNames[language];
      const bookCount = Object.keys(bookNames).length;
      
      const infoEl = containerEl.createEl('div', { cls: 'localized-books-info' });
      
      infoEl.createEl('p', { 
        text: `${bookCount} book names available for language code "${language}".` 
      });
      
      if (lastUpdate) {
        infoEl.createEl('p', { 
          text: `Last updated: ${new Date(lastUpdate).toLocaleString()}` 
        });
      }
      
      // Optionally show a sample of the book names
      const sampleEl = infoEl.createEl('details');
      sampleEl.createEl('summary', { text: 'Sample of available book names' });
      
      const sampleList = sampleEl.createEl('ul');
      
      // Show a few sample book names (showing all would be too many)
      const bookEntries = Object.entries(bookNames);
      const samples = bookEntries
        .filter(([name]) => name.length > 2 && !name.includes(' ')) // Filter out abbreviations and spaces
        .slice(0, 10); // Take just the first 10
      
      samples.forEach(([name, number]) => {
        sampleList.createEl('li', { 
          text: `${name} → Book ${number}` 
        });
      });
    }

    new Setting(containerEl)
      .setName('Insert Link Only')
      .setDesc('When enabled, only inserts the link without the verse content. When disabled, includes both link and verse text.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.insertLinkOnly)
        .onChange(async (value) => {
          this.plugin.settings.insertLinkOnly = value;
          await this.plugin.saveSettings();
        }));
        
    // Section header for format customization
    containerEl.createEl('h3', {text: 'Format Customization'});
    
    // Link prefix
    const linkPrefixSetting = new Setting(containerEl)
      .setName('Link Prefix')
      .setDesc('Text to insert before the link (default: blank)')
      .addText(text => text
        .setPlaceholder('')
        .setValue(this.plugin.settings.linkPrefix)
        .onChange(async (value) => {
          this.plugin.settings.linkPrefix = value;
          await this.plugin.saveSettings();
        }));
    
    // Add reset button for link prefix
    linkPrefixSetting.addButton(button => button
      .setButtonText('Reset')
      .setTooltip('Reset to default (blank)')
      .onClick(async () => {
        this.plugin.settings.linkPrefix = '';
        await this.plugin.saveSettings();
        this.display(); // Refresh the display
      }));
    
    // Link suffix
    const linkSuffixSetting = new Setting(containerEl)
      .setName('Link Suffix')
      .setDesc('Text to insert after the link (default: blank)')
      .addText(text => text
        .setPlaceholder('')
        .setValue(this.plugin.settings.linkSuffix)
        .onChange(async (value) => {
          this.plugin.settings.linkSuffix = value;
          await this.plugin.saveSettings();
        }));
    
    // Add reset button for link suffix
    linkSuffixSetting.addButton(button => button
      .setButtonText('Reset')
      .setTooltip('Reset to default (blank)')
      .onClick(async () => {
        this.plugin.settings.linkSuffix = '';
        await this.plugin.saveSettings();
        this.display(); // Refresh the display
      }));
    
    // Verse prefix
    const versePrefixSetting = new Setting(containerEl)
      .setName('Verse Prefix')
      .setDesc('Text to insert before the verse content (default: "")')
      .addText(text => text
        .setPlaceholder('')
        .setValue(this.plugin.settings.versePrefix)
        .onChange(async (value) => {
          this.plugin.settings.versePrefix = value;
          await this.plugin.saveSettings();
        }));
    
    // Add reset button for verse prefix
    versePrefixSetting.addButton(button => button
      .setButtonText('Reset')
      .setTooltip('Reset to default ("')
      .onClick(async () => {
        this.plugin.settings.versePrefix = '';
        await this.plugin.saveSettings();
        this.display(); // Refresh the display
      }));
    
    // Verse suffix
    const verseSuffixSetting = new Setting(containerEl)
      .setName('Verse Suffix')
      .setDesc('Text to insert after the verse content (default: "")')
      .addText(text => text
        .setPlaceholder('')
        .setValue(this.plugin.settings.verseSuffix)
        .onChange(async (value) => {
          this.plugin.settings.verseSuffix = value;
          await this.plugin.saveSettings();
        }));
    
    // Add reset button for verse suffix
    verseSuffixSetting.addButton(button => button
      .setButtonText('Reset')
      .setTooltip('Reset to default ("')
      .onClick(async () => {
        this.plugin.settings.verseSuffix = '';
        await this.plugin.saveSettings();
        this.display(); // Refresh the display
      }));

    new Setting(containerEl)
      .setName('Auto Update')
      .setDesc('Automatically update Bible verses when opening notes')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoUpdate)
        .onChange(async (value) => {
          this.plugin.settings.autoUpdate = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Update Interval')
      .setDesc('Interval in days to check for updates to verses (if Auto Update is enabled)')
      .addSlider(slider => slider
        .setLimits(1, 90, 1)
        .setValue(this.plugin.settings.updateInterval)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.updateInterval = value;
          await this.plugin.saveSettings();
        }));
        
    // Add a section for Bible books settings
    containerEl.createEl('h3', {text: 'Bible Books Settings'});
    
    // Create a container for the book settings
    const booksContainer = containerEl.createEl('div', { cls: 'books-settings-container' });
    
    // Add a description explaining what this section is for
    booksContainer.createEl('p', { 
      text: 'Customize bible book names and abbreviations used for lookup and display. Use the Fetch Book Names button above to populate with names from your selected language. Abbreviations are used for recognition of references in your notes.' 
    });
    
    // Add a compact/expand all toggle for the book settings
    const controlsContainer = booksContainer.createEl('div', { cls: 'books-controls' });
    const expandAllButton = createEl('button', { text: 'Expand All', cls: 'expand-all-button' });
    const collapseAllButton = createEl('button', { text: 'Collapse All', cls: 'collapse-all-button' });
    const resetAllButton = createEl('button', { text: 'Reset Book Names', cls: 'reset-all-button' });
    
    controlsContainer.appendChild(expandAllButton);
    controlsContainer.appendChild(collapseAllButton);
    controlsContainer.appendChild(resetAllButton);
    
    // Reset all button handler
    resetAllButton.addEventListener('click', async () => {
      const language = this.plugin.settings.language;
      
      // Ask for confirmation
      if (!confirm(`This will reset all book names and abbreviations to JW.org defaults for language ${language}. Continue?`)) {
        return;
      }
      
      new Notice(`Resetting all book names and abbreviations to JW.org defaults...`);
      
      try {
        // Fetch fresh book names from JW.org
        await this.plugin.bibleService.fetchLocalizedBookNames(language);
        
        // Update settings with the fetched data
        for (let i = 1; i <= 66; i++) {
          const bookCode = i.toString().padStart(2, '0');
          
          // Get original names with proper capitalization
          const fullName = this.plugin.bibleService.getOriginalFullName(i);
          const stdAbbrev = this.plugin.bibleService.getOriginalLongAbbr(i);
          const altAbbrev = this.plugin.bibleService.getOriginalShortAbbr(i);
          
          if (fullName) {
            this.plugin.settings.customBookNames[bookCode] = fullName;
          }
          
          if (stdAbbrev) {
            this.plugin.settings.standardAbbreviations[bookCode] = stdAbbrev;
          }
          
          if (altAbbrev) {
            this.plugin.settings.alternateAbbreviations[bookCode] = altAbbrev;
          }
        }
        
        await this.plugin.saveSettings();
        
        // Refresh the display to show the updated values
        this.display();
        
        new Notice(`Successfully reset all book names and abbreviations to JW.org defaults`);
      } catch (error) {
        console.error(`Error resetting book names: ${error}`);
        new Notice(`Error resetting book names and abbreviations: ${error}`);
      }
    });
    
    // Add the books settings
    for (let i = 1; i <= 66; i++) {
      const bookCode = i.toString().padStart(2, '0');
      const defaultName = this.plugin.bibleService.getBookNameFromCode(bookCode);
      const customName = this.plugin.settings.customBookNames[bookCode] || defaultName;
      
      // Get abbreviations with fallback
      const standardAbbrev = this.plugin.settings.standardAbbreviations[bookCode] || 
        (customName.length > 3 ? customName.substring(0, 3) + '.' : customName);
      const alternateAbbrev = this.plugin.settings.alternateAbbreviations[bookCode] || 
        (customName.length > 2 ? customName.substring(0, 2) : customName);
      
      // Create a collapsible details element for each book
      const bookDetails = booksContainer.createEl('details', { cls: 'book-details' });
      const bookSummary = bookDetails.createEl('summary', { 
        text: `${i}. ${customName}`,
        cls: 'book-summary'
      });
      
      // Book form with customization fields
      const bookForm = bookDetails.createEl('div', { cls: 'book-form' });
      
      // Book name
      const nameContainer = bookForm.createEl('div', { cls: 'form-row' });
      nameContainer.createEl('label', { text: 'Book Name:', cls: 'form-label' });
      const nameInput = nameContainer.createEl('input', {
        cls: 'form-input',
        attr: {
          type: 'text',
          value: customName,
          placeholder: defaultName
        }
      });
      
      // Standard abbreviation
      const stdAbbrevContainer = bookForm.createEl('div', { cls: 'form-row' });
      stdAbbrevContainer.createEl('label', { text: 'Standard Abbreviation:', cls: 'form-label' });
      const stdAbbrevInput = stdAbbrevContainer.createEl('input', {
        cls: 'form-input',
        attr: {
          type: 'text',
          value: standardAbbrev,
          placeholder: 'e.g. Gen.'
        }
      });
      
      // Alternate abbreviation
      const altAbbrevContainer = bookForm.createEl('div', { cls: 'form-row' });
      altAbbrevContainer.createEl('label', { text: 'Alternate Abbreviation:', cls: 'form-label' });
      const altAbbrevInput = altAbbrevContainer.createEl('input', {
        cls: 'form-input',
        attr: {
          type: 'text',
          value: alternateAbbrev,
          placeholder: 'e.g. Ge'
        }
      });
      
      // Save button for all book settings
      const saveContainer = bookForm.createEl('div', { cls: 'form-row buttons-row' });
      const saveButton = saveContainer.createEl('button', {
        text: 'Save Changes',
        cls: 'save-button'
      });
      
      // Event listeners for input changes
      nameInput.addEventListener('input', () => {
        // Update the summary text as the user types
        bookSummary.textContent = `${i}. ${nameInput.value || defaultName}`;
      });
      
      // Save button click handler
      saveButton.addEventListener('click', async () => {
        // Update settings with new values
        this.plugin.settings.customBookNames[bookCode] = nameInput.value;
        this.plugin.settings.standardAbbreviations[bookCode] = stdAbbrevInput.value;
        this.plugin.settings.alternateAbbreviations[bookCode] = altAbbrevInput.value;
        
        // Save settings
        await this.plugin.saveSettings();
        
        // Show confirmation
        new Notice(`Saved settings for ${nameInput.value}`);
      });
    }
    
    // Add event listeners for expand/collapse all buttons
    expandAllButton.addEventListener('click', () => {
      booksContainer.querySelectorAll('details').forEach(detail => {
        detail.setAttribute('open', '');
      });
    });
    
    collapseAllButton.addEventListener('click', () => {
      booksContainer.querySelectorAll('details').forEach(detail => {
        detail.removeAttribute('open');
      });
    });
    
    // Add CSS for the book settings
    const style = document.createElement('style');
    style.textContent = `
      .books-settings-container {
        margin-top: 12px;
        padding: 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
      }
      
      .books-controls {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }
      
      .expand-all-button, .collapse-all-button, .reset-all-button {
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background-color: var(--interactive-normal);
        cursor: pointer;
      }
      
      .expand-all-button:hover, .collapse-all-button:hover, .reset-all-button:hover {
        background-color: var(--interactive-hover);
      }
      
      .reset-all-button {
        margin-left: auto;
        background-color: var(--text-error);
        color: var(--text-on-accent);
      }
      
      .book-details {
        margin-bottom: 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        overflow: hidden;
      }
      
      .book-summary {
        padding: 8px;
        cursor: pointer;
        background-color: var(--background-secondary);
      }
      
      .book-summary:hover {
        background-color: var(--background-modifier-hover);
      }
      
      .book-form {
        padding: 12px;
      }
      
      .form-row {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .form-label {
        flex: 0 0 150px;
        margin-right: 8px;
      }
      
      .form-input {
        flex: 1;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
      }
      
      .buttons-row {
        justify-content: flex-end;
        margin-top: 16px;
      }
      
      .save-button {
        padding: 6px 12px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
        cursor: pointer;
      }
      
      .save-button:hover {
        background-color: var(--interactive-accent-hover);
      }
    `;
    
    containerEl.appendChild(style);
  }
}

/**
 * Modal for entering a Bible reference
 */
class BibleReferenceModal extends Modal {
  plugin: JWPubPlugin;
  editor: Editor;
  referenceInput!: HTMLInputElement; // Use definite assignment assertion
  
  constructor(app: App, plugin: JWPubPlugin, editor: Editor) {
    super(app);
    this.plugin = plugin;
    this.editor = editor;
  }
  
  onOpen() {
    const {contentEl} = this;
    
    contentEl.createEl('h2', {text: 'Insert Bible Verse'});
    
    // Get examples from configured book names in the current language
    const exampleText = this.createExampleText();
    contentEl.createEl('p', {text: exampleText});
    
    this.referenceInput = contentEl.createEl('input', {
      type: 'text',
      placeholder: 'Bible reference',
    });
    
    // Add a checkbox for link-only mode
    const linkOnlyContainer = contentEl.createEl('div', {
      cls: 'link-only-container',
    });
    
    linkOnlyContainer.createEl('label', {text: 'Insert link only (no verse content)'});
    const linkOnlyCheckbox = linkOnlyContainer.createEl('input', {
      type: 'checkbox',
    });
    
    // Set the checkbox state from the plugin settings
    linkOnlyCheckbox.checked = this.plugin.settings.insertLinkOnly;
    
    // Set focus to the input
    this.referenceInput.focus();
    
    // Handle Enter key press
    this.referenceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const reference = this.referenceInput.value.trim();
        if (reference) {
          // Save the user's link-only preference
          if (this.plugin.settings.insertLinkOnly !== linkOnlyCheckbox.checked) {
            this.plugin.settings.insertLinkOnly = linkOnlyCheckbox.checked;
            this.plugin.saveSettings();
          }
          
          // Always use link format now
          this.plugin.insertBibleVerseAsLink(this.editor, reference);
          this.close();
        }
      }
    });
    
    const buttonContainer = contentEl.createEl('div', {
      cls: 'modal-button-container',
    });
    
    const submitButton = buttonContainer.createEl('button', {
      text: 'Insert',
      cls: 'mod-cta',
    });
    
    submitButton.addEventListener('click', () => {
      const reference = this.referenceInput.value.trim();
      if (reference) {
        // Save the user's link-only preference
        if (this.plugin.settings.insertLinkOnly !== linkOnlyCheckbox.checked) {
          this.plugin.settings.insertLinkOnly = linkOnlyCheckbox.checked;
          this.plugin.saveSettings();
        }
        
        // Always use link format now
        this.plugin.insertBibleVerseAsLink(this.editor, reference);
        this.close();
      }
    });
    
    const cancelButton = buttonContainer.createEl('button', {
      text: 'Cancel',
    });
    
    cancelButton.addEventListener('click', () => {
      this.close();
    });
  }
  
  /**
   * Create example text for Bible references using the current language configuration
   */
  private createExampleText(): string {
    // Get the currently configured books to use as examples
    let johnName = "John";
    let johnAbbrevStd = "John";
    let johnAbbrevAlt = "Jn";
    let matthewName = "Matthew";
    let matthewAbbrevStd = "Matt.";
    let matthewAbbrevAlt = "Mt";
    
    // Try to get localized book names if available
    try {
      // John (book 43)
      const johnCode = "43";
      if (this.plugin.settings.customBookNames[johnCode]) {
        johnName = this.plugin.settings.customBookNames[johnCode];
      }
      if (this.plugin.settings.standardAbbreviations[johnCode]) {
        johnAbbrevStd = this.plugin.settings.standardAbbreviations[johnCode];
      }
      if (this.plugin.settings.alternateAbbreviations[johnCode]) {
        johnAbbrevAlt = this.plugin.settings.alternateAbbreviations[johnCode];
      }
      
      // Matthew (book 40)
      const matthewCode = "40";
      if (this.plugin.settings.customBookNames[matthewCode]) {
        matthewName = this.plugin.settings.customBookNames[matthewCode];
      }
      if (this.plugin.settings.standardAbbreviations[matthewCode]) {
        matthewAbbrevStd = this.plugin.settings.standardAbbreviations[matthewCode];
      }
      if (this.plugin.settings.alternateAbbreviations[matthewCode]) {
        matthewAbbrevAlt = this.plugin.settings.alternateAbbreviations[matthewCode];
      }
    } catch (error) {
      console.error("Error getting localized book examples:", error);
    }
    
    // Create the example text with the book names in the current language
    return `Enter a Bible reference using full names or abbreviations:
• Full name: "${johnName} 3:16" or "${matthewName} 1:1"
• Standard abbreviation: "${johnAbbrevStd} 3:16" or "${matthewAbbrevStd} 1:1"
• Short abbreviation: "${johnAbbrevAlt} 3:16" or "${matthewAbbrevAlt} 1:1"`;
  }
  
  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
}

/**
 * Modal for confirming an action
 */
class ConfirmModal extends Modal {
  private callback: (confirmed: boolean) => void;
  private message: string;
  
  constructor(app: App, message: string, callback: (confirmed: boolean) => void) {
    super(app);
    this.message = message;
    this.callback = callback;
  }
  
  onOpen() {
    const {contentEl} = this;
    
    contentEl.createEl('h2', {text: 'Confirm Action'});
    contentEl.createEl('p', {text: this.message});
    
    const buttonContainer = contentEl.createEl('div', {
      cls: 'modal-button-container',
    });
    
    const confirmButton = buttonContainer.createEl('button', {
      text: 'Yes',
      cls: 'mod-cta',
    });
    
    confirmButton.addEventListener('click', () => {
      this.callback(true);
      this.close();
    });
    
    const cancelButton = buttonContainer.createEl('button', {
      text: 'No',
    });
    
    cancelButton.addEventListener('click', () => {
      this.callback(false);
      this.close();
    });
  }
  
  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
}

/**
 * Modal for customizing Bible book names
 */
class BibleBookCustomizationModal extends Modal {
  plugin: JWPubPlugin;
  customNames: Record<string, string> = {};
  standardAbbreviations: Record<string, string> = {};
  alternateAbbreviations: Record<string, string> = {};
  
  constructor(app: App, plugin: JWPubPlugin) {
    super(app);
    this.plugin = plugin;
    this.customNames = {...(this.plugin.settings.customBookNames || {})};
    this.standardAbbreviations = {...(this.plugin.settings.standardAbbreviations || {})};
    this.alternateAbbreviations = {...(this.plugin.settings.alternateAbbreviations || {})};
  }
  
  onOpen() {
    const {contentEl} = this;
    
    contentEl.createEl('h2', {text: 'Bible Books Settings'});
    
    contentEl.createEl('p', {
      text: 'Customize the names and abbreviations of Bible books to match your preferred names or language. ' +
            'The book numbers will still be used for fetching verses, so your customizations ' +
            'won\'t break the functionality.'
    });
    
    // Create a bookService with default settings to get standard book names
    const bookService = new BibleService(DEFAULT_SETTINGS);
    
    // Create a table for all Bible books
    const table = contentEl.createEl('table', {cls: 'bible-books-table'});
    const headerRow = table.createEl('tr');
    headerRow.createEl('th', {text: 'Book Number'});
    headerRow.createEl('th', {text: 'Default Name'});
    headerRow.createEl('th', {text: 'Custom Name'});
    headerRow.createEl('th', {text: 'Standard Abbreviation'});
    headerRow.createEl('th', {text: 'Alternate Abbreviation'});
    
    // Loop through all 66 Bible books
    for (let i = 1; i <= 66; i++) {
      const bookCode = i.toString().padStart(2, '0');
      const defaultName = bookService.getBookNameFromCode(bookCode);
      
      const row = table.createEl('tr');
      row.createEl('td', {text: bookCode});
      row.createEl('td', {text: defaultName});
      
      // Custom Name input
      const nameInputCell = row.createEl('td');
      const nameInput = nameInputCell.createEl('input', {
        type: 'text',
        attr: {
          placeholder: defaultName
        }
      });
      
      // Set the value from existing custom names if available
      if (this.customNames[bookCode]) {
        nameInput.value = this.customNames[bookCode];
      }
      
      // Add change event listener for custom name
      nameInput.addEventListener('change', () => {
        if (nameInput.value && nameInput.value.trim() !== '') {
          this.customNames[bookCode] = nameInput.value.trim();
        } else {
          // If input is empty, remove the custom name
          delete this.customNames[bookCode];
        }
      });
      
      // Standard Abbreviation input
      const stdAbbrevCell = row.createEl('td');
      const stdAbbrevInput = stdAbbrevCell.createEl('input', {
        type: 'text',
        attr: {
          placeholder: defaultName.substring(0, 3) + '.'
        }
      });
      
      // Set the value from existing standard abbreviations if available
      if (this.standardAbbreviations[bookCode]) {
        stdAbbrevInput.value = this.standardAbbreviations[bookCode];
      }
      
      // Add change event listener for standard abbreviation
      stdAbbrevInput.addEventListener('change', () => {
        if (stdAbbrevInput.value && stdAbbrevInput.value.trim() !== '') {
          this.standardAbbreviations[bookCode] = stdAbbrevInput.value.trim();
        } else {
          // If input is empty, remove the abbreviation
          delete this.standardAbbreviations[bookCode];
        }
      });
      
      // Alternate Abbreviation input
      const altAbbrevCell = row.createEl('td');
      const altAbbrevInput = altAbbrevCell.createEl('input', {
        type: 'text',
        attr: {
          placeholder: defaultName.substring(0, 3)
        }
      });
      
      // Set the value from existing alternate abbreviations if available
      if (this.alternateAbbreviations[bookCode]) {
        altAbbrevInput.value = this.alternateAbbreviations[bookCode];
      }
      
      // Add change event listener for alternate abbreviation
      altAbbrevInput.addEventListener('change', () => {
        if (altAbbrevInput.value && altAbbrevInput.value.trim() !== '') {
          this.alternateAbbreviations[bookCode] = altAbbrevInput.value.trim();
        } else {
          // If input is empty, remove the abbreviation
          delete this.alternateAbbreviations[bookCode];
        }
      });
    }
    
    // Add Save and Cancel buttons
    const buttonContainer = contentEl.createEl('div', {
      cls: 'modal-button-container',
    });
    
    const saveButton = buttonContainer.createEl('button', {
      text: 'Save',
      cls: 'mod-cta',
    });
    
    saveButton.addEventListener('click', async () => {
      this.plugin.settings.customBookNames = this.customNames;
      this.plugin.settings.standardAbbreviations = this.standardAbbreviations;
      this.plugin.settings.alternateAbbreviations = this.alternateAbbreviations;
      await this.plugin.saveSettings();
      this.close();
      // Refresh the settings tab to show the updated custom names
      this.plugin.settingsTab.display();
    });
    
    const cancelButton = buttonContainer.createEl('button', {
      text: 'Cancel',
    });
    
    cancelButton.addEventListener('click', () => {
      this.close();
    });
  }
  
  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
} 