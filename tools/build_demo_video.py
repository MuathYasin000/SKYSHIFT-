"""Deterministic three-minute screen-based walkthrough, with generic local TTS."""
from pathlib import Path
from fractions import Fraction
from hashlib import sha256
import json,wave,re,subprocess
import av,numpy as np
from PIL import Image,ImageDraw,ImageFont
import imageio_ffmpeg

root=Path(__file__).resolve().parents[1];scenes=json.loads((root/'tools/demo_scenes.json').read_text())
out=root/'output/video';out.mkdir(parents=True,exist_ok=True);private=root/'tmp/demo-audio'
pieces=[];durations=[];sample_rate=None
for scene in scenes:
    with wave.open(str(private/f"scene-{scene['slide']}.wav"),'rb') as f:
        if f.getsampwidth()!=2 or f.getnchannels()!=1:raise ValueError('Expected PCM16 mono narration')
        if sample_rate not in (None,f.getframerate()):raise ValueError('Inconsistent narration rates')
        sample_rate=f.getframerate();data=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').copy()
    pause=np.zeros(round(sample_rate*.8),dtype='<i2');pieces.extend([data,pause]);durations.append((len(data)+len(pause))/sample_rate)
raw=np.concatenate(pieces)
with wave.open(str(private/'narration-raw.wav'),'wb') as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(sample_rate);f.writeframes(raw.tobytes())
source_duration=len(raw)/sample_rate;speed=source_duration/180
if not .5<=speed<=2:raise ValueError('Narration duration requires script revision rather than extreme time scaling')
starts=np.cumsum([0,*durations])/speed
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(private/'narration-raw.wav'),'-af',f'atempo={speed},apad','-t','180',str(private/'narration-180.wav')],check=True)

font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
images=[]
for scene in scenes:
    image=Image.open(root/f"tmp/slides/renders/slide-{scene['slide']:02d}.png").convert('RGB')
    if scene['slide']==1:
        draw=ImageDraw.Draw(image);draw.text((73,650),'Screen-based walkthrough / actual screenshots and diagnostics / computer narration',font=font,fill='#A2BCC7')
    images.append(np.asarray(image))
video_only=private/'video-only.mp4'
container=av.open(str(video_only),'w');stream=container.add_stream('libx264',rate=12);stream.width=1280;stream.height=720;stream.pix_fmt='yuv420p';stream.options={'crf':'20','preset':'fast'}
for i in range(180*12):
    index=min(len(scenes)-1,int(np.searchsorted(starts,i/12,side='right')-1))
    frame=av.VideoFrame.from_ndarray(images[index],format='rgb24');frame.pts=i;frame.time_base=Fraction(1,12)
    for packet in stream.encode(frame):container.mux(packet)
for packet in stream.encode():container.mux(packet)
container.close()
final=out/'SKYSHIFT_Three_Minute_Walkthrough_0.2_final.mp4'
subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(video_only),'-i',str(private/'narration-180.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-t','180','-movflags','+faststart',str(final)],check=True)

def stamp(t):
    ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000);return f'{h:02}:{m:02}:{s:02},{ms:03}'
captions=[];number=1
for i,scene in enumerate(scenes):
    sentences=re.split(r'(?<=[.!?])\s+',scene['narration']);words=sum(len(s.split()) for s in sentences);cursor=float(starts[i]);speaking=(durations[i]-.8)/speed
    for sentence in sentences:
        duration=speaking*len(sentence.split())/words
        # Sidecar captions follow the scene's narration. Sentence boundaries are approximate.
        captions.append(f'{number}\n{stamp(cursor)} --> {stamp(cursor+duration)}\n{sentence}\n');number+=1;cursor+=duration
(out/'SKYSHIFT_Walkthrough_0.2.srt').write_text('\n'.join(captions),encoding='utf-8')
(out/'Narration_and_sources.md').write_text('# SKYSHIFT walkthrough\n\n180-second screen-based walkthrough using actual deployed screenshots, measured diagnostics and the verified release deck. Narration uses a generic installed Windows computer voice, not a team member or reviewer. No live screen recording or astronomical finding is implied. Sidecar captions have approximate sentence timing.\n\n'+
    '\n\n'.join(f"## Scene {s['slide']}\n\n{s['narration']}" for s in scenes)+'\n\nSources: m101-review-v6.zip, docs/evidence, exact production source commit 6807f11336594c2182f8251246427f48b8c775f8. Scientific and internal human review PENDING.\n',encoding='utf-8')
with av.open(str(final)) as check:
    video=check.streams.video[0];audio=check.streams.audio[0]
    metadata={'duration_seconds':check.duration/av.time_base,'video_frames':video.frames,'fps':str(video.average_rate),'width':video.width,'height':video.height,'audio_codec':audio.codec_context.name,
        'source_narration_seconds':source_duration,'audio_tempo_factor':speed,'sha256':sha256(final.read_bytes()).hexdigest(),'size_bytes':final.stat().st_size,'scientific_approval':'PENDING','method':'Actual screenshot/diagnostic slide walkthrough, generic local computer narration; no live-recording claim'}
    for time in (0,25,60,100,140,175):
        check.seek(int(time*av.time_base))
        next(check.decode(video=0)).to_image().save(private/f'qa-{time}.png')
(out/'video_verification.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
assert abs(metadata['duration_seconds']-180)<.1 and metadata['video_frames']==2160
print(json.dumps(metadata,indent=2))
