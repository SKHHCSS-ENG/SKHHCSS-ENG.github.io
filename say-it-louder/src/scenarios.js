/**
 * Say It Louder — scenario packs (data only).
 * Mission 1: The Lost Bag. Soft comedy on the MTR after a school trip.
 * Mission 2: School Map Walk. Soft peer-help directions on a campus map.
 * main.js and the mock coach read these fields.
 */

const lostBag = {
  id: "level_1_lost_bag",
  title: "Mission 1: The Lost Bag",
  band: "All Levels starter",
  aiName: "Leo",
  sceneId: "mtr-carriage",
  frame: "Help Leo find his bag before the doors close.",
  timerLabel: "Doors",
  stageLabel: "Carriage",
  noteTitle: "Seat note",
  noteLead: "Leo remembers this. Say it in a clear sentence.",
  doorsSeconds: 90,
  maxStrikes: 3,
  allowedActions: [
    "NONE",
    "HOVER_CONFUSED",
    "BAG_BLACK_SPORTS",
    "BAG_NAVY_SMALL",
    "BAG_GREY_BIG",
    "LUNCHBOX_YELLOW",
    "SHOW_NAME_TAG",
    "SEAT_NEAR_DOOR",
    "SEAT_LEFT",
    "SEAT_MIDDLE"
  ],
  clarityStrikeActions: ["BAG_BLACK_SPORTS", "BAG_GREY_BIG", "LUNCHBOX_YELLOW"],
  moods: ["PANICKED", "CONFUSED", "RELIEVED", "HOPEFUL"],
  winWhen: {
    BAG_NAVY_SMALL: "HELD",
    NAME_TAG: "SHOWN"
  },
  steps: [
    { id: "zone", label: "Place", key: "SEAT_NEAR_DOOR", value: "LOOKING" },
    { id: "bag", label: "Bag", key: "BAG_NAVY_SMALL", value: "HELD" },
    { id: "tag", label: "Name tag", key: "NAME_TAG", value: "SHOWN" }
  ],
  endCopy: {
    winTitle: "Bag found!",
    winDetail: "You said it clearer.",
    missTitle: "Missed the stop — try again next carriage",
    missDetail: "Reset and coach Leo again. Clear beats loud."
  },
  intro: {
    spoken_reply: "Help! The doors will close and I still can't see my bag. There are bags all over this carriage. Where do I look?",
    mood: "PANICKED",
    teacher_tip: "Start with a place. Try: Look under the seats near the door."
  },
  manualSteps: [
    "Look under the seats near the door.",
    "His bag is small and navy — not the black sports bag, and not the big grey one.",
    "It is under the seat, between the black sports bag and the yellow lunchbox.",
    "Check the name tag on the front."
  ],
  chunks: [
    "Look under the seats near the door.",
    "Pick up the small navy bag.",
    "It's between the black bag and the yellow lunchbox.",
    "Check the name tag on the front."
  ],
  props: [
    { id: "BAG_BLACK_SPORTS", label: "Black sports bag", place: "Beside the seat" },
    { id: "BAG_NAVY_SMALL", label: "Small navy bag", place: "Under the seat" },
    { id: "LUNCHBOX_YELLOW", label: "Yellow lunchbox", place: "Next to the seat" },
    { id: "BAG_GREY_BIG", label: "Big grey bag", place: "At the far end" }
  ],
  initialState: {
    BAG_BLACK_SPORTS: "ON_SEAT",
    BAG_NAVY_SMALL: "UNDER_SEAT",
    BAG_GREY_BIG: "ON_FLOOR",
    LUNCHBOX_YELLOW: "ON_SEAT",
    SEAT_LEFT: "IDLE",
    SEAT_MIDDLE: "IDLE",
    SEAT_NEAR_DOOR: "IDLE",
    NAME_TAG: "HIDDEN"
  },
  trapRules: [
    "If the student says only “the bag” or “that one”, use HOVER_CONFUSED and ask for colour and size.",
    "If they say “the black bag” or “the big bag” without the small navy bag under the seat, do not treat it as a win. Use the wrong-bag line and a clarity strike.",
    "If they say “under the seat” without “between” the black sports bag and the yellow lunchbox, ask which things it is between.",
    "Navy is not the same as blue. The lunchbox is yellow.",
    "Win only when BAG_NAVY_SMALL is chosen (small navy, under the seat, between the black sports bag and the yellow lunchbox) and the name tag is confirmed. One clear utterance that does both may win in a single turn.",
    "A miss is “Missed the stop”. This is a school-trip mix-up, not a chase."
  ].join(" "),
  lines: {
    beat1: {
      spoken_reply: "Okay… near the door? I'm looking. There are three bags here!",
      mood: "PANICKED",
      hardware_action: "SEAT_NEAR_DOOR",
      teacher_tip: "Nice start. Add a colour or size so Leo knows which bag."
    },
    beat2: {
      spoken_reply: "Which bag? The black one or the navy one? Say it clearer!",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Try navy or black — say colour and size together."
    },
    beat3: {
      spoken_reply: "Small navy bag… under the seat… between the black bag and the yellow lunchbox. Got it!",
      mood: "HOPEFUL",
      hardware_action: "BAG_NAVY_SMALL",
      teacher_tip: "Great — size, colour, and between. Next check the name tag."
    },
    beat4: {
      spoken_reply: "Name tag says Leo — that's mine! Thank you!",
      mood: "RELIEVED",
      hardware_action: "SHOW_NAME_TAG",
      teacher_tip: "Try: Check the name tag on the front of the bag."
    },
    beat5Black: {
      spoken_reply: "Wait — this has someone else's PE kit! I'm putting it back. Which bag is mine?",
      mood: "PANICKED",
      hardware_action: "BAG_BLACK_SPORTS",
      teacher_tip: "That was the black sports bag. Try the small navy one under the seat."
    },
    beat5Grey: {
      spoken_reply: "This big grey one isn't mine — it's full of someone else's books. I'm putting it back.",
      mood: "PANICKED",
      hardware_action: "BAG_GREY_BIG",
      teacher_tip: "That was the big grey bag. Leo needs the small navy one under the seat, between the black sports bag and the yellow lunchbox."
    },
    beat6: {
      spoken_reply: "Small navy bag secured. I'm getting off — you're a legend!",
      mood: "RELIEVED",
      hardware_action: "BAG_NAVY_SMALL",
      teacher_tip: "Clear speech found it — not volume. Well done."
    },
    beat6Early: {
      spoken_reply: "Small and navy — good. I still need the place. Under the seat, between which things? Then check the name tag.",
      mood: "HOPEFUL",
      hardware_action: "NONE",
      teacher_tip: "Add the place: under the seat, between the black sports bag and the yellow lunchbox."
    },
    inTheDoor: {
      spoken_reply: "In the door? I'll get squashed. Do you mean near the door?",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "Near the door, not in the door. Try: Look under the seats near the door."
    },
    nameTagInside: {
      spoken_reply: "Inside the bag? I don't want to open someone else's zip. Where is the name tag?",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "On the bag, not in it. Say: Check the name tag on the front."
    },
    nameTagEarly: {
      spoken_reply: "I can check a name tag — but which bag? Tell me the colour, the size, and the place first.",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Find the bag first. Small navy, under the seat, between the black sports bag and the yellow lunchbox."
    },
    needBetween: {
      spoken_reply: "Under the seat… but two things are by that seat. Between what and what?",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "Say: between the black sports bag and the yellow lunchbox."
    },
    needUnder: {
      spoken_reply: "Between the black bag and the yellow lunchbox — on the seat or under it?",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "Add under — the small navy bag is under the seat, not on it."
    },
    underNotOn: {
      spoken_reply: "On the seat? I see the black sports bag and a lunchbox up there. Is mine under the seat?",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Under, not on. Leo's bag is under the seat."
    },
    besideNotBetween: {
      spoken_reply: "Beside the black bag could be the lunchbox. Do you mean between the black bag and the yellow lunchbox?",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Between names both sides. Beside only names one neighbour."
    },
    navyNeedSize: {
      spoken_reply: "The navy one — is it the small bag under the seat, or are you looking at something bigger?",
      mood: "HOPEFUL",
      hardware_action: "NONE",
      teacher_tip: "Add size and place: the small navy bag under the seat."
    },
    blueNotNavy: {
      spoken_reply: "Blue? I need the exact colour. Do you mean navy?",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Say navy, not just blue. The lunchbox is yellow."
    },
    redNone: {
      spoken_reply: "Red? I can't see a red bag. The ones here are black, navy, and grey.",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Name a colour that is there: black, navy, or grey."
    },
    lunchbox: {
      spoken_reply: "This is the yellow lunchbox — there's an apple in it, not my books! I'm putting it back.",
      mood: "PANICKED",
      hardware_action: "LUNCHBOX_YELLOW",
      teacher_tip: "The yellow lunchbox is only a landmark. The bag is the small navy one between that lunchbox and the black sports bag."
    },
    zoneAgain: {
      spoken_reply: "I'm already at the seats near the door. Which bag — colour and size?",
      mood: "HOPEFUL",
      hardware_action: "SEAT_NEAR_DOOR",
      teacher_tip: "Next: small navy, under the seat, between the black sports bag and the yellow lunchbox."
    },
    seatLeft: {
      spoken_reply: "On the left there's a black sports bag. Mine should be nearer the door, under the seat.",
      mood: "CONFUSED",
      hardware_action: "SEAT_LEFT",
      teacher_tip: "On the left is the wrong bag. Look under the seats near the door."
    },
    farEnd: {
      spoken_reply: "The far end? That's a big grey bag. My stop is the other way — near the door.",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "At the far end is the big grey bag. Leo's is under the seat near the door."
    },
    empty: {
      spoken_reply: "I didn't hear an instruction. Tell me where to look.",
      mood: "PANICKED",
      hardware_action: "NONE",
      teacher_tip: "Use a place phrase. Try: Look under the seats near the door."
    },
    alreadyWon: {
      spoken_reply: "We've got it — the name tag says Leo. I can get off at the next stop.",
      mood: "RELIEVED",
      hardware_action: "NONE",
      teacher_tip: "Clear speech found it — not volume. Well done."
    },
    fallback: {
      spoken_reply: "Say it clearer for me? I need a colour, a size, and a place.",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Try one sentence: the small navy bag under the seat, between the black sports bag and the yellow lunchbox."
    }
  }
};

const schoolMap = {
  id: "mission_2_school_map_walk",
  title: "Mission 2: School Map Walk",
  band: "All Levels starter",
  aiName: "Leo",
  sceneId: "school-map",
  frame: "Help Leo walk to the library before the next lesson.",
  timerLabel: "Bell",
  stageLabel: "School map",
  noteTitle: "Route note",
  noteLead: "Leo has the map. Say the next direction in a clear sentence.",
  doorsSeconds: 90,
  maxStrikes: 3,
  resetOnMiss: true,
  timeoutMood: "CONFUSED",
  timeoutLine: "Bell's gone — try the walk again from the gate.",
  resetSpoken: "Bell's gone. I'm back at the school gate. Which way is the library?",
  resetMood: "CONFUSED",
  strikeOutSuffix: " That's three. Bell's gone — try again from the gate.",
  badActionTip: "The coach reply was not a known action. Try the route note again.",
  allowedActions: [
    "MOVE_NORTH",
    "MOVE_SOUTH",
    "MOVE_EAST",
    "MOVE_WEST",
    "TURN_LEFT",
    "TURN_RIGHT",
    "GO_ALONG_PATH",
    "GO_THROUGH_GATE",
    "WALK_PAST_CANTEEN",
    "CROSS_PLAYGROUND",
    "ARRIVE_GATE",
    "ARRIVE_OFFICE",
    "ARRIVE_CANTEEN",
    "ARRIVE_PLAYGROUND",
    "ARRIVE_HALL",
    "ARRIVE_LIBRARY",
    "NONE",
    "HOVER_CONFUSED",
    "STEP_BACK"
  ],
  clarityStrikeActions: ["HOVER_CONFUSED", "STEP_BACK", "ARRIVE_CANTEEN", "ARRIVE_HALL"],
  moods: ["CONFUSED", "HOPEFUL", "RELIEVED", "PANICKED"],
  winWhen: {
    LIBRARY: "ARRIVED"
  },
  steps: [
    { id: "gate", label: "Gate", key: "GATE", value: "THROUGH" },
    { id: "office", label: "Office", key: "OFFICE", value: "PAST" },
    { id: "path", label: "Walkway", key: "WALKWAY", value: "ALONG" },
    { id: "canteen", label: "Canteen", key: "CANTEEN", value: "PAST" },
    { id: "ground", label: "Playground", key: "PLAYGROUND", value: "CROSSED" },
    { id: "library", label: "Library", key: "LIBRARY", value: "ARRIVED" }
  ],
  endCopy: {
    winTitle: "Made it!",
    winDetail: "Library reached.",
    missTitle: "Bell's gone — try again from the gate",
    missDetail: "Reset and walk with Leo again. Clear beats loud."
  },
  intro: {
    spoken_reply: "I'm at the school gate with the map, and the next lesson is coming. Which way is the library?",
    mood: "CONFUSED",
    teacher_tip: "Start at the gate. Try: Go through the school gate and walk straight on."
  },
  manualSteps: [
    "Go through the school gate and walk straight on.",
    "Walk past the school office and turn left.",
    "Go along the covered walkway towards the canteen.",
    "Walk past the canteen. Don't go inside.",
    "Walk next to the playground until you see the library.",
    "Go into the library."
  ],
  chunks: [
    "Go through the school gate and walk straight on.",
    "Walk past the school office and turn left.",
    "Go along the covered walkway towards the canteen.",
    "Walk past the canteen. Don't go inside.",
    "Walk next to the playground until you see the library.",
    "Go into the library."
  ],
  landmarks: [
    { id: "GATE", label: "School Gate", place: "Start" },
    { id: "OFFICE", label: "School Office", place: "Walk past" },
    { id: "WALKWAY", label: "Covered walkway", place: "Go along" },
    { id: "CANTEEN", label: "Canteen", place: "Walk past" },
    { id: "PLAYGROUND", label: "Playground", place: "Cross the edge" },
    { id: "HALL", label: "School Hall", place: "Next to the library" },
    { id: "LIBRARY", label: "Library", place: "Goal" }
  ],
  initialState: {
    NODE: "GATE",
    LAST_NODE: "GATE",
    FACING: "NORTH",
    GATE: "AT",
    OFFICE: "AHEAD",
    WALKWAY: "AHEAD",
    CANTEEN: "AHEAD",
    PLAYGROUND: "AHEAD",
    HALL: "AHEAD",
    LIBRARY: "AHEAD"
  },
  trapRules: [
    "If the student says only “go”, “that way”, or “turn”, use HOVER_CONFUSED and ask for left, right, or a landmark.",
    "If they say go into the canteen or go to the canteen when the route needs walk past, use STEP_BACK. That is a soft wrong building, not a win.",
    "If they name the hall without the library, use ARRIVE_HALL and ask for the library next to the hall.",
    "Win only on ARRIVE_LIBRARY after the gate, past the office, along the walkway, past the canteen, and the playground. One clear utterance that gives that whole chain may win in a single turn.",
    "A miss is “Bell's gone — try again from the gate”. This is a campus errand, not a chase."
  ].join(" "),
  lines: {
    beat1: {
      spoken_reply: "Okay… through the gate… walking straight. I can see the office ahead!",
      mood: "HOPEFUL",
      hardware_action: "GO_THROUGH_GATE",
      teacher_tip: "Nice start. Next, say which way to turn when you reach the office."
    },
    beat1North: {
      spoken_reply: "Straight on, towards the office. I'm coming through the gate.",
      mood: "HOPEFUL",
      hardware_action: "MOVE_NORTH",
      teacher_tip: "Straight on works. Next, say walk past the school office and turn left."
    },
    needThrough: {
      spoken_reply: "I'm at the gate, but I haven't gone through. Say go through the school gate.",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "Go through the school gate, not just go to the gate."
    },
    vagueTurn: {
      spoken_reply: "Turn… which way? Left or right? Say it clearer!",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Add left or right after turn — for example, turn left at the office."
    },
    vagueGo: {
      spoken_reply: "Go… which way? Name a landmark, or say left or right.",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Go on its own is too vague. Try: Go through the school gate and walk straight on."
    },
    officePast: {
      spoken_reply: "Walking past the school office. Do I turn left or right here?",
      mood: "HOPEFUL",
      hardware_action: "ARRIVE_OFFICE",
      teacher_tip: "You named the office. Add the turn: turn left."
    },
    officeTurn: {
      spoken_reply: "Past the office and left. I can see a covered walkway.",
      mood: "HOPEFUL",
      hardware_action: "TURN_LEFT",
      teacher_tip: "Clear turn. Next, say go along the covered walkway."
    },
    turnLeftOnly: {
      spoken_reply: "Turning left. Say it again with the office if that is the landmark.",
      mood: "HOPEFUL",
      hardware_action: "TURN_LEFT",
      teacher_tip: "Add the landmark: walk past the school office and turn left."
    },
    turnRight: {
      spoken_reply: "Right? That faces away from the walkway. Do you mean turn left at the office?",
      mood: "CONFUSED",
      hardware_action: "TURN_RIGHT",
      teacher_tip: "At the office the path is left. Say: Walk past the school office and turn left."
    },
    along: {
      spoken_reply: "Along the walkway… I can smell the canteen already!",
      mood: "HOPEFUL",
      hardware_action: "GO_ALONG_PATH",
      teacher_tip: "Great use of go along. Next, tell Leo what to do when he reaches the canteen."
    },
    canteenFoil: {
      spoken_reply: "This smells like lunch, not books. I'm stepping back. Where should I go?",
      mood: "CONFUSED",
      hardware_action: "STEP_BACK",
      teacher_tip: "That was the canteen. Try walk past the canteen, then head for the playground."
    },
    canteenPast: {
      spoken_reply: "Walking past the canteen. I won't go in. The playground is ahead.",
      mood: "HOPEFUL",
      hardware_action: "WALK_PAST_CANTEEN",
      teacher_tip: "Walk past is the right choice. Next, walk next to the playground or cross the edge."
    },
    besideCanteen: {
      spoken_reply: "Beside the canteen might mean I step in. Do you mean walk past it?",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "Say walk past the canteen. Beside can sound like go in."
    },
    playground: {
      spoken_reply: "Next to the playground… oh! I can see the library sign!",
      mood: "HOPEFUL",
      hardware_action: "CROSS_PLAYGROUND",
      teacher_tip: "Clear place language. Finish with go into the library or stop at the library."
    },
    hallFoil: {
      spoken_reply: "This is the hall — big stage, no books. Which building is the library?",
      mood: "CONFUSED",
      hardware_action: "ARRIVE_HALL",
      teacher_tip: "Name the building: the library next to the hall, not the hall itself."
    },
    win: {
      spoken_reply: "Library doors — I'm in! You're a legend. Book time!",
      mood: "RELIEVED",
      hardware_action: "ARRIVE_LIBRARY",
      teacher_tip: "Clear directions did it — turn, go along, past, and next to. Volume was never the point."
    },
    earlyLibrary: {
      spoken_reply: "The library is the goal, but I'm not there yet. Where do I go next?",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "Keep the order: gate, past the office, along the walkway, past the canteen, then the playground."
    },
    libraryNeedVerb: {
      spoken_reply: "I can see the library. Do I go in, or stop at the door?",
      mood: "HOPEFUL",
      hardware_action: "NONE",
      teacher_tip: "Finish the direction: go into the library, or stop at the library."
    },
    earlyStep: {
      spoken_reply: "I can do that in a minute. Tell me the next bit from where I'm standing.",
      mood: "HOPEFUL",
      hardware_action: "NONE",
      teacher_tip: "One clear step at a time. Say the direction for the place Leo can see now."
    },
    compass: {
      spoken_reply: "I can face that way. Add a landmark so I know when to stop.",
      mood: "HOPEFUL",
      hardware_action: "MOVE_NORTH",
      teacher_tip: "A compass word turns Leo. Pair it with a place, such as the office or the walkway."
    },
    empty: {
      spoken_reply: "I didn't hear a direction. Tell me which way to walk.",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "Use a direction. Try: Go through the school gate and walk straight on."
    },
    alreadyWon: {
      spoken_reply: "We're at the library. Made it — thank you!",
      mood: "RELIEVED",
      hardware_action: "NONE",
      teacher_tip: "Clear directions did it — turn, go along, past, and next to. Volume was never the point."
    },
    fallback: {
      spoken_reply: "Say it clearer for me? I need a direction and a landmark.",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Add a landmark and a direction word, such as turn left, go along, or walk past."
    }
  }
};

export const SCENARIOS = {
  level_1_lost_bag: lostBag,
  mission_1_lost_bag: lostBag,
  mission_2_school_map_walk: schoolMap,
  level_2_map_walk: schoolMap
};
