"""Entry point for the packaged (PyInstaller) build. Starts the backend and
opens the default browser to it - the whole app is one process on one port,
since app/main.py also serves the built frontend when it's present.
"""

import os
import socket
import subprocess
import sys
import threading
import time
import traceback
import webbrowser

_SILENT_RELAUNCH_ENV = "_AUTOPALEXPRESS_SILENT_RELAUNCH"


BIND_HOST = "0.0.0.0"
LOCAL_HOST = "127.0.0.1"
PORT = 8000


class _Tee:
    def __init__(self, *streams):
        self._streams = [stream for stream in streams if stream is not None]
        self._primary = self._streams[0] if self._streams else None

    def write(self, text: str) -> int:
        for stream in self._streams:
            stream.write(text)
            stream.flush()
        return len(text)

    def flush(self) -> None:
        for stream in self._streams:
            stream.flush()

    def isatty(self) -> bool:
        return bool(self._primary and self._primary.isatty())

    def fileno(self) -> int:
        if not self._primary:
            raise OSError("No console stream available.")
        return self._primary.fileno()

    @property
    def encoding(self) -> str | None:
        return getattr(self._primary, "encoding", None)

    @property
    def errors(self) -> str | None:
        return getattr(self._primary, "errors", None)

    def __getattr__(self, name: str):
        if not self._primary:
            raise AttributeError(name)
        return getattr(self._primary, name)


def _tee_console_streams() -> None:
    """Keep the packaged console visible and also copy stdout/stderr into
    backend.log so the Logs page can show AutoPalExpress' own output."""
    from app.paths import data_dir

    try:
        log_path = data_dir() / "backend.log"
        log_file = open(log_path, "a", encoding="utf-8", buffering=1)
    except OSError:
        import io

        log_file = io.StringIO()
    sys.stdout = _Tee(sys.stdout, log_file)
    sys.stderr = _Tee(sys.stderr, log_file)


def _relaunch_silently_if_needed() -> bool:
    """If Super Admin's "Run Silently" toggle is on, spawns a detached copy
    of this same process with CREATE_NO_WINDOW and returns True so the
    caller exits immediately, instead of trying to hide this process's own
    already-visible console window in place.

    Hiding an existing console via ShowWindow(hwnd, SW_HIDE) turned out not
    to be reliable in practice - confirmed live that it can leave the window
    minimized in the taskbar rather than truly gone (Windows Terminal in
    particular manages its own window somewhat independently of the classic
    console HWND). CREATE_NO_WINDOW prevents a console from ever being
    allocated in the first place, which is the same mechanism already
    proven reliable for hiding Palworld's own window
    (process_manager._run_silently_enabled) - relaunching as a fresh process
    with that flag set is the only way to get it for a process whose console
    already exists by the time our own code starts running."""
    if sys.platform != "win32":
        return False
    if os.environ.get(_SILENT_RELAUNCH_ENV) == "1":
        return False  # already the silent relaunch - don't loop
    try:
        from app.services import system_settings

        if not system_settings.get_config().get("runSilently"):
            return False

        env = {**os.environ, _SILENT_RELAUNCH_ENV: "1"}
        subprocess.Popen(
            [sys.executable, *sys.argv[1:]],
            creationflags=subprocess.CREATE_NO_WINDOW,
            env=env,
            close_fds=True,
        )
        return True
    except Exception:
        traceback.print_exc()
        return False


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
    if _relaunch_silently_if_needed():
        return  # the detached, windowless relaunch takes over from here

    _tee_console_streams()

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
        traceback.print_exc()
        from app.paths import data_dir

        _show_startup_error(
            "Palworld Server Admin couldn't start.\n\n"
            f"Details were written to:\n{data_dir() / 'backend.log'}"
        )
        raise


if __name__ == "__main__":
    main()
