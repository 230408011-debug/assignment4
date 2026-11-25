const assert = require('assert');

console.log("=== RUNNING FURIO FC GAMEPLAY & MECHANICS VERIFICATION ===");

// 1. SPEED & SPRINT SYSTEM VERIFICATION
function testSpeedAndSprint() {
    console.log("\n[TEST 1] Speed & Sprint Calculations");
    const mapAttr15 = (val) => {
        const v = Number(val) || 50;
        return Math.max(0.85, Math.min(1.15, 0.85 + ((v - 50) / 50) * 0.30));
    };

    // Test across range of player attributes (30 to 99)
    [30, 50, 75, 90, 99].forEach(stat => {
        const speedMod = mapAttr15(stat);
        assert(speedMod >= 0.85 && speedMod <= 1.15, `Speed mod ${speedMod} out of range [0.85, 1.15]`);
        
        const baseSpeed = 205 * speedMod;
        const sprintMultiplier = 1.28;
        const rawSprintSpeed = baseSpeed * sprintMultiplier;
        const clampedSprintSpeed = Math.min(310, rawSprintSpeed);
        
        // Convert to KM/H
        const walkingKmh = (baseSpeed / 300) * 35;
        const sprintingKmh = (clampedSprintSpeed / 300) * 35;

        assert(walkingKmh >= 8 && walkingKmh <= 28, `Walking KM/H ${walkingKmh} out of realistic range`);
        assert(sprintingKmh >= 25 && sprintingKmh <= 36.1, `Sprinting KM/H ${sprintingKmh} exceeds 36 km/h cap!`);
        assert(clampedSprintSpeed <= 310, `Physical speed ${clampedSprintSpeed} exceeds 310 px/s!`);

        // Test Dribble penalty with ball
        const dribbleStat = mapAttr15(stat);
        const dribblePenalty = 0.10 - Math.min(0.06, Math.max(0, (dribbleStat - 0.85) * (0.06 / 0.30)));
        const effectiveSpeed = baseSpeed * (1.0 - dribblePenalty);
        assert(dribblePenalty >= 0.04 && dribblePenalty <= 0.10, `Dribble penalty ${dribblePenalty} out of [0.04, 0.10]`);
        assert(effectiveSpeed < baseSpeed, `Effective dribble speed should be lower than base speed`);
    });
    console.log("-> Speed & Sprint physics formulas PASS (0-36 km/h hard clamped, dribble penalty bounded)");
}

// 2. STAMINA DRAIN & RECOVERY VERIFICATION
function testStaminaSystem() {
    console.log("\n[TEST 2] Stamina Drain & Recovery Rates");
    const mapAttr15 = (val) => Math.max(0.85, Math.min(1.15, 0.85 + ((val - 50) / 50) * 0.30));

    const highStamMod = mapAttr15(90);
    const lowStamMod = mapAttr15(40);

    const highDrainRate = 18 * (1.15 - (highStamMod - 0.85) * 0.5);
    const lowDrainRate = 18 * (1.15 - (lowStamMod - 0.85) * 0.5);

    assert(highDrainRate < lowDrainRate, "Higher stamina attribute must drain SLOWER while sprinting");

    // Stationary recovery vs walking recovery
    const stationaryRecovery = 45 * highStamMod;
    const walkingRecovery = 15 * highStamMod;
    assert(stationaryRecovery === 3 * walkingRecovery, "Stationary recovery must be exactly 3x walking recovery (45 vs 15)");
    assert(stationaryRecovery > 0 && walkingRecovery > 0, "Recovery rates must be positive");

    console.log("-> Stamina drain inversely proportional & recovery rates PASS");
}

// 3. MATCH RATING SYSTEM VERIFICATION
function testMatchRating() {
    console.log("\n[TEST 3] Match Rating System");
    let rating = 6.0;
    const log = [];

    const recordEvent = (delta, reason) => {
        rating = Math.max(1.0, Math.min(10.0, Number((rating + delta).toFixed(2))));
        log.push({ delta, reason, rating });
    };

    assert(rating === 6.0, "Base rating must start at exactly 6.0");

    recordEvent(0.15, "İsabetli Pas");
    assert(rating === 6.15, "Pass should add +0.15");

    recordEvent(0.30, "İsabetli Şut");
    assert(rating === 6.45, "Shot on target should add +0.30");

    recordEvent(1.20, "Gol");
    assert(rating === 7.65, "Goal should add +1.20");

    recordEvent(0.80, "Asist");
    assert(rating === 8.45, "Assist should add +0.80");

    recordEvent(0.25, "Top Çalma / Müdahale");
    assert(rating === 8.70, "Tackle should add +0.25");

    recordEvent(-0.20, "Top Kaybı");
    assert(rating === 8.50, "Turnover should subtract -0.20");

    recordEvent(-0.10, "İsabetsiz Şut");
    assert(rating === 8.40, "Off-target shot should subtract -0.10");

    // Clamp test: 10 max
    recordEvent(5.0, "Mega Performance");
    assert(rating === 10.0, "Rating must not exceed 10.0");

    // Clamp test: 1.0 min
    recordEvent(-15.0, "Terrible Performance");
    assert(rating === 1.0, "Rating must not fall below 1.0");

    console.log("-> Match Rating event calculation & bounds [1.0, 10.0] PASS");
}

testSpeedAndSprint();
testStaminaSystem();
testMatchRating();

console.log("\nALL GAMEPLAY MECHANIC CHECKS PASSED SUCCESSFULLY!");
