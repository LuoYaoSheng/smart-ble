import asyncio


async def reconnect(should_continue, connect, sleep=asyncio.sleep):
    """Three owned attempts; manual disconnect/device-generation changes stop recovery."""
    for delay in (1, 3, 5):
        await sleep(delay)
        if not should_continue():
            return False
        try:
            await connect()
        except Exception:
            continue
        return True
    return False
