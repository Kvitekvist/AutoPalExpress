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


_MB_ICONERROR = 0x10
_MB_ICONINFORMATION = 0x40
_MB_ICONQUESTION = 0x20
_MB_YESNO = 0x4
_IDYES = 6


def _show_message_box(message: str, icon: int = _MB_ICONERROR) -> None:
    try:
        import ctypes

        ctypes.windll.user32.MessageBoxW(0, message, "AutoPalExpress", icon)
    except Exception:
        pass


def _ask_yes_no(message: str) -> bool:
    """Real Yes/No native dialog. Closing it (Escape/the X button) is treated
    as No by Windows itself when there's no separate Cancel button - the
    safer default here, since it leaves existing data untouched either way."""
    try:
        import ctypes

        result = ctypes.windll.user32.MessageBoxW(
            0, message, "AutoPalExpress", _MB_YESNO | _MB_ICONQUESTION
        )
        return result == _IDYES
    except Exception:
        return False


def _port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def _offer_legacy_data_migration() -> None:
    """Runs once per install (see documents_data_dir()'s docstring): if the
    current Documents-based data folder doesn't exist yet and real data from
    an older version is found, asks the user whether to bring it forward
    rather than migrating automatically and silently."""
    from app import paths

    if paths.documents_data_dir().exists():
        return

    legacy_dir = paths.detect_legacy_data_dir()
    if legacy_dir is None:
        return

    migrate = _ask_yes_no(
        "AutoPalExpress found existing data from a previous install:\n\n"
        f"{legacy_dir}\n\n"
        "Move it into your Documents folder and keep your existing servers, accounts, and mods?\n\n"
        "Choose \"No\" to leave that data where it is and start with a brand new, empty setup instead."
    )
    if migrate:
        new_dir = paths.migrate_data_dir(legacy_dir)
        _show_message_box(
            "Your existing data was moved to:\n\n"
            f"{new_dir}\n\n"
            "Everything was carried over automatically.",
            icon=_MB_ICONINFORMATION,
        )
    else:
        # Explicitly create the (empty) Documents data folder now, so
        # documents_data_dir().exists() is True on the next launch and this
        # isn't asked again - the old data is left completely untouched.
        paths.data_dir()


def main() -> None:
    _offer_legacy_data_migration()
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

        _show_message_box(
            "AutoPalExpress couldn't start.\n\n"
            f"Details were written to:\n{data_dir() / 'backend.log'}"
        )
        raise


if __name__ == "__main__":
    main()
