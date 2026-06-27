        const PVP = {
            open: false, code: null, myIndex: 0, status: 'lobby', autoMatching: false,
            channel: null, started: false, me: null, opp: null, shots: [], bursts: [],
            lastSend: 0, lastBasic: 0, lastTs: 0, raf: null, winner: null, leftFlag: false,
            canvas: null, ctx: null, animFrame: 0,
            _tb: 0, _uid: null, _iDied: false   // 인덱스 합의용 tiebreaker/고유키, 내가 죽었는지(무승부 판정)
        };

        function pvpEsc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); }
        function closeBtn() { return `<div class="pvp-close" onclick="closePvp()">✕</div>`; }

        // 직업 이름으로 스프라이트 로드(상대 캐릭터용) — 같은 PNG 재사용, 캐시
        const _pvpSpriteCache = {};
        function pvpLoadJobSprite(job) {
            if (_pvpSpriteCache[job]) return _pvpSpriteCache[job];
            const paths = (window.JOB_SPRITE_PATHS || {})[job];
            const out = { left: [], right: [] };
            if (paths) {
                (paths.right || []).forEach(p => { const im = new Image(); im.src = p; out.right.push(im); });
                (paths.left || []).forEach(p => { const im = new Image(); im.src = p; out.left.push(im); });
            }
            _pvpSpriteCache[job] = out;
            return out;
        }

        // 내 캐릭터 → PvP 스냅샷 (실제 스탯/스킬 반영)
        function pvpSnapshotLite() {
            const job = game.character.job;
            const skills = (JOB_SKILLS[job] || [])
                .filter(s => isSkillUnlocked(s))
                .slice(0, 4)
                .map(s => ({
                    key: s.key, name: s.name, color: s.color,
                    mult: skillMult(s), mana: skillManaCost(s),
                    cd: Math.max(1.5, Math.ceil(s.cooldown / 120)) // 초
                }));
            return {
                name: myName(), job,
                atk: effAttack(), def: effDefense(),
                maxHp: effMaxHp(), maxMana: game.character.stats.maxMana,
                skills
            };
        }

        // === 열기 / 닫기 ===
        function openPvp() {
            if (!window.supabase) { alert('실시간 서버 로딩 실패 — 새로고침 후 다시 시도하세요'); return; }
            if (!sbClient()) { alert('실시간 서버 준비 안됨'); return; }
            PVP.open = true; game.pvpOpen = true;
            PVP.code = null; PVP.myIndex = 0; PVP.status = 'lobby';
            PVP.autoMatching = false; PVP.started = false;
            PVP.me = null; PVP.opp = null; PVP.shots = [];
            document.getElementById('pvpModal').style.display = 'flex';
            pvpUI();
        }
        function closePvp() {
            leaveChannel();
            if (PVP.raf) { cancelAnimationFrame(PVP.raf); PVP.raf = null; }
            PVP.open = false; game.pvpOpen = false; PVP.status = 'lobby'; PVP.started = false;
            for (const k in keys) keys[k] = false; // 눌린 키 해제(메인 캐릭 끼임 방지)
            document.getElementById('pvpModal').style.display = 'none';
        }

        // === 화면 전환 ===
        function pvpUI() {
            if (!PVP.open) return;
            if (PVP.status === 'playing') return;       // 아레나는 buildArena가 그림
            if (PVP.status === 'done') { renderResult(); return; }
            if (PVP.status === 'waiting') { renderWaiting(); return; }
            renderLobby();
        }
        function renderLobby() {
            const body = document.getElementById('pvpBody'); if (!body) return;
            body.innerHTML = closeBtn() +
                `<h2>⚔️ 실시간 PvP</h2>
                 <div class="sub">진짜 친구와 1:1 실시간 대결! 자동 매칭하거나 방 코드로 붙으세요.</div>
                 <button class="pvp-btn primary" onclick="pvpQuick()">🔍 자동 매칭</button>
                 <div style="margin-top:10px"><button class="pvp-btn" onclick="pvpCreate()">🏠 방 만들기</button></div>
                 <div style="margin-top:14px">
                    <input id="pvpCodeInput" maxlength="4" inputmode="numeric" placeholder="0000">
                    <button class="pvp-btn" onclick="pvpJoin(document.getElementById('pvpCodeInput').value)">▶ 참가</button>
                 </div>
                 <div class="sub" style="margin-top:14px">내 캐릭터: ${pvpEsc(game.character.job)} · 공 ${effAttack().toLocaleString()} / 방 ${effDefense().toLocaleString()} / 체 ${effMaxHp().toLocaleString()}</div>`;
        }
        function renderWaiting() {
            const body = document.getElementById('pvpBody'); if (!body) return;
            body.innerHTML = closeBtn() +
                `<h2>${PVP.autoMatching ? '🔍 자동 매칭 중…' : '🏠 방 생성 완료'}</h2>
                 <div class="sub">${PVP.autoMatching ? '상대를 찾고 있어요. 다른 사람이 매칭하면 바로 시작!' : '친구에게 이 코드를 알려주세요. 참가하면 자동 시작!'}</div>
                 <div class="pvp-code-big">${PVP.autoMatching ? '⏳' : PVP.code}</div>
                 <div class="sub">⏳ 상대를 기다리는 중…</div>
                 <button class="pvp-btn" onclick="pvpLeaveToLobby()">취소</button>`;
        }
        function renderResult() {
            const body = document.getElementById('pvpBody'); if (!body) return;
            const draw = PVP.winner === -1;
            const win = !draw && PVP.winner === PVP.myIndex;
            const title = draw ? '🤝 무승부' : (win ? '🏆 승리!' : '💀 패배…');
            const color = draw ? '#cdd6ea' : (win ? '#ffd700' : '#9aa6c0');
            const sub = PVP.leftFlag ? '상대가 나갔어요' : (draw ? '동시에 쓰러졌어요!' : (win ? '상대를 쓰러뜨렸어요!' : '아쉽다, 다시 도전!'));
            body.innerHTML = closeBtn() +
                `<h2 style="color:${color}">${title}</h2>
                 <div class="sub">${sub}</div>
                 <button class="pvp-btn primary" onclick="pvpLeaveToLobby()">🔁 새 대결</button>
                 <button class="pvp-btn" onclick="closePvp()">나가기</button>`;
        }

        // === 매칭 (RANK_API로 방코드 배정/탐색) ===
        function pvpPost(body) {
            return fetch(RANK_API, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(body)
            }).then(r => r.json());
        }
        function pvpCreate() {
            const code = '' + Math.floor(1000 + Math.random() * 9000);
            pvpPost({ pvp: 'create', code, state: { status: 'waiting', players: [myName()] } }).then(res => {
                if (res && res.error === 'exists') { pvpCreate(); return; }
                enterChannel(code, 0);
            }).catch(() => alert('서버 연결 실패'));
        }
        function pvpJoin(code) {
            code = (code || '').trim();
            if (!/^\d{4}$/.test(code)) { alert('4자리 숫자 방 코드를 입력하세요'); return; }
            pvpPost({ pvp: 'join', code, player: { name: myName() } }).then(res => {
                if (!res || res.error) { alert(res && res.error === 'full' ? '이미 시작됐거나 가득 찬 방입니다' : '방을 찾을 수 없습니다 (코드 확인)'); return; }
                enterChannel(code, 1);
            }).catch(() => alert('서버 연결 실패'));
        }
        function pvpQuick() {
            pvpPost({ pvp: 'quick', player: { name: myName() } }).then(res => {
                if (res && res.joined) { PVP.autoMatching = false; enterChannel(res.code, 1); }
                else { PVP.autoMatching = true; pvpCreate(); }
            }).catch(() => alert('서버 연결 실패'));
        }

        // === Realtime 채널 ===
        function chSend(event, payload) {
            if (PVP.channel) { try { PVP.channel.send({ type: 'broadcast', event, payload }); } catch (e) {} }
        }
        function leaveChannel() {
            if (PVP.channel) {
                try { chSend('left', {}); } catch (e) {}
                try { sbClient().removeChannel(PVP.channel); } catch (e) {}
                PVP.channel = null;
            }
        }
        function enterChannel(code, idx) {
            leaveChannel();
            PVP.code = code; PVP.myIndex = idx; PVP.status = 'waiting'; PVP.started = false;
            // 버그수정: 좌/우 역할(index)을 매칭 경로가 아니라 양쪽이 공유하는 tiebreaker로 확정
            //   → 매칭 레이스로 둘 다 같은 index 되어 매치가 영영 시작 안 되던 문제 방지
            PVP._uid = 'u' + Math.random().toString(36).slice(2) + idx; // presence 고유 키(둘이 절대 안 겹침)
            PVP._tb = Math.random();                                    // 인덱스 합의용 tiebreaker
            const sb = sbClient(); if (!sb) { alert('실시간 서버 준비 안됨'); return; }
            const ch = sb.channel('pvp-' + code, { config: { broadcast: { self: false }, presence: { key: PVP._uid } } });
            ch.on('broadcast', { event: 'state' }, ({ payload }) => onOppState(payload));
            ch.on('broadcast', { event: 'shot' }, ({ payload }) => onOppShot(payload));
            ch.on('broadcast', { event: 'burst' }, ({ payload }) => onBurst(payload));
            ch.on('broadcast', { event: 'dead' }, () => onOppDead());
            ch.on('broadcast', { event: 'left' }, () => onOppLeft());
            ch.on('presence', { event: 'sync' }, () => maybeStart());
            ch.on('presence', { event: 'leave' }, () => onOppLeft());
            ch.subscribe((status) => { if (status === 'SUBSCRIBED') { ch.track({ tb: PVP._tb, name: myName() }); maybeStart(); } });
            PVP.channel = ch;
            pvpUI();
        }
        function maybeStart() {
            if (PVP.status !== 'waiting' || PVP.started || !PVP.channel) return;
            const st = PVP.channel.presenceState();
            const keys = Object.keys(st);
            if (keys.length < 2) return;
            // 상대 메타(tiebreaker) 찾기
            let otherTb = null, otherName = '';
            for (const k of keys) {
                if (k === PVP._uid) continue;
                const meta = (st[k] || [])[0] || {};
                otherTb = meta.tb; otherName = meta.name || '';
            }
            if (otherTb == null) return; // 상대 tb 아직 도착 안 함 — 다음 sync 때 재시도
            // 작은 tb = 왼쪽(index 0), 큰 tb = 오른쪽(index 1). 동률이면 이름으로 결정 → 양쪽이 동일하게 합의
            const iAmFirst = (PVP._tb !== otherTb) ? (PVP._tb < otherTb) : (myName() < otherName);
            PVP.myIndex = iAmFirst ? 0 : 1;
            startMatch();
        }

        // === 상대 이벤트 ===
        function onOppState(p) {
            const o = PVP.opp; if (!o || !p) return;
            o.tx = p.x; o.ty = p.y; o.hp = p.hp;
            if (p.mh) o.maxHp = p.mh;
            o.dead = !!p.dead;
            if (p.name) o.name = p.name;
            if (p.job && o.job !== p.job) { o.job = p.job; o.sprites = pvpLoadJobSprite(p.job); }
            if (o.dead) handleOppDead();
        }
        function onOppShot(p) {
            if (!p) return;
            PVP.shots.push({ owner: 1 - PVP.myIndex, x: p.x, y: p.y, vx: p.vx, vy: p.vy, dmg: p.dmg, r: p.r || SHOT_R, color: p.color || '#ff8a5a', skill: !!p.skill, name: p.name || '' });
        }
        function onOppDead() { handleOppDead(); }
        // 상대 사망 처리 — 동시 사망(둘 다 죽음)이면 무승부(-1)로 정정
        function handleOppDead() {
            if (PVP.status === 'playing') { sfx('levelup'); endMatch(PVP.myIndex); return; }
            // 내가 방금 죽어 done 됐는데 상대도 죽었다는 통보가 옴 → 무승부
            if (PVP.status === 'done' && PVP._iDied && PVP.winner !== -1) { PVP.winner = -1; PVP.leftFlag = false; renderResult(); }
        }
        function onOppLeft() { if (PVP.status === 'playing') endMatch(PVP.myIndex, true); }

        // === 매치 시작 ===
        function startMatch() {
            if (PVP.started) return;
            PVP.started = true; PVP.status = 'playing';
            const snap = pvpSnapshotLite();
            const left = PVP.myIndex === 0;
            PVP.me = Object.assign({}, snap, {
                x: left ? 70 : ARENA_W - 70, y: ARENA_H / 2,
                hp: snap.maxHp, mana: snap.maxMana, dead: false, cd: {},
                sprites: game.character.images   // 내 스프라이트(이미 로드됨)
            });
            PVP.opp = {
                name: '상대', job: null, sprites: null,
                x: left ? ARENA_W - 70 : 70, y: ARENA_H / 2,
                tx: left ? ARENA_W - 70 : 70, ty: ARENA_H / 2,
                hp: 1, maxHp: 1, dead: false
            };
            PVP.shots = []; PVP.bursts = []; PVP.lastSend = 0; PVP.lastBasic = 0; PVP.lastTs = 0; PVP.winner = null; PVP.leftFlag = false; PVP._iDied = false;
            buildArena();
            sendState(true);
            PVP.raf = requestAnimationFrame(pvpFrame);
        }
        function buildArena() {
            const body = document.getElementById('pvpBody'); if (!body) return;
            body.innerHTML = closeBtn() +
                `<h2 style="font-size:18px;margin-bottom:2px">⚔️ 실시간 대결</h2>
                 <canvas id="pvpArena" width="${ARENA_W}" height="${ARENA_H}"></canvas>
                 <div class="pvp-hint">좌우 이동 <b>A / D</b> (← →) · 기본공격 <b>스페이스</b>(자동조준) · 스킬 <b>1~4</b><br>먼저 상대 체력을 0으로 만들면 승리!</div>`;
            PVP.canvas = document.getElementById('pvpArena');
            PVP.ctx = PVP.canvas.getContext('2d');
            // 클릭/터치로도 기본공격
            PVP.canvas.onpointerdown = () => {
                const now = performance.now();
                if (PVP.me && !PVP.me.dead && now - PVP.lastBasic > BASIC_CD) { PVP.lastBasic = now; fire(PVP.me.atk, '#9fe3ff', BASIC_R); }
            };
        }

        function endMatch(winnerIdx, leftFlag) {
            if (PVP.status === 'done') return;
            PVP.status = 'done'; PVP.winner = winnerIdx; PVP.leftFlag = !!leftFlag;
            if (PVP.raf) { cancelAnimationFrame(PVP.raf); PVP.raf = null; }
            renderResult();
        }
        function sendState() {
            const m = PVP.me; if (!m) return;
            chSend('state', { x: Math.round(m.x), y: Math.round(m.y), hp: Math.round(m.hp), mh: m.maxHp, dead: m.dead, name: m.name, job: m.job });
        }
        function fire(dmg, color, r, name) {
            const m = PVP.me, o = PVP.opp;
            if (!m || m.dead || !o) return;
            const skill = !!name;
            sfx(skill ? 'skill' : 'attack'); // 효과음

            let dx = o.x - m.x, dy = o.y - m.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
            const sh = { owner: PVP.myIndex, x: m.x + dx * (PLAYER_R + 4), y: m.y + dy * (PLAYER_R + 4), vx: dx * SHOT_SPEED, vy: dy * SHOT_SPEED, dmg, r: r || SHOT_R, color, skill, name: name || '' };
            PVP.shots.push(sh);
            chSend('shot', { x: sh.x, y: sh.y, vx: sh.vx, vy: sh.vy, dmg, r: sh.r, color, skill, name: sh.name });
        }
        // 스킬 폭발 이펙트 (메인 게임과 같은 빛나는 방사형)
        function pvpBurst(x, y, color, big) {
            const L = big ? 20 : 12;
            PVP.bursts.push({ x, y, color: color || '#fff', r: 0, maxR: big ? 64 : 26, life: L, maxLife: L });
        }
        function onBurst(p) { if (p) pvpBurst(p.x, p.y, p.color, p.big); }

        // === 메인 루프 ===
        function pvpFrame(ts) {
            if (!PVP.open || PVP.status !== 'playing') return;
            if (!PVP.lastTs) PVP.lastTs = ts;
            let dt = ts - PVP.lastTs; PVP.lastTs = ts; if (dt > 50) dt = 50;
            const f = dt / 16.67;
            const m = PVP.me, o = PVP.opp;

            if (!m.dead) {
                let dx = 0;
                if (keys['a'] || keys['arrowleft']) dx -= 1;
                if (keys['d'] || keys['arrowright']) dx += 1;
                if (dx) m.x += dx * MOVE_SPEED * f;   // 좌우만 이동 (위아래 X)
                m.x = Math.max(PLAYER_R, Math.min(ARENA_W - PLAYER_R, m.x));
                if (keys[' '] && ts - PVP.lastBasic > BASIC_CD) { PVP.lastBasic = ts; fire(m.atk, '#9fe3ff', BASIC_R); }
                m.skills.forEach((s, i) => {
                    if (keys[String(i + 1)]) {
                        const ready = (m.cd[s.key] || 0) <= ts;
                        if (ready && m.mana >= s.mana) { m.mana -= s.mana; m.cd[s.key] = ts + s.cd * 1000; fire(m.atk * s.mult, s.color || '#ffd166', SHOT_R + 4, s.name); }
                    }
                });
            }
            m.mana = Math.min(m.maxMana, m.mana + m.maxMana * (dt / MANA_FULL_MS));
            if (o) { const k = Math.min(1, 0.25 * f); o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; }

            for (let i = PVP.shots.length - 1; i >= 0; i--) {
                const sh = PVP.shots[i]; sh.x += sh.vx * f; sh.y += sh.vy * f;
                if (sh.x < -20 || sh.x > ARENA_W + 20 || sh.y < -20 || sh.y > ARENA_H + 20) { PVP.shots.splice(i, 1); continue; }
                if (sh.owner !== PVP.myIndex && !m.dead && Math.hypot(sh.x - m.x, sh.y - m.y) < sh.r + PLAYER_R) {
                    const dmg = Math.max(Math.round(sh.dmg * 0.1), Math.round(sh.dmg - m.def));
                    m.hp -= dmg; PVP.shots.splice(i, 1);
                    pvpBurst(sh.x, sh.y, sh.color, sh.skill);                       // 맞은 곳에 폭발 (내 화면)
                    chSend('burst', { x: sh.x, y: sh.y, color: sh.color, big: sh.skill }); // 상대 화면에도
                    if (m.hp <= 0) { m.hp = 0; m.dead = true; PVP._iDied = true; sfx('kill'); sendState(); chSend('dead', {}); endMatch(1 - PVP.myIndex); return; }
                }
            }
            // 폭발 이펙트 수명 갱신
            for (let i = PVP.bursts.length - 1; i >= 0; i--) {
                const b = PVP.bursts[i]; b.life--; b.r = b.maxR * (1 - b.life / b.maxLife);
                if (b.life <= 0) PVP.bursts.splice(i, 1);
            }
            if (ts - PVP.lastSend > NET_MS) { PVP.lastSend = ts; sendState(); }
            PVP.animFrame = Math.floor(ts / 150);
            arenaRender();
            PVP.raf = requestAnimationFrame(pvpFrame);
        }

        function arenaRender() {
            const ctx = PVP.ctx, m = PVP.me, o = PVP.opp; if (!ctx) return;
            ctx.fillStyle = '#0d1426'; ctx.fillRect(0, 0, ARENA_W, ARENA_H);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
            for (let gx = 0; gx <= ARENA_W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ARENA_H); ctx.stroke(); }
            for (let gy = 0; gy <= ARENA_H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(ARENA_W, gy); ctx.stroke(); }
            // 스킬 폭발 이펙트 (메인 게임과 같은 빛나는 방사형)
            PVP.bursts.forEach(b => {
                const alpha = b.life / b.maxLife, prog = 1 - alpha, rgb = hexToRgb(b.color), R = Math.max(1, b.r);
                ctx.save(); ctx.globalCompositeOperation = 'lighter';
                const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, R);
                g.addColorStop(0, `rgba(${rgb}, ${0.55 * alpha})`);
                g.addColorStop(0.55, `rgba(${rgb}, ${0.22 * alpha})`);
                g.addColorStop(1, `rgba(${rgb}, 0)`);
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
                const core = Math.max(0, 1 - prog * 2);
                if (core > 0) { ctx.fillStyle = `rgba(255,255,255,${0.9 * core})`; ctx.beginPath(); ctx.arc(b.x, b.y, 10 * core + 3, 0, Math.PI * 2); ctx.fill(); }
                ctx.restore();
            });
            // 발사체: 스킬은 빛나는 구체, 기본공격은 작은 탄
            PVP.shots.forEach(sh => {
                if (sh.skill) {
                    const rgb = hexToRgb(sh.color), R = sh.r * 2.4;
                    ctx.save(); ctx.globalCompositeOperation = 'lighter';
                    const g = ctx.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, R);
                    g.addColorStop(0, `rgba(${rgb}, 0.95)`);
                    g.addColorStop(0.5, `rgba(${rgb}, 0.45)`);
                    g.addColorStop(1, `rgba(${rgb}, 0)`);
                    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sh.x, sh.y, R, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r * 0.55, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillStyle = sh.color || '#fff'; ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2); ctx.fill();
                }
            });

            const SP_W = 48, SP_H = 56;
            function drawP(p, isMe) {
                if (!p) return;
                const other = isMe ? o : m;
                const faceLeft = other ? (other.x < p.x) : false;   // 상대를 바라봄
                const sprites = p.sprites;
                let frames = sprites ? (faceLeft ? sprites.left : sprites.right) : null;
                if (frames && !frames.length) frames = sprites.right;
                // 발밑 색 그림자 (나=파랑 / 상대=빨강 구분)
                ctx.fillStyle = isMe ? 'rgba(74,163,255,0.55)' : 'rgba(255,90,90,0.55)';
                ctx.beginPath(); ctx.ellipse(p.x, p.y + SP_H / 2 - 6, PLAYER_R, 6, 0, 0, Math.PI * 2); ctx.fill();
                const img = frames && frames[PVP.animFrame % frames.length];
                ctx.globalAlpha = p.dead ? 0.3 : 1;
                if (img && img.complete && img.naturalWidth > 0) {
                    const needFlip = faceLeft && (!sprites.left || !sprites.left.length);
                    ctx.save();
                    if (needFlip) { ctx.translate(p.x, 0); ctx.scale(-1, 1); ctx.translate(-p.x, 0); }
                    ctx.drawImage(img, p.x - SP_W / 2, p.y - SP_H / 2, SP_W, SP_H);
                    ctx.restore();
                } else {
                    ctx.fillStyle = isMe ? '#4aa3ff' : '#ff5a5a';
                    ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                }
                ctx.globalAlpha = 1;
                ctx.fillStyle = isMe ? '#9fd0ff' : '#ffb3b3'; ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText(isMe ? '나' : (p.name || '상대'), p.x, p.y - SP_H / 2 - 1);
            }
            function drawBar(x, y, w, col, ratio, label, right) {
                ratio = Math.max(0, Math.min(1, ratio || 0));
                ctx.fillStyle = '#1b2334'; ctx.fillRect(x, y, w, 12);
                ctx.fillStyle = col; ctx.fillRect(right ? x + w - w * ratio : x, y, w * ratio, 12);
                ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, 12);
                ctx.fillStyle = '#fff'; ctx.font = '9px Arial'; ctx.textAlign = right ? 'right' : 'left'; ctx.textBaseline = 'middle';
                ctx.fillText(label, right ? x + w - 3 : x + 3, y + 6);
            }
            drawP(o, false); drawP(m, true);
            drawBar(8, 8, 200, '#ff5a5a', m.hp / m.maxHp, '나 ' + Math.max(0, Math.round(m.hp)), false);
            drawBar(8, 24, 200, '#4aa3ff', m.mana / m.maxMana, 'MP', false);
            if (o) drawBar(ARENA_W - 208, 8, 200, '#ff5a5a', (o.maxHp ? o.hp / o.maxHp : 0), (o.name || '상대') + ' ' + Math.max(0, Math.round(o.hp)), true);
        }

        function pvpLeaveToLobby() {
            leaveChannel();
            if (PVP.raf) { cancelAnimationFrame(PVP.raf); PVP.raf = null; }
            PVP.code = null; PVP.myIndex = 0; PVP.status = 'lobby';
            PVP.autoMatching = false; PVP.started = false;
            PVP.me = null; PVP.opp = null; PVP.shots = [];
            pvpUI();
        }

        // ============================================================
        //  💬 채팅 (월드 / 길드 / 친구) — Supabase Realtime broadcast
        //  실시간 전달. 같은 세션 동안은 받은 메시지가 쌓여(간이 기록).
        // ============================================================
