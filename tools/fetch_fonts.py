"""纸桌 · 把字体下载到本地（只需运行一次）

    py tools/fetch_fonts.py

页面用到的中文字体（霞鹜文楷、思源宋体、思源黑体，共 7 个字重）按字符切成了约 700 个小文件。
平时它们从 jsDelivr 下载；国内访问 jsDelivr 常常很慢，页面就要等字体。
运行这个脚本后，字体存在 vendor/fonts/ 里（约 31 MB，不进 git），fonts.css 会优先读本地的，
本地没有的才去 CDN。已经下载过的文件会跳过，中断了重新运行即可。
"""

import concurrent.futures as cf
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "vendor", "fonts")
LIST = os.path.join(ROOT, "tools", "font-files.txt")
MIRRORS = ["cdn.jsdelivr.net", "fastly.jsdelivr.net", "gcore.jsdelivr.net", "testingcf.jsdelivr.net"]


def fetch(url):
    name = url.rsplit("/", 1)[1]
    dest = os.path.join(OUT, name)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return name, "skip"
    last = None
    for host in MIRRORS:
        u = url.replace("cdn.jsdelivr.net", host)
        try:
            with urllib.request.urlopen(u, timeout=30) as r:
                data = r.read()
            with open(dest + ".part", "wb") as f:
                f.write(data)
            os.replace(dest + ".part", dest)
            return name, "ok"
        except Exception as e:  # try the next mirror
            last = e
    return name, f"失败：{last}"


def main():
    os.makedirs(OUT, exist_ok=True)
    urls = [l.strip() for l in open(LIST, encoding="utf-8") if l.strip()]
    done = failed = 0
    with cf.ThreadPoolExecutor(max_workers=12) as pool:
        for name, status in pool.map(fetch, urls):
            done += 1
            if status.startswith("失败"):
                failed += 1
                print(f"\n  {name} {status}")
            sys.stdout.write(f"\r字体 {done}/{len(urls)}")
            sys.stdout.flush()
    print(f"\n完成。{'有 %d 个没下载成功，再运行一次即可。' % failed if failed else '刷新页面就会用本地字体了。'}")


if __name__ == "__main__":
    main()
