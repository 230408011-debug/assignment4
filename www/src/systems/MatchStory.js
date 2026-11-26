class MatchStory {
    constructor(duration) {
        this.duration = duration;
        this.offered = false;
        this.tactic = null;
        this.events = new Map();
        this.laneStreak = { lane: 0, count: 0 };
        this.attackLane = 0;
        this.lastEntry = -Infinity;
    }

    offer(time, difference) {
        const remaining = this.duration - time;
        if (this.offered || remaining <= 0 || remaining > 20000 || Math.abs(difference) > 1) return null;
        this.offered = true;
        return difference < 0 ? 'push' : difference > 0 ? 'protect' : 'chase';
    }

    record(type, time, detail = {}) {
        this.events.set(type, { type, time, seconds: Math.ceil(Math.max(0, this.duration - time) / 1000), ...detail });
    }

    observeAttack(time, inPossession, x, y) {
        const lane = inPossession && x >= 1000 ? (y < 420 ? -1 : y > 780 ? 1 : 0) : 0;
        if (time - this.lastEntry > 15000) this.laneStreak = { lane: 0, count: 0 };
        if (!lane) {
            this.attackLane = 0;
            return;
        }
        if (lane === this.attackLane || time - this.lastEntry < 2200) return;
        this.attackLane = lane;
        const previous = this.laneStreak;
        const consecutive = previous.lane === lane && time - this.lastEntry <= 15000;
        this.laneStreak = { lane, count: consecutive ? previous.count + 1 : 1 };
        this.lastEntry = time;
    }

    get coveredLane() {
        return this.laneStreak.count >= 3 ? this.laneStreak.lane : 0;
    }

    finish(left, right) {
        const goal = this.events.get('goal');
        const lateGoal = goal?.seconds <= 20 && goal.side === 'left' && goal.left === left && goal.right === right;
        let headline = null;
        if (lateGoal && left === right && goal.equalizer) headline = 'equalizer';
        if (lateGoal && left > right && goal.winner) headline = 'winner';
        if (!headline && left > right && this.tactic === 'protect' &&
            this.protectedScore === right) headline = 'protected';

        const priority = ['goal', 'tactic', 'objective', 'steal', 'pass'];
        const moments = priority.map(type => this.events.get(type)).filter(Boolean)
            .slice(0, 3).sort((a, b) => a.time - b.time);
        return { headline, seconds: goal?.seconds, moments, left, right };
    }

    static label(key, turkish) {
        const labels = {
            push: ['Öne çık', 'Push forward'],
            protect: ['Skoru koru', 'Protect the lead'],
            chase: ['Galibiyeti zorla', 'Go for the win'],
            objective: ['Maç görevi tamamlandı', 'Match objective complete'],
            steal: ['Top çalma', 'Ball recovery'],
            pass: ['İsabetli pas', 'Completed pass']
        };
        return labels[key]?.[turkish ? 0 : 1] ?? '';
    }

    static headline(story, turkish) {
        const { headline, seconds, left, right } = story;
        if (headline === 'equalizer') return turkish ? `${seconds} sn kala beraberlik` : `Equalizer with ${seconds}s left`;
        if (headline === 'winner') return turkish ? `${seconds} sn kala galibiyet golü` : `Winner with ${seconds}s left`;
        if (headline === 'protected') return turkish ? 'Furio skoru korudu' : 'Furio held the lead';
        return turkish ? `Son maç · ${left}–${right}` : `Last match · ${left}–${right}`;
    }

    static describe(event, turkish) {
        const label = event.type === 'goal'
            ? (turkish ? (event.side === 'left' ? 'Furio golü' : 'Rakip golü') : (event.side === 'left' ? 'Furio goal' : 'Opponent goal'))
            : this.label(event.type === 'tactic' ? event.tactic : event.type, turkish);
        return `${event.seconds} ${turkish ? 'sn kala' : 's left'} · ${label}`;
    }
}
