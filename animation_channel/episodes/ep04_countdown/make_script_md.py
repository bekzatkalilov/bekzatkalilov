"""Write SCRIPT.md (timecoded dialogue) from script.json + build/timing.json."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(H, 'script.json')))
T = json.load(open(os.path.join(H, 'build', 'timing.json')))
TITLES = {'hook': 'Cold open (flash-forward to 3:59 PM)', 'title': 'Title', 'bedroom': "Scene 1 · Kip's room, 8:01 AM",
          'kitchen': 'Scene 2 · Kitchen, 8:15 AM: the news', 'street': "Scene 3 · Main street, 8:40 AM: Rosa's zero",
          'class': "Scene 4 · Classroom, 9:00 AM: Lily and Mr. Grumbold", 'list': "Scene 5 · The park, noon: the bucket list",
          'home': "Scene 6 · Kip's room, 2:30 PM: Mom's towel", 'climax': 'Scene 7 · The park at sunset, 3:59 PM: zero',
          'ending': 'Scene 8 · Next morning: the final twist', 'outro': 'End card'}
ACT = {'hookOpen': 'Park at sunset. Above Kip and Max, red countdowns tick toward zero.', 'zero': 'ZERO. White flash.',
       'title': 'TITLE CARD', 'alarm': 'RIIING! Kip jumps out of bed.', 'mirror': 'Kip sees a countdown floating above his head in the mirror.',
       'spit': 'Kip sprays his milk across the kitchen.', 'bakerZero': "Rosa's countdown hits zero. Her phone rings.",
       'teachZero': "Mr. Grumbold's countdown hits zero. A grey cat leaps through the window.", 'opera': 'Mr. Grumbold sings opera with joy.',
       'listOpen': "Kip's bucket list unrolls.", 'brainfreeze': 'Brain freeze!', 'skateFall': 'Kip wipes out on the skateboard.',
       'strum': 'Kip plays the worst guitar chord in history.', 'hurt': 'Silence. Max looks hurt.',
       'maxTimer': "Max's countdown glitches... from 61 YEARS to the exact same time as Kip's.", 'kipRuns': 'Kip runs away.',
       'knock': 'Knock knock knock.', 'towelOff': "Mom takes off the towel. Her countdown ends at 4:00 PM too.",
       'run': 'Kip sprints into the park.', 'listShow': "Kip shows item 7 on his bucket list.", 'nothing': 'Nothing happens. A leaf falls. Crickets.',
       'bark': 'Woof!', 'puppy': 'A puppy races in and jumps on Kip. Mom follows.', 'hug': 'Group hug with Zero the puppy.',
       'teachTimer': 'A brand-new countdown pops up above Mr. Grumbold.', 'kittens': 'Mr. Whiskers walks in... followed by six kittens.'}
tc = lambda t: f'{int(t // 60)}:{t % 60:05.2f}'
out = [f"# EP04 · {S['title']}", '', '8:30.000 · 1920×1080 · 30 fps · Kip (locked v1.0.0), Max and Lily · natural dialogue, narrator used twice', '',
       '## Cast & voices (Kokoro neural TTS, one unique voice per character)', '', '| Character | Voice |', '|---|---|']
for k, v in S['voices'].items():
    out.append(f"| {S['names'][k].title() if k != 'N' else 'Narrator'} | `{v}` |")
cur = None
for b in T['beats']:
    if b['s'] != cur:
        cur = b['s']; out += ['', f"## {TITLES[cur]}  `{tc(b['start'])}`", '']
    if b.get('v'):
        name = S['names'][b['v']] + (' + LILY' if b.get('chorus') else '')
        out.append(f"`{tc(b['start'])}` **{name}:** {b['t']}  ")
    elif b.get('a') in ACT:
        out.append(f"`{tc(b['start'])}` > _{ACT[b['a']]}_  ")
open(os.path.join(H, 'SCRIPT.md'), 'w').write('\n'.join(out) + '\n')
