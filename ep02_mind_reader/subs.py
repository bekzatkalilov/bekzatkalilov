"""Subtitles from the timeline.

  out/ep02.ass   styled, burned into the video (dialogue, thoughts, narrator, title card, end card)
  EP02_subtitles_en.srt   plain English captions for uploading to YouTube as a CC track
"""
import json
import os
import re

import script

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'out', 'timeline.json')))


def ass_t(t):
    t = max(t, 0)
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'


def srt_t(t):
    t = max(t, 0)
    ms = int(round(t * 1000))
    return f'{ms // 3600000:02d}:{ms % 3600000 // 60000:02d}:{ms % 60000 // 1000:02d},{ms % 1000:03d}'


def split_text(text, max_chars=84):
    """Split long lines into readable chunks at sentence boundaries."""
    if len(text) <= max_chars:
        return [text]
    parts = re.split(r'(?<=[.!?…])\s+', text)
    out, cur = [], ''
    for p in parts:
        if cur and len(cur) + 1 + len(p) > max_chars:
            out.append(cur)
            cur = p
        else:
            cur = (cur + ' ' + p).strip()
    if cur:
        out.append(cur)
    return out


def events():
    """(t0, t1, style, speaker label or None, text, mode)"""
    evs = []
    for it in TL['items']:
        if it['type'] == 'line':
            who = it['who']
            name = script.CAST[who]['name']
            if len(it.get('parts', [])) > 1:
                name = 'Everyone'
            chunks = split_text(it['text'])
            total = sum(len(c) for c in chunks)
            t = it['t0']
            span = it['t1'] - it['t0']
            for c in chunks:
                d = span * len(c) / total
                evs.append([t, t + d, it['mode'], name, c, who, it['scene']])
                t += d
        elif it['type'] == 'clip':
            evs.append([it['t0'], it['t1'], 'say', script.CAST[it['who']]['name'], it['text'], it['who'], it['scene']])
    # minimum on-screen time 0.9 s, small tail, but never past the next line of the same mode
    evs.sort(key=lambda e: e[0])
    for i, e in enumerate(evs):
        e[1] = max(e[1] + 0.2, e[0] + 0.9)
    return evs


HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Say,Inter,56,&H00FFFFFF,&H00FFFFFF,&H00101010,&H96000000,-1,0,0,0,100,100,0,0,1,3.6,1.5,2,160,160,58,1
Style: Think,Inter,54,&H00FFF07A,&H00FFFFFF,&H00402008,&H96000000,-1,-1,0,0,100,100,0,0,1,3.6,1.5,2,160,160,58,1
Style: Narr,Inter,52,&H00A8F0FF,&H00FFFFFF,&H00102030,&H96000000,-1,-1,0,0,100,100,0,0,1,3.4,1.5,2,160,160,58,1
Style: Title,Inter Display Black,118,&H0040D8FF,&H00FFFFFF,&H00301000,&H80000000,-1,0,0,0,100,100,2,0,1,7,4,5,80,80,0,1
Style: TitleSub,Inter Display,52,&H00FFFFFF,&H00FFFFFF,&H00301000,&H80000000,-1,0,0,0,100,100,6,0,1,3.5,2,5,80,80,0,1
Style: End,Inter Display Black,96,&H0040D8FF,&H00FFFFFF,&H00301000,&H80000000,-1,0,0,0,100,100,2,0,1,6,3,5,80,80,0,1
Style: EndSub,Inter Display,50,&H00FFFFFF,&H00FFFFFF,&H00301000,&H80000000,-1,0,0,0,100,100,1,0,1,3.5,2,5,80,80,0,1
Style: Badge,Inter Display Black,46,&H00FFFFFF,&H00FFFFFF,&H000000C8,&H000000C8,-1,0,0,0,100,100,2,0,3,14,0,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def ass_escape(s):
    return s.replace('\n', '\\N').replace('{', '(').replace('}', ')')


def main():
    evs = events()
    lines = [HEADER]
    for t0, t1, mode, name, text, who, scene in evs:
        txt = ass_escape(text)
        if mode == 'think':
            lines.append(f"Dialogue: 0,{ass_t(t0)},{ass_t(t1)},Think,{name},0,0,0,,{{\\fad(120,150)}}{{\\fs40}}{name} (thinking):{{\\fs54}} {txt}")
        elif mode == 'narr':
            lines.append(f"Dialogue: 0,{ass_t(t0)},{ass_t(t1)},Narr,{name},0,0,0,,{{\\fad(150,200)}}{{\\fs40}}Narrator:{{\\fs52}} {txt}")
        else:
            lines.append(f"Dialogue: 0,{ass_t(t0)},{ass_t(t1)},Say,{name},0,0,0,,{{\\fad(80,120)}}{txt}")
    # title card
    title = next(s for s in TL['scenes'] if s['id'] == 'title')
    a, b = title['t0'] + 0.35, title['t1'] - 0.05
    lines.append(f"Dialogue: 1,{ass_t(a)},{ass_t(b)},TitleSub,,0,0,0,,{{\\pos(960,330)\\fad(400,300)}}TIKO & SPARKY  ·  EPISODE 2")
    lines.append(f"Dialogue: 1,{ass_t(a + 0.25)},{ass_t(b)},Title,,0,0,0,,{{\\pos(960,470)\\fad(300,300)\\t(0,600,\\fscx104\\fscy104)\\t(600,5000,\\fscx100\\fscy100)}}WHAT IF YOU COULD")
    lines.append(f"Dialogue: 1,{ass_t(a + 0.6)},{ass_t(b)},Title,,0,0,0,,{{\\pos(960,610)\\fad(300,300)\\c&H00F5E05A&\\t(0,600,\\fscx106\\fscy106)\\t(600,5000,\\fscx100\\fscy100)}}READ EVERYONE'S MIND?")
    # end card
    end = next(i for i in TL['items'] if i['type'] == 'event' and i['name'] == 'end_card')
    a, b = end['t0'] + 0.6, TL['duration']
    lines.append(f"Dialogue: 1,{ass_t(a)},{ass_t(b)},End,,0,0,0,,{{\\pos(960,330)\\fad(500,0)}}TIKO & SPARKY")
    lines.append(f"Dialogue: 1,{ass_t(a + 0.4)},{ass_t(b)},EndSub,,0,0,0,,{{\\pos(960,450)\\fad(500,0)}}Next episode:")
    lines.append(f"Dialogue: 1,{ass_t(a + 0.4)},{ass_t(b)},EndSub,,0,0,0,,{{\\pos(960,520)\\fad(500,0)\\c&H00A8F0FF&}}What If You Could Shrink to the Size of an Ant?")
    lines.append(f"Dialogue: 1,{ass_t(a + 1.0)},{ass_t(b)},Badge,,0,0,0,,{{\\pos(960,700)\\fad(300,0)\\t(0,300,\\fscx112\\fscy112)\\t(300,600,\\fscx100\\fscy100)}}  SUBSCRIBE  ")
    lines.append(f"Dialogue: 1,{ass_t(a + 1.3)},{ass_t(b)},EndSub,,0,0,0,,{{\\pos(960,800)\\fad(300,0)\\fs40}}New adventures every week!")
    open(os.path.join(HERE, 'out', 'ep02.ass'), 'w').write('\n'.join(lines) + '\n')
    # SRT (dialogue only)
    srt = []
    for i, (t0, t1, mode, name, text, who, scene) in enumerate(evs, 1):
        if mode == 'think':
            body = f'<i>{name} (thinking): {text}</i>'
        elif mode == 'narr':
            body = f'<i>Narrator: {text}</i>'
        else:
            body = text
        srt.append(f'{i}\n{srt_t(t0)} --> {srt_t(t1)}\n{body}\n')
    open(os.path.join(HERE, 'EP02_subtitles_en.srt'), 'w').write('\n'.join(srt))
    print('subtitle events:', len(evs))


if __name__ == '__main__':
    main()
