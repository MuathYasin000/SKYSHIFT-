"""Keep filesystem diagnostics private while retaining scientific rejection reasons."""
import re


def public_error_message(error):
    text=str(error)
    # Approved archive HTTPS URLs are scientific provenance, not host paths.
    text=re.sub(r'(?<![\w])[A-Za-z]:[\\/][^\s\'"<>]+', '[private path]', text)
    text=re.sub(r'(?<![\w:/])/(?!/)[^\s\'"<>]+', '[private path]', text)
    return text
