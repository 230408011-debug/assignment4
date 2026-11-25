/**
 * AnalyticsService.js - FURIO FC Production Telemetry & Analytics System
 * Centralized wrapper for Zygle Gate 0 metrics, D1 retention, session tracking, and gameplay events.
 * Integrates native Firebase Analytics via @capacitor-firebase/analytics transport layer.
 * Zero-crash policy: Analytics failures will NEVER disrupt gameplay.
 */

class AnalyticsService {
    constructor() {
        this.enabled = true;
        this.initialized = false;
        this.anonymousPlayerId = null;
        this.sessionId = null;
        this.sessionStartTime = 0;
        this.appOpenTimestamp = Date.now();
        this.ftueCompleteTimestamp = 0;
        this.firedEvents = new Set();
        this.eventBuffer = [];
        this.nativeFirebaseConnected = false;
        this.lastFirebaseError = null;
        this.firebaseStatus = 'INITIALIZING'; // 'CONNECTED' | 'NOT_CONNECTED' | 'ERROR'
    }

    init() {
        try {
            if (this.initialized) return;

            // Load or generate anonymous player ID
            this.anonymousPlayerId = this.getOrCreateAnonymousPlayerId();

            // Load persistent fired events set for duplicate protection
            this.loadFiredEvents();

            // Check & set D1 Retention first open timestamp
            this.initFirstOpenTimestamp();

            // Detect Native Firebase Analytics Provider
            this.detectNativeProvider();

            // Start new session
            this.startSession();

            // Initialize error tracking
            this.initErrorTracking();

            // Register lifecycle listeners for session end / app pause
            this.initLifecycleListeners();

            this.initialized = true;

            // Fire app_open event
            this.track('app_open', {
                app_version: '1.0.0',
                platform: this.getPlatform(),
                device_os: this.getOS(),
                anonymous_player_id: this.anonymousPlayerId,
                session_id: this.sessionId
            });

            // Check D1 Retention on session start
            this.checkD1Retention();

            if (window.QA_MODE) {
                console.log(`[AnalyticsService] Initialized. Anonymous ID: ${this.anonymousPlayerId} | Native Firebase: ${this.nativeFirebaseConnected}`);
            }
        } catch (e) {
            console.warn('[AnalyticsService] Init exception caught:', e);
        }
    }

    detectNativeProvider() {
        try {
            const plugin = this.getNativePlugin();
            if (plugin) {
                this.nativeFirebaseConnected = true;
                this.firebaseStatus = 'CONNECTED';
                // Set Anonymous User ID on Native SDK if available
                if (typeof plugin.setUserId === 'function') {
                    plugin.setUserId({ userId: this.anonymousPlayerId }).catch(() => {});
                }
            } else {
                this.nativeFirebaseConnected = false;
                this.firebaseStatus = 'NOT_CONNECTED';
            }
        } catch (e) {
            this.nativeFirebaseConnected = false;
            this.firebaseStatus = 'NOT_CONNECTED';
        }
    }

    getNativePlugin() {
        try {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAnalytics) {
                return window.Capacitor.Plugins.FirebaseAnalytics;
            }
            if (window.FirebaseAnalytics) {
                return window.FirebaseAnalytics;
            }
        } catch (e) {}
        return null;
    }

    // --- ANONYMOUS PLAYER ID SYSTEM ---
    getOrCreateAnonymousPlayerId() {
        try {
            let id = localStorage.getItem('furio_anonymous_player_id');
            if (!id) {
                id = 'furio_' + this.generateUUID();
                localStorage.setItem('furio_anonymous_player_id', id);
            }
            return id;
        } catch (e) {
            return 'furio_fallback_' + Math.random().toString(36).substring(2, 11);
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // --- SESSION SYSTEM ---
    startSession() {
        try {
            if (this.sessionId && this.sessionStartTime > 0) return;

            this.sessionId = 'sess_' + this.generateUUID();
            this.sessionStartTime = Date.now();

            this.track('session_start', {
                session_id: this.sessionId,
                anonymous_player_id: this.anonymousPlayerId,
                timestamp: this.sessionStartTime
            });
        } catch (e) {
            console.warn('[AnalyticsService] startSession error:', e);
        }
    }

    endSession() {
        try {
            if (!this.sessionId || this.sessionStartTime === 0) return;

            const durationSec = Math.max(1, Math.round((Date.now() - this.sessionStartTime) / 1000));

            this.track('session_end', {
                session_id: this.sessionId,
                anonymous_player_id: this.anonymousPlayerId,
                session_duration_sec: durationSec
            });

            this.sessionId = null;
            this.sessionStartTime = 0;
        } catch (e) {
            console.warn('[AnalyticsService] endSession error:', e);
        }
    }

    // --- D1 RETENTION SYSTEM ---
    initFirstOpenTimestamp() {
        try {
            let ts = localStorage.getItem('furio_first_open_timestamp');
            if (!ts) {
                ts = Date.now().toString();
                localStorage.setItem('furio_first_open_timestamp', ts);
            }
        } catch (e) {}
    }

    checkD1Retention() {
        try {
            const firstOpen = parseInt(localStorage.getItem('furio_first_open_timestamp') || '0');
            if (firstOpen === 0) return;

            const dayDiff = Math.floor((Date.now() - firstOpen) / (1000 * 60 * 60 * 24));
            if (dayDiff === 1) {
                this.trackOnce('d1_retained', {
                    anonymous_player_id: this.anonymousPlayerId,
                    days_since_install: dayDiff
                }, 'd1_retained_event');
            }
        } catch (e) {}
    }

    // --- SANITIZE & PRIVACY FILTER ---
    sanitizeEventName(name) {
        if (typeof name !== 'string') return 'unknown_event';
        return name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 40);
    }

    sanitizeParams(params = {}) {
        const sanitized = {};
        const piiKeys = new Set(['username', 'player_name', 'email', 'phone', 'real_name', 'password']);

        for (const [key, rawValue] of Object.entries(params)) {
            // PII Privacy Cleanup: Filter out sensitive user identification keys
            const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 40);
            if (piiKeys.has(cleanKey.toLowerCase())) {
                continue; // Skip PII
            }

            if (rawValue === undefined || rawValue === null) continue;

            if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
                sanitized[cleanKey] = rawValue;
            } else if (typeof rawValue === 'string') {
                // Truncate long strings & remove local path info
                sanitized[cleanKey] = rawValue.replace(/file:\/\/\/?[^\s]+/g, '[path]').substring(0, 100);
            } else {
                sanitized[cleanKey] = String(rawValue).substring(0, 100);
            }
        }

        return sanitized;
    }

    // --- EVENT TRACKING API ---
    track(eventName, params = {}) {
        try {
            if (!this.enabled) return;

            const cleanName = this.sanitizeEventName(eventName);
            const enrichedParams = this.sanitizeParams({
                ...params,
                anonymous_player_id: this.anonymousPlayerId || 'unknown',
                session_id: this.sessionId || 'none',
                timestamp: Date.now()
            });

            // Local debug buffer for QA & offline fallback
            const record = {
                event: cleanName,
                params: enrichedParams,
                timestamp: Date.now()
            };
            this.eventBuffer.push(record);
            if (this.eventBuffer.length > 200) this.eventBuffer.shift();

            if (window.QA_MODE) {
                console.log(`📊 [AnalyticsService] ${cleanName}:`, enrichedParams);
            }

            // Route event to Native Firebase Analytics plugin transport
            const plugin = this.getNativePlugin();
            if (plugin && typeof plugin.logEvent === 'function') {
                plugin.logEvent({ name: cleanName, params: enrichedParams })
                    .then(() => {
                        this.nativeFirebaseConnected = true;
                        this.firebaseStatus = 'CONNECTED';
                    })
                    .catch((err) => {
                        this.lastFirebaseError = err ? (err.message || String(err)) : 'Native logEvent error';
                        if (window.QA_MODE) {
                            console.warn(`[AnalyticsService] Firebase native logEvent failed:`, this.lastFirebaseError);
                        }
                    });
            } else if (window.firebase && window.firebase.analytics) {
                try {
                    window.firebase.analytics().logEvent(cleanName, enrichedParams);
                } catch (e) {}
            }
        } catch (e) {
            // Silently suppress all exceptions to enforce 0-crash policy
        }
    }

    trackOnce(eventName, params = {}, key = null) {
        try {
            const eventKey = key || eventName;
            if (this.firedEvents.has(eventKey)) {
                if (window.QA_MODE) console.log(`[AnalyticsService] Suppressed duplicate once-event: ${eventKey}`);
                return false;
            }

            this.firedEvents.add(eventKey);
            this.saveFiredEvents();
            this.track(eventName, params);
            return true;
        } catch (e) {
            return false;
        }
    }

    setUserId(userId) {
        try {
            this.anonymousPlayerId = userId;
            localStorage.setItem('furio_anonymous_player_id', userId);

            const plugin = this.getNativePlugin();
            if (plugin && typeof plugin.setUserId === 'function') {
                plugin.setUserId({ userId }).catch(() => {});
            }
        } catch (e) {}
    }

    setUserProperty(name, value) {
        try {
            const cleanName = this.sanitizeEventName(name);
            const cleanVal = String(value).substring(0, 100);

            const plugin = this.getNativePlugin();
            if (plugin && typeof plugin.setUserProperty === 'function') {
                plugin.setUserProperty({ key: cleanName, value: cleanVal }).catch(() => {});
            }
        } catch (e) {}
    }

    flush() {
        // Local buffer cleanup if needed
    }

    isEnabled() {
        return this.enabled;
    }

    disable() {
        this.enabled = false;
    }

    enable() {
        this.enabled = true;
    }

    // --- DUPLICATE PROTECTION MEMORY ---
    loadFiredEvents() {
        try {
            const raw = localStorage.getItem('furio_fired_events');
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    this.firedEvents = new Set(arr);
                }
            }
        } catch (e) {}
    }

    saveFiredEvents() {
        try {
            localStorage.setItem('furio_fired_events', JSON.stringify(Array.from(this.firedEvents)));
        } catch (e) {}
    }

    // --- ERROR TRACKING ---
    initErrorTracking() {
        try {
            window.onerror = (message, source, lineno, colno, error) => {
                this.track('gameplay_error', {
                    error_message: String(message || 'Unknown error').substring(0, 100),
                    source_file: String(source || 'Unknown').substring(0, 60),
                    line_number: lineno || 0
                });
            };

            window.addEventListener('unhandledrejection', (event) => {
                this.track('gameplay_error', {
                    error_message: String(event.reason || 'Unhandled Promise Rejection').substring(0, 100),
                    source_file: 'Promise',
                    line_number: 0
                });
            });
        } catch (e) {}
    }

    // --- LIFECYCLE LISTENERS ---
    initLifecycleListeners() {
        try {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.endSession();
                } else {
                    this.startSession();
                }
            });

            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
                    if (!isActive) {
                        this.endSession();
                    } else {
                        this.startSession();
                    }
                });
            }
        } catch (e) {}
    }

    // --- UTILITIES ---
    getPlatform() {
        if (window.Capacitor && typeof window.Capacitor.getPlatform === 'function') {
            return window.Capacitor.getPlatform();
        }
        return 'web';
    }

    getOS() {
        const userAgent = navigator.userAgent || '';
        if (/android/i.test(userAgent)) return 'Android';
        if (/iPad|iPhone|iPod/.test(userAgent)) return 'iOS';
        return 'Web/Other';
    }

    // --- GAMEPLAY METRICS HELPERS ---
    getAppOpenTimestamp() {
        return this.appOpenTimestamp;
    }

    getFtueCompleteTimestamp() {
        return this.ftueCompleteTimestamp || parseInt(localStorage.getItem('furio_ftue_complete_timestamp') || '0');
    }

    setFtueCompleteTimestamp() {
        this.ftueCompleteTimestamp = Date.now();
        localStorage.setItem('furio_ftue_complete_timestamp', this.ftueCompleteTimestamp.toString());
    }

    getNextMatchIndex() {
        try {
            let idx = parseInt(localStorage.getItem('furio_telemetry_match_index') || '1');
            return idx;
        } catch (e) {
            return 1;
        }
    }

    incrementMatchIndex() {
        try {
            let idx = this.getNextMatchIndex() + 1;
            localStorage.setItem('furio_telemetry_match_index', idx.toString());
            return idx;
        } catch (e) {
            return 1;
        }
    }

    getTrackedEvents() {
        return this.eventBuffer;
    }

    getFirebaseStatus() {
        return {
            nativeConnected: this.nativeFirebaseConnected,
            status: this.firebaseStatus,
            lastError: this.lastFirebaseError
        };
    }
}

// Global Singleton Instance & Backward Compatible Alias
window.AnalyticsService = new AnalyticsService();
window.AnalyticsManager = window.AnalyticsService; // Alias to prevent legacy breakage
