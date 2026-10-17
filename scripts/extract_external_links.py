"""Enumerate unique literal HTTP(S) URLs from the requested shipped sources."""
from pathlib import Path
import html
import json
import re
import sys
from urllib.parse import urlsplit

root=Path(sys.argv[1] if len(sys.argv)>1 else 'web/dist')
urls=set()
def collect(value):
    if isinstance(value,str):
        for url in re.findall(r'https?://[^\s\"\'<>`\\]+',value):
            url=html.unescape(url).rstrip('.,;:]}')
            while url.endswith(')') and url.count(')')>url.count('('):url=url[:-1]
            if re.fullmatch(r'(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}',urlsplit(url).hostname or ''):
                urls.add(url)
    elif isinstance(value,list):
        for item in value:collect(item)
    elif isinstance(value,dict):
        for item in value.values():collect(item)
for path in root.rglob('*'):
    if path.suffix in ('.html','.js'):
        collect(path.read_text(encoding='utf-8'))
    elif path.suffix=='.json' and path.is_relative_to(root/'assets'):
        collect(json.loads(path.read_text(encoding='utf-8')))
print('\n'.join(sorted(urls)))
