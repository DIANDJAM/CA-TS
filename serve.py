#!/usr/bin/env python3
"""
Local web server for CA Legislative Transcripts Archive
Run this script to host the transcripts locally for development and testing.
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler with better error handling and CORS support"""

    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        # Custom logging format
        sys.stdout.write("%s - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format % args))

def main():
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)

    print("=" * 70)
    print("CA Legislative Transcripts Archive - Local Server")
    print("=" * 70)
    print(f"\nServing directory: {script_dir}")
    print(f"Server running at: http://localhost:{PORT}/")
    print(f"Open in browser:   http://localhost:{PORT}/index.html")
    print("\nPress Ctrl+C to stop the server\n")
    print("=" * 70)

    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
        sys.exit(0)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"\nError: Port {PORT} is already in use.")
            print("Please stop the other service or choose a different port.")
            print("To use a different port, edit PORT in serve.py")
        else:
            print(f"\nError starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
