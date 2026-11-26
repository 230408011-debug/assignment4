const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadSource(file, expression, globals) {
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
    return vm.runInNewContext(`${source}\n${expression}`, globals);
}

const entries = new Map();
const localStorage = {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key)
};
const window = {};
const save = loadSource('systems/SaveManager.js', 'SaveManager', { window, localStorage, console });

function newState() {
    return {
        player: { name: '', level: 1, xp: 0, attributes: { speed: 50 } },
        career: { ez: 100, rating: 100 }
    };
}

window.gameState = newState();
window.gameState.player.name = 'Deniz';
assert.equal(save.save(), true);
const validSave = localStorage.getItem(save.SAVE_KEY);
localStorage.setItem(save.SAVE_KEY + '_backup', validSave);
localStorage.setItem(save.SAVE_KEY, '{"saveVersion":9,"career":null}');
window.gameState = newState();
assert.equal(save.load(), true);
assert.equal(window.gameState.player.name, 'Deniz');
assert.equal(save.save(), true);
assert.equal(localStorage.getItem(save.SAVE_KEY + '_backup'), validSave);

localStorage.removeItem(save.SAVE_KEY + '_backup');
localStorage.setItem(save.SAVE_KEY, '{"saveVersion":5,"profile":{"name":"Legacy","attributes":{"pace":65}}}');
window.gameState = newState();
assert.equal(save.load(), true);
assert.equal(window.gameState.player.name, 'Legacy');
assert.equal(window.gameState.player.attributes.speed, 65);

const economy = loadSource('data/EconomyConfig.js', 'EconomyConfig', { window });
const fixture = { id: 'round-1', home: 'HOME', away: 'AWAY', week: 1 };
const objective = economy.getMatchObjective(fixture, 1, 'tr');
assert.equal(objective.stat, 'accuratePasses');
assert.equal(economy.getMatchObjective({ week: 2 }, 1, 'tr').stat, 'tackles');
assert.equal(economy.getMatchObjective(fixture, 1, 'en').label, 'Completed passes');

window.gameState = newState();
const { career, player } = window.gameState;
career.contract = { matchBonus: 30, goalBonus: 15 };
career.fixtures = [fixture];
window.gameState.activeMatch = {
    userSide: 'away', homeTeamId: 'HOME', awayTeamId: 'AWAY', fixtureId: fixture.id, objective
};
let saves = 0;
let results = 0;
window.SaveManager = { save: () => { saves++; } };
window.CareerManager = {
    processMatchResult(match, homeGoals, awayGoals, stats, isHome) {
        assert.equal(match, fixture);
        assert.equal(homeGoals, 0);
        assert.equal(awayGoals, 2);
        assert.equal(stats.accuratePasses, 2);
        assert.equal(isHome, false);
        match.completed = true;
        results++;
    }
};

const sceneClass = loadSource('scenes/PostMatchScene.js', 'PostMatchScene', {
    window, Phaser: { Scene: class {} }
});
const scene = new sceneClass();
scene.init({ scoreLeft: 2, scoreRight: 0, userStats: { goals: 1, accuratePasses: 2 } });
scene.evaluateObjectives();
assert.equal(scene.isWin, true);
assert.equal(scene.objectiveResult.completed, true);
assert.equal(career.ez, 100 + 30 + 15 + 15 + objective.ez);
assert.equal(player.xp, 60 + 20 + 25 + objective.xp);
scene.evaluateObjectives();
assert.equal(results, 1);
assert.equal(saves, 1);
assert.equal(career.ez, 100 + 30 + 15 + 15 + objective.ez);

console.log('Android career regressions passed: backup, migration, away result and objective reward.');

const MatchStory = loadSource('systems/MatchStory.js', 'MatchStory', {});
const story = new MatchStory(90000);
assert.equal(story.offer(69999, -1), null);
assert.equal(story.offer(70000, -1), 'push');
assert.equal(story.offer(71000, 0), null);
assert.equal(story.tactic, null);
assert.equal(new MatchStory(90000).offer(70000, 1), 'protect');
assert.equal(new MatchStory(90000).offer(70000, 0), 'chase');

for (const time of [1000, 4000, 7000]) {
    story.observeAttack(time, true, 1200, 300);
    story.observeAttack(time + 500, false, 1200, 300);
}
assert.equal(story.coveredLane, -1);
story.observeAttack(10000, true, 1200, 950);
assert.equal(story.coveredLane, 0);

story.record('pass', 4000);
story.record('tactic', 71000, { tactic: 'push' });
story.record('objective', 80000);
story.record('goal', 89999, { side: 'left', left: 1, right: 1, equalizer: true });
const replay = story.finish(1, 1);
assert.equal(replay.headline, 'equalizer');
assert.equal(replay.seconds, 1);
assert.equal(Array.from(replay.moments, event => event.type).join(','), 'tactic,objective,goal');
assert.equal(story.finish(1, 2).headline, null);

window.SaveManager = save;
window.gameState.career.lastMatchStory = replay;
assert.equal(save.save(), true);
window.gameState = newState();
assert.equal(save.load(), true);
assert.equal(window.gameState.career.lastMatchStory.headline, 'equalizer');
console.log('Match story regressions passed: tactics, wing coverage, late goal and save reload.');
