"""Render the verified local release update, with disclosed generic narration."""
from pathlib import Path
from fractions import Fraction
import hashlib,json,re,subprocess,wave
import av,numpy as np
from PIL import Image,ImageDraw,ImageFont
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]
PRIVATE=ROOT/'tmp/local-demo-audio'
OUT=ROOT/'output/video'
TARGET_SECONDS=180
STEM='SKYSHIFT_Local_Engineering_Update_0.3'

def timestamp(t):
    ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'

def build():
    OUT.mkdir(parents=True,exist_ok=True)
    scenes=json.loads((ROOT/'tools/local_demo_scenes.json').read_text(encoding='utf-8'))
    pieces=[];durations=[];rate=None
    for scene in scenes:
        with wave.open(str(PRIVATE/f"scene-{scene['slide']}.wav"),'rb') as f:
            if f.getsampwidth()!=2 or f.getnchannels()!=1:raise ValueError('Expected PCM16 mono narration')
            if rate not in (None,f.getframerate()):raise ValueError('Inconsistent sample rates')
            rate=f.getframerate();data=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2')
        pause=np.zeros(round(rate*.8),dtype='<i2');pieces.extend([data,pause]);durations.append((len(data)+len(pause))/rate)
    raw=np.concatenate(pieces);source_seconds=len(raw)/rate;speed=source_seconds/TARGET_SECONDS
    if not .5<=speed<=2:raise ValueError('Revise narration before extreme time scaling')
    with wave.open(str(PRIVATE/'raw.wav'),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(raw.tobytes())
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(PRIVATE/'raw.wav'),'-af',f'atempo={speed},apad','-t',str(TARGET_SECONDS),str(PRIVATE/'narration.wav')],check=True)
    starts=np.cumsum([0,*durations])/speed;images=[]
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
    for scene in scenes:
        im=Image.open(ROOT/f"tmp/slides-local-0.3/renders/slide-{scene['slide']:02}.png").convert('RGB')
        if scene['slide']==1:ImageDraw.Draw(im).text((74,18),'Screenshot-based release update / actual local application / generic computer narration',font=font,fill='#B9CBE4')
        images.append(np.asarray(im))
    container=av.open(str(PRIVATE/'silent.mp4'),'w');stream=container.add_stream('libx264',rate=12)
    stream.width=1280;stream.height=720;stream.pix_fmt='yuv420p';stream.options={'crf':'20','preset':'fast'}
    for i in range(TARGET_SECONDS*12):
        index=min(len(scenes)-1,int(np.searchsorted(starts,i/12,side='right')-1))
        frame=av.VideoFrame.from_ndarray(images[index],format='rgb24');frame.pts=i;frame.time_base=Fraction(1,12)
        for packet in stream.encode(frame):container.mux(packet)
    for packet in stream.encode():container.mux(packet)
    container.close();final=OUT/(STEM+'.mp4')
    subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(PRIVATE/'silent.mp4'),'-i',str(PRIVATE/'narration.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-t',str(TARGET_SECONDS),'-movflags','+faststart',str(final)],check=True)
    captions=[];number=1
    for i,scene in enumerate(scenes):
        sentences=re.split(r'(?<=[.!?])\s+',scene['narration']);words=sum(len(s.split()) for s in sentences);cursor=float(starts[i]);speaking=(durations[i]-.8)/speed
        for sentence in sentences:
            duration=speaking*len(sentence.split())/words;captions.append(f'{number}\n{timestamp(cursor)} --> {timestamp(cursor+duration)}\n{sentence}\n');number+=1;cursor+=duration
    (OUT/(STEM+'.srt')).write_text('\n'.join(captions),encoding='utf-8')
    (OUT/'Local_0.3_Narration_and_sources.md').write_text('# SKYSHIFT local release update\n\n180-second screenshot/diagnostic slide update. Official mission images, actual scientific products and actual independent local browser screenshots. Generic installed Windows computer voice. No live recording, reviewer identity or discovery is claimed. 17 independent Playwright Chromium checks passed; Work browser permission stayed unchanged. Captions use approximate sentence timing.\n\n'+'\n\n'.join(f"## Scene {s['slide']}\n\n{s['narration']}" for s in scenes)+'\n\nSources: m101-review-v6.zip, docs/evidence/provenance_audit_0.3.json, web/dist/assets/assets.json, docs/evidence/browser_0.3.json, local release presentation speaker notes.\n',encoding='utf-8')
    with av.open(str(final)) as check:
        video=check.streams.video[0];audio=check.streams.audio[0]
        metadata={'duration_seconds':check.duration/av.time_base,'video_frames':video.frames,'fps':str(video.average_rate),'width':video.width,'height':video.height,'audio_codec':audio.codec_context.name,'source_narration_seconds':source_seconds,'tempo_factor':speed,'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'scientific_approval':'PENDING','independent_browser_checks':17,'live_recording':False}
        for t in [0,35,70,105,140,175]:
            check.seek(int(t*av.time_base));next(check.decode(video=0)).to_image().save(PRIVATE/f'qa-{t}.png')
    assert abs(metadata['duration_seconds']-180)<.1 and metadata['video_frames']==2160
    (OUT/'local_0.3_video_verification.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
    print(json.dumps(metadata,indent=2))
if __name__=='__main__':build()
