#!/usr/bin/env python3
"""
Generate SmartBLE miniapp visual assets through a ChatGPT2API OpenAI-compatible
image endpoint.

Required environment variables:
  CHATGPT2API_AUTH_KEY

Optional environment variables:
  CHATGPT2API_BASE_URL   default: https://c2a-files.i2kai.com/v1

Outputs:
  apps/uniapp/static/brand/about-hero.png
  apps/uniapp/static/share.png
  apps/uniapp/static/placeholders/*.png
  core/assets-generator/meta/images/generated/smartble-app-icon.png
"""

from __future__ import annotations

import base64
import json
import os
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Iterable

import requests
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
REFERENCE_ICON = ROOT / "core/assets-generator/meta/images/master_icon.png"
GENERATED_DIR = ROOT / "core/assets-generator/meta/images/generated"
UNIAPP_STATIC = ROOT / "apps/uniapp/static"
UNIAPP_BRAND = UNIAPP_STATIC / "brand"
UNIAPP_PLACEHOLDERS = UNIAPP_STATIC / "placeholders"


@dataclass(frozen=True)
class Job:
    name: str
    endpoint: str
    prompt: str
    output: Path
    request_size: str
    resize_to: tuple[int, int] | None = None
    use_reference: bool = True


def ensure_dirs() -> None:
    for path in [GENERATED_DIR, UNIAPP_BRAND, UNIAPP_PLACEHOLDERS]:
        path.mkdir(parents=True, exist_ok=True)


def auth_headers() -> dict[str, str]:
    auth_key = os.environ.get("CHATGPT2API_AUTH_KEY", "").strip()
    if not auth_key:
        raise SystemExit("CHATGPT2API_AUTH_KEY is required")
    return {"Authorization": f"Bearer {auth_key}"}


def api_base_url() -> str:
    return os.environ.get("CHATGPT2API_BASE_URL", "https://c2a-files.i2kai.com/v1").rstrip("/")


def decode_and_save_image(b64_payload: str, output: Path, resize_to: tuple[int, int] | None) -> None:
    image = Image.open(BytesIO(base64.b64decode(b64_payload))).convert("RGBA")
    if resize_to:
        image = image.resize(resize_to, Image.Resampling.LANCZOS)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)


def generate_edit(
    session: requests.Session,
    base_url: str,
    headers: dict[str, str],
    job: Job,
) -> dict:
    with REFERENCE_ICON.open("rb") as ref_file:
        files = {
            "image": (REFERENCE_ICON.name, ref_file, "image/png"),
        }
        data = {
            "model": "gpt-image-2",
            "prompt": job.prompt,
            "n": "1",
            "size": job.request_size,
            "response_format": "b64_json",
        }
        response = session.post(
            f"{base_url}/{job.endpoint}",
            headers=headers,
            data=data,
            files=files,
            timeout=420,
        )
    response.raise_for_status()
    return response.json()


def generate_generation(
    session: requests.Session,
    base_url: str,
    headers: dict[str, str],
    job: Job,
) -> dict:
    payload = {
        "model": "gpt-image-2",
        "prompt": job.prompt,
        "n": 1,
        "size": job.request_size,
        "response_format": "b64_json",
    }
    response = session.post(
        f"{base_url}/{job.endpoint}",
        headers={**headers, "Content-Type": "application/json"},
        data=json.dumps(payload),
        timeout=420,
    )
    response.raise_for_status()
    return response.json()


def generate_one(session: requests.Session, base_url: str, headers: dict[str, str], job: Job) -> None:
    print(f"\n==> {job.name}")
    payload = (
        generate_edit(session, base_url, headers, job)
        if job.use_reference
        else generate_generation(session, base_url, headers, job)
    )
    data = payload.get("data") or []
    if not data or "b64_json" not in data[0]:
        raise RuntimeError(f"Unexpected response for {job.name}: {json.dumps(payload)[:600]}")
    decode_and_save_image(data[0]["b64_json"], job.output, job.resize_to)
    print(f"saved -> {job.output}")


def jobs() -> Iterable[Job]:
    icon_prompt = (
        "Use the provided SmartBLE icon only as identity reference. Redesign it as a "
        "production-ready app icon for a cross-platform BLE toolkit. Keep one strong "
        "Bluetooth-inspired core symbol, wrapped by elegant scan rings and subtle node "
        "connections. Style: industrial but refined, electric blue, cyan glow, mist white, "
        "slate accents. Full-bleed background, no border, no text, no letters, no watermark, "
        "no phone mockup, no extra scenery. Modern 2D vector-like illustration, crisp "
        "silhouette, very readable at 48px."
    )
    return [
        Job(
            name="smartble app icon",
            endpoint="images/edits",
            prompt=icon_prompt,
            output=GENERATED_DIR / "smartble-app-icon.png",
            request_size="1024x1024",
        ),
        Job(
            name="smartble about hero",
            endpoint="images/edits",
            prompt=(
                "Use the provided SmartBLE icon only as brand identity reference. Create a "
                "horizontal hero illustration for a polished BLE toolkit miniapp. Show a "
                "glowing Bluetooth core in the center, surrounded by clean device panels, "
                "signal arcs, connected nodes, and subtle cross-platform equipment cues. "
                "Mood: electric control deck, precise, trustworthy, quietly impressive. "
                "Palette: electric blue, cyan, mist white, steel slate. Premium 2D illustration, "
                "minimal clutter, no text, no letters, no watermark, no UI screenshot, no phone "
                "mockup. Compose for a 3:2 cover image with generous safe margins."
            ),
            output=GENERATED_DIR / "smartble-about-hero.png",
            request_size="1536x1024",
            resize_to=(900, 600),
        ),
        Job(
            name="smartble share card",
            endpoint="images/edits",
            prompt=(
                "Use the provided SmartBLE icon only as brand identity reference. Create a "
                "high-contrast share card illustration for a BLE toolkit. Focus on one central "
                "glowing Bluetooth control emblem with orbiting radar rings, compact device nodes, "
                "and a clean blue atmospheric background. Keep the composition simple, bold, and "
                "memorable for social preview crops. No text, no letters, no watermark, no "
                "mockup, no screenshots."
            ),
            output=GENERATED_DIR / "smartble-share.png",
            request_size="1280x1024",
            resize_to=(1000, 800),
        ),
        Job(
            name="empty scan illustration",
            endpoint="images/generations",
            prompt=(
                "Create a square empty-state illustration for a BLE scanning page. Show a clean "
                "electric-blue radar scan with a central Bluetooth-inspired beacon, soft orbit lines, "
                "subtle discovery particles, and minimal technical depth. Industrial-refined 2D "
                "vector-like style, light background, no text, no watermark, no border."
            ),
            output=UNIAPP_PLACEHOLDERS / "empty_scan.png",
            request_size="1024x1024",
            resize_to=(320, 320),
            use_reference=False,
        ),
        Job(
            name="empty connected illustration",
            endpoint="images/generations",
            prompt=(
                "Create a square empty-state illustration for a BLE connected devices page. Show two "
                "clean device nodes linked by a glowing connection arc, with electric blue and mint "
                "accent colors, light technical background, and simple reassuring composition. "
                "Industrial-refined 2D vector-like style, no text, no watermark, no border."
            ),
            output=UNIAPP_PLACEHOLDERS / "empty_connected.png",
            request_size="1024x1024",
            resize_to=(320, 320),
            use_reference=False,
        ),
        Job(
            name="empty services illustration",
            endpoint="images/generations",
            prompt=(
                "Create a square empty-state illustration for a BLE services panel. Show a small "
                "structured graph of service blocks and linked characteristic nodes, with electric "
                "blue and cyan accents, light console background, and a precise minimal layout. "
                "Industrial-refined 2D vector-like style, no text, no watermark, no border."
            ),
            output=UNIAPP_PLACEHOLDERS / "empty_services.png",
            request_size="1024x1024",
            resize_to=(320, 320),
            use_reference=False,
        ),
        Job(
            name="empty log illustration",
            endpoint="images/generations",
            prompt=(
                "Create a square empty-state illustration for a BLE log panel. Show a clean telemetry "
                "console motif with stacked trace lines, timestamp-like dots, and a subtle glowing "
                "signal flow. Electric blue and slate palette, light technical background, minimal "
                "industrial-refined 2D vector-like style, no text, no watermark, no border."
            ),
            output=UNIAPP_PLACEHOLDERS / "empty_log.png",
            request_size="1024x1024",
            resize_to=(320, 320),
            use_reference=False,
        ),
    ]


def main() -> None:
    ensure_dirs()
    base_url = api_base_url()
    headers = auth_headers()
    session = requests.Session()
    for job in jobs():
        generate_one(session, base_url, headers, job)
    # Promote generated hero/share into uniapp runtime locations for immediate use
    copy_if_needed(GENERATED_DIR / "smartble-about-hero.png", UNIAPP_BRAND / "about-hero.png")
    copy_if_needed(GENERATED_DIR / "smartble-share.png", UNIAPP_STATIC / "share.png")
    print("\nall smartble assets generated")


def copy_if_needed(src: Path, dst: Path) -> None:
    if src.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(src.read_bytes())


if __name__ == "__main__":
    main()
