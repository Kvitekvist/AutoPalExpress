import uvicorn

if __name__ == "__main__":
    # 0.0.0.0 so this is reachable from the LAN/internet (behind login now),
    # not just this machine - that's what lets friends admin it remotely.
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
