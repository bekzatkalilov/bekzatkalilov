"""EP04 "What If Everyone Had a Countdown Above Their Head?" — script source. Run to write script.json.

Same beat format as EP02/EP03 (s, v, t, mode, k, p, e, a, sfx, m, dur, hl, chorus).
The countdowns float above heads as separate props drawn by scenes.js (Kip's locked design is never altered).
`clocks` gives the in-story time of day (seconds after midnight) at the start of each scene, so every
countdown on screen ticks down in real time toward 4:00 PM.
"""
import json, os

VOICES = {
    'N': 'am_michael',      # narrator (channel voice), used twice
    'KIP': 'am_puck',       # Kip (same voice every episode)
    'MAX': 'am_liam',       # Max, Kip's best friend (same since EP01)
    'LILY': 'af_nova',      # Lily, class president, now their friend (same as EP03)
    'MOM': 'af_heart',      # Kip's mom (same as EP02/EP03)
    'TEACH': 'bm_daniel',   # Mr. Grumbold (same as EP03)
    'BAKER': 'bf_emma',     # Rosa the baker (same as EP03)
    'NEWS': 'af_sarah',     # TV news anchor (new)
}
NAMES = {'N': 'NARRATOR', 'KIP': 'KIP', 'MAX': 'MAX', 'LILY': 'LILY', 'MOM': 'MOM', 'TEACH': 'MR. GRUMBOLD',
         'BAKER': 'ROSA', 'NEWS': 'NEWS ANCHOR'}

H = 3600
CLOCKS = {'bedroom': 8 * H + 70, 'kitchen': 8 * H + 15 * 60, 'street': 8 * H + 40 * 60, 'class': 9 * H + 30,
          'list': 12 * H + 30, 'home': 14 * H + 30 * 60, 'climax': 15 * H + 59 * 60, 'ending': 8 * H}
ZERO = 16 * H   # 4:00 PM


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


# ------------------------------------------------------------------ 0:00 HOOK (flash-forward to the park at 3:59 PM)
HOOK_LINES = [
    ('KIP', 'Okay... why is my countdown almost at zero?!', dict(k='fear', p='scared', hl=['zero?!'])),
    ('MAX', 'Kip! What happens when it hits zero?!', dict(e={'max': 'fear', 'lily': 'fear'})),
    ('LILY', 'Nobody knows! Three... two... one...', dict(e={'lily': 'fear'}, hl=['three...', 'two...', 'one...'])),
]
scene('hook',
      A('hookOpen', 0.45, k='fear', p='scared', e={'max': 'fear', 'lily': 'fear'}, sfx=['heart'], m='tense'),
      *[L(v, t, a='count', **dict(kw)) for v, t, kw in HOOK_LINES],
      A('zero', 0.55, k='surprise', p='surprise', sfx=['impact']))
scene('title', A('title', 4.4, sfx=['riser'], m='magic'))
# ------------------------------------------------------------------ SCENE 1 Kip's room, 8:01 AM
scene('bedroom',
      L('N', 'Eight hours earlier... the whole world woke up with a strange new number.', a='sleep', m='curious'),
      A('alarm', 1.5, k='surprise', p='surprise', sfx=['ring']),
      L('KIP', 'Morning, world! Another perfectly normal Tuesday.', k='happy', p='cheer', a='up'),
      A('mirror', 1.8, k='surprise', p='surprise', sfx=['ding']),
      L('KIP', 'Uh... why is there a clock floating above my head?', k='confused', p='think', a='mirror'),
      L('KIP', 'Seven hours... fifty-eight minutes... and it is counting DOWN?', k='fear', p='scared', a='mirror', hl=['down?']),
      L('MAX', 'KIP! Look outside! Everybody has one!', k='surprise', p='surprise', e={'max': 'surprise'}, a='window', sfx=['door']),
      L('KIP', "Max! You've got one too! What does yours say?", k='surprise', p='point', a='window'),
      L('MAX', 'Sixty-one years! So something big happens to me when I am super old.', e={'max': 'happy'}, a='window'),
      L('KIP', 'Sixty-one YEARS? Mine says eight HOURS!', k='fear', p='scared', a='window', hl=['hours!']),
      L('MOM', "Kip! Breakfast! The TV says it's happening all over the world!", k='surprise', p='idle', e={'mom': 'happy'}, a='momDoor'),
      L('KIP', 'Mom! What does YOUR countdown say?', k='confused', p='point', a='momDoor'),
      L('MOM', "Mine? Oh, I... can't see it under this towel. Pancakes are getting cold!", e={'mom': 'fear'}, a='momDoor'),
      L('MAX', 'Your mom is definitely hiding something.', e={'max': 'confused'}, a='momDoor'),
      L('KIP', 'Moms are always hiding something. Usually cookies.', k='happy', p='shrug', a='momDoor', sfx=['whoosh']))
# ------------------------------------------------------------------ SCENE 2 Kitchen, 8:15 AM: the news
scene('kitchen',
      L('NEWS', 'Breaking news! Every single person on Earth woke up with a countdown above their head.', k='surprise', p='idle', e={'max': 'surprise', 'mom': 'neutral'}, a='tv', m='tense'),
      L('NEWS', 'Scientists believe that when your countdown reaches zero... your life changes forever.', a='tv', hl=['forever.']),
      L('KIP', 'Forever?! Mine reaches zero at four o\'clock TODAY!', k='fear', p='scared', a='tv', hl=['today!']),
      L('NEWS', 'Experts say there is absolutely no reason to panic.', a='tv'),
      L('NEWS', '...Unless your countdown is very, very short.', a='tv'),
      A('spit', 1.4, k='surprise', p='surprise', e={'max': 'surprise'}, sfx=['spit'], m='comedic'),
      L('MAX', 'Okay. Okay. Changes forever does not mean bad. Maybe you win a million dollars!', e={'max': 'happy'}, a='table'),
      L('KIP', 'Or maybe I get turned into a frog! Max, I have EIGHT HOURS!', k='fear', p='scared', a='table'),
      L('MOM', 'Kip, honey, breathe. Whatever happens at four... I promise it is going to be okay.', e={'mom': 'happy'}, a='table'),
      L('MAX', 'Come on. If your life is changing at four, we have a whole day to figure out how.', e={'max': 'happy'}, a='table'))
# ------------------------------------------------------------------ SCENE 3 Main street, 8:40 AM: Rosa's zero
scene('street',
      L('BAKER', 'Morning, boys! Everybody stand back! My countdown is about to hit zero!', k='surprise', p='idle', e={'baker': 'happy', 'max': 'surprise'}, a='baker', m='tense'),
      L('KIP', 'Five seconds! What is going to happen to her?!', k='fear', p='scared', a='bakerCount', hl=['five']),
      A('bakerZero', 1.6, k='surprise', p='surprise', e={'baker': 'surprise'}, sfx=['impact', 'ring']),
      L('BAKER', 'Hello? ...The mayor wants ten thousand cookies for the town festival?!', e={'baker': 'surprise'}, a='call', m='comedic'),
      L('BAKER', 'Ten thousand! I am going to need a much bigger oven!', e={'baker': 'happy'}, a='call', sfx=['confetti']),
      L('MAX', 'See? Zero is not scary! Zero is a giant cookie order!', e={'max': 'happy'}, a='call'),
      L('KIP', 'Okay. New plan. If my life changes forever at four... I am doing EVERYTHING before it happens.', k='excited', p='cheer', a='plan'),
      L('MAX', 'Everything? Like what?', e={'max': 'confused'}, a='plan'),
      L('KIP', 'A bucket list! Dessert first. Learn a cool trick. Say something nice to Mr. Grumbold!', k='happy', p='point', a='plan'),
      L('MAX', 'You are going to say something NICE to Mr. Grumbold? Now I am scared.', e={'max': 'fear'}, a='plan', sfx=['boing']))
# ------------------------------------------------------------------ SCENE 4 Classroom, 9:00 AM
scene('class',
      L('TEACH', 'Settle down! Countdowns are NOT an excuse to stop learning.', k='neutral', p='idle', e={'teach': 'angry', 'lily': 'happy', 'max': 'neutral'}, a='board', m='comedic'),
      L('KIP', 'Good morning, Mr. Grumbold. That is a really... nice sweater.', k='happy', p='idle', a='board'),
      L('TEACH', '...Thank you, Kip. Detention for being suspicious.', e={'teach': 'confused'}, a='board'),
      L('KIP', 'Worth it. Lily! Wait... your countdown already says zero!', k='surprise', p='point', a='lilyZero'),
      L('LILY', 'It hit zero yesterday. At lunch. The exact moment Max asked me to sit with you two.', e={'lily': 'happy'}, a='lilyZero', m='warm'),
      L('MAX', 'Wait. Sitting with us changed your life forever?', e={'max': 'surprise'}, a='lilyZero'),
      L('LILY', 'I have friends now. That is a pretty big change.', e={'lily': 'happy'}, a='lilyZero'),
      L('KIP', 'Lily, you are the smartest person I know. I have seven hours left. Help me!', k='fear', p='point', a='lilyZero'),
      L('LILY', 'I already made a spreadsheet. Fourteen zeros so far. All of them were good.', e={'lily': 'neutral'}, a='lilyZero', hl=['good.']),
      L('MAX', 'Uh... guys? Look at Mr. Grumbold.', e={'max': 'surprise'}, a='teachLook', m='tense'),
      L('TEACH', 'Hm? My countdown? Don\'t be ridiculous. It says... ten seconds?!', e={'teach': 'fear'}, a='teachCount', sfx=['tick'], hl=['ten']),
      L('KIP', 'Everybody get down!', k='fear', p='scared', a='duck', sfx=['whoosh']),
      A('teachZero', 2.4, k='surprise', p='surprise', e={'teach': 'surprise', 'lily': 'surprise', 'max': 'surprise'}, sfx=['impact', 'meow']),
      L('TEACH', 'Mister Whiskers?! You came home! After three whole years!', e={'teach': 'happy'}, a='cat', m='warm'),
      A('opera', 2.4, k='happy', p='idle', e={'teach': 'happy', 'lily': 'happy', 'max': 'happy'}, sfx=['opera']),
      L('LILY', 'Fifteen zeros. Fifteen happy endings.', e={'lily': 'happy'}, a='cat'),
      L('KIP', 'So mine is going to be good too... right?', k='confused', p='think', a='cat'),
      L('LILY', 'Probably. Unless...', e={'lily': 'confused'}, a='cat', m='tense'),
      L('KIP', 'Unless WHAT?', k='fear', p='scared', a='cat'),
      L('LILY', 'Nothing. Probably nothing. ...Do you want me to stop talking?', e={'lily': 'fear'}, a='cat'),
      L('KIP', 'YES. Please.', k='fear', p='scared', a='cat', m='comedic'))
# ------------------------------------------------------------------ SCENE 5 Park, 12:00 PM: the bucket list + Max's number changes
scene('list',
      A('listOpen', 2.0, k='excited', p='cheer', e={'max': 'happy', 'lily': 'neutral'}, sfx=['pop'], m='upbeat'),
      L('KIP', 'Bucket list, number one: dessert first!', k='excited', p='cheer', a='icecream'),
      A('brainfreeze', 1.6, k='fear', p='scared', sfx=['boing']),
      L('KIP', 'Brain freeze! Brain freeze! ...Totally worth it.', k='fear', p='scared', a='icecream'),
      L('KIP', 'Number two: learn a cool skateboard trick.', k='happy', p='point', a='skate'),
      A('skateFall', 2.0, k='surprise', p='surprise', e={'max': 'fear', 'lily': 'fear'}, sfx=['whoosh', 'crash']),
      L('MAX', 'Kip! Are you okay?', e={'max': 'fear'}, a='fallen'),
      L('KIP', 'Never better! Number three: learn the guitar.', k='happy', p='idle', a='guitar'),
      A('strum', 2.0, k='excited', p='idle', e={'max': 'confused', 'lily': 'confused'}, sfx=['guitar']),
      L('LILY', 'Kip, it has been three minutes. Nobody learns guitar in three minutes.', e={'lily': 'neutral'}, a='guitar'),
      L('KIP', "I don't HAVE time to learn it slowly!", k='angry', p='shrug', a='guitar'),
      L('MAX', 'Kip, slow down. You are acting like the world is ending.', e={'max': 'sad'}, a='argue', m='sad'),
      L('KIP', 'Maybe MY world is! It is easy for you, Max. You have sixty-one years. I have four hours!', k='angry', p='point', a='argue'),
      L('MAX', "I'm just trying to help...", e={'max': 'sad'}, a='argue'),
      L('KIP', 'Then stop helping! Just... let me do this alone.', k='angry', p='idle', a='argue'),
      A('hurt', 1.6, k='sad', p='sad', e={'max': 'sad', 'lily': 'sad'}, m='silence'),
      A('maxTimer', 2.4, k='surprise', p='surprise', e={'max': 'surprise', 'lily': 'surprise'}, sfx=['glitch', 'riser'], m='tense'),
      L('LILY', 'Max... your countdown. It just changed!', e={'lily': 'surprise'}, a='maxNew'),
      L('MAX', 'Three hours, fifty-eight minutes? That is exactly the same as Kip!', e={'max': 'surprise'}, a='maxNew', hl=['same']),
      L('LILY', 'Countdowns can change. When your future changes, your number changes too.', e={'lily': 'neutral'}, a='maxNew'),
      L('MAX', 'I just decided I am not leaving him alone at four o\'clock. No matter what he says.', e={'max': 'angry'}, a='maxNew'),
      L('KIP', "No! Whatever happens to me, I don't want it to happen to you! Stay away from me!", k='fear', p='scared', a='maxNew'),
      A('kipRuns', 1.8, k='sad', p='sad', e={'max': 'sad', 'lily': 'sad'}, sfx=['steps'], m='sad'),
      L('LILY', 'Kip, wait!', e={'lily': 'sad'}, a='kipGone'))
# ------------------------------------------------------------------ SCENE 6 Kip's room, 2:30 PM: Mom's towel
scene('home',
      L('KIP', 'Okay. Helmet. Pillow fort. Emergency snacks. Nothing can change my life in here.', k='fear', p='scared', a='fort', m='tense'),
      A('knock', 1.0, k='surprise', p='scared', sfx=['knock']),
      L('MOM', 'Kip? Can I come in?', e={'mom': 'neutral'}, a='momIn'),
      L('KIP', 'Mom, why are you STILL wearing that towel?', k='confused', p='think', a='momIn'),
      L('MOM', 'Because I am not ready for you to see my countdown yet.', e={'mom': 'happy'}, a='momIn'),
      L('KIP', "Mom, I'm scared. Max's number changed to match mine. What if something bad happens to both of us?", k='sad', p='sad', a='talk', m='sad'),
      L('MOM', 'Oh, sweetheart. The scary part is never the zero. It is all the time you waste being afraid of it.', e={'mom': 'sad'}, a='talk', m='warm'),
      L('KIP', 'I wasted my whole day. I yelled at Max. I never even finished my list.', k='sad', p='sad', a='talk'),
      L('MOM', 'Then maybe it is time to go find him. Be at the park at four. Trust me.', e={'mom': 'happy'}, a='talk'),
      L('KIP', 'Why the park? Mom... what are you not telling me?', k='confused', p='think', a='talk', m='tense'),
      A('towelOff', 2.4, k='surprise', p='surprise', e={'mom': 'happy'}, sfx=['glitch', 'ding']),
      L('KIP', 'Your countdown... it ends at four o\'clock too?!', k='surprise', p='surprise', a='momTimer', hl=['too?!']),
      L('MOM', 'Some changes happen to a whole family at once. Now go. Your best friend is waiting.', e={'mom': 'happy'}, a='momTimer', m='warm'),
      L('KIP', 'MAX!', k='excited', p='point', a='momTimer', sfx=['whoosh']))
# ------------------------------------------------------------------ SCENE 7 Park at sunset, 3:59 PM: zero
scene('climax',
      A('run', 2.0, k='excited', p='idle', e={'max': 'sad', 'lily': 'sad'}, sfx=['steps'], m='urgent'),
      L('KIP', 'Max! Lily! Wait!', k='excited', p='point', a='arrive'),
      L('MAX', 'Kip? You came back.', e={'max': 'surprise'}, a='talk'),
      L('KIP', 'Max, I am so sorry. I was so scared of four o\'clock that I forgot the most important thing on my list.', k='sad', p='sad', a='talk', m='warm'),
      L('MAX', 'What was it?', e={'max': 'sad'}, a='talk'),
      A('listShow', 1.8, k='sad', p='idle', sfx=['pop']),
      L('KIP', 'Number seven. Spend my last normal day with my best friend.', k='sad', p='idle', a='listRead'),
      L('MAX', 'You could have just said that, you know.', e={'max': 'happy'}, a='listRead'),
      L('LILY', 'Guys! Sorry to interrupt the friendship moment, but... look up!', e={'lily': 'fear'}, a='lookUp', m='tense', sfx=['heart']),
      *[L(v, t, a='count', **dict(kw)) for v, t, kw in HOOK_LINES],
      A('zero', 2.6, k='surprise', p='surprise', e={'max': 'surprise', 'lily': 'surprise'}, sfx=['impact'], m='silence'),
      A('nothing', 2.2, k='confused', p='think', e={'max': 'confused', 'lily': 'confused'}, sfx=['cricket']),
      L('KIP', '...Is that it? Did my life just change?', k='confused', p='think', a='after'),
      L('MAX', "I don't feel different. Do I look different?", e={'max': 'confused'}, a='after'),
      A('bark', 1.4, k='surprise', p='surprise', e={'max': 'surprise', 'lily': 'surprise'}, sfx=['bark']),
      L('LILY', 'What was that?', e={'lily': 'surprise'}, a='bark2'),
      A('puppy', 2.6, k='excited', p='surprise', e={'max': 'happy', 'lily': 'happy'}, sfx=['bark', 'shimmer'], m='magic'),
      L('MOM', 'Surprise! Kip, meet the newest member of our family!', e={'mom': 'happy'}, a='family'),
      L('KIP', 'A PUPPY?! We got a PUPPY?!', k='excited', p='cheer', a='family', sfx=['confetti'], hl=['puppy?!']),
      L('MOM', 'I picked her up from the shelter today. Four o\'clock, on the dot.', e={'mom': 'happy'}, a='family', m='warm'),
      L('KIP', 'THIS was my life-changing moment?', k='happy', p='shrug', a='family'),
      L('MOM', 'Trust me. A puppy changes everything. Ask anyone with a chewed-up shoe.', e={'mom': 'happy'}, a='family'),
      L('MAX', 'But why did MY countdown change too?', e={'max': 'confused'}, a='family'),
      L('MOM', 'Well, somebody has to help Kip walk her every single day. I was going to ask you, Max.', e={'mom': 'happy'}, a='family'),
      L('MAX', 'Me? Every day? ...Best. Zero. Ever.', e={'max': 'happy'}, a='family'),
      L('LILY', 'Your number changed the second you chose to stand by him. That was the real change.', e={'lily': 'happy'}, a='family'),
      L('KIP', 'So... what should we name her?', k='happy', p='idle', a='family'),
      L('MAX', 'Zero!', e={'max': 'happy', 'lily': 'happy'}, a='family', chorus=['LILY'], hl=['zero!']),
      L('KIP', 'Zero. It is perfect.', k='happy', p='cheer', a='family'),
      A('hug', 2.6, k='happy', p='cheer', e={'max': 'happy', 'lily': 'happy', 'mom': 'happy'}, sfx=['bark', 'shimmer']))
# ------------------------------------------------------------------ SCENE 8 Next morning: the final twist
scene('ending',
      L('KIP', 'Morning, Mr. Grumbold! No more countdowns. Life is back to normal!', k='happy', p='wave', e={'teach': 'happy', 'lily': 'happy', 'max': 'happy'}, a='morning', m='curious'),
      L('TEACH', 'Indeed. Calm. Quiet. Predictable. Exactly how I like it.', e={'teach': 'happy'}, a='morning'),
      A('teachTimer', 1.8, k='surprise', p='surprise', e={'lily': 'surprise', 'max': 'surprise'}, sfx=['glitch']),
      L('LILY', 'Um... Mr. Grumbold? You have a brand-new countdown.', e={'lily': 'surprise'}, a='newCount'),
      L('TEACH', 'What? Impossible! It says... three seconds?!', e={'teach': 'fear'}, a='newCount', sfx=['tick'], hl=['three']),
      A('kittens', 3.0, k='surprise', p='surprise', e={'teach': 'surprise', 'lily': 'happy', 'max': 'surprise'}, sfx=['meow', 'wah'], m='comedic'),
      L('TEACH', 'Mister Whiskers... is a GIRL?!', e={'teach': 'surprise'}, a='kitRead', hl=['girl?!']),
      L('MAX', 'Life changed forever. Again.', e={'max': 'happy'}, a='kitRead'),
      L('KIP', 'So... what do you think YOUR countdown is counting down to? Tell us in the comments!', k='happy', p='point', a='camera'))
scene('outro',
      L('N', 'Next time: What if you could pause time... for everyone except you?', a='outro', hl=['pause', 'time...']))

if __name__ == '__main__':
    out = {'title': 'What If Everyone Had a Countdown Above Their Head?', 'duration': 510, 'voices': VOICES, 'names': NAMES,
           'clocks': CLOCKS, 'zero': ZERO, 'beats': BEATS}
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'script.json'), 'w'), indent=1)
    print(len(BEATS), 'beats,', sum(1 for b in BEATS if b['v']), 'lines')
