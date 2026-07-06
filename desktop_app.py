"""Entry point for the packaged (PyInstaller) build. Starts the backend and
opens the default browser to it - the whole app is one process on one port,
since app/main.py also serves the built frontend when it's present.
"""

import socket
import threading
import time
import webbrowser

import uvicorn

# Bind all interfaces so this is reachable from the LAN/internet (behind
# login now) for remote admins, not just this machine. Local liveness
# checks/browser-open still target 127.0.0.1, which always works regardless
# of what interface the server is actually bound to.
BIND_HOST = "0.0.0.0"
LOCAL_HOST = "127.0.0.1"
PORT = 8000


def _port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def main() -> None:
    url = f"http://{LOCAL_HOST}:{PORT}/"

    if _port_in_use(LOCAL_HOST, PORT):
        # Already running (e.g. the user launched the app twice) - just open it.
        webbrowser.open(url)
        return

    def open_browser_when_ready() -> None:
        for _ in range(60):
            if _port_in_use(LOCAL_HOST, PORT):
                webbrowser.open(url)
                return
            time.sleep(0.25)

    threading.Thread(target=open_browser_when_ready, daemon=True).start()

    from app.main import app

    uvicorn.run(app, host=BIND_HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()
