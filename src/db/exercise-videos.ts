/**
 * Mapping of exerciseId → YouTube tutorial video URL.
 * Each URL points to a real tutorial/demonstration video found via search.
 */
export const exerciseVideoUrls: Record<string, string> = {
  // ── Chest ──────────────────────────────────────────────────
  'ex-bench-press':        'https://www.youtube.com/watch?v=4Y2ZdHCOXok',
  'ex-incline-bench':      'https://www.youtube.com/watch?v=SrqOu55lrYU',
  'ex-decline-bench':      'https://www.youtube.com/watch?v=LsNHBxQCqNc',
  'ex-db-bench':           'https://www.youtube.com/watch?v=pKZMNVbfUzQ',
  'ex-db-incline-bench':   'https://www.youtube.com/watch?v=hChjZQhX1Ls',
  'ex-chest-fly':          'https://www.youtube.com/watch?v=QENKPHhQVi4',
  'ex-cable-crossover':    'https://www.youtube.com/watch?v=ZDCN3G9tYYI',
  'ex-dips-chest':         'https://www.youtube.com/watch?v=yN6Q1UI_xkE',
  'ex-push-ups':           'https://www.youtube.com/watch?v=i9sTjhN4Z3M',
  'ex-chest-press-machine':'https://www.youtube.com/watch?v=rY0B8UFdne0',
  'ex-pec-deck':           'https://www.youtube.com/watch?v=j-CTn08oE9w',
  'ex-incline-chest-fly':  'https://www.youtube.com/watch?v=0l9m-pYnlQ8',
  'ex-smith-bench':        'https://www.youtube.com/watch?v=_ZrCd4IDNSU',
  'ex-landmine-press':     'https://www.youtube.com/watch?v=3gYz0bLG-wY',
  'ex-close-grip-bench':   'https://www.youtube.com/watch?v=fECGFqMcs-I',

  // ── Back ───────────────────────────────────────────────────
  'ex-deadlift':             'https://www.youtube.com/watch?v=-4qRntuXBSc',
  'ex-barbell-row':          'https://www.youtube.com/watch?v=KOv41bfWDqQ',
  'ex-db-row':               'https://www.youtube.com/watch?v=XW-LLW28gWM',
  'ex-pull-ups':             'https://www.youtube.com/watch?v=yrvqq6QXAWQ',
  'ex-chin-ups':             'https://www.youtube.com/watch?v=w9zFPRtRF6M',
  'ex-lat-pulldown':         'https://www.youtube.com/watch?v=SALxEARiMkw',
  'ex-seated-row':           'https://www.youtube.com/watch?v=5yI9kOrti5w',
  'ex-cable-row':            'https://www.youtube.com/watch?v=4ukvdFiOmT0',
  'ex-t-bar-row':            'https://www.youtube.com/watch?v=zAZQJYx9vrk',
  'ex-face-pull':            'https://www.youtube.com/watch?v=eTCBSFlCJ_s',
  'ex-pendlay-row':          'https://www.youtube.com/watch?v=0PSfteHhUtg',
  'ex-chest-supported-row':  'https://www.youtube.com/watch?v=_b6ch2nIchk',
  'ex-reverse-lat-pulldown': 'https://www.youtube.com/watch?v=yVFd3uZ1zeo',
  'ex-pullover':             'https://www.youtube.com/watch?v=Oma-o6fHKRs',
  'ex-rack-pull':            'https://www.youtube.com/watch?v=DizJXKoHBJw',
  'ex-landmine-row':         'https://www.youtube.com/watch?v=dBVihJUqyuU',

  // ── Shoulders ──────────────────────────────────────────────
  'ex-ohp':                    'https://www.youtube.com/watch?v=GlyABLsPk-Q',
  'ex-db-shoulder-press':      'https://www.youtube.com/watch?v=8TnV6TY2mA8',
  'ex-lateral-raise':          'https://www.youtube.com/watch?v=6a-sO62TN5E',
  'ex-front-raise':            'https://www.youtube.com/watch?v=CH9JzDStL3U',
  'ex-rear-delt-fly':          'https://www.youtube.com/watch?v=9WpNWAM782Y',
  'ex-upright-row':            'https://www.youtube.com/watch?v=-Z3xIP1KdSw',
  'ex-arnold-press':           'https://www.youtube.com/watch?v=ris9tKqMwgU',
  'ex-cable-lateral-raise':    'https://www.youtube.com/watch?v=-CAGLnWUkWA',
  'ex-machine-shoulder-press': 'https://www.youtube.com/watch?v=3R14MnZbcpw',
  'ex-lu-raise':               'https://www.youtube.com/watch?v=r2yP7tcUz1s',

  // ── Biceps ─────────────────────────────────────────────────
  'ex-barbell-curl':       'https://www.youtube.com/watch?v=OKpYniUTX9w',
  'ex-db-curl':            'https://www.youtube.com/watch?v=93UTj3OdBQ4',
  'ex-hammer-curl':        'https://www.youtube.com/watch?v=zC3nLlEvin4',
  'ex-preacher-curl':      'https://www.youtube.com/watch?v=BPmUhDtdQfw',
  'ex-concentration-curl': 'https://www.youtube.com/watch?v=sYv1q8AsMUc',
  'ex-cable-curl':         'https://www.youtube.com/watch?v=u6KwJ2rPoTU',
  'ex-ez-bar-curl':        'https://www.youtube.com/watch?v=4zVCOcypCac',
  'ex-incline-db-curl':    'https://www.youtube.com/watch?v=DCe8f6vMe9A',
  'ex-spider-curl':        'https://www.youtube.com/watch?v=jmXXRM755MM',
  'ex-machine-curl':       'https://www.youtube.com/watch?v=x7YQw9JR48o',

  // ── Triceps ────────────────────────────────────────────────
  'ex-tricep-pushdown': 'https://www.youtube.com/watch?v=ozwo9RGm7QU',
  'ex-overhead-tricep': 'https://www.youtube.com/watch?v=W6h3t9mkRrY',
  'ex-skull-crushers':  'https://www.youtube.com/watch?v=Mh5WtFb1SwE',
  'ex-dips-tricep':     'https://www.youtube.com/watch?v=049wbhkKCtM',
  'ex-kickbacks':       'https://www.youtube.com/watch?v=Kuw99lFTIQs',
  'ex-rope-pushdown':   'https://www.youtube.com/watch?v=-KVa3M1uZfs',
  'ex-diamond-pushups': 'https://www.youtube.com/watch?v=Qonrse1MWts',

  // ── Quads ──────────────────────────────────────────────────
  'ex-squat':           'https://www.youtube.com/watch?v=nEQQle9-0NA',
  'ex-front-squat':     'https://www.youtube.com/watch?v=X9pDRhCF3t0',
  'ex-leg-press':       'https://www.youtube.com/watch?v=mq40ebFwhT8',
  'ex-leg-extension':   'https://www.youtube.com/watch?v=TJQmtXUEzNk',
  'ex-lunges':          'https://www.youtube.com/watch?v=vYfp2t4XgqQ',
  'ex-bulgarian-split': 'https://www.youtube.com/watch?v=hiLF_pF3EJM',
  'ex-hack-squat':      'https://www.youtube.com/watch?v=hglQExHCM9Q',
  'ex-goblet-squat':    'https://www.youtube.com/watch?v=5fH5RacAZG0',
  'ex-smith-squat':     'https://www.youtube.com/watch?v=3TPgJJmT2xc',
  'ex-sumo-deadlift':   'https://www.youtube.com/watch?v=ab1sUJErTzc',
  'ex-step-ups':        'https://www.youtube.com/watch?v=t8wUxgc9IFs',
  'ex-box-squat':       'https://www.youtube.com/watch?v=6bruswXSJeY',

  // ── Hamstrings ─────────────────────────────────────────────
  'ex-romanian-deadlift':  'https://www.youtube.com/watch?v=68DCrZYEtus',
  'ex-leg-curl':           'https://www.youtube.com/watch?v=S367qaHeYWU',
  'ex-stiff-leg-deadlift': 'https://www.youtube.com/watch?v=BRNsnWvEty4',
  'ex-good-mornings':      'https://www.youtube.com/watch?v=0Syp9iyINZ4',
  'ex-nordic-curl':        'https://www.youtube.com/watch?v=bcwPbhvVohg',

  // ── Glutes ─────────────────────────────────────────────────
  'ex-hip-thrust':     'https://www.youtube.com/watch?v=kUqd_ho2ZKg',
  'ex-glute-bridge':   'https://www.youtube.com/watch?v=MxWkgxz8HXc',
  'ex-cable-kickback': 'https://www.youtube.com/watch?v=bVrmtCI00Ys',
  'ex-hip-abduction':  'https://www.youtube.com/watch?v=OQC8nso2aPE',

  // ── Calves ─────────────────────────────────────────────────
  'ex-calf-raise-standing': 'https://www.youtube.com/watch?v=tFXMJWa5R0c',
  'ex-calf-raise-seated':  'https://www.youtube.com/watch?v=I1uQtobaNRQ',
  'ex-leg-press-calf':     'https://www.youtube.com/watch?v=8k435cj30gc',

  // ── Abs ────────────────────────────────────────────────────
  'ex-crunch':           'https://www.youtube.com/watch?v=tnZNcIqhGb0',
  'ex-plank':            'https://www.youtube.com/watch?v=HaH4JvdBCfE',
  'ex-hanging-leg-raise':'https://www.youtube.com/watch?v=vwl68EF9M2Q',
  'ex-cable-crunch':     'https://www.youtube.com/watch?v=AV5PmZJIrrw',
  'ex-ab-wheel':         'https://www.youtube.com/watch?v=nCh8VfWY5_g',
  'ex-russian-twist':    'https://www.youtube.com/watch?v=IJDOoVyVjhc',
  'ex-decline-crunch':   'https://www.youtube.com/watch?v=AJWWV8SJ_lk',
  'ex-bicycle-crunch':   'https://www.youtube.com/watch?v=xqY8xEXW2xA',
  'ex-cable-woodchop':   'https://www.youtube.com/watch?v=Gwcf4TOj1hc',
  'ex-dragon-flag':      'https://www.youtube.com/watch?v=6Lar9utB5ZU',
  'ex-pallof-press':     'https://www.youtube.com/watch?v=YD_N1dWL8EI',

  // ── Traps ──────────────────────────────────────────────────
  'ex-shrugs':    'https://www.youtube.com/watch?v=q4x4syK-eXM',
  'ex-db-shrugs': 'https://www.youtube.com/watch?v=YMkyo8Uay9I',

  // ── Forearms ───────────────────────────────────────────────
  'ex-wrist-curl':         'https://www.youtube.com/watch?v=iBqDpF8AmFc',
  'ex-reverse-wrist-curl': 'https://www.youtube.com/watch?v=SfENsl5klVA',
  'ex-farmers-walk':       'https://www.youtube.com/watch?v=62v48abT5-Y',
};
