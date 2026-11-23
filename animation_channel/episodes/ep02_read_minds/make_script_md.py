"""Write SCRIPT.md (timecoded dialogue) from script.json + build/timing.json."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(H, 'script.json')))
T = json.load(open(os.path.join(H, 'build', 'timing.json')))
TITLES = {'hook': 'Cold open', 'title': 'Title', 'yard': 'Scene 1 · Backyard: the star that fell', 'park': 'Scene 2 · Park: Grandpa Shelby',
          'porch': "Scene 3 · Coco's porch", 'street': 'Scene 4 · Main street: too many voices', 'home': 'Scene 4b · Home: Mom',
          'yard2': 'Scene 5 · Backyard: bananas', 'kitchen': 'Scene 6 · Kitchen: code red', 'hill': 'Scene 7 · Hill at sunset: the star cracks',
          'party': 'Scene 8 · Backyard at night: SURPRISE!', 'party2': 'Scene 9 · The last twist', 'outro': 'End card'}
ACT = {'hookOpen': "Close on Kip. His eyes snap open; a glowing star hovers over his head. Thoughts swirl around him.",
       'title': 'TITLE CARD', 'throw': 'Max hurls the ball straight up into the sky...', 'starfall': '...and a glowing star comes screaming down. CRASH.',
       'touch': 'Kip touches the star. FLASH. It floats up and hovers over his head.', 'glasses': "The glasses slide off his head onto his nose.",
       'cocoRun': 'Coco sprints away.', 'heartbreak': 'The music stops. Kip freezes.', 'kipRuns': 'Kip runs away.',
       'sunset': 'Kip, alone on the hill at sunset.', 'crack': 'The star flickers red and CRACKS. Every thought comes back at once, twisted.',
       'dim': 'Silence. The star goes dim.', 'lightsOn': 'The lights blaze on...', 'treehouse': 'The camera rises to a brand-new treehouse with KIP on the roof.',
       'fireworks': "Max's homemade fireworks light up the sky.", 'release': 'Kip lets the star go. It flies up into the night...',
       'landCoco': "...and drops onto Coco's head. PLINK.", 'laugh': 'Everyone bursts out laughing.'}
tc = lambda t: f'{int(t // 60)}:{t % 60:05.2f}'
out = [f"# EP02 · {S['title']}", '', '8:30.000 · 1920×1080 · 30 fps · Kip (locked v1.0.0) is the main character · natural dialogue, narrator used twice', '',
       '## Cast & voices (Kokoro neural TTS, one voice per character)', '', '| Character | Voice |', '|---|---|']
for k, v in S['voices'].items():
    out.append(f"| {S['names'][k].title() if k != 'N' else 'Narrator'} | `{v}` |")
out += ['', '*Italic lines are thoughts: the character does not say them out loud; only Kip hears them through the Thinking Star.*']
cur = None
for b in T['beats']:
    if b['s'] != cur:
        cur = b['s']; out += ['', f"## {TITLES[cur]}  `{tc(b['start'])}`", '']
    if b.get('v'):
        name = 'EVERYONE' if b.get('chorus') else S['names'][b['v']]
        out.append(f"`{tc(b['start'])}` *{name} (thinking): {b['t']}*  " if b.get('mode') == 'think' else f"`{tc(b['start'])}` **{name}:** {b['t']}  ")
    elif b.get('a') in ACT:
        out.append(f"`{tc(b['start'])}` > _{ACT[b['a']]}_  ")
open(os.path.join(H, 'SCRIPT.md'), 'w').write('\n'.join(out) + '\n')
