"""EP02 "What If You Could Read Everyone's Mind?" -- the full script as data.

This file is the single source of truth: voices.py synthesises every line from it,
timeline.py lays the lines out in time, anim.py animates characters and cameras from
that timeline, subs.py writes the subtitles, and make_script_md.py prints SCRIPT.md.

Beat helpers
  L(who, text, emo)          spoken line (lip-synced)
  T(who, text, emo)          thought line (mouth closed, echo voice, cyan italic subtitle)
  N(text)                    narrator (used only twice)
  P(seconds)                 silent pause (action / reaction / music)
  E(name, seconds, **kw)     scripted action event (animation + sound effects)
  C(shot)                    camera directive, sticky until the next C()
  M(who, x, z, yaw, secs)    move a character to a new mark (walks), runs parallel to what follows

Line keyword options: gap (silence after, default 0.32 s), overlap (start this many seconds
before the previous line ends), look (who the speaker looks at), loud (shout).
"""

# ----------------------------------------------------------------------------- cast
# Every character has its own Kokoro neural voice; pitch is a post-shift ratio.
CAST = {
    'tiko':   dict(name='Tiko',      voice='am_puck',    speed=1.00, pitch=1.12, desc='Baby dinosaur (our main character from EP01). Curious, kind, a little anxious.'),
    'sparky': dict(name='Sparky',    voice='af_bella',   speed=1.06, pitch=1.24, desc='Tiny dragon who hatched in EP01. Hyper, loyal, sneezes fire.'),
    'prof':   dict(name='Professor Shellby', voice='bm_george', speed=0.86, pitch=0.93, desc='Very old, very slow tortoise. Wise, forgetful, terrible at secrets.'),
    'coco':   dict(name='Coco',      voice='bf_lily',    speed=1.12, pitch=1.10, desc='Dramatic parrot. Valley gossip. Calls everyone "darling".'),
    'mama':   dict(name='Mama',      voice='af_heart',   speed=0.95, pitch=1.00, desc="Tiko's mother. Warm, gentle, hiding a big plan."),
    'narr':   dict(name='Narrator',  voice='bm_fable',   speed=0.95, pitch=1.00, desc='Storybook narrator, used only at the start and the very end.'),
    # off-screen forest creatures heard as thoughts in the crowd scene
    'frog':   dict(name='Frog',      voice='am_fenrir',  speed=1.05, pitch=0.85, desc='Off-screen frog.'),
    'bunny':  dict(name='Bunny',     voice='af_jessica', speed=1.15, pitch=1.18, desc='Off-screen bunny.'),
    'snail':  dict(name='Snail',     voice='bm_lewis',   speed=0.80, pitch=0.95, desc='Off-screen snail.'),
    'beetle': dict(name='Beetle',    voice='af_river',   speed=1.10, pitch=1.05, desc='Off-screen beetle.'),
    'mole':   dict(name='Mole',      voice='am_echo',    speed=1.00, pitch=0.92, desc='Off-screen mole.'),
}

ONSCREEN = ['tiko', 'sparky', 'prof', 'coco', 'mama']


def L(who, text, emo='neutral', **kw):
    return dict(kind='line', who=who, mode='say', text=text, emo=emo, **kw)


def T(who, text, emo='neutral', **kw):
    return dict(kind='line', who=who, mode='think', text=text, emo=emo, **kw)


def N(text, **kw):
    return dict(kind='line', who='narr', mode='narr', text=text, emo='neutral', **kw)


def P(sec):
    return dict(kind='pause', dur=sec)


def E(name, dur, **kw):
    return dict(kind='event', name=name, dur=dur, **kw)


def C(shot, **kw):
    return dict(kind='cam', shot=shot, **kw)


def M(who, x, z, yaw, secs, run=False):
    return dict(kind='move', who=who, to=(x, z, yaw), dur=secs, run=run)


PI = 3.14159265

# Locations: 'clearing' (EP01 egg clearing, world origin), 'pond' (Professor's pond glade,
# x = +14), 'nest' (Mama's nest, x = -14). Time of day: morning, noon, afternoon, sunset, night.
SCENES = [
    # ------------------------------------------------------------------ 0:00 HOOK
    dict(id='hook', title='Cold open', loc='clearing', tod='noon', mind=True,
         cast={'tiko': (-0.2, 0.0, -0.35)},
         beats=[
             C('xcu_eyes', who='tiko'),
             E('hook_open', 1.0),
             T('coco', "Don't let Tiko find out!", 'nervous', gap=0.0),
             T('prof', 'He must never know...', 'worried', gap=0.0, overlap=0.15),
             T('sparky', 'Tonight... everything changes.', 'worried', gap=0.15, overlap=0.1),
             C('cu', who='tiko', push=0.25),
             L('tiko', 'Wait... I can hear what everyone is THINKING?!', 'shocked', loud=True, gap=0.2),
             E('hook_sting', 0.6),
         ]),
    # ------------------------------------------------------------------ TITLE
    dict(id='title', title='Title', loc='clearing', tod='morning', mind=False,
         cast={},
         beats=[
             C('star_macro'),
             E('title_card', 5.4),
         ]),
    # ------------------------------------------------------------------ SCENE 1: the falling star
    dict(id='s1', title='Scene 1 - The star that fell', loc='clearing', tod='morning', mind=False,
         cast={'tiko': (-0.75, -0.05, -0.30), 'sparky': (0.55, -0.1, PI + 0.35)},
         beats=[
             C('establish'),
             N('One morning, in Fernwood Valley... a few hours earlier.', gap=0.4),
             C('two'),
             L('sparky', 'Tiko! Tiko! Watch this! My biggest fireball ever!', 'excited', look='tiko'),
             C('cu', who='tiko'),
             L('tiko', 'Last time you did that, you sneezed on my head.', 'sly', look='sparky'),
             C('cu', who='sparky'),
             L('sparky', 'That was one time!', 'offended', look='tiko'),
             C('cu', who='tiko'),
             L('tiko', 'It was four times. Today.', 'deadpan', look='sparky', gap=0.6),
             C('two'),
             E('sneeze_up', 3.2),
             C('star_fall_cam'),
             E('star_fall', 3.6),
             C('two_low'),
             L('sparky', '...Did I just shoot down a star?', 'shocked', look='star'),
             L('tiko', 'You shot down a STAR!', 'excited', look='sparky', loud=True),
             M('tiko', -0.55, 0.05, -0.75, 1.6),
             M('sparky', 0.65, 0.05, PI + 0.75, 1.2),
             P(1.4),
             C('star_ots', who='tiko'),
             L('tiko', "Whoa... it's warm. And it's humming.", 'awe', look='star'),
             C('cu', who='sparky'),
             L('sparky', "Don't touch it! What if it's a sneeze star? What if it's MY sneeze, coming back for revenge?", 'scared', look='tiko'),
             C('star_ots', who='tiko'),
             E('touch_star', 3.0),
             C('cu', who='tiko'),
             L('tiko', 'Ow... my ears are buzzing. Sparky, did you say something?', 'confused', look='sparky'),
             C('cu', who='sparky'),
             L('sparky', "Nope. I'm totally fine. Not hungry at all.", 'innocent', look='tiko'),
             T('sparky', "I'm SO hungry. I could eat a whole tree. With the bark.", 'hungry', look='none'),
             C('cu', who='tiko'),
             L('tiko', "...You're hungry.", 'deadpan', look='sparky'),
             C('two'),
             L('sparky', 'How did you know that?', 'surprised', look='tiko'),
             L('tiko', 'You just said it. "With the bark."', 'confused', look='sparky'),
             C('cu', who='sparky'),
             L('sparky', 'I did NOT say that out loud!', 'shocked', look='tiko', loud=True),
             C('cu', who='tiko'),
             L('tiko', 'Okay... think of a number. Any number.', 'sly', look='sparky'),
             C('cu', who='sparky'),
             T('sparky', 'Seven. No, too easy. Eleventy-twelve!', 'scheming', look='none'),
             C('two'),
             L('tiko', "Eleventy-twelve isn't a number.", 'deadpan', look='sparky'),
             C('cu', who='sparky', push=0.3),
             L('sparky', "AAAH! You're inside my head! Get out! It's messy in there!", 'panic', look='tiko', loud=True),
             C('cu', who='tiko'),
             L('tiko', 'Sparky... I think this star lets me read minds.', 'awe', look='sparky'),
             C('two'),
             L('sparky', "That's the coolest thing that has ever happened. And also the scariest.", 'awe', look='tiko'),
             L('tiko', "Come on! Let's test it on somebody else!", 'excited', look='sparky', gap=0.3),
             M('tiko', 3.4, -0.4, 0.0, 2.2, run=True),
             M('sparky', 3.6, -0.1, 0.0, 2.2, run=True),
             P(1.6),
         ]),
    # ------------------------------------------------------------------ SCENE 2: the professor
    dict(id='s2', title="Scene 2 - The professor's glasses", loc='pond', tod='late_morning', mind=True,
         cast={'prof': (15.05, 0.3, PI + 0.3), 'tiko': (13.35, -0.25, -0.1), 'sparky': (12.85, -0.75, 0.25)},
         beats=[
             C('establish'),
             P(1.2),
             C('cu', who='prof'),
             L('prof', 'Ah. Good morning, young ones. Lovely day... for a slow walk.', 'happy', look='tiko'),
             T('prof', "Now where on earth did I put my glasses? I've been looking since breakfast.", 'confused', look='none'),
             C('cu', who='tiko'),
             L('tiko', 'Good morning, Professor. Your glasses are on top of your head.', 'happy', look='prof'),
             C('cu', who='prof'),
             E('glasses_down', 1.3),
             L('prof', "Hm? Well, I'll be. How did you know I was looking for them?", 'surprised', look='tiko'),
             C('two'),
             L('sparky', 'He reads minds now! I shot down a star!', 'excited', look='prof', loud=True),
             C('cu', who='prof'),
             L('prof', 'A star? Let me see that... Oh, my. A Thinking Star. I read about these when I was only ninety.', 'awe', look='star'),
             C('two'),
             L('sparky', 'Can you read minds too, Professor?', 'curious', look='prof'),
             C('cu', who='prof'),
             L('prof', 'At my age, little dragon, I can barely read a menu.', 'deadpan', look='sparky', gap=0.7),
             C('cu', who='tiko'),
             L('tiko', "So it's real? I can really hear thoughts?", 'awe', look='prof'),
             C('cu', who='prof'),
             L('prof', 'Every thought, little one. But remember: a thought is like a cloud. It drifts by, and you only ever see one small piece of the sky.', 'wise', look='tiko', gap=0.6),
             C('cu', who='prof', push=0.3),
             T('prof', "Oh no. If he can hear thoughts... he'll find out about tonight!", 'worried', look='none'),
             C('cu', who='tiko'),
             L('tiko', 'Find out about what tonight?', 'suspicious', look='prof'),
             C('cu', who='prof'),
             L('prof', 'Hm? Nothing! Nothing at all. Oh look, a dragonfly!', 'nervous', look='away'),
             T('prof', 'Think about turnips. Think about turnips. Turnips, turnips, turnips...', 'nervous', look='away'),
             C('two_tiko_sparky'),
             L('tiko', "He's thinking about turnips. Really, really hard.", 'suspicious', look='sparky'),
             L('sparky', "That's suspicious. Nobody thinks about turnips that hard.", 'suspicious', look='tiko', gap=0.5),
         ]),
    # ------------------------------------------------------------------ SCENE 3: Coco
    dict(id='s3', title='Scene 3 - Coco knows something', loc='pond', tod='late_morning', mind=True,
         cast={'coco': (15.6, 1.59, PI + 0.5), 'tiko': (14.75, 0.35, 0.45), 'sparky': (14.15, 0.0, 0.5)},
         beats=[
             C('coco_wide'),
             L('coco', "Tiko, darling! Sparky, sweetie! Fabulous morning, isn't it? Gorgeous! Simply gorgeous!", 'excited', look='tiko'),
             C('cu', who='coco'),
             T('coco', "Act normal, Coco. Act normal. Don't mention the big secret. And don't look at the bushes.", 'nervous', look='away'),
             C('cu', who='tiko'),
             L('tiko', "Coco... what's in the bushes?", 'suspicious', look='coco'),
             C('cu', who='coco'),
             L('coco', 'Bushes? What bushes? I have never seen a bush in my entire life!', 'panic', look='tiko', loud=True),
             C('two_tiko_sparky'),
             L('sparky', 'You literally live in a bush.', 'deadpan', look='coco'),
             C('cu', who='coco'),
             L('coco', "That is a TREE, sweetie. A very exclusive tree.", 'offended', look='sparky'),
             T('coco', 'Poor little Tiko. After tonight, nothing will ever be the same for him.', 'sad', look='away'),
             C('cu', who='tiko', push=0.25),
             L('tiko', '...Nothing will ever be the same?', 'worried', look='coco'),
             C('cu', who='coco'),
             L('coco', 'Gotta fly! Busy, busy! Toodle-oo!', 'nervous', look='tiko', gap=0.1),
             C('coco_wide'),
             E('coco_flyaway', 2.0),
             C('two_tiko_sparky'),
             L('sparky', 'Okay. That was weird. Even for Coco.', 'deadpan', look='tiko', gap=0.6),
         ]),
    # ------------------------------------------------------------------ SCENE 4: the noise, and Mama
    dict(id='s4', title='Scene 4 - Too many voices', loc='nest', tod='noon', mind=True,
         cast={'tiko': (-14.9, -0.1, -0.15), 'sparky': (-15.5, -0.75, 0.0), 'mama': (-10.3, 0.9, PI + 0.3)},
         beats=[
             C('walk_track'),
             M('tiko', -13.75, -0.05, -0.05, 4.0),
             M('sparky', -14.45, -0.75, 0.5, 4.0),
             T('frog', 'Did anybody see me trip over that log?', 'nervous', gap=0.0),
             T('bunny', "I hope it doesn't rain. My ears frizz when it rains.", 'worried', gap=0.0, overlap=0.6),
             T('snail', 'Is that... my tail... or a snake?', 'scared', gap=0.0, overlap=0.5),
             T('beetle', 'Left, right, left, right... wait, which ones are my left legs?', 'confused', gap=0.0, overlap=0.7),
             T('mole', 'Too bright. Too bright! Who turned on the sun?', 'angry', gap=0.1, overlap=0.6),
             C('cu', who='tiko', push=0.3),
             L('tiko', "Too many voices! Everybody's thinking at the same time!", 'overwhelmed', look='sparky', loud=True),
             C('cu', who='sparky'),
             L('sparky', 'Just think about something quiet. Like clouds. Or naps. Naps are very quiet.', 'helpful', look='tiko'),
             C('mama_reveal'),
             M('mama', -12.15, 0.6, PI + 0.2, 1.6),
             L('mama', 'There you are, my little explorer! Did you have a nice morning?', 'happy', look='tiko'),
             C('cu', who='tiko'),
             L('tiko', 'Mama... is something happening tonight?', 'worried', look='mama'),
             C('cu', who='mama'),
             L('mama', 'Tonight? Oh, just a quiet evening. Why do you ask, sweetheart?', 'innocent', look='tiko', gap=0.5),
             C('cu', who='mama', push=0.25),
             T('mama', "He's growing up so fast. It's time for him to move out of the little nest. Tonight, he leaves it... forever.", 'tender', look='away', gap=0.9),
             C('cu', who='tiko', push=0.35),
             E('heartbreak', 1.6),
             L('tiko', '...Okay, Mama.', 'sad', look='down', gap=0.5),
             C('two_mama'),
             L('mama', 'Now, why don\'t you two go and play far away until sunset? Very far away. Really, really far.', 'happy', look='tiko'),
             T('mama', 'And please, please, do not come back early...', 'nervous', look='away', gap=0.8),
         ]),
    # ------------------------------------------------------------------ SCENE 5: bananas
    dict(id='s5', title='Scene 5 - Bananas', loc='clearing', tod='afternoon', mind=True,
         cast={'tiko': (-1.55, 0.15, -0.1), 'sparky': (-0.35, -0.3, PI - 0.25)},
         beats=[
             C('establish_sad'),
             P(1.6),
             C('cu', who='tiko'),
             L('tiko', 'Sparky... I think everyone wants me to leave.', 'sad', look='down'),
             C('cu', who='sparky'),
             L('sparky', 'What? No way! Who told you that?', 'surprised', look='tiko'),
             C('cu', who='tiko'),
             L('tiko', "Nobody TOLD me. They THOUGHT it. Mama wants me out of the nest. Coco says nothing will be the same. And the Professor is hiding something.", 'upset', look='sparky'),
             C('cu', who='sparky'),
             L('sparky', "Tiko, I'm sure there's a good—", 'nervous', look='tiko', gap=0.0),
             T('sparky', "Don't think about the surprise! Don't think about the surprise! Bananas! Bananas, bananas, bananas!", 'panic', look='away', overlap=0.05),
             C('cu', who='tiko'),
             L('tiko', '...Why are you thinking about bananas?', 'suspicious', look='sparky'),
             C('cu', who='sparky'),
             L('sparky', "I'm not! I'm thinking about... regular things. Normal dragon things.", 'nervous', look='away'),
             C('cu', who='sparky', push=0.3),
             T('sparky', 'Oh no, oh no, oh no. I wish he would just go away for a while!', 'panic', look='away', gap=0.2),
             C('cu', who='tiko', push=0.4),
             E('heartbreak', 2.0),
             L('tiko', 'You too, Sparky?', 'heartbroken', look='sparky', gap=0.15),
             C('two'),
             L('sparky', "Wait, Tiko, that's not what I—", 'panic', look='tiko', gap=0.0),
             M('tiko', -4.2, 1.6, 2.6, 2.0, run=True),
             E('tiko_runs', 1.6),
             L('sparky', 'Tiko! Come back! Oh no... I have to tell the others!', 'panic', look='away', loud=True, gap=0.6),
         ]),
    # ------------------------------------------------------------------ SCENE 5b: code red
    dict(id='s5b', title='Scene 5b - Code red', loc='clearing', tod='late_afternoon', mind=False, party=True, party_setup=True,
         cast={'mama': (0.45, 1.05, PI + 0.35), 'coco': (1.95, 1.25, PI + 0.4), 'prof': (-0.85, 0.75, -0.2),
               'sparky': (-3.2, -0.6, 0.0)},
         beats=[
             C('setup_wide'),
             M('sparky', -0.2, -0.35, 0.6, 1.8, run=True),
             P(0.6),
             L('sparky', 'Code red! Code red! Tiko heard everything and he ran away!', 'panic', look='mama', loud=True),
             C('cu', who='coco'),
             L('coco', 'Everything?! Even the part about the cake?', 'shocked', look='sparky'),
             C('cu', who='sparky'),
             L('sparky', 'No! Worse! He thinks we all want him to leave!', 'panic', look='coco'),
             C('cu', who='mama'),
             L('mama', 'Oh no. My poor baby...', 'sad', look='sparky', gap=0.6),
             C('cu', who='prof'),
             L('prof', 'Leave it to me. I know exactly where he goes when he is sad. I have known since before he hatched.', 'wise', look='mama'),
             C('cu', who='mama'),
             L('mama', 'Hurry, Professor!', 'worried', look='prof'),
             C('cu', who='prof'),
             L('prof', 'Hurrying... is not my specialty. But I shall try.', 'deadpan', look='mama', gap=0.3),
             M('prof', -2.6, 0.3, PI - 0.2, 6.0),
             C('setup_wide'),
             P(2.2),
         ]),
    # ------------------------------------------------------------------ SCENE 6: the star cracks
    dict(id='s6', title='Scene 6 - One piece of the sky', loc='pond', tod='sunset', mind=True,
         cast={'tiko': (13.4, -0.55, -0.1), 'prof': (10.2, -0.55, -0.05)},
         beats=[
             C('sunset_wide'),
             P(2.0),
             C('cu', who='tiko'),
             L('tiko', 'A thought is just one piece of the sky... But what if that piece is true?', 'sad', look='down', gap=0.6),
             C('med', who='tiko'),
             E('star_crack', 4.2),
             T('coco', "Don't let him find out!", 'nervous', gap=0.0),
             T('sparky', 'Go away for a while!', 'panic', gap=0.0, overlap=0.4),
             T('mama', 'He leaves it forever!', 'tender', gap=0.0, overlap=0.4),
             T('prof', 'Turnips! Turnips!', 'nervous', gap=0.1, overlap=0.4),
             C('cu', who='tiko', push=0.35),
             L('tiko', "Stop! Stop it! I don't want to hear anymore!", 'overwhelmed', look='down', loud=True, gap=0.9),
             E('star_dim', 1.6),
             C('prof_arrive'),
             M('prof', 11.75, -0.45, 0.05, 5.0),
             M('tiko', 13.4, -0.55, PI - 0.25, 1.4),
             L('prof', 'There you are. I came as fast as I could.', 'tender', look='tiko', gap=0.4),
             L('prof', 'Which, admittedly, took about three hours.', 'deadpan', look='tiko', gap=0.6),
             C('cu', who='tiko'),
             L('tiko', 'Professor... everyone wants me gone.', 'sad', look='prof'),
             C('cu', who='prof'),
             L('prof', 'A Thinking Star only shows you the thoughts, Tiko. Never the reasons behind them.', 'wise', look='tiko'),
             L('prof', "In two hundred years, I've learned this: when we only hear a little, we imagine the rest. And we usually imagine the worst.", 'wise', look='tiko', gap=0.6),
             C('cu', who='tiko'),
             L('tiko', 'So... I only heard one piece of the sky?', 'hopeful', look='prof'),
             C('cu', who='prof'),
             L('prof', 'So stop listening with the star... and come look with your own eyes. Follow me.', 'wise', look='tiko', gap=0.8),
         ]),
    # ------------------------------------------------------------------ SCENE 7: surprise
    dict(id='s7', title='Scene 7 - Surprise!', loc='clearing', tod='night', mind=False, party=True,
         cast={'tiko': (-2.4, -0.6, 0.15), 'prof': (-3.2, -1.2, 0.15),
               'sparky': (0.55, 0.55, PI + 0.3), 'mama': (-0.2, 1.2, -2.0), 'coco': (1.95, 1.25, PI + 0.6)},
         beats=[
             C('dark_wide'),
             M('tiko', -1.15, -0.35, 0.15, 3.0),
             M('prof', -2.45, -1.15, 0.3, 3.0),
             P(1.4),
             L('tiko', 'Hello? Mama? Why is it so dark?', 'scared', look='away', gap=0.45),
             E('surprise', 1.4),
             L('mama', 'SURPRISE!', 'excited', loud=True, gap=0.0, chorus=['sparky', 'coco', 'prof']),
             C('party_wide'),
             E('confetti', 1.2),
             C('cu', who='coco'),
             L('coco', 'Happy Hatch Day, Tiko darling! One whole year since you popped out of your egg!', 'excited', look='tiko'),
             C('cu', who='tiko'),
             L('tiko', 'My... hatch day?', 'shocked', look='coco'),
             C('cu', who='mama'),
             L('mama', "And that's not all. Look up, sweetheart.", 'tender', look='tiko', gap=0.3),
             C('treehouse_reveal'),
             E('treehouse_reveal', 3.6),
             L('mama', "Your very own big-kid nest. Right next to mine. You're leaving the little nest... but you're never leaving me.", 'tender', look='tiko'),
             C('cu', who='tiko'),
             L('tiko', "So THAT's what you meant...", 'moved', look='mama'),
             C('cu', who='coco'),
             L('coco', '"Nothing will ever be the same," darling, because now you are officially a big kid!', 'happy', look='tiko'),
             C('cu', who='prof'),
             L('prof', 'And I am a terrible secret keeper, so I tried not to think about the party at all. Hence... the turnips.', 'sheepish', look='tiko'),
             C('two'),
             L('sparky', 'And I needed you to go away for a while so I could practice THIS!', 'excited', look='tiko', loud=True),
             C('fireworks_sky'),
             E('fireworks', 4.4),
             C('cu', who='sparky'),
             L('sparky', "Ta-da! And I didn't sneeze even once!", 'proud', look='tiko'),
             C('cu', who='tiko'),
             L('tiko', "Sparky... I'm sorry I ran away. I heard your thoughts, but I didn't listen to your heart.", 'moved', look='sparky'),
             C('cu', who='sparky'),
             L('sparky', "That's okay. You're my best friend. Even when you're inside my head.", 'happy', look='tiko', gap=0.7),
         ]),
    # ------------------------------------------------------------------ SCENE 8: the twist
    dict(id='s8', title='Scene 8 - The last twist', loc='clearing', tod='night', mind=False, party=True,
         cast={'tiko': (-0.85, -0.25, -0.55), 'prof': (-2.0, 0.25, -0.35),
               'sparky': (0.35, -0.2, PI + 0.3), 'mama': (-0.2, 1.2, -2.0), 'coco': (1.95, 1.25, PI + 0.6)},
         beats=[
             C('star_ots', who='tiko'),
             L('tiko', "I don't need this anymore. Thoughts are better when friends share them on their own.", 'wise', look='star'),
             E('place_star', 2.0),
             C('two'),
             E('sneeze_star', 3.8),
             C('coco_star'),
             E('star_to_coco', 2.6),
             L('coco', 'Ooooh. Oh, my. Oh, darlings... I can hear EVERYTHING.', 'scheming', look='away'),
             C('group'),
             L('tiko', 'Uh-oh.', 'shocked', look='coco', chorus=['sparky', 'prof', 'mama'], gap=0.5),
             C('cu', who='coco'),
             L('coco', 'Professor! You think my singing sounds like a squeaky door?!', 'offended', look='prof', loud=True),
             C('cu', who='prof'),
             L('prof', '...Turnips.', 'sheepish', look='coco', gap=0.9),
             C('group'),
             E('everyone_laughs', 2.6),
             C('to_camera', who='tiko'),
             L('tiko', "And you? I don't need a star to know what you're thinking right now...", 'sly', look='camera'),
             L('tiko', '"I want to see the next episode!"', 'happy', look='camera', gap=0.5),
             C('end_crane'),
             N('Next time, on Tiko and Sparky: What if you could shrink to the size of an ant?', gap=0.3),
             E('end_card', 6.0),
         ]),
]

# Non-dialogue vocal clips (sneezes, laughs, gasps), placed by events; voiced + lip-synced + subtitled.
EXTRA = {
    'sneeze':       ('sparky', 'Ahh... ahh... ahh-CHOO!', 'Ah... ah... CHOO!'),
    'gasp_tiko':    ('tiko',   'Whoa!', 'Whoa!'),
    'gasp_sparky':  ('sparky', 'Yikes!', 'Yikes!'),
    'ouch_tiko':    ('tiko',   'Ah!', 'Ah!'),
    'laugh_tiko':   ('tiko',   'Ha ha ha ha ha!', '(laughing)'),
    'laugh_sparky': ('sparky', 'Hee hee hee hee hee!', '(laughing)'),
    'laugh_prof':   ('prof',   'Ho ho ho ho.', '(laughing)'),
    'laugh_coco':   ('coco',   'Ah ha ha ha ha!', '(laughing)'),
    'laugh_mama':   ('mama',   'Ha ha ha ha!', '(laughing)'),
}
# event -> [(extra clip, offset from event start)]
EVENT_CLIPS = {
    'sneeze_up': [('sneeze', 0.15)],
    'star_fall': [('gasp_tiko', 2.15), ('gasp_sparky', 2.45)],
    'touch_star': [('ouch_tiko', 1.25)],
    'sneeze_star': [('sneeze', 0.1)],
    'everyone_laughs': [('laugh_tiko', 0.0), ('laugh_sparky', 0.12), ('laugh_coco', 0.25), ('laugh_mama', 0.35), ('laugh_prof', 0.5)],
}

TARGET_DURATION = 510.0   # exactly 8:30
FPS = 24
