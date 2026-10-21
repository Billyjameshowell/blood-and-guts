// Blood & Guts (Dorian Yates) program. exerciseId = ExerciseDB media id (see EXERCISEDB_MATCHES.md).
export type SetDef = { kind: 'wu' | 'work'; reps: string; note?: string; mode?: 'timed' };
export type Exercise = {
  id: string;
  name: string;
  exerciseId?: string;
  matchName?: string;
  weak?: boolean;
  startHint?: string;
  placeholder?: 'cardio' | 'stretch';
  sets: SetDef[];
};
export type Day = { id: number; title: string; short: string; exercises: Exercise[] };

export const gifUrl = (id: string) => `https://static.exercisedb.dev/media/${id}.gif`;

export const DAYS: Day[] = [
  {
    id: 1,
    title: 'Chest & Biceps',
    short: 'Chest',
    exercises: [
      { id: 'd1-tread', name: '10 min treadmill warm-up', placeholder: 'cardio', sets: [{ kind: 'wu', reps: '10 min', note: 'Steady pace', mode: 'timed' }] },
      { id: 'd1-rotator', name: 'Rotator Cuff Warm-Up', exerciseId: 'x306lCW', matchName: 'dumbbell upright shoulder external rotation', weak: true, startHint: 'Start ~12 lb per hand', sets: [
        { kind: 'wu', reps: '12' }, { kind: 'wu', reps: '12' }
      ]},
      { id: 'd1-decline', name: 'Decline BB Bench Press', exerciseId: 'GrO65fd', matchName: 'barbell decline bench press', startHint: 'Start ~185 lb (bar)', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '6-8' }
      ]},
      { id: 'd1-incline', name: 'Incline DB Bench Press', exerciseId: 'ns0SIbU', matchName: 'dumbbell incline bench press', startHint: 'Start ~65 lb per hand', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '6-8' }
      ]},
      { id: 'd1-fly', name: 'DB Flyes', exerciseId: 'yz9nUhF', matchName: 'dumbbell fly', startHint: 'Start ~30 lb per hand', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '6-8' }
      ]},
      { id: 'd1-conc', name: 'DB Concentration Curl', exerciseId: 'gvsWLQw', matchName: 'dumbbell concentration curl', startHint: 'Start ~30 lb per hand', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '6-8' }
      ]},
      { id: 'd1-bbcurl', name: 'BB Curls', exerciseId: '25GPyDY', matchName: 'barbell curl', startHint: 'Start ~90 lb (bar)', sets: [
        { kind: 'work', reps: '6-8' }
      ]},
    ]
  },
  {
    id: 2,
    title: 'Back',
    short: 'Back',
    exercises: [
      { id: 'd2-pullover', name: 'DB Pullovers', exerciseId: '9XjtHvS', matchName: 'dumbbell pullover', startHint: 'Start ~50 lb', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '8-10' }
      ]},
      { id: 'd2-vbar', name: 'V-Bar Pulldown', exerciseId: '4c9BhzB', matchName: 'cable lateral pulldown with v-bar', startHint: 'Start ~150 lb stack', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '8-10' }
      ]},
      { id: 'd2-dbrow', name: 'DB Rows', exerciseId: 'C0MA9bC', matchName: 'dumbbell one arm bent-over row', startHint: 'Start ~75 lb per hand', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '8-10' }
      ]},
      { id: 'd2-wide', name: 'Wide-Grip Rows', exerciseId: 'qcY50ZD', matchName: 'cable seated wide-grip row', startHint: 'Start ~150 lb stack', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '8-10' }
      ]},
      { id: 'd2-dl', name: 'BB Deadlifts', exerciseId: 'ila4NZS', matchName: 'barbell deadlift', startHint: 'Start ~245 lb (bar)', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '8-10' }
      ]},
    ]
  },
  {
    id: 3,
    title: 'Delts & Triceps',
    short: 'Delts',
    exercises: [
      { id: 'd3-press', name: 'DB Shoulder Press', exerciseId: 'znQUdHY', matchName: 'dumbbell seated shoulder press', startHint: 'Start ~50 lb per hand', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'wu', reps: '8-10' }, { kind: 'work', reps: '6-8' }
      ]},
      { id: 'd3-side', name: 'Side Lateral Raises', exerciseId: 'DsgkuIt', matchName: 'dumbbell lateral raise', startHint: 'Start ~20 lb per hand', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '8-10' }
      ]},
      { id: 'd3-cablelat', name: 'Cable Lateral Raises', exerciseId: 'goJ6ezq', matchName: 'cable lateral raise', startHint: 'Start ~20 lb stack', sets: [
        { kind: 'work', reps: '6-8' }
      ]},
      { id: 'd3-pushdown', name: 'Cable Pushdown', exerciseId: '3ZflifB', matchName: 'cable pushdown', startHint: 'Start ~70 lb stack', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '8-10' }
      ]},
      { id: 'd3-skull', name: 'Skull Crushers', exerciseId: 'h8LFzo9', matchName: 'barbell lying triceps extension skull crusher', startHint: 'Start ~75 lb (bar)', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '8-10' }
      ]},
      { id: 'd3-seatedtri', name: 'Seated Triceps Press', exerciseId: '5uFK1xr', matchName: 'barbell seated overhead triceps extension', weak: true, startHint: 'Start ~70 lb (bar)', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '8-10' }
      ]},
    ]
  },
  {
    id: 4,
    title: 'Legs',
    short: 'Legs',
    exercises: [
      { id: 'd4-cardio', name: '10 min cardio', placeholder: 'cardio', sets: [
        { kind: 'wu', reps: '10 min', note: 'Cardio', mode: 'timed' },
      ]},
      { id: 'd4-lowback-bent', name: 'Low Back Stretch (bent knees)', exerciseId: 'znP9SIh', matchName: 'hug knees to chest', sets: [
        { kind: 'wu', reps: '1×6' }
      ]},
      { id: 'd4-lowback-straight', name: 'Low Back Stretch (straight legs)', exerciseId: 'JbC2iaV', matchName: 'spine stretch', weak: true, sets: [
        { kind: 'wu', reps: '1×6' }
      ]},
      { id: 'd4-hamstring', name: 'Hamstring Stretch', exerciseId: '99rWm7w', matchName: 'hamstring stretch', sets: [
        { kind: 'wu', reps: '1×6' }
      ]},
      { id: 'd4-glute', name: 'Glute Stretch', exerciseId: 'DeDThfG', matchName: 'seated glute stretch', sets: [
        { kind: 'wu', reps: '1×6' }
      ]},
      { id: 'd4-lext', name: 'Leg Extension', exerciseId: 'my33uHU', matchName: 'lever leg extension', startHint: 'Start ~110 lb stack', sets: [
        { kind: 'wu', reps: '15' }, { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '10-12' }
      ]},
      { id: 'd4-lpress', name: 'Leg Press', exerciseId: '10Z2DXU', matchName: 'sled 45° leg press', startHint: 'Start ~405 lb sled', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '10-12' }
      ]},
      { id: 'd4-hack', name: 'Hack Squat', exerciseId: 'Qa55kX1', matchName: 'sled hack squat', startHint: 'Start ~225 lb sled', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '10-12' }
      ]},
      { id: 'd4-lcurl', name: 'Leg Curl', exerciseId: '17lJ1kr', matchName: 'lever lying leg curl', startHint: 'Start ~100 lb stack', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '10-12' }
      ]},
      { id: 'd4-sldl', name: 'Stiff-Legged Deadlift', exerciseId: 'hrVQWvE', matchName: 'barbell straight leg deadlift', startHint: 'Start ~155 lb (bar)', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '10-12' }
      ]},
      { id: 'd4-calf', name: 'Calf Raises', exerciseId: 'ykUOVze', matchName: 'lever standing calf raise', startHint: 'Start ~270 lb stack', sets: [
        { kind: 'work', reps: '10-12' },
        { kind: 'work', reps: 'RP to fail', note: 'Rest-pause 10–15s · ↑ weight' },
        { kind: 'work', reps: 'RP to fail', note: 'Rest-pause 10–15s · ↑ weight' },
        { kind: 'work', reps: 'RP to fail', note: 'Rest-pause 10–15s · ↑ weight' },
      ]},
      { id: 'd4-seatedcalf', name: 'Seated Calf Raises', exerciseId: 'bOOdeyc', matchName: 'lever seated calf raise', startHint: 'Start ~110 lb stack', sets: [
        { kind: 'wu', reps: '10-12' }, { kind: 'work', reps: '6-8' }
      ]},
    ]
  }
];
