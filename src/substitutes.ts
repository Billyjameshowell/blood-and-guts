/**
 * Curated swaps for every slot in the Zajac split. The programmed movement is not listed here;
 * it is always the first option. Ids are stable: logged sets and last-time history key off them.
 * `barbell` turns on plate math (45 lb bar). `dumbbell` uses 2.5 lb steps under 25 lb.
 */
export type Swap = {
  id: string;
  name: string;
  exerciseId?: string;
  startHint?: string;
  barbell?: boolean;
  dumbbell?: boolean;
  placeholder?: 'cardio' | 'stretch';
};

export const SWAPS: Record<string, Swap[]> = {
  'd1-tread': [
    { id: 'd1-tread--bike', name: 'Bike', placeholder: 'cardio' },
    { id: 'd1-tread--rower', name: 'Rower', placeholder: 'cardio' },
    { id: 'd1-tread--elliptical', name: 'Elliptical', placeholder: 'cardio' },
  ],
  'd1-rotator': [
    { id: 'd1-rotator--cable', name: 'Cable External Rotation', startHint: 'Start ~15 lb stack' },
    { id: 'd1-rotator--band', name: 'Band Pull-Apart' },
    { id: 'd1-rotator--face', name: 'Face Pull', startHint: 'Start ~40 lb stack' },
  ],
  'd1-decline': [
    { id: 'd1-decline--db', name: 'Decline DB Bench', dumbbell: true, startHint: 'Start ~70 lb per hand' },
    { id: 'd1-decline--smith', name: 'Smith Decline Bench', startHint: 'Start ~135 lb' },
    { id: 'd1-decline--machine', name: 'Decline Chest Press', exerciseId: 'vsVoPHt', startHint: 'Start ~140 lb stack' },
  ],
  'd1-incline': [
    { id: 'd1-incline--bb', name: 'Incline BB Bench', barbell: true, startHint: 'Start ~135 lb (bar)' },
    { id: 'd1-incline--smith', name: 'Smith Incline Bench', exerciseId: '5v7KYld', startHint: 'Start ~95 lb' },
    { id: 'd1-incline--machine', name: 'Incline Chest Press', startHint: 'Start ~120 lb stack' },
  ],
  'd1-fly': [
    { id: 'd1-fly--cable', name: 'Cable Fly', startHint: 'Start ~25 lb stack' },
    { id: 'd1-fly--pec', name: 'Pec Deck', startHint: 'Start ~70 lb stack' },
    { id: 'd1-fly--machine', name: 'Machine Fly', startHint: 'Start ~70 lb stack' },
  ],
  'd1-conc': [
    { id: 'd1-conc--preacher', name: 'Preacher Curl', startHint: 'Start ~50 lb' },
    { id: 'd1-conc--cable', name: 'Cable Curl', startHint: 'Start ~40 lb stack' },
    { id: 'd1-conc--machine', name: 'Machine Curl', startHint: 'Start ~50 lb stack' },
  ],
  'd1-bbcurl': [
    { id: 'd1-bbcurl--db', name: 'DB Curl', dumbbell: true, startHint: 'Start ~35 lb per hand' },
    { id: 'd1-bbcurl--ez', name: 'EZ-Bar Curl', startHint: 'Start ~60 lb' },
    { id: 'd1-bbcurl--cable', name: 'Cable Curl', startHint: 'Start ~60 lb stack' },
  ],
  'd2-pullover': [
    { id: 'd2-pullover--bb', name: 'BB Pullover', barbell: true, startHint: 'Start ~65 lb (bar)' },
    { id: 'd2-pullover--cable', name: 'Cable Pullover', startHint: 'Start ~40 lb stack' },
    { id: 'd2-pullover--machine', name: 'Machine Pullover', startHint: 'Start ~70 lb stack' },
  ],
  'd2-vbar': [
    { id: 'd2-vbar--wide', name: 'Wide Lat Pulldown', startHint: 'Start ~120 lb stack' },
    { id: 'd2-vbar--assisted', name: 'Assisted Pull-Up', exerciseId: 'MaMuGH6', startHint: 'Start ~70 lb assist' },
    { id: 'd2-vbar--row', name: 'Seated Cable Row', exerciseId: 'qcY50ZD', startHint: 'Start ~120 lb stack' },
  ],
  'd2-dbrow': [
    { id: 'd2-dbrow--bb', name: 'BB Row', barbell: true, startHint: 'Start ~135 lb (bar)' },
    { id: 'd2-dbrow--chest', name: 'Chest-Supported Row', startHint: 'Start ~90 lb' },
    { id: 'd2-dbrow--cable', name: 'Seated Cable Row', exerciseId: 'qcY50ZD', startHint: 'Start ~120 lb stack' },
  ],
  'd2-wide': [
    { id: 'd2-wide--close', name: 'Close-Grip Row', startHint: 'Start ~120 lb stack' },
    { id: 'd2-wide--machine', name: 'Machine Row', startHint: 'Start ~120 lb stack' },
    { id: 'd2-wide--chest', name: 'Chest-Supported Row', startHint: 'Start ~90 lb' },
  ],
  'd2-dl': [
    { id: 'd2-dl--trap', name: 'Trap-Bar Deadlift', exerciseId: 'jQGwmxN', startHint: 'Start ~225 lb' },
    { id: 'd2-dl--db', name: 'DB Deadlift', dumbbell: true, startHint: 'Start ~80 lb per hand' },
    { id: 'd2-dl--smith', name: 'Smith Deadlift', startHint: 'Start ~185 lb' },
  ],
  'd3-press': [
    { id: 'd3-press--bb', name: 'BB Shoulder Press', barbell: true, startHint: 'Start ~95 lb (bar)' },
    { id: 'd3-press--smith', name: 'Smith Shoulder Press', startHint: 'Start ~70 lb' },
    { id: 'd3-press--machine', name: 'Machine Shoulder Press', startHint: 'Start ~90 lb stack' },
  ],
  'd3-side': [
    { id: 'd3-side--cable', name: 'Cable Lateral Raise', exerciseId: 'goJ6ezq', startHint: 'Start ~15 lb stack' },
    { id: 'd3-side--machine', name: 'Machine Lateral Raise', startHint: 'Start ~40 lb stack' },
    { id: 'd3-side--band', name: 'Band Lateral Raise' },
  ],
  'd3-cablelat': [
    { id: 'd3-cablelat--db', name: 'DB Lateral Raise', exerciseId: 'DsgkuIt', dumbbell: true, startHint: 'Start ~20 lb per hand' },
    { id: 'd3-cablelat--machine', name: 'Machine Lateral Raise', startHint: 'Start ~40 lb stack' },
    { id: 'd3-cablelat--band', name: 'Band Lateral Raise' },
  ],
  'd3-pushdown': [
    { id: 'd3-pushdown--rope', name: 'Rope Pushdown', startHint: 'Start ~50 lb stack' },
    { id: 'd3-pushdown--machine', name: 'Machine Pushdown', startHint: 'Start ~70 lb stack' },
    { id: 'd3-pushdown--kick', name: 'DB Kickback', dumbbell: true, startHint: 'Start ~20 lb per hand' },
  ],
  'd3-skull': [
    { id: 'd3-skull--db', name: 'DB Skull Crusher', dumbbell: true, startHint: 'Start ~25 lb per hand' },
    { id: 'd3-skull--ez', name: 'EZ-Bar Skull Crusher', startHint: 'Start ~50 lb' },
    { id: 'd3-skull--cable', name: 'Cable Overhead Extension', startHint: 'Start ~40 lb stack' },
  ],
  'd3-seatedtri': [
    { id: 'd3-seatedtri--db', name: 'DB Overhead Extension', dumbbell: true, startHint: 'Start ~30 lb per hand' },
    { id: 'd3-seatedtri--cable', name: 'Cable Overhead Extension', startHint: 'Start ~40 lb stack' },
    { id: 'd3-seatedtri--dip', name: 'Machine Dip', startHint: 'Start ~90 lb stack' },
  ],
  'd4-cardio': [
    { id: 'd4-cardio--bike', name: 'Bike', placeholder: 'cardio' },
    { id: 'd4-cardio--rower', name: 'Rower', placeholder: 'cardio' },
    { id: 'd4-cardio--elliptical', name: 'Elliptical', placeholder: 'cardio' },
  ],
  'd4-lowback-bent': [
    { id: 'd4-lowback-bent--knees', name: 'Knees-to-Chest', placeholder: 'stretch' },
    { id: 'd4-lowback-bent--child', name: "Child's Pose", placeholder: 'stretch' },
    { id: 'd4-lowback-bent--cat', name: 'Cat-Cow', placeholder: 'stretch' },
  ],
  'd4-lowback-straight': [
    { id: 'd4-lowback-straight--toe', name: 'Toe Touch', placeholder: 'stretch' },
    { id: 'd4-lowback-straight--fold', name: 'Seated Forward Fold', placeholder: 'stretch' },
    { id: 'd4-lowback-straight--dog', name: 'Downward Dog', placeholder: 'stretch' },
  ],
  'd4-hamstring': [
    { id: 'd4-hamstring--stand', name: 'Standing Hamstring', placeholder: 'stretch' },
    { id: 'd4-hamstring--lie', name: 'Lying Hamstring', placeholder: 'stretch' },
    { id: 'd4-hamstring--seat', name: 'Seated Hamstring', placeholder: 'stretch' },
  ],
  'd4-glute': [
    { id: 'd4-glute--four', name: 'Figure-Four', placeholder: 'stretch' },
    { id: 'd4-glute--pigeon', name: 'Pigeon', placeholder: 'stretch' },
    { id: 'd4-glute--supine', name: 'Supine Glute', placeholder: 'stretch' },
  ],
  'd4-lext': [
    { id: 'd4-lext--single', name: 'Single-Leg Extension', startHint: 'Start ~60 lb stack' },
    { id: 'd4-lext--sissy', name: 'Sissy Squat' },
    { id: 'd4-lext--nordic', name: 'Reverse Nordic' },
  ],
  'd4-lpress': [
    { id: 'd4-lpress--squat', name: 'BB Back Squat', barbell: true, startHint: 'Start ~185 lb (bar)' },
    { id: 'd4-lpress--smith', name: 'Smith Squat', startHint: 'Start ~135 lb' },
    { id: 'd4-lpress--goblet', name: 'Goblet Squat', dumbbell: true, startHint: 'Start ~50 lb' },
  ],
  'd4-hack': [
    { id: 'd4-hack--press', name: 'Leg Press', exerciseId: '10Z2DXU', startHint: 'Start ~360 lb sled' },
    { id: 'd4-hack--squat', name: 'BB Back Squat', barbell: true, startHint: 'Start ~185 lb (bar)' },
    { id: 'd4-hack--pendulum', name: 'Pendulum Squat', startHint: 'Start ~180 lb' },
  ],
  'd4-lcurl': [
    { id: 'd4-lcurl--seated', name: 'Seated Leg Curl', startHint: 'Start ~90 lb stack' },
    { id: 'd4-lcurl--stand', name: 'Standing Leg Curl', startHint: 'Start ~40 lb stack' },
    { id: 'd4-lcurl--ball', name: 'Stability-Ball Curl' },
  ],
  'd4-sldl': [
    { id: 'd4-sldl--db', name: 'DB Romanian Deadlift', dumbbell: true, startHint: 'Start ~50 lb per hand' },
    { id: 'd4-sldl--smith', name: 'Smith Romanian Deadlift', startHint: 'Start ~135 lb' },
    { id: 'd4-sldl--gm', name: 'Good Morning', barbell: true, startHint: 'Start ~95 lb (bar)' },
  ],
  'd4-calf': [
    { id: 'd4-calf--db', name: 'DB Calf Raise', dumbbell: true, startHint: 'Start ~40 lb per hand' },
    { id: 'd4-calf--smith', name: 'Smith Calf Raise', startHint: 'Start ~135 lb' },
    { id: 'd4-calf--press', name: 'Leg Press Calf', startHint: 'Start ~270 lb sled' },
  ],
  'd4-seatedcalf': [
    { id: 'd4-seatedcalf--db', name: 'DB Seated Calf', dumbbell: true, startHint: 'Start ~25 lb per hand' },
    { id: 'd4-seatedcalf--smith', name: 'Smith Seated Calf', startHint: 'Start ~90 lb' },
    { id: 'd4-seatedcalf--press', name: 'Leg Press Calf', startHint: 'Start ~180 lb sled' },
  ],
};
