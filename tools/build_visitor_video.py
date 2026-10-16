"""Encode an actual localhost application recording with disclosed computer narration.

No slide rendering or synthetic astronomical imagery. Raw recording is preserved.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import subprocess
import wave
import av
import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'output/video'
PRIVATE = ROOT/'tmp/visitor-demo-audio'
STEM = 'SKYSHIFT_Actual_Application_Walkthrough_0.4'


def timestamp(seconds):
    ms = round(seconds*1000)
    h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'


def build():
    capture = json.loads((OUT/'visitor-0.4-raw/recording.json').read_text(encoding='utf-8'))
    if capture.get('capture_status') != 'completed' or capture['page_errors'] or capture['external_requests'] or capture['planned_seconds'] != 180:
        raise ValueError('Recording must complete all eight scenes without page/network errors')
    scenes = json.loads((ROOT/'tools/visitor_demo_scenes.json').read_text(encoding='utf-8'))
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    rate = 22050
    sound = np.zeros(180*rate, dtype='<i2')
    captions = []; timings = []; cursor = 0
    for scene in scenes:
        source = PRIVATE/f"scene-{scene['id']}.wav"
        with wave.open(str(source), 'rb') as w:
            duration = w.getnframes()/w.getframerate()
        # Start after a short navigation pause, preserve natural speed where it fits.
        target = scene['seconds']-1.1
        speed = max(1.0, duration/target)
        if speed > 1.25:
            raise ValueError(f"Revise scene {scene['id']} narration rather than excessive acceleration")
        processed = PRIVATE/f"timed-{scene['id']}.wav"
        subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', str(source), '-af', f'atempo={speed}',
                        '-ar', str(rate), '-ac', '1', '-c:a', 'pcm_s16le', str(processed)], check=True)
        with wave.open(str(processed), 'rb') as w:
            samples = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2')
        start = cursor+.5; index = round(start*rate)
        if len(samples)/rate > target+.1:
            raise ValueError('Timed narration overruns its scene')
        sound[index:index+len(samples)] = samples
        sentences = re.split(r'(?<=[.!?])\s+', scene['narration'])
        words = sum(len(s.split()) for s in sentences); t = start
        for sentence in sentences:
            seconds = len(samples)/rate*len(sentence.split())/words
            captions.append(f'{len(captions)+1}\n{timestamp(t)} --> {timestamp(t+seconds)}\n{sentence}\n')
            t += seconds
        timings.append({'scene': scene['id'], 'start': cursor, 'seconds': scene['seconds'],
                        'original_narration_seconds': duration, 'narration_tempo': speed})
        cursor += scene['seconds']
    if cursor != 180:
        raise ValueError('Demo must use its recorded three-minute timeline')
    with wave.open(str(PRIVATE/'narration.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(sound.tobytes())
    srt = OUT/(STEM+'.srt'); srt.write_text('\n'.join(captions), encoding='utf-8')
    final = OUT/(STEM+'.mp4')
    if final.exists():
        raise FileExistsError('Preserve the existing video; use a new version for another edit')
    raw = ROOT/capture['raw_video']
    subprocess.run([ffmpeg, '-n', '-loglevel', 'error', '-i', str(raw), '-i', str(PRIVATE/'narration.wav'),
                    '-i', str(srt), '-map', '0:v:0', '-map', '1:a:0', '-map', '2:0',
                    '-vf', 'tpad=stop_mode=clone:stop_duration=1',
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p',
                    '-r', '25', '-c:a', 'aac', '-b:a', '128k', '-c:s', 'mov_text', '-t', '180',
                    '-metadata', 'title=SKYSHIFT actual local application walkthrough 0.4',
                    '-metadata', 'comment=Real localhost browser recording; automated interactions; generic Windows narration; no human presenter or usability study; scientific approval PENDING.',
                    '-metadata:s:s:0', 'language=eng', '-movflags', '+faststart', str(final)], check=True)
    frames = OUT/'visitor-0.4-qa'; frames.mkdir(exist_ok=True)
    with av.open(str(final)) as media:
        video = media.streams.video[0]; audio = media.streams.audio[0]
        metadata = {'created_at_utc': datetime.now(timezone.utc).isoformat(),
                    'duration_seconds': media.duration/av.time_base, 'video_frames': video.frames,
                    'fps': str(video.average_rate), 'width': video.width, 'height': video.height,
                    'video_codec': video.codec_context.name, 'audio_codec': audio.codec_context.name,
                    'subtitle_tracks': len(media.streams.subtitles), 'live_application_capture': True,
                    'human_presenter': False, 'independent_novice_validation': 'NOT CONDUCTED',
                    'final_frame_hold': 'End frame held as needed for the exact 180-second encode; no generated imagery',
                    'qualified_scientific_approval': 'PENDING', 'narration': 'generic installed Windows SAPI voice',
                    'caption_timing': 'approximate sentence timing within actual scene intervals',
                    'raw_capture_sha256': hashlib.sha256(raw.read_bytes()).hexdigest(),
                    'sha256': hashlib.sha256(final.read_bytes()).hexdigest(), 'scene_timings': timings}
        for t in [5, 26, 52, 78, 105, 129, 157, 175]:
            media.seek(int(t*av.time_base))
            # Seek returns an earlier keyframe; decode forward to the requested moment.
            frame = next(f for f in media.decode(video=0) if f.time >= t)
            frame.to_image().save(frames/f'frame-{t:03}.png')
    assert abs(metadata['duration_seconds']-180) < .1 and metadata['video_frames'] == 4500
    (OUT/'visitor_0.4_video_verification.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    (OUT/'Visitor_0.4_Recording_notes.md').write_text(
        '# Actual SKYSHIFT application walkthrough\n\n'
        'Three minutes of the real local website recorded in a fresh Chromium profile. All actions are scripted '
        'Playwright demonstration actions, not a human usability session. A capture-only pointer overlay indicates '
        'mouse position; no astronomical arrays or image detail were changed for the recording. Generic installed '
        'Windows narration, approximate sentence captions (embedded selectable English subtitles and sidecar SRT). '
        'No human presenter, independent novice evaluation, scientific sign-off or discovery is claimed. '
        'This is an application demonstration, not a claim of compliance with future competition video rules. '
        'Original project footage and 0.2/0.3 materials remain preserved unchanged.\n\n'
        'The final recorded frame is held briefly to fill the exact 180-second encoding timeline. '
        'Raw continuous WebM, action timeline, browser version and actual example export are in visitor-0.4-raw/. '
        'The annotation explicitly says DEMO QUESTION. Scientific approval is PENDING in the recorded application.\n\n'
        + '\n\n'.join(f"## {s['title']}\n\n{s['narration']}" for s in scenes)+'\n', encoding='utf-8')
    print(json.dumps(metadata, indent=2))


if __name__ == '__main__':
    build()
