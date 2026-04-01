/**
 * محرك التحليل اللغوي للتقييمات
 * Linguistic Analysis Engine for Arabic / English review messages
 *
 * يُحلّل نص الرسالة ويُعيد:
 *  - rating      : رقم من 1 إلى 5 (أو null إذا لم يُكتشف)
 *  - confidence  : درجة الثقة من 0 إلى 1
 *  - category    : 'positive' | 'neutral' | 'negative' | 'unknown'
 *  - keywords    : الكلمات/الرموز التي أدّت إلى الاستنتاج
 *  - method      : 'direct_number' | 'emoji_stars' | 'keyword_analysis' | 'none'
 */

/* ═══════════════════════════════════════════════════════
   1.  قاموس الكلمات المفتاحية لكل تقييم
   ═══════════════════════════════════════════════════════ */
const RATING_KEYWORDS = {
    5: {
        words: [
            // عربي
            'ممتاز', 'رائع', 'كفو', 'بطل', 'اسطوري', 'أسطوري', 'مثالي', 'خارق',
            'أفضل', 'افضل', 'عظيم', 'مذهل', 'استثنائي', 'لا يوصف', 'تحفة',
            'خمس نجوم', 'خمسة نجوم', 'خمس ستارز', '5 نجوم', '٥ نجوم',
            'الأفضل', 'شكراً جزيلاً', 'ممنون جداً', 'راضي جداً', 'محترف جداً',
            'خدمة ممتازة', 'جودة عالية', 'تجربة رائعة',
            // إنجليزي
            'perfect', 'excellent', 'amazing', 'awesome', 'outstanding',
            'fantastic', 'wonderful', 'superb', 'brilliant', 'incredible',
            'exceptional', 'flawless', 'top notch', 'best ever',
            '5 stars', 'five stars',
        ],
        emojis: ['⭐⭐⭐⭐⭐', '🌟🌟🌟🌟🌟', '💯', '🔥🔥', '❤️❤️❤️', '👏👏'],
        numbers: ['5', '٥'],
    },
    4: {
        words: [
            'جيد', 'حلو', 'تمام', 'كويس', 'ممنون', 'مرتاح', 'راضي',
            'أربع نجوم', 'اربع نجوم', '4 نجوم', '٤ نجوم', 'محترم',
            'خدمة جيدة', 'جيد جداً', 'كويس جداً', 'حلو جداً',
            'good', 'great', 'nice', 'satisfied', 'happy', 'pleased',
            '4 stars', 'four stars',
        ],
        emojis: ['⭐⭐⭐⭐', '🌟🌟🌟🌟', '👍👍', '😊😊'],
        numbers: ['4', '٤'],
    },
    3: {
        words: [
            'ماشي', 'عادي', 'معقول', 'وسط', 'مقبول', 'نص ونص',
            'ثلاث نجوم', '3 نجوم', '٣ نجوم',
            'okay', 'ok', 'average', 'neutral', 'fair', 'acceptable',
            '3 stars', 'three stars',
        ],
        emojis: ['⭐⭐⭐', '🌟🌟🌟', '😐', '🤷', '🤷‍♂️', '🤷‍♀️'],
        numbers: ['3', '٣'],
    },
    2: {
        words: [
            'ضعيف نوعاً', 'مش كويس', 'تحت المتوسط', 'مخيب شوي',
            'نجمتين', '2 نجوم', '٢ نجوم',
            'disappointing', 'below average', 'not great', 'mediocre',
            '2 stars', 'two stars',
        ],
        emojis: ['⭐⭐', '🌟🌟', '👎'],
        numbers: ['2', '٢'],
    },
    1: {
        words: [
            'سيء', 'سيئ', 'ضعيف', 'خايس', 'مخيب', 'فاشل', 'زبالة',
            'مشكلة', 'سلبي', 'غير راضي', 'مزعج', 'كارثة',
            'نجمة واحدة', 'نجمة', '1 نجمة', '١ نجمة',
            'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor',
            'disappointing', 'useless', 'trash', 'garbage',
            '1 star', 'one star',
        ],
        emojis: ['⭐', '🌟', '💔', '😡', '🤬', '👎👎'],
        numbers: ['1', '١'],
    },
};

/* ═══════════════════════════════════════════════════════
   2.  كلمات النفي (تعكس المعنى)
   ═══════════════════════════════════════════════════════ */
const NEGATORS = ['مش', 'مو', 'لا', 'ليس', 'غير', 'مب', 'not', "isn't", "wasn't", "don't", "didn't", 'never'];

/* ═══════════════════════════════════════════════════════
   3.  مُعزِّزات الشدة (ترفع الثقة)
   ═══════════════════════════════════════════════════════ */
const INTENSIFIERS = ['جداً', 'جدا', 'كثيراً', 'كثيرا', 'للغاية', 'بشكل كبير',
    'very', 'so', 'really', 'extremely', 'absolutely', 'super'];

/* ═══════════════════════════════════════════════════════
   4.  إيموجي النجوم المفردة (تُعدّ وتُحوّل إلى تقييم)
   ═══════════════════════════════════════════════════════ */
const STAR_EMOJIS  = ['⭐', '🌟'];

/* ═══════════════════════════════════════════════════════
   5.  أرقام عربية → لاتينية
   ═══════════════════════════════════════════════════════ */
const toLatinDigit = (char) => {
    const map = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' };
    return map[char] || char;
};

const normalizeArabicNumbers = (text) =>
    text.replace(/[٠-٩]/g, toLatinDigit);

/* ═══════════════════════════════════════════════════════
   6.  الدالة الرئيسية
   ═══════════════════════════════════════════════════════ */
/**
 * تحليل رسالة وتحديد تقييمها
 * @param {string} content  نص الرسالة الأصلي
 * @returns {{ rating: number|null, confidence: number, category: string, keywords: string[], method: string }}
 */
function analyzeMessage(content) {
    if (!content || !content.trim()) {
        return { rating: null, confidence: 0, category: 'unknown', keywords: [], method: 'none' };
    }

    const raw  = content.trim();
    const text = normalizeArabicNumbers(raw).toLowerCase();

    /* ── أولاً: رقم مباشر (1-5) ── */
    if (/^[1-5]$/.test(text)) {
        const n = parseInt(text, 10);
        return {
            rating:     n,
            confidence: 1.0,
            category:   n >= 4 ? 'positive' : n === 3 ? 'neutral' : 'negative',
            keywords:   [text],
            method:     'direct_number',
        };
    }

    /* ── ثانياً: عدّ إيموجي النجوم المفردة ── */
    {
        let starCount = 0;
        for (const s of STAR_EMOJIS) {
            // عدّ التكرارات غير المتداخلة
            let pos = 0;
            while ((pos = raw.indexOf(s, pos)) !== -1) { starCount++; pos += s.length; }
        }
        if (starCount >= 1 && starCount <= 5) {
            return {
                rating:     starCount,
                confidence: 0.9,
                category:   starCount >= 4 ? 'positive' : starCount === 3 ? 'neutral' : 'negative',
                keywords:   [`${starCount} نجمة/نجوم`],
                method:     'emoji_stars',
            };
        }
    }

    /* ── ثالثاً: تحليل الكلمات المفتاحية ── */
    const scores   = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const found    = [];

    for (const [ratingStr, data] of Object.entries(RATING_KEYWORDS)) {
        const r = parseInt(ratingStr, 10);

        /* فحص الأرقام */
        for (const num of data.numbers) {
            const latinNum = normalizeArabicNumbers(num);
            if (new RegExp(`(?<![0-9])${latinNum}(?![0-9])`).test(text)) {
                scores[r] += 2.5;
                found.push(num);
            }
        }

        /* فحص الإيموجي المتسلسلة */
        for (const emoji of data.emojis) {
            if (raw.includes(emoji)) {
                scores[r] += 2;
                found.push(emoji);
            }
        }

        /* فحص الكلمات مع كشف النفي والشدة */
        for (const word of data.words) {
            const wordLower = word.toLowerCase();
            const idx = text.indexOf(wordLower);
            if (idx === -1) continue;

            const preceding = text.substring(Math.max(0, idx - 25), idx);
            const hasNegation = NEGATORS.some(neg => preceding.includes(neg));

            if (hasNegation) {
                // اعكس التقييم عند وجود نفي
                const flipped = 6 - r;
                scores[flipped] = (scores[flipped] || 0) + 1.5;
            } else {
                scores[r] += 2;
                found.push(word);

                // تحقق من وجود مُعزِّزات
                const context = text.substring(Math.max(0, idx - 30), idx + wordLower.length + 30);
                if (INTENSIFIERS.some(i => context.includes(i))) {
                    scores[r] += 0.5; // زيادة طفيفة
                }
            }
        }
    }

    /* ── أفضل نتيجة ── */
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
        return { rating: null, confidence: 0, category: 'unknown', keywords: [], method: 'none' };
    }

    const bestRating    = parseInt(Object.entries(scores).find(([, s]) => s === maxScore)[0], 10);
    // نُطبّع الثقة: أقصى نقاط ممكنة نظرياً ~6 (رقم + إيموجي + كلمة + مُعزِّز)
    const confidence    = Math.min(maxScore / 5, 1.0);

    const category =
        bestRating >= 4 ? 'positive' :
        bestRating === 3 ? 'neutral' : 'negative';

    return {
        rating:     bestRating,
        confidence: Math.round(confidence * 100) / 100,
        category,
        keywords:   [...new Set(found)], // إزالة التكرار
        method:     'keyword_analysis',
    };
}

module.exports = { analyzeMessage };
