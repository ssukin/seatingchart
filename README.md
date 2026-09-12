# Seatery Seating Chart

A self-contained, desktop-first seating chart editor that can be uploaded directly to GitHub Pages.

## Run it

Open `index.html` in a browser. No build step is required. Excel import uses SheetJS from its public CDN, so an internet connection is needed for Excel uploads.

## Upload to GitHub

Copy `index.html`, `styles.css`, `app.js`, and this README into the repository root. In GitHub, open **Settings → Pages**, choose the main branch and root folder, and save. GitHub will publish the app at the repository’s Pages URL.

## Included

- Round and rectangular tables with 2–14 seats
- Grid-snapped drag and drop, zoom, and pan/scroll canvas
- Table numbering, editing, deletion, and seat-count changes
- Excel guest import with selectable name column
- Manual guest entry and alphabetized unassigned guest list
- Seat assignment from the guest list or table editor
- Duplicate-assignment warning with cancel, keep both, or remove-other-seat actions
- Browser auto-save
- JSON project export/import for sharing and restoration
- PNG chart export with table numbers and guest names
