"""Write SCRIPT.md (timecoded dialogue) from script.json + build/timing.json."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(H, 'script.json')))
T = json.load(open(os.path.join(H, 'build', 'timing.json')))
TITLES = {'hook': 'Cold open (flash-forward)', 'title': 'Title', 'bedroom': "Scene 1 · Kip's room: the morning it began",
          'street': "Scene 2 · Main street: everyone's secrets", 'class': 'Scene 3 · Classroom: Mr. Grumbold and Lily',
          'class2': "Scene 4 · Classroom: Kip's sign loads", 'home': "Scene 5 · Home: Mom's sign", 'maxhouse': "Scene 6 · Outside Max's house: a new secret",
          'race': 'Scene 7 · The race across town', 'station': 'Scene 8 · Bus station at sunset', 'ending': 'Scene 9 · Next morning', 'outro': 'End card'}
ACT = {'hookOpen': 'Classroom. Everyone stares at Kip. Above his head a glowing sign reads LOADING SECRET...',
       'reveal': 'The sign hits 99%. White flash.', 'title': 'TITLE CARD', 'alarm': 'RIIING! Kip leaps out of bed.',
       'laughFit': 'Kip collapses laughing.', 'pigeon': "A pigeon lands right on Officer Dan's head.", 'snap': 'Kip snaps photos of everyone.',
       'opera': 'Mr. Grumbold belts out an opera note.', 'lilySign': "Lily's sign glows into view.", 'flicker': "Kip's sign starts to flicker.",
       'kipReveal': "Kip's sign finishes loading. Silence.", 'maxLeaves': 'Max walks out of the classroom.', 'momSign': "Mom's sign finishes loading.",
       'run1': 'Kip sprints through town.', 'ride': "Kip rides on Rosa's delivery bike.", 'pigeons': 'Officer Dan charges a flock of pigeons.',
       'opera2': 'Mr. Grumbold sings Kip a victory song.', 'kipNew': "Kip's sign changes.", 'hug': 'Kip and Max hug.',
       'lilyNew': "Lily's sign changes too.", 'teddySign': "A sign starts loading above Mr. Fluffles the teddy bear...", 'wink': 'The teddy bear winks.'}
tc = lambda t: f'{int(t // 60)}:{t % 60:05.2f}'
out = [f"# EP03 · {S['title']}", '', '8:30.000 · 1920×1080 · 30 fps · Kip (locked v1.0.0) is the main character · natural dialogue, narrator used twice', '',
       '## Cast & voices (Kokoro neural TTS, one unique voice per character)', '', '| Character | Voice |', '|---|---|']
for k, v in S['voices'].items():
    out.append(f"| {S['names'][k].title() if k != 'N' else 'Narrator'} | `{v}` |")
out += ['', '## The secrets (glowing signs above heads)', ''] + [f'- **{k}**: {v}' for k, v in S['signs'].items()]
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
