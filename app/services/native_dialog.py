"""Opens a native Windows folder picker. The admin backend and its web UI
always run on the same machine, so a server-side dialog is a legitimate
stand-in for a browser folder picker (browsers can't expose real filesystem
paths to a page).
"""

import logging

logger = logging.getLogger("palworld_admin.native_dialog")


def pick_folder(title: str, initial_dir: str | None = None) -> str | None:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError:
        logger.warning("pick_folder: tkinter unavailable, cannot show a native dialog")
        return None

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    try:
        selected = filedialog.askdirectory(title=title, initialdir=initial_dir or None, mustexist=True)
    finally:
        root.destroy()
    return selected or None
