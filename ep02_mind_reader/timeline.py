"""Lay the script out in time using the real voice-clip durations; fit to exactly TARGET_DURATION.

Produces out/timeline.json, used by anim.py (animation/camera), audio.py (mix) and subs.py.
"""
import json
import os

import script
from voices import line_key

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
DEFAULT_GAP = 0.5


def layout(meta, stretch=1.0):
    t = 0.0
    scenes, items = [], []
    for sc in script.SCENES:
        s0 = t
        cam_items = []
        for bi, b in enumerate(sc['beats']):
            k = b['kind']
            if k == 'line':
                key = line_key(sc['id'], b, b['who'])
                dur = meta[key]['dur']
                start = t - b.get('overlap', 0.0) if items and items[-1]['type'] == 'line' else t
                start = max(start, s0)
                parts = [dict(who=b['who'], key=key, dur=dur)]
                for c in b.get('chorus', []):
                    ck = line_key(sc['id'], b, c)
                    parts.append(dict(who=c, key=ck, dur=meta[ck]['dur'], delay=0.03 * (len(parts))))
                end = start + max(p['dur'] + p.get('delay', 0.0) for p in parts)
                items.append(dict(type='line', scene=sc['id'], who=b['who'], mode=b['mode'], text=b['text'],
                                  emo=b['emo'], look=b.get('look'), loud=bool(b.get('loud')), t0=start, t1=end, parts=parts))
                gap = b.get('gap', DEFAULT_GAP)
                t = end + gap * stretch
            elif k == 'pause':
                items.append(dict(type='pause', scene=sc['id'], t0=t, t1=t + b['dur'] * stretch))
                t += b['dur'] * stretch
            elif k == 'event':
                kw = {kk: vv for kk, vv in b.items() if kk not in ('kind', 'name', 'dur')}
                items.append(dict(type='event', scene=sc['id'], name=b['name'], t0=t, t1=t + b['dur'], **kw))
                for xk, off in script.EVENT_CLIPS.get(b['name'], []):
                    m = meta['x:' + xk]
                    spk, _, sub = script.EXTRA[xk]
                    items.append(dict(type='clip', scene=sc['id'], who=spk, key='x:' + xk, text=sub, t0=t + off,
                                      t1=t + off + m['dur'], peak=t + off + m.get('peak', m['dur'] * 0.8), event=b['name']))
                t += b['dur']
            elif k == 'move':
                items.append(dict(type='move', scene=sc['id'], who=b['who'], to=b['to'], t0=t, t1=t + b['dur'], run=b['run']))
            elif k == 'cam':
                kw = {kk: vv for kk, vv in b.items() if kk not in ('kind', 'shot')}
                c = dict(type='cam', scene=sc['id'], shot=b['shot'], t0=t, **kw)
                items.append(c)
                cam_items.append(c)
        scenes.append(dict(id=sc['id'], t0=s0, t1=t))
    return scenes, items, t


def build():
    meta = json.load(open(os.path.join(OUT, 'voices', 'lines.json')))
    target = script.TARGET_DURATION
    # find the gap/pause stretch that lands on the target (end card absorbs the last few ms)
    lo, hi = 0.5, 4.0
    for _ in range(60):
        mid = (lo + hi) / 2
        _, _, tot = layout(meta, mid)
        if tot > target:
            hi = mid
        else:
            lo = mid
    scenes, items, tot = layout(meta, lo)
    # extend the very last scene (end card) so the episode is exactly the target
    extra = target - tot
    scenes[-1]['t1'] = target
    for it in reversed(items):
        if it['type'] == 'event' and it['name'] == 'end_card':
            it['t1'] += extra
            break
    # close camera intervals
    cams = [i for i in items if i['type'] == 'cam']
    for a, b in zip(cams, cams[1:]):
        a['t1'] = b['t0']
    cams[-1]['t1'] = target
    data = dict(duration=target, fps=script.FPS, stretch=lo, scenes=scenes, items=items)
    json.dump(data, open(os.path.join(OUT, 'timeline.json'), 'w'), indent=1)
    return data


if __name__ == '__main__':
    d = build()
    print('gap stretch %.3f' % d['stretch'])
    for s in d['scenes']:
        print(f"{s['id']:6s} {s['t0']:7.2f} -> {s['t1']:7.2f}  ({s['t1']-s['t0']:.1f}s)")
    print('total', d['scenes'][-1]['t1'])
