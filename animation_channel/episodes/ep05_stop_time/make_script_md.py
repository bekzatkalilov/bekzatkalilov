"""Write SCRIPT.md (timecoded dialogue) from script.json + build/timing.json."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(H, 'script.json')))
T = json.load(open(os.path.join(H, 'build', 'timing.json')))
TITLES = {'hook': 'Cold open (flash-forward: the frozen neon avenue, 7:43 PM)', 'title': 'Title',
          'apt': 'Scene 1 · Sky-tower apartment, floor 214, 7:42 AM: the milk', 'street': 'Scene 2 · Neo-Market Street: one clap, everything stops',
          'mall': 'Scene 3 · Starlight Mall: free samples and a stranger on the escalator', 'avenue': 'Scene 4 · Neon avenue in the rain, 7:40 PM',
          'station': 'Scene 5 · Maglev station: the chase', 'lab': 'Scene 6 · Chrono Laboratory: the truth about the cracks',
          'frozen': 'Scene 7 · The frozen city', 'core': 'Scene 8 · Top of Tock Tower: the Chrono Core',
          'after': 'Scene 9 · Back in the lab', 'ending': 'Scene 10 · Sky-bus stop, next morning: the final twist', 'outro': 'End card'}
ACT = {'hookOpen': 'Night. Neon. Rain hangs motionless in the air. Everyone is frozen... except Kip.', 'footstep': 'A footstep echoes behind him.',
       'hookScream': 'Kip screams. White flash.', 'title': 'TITLE CARD: a giant clock shatters and the shards stop in mid-air.',
       'milkTip': "Kip's elbow knocks the milk glass off the table.", 'freeze': 'Time STOPS. The milk hangs in mid-air. The world turns icy blue.',
       'poke': 'Kip pokes a floating drop of milk. It wobbles.', 'unfreeze': 'Time restarts. The milk lands perfectly in the glass.',
       'clap': 'CLAP. Time stops.', 'prank': 'Kip zips around: sunglasses on the vendor, the pigeon turned around, a mustache on Max.',
       'clap2': 'CLAP CLAP. Time restarts.', 'mallOpen': 'The glass dome of Starlight Mall.', 'fountainLook': 'The fountain hangs frozen in mid-air.',
       'balloonSee': "A little girl's balloon is floating away.", 'escalator': 'On the stopped escalator, a hooded figure is walking down.',
       'vanish': 'The figure glitches and vanishes.', 'crack': 'A glowing golden crack splits the air.',
       'runIn': 'Kip sprints into the maglev station, dragging the frozen Max.', 'dragRun': 'Through a crowd of frozen passengers.',
       'hoodFollow': 'The stranger follows.', 'watchRaise': 'On the platform, the stranger raises a glowing pocket watch.',
       'labOpen': 'The Chrono Laboratory. The Chrono Pulse ring hums.', 'doorHiss': 'The lab door hisses open.',
       'hoodOff': 'The hood comes off: a girl with silver hair.', 'alarm': 'ALARM. The crack monitor turns red.',
       'bigFreeze': 'Everything freezes on its own. Cracks everywhere.', 'frozenOpen': 'The whole city, frozen in crystal.',
       'quake': 'The frozen street starts breaking apart.', 'carJump': 'Kip and Wren jump from hover-car to hover-car.',
       'coreOpen': 'The Chrono Core floats above the tower.', 'restore': 'They touch the Core. Light. The cracks heal. Colour floods back.',
       'testClap': 'Kip claps. Nothing happens.', 'sneeze': 'AH-CHOO!', 'stopped': 'The birds stop in mid-air. So does Kip.',
       'maxClap': 'Max claps twice. Time restarts. Kip now has a mustache.'}
tc = lambda t: f'{int(t // 60)}:{t % 60:05.2f}'
out = [f"# EP05 · {S['title']}", '', '8:30.000 · 1920×1080 · 30 fps · Kip (locked v1.0.0) with Max, Wren and Professor Tock · natural dialogue, narrator used twice', '',
       '## Cast & voices (Kokoro neural TTS, one unique voice per character)', '', '| Character | Voice |', '|---|---|']
for k, v in S['voices'].items():
    note = ' (processed with an eerie chorus/echo filter)' if k == 'HOOD' else ''
    out.append(f"| {S['names'][k].title() if k != 'N' else 'Narrator'} | `{v}`{note} |")
cur = None
for b in T['beats']:
    if b['s'] != cur:
        cur = b['s']; out += ['', f"## {TITLES[cur]}  `{tc(b['start'])}`", '']
    if b.get('v'):
        name = S['names'][b['v']] + (' + WREN' if b.get('chorus') else '')
        out.append(f"`{tc(b['start'])}` **{name}:** {b['t']}  ")
    elif b.get('a') in ACT:
        out.append(f"`{tc(b['start'])}` > _{ACT[b['a']]}_  ")
open(os.path.join(H, 'SCRIPT.md'), 'w').write('\n'.join(out) + '\n')
