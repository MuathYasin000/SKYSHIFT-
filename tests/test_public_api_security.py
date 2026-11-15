"""Regression checks for malformed HTTP requests. No upstream service is contacted."""
from contextlib import contextmanager
from http.client import HTTPConnection
from pathlib import Path
import json
import socket
import sys
import threading

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import local_server


@contextmanager
def public_listener():
    directory = Path(__file__).resolve().parents[1] / "web" / "dist"
    server = local_server.LocalServer(directory, 0, public_hosts={"public.test"})
    thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": .01}, daemon=True)
    thread.start()
    try:
        yield server
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def request(server, path, *, body=None, headers=None):
    client = HTTPConnection("127.0.0.1", server.server_address[1], timeout=4)
    try:
        client.request("GET" if body is None else "POST", path, body, headers={
            "Host": "public.test", "Content-Type": "application/json", **(headers or {}),
        })
        reply = client.getresponse()
        return reply.status, reply.headers, reply.read()
    finally:
        client.close()


def test_public_api_rejects_invalid_parameters_without_network(monkeypatch):
    monkeypatch.setattr(local_server, "PUBLIC_API_LIMITS", {
        "metadata": (50, 60), "frames": (60, 60), "control": (300, 60),
    })
    path = "/api/observations/searches"
    with public_listener() as server:
        invalid = [
            {"region": {"ra_deg": "attacker-controlled", "dec_deg": 0, "size_deg": .1}},
            {"region": {"ra_deg": 361, "dec_deg": 0, "size_deg": .1}},
            {"region": {"ra_deg": 1, "dec_deg": -91, "size_deg": .1}},
            {"region": {"ra_deg": 1, "dec_deg": 0, "size_deg": 1000}},
            {"region": {"ra_deg": 1, "dec_deg": 0, "size_deg": .1}, "url": "http://localhost/"},
            {"region": {"ra_deg": 1, "dec_deg": 0, "size_deg": .1}, "releases": ["qr2"]},
            {"region": {"ra_deg": 1, "dec_deg": 0, "size_deg": .1}, "detectors": [1, 7]},
            {"region": {"ra_deg": 1, "dec_deg": 0, "size_deg": .1}, "target_id": "bad-target"},
        ]
        for body in [*(json.dumps(value) for value in invalid), '{"a":1,"a":2}', '{"ra":NaN}', '[]', '{']:
            status, headers, content = request(server, path, body=body)
            assert status == 400 and b"attacker-controlled" not in content and b"Traceback" not in content
            assert headers["X-Content-Type-Options"] == "nosniff"
            assert headers["Strict-Transport-Security"]
            assert headers["Access-Control-Allow-Origin"] is None
        assert request(server, path, body=" " * 4097)[0] == 413
        assert request(server, path, body="{}", headers={"Content-Type": "text/plain"})[0] == 415
        assert request(server, path, body="{}", headers={"Origin": "https://other.test"})[0] == 403
        assert request(server, path, body="{}", headers={"Host": "other.test"})[0] == 421
        assert request(server, path + "?url=https://example.test", body="{}")[0] == 400
        assert request(server, path + "/" + "a"*32 + "/frames/" + "9"*2000)[0] == 400
        assert request(server, "/%2e%2e/.git/config")[0] == 404
        assert request(server, "/%5cWindows%5cwin.ini")[0] == 404
        assert request(server, "/__skyshift_shutdown", body="{}")[0] == 405


def test_public_rate_limit_and_conflicting_framing(monkeypatch):
    monkeypatch.setattr(local_server, "PUBLIC_API_LIMITS", {
        "metadata": (2, 60), "frames": (60, 60), "control": (300, 60),
    })
    with public_listener() as server:
        path = "/api/observations/searches"
        with socket.create_connection(server.server_address, timeout=3) as conn:
            conn.sendall(f"POST {path} HTTP/1.1\r\nHost: public.test\r\nContent-Type: application/json\r\n"
                         "Content-Length: 2\r\nContent-Length: 100\r\n\r\n{}".encode())
            assert b" 400 " in conn.recv(4096).splitlines()[0]
        for _ in range(2):
            assert request(server, path, body="{}")[0] == 400
        status, headers, _ = request(server, path, body="{}")
        assert status == 429 and int(headers["Retry-After"]) > 0
        assert request(server, "/healthz")[0] == 200


def test_public_body_read_deadline(monkeypatch):
    monkeypatch.setattr(local_server, "API_BODY_TIMEOUT", .1)
    with public_listener() as server:
        with socket.create_connection(server.server_address, timeout=3) as conn:
            conn.sendall(b"POST /api/observations/searches HTTP/1.1\r\nHost: public.test\r\n"
                         b"Content-Type: application/json\r\nContent-Length: 20\r\n\r\n{")
            assert b" 408 " in conn.recv(4096).splitlines()[0]


def test_redirect_policy_rejects_request_before_following_it():
    from skyshift.archive import ArchiveRedirects

    policy = ArchiveRedirects({"irsa.ipac.caltech.edu"})
    for destination in ("http://irsa.ipac.caltech.edu/", "https://localhost/",
                        "https://irsa.ipac.caltech.edu:444/", "https://user@irsa.ipac.caltech.edu/"):
        with pytest.raises(ValueError, match="unapproved"):
            policy.redirect_request(None, None, 302, "", {}, destination)
