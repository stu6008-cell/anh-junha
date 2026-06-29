        function fitGameToScreen() {
            const container = document.querySelector('.game-container');
            const margin = 20; // 가장자리 여백
            const scale = Math.min(
                (window.innerWidth - margin) / 1010,   // 1000 + 테두리 5*2
                (window.innerHeight - margin) / 610,
                1
            );
            container.style.transform = `scale(${scale})`;
        }
        window.addEventListener('resize', fitGameToScreen);
        fitGameToScreen();

        // === 플레이어 이름 (게임 시작 시 입력) ===
        function applyPlayerName() {
            const n = (localStorage.getItem('playerName') || '').trim();
            if (n) document.getElementById('charName').textContent = n;
            return n;
        }
        function askPlayerName() {
            const modal = document.getElementById('nameModal');
            const input = document.getElementById('nameInput');
            const cur = document.getElementById('charName').textContent;
            input.value = (cur && cur !== '모험가') ? cur : '';
            game.naming = true;
            modal.style.display = 'flex';
            setTimeout(() => input.focus(), 0);
        }
        function confirmPlayerName() {
            const input = document.getElementById('nameInput');
            let n = input.value.trim().slice(0, 10);
            if (!n) n = '모험가';
            const old = (document.getElementById('charName').textContent || '').trim();
            localStorage.setItem('playerName', n);
            document.getElementById('charName').textContent = n;
            document.getElementById('nameModal').style.display = 'none';
            game.naming = false;
            // 이름이 실제로 바뀌면: 옛 이름 기록을 새 이름으로 옮기고 옛 이름은 지운다
            if (old && old !== n) {
                // 로컬 랭킹(내 기록): 옛 이름 → 새 이름, 새 이름 중복은 제거
                try {
                    let list = getRanking().filter(e => e.name !== n);
                    const oi = list.findIndex(e => e.name === old);
                    if (oi >= 0) list[oi].name = n;     // 옛 기록을 새 이름으로
                    list.sort((a, b) => b.score - a.score);
                    localStorage.setItem('gameRanking', JSON.stringify(list.slice(0, 20)));
                } catch (e) {}
                // 온라인 랭킹: 옛 이름 기록을 새 이름으로 옮기고 옛 이름 삭제
                if (RANK_API) {
                    _lastSubmit = 0; _lastSubmitScore = -1; // 새 이름으로 다시 전송되도록
                    fetch(RANK_API, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({ rank: 'rename', old, name: n })
                    }).then(() => loadOnlineRanking()).catch(() => {});
                }
                // 길드에 가입돼 있으면 멤버 목록(과 리더)에도 새 이름 반영
                if (game.guildName) {
                    guildPost({ guild: 'rename', name: game.guildName, player: old, newName: n })
                        .then(() => guildFetchInfo(game.guildName))
                        .catch(() => {});
                }
            }
            try { updateRanking(); } catch (e) {}
        }
        document.getElementById('nameOk').addEventListener('click', confirmPlayerName);
        document.getElementById('nameInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirmPlayerName(); }
            e.stopPropagation(); // 게임 단축키로 전달되지 않게
        });

        // 🔥 버닝 이벤트 배너 — 게임 처음 들어오면 안내
        function showBurningEventBanner() {
            if (!burningActive()) return; // 이벤트 종료(7/3 이후)면 안 띄움
            const ban = document.createElement('div');
            ban.style.cssText = `
                position:fixed; top:18%; left:50%; transform:translateX(-50%) scale(0.85);
                z-index:99999; pointer-events:none; text-align:center;
                padding:22px 40px; border-radius:18px;
                background:linear-gradient(135deg,#ff512f,#dd2476);
                box-shadow:0 0 40px rgba(255,90,30,0.8), 0 8px 30px rgba(0,0,0,0.5);
                border:2px solid #ffd166; font-family:inherit;
                opacity:0; transition:opacity .4s ease, transform .4s ease;`;
            ban.innerHTML = `
                <div style="font-size:34px;font-weight:900;color:#fff;text-shadow:0 2px 8px #000;letter-spacing:1px;">🔥 버닝 이벤트 🔥</div>
                <div style="font-size:18px;font-weight:700;color:#ffe9c2;margin-top:8px;">지금 접속하면 특별 버프 적용 중!</div>
                <div style="font-size:22px;font-weight:900;color:#fff;margin-top:10px;">⭐ 경험치 <span style="color:#ffd166;">2배</span> &nbsp;·&nbsp; 🪙 코인 <span style="color:#ffd166;">1.5배</span></div>
                <div style="font-size:14px;font-weight:700;color:#ffe9c2;margin-top:8px;">⏰ 7월 3일까지!</div>`;
            document.body.appendChild(ban);
            requestAnimationFrame(() => { ban.style.opacity = '1'; ban.style.transform = 'translateX(-50%) scale(1)'; });
            setTimeout(() => {
                ban.style.opacity = '0';
                ban.style.transform = 'translateX(-50%) scale(0.85)';
                setTimeout(() => ban.remove(), 500);
            }, 4000);
        }

        // ===================== 🎵 리듬게임 (노래노래 이벤트) =====================
        // Q W E R 4키. 7월 10일까지 진행되는 "노래노래 이벤트".
        // 할 때마다 🎵음표 재화를 얻고, 한정 상점에서 음표로 [마이크 무기]·[음표공격 스킬]을 각각 1회 구매.
        const RHYTHM_EVENT_END = new Date('2026-07-10T23:59:59');
        function rhythmEventActive() { return new Date() <= RHYTHM_EVENT_END; }
        const MIKE_COST = 30;                     // 🎤 마이크 가격 (음표)
        const NOTESKILL_COST = 25;                // 🎵 음표공격 스킬 가격 (음표)
        const MIKE_ATK = 700;                     // 마이크 공격력 (고정)
        const RG_KEYS = ['q', 'w', 'e', 'r'];
        const RG_LABELS = ['Q', 'W', 'E', 'R'];
        const RG_COLORS = ['#ff5a7a', '#ffd166', '#4dd2ff', '#7CFC8A'];
        const RG_APPROACH = 1500;                 // 노트가 위에서 판정선까지 내려오는 시간(ms)
        const RG_SONG_LEN = 48000;                // 채보 길이(ms)
        const RG_PERFECT = 55, RG_GOOD = 120;     // 판정 윈도우(ms)
        const RG_MISS_PENALTY = 60;               // MISS 시 감점(점수는 0 미만으로 안 내려감)

        const rg = {
            state: 'intro',  // intro | play | result
            notes: [], startT: 0, score: 0, combo: 0, maxCombo: 0,
            hits: { perfect: 0, good: 0, miss: 0 },
            judge: '', judgeColor: '#fff', judgeT: 0,
            flash: [0, 0, 0, 0], lastScore: 0, coinReward: 0, gotMike: false,
            holding: [null, null, null, null], // 🎵 롱노트: 레인별 누르고 있는 노트
            buttons: []
        };
        let rgBest = parseInt(localStorage.getItem('rhythmBest') || '0', 10) || 0;

        // 시드 난수 → 채보가 매번 같게(연습 가능)
        function rgSeeded(seed) {
            let s = seed >>> 0;
            return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
        }
        function rgBuildChart() {
            const rand = rgSeeded(20260710);
            const notes = [];
            const beat = 380;
            let t = 1600;
            while (t < RG_SONG_LEN) {
                if (rand() < 0.18) { t += beat; continue; }      // 쉼표
                const lane = Math.floor(rand() * 4);
                if (rand() < 0.15) {                              // 🎵 가끔 롱노트(길게 누르기)
                    const hb = 2 + Math.floor(rand() * 3);        // 2~4박자 길이
                    notes.push({ time: t, lane, hold: true, dur: beat * hb, hit: false, dead: false, headJudged: false });
                    t += beat * (hb + 1);                         // 롱노트 뒤엔 한 박자 여유
                    continue;
                }
                notes.push({ time: t, lane, hit: false, dead: false });
                if (rand() < 0.12) {                              // 가끔 더블노트
                    let l2 = Math.floor(rand() * 4);
                    if (l2 === lane) l2 = (l2 + 1) % 4;
                    notes.push({ time: t, lane: l2, hit: false, dead: false });
                }
                t += (rand() < 0.3) ? beat / 2 : beat;            // 가끔 반박자
            }
            return notes;
        }
        function openRhythm() {
            game.showRhythm = true;
            game.showEvent = false; game.eventTab = null; game.showShop = false; game.showMenu = false;
            rg.state = 'intro';
        }
        function closeRhythm() { game.showRhythm = false; rg.state = 'intro'; }
        function startRhythm() {
            rg.notes = rgBuildChart();
            rg.score = 0; rg.combo = 0; rg.maxCombo = 0;
            rg.hits = { perfect: 0, good: 0, miss: 0 };
            rg.judge = ''; rg.judgeT = 0; rg.flash = [0, 0, 0, 0];
            rg.holding = [null, null, null, null];
            rg.coinReward = 0; rg.gotMike = false;
            rg.startT = performance.now();
            rg.state = 'play';
            // 노래노래 이벤트 — 시작하면 음악 자동 재생 (P로 끌 수 있음)
            bgmOn = true; bgm.play().catch(() => {});
        }
        function rgSongTime() { return performance.now() - rg.startT; }
        function rgJudge(text, color) { rg.judge = text; rg.judgeColor = color; rg.judgeT = 1; }
        function rgHit(lane) {
            if (rg.state !== 'play') return;
            rg.flash[lane] = 1;
            const now = rgSongTime();
            let best = null, bestD = 1e9;
            for (const n of rg.notes) {
                if (n.lane !== lane || n.hit || n.dead || n.headJudged) continue; // 누르는 중인 롱노트는 제외
                const d = Math.abs(n.time - now);
                if (d < bestD) { bestD = d; best = n; }
            }
            if (best && bestD <= RG_GOOD) {
                sfx('note');
                const perfect = bestD <= RG_PERFECT;
                if (best.hold) {
                    // 🎵 롱노트 머리 판정 → 끝까지 누르고 있기 시작
                    best.headJudged = true;
                    rg.holding[lane] = best;
                    if (perfect) { rg.score += 200 + rg.combo * 2; rg.hits.perfect++; rgJudge('PERFECT', '#ffd166'); }
                    else { rg.score += 100 + rg.combo; rg.hits.good++; rgJudge('GOOD', '#4dd2ff'); }
                } else {
                    best.hit = true;
                    if (perfect) { rg.score += 300 + rg.combo * 2; rg.hits.perfect++; rgJudge('PERFECT', '#ffd166'); }
                    else { rg.score += 120 + rg.combo; rg.hits.good++; rgJudge('GOOD', '#4dd2ff'); }
                }
                rg.combo++; if (rg.combo > rg.maxCombo) rg.maxCombo = rg.combo;
            } else {
                // 헛침: 콤보 끊김 + 감점 1회 + 통계 반영. 근처 살아있는 노트는 소비시켜 나중에 또 감점되지 않게
                rg.combo = 0;
                rg.score = Math.max(0, rg.score - RG_MISS_PENALTY);
                rg.hits.miss++;
                if (best && bestD <= RG_GOOD * 2 && !best.hit && !best.dead && !best.headJudged) best.dead = true;
                rgJudge('MISS', '#ff5a7a');
            }
        }
        // 🎵 롱노트 키를 뗐을 때 — 끝까지 잘 눌렀으면 성공(HOLD!), 너무 일찍 떼면 끊김(BREAK)
        function rgRelease(lane) {
            if (rg.state !== 'play') return;
            const n = rg.holding[lane];
            if (!n) return;
            rg.holding[lane] = null;
            const now = rgSongTime();
            const end = n.time + n.dur;
            if (now >= end - RG_GOOD) {
                // 끝까지 누르고 뗌 → 성공 보너스
                n.hit = true;
                rg.score += 150 + rg.combo * 2; rg.hits.perfect++;
                rg.combo++; if (rg.combo > rg.maxCombo) rg.maxCombo = rg.combo;
                sfx('note'); rgJudge('HOLD!', '#7CFC8A');
            } else {
                // 너무 일찍 뗌 → 끊김
                n.dead = true; rg.combo = 0;
                rg.score = Math.max(0, rg.score - RG_MISS_PENALTY); rg.hits.miss++;
                rgJudge('BREAK', '#ff5a7a');
            }
        }
        function updateRhythm() {
            if (rg.state !== 'play') return;
            const now = rgSongTime();
            // 🎵 롱노트: 끝까지 누르고 있으면(머리 판정 후 end 도달) 자동 성공
            for (let l = 0; l < 4; l++) {
                const n = rg.holding[l];
                if (n && now >= n.time + n.dur) {
                    n.hit = true; rg.holding[l] = null;
                    rg.score += 150 + rg.combo * 2; rg.hits.perfect++;
                    rg.combo++; if (rg.combo > rg.maxCombo) rg.maxCombo = rg.combo;
                    sfx('note'); rgJudge('HOLD!', '#7CFC8A');
                }
            }
            for (const n of rg.notes) {
                if (!n.hit && !n.dead && now - n.time > RG_GOOD) {
                    if (n.hold && n.headJudged) continue; // 누르고 있는 롱노트는 미스 아님(end에서 자동 성공)
                    n.dead = true; rg.combo = 0; rg.hits.miss++; rg.score = Math.max(0, rg.score - RG_MISS_PENALTY); rgJudge('MISS', '#ff5a7a');
                }
            }
            if (rg.judgeT > 0) rg.judgeT -= 0.04;
            for (let i = 0; i < 4; i++) if (rg.flash[i] > 0) rg.flash[i] -= 0.08;
            if (now > RG_SONG_LEN + 800) rgFinish();
        }
        function rgFinish() {
            rg.state = 'result';
            rg.lastScore = rg.score;
            if (rg.score > rgBest) { rgBest = rg.score; localStorage.setItem('rhythmBest', String(rgBest)); }
            rg.coinReward = Math.round(rg.score * 0.5);
            game.coins += rg.coinReward;
            // 🎵 음표 재화 — 이벤트 기간에만 획득 (점수에 비례, 최소 2개). 종료 후엔 점수도전만 가능
            rg.notesEarned = rhythmEventActive() ? Math.max(2, Math.floor(rg.score / 1600)) : 0;
            game.musicNotes += rg.notesEarned;
            saveProgress();
        }
        // 🎤 마이크 무기 생성 (공격력 700 고정 · 잠재능력 "음표공격 데미지 2배" 고정 · 재설정 불가)
        function grantMike() {
            const it = makeItem('weapon', 5);     // 신화 무기 베이스
            it.special = 'mike';
            it.atk = MIKE_ATK; it.def = 0;
            it.star = 0; it.upg = 0;
            it.potential = [{ key: 'noteDmg', label: '음표공격 데미지', val: 100 }]; // +100% = 2배
            addToBag(it);
            autoEquipIfBetter(it);
        }
        // 마이크 장착 여부 (음표공격 데미지 2배 판정)
        function mikeEquipped() {
            const id = game.equipped.weapon;
            const it = id ? getItemById(id) : null;
            return !!(it && it.special === 'mike');
        }
        // === 한정 상점 구매 ===
        function buyMike() {
            if (game.boughtMike) { floatMsg('이미 구매한 무기예요', '#ff6b6b'); return; }
            if (game.musicNotes < MIKE_COST) { floatMsg('🎵 음표 부족!', '#ff6b6b'); return; }
            game.musicNotes -= MIKE_COST;
            game.boughtMike = true;
            grantMike();
            sfx('coin');
            floatMsg('🎤 마이크 획득! (자동 장착)', '#ff9be3');
            saveProgress();
        }
        function buyNoteSkill() {
            if (game.hasNoteSkill) { floatMsg('이미 배운 스킬이에요', '#ff6b6b'); return; }
            if (game.musicNotes < NOTESKILL_COST) { floatMsg('🎵 음표 부족!', '#ff6b6b'); return; }
            game.musicNotes -= NOTESKILL_COST;
            game.hasNoteSkill = true;
            sfx('coin');
            floatMsg('🎵 음표공격 습득! [T] 키로 사용', '#ff9be3');
            saveProgress();
        }
        const SCI_SKIN_COST = 50;                 // ✨ 과학자 음표 스킨 가격 (음표)
        function buySciSkin() {
            if (game.boughtSciSkin) { floatMsg('이미 구매한 스킨이에요', '#ff6b6b'); return; }
            if (game.musicNotes < SCI_SKIN_COST) { floatMsg('🎵 음표 부족!', '#ff6b6b'); return; }
            game.musicNotes -= SCI_SKIN_COST;
            game.boughtSciSkin = true;
            game.equippedSciSkin = true;                 // 사면 바로 장착
            sfx('coin');
            floatMsg('✨ 과학자 음표 스킨 획득! (과학자일 때 적용)', '#ff9be3');
            saveProgress();
        }
        function toggleSciSkin() {
            if (!game.boughtSciSkin) return;
            game.equippedSciSkin = !game.equippedSciSkin;
            floatMsg(game.equippedSciSkin ? '✨ 스킨 장착!' : '기본 외형으로 변경', '#ff9be3');
            saveProgress();
        }
        // === 🎵 음표공격 스킬 (글로벌, [T] 키) — 300%, 사냥 중인 모든 적 타격. 마이크 장착 시 2배 ===
        const NOTESKILL_MULT = 3;       // 300%
        const NOTESKILL_MANA = 25;
        const NOTESKILL_CD = 240;       // 쿨다운 (약 4초, 보석 쿨감 적용됨)
        function noteSkillReady() {
            return game.hasNoteSkill && (game.skillCooldowns['note'] || 0) <= 0 &&
                   game.character.stats.mana >= NOTESKILL_MANA * MANA_COST_MULT;
        }
        function useNoteSkill() {
            if (!game.hasNoteSkill) return;
            const char = game.character;
            if (game.showMap || game.showShop || game.showQuest || game.selectingJob || game.eventTab || game.inTown || game.showRhythm) return;
            if ((game.skillCooldowns['note'] || 0) > 0) return;
            const manaCost = NOTESKILL_MANA * MANA_COST_MULT;
            if (char.stats.mana < manaCost) { floatMsg('마나 부족!', '#0099ff'); return; }
            if (game.monsters.length === 0) return;
            char.stats.mana -= manaCost;
            sfx('skill');
            const cdReduce = Math.min(GEM_CD_CAP, gemBonus('cooldown'));
            const petCdMult = (game.petType === 'note') ? 0.4 : 1; // 🎵 음표펫 장착 시 쿨타임 60%↓
            game.skillCooldowns['note'] = Math.round(NOTESKILL_CD * (1 - cdReduce / 100) * petCdMult);
            char.isAttacking = true; char.attackCounter = char.attackDuration;
            const x2 = mikeEquipped();
            const raw = effAttack() * NOTESKILL_MULT * (x2 ? 2 : 1);
            // 사냥 중인 모든 적에 음표 + 데미지
            game.monsters.slice().forEach(m => {
                const r = applyCombatMods(raw, m);
                damageMonster(m, r.dmg, '#ff9be3', r.crit);
                game.damageText.push({ x: m.x, y: m.y - 90, text: '🎵', alpha: 1, duration: 40, color: '#ff9be3' });
            });
            game.damageText.push({ x: char.x, y: char.y - 95, text: '음표공격' + (x2 ? ' ×2!' : ''), alpha: 1, duration: 35, color: '#ff9be3' });
        }
        // 인트로/결과 가운데 패널
        function drawRgPanel(lines) {
            const W = canvas.width, H = canvas.height;
            const bw = 540, bh = 290, bx = (W - bw) / 2, by = (H - bh) / 2;
            ctx.fillStyle = 'rgba(20,16,40,0.96)'; ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            let ly = by + 38;
            lines.forEach((ln, i) => {
                if (i === 0) { ctx.fillStyle = '#ffd166'; ctx.font = 'bold 26px Arial'; }
                else if (ln.startsWith('[')) { ctx.fillStyle = '#7CFC8A'; ctx.font = 'bold 22px Arial'; }
                else if (ln.startsWith('🎤')) { ctx.fillStyle = '#ff9be3'; ctx.font = 'bold 18px Arial'; }
                else { ctx.fillStyle = '#fff'; ctx.font = '16px Arial'; }
                if (ln) ctx.fillText(ln, W / 2, ly);
                ly += 32;
            });
        }
        // 리듬게임 버튼 1개 그리기 + 클릭영역 등록
        function rgBtn(x, y, w, h, label, color, act, textColor) {
            ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = textColor || '#fff'; ctx.font = 'bold 17px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(label, x + w / 2, y + h / 2);
            rg.buttons.push({ x, y, w, h, act });
        }
        function drawRhythm() {
            if (!game.showRhythm) return;
            const W = canvas.width, H = canvas.height;
            ctx.fillStyle = 'rgba(8,6,20,0.93)'; ctx.fillRect(0, 0, W, H);

            const laneW = 70, gap = 8;
            const totalW = laneW * 4 + gap * 3;
            const left = (W - totalW) / 2;
            const top = 70, hitY = H - 96;

            ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.font = 'bold 22px Arial';
            ctx.fillText('🎵 노래노래 리듬게임', W / 2, 16);

            rg.buttons = [];
            // 닫기
            const cx = W - 44, cy = 16;
            ctx.fillStyle = '#c0392b'; ctx.fillRect(cx, cy, 28, 28);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.textBaseline = 'middle';
            ctx.fillText('✕', cx + 14, cy + 15);
            rg.buttons.push({ x: cx, y: cy, w: 28, h: 28, act: 'close' });

            // 레인
            for (let i = 0; i < 4; i++) {
                const lx = left + i * (laneW + gap);
                ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(lx, top, laneW, hitY - top);
                ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.strokeRect(lx, top, laneW, hitY - top);
                if (rg.flash[i] > 0) { ctx.save(); ctx.globalAlpha = 0.4 * rg.flash[i]; ctx.fillStyle = RG_COLORS[i]; ctx.fillRect(lx, top, laneW, hitY - top); ctx.restore(); }
            }
            // 판정선
            ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(left - 4, hitY); ctx.lineTo(left + totalW + 4, hitY); ctx.stroke();
            // 키 패드(클릭/터치 가능)
            for (let i = 0; i < 4; i++) {
                const lx = left + i * (laneW + gap);
                ctx.fillStyle = rg.flash[i] > 0 ? RG_COLORS[i] : 'rgba(0,0,0,0.55)';
                ctx.fillRect(lx, hitY + 6, laneW, 46);
                ctx.strokeStyle = RG_COLORS[i]; ctx.lineWidth = 2; ctx.strokeRect(lx, hitY + 6, laneW, 46);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(RG_LABELS[i], lx + laneW / 2, hitY + 30);
                rg.buttons.push({ x: lx, y: hitY + 6, w: laneW, h: 46, act: 'lane', lane: i });
            }

            if (rg.state === 'play') {
                const now = rgSongTime();
                for (const n of rg.notes) {
                    if (n.hit || n.dead) continue;
                    const lx = left + n.lane * (laneW + gap);
                    if (n.hold) {
                        // 🎵 롱노트: 머리~꼬리를 잇는 긴 막대
                        const headDt = n.time - now, tailDt = (n.time + n.dur) - now;
                        if (headDt > RG_APPROACH || tailDt < -RG_GOOD) continue;
                        let headY = top + (hitY - top) * (1 - headDt / RG_APPROACH);
                        const tailY = top + (hitY - top) * (1 - tailDt / RG_APPROACH);
                        if (n.headJudged) headY = hitY; // 누르는 중엔 머리를 판정선에 고정
                        const yTop = Math.min(headY, tailY), yBot = Math.max(headY, tailY);
                        ctx.save();
                        ctx.globalAlpha = n.headJudged ? 0.95 : 0.5;
                        ctx.fillStyle = RG_COLORS[n.lane];
                        ctx.fillRect(lx + 16, yTop, laneW - 32, yBot - yTop); // 본체(얇은 띠)
                        ctx.restore();
                        ctx.fillStyle = RG_COLORS[n.lane];
                        ctx.fillRect(lx + 7, headY - 11, laneW - 14, 22);      // 머리 캡
                        if (!n.headJudged) ctx.fillRect(lx + 7, tailY - 6, laneW - 14, 12); // 꼬리 캡
                    } else {
                        const dt = n.time - now;
                        if (dt > RG_APPROACH || dt < -RG_GOOD) continue;
                        const ny = top + (hitY - top) * (1 - dt / RG_APPROACH);
                        ctx.fillStyle = RG_COLORS[n.lane];
                        ctx.fillRect(lx + 7, ny - 11, laneW - 14, 22);
                    }
                }
                ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = 'bold 18px Arial';
                ctx.fillText('점수 ' + rg.score.toLocaleString(), left, top - 36);
                ctx.textAlign = 'right'; ctx.fillText('최고 ' + rgBest.toLocaleString(), left + totalW, top - 36);
                if (rg.combo > 1) { ctx.textAlign = 'center'; ctx.fillStyle = '#ffd166'; ctx.font = 'bold 30px Arial'; ctx.fillText(rg.combo + ' COMBO', W / 2, top + 50); }
                if (rg.judgeT > 0) {
                    ctx.textAlign = 'center'; ctx.fillStyle = rg.judgeColor;
                    ctx.save(); ctx.globalAlpha = Math.max(0, rg.judgeT); ctx.font = 'bold 34px Arial';
                    ctx.fillText(rg.judge, W / 2, hitY - 110); ctx.restore();
                }
                const pr = Math.min(1, now / RG_SONG_LEN);
                ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(left, top - 12, totalW, 5);
                ctx.fillStyle = '#7CFC8A'; ctx.fillRect(left, top - 12, totalW * pr, 5);
            } else if (rg.state === 'intro' || rg.state === 'result') {
                const bw = 560, bh = 320, bx = (W - bw) / 2, by = (H - bh) / 2;
                ctx.fillStyle = 'rgba(20,16,40,0.97)'; ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh);
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                let ly = by + 36;
                const line = (t, c, f) => { ctx.fillStyle = c; ctx.font = f; if (t) ctx.fillText(t, W / 2, ly); ly += 28; };
                if (rg.state === 'intro') {
                    line('🎵 노래노래 리듬게임', '#ffd166', 'bold 26px Arial'); ly += 4;
                    line('Q W E R 키로 노트를 판정선에 맞춰 치세요!  (MISS 시 감점)', '#fff', '15px Arial');
                    line('긴 막대(롱노트)는 끝까지 누르고 있다가 떼세요! 일찍 떼면 BREAK', '#7CFC8A', '13px Arial');
                    line('보유 음표  🎵 ' + game.musicNotes, '#ff9be3', 'bold 18px Arial');
                    line('최고 점수: ' + rgBest.toLocaleString(), '#fff', '15px Arial');
                    line(rhythmEventActive() ? '할 때마다 음표 획득! (이벤트 7/10까지)' : '이벤트 종료 — 점수 도전만 가능', '#aaa', '13px Arial');
                } else {
                    line('🎉 결과', '#ffd166', 'bold 26px Arial'); ly += 2;
                    line('점수 ' + rg.lastScore.toLocaleString() + (rg.lastScore >= rgBest ? '  (신기록!)' : ''), '#fff', 'bold 18px Arial');
                    line('PERFECT ' + rg.hits.perfect + '   GOOD ' + rg.hits.good + '   MISS ' + rg.hits.miss, '#fff', '14px Arial');
                    line('최대 콤보 ' + rg.maxCombo, '#fff', '14px Arial');
                    line('코인 +' + (rg.coinReward || 0).toLocaleString() + '🪙    음표 +🎵' + (rg.notesEarned || 0), '#ff9be3', 'bold 16px Arial');
                }
                // 버튼 2개
                const btnW = 200, btnH = 42, gapB = 16;
                const byb = by + bh - 60;
                rgBtn((W - btnW * 2 - gapB) / 2, byb, btnW, btnH, rg.state === 'intro' ? '▶ 시작하기' : '↻ 다시하기', '#7CFC8A', 'start', '#062');
                rgBtn((W - btnW * 2 - gapB) / 2 + btnW + gapB, byb, btnW, btnH, '🛒 한정상점', '#e84393', 'shop');
            } else if (rg.state === 'shop') {
                const bw = 620, bh = 500, bx = (W - bw) / 2, by = (H - bh) / 2;
                ctx.fillStyle = 'rgba(20,16,40,0.98)'; ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = '#e84393'; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh);
                ctx.textAlign = 'center'; ctx.textBaseline = 'top';
                ctx.fillStyle = '#ff9be3'; ctx.font = 'bold 24px Arial';
                ctx.fillText('🛒 한정 상점', W / 2, by + 16);
                ctx.fillStyle = '#ffd166'; ctx.font = 'bold 16px Arial';
                ctx.fillText('보유 음표  🎵 ' + game.musicNotes, W / 2, by + 46);

                // 카드 2개
                const cardW = bw - 60, cardX = bx + 30;
                const drawCard = (cy2, title, desc1, desc2, cost, owned, act) => {
                    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(cardX, cy2, cardW, 110);
                    ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.strokeRect(cardX, cy2, cardW, 110);
                    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 19px Arial'; ctx.fillText(title, cardX + 16, cy2 + 12);
                    ctx.fillStyle = '#cfe8ff'; ctx.font = '13px Arial';
                    ctx.fillText(desc1, cardX + 16, cy2 + 42);
                    ctx.fillStyle = '#aaa'; ctx.fillText(desc2, cardX + 16, cy2 + 62);
                    // 구매 버튼
                    const bW2 = 150, bH2 = 40, bX2 = cardX + cardW - bW2 - 14, bY2 = cy2 + 35;
                    if (owned) {
                        ctx.fillStyle = '#555'; ctx.fillRect(bX2, bY2, bW2, bH2);
                        ctx.fillStyle = '#bbb'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('구매 완료 ✔', bX2 + bW2 / 2, bY2 + bH2 / 2);
                    } else {
                        const ok = game.musicNotes >= cost;
                        ctx.fillStyle = ok ? '#27ae60' : '#7f3b3b'; ctx.fillRect(bX2, bY2, bW2, bH2);
                        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('구매  🎵' + cost, bX2 + bW2 / 2, bY2 + bH2 / 2);
                        rg.buttons.push({ x: bX2, y: bY2, w: bW2, h: bH2, act });
                    }
                };
                drawCard(by + 78, '🎤 마이크 (무기)', '공격력 ' + MIKE_ATK + ' · 잠재 [음표공격 데미지 2배] 고정', '※ 잠재능력 재설정 불가 · 평생 1회만 구매', MIKE_COST, game.boughtMike, 'buyMike');
                drawCard(by + 198, '🎵 음표공격 (스킬) [T]', '데미지 300% · 사냥 중인 모든 적을 한 번에 타격', '※ 마이크 장착 시 데미지 2배 · 1회만 구매', NOTESKILL_COST, game.hasNoteSkill, 'buyNote');

                // ✨ 과학자 음표 스킨 카드 (구매 후 장착/해제 토글)
                {
                    const scy = by + 318;
                    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(cardX, scy, cardW, 110);
                    ctx.strokeStyle = '#b388ff'; ctx.lineWidth = 1; ctx.strokeRect(cardX, scy, cardW, 110);
                    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 19px Arial'; ctx.fillText('✨ 과학자 음표 스킨 (외형)', cardX + 16, scy + 12);
                    ctx.fillStyle = '#cfe8ff'; ctx.font = '13px Arial'; ctx.fillText('과학자 캐릭터 외형을 음표 스킨으로 변경', cardX + 16, scy + 42);
                    ctx.fillStyle = '#aaa'; ctx.fillText('※ 과학자 직업에만 적용 · 언제든 장착/해제', cardX + 16, scy + 62);
                    const bW2 = 150, bH2 = 40, bX2 = cardX + cardW - bW2 - 14, bY2 = scy + 35;
                    if (!game.boughtSciSkin) {
                        const ok = game.musicNotes >= SCI_SKIN_COST;
                        ctx.fillStyle = ok ? '#27ae60' : '#7f3b3b'; ctx.fillRect(bX2, bY2, bW2, bH2);
                        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('구매  🎵' + SCI_SKIN_COST, bX2 + bW2 / 2, bY2 + bH2 / 2);
                        rg.buttons.push({ x: bX2, y: bY2, w: bW2, h: bH2, act: 'buySciSkin' });
                    } else {
                        ctx.fillStyle = game.equippedSciSkin ? '#2980b9' : '#555'; ctx.fillRect(bX2, bY2, bW2, bH2);
                        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText(game.equippedSciSkin ? '장착중 ✔ (해제)' : '장착하기', bX2 + bW2 / 2, bY2 + bH2 / 2);
                        rg.buttons.push({ x: bX2, y: bY2, w: bW2, h: bH2, act: 'toggleSciSkin' });
                    }
                }

                rgBtn(bx + bw / 2 - 90, by + bh - 50, 180, 38, '◀ 뒤로', '#555', 'back');
            }
        }

        // 시작
        updateLoadingOverlay();
        loadCharacter();
        initMonsters();
        checkAttendance(); // 📅 새 날짜면 출석 보상 + 팝업
        checkWeeklyReset(); // 📅 새 주면 주간 퀘스트 리셋
        checkPetUnlocks(); // 🐾 기존 진행도로 이미 해금된 펫 반영
        checkTitles();     // 🏷️ 기존 진행도로 이미 달성한 칭호 반영
        gameLoop();
        showBurningEventBanner();
        initOnlineRank(); // 온라인 랭킹 (설정돼 있으면 연결, 아니면 무시)
        if (game.guildName) guildFetchInfo(game.guildName); // 길드 공유 강화 동기화
        // 저장된 이름이 있으면 적용, 없으면 이름 입력창 띄우기
        if (!applyPlayerName()) askPlayerName();
        // ☁️ 이름이 있는(복귀) 플레이어면 클라우드에 더 최신 세이브가 있는지 확인
        try { if (typeof cloudSyncOnStart === 'function' && myName && myName() && myName() !== '모험가') cloudSyncOnStart(); } catch (e) {}
