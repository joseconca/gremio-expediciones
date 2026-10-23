#!/usr/bin/env python3
"""Build review-only palette harmonization candidates without touching source assets."""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import statistics
from collections import Counter
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CLASSES = ("brujo", "cazador", "explorador")
SEXES = ("m", "f")
ACTIONS = ("walk", "hurt")
STRIP_SIZE = (256, 128)
CELL_SIZE = (64, 128)
NATIVE_SIZE = (32, 64)
PALETTE_LIMIT = 192

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def open_rgba(path: Path) -> Image.Image:
    if not path.is_file():
        raise FileNotFoundError(f"Missing review input: {path.relative_to(ROOT)}")
    with Image.open(path) as image:
        return image.convert("RGBA")

def load_frames(cls: str, sex: str, action: str):
    sex_root = ROOT / "assets/spritesheets/originales" / cls / "v2/rework-staging" / sex
    qa_path = sex_root / f"{action}-right-4f.qa.json"
    report = json.loads(qa_path.read_text(encoding="utf-8"))
    meta = report.get("nativeFrames", {})
    width, height, rel = meta.get("width"), meta.get("height"), meta.get("path")
    if not rel or meta.get("count") != 4:
        raise ValueError(f"{qa_path.relative_to(ROOT)} does not declare four frames")
    if (width, height) == (128, 64):
        source = sex_root / rel
        strip = open_rgba(source)
        if strip.size != (128, 64):
            raise ValueError(f"Bad native size at {source.relative_to(ROOT)}: {strip.size}")
        frames = [strip.crop((i * 32, 0, (i + 1) * 32, 64)) for i in range(4)]
        return frames, source
    if (width, height) == NATIVE_SIZE:
        directory = sex_root / rel
        frames = []
        for i in range(1, 5):
            name = f"{cls}-{sex}-{action}-{i:02d}.png"
            source = next((p for p in (directory / name, directory / sex / name) if p.is_file()), None)
            if source is None:
                raise FileNotFoundError(f"Missing native frame {name}")
            frame = open_rgba(source)
            if frame.size != NATIVE_SIZE:
                raise ValueError(f"Bad native size at {source.relative_to(ROOT)}: {frame.size}")
            frames.append(frame)
        return frames, directory
    raise ValueError(f"Unsupported native format {width}x{height} in {qa_path.relative_to(ROOT)}")

def expand(frames):
    strip = Image.new("RGBA", STRIP_SIZE, (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        strip.paste(frame.resize(CELL_SIZE, Image.Resampling.NEAREST), (i * 64, 0))
    return strip

def palette_from(frames):
    counts = Counter((r, g, b) for frame in frames for r, g, b, a in frame.getdata() if a > 0)
    return [rgb for rgb, _ in counts.most_common(PALETTE_LIMIT)]

def map_frame(frame, palette):
    pixels = list(frame.convert("RGBA").getdata())
    unique = {(r, g, b) for r, g, b, a in pixels if a > 0}
    lut = {}
    for rgb in unique:
        lut[rgb] = min(palette, key=lambda c: sum((rgb[k] - c[k]) ** 2 for k in range(3)))
    changed = visible = 0
    mapped = []
    rgb_distances = []
    candidate_colours = set()
    for r, g, b, a in pixels:
        if a == 0:
            mapped.append((r, g, b, a))
        else:
            visible += 1
            colour = lut[(r, g, b)]
            changed += int(colour != (r, g, b))
            candidate_colours.add(colour)
            rgb_distances.append(math.sqrt(sum((channel - colour[index]) ** 2 for index, channel in enumerate((r, g, b)))))
            mapped.append((*colour, a))
    result = Image.new("RGBA", frame.size)
    result.putdata(mapped)
    ordered_distances = sorted(rgb_distances)
    p95_index = max(0, math.ceil(0.95 * len(ordered_distances)) - 1) if ordered_distances else 0
    metrics = {
        "mean_rgb_distance": round(statistics.mean(rgb_distances), 3) if rgb_distances else 0,
        "p95_rgb_distance": round(ordered_distances[p95_index], 3) if ordered_distances else 0,
        "max_rgb_distance": round(max(rgb_distances), 3) if rgb_distances else 0,
        "candidate_unique_visible_colours": len(candidate_colours),
    }
    return result, changed, visible, len(unique), metrics

def native_strip(frames):
    result = Image.new("RGBA", (128, 64), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        result.paste(frame, (i * 32, 0))
    return result

def median_rgb(image):
    pixels = [(r, g, b) for r, g, b, a in image.getdata() if a > 0]
    if not pixels:
        return None
    return [int(statistics.median(ch)) for ch in zip(*pixels)]

def comparison_board(cls, sex, idle, action_outputs, output):
    scale = 2
    labels = ("IDLE · PALETA BASE", "ORIGINAL", "CANDIDATO")
    cell_w, cell_h = 512, 256
    margin, label_h = 12, 24
    canvas = Image.new("RGBA", (3 * cell_w + 4 * margin, 2 * (cell_h + label_h + margin) + 42), (35, 37, 43, 255))
    draw = ImageDraw.Draw(canvas)
    draw.text((margin, 5), f"{cls.upper()} / {'MASCULINO' if sex == 'm' else 'FEMENINO'} — SOLO REVISIÓN", fill=(243, 210, 133, 255))
    y = 30
    for action in ACTIONS:
        original, candidate = action_outputs[action]
        for col, (label, image) in enumerate(zip(labels, (idle, original, candidate))):
            x = margin + col * (cell_w + margin)
            draw.text((x, y), label if col else f"{label} ({action.upper()})", fill=(214, 218, 226, 255))
            canvas.alpha_composite(image.resize((cell_w, cell_h), Image.Resampling.NEAREST), (x, y + label_h))
        y += label_h + cell_h + margin
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output, optimize=True)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="artifacts/tier2-palette-review")
    args = parser.parse_args()
    output = ROOT / args.output_dir
    summary = {
        "purpose": "review-only palette candidates",
        "runtime_modified": False,
        "original_staging_modified": False,
        "method": "Map visible RGB pixels in Walk/Hurt to the nearest colour in the same class/sex Idle native palette. Preserve alpha; never overwrite existing assets.",
        "candidates": [],
    }
    for cls in CLASSES:
        for sex in SEXES:
            idle_frames, _ = load_frames(cls, sex, "idle")
            anchor = expand(idle_frames)
            palette = palette_from(idle_frames)
            results = {}
            for action in ACTIONS:
                frames, source = load_frames(cls, sex, action)
                candidate_frames = []
                changed = total = 0
                source_colour_count = 0
                frame_distance_metrics = []
                alpha_mask_identical = True
                silhouette_bounds_preserved = True
                for frame in frames:
                    candidate, n_changed, n_visible, n_colours, distance_metrics = map_frame(frame, palette)
                    candidate_frames.append(candidate)
                    changed += n_changed
                    total += n_visible
                    source_colour_count += n_colours
                    frame_distance_metrics.append(distance_metrics)
                    alpha_mask_identical = alpha_mask_identical and frame.getchannel("A").tobytes() == candidate.getchannel("A").tobytes()
                    silhouette_bounds_preserved = silhouette_bounds_preserved and frame.getchannel("A").getbbox() == candidate.getchannel("A").getbbox()
                original_strip = expand(frames)
                candidate_strip = expand(candidate_frames)
                folder = output / cls / sex
                folder.mkdir(parents=True, exist_ok=True)
                original_path = folder / f"{action}-original.png"
                candidate_path = folder / f"{action}-palette-candidate.png"
                native_path = folder / f"{action}-native-palette-candidate.png"
                original_strip.save(original_path, optimize=True)
                candidate_strip.save(candidate_path, optimize=True)
                native_strip(candidate_frames).save(native_path, optimize=True)
                report = {
                    "class": cls, "sex": sex, "action": action,
                    "source": str(source.relative_to(ROOT)),
                    "source_sha256": digest(source) if source.is_file() else None,
                    "idle_palette_size": len(palette),
                    "input_unique_colour_counts_summed": source_colour_count,
                    "visible_pixels_remapped": changed,
                    "visible_pixels_total": total,
                    "remapped_pixel_pct": round(100 * changed / total, 2) if total else 0,
                    "mean_rgb_distance": round(statistics.mean(m["mean_rgb_distance"] for m in frame_distance_metrics), 3),
                    "p95_rgb_distance": max(m["p95_rgb_distance"] for m in frame_distance_metrics),
                    "max_rgb_distance": max(m["max_rgb_distance"] for m in frame_distance_metrics),
                    "candidate_unique_visible_colours": max(m["candidate_unique_visible_colours"] for m in frame_distance_metrics),
                    "source_frame_unique_visible_colours_sum": source_colour_count,
                    "alpha_mask_identical": alpha_mask_identical,
                    "silhouette_bounds_preserved": silhouette_bounds_preserved,
                    "remapped_pixel_pct_semantics": "percentage of visible pixels whose exact RGB triplet changed; not a perceptual-change metric",
                    "original_median_rgb": median_rgb(original_strip),
                    "candidate_median_rgb": median_rgb(candidate_strip),
                    "runtime_approved": False,
                    "promoted_to_staging": False,
                    "note": "Candidate only. Review skin tones, fabric highlights, material separation, silhouette and class identity before any promotion.",
                }
                (folder / f"{action}-palette-review.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                results[action] = (original_strip, candidate_strip)
                summary["candidates"].append({
                    "class": cls, "sex": sex, "action": action,
                    "idle_palette_size": len(palette),
                    "remapped_pixel_pct": report["remapped_pixel_pct"],
                    "mean_rgb_distance": report["mean_rgb_distance"],
                    "p95_rgb_distance": report["p95_rgb_distance"],
                    "alpha_mask_identical": report["alpha_mask_identical"],
                    "silhouette_bounds_preserved": report["silhouette_bounds_preserved"],
                    "candidate": str(candidate_path.relative_to(ROOT)),
                })
            comparison_board(cls, sex, anchor, results, output / "boards" / f"{cls}-{sex}-palette-comparison.png")
    output.mkdir(parents=True, exist_ok=True)
    (output / "README.md").write_text(
        "# Tier 2 palette comparison candidates\n\n"
        "These boards compare each original Walk/Hurt strip with a non-destructive candidate mapped to the class/sex Idle palette. "
        "Source assets are unchanged. The candidate is not approved for staging or runtime; it exists to support the global art-direction pass.\n",
        encoding="utf-8",
    )
    (output / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(summary['candidates'])} non-destructive palette candidates in {output.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
