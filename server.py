import http.server
import urllib.request
import urllib.parse
import sys

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for all local resources to prevent canvas issues
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
        
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        # Handle proxy requests for cross-origin images (e.g. Slack images)
        if parsed_url.path == '/proxy':
            query = urllib.parse.parse_qs(parsed_url.query)
            image_url = query.get('url', [None])[0]
            if not image_url:
                self.send_error(400, "Missing url parameter")
                return
            
            try:
                # Add headers to request to prevent blockages (mimic standard browser request)
                req = urllib.request.Request(
                    image_url, 
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                    }
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    content_type = response.headers.get('Content-Type', 'image/png')
                    data = response.read()
                    
                    self.send_response(200)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'public, max-age=86400')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_response(200) # Send 200 even on error to let fallback initials render instead of collapsing the image structure
                self.send_header('Content-Type', 'text/plain')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f"Proxy Error: {str(e)}".encode())
        else:
            # Fallback to standard static file serving
            super().do_GET()

if __name__ == '__main__':
    port = 8080
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    
    server_address = ('', port)
    httpd = http.server.HTTPServer(server_address, ProxyHTTPRequestHandler)
    print(f"Serving and proxying org chart tool on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        sys.exit(0)
