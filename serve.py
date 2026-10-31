"""纸桌 · 本地预览服务器

    py serve.py           # 默认 http://localhost:8000
    py serve.py 8080      # 换端口

为什么不用 py -m http.server：
Windows 上 Python 的 mimetypes 会去读注册表。如果 .js 在注册表里登记成
text/plain（装过某些编辑器、下载器或者杀软后很常见），http.server 就跟着把
.js 发成 text/plain。浏览器对 ES module 做严格 MIME 校验，会拒绝执行，于是
index.html 里 import("./carriage.js") 失败，3D 车厢静默不出现，只剩 2D 墙面。

这里把常见的类型钉死（尤其 .js → text/javascript），并且不发缓存头，所以
刷新就是新文件，不用 Ctrl+F5。
"""

import functools
import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

MIME = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".json": "application/json",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".gltf": "model/gltf+json",
    ".glb": "model/gltf-binary",
    ".bin": "application/octet-stream",
    ".woff2": "font/woff2",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **MIME}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):  # quiet: one line per file is noise
        pass


Handler = functools.partial(Handler, directory=ROOT)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), Handler) as srv:
        print(f"纸桌 · 打开 http://localhost:{PORT}/   （Ctrl+C 停止）")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass
