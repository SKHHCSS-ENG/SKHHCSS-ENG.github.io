/**
 * Say It Louder — scenario packs (data only).
 * Mission 1: The Lost Bag. Soft comedy on the MTR after a school trip.
 * Add another mission by dropping a new object in SCENARIOS. main.js and the
 * mock coach read these fields; they do not hard-code a second mission.
 */

const lostBag = {
  id: "level_1_lost_bag",
  title: "Mission 1: The Lost Bag",
  band: "All Levels starter",
  aiName: "Leo",
  sceneId: "mtr-carriage",
  frame: "Help Leo find his bag before the doors close.",
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
      teacher_tip: "Nice start. Next, add a colour or size so Leo knows which bag."
    },
    beat2: {
      spoken_reply: "Which bag? The black one or the navy one? Say it clearer!",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Prompt: navy vs black. Ask for colour + size together."
    },
    beat3: {
      spoken_reply: "Small navy bag… under the seat… between the black bag and the yellow lunchbox. Got it!",
      mood: "HOPEFUL",
      hardware_action: "BAG_NAVY_SMALL",
      teacher_tip: "Excellent precision: size + colour + between X and Y."
    },
    beat4: {
      spoken_reply: "Name tag says Leo — that's mine! Thank you!",
      mood: "RELIEVED",
      hardware_action: "SHOW_NAME_TAG",
      teacher_tip: "Stretch: 'Check the name tag on the front of the bag.'"
    },
    beat5Black: {
      spoken_reply: "Wait — this has someone else's PE kit! I'm putting it back. Which bag is mine?",
      mood: "PANICKED",
      hardware_action: "BAG_BLACK_SPORTS",
      teacher_tip: "Wrong bag = soft fail. Push small + navy + under the seat."
    },
    beat5Grey: {
      spoken_reply: "This big grey one isn't mine — it's full of someone else's books. I'm putting it back.",
      mood: "PANICKED",
      hardware_action: "BAG_GREY_BIG",
      teacher_tip: "Wrong bag = soft fail. Leo needs the small navy one, under the seat, between the black sports bag and the yellow lunchbox."
    },
    beat6: {
      spoken_reply: "Small navy bag secured. I'm getting off — you're a legend!",
      mood: "RELIEVED",
      hardware_action: "BAG_NAVY_SMALL",
      teacher_tip: "Win: celebrate clear speech, not volume."
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
      teacher_tip: "Find the bag before the tag. Small navy, under the seat, between the black sports bag and the yellow lunchbox."
    },
    needBetween: {
      spoken_reply: "Under the seat… but two things are by that seat. Between what and what?",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "Between is the trap. Say: between the black sports bag and the yellow lunchbox."
    },
    needUnder: {
      spoken_reply: "Between the black bag and the yellow lunchbox — on the seat or under it?",
      mood: "CONFUSED",
      hardware_action: "NONE",
      teacher_tip: "Add the preposition under. The small navy bag is under the seat, not on it."
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
      teacher_tip: "Between A and B names both sides. Beside only names one neighbour."
    },
    navyNeedSize: {
      spoken_reply: "The navy one — is it the small bag under the seat, or are you looking at something bigger?",
      mood: "HOPEFUL",
      hardware_action: "NONE",
      teacher_tip: "Colour is a start. Add size and place: the small navy bag under the seat."
    },
    blueNotNavy: {
      spoken_reply: "Blue? I need the exact colour. Do you mean navy?",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Navy is a dark blue. Say navy, not just blue. The lunchbox is yellow."
    },
    redNone: {
      spoken_reply: "Red? I can't see a red bag. The ones here are black, navy, and grey.",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Name a colour that is actually there: black, navy, or grey."
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
      teacher_tip: "The place is done. Next: small navy, under the seat, between the black sports bag and the yellow lunchbox."
    },
    seatLeft: {
      spoken_reply: "On the left there's a black sports bag. Mine should be nearer the door, under the seat.",
      mood: "CONFUSED",
      hardware_action: "SEAT_LEFT",
      teacher_tip: "On the left is the wrong bag. Send Leo under the seats near the door."
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
      teacher_tip: "Win: celebrate clear speech, not volume."
    },
    fallback: {
      spoken_reply: "Say it clearer for me? I need a colour, a size, and a place.",
      mood: "CONFUSED",
      hardware_action: "HOVER_CONFUSED",
      teacher_tip: "Build one sentence: the small navy bag under the seat, between the black sports bag and the yellow lunchbox."
    }
  }
};

export const SCENARIOS = {
  level_1_lost_bag: lostBag,
  mission_1_lost_bag: lostBag
};
