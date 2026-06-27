        // 원경 언덕 한 겹 그리기 (시차)
        function drawHills(color, par, baseY, amp) {
            const off = game.camera.x * par;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            for (let sx = 0; sx <= canvas.width; sx += 16) {
                const wx = sx + off;
                const hy = baseY - Math.sin(wx * 0.004) * amp - Math.sin(wx * 0.011) * (amp * 0.45);
                ctx.lineTo(sx, hy);
            }
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.closePath();
            ctx.fill();
        }

        // 지면 장식 1개 (테마별)
        function drawDeco(type, x, y, seed) {
            const sc = 0.7 + rnd(seed * 3) * 0.7;
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(sc, sc);
            if (type === 'plains') {
                ctx.fillStyle = '#4f8f38';
                ctx.beginPath(); ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#6fb84a';
                ctx.beginPath(); ctx.ellipse(-6, -6, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
                if (rnd(seed) > 0.5) { ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(14, -2, 3, 0, Math.PI * 2); ctx.fill(); }
            } else if (type === 'forest') {
                ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-3, -6, 6, 22);
                ctx.fillStyle = '#1f4a2a';
                ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(-20, 2); ctx.lineTo(20, 2); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(-15, -16); ctx.lineTo(15, -16); ctx.closePath(); ctx.fill();
            } else if (type === 'cave') {
                ctx.fillStyle = '#544737';
                ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(-8, -22); ctx.lineTo(4, -10); ctx.lineTo(16, -26); ctx.lineTo(22, 8); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(-8, -22); ctx.lineTo(-2, 0); ctx.lineTo(-14, 4); ctx.closePath(); ctx.fill();
            } else if (type === 'volcano') {
                ctx.fillStyle = '#2a140e';
                ctx.beginPath(); ctx.moveTo(-20, 8); ctx.lineTo(-6, -16); ctx.lineTo(10, -8); ctx.lineTo(20, 8); ctx.closePath(); ctx.fill();
                const glow = 0.5 + Math.sin(Date.now() / 400 + seed) * 0.3;
                ctx.fillStyle = `rgba(255,90,30,${glow})`;
                ctx.beginPath(); ctx.ellipse(0, 9, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
            } else if (type === 'snow') {
                ctx.fillStyle = '#3f5d4a'; ctx.fillRect(-2, -4, 4, 16);
                ctx.fillStyle = '#5b8f6b';
                ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(-15, 4); ctx.lineTo(15, 4); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(-7, -14); ctx.lineTo(7, -14); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.ellipse(16, 12, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
            } else if (type === 'snowpeak') {
                // 눈 덮인 바위 봉우리
                ctx.fillStyle = '#6b7a8f';
                ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(-30, 12); ctx.lineTo(30, 12); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#566678'; // 그림자면(오른쪽)
                ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(0, 12); ctx.lineTo(30, 12); ctx.closePath(); ctx.fill();
                // 흰 눈 덮개
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(0, -56);
                ctx.lineTo(-14, -22); ctx.lineTo(-8, -26); ctx.lineTo(-2, -18);
                ctx.lineTo(4, -27); ctx.lineTo(10, -21); ctx.lineTo(15, -25);
                ctx.lineTo(20, -8);
                ctx.lineTo(-20, -8);
                ctx.closePath(); ctx.fill();
                // 바닥 눈더미
                ctx.fillStyle = 'rgba(255,255,255,0.92)';
                ctx.beginPath(); ctx.ellipse(0, 13, 32, 7, 0, 0, Math.PI * 2); ctx.fill();
            } else if (type === 'toy') {
                // 알록달록 장난감 블록 쌓기 + 공
                const cols = ['#ff6b6b', '#4d96ff', '#ffd93d', '#6bcB77'];
                ctx.fillStyle = cols[seed % 4];
                ctx.fillRect(-16, -10, 22, 22);
                ctx.fillStyle = cols[(seed + 1) % 4];
                ctx.fillRect(6, -6, 18, 18);
                ctx.fillStyle = cols[(seed + 2) % 4];
                ctx.fillRect(-8, -30, 20, 20);
                // 블록 글자 느낌 점
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.beginPath(); ctx.arc(-5, -20, 3, 0, Math.PI * 2); ctx.fill();
                // 공
                ctx.fillStyle = cols[(seed + 3) % 4];
                ctx.beginPath(); ctx.arc(24, 6, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.beginPath(); ctx.arc(22, 3, 2.5, 0, Math.PI * 2); ctx.fill();
            } else if (type === 'heaven') {
                // 황금 후광 + 흰 구름 기둥
                const glow = 0.55 + Math.sin(Date.now() / 500 + seed) * 0.25;
                ctx.strokeStyle = `rgba(255,215,90,${glow})`;
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.ellipse(0, -30, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(-10, 2, 12, 0, Math.PI * 2);
                ctx.arc(6, 2, 14, 0, Math.PI * 2);
                ctx.arc(-2, -6, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,236,170,0.7)';
                ctx.beginPath(); ctx.ellipse(0, 13, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
            } else if (type === 'void') {
                // 떠다니는 보라빛 균열 수정 (2막/심연)
                const glow = 0.5 + Math.sin(Date.now() / 400 + seed) * 0.3;
                ctx.fillStyle = `rgba(150,55,235,${glow})`;
                ctx.beginPath();
                ctx.moveTo(0, -36); ctx.lineTo(-13, -2); ctx.lineTo(-5, 2);
                ctx.lineTo(-9, 24); ctx.lineTo(7, 0); ctx.lineTo(0, -4); ctx.lineTo(11, -14);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = `rgba(225,190,255,${glow})`;
                ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(-4, -10); ctx.lineTo(4, -12); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(120,40,200,0.4)';
                ctx.beginPath(); ctx.ellipse(0, 24, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        // 날씨/분위기 파티클
        function drawAmbient(type) {
            const t = Date.now();
            if (type === 'plains' || type === 'snow' || type === 'snowpeak') {
                // 구름
                ctx.fillStyle = (type === 'plains') ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.85)';
                for (let i = 0; i < 5; i++) {
                    const cx = ((i * 260 + t * 0.012) % (canvas.width + 200)) - 100;
                    const cy = 50 + (i % 3) * 40;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, 40, 16, 0, 0, Math.PI * 2);
                    ctx.ellipse(cx + 30, cy + 6, 30, 13, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            if (type === 'snow' || type === 'snowpeak') {
                // 설산은 눈보라(더 많고 바람에 휘날림)
                const blizzard = type === 'snowpeak';
                const count = blizzard ? 64 : 38;
                const drift = blizzard ? 70 : 18;
                const fall = blizzard ? 0.11 : 0.05;
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                for (let i = 0; i < count; i++) {
                    const sx = (rnd(i) * canvas.width + Math.sin(t / 700 + i) * drift + (blizzard ? t * 0.06 : 0)) % canvas.width;
                    const sy = (rnd(i * 5) * canvas.height + t * fall * (0.5 + rnd(i * 3))) % canvas.height;
                    ctx.beginPath(); ctx.arc(sx, sy, blizzard ? 1.9 : 1.6, 0, Math.PI * 2); ctx.fill();
                }
            } else if (type === 'volcano') {
                for (let i = 0; i < 26; i++) {
                    const sx = (rnd(i) * canvas.width + Math.sin(t / 500 + i) * 10) % canvas.width;
                    const sy = canvas.height - ((t * 0.06 * (0.4 + rnd(i * 3)) + rnd(i * 5) * canvas.height) % canvas.height);
                    ctx.fillStyle = `rgba(255,${120 + Math.floor(rnd(i) * 80)},40,0.8)`;
                    ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI * 2); ctx.fill();
                }
            } else if (type === 'forest') {
                for (let i = 0; i < 24; i++) {
                    const sx = (rnd(i) * canvas.width + Math.sin(t / 700 + i * 2) * 20) % canvas.width;
                    const sy = canvas.height / 2 + rnd(i * 7) * (canvas.height / 2);
                    const a = 0.4 + Math.sin(t / 300 + i) * 0.4;
                    ctx.fillStyle = `rgba(180,255,120,${Math.max(0, a)})`;
                    ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, Math.PI * 2); ctx.fill();
                }
            } else if (type === 'toy') {
                // 둥실 떠오르는 풍선 + 색종이
                const bc = ['#ff6b6b', '#4d96ff', '#ffd93d', '#6bcB77', '#c77dff'];
                for (let i = 0; i < 8; i++) {
                    const bx = (rnd(i) * canvas.width + Math.sin(t / 1200 + i) * 14) % canvas.width;
                    const by = canvas.height - ((t * 0.02 * (0.5 + rnd(i * 3)) + rnd(i * 5) * canvas.height) % (canvas.height + 60));
                    ctx.fillStyle = bc[i % bc.length];
                    ctx.beginPath(); ctx.ellipse(bx, by, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(bx, by + 11); ctx.lineTo(bx, by + 24); ctx.stroke();
                }
                for (let i = 0; i < 18; i++) {
                    const cx = (rnd(i * 2) * canvas.width + Math.sin(t / 400 + i) * 24) % canvas.width;
                    const cy = (rnd(i * 7) * canvas.height + t * 0.04) % canvas.height;
                    ctx.fillStyle = bc[i % bc.length];
                    ctx.fillRect(cx, cy, 4, 4);
                }
            } else if (type === 'heaven') {
                // 위로 떠오르는 황금 빛가루
                for (let i = 0; i < 32; i++) {
                    const sx = (rnd(i) * canvas.width + Math.sin(t / 600 + i) * 16) % canvas.width;
                    const sy = canvas.height - ((t * 0.03 * (0.4 + rnd(i * 3)) + rnd(i * 5) * canvas.height) % canvas.height);
                    const a = 0.4 + Math.sin(t / 250 + i) * 0.4;
                    ctx.fillStyle = `rgba(255,225,120,${Math.max(0, a)})`;
                    ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, Math.PI * 2); ctx.fill();
                }
            } else if (type === 'void') {
                // 반짝이는 별 + 상승하는 보라 입자 (2막/심연)
                for (let i = 0; i < 42; i++) {
                    const sx = rnd(i) * canvas.width;
                    const sy = rnd(i * 5) * canvas.height * 0.62;
                    const a = 0.3 + Math.abs(Math.sin(t / 400 + i)) * 0.7;
                    ctx.fillStyle = `rgba(255,255,255,${a})`;
                    ctx.beginPath(); ctx.arc(sx, sy, rnd(i * 3) > 0.82 ? 1.8 : 1, 0, Math.PI * 2); ctx.fill();
                }
                for (let i = 0; i < 24; i++) {
                    const sx = (rnd(i) * canvas.width + Math.sin(t / 700 + i) * 14) % canvas.width;
                    const sy = canvas.height - ((t * 0.04 * (0.4 + rnd(i * 3)) + rnd(i * 5) * canvas.height) % canvas.height);
                    ctx.fillStyle = `rgba(180,80,255,${0.4 + Math.sin(t / 300 + i) * 0.3})`;
                    ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        // 맵 그리기 (테마별 고품질 배경)
        // 집 1채 그리기 (벽+지붕+문+창문)
        function drawHouse(sx, baseY, w, h, wall, roof) {
            ctx.fillStyle = wall;
            ctx.fillRect(sx - w / 2, baseY - h, w, h);
            ctx.fillStyle = roof;
            ctx.beginPath();
            ctx.moveTo(sx - w / 2 - 8, baseY - h);
            ctx.lineTo(sx, baseY - h - w * 0.45);
            ctx.lineTo(sx + w / 2 + 8, baseY - h);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(sx - w * 0.12, baseY - h * 0.5, w * 0.24, h * 0.5); // 문
            ctx.fillStyle = '#aee7ff';
            ctx.fillRect(sx - w * 0.34, baseY - h * 0.74, w * 0.2, w * 0.2);  // 창문
            ctx.fillRect(sx + w * 0.14, baseY - h * 0.74, w * 0.2, w * 0.2);
        }

        // 마을 배경 + 마이홈
        function drawTown() {
            const W = canvas.width, H = canvas.height, horizon = H / 2;
            const cam = game.camera.x;

            // 하늘
            const sky = ctx.createLinearGradient(0, 0, 0, horizon);
            sky.addColorStop(0, '#afe9ff'); sky.addColorStop(1, '#eafff0');
            ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon);
            // 구름
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            for (let i = 0; i < 4; i++) {
                const cx = ((i * 320 + Date.now() * 0.01) % (W + 220)) - 110, cy = 46 + (i % 2) * 40;
                ctx.beginPath(); ctx.ellipse(cx, cy, 40, 16, 0, 0, Math.PI * 2); ctx.ellipse(cx + 28, cy + 6, 28, 12, 0, 0, Math.PI * 2); ctx.fill();
            }
            // 잔디
            const gr = ctx.createLinearGradient(0, horizon, 0, H);
            gr.addColorStop(0, '#8fd36a'); gr.addColorStop(1, '#5ba23f');
            ctx.fillStyle = gr; ctx.fillRect(0, horizon, W, H - horizon);
            // 길
            ctx.fillStyle = '#caa472'; ctx.fillRect(0, horizon + 40, W, 56);

            const baseY = horizon + 70;
            // 배경 장식 집
            [[180, '#e8c39e', '#c0392b'], [430, '#cfe0b0', '#2980b9'], [1050, '#e6d3a3', '#8e44ad'], [1250, '#dcc1a0', '#16a085']]
                .forEach(([wx, wall, roof]) => drawHouse(wx - cam, baseY, 120, 86, wall, roof));

            // 마이홈 (크게)
            const hx = HOME_X - cam;
            drawHouse(hx, baseY, 180, 124, '#ffe0a3', '#d35400');
            // 간판
            ctx.fillStyle = '#3d2b1f'; ctx.fillRect(hx - 52, baseY - 168, 104, 26);
            ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🏠 마이홈', hx, baseY - 155);
            const homeTotal = game.home.hp + game.home.atk + game.home.def;
            if (homeTotal > 0) {
                ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial';
                ctx.fillText('Lv.' + homeTotal, hx, baseY - 133);
            }
            // 입장 안내
            if (game.nearHome && !game.showHome) {
                const tw = 160, tx = hx - tw / 2, ty = baseY - 205;
                ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(tx, ty, tw, 26);
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(tx, ty, tw, 26);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
                ctx.fillText('[E] 집 들어가기', hx, ty + 13);
            }
        }

        // 마을 HUD (사냥터로 나가기 버튼)
        function drawTownHUD() {
            if (!game.inTown) return;
            game.townButtons = [];
            // HP/MP·물약 표시(우상단, y≈96)와 겹치지 않게 그 아래에 배치
            const bw = 130, bh = 34, x = canvas.width - bw - 14, y = 116;
            ctx.fillStyle = '#16a085'; ctx.fillRect(x, y, bw, bh);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, bh);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🚪 사냥터로', x + bw / 2, y + bh / 2);
            game.townButtons.push({ x, y, w: bw, h: bh, id: 'leave' });
        }

        // 마이홈 실내
        function drawHomeUI() {
            if (!game.showHome) return;
            game.homeButtons = [];
            const W = canvas.width, H = canvas.height;
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);

            const winW = 540, winH = 430, winX = (W - winW) / 2, winY = (H - winH) / 2;
            ctx.fillStyle = '#e8d3b0'; ctx.fillRect(winX, winY, winW, winH);          // 벽
            ctx.fillStyle = '#a9765a'; ctx.fillRect(winX, winY + winH - 90, winW, 90); // 바닥
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3; ctx.strokeRect(winX, winY, winW, winH);

            // 제목
            ctx.fillStyle = '#5d4037'; ctx.font = 'bold 23px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText('🏠 마이홈', W / 2, winY + 12);

            // 장식
            ctx.font = '40px Arial'; ctx.textBaseline = 'middle';
            ctx.fillText('🛏️', winX + 60, winY + 60);
            ctx.fillText('🪟', winX + winW - 60, winY + 60);

            ctx.fillStyle = '#5d4037'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`보유 코인: ${game.coins.toLocaleString()}🪙`, W / 2, winY + 56);

            // 버튼들
            const bw = winW - 80, bh = 42, bx = winX + 40;
            let by = winY + 86;
            const mkBtn = (label, color, action) => {
                ctx.fillStyle = color; ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(label, bx + bw / 2, by + bh / 2);
                game.homeButtons.push({ x: bx, y: by, w: bw, h: bh, action });
                by += bh + 10;
            };
            mkBtn('🛏️ 휴식하기 (체력·마나 완전 회복)', '#2ecc71', 'rest');
            // 강화 3종 (체력/공격/방어)
            [['hp', '❤️ 체력', 'up_hp'], ['atk', '⚔️ 공격력', 'up_atk'], ['def', '🛡️ 방어력', 'up_def']].forEach(([stat, label, action]) => {
                const cost = homeUpgradeCost(stat);
                mkBtn(`${label} 강화 Lv.${game.home[stat] || 0}→${(game.home[stat] || 0) + 1}  +${homeBonus(stat) + 5}%  (${cost.toLocaleString()}🪙)`,
                    game.coins >= cost ? '#b8860b' : '#555', action);
            });
            mkBtn('🚪 나가기', '#7f8c8d', 'close');
        }

        function drawMap() {
            if (game.inTown) { drawTown(); return; }
            const S = curTheme();
            const W = canvas.width, H = canvas.height, horizon = H / 2;

            // 하늘 그라데이션
            const sky = ctx.createLinearGradient(0, 0, 0, horizon);
            sky.addColorStop(0, S.sky[0]); sky.addColorStop(1, S.sky[1]);
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, horizon);

            // 원경 언덕 (시차 2겹)
            drawHills(S.hill1, 0.25, horizon - 8, 30);
            drawHills(S.hill2, 0.5, horizon + 4, 18);

            // 지면 그라데이션
            const gr = ctx.createLinearGradient(0, horizon, 0, H);
            gr.addColorStop(0, S.ground[0]); gr.addColorStop(1, S.ground[1]);
            ctx.fillStyle = gr;
            ctx.fillRect(0, horizon, W, H - horizon);

            // 지평선 음영
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(0, horizon, W, 4);

            // 지면 장식 (시차 1.0)
            const spacing = 150;
            const cam = game.camera.x;
            const first = Math.floor((cam - 220) / spacing);
            const last = Math.floor((cam + W + 220) / spacing);
            for (let idx = first; idx <= last; idx++) {
                const wx = idx * spacing + rnd(idx) * 90;
                const sx = wx - cam;
                const ty = horizon + 28 + rnd(idx * 9) * (H / 2 - 70);
                drawDeco(S.deco, sx, ty, idx);
            }

            // 분위기 파티클
            drawAmbient(S.deco);
        }

        // ✨ 과학자 전용 음표 스킨 (스프라이트 시트 1장, 가로 5컷). 정지 이미지면 SCI_SKIN_FRAMES를 1로
        const SCI_SKIN_FRAMES = 5;
        const SCI_SKIN_TOP = 0.29;   // 위쪽 크롭 (라벨 24~28.5% 아래, 머리 37.5% 위로 여백 확보)
        const SCI_SKIN_BOT = 0.24;   // 아래쪽 여백 크롭
        const sciSkinSheet = new Image();
        sciSkinSheet.src = './과학자 음표스킨-Photoroom.png';
        function sciSkinOn() { return game.character.job === '과학자' && game.boughtSciSkin && game.equippedSciSkin && sciSkinSheet.complete && sciSkinSheet.naturalWidth > 0; }

        // 캐릭터 그리기
        // 🏷️ 장착한 칭호를 캐릭터 머리 위에 표시 (기본 칭호는 생략)
        function drawTitleTag() {
            if (!game.titleEquipped || game.titleEquipped === 'beginner') return;
            if (game.inTown || game.showHome) return; // 마을/집에선 생략
            const t = equippedTitleDef();
            const char = game.character;
            const sx = char.x - game.camera.x;
            const sy = char.y - char.height / 2 - 14;
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'bold 13px Arial';
            const label = (t.glow ? '👑 ' : '') + t.name;
            const tw = ctx.measureText(label).width + 14;
            // 배경 박스
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(sx - tw / 2, sy - 9, tw, 18);
            if (t.glow) { // 세계관 최강자: 금색 글로우
                ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12;
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
                ctx.strokeRect(sx - tw / 2, sy - 9, tw, 18);
            }
            ctx.fillStyle = t.color;
            ctx.fillText(label, sx, sy);
            ctx.restore();
        }

        function drawCharacter() {
            const char = game.character;
            // ✨ 과학자 음표 스킨: 시트(가로 5컷)에서 현재 프레임만 잘라 그림 (왼쪽은 좌우반전)
            if (sciSkinOn()) {
                const useLeftS = char.facing === 'left';
                const sx = char.x - game.camera.x, sy = char.y;
                const fi = (char.direction === 'idle') ? 0 : (char.frameIndex % SCI_SKIN_FRAMES);
                const fw = sciSkinSheet.naturalWidth / SCI_SKIN_FRAMES;
                const sTop = sciSkinSheet.naturalHeight * SCI_SKIN_TOP;                  // 라벨 잘라낸 시작 y
                const fh = sciSkinSheet.naturalHeight * (1 - SCI_SKIN_TOP - SCI_SKIN_BOT); // 캐릭터 영역 높이
                const scaleAmount = char.isAttacking ? 1 + (1 - char.attackCounter / char.attackDuration) * 0.15 : 1;
                const w = char.width * scaleAmount, h = char.height * scaleAmount;
                ctx.save();
                if (useLeftS) { ctx.translate(sx, 0); ctx.scale(-1, 1); ctx.translate(-sx, 0); }
                ctx.drawImage(sciSkinSheet, fi * fw, sTop, fw, fh, sx - w / 2, sy - h / 2, w, h);
                if (char.isAttacking) {
                    ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 * (char.attackCounter / char.attackDuration)})`;
                    ctx.lineWidth = 3; ctx.strokeRect(sx - w / 2, sy - h / 2, w, h);
                }
                ctx.restore();
                return;
            }
            // 방향에 맞는 스프라이트 사용 (left/right 별도 로드 완료)
            const useLeft = char.facing === 'left';
            let frames = useLeft ? char.images.left : char.images.right;
            if (!frames || frames.length === 0) frames = char.images.right; // fallback

            let currentImage = null;
            if (char.direction === 'idle') {
                currentImage = frames && frames[0];
            } else if (frames && frames[char.frameIndex]) {
                currentImage = frames[char.frameIndex];
            }

            const screenX = char.x - game.camera.x;
            const screenY = char.y;
            // 전용 left/right 이미지가 없으면 flip (fallback)
            const needsFlip = useLeft && (!char.images.left || char.images.left.length === 0);

            if (currentImage && currentImage.complete && currentImage.naturalWidth > 0) {
                const scaleAmount = char.isAttacking
                    ? 1 + (1 - char.attackCounter / char.attackDuration) * 0.15 : 1;
                const w = char.width * scaleAmount;
                const h = char.height * scaleAmount;

                // 🌈 무기 오라: 장착 무기 등급 색으로 캐릭터 뒤에 은은한 빛 (레어 이상만)
                const wpn = game.equipped.weapon ? getItemById(game.equipped.weapon) : null;
                if (wpn && wpn.rarity >= 1 && RARITIES[wpn.rarity]) {
                    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
                    const rad = Math.max(w, h) * 0.62;
                    const g = ctx.createRadialGradient(screenX, screenY, rad * 0.15, screenX, screenY, rad);
                    g.addColorStop(0, RARITIES[wpn.rarity].color);
                    g.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.save();
                    ctx.globalAlpha = 0.28 + 0.22 * pulse;
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(screenX, screenY, rad, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }

                ctx.save();
                if (needsFlip) { ctx.translate(screenX, 0); ctx.scale(-1, 1); ctx.translate(-screenX, 0); }
                ctx.drawImage(currentImage, screenX - w / 2, screenY - h / 2, w, h);
                if (char.isAttacking) {
                    ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 * (char.attackCounter / char.attackDuration)})`;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(screenX - w / 2, screenY - h / 2, w, h);
                }
                ctx.restore();
            } else {
                ctx.fillStyle = '#667eea';
                ctx.fillRect(screenX - char.width / 2, screenY - char.height / 2, char.width, char.height);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 30px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(char.frameIndex + 1, screenX, screenY);
            }
        }

        // 직업 선택 UI 그리기
        function drawJobSelectionUI() {
            if (!game.selectingJob) return;

            // 배경 어둡게
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 창 배경
            const windowWidth = 600;
            const windowHeight = 400;
            const windowX = (canvas.width - windowWidth) / 2;
            const windowY = (canvas.height - windowHeight) / 2;

            ctx.fillStyle = '#222';
            ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);

            // 제목
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('직업을 선택하세요', canvas.width / 2, windowY + 20);

            // 직업 선택지
            const jobs = [
                { name: '마법사', icon: '🧙‍♂️', desc: '마나 +50', bonus: { maxMana: 50 } },
                { name: '암살자', icon: '🗡️', desc: '공격력 +20', bonus: { attack: 20 } },
                { name: '과학자', icon: '🔬', desc: '모든 능력 +10', bonus: { maxHp: 10, maxMana: 10, attack: 10, defense: 10 } },
                { name: '환경미화원', icon: '🧹', desc: '방어력 +15', bonus: { defense: 15 } }
            ];

            const buttonWidth = 130;
            const buttonHeight = 100;
            const padding = 20;
            const startX = windowX + padding;
            const startY = windowY + 80;

            game.jobButtons = [];

            jobs.forEach((job, index) => {
                const row = Math.floor(index / 2);
                const col = index % 2;
                const x = startX + col * (buttonWidth + padding);
                const y = startY + row * (buttonHeight + padding);

                // 버튼 배경
                ctx.fillStyle = '#444';
                ctx.fillRect(x, y, buttonWidth, buttonHeight);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, buttonWidth, buttonHeight);

                // 직업명과 아이콘
                ctx.fillStyle = '#fff';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(job.icon, x + buttonWidth / 2, y + 10);

                ctx.font = 'bold 14px Arial';
                ctx.fillText(job.name, x + buttonWidth / 2, y + 45);

                ctx.font = '11px Arial';
                ctx.fillStyle = '#ffff00';
                ctx.fillText(job.desc, x + buttonWidth / 2, y + 65);

                // 클릭 영역 저장
                game.jobButtons.push({
                    x: x,
                    y: y,
                    w: buttonWidth,
                    h: buttonHeight,
                    job: job
                });
            });
        }

        // === 이벤트: 좌측 메뉴(스텟/상점/맵) → 클릭 시 가운데 패널 ===

        // 이벤트 좌측 메뉴
        function drawEventMenu() {
            game.eventMenuButtons = [];
            // tab=가운데 패널 탭, launch=바로 실행(보스워프/뽑기/마을/퀘스트/PvP)
            const items = [
                { tab: 'stat', label: '📊 스텟' },
                { tab: 'skill', label: '🎯 스킬' },
                { tab: 'shop', label: '🛒 상점' },
                { tab: 'gem',  label: '💎 보석' },
                { tab: 'medal', label: '🎖️ 훈장' },
                { tab: 'boss', label: '🌐 서버보스' },
                { launch: 'dailyBoss', label: '🌅 일일보스' },
                { launch: 'worldBoss', label: '🌍 월드보스' },
                { launch: 'tower', label: '🗼 무한의탑' },
                { launch: 'towerShop', label: '🪙 탑상점' },
                { tab: 'dungeon', label: '⏳ 경험치던전' },
                { tab: 'medalDungeon', label: '🎗️ 훈장던전' },
                { tab: 'guild', label: '🏰 길드' },
                { tab: 'map',  label: '🗺️ 맵' },
                { launch: 'warpBoss', label: '⚔️ 보스' },
                { launch: 'gacha', label: '🎰 뽑기' },
                { launch: 'town', label: '🏘️ 마을' },
                { launch: 'pvp', label: '⚔️ PvP' },
                { launch: 'chat', label: '💬 채팅' },
                { launch: 'auction', label: '🏪 경매장' }
            ];
            const bw = 112, bh = 32, gx = 6, gy = 6;
            const x0 = 15, y0 = 92, cols = 2;
            items.forEach((it, i) => {
                const col = i % cols, row = Math.floor(i / cols);
                const x = x0 + col * (bw + gx);
                const y = y0 + row * (bh + gy);
                const active = it.tab && game.eventTab === it.tab;
                ctx.fillStyle = active ? '#f39c12' : (it.launch ? 'rgba(20,40,30,0.82)' : 'rgba(0, 0, 0, 0.78)');
                ctx.fillRect(x, y, bw, bh);
                ctx.strokeStyle = it.launch ? '#27ae60' : '#f39c12';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, bw, bh);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(it.label, x + bw / 2, y + bh / 2);
                game.eventMenuButtons.push({ x, y, w: bw, h: bh, tab: it.tab, launch: it.launch });
            });
        }

        // 가운데 패널 (선택한 탭 내용) — 매 프레임 버튼 초기화 후 다시 그림
        function drawEventPanel() {
            game.statButtons = null;
            game.statBatchButtons = [];
            game.serverBossButton = null;
            game.scrollButton = null;
            game.cubeButton = null;
            game.petScrollButton = null;
            game.petButton = null;
            game.petBookButton = null; // 버그수정: 상점탭에서만 설정되고 리셋 안 돼 다른 탭 클릭 가로챔
            game.hpPotionButton = null;
            game.mpPotionButton = null;
            game.eventZoneButtons = [];
            game.eventCloseButton = null;
            game.gemButtons = [];
            game.dungeonButton = null;
            game.skillTabButtons = [];
            game.autoBossButton = null;
            game.bossTierButtons = [];
            game.medalButtons = [];
            game.medalDungeonButton = null;
            game.guildButtons = [];

            if (!game.eventTab) return;

            // 배경 어둡게
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const winW = 460, winH = 440;
            const winX = (canvas.width - winW) / 2;
            const winY = (canvas.height - winH) / 2;
            game.eventWindow = { x: winX, y: winY, w: winW, h: winH };

            // 창
            ctx.fillStyle = '#1b1b28';
            ctx.fillRect(winX, winY, winW, winH);
            ctx.strokeStyle = '#f39c12';
            ctx.lineWidth = 3;
            ctx.strokeRect(winX, winY, winW, winH);

            // 제목
            const titles = { stat: '📊 스탯', skill: '🎯 스킬', shop: '🛒 상점', gem: '💎 보석', medal: '🎖️ 훈장', boss: '🌐 서버보스', dungeon: '⏳ 경험치 던전', medalDungeon: '🎗️ 훈장 던전', guild: '🏰 길드', map: '🗺️ 맵' };
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(titles[game.eventTab], canvas.width / 2, winY + 12);

            // 닫기 버튼
            const ccx = winX + winW - 38, ccy = winY + 10;
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(ccx, ccy, 26, 26);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✕', ccx + 13, ccy + 14);
            game.eventCloseButton = { x: ccx, y: ccy, w: 26, h: 26 };

            const innerX = winX + 24, innerW = winW - 48, topY = winY + 58;
            if (game.eventTab === 'stat') drawStatTab(innerX, topY, innerW);
            else if (game.eventTab === 'skill') drawSkillTab(innerX, topY, innerW);
            else if (game.eventTab === 'shop') drawShopTab(innerX, topY, innerW);
            else if (game.eventTab === 'gem') drawGemTab(innerX, topY, innerW);
            else if (game.eventTab === 'medal') drawMedalTab(innerX, topY, innerW);
            else if (game.eventTab === 'boss') drawBossTab(innerX, topY, innerW);
            else if (game.eventTab === 'dungeon') drawDungeonTab(innerX, topY, innerW);
            else if (game.eventTab === 'medalDungeon') drawMedalDungeonTab(innerX, topY, innerW);
            else if (game.eventTab === 'guild') drawGuildTab(innerX, topY, innerW);
        }

        // 길드 탭 — 미가입: 목록+만들기 / 가입: 멤버·기여·탈퇴
        function drawGuildTab(x, y, w) {
            game.guildButtons = [];
            const mkBtn = (bx, by, bw, bh, label, action, name, col) => {
                ctx.fillStyle = col || '#27ae60';
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(label, bx + bw / 2, by + bh / 2);
                game.guildButtons.push({ x: bx, y: by, w: bw, h: bh, action, name });
            };

            if (!game.guildName) {
                // 미가입: 길드 목록 + 만들기
                ctx.fillStyle = '#cfe0ff'; ctx.font = '13px Arial';
                ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                ctx.fillText('가입할 길드를 고르거나 새로 만드세요 (총점순)', x, y);
                mkBtn(x + w - 92, y - 6, 92, 24, '🔄 새로고침', 'refresh', null, '#34495e');

                const list = GUILD.list || [];
                const rowH = 40, listY = y + 28;
                const maxRows = 6;
                if (GUILD.loading && list.length === 0) {
                    ctx.fillStyle = '#aaa'; ctx.fillText('불러오는 중…', x, listY + 8);
                } else if (list.length === 0) {
                    ctx.fillStyle = '#aaa'; ctx.fillText('아직 길드가 없어요. 첫 길드를 만들어 보세요!', x, listY + 8);
                }
                list.slice(0, maxRows).forEach((g, i) => {
                    const ry = listY + i * (rowH + 4);
                    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, ry, w, rowH);
                    ctx.strokeStyle = '#3a5a82'; ctx.lineWidth = 1; ctx.strokeRect(x, ry, w, rowH);
                    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                    ctx.fillText(`${i + 1}. ${g.name}`, x + 8, ry + 13);
                    ctx.fillStyle = '#b8c2d8'; ctx.font = '11px Arial';
                    ctx.fillText(`리더 ${g.leader} · 멤버 ${g.members} · 총점 ${(g.total || 0).toLocaleString()}`, x + 8, ry + 29);
                    mkBtn(x + w - 70, ry + 7, 62, 26, '가입', 'join', g.name, '#2980b9');
                });
                // 만들기 버튼 (하단)
                mkBtn(x, y + 28 + maxRows * (rowH + 4) + 4, w, 30, '🏰 새 길드 만들기', 'create', null, '#27ae60');
                return;
            }

            // === 가입 상태: 서브탭 (정보/길드전/강화/상점) ===
            const subs = [['info', '정보'], ['raid', '길드전'], ['upgrade', '강화'], ['shop', '상점']];
            const stbW = (w - 9) / 4;
            subs.forEach(([key, lab], i) => {
                const sx = x + i * (stbW + 3);
                const on = game.guildSubTab === key;
                ctx.fillStyle = on ? '#f39c12' : 'rgba(0,0,0,0.55)';
                ctx.fillRect(sx, y, stbW, 26);
                ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 1; ctx.strokeRect(sx, y, stbW, 26);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(lab, sx + stbW / 2, y + 13);
                game.guildButtons.push({ x: sx, y, w: stbW, h: 26, action: 'subtab', name: key });
            });
            const cy = y + 36;

            // ---- 정보 ----
            if (game.guildSubTab === 'info') {
                const info = GUILD.info;
                if (!info || info.name !== game.guildName) {
                    ctx.fillStyle = '#aaa'; ctx.font = '13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                    ctx.fillText('길드 «' + game.guildName + '» 정보 불러오는 중…', x, cy + 6);
                    mkBtn(x, cy + 30, 110, 28, '🔄 새로고침', 'refresh', null, '#34495e');
                    return;
                }
                ctx.fillStyle = '#ffd700'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                ctx.fillText('🏰 ' + info.name, x, cy);
                ctx.fillStyle = '#9fe0b0'; ctx.font = '12px Arial';
                ctx.fillText(`리더 ${info.leader} · 멤버 ${info.members.length}명 · 길드 총점 ${(info.total || 0).toLocaleString()}`, x, cy + 20);
                const memY = cy + 40, rowH = 22, maxRows = 6;
                info.members.slice(0, maxRows).forEach((m, i) => {
                    const ry = memY + i * rowH;
                    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)';
                    ctx.fillRect(x, ry, w, rowH);
                    ctx.fillStyle = (m.name === myName()) ? '#ffe082' : '#fff';
                    ctx.font = (m.name === myName()) ? 'bold 12px Arial' : '12px Arial';
                    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                    ctx.fillText(`${i + 1}. ${m.name}${m.name === info.leader ? ' 👑' : ''}`, x + 8, ry + rowH / 2);
                    ctx.fillStyle = '#b8c2d8'; ctx.font = '12px Arial'; ctx.textAlign = 'right';
                    ctx.fillText((m.contribution || 0).toLocaleString(), x + w - 10, ry + rowH / 2);
                });
                const by = memY + maxRows * rowH + 8, bw = (w - 8) / 2;
                mkBtn(x, by, bw, 30, '🔄 새로고침', 'refresh', null, '#34495e');
                mkBtn(x + bw + 8, by, bw, 30, '🚪 탈퇴', 'leave', null, '#c0392b');
                ctx.fillStyle = '#7a86a0'; ctx.font = '11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                ctx.fillText('※ 기여점수 = 길드전 최고 데미지', x, by + 36);
                return;
            }

            // ---- 길드전 ----
            if (game.guildSubTab === 'raid') {
                ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                ctx.fillText('⚔️ 길드전 — 1분 보스 레이드', x, cy);
                ctx.fillStyle = '#cdd6ea'; ctx.font = '12px Arial';
                ctx.fillText('절대 안 죽는 보스에게 1분 동안', x, cy + 26);
                ctx.fillText('최대한 많은 데미지를 넣으세요!', x, cy + 44);
                ctx.fillText('총 데미지 = 길드 기여점수(랭킹)', x, cy + 62);
                ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px Arial';
                ctx.fillText(`🏆 내 최고 데미지: ${game.raidBest.toLocaleString()}`, x, cy + 92);
                mkBtn(x, cy + 120, w, 40, '⚔️ 길드전 시작 (1분)', 'raidstart', null, '#c0392b');
                return;
            }

            // ---- 강화 ----
            if (game.guildSubTab === 'upgrade') {
                ctx.fillStyle = '#cdd6ea'; ctx.font = '12px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                ctx.fillText('🤝 길드원 공유 강화 (레벨당 +' + GUILD_UP_PCT + '%, 모두 적용)', x, cy);
                ctx.fillStyle = '#ffd700'; ctx.font = 'bold 12px Arial';
                ctx.fillText(`보유 코인 ${game.coins.toLocaleString()}🪙`, x, cy + 18);
                [['atk', '⚔️ 공격력'], ['def', '🛡️ 방어력'], ['hp', '❤️ 체력']].forEach(([stat, lab], i) => {
                    const ry = cy + 42 + i * 50;
                    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, ry, w, 44);
                    ctx.strokeStyle = '#5a4a82'; ctx.lineWidth = 1; ctx.strokeRect(x, ry, w, 44);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                    ctx.fillText(`${lab}  Lv.${game.guildUpgrade[stat] || 0}  (+${guildBonus(stat)}%)`, x + 8, ry + 15);
                    const cost = guildUpgradeCost(stat);
                    ctx.fillStyle = '#9fe0b0'; ctx.font = '11px Arial';
                    ctx.fillText(`다음 Lv → +${GUILD_UP_PCT}%  ·  ${cost.toLocaleString()}🪙`, x + 8, ry + 33);
                    mkBtn(x + w - 96, ry + 8, 88, 28, '강화', 'upg', stat, game.coins >= cost ? '#27ae60' : '#555');
                });
                return;
            }

            // ---- 상점 ----
            if (game.guildSubTab === 'shop') {
                ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                // 상점 레벨 + 업그레이드 버튼
                ctx.fillStyle = '#ffd700'; ctx.font = 'bold 13px Arial';
                ctx.fillText(`🛒 길드 상점 Lv.${game.guildShopLevel}  ·  코인 ${game.coins.toLocaleString()}🪙`, x, cy);
                if (game.guildShopLevel < SHOP_MAX_LEVEL) {
                    const uc = shopUpgradeCost();
                    const nextTxt = game.guildShopLevel === 0 ? '훈장조각·경험치 해금' : '직업의 혼(각성) 해금';
                    ctx.fillStyle = '#9fe0b0'; ctx.font = '10px Arial';
                    ctx.fillText(`업그레이드 → ${nextTxt}`, x, cy + 18);
                    mkBtn(x + w - 150, cy + 14, 142, 24, `⬆️ 상점 강화 ${uc.toLocaleString()}🪙`, 'shopupg', null, game.coins >= uc ? '#8e44ad' : '#555');
                } else {
                    ctx.fillStyle = '#b388ff'; ctx.font = '10px Arial';
                    ctx.fillText('상점 최고 단계! 모든 상품 해금됨', x, cy + 18);
                }
                // 해금된 아이템만 표시
                const items = GUILD_SHOP.filter(it => (it.lv || 0) <= game.guildShopLevel);
                items.forEach((it, i) => {
                    const ry = cy + 40 + i * 36;
                    const isSoul = it.key === 'soul';
                    const done = isSoul && game.awakened;
                    ctx.fillStyle = isSoul ? 'rgba(224,64,251,0.14)' : 'rgba(255,255,255,0.06)';
                    ctx.fillRect(x, ry, w, 32);
                    ctx.strokeStyle = isSoul ? '#e040fb' : '#3a5a82'; ctx.lineWidth = 1; ctx.strokeRect(x, ry, w, 32);
                    const label = isSoul ? `🔮 ${game.character.job}의 혼` : it.label;
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                    ctx.fillText(label, x + 8, ry + 10);
                    ctx.fillStyle = '#9fb0c4'; ctx.font = '10px Arial';
                    ctx.fillText(it.desc + '  ·  ' + it.cost.toLocaleString() + '🪙', x + 8, ry + 24);
                    if (done) {
                        ctx.fillStyle = '#b388ff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
                        ctx.fillText('각성 완료 ✓', x + w - 10, ry + 16);
                    } else {
                        mkBtn(x + w - 64, ry + 4, 58, 24, '구매', 'buy', it.key, game.coins >= it.cost ? (isSoul ? '#8e44ad' : '#2980b9') : '#555');
                    }
                });
                return;
            }
        }

        // 훈장 탭 (코인으로 등급 + 조각으로 강화 + 큐브로 추가능력)
        function drawMedalTab(x, y, w) {
            game.medalButtons = [];
            const cx = x + w / 2;
            const g = game.medalGrade;
            const hasMedal = g > 0;

            // 현재 훈장 이름 + 등급 (좌) / 조각·큐브 보유 (우)
            ctx.fillStyle = hasMedal ? '#ffd700' : '#888';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const eDisp = game.medalEnhance || 0;
            const nameLine = hasMedal 
                ? `🎖️ ${MEDAL_NAMES[g - 1]} 훈장${eDisp > 0 ? ` +${eDisp}` : ''} (${g}/${MEDAL_MAX_GRADE})` 
                : '🔓 훈장 없음';
            ctx.fillText(nameLine, x, y);
            ctx.fillStyle = '#ffd166';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`🎗️${game.medalShards.toLocaleString()}  🧿${game.medalCubes}`, x + w, y + 3);

            const contentY = y + (hasMedal ? 24 : 40);
            if (!hasMedal) {
                ctx.fillStyle = '#ffd700';
                ctx.font = '11px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('코인으로 훈장 구매 가능 (훈장던전은 별도 보상)', x, y + 20);
            }

            // 등급 + 강화 보너스
            ctx.fillStyle = '#9be7ff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'left';
            const eNow = game.medalEnhance || 0;
            const bonusText = eNow > 0 
                ? `등급+강화: +${medalBonus()}% (등급${g*5}% + 강화${eNow*2}%)` 
                : `등급 보너스: 공격력·방어력 +${medalBonus()}%`;
            ctx.fillText(bonusText, x, contentY);

            // 추가능력 박스
            const abilLines = medalAbilityLines();
            const boxY = contentY + 20, boxH = 86;
            ctx.fillStyle = 'rgba(179,136,255,0.10)';
            ctx.fillRect(x, boxY, w, boxH);
            ctx.strokeStyle = '#b388ff'; ctx.lineWidth = 1; ctx.strokeRect(x, boxY, w, boxH);
            ctx.fillStyle = '#d6b3ff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText(`✨ 추가능력 (등급 ${g || 0} → 최대 ${abilLines}줄)`, x + 8, boxY + 6);
            ctx.font = '12px Arial';
            if (game.medalAbilities && game.medalAbilities.length) {
                game.medalAbilities.forEach((a, i) => {
                    ctx.fillStyle = '#fff';
                    ctx.fillText(`• ${a.label} +${a.val}%`, x + 14, boxY + 26 + i * 18);
                });
            } else {
                ctx.fillStyle = '#888';
                ctx.fillText(hasMedal ? '큐브를 사용해 추가능력을 획득하세요' : '훈장을 먼저 구매하세요', x + 14, boxY + 30);
            }

            const bh = 42;
            // 다음 등급 구매 (코인)
            let by = boxY + boxH + 10;
            if (g >= MEDAL_MAX_GRADE) {
                ctx.fillStyle = '#444'; ctx.fillRect(x, by, w, bh);
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(x, by, w, bh);
                ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('🏆 최고 등급 훈장 달성!', cx, by + bh / 2);
            } else {
                const cost = MEDAL_COST[g];
                const ok = game.coins >= cost;
                ctx.fillStyle = ok ? '#b8860b' : '#555'; ctx.fillRect(x, by, w, bh);
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(x, by, w, bh);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(`${MEDAL_NAMES[g]} 훈장 구매 (${cost.toLocaleString()}🪙)`, cx, by + bh / 2);
                game.medalButtons.push({ x, y: by, w, h: bh, action: 'buyMedal' });
            }

            // 훈장 강화 (최대 +15까지, 조각 소모)
            if (hasMedal) {
                by += bh + 8;
                const curEnh = game.medalEnhance || 0;
                const isMaxEnh = curEnh >= MEDAL_MAX_ENHANCE;
                const eCost = isMaxEnh ? 0 : getMedalEnhanceCost();
                const canEnhance = !isMaxEnh && game.medalShards >= eCost;
                ctx.fillStyle = isMaxEnh ? '#2e7d32' : (canEnhance ? '#1b5e20' : '#555');
                ctx.fillRect(x, by, w, bh);
                ctx.strokeStyle = '#4caf50';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, by, w, bh);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const enhLabel = isMaxEnh 
                    ? `🏆 +${MEDAL_MAX_ENHANCE} 강화 완료!` 
                    : `🎗️ 훈장 강화 (+${curEnh} → +${curEnh + 1}) (${eCost.toLocaleString()}🎗️)`;
                ctx.fillText(enhLabel, cx, by + bh / 2);
                if (!isMaxEnh) {
                    game.medalButtons.push({ x, y: by, w, h: bh, action: 'enhanceMedal' });
                }
            }

            // 큐브 사용 → 추가능력 획득 (훈장 있을 때만)
            if (hasMedal) {
                by += bh + 8;
                const canUse = game.medalCubes >= 1;
                ctx.fillStyle = canUse ? '#6c3483' : '#555'; ctx.fillRect(x, by, w, bh);
                ctx.strokeStyle = '#b388ff'; ctx.lineWidth = 2; ctx.strokeRect(x, by, w, bh);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(`🧿 큐브 사용 — 추가능력 획득 (보유 ${game.medalCubes})`, cx, by + bh / 2);
                game.medalButtons.push({ x, y: by, w, h: bh, action: 'gainMedalAbility' });
            }

            // 큐브 구매 (코인)
            by += bh + 8;
            const okc = game.coins >= MEDAL_CUBE_COST;
            ctx.fillStyle = okc ? '#34495e' : '#555'; ctx.fillRect(x, by, w, bh);
            ctx.strokeStyle = '#9be7ff'; ctx.lineWidth = 2; ctx.strokeRect(x, by, w, bh);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`🧿 훈장 큐브 구매 (${MEDAL_CUBE_COST.toLocaleString()}🪙)`, cx, by + bh / 2);
            game.medalButtons.push({ x, y: by, w, h: bh, action: 'buyMedalCube' });
        }

        // 훈장 던전 탭 (입장 안내 + 입장 버튼) — 처치 시 훈장 조각 획득 (강화 재화)
        function drawMedalDungeonTab(x, y, w) {
            const cx = x + w / 2;
            ctx.font = '46px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎗️', cx, y + 40);

            ctx.font = 'bold 15px Arial';
            ctx.textBaseline = 'top';
            const lines = [
                '몬스터가 전부 HP 1 (원킬!)',
                `1킬당 +${MEDAL_SHARD_PER_KILL} 훈장 조각 🎗️`,
                '제한 시간 10분',
                `입장료 ${MEDAL_DUNGEON_COST.toLocaleString()}🪙`,
                `보유 훈장 조각: ${game.medalShards.toLocaleString()}🎗️`,
                `조각으로 훈장 강화 (최대 +${MEDAL_MAX_ENHANCE})`
            ];
            lines.forEach((t, i) => {
                ctx.fillStyle = (i === 3 ? '#ffd700' : (i === 4 ? '#ffd166' : (i === 5 ? '#ffeb3b' : '#ddd')));
                ctx.fillText(t, cx, y + 72 + i * 22);
            });

            const btnY = y + 218, btnH = 54;
            if (game.inMedalDungeon) {
                const sec = Math.ceil(game.medalDungeonTimer / 60);
                ctx.fillStyle = '#69f0ae';
                ctx.font = 'bold 16px Arial';
                ctx.fillText(`입장 중 — 남은 시간 ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, cx, btnY - 28);
            }
            const ok = !game.inMedalDungeon && game.coins >= MEDAL_DUNGEON_COST;
            ctx.fillStyle = game.inMedalDungeon ? '#555' : (ok ? '#b8860b' : '#555');
            ctx.fillRect(x, btnY, w, btnH);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, btnY, w, btnH);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.textBaseline = 'middle';
            ctx.fillText(game.inMedalDungeon ? '🎗️ 이미 입장 중' : `🎗️ 훈장 던전 입장 (${MEDAL_DUNGEON_COST.toLocaleString()}🪙)`, cx, btnY + btnH / 2);
            if (!game.inMedalDungeon) game.medalDungeonButton = { x, y: btnY, w, h: btnH };
        }

        // 경험치 던전 탭 (입장 안내 + 입장 버튼)
        function drawDungeonTab(x, y, w) {
            const dungeonExp = ZONES[game.maxUnlockedZone].monExp;
            const cxp = x + w / 2;

            // 아이콘
            ctx.font = '46px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⏳', cxp, y + 40);

            // 설명
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 15px Arial';
            ctx.textBaseline = 'top';
            const lines = [
                `몬스터가 전부 HP 1 (원킬!)`,
                `1마리당 +${dungeonExp} EXP (도달한 최고 사냥터 기준)`,
                `제한 시간 10분`,
                `입장료 ${EXP_DUNGEON_COST.toLocaleString()}🪙`
            ];
            lines.forEach((t, i) => {
                ctx.fillStyle = i === 3 ? '#ffd700' : '#ddd';
                ctx.fillText(t, cxp, y + 80 + i * 26);
            });

            // 현재 상태 / 입장 버튼
            const btnY = y + 210, btnH = 54;
            if (game.inExpDungeon) {
                const sec = Math.ceil(game.dungeonTimer / 60);
                ctx.fillStyle = '#69f0ae';
                ctx.font = 'bold 16px Arial';
                ctx.fillText(`입장 중 — 남은 시간 ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, cxp, btnY - 30);
            }
            const ok = !game.inExpDungeon && game.coins >= EXP_DUNGEON_COST;
            ctx.fillStyle = game.inExpDungeon ? '#555' : (ok ? '#8e44ad' : '#555');
            ctx.fillRect(x, btnY, w, btnH);
            ctx.strokeStyle = '#d6b3ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, btnY, w, btnH);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.textBaseline = 'middle';
            ctx.fillText(game.inExpDungeon ? '⏳ 이미 입장 중' : `⏳ 던전 입장 (${EXP_DUNGEON_COST.toLocaleString()}🪙)`, cxp, btnY + btnH / 2);
            if (!game.inExpDungeon) game.dungeonButton = { x, y: btnY, w, h: btnH };
        }

        // 서버보스 탭 (난이도 4단계 선택 + 소환 + 자동 소환)
        function drawBossTab(x, y, w) {
            game.bossTierButtons = [];
            const t = Date.now();
            const cxp = x + w / 2;

            // 난이도 선택 (이지/노말/하드/익스트림)
            ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText('난이도 선택', x, y);
            const tw = (w - 3 * 6) / 4, th = 36, ty = y + 20;
            SERVER_BOSSES.forEach((d, i) => {
                const tx = x + i * (tw + 6);
                const sel = game.serverBossTier === i;
                ctx.fillStyle = sel ? d.color : 'rgba(0,0,0,0.6)';
                ctx.fillRect(tx, ty, tw, th);
                ctx.strokeStyle = d.color; ctx.lineWidth = sel ? 3 : 1; ctx.strokeRect(tx, ty, tw, th);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(d.name, tx + tw / 2, ty + th / 2);
                game.bossTierButtons.push({ x: tx, y: ty, w: tw, h: th, tier: i });
            });

            const tier = game.serverBossTier, def = SERVER_BOSSES[tier];
            const saved = parseInt(localStorage.getItem('serverBossHp_' + tier), 10);
            const remain = (saved && saved > 0) ? Math.min(saved, def.maxHp) : def.maxHp;
            const hpRatio = remain / def.maxHp;

            // 이름
            ctx.fillStyle = def.color; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText(`🌐 ${def.name} 서버보스`, cxp, ty + th + 12);

            // 체력 바
            const barX = x, barY = ty + th + 44, barW = w, barH = 24;
            ctx.fillStyle = '#222'; ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = def.color; ctx.fillRect(barX, barY, barW * hpRatio, barH);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(barX, barY, barW, barH);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`${remain.toLocaleString()} / ${def.maxHp.toLocaleString()}`, cxp, barY + barH / 2);

            // 정보
            ctx.fillStyle = '#ccc'; ctx.font = '13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText(`공격력 ${def.damage}   보상 ${def.coinReward.toLocaleString()}🪙 · ${def.expReward}EXP`, x, barY + 34);
            ctx.fillStyle = game.ultimateUnlocked ? '#69f0ae' : '#ffab40';
            ctx.fillText(game.ultimateUnlocked
                ? `✔ 궁극기 해제됨 (처치 ${game.serverBossKills || 0})`
                : `★ 특수[F] ${SPECIAL_BOSS_KILLS}회 · 궁극기[R] ${ULTIMATE_BOSS_KILLS}회 (현재 ${game.serverBossKills || 0})`, x, barY + 54);

            // 소환 버튼
            const btnY = barY + 82, btnH = 52;
            const glow = 0.5 + Math.sin(t / 200) * 0.5;
            ctx.save();
            const g = ctx.createLinearGradient(x, btnY, x + w, btnY + btnH);
            g.addColorStop(0, '#6a0dad'); g.addColorStop(0.5, '#9b30ff'); g.addColorStop(1, '#6a0dad');
            ctx.fillStyle = g; ctx.fillRect(x, btnY, w, btnH);
            ctx.shadowColor = 'rgba(180,80,255,0.9)'; ctx.shadowBlur = 12 + glow * 16;
            ctx.strokeStyle = `rgba(255,255,255,${0.6 + glow * 0.4})`; ctx.lineWidth = 3; ctx.strokeRect(x, btnY, w, btnH);
            ctx.restore();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 19px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(game.serverBoss ? '🌐 서버보스에게 이동' : `⚔️ ${def.name} 소환!`, cxp, btnY + btnH / 2);
            game.serverBossButton = { x, y: btnY, w, h: btnH };

            // 자동 소환 토글
            const atY = btnY + btnH + 10, atH = 36;
            ctx.fillStyle = game.autoServerBoss ? '#16a085' : 'rgba(0,0,0,0.6)';
            ctx.fillRect(x, atY, w, atH);
            ctx.strokeStyle = game.autoServerBoss ? '#2ecc71' : '#888'; ctx.lineWidth = 2; ctx.strokeRect(x, atY, w, atH);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`🔁 자동 소환: ${game.autoServerBoss ? 'ON' : 'OFF'}`, cxp, atY + atH / 2);
            game.autoBossButton = { x, y: atY, w, h: atH };
        }

        // 보석 탭 (코인 뽑기 + 장착 5칸 + 보유 목록/합성/장착)
        function drawGemTab(x, y, w) {
            // 뽑기 버튼 2개
            const gbW = (w - 10) / 2, gbH = 38;
            [['gem1', `💎 1회 (${GEM_GACHA_COST}🪙)`, x, game.coins >= GEM_GACHA_COST],
             ['gem10', `💎 10회 (${GEM_GACHA_COST * 10}🪙)`, x + gbW + 10, game.coins >= GEM_GACHA_COST * 10]
            ].forEach(([action, label, bx, ok]) => {
                ctx.fillStyle = ok ? '#0097a7' : '#555';
                ctx.fillRect(bx, y, gbW, gbH);
                ctx.strokeStyle = '#18ffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(bx, y, gbW, gbH);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, bx + gbW / 2, y + gbH / 2);
                game.gemButtons.push({ x: bx, y, w: gbW, h: gbH, action });
            });

            // 장착 슬롯 (5칸, 클릭 시 해제)
            let cy = y + gbH + 10;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`장착 (${game.equippedGems.length}/${GEM_MAX_EQUIP}) — 클릭 시 해제`, x, cy);
            cy += 18;
            const slotW = (w - 4 * 6) / 5, slotH = 52;
            for (let i = 0; i < GEM_MAX_EQUIP; i++) {
                const sx = x + i * (slotW + 6);
                const g = game.equippedGems[i];
                ctx.fillStyle = g ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.05)';
                ctx.fillRect(sx, cy, slotW, slotH);
                ctx.strokeStyle = g ? gemColor(g.grade) : '#555';
                ctx.lineWidth = 2;
                ctx.strokeRect(sx, cy, slotW, slotH);
                if (g) {
                    const t = GEM_TYPE_MAP[g.type];
                    ctx.fillStyle = '#fff';
                    ctx.font = '18px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(t.icon, sx + slotW / 2, cy + 3);
                    ctx.fillStyle = gemColor(g.grade);
                    ctx.font = 'bold 11px Arial';
                    ctx.fillText(`${g.grade}등급`, sx + slotW / 2, cy + 25);
                    ctx.fillStyle = '#aadfff';
                    ctx.font = '9px Arial';
                    ctx.fillText(gemEffectLabel(g.type, g.grade), sx + slotW / 2, cy + 39);
                    game.gemButtons.push({ x: sx, y: cy, w: slotW, h: slotH, action: 'unequip', index: i });
                } else {
                    ctx.fillStyle = '#777';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('빈 칸', sx + slotW / 2, cy + slotH / 2);
                }
            }
            cy += slotH + 10;

            // 보유 보석 목록 (합성/장착)
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('보유 보석 (합성: 같은 등급 2개 → 한 등급 ▲)', x, cy);
            cy += 18;

            // 스택 목록 (종류 × 등급)
            const stacks = [];
            GEM_TYPES.forEach(t => {
                const inv = game.gemInv[t.key] || {};
                for (let grade = GEM_MAX_GRADE; grade <= GEM_START_GRADE; grade++) {
                    const c = inv[grade] || 0;
                    if (c > 0) stacks.push({ type: t.key, grade, count: c });
                }
            });

            const perPage = 4, rowH = 36;
            const maxPage = Math.max(0, Math.ceil(stacks.length / perPage) - 1);
            if (game.gemPage > maxPage) game.gemPage = maxPage;
            if (game.gemPage < 0) game.gemPage = 0;

            if (stacks.length === 0) {
                ctx.fillStyle = '#888';
                ctx.font = '12px Arial';
                ctx.fillText('보석이 없어요. 위에서 뽑아보세요!', x, cy + 6);
                return;
            }

            const pageStacks = stacks.slice(game.gemPage * perPage, game.gemPage * perPage + perPage);
            pageStacks.forEach((s, i) => {
                const ry = cy + i * rowH;
                const t = GEM_TYPE_MAP[s.type];
                ctx.fillStyle = 'rgba(255,255,255,0.05)';
                ctx.fillRect(x, ry, w, rowH - 5);
                ctx.strokeStyle = gemColor(s.grade);
                ctx.lineWidth = 1;
                ctx.strokeRect(x, ry, w, rowH - 5);

                const midY = ry + (rowH - 5) / 2;
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${t.icon}${t.name} ${s.grade}등급 ×${s.count}`, x + 6, midY);
                ctx.fillStyle = '#aadfff';
                ctx.font = '10px Arial';
                ctx.fillText(gemEffectLabel(s.type, s.grade), x + 168, midY);

                const bw = 54, bh = 24, by = midY - bh / 2;
                const mergeX = x + w - bw * 2 - 8, equipX = x + w - bw - 2;
                const canMerge = s.count >= 2 && s.grade > GEM_MAX_GRADE;
                const canEquip = game.equippedGems.length < GEM_MAX_EQUIP;

                ctx.fillStyle = canMerge ? '#8e44ad' : '#444';
                ctx.fillRect(mergeX, by, bw, bh);
                ctx.fillStyle = canMerge ? '#fff' : '#888';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('합성', mergeX + bw / 2, midY);
                if (canMerge) game.gemButtons.push({ x: mergeX, y: by, w: bw, h: bh, action: 'merge', type: s.type, grade: s.grade });

                ctx.fillStyle = canEquip ? '#2980b9' : '#444';
                ctx.fillRect(equipX, by, bw, bh);
                ctx.fillStyle = canEquip ? '#fff' : '#888';
                ctx.fillText('장착', equipX + bw / 2, midY);
                if (canEquip) game.gemButtons.push({ x: equipX, y: by, w: bw, h: bh, action: 'equip', type: s.type, grade: s.grade });
            });

            // 페이지 이동
            if (maxPage > 0) {
                const pgY = cy + perPage * rowH + 2;
                [['gemPrev', '◀', x], ['gemNext', '▶', x + 54 + 8]].forEach(([action, label, bx]) => {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(bx, pgY, 54, 22);
                    ctx.strokeStyle = '#888';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, pgY, 54, 22);
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 13px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, bx + 27, pgY + 11);
                    game.gemButtons.push({ x: bx, y: pgY, w: 54, h: 22, action });
                });
                ctx.fillStyle = '#ddd';
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(`${game.gemPage + 1} / ${maxPage + 1}`, x + 130, pgY + 11);
            }
        }

        // 스탯 포인트 투자 (선택한 배수만큼 한 번에 — 1포인트당 해당 스탯 +5)
        function addStatPoints(key) {
            const st = game.character.stats;
            if (st.statPoints <= 0) return;
            const want = game.statBatch === 'MAX' ? st.statPoints : game.statBatch;
            const n = Math.min(want, st.statPoints);
            if (n <= 0) return;
            st[key] += 5 * n;
            st.statPoints -= n;
            invalidateStats(); // 스탯 변경 → 캐시 재계산
            if (key === 'maxHp') st.hp = effMaxHp();
            if (key === 'maxMana') st.mana = st.maxMana;
            saveProgress();
        }

        // 스탯 탭
        function drawStatTab(x, y, w) {
            const stats = game.character.stats;

            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`남은 포인트: ${stats.statPoints.toLocaleString()}`, x, y);

            ctx.fillStyle = game.autoHunt ? '#00ff00' : '#ff6b6b';
            ctx.font = 'bold 13px Arial';
            ctx.fillText(`자동사냥: ${game.autoHunt ? 'ON' : 'OFF'} (Z키)`, x, y + 24);

            // 펫 보너스 표시 (공격력·방어력 %)
            ctx.fillStyle = '#5dade2';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`🐲 펫 보너스: 공격·방어 +${petStatBonus()}%`, x, y + 42);

            // 한 번에 찍을 포인트 선택 (×1 / ×5 / ×10 / MAX)
            game.statBatchButtons = [];
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('한 번에:', x, y + 76);
            const opts = [1, 5, 10, 'MAX'];
            const obW = 52, obH = 26, obGap = 6, ob0 = x + 62;
            opts.forEach((opt, i) => {
                const bx = ob0 + i * (obW + obGap);
                const sel = game.statBatch === opt;
                ctx.fillStyle = sel ? '#27ae60' : 'rgba(255,255,255,0.08)';
                ctx.fillRect(bx, y + 76 - obH / 2, obW, obH);
                ctx.strokeStyle = sel ? '#2ecc71' : '#888';
                ctx.lineWidth = sel ? 2 : 1;
                ctx.strokeRect(bx, y + 76 - obH / 2, obW, obH);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(opt === 'MAX' ? 'MAX' : '×' + opt, bx + obW / 2, y + 76);
                game.statBatchButtons.push({ x: bx, y: y + 76 - obH / 2, w: obW, h: obH, batch: opt });
            });

            const statList = [
                { name: '체력', key: 'maxHp', value: stats.maxHp },
                { name: '마나', key: 'maxMana', value: stats.maxMana },
                { name: '공격력', key: 'attack', value: stats.attack },
                { name: '방어력', key: 'defense', value: stats.defense }
            ];
            const bonus = getEquipBonus();
            const rowH = 54, startY = y + 102;
            // 버튼 라벨: 선택한 배수만큼 표시
            const batchLabel = game.statBatch === 'MAX' ? 'MAX' : '+' + game.statBatch;

            statList.forEach((stat, i) => {
                const ry = startY + i * rowH;
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 17px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                let label = `${stat.name}: ${stat.value.toLocaleString()}`;
                if (stat.key === 'attack' && bonus.attack > 0) label += ` (+${bonus.attack.toLocaleString()})`;
                if (stat.key === 'defense' && bonus.defense > 0) label += ` (+${bonus.defense.toLocaleString()})`;
                ctx.fillText(label, x, ry + 17);

                const bw = 58, bh = 34, bx = x + w - bw, by = ry;
                ctx.fillStyle = stats.statPoints > 0 ? '#27ae60' : '#555';
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(bx, by, bw, bh);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 15px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(stats.statPoints > 0 ? batchLabel : '+', bx + bw / 2, by + bh / 2 + 1);

                stat.buttonX = bx; stat.buttonY = by; stat.buttonW = bw; stat.buttonH = bh;
            });
            game.statButtons = statList;
        }

        // 스킬 탭 (액티브 1 / 패시브 1 / 궁극기 — 정보 표시용)
        function drawSkillTab(x, y, w) {
            const job = game.character.job;
            if (!job) {
                ctx.fillStyle = '#aaa';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText('직업을 먼저 선택하세요 (Lv.10)', x + w / 2, y + 30);
                return;
            }
            const skills = JOB_SKILLS[job];
            const pas = JOB_PASSIVES[job];
            const lv = game.character.stats.level;
            const kills = game.serverBossKills || 0;
            const rowH = 56;
            let cy = y;

            // 카드 1개 (upgradeKey 있으면 우측 강화 버튼)
            const card = (title, color, unlocked, info, upgradeKey) => {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(x, cy, w, rowH - 8);
                ctx.strokeStyle = unlocked ? color : '#555';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, cy, w, rowH - 8);
                ctx.fillStyle = unlocked ? color : '#888';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                let titleStr = (unlocked ? '' : '🔒 ') + title;
                if (upgradeKey) titleStr += `  Lv.${skillLevel(upgradeKey)}/${SKILL_MAX_LEVEL}`;
                ctx.fillText(titleStr, x + 10, cy + 7);
                ctx.fillStyle = unlocked ? '#ccc' : '#777';
                ctx.font = '10px Arial';
                ctx.fillText(info, x + 10, cy + 28);

                if (upgradeKey && unlocked) {
                    const maxed = skillLevel(upgradeKey) >= SKILL_MAX_LEVEL;
                    const cost = skillUpgradeCost(upgradeKey);
                    const bw = 86, bh = 34, bx = x + w - bw - 8, by = cy + (rowH - 8 - bh) / 2;
                    const ok = !maxed && game.coins >= cost;
                    ctx.fillStyle = maxed ? '#444' : (ok ? '#8e44ad' : '#555');
                    ctx.fillRect(bx, by, bw, bh);
                    ctx.strokeStyle = '#d6b3ff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, bw, bh);
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    if (maxed) {
                        ctx.font = 'bold 12px Arial';
                        ctx.fillText('MAX', bx + bw / 2, by + bh / 2);
                    } else {
                        ctx.font = 'bold 11px Arial';
                        ctx.fillText('강화', bx + bw / 2, by + bh / 2 - 7);
                        ctx.font = '9px Arial';
                        ctx.fillText(`${cost.toLocaleString()}🪙`, bx + bw / 2, by + bh / 2 + 7);
                        game.skillTabButtons.push({ x: bx, y: by, w: bw, h: bh, key: upgradeKey });
                    }
                }
                cy += rowH;
            };

            // 모든 스킬 (Q·W·E·F·R) — 종류별 해제 조건/상태 표시 + 강화
            skills.forEach(s => {
                const unlocked = isSkillUnlocked(s);
                const mult = Math.round((1 + (skillLevel(s.key) - 1) * SKILL_DMG_PER_LEVEL) * 100);
                let req;
                if (s.ultimate) req = unlocked ? '해제됨' : `서버보스 ${kills}/${ULTIMATE_BOSS_KILLS}`;
                else if (s.special) req = unlocked ? '해제됨' : `서버보스 ${kills}/${SPECIAL_BOSS_KILLS}`;
                else req = unlocked ? '해제됨' : `Lv.${s.unlock} 필요`;
                const tag = s.special ? ' (특수)' : s.ultimate ? ' (궁극기)' : '';
                card(`[${s.key.toUpperCase()}] ${s.name.replace(/ \(.*\)/, '')}${tag}`, s.color, unlocked,
                    `${req} · 마나 ${skillManaCost(s)} · 뎀 ${mult}%`, s.key);
            });

            // 패시브 (숨김 자동, 강화 없음)
            const effName = { atkPct: '공격력', defPct: '방어력', bossPct: '보스 공격력', critRate: '크리 확률', critDmg: '크리 데미지' }[pas.key];
            card(`✨ ${pas.name} (패시브·자동)`, '#ffd700', lv >= pas.unlock,
                `Lv.${pas.unlock} 해제 · ${effName} +${pas.val}% · 스킬바엔 안 보임`);
        }

        // 상점 버튼 한 칸 (반반 배치용)
        function drawShopHalf(x, y, w, h, fill, stroke, label) {
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x + w / 2, y + h / 2);
        }

        // 상점 탭 (서버보스 / 주문서·큐브 / 펫 / 물약)
        function drawShopTab(x, y, w) {
            const half = (w - 8) / 2, bh = 40, x2 = x + half + 8;
            let cy = y;

            // 주문서 / 큐브
            drawShopHalf(x, cy, half, bh, game.coins >= SCROLL_COST ? '#b8860b' : '#555', '#ffd700', `📜${game.scrolls} ·${SCROLL_COST}🪙`);
            game.scrollButton = { x, y: cy, w: half, h: bh };
            drawShopHalf(x2, cy, half, bh, game.coins >= CUBE_COST ? '#6c3483' : '#555', '#b388ff', `🔮${game.cubes} ·${CUBE_COST}🪙`);
            game.cubeButton = { x: x2, y: cy, w: half, h: bh };
            cy += bh + 12;

            // 펫 강화서 / 펫 강화·등급업
            drawShopHalf(x, cy, half, bh, game.coins >= PET_SCROLL_COST ? '#1f6f5c' : '#555', '#5dade2', `🦴${game.petScrolls} ·${PET_SCROLL_COST}🪙`);
            game.petScrollButton = { x, y: cy, w: half, h: bh };
            const pet = game.pet;
            let petLabel, petColor;
            if (pet.level < PET_MAX_LEVEL) { petLabel = `🐲 강화 +${pet.level} 🦴1`; petColor = '#2471a3'; }
            else if (pet.rarity < RARITIES.length - 1) { petLabel = `⭐ 등급업 🦴${petPromoteCost()}`; petColor = '#8e44ad'; }
            else { petLabel = '🐲 펫 MAX'; petColor = '#555'; }
            drawShopHalf(x2, cy, half, bh, petColor, RARITIES[pet.rarity].color, petLabel);
            game.petButton = { x: x2, y: cy, w: half, h: bh };
            cy += bh + 12;

            // 체력 물약 / 마나 물약
            drawShopHalf(x, cy, half, bh, game.coins >= HP_POTION.cost ? '#922b21' : '#555', '#ff6b6b', `🧪${game.hpPotions} ·${HP_POTION.cost}🪙`);
            game.hpPotionButton = { x, y: cy, w: half, h: bh };
            drawShopHalf(x2, cy, half, bh, game.coins >= MP_POTION.cost ? '#1f618d' : '#555', '#5dade2', `🔷${game.mpPotions} ·${MP_POTION.cost}🪙`);
            game.mpPotionButton = { x: x2, y: cy, w: half, h: bh };
            cy += bh + 12;

            // 🐾 펫 도감 (펫 종류 변경/수집) — 전체 너비
            drawShopHalf(x, cy, w, bh, '#5b2c6f', '#d2b4de', `🐾 펫 도감 (${petTypeDef().name} · ${game.petOwned.length}/${PET_TYPES.length})`);
            game.petBookButton = { x, y: cy, w, h: bh };
            cy += bh + 16;

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`보유 코인: ${game.coins.toLocaleString()} 🪙`, x + w / 2, cy);
        }

        // 맵 탭 (현재 사냥터 + 이전/다음 이동)

        // 경험치 바 그리기
        function drawExpBar() {
            const barWidth = 300;
            const barHeight = 15;
            const padding = 15;
            const x = canvas.width / 2 - barWidth / 2;
            const y = canvas.height - padding - barHeight;

            const char = game.character;
            const expPercent = char.stats.exp / char.stats.maxExp;

            // 경험치 바
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.fillStyle = '#4169e1';
            ctx.fillRect(x, y, barWidth * expPercent, barHeight);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, barWidth, barHeight);

            // 경험치 텍스트
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Level ${char.stats.level} - EXP: ${char.stats.exp.toLocaleString()}/${char.stats.maxExp.toLocaleString()}`,
                        x + barWidth / 2, y - 8);
        }

        // HP/MP 바 그리기
        function drawStats() {
            const barWidth = 200;
            const barHeight = 20;
            const padding = 15;
            const x = canvas.width - barWidth - padding;
            const y = padding;

            const char = game.character;
            const maxHp = effMaxHp();
            const hpPercent = Math.max(0, Math.min(1, char.stats.hp / maxHp));
            const manaPercent = char.stats.mana / char.stats.maxMana;

            // HP 바
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x, y, barWidth * hpPercent, barHeight);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, barWidth, barHeight);

            // HP 텍스트
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`HP: ${Math.max(0, Math.round(char.stats.hp)).toLocaleString()}/${maxHp.toLocaleString()}`, x - 5, y + 16);

            // MP 바
            const mpY = y + barHeight + 25;
            ctx.fillStyle = '#333';
            ctx.fillRect(x, mpY, barWidth, barHeight);
            ctx.fillStyle = '#0099ff';
            ctx.fillRect(x, mpY, barWidth * manaPercent, barHeight);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, mpY, barWidth, barHeight);

            // MP 텍스트
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`MP: ${char.stats.mana.toLocaleString()}/${char.stats.maxMana.toLocaleString()}`, x - 5, mpY + 16);

            // 물약 보유/단축키 표시 (MP 바 아래)
            const potY = mpY + barHeight + 6;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ff8a8a';
            ctx.fillText(`🧪 ${game.hpPotions} [1]`, x + barWidth / 2 - 6, potY + 10);
            ctx.fillStyle = '#7fc7ff';
            ctx.fillText(`🔷 ${game.mpPotions} [2]`, x + barWidth, potY + 10);
        }

        // 직업 스킬 UI 그리기 (오른쪽 아래, 세로 4칸)
        function drawSkillUI() {
            const skills = JOB_SKILLS[game.character.job];
            if (!skills) return;

            const boxW = 152, boxH = 42, gap = 6;
            const totalH = skills.length * boxH + (skills.length - 1) * gap;
            const x = canvas.width - boxW - 14;        // 오른쪽
            const startY = canvas.height - totalH - 14; // 아래

            skills.forEach((skill, i) => {
                const y = startY + i * (boxH + gap);
                const cd = game.skillCooldowns[skill.key] || 0;

                // 10레벨 전: Q칸을 모험가스킬로 표시
                if (skill.key === 'q' && hasAdventurerSkill()) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(x, y, boxW, boxH);
                    ctx.strokeStyle = ADV_SKILL.color; ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, boxW, boxH);
                    if (cd > 0) {
                        const ratio = Math.min(1, cd / ADV_SKILL.cooldown);
                        ctx.fillStyle = 'rgba(0,0,0,0.6)';
                        ctx.fillRect(x, y + boxH * (1 - ratio), boxW, boxH * ratio);
                    }
                    ctx.fillStyle = cd > 0 ? '#999' : '#ffe082';
                    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                    ctx.fillText(`[Q] ${ADV_SKILL.name}`, x + 10, y + 14);
                    ctx.font = '10px Arial';
                    if (cd > 0) { ctx.fillStyle = '#ff6b6b'; ctx.fillText(`쿨 ${(cd / 60).toFixed(1)}s`, x + 10, y + 31); }
                    else { ctx.fillStyle = '#ffcc33'; ctx.fillText('공격력 2배 · Lv.10까지', x + 10, y + 31); }
                    return;
                }

                const unlocked = isSkillUnlocked(skill);

                // 배경
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(x, y, boxW, boxH);
                ctx.strokeStyle = skill.ultimate ? '#ff5252' : skill.color;
                ctx.lineWidth = skill.ultimate ? 3 : 2;
                ctx.strokeRect(x, y, boxW, boxH);

                if (!unlocked) {
                    // 잠김
                    ctx.fillStyle = 'rgba(0,0,0,0.65)';
                    ctx.fillRect(x, y, boxW, boxH);
                    ctx.fillStyle = '#ff9e9e';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🔒 ' + (skill.ultimate ? `서버보스 ${ULTIMATE_BOSS_KILLS}회`
                        : skill.special ? `서버보스 ${SPECIAL_BOSS_KILLS}회`
                        : `Lv.${skill.unlock} 해제`), x + 10, y + boxH / 2);
                    return;
                }

                // 쿨다운 오버레이 (아래→위) — 보석 쿨감이 적용된 실제 최대 쿨다운 기준
                if (cd > 0) {
                    const cdReduce = Math.min(GEM_CD_CAP, gemBonus('cooldown'));
                    const maxCd = Math.max(1, Math.round(skill.cooldown * (1 - cdReduce / 100)));
                    const ratio = Math.min(1, cd / maxCd);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.fillRect(x, y + boxH * (1 - ratio), boxW, boxH * ratio);
                }

                // 키 + 이름
                ctx.fillStyle = cd > 0 ? '#999' : '#fff';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`[${skill.key.toUpperCase()}] ${skill.name}`, x + 10, y + 14);

                ctx.font = '10px Arial';
                if (cd > 0) {
                    ctx.fillStyle = '#ff6b6b';
                    ctx.fillText(`쿨 ${(cd / 60).toFixed(1)}s`, x + 10, y + 31);
                } else {
                    ctx.fillStyle = '#0099ff';
                    ctx.fillText(`마나 ${skillManaCost(skill)}`, x + 10, y + 31);
                }
            });
        }

        // 상단 HUD: 코인 + 현재 사냥터 이름
        function drawTopHUD() {
            // 코인 (좌상단)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(15, 15, 150, 34);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(15, 15, 150, 34);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`🪙 ${game.coins.toLocaleString()}`, 26, 33);

            // 사냥터 이름 (상단 중앙)
            const zone = ZONES[game.currentZone];
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(canvas.width / 2 - 90, 12, 180, 30);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(canvas.width / 2 - 90, 12, 180, 30);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${zone.name} (M:지도)`, canvas.width / 2, 28);

            // 브금 버튼 (코인 오른쪽)
            const bx = 172, by = 15, bs = 34;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(bx, by, bs, bs);
            ctx.strokeStyle = bgmOn ? '#2ecc71' : '#888';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bs, bs);
            ctx.fillStyle = '#fff';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bgmOn ? '🔊' : '🔇', bx + bs / 2, by + bs / 2 + 1);
            game.bgmButton = { x: bx, y: by, w: bs, h: bs };
        }

        // 사냥터 / 서버보스 클리어 메시지
        // 경험치 던전 HUD (남은 시간 + 1마리 경험치)
        function drawDungeonHUD() {
            if (!game.inExpDungeon) return;
            const sec = Math.max(0, Math.ceil(game.dungeonTimer / 60));
            const mmss = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
            const w = 240, h = 30, x = canvas.width / 2 - w / 2, y = 48;
            ctx.fillStyle = 'rgba(90, 30, 140, 0.85)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#d6b3ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`⏳ 경험치 던전  ${mmss}  (+${game.dungeonExp} EXP)`, canvas.width / 2, y + h / 2);
        }

        // 🗼 무한의 탑 HUD (현재층 + 최고층 + 나가기)
        function drawTowerHUD() {
            if (!game.inTower) return;
            const w = 320, h = 58, x = canvas.width / 2 - w / 2, y = 44;
            ctx.fillStyle = 'rgba(91,44,111,0.92)'; ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#b388ff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`🗼 무한의 탑  ${game.towerLevel}층  (최고 ${game.towerBest}층)`, x + w / 2, y + 17);
            const bw = 150, bh = 22, bx = x + w / 2 - bw / 2, by = y + 30;
            ctx.fillStyle = '#922b21'; ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial';
            ctx.fillText('나가기 (기록 유지)', bx + bw / 2, by + bh / 2);
            game.towerExitButton = { x: bx, y: by, w: bw, h: bh };
        }
        // 🌅 일일 보스 HUD (체력 표시)
        function drawDailyBossHUD() {
            if (!game.dailyBoss) return;
            const db = game.dailyBoss;
            const w = 360, h = 38, x = canvas.width / 2 - w / 2, y = 8;
            ctx.fillStyle = 'rgba(150,80,20,0.9)'; ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#ffb74d'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
            const ratio = Math.max(0, db.hp / db.maxHp);
            ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 10, y + 22, w - 20, 8);
            ctx.fillStyle = '#ff9800'; ctx.fillRect(x + 10, y + 22, (w - 20) * ratio, 8);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText(`🌅 일일 보스  ${Math.ceil(db.hp).toLocaleString()} / ${db.maxHp.toLocaleString()}`, canvas.width / 2, y + 4);
        }

        // 훈장 던전 HUD (남은 시간 + 보유 훈장 조각)
        function drawMedalDungeonHUD() {
            if (!game.inMedalDungeon) return;
            const sec = Math.max(0, Math.ceil(game.medalDungeonTimer / 60));
            const mmss = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
            const w = 320, h = 30, x = canvas.width / 2 - w / 2, y = 48;
            ctx.fillStyle = 'rgba(150, 110, 20, 0.85)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`🎗️ 훈장 던전  ${mmss}  (보유 ${game.medalShards.toLocaleString()}🎗️)`, canvas.width / 2, y + h / 2);
        }

        // 길드전 HUD (남은 시간 + 누적 데미지)
        function drawRaidHUD() {
            if (!game.raidActive) return;
            const sec = Math.max(0, Math.ceil(game.raidTimer / 60));
            const w = 360, h = 34, x = canvas.width / 2 - w / 2, y = 48;
            ctx.fillStyle = 'rgba(140, 20, 30, 0.9)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`⚔️ 길드전  ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}  ·  데미지 ${Math.round(game.raidDamage).toLocaleString()}`, canvas.width / 2, y + h / 2);
            // 시간 게이지
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(x, y + h - 3, w * (game.raidTimer / RAID_FRAMES), 3);
        }

        function drawZoneClearMsg() {
            if (game.serverClearMsg > 0) {
                ctx.fillStyle = 'rgba(75, 0, 130, 0.55)';
                ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
                ctx.fillStyle = '#d6b3ff';
                ctx.font = 'bold 38px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`🌐 ${SERVER_BOSSES[game.serverBossTier].name} 서버보스 처치!`,
                             canvas.width / 2, canvas.height / 2);
                return;
            }
            if (game.zoneClearMsg <= 0) return;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const last = game.currentZone + 1 >= ZONES.length;
            ctx.fillText(last ? '🏆 모든 사냥터 클리어!' : '⚔️ 보스 처치! 다음 사냥터로...',
                         canvas.width / 2, canvas.height / 2);
        }

        // 🌙 오프라인 보상 팝업 (시작 시 잠깐 표시 후 사라짐)
        function drawOfflineReward() {
            const r = game.offlineReward; if (!r || r.t <= 0) return;
            ctx.save();
            ctx.globalAlpha = Math.min(1, r.t / 40); // 마지막 40프레임 페이드아웃
            const w = 420, h = 150, x = (canvas.width - w) / 2, y = (canvas.height - h) / 2 - 20;
            ctx.fillStyle = 'rgba(12,16,34,0.95)'; ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffd700'; ctx.font = 'bold 24px Arial';
            ctx.fillText('🌙 오프라인 보상', canvas.width / 2, y + 32);
            const hrs = Math.floor(r.mins / 60), mm = r.mins % 60;
            ctx.fillStyle = '#cdd6ea'; ctx.font = '14px Arial';
            ctx.fillText(`자리 비운 ${hrs > 0 ? hrs + '시간 ' : ''}${mm}분 동안`, canvas.width / 2, y + 64);
            ctx.fillStyle = '#ffd166'; ctx.font = 'bold 18px Arial';
            ctx.fillText(`🪙 +${r.coins.toLocaleString()}    ✨ +${r.exp.toLocaleString()} EXP`, canvas.width / 2, y + 96);
            ctx.fillStyle = '#8893ab'; ctx.font = '11px Arial';
            ctx.fillText('잠시 후 사라집니다', canvas.width / 2, y + 126);
            ctx.restore();
        }

        // 🌍 월드보스 모달 (서버 공유 HP 레이드 패널)
        function drawWorldBossUI() {
            if (!game.showWorldBoss) return;
            game.worldBossButtons = [];
            ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const px = 140, pw = 720, py = 24, ph = 552;
            ctx.fillStyle = 'rgba(14,10,26,0.98)'; ctx.fillRect(px, py, pw, ph);
            ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 3; ctx.strokeRect(px, py, pw, ph);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ff7b7b'; ctx.font = 'bold 26px Arial';
            ctx.fillText('🌍 익스트림 월드보스', canvas.width / 2, py + 30);
            ctx.fillStyle = '#b8c2d8'; ctx.font = '13px Arial';
            ctx.fillText('서버 전체가 같은 보스를 함께 잡습니다 · 10% 이상 데미지 기여 시 보상!', canvas.width / 2, py + 56);
            // 닫기
            ctx.fillStyle = '#b8c2d8'; ctx.font = 'bold 22px Arial';
            ctx.fillText('✕', px + pw - 22, py + 24);
            game.worldBossButtons.push({ x: px + pw - 44, y: py, w: 44, h: 44, action: 'wbClose' });

            const cardH = 118, gap = 12, startY = py + 78;
            WB_BOSSES.forEach((def, i) => {
                const cy = startY + i * (cardH + gap);
                const cx = px + 20, cw = pw - 40;
                const b = (WB.list || []).find(x => x.type === def.type);
                const dead = b && b.reviveAt && new Date(b.reviveAt).getTime() > Date.now();
                ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(cx, cy, cw, cardH);
                ctx.strokeStyle = def.color; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, cw, cardH);
                // 아이콘 + 이름 + 보상
                ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.font = '38px Arial'; ctx.fillStyle = def.color;
                ctx.fillText(def.icon, cx + 16, cy + 40);
                ctx.font = 'bold 20px Arial'; ctx.fillStyle = '#fff';
                ctx.fillText(def.name, cx + 70, cy + 28);
                ctx.font = '13px Arial'; ctx.fillStyle = '#ffd166';
                ctx.fillText('보상: ' + def.reward, cx + 70, cy + 50);
                // HP 바 (서버 공유)
                const barX = cx + 16, barY = cy + 70, barW = cw - 220, barH = 22;
                const hp = b ? Math.max(0, b.hp) : 0, mh = b ? Math.max(1, b.maxHp) : 1;
                const ratio = dead ? 0 : Math.min(1, hp / mh);
                ctx.fillStyle = '#2a1418'; ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = def.color; ctx.fillRect(barX, barY, barW * ratio, barH);
                ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(dead ? '💀 처치됨' : (Math.floor(ratio * 1000) / 10) + '%  (' + hp.toLocaleString() + ')', barX + barW / 2, barY + barH / 2);
                // 내 기여
                const myd = (WB.myDmg && WB.myDmg[def.type]) || 0;
                const myPct = Math.floor((myd / mh) * 1000) / 10;
                ctx.textAlign = 'left'; ctx.fillStyle = myPct >= 10 ? '#7fff9f' : '#9fb0c4'; ctx.font = '12px Arial';
                ctx.fillText('내 기여 ' + myPct + '% ' + (myPct >= 10 ? '✅보상권' : '(10%↑ 필요)'), barX, cy + 102);
                // 공격 버튼 (또는 부활 카운트다운)
                const bw = 168, bh = 56, bx = cx + cw - bw - 16, by = cy + 30;
                if (dead) {
                    const left = Math.max(0, new Date(b.reviveAt).getTime() - Date.now());
                    const hh = Math.floor(left / 3600000), mm = Math.floor((left % 3600000) / 60000), ss = Math.floor((left % 60000) / 1000);
                    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(bx, by, bw, bh);
                    ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
                    ctx.fillStyle = '#9fb0c4'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
                    ctx.fillText('부활까지', bx + bw / 2, by + 18);
                    ctx.fillStyle = '#cdd6ea'; ctx.font = 'bold 18px Arial';
                    ctx.fillText(hh + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'), bx + bw / 2, by + 38);
                } else {
                    ctx.fillStyle = def.color; ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = '#1a1020'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('⚔️ 공격', bx + bw / 2, by + bh / 2);
                    game.worldBossButtons.push({ x: bx, y: by, w: bw, h: bh, action: 'wbAttack', type: def.type });
                }
            });
            // 보상 받기 버튼
            const rn = (WB.rewards || []).length;
            if (rn > 0) {
                const rbw = 280, rbh = 38, rbx = canvas.width / 2 - rbw / 2, rby = py + ph - 46;
                ctx.fillStyle = '#b8860b'; ctx.fillRect(rbx, rby, rbw, rbh);
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(rbx, rby, rbw, rbh);
                ctx.fillStyle = '#fff5cc'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('🎁 처치 보상 받기 (' + rn + ')', rbx + rbw / 2, rby + rbh / 2);
                game.worldBossButtons.push({ x: rbx, y: rby, w: rbw, h: rbh, action: 'wbClaim' });
            }
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }

        // 사망 배너 (크게, 붉은 플래시 + 펄스)
        function drawDeathMsg() {
            if (game.deathMsg <= 0) return;
            const flash = Math.min(0.45, (game.deathMsg / 150) * 0.45);
            ctx.fillStyle = `rgba(150,0,0,${flash})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(0,0,0,0.74)';
            ctx.fillRect(0, canvas.height / 2 - 72, canvas.width, 144);
            ctx.strokeStyle = '#ff3b3b';
            ctx.lineWidth = 4;
            ctx.strokeRect(6, canvas.height / 2 - 72, canvas.width - 12, 144);

            const pulse = 1 + Math.sin(Date.now() / 110) * 0.07;
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2 - 14);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = '#ff4d4d';
            ctx.font = 'bold 56px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💀 사망! 💀', 0, 0);
            ctx.restore();

            ctx.fillStyle = '#ffd6d6';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`코인 -${(game.deathLostCoins || 0).toLocaleString()} (10%) 잃음 · 풀피로 부활`,
                         canvas.width / 2, canvas.height / 2 + 36);
        }

        // 2차 각성 배너 (분홍 광채 + 펄스)
        function drawSecondAwakenMsg() {
            if (game.secondAwakenMsg <= 0) return;
            // 차수별 텍스트/색
            const tier = game.awakenMsgTier || 2;
            const INFO = {
                2: { col: '#ff80ab', glow: 'rgba(255,128,171,', title: '🌟 2차 각성! 🌟', sub: '공격력 4배 · 진(眞) 스킬 · 전용 패시브' },
                3: { col: '#18ffff', glow: 'rgba(24,255,255,',  title: '🔥 3차 각성! 🔥', sub: '공격력 8배 · 초(超) 스킬 · 패시브 강화' },
                4: { col: '#ffd700', glow: 'rgba(255,215,0,',   title: '👑 4차 각성! 👑', sub: '공격력 16배 · 극(極) 스킬 · 최강 패시브' }
            }[tier] || {};
            const a = Math.min(0.5, (game.secondAwakenMsg / 260) * 0.5);
            ctx.fillStyle = INFO.glow + (a * 0.5) + ')';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(20,0,20,0.78)';
            ctx.fillRect(0, canvas.height / 2 - 78, canvas.width, 156);
            ctx.strokeStyle = INFO.col; ctx.lineWidth = 4;
            ctx.strokeRect(6, canvas.height / 2 - 78, canvas.width - 12, 156);
            const pulse = 1 + Math.sin(Date.now() / 100) * 0.08;
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2 - 16);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = INFO.col; ctx.font = 'bold 50px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(INFO.title, 0, 0);
            ctx.restore();
            ctx.fillStyle = '#ffe9f2'; ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(INFO.sub, canvas.width / 2, canvas.height / 2 + 34);
        }

        // 화면 버튼 (보스 / 이벤트 / 뽑기 / 마을 / 메뉴) — 항상 표시
        // 최적화: 매 프레임 새 배열을 만들지 않도록 상수로 호이스트
        // 보스/뽑기/마을/PvP/길드는 이벤트(📋) 패널 좌측 메뉴로 통합
        const UI_BUTTONS = [
            { id: 'event', label: '📋 이벤트', color: '#f39c12' },
            { id: 'quest', label: '📜 퀘스트', color: '#27ae60' },
            { id: 'rhythm', label: '🎵 리듬', color: '#e84393' },
            { id: 'daily', label: '🛍️ 상점', color: '#16a085' },
            { id: 'menu',  label: '☰ 메뉴',  color: '#9b59b6' }
        ];
        function drawUIButtons() {
            game.uiButtons = [];

            const btns = UI_BUTTONS;
            const bw = 76, bh = 30, gap = 6;
            const x0 = 15, y0 = 55; // 코인 HUD 아래

            btns.forEach((b, i) => {
                const x = x0 + i * (bw + gap);
                const active = (b.id === 'event' && game.showEvent) || (b.id === 'shop' && game.showShop) || (b.id === 'town' && game.inTown) || (b.id === 'quest' && game.showQuest) || (b.id === 'rhythm' && game.showRhythm) || (b.id === 'daily' && game.showDailyShop) || (b.id === 'menu' && game.showMenu);

                ctx.fillStyle = active ? b.color : 'rgba(0,0,0,0.7)';
                ctx.fillRect(x, y0, bw, bh);
                ctx.strokeStyle = b.color;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y0, bw, bh);

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(b.label, x + bw / 2, y0 + bh / 2);

                // 퀘스트 보상 받을 수 있으면 빨간 알림 배지
                if (b.id === 'quest') {
                    const n = questClaimableCount() + weeklyClaimableCount();
                    if (n > 0) {
                        ctx.fillStyle = '#e74c3c';
                        ctx.beginPath(); ctx.arc(x + bw - 6, y0 + 6, 9, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 11px Arial';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText(String(n), x + bw - 6, y0 + 6);
                    }
                }

                game.uiButtons.push({ x, y: y0, w: bw, h: bh, id: b.id });
            });
        }

        // 아이템 카드 1개 그리기 (등급 + 세부단계 + ★/주문서 + 잠재 + 선택/장착)
        function drawItemCard(it, x, y, w, h) {
            const r = RARITIES[it.rarity];
            const base = ITEM_BASE[it.cat];
            const isEquipped = game.equipped[it.cat] === it.id;
            const isSelected = game.selectedItemId === it.id;

            ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.45)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = isSelected ? '#ffd700' : r.color;
            ctx.lineWidth = isSelected ? 4 : 2;
            ctx.strokeRect(x, y, w, h);

            const isMike = it.special === 'mike';
            ctx.fillStyle = isMike ? '#ff9be3' : r.color;
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(isMike ? '🎤 마이크' : rarityLabel(it), x + w / 2, y + 3);

            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.fillText(isMike ? '🎤' : base.icon, x + w / 2, y + 14);

            // ★스타포스 / +주문서 태그
            const tag = (it.star ? '★' + it.star : '') + (it.upg ? ' +' + it.upg : '');
            if (tag) {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 9px Arial';
                ctx.fillText(tag, x + w / 2, y + 37);
            }

            ctx.font = '9px Arial';
            ctx.fillStyle = '#aadfff';
            let sy = y + 49;
            if (itemAtk(it)) { ctx.fillText('공' + itemAtk(it), x + w / 2, sy); sy += 11; }
            if (itemDef(it)) { ctx.fillText('방' + itemDef(it), x + w / 2, sy); sy += 11; }

            // 잠재능력 표시
            if (it.potential && it.potential.length) {
                ctx.fillStyle = '#b388ff';
                ctx.font = 'bold 9px Arial';
                ctx.fillText('🔮' + it.potential.length, x + w / 2, y + h - 12);
            }
            // 장착 표시
            if (isEquipped) {
                ctx.fillStyle = '#4caf50';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'right';
                ctx.fillText('✔', x + w - 4, y + 3);
            }
        }

        // 장비 뽑기 + 인벤토리(700) + 강화(주문서/스타포스/잠재) UI
        function drawShopUI() {
            if (!game.showShop) return;
            game.shopButtons = [];

            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const winW = 884, winH = 584;
            const winX = (canvas.width - winW) / 2;
            const winY = (canvas.height - winH) / 2;
            ctx.fillStyle = '#161622';
            ctx.fillRect(winX, winY, winW, winH);
            ctx.strokeStyle = '#16a085';
            ctx.lineWidth = 3;
            ctx.strokeRect(winX, winY, winW, winH);

            // 제목 + 코인
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('🎰 장비 뽑기 & 강화', canvas.width / 2, winY + 8);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`코인 ${game.coins.toLocaleString()}🪙   📜주문서 ${game.scrolls}   🔮큐브 ${game.cubes}`, canvas.width / 2, winY + 34);

            // 닫기 버튼
            const cx = winX + winW - 38, cy = winY + 10;
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(cx, cy, 26, 26);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.textBaseline = 'middle';
            ctx.fillText('✕', cx + 13, cy + 14);
            game.shopButtons.push({ x: cx, y: cy, w: 26, h: 26, action: 'close' });

            // 뽑기 버튼 2개
            const pbW = 160, pbH = 34, pbGap = 20;
            const pbY = winY + 54;
            [['pull1', `1회 뽑기 ${GACHA_COST.single}🪙`, canvas.width / 2 - pbW - pbGap / 2, game.coins >= GACHA_COST.single],
             ['pull10', `10회 뽑기 ${GACHA_COST.ten}🪙`, canvas.width / 2 + pbGap / 2, game.coins >= GACHA_COST.ten]
            ].forEach(([action, label, px, ok]) => {
                ctx.fillStyle = ok ? '#16a085' : '#555';
                ctx.fillRect(px, pbY, pbW, pbH);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(px, pbY, pbW, pbH);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, px + pbW / 2, pbY + pbH / 2);
                game.shopButtons.push({ x: px, y: pbY, w: pbW, h: pbH, action });
            });

            // === 왼쪽: 장착 중(8슬롯) + 선택 장비 ===
            const eqX = winX + 18;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const bonus = getEquipBonus();
            ctx.fillText(`🧷 장착 (공+${bonus.attack} 방+${bonus.defense})`, eqX, winY + 98);

            // 8슬롯 2열 그리드
            const sW = 120, sH = 42, sGapX = 6, sGapY = 6;
            ITEM_CATS.forEach((cat, i) => {
                const col = i % 2, row = Math.floor(i / 2);
                const sx = eqX + col * (sW + sGapX);
                const sy = winY + 118 + row * (sH + sGapY);
                const it = game.equipped[cat] ? getItemById(game.equipped[cat]) : null;
                const r = it ? RARITIES[it.rarity] : null;

                ctx.fillStyle = it ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.05)';
                ctx.fillRect(sx, sy, sW, sH);
                ctx.strokeStyle = it ? r.color : '#555';
                ctx.lineWidth = 2;
                ctx.strokeRect(sx, sy, sW, sH);

                ctx.fillStyle = '#fff';
                ctx.font = '18px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(ITEM_BASE[cat].icon, sx + 5, sy + sH / 2);

                if (it) {
                    ctx.font = 'bold 10px Arial';
                    ctx.fillStyle = r.color;
                    ctx.textBaseline = 'top';
                    ctx.fillText(`${ITEM_BASE[cat].name}${it.star ? ' ★' + it.star : ''}`, sx + 28, sy + 6);
                    ctx.font = '9px Arial';
                    ctx.fillStyle = '#aadfff';
                    ctx.fillText(`공${itemAtk(it)} 방${itemDef(it)}`, sx + 28, sy + 22);
                    game.shopButtons.push({ x: sx, y: sy, w: sW, h: sH, action: 'select', id: it.id });
                } else {
                    ctx.font = '10px Arial';
                    ctx.fillStyle = '#888';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(ITEM_BASE[cat].name, sx + 28, sy + sH / 2);
                }
            });

            // 선택 장비 액션 패널
            const apY = winY + 322;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('🛠️ 선택한 장비', eqX, apY);

            const sel = game.selectedItemId ? getItemById(game.selectedItemId) : null;
            if (!sel) {
                ctx.fillStyle = '#888';
                ctx.font = '12px Arial';
                ctx.fillText('인벤토리/장착칸에서 장비를 클릭', eqX, apY + 20);
            } else {
                const r = RARITIES[sel.rarity];
                ctx.fillStyle = r.color;
                ctx.font = 'bold 12px Arial';
                ctx.fillText(`[${rarityLabel(sel)}] ${ITEM_BASE[sel.cat].name}${sel.star ? ' ★' + sel.star : ''}${sel.upg ? ' +' + sel.upg : ''}`, eqX, apY + 20);
                ctx.fillStyle = '#aadfff';
                ctx.font = '11px Arial';
                ctx.fillText(`공격 +${itemAtk(sel)}   방어 +${itemDef(sel)}`, eqX, apY + 36);

                // 잠재능력 줄
                ctx.fillStyle = '#b388ff';
                if (sel.potential && sel.potential.length) {
                    sel.potential.forEach((p, i) => {
                        ctx.fillText('🔮 ' + potLabel(p), eqX, apY + 52 + i * 14);
                    });
                } else {
                    ctx.fillText('🔮 잠재능력 없음', eqX, apY + 52);
                }

                // 액션 버튼 (장착/분해 · 주문서/스타포스 · 잠재)
                const bw = 120, bh = 28, bgx = 6;
                const col2 = eqX + bw + bgx;
                const sfRate = Math.round(enhanceRate(sel.star) * 100);
                const rows = [
                    [['equip', '장착', '#2980b9'], ['dismantle', `분해 +${dismantleValue(sel)}`, '#7f8c8d']],
                    [['scroll', sel.upg >= UPG_MAX ? '주문서 MAX' : `📜주문서(${sel.upg}/${UPG_MAX})`, '#b8860b'],
                     ['star', sel.star >= MAX_STAR ? '★MAX' : `⭐스타 ${starforceCost(sel.star)}🪙`, '#e67e22']],
                    [['potential', '🔮잠재능력 재설정', '#8e44ad']]
                ];
                const baseY = apY + 110;
                rows.forEach((rowArr, ri) => {
                    rowArr.forEach((b, ci) => {
                        const [action, label, color] = b;
                        const full = rowArr.length === 1;
                        const ax = ci === 0 ? eqX : col2;
                        const aw = full ? (bw * 2 + bgx) : bw;
                        const ay = baseY + ri * (bh + 5);
                        ctx.fillStyle = color;
                        ctx.fillRect(ax, ay, aw, bh);
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(ax, ay, aw, bh);
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 11px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(label, ax + aw / 2, ay + bh / 2);
                        game.shopButtons.push({ x: ax, y: ay, w: aw, h: bh, action, id: sel.id });
                    });
                });
                // 스타포스 성공률 안내
                ctx.fillStyle = '#888';
                ctx.font = '9px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(`스타포스 성공률 ${sfRate}%`, eqX, baseY + 3 * (bh + 5) + 2);
            }

            // === 오른쪽: 인벤토리(페이지) ===
            const invX = winX + 270;
            const cols = 7, cardW = 80, cardH = 92, cgap = 4;
            const perPage = PER_PAGE;
            const maxPage = Math.max(0, Math.ceil(game.bag.length / perPage) - 1);
            if (game.bagPage > maxPage) game.bagPage = maxPage;

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`🎒 인벤토리 ${game.bag.length}/${BAG_MAX}`, invX, winY + 96);

            // 페이지 이동 버튼
            const pgY = winY + 92;
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'center';
            [['pagePrev', '◀', invX + 360], ['pageNext', '▶', invX + 470]].forEach(([action, label, px]) => {
                ctx.fillStyle = '#333';
                ctx.fillRect(px, pgY, 26, 22);
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 1;
                ctx.strokeRect(px, pgY, 26, 22);
                ctx.fillStyle = '#fff';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, px + 13, pgY + 11);
                game.shopButtons.push({ x: px, y: pgY, w: 26, h: 22, action });
            });
            ctx.fillStyle = '#ddd';
            ctx.font = '12px Arial';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${game.bagPage + 1} / ${maxPage + 1}`, invX + 432, pgY + 11);

            if (game.bag.length === 0) {
                ctx.fillStyle = '#888';
                ctx.font = '14px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText('아직 장비가 없어요. 위에서 뽑아보세요!', invX, winY + 150);
            } else {
                const start = game.bagPage * perPage;
                const pageItems = game.bag.slice(start, start + perPage);
                pageItems.forEach((it, idx) => {
                    const col = idx % cols, row = Math.floor(idx / cols);
                    const x = invX + col * (cardW + cgap);
                    const y = winY + 120 + row * (cardH + cgap);
                    drawItemCard(it, x, y, cardW, cardH);
                    game.shopButtons.push({ x, y, w: cardW, h: cardH, action: 'select', id: it.id });
                });
            }

            // 💰 전체 판매 버튼 (인벤토리 그리드 아래, 장착 중인 장비는 제외)
            const saW = 240, saH = 28;
            const saX = invX;
            const saY = winY + 120 + 4 * (cardH + cgap) + 8;
            ctx.fillStyle = '#b8860b';
            ctx.fillRect(saX, saY, saW, saH);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(saX, saY, saW, saH);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💰 전체 판매 (장착 제외)', saX + saW / 2, saY + saH / 2);
            game.shopButtons.push({ x: saX, y: saY, w: saW, h: saH, action: 'sellAll' });
        }

        // === 퀘스트 UI ===
        function drawQuestUI() {
            if (!game.showQuest) return;
            game.questButtons = [];

            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const winW = 884, winH = 584;
            const winX = (canvas.width - winW) / 2, winY = (canvas.height - winH) / 2;
            ctx.fillStyle = '#161622';
            ctx.fillRect(winX, winY, winW, winH);
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 3;
            ctx.strokeRect(winX, winY, winW, winH);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('📜 퀘스트', canvas.width / 2, winY + 8);
            const isW = game.questTab === 'weekly';
            const LIST = isW ? WEEKLY_QUESTS : QUESTS;
            const progFn = isW ? weeklyProgress : questProgress;
            const doneFn = isW ? weeklyDone : questDone;
            const canFn = isW ? weeklyClaimable : questClaimable;
            const claimable = isW ? weeklyClaimableCount() : questClaimableCount();
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 13px Arial';
            ctx.fillText(`코인 ${game.coins.toLocaleString()}🪙   📜${game.scrolls}   🔮${game.cubes}` +
                (claimable ? `      ✨ 받을 보상 ${claimable}개!` : ''), canvas.width / 2, winY + 34);

            const cx = winX + winW - 38, cy = winY + 10;
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(cx, cy, 26, 26);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.textBaseline = 'middle';
            ctx.fillText('✕', cx + 13, cy + 14);
            game.questButtons.push({ x: cx, y: cy, w: 26, h: 26, action: 'close' });

            // 탭 (일반 / 주간)
            const tabW = 120, tabH = 28, tabY = winY + 52;
            [['normal', '📜 일반'], ['weekly', '📅 주간']].forEach((t, ti) => {
                const tx = winX + winW / 2 - tabW - 8 + ti * (tabW + 16);
                const on = game.questTab === t[0];
                ctx.fillStyle = on ? '#27ae60' : 'rgba(255,255,255,0.06)';
                ctx.fillRect(tx, tabY, tabW, tabH);
                ctx.strokeStyle = on ? '#2ecc71' : '#555'; ctx.lineWidth = 2; ctx.strokeRect(tx, tabY, tabW, tabH);
                ctx.fillStyle = on ? '#fff' : '#aaa'; ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                const badge = (t[0] === 'weekly' && weeklyClaimableCount()) ? ' ●' : '';
                ctx.fillText(t[1] + badge, tx + tabW / 2, tabY + tabH / 2);
                game.questButtons.push({ x: tx, y: tabY, w: tabW, h: tabH, action: 'qtab', tab: t[0] });
            });

            const cols = 2, rows = 4, PER_PAGE_Q = cols * rows;
            const totalPages = Math.max(1, Math.ceil(LIST.length / PER_PAGE_Q));
            if (game.questPage >= totalPages) game.questPage = totalPages - 1;
            if (game.questPage < 0) game.questPage = 0;
            const pageStart = game.questPage * PER_PAGE_Q;
            const pageQuests = LIST.slice(pageStart, pageStart + PER_PAGE_Q);
            const gap = 10, navH = 40;
            const gridX = winX + 18, gridY = winY + 92;
            const cellW = (winW - 18 * 2 - gap) / cols;
            const cellH = (winH - 92 - 14 - navH - (rows - 1) * gap) / rows;

            pageQuests.forEach((q, i) => {
                const col = i % cols, row = Math.floor(i / cols);
                const x = gridX + col * (cellW + gap), y = gridY + row * (cellH + gap);
                const prog = progFn(q), done = doneFn(q), can = canFn(q);

                ctx.fillStyle = done ? 'rgba(40,60,40,0.55)' : (can ? 'rgba(39,174,96,0.22)' : 'rgba(255,255,255,0.05)');
                ctx.fillRect(x, y, cellW, cellH);
                ctx.strokeStyle = done ? '#3a5a3a' : (can ? '#2ecc71' : '#3a3a4a');
                ctx.lineWidth = can ? 2 : 1;
                ctx.strokeRect(x, y, cellW, cellH);

                ctx.fillStyle = done ? '#7a8a7a' : '#fff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText((done ? '✔ ' : '') + q.title, x + 12, y + 9);

                const r = q.reward;
                const rt = [];
                if (r.coins) rt.push(`${r.coins.toLocaleString()}🪙`);
                if (r.scrolls) rt.push(`${r.scrolls}📜`);
                if (r.cubes) rt.push(`${r.cubes}🔮`);
                ctx.fillStyle = '#ffd166';
                ctx.font = '11px Arial';
                ctx.fillText('보상: ' + rt.join(' '), x + 12, y + 30);

                const barX = x + 12, barW = cellW - 160, barH = 10, barY = y + cellH - 16;
                const ratio = Math.min(1, prog / q.goal);
                ctx.fillStyle = '#cdd6ea';
                ctx.font = '10px Arial';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`${Math.min(prog, q.goal).toLocaleString()} / ${q.goal.toLocaleString()}`, barX, barY - 2);
                ctx.fillStyle = '#222';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = done ? '#3a5a3a' : (can ? '#2ecc71' : '#16a085');
                ctx.fillRect(barX, barY, barW * ratio, barH);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barW, barH);

                const btW = 122, btH = 30, btX = x + cellW - btW - 12, btY = y + cellH / 2 - btH / 2;
                ctx.fillStyle = done ? '#2c3a2c' : (can ? '#27ae60' : '#33333f');
                ctx.fillRect(btX, btY, btW, btH);
                ctx.strokeStyle = can ? '#2ecc71' : '#555';
                ctx.lineWidth = 1;
                ctx.strokeRect(btX, btY, btW, btH);
                ctx.fillStyle = done ? '#7a8a7a' : (can ? '#fff' : '#888');
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(done ? '완료' : (can ? '🎁 보상 받기' : '진행 중'), btX + btW / 2, btY + btH / 2);
                if (can) game.questButtons.push({ x: btX, y: btY, w: btW, h: btH, action: isW ? 'claimW' : 'claim', id: q.id });
            });

            // 페이지 네비게이션
            const navY = winY + winH - 34, navBtnW = 70, navBtnH = 26;
            const prevX = winX + winW / 2 - 110, nextX = winX + winW / 2 + 40;
            const canPrev = game.questPage > 0, canNext = game.questPage < totalPages - 1;
            ctx.font = 'bold 13px Arial';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = canPrev ? '#27ae60' : '#33333f';
            ctx.fillRect(prevX, navY, navBtnW, navBtnH);
            ctx.fillStyle = canPrev ? '#fff' : '#777';
            ctx.textAlign = 'center';
            ctx.fillText('◀ 이전', prevX + navBtnW / 2, navY + navBtnH / 2);
            ctx.fillStyle = '#fff';
            ctx.fillText(`${game.questPage + 1} / ${totalPages}`, winX + winW / 2, navY + navBtnH / 2);
            ctx.fillStyle = canNext ? '#27ae60' : '#33333f';
            ctx.fillRect(nextX, navY, navBtnW, navBtnH);
            ctx.fillStyle = canNext ? '#fff' : '#777';
            ctx.fillText('다음 ▶', nextX + navBtnW / 2, navY + navBtnH / 2);
            if (canPrev) game.questButtons.push({ x: prevX, y: navY, w: navBtnW, h: navBtnH, action: 'prevPage' });
            if (canNext) game.questButtons.push({ x: nextX, y: navY, w: navBtnW, h: navBtnH, action: 'nextPage' });

            ctx.textAlign = 'left';
        }

        // 사냥터 지도 UI (50개 그리드 10×5)
        function drawMapUI() {
            if (!game.showMap) return;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('🗺️ 사냥터 지도', canvas.width / 2, 18);
            ctx.font = '13px Arial';
            ctx.fillStyle = '#aaa';
            ctx.fillText('해제된 사냥터를 클릭해 이동 (M: 닫기)', canvas.width / 2, 46);

            game.mapButtons = [];

            const pages = [
                { label: '1막', start: 0, end: ACT1_FINAL_ZONE },
                { label: '2막', start: ACT2_START_ZONE, end: ACT2_FINAL_ZONE },
                { label: '3막', start: ACT3_START_ZONE, end: ACT3_FINAL_ZONE }
            ];
            const tabW = 110, tabH = 30, tabGap = 10, tabY = 64;
            const totalTabW = pages.length * tabW + (pages.length - 1) * tabGap;
            const tabStartX = (canvas.width - totalTabW) / 2;
            pages.forEach((page, idx) => {
                const active = game.mapPage === idx;
                const x = tabStartX + idx * (tabW + tabGap);
                ctx.fillStyle = active ? '#ffd700' : '#2f3546';
                ctx.fillRect(x, tabY, tabW, tabH);
                ctx.strokeStyle = active ? '#fff' : '#555';
                ctx.lineWidth = active ? 2 : 1;
                ctx.strokeRect(x, tabY, tabW, tabH);
                ctx.fillStyle = active ? '#1a1a2a' : '#ddd';
                ctx.font = 'bold 15px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(page.label, x + tabW / 2, tabY + tabH / 2);
                game.mapButtons.push({ x, y: tabY, w: tabW, h: tabH, action: 'mapPage', page: idx });
            });

            const activePage = pages[game.mapPage] || pages[0];
            const zoneIndices = ZONES.map((_, i) => i).filter(i => i >= activePage.start && i <= activePage.end);
            const cols = 10, rows = Math.ceil(zoneIndices.length / cols);
            const cellW = 90, gx = 4, gy = 6;
            const startY = 112;
            // 행 수에 맞춰 셀 높이 자동 조절 (화면 넘침 방지)
            const cellH = Math.min(84, Math.floor((canvas.height - startY - 12 - (rows - 1) * gy) / rows));
            const gridW = cols * cellW + (cols - 1) * gx;
            const startX = (canvas.width - gridW) / 2;

            zoneIndices.forEach((i) => {
                const zone = ZONES[i];
                const localIndex = i - activePage.start;
                const col = localIndex % cols, row = Math.floor(localIndex / cols);
                const x = startX + col * (cellW + gx);
                const y = startY + row * (cellH + gy);
                const unlocked = i <= game.maxUnlockedZone;
                const current = i === game.currentZone;

                ctx.fillStyle = unlocked ? zone.bg : '#3a3a3a';
                ctx.fillRect(x, y, cellW, cellH);
                ctx.strokeStyle = current ? '#ffd700' : (unlocked ? '#fff' : '#666');
                ctx.lineWidth = current ? 4 : 1;
                ctx.strokeRect(x, y, cellW, cellH);

                ctx.fillStyle = unlocked ? '#000' : '#888';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(unlocked ? zone.name : '🔒', x + cellW / 2, y + cellH / 2 - 12);

                if (unlocked) {
                    ctx.font = '10px Arial';
                    ctx.fillStyle = '#333';
                    ctx.fillText(`HP ${zone.monHp.toLocaleString()}`, x + cellW / 2, y + cellH / 2 + 6);
                    ctx.fillStyle = current ? '#b8860b' : '#555';
                    ctx.fillText(current ? '현재' : '이동', x + cellW / 2, y + cellH / 2 + 22);
                }

                game.mapButtons.push({ x, y, w: cellW, h: cellH, index: i });
            });
        }

        // 몬스터 그리기
        function drawMonsters() {
            game.monsters.forEach(monster => {
                monster.draw(game.camera.x);
            });
        }

        // hex 색상을 "r, g, b" 문자열로 변환
        // 최적화: 매 프레임 데미지/스킬 이펙트마다 호출되므로 결과를 캐시
        const _rgbCache = {};
        function hexToRgb(hex) {
            if (_rgbCache[hex] !== undefined) return _rgbCache[hex];
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
            const res = m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : '255, 0, 0';
            _rgbCache[hex] = res;
            return res;
        }

        // === 데미지 숫자 스프라이트 (택스처/숫자 택스처.png 의 0~9 비트맵 폰트) ===
        const numberSprite = new Image();
        numberSprite.src = './숫자 택스처.png';
        const NUM_SY = 339, NUM_SH = 187; // 시트에서 숫자들의 세로 범위(잉크 영역)
        // 표시 순서가 1234567890 이라 각 숫자 글자의 가로 [시작,끝] 픽셀
        const NUM_GLYPH = {
            '1': [56, 173],  '2': [173, 300],  '3': [300, 430],  '4': [430, 575],  '5': [575, 701],
            '6': [701, 837], '7': [837, 973],  '8': [973, 1118], '9': [1118, 1264], '0': [1264, 1422]
        };

        // 데미지 숫자를 스프라이트로 가운데 정렬해서 그림. h=글자 높이(px), '-'는 막대로 표현
        function drawSpriteNumber(str, cx, cy, h, alpha) {
            const scale = h / NUM_SH;
            const dashW = h * 0.42, gap = 2;
            // 전체 폭 계산
            let total = 0;
            for (const ch of str) {
                if (ch === '-') total += dashW + gap;
                else if (NUM_GLYPH[ch]) total += (NUM_GLYPH[ch][1] - NUM_GLYPH[ch][0]) * scale + gap;
            }
            total = Math.max(0, total - gap);

            let x = cx - total / 2;
            const top = cy - h / 2;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            for (const ch of str) {
                if (ch === '-') {
                    const by = cy - h * 0.08, bh = h * 0.18;
                    ctx.fillStyle = '#0a1730'; ctx.fillRect(x - 1, by - 1, dashW + 2, bh + 2); // 외곽선
                    ctx.fillStyle = '#cfe9ff'; ctx.fillRect(x, by, dashW, bh);
                    x += dashW + gap;
                } else if (NUM_GLYPH[ch]) {
                    const [x0, x1] = NUM_GLYPH[ch];
                    const gw = x1 - x0, dw = gw * scale;
                    ctx.drawImage(numberSprite, x0, NUM_SY, gw, NUM_SH, x, top, dw, h);
                    x += dw + gap;
                }
            }
            ctx.restore();
        }

        // 데미지 텍스트 그리기
        function drawDamageText() {
            game.damageText.forEach(damage => {
                const screenX = damage.x - game.camera.x;
                const screenY = damage.y;

                // 데미지 숫자는 스프라이트 폰트로 (그 외 EXP/코인/안내는 일반 텍스트)
                if (damage.sprite && numberSprite.complete && numberSprite.naturalWidth > 0) {
                    drawSpriteNumber(damage.spriteText, screenX, screenY, damage.h || 32, damage.alpha);
                    return;
                }

                const rgb = damage.color ? hexToRgb(damage.color) : '255, 0, 0';

                ctx.fillStyle = `rgba(${rgb}, ${damage.alpha})`;
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(damage.text, screenX, screenY);
            });
        }

        // 스킬 이펙트 그리기 (화려한 빛 파동 + 회전 스파크 + 코어 번쩍)
        function drawSkillEffects() {
            game.skillEffects.forEach(fx => {
                const screenX = fx.x - game.camera.x;
                const screenY = fx.y;
                const alpha = fx.duration / fx.maxDuration; // 1 → 0
                const prog = 1 - alpha;                      // 0 → 1
                const rgb = hexToRgb(fx.color);
                const R = Math.max(1, fx.radius);

                // 방향이 있으면 앞쪽 반원, 없으면 전체 원
                let start = 0, end = Math.PI * 2;
                if (fx.facing === 'right') { start = -Math.PI / 2; end = Math.PI / 2; }
                else if (fx.facing === 'left') { start = Math.PI / 2; end = Math.PI * 3 / 2; }
                const isHalf = (fx.facing === 'right' || fx.facing === 'left');

                ctx.save();
                ctx.globalCompositeOperation = 'lighter'; // 빛이 겹쳐 화려하게

                // 1) 채워진 방사형 그라데이션 (안쪽 밝고 바깥 투명)
                const grad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, R);
                grad.addColorStop(0, `rgba(${rgb}, ${0.55 * alpha})`);
                grad.addColorStop(0.55, `rgba(${rgb}, ${0.22 * alpha})`);
                grad.addColorStop(1, `rgba(${rgb}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                if (isHalf) ctx.moveTo(screenX, screenY);
                ctx.arc(screenX, screenY, R, start, end);
                ctx.closePath();
                ctx.fill();

                // (반짝이 스파크 + 찐한 테두리 링 제거 — 부드러운 빛만 남김)

                // 시전 순간 중심 번쩍
                const core = Math.max(0, 1 - prog * 2);
                if (core > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * core})`;
                    ctx.beginPath(); ctx.arc(screenX, screenY, 14 * core + 4, 0, Math.PI * 2); ctx.fill();
                }

                ctx.restore();
            });
        }

        // ============================================================
        //  메뉴 (설명 / 랭킹 / 제작자 / 설정) — 통일된 스타일의 오버레이
        // ============================================================
        function setMenuTab(tab) { game.menuTab = tab; }
        function closeMenu() {
            game.showMenu = false;
            const vs = document.getElementById('volSlider');
            if (vs) vs.style.display = 'none';
        }

        // --- 랭킹 시스템 (로컬 저장: 캐릭터별 최고 점수 보관) ---
        function computeScore() {
            const s = game.character.stats;
            return s.level * 1000
                 + game.maxUnlockedZone * 600
                 + game.serverBossKills * 2500
                 + Math.floor(game.coins / 10000);
        }
        function getRanking() {
            try { return JSON.parse(localStorage.getItem('gameRanking')) || []; }
            catch (e) { return []; }
        }
        function rankEntry() {
            return {
                name: (document.getElementById('charName').textContent || '모험가').trim(),
                score: computeScore(),
                level: game.character.stats.level,
                zone: game.maxUnlockedZone + 1,
                kills: game.serverBossKills,
                date: new Date().toISOString().slice(0, 10)
            };
        }
