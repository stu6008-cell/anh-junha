        function enhanceRate(star) { return Math.max(0.3, 1 - star * 0.05); } // 스타포스 성공 확률
        function starforceCost(star) { return 50 + star * star * 8; }         // 스타포스 코인 비용
        function dismantleValue(it) { return Math.round(RARITIES[it.rarity].mult * 30 + (it.star || 0) * 25 + (it.upg || 0) * 10); }

        // 잠재능력 옵션 풀 (장비에 추가 옵션 부여)
        const POTENTIAL_POOL = [
            { key: 'atkPct',   label: '공격력',         min: 3,  max: 12 },
            { key: 'defPct',   label: '방어력',         min: 3,  max: 12 },
            { key: 'bossPct',  label: '보스 공격력',    min: 10, max: 35 },
            { key: 'critRate', label: '크리티컬 확률',  min: 3,  max: 10 },
            { key: 'critDmg',  label: '크리티컬 데미지', min: 5,  max: 20 }
        ];
        function potentialLines(rarity) { return rarity >= 4 ? 3 : (rarity >= 2 ? 2 : 1); }
        function rollPotential(rarity) {
            const n = potentialLines(rarity);
            const lines = [];
            for (let i = 0; i < n; i++) {
                const o = POTENTIAL_POOL[Math.floor(Math.random() * POTENTIAL_POOL.length)];
                lines.push({ key: o.key, label: o.label, val: o.min + Math.floor(Math.random() * (o.max - o.min + 1)) });
            }
            return lines;
        }
        function potLabel(p) { return p.key === 'noteDmg' ? '음표공격 데미지 2배' : `${p.label} +${p.val}%`; }

        // 화면 안내 메시지 (캐릭터 위)
        function floatMsg(text, color) {
            game.damageText.push({ x: game.character.x, y: game.character.y - 60, text, alpha: 1, duration: 42, color: color || '#ffd700' });
            if (/부족|없음/.test(text)) sfx('error'); // 자원 부족/없음 메시지 → 에러음
        }

        // 가중치로 등급 추첨
        function rollRarity() {
            const total = RARITIES.reduce((s, r) => s + r.weight, 0);
            let r = Math.random() * total;
            for (let i = 0; i < RARITIES.length; i++) {
                r -= RARITIES[i].weight;
                if (r <= 0) return i;
            }
            return 0;
        }

        // 아이템 1개 생성
        function makeItem(cat, rarityIdx) {
            const base = ITEM_BASE[cat];
            const sub = rollSubTier();
            const mult = RARITIES[rarityIdx].mult * SUB_MULT[sub];
            const roll = 0.9 + Math.random() * 0.2; // ±10% 랜덤
            return {
                id: game.nextItemId++,
                cat,
                rarity: rarityIdx,
                sub,
                star: 0,           // 스타포스
                upg: 0,            // 주문서 강화 횟수
                potential: [],     // 잠재능력 옵션
                atk: Math.round(base.atk * mult * roll),
                def: Math.round(base.def * mult * roll)
            };
        }

        // 실제 스탯 (주문서 + 스타포스 포함)
        function itemAtk(it) { return Math.round((it.atk + (it.upg || 0) * UPG_STAT) * (1 + (it.star || 0) * STAR_PER)); }
        function itemDef(it) { return Math.round((it.def + (it.upg || 0) * UPG_STAT) * (1 + (it.star || 0) * STAR_PER)); }
        function itemPower(it) { return it ? itemAtk(it) + itemDef(it) : 0; }
        function getItemById(id) { return game.bag.find(i => i.id === id) || null; }

        // 한 번 뽑기 (minRarity 이상 보장 가능)
        function pullOnce(minRarity = 0) {
            const cat = ITEM_CATS[Math.floor(Math.random() * ITEM_CATS.length)];
            let rarity = rollRarity();
            if (rarity < minRarity) rarity = minRarity;
            return makeItem(cat, rarity);
        }

        // 가방에 추가 (가득 차면 장착 안 된 가장 약한 장비 자동 분해)
        function addToBag(item) {
            if (game.bag.length >= BAG_MAX) {
                const equippedIds = Object.values(game.equipped);
                let weakest = null;
                game.bag.forEach(i => {
                    if (equippedIds.includes(i.id)) return;
                    if (!weakest || itemPower(i) < itemPower(weakest)) weakest = i;
                });
                if (weakest) {
                    game.coins += dismantleValue(weakest);
                    game.bag = game.bag.filter(i => i.id !== weakest.id);
                }
            }
            game.bag.push(item);
        }

        // 더 강하면 자동 장착
        function autoEquipIfBetter(item) {
            const curId = game.equipped[item.cat];
            const cur = curId ? getItemById(curId) : null;
            if (!cur || itemPower(item) > itemPower(cur)) {
                game.equipped[item.cat] = item.id;
            }
        }

        // 장비 뽑기 실행 (count: 1 또는 10)
        function doPull(count) {
            const cost = count === 10 ? GACHA_COST.ten : GACHA_COST.single;
            if (game.coins < cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= cost;
            sfx('coin');

            const results = [];
            for (let i = 0; i < count; i++) {
                const guarantee = (count === 10 && i === count - 1 &&
                                   !results.some(r => r.rarity >= 1)) ? 1 : 0;
                const it = pullOnce(guarantee);
                addToBag(it);
                autoEquipIfBetter(it);
                results.push(it);
            }
            game.totalPulls = (game.totalPulls || 0) + count;
            game.selectedItemId = results.reduce((b, i) => itemPower(i) > itemPower(b) ? i : b, results[0]).id;
            game.bagPage = Math.max(0, Math.floor((game.bag.length - 1) / PER_PAGE)); // 새 장비 보이게 마지막 페이지
            saveProgress();
        }

        // 장착 (id로)
        function equipById(id) {
            const it = getItemById(id);
            if (!it) return;
            game.equipped[it.cat] = it.id;
            saveProgress();
        }

        // 주문서 구매 (코인 → 주문서 1개)
        function buyScroll() {
            if (game.coins < SCROLL_COST) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= SCROLL_COST;
            game.scrolls++;
            floatMsg('📜 주문서 +1'); sfx('coin');
            saveProgress();
        }

        // 큐브 구매 (코인 → 큐브 1개)
        function buyCube() {
            if (game.coins < CUBE_COST) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= CUBE_COST;
            game.cubes++;
            floatMsg('🔮 큐브 +1', '#b388ff'); sfx('coin');
            saveProgress();
        }

        // 주문서 강화 — 주문서 1개 소모, 능력치 증가 (최대 UPG_MAX회)
        function applyScroll(id) {
            const it = getItemById(id);
            if (!it) return;
            if ((it.upg || 0) >= UPG_MAX) { floatMsg('최대 주문서 강화!'); return; }
            if (game.scrolls < 1) { floatMsg('주문서 부족! (이벤트→상점)', '#ff6b6b'); return; }
            game.scrolls--;
            it.upg = (it.upg || 0) + 1;
            floatMsg(`📜 주문서 강화! (${it.upg}/${UPG_MAX})`);
            saveProgress();
        }

        // 스타포스 — 코인 소모, 성공 시 ★+1
        function starforce(id) {
            const it = getItemById(id);
            if (!it) return;
            const star = it.star || 0; // 버그수정: star undefined면 NaN 전파→코인 NaN 손상
            if (star >= MAX_STAR) { floatMsg('최대 스타포스!'); return; }
            const cost = starforceCost(star);
            if (game.coins < cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= cost;
            game.totalStarforce = (game.totalStarforce || 0) + 1;
            if (Math.random() < enhanceRate(star)) {
                it.star = star + 1;
                floatMsg(`⭐ 스타포스 성공! ★${it.star}`); sfx('levelup');
            } else {
                floatMsg('스타포스 실패…', '#ff6b6b'); sfx('error');
            }
            saveProgress();
        }

        // 잠재능력 재설정 — 큐브 1개 소모, 옵션 재추첨
        function rerollPotential(id) {
            const it = getItemById(id);
            if (!it) return;
            if (it.special === 'mike') { floatMsg('🎤 마이크는 잠재능력을 바꿀 수 없어요', '#ff9be3'); return; }
            if (game.cubes < 1) { floatMsg('큐브 부족! (이벤트→상점)', '#ff6b6b'); return; }
            game.cubes--;
            it.potential = rollPotential(it.rarity);
            floatMsg('🔮 잠재능력 재설정!', '#b388ff');
            saveProgress();
        }

        // 분해 — 코인 획득 후 제거 (장착 중이면 해제)
        function dismantleItem(id) {
            const it = getItemById(id);
            if (!it) return;
            const val = dismantleValue(it);
            game.coins += val;
            if (game.equipped[it.cat] === it.id) game.equipped[it.cat] = null;
            game.bag = game.bag.filter(i => i.id !== it.id);
            if (game.selectedItemId === it.id) game.selectedItemId = null;
            floatMsg(`분해 +${val.toLocaleString()}🪙`);
            saveProgress();
        }

        // 전체 판매 — 장착 중이 아닌 모든 장비를 분해해서 코인으로
        function dismantleAll() {
            const equippedIds = Object.values(game.equipped);
            let total = 0, n = 0;
            game.bag = game.bag.filter(it => {
                if (equippedIds.includes(it.id)) return true; // 장착 중인 건 보존
                total += dismantleValue(it);
                n++;
                return false;
            });
            if (n === 0) { floatMsg('판매할 장비 없음', '#aaa'); return; }
            game.coins += total;
            if (game.selectedItemId && !game.bag.some(i => i.id === game.selectedItemId)) {
                game.selectedItemId = null;
            }
            floatMsg(`💰 전체 판매 ${n}개 +${total.toLocaleString()}🪙`, '#ffd700');
            saveProgress();
        }

        // 장착 장비의 능력치 합 (주문서 + 스타포스 포함)
        function getEquipBonus() {
            let attack = 0, defense = 0;
            ITEM_CATS.forEach(cat => {
                const it = game.equipped[cat] ? getItemById(game.equipped[cat]) : null;
                if (it) { attack += itemAtk(it); defense += itemDef(it); }
            });
            return { attack, defense };
        }

        // 🧩 장비 세트효과: 같은 등급 장비를 2개 이상 장착하면 공/방 % 보너스 (등급·개수 비례)
        function setBonus() {
            const counts = {};
            ITEM_CATS.forEach(cat => {
                const it = game.equipped[cat] ? getItemById(game.equipped[cat]) : null;
                if (it) counts[it.rarity] = (counts[it.rarity] || 0) + 1;
            });
            let pct = 0;
            for (const r in counts) {
                const c = counts[r];
                if (c >= 2) pct += (Number(r) + 1) * (c - 1) * 1.5; // 등급(1~6) × 초과개수 × 1.5%
            }
            return Math.round(pct);
        }

        // 장착 장비의 잠재능력 합
        function getPotentialBonus() {
            const b = { atkPct: 0, defPct: 0, bossPct: 0, critRate: 0, critDmg: 0 };
            ITEM_CATS.forEach(cat => {
                const it = game.equipped[cat] ? getItemById(game.equipped[cat]) : null;
                if (it && it.potential) it.potential.forEach(p => { if (b[p.key] !== undefined) b[p.key] += p.val; });
            });
            return b;
        }

        // === 스탯 캐싱: 매 프레임 한 번만 계산 (장비/보석/버프 바뀌면 invalidateStats로 재계산) ===
        // effAttack/effDefense/effMaxHp가 프레임당 수십 번 호출돼서, 캐시로 크롬북 등 저사양 렉을 줄임.
        const _statCache = { atk: null, def: null, maxHp: null };
        function invalidateStats() { _statCache.atk = null; _statCache.def = null; _statCache.maxHp = null; }

        // 장비 + 잠재(공/방 %) 포함 실제 공격력 / 방어력
        function effAttack() {
            if (_statCache.atk !== null) return _statCache.atk;
            const p = getPotentialBonus();
            return _statCache.atk = Math.round((game.character.stats.attack + getEquipBonus().attack) * (1 + (p.atkPct + gemBonus('attack') + passiveBonus('atkPct') + petStatBonus() + homeBonus('atk') + guildBonus('atk') + awaken2Bonus('atkPct') + medalBonus() + medalAbilityBonus('atkPct') + setBonus() + achBonus() + titleBonus('atk')) / 100) * (game.awakened ? AWAKEN_ATK_MULT : 1) * (game.awakened2 ? AWAKEN_ATK_MULT : 1) * (game.awakened3 ? AWAKEN_ATK_MULT : 1) * (game.awakened4 ? AWAKEN_ATK_MULT : 1));
        }
        function effDefense() {
            if (_statCache.def !== null) return _statCache.def;
            const p = getPotentialBonus();
            return _statCache.def = Math.round((game.character.stats.defense + getEquipBonus().defense) * (1 + (p.defPct + gemBonus('defense') + passiveBonus('defPct') + petStatBonus() + homeBonus('def') + guildBonus('def') + awaken2Bonus('defPct') + medalBonus() + medalAbilityBonus('defPct') + setBonus() + titleBonus('def')) / 100));
        }

        // === 🏅 도전과제 (달성 시 영구 공격력 % 보너스) ===
        const ACHIEVEMENTS = [
            { key: 'kill100',   name: '사냥 입문',     desc: '몬스터 100마리 처치',        atk: 2,  check: () => (game.totalKills || 0) >= 100 },
            { key: 'kill1000',  name: '사냥꾼',        desc: '몬스터 1,000마리 처치',      atk: 3,  check: () => (game.totalKills || 0) >= 1000 },
            { key: 'kill10000', name: '학살자',        desc: '몬스터 10,000마리 처치',     atk: 5,  check: () => (game.totalKills || 0) >= 10000 },
            { key: 'boss50',    name: '보스 헌터',     desc: '보스 50회 처치',             atk: 3,  check: () => (game.bossKills || 0) >= 50 },
            { key: 'boss500',   name: '보스 군주',     desc: '보스 500회 처치',            atk: 5,  check: () => (game.bossKills || 0) >= 500 },
            { key: 'server10',  name: '서버의 적',     desc: '서버보스 10회 처치',         atk: 5,  check: () => (game.serverBossKills || 0) >= 10 },
            { key: 'star100',   name: '강화의 길',     desc: '스타포스 누적 100회',        atk: 3,  check: () => (game.totalStarforce || 0) >= 100 },
            { key: 'pull500',   name: '뽑기 중독',     desc: '장비 뽑기 500회',            atk: 3,  check: () => (game.totalPulls || 0) >= 500 },
            { key: 'attend7',   name: '성실함',        desc: '7일 연속 출석',              atk: 3,  check: () => (game.attendStreak || 0) >= 7 },
            { key: 'dmg1m',     name: '한 방의 미학',  desc: '단일 데미지 1,000,000 달성', atk: 5,  check: () => (game.maxHit || 0) >= 1000000 }
        ];
        function achBonus() { let s = 0; ACHIEVEMENTS.forEach(a => { if (game.achClaimed.includes(a.key)) s += a.atk; }); return s; }
        function claimAch(key) {
            const a = ACHIEVEMENTS.find(x => x.key === key);
            if (!a || game.achClaimed.includes(key) || !a.check()) return;
            game.achClaimed.push(key);
            floatMsg(`🏅 도전과제 [${a.name}] 달성! 공격력 +${a.atk}%`, '#ffd166');
            saveProgress();
        }

        // === 🏷️ 칭호 시스템 (조건 달성 시 자동 획득, 메뉴에서 장착 → 머리 위/랭킹 표시) ===
        // god(세계관 최강자)는 레벨 50,000 — 사실상 전설의 증표.
        // atk/def/hp = 장착 시 영구 % 보너스 (effAttack/effDefense/effMaxHp 에 합산). 강한 칭호일수록 큼 → 모으는 동기.
        const TITLES = [
            { key: 'beginner', name: '초보 모험가',   color: '#bdbdbd', desc: '기본 칭호',              cond: () => true },
            { key: 'lv100',    name: '백렙 돌파',     color: '#7fd8ff', desc: '레벨 100 달성',          atk: 3,                  cond: () => game.character.stats.level >= 100 },
            { key: 'lv1000',   name: '천렙 강자',     color: '#9b7bff', desc: '레벨 1,000 달성',        atk: 6,           hp: 5,  cond: () => game.character.stats.level >= 1000 },
            { key: 'tower50',  name: '탑의 도전자',   color: '#b388ff', desc: '무한의 탑 50층 도달',    atk: 5,  def: 5,         cond: () => (game.towerBest || 0) >= 50 },
            { key: 'tower100', name: '탑의 지배자',   color: '#ff9be0', desc: '무한의 탑 100층 도달',   atk: 8,  def: 8,         cond: () => (game.towerBest || 0) >= 100 },
            { key: 'boss500',  name: '보스 학살자',   color: '#ff6b6b', desc: '보스 500회 처치',        atk: 10,                 cond: () => (game.bossKills || 0) >= 500 },
            { key: 'server10', name: '서버의 공포',   color: '#ff5252', desc: '서버보스 10회 처치',     atk: 10,          hp: 10, cond: () => (game.serverBossKills || 0) >= 10 },
            { key: 'god',      name: '세계관 최강자', color: '#ffd700', desc: '레벨 50,000 달성 — 전설의 증표', atk: 30, def: 30, hp: 30, glow: true, cond: () => game.character.stats.level >= 50000 },
            // 🌍 월드보스 보물지기 처치 보상으로만 획득(조건 자동 X) — cond는 보유 여부로
            { key: 'wbslayer', name: '서버 토벌자',   color: '#ff8a3d', desc: '월드보스 「고대 보물지기」 토벌', atk: 15, def: 15, hp: 15, cond: () => (game.titlesOwned || []).includes('wbslayer') }
        ];
        function titleDef(key) { return TITLES.find(t => t.key === key) || TITLES[0]; }
        function equippedTitleDef() { return titleDef(game.titleEquipped); }
        function titleBonus(stat) { const t = equippedTitleDef(); return (t && t[stat]) || 0; } // 장착 칭호의 스탯 % 보너스
        // 조건 충족한 칭호를 자동 지급 (레벨업/탑/보스 처치 시 호출)
        function checkTitles() {
            if (!Array.isArray(game.titlesOwned)) game.titlesOwned = ['beginner'];
            TITLES.forEach(t => {
                if (!game.titlesOwned.includes(t.key) && t.cond()) {
                    game.titlesOwned.push(t.key);
                    floatMsg(`🏷️ 칭호 획득! [${t.name}]`, t.color);
                    if (t.key === 'god') floatMsg('👑 당신은 이제 세계관 최강자입니다!', '#ffd700');
                    sfx('levelup');
                }
            });
        }
        function setTitle(key) {
            if (!game.titlesOwned.includes(key)) return;
            game.titleEquipped = key;
            invalidateStats(); // 칭호 스탯 보너스 즉시 반영
            sfx('coin');
            saveProgress();
        }

        // === 보석 헬퍼/로직 ===
        // 장착한 보석들의 같은 효과 합계 (%)
        function gemBonus(typeKey) {
            let sum = 0;
            game.equippedGems.forEach(g => {
                if (g.type === typeKey) sum += gemStrength(g.grade) * GEM_TYPE_MAP[typeKey].perStr;
            });
            return sum;
        }
        // 보석 포함 최대 체력
        function effMaxHp() {
            if (_statCache.maxHp !== null) return _statCache.maxHp;
            return _statCache.maxHp = Math.round(game.character.stats.maxHp * (1 + (gemBonus('hp') + homeBonus('hp') + guildBonus('hp') + medalAbilityBonus('hpPct') + titleBonus('hp')) / 100));
        }
        // === 길드 강화 (코인) — 마이홈처럼 레벨당 % 보너스 (atk/def/hp) ===
        const GUILD_UP_PCT = 6;       // 레벨당 +6%
        const GUILD_UP_BASE = 8000;   // 강화 기본 비용
        function guildBonus(stat) { return (game.guildUpgrade[stat] || 0) * GUILD_UP_PCT; }
        function guildUpgradeCost(stat) { return ((game.guildUpgrade[stat] || 0) + 1) * GUILD_UP_BASE; }
        // 길드 공유 강화: 서버에 레벨 +1 요청 → 성공 시 코인 차감(모든 길드원이 보너스 공유)
        let _guildUpgrading = false;
        function upgradeGuildStat(stat) {
            if (!game.guildName) { floatMsg('길드에 먼저 가입하세요', '#ff6b6b'); return; }
            if (_guildUpgrading) return;
            const cost = guildUpgradeCost(stat);
            if (game.coins < cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            _guildUpgrading = true;
            guildPost({ guild: 'upgrade', name: game.guildName, stat }).then(res => {
                _guildUpgrading = false;
                if (res && res.ok) {
                    game.coins -= cost;
                    if (res.upgrades) game.guildUpgrade = { atk: res.upgrades.atk || 0, def: res.upgrades.def || 0, hp: res.upgrades.hp || 0 };
                    const label = { hp: '체력', atk: '공격력', def: '방어력' }[stat];
                    floatMsg(`🏰 길드 ${label} 강화 Lv.${game.guildUpgrade[stat]}! (길드 공유 +${guildBonus(stat)}%)`, '#ffd700');
                    saveProgress();
                } else floatMsg('강화 실패 (길드 확인)', '#ff6b6b');
            }).catch(() => { _guildUpgrading = false; floatMsg('서버 연결 실패', '#ff6b6b'); });
        }
        // 1000레벨마다 획득 경험치가 2배씩 누적 (1000→2배, 2000→4배, 3000→8배) — 최대 8배 상한
        const LEVEL_EXP_BOOST_FROM = 1000;
        const LEVEL_EXP_BOOST_MAX = 8; // 경험치 폭주 방지: 최대 8배까지만
        function expGainMult() {
            return Math.min(LEVEL_EXP_BOOST_MAX, Math.pow(2, Math.floor(game.character.stats.level / LEVEL_EXP_BOOST_FROM)));
        }
        function gemCount(type, grade) { return (game.gemInv[type] && game.gemInv[type][grade]) || 0; }
        function addGem(type, grade, n = 1) {
            if (!game.gemInv[type]) game.gemInv[type] = {};
            game.gemInv[type][grade] = (game.gemInv[type][grade] || 0) + n;
        }
        function removeGem(type, grade, n = 1) {
            if (!game.gemInv[type]) return;
            game.gemInv[type][grade] = Math.max(0, (game.gemInv[type][grade] || 0) - n);
        }
        // 코인으로 보석 뽑기 (전부 9등급)
        function pullGem(count) {
            const cost = GEM_GACHA_COST * count;
            if (game.coins < cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= cost;
            for (let i = 0; i < count; i++) {
                const t = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
                addGem(t.key, GEM_START_GRADE, 1);
            }
            game.totalGemPulls = (game.totalGemPulls || 0) + count;
            floatMsg(`💎 보석 ${count}개 획득! (9등급)`, '#18ffff');
            saveProgress();
        }
        // 같은 보석 2개 → 한 등급 위로 합성
        function mergeGem(type, grade) {
            if (grade <= GEM_MAX_GRADE) { floatMsg('이미 최고 등급!', '#ffd700'); return; }
            if (gemCount(type, grade) < 2) { floatMsg('같은 보석 2개 필요!', '#ff6b6b'); return; }
            removeGem(type, grade, 2);
            addGem(type, grade - 1, 1);
            floatMsg(`💎 합성! ${grade}등급 → ${grade - 1}등급`, gemColor(grade - 1));
            saveProgress();
        }
        // 보석 장착 / 해제
        function equipGem(type, grade) {
            if (game.equippedGems.length >= GEM_MAX_EQUIP) { floatMsg('장착 칸 가득! (최대 5)', '#ff6b6b'); return; }
            if (gemCount(type, grade) < 1) return;
            removeGem(type, grade, 1);
            game.equippedGems.push({ type, grade });
            floatMsg('💎 보석 장착!', '#18ffff');
            saveProgress();
        }
        function unequipGem(index) {
            const g = game.equippedGems[index];
            if (!g) return;
            addGem(g.type, g.grade, 1);
            game.equippedGems.splice(index, 1);
            saveProgress();
        }
        // 사망 처리 — 코인 10% 잃고 풀피로 부활 (무적 중엔 무시 → 연쇄 사망 방지)
        function playerDie() {
            if (game.invuln > 0) return;
            const lost = Math.floor(game.coins * 0.1);
            game.coins -= lost;
            game.character.stats.hp = effMaxHp();
            game.character.stats.mana = game.character.stats.maxMana;
            game.invuln = 90; // 1.5초 무적
            game.deathMsg = 150;          // 사망 배너 2.5초
            game.deathLostCoins = lost;
            sfx('boss'); // 사망 효과음(묵직한 톤)
            floatMsg(`💀 사망! 코인 -${lost.toLocaleString()} (10%)`, '#ff6b6b');
            saveProgress();
        }

        // 전투 보정: 보스 추가뎀 + 크리티컬 (raw 데미지 → 최종 데미지/크리 여부)
        function applyCombatMods(raw, target) {
            const p = getPotentialBonus();
            let dmg = raw;
            if (target && (target.isBoss || target.isServerBoss)) dmg *= (1 + (p.bossPct + passiveBonus('bossPct') + medalAbilityBonus('bossPct')) / 100);
            let crit = false;
            if (Math.random() * 100 < (5 + p.critRate + passiveBonus('critRate') + awaken2Bonus('critRate') + medalAbilityBonus('critRate'))) {
                crit = true;
                dmg *= (1.5 + (p.critDmg + passiveBonus('critDmg') + awaken2Bonus('critDmg') + medalAbilityBonus('critDmg')) / 100);
            }
            return { dmg: Math.max(1, Math.round(dmg)), crit };
        }

        // === 펫 시스템 ===
        // 펫 강화 (코인 소모)
        // 물약 구매
        function buyHpPotion() {
            if (game.coins < HP_POTION.cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= HP_POTION.cost; game.hpPotions++;
            floatMsg('🧪 체력 물약 +1', '#ff6b6b'); sfx('coin'); saveProgress();
        }
        function buyMpPotion() {
            if (game.coins < MP_POTION.cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= MP_POTION.cost; game.mpPotions++;
            floatMsg('🔷 마나 물약 +1', '#0099ff'); sfx('coin'); saveProgress();
        }
        // 물약 사용
        function useHpPotion() {
            const s = game.character.stats;
            if (game.hpPotions < 1) { floatMsg('체력 물약 없음!', '#ff6b6b'); return; }
            const cap = effMaxHp();
            if (s.hp >= cap) { floatMsg('체력 가득!', '#aaa'); return; }
            game.hpPotions--;
            const heal = Math.round(cap * HP_POTION.heal);
            s.hp = Math.min(cap, s.hp + heal);
            floatMsg(`🧪 +${heal.toLocaleString()} HP`, '#2ecc71');
        }
        function useMpPotion() {
            const s = game.character.stats;
            if (game.mpPotions < 1) { floatMsg('마나 물약 없음!', '#ff6b6b'); return; }
            if (s.mana >= s.maxMana) { floatMsg('마나 가득!', '#aaa'); return; }
            game.mpPotions--;
            const heal = Math.round(s.maxMana * MP_POTION.heal);
            s.mana = Math.min(s.maxMana, s.mana + heal);
            floatMsg(`🔷 +${heal.toLocaleString()} MP`, '#3498db');
        }

        // 펫 강화서 구매 (코인 → 펫 강화서 1개)
        function buyPetScroll() {
            if (game.coins < PET_SCROLL_COST) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= PET_SCROLL_COST;
            game.petScrolls++;
            floatMsg('🦴 펫 강화서 +1', '#5dade2');
            saveProgress();
        }

        // 펫 강화/등급업 (펫 강화서 소모) — 한 버튼으로 상황에 맞게
        function petAction() {
            const pet = game.pet;
            // 최대 강화 전: 펫 강화서 1개로 강화
            if (pet.level < PET_MAX_LEVEL) {
                if (game.petScrolls < 1) { floatMsg('펫 강화서 부족! (이벤트→상점)', '#ff6b6b'); return; }
                game.petScrolls--;
                pet.level++;
                floatMsg(`🐲 펫 강화! +${pet.level}`, '#5dade2');
                saveProgress();
                return;
            }
            // 최대 강화 상태: 등급 업 (다음 등급 해금)
            if (pet.rarity >= RARITIES.length - 1) { floatMsg('이미 최고 등급!', '#ffd700'); return; }
            const cost = petPromoteCost();
            if (game.petScrolls < cost) { floatMsg(`펫 강화서 ${cost}개 필요!`, '#ff6b6b'); return; }
            game.petScrolls -= cost;
            pet.rarity++;
            pet.level = 0;
            floatMsg(`⭐ 펫 등급 상승 → ${RARITIES[pet.rarity].name}!`, RARITIES[pet.rarity].color);
            saveProgress();
        }

        // 펫 갱신: 추적 이동 + 자동 공격 + 체력/마나 회복
        function updatePet() {
            const pet = game.pet;
            const char = game.character;

            // 캐릭터 뒤쪽 위로 부드럽게 따라오기
            const targetX = char.x + (char.facing === 'right' ? -55 : 55);
            const targetY = char.y - 60;
            pet.x += (targetX - pet.x) * 0.12;
            pet.y += (targetY - pet.y) * 0.12;

            // 자동 공격
            pet.attackCounter++;
            if (pet.attackCounter >= petInterval()) {
                let closest = null, cd = Infinity;
                game.monsters.forEach(m => {
                    const d = Math.hypot(m.x - pet.x, m.y - pet.y);
                    if (d < PET_RANGE && d < cd) { closest = m; cd = d; }
                });
                if (closest) {
                    pet.attackCounter = 0;
                    const raw = effAttack() * petDamageRatio();
                    const r = applyCombatMods(raw, closest);
                    // 펫 공격 이펙트 (작은 파랑 원)
                    game.skillEffects.push({
                        x: closest.x, y: closest.y, radius: 0, maxRadius: 36,
                        duration: 14, maxDuration: 14, color: '#5dade2', type: 'single'
                    });
                    damageMonster(closest, r.dmg, r.crit ? '#ff5252' : '#5dade2', r.crit);
                }
            }

            // 체력/마나 자동 회복 (1초마다, 펫 강함 비례)
            pet.regenCounter++;
            if (pet.regenCounter >= 60) {
                pet.regenCounter = 0;
                const cap = effMaxHp();
                const rg = petTypeDef().regen;
                const hpHeal = Math.max(1, Math.round(cap * 0.02 * petPower() * rg));
                const mpHeal = Math.max(1, Math.round(char.stats.maxMana * 0.03 * petPower() * rg));
                if (char.stats.hp < cap) {
                    char.stats.hp = Math.min(cap, char.stats.hp + hpHeal);
                }
                if (char.stats.mana < char.stats.maxMana) {
                    char.stats.mana = Math.min(char.stats.maxMana, char.stats.mana + mpHeal);
                }
            }
        }

        // 펫 그리기
        function drawPet() {
            const pet = game.pet;
            const screenX = pet.x - game.camera.x;
            const screenY = pet.y;
            const r = RARITIES[pet.rarity];
            const bob = Math.sin(Date.now() / 300) * 4;

            // 등급 색 오라
            ctx.fillStyle = `rgba(${hexToRgb(r.color)}, 0.25)`;
            ctx.beginPath();
            ctx.arc(screenX, screenY + bob, 20, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(petTypeDef().icon, screenX, screenY + bob);

            // 등급 + 강화 표시
            ctx.fillStyle = r.color;
            ctx.font = 'bold 10px Arial';
            ctx.fillText(`${r.name}${pet.level ? ' +' + pet.level : ''}`, screenX, screenY + bob - 22);
        }

        // === 자연의 정령 (모든 캐릭터 공용 소환 스킬, G키) — 펫처럼 자동공격, 60초 지속 ===
        const SPIRIT_DURATION = 60 * 60;   // 60초
        const SPIRIT_COOLDOWN = 30 * 60;   // 쿨다운 30초
        const SPIRIT_MANA = 1000;          // 마나 1000
        const SPIRIT_DMG_RATIO = 1.5;      // 정령 데미지 = 공격력 × 1.5
        const SPIRIT_INTERVAL = 22;        // 공격 간격(프레임)
        const SPIRIT_RANGE = 380;          // 정령 사정거리
        function summonSpirit() {
            if (game.inTown || game.naming) return;
            if (!game.awakened2) { floatMsg('🌟 2차 각성 후에 정령을 소환할 수 있어요!', '#ff80ab'); return; }
            if (game.spiritTimer > 0) { floatMsg('🧚 정령이 이미 함께해요!', '#9be37d'); return; }
            if (game.spiritCooldown > 0) { floatMsg(`정령 쿨다운 ${Math.ceil(game.spiritCooldown / 60)}초`, '#9be37d'); return; }
            if (game.character.stats.mana < SPIRIT_MANA) { floatMsg('마나 부족! (정령 1000)', '#0099ff'); return; }
            game.character.stats.mana -= SPIRIT_MANA;
            game.spiritTimer = SPIRIT_DURATION;
            game.spiritCooldown = SPIRIT_COOLDOWN;
            game.spirit.x = game.character.x;
            game.spirit.y = game.character.y - 70;
            floatMsg('🧚 자연의 정령 소환! (60초)', '#7CFC00');
        }
        // 자동사냥에서 조용히 소환 가능한지 (floatMsg 스팸 방지용 사전 체크)
        function spiritReady() {
            return game.awakened2 && !game.inTown && !game.naming &&
                   game.spiritTimer <= 0 && game.spiritCooldown <= 0 &&
                   game.character.stats.mana >= SPIRIT_MANA;
        }
        function updateSpirit() {
            if (game.spiritTimer <= 0) return;
            game.spiritTimer--;
            const char = game.character;
            const tx = char.x + (char.facing === 'right' ? 60 : -60);
            const ty = char.y - 50;
            game.spirit.x += (tx - game.spirit.x) * 0.12;
            game.spirit.y += (ty - game.spirit.y) * 0.12;
            game.spiritAtkCounter++;
            if (game.spiritAtkCounter >= SPIRIT_INTERVAL) {
                let closest = null, cd = Infinity;
                game.monsters.forEach(m => {
                    const d = Math.hypot(m.x - game.spirit.x, m.y - game.spirit.y);
                    if (d < SPIRIT_RANGE && d < cd) { closest = m; cd = d; }
                });
                if (closest) {
                    game.spiritAtkCounter = 0;
                    const r = applyCombatMods(effAttack() * SPIRIT_DMG_RATIO, closest);
                    game.skillEffects.push({ x: closest.x, y: closest.y, radius: 0, maxRadius: 46, duration: 16, maxDuration: 16, color: '#7CFC00', type: 'single' });
                    damageMonster(closest, r.dmg, r.crit ? '#ff5252' : '#7CFC00', r.crit);
                }
            }
        }
        function drawSpirit() {
            if (game.spiritTimer <= 0) return;
            const sx = game.spirit.x - game.camera.x, sy = game.spirit.y;
            const bob = Math.sin(Date.now() / 250) * 5;
            ctx.fillStyle = 'rgba(124,252,0,0.28)';
            ctx.beginPath(); ctx.arc(sx, sy + bob, 22, 0, Math.PI * 2); ctx.fill();
            ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🧚', sx, sy + bob);
            ctx.fillStyle = '#7CFC00'; ctx.font = 'bold 10px Arial';
            ctx.fillText(`정령 ${Math.ceil(game.spiritTimer / 60)}s`, sx, sy + bob - 22);
        }
        // 정령 상태 HUD (좌상단, 버튼 아래) — 이벤트 메뉴와 겹치지 않게 패널/마을에선 숨김
        function drawSpiritHUD() {
            if (game.inTown || game.showEvent) return;
            const x = 15, y = 90, w = 150, h = 22;
            let txt, col;
            if (!game.awakened2) { txt = '🔒 정령 (2차 각성 필요)'; col = '#777'; }
            else if (game.spiritTimer > 0) { txt = `🧚 정령 ${Math.ceil(game.spiritTimer / 60)}초`; col = '#2e7d32'; }
            else if (game.spiritCooldown > 0) { txt = `🧚 쿨 ${Math.ceil(game.spiritCooldown / 60)}초 [G]`; col = '#555'; }
            else { txt = '🧚 정령 소환 [G] 1000MP'; col = '#1b5e20'; }
            ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#7CFC00'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(txt, x + w / 2, y + h / 2);
        }

        // 기본 공격 사정거리 (스킬 사정거리 계산 기준)
        const BASE_ATTACK_RANGE = 150;

        // 직업 스킬 = 레벨업 액티브 3개(Q·W·E) + 특수(F, 서버보스 10회) + 궁극기(R, 서버보스 30회)
        // 패시브는 여기 없음(스킬바에 안 보임) — JOB_PASSIVES로 자동 적용
        const JOB_SKILLS = {
            '마법사': [
                { key: 'q', unlock: 10, name: '마나 폭발', manaCost: 15, cooldown: 90,  type: 'single', damageMult: 2.5, range: BASE_ATTACK_RANGE, color: '#9b59b6' },
                { key: 'w', unlock: 30, name: '파이어 스톰', manaCost: 22, cooldown: 110, type: 'aoe', damageMult: 1.8, range: BASE_ATTACK_RANGE * 1.4, color: '#e74c3c' },
                { key: 'e', unlock: 60, name: '빙결 폭발', manaCost: 28, cooldown: 140, type: 'aoe', damageMult: 2.6, range: BASE_ATTACK_RANGE * 1.6, color: '#3498db' },
                { key: 'f', special: true, name: '아포칼립스 (특수)', manaCost: 80, cooldown: 600, type: 'aoe', damageMult: 15, range: BASE_ATTACK_RANGE * 3.2, color: '#00e5ff' },
                { key: 'r', ultimate: true, name: '메테오 (궁극기)', manaCost: 45, cooldown: 260, type: 'aoe', damageMult: 5.5, range: BASE_ATTACK_RANGE * 2.4, color: '#ff5252' }
            ],
            '암살자': [
                { key: 'q', unlock: 10, name: '그림자 암습', manaCost: 10, cooldown: 60,  type: 'single', damageMult: 3.5, range: BASE_ATTACK_RANGE + 40, color: '#2c3e50' },
                { key: 'w', unlock: 30, name: '연속 베기', manaCost: 18, cooldown: 90,  type: 'single', damageMult: 4.5, range: BASE_ATTACK_RANGE, color: '#7f8c8d' },
                { key: 'e', unlock: 60, name: '암흑 폭발', manaCost: 24, cooldown: 120, type: 'aoe', damageMult: 2.4, range: BASE_ATTACK_RANGE * 1.3, color: '#34495e' },
                { key: 'f', special: true, name: '그림자 학살 (특수)', manaCost: 70, cooldown: 540, type: 'aoe', damageMult: 14, range: BASE_ATTACK_RANGE * 2, color: '#00e5ff' },
                { key: 'r', ultimate: true, name: '처형 (궁극기)', manaCost: 40, cooldown: 220, type: 'single', damageMult: 9, range: BASE_ATTACK_RANGE + 60, color: '#ff5252' }
            ],
            '과학자': [
                { key: 'q', unlock: 10, name: '화학 폭발', manaCost: 20, cooldown: 120, type: 'aoe', damageMult: 1.8, range: BASE_ATTACK_RANGE * 2.5, color: '#27ae60' },
                { key: 'w', unlock: 30, name: '산성 분사', manaCost: 26, cooldown: 130, type: 'aoe', damageMult: 2.4, range: BASE_ATTACK_RANGE * 2.5, color: '#2ecc71' },
                { key: 'e', unlock: 60, name: '방사능 누출', manaCost: 32, cooldown: 150, type: 'aoe', damageMult: 3.0, range: BASE_ATTACK_RANGE * 2.5, color: '#16a085' },
                { key: 'f', special: true, name: '블랙홀 (특수)', manaCost: 90, cooldown: 640, type: 'aoe', damageMult: 16, range: BASE_ATTACK_RANGE * 3.5, color: '#00e5ff' },
                { key: 'r', ultimate: true, name: '핵폭발 (궁극기)', manaCost: 50, cooldown: 280, type: 'aoe', damageMult: 6, range: BASE_ATTACK_RANGE * 3, color: '#ff5252' }
            ],
            '환경미화원': [
                { key: 'q', unlock: 10, name: '회오리 청소', manaCost: 15, cooldown: 100, type: 'aoe', damageMult: 1.5, range: BASE_ATTACK_RANGE, color: '#e67e22' },
                { key: 'w', unlock: 30, name: '빗자루 강타', manaCost: 18, cooldown: 90,  type: 'single', damageMult: 3.2, range: BASE_ATTACK_RANGE, color: '#d35400' },
                { key: 'e', unlock: 60, name: '물청소 해일', manaCost: 26, cooldown: 130, type: 'aoe', damageMult: 2.4, range: BASE_ATTACK_RANGE * 1.5, color: '#2980b9' },
                { key: 'f', special: true, name: '대멸균 (특수)', manaCost: 75, cooldown: 580, type: 'aoe', damageMult: 14, range: BASE_ATTACK_RANGE * 2.6, color: '#00e5ff' },
                { key: 'r', ultimate: true, name: '대청소 (궁극기)', manaCost: 42, cooldown: 240, type: 'aoe', damageMult: 5, range: BASE_ATTACK_RANGE * 2, color: '#ff5252' }
            ]
        };

        // === 각성 스킬 (직업의 혼 구매 시 원래 스킬을 대체) — 전부 즉시 사용 가능(unlock 1) ===
        const AWAKEN_ATK_MULT = 2; // 각성 시 공격력 2배
        const AWAKEN_SKILLS = {
            '마법사': [
                { key: 'q', unlock: 1, name: '천공의 진노', manaCost: 20, cooldown: 50,  type: 'single', damageMult: 6,  range: BASE_ATTACK_RANGE * 1.6, color: '#b388ff' },
                { key: 'w', unlock: 1, name: '시공 균열',   manaCost: 28, cooldown: 80,  type: 'aoe',    damageMult: 5,  range: BASE_ATTACK_RANGE * 2.0, color: '#7c4dff' },
                { key: 'e', unlock: 1, name: '영원의 빙하', manaCost: 34, cooldown: 110, type: 'aoe',    damageMult: 7,  range: BASE_ATTACK_RANGE * 2.2, color: '#18ffff' },
                { key: 'f', unlock: 1, name: '무한 마력',   manaCost: 60, cooldown: 240, type: 'aoe',    damageMult: 20, range: BASE_ATTACK_RANGE * 3.0, color: '#e040fb' },
                { key: 'r', unlock: 1, name: '우주 소멸',   manaCost: 80, cooldown: 320, type: 'aoe',    damageMult: 30, range: BASE_ATTACK_RANGE * 3.6, color: '#ff5252' }
            ],
            '암살자': [
                { key: 'q', unlock: 1, name: '그림자 처형', manaCost: 16, cooldown: 40,  type: 'single', damageMult: 8,  range: BASE_ATTACK_RANGE + 60, color: '#37474f' },
                { key: 'w', unlock: 1, name: '천 개의 칼날', manaCost: 26, cooldown: 70,  type: 'single', damageMult: 10, range: BASE_ATTACK_RANGE + 40, color: '#607d8b' },
                { key: 'e', unlock: 1, name: '암흑 강림',   manaCost: 32, cooldown: 100, type: 'aoe',    damageMult: 6,  range: BASE_ATTACK_RANGE * 1.8, color: '#263238' },
                { key: 'f', unlock: 1, name: '말살',       manaCost: 58, cooldown: 230, type: 'aoe',    damageMult: 22, range: BASE_ATTACK_RANGE * 2.4, color: '#e040fb' },
                { key: 'r', unlock: 1, name: '심판의 일격', manaCost: 78, cooldown: 300, type: 'single', damageMult: 40, range: BASE_ATTACK_RANGE + 80, color: '#ff5252' }
            ],
            '과학자': [
                { key: 'q', unlock: 1, name: '플라즈마 폭발', manaCost: 22, cooldown: 60,  type: 'aoe', damageMult: 5,  range: BASE_ATTACK_RANGE * 2.6, color: '#2ecc71' },
                { key: 'w', unlock: 1, name: '반물질 분사',   manaCost: 30, cooldown: 90,  type: 'aoe', damageMult: 7,  range: BASE_ATTACK_RANGE * 2.6, color: '#1abc9c' },
                { key: 'e', unlock: 1, name: '특이점 붕괴',   manaCost: 36, cooldown: 120, type: 'aoe', damageMult: 9,  range: BASE_ATTACK_RANGE * 2.8, color: '#16a085' },
                { key: 'f', unlock: 1, name: '초신성',       manaCost: 64, cooldown: 250, type: 'aoe', damageMult: 24, range: BASE_ATTACK_RANGE * 3.6, color: '#e040fb' },
                { key: 'r', unlock: 1, name: '빅뱅',         manaCost: 84, cooldown: 340, type: 'aoe', damageMult: 34, range: BASE_ATTACK_RANGE * 4.0, color: '#ff5252' }
            ],
            '환경미화원': [
                { key: 'q', unlock: 1, name: '신성한 회오리', manaCost: 18, cooldown: 50,  type: 'aoe',    damageMult: 5,  range: BASE_ATTACK_RANGE * 1.4, color: '#f39c12' },
                { key: 'w', unlock: 1, name: '정화의 강타',   manaCost: 26, cooldown: 80,  type: 'single', damageMult: 9,  range: BASE_ATTACK_RANGE + 30, color: '#e67e22' },
                { key: 'e', unlock: 1, name: '성수의 해일',   manaCost: 32, cooldown: 110, type: 'aoe',    damageMult: 7,  range: BASE_ATTACK_RANGE * 1.8, color: '#2980b9' },
                { key: 'f', unlock: 1, name: '대정화',       manaCost: 60, cooldown: 240, type: 'aoe',    damageMult: 21, range: BASE_ATTACK_RANGE * 3.0, color: '#e040fb' },
                { key: 'r', unlock: 1, name: '천지창조 청소', manaCost: 80, cooldown: 320, type: 'aoe',    damageMult: 32, range: BASE_ATTACK_RANGE * 2.6, color: '#ff5252' }
            ]
        };
        // 2차 각성 스킬 = 1차 각성 스킬의 진(眞) 강화판 (공격력 ↑↑, 다른 색)
        const AWAKEN2_SKILLS = {};
        Object.keys(AWAKEN_SKILLS).forEach(job => {
            AWAKEN2_SKILLS[job] = AWAKEN_SKILLS[job].map(s => ({ ...s, name: '진 ' + s.name, damageMult: s.damageMult * 2.2, color: '#ff80ab' }));
        });
        // 3차 각성 스킬 = 초(超) 강화판, 4차 각성 스킬 = 극(極) 강화판
        const AWAKEN3_SKILLS = {};
        Object.keys(AWAKEN_SKILLS).forEach(job => {
            AWAKEN3_SKILLS[job] = AWAKEN_SKILLS[job].map(s => ({ ...s, name: '초 ' + s.name, damageMult: s.damageMult * 4.5, color: '#18ffff' }));
        });
        const AWAKEN4_SKILLS = {};
        Object.keys(AWAKEN_SKILLS).forEach(job => {
            AWAKEN4_SKILLS[job] = AWAKEN_SKILLS[job].map(s => ({ ...s, name: '극 ' + s.name, damageMult: s.damageMult * 8, color: '#ffd700' }));
        });
        // 현재 각성 차수 (0~4)
        function awakenTier() { return game.awakened4 ? 4 : game.awakened3 ? 3 : game.awakened2 ? 2 : 0; }
        // 각성 전용 패시브 — 차수가 오를수록 강해짐 (2차부터 적용). 함수명은 호환 위해 유지.
        function awaken2Bonus(key) {
            const t = awakenTier(); if (t < 2) return 0;
            if (key === 'atkPct')   return [0, 0, 100, 200, 350][t]; // [초월의 분노] 공격력
            if (key === 'critRate') return [0, 0, 35,  45,  60][t];  // [신의 일격] 크리 확률
            if (key === 'critDmg')  return [0, 0, 200, 350, 550][t]; // [신의 일격] 크리 데미지
            if (key === 'defPct')   return [0, 0, 80,  150, 250][t]; // [불멸] 방어력
            return 0;
        }
        // 각성 적용: 직업 스킬셋을 가장 높은 각성 스킬로 교체 (구매/각막 클리어 + 로드 시 호출)
        function applyAwakening() {
            const job = game.character.job;
            if (game.awakened4 && AWAKEN4_SKILLS[job]) JOB_SKILLS[job] = AWAKEN4_SKILLS[job];
            else if (game.awakened3 && AWAKEN3_SKILLS[job]) JOB_SKILLS[job] = AWAKEN3_SKILLS[job];
            else if (game.awakened2 && AWAKEN2_SKILLS[job]) JOB_SKILLS[job] = AWAKEN2_SKILLS[job];
            else if (game.awakened && AWAKEN_SKILLS[job]) JOB_SKILLS[job] = AWAKEN_SKILLS[job];
        }
        // 각성 공통 발동 처리 (tier=2/3/4)
        function fireAwaken(tier, label, sub, color) {
            game.awakened = true; game.awakened2 = true;
            if (tier >= 3) game.awakened3 = true;
            if (tier >= 4) game.awakened4 = true;
            applyAwakening();
            game.skillCooldowns = { q: 0, w: 0, e: 0, f: 0, r: 0 };
            game.zoneClearMsg = 0;
            game.secondAwakenMsg = 260;   // 각성 배너 (배너가 tier로 텍스트 분기)
            game.awakenMsgTier = tier;
            sfx('levelup');
            floatMsg(label + ' ' + sub, color);
            invalidateStats();
            saveProgress();
        }
        function triggerSecondAwakening() { fireAwaken(2, '🌟 2차 각성!', '공격력 4배 · 진(眞) 스킬 · 패시브', '#ff80ab'); }
        function triggerThirdAwakening()  { fireAwaken(3, '🔥 3차 각성!', '공격력 8배 · 초(超) 스킬 · 패시브 강화', '#18ffff'); }
        function triggerFourthAwakening() { fireAwaken(4, '👑 4차 각성!', '공격력 16배 · 극(極) 스킬 · 최강 패시브', '#ffd700'); }

        // 직업별 패시브 (레벨 unlock 도달 시 자동 적용, 스킬바엔 안 보임)
        // key는 전투 보정 키(atkPct/defPct/bossPct/critRate/critDmg)에 합산됨
        const JOB_PASSIVES = {
            '마법사':     { name: '마력 폭주', unlock: 45, key: 'atkPct',   val: 30 }, // 공격력 +30%
            '암살자':     { name: '암살 본능', unlock: 45, key: 'critRate', val: 25 }, // 크리 확률 +25%
            '과학자':     { name: '원소 촉매', unlock: 45, key: 'bossPct',  val: 40 }, // 보스 공격력 +40%
            '환경미화원': { name: '철벽 방어', unlock: 45, key: 'defPct',   val: 50 }  // 방어력 +50%
        };
        // 패시브 보정값 (해당 key에 해제된 패시브가 있으면 그 값, 없으면 0)
        function passiveBonus(key) {
            const p = JOB_PASSIVES[game.character.job];
            if (!p || p.key !== key) return 0;
            return game.character.stats.level >= p.unlock ? p.val : 0;
        }

        // 서버보스 처치 횟수 해제 조건
        const SPECIAL_BOSS_KILLS = 10;  // 특수 스킬(F)
        const ULTIMATE_BOSS_KILLS = 30; // 궁극기(R)

        // 스킬 소비 마나 배수 (10배)
        const MANA_COST_MULT = 10;
        function skillManaCost(skill) { return skill.manaCost * MANA_COST_MULT; }

        // === 모험가스킬 === 10레벨 전(직업스킬 해제 전)에만 Q로 사용. 공격력 2배 강타.
        const ADV_SKILL = { name: '모험가의 일격', manaCost: 5, cooldown: 36, mult: 2.0, range: BASE_ATTACK_RANGE + 30, color: '#ffcc33' };
        function hasAdventurerSkill() { return game.character.stats.level < 10; }

        // 스킬 해제 여부
        function isSkillUnlocked(skill) {
            if (skill.ultimate) return game.ultimateUnlocked;
            if (skill.special) return (game.serverBossKills || 0) >= SPECIAL_BOSS_KILLS;
            return game.character.stats.level >= skill.unlock;
        }

        // === 스킬 강화 ===
        const SKILL_MAX_LEVEL = 10;          // 스킬 최대 강화
        const SKILL_DMG_PER_LEVEL = 0.15;    // 강화 1당 데미지 +15%
        function skillLevel(key) { return game.skillLevels[key] || 1; }
        // 강화 반영 데미지 배율
        function skillMult(skill) { return skill.damageMult * (1 + (skillLevel(skill.key) - 1) * SKILL_DMG_PER_LEVEL); }
        function skillUpgradeCost(key) { return 2000 * skillLevel(key); } // 레벨에 비례
        function upgradeSkill(key) {
            const skills = JOB_SKILLS[game.character.job];
            const skill = skills && skills.find(s => s.key === key);
            if (!skill) return;
            if (!isSkillUnlocked(skill)) { floatMsg('아직 해제 안 됨!', '#ff6b6b'); return; }
            const lvl = skillLevel(key);
            if (lvl >= SKILL_MAX_LEVEL) { floatMsg('최대 강화!', '#ffd700'); return; }
            const cost = skillUpgradeCost(key);
            if (game.coins < cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= cost;
            game.skillLevels[key] = lvl + 1;
            floatMsg(`🎯 ${skill.name} 강화! Lv.${lvl + 1}`, skill.color);
            saveProgress();
        }

        // 몬스터 클래스
        class Monster {
            constructor(x, y, type, opts = {}) {
                this.x = x;
                this.y = y;
                this.type = type;
                this.isBoss = opts.isBoss || false;
                this.isServerBoss = opts.isServerBoss || false;
                this.isDailyBoss = opts.isDailyBoss || false;
                const big = this.isBoss || this.isServerBoss || this.isDailyBoss;
                this.width = this.isServerBoss ? 210 : (this.isDailyBoss ? 180 : (this.isBoss ? 150 : 60));
                this.height = this.isServerBoss ? 260 : (this.isDailyBoss ? 220 : (this.isBoss ? 190 : 80));
                this.speed = this.isServerBoss ? 1.0 : (big ? 1.4 : 2);
                this.direction = Math.random() > 0.5 ? 'left' : 'right';
                this.frameIndex = 0;
                this.frameCounter = 0;
                this.frameDelay = 15;
                this.image = null;
                this.moveCounter = 0;
                this.moveChangeInterval = 120;
                this.attackRange = this.isServerBoss ? 210 : (big ? 160 : 100); // 공격 범위
                this.attackCooldownMax = big ? 45 : 60;
                this.attackCooldown = Math.floor(Math.random() * this.attackCooldownMax); // 첫 공격 분산 (동시타격 방지)
                this.hp = opts.hp || 50;
                this.maxHp = this.hp;
                this.damage = opts.damage || 10;       // 플레이어에게 주는 피해
                this.coinReward = opts.coinReward ?? 10; // 처치 시 코인 (?? : 던전/보스의 0이 10으로 둔갑 방지)
                this.expReward = opts.expReward ?? (this.isBoss ? 300 : 25); // ?? : 0 경험치(훈장던전)가 둔갑 방지
            }

            update(playerX, playerY) {
                // 플레이어를 향해 추격 (사정거리 안에 들어오면 멈춰서 공격)
                const dx = playerX - this.x;
                this.direction = dx < 0 ? 'left' : 'right';
                if (Math.abs(dx) > this.attackRange * 0.6) {
                    this.x += (dx < 0 ? -this.speed : this.speed);
                }
                // 맵 경계 클램프
                if (this.x < 0) this.x = 0;
                if (this.x > MAP.width) this.x = MAP.width;

                // 애니메이션
                this.frameCounter++;
                if (this.frameCounter >= this.frameDelay) {
                    this.frameCounter = 0;
                    this.frameIndex = (this.frameIndex + 1) % 3;
                }

                // 공격 쿨다운
                if (this.attackCooldown > 0) {
                    this.attackCooldown--;
                }

                // 캐릭터와의 거리 계산
                const dist = Math.hypot(playerX - this.x, playerY - this.y);

                // 공격 범위 내면 공격
                if (dist < this.attackRange && this.attackCooldown === 0) {
                    return true; // 공격 신호
                }
                return false;
            }

            resetAttackCooldown() {
                this.attackCooldown = this.attackCooldownMax;
            }

            draw(cameraX) {
                const screenX = this.x - cameraX;
                const big = this.isBoss || this.isServerBoss;

                // 보스는 그림자/오라 표시 (서버보스는 보라색)
                if (big) {
                    ctx.fillStyle = this.isServerBoss ? 'rgba(140, 0, 200, 0.3)' : 'rgba(200, 0, 0, 0.25)';
                    ctx.beginPath();
                    ctx.ellipse(screenX, this.y + this.height / 2 - 5, this.width / 2, 20, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                if (this.image && this.image.complete && this.image.naturalWidth > 0) {
                    ctx.drawImage(
                        this.image,
                        screenX - this.width / 2,
                        this.y - this.height / 2,
                        this.width,
                        this.height
                    );
                } else {
                    ctx.fillStyle = this.isServerBoss ? '#4b0082' : (this.isBoss ? '#8b0000' : '#ff6b6b');
                    ctx.fillRect(screenX - this.width / 2, this.y - this.height / 2, this.width, this.height);
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 20px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.isServerBoss ? 'SERVER' : (this.isBoss ? 'BOSS' : (this.frameIndex + 1)), screenX, this.y);
                }

                // 보스는 머리 위 라벨 + HP 바
                if (big) {
                    const barW = this.width;
                    const barX = screenX - barW / 2;
                    const barY = this.y - this.height / 2 - 24;

                    ctx.fillStyle = this.isServerBoss ? '#b388ff' : '#ffd700';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(this.label || (this.isServerBoss ? '🌐 SERVER BOSS' : '👑 BOSS'), screenX, barY - 2);

                    ctx.fillStyle = '#333';
                    ctx.fillRect(barX, barY, barW, 9);
                    ctx.fillStyle = this.isServerBoss ? '#8e44ad' : '#e74c3c';
                    ctx.fillRect(barX, barY, barW * Math.max(0, this.hp / this.maxHp), 9);
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(barX, barY, barW, 9);

                    // 서버보스는 남은 체력 숫자도 표시
                    if (this.isServerBoss) {
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 11px Arial';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(`${Math.max(0, Math.round(this.hp))} / ${this.maxHp}`, screenX, barY + 4);
                    }
                }
            }
        }

        // 키 상태
        const keys = {};

        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;

            // 이름 입력 중에는 게임 조작 무시
            if (game.naming) return;

            // 📖 스토리 컷신: 스페이스/엔터로 다음 대사, Esc로 건너뛰기
            // 📅 출석창 / 🛍️ 일일상점: Esc로 닫기
            if (game.showAttend) { if (e.key === 'Escape') game.showAttend = false; return; }
            if (game.showDailyShop) { if (e.key === 'Escape') game.showDailyShop = false; return; }
            if (game.showTowerShop) { if (e.key === 'Escape') game.showTowerShop = false; return; }
            if (game.showWorldBoss) { if (e.key === 'Escape' || e.key.toLowerCase() === 'e') game.showWorldBoss = false; return; }
            if (game.showPetBook) { if (e.key === 'Escape') game.showPetBook = false; return; }
            // 🏠 마이홈 실내: 일시정지 상태이므로 공격/스킬/정령 키 무시 (Esc/E로 나가기)
            if (game.showHome) { if (e.key === 'Escape' || e.key.toLowerCase() === 'e') game.showHome = false; return; }

            // 채팅 창이 열려 있으면 게임 조작 무시 (입력창 타이핑은 그대로 통과)
            if (game.chatOpen) { if (e.key === 'Escape') closeChat(); return; }

            // 경매장 창이 열려 있으면 게임 조작 무시
            if (game.aucOpen) { if (e.key === 'Escape') closeAuction(); return; }

            // 🎵 리듬게임이 열려 있으면 Q W E R로 노트 치기 (다른 조작 무시)
            if (game.showRhythm) {
                if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
                if (rg.state === 'play') {
                    const li = RG_KEYS.indexOf(e.key.toLowerCase());
                    if (li >= 0) rgHit(li);
                    if (e.key === 'Escape') closeRhythm();
                } else if (rg.state === 'shop') {
                    if (e.key === 'Escape') rg.state = 'intro';
                } else { // intro / result
                    if (e.key === ' ') startRhythm();
                    if (e.key === 'Escape') closeRhythm();
                }
                return;
            }

            // PvP 모달이 열려 있으면 메인 게임 조작 무시 (PvP는 keys 맵을 직접 읽어 처리)
            if (game.pvpOpen) {
                if (e.key === 'Escape') closePvp();
                // 방향키/스페이스 기본동작(스크롤 등) 막기
                if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
                return;
            }

            // 퀘스트 창이 열려 있으면 게임 조작 무시 (Esc로 닫기)
            if (game.showQuest) {
                if (e.key === ' ') e.preventDefault();
                if (e.key === 'Escape') game.showQuest = false;
                return;
            }

            // 메뉴가 열려 있으면 게임 조작 무시 (Esc로 닫기)
            if (game.showMenu) {
                if (e.key === ' ') e.preventDefault();
                if (e.key === 'Escape') closeMenu();
                return;
            }

            // 스페이스바 공격
            if (e.key === ' ') {
                e.preventDefault();
                playerAttack();
            }

            // Z 키 자동 사냥 토글
            if (e.key.toLowerCase() === 'z') {
                game.autoHunt = !game.autoHunt;
            }

            const sk = e.key.toLowerCase();
            // 마을에서 E: 집 앞이면 마이홈 입장 (스킬 대신)
            if (game.inTown && sk === 'e') {
                if (game.nearHome && !game.showHome) game.showHome = true;
            } else if (sk === 'q' || sk === 'w' || sk === 'e' || sk === 'f' || sk === 'r') {
                // Q/W/E/F/R 직업 전용 스킬
                useSkill(sk);
            }

            // G 키: 자연의 정령 소환 (모든 캐릭터)
            if (sk === 'g') summonSpirit();

            // T 키: 🎵 음표공격 (한정상점에서 구매 시)
            if (sk === 't') useNoteSkill();

            // M 키 사냥터 지도 토글
            if (e.key.toLowerCase() === 'm') {
                game.showMap = !game.showMap;
                if (game.showMap) {
                    game.mapPage = game.currentZone >= ACT3_START_ZONE ? 2 : (game.currentZone >= ACT2_START_ZONE ? 1 : 0);
                }
            }

            // 1: 체력 물약, 2: 마나 물약
            if (e.key === '1') useHpPotion();
            if (e.key === '2') useMpPotion();

            // P: 브금 켜기/끄기
            if (e.key.toLowerCase() === 'p') toggleBgm();
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        // 창 포커스를 잃으면(Alt+Tab 등) 눌린 키를 모두 해제 — 캐릭터가 계속 달려가는 끼임 방지
        window.addEventListener('blur', () => {
            for (const k in keys) keys[k] = false;
        });

        // 마우스 클릭
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            // 화면 크기에 맞춰 게임이 축소될 수 있으므로, 클릭 좌표를 캔버스 내부 좌표로 환산
            const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

            // 📖 스토리 컷신 (열려 있으면 최우선 — 아무데나 클릭하면 다음 대사)
            // 🗼 무한의 탑 나가기 버튼 (HUD) — 다른 모달이 떠 있으면 무시 (stale 버튼 가로채기 방지)
            if (game.inTower && game.towerExitButton &&
                !game.showShop && !game.showQuest && !game.showMap && !game.showMenu &&
                !game.showPetBook && !game.showDailyShop && !game.showAttend && !game.eventTab) {
                const b = game.towerExitButton;
                if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) { exitTower(); return; }
            }

            // 🐾 펫 도감
            if (game.showPetBook) {
                for (const b of (game.petBookButtons || [])) {
                    if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
                        if (b.action === 'close') game.showPetBook = false;
                        else if (b.action === 'equip') equipPet(b.id);
                        else if (b.action === 'buyNotePet') buyNotePet();
                        return;
                    }
                }
                return;
            }

            // 📅 출석 보상창
            if (game.showAttend) {
                for (const b of (game.attendButtons || [])) {
                    if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
                        if (b.action === 'close') game.showAttend = false;
                        return;
                    }
                }
                return;
            }

            // 🛍️ 일일 랜덤 상점
            if (game.showDailyShop) {
                for (const b of (game.dailyShopButtons || [])) {
                    if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
                        if (b.action === 'close') game.showDailyShop = false;
                        else if (b.action === 'buy') buyDailyItem(b.idx);
                        return;
                    }
                }
                return;
            }

            // 🗼 무한의 탑 상점
            if (game.showTowerShop) {
                for (const b of (game.towerShopButtons || [])) {
                    if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
                        if (b.action === 'close') game.showTowerShop = false;
                        else if (b.action === 'buy') buyTowerItem(b.key);
                        return;
                    }
                }
                return;
            }

            // 🌍 월드보스
            if (game.showWorldBoss) {
                for (const b of (game.worldBossButtons || [])) {
                    if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
                        if (b.action === 'wbClose') game.showWorldBoss = false;
                        else if (b.action === 'wbAttack') wbAttack(b.type);
                        else if (b.action === 'wbClaim') wbClaim();
                        return;
                    }
                }
                return;
            }

            // 🎵 리듬게임 (열려 있으면 최우선)
            if (game.showRhythm) {
                for (const b of (rg.buttons || [])) {
                    if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
                        if (b.act === 'close') closeRhythm();
                        else if (b.act === 'lane') { if (rg.state === 'play') rgHit(b.lane); }
                        else if (b.act === 'start') startRhythm();
                        else if (b.act === 'shop') rg.state = 'shop';
                        else if (b.act === 'back') rg.state = 'intro';
                        else if (b.act === 'buyMike') buyMike();
                        else if (b.act === 'buyNote') buyNoteSkill();
                        else if (b.act === 'buySciSkin') buySciSkin();
                        else if (b.act === 'toggleSciSkin') toggleSciSkin();
                        return;
                    }
                }
                return;
            }

            // 브금 버튼 — 전체 모달(상점/지도/집/직업선택/이벤트패널)이 열려 있으면
            // 버튼이 가려지므로 클릭-통과로 음악이 토글되지 않게 무시
            const modalOpen = game.showHome || game.showShop || game.showQuest || game.showMap || game.selectingJob || game.eventTab || game.showMenu;
            if (game.bgmButton && !modalOpen) {
                const b = game.bgmButton;
                if (clickX >= b.x && clickX <= b.x + b.w &&
                    clickY >= b.y && clickY <= b.y + b.h) {
                    toggleBgm();
                    return;
                }
            }

            // 메뉴(설명/랭킹/제작자/설정) — 열려 있으면 최우선 처리
            if (game.showMenu) {
                for (let btn of game.menuButtons) {
                    if (clickX >= btn.x && clickX <= btn.x + btn.w &&
                        clickY >= btn.y && clickY <= btn.y + btn.h) {
                        if (btn.action === 'close') closeMenu();
                        else if (btn.action === 'tab') setMenuTab(btn.tab);
                        else if (btn.action === 'bgm') toggleBgm();
                        else if (btn.action === 'sfx') { SFX.setOn(!SFX.on); if (SFX.on) sfx('coin'); }
                        else if (btn.action === 'resetRank') resetRanking();
                        else if (btn.action === 'rename') askPlayerName();
                        else if (btn.action === 'claimAch') claimAch(btn.achKey);
                        else if (btn.action === 'equipTitle') setTitle(btn.titleKey);
                        else if (btn.action === 'toggleAutoHp') { game.autoHpPotion = !game.autoHpPotion; saveProgress(); }
                        else if (btn.action === 'toggleAutoMp') { game.autoMpPotion = !game.autoMpPotion; saveProgress(); }
                        else if (btn.action === 'cloudSave') { saveProgress(); cloudSave(true); }   // ☁️ 수동 클라우드 저장
                        else if (btn.action === 'cloudLoad') { cloudLoad(true); }                   // ☁️ 수동 클라우드 불러오기
                        return;
                    }
                }
                return; // 메뉴가 열려 있는 동안엔 다른 클릭 무시
            }

            // 마이홈 실내 (열려 있으면 최우선)
            if (game.showHome) {
                for (let btn of game.homeButtons) {
                    if (clickX >= btn.x && clickX <= btn.x + btn.w &&
                        clickY >= btn.y && clickY <= btn.y + btn.h) {
                        if (btn.action === 'rest') restAtHome();
                        else if (btn.action === 'up_hp') upgradeHome('hp');
                        else if (btn.action === 'up_atk') upgradeHome('atk');
                        else if (btn.action === 'up_def') upgradeHome('def');
                        else if (btn.action === 'close') game.showHome = false;
                        return;
                    }
                }
                return; // 집 안에서는 다른 클릭 무시
            }

            // 뽑기 창 (열려 있으면 최우선 처리)
            if (game.showShop) {
                for (let btn of game.shopButtons) {
                    if (clickX >= btn.x && clickX <= btn.x + btn.w &&
                        clickY >= btn.y && clickY <= btn.y + btn.h) {
                        if (btn.action === 'pull1') doPull(1);
                        else if (btn.action === 'pull10') doPull(10);
                        else if (btn.action === 'select') game.selectedItemId = btn.id;
                        else if (btn.action === 'equip') equipById(btn.id);
                        else if (btn.action === 'scroll') applyScroll(btn.id);
                        else if (btn.action === 'star') starforce(btn.id);
                        else if (btn.action === 'potential') rerollPotential(btn.id);
                        else if (btn.action === 'dismantle') dismantleItem(btn.id);
                        else if (btn.action === 'sellAll') dismantleAll();
                        else if (btn.action === 'pagePrev') game.bagPage = Math.max(0, game.bagPage - 1);
                        else if (btn.action === 'pageNext') game.bagPage++;
                        else if (btn.action === 'close') game.showShop = false;
                        return;
                    }
                }
                return; // 뽑기 창 열려 있는 동안엔 공격 등 무시
            }

            // 퀘스트 창 (열려 있으면 최우선 처리)
            if (game.showQuest) {
                for (let btn of game.questButtons) {
                    if (clickX >= btn.x && clickX <= btn.x + btn.w &&
                        clickY >= btn.y && clickY <= btn.y + btn.h) {
                        if (btn.action === 'claim') claimQuest(btn.id);
                        else if (btn.action === 'claimW') claimWeekly(btn.id);
                        else if (btn.action === 'qtab') { game.questTab = btn.tab; game.questPage = 0; }
                        else if (btn.action === 'prevPage') game.questPage = Math.max(0, game.questPage - 1);
                        else if (btn.action === 'nextPage') game.questPage++;
                        else if (btn.action === 'close') game.showQuest = false;
                        return;
                    }
                }
                return; // 퀘스트 창 열려 있는 동안엔 공격 등 무시
            }

            // 사냥터 지도 (열려 있으면 최우선 처리)
            if (game.showMap) {
                for (let btn of game.mapButtons) {
                    if (clickX >= btn.x && clickX <= btn.x + btn.w &&
                        clickY >= btn.y && clickY <= btn.y + btn.h) {
                        if (btn.action === 'mapPage') {
                            game.mapPage = btn.page;
                            return;
                        }
                        if (btn.index <= game.maxUnlockedZone) {
                            goToZone(btn.index);
                        }
                        return;
                    }
                }
                return; // 지도 열려 있는 동안엔 공격 등 무시
            }

            // 화면 버튼 (보스 / 이벤트 / 뽑기) + 이벤트 메뉴·패널 — 직업 선택 중이 아닐 때
            if (!game.selectingJob) {
                const hit = (b) => b && clickX >= b.x && clickX <= b.x + b.w &&
                                   clickY >= b.y && clickY <= b.y + b.h;

                for (let btn of game.uiButtons) {
                    if (hit(btn)) {
                        if (btn.id === 'boss') warpToBoss();
                        else if (btn.id === 'event') { game.showEvent = !game.showEvent; game.eventTab = null; game.showShop = false; }
                        else if (btn.id === 'shop') { game.showShop = !game.showShop; game.showEvent = false; game.eventTab = null; }
                        else if (btn.id === 'town') { game.inTown ? leaveTown() : goToTown(); }
                        else if (btn.id === 'quest') { game.showQuest = !game.showQuest; if (game.showQuest) game.questPage = 0; game.showShop = false; game.showEvent = false; game.eventTab = null; }
                        else if (btn.id === 'pvp') { openPvp(); }
                        else if (btn.id === 'rhythm') { openRhythm(); }
                        else if (btn.id === 'daily') { openDailyShop(); }
                        else if (btn.id === 'menu') { game.showMenu = true; game.showEvent = false; game.eventTab = null; game.showShop = false; }
                        return;
                    }
                }

                // 마을: 나가기 버튼 + 집 클릭 입장
                if (game.inTown) {
                    for (let b of game.townButtons) {
                        if (hit(b)) { leaveTown(); return; }
                    }
                    if (game.nearHome && !game.showHome) {
                        const hx = HOME_X - game.camera.x;
                        if (clickX > hx - 95 && clickX < hx + 95 && clickY > 180 && clickY < 420) {
                            game.showHome = true;
                            return;
                        }
                    }
                }

                if (game.showEvent) {
                    // 좌측 메뉴: 탭 열기/닫기 (같은 탭 다시 누르면 닫힘)
                    for (let btn of game.eventMenuButtons) {
                        if (hit(btn)) {
                            if (btn.launch) {
                                // 런처: 이벤트 닫고 해당 기능 실행
                                game.showEvent = false; game.eventTab = null;
                                if (btn.launch === 'warpBoss') warpToBoss();
                                else if (btn.launch === 'dailyBoss') spawnDailyBoss();
                                else if (btn.launch === 'tower') enterTower();
                                else if (btn.launch === 'towerShop') openTowerShop();
                                else if (btn.launch === 'worldBoss') openWorldBoss();
                                else if (btn.launch === 'gacha') game.showShop = true;
                                else if (btn.launch === 'town') { game.inTown ? leaveTown() : goToTown(); }
                                else if (btn.launch === 'pvp') openPvp();
                                else if (btn.launch === 'chat') openChat();
                                else if (btn.launch === 'auction') openAuction();
                            } else if (btn.tab === 'map') {
                                // 맵은 M키 지도(전체 그리드)로 통일 — 이벤트 닫고 지도 열기
                                game.showMap = true;
                                game.mapPage = game.currentZone >= ACT3_START_ZONE ? 2 : (game.currentZone >= ACT2_START_ZONE ? 1 : 0);
                                game.showEvent = false;
                                game.eventTab = null;
                            } else {
                                game.eventTab = (game.eventTab === btn.tab) ? null : btn.tab;
                                if (game.eventTab === 'guild') { game.guildName ? guildFetchInfo(game.guildName) : guildFetchList(); }
                            }
                            return;
                        }
                    }

                    // 가운데 패널(모달)이 열려 있으면 그 안의 버튼 처리
                    if (game.eventTab) {
                        if (hit(game.eventCloseButton)) { game.eventTab = null; return; }

                        // 길드 버튼
                        for (let btn of game.guildButtons) {
                            if (hit(btn)) {
                                if (btn.action === 'create') guildCreatePrompt();
                                else if (btn.action === 'join') guildJoin(btn.name);
                                else if (btn.action === 'contribute') guildContribute();
                                else if (btn.action === 'leave') guildLeave();
                                else if (btn.action === 'refresh') { game.guildName ? guildFetchInfo(game.guildName) : guildFetchList(); }
                                else if (btn.action === 'subtab') { game.guildSubTab = btn.name; if (btn.name === 'info') guildFetchInfo(game.guildName); }
                                else if (btn.action === 'raidstart') startGuildRaid();
                                else if (btn.action === 'upg') upgradeGuildStat(btn.name);
                                else if (btn.action === 'shopupg') upgradeGuildShop();
                                else if (btn.action === 'buy') buyGuildItem(btn.name);
                                return;
                            }
                        }

                        // 스텟: 한 번에 찍을 배수 선택
                        for (let b of game.statBatchButtons) {
                            if (hit(b)) { game.statBatch = b.batch; return; }
                        }

                        // 스텟 + 버튼 (선택한 배수만큼 한 번에 투자)
                        if (game.statButtons) {
                            for (let stat of game.statButtons) {
                                if (clickX >= stat.buttonX && clickX <= stat.buttonX + stat.buttonW &&
                                    clickY >= stat.buttonY && clickY <= stat.buttonY + stat.buttonH) {
                                    addStatPoints(stat.key);
                                    return;
                                }
                            }
                        }

                        // 스킬 강화 버튼
                        for (let btn of game.skillTabButtons) {
                            if (hit(btn)) { upgradeSkill(btn.key); return; }
                        }

                        // 경험치 던전 입장
                        if (hit(game.dungeonButton)) { enterExpDungeon(); return; }

                        // 서버보스 난이도 선택
                        for (let b of game.bossTierButtons) {
                            if (hit(b)) { game.serverBossTier = b.tier; return; }
                        }

                        // 서버보스 자동 소환 토글
                        if (hit(game.autoBossButton)) {
                            game.autoServerBoss = !game.autoServerBoss;
                            game.autoBossCounter = 0;
                            floatMsg(game.autoServerBoss ? '🔁 서버보스 자동 소환 ON' : '자동 소환 OFF', '#2ecc71');
                            return;
                        }

                        // 상점 버튼
                        if (hit(game.serverBossButton)) { spawnServerBoss(); return; }
                        if (hit(game.scrollButton)) { buyScroll(); return; }
                        if (hit(game.cubeButton)) { buyCube(); return; }
                        if (hit(game.petScrollButton)) { buyPetScroll(); return; }
                        if (hit(game.petButton)) { petAction(); return; }
                        if (hit(game.petBookButton)) { game.showPetBook = true; return; }
                        if (hit(game.hpPotionButton)) { buyHpPotion(); return; }
                        if (hit(game.mpPotionButton)) { buyMpPotion(); return; }

                        // 맵 이동 버튼
                        for (let btn of game.eventZoneButtons) {
                            if (hit(btn)) {
                                if (btn.index <= game.maxUnlockedZone) goToZone(btn.index);
                                return;
                            }
                        }

                        // 보석 버튼 (뽑기/합성/장착/해제/페이지)
                        for (let btn of game.gemButtons) {
                            if (hit(btn)) {
                                if (btn.action === 'gem1') pullGem(1);
                                else if (btn.action === 'gem10') pullGem(10);
                                else if (btn.action === 'merge') mergeGem(btn.type, btn.grade);
                                else if (btn.action === 'equip') equipGem(btn.type, btn.grade);
                                else if (btn.action === 'unequip') unequipGem(btn.index);
                                else if (btn.action === 'gemPrev') game.gemPage = Math.max(0, game.gemPage - 1);
                                else if (btn.action === 'gemNext') game.gemPage++;
                                return;
                            }
                        }

                        // 훈장 버튼 (구매 / 강화 / 추가능력 / 큐브 구매)
                        for (let btn of game.medalButtons) {
                            if (hit(btn)) {
                                if (btn.action === 'buyMedal') buyMedal();
                                else if (btn.action === 'enhanceMedal') enhanceMedal();
                                else if (btn.action === 'gainMedalAbility') gainMedalAbility();
                                else if (btn.action === 'buyMedalCube') buyMedalCube();
                                return;
                            }
                        }

                        // 훈장 던전 입장
                        if (hit(game.medalDungeonButton)) { enterMedalDungeon(); return; }

                        // 가운데 패널은 모달 — 다른 곳 클릭은 게임에 전달하지 않음
                        return;
                    }

                    // 패널 없이 메뉴만 열린 상태: 좌측 메뉴 영역 클릭은 공격 안 함
                    if (clickX < 140) return;
                }
            }

            // 직업 선택
            if (game.selectingJob) {
                for (let btn of game.jobButtons) {
                    if (clickX >= btn.x && clickX <= btn.x + btn.w &&
                        clickY >= btn.y && clickY <= btn.y + btn.h) {
                        // 직업 확정
                        game.selectedJob = btn.job.name;
                        game.character.job = btn.job.name;
                        game.selectingJob = false;

                        // 직업 이미지 로드
                        loadImages(btn.job.name);
                        game.character.frameIndex = 0;
                        game.character.frameCounter = 0;

                        // 직업 보너스 적용
                        Object.keys(btn.job.bonus).forEach(key => {
                            game.character.stats[key] += btn.job.bonus[key];
                        });

                        return;
                    }
                }
            }

            // 공격
            playerAttack();
        });

        // 몬스터가 캐릭터가 바라보는 앞쪽에 있는지 판정
        function isInFront(monster) {
            const char = game.character;
            const dx = monster.x - char.x;
            // 오른쪽을 보면 오른쪽(dx>=0), 왼쪽을 보면 왼쪽(dx<=0)만 앞쪽
            return char.facing === 'right' ? dx >= 0 : dx <= 0;
        }

        // 플레이어 공격 (평타)
        function playerAttack() {
            const char = game.character;
            if (game.showMap || game.showShop || game.showQuest || game.selectingJob || game.eventTab) return; // 모달 열림
            if (char.isAttacking) return; // 이미 공격 중이면 무시
            sfx('attack');

            const job = char.job;
            // 과학자 / 환경미화원: 평타도 범위 공격 (공격력 0.75배)
            const aoeBasic = (job === '과학자' || job === '환경미화원');

            if (aoeBasic) {
                // 과학자는 사정거리 2.5배
                const range = (job === '과학자') ? BASE_ATTACK_RANGE * 2.5 : BASE_ATTACK_RANGE;

                // 사정거리 내 + 바라보는 앞쪽 몬스터만
                const targets = game.monsters.filter(m =>
                    Math.hypot(m.x - char.x, m.y - char.y) < range && isInFront(m)
                );
                if (targets.length === 0) return; // 범위 내 적 없으면 무시

                char.isAttacking = true;
                char.attackCounter = char.attackDuration;

                // 범위 표시 이펙트 (앞쪽 반원)
                game.skillEffects.push({
                    x: char.x, y: char.y, radius: 0, maxRadius: range,
                    duration: 15, maxDuration: 15,
                    color: (job === '과학자') ? '#27ae60' : '#e67e22',
                    type: 'aoe', facing: char.facing
                });

                targets.forEach(m => {
                    const r = applyCombatMods(effAttack() * 0.75, m);
                    damageMonster(m, r.dmg, r.crit ? '#ff5252' : '#ffff00', r.crit);
                });
                return;
            }

            // 그 외 직업: 단일 대상 (가장 가까운 몬스터)
            const attackRange = BASE_ATTACK_RANGE;
            let closestMonster = null;
            let closestDist = Infinity;

            game.monsters.forEach(monster => {
                const dist = Math.hypot(monster.x - char.x, monster.y - char.y);
                if (dist < attackRange && dist < closestDist && isInFront(monster)) {
                    closestMonster = monster;
                    closestDist = dist;
                }
            });

            if (closestMonster) {
                char.isAttacking = true;
                char.attackCounter = char.attackDuration;
                const r = applyCombatMods(effAttack(), closestMonster);
                damageMonster(closestMonster, r.dmg, r.crit ? '#ff5252' : '#ffff00', r.crit);
            }
        }

        // 🔥 연속 처치 콤보 설정
        const COMBO_DURATION = 150;   // 콤보 유지 시간 (프레임, ~2.5초)
        const COMBO_MAX = 50;         // 코인 보너스가 더 안 오르는 콤보 상한
        const COMBO_COIN_PER = 0.01;  // 콤보 1당 코인 +1% (최대 +50%)

        // 몬스터에게 데미지를 입히고, 처치 시 보상/레벨업 처리
        function damageMonster(monster, damage, color, crit) {
            // 📊 데미지 통계 (최고 단일타 + 누적)
            if (damage > game.maxHit) game.maxHit = damage;
            game.totalDamageDealt += damage;
            // 길드전 무적 보스: 체력 안 깎고 데미지만 누적 (절대 안 죽음)
            if (monster.isRaid) {
                game.raidDamage += damage;
            } else {
                monster.hp -= damage;
            }

            // 데미지 텍스트 추가 — 숫자 스프라이트로 표시 (크리티컬은 더 크게)
            game.damageText.push({
                x: monster.x,
                y: monster.y - 50,
                sprite: true,
                spriteText: String(damage),
                h: crit ? 48 : 32,
                text: crit ? `${damage.toLocaleString()}!` : `-${damage.toLocaleString()}`, // 폴백
                alpha: 1,
                duration: crit ? 40 : 30,
                color: color || '#ffff00'
            });

            // 서버보스 남은 체력은 update()에서 1초마다 저장 (매 타격 저장 시 localStorage 동기 쓰기로 렉)

            // 몬스터 죽음 처리
            if (monster.hp <= 0) {
                killMonster(monster);
            }
        }

        // 몬스터 처치 (경험치 + 코인 + 레벨업)
        function killMonster(monster) {
            game.monsters = game.monsters.filter(m => m !== monster);
            sfx('kill');

            // 퀘스트용 처치 카운트 (던전 원킬 파밍은 제외)
            if (!game.inExpDungeon && !game.inMedalDungeon) { game.totalKills = (game.totalKills || 0) + 1; game.weeklyKills = (game.weeklyKills || 0) + 1; }

            // 🔥 연속 처치 콤보: 처치할 때마다 +1, 타이머 갱신. 콤보당 코인 보너스(최대 +50%)
            game.comboKills++;
            game.comboTimer = COMBO_DURATION;
            const comboBonus = 1 + Math.min(game.comboKills, COMBO_MAX) * COMBO_COIN_PER; // 1.00 ~ 1.50
            if (game.comboKills > 0 && game.comboKills % 10 === 0) floatMsg(`🔥 ${game.comboKills} 연속!`, '#ff9f1c');

            // 경험치 획득 (경험치 보석 보너스 + 1000레벨↑ 2배 + 🔥버닝 2배 적용)
            const expReward = Math.round((monster.expReward ?? 25) * (1 + gemBonus('exp') / 100) * expGainMult() * burningExpMult());
            game.character.stats.exp += expReward;

            // 코인 획득 (?? 사용: 던전 몹의 0코인이 10으로 둔갑하지 않게) — 🔥버닝 1.5배 + 콤보 보너스
            const coinReward = Math.round((monster.coinReward ?? 10) * burningCoinMult() * comboBonus);
            game.coins += coinReward;

            // 훈장 던전: 처치 시 훈장 조각 획득 (+ 팝업)
            if (game.inMedalDungeon) {
                game.medalShards += MEDAL_SHARD_PER_KILL;
                game.damageText.push({
                    x: monster.x, y: monster.y - 80,
                    text: `+${MEDAL_SHARD_PER_KILL} 🎗️`,
                    alpha: 1, duration: 40, color: '#ffd166'
                });
            }

            // 경험치 팝업 (경험치 0이면 표시 안 함 — 훈장 던전)
            if (expReward > 0) {
                game.damageText.push({
                    x: monster.x,
                    y: monster.y - 80,
                    text: `+${expReward.toLocaleString()} EXP`,
                    alpha: 1,
                    duration: 40,
                    color: '#ffff00'
                });
            }
            // 코인 팝업 (코인 0이면 표시 안 함 — 던전)
            if (coinReward > 0) {
                game.damageText.push({
                    x: monster.x,
                    y: monster.y - 105,
                    text: `+${coinReward.toLocaleString()} 🪙`,
                    alpha: 1,
                    duration: 45,
                    color: '#ffd700'
                });
            }

            // 레벨 업 (경험치가 여러 레벨치면 모두 처리)
            const st = game.character.stats;
            const skills = JOB_SKILLS[game.character.job];
            while (st.exp >= st.maxExp) {
                st.exp -= st.maxExp;
                st.level++;
                st.maxExp += DIFF.levelExpAdd; // 레벨업마다 필요 경험치 가파르게 증가
                st.statPoints += 5; // 5포인트 획득
                st.maxHp += 20;
                st.maxMana += 10;
                invalidateStats(); // maxHp 증가 반영
                st.hp = effMaxHp(); // 보석 포함 풀피로 회복
                st.mana = st.maxMana;
                sfx('levelup');

                // 레벨업으로 새 스킬 해제 알림 (이번에 넘은 레벨)
                if (skills) {
                    const unlockedNow = skills.find(s => !s.ultimate && s.unlock === st.level);
                    if (unlockedNow) {
                        floatMsg(`🎉 [${unlockedNow.key.toUpperCase()}] ${unlockedNow.name} 스킬 해제!`, unlockedNow.color);
                    }
                }
                // 패시브 해제 알림 (스킬바엔 안 뜨지만 자동 적용 시작)
                const pas = JOB_PASSIVES[game.character.job];
                if (pas && pas.unlock === st.level) {
                    floatMsg(`✨ 패시브 [${pas.name}] 발동! (자동 적용)`, '#ffd700');
                }
            }
            // 10레벨 이상이면 직업 선택 (레벨 점프로 건너뛰지 않게 >= 사용)
            if (st.level >= 10 && !game.selectedJob && !game.selectingJob) {
                game.selectingJob = true;
            }
            checkTitles(); // 🏷️ 레벨 칭호(세계관 최강자 등) 자동 지급

            // 보스 처치 → 다음 사냥터 해금 & 이동
            if (monster.isBoss) {
                game.bossKills = (game.bossKills || 0) + 1; // 퀘스트용
                game.weeklyBoss = (game.weeklyBoss || 0) + 1;
                game.boss = null;
                onBossDefeated();
            }

            // 서버보스 처치 → 체력 리셋(다음엔 풀피) + 궁극기 해제
            if (monster.isServerBoss) {
                game.serverBoss = null;
                localStorage.removeItem('serverBossHp_' + (monster.tier || 0));
                game.serverClearMsg = 240;
                game.damageText.push({
                    x: monster.x, y: monster.y - 130,
                    text: '🌐 서버보스 처치!', alpha: 1, duration: 60, color: '#8e44ad'
                });
                // 서버보스 처치 횟수 누적 → 10회 특수스킬(F), 30회 궁극기(R)
                game.serverBossKills = (game.serverBossKills || 0) + 1;
                game.weeklySboss = (game.weeklySboss || 0) + 1;
                const k = game.serverBossKills;
                const sj = JOB_SKILLS[game.character.job];
                if (k === SPECIAL_BOSS_KILLS) {
                    const sp = sj ? sj.find(s => s.special) : null;
                    floatMsg(sp ? `💥 특수 스킬 [F] ${sp.name} 해제!` : '💥 특수 스킬 해제!', '#00e5ff');
                } else if (!game.ultimateUnlocked && k >= ULTIMATE_BOSS_KILLS) {
                    game.ultimateUnlocked = true;
                    const ult = sj ? sj.find(s => s.ultimate) : null;
                    floatMsg(ult ? `🌟 궁극기 [R] ${ult.name} 해제!` : '🌟 궁극기 해제!', '#ff5252');
                } else if (!game.ultimateUnlocked) {
                    floatMsg(`🌐 서버보스 ${k}회 (F:10 · R:30)`, '#b388ff');
                }
                checkTitles(); // 🏷️ 서버보스 처치 칭호(서버의 공포) 즉시 지급
            }

            // 🌅 일일 보스 처치 → 오늘 처치 기록 + 큰 보상
            if (monster.isDailyBoss) {
                game.dailyBoss = null;
                game.dailyBossDate = todayStr();
                game.weeklyDboss = (game.weeklyDboss || 0) + 1;
                game.cubes += 5;
                game.serverClearMsg = 240;
                game.damageText.push({ x: monster.x, y: monster.y - 130, text: '🌅 일일 보스 처치! +🔮5', alpha: 1, duration: 70, color: '#ff9800' });
                floatMsg('🌅 일일 보스 처치! 내일 다시 도전하세요', '#ff9800');
            }

            checkPetUnlocks(); // 🐾 조건 충족 시 새 펫 자동 획득
        }

        // 보스 처치 처리
        function onBossDefeated() {
            checkTitles(); // 🏷️ 보스/서버보스 처치 칭호 자동 지급
            const nextZone = game.currentZone + 1;
            const firstClear = nextZone > game.maxUnlockedZone; // 첫 클리어 여부

            // 각성 트리거: 2막50 → 2차, 3막35 → 3차, 3막70 → 4차
            if (game.currentZone === ACT2_FINAL_ZONE && !game.awakened2) {
                triggerSecondAwakening();
            } else if (game.currentZone === ACT3_MID_ZONE && !game.awakened3) {
                triggerThirdAwakening();
            } else if (game.currentZone === ACT3_FINAL_ZONE && !game.awakened4) {
                triggerFourthAwakening();
            }

            if (nextZone < ZONES.length && firstClear) {
                // 다음 사냥터 해금 + 자동 이동 (최초 클리어 시에만)
                game.maxUnlockedZone = nextZone;
                game.zoneClearMsg = 180;
                // 막 개막 연출
                if (nextZone === ACT2_START_ZONE) {
                    floatMsg('🌌 2막 개막! 천상의 지배자를 쓰러뜨렸다!', '#c77dff');
                } else if (nextZone === ACT3_START_ZONE) {
                    floatMsg('🔥 3막 개막! 심연이 열렸다…', '#ff5252');
                }
                saveProgress();
                // 버그수정: 1.5초 사이 마을/탑/던전 진입 시 강제로 사냥터로 끌려나가는 것 방지
                setTimeout(() => {
                    if (!game.inTown && !game.inTower && !game.inExpDungeon && !game.inMedalDungeon) goToZone(nextZone);
                }, 1500);
            } else if (nextZone >= ZONES.length) {
                // 마지막 사냥터 클리어
                game.zoneClearMsg = 180;
                saveProgress();
                // 보스 재등장 (계속 사냥 가능)
                setTimeout(spawnBoss, 2000);
            } else {
                // 이미 클리어한 사냥터 재방문 — 보스만 재등장
                game.zoneClearMsg = 100;
                setTimeout(spawnBoss, 2000);
            }
        }

        // 모험가스킬 사용 (10레벨 전, Q키) — 공격력 2배 강타
        function useAdventurerSkill() {
            const char = game.character;
            if (game.skillCooldowns.q > 0) return;
            if (char.stats.mana < ADV_SKILL.manaCost) {
                game.damageText.push({ x: char.x, y: char.y - 60, text: '마나 부족!', alpha: 1, duration: 30, color: '#0099ff' });
                return;
            }
            char.stats.mana -= ADV_SKILL.manaCost;
            game.skillCooldowns.q = ADV_SKILL.cooldown;
            char.isAttacking = true; char.attackCounter = char.attackDuration;

            const raw = effAttack() * ADV_SKILL.mult; // 공격력 2배
            let closest = null, cd = Infinity;
            game.monsters.forEach(m => {
                const d = Math.hypot(m.x - char.x, m.y - char.y);
                if (d < ADV_SKILL.range && d < cd && isInFront(m)) { closest = m; cd = d; }
            });
            const fx = closest || { x: char.x + (char.facing === 'left' ? -60 : 60), y: char.y };
            game.skillEffects.push({ x: fx.x, y: fx.y, radius: 0, maxRadius: 70, duration: 18, maxDuration: 18, color: ADV_SKILL.color, type: 'single' });
            if (closest) {
                const r = applyCombatMods(raw, closest);
                damageMonster(closest, r.dmg, r.crit ? '#ff5252' : ADV_SKILL.color, r.crit);
            }
            floatMsg('⭐ 모험가의 일격! (공격력 2배)', ADV_SKILL.color);
        }

        // 직업 전용 스킬 사용 (key: q/w/e/r)
        function useSkill(key) {
            const char = game.character;
            if (game.showMap || game.showShop || game.showQuest || game.selectingJob || game.eventTab || game.inTown) return; // 모달/마을

            // 10레벨 전: Q = 모험가스킬 (직업스킬은 아직 잠김)
            if (hasAdventurerSkill()) {
                if (key === 'q') { useAdventurerSkill(); return; }
                game.damageText.push({ x: char.x, y: char.y - 60, text: 'Lv.10부터 직업스킬!', alpha: 1, duration: 35, color: '#ff6b6b' });
                return;
            }

            const skills = JOB_SKILLS[char.job];

            // 직업이 없으면 스킬 사용 불가
            if (!skills) {
                game.damageText.push({
                    x: char.x, y: char.y - 60, text: '직업 없음',
                    alpha: 1, duration: 30, color: '#ff6b6b'
                });
                return;
            }

            const skill = skills.find(s => s.key === key);
            if (!skill) return;

            // 해제 여부 체크
            if (!isSkillUnlocked(skill)) {
                const why = skill.ultimate ? `서버보스 ${ULTIMATE_BOSS_KILLS}회 필요!`
                    : skill.special ? `서버보스 ${SPECIAL_BOSS_KILLS}회 필요!`
                    : `Lv.${skill.unlock} 필요!`;
                game.damageText.push({ x: char.x, y: char.y - 60, text: why, alpha: 1, duration: 35, color: '#ff6b6b' });
                return;
            }

            // 쿨다운 체크
            if (game.skillCooldowns[key] > 0) return;

            // 마나 체크 (소비 마나 10배)
            if (char.stats.mana < skillManaCost(skill)) {
                game.damageText.push({
                    x: char.x, y: char.y - 60, text: '마나 부족!',
                    alpha: 1, duration: 30, color: '#0099ff'
                });
                return;
            }

            // 마나 소모 및 쿨다운 시작
            char.stats.mana -= skillManaCost(skill);
            sfx('skill');
            // 스킬쿨 보석으로 쿨다운 감소 (최대 GEM_CD_CAP%)
            const cdReduce = Math.min(GEM_CD_CAP, gemBonus('cooldown'));
            game.skillCooldowns[key] = Math.round(skill.cooldown * (1 - cdReduce / 100));

            // 공격 모션
            char.isAttacking = true;
            char.attackCounter = char.attackDuration;

            const rawSkill = effAttack() * skillMult(skill);

            if (skill.type === 'aoe') {
                // 범위 공격: 사정거리 내 + 앞쪽 몬스터만 타격
                game.skillEffects.push({
                    x: char.x, y: char.y, radius: 0, maxRadius: skill.range,
                    duration: 25, maxDuration: 25, color: skill.color,
                    type: 'aoe', facing: char.facing
                });

                const targets = game.monsters.filter(m =>
                    Math.hypot(m.x - char.x, m.y - char.y) < skill.range && isInFront(m)
                );
                // 복사본 순회 (처치 시 배열이 변경되므로)
                targets.forEach(m => {
                    const r = applyCombatMods(rawSkill, m);
                    damageMonster(m, r.dmg, r.crit ? '#ff5252' : skill.color, r.crit);
                });
            } else {
                // 단일 대상: 앞쪽에서 가장 가까운 몬스터 1마리
                let closest = null, closestDist = Infinity;
                game.monsters.forEach(m => {
                    const d = Math.hypot(m.x - char.x, m.y - char.y);
                    if (d < skill.range && d < closestDist && isInFront(m)) {
                        closest = m;
                        closestDist = d;
                    }
                });
                if (closest) {
                    game.skillEffects.push({
                        x: closest.x, y: closest.y, radius: 0, maxRadius: 60,
                        duration: 20, maxDuration: 20, color: skill.color, type: 'single'
                    });
                    const r = applyCombatMods(rawSkill, closest);
                    damageMonster(closest, r.dmg, r.crit ? '#ff5252' : skill.color, r.crit);
                }
            }

            // 스킬 이름 팝업
            game.damageText.push({
                x: char.x, y: char.y - 90, text: skill.name,
                alpha: 1, duration: 35, color: skill.color
            });
        }

        // 자동사냥: 준비된 스킬 중 강한 것부터 1개 사용 (없으면 false)
        function autoUseSkill() {
            // 🎵 음표공격 먼저 (보유 시, 준비됐으면)
            if (noteSkillReady()) { useNoteSkill(); return true; }
            const skills = JOB_SKILLS[game.character.job];
            if (!skills) return false;
            // 우선순위: 궁극기(R) → E → W → Q (강한 스킬 먼저)
            for (const key of ['f', 'r', 'e', 'w', 'q']) {
                const skill = skills.find(s => s.key === key);
                if (!skill) continue;
                if (!isSkillUnlocked(skill)) continue;
                if (game.skillCooldowns[key] > 0) continue;
                if (game.character.stats.mana < skillManaCost(skill)) continue;
                useSkill(key);
                return true;
            }
            return false;
        }

        // 이미지 로드 (직업명으로)
        function loadImages(className) {
            game.assetLoad.character = false;
            updateLoadingOverlay();
            game.character.images = {
                left: [],
                right: [],
            };

            // 모든 방향 스프라이트 로드 완료 (왼쪽/오른쪽 별도)
            const imageMap = (window.JOB_SPRITE_PATHS = {
                '마법사': {
                    right: [
                        './마법사 것기 1 오른쪽.png',
                        './마법사 것기 2 오른쪽.png',
                        './마법사 것기 3 오른쪽.png'
                    ],
                    left: [
                        './마법사 것기 1 왼쪽.png',
                        './마법사 것기2 왼쪽.png',
                        './마법사 것기 3 왼쪽.png'
                    ]
                },
                '암살자': {
                    right: [
                        './암살자 것기 1 오른쪽.png',
                        './암살자 것기 2 오른쪽.png',
                        './암살자 것기 3 오른쪽.png'
                    ],
                    left: [
                        './암살자 것기1 왼쪽.png',
                        './암살자 것기 2 왼쪽.png',
                        './암살자 것기 3 왼쪽.png'
                    ]
                },
                '과학자': {
                    right: [
                        './과학자 것기 1 오른쪽.png',
                        './과학자 것기 2 오른쪽.png',
                        './과학자 것기 3 오른쪽.png'
                    ],
                    left: [
                        './과학자 것기 1 왼쪽.png',
                        './과학자 것기 2왼쪽.png',
                        './과학자 것기 3 왼쪽.png'
                    ]
                },
                '환경미화원': {
                    right: [
                        './환경미화원 것기 1 오른쪽.png',
                        './환경미화원 것기 2 오른쪽.png',
                        './환경미화원 것기 3 오른쪽.png'
                    ],
                    left: [
                        './환경 미화원 것기1.png',
                        './환경미화원 것기 2 왼쪽.png',
                        './환경미화원 것기 2왼쪽.png'
                    ]
                }
            });

            const map = imageMap[className] || imageMap['마법사'];
            const total = (map.right || []).length + (map.left || []).length;
            let loaded = 0;
            function markDone() {
                loaded++;
                if (loaded >= total) {
                    game.assetLoad.character = true;
                    updateLoadingOverlay();
                }
            }
            if (total === 0) {
                game.assetLoad.character = true;
                updateLoadingOverlay();
                return;
            }
            (map.right || []).forEach((path) => {
                const img = new Image();
                img.onload = markDone;
                img.onerror = markDone;
                img.src = path;
                game.character.images.right.push(img);
            });
            (map.left || []).forEach((path) => {
                const img = new Image();
                img.onload = markDone;
                img.onerror = markDone;
                img.src = path;
                game.character.images.left.push(img);
            });
        }

        // 현재 캐릭터 식별 키 (생성 시각 기준, 새 캐릭터면 진행상황 초기화됨)
        function getCharKey() {
            const saved = localStorage.getItem('currentCharacter');
            if (!saved) return 'default';
            try { return JSON.parse(saved).createdAt || 'default'; }
            catch (e) { return 'default'; } // 손상된 저장값이어도 게임이 멈추지 않게
        }

        // 게임 진행 상황 저장
        function saveProgress() {
            const progress = {
                charKey: getCharKey(),
                stats: game.character.stats,
                x: game.character.x,
                direction: game.character.direction,
                job: game.character.job,
                selectedJob: game.selectedJob,
                coins: game.coins,
                currentZone: game.currentZone,
                maxUnlockedZone: game.maxUnlockedZone,
                bag: game.bag,
                equipped: game.equipped,
                nextItemId: game.nextItemId,
                scrolls: game.scrolls,
                cubes: game.cubes,
                musicNotes: game.musicNotes,
                boughtMike: game.boughtMike,
                hasNoteSkill: game.hasNoteSkill,
                ultimateUnlocked: game.ultimateUnlocked,
                serverBossKills: game.serverBossKills,
                totalKills: game.totalKills,
                bossKills: game.bossKills,
                totalPulls: game.totalPulls,
                totalStarforce: game.totalStarforce,
                totalGemPulls: game.totalGemPulls,
                questClaimed: game.questClaimed,
                guildName: game.guildName,
                guildUpgrade: game.guildUpgrade,
                guildShopLevel: game.guildShopLevel,
                awakened: game.awakened,
                awakened2: game.awakened2,
                awakened3: game.awakened3,
                awakened4: game.awakened4,
                raidBest: game.raidBest,
                skillLevels: game.skillLevels,
                home: game.home,
                serverBossTier: game.serverBossTier,
                petLevel: game.pet.level,
                petRarity: game.pet.rarity,
                petScrolls: game.petScrolls,
                hpPotions: game.hpPotions,
                mpPotions: game.mpPotions,
                gemInv: game.gemInv,
                equippedGems: game.equippedGems,
                medalGrade: game.medalGrade,
                medalEnhance: game.medalEnhance,
                medalAbilities: game.medalAbilities,
                medalCubes: game.medalCubes,
                medalShards: game.medalShards,
                autoHpPotion: game.autoHpPotion,
                autoMpPotion: game.autoMpPotion,
                maxHit: game.maxHit,
                totalDamageDealt: game.totalDamageDealt,
                lastAttendDate: game.lastAttendDate,
                attendStreak: game.attendStreak,
                achClaimed: game.achClaimed,
                dailyShopDate: game.dailyShopDate,
                dailyShopItems: game.dailyShopItems,
                boughtSciSkin: game.boughtSciSkin,
                equippedSciSkin: game.equippedSciSkin,
                weeklyClaimed: game.weeklyClaimed,
                weeklyResetDate: game.weeklyResetDate,
                weeklyKills: game.weeklyKills, weeklyBoss: game.weeklyBoss,
                weeklySboss: game.weeklySboss, weeklyDboss: game.weeklyDboss,
                weeklyTowerBest: game.weeklyTowerBest,
                dailyBossDate: game.dailyBossDate,
                towerBest: game.towerBest,
                towerCoin: game.towerCoin,
                titlesOwned: game.titlesOwned,
                titleEquipped: game.titleEquipped,
                petType: game.petType,
                petOwned: game.petOwned,
                lastSaveTime: Date.now()   // 🌙 오프라인 보상 계산용
            };
            localStorage.setItem('gameProgress', JSON.stringify(progress));
            try { updateRanking(); } catch (e) {}
            try { if (typeof cloudSave === 'function') cloudSave(); } catch (e) {} // ☁️ 자동 클라우드 백업(1분 쓰로틀)
        }

        // 서버보스 남은 체력 저장 (이어서 잡기용) — 사라지기 전/주기적으로 호출
        function saveServerBossHp() {
            const sb = game.serverBoss;
            if (sb && sb.hp > 0) {
                localStorage.setItem('serverBossHp_' + (sb.tier || 0), Math.round(sb.hp));
            }
        }

        // 캐릭터 로드
        function loadCharacter() {
            const saved = localStorage.getItem('currentCharacter');
            let data = null;
            if (saved) { try { data = JSON.parse(saved); } catch (e) { data = null; } } // 손상돼도 기본 캐릭터로 폴백
            if (data) {
                document.getElementById('charName').textContent = data.name;
                loadImages(data.class);

                // 스탯 설정 (직업별 능력치 전부 적용)
                game.character.stats.maxHp = data.stats.hp;
                game.character.stats.hp = data.stats.hp;
                game.character.stats.maxMana = data.stats.mana;
                game.character.stats.mana = data.stats.mana;
                if (typeof data.stats.attack === 'number') {
                    game.character.stats.attack = data.stats.attack;
                }
                if (typeof data.stats.defense === 'number') {
                    game.character.stats.defense = data.stats.defense;
                }
            } else {
                document.getElementById('charName').textContent = '모험가';
                loadImages('마법사');
            }

            // 진행 상황 불러오기 (같은 캐릭터일 때만)
            const progressRaw = localStorage.getItem('gameProgress');
            let progress = null;
            if (progressRaw) { try { progress = JSON.parse(progressRaw); } catch (e) { progress = null; } } // 손상돼도 진행복원만 건너뜀
            if (progress) {
                if (progress.charKey === getCharKey()) {
                    Object.assign(game.character.stats, progress.stats);
                    if (typeof progress.x === 'number') game.character.x = progress.x;
                    game.character.job = progress.job || '마법사'; // 전직 전이면 마법사 유지
                    game.selectedJob = progress.selectedJob || null;
                    if (typeof progress.coins === 'number') game.coins = progress.coins;
                    if (typeof progress.currentZone === 'number') game.currentZone = progress.currentZone;
                    if (typeof progress.maxUnlockedZone === 'number') game.maxUnlockedZone = progress.maxUnlockedZone;
                    // 보정: 최고 해금 사냥터는 최소한 현재 사냥터 이상이어야 함 (옛 세이브/꼬인 값 복구)
                    game.maxUnlockedZone = Math.min(ZONES.length - 1, Math.max(game.maxUnlockedZone || 0, game.currentZone || 0));
                    // 인벤토리 / 장착 / id 카운터 복원
                    if (Array.isArray(progress.bag)) {
                        // 구버전(armor/gem) 장비는 버리고, 유효한 슬롯만 복원
                        game.bag = progress.bag
                            .filter(it => ITEM_CATS.includes(it.cat))
                            .map(it => ({
                                id: it.id, cat: it.cat, rarity: it.rarity,
                                sub: it.sub || 0, star: it.star || 0, upg: it.upg || 0,
                                potential: Array.isArray(it.potential) ? it.potential : [],
                                atk: it.atk || 0, def: it.def || 0,
                                special: it.special || null
                            }));
                    }
                    if (progress.equipped) {
                        ITEM_CATS.forEach(cat => {
                            const id = progress.equipped[cat];
                            game.equipped[cat] = (typeof id === 'number' && game.bag.some(i => i.id === id))
                                ? id : null;
                        });
                    }
                    if (game.bag.length) {
                        game.nextItemId = Math.max(...game.bag.map(i => i.id)) + 1;
                    } else if (typeof progress.nextItemId === 'number') {
                        game.nextItemId = progress.nextItemId;
                    }
                    if (typeof progress.scrolls === 'number') game.scrolls = progress.scrolls;
                    if (typeof progress.cubes === 'number') game.cubes = progress.cubes;
                    if (typeof progress.musicNotes === 'number') game.musicNotes = progress.musicNotes;
                    if (progress.boughtMike) game.boughtMike = true;
                    if (progress.hasNoteSkill) game.hasNoteSkill = true;
                    if (progress.ultimateUnlocked) game.ultimateUnlocked = true;
                    if (typeof progress.serverBossKills === 'number') game.serverBossKills = progress.serverBossKills;
                    if (typeof progress.totalKills === 'number') game.totalKills = progress.totalKills;
                    if (typeof progress.bossKills === 'number') game.bossKills = progress.bossKills;
                    if (typeof progress.totalPulls === 'number') game.totalPulls = progress.totalPulls;
                    if (typeof progress.totalStarforce === 'number') game.totalStarforce = progress.totalStarforce;
                    if (typeof progress.totalGemPulls === 'number') game.totalGemPulls = progress.totalGemPulls;
                    if (Array.isArray(progress.questClaimed)) game.questClaimed = progress.questClaimed;
                    if (typeof progress.guildName === 'string') game.guildName = progress.guildName;
                    if (progress.guildUpgrade && typeof progress.guildUpgrade === 'object') {
                        game.guildUpgrade = { atk: progress.guildUpgrade.atk || 0, def: progress.guildUpgrade.def || 0, hp: progress.guildUpgrade.hp || 0 };
                    }
                    if (typeof progress.raidBest === 'number') game.raidBest = progress.raidBest;
                    if (typeof progress.guildShopLevel === 'number') game.guildShopLevel = progress.guildShopLevel;
                    if (progress.awakened) game.awakened = true;
                    if (progress.awakened2) game.awakened2 = true;
                    if (progress.awakened3) game.awakened3 = true;
                    if (progress.awakened4) game.awakened4 = true;
                    if (game.awakened || game.awakened2 || game.awakened3 || game.awakened4) applyAwakening(); // 각성 스킬 재적용
                    if (progress.skillLevels && typeof progress.skillLevels === 'object') game.skillLevels = progress.skillLevels;
                    if (progress.home && typeof progress.home === 'object') {
                        game.home = { hp: progress.home.hp || 0, atk: progress.home.atk || 0, def: progress.home.def || 0 };
                    } else if (typeof progress.homeLevel === 'number') {
                        game.home = { hp: progress.homeLevel, atk: 0, def: 0 }; // 구버전 마이그레이션
                    }
                    if (typeof progress.serverBossTier === 'number') game.serverBossTier = progress.serverBossTier;
                    if (typeof progress.petLevel === 'number') game.pet.level = progress.petLevel;
                    if (typeof progress.petRarity === 'number') game.pet.rarity = progress.petRarity;
                    if (typeof progress.petScrolls === 'number') game.petScrolls = progress.petScrolls;
                    if (typeof progress.hpPotions === 'number') game.hpPotions = progress.hpPotions;
                    if (typeof progress.mpPotions === 'number') game.mpPotions = progress.mpPotions;
                    // 신규 기능 복원
                    if (progress.autoHpPotion) game.autoHpPotion = true;
                    if (progress.autoMpPotion) game.autoMpPotion = true;
                    if (typeof progress.maxHit === 'number') game.maxHit = progress.maxHit;
                    if (typeof progress.totalDamageDealt === 'number') game.totalDamageDealt = progress.totalDamageDealt;
                    if (typeof progress.lastAttendDate === 'string') game.lastAttendDate = progress.lastAttendDate;
                    if (typeof progress.attendStreak === 'number') game.attendStreak = progress.attendStreak;
                    if (Array.isArray(progress.achClaimed)) game.achClaimed = progress.achClaimed;
                    if (typeof progress.dailyShopDate === 'string') game.dailyShopDate = progress.dailyShopDate;
                    if (Array.isArray(progress.dailyShopItems)) game.dailyShopItems = progress.dailyShopItems;
                    if (progress.boughtSciSkin) game.boughtSciSkin = true;
                    if (progress.equippedSciSkin) game.equippedSciSkin = true;
                    if (Array.isArray(progress.weeklyClaimed)) game.weeklyClaimed = progress.weeklyClaimed;
                    if (typeof progress.weeklyResetDate === 'string') game.weeklyResetDate = progress.weeklyResetDate;
                    if (typeof progress.weeklyKills === 'number') game.weeklyKills = progress.weeklyKills;
                    if (typeof progress.weeklyBoss === 'number') game.weeklyBoss = progress.weeklyBoss;
                    if (typeof progress.weeklySboss === 'number') game.weeklySboss = progress.weeklySboss;
                    if (typeof progress.weeklyDboss === 'number') game.weeklyDboss = progress.weeklyDboss;
                    if (typeof progress.weeklyTowerBest === 'number') game.weeklyTowerBest = progress.weeklyTowerBest;
                    if (typeof progress.dailyBossDate === 'string') game.dailyBossDate = progress.dailyBossDate;
                    if (typeof progress.towerBest === 'number') game.towerBest = progress.towerBest;
                    if (typeof progress.towerCoin === 'number') game.towerCoin = progress.towerCoin;
                    if (Array.isArray(progress.titlesOwned)) game.titlesOwned = progress.titlesOwned;
                    if (!game.titlesOwned.includes('beginner')) game.titlesOwned.unshift('beginner'); // 기본 칭호 항상 보유
                    if (typeof progress.titleEquipped === 'string' && game.titlesOwned.includes(progress.titleEquipped)) game.titleEquipped = progress.titleEquipped;
                    if (Array.isArray(progress.petOwned)) game.petOwned = progress.petOwned;
                    if (!game.petOwned.includes('dragon')) game.petOwned.unshift('dragon'); // 기본 펫 항상 보유
                    // 보유 + 실존하는 종류만 장착 (변조/구버전 방어)
                    if (typeof progress.petType === 'string' && game.petOwned.includes(progress.petType)
                        && PET_TYPES.some(p => p.id === progress.petType)) game.petType = progress.petType;
                    else game.petType = 'dragon';
                    // 보석 복원 (유효한 종류만)
                    if (progress.gemInv && typeof progress.gemInv === 'object') {
                        game.gemInv = {};
                        GEM_TYPES.forEach(t => {
                            if (progress.gemInv[t.key]) game.gemInv[t.key] = progress.gemInv[t.key];
                        });
                    }
                    if (Array.isArray(progress.equippedGems)) {
                        game.equippedGems = progress.equippedGems
                            .filter(g => g && GEM_TYPE_MAP[g.type] && g.grade >= GEM_MAX_GRADE && g.grade <= GEM_START_GRADE)
                            .slice(0, GEM_MAX_EQUIP);
                    }
                    // 훈장 복원
                    if (typeof progress.medalGrade === 'number') game.medalGrade = Math.max(0, Math.min(MEDAL_MAX_GRADE, progress.medalGrade));
                    if (typeof progress.medalEnhance === 'number') game.medalEnhance = Math.max(0, Math.min(MEDAL_MAX_ENHANCE, progress.medalEnhance));
                    if (Array.isArray(progress.medalAbilities)) {
                        game.medalAbilities = progress.medalAbilities
                            .filter(a => a && MEDAL_ABILITY_POOL.some(o => o.key === a.key) && typeof a.val === 'number');
                    }
                    if (typeof progress.medalCubes === 'number') game.medalCubes = progress.medalCubes;
                    if (typeof progress.medalShards === 'number') game.medalShards = progress.medalShards;
                    // === 🌙 오프라인 보상: 자리 비운 시간만큼 코인+경험치 (최대 12시간) ===
                    if (typeof progress.lastSaveTime === 'number') {
                        const elapsed = Date.now() - progress.lastSaveTime;
                        const mins = Math.floor(Math.min(Math.max(0, elapsed), 12 * 3600 * 1000) / 60000);
                        if (mins >= 1) {
                            const st = game.character.stats;
                            const lv = st.level || 1, zone = (game.maxUnlockedZone || 0) + 1;
                            const coins = mins * (15 + lv * 2 + zone * 25);
                            const exp = mins * Math.round((8 + lv) * expGainMult() * 0.5);
                            game.coins += coins;
                            // 오프라인 경험치는 조용히 레벨 처리 (효과음/팝업 스팸 방지)
                            st.exp += exp;
                            while (st.exp >= st.maxExp) {
                                st.exp -= st.maxExp; st.level++; st.maxExp += DIFF.levelExpAdd;
                                st.statPoints += 5; st.maxHp += 20; st.maxMana += 10;
                            }
                            invalidateStats(); st.hp = effMaxHp(); st.mana = st.maxMana;
                            checkTitles();
                            game.offlineReward = { mins, coins, exp, t: 360 }; // 팝업 (gameLoop에서 t 감소)
                        }
                    }
                    // 직업이 있으면 직업 걷기 이미지 로드
                    if (progress.job) {
                        loadImages(progress.job);
                    }
                }
            }
            // 시작 보너스 지급 안 함 (처음 시작하면 아무것도 안 줌)
        }

        // 마을 설정
        const TOWN_WIDTH = 1400; // 마을 가로 길이
        const HOME_X = 700;      // 마이홈 위치 (마을 중앙)
        const HOME_UP_BASE = 5000; // 집 업그레이드 기본 비용
        // 마이홈 강화: 체력/공격/방어 각각 레벨당 +5%
        function homeBonus(stat) { return (game.home[stat] || 0) * 5; }
        function homeUpgradeCost(stat) { return ((game.home[stat] || 0) + 1) * HOME_UP_BASE; }

        // === 훈장 시스템 (코인으로 등급 구매 + 조각으로 +15 강화까지 + 큐브로 추가능력) ===
        const MEDAL_NAMES = ['철', '청동', '은', '금', '백금', '에메랄드', '다이아', '마스터', '챌린저']; // 1~9등급
        const MEDAL_MAX_GRADE = 9;
        // 다음 등급(g+1) 구매 비용 (코인) — 마지막(9등급)이 3,000,000 코인
        const MEDAL_COST = [5000, 15000, 40000, 100000, 250000, 500000, 1000000, 2000000, 3000000];
        const MEDAL_CUBE_COST = 50000;       // 훈장 큐브 1개 가격 (코인)
        const MEDAL_SHARD_PER_KILL = 100;    // 훈장 던전 1킬당 훈장 조각 획득량
        const MEDAL_DUNGEON_COST = 20000;            // 훈장 던전 입장료 (코인)
        const MEDAL_DUNGEON_FRAMES = 10 * 60 * 60;   // 10분 (60fps)
        const MEDAL_MAX_ENHANCE = 15;
        // 0→1, 1→2, ... 14→15 까지 조각 비용 (총 15단계)
        const MEDAL_ENHANCE_COST = [
          800, 1600, 3000, 5200, 8500, 13500, 21000, 33000, 51000, 78000,
          120000, 185000, 280000, 430000, 650000
        ];
        function medalGradeBonus(g) { return g * 5; } // 등급당 공·방 +5% (9등급=45%)

        // 훈장 추가능력 풀 (큐브로 획득/재설정)
        const MEDAL_ABILITY_POOL = [
            { key: 'atkPct',   label: '공격력',         min: 4, max: 15 },
            { key: 'defPct',   label: '방어력',         min: 4, max: 15 },
            { key: 'hpPct',    label: '최대 체력',      min: 5, max: 18 },
            { key: 'bossPct',  label: '보스 공격력',    min: 8, max: 25 },
            { key: 'critRate', label: '크리티컬 확률',  min: 3, max: 10 },
            { key: 'critDmg',  label: '크리티컬 데미지', min: 6, max: 22 }
        ];
        // 등급이 높을수록 추가능력 줄 수 증가 (1~3줄)
        function medalAbilityLines() { const g = game.medalGrade; return g >= 7 ? 3 : g >= 4 ? 2 : g >= 1 ? 1 : 0; }
        function rollMedalAbilities() {
            const n = medalAbilityLines();
            const lines = [];
            for (let i = 0; i < n; i++) {
                const o = MEDAL_ABILITY_POOL[Math.floor(Math.random() * MEDAL_ABILITY_POOL.length)];
                lines.push({ key: o.key, label: o.label, val: o.min + Math.floor(Math.random() * (o.max - o.min + 1)) });
            }
            return lines;
        }
        // 훈장 추가능력 효과 합계 (key별 %)
        function medalAbilityBonus(key) {
            let sum = 0;
            (game.medalAbilities || []).forEach(a => { if (a.key === key) sum += a.val; });
            return sum;
        }
        // 훈장 등급 기본 보너스 (공·방 공통 %)
        function medalBonus() { 
            const g = game.medalGrade > 0 ? medalGradeBonus(game.medalGrade) : 0;
            const e = game.medalEnhance || 0;
            return g + e * 2;  // 강화 1당 +2% (최대 +30%)
        }

        function getMedalEnhanceCost() {
            const e = game.medalEnhance || 0;
            if (e >= MEDAL_MAX_ENHANCE) return 0;
            return MEDAL_ENHANCE_COST[e];
        }

        // 훈장 강화 (조각 소모)
        function enhanceMedal() {
            if (game.medalGrade <= 0) { floatMsg('먼저 훈장을 구매!', '#ff6b6b'); return; }
            const e = game.medalEnhance || 0;
            if (e >= MEDAL_MAX_ENHANCE) { floatMsg(`최대 +${MEDAL_MAX_ENHANCE} 강화!`, '#ffd700'); return; }
            const cost = getMedalEnhanceCost();
            if (game.medalShards < cost) { 
                floatMsg(`훈장 조각 부족! (필요 ${cost.toLocaleString()}🎗️)`, '#ff6b6b'); 
                return; 
            }
            game.medalShards -= cost;
            game.medalEnhance = Math.min(MEDAL_MAX_ENHANCE, e + 1);
            floatMsg(`🎖️ 훈장 +${game.medalEnhance} 강화 성공!`, '#4caf50');
            saveProgress();
        }

        // 다음 등급 훈장 구매 (코인 소모)
        function buyMedal() {
            if (game.medalGrade >= MEDAL_MAX_GRADE) { floatMsg('이미 최고 훈장!', '#ffd700'); return; }
            const cost = MEDAL_COST[game.medalGrade];
            if (game.coins < cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= cost;
            game.medalGrade++;
            floatMsg(`🎖️ ${MEDAL_NAMES[game.medalGrade - 1]} 훈장 획득!`, '#ffd700');
            saveProgress();
        }
        // 훈장 큐브 구매 (코인)
        function buyMedalCube() {
            if (game.coins < MEDAL_CUBE_COST) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= MEDAL_CUBE_COST;
            game.medalCubes++;
            floatMsg('🧿 훈장 큐브 +1', '#b388ff');
            saveProgress();
        }
        // 훈장 큐브 사용 → 추가능력 획득(랜덤 재설정)
        function gainMedalAbility() {
            if (game.medalGrade <= 0) { floatMsg('먼저 훈장을 구매!', '#ff6b6b'); return; }
            if (medalAbilityLines() <= 0) return;
            if (game.medalCubes < 1) { floatMsg('훈장 큐브 부족!', '#ff6b6b'); return; }
            game.medalCubes--;
            game.medalAbilities = rollMedalAbilities();
            floatMsg('🧿 훈장 추가능력 획득!', '#b388ff');
            saveProgress();
        }

        // 최대 일반 몬스터 수 (보스 제외, 리스폰 상한)
        const MAX_MONSTERS = 8;

        // 공용 몬스터 이미지
        const sharedMonsterImg = new Image();
        sharedMonsterImg.src = './몬스터-Photoroom.png';
        // 천상10 최종보스 = 4직업(마법사·암살자·과학자·환경미화원) 합체
        const finalBossImg = new Image();
        finalBossImg.src = './천상보스.png';

        // 일반 몬스터 생성 (현재 사냥터 능력치 적용)
        function spawnMonster(x, y) {
            // 경험치 던전: 전부 HP 1, 경험치는 깬 마지막 맵 몬스터와 동일, 코인 없음
            if (game.inExpDungeon) {
                const m = new Monster(x, y, 'monster', {
                    hp: 1, damage: 1, expReward: game.dungeonExp
                });
                m.coinReward = 0; // 던전은 경험치만 (0 || 10 문제 방지로 직접 설정)
                m.image = sharedMonsterImg;
                game.monsters.push(m);
                return;
            }
            // 훈장 던전: 전부 HP 1, 경험치·코인 없음 (처치 시 훈장 조각만 획득)
            if (game.inMedalDungeon) {
                const m = new Monster(x, y, 'monster', { hp: 1, damage: 1, expReward: 0 });
                m.coinReward = 0;
                m.image = sharedMonsterImg;
                game.monsters.push(m);
                return;
            }
            // 🗼 무한의 탑: 층(level)에 비례해 점점 강해지는 몬스터 (최고 사냥터 기준 스케일)
            if (game.inTower) {
                const base = ZONES[ZONES.length - 1];
                const lv = game.towerLevel;
                const scale = 1 + (lv - 1) * 0.45;   // 층마다 +45%
                const m = new Monster(x, y, 'monster', {
                    hp: Math.round(base.monHp * scale),
                    damage: Math.round(base.monDmg * (1 + (lv - 1) * 0.2)),
                    coinReward: Math.round(base.monCoin * (1 + lv * 0.3)),
                    expReward: Math.round(base.monExp * (1 + lv * 0.5))
                });
                m.image = sharedMonsterImg;
                game.monsters.push(m);
                return;
            }
            const zone = ZONES[game.currentZone];
            const monster = new Monster(x, y, 'monster', {
                hp: zone.monHp, damage: zone.monDmg, coinReward: zone.monCoin, expReward: zone.monExp
            });
            monster.image = sharedMonsterImg;
            game.monsters.push(monster);
        }

        // 보스 생성 (현재 사냥터 보스)
        function spawnBoss() {
            if (game.inExpDungeon || game.inMedalDungeon || game.raidActive || game.inTown || game.inTower) return; // 던전/길드전/마을/탑엔 사냥터 보스 없음
            if (game.boss) return; // 이미 보스가 있으면 중복 생성 방지
            const zone = ZONES[game.currentZone];
            const isFinal = game.currentZone === ACT1_FINAL_ZONE; // 천상10 = 1막 최종보스(4직업 합체)
            const boss = new Monster(MAP.width / 2, 320, 'boss', {
                isBoss: true,
                hp: zone.bossHp * (isFinal ? 4 : 1),       // 최종보스는 체력 4배
                damage: zone.bossDmg * (isFinal ? 1.6 : 1), // 공격력 1.6배
                coinReward: zone.bossCoin * (isFinal ? 10 : 1),
                expReward: zone.bossExp * (isFinal ? 10 : 1)
            });
            if (isFinal) {
                boss.image = finalBossImg;
                boss.isFinal = true;
                boss.width = 212;
                boss.height = 240;          // 합체 보스 이미지(300x340) 비율 유지
                boss.attackRange = 220;
                boss.label = '☠️ 천상의 지배자 (사천왕 합체)';
                sfx('boss');
            } else {
                boss.image = sharedMonsterImg;
            }
            game.boss = boss;
            game.monsters.push(boss);
        }

        // 현재 사냥터의 몬스터 초기화
        function initMonsters() {
            saveServerBossHp(); // 떠나기 전 서버보스 남은 체력 저장
            game.monsters = [];
            game.boss = null;
            game.serverBoss = null; // 사냥터 이동 시 서버보스는 사라짐 (재소환 필요)

            // 일반 몬스터를 맵 전체에 고르게 배치
            for (let i = 0; i < MAX_MONSTERS; i++) {
                const x = 200 + i * ((MAP.width - 400) / (MAX_MONSTERS - 1));
                spawnMonster(x, 350);
            }

            // 보스 등장
            spawnBoss();
        }

        // 서버보스 소환 (입힌 피해는 localStorage에 누적 저장)
        function spawnServerBoss(auto) {
            if (game.inExpDungeon || game.inMedalDungeon || game.raidActive || game.inTower) return; // 던전/길드전/탑 중엔 소환 안 함
            if (game.inTown) goToZone(game.currentZone); // 마을이면 사냥터로 나간 뒤 소환
            if (game.serverBoss) {
                // 이미 있으면 그 옆으로 이동 (수동일 때만)
                if (!auto) game.character.x = Math.max(0, Math.min(game.serverBoss.x - 170, MAP.width - game.character.width));
                return;
            }
            const tier = game.serverBossTier;
            const def = SERVER_BOSSES[tier];
            const saved = parseInt(localStorage.getItem('serverBossHp_' + tier), 10);
            const hp = (saved && saved > 0) ? Math.min(saved, def.maxHp) : def.maxHp;

            const sb = new Monster(Math.min(game.character.x + 280, MAP.width - 120), 300, 'serverboss', {
                isServerBoss: true,
                hp: def.maxHp,
                damage: def.damage,
                coinReward: def.coinReward,
                expReward: def.expReward
            });
            sb.hp = hp; // 저장된 남은 체력 적용 (maxHp는 풀피 기준)
            sb.tier = tier; // 어느 난이도인지 (체력 저장 키용)
            sb.image = sharedMonsterImg;
            game.serverBoss = sb;
            game.monsters.push(sb);
            sfx('boss');

            if (!auto) {
                // 수동 소환: 보스 옆으로 이동 + 이벤트 닫기 + 화려한 연출
                game.character.x = Math.max(0, Math.min(sb.x - 170, MAP.width - game.character.width));
                game.showEvent = false;
                game.eventTab = null;
                game.summonFlash = 36;
                for (let i = 0; i < 4; i++) {
                    game.skillEffects.push({
                        x: sb.x, y: sb.y, radius: 0, maxRadius: 180 + i * 70,
                        duration: 36 + i * 8, maxDuration: 36 + i * 8,
                        color: i % 2 ? '#b388ff' : '#8e44ad', type: 'single'
                    });
                }
            }
            game.damageText.push({
                x: sb.x, y: sb.y - 70,
                text: '🌐 서버보스 등장!', alpha: 1, duration: 50, color: '#8e44ad'
            });
        }

        // 🌅 일일 보스 (하루 1회, 강력 + 큰 보상)
        const DAILY_BOSS = { hpMult: 8, dmgMult: 3, baseTier: 1 }; // 노말 서버보스 기준 강화
        function dailyBossAvailable() { return game.dailyBossDate !== todayStr(); }
        function spawnDailyBoss() {
            if (game.inExpDungeon || game.inMedalDungeon || game.raidActive || game.inTower) { floatMsg('지금은 소환할 수 없어요', '#ff6b6b'); return; }
            if (!dailyBossAvailable()) { floatMsg('🌅 오늘 일일 보스는 이미 처치했어요 (내일 다시!)', '#ff9800'); return; }
            if (game.inTown) goToZone(game.currentZone);
            if (game.dailyBoss) { game.character.x = Math.max(0, Math.min(game.dailyBoss.x - 170, MAP.width - game.character.width)); return; }
            const def = SERVER_BOSSES[DAILY_BOSS.baseTier];
            const db = new Monster(Math.min(game.character.x + 280, MAP.width - 140), 300, 'dailyboss', {
                isDailyBoss: true,
                hp: def.maxHp * DAILY_BOSS.hpMult,
                damage: def.damage * DAILY_BOSS.dmgMult,
                coinReward: def.coinReward * 5,
                expReward: def.expReward * 5
            });
            db.image = finalBossImg;
            db.label = '🌅 일일 보스';
            game.dailyBoss = db;
            game.monsters.push(db);
            sfx('boss');
            game.character.x = Math.max(0, Math.min(db.x - 170, MAP.width - game.character.width));
            game.showEvent = false; game.eventTab = null; game.summonFlash = 36;
            game.damageText.push({ x: db.x, y: db.y - 90, text: '🌅 일일 보스 등장!', alpha: 1, duration: 60, color: '#ff9800' });
        }

        // 🗼 무한의 탑 (층마다 강해지는 몬스터, 최고층 기록)
        function enterTower() {
            if (game.inExpDungeon || game.inMedalDungeon || game.raidActive) { floatMsg('지금은 입장할 수 없어요', '#ff6b6b'); return; }
            game.inTower = true; game.inTown = false;
            game.towerLevel = 1;
            game.boss = null; game.serverBoss = null; game.dailyBoss = null;
            game.showEvent = false; game.eventTab = null;
            game.character.x = 300;
            spawnTowerFloor();
            floatMsg('🗼 무한의 탑 입장! 1층부터 도전', '#b388ff');
        }
        function spawnTowerFloor() {
            game.monsters = []; game.boss = null;
            for (let i = 0; i < MAX_MONSTERS; i++) {
                const x = 200 + i * ((MAP.width - 400) / (MAX_MONSTERS - 1));
                spawnMonster(x, 350);
            }
        }
        function towerNextFloor() {
            const cleared = game.towerLevel; // 방금 깬 층
            game.towerLevel++;
            if (game.towerLevel > game.towerBest) game.towerBest = game.towerLevel;
            if (game.towerLevel > (game.weeklyTowerBest || 0)) game.weeklyTowerBest = game.towerLevel;
            const reward = Math.max(1, cleared); // 🪙 탑 코인 = 깬 층수 (깊을수록 많이)
            game.towerCoin = (game.towerCoin || 0) + reward;
            checkPetUnlocks();
            checkTitles(); // 🏷️ 탑 기록 칭호 자동 지급
            floatMsg(`🗼 ${cleared}층 클리어! 🪙 탑 코인 +${reward}`, '#b388ff');
            spawnTowerFloor();
            saveProgress();
        }
        function exitTower() {
            if (!game.inTower) return;
            game.inTower = false;
            floatMsg(`🗼 무한의 탑 종료 (최고 ${game.towerBest}층)`, '#b388ff');
            goToZone(game.currentZone);
        }

        // 보스에게 즉시 이동 (보스가 없으면 소환)
        function warpToBoss() {
            if (game.inTown) goToZone(game.currentZone); // 마을이면 사냥터로 나간 뒤
            if (!game.boss) spawnBoss();
            if (game.boss) {
                // 보스 왼쪽 옆으로 순간이동
                game.character.x = Math.max(0, Math.min(game.boss.x - 120, MAP.width - game.character.width));
                game.character.facing = 'right';
                game.damageText.push({
                    x: game.character.x, y: game.character.y - 70,
                    text: '보스 출현!', alpha: 1, duration: 40, color: '#e74c3c'
                });
            }
        }

        // 사냥터 이동
        function goToZone(index) {
            if (index < 0 || index >= ZONES.length) return;
            if (index > game.maxUnlockedZone) return; // 아직 잠긴 사냥터

            game.inExpDungeon = false; // 사냥터로 나가면 던전 종료
            game.inMedalDungeon = false;
            game.inTown = false;       // 마을에서도 나감
            game.inTower = false;      // 무한탑에서 나가면 탑 상태도 해제 (상태 누수 방지)
            game.currentZone = index;
            game.character.x = 300;
            game.showMap = false;
            initMonsters();
            saveProgress();
        }

        // === 마을 / 마이홈 ===
        function goToTown() {
            saveServerBossHp(); // 마을 가기 전 서버보스 남은 체력 저장
            game.inTown = true;
            game.showHome = false;
            game.inExpDungeon = false;
            game.inMedalDungeon = false;
            game.inTower = false; // 무한탑 중 마을 가면 탑 종료 (상태 누수 방지)
            game.monsters = [];
            game.boss = null;
            game.serverBoss = null;
            game.showEvent = false; game.eventTab = null;
            game.showShop = false; game.showMap = false;
            game.character.x = HOME_X - 220; // 집이 보이는 위치
            game.character.facing = 'right';
            floatMsg('🏘️ 마을에 도착!', '#9be7ff');
        }
        function leaveTown() {
            game.showHome = false;
            goToZone(game.currentZone); // 사냥터 복귀
        }
        // 마이홈: 휴식 (HP/MP 완전 회복)
        function restAtHome() {
            game.character.stats.hp = effMaxHp();
            game.character.stats.mana = game.character.stats.maxMana;
            floatMsg('🛏️ 푹 쉬어서 체력·마나 완전 회복!', '#2ecc71');
        }
        // 마이홈 강화 (코인 → 체력/공격/방어 레벨↑)
        function upgradeHome(stat) {
            const cost = homeUpgradeCost(stat);
            if (game.coins < cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= cost;
            game.home[stat] = (game.home[stat] || 0) + 1;
            const label = { hp: '체력', atk: '공격력', def: '방어력' }[stat];
            floatMsg(`🏠 ${label} 강화 Lv.${game.home[stat]}! +${homeBonus(stat)}%`, '#ffd700');
            saveProgress();
        }

        // 경험치 던전 입장 / 종료
        function enterExpDungeon() {
            if (game.inExpDungeon) return;
            if (game.coins < EXP_DUNGEON_COST) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= EXP_DUNGEON_COST;
            game.inExpDungeon = true;
            game.inMedalDungeon = false; // 던전은 한 번에 하나만
            game.inTown = false; // 마을에서 입장 시 마을 해제
            game.inTower = false; // 무한탑 중 던전 입장 시 탑 종료 (탑코인 익스플로잇 방지)
            game.dungeonTimer = EXP_DUNGEON_FRAMES;
            // 도달한 가장 좋은(높은) 사냥터의 몬스터 경험치 — 범위 보정 + 현재 사냥터와 비교
            const bestZone = Math.min(ZONES.length - 1, Math.max(game.maxUnlockedZone || 0, game.currentZone || 0));
            game.dungeonExp = ZONES[bestZone].monExp;
            saveServerBossHp(); // 던전 입장 전 서버보스 남은 체력 저장
            game.boss = null;
            game.serverBoss = null;
            game.monsters = [];
            game.showEvent = false;
            game.eventTab = null;
            game.character.x = 300;
            // 던전을 몬스터로 가득 채움
            for (let i = 0; i < MAX_MONSTERS; i++) {
                const x = 200 + i * ((MAP.width - 400) / (MAX_MONSTERS - 1));
                spawnMonster(x, 350);
            }
            floatMsg(`⏳ 경험치 던전 입장! (10분, 1마리당 +${game.dungeonExp} EXP)`, '#ffd700');
            saveProgress();
        }
        function exitExpDungeon() {
            if (!game.inExpDungeon) return;
            game.inExpDungeon = false;
            game.dungeonTimer = 0;
            floatMsg('⏳ 경험치 던전 종료!', '#ffd700');
            goToZone(game.currentZone); // 원래 사냥터로 복귀
        }

        // 훈장 던전 입장 / 종료 (몬스터 원킬 → 훈장 조각 획득)
        function enterMedalDungeon() {
            if (game.inMedalDungeon) return;
            if (game.coins < MEDAL_DUNGEON_COST) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= MEDAL_DUNGEON_COST;
            game.inMedalDungeon = true;
            game.inExpDungeon = false; // 던전은 한 번에 하나만
            game.inTown = false;
            game.inTower = false; // 무한탑 중 던전 입장 시 탑 종료 (탑코인 익스플로잇 방지)
            game.medalDungeonTimer = MEDAL_DUNGEON_FRAMES;
            saveServerBossHp(); // 던전 입장 전 서버보스 남은 체력 저장
            game.boss = null;
            game.serverBoss = null;
            game.monsters = [];
            game.showEvent = false;
            game.eventTab = null;
            game.character.x = 300;
            for (let i = 0; i < MAX_MONSTERS; i++) {
                const x = 200 + i * ((MAP.width - 400) / (MAX_MONSTERS - 1));
                spawnMonster(x, 350);
            }
            floatMsg(`🎗️ 훈장 던전 입장! (10분, 1킬당 +${MEDAL_SHARD_PER_KILL}🎗️ 강화용)`, '#ffd700');
            saveProgress();
        }
        function exitMedalDungeon() {
            if (!game.inMedalDungeon) return;
            game.inMedalDungeon = false;
            game.medalDungeonTimer = 0;
            floatMsg('🎗️ 훈장 던전 종료!', '#ffd700');
            goToZone(game.currentZone);
        }

        // 마을 업데이트 (이동만, 전투 없음)
        function updateTown() {
            if (game.showHome) return; // 집 안에서는 정지
            let isMoving = false, newDir = game.character.direction;
            const running = !!keys['shift'];
            const sp = running ? game.character.speed * game.character.runMultiplier : game.character.speed;
            if (keys['a']) { game.character.x -= sp; isMoving = true; newDir = 'left'; }
            if (keys['d']) { game.character.x += sp; isMoving = true; newDir = 'right'; }
            game.character.x = Math.max(0, Math.min(game.character.x, TOWN_WIDTH - game.character.width));
            if (newDir === 'left' || newDir === 'right') game.character.facing = newDir;
            if (isMoving) {
                game.character.direction = newDir;
                game.character.frameCounter++;
                if (game.character.frameCounter >= game.character.frameDelay) {
                    game.character.frameCounter = 0;
                    const fcT = sciSkinOn() ? SCI_SKIN_FRAMES : 3;
                    game.character.frameIndex = (game.character.frameIndex + 1) % fcT;
                }
            } else {
                game.character.direction = 'idle';
                game.character.frameIndex = 0;
            }
            game.camera.x = game.character.x - canvas.width / 2;
            game.nearHome = Math.abs((game.character.x + game.character.width / 2) - HOME_X) < 110;
            updatePet(); // 마을에서도 펫이 따라오고 회복하게
            // 데미지/안내 텍스트는 계속 사라지게
            game.damageText = game.damageText.filter(d => { d.duration--; d.alpha = d.duration / 30; d.y -= 2; return d.duration > 0; });
            // 남은 스킬 이펙트도 계속 사라지게 (얼어붙음 방지)
            game.skillEffects = game.skillEffects.filter(fx => { fx.duration--; fx.radius = fx.maxRadius * (1 - fx.duration / fx.maxDuration); return fx.duration > 0; });
        }

        // 게임 업데이트
        function update() {
            // 지도/상점/직업선택/집 창이 열려 있으면 게임 일시정지
            if (game.showMap || game.showShop || game.showQuest || game.selectingJob || game.eventTab || game.showHome || game.showMenu || game.naming || game.pvpOpen || game.chatOpen || game.aucOpen || game.showRhythm || game.showAttend || game.showDailyShop || game.showTowerShop || game.showPetBook || game.showWorldBoss) return;

            // 마을에서는 전투 없이 이동만
            if (game.inTown) { updateTown(); return; }

            // ⚙️ 자동 물약: 체력 50% 이하 / 마나 30% 이하면 자동 사용 (물약 있을 때만)
            if (game.autoHpPotion && game.hpPotions > 0 && game.character.stats.hp < effMaxHp() * 0.5) useHpPotion();
            if (game.autoMpPotion && game.mpPotions > 0 && game.character.stats.mana < game.character.stats.maxMana * 0.3) useMpPotion();

            // 현재 체력이 보석 포함 최대치를 넘지 않게 (보석 해제 시 보정)
            const hpCap = effMaxHp();
            if (game.character.stats.hp > hpCap) game.character.stats.hp = hpCap;

            let isMoving = false;
            let newDirection = game.character.direction;

            // 달리기: Shift 누르면 빠르게 이동 (걷기 1·2 프레임만 반복)
            let isRunning = false;

            // 자동 사냥이 아닐 때만 입력 처리
            if (!game.autoHunt) {
                const running = !!keys['shift'];
                const moveSpeed = running
                    ? game.character.speed * game.character.runMultiplier
                    : game.character.speed;

                // 입력 처리 (A, D만)
                if (keys['a']) {
                    game.character.x -= moveSpeed;
                    isMoving = true;
                    newDirection = 'left';
                }
                if (keys['d']) {
                    game.character.x += moveSpeed;
                    isMoving = true;
                    newDirection = 'right';
                }

                // 실제로 움직일 때만 달리기 상태로 인정
                if (running && isMoving) isRunning = true;
            }

            // 자동 사냥 이동 (애니메이션 갱신 전에 처리해야 걷는 모션이 적용됨)
            if (game.autoHunt && game.monsters.length > 0) {
                // 가장 가까운 몬스터 찾기
                let closestMonster = null;
                let closestDist = Infinity;

                game.monsters.forEach(monster => {
                    const dist = Math.hypot(monster.x - game.character.x, monster.y - game.character.y);
                    if (dist < closestDist) {
                        closestMonster = monster;
                        closestDist = dist;
                    }
                });

                // 몬스터 쪽으로 이동 (자동사냥은 항상 달리기)
                if (closestMonster) {
                    const dx = closestMonster.x - game.character.x;

                    // 일정 거리 이상이면 달려서 접근
                    if (Math.abs(dx) > 100) {
                        isMoving = true;
                        isRunning = true; // 자동사냥 시 달리기
                        const moveSpeed = game.character.speed * game.character.runMultiplier;
                        if (dx < 0) {
                            game.character.x -= moveSpeed;
                            newDirection = 'left';
                        } else {
                            game.character.x += moveSpeed;
                            newDirection = 'right';
                        }
                    }

                    // 공격 + 스킬 자동 사용 (스킬이 준비됐으면 스킬 우선)
                    game.autoHuntCounter++;
                    if (game.autoHuntCounter >= game.autoHuntInterval) {
                        game.autoHuntCounter = 0;
                        if (spiritReady()) summonSpirit(); // 🧚 정령 자동 소환 (준비됐을 때만)
                        if (!autoUseSkill()) playerAttack();
                    }
                }
            } else {
                game.autoHuntCounter = 0;
            }

            // 경계 체크
            game.character.x = Math.max(0, Math.min(game.character.x, MAP.width - game.character.width));

            // 바라보는 방향 갱신 (좌/우로 움직일 때만, 정지해도 유지)
            if (newDirection === 'left' || newDirection === 'right') {
                game.character.facing = newDirection;
            }

            // 방향 변경 시 프레임 초기화
            if (newDirection !== game.character.direction) {
                game.character.direction = newDirection;
                game.character.frameIndex = 0;
                game.character.frameCounter = 0;
            }

            // 애니메이션 프레임 업데이트
            if (isMoving) {
                // 달리기는 앞 2프레임만(0,1), 걷기는 전체 (직업 3 / 과학자 스킨 5)
                const total = sciSkinOn() ? SCI_SKIN_FRAMES : 3;
                const frameCount = isRunning ? Math.min(2, total) : total;
                const delay = isRunning ? game.character.runFrameDelay : game.character.frameDelay;

                // 달리기로 전환 시 프레임이 2(인덱스 2)에 멈춰있으면 보정
                if (isRunning && game.character.frameIndex >= frameCount) {
                    game.character.frameIndex = 0;
                }

                game.character.frameCounter++;
                if (game.character.frameCounter >= delay) {
                    game.character.frameCounter = 0;
                    game.character.frameIndex = (game.character.frameIndex + 1) % frameCount;
                }
            } else {
                game.character.direction = 'idle';
                game.character.frameIndex = 0;
                game.character.frameCounter = 0;
            }

            // 카메라 업데이트 (캐릭터 중심)
            game.camera.x = game.character.x - canvas.width / 2;
            // (posInfo/dirInfo는 화면에 안 보이는 .ui라 매 프레임 갱신 제거 — 렉 방지)

            // 몬스터 업데이트
            game.monsters.forEach(monster => {
                const attacked = monster.update(game.character.x, game.character.y);
                if (attacked) {
                    monster.resetAttackCooldown();
                    if (game.invuln > 0) return; // 무적 중엔 피해 무시 (연쇄 사망 방지)
                    // 방어력(장비 포함)만큼 피해 감소 (최소 1)
                    const dmg = Math.max(1, monster.damage - effDefense());
                    game.character.stats.hp -= dmg;
                    if (game.character.stats.hp <= 0) {
                        game.character.stats.hp = 0;
                        playerDie(); // 사망 → 코인 10% 잃고 풀피 부활
                    }
                    // 데미지 텍스트 추가 — 맞은 피해도 숫자 스프라이트로 ('-' 포함)
                    game.damageText.push({
                        x: game.character.x,
                        y: game.character.y - 50,
                        sprite: true,
                        spriteText: `-${dmg}`,
                        h: 30,
                        text: `-${dmg.toLocaleString()}`, // 폴백
                        alpha: 1,
                        duration: 30
                    });
                }
            });

            // 데미지 텍스트 업데이트
            game.damageText = game.damageText.filter(damage => {
                damage.duration--;
                damage.alpha = damage.duration / 30;
                damage.y -= 2;
                return damage.duration > 0;
            });

            // 공격 상태 업데이트
            if (game.character.isAttacking) {
                game.character.attackCounter--;
                if (game.character.attackCounter <= 0) {
                    game.character.isAttacking = false;
                }
            }

            // 스킬 쿨다운 업데이트 (q/w/e/r)
            for (const k in game.skillCooldowns) {
                if (game.skillCooldowns[k] > 0) game.skillCooldowns[k]--;
            }

            // 펫 갱신 (자동 공격 + 체력/마나 회복)
            updatePet();
            updateSpirit(); // 자연 정령 (소환 시)

            // 스킬 이펙트 업데이트 (퍼지는 원)
            game.skillEffects = game.skillEffects.filter(fx => {
                fx.duration--;
                const progress = 1 - (fx.duration / fx.maxDuration);
                fx.radius = fx.maxRadius * progress;
                return fx.duration > 0;
            });
            // 동시에 너무 많은 이펙트가 쌓이면 렉 → 오래된 것부터 제거 (최대 12개)
            const MAX_SKILL_FX = 12;
            if (game.skillEffects.length > MAX_SKILL_FX) {
                game.skillEffects.splice(0, game.skillEffects.length - MAX_SKILL_FX);
            }

            // 몬스터 리스폰 (보스 제외, 일반 몬스터만 카운트)
            const inDungeon = game.inExpDungeon || game.inMedalDungeon;
            game.monsterSpawnCounter++;
            // 던전은 원킬이라 더 자주(0.5초) 가득 채워서 끊김 없이 사냥
            const spawnInterval = inDungeon ? 30 : game.monsterSpawnInterval;
            if (!game.raidActive && !game.inTower && game.monsterSpawnCounter >= spawnInterval) {
                game.monsterSpawnCounter = 0;
                let normalCount = game.monsters.filter(m => !m.isBoss && !m.isServerBoss).length;
                if (inDungeon) {
                    while (normalCount < MAX_MONSTERS) {
                        spawnMonster(Math.random() * (MAP.width - 200) + 100, 350);
                        normalCount++;
                    }
                } else if (normalCount < MAX_MONSTERS) {
                    spawnMonster(Math.random() * (MAP.width - 200) + 100, 350);
                }
            }

            // 🗼 무한의 탑: 현재 층 몬스터를 전부 잡으면 다음 층으로
            if (game.inTower && game.monsters.length === 0) towerNextFloor();

            // 경험치 던전 시간 카운트다운 → 0이면 종료
            if (game.inExpDungeon) {
                game.dungeonTimer--;
                if (game.dungeonTimer <= 0) exitExpDungeon();
            }
            // 훈장 던전 시간 카운트다운 → 0이면 종료
            if (game.inMedalDungeon) {
                game.medalDungeonTimer--;
                if (game.medalDungeonTimer <= 0) exitMedalDungeon();
            }
            // 길드전 카운트다운 → 0이면 종료
            if (game.raidActive) {
                game.raidTimer--;
                if (game.raidTimer <= 0) endGuildRaid();
            }

            // 서버보스 자동 소환 (없으면 2초 뒤 자동 재소환)
            if (game.autoServerBoss && !game.inExpDungeon && !game.inMedalDungeon) {
                if (!game.serverBoss) {
                    game.autoBossCounter++;
                    if (game.autoBossCounter >= 120) {
                        game.autoBossCounter = 0;
                        spawnServerBoss(true);
                    }
                } else {
                    game.autoBossCounter = 0;
                }
            }

            // (클리어/플래시/무적 타이머는 gameLoop에서 항상 처리 — 모달 열려도 계속 진행)

            // 진행 상황 자동 저장 (1초마다) + 서버보스 남은 체력
            game.saveCounter++;
            if (game.saveCounter >= 60) {
                game.saveCounter = 0;
                saveProgress();
                saveServerBossHp();
            }
        }

        // 테마별 배경 팔레트
        const THEME_STYLE = {
            '초원':   { sky: ['#aee3ff', '#e6f7e0'], hill1: '#a6d977', hill2: '#83bd57', ground: ['#7ec85a', '#4f8f38'], deco: 'plains' },
            '어둠숲': { sky: ['#26304a', '#1e3a30'], hill1: '#2c4a3a', hill2: '#1f3a2a', ground: ['#37623f', '#21401f'], deco: 'forest' },
            '동굴':   { sky: ['#39322c', '#241f1b'], hill1: '#4a4136', hill2: '#352d24', ground: ['#6b5b46', '#473a2c'], deco: 'cave' },
            '화산':   { sky: ['#511d1d', '#933a1e'], hill1: '#5b2a1c', hill2: '#3e1c12', ground: ['#5c2a20', '#33150f'], deco: 'volcano' },
            '설원':   { sky: ['#cfe8ff', '#f3faff'], hill1: '#dcebf4', hill2: '#c2d6e6', ground: ['#eef5fa', '#cad9e6'], deco: 'snow' },
            '설산':   { sky: ['#8ea7c4', '#cdddec'], hill1: '#9fb2c8', hill2: '#7e92ab', ground: ['#e6edf5', '#aebccd'], deco: 'snowpeak' },
            '장난감나라': { sky: ['#ffd9ef', '#fff6bf'], hill1: '#ffb3d9', hill2: '#9fd8ff', ground: ['#ffe7a6', '#ffb6d5'], deco: 'toy' },
            '천상':   { sky: ['#fbe9a8', '#fffdf2'], hill1: '#f3e3a0', hill2: '#ffffff', ground: ['#fffdf2', '#ece1b6'], deco: 'heaven' },
            '2막':    { sky: ['#0a0826', '#1d0b3a'], hill1: '#1c1342', hill2: '#100a2c', ground: ['#1a1038', '#080418'], deco: 'void' },
            '3막':    { sky: ['#2a0510', '#4a0a18'], hill1: '#3a0c18', hill2: '#250610', ground: ['#33060f', '#160207'], deco: 'void' } // 심연(붉은 어둠)
        };
        function curTheme() {
            const z = ZONES[game.currentZone];
            return (z && THEME_STYLE[z.theme]) || THEME_STYLE['초원'];
        }
        // 정수 → 의사난수 0~1 (장식 배치 고정용)
        function rnd(n) { n = (n << 13) ^ n; return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff; }

