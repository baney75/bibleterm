#!/usr/bin/env python3

import math
import subprocess
import sys
from pathlib import Path

import numpy as np


def decode_rgba(path: Path) -> np.ndarray:
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0:s=x",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    width, height = map(int, probe.stdout.strip().split("x"))

    raw = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(path),
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "-",
        ],
        check=True,
        capture_output=True,
    ).stdout

    frame = np.frombuffer(raw, dtype=np.uint8).reshape((height, width, 4)).copy()
    return frame


def encode_rgba(image: np.ndarray, path: Path) -> None:
    height, width, _ = image.shape
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "-s",
            f"{width}x{height}",
            "-i",
            "-",
            str(path),
        ],
        check=True,
        input=image.tobytes(),
    )


def key_green(image: np.ndarray) -> np.ndarray:
    rgb = image[:, :, :3].astype(np.float32)
    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]

    dominance = green - np.maximum(red, blue)
    intensity = np.clip((green - 110.0) / 80.0, 0.0, 1.0)
    background = np.clip((dominance - 16.0) / 90.0, 0.0, 1.0) * intensity

    alpha = (1.0 - background) * (image[:, :, 3].astype(np.float32) / 255.0)
    alpha[alpha < 0.05] = 0.0
    alpha = np.clip(alpha, 0.0, 1.0)

    keyed = image.copy()
    keyed[:, :, 3] = np.round(alpha * 255.0).astype(np.uint8)
    return keyed


def crop_to_alpha(image: np.ndarray, padding: int = 96) -> np.ndarray:
    alpha = image[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0 or len(ys) == 0:
        return image

    min_x = max(0, int(xs.min()) - padding)
    max_x = min(image.shape[1], int(xs.max()) + padding + 1)
    min_y = max(0, int(ys.min()) - padding)
    max_y = min(image.shape[0], int(ys.max()) + padding + 1)
    return image[min_y:max_y, min_x:max_x]


def make_square(image: np.ndarray, padding: int = 96) -> np.ndarray:
    height, width, _ = image.shape
    size = max(height, width) + padding * 2
    square = np.zeros((size, size, 4), dtype=np.uint8)
    y = (size - height) // 2
    x = (size - width) // 2
    square[y : y + height, x : x + width] = image
    return square


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: prepare_branding.py <input.png> <output-dir>", file=sys.stderr)
        raise SystemExit(1)

    input_path = Path(sys.argv[1]).expanduser().resolve()
    output_dir = Path(sys.argv[2]).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    decoded = decode_rgba(input_path)
    keyed = key_green(decoded)
    cropped = crop_to_alpha(keyed)
    square = make_square(cropped)

    encode_rgba(keyed, output_dir / "bterm-logo-transparent-full.png")
    encode_rgba(cropped, output_dir / "bterm-logo-transparent.png")
    encode_rgba(square, output_dir / "bterm-logo-square.png")

    print(f"wrote: {output_dir / 'bterm-logo-transparent-full.png'}")
    print(f"wrote: {output_dir / 'bterm-logo-transparent.png'}")
    print(f"wrote: {output_dir / 'bterm-logo-square.png'}")


if __name__ == "__main__":
    main()
