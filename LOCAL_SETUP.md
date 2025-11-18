# Local Hosting Setup

This guide explains how to run the CA Legislative Transcripts Archive locally on your computer.

## Quick Start

### Option 1: Using the Bash Script (Easiest)

```bash
./serve.sh
```

### Option 2: Using Python Directly

```bash
python3 serve.py
```

### Option 3: Using Python's Built-in Server

```bash
python3 -m http.server 8000
```

## Accessing the Archive

Once the server is running:

1. Open your web browser
2. Navigate to: `http://localhost:8000/index.html`
3. You'll see the transcript archive interface with:
   - A search box to filter transcripts
   - Organized list of transcripts by year and month
   - Click any transcript to view its full content

## Features

### Web Interface
- **Search**: Type in the search box to filter transcripts by filename, date, or committee code
- **Browse**: Transcripts are organized by year and month
- **View**: Click any transcript to open it in a modal viewer
- **Responsive**: Works on desktop and mobile browsers

### Search Examples
- Search by date: `20250701`
- Search by committee code: `JD` (Judiciary)
- Search by filename: `20250701-JD.txt`

## Common Committee Codes

- **AF**: Agriculture and Food
- **AP**: Appropriations
- **AR**: Arts
- **ED**: Education
- **HE**: Health
- **HS**: Human Services
- **JD**: Judiciary
- **NR**: Natural Resources
- **PS**: Public Safety
- **TR**: Transportation
- **WP**: Water, Parks and Wildlife

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Troubleshooting

### Port Already in Use
If you see "Address already in use" error:
1. Another program is using port 8000
2. Stop the other program, or
3. Edit `serve.py` and change the `PORT = 8000` line to a different port (e.g., `PORT = 8080`)

### Python Not Found
- Make sure Python 3 is installed on your system
- Download from: https://www.python.org/downloads/
- On Linux/Mac: `python3 --version` to check installation
- On Windows: `python --version` to check installation

### Transcripts Not Loading
- Make sure you're accessing `http://localhost:8000/index.html` (not just opening the HTML file directly)
- Check that transcript files exist in the year directories (07/, 08/, 09/, 2025/)
- Check the browser console (F12) for any error messages

## Development

### File Structure
```
CA-TS/
├── index.html          # Main web interface
├── serve.py            # Python web server script
├── serve.sh            # Bash wrapper script
├── generate-readme.sh  # Script to update README with transcript list
├── 07/                 # July 2025 transcripts
├── 08/                 # August 2025 transcripts
├── 09/                 # September 2025 transcripts
└── 2025/               # 2025 transcripts (organized by month)
```

### Adding New Transcripts
1. Place transcript files in the appropriate year/month directory
2. Files should follow naming convention: `YYYYMMDD-CODE.txt`
3. The web interface will automatically detect and display them
4. Run `./generate-readme.sh` to update the README

## GitHub Pages Deployment

This repository is also deployed to GitHub Pages at:
`https://diandjam.github.io/CA-TS/`

When you push changes to the repository:
1. GitHub Actions automatically runs `generate-readme.sh`
2. The README is updated with the latest transcript list
3. GitHub Pages serves the static files

## Additional Notes

- The local server is for development and testing only
- It serves files without authentication or security features
- Don't expose it to the internet
- It's safe to run on your local machine for browsing transcripts
