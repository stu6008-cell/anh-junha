        function updateRanking() {
            const entry = rankEntry();
            let list = getRanking();
            const idx = list.findIndex(e => e.name === entry.name);
            if (idx >= 0) { if (entry.score > list[idx].score) list[idx] = entry; }
            else list.push(entry);
            list.sort((a, b) => b.score - a.score);
            localStorage.setItem('gameRanking', JSON.stringify(list.slice(0, 20)));
            submitOnlineScore(); // 온라인 랭킹이 켜져 있으면 같이 전송
        }
        function resetRanking() {
            localStorage.removeItem('gameRanking');
            floatMsg('🏆 내 기록을 초기화했어요', '#ff6b6b');
        }

        // ============================================================
        //  🌐 온라인 백엔드 (Supabase Edge Function — 랭킹 + 길드 + PvP 공용)
        //  아래 RANK_API 에 Supabase 함수 URL 을 넣으면 온라인 기능이 켜집니다.
        //    형식: https://<프로젝트ref>.supabase.co/functions/v1/game-api
        //  설정 방법은 supabase/SETUP.md 참고. 비어 있으면 '내 기록(오프라인)'만 사용.
        //  (구버전 Apps Script URL 도 그대로 동작하지만 느립니다)
        // ============================================================
        const RANK_API = "https://rnzlzoolkmhbftxgmwig.supabase.co/functions/v1/game-api"; // Supabase Edge Function

        // 실시간 PvP 용 Supabase Realtime (anon 공개키 — 클라이언트에 넣어도 안전)
        const SUPA_URL  = "https://rnzlzoolkmhbftxgmwig.supabase.co";
        const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuemx6b29sa21oYmZ0eGdtd2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTM5MjEsImV4cCI6MjA5NzQ2OTkyMX0.NeaADDlZ03Lp9FZNV_aFZdPCJRWJuBiWPSi8qvwRVGU";
        let _sbClient = null;
        function sbClient() {
            if (!_sbClient && window.supabase) _sbClient = window.supabase.createClient(SUPA_URL, SUPA_ANON);
            return _sbClient;
        }

        let ONLINE_RANK = null;                  // 불러온 온라인 랭킹 (null이면 로컬 사용)
        let _lastSubmit = 0, _lastSubmitScore = -1, _lastLoad = 0;

        function initOnlineRank() {
            if (!RANK_API) return;               // 미설정 → 오프라인 랭킹만
            loadOnlineRanking();
        }
        function loadOnlineRanking() {
            if (!RANK_API) return;
            _lastLoad = Date.now();
            fetch(RANK_API + '?t=' + Date.now())
                .then(r => r.json())
                .then(arr => {
                    if (Array.isArray(arr)) {
                        arr.sort((a, b) => (b.score || 0) - (a.score || 0));
                        ONLINE_RANK = arr;
                    }
                })
                .catch(() => {});
        }
        // 랭킹 탭을 보고 있을 때 15초마다 한 번씩만 새로고침
        function maybeRefreshOnline() {
            if (RANK_API && Date.now() - _lastLoad > 15000) loadOnlineRanking();
        }
        // 점수가 올랐을 때만, 최소 20초 간격으로 전송 (Apps Script 호출 아끼기)
        function submitOnlineScore() {
            if (!RANK_API) return;
            const score = computeScore();
            const now = Date.now();
            if (score <= _lastSubmitScore) return;
            if (now - _lastSubmit < 20000) return;
            _lastSubmit = now; // 20초 쓰로틀은 즉시 적용(실패해도 API 연타 방지)
            fetch(RANK_API, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(rankEntry())
            }).then(() => { _lastSubmitScore = score; loadOnlineRanking(); }) // 성공했을 때만 갱신 → 실패 시 다음에 재전송
              .catch(() => {});
        }

        // ============================================================
        //  ☁️ 클라우드 세이브 (캐릭터 이름별 전체 진행도 백업 — localStorage 유실 방지)
        //  저장 = saveProgress 가 만든 gameProgress JSON 을 그대로 업로드.
        //  불러오기 = 클라우드가 더 최신이면 덮어쓰고 새로고침.
        // ============================================================
        let _cloudT = 0;
        function cloudSave(force) {
            if (!RANK_API) return;
            const name = (typeof myName === 'function') ? myName() : '';
            if (!name) return;
            const now = Date.now();
            if (!force && now - _cloudT < 60000) return; // 1분 쓰로틀(자동저장 연타 방지)
            const raw = localStorage.getItem('gameProgress'); if (!raw) return;
            let data; try { data = JSON.parse(raw); } catch (e) { return; }
            _cloudT = now;
            fetch(RANK_API, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ cloud: 'save', name, data })
            }).then(r => r.json()).then(res => {
                if (force) floatMsg(res && res.ok ? '☁️ 클라우드에 저장했어요' : '클라우드 저장 실패', (res && res.ok) ? '#7fd8ff' : '#ff6b6b');
            }).catch(() => { if (force) floatMsg('클라우드 저장 실패(연결)', '#ff6b6b'); });
        }
        // manual=true: 사용자가 직접 누름(무조건 확인 후 덮어쓰기). false: 시작 시 자동(더 최신일 때만 제안)
        function cloudLoad(manual) {
            if (!RANK_API) { if (manual) floatMsg('온라인 미설정', '#ff6b6b'); return; }
            const name = (typeof myName === 'function') ? myName() : '';
            if (!name) { if (manual) floatMsg('이름이 없어요', '#ff6b6b'); return; }
            fetch(RANK_API + '?cloud=load&name=' + encodeURIComponent(name) + '&t=' + Date.now())
                .then(r => r.json())
                .then(res => {
                    const cloud = res && res.data;
                    if (!cloud) { if (manual) floatMsg('클라우드에 저장본이 없어요', '#ffd166'); return; }
                    const localRaw = localStorage.getItem('gameProgress');
                    let local = null; try { local = localRaw ? JSON.parse(localRaw) : null; } catch (e) {}
                    const cloudT = cloud.lastSaveTime || 0, localT = (local && local.lastSaveTime) || 0;
                    if (manual) {
                        if (!confirm('☁️ 클라우드 세이브를 불러올까요?\n지금 진행도는 덮어쓰여집니다.')) return;
                    } else if (cloudT <= localT + 60000) {
                        return; // 자동: 클라우드가 의미있게 더 최신일 때만
                    } else if (!confirm('☁️ 클라우드에 더 최신 세이브가 있어요.\n불러올까요? (지금 진행도는 덮어쓰여집니다)')) {
                        return;
                    }
                    localStorage.setItem('gameProgress', JSON.stringify(cloud));
                    location.reload();
                })
                .catch(() => { if (manual) floatMsg('클라우드 불러오기 실패(연결)', '#ff6b6b'); });
        }
        function cloudSyncOnStart() { cloudLoad(false); } // 시작 시 1회 자동 확인

        // ============================================================
        //  🌍 월드보스 (서버 전체가 같은 HP 공유 — 익스트림 3종)
        //  서버 권위 HP: 타격을 POST 하면 RPC 가 원자적으로 차감, 응답으로 최신 HP.
        //  10% 이상 기여 시 처치 때 보상 생성 → 수령(클라 권위 지급).
        // ============================================================
        const WB = { list: [], rewards: [], myDmg: {}, atkCd: 0, lastPoll: 0 };
        function wbFindType(t) { return WB.list.find(b => b.type === t); }
        function wbDead(b) { return b && b.reviveAt && new Date(b.reviveAt).getTime() > Date.now(); }
        function wbFetchState() {
            if (!RANK_API) return;
            fetch(RANK_API + '?wb=state&t=' + Date.now()).then(r => r.json()).then(a => { if (Array.isArray(a)) WB.list = a; }).catch(() => {});
        }
        function wbFetchRewards() {
            if (!RANK_API) return; const n = (typeof myName === 'function') ? myName() : ''; if (!n) return;
            fetch(RANK_API + '?wb=reward&name=' + encodeURIComponent(n) + '&t=' + Date.now()).then(r => r.json()).then(a => { if (Array.isArray(a)) WB.rewards = a; }).catch(() => {});
        }
        function openWorldBoss() {
            if (!RANK_API) { floatMsg('온라인 미설정 — 월드보스 불가', '#ff6b6b'); return; }
            game.showWorldBoss = true;
            wbFetchState(); wbFetchRewards(); WB.lastPoll = Date.now();
        }
        function closeWorldBoss() { game.showWorldBoss = false; }
        // 한 보스를 공격 — effAttack 기반 데미지를 서버 공유 HP에 적용 (쿨다운 0.35초)
        function wbAttack(type) {
            const n = (typeof myName === 'function') ? myName() : '';
            if (!n || n === '모험가') { floatMsg('이름을 먼저 정하세요', '#ff6b6b'); return; }
            const now = performance.now();
            if (now < WB.atkCd) return;
            WB.atkCd = now + 350;
            if (wbDead(wbFindType(type))) { floatMsg('아직 부활 전이에요', '#ffd166'); return; }
            const dmg = Math.max(1, Math.round(effAttack() * 12)); // 레이드 강타 (밸런스 조절 가능)
            sfx('attack');
            fetch(RANK_API, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ wb: 'hit', type: type, name: n, dmg: dmg })
            }).then(r => r.json()).then(res => {
                if (!res || res.error) return;
                const bb = wbFindType(type);
                if (bb) { bb.hp = res.hp; bb.maxHp = res.maxHp; bb.cycle = res.cycle; bb.reviveAt = res.reviveAt; }
                WB.myDmg[type] = res.myDmg;
                if (res.killed) {
                    sfx('boss');
                    WB.myDmg[type] = 0; // 처치 후 기여% 표시 초기화(부활 시 새 사이클)
                    const nm = (WB_BOSSES.find(x => x.type === type) || {}).name || '월드보스';
                    floatMsg('💥 ' + nm + ' 처치! 잠시 후 보상을 확인하세요', '#ffd700');
                    setTimeout(wbFetchRewards, 900);
                }
            }).catch(() => {});
        }
        // 처치 보상 수령 — 서버 목록 삭제 후 로컬 지급(클라 권위)
        function wbClaim() {
            const n = (typeof myName === 'function') ? myName() : ''; if (!n) return;
            const toGrant = (WB.rewards || []).slice();
            if (!toGrant.length) { floatMsg('받을 보상이 없어요', '#ffd166'); return; }
            // 먼저 로컬 지급 → 응답 유실로 보상이 증발하지 않게(클라 권위). 그 뒤 서버에서 삭제(실패해도 이미 지급됨).
            toGrant.forEach(c => wbGrantReward(c.type));
            WB.rewards = [];
            saveProgress();
            fetch(RANK_API, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ wb: 'claim', name: n })
            }).catch(() => {});
        }
        // 보스별 보상 지급 (코인/인벤/경험치는 클라 권위)
        function wbGrantReward(type) {
            if (type === 'golem') {
                const c = 50000000 + Math.floor(Math.random() * 30000000);
                game.coins += c;
                floatMsg('🪙 황금 골렘 보상! 코인 +' + c.toLocaleString(), '#ffcf40'); sfx('coin');
            } else if (type === 'dragon') {
                const cat = ITEM_CATS[Math.floor(Math.random() * ITEM_CATS.length)];
                addToBag(makeItem(cat, 5)); // 신화(최고) 등급
                if (!game.titlesOwned.includes('wbslayer')) { game.titlesOwned.push('wbslayer'); }
                floatMsg('🏆 보물지기 보상! 신화 장비 + 칭호 「서버 토벌자」', '#b06bff'); sfx('levelup');
            } else if (type === 'sage') {
                const st = game.character.stats;
                const exp = Math.round((200 + st.level * 60) * 30 * expGainMult());
                st.exp += exp;
                while (st.exp >= st.maxExp) { st.exp -= st.maxExp; st.level++; st.maxExp += DIFF.levelExpAdd; st.statPoints += 5; st.maxHp += 20; st.maxMana += 10; }
                invalidateStats(); st.hp = effMaxHp(); st.mana = st.maxMana; checkTitles();
                floatMsg('✨ 현자 보상! 경험치 폭탄 +' + exp.toLocaleString() + ' EXP', '#5fd6ff'); sfx('levelup');
            }
        }

        // ============================================================
        //  ⚔️ 실시간 PvP (브롤스타즈식 — Supabase Realtime 웹소켓)
        //  매칭은 RANK_API(방코드 배정/탐색), 실제 전투는 채널 broadcast.
        //  둘이 동시에 이동(WASD/화살표) + 공격(스페이스 자동조준) + 스킬(1~4).
        // ============================================================
        const ARENA_W = 500, ARENA_H = 330;
        const PLAYER_R = 15, SHOT_SPEED = 7, SHOT_R = 6, BASIC_R = 6;
        const MOVE_SPEED = 3.3;          // px/frame(60fps 기준)
        const BASIC_CD = 340;            // 기본공격 쿨다운(ms)
        const NET_MS = 50;               // 내 상태 전송 주기(ms) ≈ 20Hz
        const MANA_FULL_MS = 8000;       // 마나 0→풀 회복 시간(ms)

