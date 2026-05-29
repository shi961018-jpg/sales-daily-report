#!/usr/bin/env python3
"""Generate a site voiceover using an authorized reference voice sample.

The reference recording is used only for tone-color extraction. Its spoken
content is not copied into the generated website voiceover.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OPENVOICE_DIR = ROOT / "voice-tools" / "OpenVoice"
DEFAULT_SCRIPT = ROOT / "voiceover-script.txt"
DEFAULT_OUTPUT = ROOT / "generated-audio" / "site-voiceover.wav"


def convert_reference_to_wav(reference: Path, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    if reference.suffix.lower() == ".wav":
        return reference

    wav_path = output_dir / "reference-voice.wav"
    afconvert = shutil.which("afconvert")
    if not afconvert:
        raise RuntimeError("afconvert was not found; convert the reference audio to WAV first.")

    subprocess.run(
        [
            afconvert,
            "-f",
            "WAVE",
            "-d",
            "LEI16@24000",
            str(reference),
            str(wav_path),
        ],
        check=True,
    )
    return wav_path


def generate(script_path: Path, reference_path: Path, output_path: Path, speed: float) -> None:
    if not script_path.exists():
        raise FileNotFoundError(f"Script file not found: {script_path}")
    if not reference_path.exists():
        raise FileNotFoundError(f"Reference audio not found: {reference_path}")

    sys.path.insert(0, str(OPENVOICE_DIR))

    os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")

    import torch
    from melo.api import TTS
    from openvoice.api import ToneColorConverter

    # OpenVoice V2 is stable on CPU here; forcing CPU avoids MPS edge cases.
    device = "cpu"
    if torch.backends.mps.is_available():
        torch.backends.mps.is_available = lambda: False
    ckpt_converter = OPENVOICE_DIR / "checkpoints_v2" / "converter"
    base_speaker_se = OPENVOICE_DIR / "checkpoints_v2" / "base_speakers" / "ses" / "zh.pth"

    text = script_path.read_text(encoding="utf-8").replace("\n", " ").strip()

    tone_color_converter = ToneColorConverter(str(ckpt_converter / "config.json"), device=device)
    tone_color_converter.watermark_model = None
    tone_color_converter.load_ckpt(str(ckpt_converter / "checkpoint.pth"))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="voiceover-", dir=ROOT / "voice-tools") as temp_dir:
        temp_path = Path(temp_dir)
        reference_wav = convert_reference_to_wav(reference_path, temp_path)
        source_path = temp_path / "site-voiceover-base.wav"

        target_se = tone_color_converter.extract_se(str(reference_wav))

        tts = TTS(language="ZH", device=device)
        speaker_id = tts.hps.data.spk2id["ZH"]
        tts.tts_to_file(text, speaker_id, str(source_path), speed=speed, quiet=True)

        source_se = torch.load(str(base_speaker_se), map_location=device)
        tone_color_converter.convert(
            audio_src_path=str(source_path),
            src_se=source_se,
            tgt_se=target_se,
            output_path=str(output_path),
            message="sales-daily-report",
        )

    print(output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the website voiceover audio.")
    parser.add_argument("--script", type=Path, default=DEFAULT_SCRIPT)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--speed", type=float, default=1.04)
    args = parser.parse_args()

    generate(args.script, args.reference, args.output, args.speed)


if __name__ == "__main__":
    main()
