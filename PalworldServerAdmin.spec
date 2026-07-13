# -*- mode: python ; coding: utf-8 -*-
#
# Builds two executables from the same desktop_app.py entry point, differing
# only in whether a console window is allocated:
#   - PalworldServerAdmin.exe (console=True): default, visible console.
#   - PalworldServerAdminSilent.exe (console=False): no console ever.
#
# console=True/False is a build-time PyInstaller setting - it can't be
# flipped at runtime for an already-built exe. Trying to hide/relaunch an
# existing console at runtime (tried in TICKET-0116/0117/0118) proved
# unreliable in practice; shipping both variants and letting the installer
# (or the user, by choosing which shortcut to use) pick the real, natively
# console-less build is the officially-supported, zero-hack mechanism.

a = Analysis(
    ['desktop_app.py'],
    pathex=[],
    binaries=[],
    datas=[('web/dist', 'web/dist')],
    hiddenimports=['uvicorn.loops.auto', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespan.on', 'uvicorn.logging'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='PalworldServerAdmin',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

exe_silent = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='PalworldServerAdminSilent',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
