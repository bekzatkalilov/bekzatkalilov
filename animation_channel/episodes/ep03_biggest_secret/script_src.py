"""EP03 "What If Everyone Could See Your Biggest Secret?" — script source. Run to write script.json.

Same beat format as EP02 (s, v, t, mode, k, p, e, a, sfx, m, dur, hl, chorus).
Floating secret signs are props drawn above heads by scenes.js (Kip's design is never altered).
"""
import json, os

VOICES = {
    'N': 'am_michael',      # narrator (channel voice), used twice
    'KIP': 'am_puck',       # Kip (same voice every episode)
    'MAX': 'am_liam',       # Max, Kip's best friend (same as EP01/EP02)
    'MOM': 'af_heart',      # Kip's mom (same as EP02)
    'LILY': 'af_nova',      # Lily, the perfect class president
    'TEACH': 'bm_daniel',   # Mr. Grumbold, the strict teacher
    'COP': 'am_onyx',       # Officer Dan
    'BAKER': 'bf_emma',     # Rosa the baker
    'DRIVER': 'am_adam',    # bus driver
}
NAMES = {'N': 'NARRATOR', 'KIP': 'KIP', 'MAX': 'MAX', 'MOM': 'MOM', 'LILY': 'LILY', 'TEACH': 'MR. GRUMBOLD',
         'COP': 'OFFICER DAN', 'BAKER': 'ROSA', 'DRIVER': 'BUS DRIVER'}

# the secrets that float above heads
SIGNS = {
    'max': 'I STILL SLEEP WITH A TEDDY BEAR NAMED MR. FLUFFLES',
    'cop': "I'M TERRIFIED OF PIGEONS",
    'baker': "MY 'HOMEMADE' COOKIES ARE FROM THE SUPERMARKET",
    'teach': 'I SING OPERA IN THE SHOWER EVERY MORNING',
    'lily': "I'VE NEVER HAD A REAL FRIEND",
    'kip': "WE'RE MOVING AWAY ON FRIDAY... AND I HAVEN'T TOLD MAX",
    'mom': "I TURNED DOWN THE NEW JOB. WE'RE NOT MOVING!",
    'max2': "I'M LEAVING FOR THE WHOLE SUMMER TONIGHT. NO GOODBYES.",
    'driver': "I'VE NEVER DRIVEN A BUS BEFORE TODAY",
    'kip2': "MAX IS MY BEST FRIEND AND I'M SORRY I LAUGHED",
    'teddy': 'I CAN TALK',
    'lily2': 'I HAVE TWO REAL FRIENDS NOW',
}


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


# ------------------------------------------------------------------ 0:00 HOOK (flash-forward to the classroom)
scene('hook',
      A('hookOpen', 0.5, k='fear', p='scared', sfx=['heart'], m='tense'),
      L('KIP', 'Okay. Why is everyone staring at the sign above my head?', k='fear', p='scared', a='stare'),
      L('KIP', "No, no, no, no... don't load. DON'T LOAD!", k='fear', p='scared', a='loading', hl=["load!"], sfx=['glitch', 'riser']),
      A('reveal', 0.5, k='surprise', p='surprise', sfx=['impact']))
scene('title', A('title', 4.4, sfx=['riser'], m='magic'))
# ------------------------------------------------------------------ SCENE 1 Kip's room: the morning it began
scene('bedroom',
      L('N', 'That morning, nobody in town knew what was about to happen...', k='happy', p='idle', a='sleep', m='curious'),
      A('alarm', 1.6, k='surprise', p='surprise', sfx=['ding']),
      L('KIP', 'Morning, world! Today is going to be a totally normal day.', k='happy', p='cheer', a='up'),
      L('MAX', 'KIP! Open the window! Something is very, very wrong!', k='surprise', p='idle', e={'max': 'fear'}, a='window', sfx=['door']),
      L('KIP', "Max? What's that glowing thing above your head?", k='confused', p='point', a='window'),
      L('MAX', "Don't read it! Do NOT read it!", e={'max': 'fear'}, a='window'),
      L('KIP', '"I still sleep with a teddy bear named... Mr. Fluffles"?', k='surprise', p='idle', a='read', hl=['fluffles"?']),
      L('MAX', "It's not funny!", e={'max': 'angry'}, a='read'),
      A('laughFit', 2.2, k='happy', p='cheer', e={'max': 'angry'}, sfx=['laughKip']),
      L('KIP', 'Mister... Fluffles! That is the best thing I have ever heard!', k='happy', p='cheer', a='read'),
      L('MAX', "Everybody has one! The whole town woke up with their biggest secret floating over their heads!", e={'max': 'fear'}, a='read'),
      L('KIP', "Wait. Everybody? Then why don't I have one?", k='confused', p='think', a='noSign'),
      L('MAX', 'Maybe your secrets are just boring.', e={'max': 'neutral'}, a='noSign'),
      L('KIP', 'Or maybe I am a person with no secrets at all.', k='happy', p='idle', a='noSign'),
      L('MOM', 'Kip! Breakfast! And... please do not look above my head.', k='surprise', p='idle', e={'mom': 'fear'}, a='momDoor'),
      L('KIP', "Relax, Mom. You don't even have one. It just says 'loading'.", k='happy', p='shrug', a='momDoor'),
      L('MOM', 'Oh, thank goodness. I mean... how strange! Must be a very slow sign.', e={'mom': 'happy'}, a='momDoor'),
      L('MAX', 'Your mom is acting super weird.', e={'max': 'confused'}, a='momDoor'),
      L('KIP', "Moms are always weird. Come on! Let's go see the town!", k='happy', p='point', a='momDoor', sfx=['whoosh']))
# ------------------------------------------------------------------ SCENE 2 Main street: everyone's secrets
scene('street',
      L('BAKER', 'Good morning, boys! Fresh homemade cookies! Baked with love!', k='happy', p='idle', e={'baker': 'happy'}, m='comedic'),
      L('KIP', '"My homemade cookies are from the supermarket"?', k='happy', p='point', a='readBaker'),
      L('BAKER', "That sign is a liar! ...Mostly. Okay, it's a little bit true.", e={'baker': 'fear'}, a='readBaker'),
      L('COP', 'Move along, kids. Nothing to see here. Everything is under control.', e={'cop': 'neutral'}, a='cop'),
      L('MAX', '"I\'m terrified of pigeons"?', e={'max': 'surprise'}, a='cop'),
      A('pigeon', 2.0, e={'cop': 'fear'}, sfx=['flap', 'boing']),
      L('COP', 'AAAH! Get it off! Get it off me! It is looking at me with its tiny eyes!', e={'cop': 'fear'}, a='pigeonOn'),
      L('KIP', 'This is the best day ever! I should take pictures of EVERYBODY!', k='excited', p='cheer', a='pigeonOn'),
      L('MAX', "Kip... maybe don't. People look really embarrassed.", e={'max': 'sad'}, a='pigeonOn'),
      L('KIP', "Relax! It's just a joke. Who cares about a few silly secrets?", k='happy', p='shrug', a='pigeonOn'),
      A('snap', 1.8, k='excited', p='point', sfx=['snap']),
      L('KIP', 'And... posted! The class group chat is going to LOVE this.', k='happy', p='cheer', a='posted'),
      L('MAX', 'Wait. Which pictures did you post?', e={'max': 'fear'}, a='posted'),
      L('KIP', 'Just the funny ones. Rosa, Officer Dan... and one tiny picture of Mr. Fluffles.', k='happy', p='shrug', a='posted', hl=['fluffles.']),
      L('MAX', 'KIP!', e={'max': 'angry'}, a='posted', sfx=['boing']))
# ------------------------------------------------------------------ SCENE 3 Classroom: Mr. Grumbold and Lily
scene('class',
      L('TEACH', 'Silence! Eyes on the board! We will NOT be discussing the signs today.', e={'teach': 'angry', 'lily': 'neutral'}, a='board', m='comedic'),
      L('MAX', 'Everybody in the hallway called me Mr. Fluffles. Fourteen times.', e={'max': 'sad'}, a='board'),
      L('KIP', 'Come on, Max. In a week nobody will even remember.', k='happy', p='shrug', a='board'),
      L('MAX', "Easy for you to say. You don't have a sign.", e={'max': 'angry'}, a='board'),
      L('KIP', 'Mr. Grumbold... is it true you sing opera in the shower?', k='happy', p='idle', a='board'),
      L('TEACH', 'Absolutely not! I would never! ...Every morning. Fine.', e={'teach': 'fear'}, a='board'),
      A('opera', 2.4, e={'teach': 'happy'}, sfx=['opera']),
      L('TEACH', 'Ahem. Moving on!', e={'teach': 'neutral'}, a='board'),
      L('KIP', 'Ooh, and Lily the perfect class president has one too! Let me guess... "I once got a B-plus"?', k='happy', p='point', a='lilyRead'),
      A('lilySign', 1.6, k='happy', p='idle', e={'lily': 'sad'}, m='sad'),
      L('KIP', '"I\'ve never had a real friend."', k='surprise', p='idle', a='lilyRead'),
      L('LILY', "Go ahead. Laugh. Everybody else already did.", e={'lily': 'sad'}, a='lilyRead'),
      L('KIP', "I... I wasn't going to laugh at that one.", k='sad', p='sad', a='lilyRead'),
      L('LILY', "People think perfect means happy. It doesn't. It just means nobody sits next to you.", e={'lily': 'sad'}, a='lilyRead'),
      L('MAX', 'You can sit next to us at lunch, Lily. If you want.', e={'max': 'happy', 'lily': 'surprise'}, a='lilyRead', m='warm'),
      L('LILY', 'Really? ...Thanks, Max.', e={'lily': 'happy'}, a='lilyRead'))
# ------------------------------------------------------------------ SCENE 4 Classroom: Kip's sign loads
scene('class2',
      A('flicker', 2.0, k='surprise', p='surprise', e={'max': 'surprise', 'lily': 'surprise', 'teach': 'surprise'}, sfx=['glitch', 'heart'], m='tense'),
      L('LILY', 'Kip... your sign. It is starting to load.', e={'lily': 'surprise'}, a='loading'),
      L('KIP', 'What? No! That is impossible! I have no secrets!', k='fear', p='scared', a='loading'),
      L('KIP', "Quick! Somebody give me a hat! A bucket! A really big sandwich!", k='fear', p='scared', a='hide', sfx=['boing']),
      L('TEACH', 'Kip, sit down. Signs cannot be covered. Science says.', e={'teach': 'neutral'}, a='hide'),
      A('kipReveal', 2.6, k='fear', p='scared', e={'max': 'surprise', 'lily': 'surprise', 'teach': 'surprise'}, sfx=['impact'], m='silence'),
      L('MAX', '"We\'re moving away on Friday... and I haven\'t told Max"?', e={'max': 'sad'}, a='kipSecret', m='sad'),
      L('KIP', 'Max, I can explain...', k='sad', p='sad', a='kipSecret'),
      L('MAX', "You're MOVING? Like, away away? When were you going to tell me?", e={'max': 'angry'}, a='kipSecret'),
      L('KIP', "I didn't know how. Every time I tried, the words just... got stuck.", k='sad', p='sad', a='kipSecret'),
      L('MAX', 'You laughed at my secret all day. And the whole time, you were hiding THIS?', e={'max': 'angry'}, a='kipSecret'),
      L('KIP', 'Max, wait!', k='sad', p='point', a='kipSecret'),
      A('maxLeaves', 2.2, k='sad', p='sad', e={'max': 'sad'}, sfx=['door']),
      L('LILY', 'He just needs time, Kip. Secrets hurt more when they come out by accident.', k='sad', p='sad', e={'lily': 'sad'}, a='afterMax'))
# ------------------------------------------------------------------ SCENE 5 Home: Mom's sign (twist)
scene('home',
      L('KIP', 'Mom... everybody saw my sign. And now Max hates me.', k='sad', p='sad', e={'mom': 'sad'}, a='door', m='sad'),
      L('MOM', "Oh, sweetheart. Come here. I'm so sorry it happened like that.", e={'mom': 'sad'}, a='door'),
      L('KIP', "Wait. Mom... you have a sign too. It's loading right now.", k='surprise', p='point', a='momLoad', sfx=['glitch']),
      L('MOM', "Oh no. Not yet! It was supposed to be a surprise!", e={'mom': 'fear'}, a='momLoad'),
      A('momSign', 2.0, k='surprise', p='surprise', e={'mom': 'happy'}, sfx=['ding']),
      L('KIP', '"I turned down the new job. We\'re not moving"?', k='surprise', p='surprise', a='momRead', hl=['not', 'moving"?']),
      L('MOM', "I was going to tell you tonight. With pizza. And a cake that said 'We're staying.'", e={'mom': 'happy'}, a='momRead', m='warm'),
      L('KIP', "We're STAYING? We're really staying?!", k='excited', p='cheer', a='momRead', sfx=['confetti']),
      L('MOM', 'Your whole life is here, Kip. Your school. Your friends. Max.', e={'mom': 'happy'}, a='momRead'),
      L('KIP', 'But why did you keep it a secret?', k='confused', p='think', a='momRead'),
      L('MOM', "I didn't want to promise you something until I was sure. Some secrets are just good news waiting for the right moment.", e={'mom': 'happy'}, a='momRead'),
      L('KIP', 'And mine was bad news waiting for the wrong moment.', k='sad', p='sad', a='momRead'),
      L('MOM', 'Then go make it right. The biggest secrets always take the longest to say.', e={'mom': 'happy'}, a='momRead'),
      L('KIP', 'Max! I have to tell him right now!', k='excited', p='point', a='momRead'))
# ------------------------------------------------------------------ SCENE 6 Max's house: a new secret (twist 2)
scene('maxhouse',
      L('LILY', "Kip! Kip, stop! Max's sign changed! It's a NEW secret!", k='surprise', p='idle', e={'lily': 'fear'}, a='lilyRun', m='tense'),
      L('KIP', 'Signs can change?', k='confused', p='think', a='lilyRun'),
      L('LILY', "When your biggest secret changes, your sign changes too. Look at the picture Rosa sent!", e={'lily': 'fear'}, a='phone'),
      L('KIP', '"I\'m leaving for the whole summer tonight. No goodbyes."', k='fear', p='scared', a='phone', hl=['tonight.']),
      L('LILY', "His bus leaves at six o'clock. It's five fifty-one!", e={'lily': 'fear'}, a='phone', hl=['six']),
      L('KIP', 'Then we run. RIGHT NOW!', k='angry', p='point', a='phone', sfx=['whoosh'], m='urgent'))
# ------------------------------------------------------------------ SCENE 7 The race across town (climax)
scene('race',
      A('run1', 2.4, k='angry', p='idle', sfx=['steps']),
      L('BAKER', 'Kip! Need a ride? My delivery bike is faster than it looks!', e={'baker': 'happy'}, a='bike'),
      L('KIP', 'Rosa, you are the best! Even with supermarket cookies!', k='excited', p='cheer', a='bike'),
      A('ride', 2.6, k='excited', p='cheer', sfx=['whoosh', 'horn']),
      L('COP', 'Halt! Road closed! Giant flock of pigeons ahead!', e={'cop': 'fear'}, a='block'),
      L('KIP', "Officer Dan, my best friend is leaving! Please!", k='sad', p='point', a='block'),
      L('COP', "...For a best friend? Fine. I'll face my fears. Go! GO!", e={'cop': 'angry'}, a='block'),
      A('pigeons', 2.4, e={'cop': 'fear'}, sfx=['flap', 'whoosh']),
      L('TEACH', 'Kip! Running in the street?! ...For a friend? Then RUN! I shall sing you a victory song!', e={'teach': 'happy'}, a='teachCheer'),
      A('opera2', 2.0, k='excited', p='cheer', e={'teach': 'happy'}, sfx=['opera']),
      L('LILY', "Five fifty-nine! We're not going to make it!", k='fear', p='scared', e={'lily': 'fear'}, a='clock', sfx=['tick']))
# ------------------------------------------------------------------ SCENE 8 Bus station at sunset
scene('station',
      L('DRIVER', 'Last call! Doors closing! Please don\'t look at my sign!', e={'driver': 'fear', 'max': 'sad'}, a='bus', m='tense'),
      L('KIP', 'MAX! WAIT!', k='fear', p='point', a='kipArrive', sfx=['whoosh']),
      L('MAX', 'Kip? What are you doing here?', e={'max': 'surprise'}, a='talk'),
      L('KIP', "We're not moving! Mom turned down the job! I'm staying!", k='excited', p='cheer', a='talk'),
      L('MAX', "That's great. Really. But you still laughed at me. In front of everyone.", e={'max': 'sad'}, a='talk', m='sad'),
      L('KIP', "I know. And I'm sorry. I thought secrets were funny... until mine showed up.", k='sad', p='sad', a='talk'),
      A('kipNew', 2.4, k='sad', p='sad', e={'max': 'surprise'}, sfx=['shimmer'], m='warm'),
      L('MAX', 'Your sign... it changed. "Max is my best friend and I\'m sorry I laughed."', e={'max': 'surprise'}, a='kip2'),
      L('KIP', "Turns out that's my biggest secret now. I just never said it out loud.", k='happy', p='idle', a='kip2'),
      L('MAX', "That's the worst secret I've seen all day.", e={'max': 'happy'}, a='kip2'),
      L('MAX', "...It's also the nicest one.", e={'max': 'happy'}, a='kip2', m='warm'),
      L('DRIVER', 'So... is anybody getting on this bus, or not?', e={'driver': 'neutral'}, a='kip2'),
      L('MAX', "I'll take the morning bus. And I'll say goodbye properly this time.", e={'max': 'happy'}, a='kip2'),
      A('hug', 2.4, k='happy', p='cheer', e={'max': 'happy'}, sfx=['shimmer']),
      L('LILY', 'Can I join the group hug? I have never been in one.', e={'lily': 'happy'}, a='hug2'),
      L('KIP', 'Get in here, Lily!', k='happy', p='cheer', a='hug2'),
      A('lilyNew', 2.2, k='happy', p='cheer', e={'lily': 'happy'}, sfx=['shimmer']),
      L('MAX', 'Lily! Your sign changed too!', e={'max': 'surprise'}, a='lily2'),
      L('LILY', '"I have two real friends now." ...Okay. I am definitely going to cry.', e={'lily': 'happy'}, a='lily2'),
      L('DRIVER', 'Me too, honestly. Also, I really need to learn how to drive this thing.', e={'driver': 'sad'}, a='lily2', m='comedic'))
# ------------------------------------------------------------------ SCENE 9 next morning: the final twist
scene('ending',
      L('KIP', 'Morning, mirror! No sign. No secrets. Totally normal.', k='happy', p='idle', a='mirror', m='curious'),
      L('MAX', "Mine's gone too! And look who came to say goodbye.", e={'max': 'happy'}, a='teddy'),
      L('KIP', 'Mister Fluffles! Nice to finally meet you.', k='happy', p='wave', a='teddy'),
      A('teddySign', 2.6, k='happy', p='idle', sfx=['glitch', 'ding'], m='magic'),
      L('KIP', '"I... can... talk"?!', k='surprise', p='surprise', a='teddyRead', hl=['talk"?!']),
      A('wink', 1.6, k='surprise', p='scared', e={'max': 'surprise'}, sfx=['ding', 'wah']),
      L('KIP', "Nope! Nope! I'm going back to bed!", k='fear', p='scared', a='teddyRead', m='comedic'),
      L('KIP', "So... what would YOUR biggest secret say? Don't tell me. Tell the comments.", k='happy', p='point', a='camera'))
scene('outro',
      L('N', 'Next time: What if you could live one day... as your best friend?', a='outro', hl=['best', 'friend?']))

if __name__ == '__main__':
    out = {'title': 'What If Everyone Could See Your Biggest Secret?', 'duration': 510, 'voices': VOICES, 'names': NAMES,
           'signs': SIGNS, 'beats': BEATS}
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'script.json'), 'w'), indent=1)
    print(len(BEATS), 'beats,', sum(1 for b in BEATS if b['v']), 'lines')
