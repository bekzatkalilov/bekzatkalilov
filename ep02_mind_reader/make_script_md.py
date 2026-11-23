"""Write SCRIPT.md (timecoded screenplay) from script.py + out/timeline.json."""
import json
import os

import script

HERE = os.path.dirname(os.path.abspath(__file__))

EVENT_TEXT = {
    'hook_open': "Extreme close-up: Tiko's eyes snap open, glowing cyan. Whispering thoughts swirl around him.",
    'hook_sting': 'Music sting. Smash cut.',
    'title_card': 'TITLE: "WHAT IF YOU COULD READ EVERYONE\'S MIND?" over the glowing Thinking Star.',
    'sneeze_up': 'Sparky inhales... "Ah... ah... CHOO!" A fireball rockets straight up into the sky.',
    'star_fall': 'A high whistle. A glowing star plunges from the sky and CRASHES into the clearing. Dust, sparkles.',
    'touch_star': 'Tiko touches the star. FLASH. A ringing tone. The star clings to his chest like a pendant; his eyes glow.',
    'glasses_down': 'The glasses slide off his head and land on his nose.',
    'coco_flyaway': 'Coco flaps off in a panic, leaving a puff of feathers.',
    'heartbreak': 'The music drops out. Tiko freezes.',
    'tiko_runs': 'Tiko turns and runs into the forest.',
    'star_crack': 'The star flickers red and CRACKS. All the thoughts come back at once, louder and twisted.',
    'star_dim': 'Silence. The cracked star fades to a dull glow.',
    'surprise': 'Lanterns blaze on all at once. Everyone jumps out.',
    'confetti': 'Confetti and sparkles rain down. Party music kicks in.',
    'treehouse_reveal': 'The camera cranes up to a brand-new treehouse nest glowing with lanterns.',
    'fireworks': 'Sparky blasts fireballs into the sky. They burst into colourful fireworks.',
    'place_star': 'Tiko takes off the star and gently sets it on the grass.',
    'sneeze_star': 'Sparky: "Ah... ah... CHOO!" The fireball hits the star. It flares to life and zooms into the sky...',
    'star_to_coco': '...and drops, PLINK, right onto Coco\'s head. Her eyes start to glow.',
    'everyone_laughs': 'Everyone bursts out laughing.',
    'end_card': 'END CARD: "TIKO & SPARKY - Episode 2" / Subscribe / Next episode.',
}


def tc(t):
    return f'{int(t // 60)}:{t % 60:05.2f}'


def main():
    tl = json.load(open(os.path.join(HERE, 'out', 'timeline.json')))
    sc_by_id = {s['id']: s for s in script.SCENES}
    out = ['# EP02 - "What If You Could Read Everyone\'s Mind?"', '',
           f"Runtime **8:30.00** ({tl['duration']:.0f} s) · 1920×1080 · 24 fps · English with burned-in subtitles + `.srt`", '',
           '## Cast & voices', '', '| Character | Who | AI voice (Kokoro-82M) | Speed | Pitch shift |', '|---|---|---|---|---|']
    for k, c in script.CAST.items():
        out.append(f"| **{c['name']}** | {c['desc']} | `{c['voice']}` | {c['speed']:.2f} | ×{c['pitch']:.2f} |")
    out += ['', 'Legend: **NAME:** spoken line (lip-synced). *NAME (thinking):* thought, which the character does not say out loud; '
            'only Tiko can hear it through the Thinking Star. On screen, thoughts get an echo voice, cyan ripples and cyan italic subtitles.', '']
    cur = None
    for it in tl['items']:
        if it['scene'] != cur:
            cur = it['scene']
            s = next(x for x in tl['scenes'] if x['id'] == cur)
            sd = sc_by_id[cur]
            out += ['', f"## {sd['title']}  `{tc(s['t0'])} - {tc(s['t1'])}`",
                    f"*{sd['loc'].upper()} - {sd['tod'].replace('_', ' ').upper()}*", '']
        if it['type'] == 'line':
            name = script.CAST[it['who']]['name'].upper()
            if it.get('parts') and len(it['parts']) > 1:
                name = 'EVERYONE'
            if it['mode'] == 'think':
                out.append(f"`{tc(it['t0'])}` *{name} (thinking): {it['text']}*  ")
            elif it['mode'] == 'narr':
                out.append(f"`{tc(it['t0'])}` **NARRATOR (V.O.):** {it['text']}  ")
            else:
                out.append(f"`{tc(it['t0'])}` **{name}:** {it['text']}  ")
        elif it['type'] == 'event' and it['name'] in EVENT_TEXT:
            out.append(f"`{tc(it['t0'])}` > _{EVENT_TEXT[it['name']]}_  ")
    open(os.path.join(HERE, 'SCRIPT.md'), 'w').write('\n'.join(out) + '\n')


if __name__ == '__main__':
    main()
