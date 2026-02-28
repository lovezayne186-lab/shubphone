(function () {
    const STORE_KEY = 'wechat_workData_v1';
    const STORY_KEY = 'wechat_workStories_v1';

    const jobs = [
        { id: 'coffee', name: '咖啡店员', baseReward: 200, duration: 7200000, tags: ['开朗', '服务', '细心', '社交'], emoji: '☕' },
        { id: 'barista', name: '手冲咖啡师', baseReward: 240, duration: 7200000, tags: ['专注', '细节', '审美', '手作'], emoji: '🫘' },
        { id: 'bakery', name: '面包房学徒', baseReward: 210, duration: 9000000, tags: ['手作', '耐心', '温柔', '香味'], emoji: '🥐' },
        { id: 'dessert', name: '甜品店助手', baseReward: 220, duration: 7200000, tags: ['细心', '审美', '温柔', '服务'], emoji: '🍰' },
        { id: 'bookstore', name: '书店整理', baseReward: 180, duration: 5400000, tags: ['安静', '细致', '喜欢书', '条理'], emoji: '📚' },
        { id: 'library', name: '图书馆助理', baseReward: 200, duration: 7200000, tags: ['安静', '条理', '认真', '喜欢书'], emoji: '🏛️' },
        { id: 'flower', name: '花店帮手', baseReward: 220, duration: 7200000, tags: ['温柔', '审美', '耐心', '手作'], emoji: '🌿' },
        { id: 'plant', name: '植物店养护', baseReward: 230, duration: 7200000, tags: ['耐心', '细致', '安静', '治愈'], emoji: '🪴' },
        { id: 'studio', name: '摄影棚助理', baseReward: 260, duration: 7200000, tags: ['审美', '行动力', '社交', '表达'], emoji: '📷' },
        { id: 'photo_edit', name: '修图师', baseReward: 300, duration: 7200000, tags: ['审美', '专注', '细节', '技术'], emoji: '🖥️' },
        { id: 'video_cut', name: '剪辑助理', baseReward: 280, duration: 7200000, tags: ['专注', '节奏', '审美', '技术'], emoji: '🎞️' },
        { id: 'podcast', name: '播客剪辑', baseReward: 260, duration: 5400000, tags: ['安静', '节奏', '专注', '文字'], emoji: '🎧' },
        { id: 'pet', name: '宠物店护理', baseReward: 240, duration: 7200000, tags: ['喜欢动物', '温柔', '耐心', '细心'], emoji: '🐾' },
        { id: 'dog_walk', name: '遛狗员', baseReward: 190, duration: 3600000, tags: ['喜欢动物', '行动力', '户外', '体力'], emoji: '🦮' },
        { id: 'cat_sitter', name: '猫咪看护', baseReward: 220, duration: 5400000, tags: ['安静', '温柔', '喜欢动物', '细心'], emoji: '🐈' },
        { id: 'office', name: '资料整理', baseReward: 210, duration: 5400000, tags: ['理性', '条理', '认真', '细心'], emoji: '🗂️' },
        { id: 'data_entry', name: '数据录入', baseReward: 200, duration: 5400000, tags: ['细心', '耐心', '条理', '安静'], emoji: '⌨️' },
        { id: 'reception', name: '前台接待', baseReward: 230, duration: 7200000, tags: ['礼貌', '社交', '服务', '开朗'], emoji: '🛎️' },
        { id: 'event_staff', name: '活动执行', baseReward: 280, duration: 7200000, tags: ['行动力', '社交', '抗压', '沟通'], emoji: '🎪' },
        { id: 'store_clerk', name: '便利店店员', baseReward: 200, duration: 7200000, tags: ['服务', '细心', '耐心', '夜班'], emoji: '🏪' },
        { id: 'supermarket', name: '超市理货', baseReward: 210, duration: 7200000, tags: ['体力', '条理', '认真', '行动力'], emoji: '🛒' },
        { id: 'warehouse', name: '仓库拣货', baseReward: 240, duration: 7200000, tags: ['体力', '条理', '行动力', '认真'], emoji: '📦' },
        { id: 'courier', name: '同城跑腿', baseReward: 260, duration: 5400000, tags: ['行动力', '户外', '抗压', '路线'], emoji: '🛵' },
        { id: 'driver', name: '代驾', baseReward: 300, duration: 7200000, tags: ['稳重', '夜晚', '抗压', '可靠'], emoji: '🚗' },
        { id: 'cleaning', name: '整理收纳', baseReward: 260, duration: 7200000, tags: ['条理', '细致', '认真', '强迫症'], emoji: '🧺' },
        { id: 'laundry', name: '洗衣店助手', baseReward: 210, duration: 5400000, tags: ['细心', '耐心', '条理', '安静'], emoji: '🧼' },
        { id: 'tailor', name: '裁缝助理', baseReward: 260, duration: 7200000, tags: ['手作', '细节', '耐心', '审美'], emoji: '🧵' },
        { id: 'jewelry', name: '饰品手作', baseReward: 280, duration: 7200000, tags: ['手作', '审美', '细节', '安静'], emoji: '💍' },
        { id: 'calligraphy', name: '字帖抄写', baseReward: 200, duration: 5400000, tags: ['安静', '专注', '耐心', '细致'], emoji: '✍️' },
        { id: 'translator', name: '翻译校对', baseReward: 320, duration: 7200000, tags: ['理性', '语言', '细心', '安静'], emoji: '🌐' },
        { id: 'copywriter', name: '文案写作', baseReward: 300, duration: 5400000, tags: ['文字', '表达', '想象力', '安静'], emoji: '📝' },
        { id: 'editor', name: '内容编辑', baseReward: 310, duration: 7200000, tags: ['文字', '条理', '细心', '审美'], emoji: '🗞️' },
        { id: 'illustrator', name: '插画助理', baseReward: 320, duration: 7200000, tags: ['审美', '想象力', '安静', '手作'], emoji: '🎨' },
        { id: 'designer', name: '平面设计助理', baseReward: 330, duration: 7200000, tags: ['审美', '技术', '专注', '表达'], emoji: '🖋️' },
        { id: 'ui', name: 'UI 走查', baseReward: 280, duration: 5400000, tags: ['细节', '审美', '理性', '专注'], emoji: '📐' },
        { id: 'qa', name: '测试助理', baseReward: 270, duration: 5400000, tags: ['理性', '细心', '专注', '条理'], emoji: '🧪' },
        { id: 'dev_helper', name: '脚本整理', baseReward: 290, duration: 5400000, tags: ['技术', '理性', '条理', '安静'], emoji: '🧩' },
        { id: 'it_support', name: 'IT 值班', baseReward: 300, duration: 7200000, tags: ['技术', '可靠', '冷静', '抗压'], emoji: '🛠️' },
        { id: 'teacher', name: '助教', baseReward: 280, duration: 5400000, tags: ['耐心', '表达', '温柔', '条理'], emoji: '📘' },
        { id: 'tutor', name: '家教', baseReward: 340, duration: 5400000, tags: ['耐心', '表达', '认真', '条理'], emoji: '🏫' },
        { id: 'coach', name: '健身房私教助理', baseReward: 320, duration: 5400000, tags: ['体力', '行动力', '自律', '社交'], emoji: '🏋️' },
        { id: 'yoga', name: '瑜伽馆助理', baseReward: 260, duration: 5400000, tags: ['温柔', '安静', '治愈', '耐心'], emoji: '🧘' },
        { id: 'runner', name: '赛事志愿者', baseReward: 220, duration: 5400000, tags: ['行动力', '社交', '热心', '体力'], emoji: '🏁' },
        { id: 'nurse_aide', name: '护理助理', baseReward: 320, duration: 7200000, tags: ['温柔', '细心', '耐心', '可靠'], emoji: '🩺' },
        { id: 'clinic', name: '诊所前台', baseReward: 260, duration: 7200000, tags: ['礼貌', '条理', '耐心', '服务'], emoji: '🏥' },
        { id: 'pharmacy', name: '药店助手', baseReward: 280, duration: 7200000, tags: ['认真', '细心', '可靠', '条理'], emoji: '💊' },
        { id: 'lab', name: '实验室助理', baseReward: 340, duration: 7200000, tags: ['理性', '专注', '细心', '安静'], emoji: '🔬' },
        { id: 'museum', name: '展馆讲解', baseReward: 280, duration: 5400000, tags: ['表达', '审美', '社交', '礼貌'], emoji: '🖼️' },
        { id: 'gallery', name: '画廊值班', baseReward: 260, duration: 7200000, tags: ['安静', '审美', '礼貌', '细心'], emoji: '🧑‍🎨' },
        { id: 'cinema', name: '影院检票', baseReward: 220, duration: 5400000, tags: ['服务', '礼貌', '夜晚', '耐心'], emoji: '🎟️' },
        { id: 'theatre', name: '剧场场务', baseReward: 260, duration: 7200000, tags: ['行动力', '抗压', '夜晚', '认真'], emoji: '🎭' },
        { id: 'band', name: 'Livehouse 场控', baseReward: 300, duration: 7200000, tags: ['夜晚', '抗压', '社交', '行动力'], emoji: '🎸' },
        { id: 'makeup', name: '化妆助理', baseReward: 320, duration: 7200000, tags: ['审美', '细心', '手作', '社交'], emoji: '💄' },
        { id: 'hair', name: '发型助理', baseReward: 280, duration: 7200000, tags: ['社交', '手作', '耐心', '审美'], emoji: '💇' },
        { id: 'stylist', name: '造型助理', baseReward: 330, duration: 7200000, tags: ['审美', '社交', '行动力', '表达'], emoji: '🧥' },
        { id: 'model', name: '平面模特', baseReward: 360, duration: 5400000, tags: ['自信', '表达', '审美', '镜头'], emoji: '📸' },
        { id: 'actor', name: '短剧演员', baseReward: 380, duration: 7200000, tags: ['表达', '社交', '情绪', '镜头'], emoji: '🎬' },
        { id: 'voice', name: '配音试音', baseReward: 320, duration: 5400000, tags: ['表达', '情绪', '声音', '安静'], emoji: '🎙️' },
        { id: 'idol', name: '练习生排练', baseReward: 300, duration: 7200000, tags: ['自律', '体力', '表达', '舞台'], emoji: '🕺' },
        { id: 'dance', name: '舞蹈助教', baseReward: 320, duration: 5400000, tags: ['体力', '表达', '耐心', '行动力'], emoji: '💃' },
        { id: 'baker_night', name: '夜间烘焙', baseReward: 260, duration: 7200000, tags: ['夜晚', '专注', '手作', '耐心'], emoji: '🌙' },
        { id: 'security', name: '夜班巡查', baseReward: 280, duration: 7200000, tags: ['夜晚', '稳重', '可靠', '抗压'], emoji: '🕯️' },
        { id: 'studio_runner', name: '片场跑腿', baseReward: 300, duration: 5400000, tags: ['行动力', '抗压', '社交', '体力'], emoji: '🏃' },
        { id: 'catering', name: '外烩帮厨', baseReward: 260, duration: 7200000, tags: ['体力', '手作', '抗压', '团队'], emoji: '🍳' },
        { id: 'kitchen_prep', name: '后厨备料', baseReward: 240, duration: 7200000, tags: ['体力', '细心', '节奏', '抗压'], emoji: '🥕' },
        { id: 'tea', name: '茶馆侍应', baseReward: 220, duration: 7200000, tags: ['安静', '礼貌', '服务', '温柔'], emoji: '🍵' },
        { id: 'hotel', name: '酒店客房服务', baseReward: 260, duration: 7200000, tags: ['细心', '耐心', '服务', '体力'], emoji: '🛏️' },
        { id: 'bellhop', name: '行李员', baseReward: 240, duration: 5400000, tags: ['体力', '礼貌', '行动力', '服务'], emoji: '🧳' },
        { id: 'tour', name: '城市导览', baseReward: 340, duration: 7200000, tags: ['表达', '社交', '户外', '路线'], emoji: '🧭' },
        { id: 'map_maker', name: '地图标注', baseReward: 260, duration: 5400000, tags: ['理性', '条理', '安静', '路线'], emoji: '🗺️' },
        { id: 'detective', name: '调查助理', baseReward: 360, duration: 7200000, tags: ['理性', '观察', '冷静', '专注'], emoji: '🔎' },
        { id: 'wizard_scribe', name: '魔法书抄写员', baseReward: 340, duration: 7200000, tags: ['魔法', '安静', '专注', '细致'], emoji: '📜' },
        { id: 'apothecary', name: '炼金药师学徒', baseReward: 360, duration: 7200000, tags: ['魔法', '理性', '细心', '实验'], emoji: '⚗️' },
        { id: 'knight_squire', name: '骑士侍从', baseReward: 320, duration: 7200000, tags: ['骑士', '忠诚', '体力', '行动力'], emoji: '🛡️' },
        { id: 'maid', name: '宅邸管家助理', baseReward: 300, duration: 7200000, tags: ['礼貌', '条理', '服务', '可靠'], emoji: '🕊️' },
    ];

    let store = null;
    const runtime = {
        activeTab: 'home',
        sheetRoleId: '',
        sheetRecoJobId: '',
        noteRoleId: '',
        noteReqToken: 0,
        tickerId: null,
        lastRenderAt: 0,
    };

    function safeParse(text, fallback) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    function clampNumber(v, min, max, fallback) {
        const n = Number(v);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

    function loadStore() {
        const raw = localStorage.getItem(STORE_KEY);
        const parsed = raw ? safeParse(raw, {}) : {};
        store = parsed && typeof parsed === 'object' ? parsed : {};
        if (!store.roles || typeof store.roles !== 'object') store.roles = {};
        return store;
    }

    function saveStore() {
        if (!store) return;
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(store));
        } catch (e) { }
    }

    function ensureStore() {
        if (!store) loadStore();
        return store;
    }

    function getProfiles() {
        const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
        return profiles;
    }

    function getRoleIds() {
        const profiles = getProfiles();
        return Object.keys(profiles).filter(function (id) {
            const p = profiles[id];
            if (!p || typeof p !== 'object') return false;
            if (p.isGroup) return false;
            return true;
        });
    }

    function getDisplayName(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        return (p.remark || p.nickName || p.name || roleId || '').toString();
    }

    function getAvatar(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        return (p.avatar || 'assets/chushitouxiang.jpg').toString();
    }

    function normalizeWorkData(raw) {
        const d = raw && typeof raw === 'object' ? raw : {};
        const status = (d.status === 'idle' || d.status === 'working' || d.status === 'finished') ? d.status : 'idle';
        const stamina = clampNumber(d.stamina, 0, 100, 100);
        const mood = clampNumber(d.mood, 0, 100, 100);
        const startTime = clampNumber(d.startTime, 0, Number.MAX_SAFE_INTEGER, 0);
        const duration = clampNumber(d.duration, 0, Number.MAX_SAFE_INTEGER, 0);
        const currentJob = d.currentJob && typeof d.currentJob === 'object' ? d.currentJob : null;
        return { status, stamina, mood, currentJob, startTime, duration };
    }

    function ensureRoleWorkData(roleId) {
        const s = ensureStore();
        if (!s.roles[roleId]) {
            s.roles[roleId] = normalizeWorkData(null);
            saveStore();
        } else {
            s.roles[roleId] = normalizeWorkData(s.roles[roleId]);
        }
        return s.roles[roleId];
    }

    function personaTextForRole(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        const parts = [];
        if (typeof p.desc === 'string' && p.desc.trim()) parts.push(p.desc.trim());
        if (typeof p.style === 'string' && p.style.trim()) parts.push(p.style.trim());
        if (typeof p.schedule === 'string' && p.schedule.trim()) parts.push(p.schedule.trim());
        return parts.join('\n');
    }

    function readWorldBooksSnapshot() {
        const wb = window.worldBooks && typeof window.worldBooks === 'object' ? window.worldBooks : null;
        if (wb && Object.keys(wb).length > 0) return wb;
        const raw = localStorage.getItem('wechat_worldbooks');
        const parsed = raw ? safeParse(raw, {}) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    }

    function worldbookTextForRole(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        let wbIds = p.worldbookId || [];
        if (typeof wbIds === 'string') {
            wbIds = wbIds ? [wbIds] : [];
        }
        if (!wbIds.length) return '';
        
        const books = readWorldBooksSnapshot();
        const parts = [];
        
        wbIds.forEach(id => {
            const worldbookId = String(id || '').trim();
            if (!worldbookId) return;

            if (worldbookId.indexOf('CATEGORY:') === 0 || worldbookId.indexOf('cat:') === 0) {
                const cat = worldbookId.includes(':') ? worldbookId.split(':')[1].trim() : worldbookId;
                if (!cat) return;
                Object.keys(books).forEach(function (bid) {
                    const b = books[bid];
                    if (!b || typeof b !== 'object') return;
                    if (String(b.category || '').trim() !== cat) return;
                    const title = typeof b.title === 'string' ? b.title.trim() : '';
                    const content = typeof b.content === 'string' ? b.content.trim() : '';
                    if (title) parts.push(title);
                    if (content) parts.push(content);
                });
            } else {
                const book = books[worldbookId];
                if (!book || typeof book !== 'object') return;
                const title = typeof book.title === 'string' ? book.title.trim() : '';
                const content = typeof book.content === 'string' ? book.content.trim() : '';
                if (title) parts.push(title);
                if (content) parts.push(content);
            }
        });
        
        return parts.join('\n');
    }

    function contextTextForRole(roleId) {
        const persona = personaTextForRole(roleId);
        const wb = worldbookTextForRole(roleId);
        if (persona && wb) return persona + '\n' + wb;
        return persona || wb || '';
    }

    function scoreJobAgainstPersona(job, personaText) {
        const text = (personaText || '').toString();
        if (!text) return 0;
        const tags = Array.isArray(job.tags) ? job.tags : [];
        let score = 0;
        tags.forEach(function (tag) {
            if (!tag) return;
            const t = String(tag);
            if (!t) return;
            if (text.indexOf(t) !== -1) score += 1;
        });
        return score;
    }

    function hashToPositiveInt(text) {
        const s = String(text || '');
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return Math.abs(h >>> 0);
    }

    function pickStableJob(roleId, contextText) {
        if (!jobs || jobs.length === 0) return null;
        const seed = hashToPositiveInt(String(roleId || '') + '|' + String(contextText || ''));
        return jobs[seed % jobs.length] || jobs[0];
    }

    function findBestJob(roleId) {
        const text = contextTextForRole(roleId);
        const kwJob = pickJobByKeywords(text);
        if (kwJob) return { job: kwJob, score: 999 };
        let best = null;
        let bestScore = -1;
        jobs.forEach(function (job) {
            const s = scoreJobAgainstPersona(job, text);
            if (s > bestScore) {
                bestScore = s;
                best = job;
                return;
            }
            if (s > 0 && s === bestScore && best && job.baseReward > best.baseReward) {
                best = job;
            }
        });
        if (!best || bestScore <= 0) {
            const fallback = pickStableJob(roleId, text);
            return { job: fallback || jobs[0], score: 0 };
        }
        return { job: best, score: Math.max(0, bestScore) };
    }

    function getJobById(jobId) {
        if (!jobId) return null;
        for (let i = 0; i < jobs.length; i++) {
            const j = jobs[i];
            if (j && j.id === jobId) return j;
        }
        return null;
    }

    function pickJobByKeywords(contextText) {
        const text = (contextText || '').toString();
        if (!text) return null;
        const rules = [
            { keys: ['魔法', '法术', '巫师', '魔女', '咒文'], jobId: 'apothecary' },
            { keys: ['炼金', '药剂', '药水'], jobId: 'apothecary' },
            { keys: ['骑士', '王国', '侍从', '誓约'], jobId: 'knight_squire' },
            { keys: ['管家', '宅邸', '女仆', '礼仪'], jobId: 'maid' },
            { keys: ['偶像', '舞台', '应援', '练习生'], jobId: 'idol' },
            { keys: ['配音', '声优', '旁白'], jobId: 'voice' },
            { keys: ['摄影', '镜头', '棚拍', '修图'], jobId: 'studio' },
            { keys: ['剪辑', '后期'], jobId: 'video_cut' },
            { keys: ['插画', '画画', '绘画', '美术'], jobId: 'illustrator' },
            { keys: ['设计', '排版', '海报', '字体'], jobId: 'designer' },
            { keys: ['程序', '代码', '开发', '脚本'], jobId: 'dev_helper' },
            { keys: ['测试', 'Bug', '缺陷'], jobId: 'qa' },
            { keys: ['护士', '护理'], jobId: 'nurse_aide' },
            { keys: ['医生', '医院', '诊所'], jobId: 'clinic' },
            { keys: ['实验', '研究', '论文', '科研'], jobId: 'lab' },
            { keys: ['猫', '喵'], jobId: 'cat_sitter' },
            { keys: ['狗', '汪'], jobId: 'dog_walk' },
            { keys: ['花', '植物', '园艺'], jobId: 'flower' },
            { keys: ['咖啡', '手冲', '拉花'], jobId: 'barista' },
            { keys: ['烘焙', '面包', '甜品'], jobId: 'bakery' },
            { keys: ['文字', '写作', '文案'], jobId: 'copywriter' },
            { keys: ['翻译', '校对'], jobId: 'translator' },
            { keys: ['整理', '收纳', '强迫症'], jobId: 'cleaning' },
            { keys: ['导览', '旅行', '路线'], jobId: 'tour' },
        ];

        for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            const keys = Array.isArray(r.keys) ? r.keys : [];
            for (let k = 0; k < keys.length; k++) {
                const kw = String(keys[k] || '').trim();
                if (!kw) continue;
                if (text.indexOf(kw) !== -1) {
                    return getJobById(r.jobId);
                }
            }
        }
        return null;
    }

    async function requestAICustomJob(roleId, contextText) {
        const baseUrlRaw = localStorage.getItem('api_base_url');
        const apiKey = localStorage.getItem('user_api_key');
        if (!baseUrlRaw || !apiKey) return null;
        const model = localStorage.getItem('selected_model') || "deepseek-chat";
        const temperature = parseFloat(localStorage.getItem('model_temperature')) || 0.7;

        let endpoint = baseUrlRaw.trim();
        if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
        if (!endpoint.includes('/chat/completions')) {
            if (!endpoint.includes('/v1')) endpoint += '/v1';
            endpoint += '/chat/completions';
        }

        const profile = getProfiles()[roleId] || {};
        const roleName = getDisplayName(roleId);
        const persona = personaTextForRole(roleId);
        const wb = worldbookTextForRole(roleId);
        const ctx = String(contextText || '').trim() || [persona, wb].filter(Boolean).join('\n');
        if (!ctx) return null;

        const systemPrompt = [
            '你是一个“角色经营/打工系统”的工作生成器。',
            '目标：为指定角色生成一个符合其人设、世界观的兼职/副业/短期任务。',
            '要求：不要从任何既有职业列表里挑选；请原创一个具体的工作名称。',
            '输出：只输出严格 JSON，不要包含多余文本，不要代码块。',
            '字段：',
            'name: string (工作名称，中文，10字以内)',
            'emoji: string (一个emoji)',
            'tags: string[] (3-6个，中文关键词)',
            'durationHours: number (1-12)',
            'baseReward: number (50-800)'
        ].join('\n');

        const userPrompt = [
            `角色名：${roleName}`,
            '角色设定与世界观：',
            ctx
        ].join('\n');

        let resp;
        try {
            resp = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: model,
                    temperature: temperature,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                })
            });
        } catch (e) {
            return null;
        }
        if (!resp || !resp.ok) return null;

        let json;
        try {
            json = await resp.json();
        } catch (e) {
            return null;
        }
        const content = json && json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : '';
        let parsed = content ? safeParse(content, null) : null;
        if (!parsed && content) {
            const m = String(content).match(/\{[\s\S]*\}/);
            if (m && m[0]) parsed = safeParse(m[0], null);
        }
        if (!parsed || typeof parsed !== 'object') return null;

        const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
        const emoji = typeof parsed.emoji === 'string' ? parsed.emoji.trim() : '';
        const tags = Array.isArray(parsed.tags) ? parsed.tags.map(function (t) { return String(t || '').trim(); }).filter(Boolean).slice(0, 6) : [];
        const durationHours = clampNumber(parsed.durationHours, 1, 12, 6);
        const baseReward = clampNumber(parsed.baseReward, 50, 800, 260);
        if (!name) return null;

        return {
            id: 'ai_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
            name: name,
            emoji: emoji || '🧾',
            tags: tags.length ? tags : ['临时', '兼职', '任务'],
            duration: Math.round(durationHours * 60 * 60 * 1000),
            baseReward: Math.round(baseReward)
        };
    }

    function fallbackCustomJob(roleId, contextText) {
        const text = String(contextText || '');
        const roleName = getDisplayName(roleId) || '';
        const seeds = [
            { keys: ['医生', '医院', '诊所', '急诊', '手术'], name: '急诊代班', emoji: '🏥', tags: ['医疗', '冷静', '责任', '救治'], reward: 520, hours: 6 },
            { keys: ['护士', '护理'], name: '护理协助', emoji: '🩺', tags: ['护理', '细心', '耐心', '可靠'], reward: 420, hours: 6 },
            { keys: ['摄影', '镜头', '棚拍', '修图'], name: '外景跟拍', emoji: '📷', tags: ['摄影', '审美', '行动力', '沟通'], reward: 460, hours: 5 },
            { keys: ['配音', '声优', '旁白', '声音'], name: '广告试音', emoji: '🎙️', tags: ['配音', '表达', '情绪', '声音'], reward: 380, hours: 4 },
            { keys: ['写作', '文案', '文字', '小说'], name: '短文代写', emoji: '📝', tags: ['写作', '表达', '想象力', '文字'], reward: 360, hours: 4 },
            { keys: ['健身', '训练', '跑步'], name: '训练陪跑', emoji: '🏃', tags: ['体力', '自律', '行动力', '陪伴'], reward: 340, hours: 3 },
            { keys: ['猫', '狗', '宠物'], name: '上门看护', emoji: '🐾', tags: ['动物', '温柔', '耐心', '细心'], reward: 320, hours: 3 },
            { keys: ['魔法', '法术', '巫师', '魔女', '咒文'], name: '符文抄写', emoji: '📜', tags: ['魔法', '专注', '细致', '安静'], reward: 480, hours: 5 },
        ];
        for (let i = 0; i < seeds.length; i++) {
            const s = seeds[i];
            for (let k = 0; k < s.keys.length; k++) {
                const kw = String(s.keys[k] || '').trim();
                if (!kw) continue;
                if (text.indexOf(kw) !== -1) {
                    return {
                        id: 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
                        name: s.name,
                        emoji: s.emoji,
                        tags: s.tags.slice(),
                        duration: Math.round(s.hours * 60 * 60 * 1000),
                        baseReward: Math.round(s.reward)
                    };
                }
            }
        }
        const seed = hashToPositiveInt(roleName + '|' + text);
        const generic = [
            { name: '临时跑腿', emoji: '🛵', tags: ['行动力', '路线', '抗压', '沟通'], reward: 300, hours: 4 },
            { name: '资料整理', emoji: '🗂️', tags: ['条理', '细心', '认真', '安静'], reward: 280, hours: 5 },
            { name: '活动协助', emoji: '🎪', tags: ['行动力', '社交', '沟通', '抗压'], reward: 340, hours: 5 },
            { name: '店铺帮工', emoji: '🏪', tags: ['服务', '耐心', '细心', '体力'], reward: 260, hours: 6 },
        ];
        const g = generic[seed % generic.length];
        return {
            id: 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
            name: g.name,
            emoji: g.emoji,
            tags: g.tags.slice(),
            duration: Math.round(g.hours * 60 * 60 * 1000),
            baseReward: Math.round(g.reward)
        };
    }

    function formatCountdown(ms) {
        const v = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(v / 3600).toString().padStart(2, '0');
        const m = Math.floor((v % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(v % 60).toString().padStart(2, '0');
        return h + ':' + m + ':' + s;
    }

    function setWalletTab(tab) {
        runtime.activeTab = tab;
        const homePage = document.getElementById('wallet-home-page');
        const workPage = document.getElementById('wallet-work-page');
        const tabs = document.querySelectorAll('.wallet-tab-item');
        tabs.forEach(function (el) {
            const t = el.getAttribute('data-wallet-tab') || '';
            if (t === tab) el.classList.add('active');
            else el.classList.remove('active');
        });

        if (tab === 'work') {
            if (homePage) homePage.style.display = 'none';
            if (workPage) workPage.style.display = 'block';
            renderWorkGrid();
        } else {
            if (homePage) homePage.style.display = 'block';
            if (workPage) workPage.style.display = 'none';
            if (tab === 'records') {
                if (window.Wallet && typeof window.Wallet.setFilter === 'function') {
                    window.Wallet.setFilter('all');
                }
                const list = document.getElementById('wallet-list');
                if (list && typeof list.scrollIntoView === 'function') {
                    try { list.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { }
                }
            }
        }
    }

    function getWalletVisible() {
        const view = document.getElementById('wallet-view');
        if (!view) return false;
        const d = view.style && view.style.display ? view.style.display : '';
        if (d === 'none') return false;
        return true;
    }

    function getStatusText(workData) {
        if (!workData || workData.status === 'idle') return '空闲中';
        if (workData.status === 'working' && workData.currentJob && workData.currentJob.name) {
            const emoji = workData.currentJob.emoji ? String(workData.currentJob.emoji) + ' ' : '';
            return emoji + String(workData.currentJob.name) + '兼职中';
        }
        if (workData.status === 'finished') return '待结算';
        return '空闲中';
    }

    function renderWorkGrid() {
        const grid = document.getElementById('work-role-grid');
        if (!grid) return;

        const roleIds = getRoleIds();
        if (roleIds.length === 0) {
            grid.innerHTML = '<div class="work-empty">还没有角色。先去微信里创建一个聊天对象。</div>';
            return;
        }

        grid.innerHTML = '';
        roleIds.forEach(function (roleId) {
            const data = ensureRoleWorkData(roleId);
            const card = document.createElement('div');
            card.className = 'work-role-card';
            card.setAttribute('data-role-id', roleId);

            const avatar = document.createElement('img');
            avatar.className = 'work-role-avatar';
            avatar.alt = '';
            avatar.src = getAvatar(roleId);

            const name = document.createElement('div');
            name.className = 'work-role-name';
            name.textContent = getDisplayName(roleId);

            const status = document.createElement('div');
            status.className = 'work-role-status';
            status.textContent = getStatusText(data);

            const footer = document.createElement('div');
            footer.className = 'work-role-footer';

            if (data.status === 'idle') {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'work-btn work-btn-primary';
                btn.textContent = '安排工作';
                btn.addEventListener('click', function () {
                    openSheet(roleId);
                });
                footer.appendChild(btn);
            } else if (data.status === 'working') {
                const prog = document.createElement('div');
                prog.className = 'work-progress';
                const fill = document.createElement('div');
                fill.className = 'work-progress-fill';
                fill.id = 'work-progress-fill-' + roleId;
                prog.appendChild(fill);

                const countdown = document.createElement('div');
                countdown.className = 'work-countdown';
                countdown.id = 'work-countdown-' + roleId;
                const row = document.createElement('div');
                row.className = 'work-countdown-row';
                row.appendChild(countdown);
                const fastBtn = document.createElement('button');
                fastBtn.type = 'button';
                fastBtn.className = 'work-fast-btn';
                fastBtn.textContent = '加速';
                fastBtn.addEventListener('click', function (e) {
                    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                    accelerateToFinish(roleId, true);
                });
                row.appendChild(fastBtn);
                footer.appendChild(prog);
                footer.appendChild(row);
            } else if (data.status === 'finished') {
                const env = document.createElement('button');
                env.type = 'button';
                env.className = 'work-envelope-btn';
                env.textContent = '✉️';
                env.addEventListener('click', function () {
                    openNote(roleId);
                });
                footer.appendChild(env);
            }

            card.appendChild(avatar);
            card.appendChild(name);
            card.appendChild(status);
            card.appendChild(footer);
            grid.appendChild(card);
        });

        tickWorkTimers();
    }

    function moodFace(mood) {
        const v = clampNumber(mood, 0, 100, 100);
        if (v >= 80) return '🙂';
        if (v >= 50) return '😐';
        if (v >= 20) return '😕';
        return '😞';
    }

    function openSheet(roleId) {
        runtime.sheetRoleId = roleId;
        const mask = document.getElementById('work-sheet-mask');
        const sheetAvatar = document.getElementById('work-sheet-avatar');
        const sheetName = document.getElementById('work-sheet-name');
        const sheetStatus = document.getElementById('work-sheet-status');
        const staminaFill = document.getElementById('work-sheet-stamina-fill');
        const staminaText = document.getElementById('work-sheet-stamina-text');
        const moodText = document.getElementById('work-sheet-mood-text');
        const jobListWrap = document.getElementById('work-job-list-wrap');

        const d = ensureRoleWorkData(roleId);
        const reco = findBestJob(roleId);
        runtime.sheetRecoJobId = reco && reco.job ? reco.job.id : '';

        if (sheetAvatar) sheetAvatar.src = getAvatar(roleId);
        if (sheetName) sheetName.textContent = getDisplayName(roleId);
        if (sheetStatus) sheetStatus.textContent = getStatusText(d);
        if (staminaFill) staminaFill.style.width = String(clampNumber(d.stamina, 0, 100, 100)) + '%';
        if (staminaText) staminaText.textContent = String(clampNumber(d.stamina, 0, 100, 100));
        if (moodText) moodText.textContent = moodFace(d.mood) + ' ' + String(clampNumber(d.mood, 0, 100, 100));
        if (jobListWrap) jobListWrap.style.display = 'none';

        if (mask) mask.style.display = 'flex';
        renderSheetJobList(false);
    }

    function closeSheet() {
        runtime.sheetRoleId = '';
        runtime.sheetRecoJobId = '';
        const mask = document.getElementById('work-sheet-mask');
        const jobListWrap = document.getElementById('work-job-list-wrap');
        if (jobListWrap) jobListWrap.style.display = 'none';
        if (mask) mask.style.display = 'none';
    }

    function renderSheetJobList(show) {
        const wrap = document.getElementById('work-job-list-wrap');
        const list = document.getElementById('work-job-list');
        if (!wrap || !list) return;
        if (!show) {
            list.innerHTML = '';
            return;
        }
        wrap.style.display = 'block';
        list.innerHTML = '';
        jobs.forEach(function (job) {
            const item = document.createElement('div');
            item.className = 'work-job-item';
            item.setAttribute('data-job-id', job.id);

            const left = document.createElement('div');
            left.className = 'work-job-left';
            const name = document.createElement('div');
            name.className = 'work-job-name';
            name.textContent = (job.emoji ? job.emoji + ' ' : '') + job.name;
            const meta = document.createElement('div');
            meta.className = 'work-job-meta';
            meta.textContent = '¥' + String(job.baseReward) + ' · ' + formatCountdown(job.duration);
            left.appendChild(name);
            left.appendChild(meta);

            const right = document.createElement('div');
            if (runtime.sheetRecoJobId && job.id === runtime.sheetRecoJobId) {
                const reco = document.createElement('div');
                reco.className = 'work-job-reco';
                reco.textContent = '推荐';
                right.appendChild(reco);
            }

            item.appendChild(left);
            item.appendChild(right);
            item.addEventListener('click', function () {
                startWorking(runtime.sheetRoleId, job);
            });
            list.appendChild(item);
        });
    }

    function buildJobPayload(job, roleId) {
        const reco = findBestJob(roleId);
        const score = reco && reco.job && reco.job.id === job.id ? reco.score : scoreJobAgainstPersona(job, contextTextForRole(roleId));
        const matched = score > 0;
        const reward = clampNumber(job.baseReward, 0, 999999999, 0);
        return {
            id: job.id,
            name: job.name,
            baseReward: job.baseReward,
            duration: job.duration,
            tags: Array.isArray(job.tags) ? job.tags.slice() : [],
            emoji: job.emoji || '',
            matchScore: score,
            matched: matched,
            reward: reward
        };
    }

    function startWorking(roleId, job) {
        if (!roleId || !job) return;
        const d = ensureRoleWorkData(roleId);
        const now = Date.now();
        d.status = 'working';
        d.startTime = now;
        d.duration = clampNumber(job.duration, 0, Number.MAX_SAFE_INTEGER, 0);
        d.currentJob = buildJobPayload(job, roleId);
        ensureStore().roles[roleId] = d;
        saveStore();
        closeSheet();
        renderWorkGrid();
    }

    async function autoPickAndStart(roleId) {
        const btn = document.getElementById('work-btn-auto');
        const oldText = btn ? String(btn.textContent || '') : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = '选择中…';
        }

        const ctx = contextTextForRole(roleId);
        let job = await requestAICustomJob(roleId, ctx);
        if (!job) {
            job = fallbackCustomJob(roleId, ctx);
        }

        if (btn) {
            btn.disabled = false;
            btn.textContent = oldText || '让 TA 自己选';
        }
        startWorking(roleId, job);
    }

    function accelerateToFinish(roleId, openNoteAfter) {
        if (!roleId) return;
        const d = ensureRoleWorkData(roleId);
        if (!d || d.status !== 'working') return;
        const dur = clampNumber(d.duration, 0, Number.MAX_SAFE_INTEGER, 0);
        d.startTime = Date.now() - dur;
        d.status = 'finished';
        ensureStore().roles[roleId] = d;
        saveStore();
        renderWorkGrid();
        if (openNoteAfter) {
            openNote(roleId);
        }
    }

    function tickWorkTimers() {
        const grid = document.getElementById('work-role-grid');
        if (!grid) return;
        const roleIds = getRoleIds();
        const now = Date.now();
        let changed = false;

        roleIds.forEach(function (roleId) {
            const d = ensureRoleWorkData(roleId);
            if (d.status !== 'working') return;
            const start = clampNumber(d.startTime, 0, Number.MAX_SAFE_INTEGER, 0);
            const dur = clampNumber(d.duration, 0, Number.MAX_SAFE_INTEGER, 0);
            if (!start || !dur) return;
            const elapsed = now - start;
            const remain = dur - elapsed;
            if (remain <= 0) {
                d.status = 'finished';
                ensureStore().roles[roleId] = d;
                changed = true;
            }

            const fill = document.getElementById('work-progress-fill-' + roleId);
            if (fill) {
                const pct = dur > 0 ? Math.min(1, Math.max(0, elapsed / dur)) : 0;
                fill.style.width = String(Math.floor(pct * 1000) / 10) + '%';
            }
            const cd = document.getElementById('work-countdown-' + roleId);
            if (cd) {
                cd.textContent = formatCountdown(Math.max(0, remain));
            }
        });

        if (changed) {
            saveStore();
            renderWorkGrid();
        }
    }

    function noteTextForJob(currentJob) {
        const matched = !!(currentJob && currentJob.matched);
        const jobName = currentJob && currentJob.name ? String(currentJob.name) : '打工';
        
        // 预设一些更具生活气息的模板作为 AI 失败时的后备
        const calmLines = [
            `刚才${jobName}收尾时，阳光正好斜斜地打在台面上，空气里浮动着细小的尘埃。我把最后一件工具归位，指尖触碰到冰冷的金属，那种真实的触感让心跳都慢了下来。这种不需要言语的时刻，总让人觉得踏实。`,
            `街道上的霓虹灯亮起时，我才意识到${jobName}已经结束了。风里带着一点湿润的泥土气息，远处传来的鸣笛声显得有些遥远。我整理好领口，看着水洼里破碎的倒影，安静地享受这一刻的独处。`
        ];
        const gentleLines = [
            `忙完${jobName}后，我坐在窗边听了一会儿落雨的声音。空气里弥漫着淡淡的草木香气，那种温热的、潮湿的感觉，像是一层轻柔的薄纱。我想起刚才帮过的一位老人，他道谢时的笑容很暖，像冬日里的炉火。`,
            `刚才最后一位客人离开时，带起了一阵细微的风，吹乱了桌上的书页。我把它们一一抚平，感受着纸张在指腹下的纹理。世界在那一刻仿佛静止了，只有光影在墙上缓慢地挪动，温柔得让人想落泪。`
        ];
        const livelyLines = [
            `嘿！刚才做${jobName}的时候简直太有趣了！我盯着那个不停旋转的小风车看了好久，直到它被一阵突如其来的强风吹得快要飞起来。空气里都是自由的味道，连路边的小猫似乎都在跟我打招呼，心情简直好到飞起！`,
            `呼——总算忙完啦！刚才看到路边有个小朋友在吹泡泡，那些五彩斑斓的圆球在夕阳下闪闪发光，啪的一声碎掉时，带出了一股甜甜的香气。这种充满活力的瞬间，真的怎么看都不会腻呢！`
        ];
        const tsundereLines = [
            `别误会，我只是刚好忙完${jobName}，顺便在这个转角停了一下。风吹得有点冷，我把手插进兜里，指尖碰到一张被揉皱的纸条。哼，这种无聊的小插曲……我才没有特意记在心里，只是还没忘记罢了。`,
            `啧，${jobName}这种事也就那样吧。收工时刚好看到天边的云变成了奇怪的形状，像个滑稽的鬼脸。我只是觉得那个颜色还算凑合，才没有盯着看了整整五分钟呢。笨蛋，这只是巧合而已。`
        ];

        let pool = calmLines;
        const meta = getRolePromptMeta(runtime.noteRoleId);
        const tone = pickTone(meta);
        if (tone === 'gentle') pool = gentleLines;
        else if (tone === 'lively') pool = livelyLines;
        else if (tone === 'tsundere') pool = tsundereLines;
        else if (tone === 'snarky') pool = calmLines; // 毒舌暂用沉稳，可后续扩充

        return pool[Math.floor(Math.random() * pool.length)];
    }

    function loadStoryDb() {
        const raw = localStorage.getItem(STORY_KEY);
        const parsed = raw ? safeParse(raw, {}) : {};
        const db = parsed && typeof parsed === 'object' ? parsed : {};
        if (!db.roles || typeof db.roles !== 'object') db.roles = {};
        return db;
    }

    function saveStoryDb(db) {
        try {
            localStorage.setItem(STORY_KEY, JSON.stringify(db));
        } catch (e) { }
    }

    function ensureStoryBucket(db, roleId, jobId) {
        if (!db.roles[roleId]) db.roles[roleId] = { jobs: {} };
        const r = db.roles[roleId];
        if (!r.jobs || typeof r.jobs !== 'object') r.jobs = {};
        if (!Array.isArray(r.allHashes)) r.allHashes = [];
        if (!r.jobs[jobId]) r.jobs[jobId] = { hashes: [], recent: [] };
        const b = r.jobs[jobId];
        if (!Array.isArray(b.hashes)) b.hashes = [];
        if (!Array.isArray(b.recent)) b.recent = [];
        return b;
    }

    function getRolePromptMeta(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        const persona = typeof p.persona === 'string' ? p.persona.trim() : '';
        const speakingStyle = typeof p.speakingStyle === 'string' ? p.speakingStyle.trim() : '';
        const fallbackPersona = personaTextForRole(roleId);
        const fallbackStyle = typeof p.style === 'string' ? p.style.trim() : '';
        return {
            roleName: getDisplayName(roleId),
            persona: persona || fallbackPersona || '',
            speakingStyle: speakingStyle || fallbackStyle || ''
        };
    }

    function buildWorkStoryPrompt(meta, jobName, avoidTexts) {
        const avoid = Array.isArray(avoidTexts) ? avoidTexts.filter(Boolean).slice(0, 12) : [];
        const avoidBlock = avoid.length ? ('\n请不要与以下内容重复：\n- ' + avoid.join('\n- ')) : '';
        const base = [
            `你现在是${meta.roleName}，人设为${meta.persona || '（未提供）'}。`,
            meta.speakingStyle ? `说话方式/口吻：${meta.speakingStyle}` : '',
            `你刚刚完成了${jobName}的工作。`,
            '请以你的口吻写一段 80-120 字左右的长文案（纸条感内容）。',
            '核心要求：',
            '1. 视角切换：你不是在向用户汇报，你是在自言自语或记录生活瞬间。',
            '2. 严禁指代：禁止提到“你”、“用户”、“主人”或任何指代玩家的词汇。',
            '3. 沉浸感细节：描写一个具体的感官瞬间（光影、气味、路人的背影、声音、温度或手心的触感）。',
            '4. 性格化表达：严格遵守你的性格习惯。沉稳的人要有内敛的观察，活泼的人要有跳跃的情绪，傲娇的人要有别扭的温柔。',
            '5. 禁止术语：不要说“工作很顺利”之类的客套话，直接进入场景描写。',
            '6. 输出格式：长文案 | [画面描述：对应的视觉特写镜头]',
            '示例风格学习：刚才最后一位客人留下的空杯旁，有一枚被遗落的领带夹。我把它收进失物招领盒的时候，指尖蹭到一点还没干透的咖啡渍，苦味散开的速度比想象中要慢。雨快要落下来了，街道两旁的霓虹倒映在水洼里，显得有些支离破碎。这种安静的时刻，倒也不错。 | [画面描述：一张深褐色的木质吧台，边缘放着一个半空的陶瓷杯，背景是模糊的雨夜街道。]',
            avoidBlock
        ].filter(Boolean).join('\n');
        return base;
    }

    function normalizeStoryOutput(raw) {
        const text = String(raw || '').replace(/\r?\n+/g, ' ').trim();
        if (!text) return { story: '', visual: '' };
        const parts = text.split('|');
        const story = (parts[0] || '').trim();
        const visualRaw = parts.slice(1).join('|').trim();
        let visual = visualRaw;
        if (visual && visual.indexOf('画面描述') === -1) {
            visual = '[画面描述：' + visual.replace(/^\[|\]$/g, '').trim() + ']';
        }
        return { story: story, visual: visual };
    }

    function truncateByCodePoints(text, maxLen) {
        const s = String(text || '');
        const arr = Array.from(s);
        if (arr.length <= maxLen) return s;
        return arr.slice(0, maxLen).join('');
    }

    function hashStory(story, visual) {
        const key = String(story || '').trim() + '|' + String(visual || '').trim();
        return hashToPositiveInt(key).toString(36);
    }

    function hasBlockedPhrases(text) {
        const t = String(text || '');
        const blocked = ['诊室糖果', '书架书籍', '超人斗篷', '用户', '主人', '您', '您好'];
        for (let i = 0; i < blocked.length; i++) {
            if (t.indexOf(blocked[i]) !== -1) return true;
        }
        return false;
    }

    function getWorkStoryApiConfig() {
        const baseUrlRaw = localStorage.getItem('api_base_url');
        const apiKey = localStorage.getItem('user_api_key');
        if (!baseUrlRaw || !apiKey) return null;
        const model = localStorage.getItem('selected_model') || "deepseek-chat";
        const temperature = parseFloat(localStorage.getItem('model_temperature')) || 0.9;
        let endpoint = baseUrlRaw.trim();
        if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
        if (!endpoint.includes('/chat/completions')) {
            if (!endpoint.includes('/v1')) endpoint += '/v1';
            endpoint += '/chat/completions';
        }
        return { endpoint, apiKey, model, temperature };
    }

    async function requestAIWorkStory(roleId, jobName, avoidTexts) {
        const cfg = getWorkStoryApiConfig();
        if (!cfg) return null;
        const meta = getRolePromptMeta(roleId);
        const systemPrompt = [
            '你是一个“打工生活感便签”生成器。',
            '只输出一行纯文本，不要代码块，不要多余解释。',
            '必须严格遵守：一段话|[画面描述：...] 的格式。',
            '内容要充满呼吸感，描写具体的感官瞬间，字数在 100 字左右。'
        ].join('\n');
        const userPrompt = buildWorkStoryPrompt(meta, jobName, avoidTexts);
        let resp;
        try {
            resp = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + cfg.apiKey
                },
                body: JSON.stringify({
                    model: cfg.model,
                    temperature: 0.9, // 提高随机性
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                })
            });
        } catch (e) {
            return null;
        }
        if (!resp || !resp.ok) return null;
        let json;
        try {
            json = await resp.json();
        } catch (e) {
            return null;
        }
        const content = json && json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : '';
        return content ? String(content).trim() : null;
    }

    function pickTone(meta) {
        const t = (meta.speakingStyle || meta.persona || '').toString();
        const rules = [
            { keys: ['傲娇', '别扭', '嘴硬'], tone: 'tsundere' },
            { keys: ['活泼', '元气', '开朗', '爱笑'], tone: 'lively' },
            { keys: ['温柔', '治愈', '软', '安抚'], tone: 'gentle' },
            { keys: ['沉稳', '冷静', '理性', '克制'], tone: 'calm' },
            { keys: ['毒舌', '刻薄', '吐槽'], tone: 'snarky' }
        ];
        for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            for (let k = 0; k < r.keys.length; k++) {
                if (t.indexOf(r.keys[k]) !== -1) return r.tone;
            }
        }
        return 'calm';
    }

    function mockWorkStory(roleId, jobName, jobId) {
        const meta = getRolePromptMeta(roleId);
        const tone = pickTone(meta);
        const seed = hashToPositiveInt(roleId + '|' + jobId + '|' + Date.now().toString(36) + '|' + Math.random().toString(36).slice(2));
        const rand = function (arr) { return arr[seed % arr.length]; };
        const timeList = ['清晨', '午后', '傍晚', '深夜'];
        const time = timeList[seed % timeList.length];

        const sensoryByJob = {
            coffee: { place: '吧台', sensory: ['指尖蹭到的一点咖啡渍', '机器排出的温热蒸汽', '冰块碰撞杯壁的清脆声'], details: ['一个被遗落的领带夹', '窗外渐渐落下的细雨', '还没擦干的木质纹理'] },
            barista: { place: '手冲台', sensory: ['热水穿透粉层时的闷响', '鼻端萦绕的浓郁焦香', '滤纸边缘渗出的水痕'], details: ['水流拉出的纤细白线', '计时器跳动的红色数字', '手冲壶柄上传来的余温'] },
            bakery: { place: '烤炉旁', sensory: ['刚出炉面包那股微甜的麦香', '面粉落在围裙上的轻盈', '烤箱门打开时扑面的热浪'], details: ['面团表面细微的裂纹', '托盘在台面上滑过的声响', '最后一只还没卖掉的羊角包'] },
            dessert: { place: '展示柜前', sensory: ['奶油打发时的绵密触感', '草莓顶端渗出的透明糖浆', '冷柜门缝里漏出的一丝凉气'], details: ['裱花袋挤出的一个小尖角', '勺子在瓷碟上轻敲的声音', '橱窗玻璃上被哈出的雾气'] },
            bookstore: { place: '书架间', sensory: ['旧书页翻动时陈旧的木浆味', '纸张边缘划过指尖的轻微痛感', '阳光穿透落地窗的静谧'], details: ['书架角落积落的一层薄灰', '一本被插反了位置的杂志', '夹在诗集里的半截干花'] }
        };

        const def = { place: '现场', sensory: ['忙碌后手心的微微汗水', '空气里尘埃舞动的轨迹', '远处街道隐约的嘈杂'], details: ['一件被整理好的杂物', '一盏昏黄的灯在角落亮着', '笔尖在纸上滑过的触感'] };
        const scene = sensoryByJob[jobId] || def;

        const sensory = rand(scene.sensory);
        const detail = rand(scene.details);
        const place = scene.place;

        const toneTpl = {
            calm: [
                `${time}${jobName}收工时，${place}只剩下${sensory}。我看着${detail}，那一瞬间的安静让时间都慢了下来。空气里的味道逐渐淡去，这种无需言语的时刻，总让人觉得踏实。`,
                `忙完${jobName}，窗外的天色已经完全暗了。${sensory}还残留在记忆里，而${detail}就在手边。我没急着走，只是在那儿多站了一会儿，听着外面的风声，觉得这种平淡也挺好。`
            ],
            gentle: [
                `${time}的${place}，${sensory}真的很温柔。我轻轻收起${detail}，想起刚才忙碌时的点点滴滴。这种被细小瞬间填满的感觉，像是一股温热的暖流，静静地流过心底。`,
                `做完${jobName}，空气里还留着${sensory}。我把${detail}抚平，动作慢得连自己都觉得不可思议。世界好像突然变得很轻，连呼吸都带着一点甜甜的、安心的味道。`
            ],
            lively: [
                `嘿！${time}${jobName}真的太有意思啦！${sensory}突然蹦了出来，我盯着${detail}发了好久的呆，直到自己笑出声来。这种充满生命力的感觉，真的让人想在${place}转个圈呢！`,
                `收工啦收工啦！刚才在${place}，${sensory}简直是神来之笔。我看到${detail}的时候，脑子里全是奇妙的念头。空气里都是自由的气息，简直太棒了！`
            ],
            tsundere: [
                `哼，别多想，我只是忙完${jobName}刚好看到${sensory}而已。${place}的${detail}也太显眼了，我只是顺手把它弄好，才没有觉得这种感觉还不错。真的是，这种事有什么好记的。`,
                `啧，收工时的${sensory}真是多余。我盯着${detail}看了半天，只是在想怎么处理这种无聊的琐事。哼，这种安静的时刻……虽然不讨厌，但也别指望我夸它。`
            ]
        };

        const pool = toneTpl[tone] || toneTpl.calm;
        const story = rand(pool);
        const visual = `[画面描述：${time}的${place}，${sensory}的细节特写，背景是模糊的${detail}]`;
        return { story: truncateByCodePoints(story, 150), visual: visual };
    }

    async function generateWorkStory(roleId, jobId) {
        const d = ensureRoleWorkData(roleId);
        const jobName = (d && d.currentJob && d.currentJob.name) ? String(d.currentJob.name) : (function () {
            const j = getJobById(jobId);
            return j && j.name ? String(j.name) : '打工';
        })();

        const db = loadStoryDb();
        const bucket = ensureStoryBucket(db, roleId, jobId);
        const roleHashes = db.roles[roleId] && Array.isArray(db.roles[roleId].allHashes) ? db.roles[roleId].allHashes : [];
        const avoidTexts = bucket.recent.slice(-10);

        const attemptMax = 8;
        for (let attempt = 0; attempt < attemptMax; attempt++) {
            let raw = await requestAIWorkStory(roleId, jobName, avoidTexts);
            let out = raw ? normalizeStoryOutput(raw) : null;
            if (!out || !out.story) out = mockWorkStory(roleId, jobName, jobId);

            const story = truncateByCodePoints(String(out.story || '').trim(), 150);
            const visual = String(out.visual || '').trim() || '[画面描述：一张模糊但温柔的瞬间]';
            const packed = story + '|' + visual;
            if (!story || hasBlockedPhrases(packed)) continue;

            const h = hashStory(story, visual);
            if (bucket.hashes.indexOf(h) !== -1) continue;
            if (roleHashes.indexOf(h) !== -1) continue;

            bucket.hashes.push(h);
            roleHashes.push(h);
            bucket.recent.push(packed);
            bucket.hashes = bucket.hashes.slice(-200);
            bucket.recent = bucket.recent.slice(-12);
            db.roles[roleId].allHashes = roleHashes.slice(-400);
            saveStoryDb(db);
            return { story: story, visual: visual };
        }

        const fallback = mockWorkStory(roleId, jobName, jobId);
        const finalHash = hashStory(fallback.story, fallback.visual);
        bucket.hashes.push(finalHash);
        if (db.roles[roleId] && Array.isArray(db.roles[roleId].allHashes)) db.roles[roleId].allHashes.push(finalHash);
        bucket.recent.push(fallback.story + '|' + fallback.visual);
        bucket.hashes = bucket.hashes.slice(-200);
        bucket.recent = bucket.recent.slice(-12);
        if (db.roles[roleId] && Array.isArray(db.roles[roleId].allHashes)) db.roles[roleId].allHashes = db.roles[roleId].allHashes.slice(-400);
        saveStoryDb(db);
        return fallback;
    }

    function setNoteLoading(loading) {
        const loadingEl = document.getElementById('work-note-loading');
        const acceptBtn = document.getElementById('work-note-accept');
        if (loadingEl) loadingEl.style.display = loading ? 'flex' : 'none';
        if (acceptBtn) acceptBtn.disabled = !!loading;
    }

    async function openNote(roleId) {
        const d = ensureRoleWorkData(roleId);
        if (!d || d.status !== 'finished' || !d.currentJob) return;
        runtime.noteRoleId = roleId;
        const reqToken = ++runtime.noteReqToken;
        const textEl = document.getElementById('work-note-text');
        const photoTextEl = document.getElementById('work-note-photo-text');
        const amountEl = document.getElementById('work-note-amount');
        const mask = document.getElementById('work-note-mask');
        const reward = clampNumber(d.currentJob.reward, 0, 999999999, 0);
        if (textEl) textEl.textContent = '';
        if (photoTextEl) photoTextEl.textContent = '';
        if (amountEl) amountEl.textContent = '+ ¥' + String(reward);
        if (mask) mask.style.display = 'flex';
        setNoteLoading(true);

        let out = null;
        try {
            out = await generateWorkStory(roleId, d.currentJob.id);
        } catch (e) {
            out = null;
        }
        if (runtime.noteReqToken !== reqToken) return;

        const story = out && out.story ? out.story : noteTextForJob(d.currentJob);
        const visual = out && out.visual ? out.visual : '[画面描述：一张模糊但温柔的瞬间]';

        if (textEl) textEl.textContent = story;
        if (photoTextEl) photoTextEl.textContent = visual.replace(/^\[|\]$/g, '').trim();
        setNoteLoading(false);
    }

    function closeNote() {
        runtime.noteRoleId = '';
        runtime.noteReqToken += 1;
        const mask = document.getElementById('work-note-mask');
        if (mask) mask.style.display = 'none';
    }

    function appendChatMessage(roleId, text) {
        if (!roleId || !text) return;
        if (!window.chatData || typeof window.chatData !== 'object') window.chatData = {};
        if (!Array.isArray(window.chatData[roleId])) window.chatData[roleId] = [];
        const msg = {
            role: 'ai',
            content: String(text),
            type: 'text',
            timestamp: Date.now()
        };
        window.chatData[roleId].push(msg);
        if (window.currentChatRole === roleId && typeof window.appendMessageToDOM === 'function') {
            try { window.appendMessageToDOM(msg); } catch (e) { }
        }
        if (typeof window.saveData === 'function') {
            try { window.saveData(); } catch (e) { }
        }
    }

    function acceptNote() {
        const roleId = runtime.noteRoleId;
        if (!roleId) return;
        const d = ensureRoleWorkData(roleId);
        if (!d || d.status !== 'finished' || !d.currentJob) {
            closeNote();
            return;
        }
        const job = d.currentJob;
        const reward = clampNumber(job.reward, 0, 999999999, 0);
        const noteText = (function () {
            const el = document.getElementById('work-note-text');
            return el ? String(el.textContent || '').trim() : '';
        })();

        closeNote();

        d.status = 'idle';
        d.currentJob = null;
        d.startTime = 0;
        d.duration = 0;
        d.stamina = clampNumber(d.stamina, 0, 100, 100);
        d.stamina = Math.max(0, d.stamina - 20);
        ensureStore().roles[roleId] = d;
        saveStore();

        if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
            const title = getDisplayName(roleId) + ' · ' + (job.name || '打工') + '收入';
            try { window.Wallet.addTransaction('income', title, reward, 'work'); } catch (e) { }
        }

        // if (noteText) appendChatMessage(roleId, noteText); // 🛑 删除：不再同步到聊天框

        renderWorkGrid();
    }

    function ensureEventBindings() {
        const mask = document.getElementById('work-sheet-mask');
        if (mask && !mask.__workBound) {
            mask.__workBound = true;
            mask.addEventListener('click', function (e) {
                if (e && e.target === mask) closeSheet();
            });
        }

        const autoBtn = document.getElementById('work-btn-auto');
        if (autoBtn && !autoBtn.__workBound) {
            autoBtn.__workBound = true;
            autoBtn.addEventListener('click', function () {
                const roleId = runtime.sheetRoleId;
                if (!roleId) return;
                autoPickAndStart(roleId);
            });
        }

        const manualBtn = document.getElementById('work-btn-manual');
        if (manualBtn && !manualBtn.__workBound) {
            manualBtn.__workBound = true;
            manualBtn.addEventListener('click', function () {
                renderSheetJobList(true);
                const wrap = document.getElementById('work-job-list-wrap');
                if (wrap) wrap.style.display = 'block';
            });
        }

        const noteMask = document.getElementById('work-note-mask');
        if (noteMask && !noteMask.__workBound) {
            noteMask.__workBound = true;
            noteMask.addEventListener('click', function (e) {
                if (e && e.target === noteMask) closeNote();
            });
        }

        const acceptBtn = document.getElementById('work-note-accept');
        if (acceptBtn && !acceptBtn.__workBound) {
            acceptBtn.__workBound = true;
            acceptBtn.addEventListener('click', acceptNote);
        }

        const tabBar = document.querySelector('.wallet-tab-bar');
        if (tabBar && !tabBar.__workBound) {
            tabBar.__workBound = true;
            tabBar.addEventListener('click', function (e) {
                const target = e && e.target ? e.target : null;
                if (!target) return;
                const item = target.closest ? target.closest('.wallet-tab-item') : null;
                if (!item) return;
                const tab = item.getAttribute('data-wallet-tab') || '';
                if (!tab) return;
                setWalletTab(tab);
            });
        }
    }

    function startTicker() {
        if (runtime.tickerId) return;
        runtime.tickerId = setInterval(function () {
            if (!getWalletVisible()) return;
            if (runtime.activeTab !== 'work') return;
            tickWorkTimers();
        }, 1000);
    }

    function init() {
        ensureStore();
        ensureEventBindings();
        startTicker();
        setWalletTab('home');
        try {
            const roleIds = getRoleIds();
            roleIds.forEach(function (id) { ensureRoleWorkData(id); });
            saveStore();
        } catch (e) { }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.WorkSystem = {
        render: renderWorkGrid,
        openSheet: openSheet
    };
})();
