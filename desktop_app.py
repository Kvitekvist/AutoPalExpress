"""Entry point for the packaged (PyInstaller) build. Starts the backend and
opens the default browser to it - the whole app is one process on one port,
since app/main.py also serves the built frontend when it's present.
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


def _apply_run_silently() -> None:
    """Hides this process's own console window if Super Admin's "Run
    Silently" toggle is on. Applied once at startup, same as the equivalent
    Palworld-side launch flag (process_manager._run_silently_enabled) -
    hiding the window doesn't affect the already-teed stdout/stderr handles,
    so backend.log and the Logs page keep working either way."""
    if sys.platform != "win32":
        return
    try:
        from app.services import system_settings

        if not system_settings.get_config().get("runSilently"):
            return
        import ctypes

        hwnd = ctypes.windll.kernel32.GetConsoleWindow()
        if hwnd:
            ctypes.windll.user32.ShowWindow(hwnd, 0)  # SW_HIDE
    except Exception:
        traceback.print_exc()


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
    _tee_console_streams()
    _apply_run_silently()

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
