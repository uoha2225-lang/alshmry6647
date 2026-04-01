/**
 * قاعدة بيانات التقييمات - مبنية على ملفات JSON
 * Review Database - JSON file-based persistent storage
 */
const fs   = require('fs');
const path = require('path');

const DATA_DIR     = path.join(__dirname, 'data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'review-settings.json');

// ضمان وجود مجلد البيانات
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/* ─── helpers ─── */
const readJSON = (filePath, defaultValue) => {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch (_) { /* file corrupt or missing → return default */ }
    return defaultValue;
};

const writeJSON = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

/* ─── default settings per guild ─── */
const DEFAULT_SETTINGS = {
    anonymize:       false,   // إخفاء هوية المستخدمين في التقييمات
    notifyUser:      true,    // إرسال DM للمستخدم عند تسجيل تقييمه
    storeOriginalText: true,  // حفظ النص الأصلي للرسالة
    minConfidence:   0.3,     // الحد الأدنى لدرجة الثقة (0-1)
};

class ReviewDatabase {
    /* ──────────────────────── تقييمات ──────────────────────── */

    /**
     * حفظ تقييم جديد
     * @returns {Object} the saved review record
     */
    saveReview({ guildId, userId, username, displayName, channelId, rating, originalText, confidence, category, messageId = null, avatarURL = null }) {
        const reviews = readJSON(REVIEWS_FILE, []);
        const record = {
            id:           `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            guildId,
            userId,
            username,
            displayName:  displayName || username,
            channelId,
            rating,
            originalText: originalText ?? null,
            confidence:   Math.round((confidence ?? 0) * 100) / 100,
            category,
            timestamp:    new Date().toISOString(),
            messageId,
            avatarURL,
        };
        reviews.push(record);
        writeJSON(REVIEWS_FILE, reviews);
        return record;
    }

    /** تحديث messageId لتقييم موجود بعد إرسال الـ Embed */
    updateReviewMessage(reviewId, messageId) {
        const reviews = readJSON(REVIEWS_FILE, []);
        const idx = reviews.findIndex(r => r.id === reviewId);
        if (idx !== -1) {
            reviews[idx].messageId = messageId;
            writeJSON(REVIEWS_FILE, reviews);
        }
    }

    /** البحث عن تقييم بواسطة messageId (لإعادة الإنشاء عند الحذف) */
    getReviewByMessageId(messageId) {
        return readJSON(REVIEWS_FILE, []).find(r => r.messageId === messageId) || null;
    }

    /** استرجاع جميع تقييمات سيرفر معين */
    getGuildReviews(guildId) {
        return readJSON(REVIEWS_FILE, []).filter(r => r.guildId === guildId);
    }

    /**
     * إحصائيات السيرفر
     * @returns {null|Object}
     */
    getGuildStats(guildId) {
        const reviews = this.getGuildReviews(guildId);
        if (!reviews.length) return null;

        const total    = reviews.length;
        const average  = reviews.reduce((s, r) => s + r.rating, 0) / total;

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const categories   = { positive: 0, neutral: 0, negative: 0 };

        reviews.forEach(r => {
            distribution[r.rating] = (distribution[r.rating] || 0) + 1;
            const cat = r.category || 'neutral';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        // أحدث 5 تقييمات
        const recent = reviews.slice(-5).reverse();

        return { total, average, distribution, categories, recent };
    }

    /** مسح جميع تقييمات سيرفر معين - يُعيد عدد السجلات المحذوفة */
    clearGuildReviews(guildId) {
        const reviews = readJSON(REVIEWS_FILE, []);
        const kept    = reviews.filter(r => r.guildId !== guildId);
        writeJSON(REVIEWS_FILE, kept);
        return reviews.length - kept.length;
    }

    /* ──────────────────────── إعدادات ──────────────────────── */

    /** قراءة إعدادات سيرفر مع القيم الافتراضية */
    getSettings(guildId) {
        const all = readJSON(SETTINGS_FILE, {});
        return { ...DEFAULT_SETTINGS, ...(all[guildId] || {}) };
    }

    /** تحديث إعدادات سيرفر */
    saveSettings(guildId, updates) {
        const all = readJSON(SETTINGS_FILE, {});
        all[guildId] = { ...this.getSettings(guildId), ...updates };
        writeJSON(SETTINGS_FILE, all);
        return all[guildId];
    }
}

module.exports = new ReviewDatabase();
