"""EP02 "What If You Could Read Everyone's Mind?" — script source. Run to write script.json.

Beat fields (EP01 format, extended for dialogue):
  s     scene id (scenes.js)            v   speaker id (see VOICES) or None for a silent action beat
  t     line                            mode 'think' = thought (mouth closed, echo voice, thought bubble)
  k/p   Kip expression / pose           e   {castId: expression} for supporting characters
  a     action id for the scene         sfx list of sound cues      m  music mood from this beat on
  dur   length of a silent action beat  hl  words highlighted in the subtitle
"""
import json, os

VOICES = {
    'N': 'am_michael',      # narrator (same as EP01), used twice
    'KIP': 'am_puck',       # Kip (same as EP01)
    'MAX': 'am_liam',       # Max, Kip's best friend (same as EP01)
    'MOM': 'af_heart',      # Mom
    'GRAN': 'bm_george',    # Grandpa Shelby, the old neighbour
    'COCO': 'bf_lily',      # Coco, the neighbourhood gossip
    'MAIL': 'am_fenrir',    # townsfolk, heard only as thoughts
    'LADY': 'af_jessica',
    'BAKER': 'bm_lewis',
    'JOG': 'af_river',
    'DOG': 'am_echo',
}
NAMES = {'N': 'NARRATOR', 'KIP': 'KIP', 'MAX': 'MAX', 'MOM': 'MOM', 'GRAN': 'GRANDPA SHELBY', 'COCO': 'COCO',
         'MAIL': 'MAILMAN', 'LADY': 'LADY', 'BAKER': 'BAKER', 'JOG': 'JOGGER', 'DOG': 'DOG WALKER'}


def L(v, t, k=None, p=None, **kw):
    b = {'v': v, 't': t}
    if k: b['k'] = k
    if p: b['p'] = p
    b.update(kw)
    return b


def T(v, t, k=None, p=None, **kw):
    return L(v, t, k, p, mode='think', **kw)


def A(a, dur, **kw):
    return dict(v=None, a=a, dur=dur, **kw)


SCENES = []


def scene(s, *beats):
    for b in beats:
        b['s'] = s
        SCENES.append(b)


# ------------------------------------------------------------------ 0:00 HOOK
scene('hook',
      A('hookOpen', 0.9, k='surprise', p='surprise', sfx=['ring'], m='tense'),
      T('COCO', "Don't let Kip find out!", k='fear', p='scared', a='b1'),
      T('GRAN', 'He must never know...', a='b2'),
      T('MAX', 'Tonight... everything changes.', a='b3'),
      L('KIP', 'Wait... I can hear what everyone is THINKING?!', k='surprise', p='surprise', a='shout', hl=['thinking?!'], sfx=['impact']))
scene('title',
      A('title', 4.6, sfx=['riser', 'shimmer'], m='magic'))
# ------------------------------------------------------------------ SCENE 1 backyard: the falling star
scene('yard',
      L('N', 'One morning, a few hours earlier...', a='establish', m='bounce'),
      L('MAX', 'Kip! Watch this! My best throw ever!', k='happy', p='idle', e={'max': 'excited'}, a='ball'),
      L('KIP', 'Last time you did that, you broke my window.', k='neutral', p='shrug'),
      L('MAX', 'That was one time!', e={'max': 'angry'}),
      L('KIP', 'It was four times. This week.', k='neutral', p='idle', hl=['four']),
      A('throw', 2.4, e={'max': 'excited'}, sfx=['whoosh']),
      A('starfall', 3.2, k='surprise', p='surprise', e={'max': 'surprise'}, sfx=['fall', 'boom'], m='magic'),
      L('MAX', '...Did I just knock a star out of the sky?', e={'max': 'surprise'}, a='crater'),
      L('KIP', 'You knocked a STAR out of the sky!', k='excited', p='cheer', a='crater', hl=['star']),
      L('KIP', "Whoa... it's warm. And it's humming.", k='happy', p='think', a='near'),
      L('MAX', "Don't touch it! What if it's radioactive? What if it's an alien egg?!", e={'max': 'fear'}, a='near'),
      A('touch', 2.6, k='surprise', p='point', e={'max': 'fear'}, sfx=['ring', 'impact', 'shimmer']),
      L('KIP', 'Ow... my ears are buzzing. Max, did you say something?', k='confused', p='idle', a='glow', m='curious'),
      L('MAX', "Nope. I'm totally fine. Not hungry at all.", e={'max': 'happy'}, a='glow'),
      T('MAX', "I'm SO hungry. I could eat a whole pizza. With the box.", e={'max': 'happy'}, a='glow'),
      L('KIP', "...You're hungry.", k='neutral', p='idle', a='glow'),
      L('MAX', 'How did you know that?', e={'max': 'surprise'}, a='glow'),
      L('KIP', 'You just said it. "With the box."', k='confused', p='shrug', a='glow', hl=['box."']),
      L('MAX', 'I did NOT say that out loud!', e={'max': 'fear'}, a='glow'),
      L('KIP', 'Okay... think of a number. Any number.', k='happy', p='think', a='glow'),
      T('MAX', 'Seven. No, too easy. Eleventy-twelve!', e={'max': 'happy'}, a='glow'),
      L('KIP', "Eleventy-twelve isn't a number.", k='neutral', p='shrug', a='glow', hl=['eleventy-twelve']),
      L('MAX', "AAAH! You're inside my head! Get out! It's messy in there!", e={'max': 'fear'}, a='glow', sfx=['boing']),
      L('KIP', 'Max... I think this star lets me read minds.', k='surprise', p='idle', a='glow'),
      L('MAX', "That's the coolest thing that has ever happened. And also the scariest.", e={'max': 'surprise'}, a='glow'),
      L('KIP', "Come on! Let's test it on somebody else!", k='excited', p='point', a='glow', sfx=['whoosh']))
# ------------------------------------------------------------------ SCENE 2 park: Grandpa Shelby
scene('park',
      L('GRAN', 'Ah. Good morning, boys. Lovely day... for a slow walk.', k='happy', p='wave', e={'gran': 'happy'}, m='pastoral'),
      T('GRAN', "Now where on earth did I put my glasses? I've been looking since breakfast.", e={'gran': 'confused'}),
      L('KIP', 'Good morning, Grandpa Shelby. Your glasses are on top of your head.', k='happy', p='point'),
      A('glasses', 1.3, e={'gran': 'surprise'}, sfx=['ding']),
      L('GRAN', "Hm? Well, I'll be. How did you know I was looking for them?", e={'gran': 'surprise'}, a='on'),
      L('MAX', 'He reads minds now! I knocked a star out of the sky!', e={'max': 'excited', 'gran': 'surprise'}, a='on'),
      L('GRAN', 'A star? Oh, my. A Thinking Star. I read about these when I was only ninety.', e={'gran': 'happy'}, a='on'),
      L('MAX', 'Can you read minds too, Grandpa?', e={'max': 'happy'}, a='on'),
      L('GRAN', 'At my age, young man, I can barely read a menu.', e={'gran': 'neutral'}, a='on'),
      L('KIP', "So it's real? I can really hear thoughts?", k='excited', p='idle', a='on'),
      L('GRAN', 'Every thought, Kip. But remember: a thought is like a cloud. It drifts by, and you only ever see one small piece of the sky.', e={'gran': 'happy'}, a='on'),
      T('GRAN', "Oh no. If he can hear thoughts... he'll find out about tonight!", e={'gran': 'fear'}, a='on', m='mystery'),
      L('KIP', 'Find out about what tonight?', k='confused', p='think', a='on'),
      L('GRAN', 'Hm? Nothing! Nothing at all. Oh look, a butterfly!', e={'gran': 'fear'}, a='on', m='comedic'),
      T('GRAN', 'Think about turnips. Think about turnips. Turnips, turnips, turnips...', e={'gran': 'fear'}, a='on'),
      L('KIP', "He's thinking about turnips. Really, really hard.", k='confused', p='shrug', a='on', hl=['turnips.']),
      L('MAX', "That's suspicious. Nobody thinks about turnips that hard.", e={'max': 'angry'}, a='on'))
# ------------------------------------------------------------------ SCENE 3 porch: Coco
scene('porch',
      L('COCO', "Kip, darling! Max, sweetie! Fabulous morning, isn't it? Gorgeous! Simply gorgeous!", k='neutral', p='idle', e={'coco': 'happy'}, m='comedic'),
      T('COCO', "Act normal, Coco. Act normal. Don't mention the big secret. And don't look at the hedge.", e={'coco': 'fear'}),
      L('KIP', "Coco... what's behind the hedge?", k='confused', p='point'),
      L('COCO', 'Hedge? What hedge? I have never seen a hedge in my entire life!', e={'coco': 'surprise'}),
      L('MAX', "You're literally standing in front of a hedge.", e={'max': 'neutral'}),
      L('COCO', 'That is a SHRUB, sweetie. A very exclusive shrub.', e={'coco': 'angry'}),
      T('COCO', 'Poor little Kip. After tonight, nothing will ever be the same for him.', e={'coco': 'sad'}, m='mystery'),
      L('KIP', '...Nothing will ever be the same?', k='sad', p='idle'),
      L('COCO', 'Gotta run! Busy, busy! Toodle-oo!', e={'coco': 'happy'}, m='comedic'),
      A('cocoRun', 1.6, k='confused', p='shrug', sfx=['whoosh']),
      L('MAX', 'Okay. That was weird. Even for Coco.', e={'max': 'confused'}, a='gone'))
# ------------------------------------------------------------------ SCENE 4 street: too many voices, then Mom
scene('street',
      T('MAIL', 'Did anybody see me trip over that curb?', k='fear', p='scared', a='crowd', m='chaos'),
      T('LADY', "I hope it doesn't rain. My hair frizzes when it rains.", a='crowd'),
      T('BAKER', 'Is that... my shadow... or a raccoon?', a='crowd'),
      T('JOG', 'Left, right, left, right... wait, which one is my left?', a='crowd'),
      T('DOG', 'Too bright! Too bright! Who turned on the sun?', a='crowd'),
      L('KIP', "Too many voices! Everybody's thinking at the same time!", k='fear', p='scared', a='crowd', hl=['too', 'many']),
      L('MAX', 'Just think about something quiet. Like clouds. Or naps. Naps are very quiet.', k='sad', p='idle', e={'max': 'happy'}, a='calm', m='pastoral'))
scene('home',
      L('MOM', 'There you are, sweetie! Did you have a nice morning?', k='neutral', p='idle', e={'mom': 'happy'}, a='momIn', m='warm'),
      L('KIP', 'Mom... is something happening tonight?', k='confused', p='idle'),
      L('MOM', 'Tonight? Oh, just a quiet evening. Why do you ask, honey?', e={'mom': 'happy'}),
      T('MOM', "He's growing up so fast. It's time for him to move out of his little room. Tonight, he leaves it... forever.", e={'mom': 'sad'}, m='mystery'),
      A('heartbreak', 1.6, k='sad', p='sad', sfx=['heart'], m='silence'),
      L('KIP', '...Okay, Mom.', k='sad', p='sad', m='sad'),
      L('MOM', "Now, why don't you boys go play far away until sunset? Very far away. Really, really far.", e={'mom': 'happy'}),
      T('MOM', 'And please, please, do not come back early...', e={'mom': 'fear'}))
# ------------------------------------------------------------------ SCENE 5 backyard afternoon: bananas
scene('yard2',
      L('KIP', 'Max... I think everyone wants me to leave.', k='sad', p='sad', e={'max': 'neutral'}, m='sad'),
      L('MAX', 'What? No way! Who told you that?', e={'max': 'surprise'}),
      L('KIP', 'Nobody TOLD me. They THOUGHT it. Mom wants me out of my room. Coco says nothing will be the same. And Grandpa Shelby is hiding something.', k='sad', p='shrug'),
      L('MAX', "Kip, I'm sure there's a good—", e={'max': 'fear'}),
      T('MAX', "Don't think about the surprise! Don't think about the surprise! Bananas! Bananas, bananas, bananas!", e={'max': 'fear'}, m='comedic'),
      L('KIP', '...Why are you thinking about bananas?', k='confused', p='think', hl=['bananas?']),
      L('MAX', "I'm not! I'm thinking about... regular things. Normal kid things.", e={'max': 'happy'}),
      T('MAX', 'Oh no, oh no, oh no. I wish he would just go away for a while!', e={'max': 'fear'}, m='mystery'),
      A('heartbreak', 1.8, k='sad', p='sad', sfx=['heart'], m='silence'),
      L('KIP', 'You too, Max?', k='sad', p='sad'),
      L('MAX', "Wait, Kip, that's not what I—", e={'max': 'fear'}),
      A('kipRuns', 1.5, k='sad', p='sad', sfx=['whoosh'], m='tense'),
      L('MAX', 'Kip! Come back! Oh no... I have to tell the others!', e={'max': 'fear'}, a='alone'))
# ------------------------------------------------------------------ SCENE 5b kitchen: code red
scene('kitchen',
      L('MAX', 'Code red! Code red! Kip heard everything and he ran away!', e={'max': 'fear', 'mom': 'surprise', 'coco': 'surprise', 'gran': 'surprise'}, a='burst', m='urgent', sfx=['door']),
      L('COCO', 'Everything?! Even the part about the cake?', e={'coco': 'surprise'}),
      L('MAX', 'No! Worse! He thinks we all want him to leave!', e={'max': 'fear'}),
      L('MOM', 'Oh no. My poor baby...', e={'mom': 'sad', 'coco': 'sad'}),
      L('GRAN', 'Leave it to me. I know exactly where he goes when he is sad. I have known since he was this tall.', e={'gran': 'happy', 'mom': 'sad'}),
      L('MOM', 'Hurry, Mr. Shelby!', e={'mom': 'fear'}),
      L('GRAN', 'Hurrying... is not my specialty. But I shall try.', e={'gran': 'neutral'}, a='granGo'))
# ------------------------------------------------------------------ SCENE 6 hill at sunset: the star cracks
scene('hill',
      A('sunset', 2.0, k='sad', p='sad', m='sad'),
      L('KIP', 'A thought is just one piece of the sky... But what if that piece is true?', k='sad', p='sad'),
      A('crack', 3.6, k='fear', p='scared', sfx=['crack', 'riser'], m='chaos'),
      T('COCO', "Don't let him find out!", k='fear', p='scared', a='storm'),
      T('MAX', 'Go away for a while!', a='storm'),
      T('MOM', 'He leaves it forever!', a='storm'),
      T('GRAN', 'Turnips! Turnips!', a='storm'),
      L('KIP', "Stop! Stop it! I don't want to hear anymore!", k='fear', p='scared', a='storm', hl=['stop!']),
      A('dim', 1.6, k='sad', p='sad', sfx=['ding'], m='silence'),
      L('GRAN', 'There you are. I came as fast as I could.', k='sad', p='sad', e={'gran': 'happy'}, a='granIn', m='warm'),
      L('GRAN', 'Which, admittedly, took about three hours.', e={'gran': 'neutral'}, a='granHere'),
      L('KIP', 'Grandpa Shelby... everyone wants me gone.', k='sad', p='sad', a='granHere'),
      L('GRAN', 'A Thinking Star only shows you the thoughts, Kip. Never the reasons behind them.', e={'gran': 'neutral'}, a='granHere'),
      L('GRAN', "In all my years, I've learned this: when we only hear a little, we imagine the rest. And we usually imagine the worst.", e={'gran': 'happy'}, a='granHere'),
      L('KIP', 'So... I only heard one piece of the sky?', k='confused', p='idle', a='granHere'),
      L('GRAN', 'So stop listening with the star... and come look with your own eyes. Follow me.', e={'gran': 'happy'}, a='granHere'))
# ------------------------------------------------------------------ SCENE 7 backyard night: surprise
scene('party',
      L('KIP', 'Hello? Mom? Why is it so dark?', k='fear', p='scared', a='dark', m='tense'),
      A('lightsOn', 0.8, k='surprise', p='surprise', sfx=['pop'], m='silence'),
      L('MOM', 'SURPRISE!', k='surprise', p='surprise', e={'mom': 'excited', 'max': 'excited', 'coco': 'excited', 'gran': 'happy'}, a='surprise', chorus=['MAX', 'COCO', 'GRAN'], sfx=['confetti'], m='party'),
      L('COCO', 'Happy birthday, Kip darling! Did you really think we forgot?', k='surprise', p='surprise', e={'coco': 'excited'}, a='party'),
      L('KIP', 'My... birthday?', k='surprise', p='idle', a='party'),
      L('MOM', "And that's not all. Look up, sweetheart.", k='happy', p='idle', e={'mom': 'happy'}, a='party', m='tender'),
      A('treehouse', 3.4, k='excited', p='cheer', sfx=['shimmer']),
      L('MOM', "Your very own big-kid room. A treehouse, right outside my window. You're leaving your little room... but you're never leaving me.", k='happy', p='idle', e={'mom': 'happy'}, a='tree'),
      L('KIP', "So THAT's what you meant...", k='happy', p='idle', a='party'),
      L('COCO', '"Nothing will ever be the same," darling, because now you are officially a big kid!', e={'coco': 'happy'}, a='party', m='comedic'),
      L('GRAN', 'And I am a terrible secret keeper, so I tried not to think about the party at all. Hence... the turnips.', e={'gran': 'happy'}, a='party'),
      L('MAX', 'And I needed you to go away for a while so I could practice THIS!', e={'max': 'excited'}, a='party', hl=['this!']),
      A('fireworks', 4.4, k='excited', p='cheer', e={'max': 'excited'}, sfx=['launch', 'pop'], m='party'),
      L('MAX', "Ta-da! A homemade fireworks show! And I didn't set anything on fire... this time.", e={'max': 'happy'}, a='after'),
      L('KIP', "Max... I'm sorry I ran away. I heard your thoughts, but I didn't listen to your heart.", k='sad', p='idle', a='after', m='tender'),
      L('MAX', "That's okay. You're my best friend. Even when you're inside my head.", k='happy', p='idle', e={'max': 'happy'}, a='after'))
# ------------------------------------------------------------------ SCENE 8 the twist
scene('party2',
      L('KIP', "I don't need this anymore. Thoughts are better when friends share them on their own.", k='happy', p='idle', a='hold', m='tender'),
      L('MAX', 'Then make a wish and let it go!', e={'max': 'happy'}, a='hold'),
      A('release', 2.6, k='happy', p='cheer', sfx=['whoosh', 'shimmer']),
      A('landCoco', 2.2, k='surprise', p='surprise', e={'coco': 'surprise'}, sfx=['ding'], m='magic'),
      L('COCO', 'Ooooh. Oh, my. Oh, darlings... I can hear EVERYTHING.', k='fear', p='scared', e={'coco': 'happy'}, a='cocoStar'),
      L('KIP', 'Uh-oh.', k='fear', p='scared', e={'max': 'fear', 'mom': 'fear', 'gran': 'fear'}, a='cocoStar', chorus=['MAX', 'MOM', 'GRAN'], sfx=['wah']),
      L('COCO', 'Grandpa Shelby! You think my singing sounds like a squeaky door?!', e={'coco': 'angry', 'gran': 'fear'}, a='cocoStar', m='comedic'),
      L('GRAN', '...Turnips.', e={'gran': 'fear'}, a='cocoStar'),
      A('laugh', 2.6, k='happy', p='cheer', e={'max': 'happy', 'mom': 'happy', 'gran': 'happy', 'coco': 'happy'}, sfx=['laugh'], m='party'),
      L('KIP', "And you? I don't need a star to know what you're thinking right now...", k='happy', p='point', a='camera'),
      L('KIP', '"I want to see the next episode!"', k='excited', p='wave', a='camera', hl=['next', 'episode!"']))
scene('outro',
      L('N', 'Next time: What if you could shrink to the size of an ant?', a='outro', hl=['ant?']))

if __name__ == '__main__':
    out = {'title': "What If You Could Read Everyone's Mind?", 'duration': 510, 'voices': VOICES, 'names': NAMES, 'beats': SCENES}
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'script.json'), 'w'), indent=1)
    n = sum(1 for b in SCENES if b['v'])
    print(len(SCENES), 'beats,', n, 'lines')
