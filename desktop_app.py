"""Entry point for the packaged (PyInstaller) build. Starts the backend and
opens the default browser to it - the whole app is one process on one port,
since app/main.py also serves the built frontend when it's present. Runs
windowed (no console - see PalworldServerAdmin.spec's console=False): the
browser tab this opens is the only UI a user ever needs to see.
"""

import socket
import sys
import threading
import time
import traceback
import webbrowser


BIND_HOST = "0.0.0.0"
LOCAL_HOST = "127.0.0.1"
PORT = 8000


def _redirect_console_streams() -> None:
    """A windowed build has no console, so sys.stdout/sys.stderr are None -
    anything that writes to them (print(), the logging module's default
    handler, uvicorn's own internal logging) would crash the instant it's
    used. Redirect both to a real log file instead, so all of that keeps
    working without reconfiguring each of them individually. Must run before
    uvicorn.run() sets up its own logging, which resolves "ext://sys.stderr"
    against whatever sys.stderr is at that point."""
    from app.paths import data_dir

    try:
        log_path = data_dir() / "backend.log"
        log_file = open(log_path, "a", encoding="utf-8", buffering=1)
    except OSError:
        import io

        log_file = io.StringIO()
    sys.stdout = log_file
    sys.stderr = log_file


def _show_startup_error(message: str) -> None:
    try:
        import ctypes

        ctypes.windll.user32.MessageBoxW(0, message, "Palworld Server Admin", 0x10)
    except Exception:
        pass


def _port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def main() -> None:
    _redirect_console_streams()

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

    try:
        import uvicorn

        from app.main import app

        uvicorn.run(app, host=BIND_HOST, port=PORT, log_level="info")
    except Exception:
        traceback.print_exc()  # goes to the redirected log file
        from app.paths import data_dir

        _show_startup_error(
            "Palworld Server Admin couldn't start.\n\n"
            f"Details were written to:\n{data_dir() / 'backend.log'}"
        )
        raise


if __name__ == "__main__":
    main()
