"""EP05 "What If You Could Stop Time?" — script source. Run to write script.json.

Beat format (shared with EP02-EP04): s scene, v voice key, t text, k/p Kip expression/pose, e cast expressions,
a action key, sfx cues, m music mood, dur (action beats), hl highlighted subtitle words, chorus extra voices.
New in EP05:
  z      time state, inherited along the whole timeline: 1 = time frozen, 0 = time running.
         The world is drawn through a "frozen" colour grade while z = 1; Kip (and Wren) stay in full colour.
  HOOD   the hooded stranger. Same voice as WREN, but audio.py runs it through an eerie "time-echo" filter.
"""
import json, os

VOICES = {
    'N': 'am_michael',      # narrator (channel voice)
    'KIP': 'am_puck',       # Kip (same voice every episode)
    'MAX': 'am_liam',       # Max, best friend (same since EP01)
    'MOM': 'af_heart',      # Kip's mom (same since EP02)
    'PROF': 'bm_george',    # Professor Tock, time scientist (new)
    'HOOD': 'bf_isabella',  # the hooded stranger (Wren before the reveal, filtered)
    'WREN': 'bf_isabella',  # Wren, Professor Tock's daughter (new)
    'VEND': 'am_fenrir',    # Hot-dog vendor (new)
    'ANN': 'af_kore',       # Starlight Mall announcer (new)
    'GIRL': 'af_sky',       # little girl with the balloon (new)
    'TRAIN': 'af_nicole',   # maglev station announcer (new)
}
NAMES = {'N': 'NARRATOR', 'KIP': 'KIP', 'MAX': 'MAX', 'MOM': 'MOM', 'PROF': 'PROFESSOR TOCK', 'HOOD': 'HOODED STRANGER',
         'WREN': 'WREN', 'VEND': 'HOT-DOG VENDOR', 'ANN': 'MALL SPEAKER', 'GIRL': 'LITTLE GIRL', 'TRAIN': 'STATION SPEAKER'}


def L(v, t, k=None, p=None, **kw):
    b = {'v': v, 't': t}
    if k: b['k'] = k
    if p: b['p'] = p
    b.update(kw)
    return b


def A(a, dur, **kw):
    return dict(v=None, a=a, dur=dur, **kw)


BEATS = []


def scene(s, *beats):
    for b in beats:
        b['s'] = s
        BEATS.append(b)


# ------------------------------------------------------------------ 0:00 HOOK — flash-forward: frozen neon avenue in the rain
HOOK = [
    L('KIP', 'The whole city is frozen... and I am the only one who can move.', k='happy', p='idle', a='rainWalk', hl=['frozen...']),
    A('footstep', 0.75, k='surprise', p='surprise', sfx=['echostep']),
    L('HOOD', 'Not the only one, Kip.', k='fear', p='scared', a='hoodReveal', hl=['not']),
]
scene('hook',
      A('hookOpen', 0.35, k='happy', p='idle', z=1, m='eerie', sfx=['drone']),
      *[dict(b) for b in HOOK],
      A('hookScream', 0.6, k='fear', p='scared', sfx=['impact']))
scene('title', A('title', 4.2, z=0, sfx=['riser'], m='magic'))

# ------------------------------------------------------------------ SCENE 1 Sky-tower apartment, 7:42 AM
scene('apt',
      L('N', 'Twelve hours earlier. Floor two hundred and fourteen.', a='morning', m='curious'),
      L('MOM', 'Kip! The sky-bus leaves in three minutes!', k='surprise', p='idle', e={'mom': 'happy'}, a='rush'),
      L('KIP', 'Coming! Toast, backpack, shoes... why does every morning have so many THINGS?', k='fear', p='shrug', a='rush', sfx=['whoosh']),
      A('milkTip', 0.9, k='surprise', p='surprise', sfx=['clink']),
      L('KIP', 'No, no, no... STOP!', k='fear', p={'armL': {'sh': 70, 'el': -20}, 'armR': {'sh': 70, 'el': -20}}, a='milkFall', hl=['stop!']),
      A('freeze', 1.7, k='surprise', p='surprise', z=1, sfx=['freeze'], m='eerie'),
      L('KIP', '...Huh. The milk is just... hanging there. In the air.', k='confused', p='think', a='frozenLook'),
      L('KIP', 'Mom? You are stuck in the middle of a sip. Is this a prank? Blink twice if it is a prank.', k='confused', p='point', a='momLook'),
      A('poke', 1.4, k='surprise', p='point', sfx=['boing']),
      L('KIP', 'I did not break time... did I? Okay. Let me just put the glass back under the milk...', k='fear', p='idle', a='place', m='comedic'),
      L('KIP', 'And... GO?', k='confused', p='shrug', a='place', hl=['go?']),
      A('unfreeze', 1.3, k='surprise', p='surprise', z=0, sfx=['unfreeze', 'splash']),
      L('MOM', 'Ooh, nice catch, honey.', e={'mom': 'happy'}, a='catch'),
      L('KIP', 'Thanks. Also, Mom? I think I just stopped time.', k='happy', p='idle', a='catch'),
      L('MOM', 'That is lovely, sweetie. Stop time on the way to the bus stop.', e={'mom': 'happy'}, a='catch'),
      L('KIP', 'This... is going to be the best day of my life.', k='excited', p='cheer', a='best', m='upbeat'))

# ------------------------------------------------------------------ SCENE 2 Neo-Market Street, 8:05 AM
scene('street',
      L('MAX', 'Wait, wait, wait. You stopped time? Like, actually stopped it?', k='happy', p='idle', e={'max': 'confused'}, a='talk', m='comedic'),
      L('KIP', 'Watch this. Pick anybody on this street.', k='happy', p='point', a='talk'),
      L('MAX', 'Uh... the guy with the hot dogs.', e={'max': 'neutral'}, a='pick'),
      A('clap', 1.3, k='excited', p='idle', z=1, sfx=['clap', 'freeze']),
      A('prank', 3.4, k='excited', p='idle', sfx=['zip', 'pop', 'zip', 'pop']),
      L('KIP', 'Sunglasses... a pigeon facing the other way... and one tiny mustache. Perfect.', k='happy', p='idle', a='prankDone'),
      A('clap2', 1.1, k='happy', p='idle', z=0, sfx=['clap', 'unfreeze']),
      L('VEND', 'Hey! Where did these sunglasses come from? ...Actually, I look amazing.', e={'vend': 'surprise'}, a='vendor', hl=['amazing.']),
      L('MAX', 'WHAT?! Kip, you were over there, and now you are over HERE!', e={'max': 'surprise'}, a='react'),
      L('KIP', 'One clap, everything stops. Two claps, everything goes. I practised on the sky-bus.', k='happy', p='shrug', a='react'),
      L('MAX', 'This is huge! You could skip every test! You could be first in every lunch line!', e={'max': 'happy'}, a='react', m='upbeat'),
      L('KIP', 'Or... we could go to Starlight Mall and try every free sample at the same time.', k='excited', p='point', a='react'),
      L('MAX', 'Kip. You are a genius.', e={'max': 'happy'}, a='react'),
      L('MAX', 'Why does my face feel tickly?', e={'max': 'confused'}, a='mustache', sfx=['boing'], m='comedic'))

# ------------------------------------------------------------------ SCENE 3 Starlight Mall, 11:30 AM
scene('mall',
      A('mallOpen', 1.8, k='excited', p='idle', e={'max': 'happy'}, sfx=['crowd', 'chime'], m='upbeat'),
      L('ANN', 'Welcome to Starlight Mall! Today only: free robot-baked cookies on every level!', a='announce'),
      L('KIP', 'Ready? Three, two, one...', k='excited', p='idle', a='ready'),
      A('clap', 1.3, k='excited', p='idle', z=1, sfx=['clap', 'freeze']),
      L('KIP', 'Max? Max! ...Oh. Right. You freeze too.', k='confused', p='shrug', a='maxFrozen', m='comedic'),
      A('fountainLook', 1.8, k='excited', p='idle', sfx=['shimmer']),
      L('KIP', 'The fountain stopped in mid-air. That is so beautiful.', k='happy', p='idle', a='fountain'),
      L('KIP', 'Free cookie. Free cookie. Free smoothie. I am leaving a coin, I am not a criminal.', k='happy', p='idle', a='samples', sfx=['pop']),
      A('balloonSee', 1.2, k='surprise', p='point'),
      L('KIP', 'Uh oh. Somebody lost a balloon. Let me just tie that back on... extra tight.', k='happy', p='idle', a='balloon', sfx=['zip']),
      A('escalator', 2.6, k='neutral', p='idle', sfx=['echostep'], m='eerie'),
      L('KIP', 'Wait. That person on the escalator. They are... moving.', k='fear', p='scared', a='escSee'),
      L('KIP', 'Hello? Are you freeze-proof too?', k='confused', p='wave', a='escSee'),
      A('vanish', 1.6, k='surprise', p='surprise', sfx=['glitch']),
      L('KIP', 'Okay. Nope. Nope, nope, nope.', k='fear', p='scared', a='nope'),
      A('clap2', 1.1, k='fear', p='scared', z=0, sfx=['clap', 'unfreeze']),
      L('MAX', 'Whoa. Why am I holding three cookies?', e={'max': 'surprise'}, a='after', m='comedic'),
      L('GIRL', 'Mommy, look! My balloon is tied on super tight!', e={'girl': 'happy'}, a='girl'),
      L('KIP', 'Max, somebody else was moving. While everything was stopped.', k='fear', p='idle', a='after', m='tense'),
      L('MAX', 'Like a time ninja?', e={'max': 'confused'}, a='after'),
      L('KIP', 'Like a time ninja who was looking right at me.', k='fear', p='scared', a='after'))

# ------------------------------------------------------------------ SCENE 4 Neon avenue in the rain, 7:40 PM
scene('avenue',
      L('MAX', 'Okay, theory. Maybe it was just a reflection.', k='neutral', p='idle', e={'max': 'neutral'}, a='walk', m='eerie', sfx=['rain']),
      L('KIP', 'Reflections do not wear hoods, Max.', k='angry', p='idle', a='walk'),
      L('KIP', 'I need to know if they are real. One more time.', k='angry', p='idle', a='decide'),
      L('MAX', 'Kip, maybe do not...', e={'max': 'fear'}, a='decide'),
      A('clap', 1.4, k='neutral', p='idle', z=1, sfx=['clap', 'freeze']),
      L('KIP', 'Whoa. Even the rain stopped. I can walk right through it.', k='excited', p='idle', a='rainWalk', m='magic'),
      *[dict(b) for b in HOOK[:1]],
      A('crack', 1.7, k='surprise', p='surprise', sfx=['crack'], m='eerie'),
      L('KIP', 'What is THAT? Is the air... cracked?', k='fear', p='scared', a='crackSee'),
      *[dict(b, sfx=['echostep']) for b in HOOK[1:]],
      L('KIP', 'Who are you? Why are you following me?!', k='angry', p='point', a='face', m='tense'),
      L('HOOD', 'Every second you freeze is stolen from the future. And the future always collects.', a='face'),
      L('KIP', 'Okay. That is the creepiest thing anyone has ever said to me.', k='fear', p='scared', a='face', m='comedic'),
      L('HOOD', 'Give me your hands, Kip. Before it is too late.', a='reach', m='tense'),
      L('KIP', 'Absolutely not!', k='angry', p='point', a='reach', sfx=['whoosh']))

# ------------------------------------------------------------------ SCENE 5 Maglev station, the chase
scene('station',
      A('runIn', 2.2, k='fear', p='idle', sfx=['steps', 'whoosh'], m='urgent'),
      L('KIP', 'Sorry, Max! You are coming with me!', k='fear', p='idle', a='drag', sfx=['scrape']),
      A('dragRun', 2.4, k='fear', p='idle', sfx=['scrape', 'steps']),
      L('KIP', 'Frozen people, frozen people... sorry, sir! ...Why are you so heavy, Max?!', k='fear', p='idle', a='dragRun2', sfx=['steps']),
      A('hoodFollow', 1.8, k='fear', p='scared', sfx=['echostep']),
      L('KIP', 'Clap! Clap!', k='angry', p='idle', a='clapGo', sfx=['clap']),
      A('unfreeze', 1.4, z=0, k='fear', p='idle', sfx=['unfreeze', 'doors']),
      L('TRAIN', 'Doors closing. Line Nine to Chrono District.', a='doors'),
      L('MAX', '...not do that. Wait. Why are we on a train?', e={'max': 'confused'}, a='inTrain', m='comedic'),
      L('KIP', 'Long story. Very creepy story.', k='fear', p='idle', a='inTrain'),
      L('MAX', 'Kip... is that your ninja? On the platform?', e={'max': 'fear'}, a='window', m='eerie'),
      A('watchRaise', 2.0, k='fear', p='scared', e={'max': 'fear'}, sfx=['ticktock']),
      L('KIP', 'The train is going to Chrono District. Where the famous time scientist works.', k='confused', p='think', a='idea', m='curious'),
      L('MAX', 'Professor Tock? From the science show? Let us go!', e={'max': 'happy'}, a='idea'))

# ------------------------------------------------------------------ SCENE 6 Chrono Laboratory, 9:00 PM
scene('lab',
      A('labOpen', 1.8, k='surprise', p='idle', e={'max': 'surprise', 'prof': 'happy'}, sfx=['hum'], m='curious'),
      L('PROF', 'Visitors! Do not touch anything that glows. Or hums. Actually, do not touch anything.', e={'prof': 'happy'}, a='greet'),
      L('KIP', 'Professor, I think I can stop time. And someone in a hood can move when I do it.', k='fear', p='idle', a='talk'),
      L('PROF', 'Stop time? Ha! Impossible. Unless... were you near this building last night?', e={'prof': 'confused'}, a='talk'),
      L('KIP', 'I walked past here on the way home. There was a big purple flash.', k='confused', p='think', a='talk'),
      L('PROF', 'My Chrono Pulse! It soaked right into you! Remarkable! Terrible! Mostly terrible!', e={'prof': 'surprise'}, a='pulse', sfx=['zap']),
      L('MAX', 'Why terrible?', e={'max': 'fear'}, a='talk'),
      L('PROF', 'Time is like ice on a lake. Every time you freeze it, it cracks a little.', e={'prof': 'neutral'}, a='holo', m='tense', sfx=['holo']),
      L('PROF', 'Too many cracks... and time stops. Forever. For everyone.', e={'prof': 'fear'}, a='holo', hl=['forever.']),
      L('MAX', 'Kip. How many times did you freeze it today?', e={'max': 'fear'}, a='holo'),
      L('KIP', 'Um... counting the pigeon and the balloon? Eleven.', k='fear', p='shrug', a='holo'),
      L('PROF', 'ELEVEN?!', e={'prof': 'surprise'}, a='eleven', hl=['eleven?!'], sfx=['boing']),
      A('doorHiss', 1.3, k='surprise', p='surprise', e={'prof': 'surprise', 'max': 'fear'}, sfx=['hiss']),
      L('HOOD', 'Twelve. If you count the milk.', a='enter', m='eerie'),
      L('KIP', 'It is YOU!', k='angry', p='point', a='enter', hl=['you!']),
      A('hoodOff', 2.4, k='surprise', p='surprise', e={'prof': 'surprise', 'max': 'surprise'}, sfx=['shimmer'], m='magic'),
      L('PROF', 'Wren?! My daughter? You disappeared a year ago!', e={'prof': 'surprise', 'wren': 'sad'}, a='reveal'),
      L('WREN', 'I never left, Dad. Your first Chrono Pulse hit me. I have been living between the seconds.', e={'wren': 'sad'}, a='reveal', m='sad'),
      L('WREN', 'I followed you to stop you, Kip. Not to hurt you. The cracks are almost joined.', e={'wren': 'neutral'}, a='reveal'),
      L('KIP', 'Then why did you not just SAY that?', k='angry', p='shrug', a='reveal', m='comedic'),
      L('WREN', 'I tried. You screamed and dragged your friend onto a train.', e={'wren': 'happy'}, a='reveal'),
      L('MAX', 'He did WHAT?', e={'max': 'surprise'}, a='reveal'),
      A('alarm', 1.4, k='surprise', p='surprise', e={'prof': 'fear', 'wren': 'fear', 'max': 'fear'}, sfx=['alarm'], m='urgent'),
      L('PROF', 'The crack monitor! They are joining up! Everybody hold on to some...', e={'prof': 'fear'}, a='alarm2'),
      A('bigFreeze', 2.4, z=1, k='fear', p='scared', e={'wren': 'fear'}, sfx=['bigfreeze'], m='silence'),
      L('KIP', 'Clap, clap! CLAP, CLAP! Why is it not working?!', k='fear', p='idle', a='clapFail', sfx=['clap']),
      L('WREN', 'Because time is not paused anymore, Kip. It is broken.', e={'wren': 'fear'}, a='broken', m='tense', hl=['broken.']))

# ------------------------------------------------------------------ SCENE 7 The frozen city
scene('frozen',
      A('frozenOpen', 2.4, k='fear', p='idle', e={'wren': 'neutral'}, sfx=['wind'], m='eerie'),
      L('WREN', 'The Chrono Core is on top of the Tock Tower. If we both touch it, the cracks will heal.', e={'wren': 'neutral'}, a='plan'),
      L('KIP', 'Then why do you sound sad about it?', k='confused', p='think', a='plan'),
      L('WREN', 'Because the Core takes back all the stolen time. And our power goes with it. Forever.', e={'wren': 'sad'}, a='plan', m='sad'),
      L('KIP', 'So I would be... normal again.', k='sad', p='sad', a='plan'),
      L('WREN', 'Normal. Late for the bus. Spilling the milk.', e={'wren': 'happy'}, a='plan'),
      L('KIP', 'Honestly? I kind of miss normal.', k='happy', p='idle', a='plan', m='warm'),
      A('quake', 1.6, k='fear', p='scared', e={'wren': 'fear'}, sfx=['crack', 'rumble'], m='urgent'),
      L('WREN', 'The street is falling apart! Jump on the hover-cars!', e={'wren': 'fear'}, a='quake2'),
      L('KIP', 'Falling APART?!', k='fear', p='scared', a='quake2', hl=['apart?!']),
      A('carJump', 3.4, k='fear', p='idle', e={'wren': 'neutral'}, sfx=['whoosh', 'land', 'whoosh', 'land', 'crash']),
      L('KIP', 'I am okay! I am okay! I am standing on a frozen pigeon, but I am okay!', k='happy', p='cheer', a='landed', m='comedic'),
      L('WREN', 'Keep going! Up the sky-stairs!', e={'wren': 'happy'}, a='landed', m='urgent'))

scene('core',
      A('coreOpen', 2.2, k='surprise', p='surprise', e={'wren': 'surprise'}, sfx=['hum', 'shimmer'], m='magic'),
      L('WREN', 'There it is. Ready? On three.', e={'wren': 'neutral'}, a='ready'),
      L('KIP', 'Wait. Wren... if we do this, you lose your power too. You have had it for a whole year.', k='sad', p='idle', a='ready', m='warm'),
      L('WREN', 'A whole year as the only person awake in a frozen world. Trust me, Kip. It gets lonely.', e={'wren': 'sad'}, a='ready'),
      L('KIP', 'Then let us go back. Together. One...', k='happy', p='idle', a='hands'),
      L('WREN', 'Two...', e={'wren': 'happy'}, a='hands'),
      L('KIP', 'THREE!', k='excited', p='idle', a='touch', chorus=['WREN'], hl=['three!']),
      A('restore', 3.8, z=0, k='surprise', p='surprise', e={'wren': 'surprise'}, sfx=['shatter', 'boom'], m='silence'))

# ------------------------------------------------------------------ SCENE 8 Back in the lab: everything moves again
scene('after',
      L('PROF', '...thing! ...Oh. Hello. Did something just happen?', e={'prof': 'confused', 'max': 'confused', 'wren': 'happy'}, a='wake', m='warm'),
      L('MAX', 'Kip! You were over there, and now you are over here! AGAIN!', e={'max': 'surprise'}, a='wake'),
      L('KIP', 'Max, I will explain everything. Mostly. Some of it. Over pizza.', k='happy', p='shrug', a='wake'),
      L('WREN', 'Hi, Dad. I am back. For real this time.', e={'wren': 'happy', 'prof': 'sad'}, a='hug'),
      L('PROF', 'Oh, Wren. A whole year... and you have not aged a day. Well, you have aged a year. You know what I mean.', e={'prof': 'happy'}, a='hug'),
      A('testClap', 1.6, k='confused', p='idle', sfx=['clap']),
      L('KIP', 'It is gone. I am just a kid who claps now.', k='happy', p='shrug', a='testClap2'),
      L('MAX', 'Kip, you were always a kid who claps.', e={'max': 'happy'}, a='testClap2', sfx=['boing']))

# ------------------------------------------------------------------ SCENE 9 Sky-bus platform, next morning: the final twist
scene('ending',
      L('KIP', 'A brand-new day. No powers. No cracks. Just a perfectly normal sky-bus ride.', k='happy', p='idle', e={'max': 'neutral'}, a='morning', m='curious'),
      L('MAX', 'Yeah... about normal. This morning I sneezed, and the birds outside just... stopped. In the air.', e={'max': 'confused'}, a='morning'),
      L('KIP', 'Max. Did you walk past the Chrono Lab last night?', k='fear', p='idle', a='suspect', m='tense'),
      L('MAX', 'Maybe? Why? Ah... ah...', e={'max': 'confused'}, a='suspect'),
      A('sneeze', 0.8, k='fear', p='scared', e={'max': 'surprise'}, sfx=['sneeze'], m='silence'),
      A('stopped', 1.6, z=1, e={'max': 'surprise'}, sfx=['freeze']),
      L('MAX', 'Uh oh. Kip? Kip?! ...Oh, this is going to be SO much fun.', e={'max': 'happy'}, a='maxPower', m='comedic', hl=['fun.']),
      A('maxClap', 1.2, z=0, k='surprise', p='surprise', e={'max': 'happy'}, sfx=['clap', 'unfreeze']),
      L('KIP', 'Why do I have a mustache?!', k='surprise', p='surprise', a='kipStache', hl=['mustache?!']),
      L('KIP', 'So... what would YOU do if you could stop time? Tell us in the comments!', k='happy', p='point', a='camera', m='upbeat'))
scene('outro',
      L('N', 'Next time: What if you woke up inside a video game?', a='outro', hl=['video', 'game?']))

if __name__ == '__main__':
    out = {'title': 'What If You Could Stop Time?', 'duration': 510, 'voices': VOICES, 'names': NAMES, 'beats': BEATS}
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'script.json'), 'w'), indent=1)
    words = sum(len(b['t'].split()) for b in BEATS if b.get('v'))
    print(len(BEATS), 'beats,', sum(1 for b in BEATS if b['v']), 'lines,', words, 'words')
