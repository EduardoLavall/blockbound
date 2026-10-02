# Blockfall — Balance Analysis Baseline

Date: 2026-10-02  
Scope: Phase 12 — first critical analysis after Player Status + Inventory/Equipment.

This document deliberately separates **measured facts**, **design hypotheses**, and **questions that require human playtesting**.

No tuning values are changed by this analysis.

---

## 1. Method

The baseline is generated from the same registries/configuration used by the game:

- `BASE_PLAYER_STATS`;
- `ENEMIES`;
- `STRUCTURES`;
- `NIGHT_DEFINITIONS`;
- `UPGRADES`;
- `ITEMS`.

The pure TypeScript harness is:

```text
src/balance/BalanceHarness.ts
```

It calculates:

- Blade/Repeater DPS;
- expected crit contribution;
- TTK by enemy;
- enemy structure/core pressure;
- Wall breach time;
- Turret/Spike theoretical DPS;
- theoretical health pressure of Nights 1–5;
- selected direct upgrade power.

Real runs can now export JSON telemetry at the run-end screen.

Telemetry includes:

- seed;
- checkpoints;
- run result;
- elapsed simulation time;
- player HP;
- Core HP;
- kills;
- resources;
- upgrades;
- equipped Weapon/Armor/Charm;
- full Player Status snapshot.

---

# 2. Baseline combat facts

## Player weapons

Base crit:

```text
Crit chance      5%
Crit multiplier  1.75x
Expected damage multiplier = 1.0375x
```

| Weapon | Damage | Cooldown | DPS pre-crit | Expected DPS |
| --- | ---: | ---: | ---: | ---: |
| Blade | 34 | 0.48s | 70.83 | 73.49 |
| Repeater | 24 | 0.34s | 70.59 | 73.24 |

### Finding B-01 — Blade and Repeater have effectively identical base DPS

**Severity:** High  
**Evidence:** Blade expected DPS is only ~0.35% above Repeater.

This is not automatically wrong, but Blade requires melee exposure while Repeater delivers practically the same theoretical damage at range.

**Hypothesis:** melee risk is insufficiently rewarded unless its real-world hit reliability, status access or positioning produces a compensating advantage.

**Do not change yet.** Validate with telemetry/playtest:

- actual Blade hit rate;
- actual Repeater hit rate;
- player damage taken by weapon mode;
- share of kills by source;
- frequency of switching to Blade.

Potential responses if confirmed:

- higher Blade damage/burst;
- melee stagger;
- cleave;
- armor break;
- resource/defense interaction;
- preserve equal DPS but give Blade a unique combat utility.

---

# 3. Enemy pressure

Base enemy attack DPS:

| Enemy | HP | Attack DPS | Wall breach | Core kill |
| --- | ---: | ---: | ---: | ---: |
| Grunt | 72 | 16.67 | 9.60s | 30.00s |
| Runner | 42 | 16.67 | 21.33s | 37.50s |
| Brute | 185 | 23.48 | 2.84s | 15.78s |
| Archer | 58 | 6.90 | 38.67s | 90.63s |
| Support | 92 | 6.36 | 33.52s | 112.24s |
| Burrower | 88 | 17.78 | bypass | 23.44s |
| Siege Warden | 1450 | 32.38 | 1.54s | 8.58s |

These values ignore:

- movement/travel;
- targeting delays;
- Support aura;
- player/defense damage;
- Boss pulse;
- walls in sequence;
- pathing behavior.

Therefore they are **pressure bounds**, not predicted match outcomes.

### Finding B-02 — Brute creates an extremely sharp Wall breakpoint

**Severity:** Medium/High  
A base Wall has 160 HP. One uninterrupted Brute needs only ~2.84 seconds to destroy it.

**Hypothesis:** this may be good if Brute is a visible priority target, but bad if wall investment feels erased before the player can react.

Playtest question:

> When a Brute reaches a Wall, does the player perceive a meaningful defense window or only see the wall disappear?

### Finding B-03 — Siege Warden can erase base structures extremely quickly

**Severity:** High  
Theoretical base Wall breach: ~1.54s.  
Theoretical Core kill from direct attacks alone: ~8.58s.

Boss pulse makes the real pressure higher.

**Hypothesis:** Boss identity is correctly anti-fortification, but current numbers may collapse the spatial defense layer too quickly once contact occurs.

Required telemetry/playtest:

- time from first Boss contact to Core damage;
- number of structures lost to Boss;
- Core HP at Boss death;
- whether killzones meaningfully delay the Boss.

---

# 4. Defense baseline

```text
Basic Turret
21 damage / 0.72s = 29.17 theoretical DPS
range = 12

Spike
24 damage / 0.62s = 38.71 theoretical DPS
when a target remains on the hazard
```

Player base expected DPS is ~73/s, around 2.5× one Basic Turret.

This is not directly a balance defect because:

- Turrets operate without player attention;
- multiple Turrets stack;
- Turrets have range uptime;
- Spike effectiveness depends on path design;
- defense upgrades scale separately.

### Finding B-04 — Spike has better raw DPS but much stronger positional requirements

**Severity:** Observation  
Spike theoretical DPS is ~33% above Turret, while costing fewer rare resources.

This may be correct Tower Defense design if actual Spike uptime is substantially lower.

Telemetry needed:

- damage by Turret;
- damage by Spike;
- active seconds per structure;
- damage/resource invested.

---

# 5. Wave pressure

Approximate total enemy HP using authored roster weights and current night health scaling:

| Night | Enemies | Approx HP pool | Player-only clear time at base Repeater DPS |
| --- | ---: | ---: | ---: |
| 1 | 11 | ~700 | ~9.6s |
| 2 | 15 | ~1,411 | ~19.3s |
| 3 | 19 | ~1,904 | ~26.0s |
| 4 | 24 | ~2,661 | ~36.3s |
| 5 | 28 incl. Boss | ~4,771 | ~65.2s |

This is **not expected wave duration**. It excludes spawn pacing, misses, travel, simultaneous targets, defenses and enemy attacks.

### Finding B-05 — Night 5 is a major step rather than a linear continuation

Night 4 → Night 5 theoretical HP pressure increases ~79%.

That is appropriate for a final siege if the preceding four nights prepare the player sufficiently.

Playtest should verify whether this feels like:

- climax;
- or sudden stat wall.

---

# 6. Economy and mining

Every currently minable resource block drops:

```text
base amount = 1
```

## Finding B-06 — Miner Sigil appears dramatically overtuned for common rarity

Miner Sigil:

```text
+18% mining speed
+1 resource yield
rarity: common
```

Because base drops are 1, +1 yield doubles material per block.

Approximate resource throughput:

```text
2.0 yield × 1.18 mining speed = 2.36x baseline
```

That is roughly **+136% resources per mining time**.

**Severity:** Critical candidate

For comparison, many common direct combat upgrades provide around +22–25% scalar combat output.

This does not prove Miner Sigil wins every run because travel time/resource scarcity matters, but its numerical leverage is far outside the common-item neighborhood.

Likely options after playtest:

- change +1 yield to probabilistic bonus yield;
- restrict yield bonus by resource;
- remove speed component;
- move item rarity;
- introduce diminishing/conditional extraction bonuses.

## Finding B-07 — Rich Veins also doubles every base block drop

Rich Veins is Epic, so +1 global yield is easier to justify, but it is still a full +100% material-per-block increase.

This should be evaluated together with:

- structure prices;
- resource distribution;
- time available during Day;
- Crystal scarcity.

---

# 7. Upgrade power audit

Direct scalar examples:

| Upgrade | Rarity | Approx direct scalar |
| --- | --- | ---: |
| Sharpened Edge | Common | +25% melee damage |
| Fast Hands | Common | +21.95% melee DPS |
| Heavy Slash | Rare | +33.93% melee DPS |
| High Tension | Common | +25% ranged damage |
| Repeater Springs | Common | +21.95% ranged DPS |
| Calibrated Turrets | Common | +25% turret DPS |
| Overclocked Turrets | Rare | +25% turret DPS |
| Serrated Spikes | Common | +35% spike damage |
| Rapid Traps | Rare | +33.33% spike DPS |

Not every card should have equal scalar value: utility/synergy cards intentionally work differently.

### Finding B-08 — Crit cards are weak standalone and strongly synergy-dependent

At base 5% crit:

- Keen Eye (+10 percentage points) increases expected damage by only ~7.2%;
- Execution Protocol (+0.5 crit multiplier) increases expected damage by only ~2.4% if taken alone at base crit.

Compared with +22–25% common direct damage cards, this can make crit cards feel like dead early picks.

**Hypothesis:** crit is intended as a package/build archetype, but the draft currently has no guarantee that complementary pieces appear.

Possible responses:

- stronger baseline crit;
- improve standalone crit cards;
- synergy-aware draft weighting;
- additional crit-trigger interactions.

Do not change before testing draft/build completion rates.

---

# 8. Equipment audit

Notable first-pass values:

- Serrated Grip common: +18% Blade damage.
- Tension Module common: +18% Repeater damage +15% projectile speed.
- Scrap Plating common: +12% damage reduction, -4% sprint.
- Miner Sigil common: effective mining throughput can reach ~2.36x baseline.
- Duelist Guard rare: ~13.6% melee cadence improvement + range.
- Rail Coupler rare: ~11.1% ranged cadence improvement + pierce.

### Finding B-09 — equipment power budget is not yet normalized by slot/rarity

**Severity:** Expected early-system issue.

There is no formal item budget yet. That is acceptable for the first itemization pass, but Phase 12 should establish one before item count expands.

Recommended comparison axes:

```text
common weapon ~15–20% direct output
rare weapon   ~20–30% + utility
armor         EHP vs mobility trade
charm         lower direct scalar, stronger build/economy identity
```

Miner Sigil is the clearest outlier under this draft framework.

---

# 9. What cannot be concluded from static math

These require real playtests:

- whether 45s Day is too short;
- whether 55s Night feels long/short;
- whether mining travel dominates mining duration;
- actual hit accuracy;
- actual Turret/Spike uptime;
- whether Burrower bypass is readable;
- whether Support creates interesting target priority;
- whether Archer feels fair;
- whether Brute breach is reactable;
- whether Boss pulse is readable;
- whether inventory interruption feels good;
- whether five nights produce a satisfying arc;
- which cards players actually choose;
- whether equipment drops arrive too often/rarely;
- fun.

---

# 10. Playtest protocol

Run at least 10 complete or failed runs across multiple seeds.

Export telemetry after each run.

For each run note manually:

- perceived difficulty 1–5 per night;
- most frustrating death/base failure;
- dominant strategy;
- useless mechanic;
- strongest card;
- weakest card offered;
- equipment actually used;
- whether Blade was chosen voluntarily;
- whether player understood why structures failed.

Compare telemetry:

```text
seed
result
time
night reached
player kills
player HP checkpoints
Core HP checkpoints
resources
upgrades
equipment
final Player Status
```

Recommended test archetypes:

1. Blade-first;
2. Repeater-first;
3. Turret-heavy;
4. Spike/chokepoint;
5. economy-heavy;
6. minimal-build / player carry.

---

# 11. First priority queue

Before new Turret archetypes, investigate in this order:

1. **Miner Sigil / +1 yield economy leverage** — critical candidate.
2. **Blade vs Repeater risk/reward** — high.
3. **Boss contact pressure against Wall/Core** — high.
4. **Brute breach reaction window** — medium/high.
5. **Crit card standalone value / draft synergy** — medium.
6. **Turret vs Spike damage per invested resource** — needs real uptime data.
7. **Night 5 difficulty jump** — needs run telemetry.

---

# 12. Current conclusion

The vertical slice has enough interconnected systems to begin real balance work.

The most important current observation is not a specific number to nerf or buff. It is that the project now has a repeatable feedback loop:

```text
code/config baseline
  -> BalanceHarness
  -> play run
  -> export telemetry
  -> compare build/results
  -> form hypothesis
  -> change one rule/value
  -> replay
```

That loop should remain in place for every future Turret, item, talent, shop and Core progression system.


---

# 13. Rapid Turret baseline added

Phase 13 introduces the first specialized turret.

| Tower / matchup | DPS | Range |
| --- | ---: | ---: |
| Basic Turret | 29.17 | 12 |
| Rapid raw | 36.36 | 9.5 |
| Rapid vs Runner | 41.82 | 9.5 |
| Rapid vs Grunt | 39.27 | 9.5 |
| Rapid vs Brute | 20.00 | 9.5 |
| Rapid vs Boss | 16.36 | 9.5 |

The Rapid Turret intentionally trades range and heavy-target efficiency for light-horde throughput.

## New playtest question

Compare **damage per resource invested** between Basic and Rapid Turret in real runs:

- damage dealt by tower type;
- Runner/Grunt kills;
- Brute/Boss damage share;
- uptime/range losses;
- structures lost while using each mix.

Do not increase Rapid raw DPS further unless telemetry shows that its shorter range and target specialization fail to compensate.
