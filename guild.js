        function guildFetchList() {
            if (!RANK_API) return;
            GUILD.loading = true;
            fetch(RANK_API + '?guild=list&t=' + Date.now())
                .then(r => r.json())
                .then(arr => { if (Array.isArray(arr)) GUILD.list = arr; GUILD.loading = false; })
                .catch(() => { GUILD.loading = false; });
        }
        function guildFetchInfo(name) {
            if (!RANK_API || !name) return;
            GUILD.loading = true;
            fetch(RANK_API + '?guild=info&name=' + encodeURIComponent(name) + '&t=' + Date.now())
                .then(r => r.json())
                .then(d => {
                    GUILD.loading = false;
                    if (d && !d.error) {
                        GUILD.info = d;
                        // 길드 공유 강화 레벨 동기화 (모든 길드원이 같은 보너스)
                        game.guildUpgrade = { atk: (d.upgrades && d.upgrades.atk) || 0, def: (d.upgrades && d.upgrades.def) || 0, hp: (d.upgrades && d.upgrades.hp) || 0 };
                    } else { GUILD.info = null; game.guildName = ''; game.guildUpgrade = { atk: 0, def: 0, hp: 0 }; saveProgress(); } // 길드가 사라짐
                })
                .catch(() => { GUILD.loading = false; });
        }
        function guildPost(body) {
            return fetch(RANK_API, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(body)
            }).then(r => r.json());
        }
        function guildCreatePrompt() {
            if (game.guildName) { floatMsg('이미 길드에 가입돼 있어요', '#ff6b6b'); return; }
            const name = (prompt('만들 길드 이름 (최대 16자)') || '').trim().slice(0, 16);
            if (!name) return;
            guildPost({ guild: 'create', name, player: myName(), score: computeScore() }).then(res => {
                if (res && res.ok) {
                    game.guildName = res.name; saveProgress();
                    guildFetchInfo(game.guildName);
                    floatMsg('🏰 길드 «' + res.name + '» 생성!', '#2ecc71');
                } else if (res && res.error === 'exists') floatMsg('이미 있는 길드 이름!', '#ff6b6b');
                else floatMsg('생성 실패', '#ff6b6b');
            }).catch(() => floatMsg('서버 연결 실패', '#ff6b6b'));
        }
        function guildJoin(name) {
            if (game.guildName) { floatMsg('이미 길드에 가입돼 있어요', '#ff6b6b'); return; }
            if (!name) return;
            guildPost({ guild: 'join', name, player: myName(), score: computeScore() }).then(res => {
                if (res && res.ok) {
                    game.guildName = res.name; saveProgress();
                    guildFetchInfo(game.guildName);
                    floatMsg('🏰 «' + res.name + '» 가입!', '#2ecc71');
                } else floatMsg('가입 실패 (길드 없음)', '#ff6b6b');
            }).catch(() => floatMsg('서버 연결 실패', '#ff6b6b'));
        }
        function guildContribute() {
            if (!game.guildName) return;
            guildPost({ guild: 'contribute', name: game.guildName, player: myName(), score: computeScore() }).then(res => {
                if (res && res.ok) { floatMsg('💪 길드에 기여! (점수 ' + computeScore().toLocaleString() + ')', '#2ecc71'); guildFetchInfo(game.guildName); }
                else floatMsg('기여 실패', '#ff6b6b');
            }).catch(() => floatMsg('서버 연결 실패', '#ff6b6b'));
        }
        function guildLeave() {
            if (!game.guildName) return;
            if (!confirm('정말 길드 «' + game.guildName + '»에서 탈퇴할까요?')) return;
            const old = game.guildName;
            guildPost({ guild: 'leave', name: old, player: myName() }).then(() => {
                // 버그수정: 옛 길드 채팅 채널 구독 해제 — 탈퇴 후에도 옛 길드 메시지 받던 문제
                const groom = 'chat-guild-' + old;
                if (typeof CHAT !== 'undefined' && CHAT.subs && CHAT.subs[groom]) {
                    try { sbClient().removeChannel(CHAT.subs[groom]); } catch (e) {}
                    delete CHAT.subs[groom]; delete CHAT.loaded[groom];
                }
                game.guildName = ''; GUILD.info = null;
                game.guildUpgrade = { atk: 0, def: 0, hp: 0 }; // 공유 강화 보너스 해제
                saveProgress();
                guildFetchList();
                floatMsg('길드에서 탈퇴했어요', '#aaa');
            }).catch(() => floatMsg('서버 연결 실패', '#ff6b6b'));
        }

        // === 길드전: 1분간 무적 보스에게 최대한 데미지 (총 데미지 = 길드 기여점수) ===
        const RAID_FRAMES = 60 * 60; // 1분
        function startGuildRaid() {
            if (!game.guildName) { floatMsg('길드에 먼저 가입하세요', '#ff6b6b'); return; }
            if (game.raidActive) return;
            // 다른 모달/던전 정리하고 사냥터로
            game.showEvent = false; game.eventTab = null;
            game.inExpDungeon = false; game.inMedalDungeon = false;
            if (game.inTown) leaveTown();
            game.raidActive = true;
            game.raidTimer = RAID_FRAMES;
            game.raidDamage = 0;
            game.boss = null; game.serverBoss = null;
            game.monsters = [];
            game.character.x = 300;
            game.character.stats.hp = effMaxHp();
            // 무적 보스 소환 (가운데, 거대)
            const boss = new Monster(MAP.width / 2, 300, 'boss', { isBoss: true, hp: 1e18, damage: 0, coinReward: 0, expReward: 0 });
            boss.isRaid = true;
            boss.maxHp = 1e18;
            boss.width = 240; boss.height = 280;
            boss.attackRange = 0;        // 플레이어를 때리지 않음
            boss.speed = 0;
            boss.label = '🛡️ 길드전 보스 (무적)';
            boss.image = finalBossImg;
            game.raidBoss = boss;
            game.monsters.push(boss);
            floatMsg('⚔️ 길드전 시작! 1분간 최대한 때려라!', '#ff6b6b');
        }
        function endGuildRaid() {
            game.raidActive = false;
            game.raidTimer = 0;
            game.monsters = game.monsters.filter(m => !m.isRaid);
            game.raidBoss = null;
            const dmg = Math.round(game.raidDamage);
            const isBest = dmg > game.raidBest;
            if (isBest) game.raidBest = dmg;
            game.deathMsg = 0;
            floatMsg(`🏁 길드전 종료! 총 데미지 ${dmg.toLocaleString()}${isBest ? ' (최고기록!)' : ''}`, '#ffd700');
            saveProgress();
            // 최고 데미지를 길드에 기여(랭킹 반영)
            if (game.guildName && game.raidBest > 0) {
                guildPost({ guild: 'contribute', name: game.guildName, player: myName(), score: game.raidBest })
                    .then(() => guildFetchInfo(game.guildName)).catch(() => {});
            }
            goToZone(game.currentZone); // 원래 사냥터 복귀
        }

        // === 길드 상점 (단계별 해금) — lv: 필요 상점레벨 ===
        const SHOP_MAX_LEVEL = 2;
        const SHOP_UP_COST = [1000000, 5000000]; // 0→1, 1→2 업그레이드 비용
        const SHARD_BUY = 500;                   // 훈장조각 구매 수량 (한 번 사면 강화에 바로 보탬)
        const GUILD_SHOP = [
            { key: 'equipUni',  label: '🟠 유니크 장비',   cost: 250000,  desc: '유니크 등급 장비 1개',  lv: 0 },
            { key: 'equipLeg',  label: '🟢 레전더리 장비', cost: 800000,  desc: '레전더리 등급 장비 1개', lv: 0 },
            { key: 'gem7',      label: '💎 보석 7등급',     cost: 150000,  desc: '랜덤 보석 7등급 1개',   lv: 0 },
            { key: 'gem5',      label: '💎 보석 5등급',     cost: 600000,  desc: '랜덤 보석 5등급 1개',   lv: 0 },
            { key: 'shard',     label: '🎗️ 훈장 조각',      cost: 50000,   desc: '훈장 조각 +' + SHARD_BUY, lv: 1 },
            { key: 'exp',       label: '📘 경험치 포션',     cost: 400000,  desc: '경험치 대량 획득',      lv: 1 },
            { key: 'soul',      label: '🔮 직업의 혼',       cost: 10000000, desc: '각성! 공격력 2배 + 새 스킬', lv: 2 }
        ];
        function shopUpgradeCost() { return SHOP_UP_COST[game.guildShopLevel]; }
        function upgradeGuildShop() {
            if (!game.guildName) { floatMsg('길드에 먼저 가입하세요', '#ff6b6b'); return; }
            if (game.guildShopLevel >= SHOP_MAX_LEVEL) { floatMsg('이미 최고 단계!', '#ffd700'); return; }
            const cost = shopUpgradeCost();
            if (game.coins < cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= cost;
            game.guildShopLevel++;
            const unlocked = game.guildShopLevel === 1 ? '훈장조각·경험치 판매 해금!' : '🔮 직업의 혼(각성) 해금!';
            floatMsg(`🛒 길드 상점 Lv.${game.guildShopLevel}! ${unlocked}`, '#2ecc71');
            saveProgress();
        }
        // 경험치 대량 지급 (레벨업 처리 포함)
        function grantExp(amount) {
            const st = game.character.stats;
            st.exp += amount;
            while (st.exp >= st.maxExp) {
                st.exp -= st.maxExp; st.level++; st.maxExp += DIFF.levelExpAdd;
                st.statPoints += 5; st.maxHp += 20; st.maxMana += 10;
            }
            invalidateStats(); // maxHp 증가 반영
            st.hp = effMaxHp(); st.mana = st.maxMana;
            sfx('levelup');
            checkTitles(); // 🏷️ 경험치 포션으로 레벨 칭호 도달 시 지급
        }
        function buyGuildItem(key) {
            const it = GUILD_SHOP.find(s => s.key === key);
            if (!it) return;
            if ((it.lv || 0) > game.guildShopLevel) { floatMsg('상점 업그레이드 필요!', '#ff6b6b'); return; }
            if (key === 'soul' && game.awakened) { floatMsg('이미 각성했어요!', '#ffd700'); return; }
            if (game.coins < it.cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= it.cost;
            if (key === 'equipUni' || key === 'equipLeg') {
                const rarity = key === 'equipLeg' ? 4 : 3;
                const cat = ITEM_CATS[Math.floor(Math.random() * ITEM_CATS.length)];
                const item = makeItem(cat, rarity);
                addToBag(item); autoEquipIfBetter(item);
                floatMsg(`🛒 ${RARITIES[rarity].name} ${cat} 획득!`, RARITIES[rarity].color);
            } else if (key === 'gem5' || key === 'gem7') {
                const grade = key === 'gem5' ? 5 : 7;
                const t = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
                addGem(t.key, grade, 1);
                floatMsg(`💎 ${t.name} 보석 ${grade}등급 획득!`, '#18ffff');
            } else if (key === 'shard') {
                game.medalShards = (game.medalShards || 0) + SHARD_BUY;
                floatMsg(`🎗️ 훈장 조각 +${SHARD_BUY}`, '#ffd166');
            } else if (key === 'exp') {
                const amt = game.character.stats.maxExp * 5;
                grantExp(amt);
                floatMsg(`📘 경험치 +${Math.round(amt).toLocaleString()}!`, '#ffff00');
            } else if (key === 'soul') {
                game.awakened = true;
                applyAwakening();
                game.skillCooldowns = { q: 0, w: 0, e: 0, f: 0, r: 0 };
                floatMsg(`🔮 ${game.character.job} 각성! 공격력 2배 + 새 스킬 획득!`, '#e040fb');
            }
            saveProgress();
        }

        const MENU_TABS = [
            { tab: 'help',     label: '📖 설명' },
            { tab: 'stats',    label: '📊 통계' },
            { tab: 'ach',      label: '🏅 과제' },
            { tab: 'title',    label: '🏷️ 칭호' },
            { tab: 'rank',     label: '🏆 랭킹' },
            { tab: 'credit',   label: '👤 제작자' },
            { tab: 'settings', label: '⚙️ 설정' }
        ];
        function drawMenu() {
            const vs = document.getElementById('volSlider');
            if (!game.showMenu) { if (vs && vs.style.display !== 'none') vs.style.display = 'none'; return; }
            const W = canvas.width, H = canvas.height;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(0, 0, W, H);

            const pw = 660, ph = 460;
            const px = (W - pw) / 2, py = (H - ph) / 2;
            ctx.fillStyle = UI.panelBg; ctx.fillRect(px, py, pw, ph);
            ctx.strokeStyle = UI.panelBorder; ctx.lineWidth = 3; ctx.strokeRect(px, py, pw, ph);

            game.menuButtons = [];

            // 닫기 버튼
            const cs = 30, ccx = px + pw - cs - 10, ccy = py + 10;
            ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(ccx, ccy, cs, cs);
            ctx.strokeStyle = UI.dim; ctx.lineWidth = 1; ctx.strokeRect(ccx, ccy, cs, cs);
            ctx.fillStyle = UI.text; ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('✕', ccx + cs / 2, ccy + cs / 2 + 1);
            game.menuButtons.push({ x: ccx, y: ccy, w: cs, h: cs, action: 'close' });

            // 탭 (7개가 닫기 버튼과 안 겹치게 폭 축소)
            const tw = 80, th = 34, tgap = 4, tx0 = px + 16, ty = py + 16;
            MENU_TABS.forEach((t, i) => {
                const tx = tx0 + i * (tw + tgap);
                const on = game.menuTab === t.tab;
                ctx.fillStyle = on ? UI.accent : 'rgba(255,255,255,0.06)';
                ctx.fillRect(tx, ty, tw, th);
                ctx.strokeStyle = on ? UI.accent : UI.dim; ctx.lineWidth = 2;
                ctx.strokeRect(tx, ty, tw, th);
                ctx.fillStyle = on ? '#1a1a2a' : UI.text; ctx.font = UI.headFont;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(t.label, tx + tw / 2, ty + th / 2);
                game.menuButtons.push({ x: tx, y: ty, w: tw, h: th, action: 'tab', tab: t.tab });
            });

            const cy = ty + th + 24;
            const x = px + 30;
            ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(px + 20, cy - 14); ctx.lineTo(px + pw - 20, cy - 14); ctx.stroke();

            if (game.menuTab === 'settings') drawMenuSettings(px, py, pw, ph, cy, x, vs);
            else {
                if (vs) vs.style.display = 'none';
                if (game.menuTab === 'help') drawMenuHelp(x, cy);
                else if (game.menuTab === 'stats') drawMenuStats(px, py, pw, ph, cy, x);
                else if (game.menuTab === 'ach') drawMenuAch(px, py, pw, ph, cy, x);
                else if (game.menuTab === 'title') drawMenuTitles(px, py, pw, ph, cy, x);
                else if (game.menuTab === 'rank') drawMenuRank(px, py, pw, ph, cy, x);
                else if (game.menuTab === 'credit') drawMenuCredit(px, py, pw, ph, cy);
            }
        }

        // 📊 통계 탭
        function drawMenuStats(px, py, pw, ph, cy, x) {
            const A = UI.accent, T = UI.text, D = UI.dim;
            const rows = [
                ['⚔️ 현재 공격력', effAttack().toLocaleString()],
                ['🛡️ 현재 방어력', effDefense().toLocaleString()],
                ['💥 최고 단일 데미지', (game.maxHit || 0).toLocaleString()],
                ['📈 누적 총 데미지', Math.round(game.totalDamageDealt || 0).toLocaleString()],
                ['💀 몬스터 처치', (game.totalKills || 0).toLocaleString()],
                ['👑 보스 처치', (game.bossKills || 0).toLocaleString()],
                ['🌐 서버보스 처치', (game.serverBossKills || 0).toLocaleString()],
                ['🔥 현재 콤보', (game.comboKills || 0).toLocaleString()],
                ['🧩 세트효과 보너스', '공·방 +' + setBonus() + '%'],
                ['🏅 도전과제 보너스', '공격력 +' + achBonus() + '%']
            ];
            let ly = cy + 6;
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            rows.forEach((r, i) => {
                ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
                ctx.fillRect(x - 8, ly - 14, pw - 44, 30);
                ctx.fillStyle = T; ctx.font = UI.headFont; ctx.fillText(r[0], x, ly);
                ctx.fillStyle = A; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'right';
                ctx.fillText(r[1], px + pw - 36, ly);
                ctx.textAlign = 'left';
                ly += 34;
            });
        }
        // 🏅 도전과제 탭
        function drawMenuAch(px, py, pw, ph, cy, x) {
            const A = UI.accent, T = UI.text, D = UI.dim;
            let ly = cy + 4;
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ACHIEVEMENTS.forEach(a => {
                const done = game.achClaimed.includes(a.key);
                const can = !done && a.check();
                ctx.fillStyle = done ? 'rgba(46,204,113,0.10)' : (can ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.04)');
                ctx.fillRect(x - 8, ly - 15, pw - 44, 34);
                ctx.fillStyle = done ? '#7CFC8A' : T; ctx.font = UI.headFont;
                ctx.fillText(a.name + '  (+' + a.atk + '% 공격력)', x, ly - 3);
                ctx.fillStyle = D; ctx.font = '12px Arial';
                ctx.fillText(a.desc, x, ly + 12);
                // 우측 상태/수령 버튼
                const bw = 96, bh = 26, bx = px + pw - 36 - bw, by = ly - 13;
                if (done) {
                    ctx.fillStyle = '#2e7d4f'; ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = '#cfe8d4'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
                    ctx.fillText('달성 ✔', bx + bw / 2, by + bh / 2);
                    ctx.textAlign = 'left';
                } else if (can) {
                    ctx.fillStyle = '#27ae60'; ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
                    ctx.fillText('수령', bx + bw / 2, by + bh / 2);
                    ctx.textAlign = 'left';
                    game.menuButtons.push({ x: bx, y: by, w: bw, h: bh, action: 'claimAch', achKey: a.key });
                } else {
                    ctx.fillStyle = '#555'; ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = '#aaa'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
                    ctx.fillText('미달성', bx + bw / 2, by + bh / 2);
                    ctx.textAlign = 'left';
                }
                ly += 38;
            });
        }

        // 🏷️ 칭호 탭 (보유 칭호 장착 / 미보유 조건 표시)
        function drawMenuTitles(px, py, pw, ph, cy, x) {
            const D = UI.dim;
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillStyle = D; ctx.font = '12px Arial';
            ctx.fillText('칭호를 장착하면 캐릭터 머리 위와 랭킹에 표시됩니다.', x, cy - 2);
            let ly = cy + 26;
            const rowH = 38;
            TITLES.forEach(t => {
                const owned = (game.titlesOwned || []).includes(t.key);
                const equipped = game.titleEquipped === t.key;
                ctx.fillStyle = equipped ? 'rgba(255,215,0,0.12)' : (owned ? 'rgba(46,204,113,0.08)' : 'rgba(255,255,255,0.04)');
                ctx.fillRect(x - 8, ly - 15, pw - 44, rowH - 4);
                ctx.fillStyle = owned ? t.color : '#777'; ctx.font = 'bold 15px Arial';
                ctx.fillText((t.glow ? '👑 ' : '🏷️ ') + t.name, x, ly - 2);
                ctx.fillStyle = D; ctx.font = '11px Arial';
                const bstr = [t.atk ? `공+${t.atk}%` : '', t.def ? `방+${t.def}%` : '', t.hp ? `체+${t.hp}%` : ''].filter(Boolean).join(' ');
                ctx.fillText((owned ? t.desc : '🔒 ' + t.desc) + (bstr ? '  ·  ' + bstr : ''), x, ly + 13);
                const bw = 96, bh = 26, bx = px + pw - 36 - bw, by = ly - 13;
                if (equipped) {
                    ctx.fillStyle = '#b8860b'; ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = '#fff5cc'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
                    ctx.fillText('장착중 ✔', bx + bw / 2, by + bh / 2);
                    ctx.textAlign = 'left';
                } else if (owned) {
                    ctx.fillStyle = '#2e7d4f'; ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
                    ctx.fillText('장착', bx + bw / 2, by + bh / 2);
                    ctx.textAlign = 'left';
                    game.menuButtons.push({ x: bx, y: by, w: bw, h: bh, action: 'equipTitle', titleKey: t.key });
                } else {
                    ctx.fillStyle = '#555'; ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = '#aaa'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
                    ctx.fillText('미보유', bx + bw / 2, by + bh / 2);
                    ctx.textAlign = 'left';
                }
                ly += rowH;
            });
        }
        function drawMenuHelp(x, y) {
            const A = UI.accent, T = UI.text, D = UI.dim;
            const lines = [
                ['🎮 조작법', A],
                ['A / D : 좌우 이동       Shift : 달리기', T],
                ['Space : 공격           Z : 자동 사냥 켜기/끄기', T],
                ['Q W E F R : 직업 스킬', T],
                ['1 : 체력 물약    2 : 마나 물약', T],
                ['M : 사냥터 지도    P : 배경음악 켜기/끄기', T],
                ['', T],
                ['📋 게임 목표', A],
                ['몬스터를 잡아 코인과 경험치를 모으고,', D],
                ['보스를 처치하면 다음 사냥터가 열립니다.', D],
                ['장비 · 보석 · 훈장 · 펫을 강화해 더 강해지세요!', D],
                ['', T],
                ['🔘 상단 버튼', A],
                ['📋이벤트(보스·뽑기·마을·PvP·길드)  📜퀘스트  ☰메뉴', D]
            ];
            ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            let yy = y;
            lines.forEach(([t, c]) => {
                if (t === '') { yy += 8; return; }
                ctx.fillStyle = c; ctx.font = (c === A) ? UI.headFont : UI.bodyFont;
                ctx.fillText(t, x, yy);
                yy += 22;
            });
        }

        function drawMenuRank(px, py, pw, ph, y, x) {
            maybeRefreshOnline(); // 랭킹 탭 열려 있으면 주기적으로 새로고침
            const online = ONLINE_RANK !== null;
            const list = (online ? ONLINE_RANK : getRanking())
                .filter(e => !(e.name || '').includes('안준하'));
            const myName = (document.getElementById('charName').textContent || '').trim();
            ctx.textBaseline = 'middle';
            // 온라인/오프라인 상태 배지 (우측 상단)
            ctx.textAlign = 'right'; ctx.font = '12px Arial';
            ctx.fillStyle = online ? '#2ecc71' : UI.dim;
            ctx.fillText(online ? '🌐 전 세계 랭킹' : '💾 내 기록 (오프라인)', px + pw - 24, y + 6);
            ctx.textAlign = 'left';
            ctx.fillStyle = UI.sub; ctx.font = UI.headFont;
            const cols = [['순위', x], ['이름', x + 60], ['점수', x + 230], ['Lv', x + 360], ['사냥터', x + 430], ['보스', x + 540]];
            cols.forEach(([t, cxp]) => ctx.fillText(t, cxp, y + 6));
            let yy = y + 36;
            if (list.length === 0) {
                ctx.fillStyle = UI.dim; ctx.font = UI.bodyFont;
                ctx.fillText('아직 기록이 없어요. 플레이하면 자동으로 저장됩니다!', x, yy + 6);
            }
            list.slice(0, 10).forEach((e, i) => {
                const mine = e.name === myName;
                if (mine) {
                    ctx.fillStyle = 'rgba(255,215,0,0.14)';
                    ctx.fillRect(x - 8, yy - 12, pw - 44, 24);
                }
                const rank = ['🥇', '🥈', '🥉'][i] || ('  ' + (i + 1));
                ctx.font = UI.bodyFont; ctx.textAlign = 'left';
                ctx.fillStyle = mine ? UI.accent : UI.text;
                ctx.fillText(rank, x, yy);
                ctx.fillText((e.name || '').slice(0, 10), x + 60, yy);
                ctx.fillText((e.score || 0).toLocaleString(), x + 230, yy);
                ctx.fillText(String(e.level), x + 360, yy);
                ctx.fillText('#' + e.zone, x + 430, yy);
                ctx.fillText(String(e.kills), x + 540, yy);
                yy += 26;
            });
            ctx.fillStyle = UI.dim; ctx.font = '12px Arial'; ctx.textAlign = 'left';
            ctx.fillText('점수 = 레벨·사냥터·서버보스·코인을 합산한 값입니다.', x, py + ph - 34);
            // 초기화 버튼은 오프라인(내 기록)일 때만 — 온라인 랭킹은 공용이라 못 지움
            if (!online) {
                const bw = 110, bh = 28, bx = px + pw - bw - 24, by = py + ph - 42;
                ctx.fillStyle = 'rgba(231,76,60,0.85)'; ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
                ctx.fillStyle = '#fff'; ctx.font = UI.bodyFont; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('🗑️ 기록 초기화', bx + bw / 2, by + bh / 2);
                game.menuButtons.push({ x: bx, y: by, w: bw, h: bh, action: 'resetRank' });
            } else {
                ctx.fillStyle = '#2ecc71'; ctx.font = UI.bodyFont; ctx.textAlign = 'right';
                ctx.fillText('전 세계 플레이어와 실시간으로 겨뤄요!', px + pw - 24, py + ph - 28);
            }
        }

        function drawMenuCredit(px, py, pw, ph, cy) {
            const midX = px + pw / 2;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = UI.accent; ctx.font = 'bold 30px Arial';
            ctx.fillText('⚔️ time way ai ⚔️', midX, cy + 40);
            ctx.fillStyle = UI.dim; ctx.font = UI.headFont;
            ctx.fillText('제 작 자', midX, cy + 100);
            ctx.fillStyle = UI.accent; ctx.font = 'bold 26px Arial';
            ctx.fillText(CREATOR.name, midX, cy + 138);
            ctx.fillStyle = UI.sub; ctx.font = UI.bodyFont;
            ctx.fillText('GitHub : ' + CREATOR.github, midX, cy + 185);
            ctx.fillStyle = UI.dim;
            ctx.fillText('© ' + CREATOR.year, midX, cy + 212);
            ctx.fillStyle = UI.text; ctx.font = UI.headFont;
            ctx.fillText('플레이해 주셔서 감사합니다! 🙏', midX, cy + 262);
        }

        function drawMenuSettings(px, py, pw, ph, cy, x, vs) {
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            // 배경음악 on/off
            ctx.fillStyle = UI.accent; ctx.font = UI.headFont;
            ctx.fillText('🎵 배경음악', x, cy + 16);
            const tbw = 120, tbh = 34, tbx = x + 150, tby = cy - 1;
            ctx.fillStyle = bgmOn ? 'rgba(46,204,113,0.85)' : 'rgba(255,255,255,0.06)';
            ctx.fillRect(tbx, tby, tbw, tbh);
            ctx.strokeStyle = bgmOn ? '#2ecc71' : UI.dim; ctx.lineWidth = 2;
            ctx.strokeRect(tbx, tby, tbw, tbh);
            ctx.fillStyle = UI.text; ctx.font = UI.headFont; ctx.textAlign = 'center';
            ctx.fillText(bgmOn ? '🔊 켜짐' : '🔇 꺼짐', tbx + tbw / 2, tby + tbh / 2);
            game.menuButtons.push({ x: tbx, y: tby, w: tbw, h: tbh, action: 'bgm' });

            // 🔊 효과음 on/off (배경음악 아래)
            ctx.fillStyle = UI.accent; ctx.font = UI.headFont; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText('🔊 효과음', x, cy + 60);
            const sbw = 120, sbh = 30, sbx = x + 150, sby = cy + 45;
            ctx.fillStyle = SFX.on ? 'rgba(46,204,113,0.85)' : 'rgba(255,255,255,0.06)';
            ctx.fillRect(sbx, sby, sbw, sbh);
            ctx.strokeStyle = SFX.on ? '#2ecc71' : UI.dim; ctx.lineWidth = 2; ctx.strokeRect(sbx, sby, sbw, sbh);
            ctx.fillStyle = UI.text; ctx.font = UI.headFont; ctx.textAlign = 'center';
            ctx.fillText(SFX.on ? '🔊 켜짐' : '🔇 꺼짐', sbx + sbw / 2, sby + sbh / 2);
            game.menuButtons.push({ x: sbx, y: sby, w: sbw, h: sbh, action: 'sfx' });

            // 볼륨
            ctx.fillStyle = UI.accent; ctx.font = UI.headFont; ctx.textAlign = 'left';
            ctx.fillText('🔉 볼륨', x, cy + 78);
            ctx.fillStyle = UI.text; ctx.font = UI.headFont; ctx.textAlign = 'right';
            ctx.fillText(Math.round(bgmVolume * 100) + '%', x + 380, cy + 78);

            if (vs) {
                vs.style.display = 'block';
                vs.style.left = (x + 70) + 'px';
                vs.style.top = (cy + 98) + 'px';
                vs.style.width = '300px';
            }

            ctx.fillStyle = UI.dim; ctx.font = UI.bodyFont; ctx.textAlign = 'left';
            ctx.fillText('· P 키로도 배경음악을 켜고 끌 수 있어요.', x, cy + 150);
            ctx.fillText('· 게임을 처음 켜면 배경음악은 꺼진 채로 시작합니다.', x, cy + 176);
            ctx.fillText('· 볼륨 설정은 저장되어 다음에도 유지됩니다.', x, cy + 202);

            // 이름 바꾸기 (바꾸면 길드 멤버 목록에도 자동 반영됨)
            const rbw = 160, rbh = 34, rbx = x, rby = cy + 234;
            ctx.fillStyle = 'rgba(143,183,255,0.18)'; ctx.fillRect(rbx, rby, rbw, rbh);
            ctx.strokeStyle = UI.sub; ctx.lineWidth = 2; ctx.strokeRect(rbx, rby, rbw, rbh);
            ctx.fillStyle = UI.text; ctx.font = UI.headFont; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('✏️ 이름 바꾸기', rbx + rbw / 2, rby + rbh / 2);
            game.menuButtons.push({ x: rbx, y: rby, w: rbw, h: rbh, action: 'rename' });

            // ⚙️ 자동 물약 토글 2개 (체력 50% / 마나 30% 이하 자동 사용)
            const autoRow = (labelTxt, on, action, ry) => {
                ctx.fillStyle = UI.accent; ctx.font = UI.headFont; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.fillText(labelTxt, x, ry + 17);
                const aw = 120, ah = 34, ax = x + 200, ay = ry;
                ctx.fillStyle = on ? 'rgba(46,204,113,0.85)' : 'rgba(255,255,255,0.06)';
                ctx.fillRect(ax, ay, aw, ah);
                ctx.strokeStyle = on ? '#2ecc71' : UI.dim; ctx.lineWidth = 2; ctx.strokeRect(ax, ay, aw, ah);
                ctx.fillStyle = UI.text; ctx.font = UI.headFont; ctx.textAlign = 'center';
                ctx.fillText(on ? '✅ 켜짐' : '⬜ 꺼짐', ax + aw / 2, ay + ah / 2);
                ctx.textAlign = 'left';
                game.menuButtons.push({ x: ax, y: ay, w: aw, h: ah, action });
            };
            autoRow('🧪 체력 자동물약 (50%)', game.autoHpPotion, 'toggleAutoHp', cy + 278);
            autoRow('🔷 마나 자동물약 (30%)', game.autoMpPotion, 'toggleAutoMp', cy + 318);

            // ☁️ 클라우드 세이브 (수동 저장 / 불러오기 — localStorage 유실 대비)
            ctx.fillStyle = UI.accent; ctx.font = UI.headFont; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText('☁️ 클라우드', x, cy + 375);
            const cbw = 128, cbh = 34, cby = cy + 358, csx = x + 130, clx = x + 130 + cbw + 12;
            [['💾 저장', csx, 'cloudSave'], ['📥 불러오기', clx, 'cloudLoad']].forEach(([lab, bx, act]) => {
                ctx.fillStyle = 'rgba(127,216,255,0.18)'; ctx.fillRect(bx, cby, cbw, cbh);
                ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = 2; ctx.strokeRect(bx, cby, cbw, cbh);
                ctx.fillStyle = UI.text; ctx.font = UI.headFont; ctx.textAlign = 'center';
                ctx.fillText(lab, bx + cbw / 2, cby + cbh / 2);
                game.menuButtons.push({ x: bx, y: cby, w: cbw, h: cbh, action: act });
            });
            ctx.textAlign = 'left';
        }

        // ============================================================
        //  📅 일일 출석 보상
        // ============================================================
        function todayStr() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
        function dateStrOffset(off) { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
        const ATTEND_REWARDS = [
            { label: '🪙 코인 5,000',            give: () => { game.coins += 5000; } },
            { label: '📜 주문서 2장',             give: () => { game.scrolls += 2; } },
            { label: '🧪 체력물약 5개',           give: () => { game.hpPotions += 5; } },
            { label: '🪙 코인 15,000',           give: () => { game.coins += 15000; } },
            { label: '🧊 큐브 1개',               give: () => { game.cubes += 1; } },
            { label: '🔷 마나물약 5개',           give: () => { game.mpPotions += 5; } },
            { label: '🪙 코인 50,000 + 📜 주문서 5장', give: () => { game.coins += 50000; game.scrolls += 5; } }
        ];
        function checkAttendance() {
            const today = todayStr();
            if (game.lastAttendDate === today) return;             // 오늘 이미 받음
            game.attendStreak = (game.lastAttendDate === dateStrOffset(-1)) ? (game.attendStreak + 1) : 1; // 어제 받았으면 연속
            game.lastAttendDate = today;
            ATTEND_REWARDS[(game.attendStreak - 1) % 7].give();
            game.showAttend = true;
            saveProgress();
        }
        function drawAttendUI() {
            if (!game.showAttend) return;
            const W = canvas.width, H = canvas.height;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
            const bw = 460, bh = 250, bx = (W - bw) / 2, by = (H - bh) / 2;
            ctx.fillStyle = '#161628'; ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffd166'; ctx.font = 'bold 26px Arial';
            ctx.fillText('📅 일일 출석 보상', W / 2, by + 44);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Arial';
            ctx.fillText(`${game.attendStreak}일 연속 출석! (${((game.attendStreak - 1) % 7) + 1}/7일차)`, W / 2, by + 92);
            ctx.fillStyle = '#7CFC8A'; ctx.font = 'bold 20px Arial';
            ctx.fillText('받은 보상: ' + ATTEND_REWARDS[(game.attendStreak - 1) % 7].label, W / 2, by + 132);
            const bW = 180, bH = 44, bX = W / 2 - bW / 2, bY = by + bh - 64;
            ctx.fillStyle = '#27ae60'; ctx.fillRect(bX, bY, bW, bH);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Arial';
            ctx.fillText('받기 ✔', bX + bW / 2, bY + bH / 2);
            game.attendButtons = [{ x: bX, y: bY, w: bW, h: bH, action: 'close' }];
        }

        // ============================================================
        //  🛍️ 일일 랜덤 상점 (매일 갱신, 코인으로 구매)
        // ============================================================
        const DAILY_SHOP_POOL = [2, 2, 3, 3, 4]; // 등장 가능 등급 (에픽~레전더리)
        const DAILY_SHOP_COST = { 2: 30000, 3: 90000, 4: 250000 };
        function refreshDailyShop() {
            const today = todayStr();
            if (game.dailyShopDate === today && game.dailyShopItems.length) return; // 오늘 매물 유지
            game.dailyShopDate = today;
            game.dailyShopItems = [];
            for (let i = 0; i < 4; i++) {
                const rarity = DAILY_SHOP_POOL[Math.floor(Math.random() * DAILY_SHOP_POOL.length)];
                const cat = ITEM_CATS[Math.floor(Math.random() * ITEM_CATS.length)];
                game.dailyShopItems.push({ cat, rarity, cost: DAILY_SHOP_COST[rarity], bought: false });
            }
            saveProgress();
        }
        function openDailyShop() { refreshDailyShop(); game.showDailyShop = true; }
        function buyDailyItem(i) {
            const offer = game.dailyShopItems[i];
            if (!offer || offer.bought) return;
            if (game.coins < offer.cost) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            game.coins -= offer.cost;
            offer.bought = true;
            const item = makeItem(offer.cat, offer.rarity);
            addToBag(item); autoEquipIfBetter(item);
            sfx('coin');
            floatMsg(`🛍️ ${RARITIES[offer.rarity].name} ${offer.cat} 구매!`, RARITIES[offer.rarity].color);
            saveProgress();
        }
        function drawDailyShopUI() {
            if (!game.showDailyShop) return;
            const W = canvas.width, H = canvas.height;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
            const bw = 560, bh = 420, bx = (W - bw) / 2, by = (H - bh) / 2;
            ctx.fillStyle = '#161628'; ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh);
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillStyle = '#f6c453'; ctx.font = 'bold 24px Arial';
            ctx.fillText('🛍️ 일일 랜덤 상점', W / 2, by + 16);
            ctx.fillStyle = '#aaa'; ctx.font = '13px Arial';
            ctx.fillText('매일 자정 갱신 · 보유 🪙 ' + game.coins.toLocaleString(), W / 2, by + 48);
            game.dailyShopButtons = [];
            game.dailyShopItems.forEach((offer, i) => {
                const cy = by + 76 + i * 74;
                ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(bx + 24, cy, bw - 48, 64);
                ctx.strokeStyle = RARITIES[offer.rarity].color; ctx.lineWidth = 2; ctx.strokeRect(bx + 24, cy, bw - 48, 64);
                ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.fillStyle = RARITIES[offer.rarity].color; ctx.font = 'bold 18px Arial';
                ctx.fillText(`${RARITIES[offer.rarity].name} ${offer.cat}`, bx + 40, cy + 24);
                ctx.fillStyle = '#cfe8ff'; ctx.font = '13px Arial';
                ctx.fillText('🪙 ' + offer.cost.toLocaleString(), bx + 40, cy + 46);
                const bW = 130, bH = 40, bX = bx + bw - 24 - bW - 16, bY = cy + 12;
                if (offer.bought) {
                    ctx.fillStyle = '#555'; ctx.fillRect(bX, bY, bW, bH);
                    ctx.fillStyle = '#bbb'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
                    ctx.fillText('판매완료', bX + bW / 2, bY + bH / 2);
                } else {
                    const ok = game.coins >= offer.cost;
                    ctx.fillStyle = ok ? '#27ae60' : '#7f3b3b'; ctx.fillRect(bX, bY, bW, bH);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
                    ctx.fillText('구매', bX + bW / 2, bY + bH / 2);
                    game.dailyShopButtons.push({ x: bX, y: bY, w: bW, h: bH, action: 'buy', idx: i });
                }
            });
            const cW = 160, cH = 40, cX = W / 2 - cW / 2, cY = by + bh - 52;
            ctx.fillStyle = '#555'; ctx.fillRect(cX, cY, cW, cH);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('닫기', cX + cW / 2, cY + cH / 2);
            game.dailyShopButtons.push({ x: cX, y: cY, w: cW, h: cH, action: 'close' });
        }

        // ============================================================
        //  🗼 무한의 탑 보상 상점 (탑 코인 전용 — 층 클리어로 모음)
        // ============================================================
        const TOWER_SHOP = [
            { key: 'equipLeg', label: '🟢 레전더리 장비', cost: 30,  desc: '레전더리 등급 장비 1개' },
            { key: 'gem5',     label: '💎 보석 5등급',     cost: 25,  desc: '랜덤 보석 5등급 1개' },
            { key: 'gem3',     label: '💎 보석 3등급',     cost: 60,  desc: '랜덤 보석 3등급(고급) 1개' },
            { key: 'shard',    label: '🎗️ 훈장 조각',      cost: 15,  desc: '훈장 조각 +' + SHARD_BUY },
            { key: 'exp',      label: '📘 경험치 포션',     cost: 20,  desc: '경험치 대량 획득 (레벨업)' },
            { key: 'scroll',   label: '📜 강화 주문서',     cost: 40,  desc: '장비 강화서 +3' },
            { key: 'coin',     label: '🪙 코인 뭉치',       cost: 10,  desc: '게임 코인 +500,000' }
        ];
        function openTowerShop() {
            game.showTowerShop = true;
            game.showEvent = false; game.eventTab = null;
        }
        function closeTowerShop() { game.showTowerShop = false; }
        function buyTowerItem(key) {
            const it = TOWER_SHOP.find(s => s.key === key);
            if (!it) return;
            if ((game.towerCoin || 0) < it.cost) { floatMsg('🪙 탑 코인 부족!', '#ff6b6b'); return; }
            game.towerCoin -= it.cost;
            if (key === 'equipLeg') {
                const cat = ITEM_CATS[Math.floor(Math.random() * ITEM_CATS.length)];
                const item = makeItem(cat, 4);
                addToBag(item); autoEquipIfBetter(item);
                floatMsg(`🗼 ${RARITIES[4].name} ${cat} 획득!`, RARITIES[4].color);
            } else if (key === 'gem5' || key === 'gem3') {
                const grade = key === 'gem5' ? 5 : 3;
                const t = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
                addGem(t.key, grade, 1);
                floatMsg(`💎 ${t.name} 보석 ${grade}등급 획득!`, '#18ffff');
            } else if (key === 'shard') {
                game.medalShards = (game.medalShards || 0) + SHARD_BUY;
                floatMsg(`🎗️ 훈장 조각 +${SHARD_BUY}`, '#ffd166');
            } else if (key === 'exp') {
                grantExp(game.character.stats.maxExp * 5);
                floatMsg('📘 경험치 대량 획득!', '#7fd8ff');
            } else if (key === 'scroll') {
                game.scrolls = (game.scrolls || 0) + 3;
                floatMsg('📜 강화 주문서 +3', '#ffd166');
            } else if (key === 'coin') {
                game.coins += 500000;
                floatMsg('🪙 코인 +500,000', '#ffd700');
            }
            sfx('coin');
            saveProgress();
        }
        function drawTowerShopUI() {
            if (!game.showTowerShop) return;
            const W = canvas.width, H = canvas.height;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
            const bw = 580, bh = 460, bx = (W - bw) / 2, by = (H - bh) / 2;
            ctx.fillStyle = '#161628'; ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = '#b388ff'; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh);
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillStyle = '#c9a6ff'; ctx.font = 'bold 24px Arial';
            ctx.fillText('🗼 무한의 탑 상점', W / 2, by + 14);
            ctx.fillStyle = '#aaa'; ctx.font = '13px Arial';
            ctx.fillText('층 클리어로 모은 탑 코인으로 교환 · 보유 🪙 ' + (game.towerCoin || 0).toLocaleString(), W / 2, by + 44);
            game.towerShopButtons = [];
            TOWER_SHOP.forEach((it, i) => {
                const cy = by + 72 + i * 50;
                ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(bx + 20, cy, bw - 40, 44);
                ctx.strokeStyle = 'rgba(179,136,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(bx + 20, cy, bw - 40, 44);
                ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial';
                ctx.fillText(it.label, bx + 34, cy + 15);
                ctx.fillStyle = '#9fb6cf'; ctx.font = '11px Arial';
                ctx.fillText(it.desc, bx + 34, cy + 32);
                const bW = 120, bH = 32, bX = bx + bw - 20 - bW - 14, bY = cy + 6;
                const ok = (game.towerCoin || 0) >= it.cost;
                ctx.fillStyle = ok ? '#7e57c2' : '#3a2e4f'; ctx.fillRect(bX, bY, bW, bH);
                ctx.fillStyle = ok ? '#fff' : '#888'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
                ctx.fillText('🪙 ' + it.cost, bX + bW / 2, bY + bH / 2);
                if (ok) game.towerShopButtons.push({ x: bX, y: bY, w: bW, h: bH, action: 'buy', key: it.key });
            });
            const cW = 160, cH = 40, cX = W / 2 - cW / 2, cY = by + bh - 50;
            ctx.fillStyle = '#555'; ctx.fillRect(cX, cY, cW, cH);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('닫기', cX + cW / 2, cY + cH / 2);
            game.towerShopButtons.push({ x: cX, y: cY, w: cW, h: cH, action: 'close' });
        }

        // ============================================================
        //  🐾 펫 도감 (종류 변경/수집)
        // ============================================================
        function buyNotePet() {
            if (game.petOwned.includes('note')) { floatMsg('이미 보유한 펫이에요', '#ff6b6b'); return; }
            if (game.musicNotes < NOTE_PET_COST) { floatMsg('🎵 음표 부족!', '#ff6b6b'); return; }
            game.musicNotes -= NOTE_PET_COST;
            sfx('coin');
            acquirePet('note');  // 보유목록 추가 + 안내 + 저장
        }
        function equipPet(id) {
            if (!game.petOwned.includes(id)) return;
            game.petType = id;
            const p = PET_TYPES.find(x => x.id === id);
            if (p) floatMsg(`🐾 ${p.name} 장착!`, '#d2b4de');
            saveProgress();
        }
        function drawPetBook() {
            if (!game.showPetBook) return;
            const W = canvas.width, H = canvas.height;
            ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, W, H);
            const bw = 620, bh = 540, bx = (W - bw) / 2, by = (H - bh) / 2;
            ctx.fillStyle = '#1a1430'; ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = '#b388ff'; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh);
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillStyle = '#d2b4de'; ctx.font = 'bold 24px Arial';
            ctx.fillText('🐾 펫 도감', W / 2, by + 14);
            ctx.fillStyle = '#aaa'; ctx.font = '13px Arial';
            ctx.fillText(`수집 ${game.petOwned.length}/${PET_TYPES.length} · 보유한 펫을 선택해 장착`, W / 2, by + 44);
            game.petBookButtons = [];
            PET_TYPES.forEach((p, i) => {
                const cy = by + 76 + i * 64;
                const owned = game.petOwned.includes(p.id);
                const active = game.petType === p.id;
                ctx.fillStyle = active ? 'rgba(179,136,255,0.18)' : (owned ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.25)');
                ctx.fillRect(bx + 20, cy, bw - 40, 54);
                ctx.strokeStyle = active ? '#b388ff' : (owned ? '#666' : '#333'); ctx.lineWidth = active ? 2 : 1; ctx.strokeRect(bx + 20, cy, bw - 40, 54);
                ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.globalAlpha = owned ? 1 : 0.35; ctx.font = '32px Arial';
                ctx.fillText(p.icon, bx + 40, cy + 28); ctx.globalAlpha = 1;
                ctx.fillStyle = owned ? '#fff' : '#888'; ctx.font = 'bold 17px Arial';
                ctx.fillText(p.name + (owned ? '' : ' 🔒'), bx + 88, cy + 17);
                ctx.fillStyle = owned ? '#cfe8ff' : '#999'; ctx.font = '12px Arial';
                ctx.fillText(owned ? p.desc : (p.buyNotes ? ('구매: ' + p.desc) : ('잠금 해제: ' + p.unlock)), bx + 88, cy + 38);
                const bW = 108, bH = 34, bX = bx + bw - 20 - bW - 12, bY = cy + 10;
                if (active) {
                    ctx.fillStyle = '#5b2c6f'; ctx.fillRect(bX, bY, bW, bH);
                    ctx.fillStyle = '#d2b4de'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('장착중', bX + bW / 2, bY + bH / 2); ctx.textAlign = 'left';
                } else if (owned) {
                    ctx.fillStyle = '#2980b9'; ctx.fillRect(bX, bY, bW, bH);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('장착', bX + bW / 2, bY + bH / 2); ctx.textAlign = 'left';
                    game.petBookButtons.push({ x: bX, y: bY, w: bW, h: bH, action: 'equip', id: p.id });
                } else if (p.buyNotes) {
                    // 🎵 음표펫: 음표로 구매
                    const ok = game.musicNotes >= p.buyNotes;
                    ctx.fillStyle = ok ? '#27ae60' : '#7f3b3b'; ctx.fillRect(bX, bY, bW, bH);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.fillText('구매 🎵' + p.buyNotes, bX + bW / 2, bY + bH / 2); ctx.textAlign = 'left';
                    game.petBookButtons.push({ x: bX, y: bY, w: bW, h: bH, action: 'buyNotePet' });
                } else {
                    ctx.fillStyle = '#333'; ctx.fillRect(bX, bY, bW, bH);
                    ctx.fillStyle = '#888'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.fillText('미보유', bX + bW / 2, bY + bH / 2); ctx.textAlign = 'left';
                }
            });
            const cW = 150, cH = 38, cX = W / 2 - cW / 2, cY = by + bh - 48;
            ctx.fillStyle = '#555'; ctx.fillRect(cX, cY, cW, cH);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('닫기', cX + cW / 2, cY + cH / 2);
            game.petBookButtons.push({ x: cX, y: cY, w: cW, h: cH, action: 'close' });
        }

        // 게임 루프
        const MAX_EFFECTS = 90;     // 스킬 이펙트 상한 (저사양 렉 방지)
        const MAX_DMGTEXT = 70;     // 데미지 텍스트 상한
        function gameLoop() {
            invalidateStats(); // 프레임마다 스탯 캐시 초기화 → 이번 프레임은 1회만 계산
            // 이펙트/데미지텍스트가 너무 많이 쌓이면 오래된 것부터 제거 (렉 방지)
            if (game.skillEffects.length > MAX_EFFECTS) game.skillEffects.splice(0, game.skillEffects.length - MAX_EFFECTS);
            if (game.damageText.length > MAX_DMGTEXT) game.damageText.splice(0, game.damageText.length - MAX_DMGTEXT);
            update();
            if (game.showRhythm) updateRhythm(); // 리듬게임은 월드가 멈춰도 진행
            // 클리어/플래시/무적 타이머는 gameLoop에서 항상 처리 (모달(스텟 등)이 열려도 계속 줄어들게)
            if (game.zoneClearMsg > 0) game.zoneClearMsg--;
            if (game.serverClearMsg > 0) game.serverClearMsg--;
            if (game.deathMsg > 0) game.deathMsg--;
            if (game.secondAwakenMsg > 0) game.secondAwakenMsg--;
            if (game.offlineReward && game.offlineReward.t > 0) { game.offlineReward.t--; if (game.offlineReward.t <= 0) game.offlineReward = null; }
            if (game.showWorldBoss && typeof WB !== 'undefined' && Date.now() - WB.lastPoll > 2500) { WB.lastPoll = Date.now(); wbFetchState(); } // 🌍 월드보스 HP 실시간 폴링
            if (game.spiritCooldown > 0) game.spiritCooldown--;
            if (game.summonFlash > 0) game.summonFlash--;
            if (game.invuln > 0) game.invuln--;
            // 🔥 콤보 타이머: 시간 지나면 콤보 리셋
            if (game.comboTimer > 0) { game.comboTimer--; if (game.comboTimer === 0) game.comboKills = 0; }

            // 불투명 전체화면 모달(상점/퀘스트/지도)이 열려 있으면 뒤 월드 렌더 생략 (렉 방지)
            // — 어차피 모달이 화면을 덮으므로 단색으로만 클리어
            const heavyModal = game.showShop || game.showQuest || game.showMap;
            if (heavyModal) {
                ctx.fillStyle = '#0a0a14';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
                drawMap();
                drawSkillEffects();
                drawMonsters();
                drawCharacter();
                drawTitleTag();
                drawPet();
                drawSpirit();
                // 서버보스 소환 화면 플래시 (보라색이 번쩍였다 사라짐)
                if (game.summonFlash > 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = `rgba(150, 60, 255, ${0.5 * (game.summonFlash / 36)})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();
                }
                drawDamageText();
                drawStats();
                drawExpBar();
                drawSkillUI();
                drawTopHUD();
                drawUIButtons();
                drawSpiritHUD();
                drawTownHUD();
                // 이벤트: 가운데 패널(선택 탭) → 그 위에 좌측 메뉴
                if (game.showEvent) {
                    drawEventPanel();
                    drawEventMenu();
                }
                drawHomeUI();
                drawDungeonHUD();
                drawMedalDungeonHUD();
                drawTowerHUD();
                drawDailyBossHUD();
                drawRaidHUD();
                drawZoneClearMsg();
                drawDeathMsg();
                drawSecondAwakenMsg();
                drawJobSelectionUI();
            }
            drawOfflineReward(); // 🌙 오프라인 보상 팝업 (모달 위에도 보이게 분기 밖)
            drawMapUI();
            drawShopUI();
            drawQuestUI();
            drawMenu();
            drawRhythm();
            drawAttendUI();
            drawDailyShopUI();
            drawTowerShopUI();
            drawWorldBossUI();
            drawPetBook();
            requestAnimationFrame(gameLoop);
        }

        // 페이지를 닫거나 새로고침할 때 진행 상황 + 서버보스 남은 체력 저장
        window.addEventListener('beforeunload', () => {
            saveProgress();
            saveServerBossHp();
            // 마지막 점수를 온라인 랭킹에 한 번 더 전송 (sendBeacon은 종료 중에도 전송됨)
            if (RANK_API && navigator.sendBeacon) {
                navigator.sendBeacon(RANK_API, JSON.stringify(rankEntry()));
            }
        });

        // 화면 크기에 맞춰 게임 전체를 축소 (작은 화면에서 아래쪽 상점이 잘리지 않도록)
