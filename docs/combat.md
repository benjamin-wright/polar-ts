# polar-ts — Combat Design: The Persuasion System

Combat in polar-ts is a **debate, not a brawl**. It deliberately apes
traditional turn-based RPG battle mechanics, but every physical concept is
reskinned as a social one: instead of defeating monsters, the party **defuses
angry penguins** — persuading them to leave the party alone, or even to help
out. This document describes the system; see [story.md](./story.md) for the
premise behind it.

## 1. Core Stats

| Traditional RPG | polar-ts        | Meaning                                                                                 |
| --------------- | --------------- | --------------------------------------------------------------------------------------- |
| Party HP        | **Self-esteem** | How much confidence a party member has left. Hits 0 → they're too discouraged to go on. |
| Enemy HP        | **Anger**       | How wound-up a penguin is. Reduce it to 0 → they're defused: they'll back off or help.  |
| MP / mana       | **Composure**   | Spent on fancier debate techniques.                                                     |
| Attack power    | **Eloquence**   | How persuasive a character is.                                                          |
| Defense         | **Thick skin**  | How well a character shrugs off insults.                                                |

A battle is **won** when every opposing penguin's anger reaches 0 (they storm
off sheepishly, agree to help, or defect to the party). A battle is **lost**
when every party member's self-esteem reaches 0 (the party slinks home for a
pep talk and a snack).

## 2. Party Actions

| Traditional RPG | polar-ts         | Effect                                                                           |
| --------------- | ---------------- | -------------------------------------------------------------------------------- |
| Attack          | **Persuade**     | Reason with one opponent, reducing their anger.                                  |
| Heal            | **Reassure**     | Restore a party member's self-esteem with a few kind words.                      |
| Magic / skills  | **Tactics**      | Special debate moves that cost composure (see §4).                               |
| Defend          | **Brush it off** | Take a breather; insults glance off until next turn, recover a little composure. |
| Item            | **Memento**      | Use a comforting keepsake or a well-timed snack (consumables).                   |
| Flee            | **Walk away**    | Politely extract the party from an argument that's going badly.                  |

## 3. Penguin (Enemy) Actions

| Traditional RPG | polar-ts        | Effect                                                                         |
| --------------- | --------------- | ------------------------------------------------------------------------------ |
| Attack          | **Insult**      | A cutting remark that damages one party member's self-esteem.                  |
| Heal            | **Incite**      | Whip a fellow penguin back into a fury, restoring its anger.                   |
| Group buff      | **Group think** | The gang echoes each other's outrage, raising the whole flock's stats.         |
| Debuff          | **Belittle**    | Undermine a party member, lowering their eloquence or thick skin.              |
| Special         | **Tantrum**     | A big multi-target outburst that splashes self-esteem damage across the party. |

## 4. Debate Tactics (Status Effects)

Status ailments are replaced with debate tactics that alter how a participant
can argue:

| Traditional RPG | polar-ts        | Effect                                                                  |
| --------------- | --------------- | ----------------------------------------------------------------------- |
| Blind           | **Misdirect**   | The target argues at cross-purposes; its actions often miss their mark. |
| Sleep           | **Distract**    | The target is sidetracked by something shiny and skips its turns.       |
| Silence         | **Tongue-tied** | The target can't use tactics or special moves, only basic actions.      |
| Poison          | **Riled up**    | Anger (or self-esteem) keeps climbing/falling each turn — a slow burn.  |
| Haste           | **On a roll**   | The arguer builds momentum and acts more often.                         |

Tactics are learned as the party grows: recruited friends each bring signature
moves (a deadpan walrus who excels at **Misdirect**, an excitable puffin whose
**Distract** is second to none).

## 5. Mindsets (Elemental Affinities)

Instead of elemental weaknesses, every participant — friend or penguin — has a
**mindset**: the primary source of their anger or insecurity. Identifying it and
choosing persuasion tactics that counter it is far more effective than generic
arguing.

| Mindset        | Root of the anger                            | Effective approach                                         | Ineffective approach                                |
| -------------- | -------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| **Insecure**   | Feels small; acting out to look tough.       | **Reassuring** persuasion — build them up, include them.   | Mockery or showboating just feeds it.               |
| **Prejudiced** | Distrusts anyone who isn't a penguin.        | **Appeal to shared ground** — point out common goals.      | Direct confrontation hardens their stance.          |
| **Lonely**     | Went along with the gang to belong.          | **Offer friendship** — show them life outside the gang.    | Group-pressure tactics remind them why they joined. |
| **Proud**      | Can't back down while the gang is watching.  | **Give them an out** — let them retreat while saving face. | Public humiliation makes them dig in.               |
| **Greedy**     | In it for the loot (and the teddy is shiny). | **Bargain** — trade favors or snacks.                      | Earnest appeals bounce right off.                   |

Mechanically, mindset works like an affinity chart: each persuasion move is
tagged with an approach, and each mindset multiplies incoming approaches by
weak/neutral/resist factors. A penguin's mindset is hidden at first — the party
**discovers** it through observation moves, dialogue clues before the fight, or
trial and error, adding a light deduction layer to every encounter.

## 6. Encounter Flow

1. **Confrontation** — the party crosses paths with penguin gang members; a
   short dialogue sets the scene and may hint at mindsets.
2. **Turn order** — participants act in order of quickness (of wit), as in a
   classic ATB/turn-queue system.
3. **Pick arguments** — each party member chooses persuade / reassure / tactic /
   memento / walk away.
4. **Resolution** — anger and self-esteem shift; status tactics tick; group
   think and incite may swing momentum back.
5. **Outcome** —
   - **Defused**: the penguins calm down. Depending on the penguin, they may
     leave, hand over a clue, give the party an item, or even join as a friend.
   - **Discouraged**: the party retreats to the last safe spot with a small
     self-esteem penalty — never a harsh game-over, in keeping with the tone.

## 7. Design Intent

- **Tone first**: every mechanic should read as warm and a little silly. Losing
  is "needing a hug and a sandwich", not death.
- **Familiar skeleton**: underneath the reskin sits a conventional turn-based
  RPG battle system, so encounter design, balancing, and AI can lean on
  well-understood genre practice.
- **Data-driven**: moves, mindsets, affinity multipliers, and penguin
  personalities should all live as JSON under `assets/data/`, per the project's
  data-driven content rule (see [architecture.md](./architecture.md)).
- **Deduction layer**: mindset discovery gives combat its own texture —
  paying attention in dialogue genuinely helps win arguments.
