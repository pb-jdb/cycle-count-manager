# Cycle Count Manager

A production-grade inventory cycle counting application that automates SKU classification, tracks count frequency, and generates daily count sheets based on inventory turnover rates.

## Features

### 1. **Automatic SKU Classification**
- Classifies SKUs into three inventory levels (A, B, C) based on inventory turn distribution
- Uses tertile-based thresholds:
  - **A Level**: Top 33% by inventory turns → Monthly counts (12x/year)
  - **B Level**: Middle 33% by inventory turns → Quarterly counts (4x/year)
  - **C Level**: Bottom 33% by inventory turns → Semi-annual counts (2x/year)

### 2. **Intelligent Daily Count Generation**
- Automatically calculates the optimal number of items to count daily
- Ensures all items are counted before any item is repeated
- Scales to your total inventory size
- Prevents bias by randomly selecting items from uncounted pool

### 3. **Persistent Tracking**
- Tracks last count date for each SKU
- Records days since last count
- Maintains count history across sessions
- Persists all data locally in the browser

### 4. **Inventory Management**
- Upload new inventory files monthly (Excel format)
- Automatically detects and removes obsolete SKUs
- Archives removed SKUs with their count history
- Updates SKU classifications based on new inventory turn data

### 5. **Excel Export**
- Generate daily count sheets in Excel format
- Includes SKU, bin location, inventory level, and last count date
- Ready for warehouse floor use
- Automatic download with date stamp

## How to Use

### Initial Setup

1. **Prepare Your Excel File**
   - Create a file with three columns: **SKU**, **Bin Location**, **Inventory Turn**
   - Example:
     ```
     SKU          | Bin Location | Inventory Turn
     SKU-001      | A-01-001     | 12.5
     SKU-002      | B-03-015     | 8.2
     SKU-003      | C-12-008     | 2.1
     ```

2. **Upload Your Inventory**
   - Click the "UPLOAD" tab
   - Select your Excel file (.xlsx, .xls, or .csv)
   - The app will:
     - Classify all SKUs into A/B/C levels
     - Archive any SKUs removed from the new file
     - Update count tracking for remaining items

### Daily Operations

1. **Generate Today's Count**
   - Click "GENERATE TODAY'S COUNT SHEET" on the Dashboard
   - The app will automatically select items from each level based on count frequency
   - Selection ensures all items are counted before repeating any SKU

2. **Download and Execute**
   - Click "DOWNLOAD EXCEL" to get the day's count sheet
   - Share with warehouse team for inventory verification
   - As items are counted, mark them in your system

3. **View Statistics**
   - Dashboard shows:
     - Total items per inventory level
     - Number of pending items (not yet counted in current cycle)
     - Real-time status of count progress

### Monthly Updates

1. **Prepare Updated Inventory File**
   - Include all current SKUs with updated inventory turn calculations
   - Include new SKUs if any
   - Remove rows for discontinued SKUs

2. **Upload New File**
   - Upload the updated file to the app
   - The app will:
     - Identify new SKUs and add them to the count cycle
     - Archive removed SKUs (saving their count history)
     - Reset count cycles when all items in a level have been counted

## Count Frequency Explained

The app ensures balanced inventory counting:

- **A Level Items** (12 counts/year)
  - ~0.33% of A items counted daily
  - Ensures high-velocity items are verified monthly
  - Example: 100 A-level items = ~8 items to count per day

- **B Level Items** (4 counts/year)
  - ~0.22% of B items counted daily
  - Ensures mid-velocity items are verified quarterly
  - Example: 200 B-level items = ~5 items to count per day

- **C Level Items** (2 counts/year)
  - ~0.11% of C items counted daily
  - Ensures low-velocity items are verified twice yearly
  - Example: 300 C-level items = ~2 items to count per day

**Total daily count** automatically adjusts based on your inventory size and mix.

## Data Structure

### Stored Data
All data is stored locally in your browser using persistent storage:
- **SKUs**: Full inventory list with classifications
- **Last Counts**: Date and days-since-count for each SKU
- **Archive**: Removed SKUs and their count history
- **Generated Dates**: Log of all count sheet generation events

### No Server Required
- All processing happens in your browser
- No data is sent to external servers
- Your inventory data remains completely private

## Export & Backup

The app maintains:
1. **Generated Count Sheets** (Excel files)
   - Daily downloads with timestamp
   - Save these for your warehouse execution records

2. **Archive History**
   - All removed SKUs retained with count history
   - Viewable in the History tab
   - Useful for historical analysis

## File Format Requirements

### Excel Upload Format
```
Column 1: SKU
Column 2: Bin Location (or "location")
Column 3: Inventory Turn (or "turns")

Example valid headers:
- sku, bin, turns
- SKU, Bin Location, Inventory Turn
- Item, Location, Turns
```

The app is flexible with column naming—it will detect common variations.

## Troubleshooting

**Q: Why are my SKUs classified differently each month?**
- A: Classification is based on tertile distribution of your current inventory. As inventory turns change, classifications may shift. This is correct behavior—high-turnover items get more frequent counts.

**Q: What happens if I don't count a scheduled item?**
- A: The app will keep it in the pending pool. When you generate the next day's count, it may be selected again. You won't miss items—they'll be recycled until counted.

**Q: Can I generate multiple count sheets per day?**
- A: Yes. Each generation updates the "last counted" timestamps. Ideally, generate once daily for operational consistency.

**Q: What if I delete the browser data?**
- A: All inventory and count history will be lost. Consider exporting/backing up your daily count sheets regularly.

## Technical Details

- **Framework**: React with Hooks
- **Storage**: Browser persistent storage (via window.storage API)
- **File Handling**: XLSX.js for Excel import/export
- **Classification Algorithm**: Tertile-based distribution (33/33/33 percentile split)
- **Randomization**: Ensures unbiased SKU selection for daily counts

## Support

This app is a self-contained React component. To use it:

1. **In Claude.ai**: Paste the code into an artifact
2. **Standalone**: Copy the .jsx file and use in your React environment
3. **Custom Integration**: Modify the storage mechanism to use your database instead of browser storage

---

**Version**: 1.0  
**Last Updated**: February 2026
