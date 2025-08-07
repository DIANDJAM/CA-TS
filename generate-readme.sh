#!/bin/bash

# Configuration
baseURL="https://diandjam.github.io/CA-TS"
repoPath="."

# Start README
cat > README.md << 'EOF'
# Document Archive

This repository contains searchable transcripts from legislative hearings.

## Quick Search Index

EOF

# Function to get month name
get_month_name() {
    case $1 in
        01) echo "January" ;;
        02) echo "February" ;;
        03) echo "March" ;;
        04) echo "April" ;;
        05) echo "May" ;;
        06) echo "June" ;;
        07) echo "July" ;;
        08) echo "August" ;;
        09) echo "September" ;;
        10) echo "October" ;;
        11) echo "November" ;;
        12) echo "December" ;;
        *) echo "Unknown" ;;
    esac
}

# Find all transcript files and organize by date
for year_dir in $(find $repoPath -type d -name "20*" | sort -r); do
    year=$(basename $year_dir)
    
    if find "$year_dir" -name "*.txt" -type f | grep -q .; then
        echo "### $year" >> README.md
        echo "" >> README.md
        
        for month_dir in $(find $year_dir -type d -name "[0-9][0-9]" | sort -r); do
            month=$(basename $month_dir)
            month_name=$(get_month_name $month)
            
            if find "$month_dir" -name "*.txt" -type f | grep -q .; then
                echo "#### $month_name $year" >> README.md
                
                for file in $(find $month_dir -name "*.txt" -type f | sort); do
                    filename=$(basename $file)
                    url="$baseURL/$year/$month/$filename"
                    echo "- $url" >> README.md
                done
                echo "" >> README.md
            fi
        done
    fi
done

# Add full URL list
cat >> README.md << 'EOF'
## All Transcript URLs
<!-- FULL URL LIST START -->
EOF

# Generate flat list of all URLs
find $repoPath -name "*.txt" -type f | grep -E "[0-9]{4}/[0-9]{2}/" | sort | while read file; do
    if [[ $file =~ ([0-9]{4})/([0-9]{2})/([^/]+\.txt)$ ]]; then
        year="${BASH_REMATCH[1]}"
        month="${BASH_REMATCH[2]}"
        filename="${BASH_REMATCH[3]}"
        echo "$baseURL/$year/$month/$filename" >> README.md
    fi
done

cat >> README.md << 'EOF'
<!-- FULL URL LIST END -->

## Usage
Provide the above URLs to search across transcripts.

Last Updated: 
EOF

date >> README.md
