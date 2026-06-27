        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const loadingOverlay = document.getElementById('loadingOverlay');

        // === 제작자 정보 (여기 값만 바꾸면 게임 내 '제작자' 화면이 바뀝니다) ===
        const CREATOR = {
            name: '안준하 (Ahn Junha)',
            github: 'stu6008-cell',
            year: '2026'
        };

        // === 공통 UI 스타일 (모든 메뉴 패널이 같은 색/폰트를 쓰도록 통일) ===
        const UI = {
            panelBg: 'rgba(15, 20, 40, 0.95)',
            panelBorder: '#ffd700',
            accent: '#ffd700',
            sub: '#8fb7ff',
            text: '#ffffff',
            dim: '#b8c2d8',
            titleFont: 'bold 22px Arial',
            headFont: 'bold 15px Arial',
            bodyFont: '14px Arial'
        };

        // 배경음악(BGM) — 요청대로 처음엔 '꺼진' 상태로 시작 (P 키 / 🔊 버튼 / 메뉴로 켜기)
        const bgm = document.getElementById('bgm');
        let bgmVolume = parseFloat(localStorage.getItem('bgmVolume'));
        if (isNaN(bgmVolume)) bgmVolume = 0.35;     // 저장된 볼륨 없으면 35%
        bgm.volume = bgmVolume;
        let bgmOn = false; // 시작 시 꺼짐
        // 첫 사용자 입력 때 재생 시작 (브라우저 자동재생 정책) — 켜져 있을 때만
        function startBgm() {
            if (bgmOn && bgm.paused) {
                bgm.play().catch(() => {});
            }
        }
        function toggleBgm() {
            bgmOn = !bgmOn;
            if (bgmOn) bgm.play().catch(() => {});
            else bgm.pause();
        }

        // ===== 🔊 효과음 (Web Audio, 파일 없이 코드로 합성 · 용량 0) =====
        const SFX = {
            ctx: null, master: null, on: true, vol: 0.5, _killT: 0, _lvT: 0, _atkT: 0,
            init() {
                const s = localStorage.getItem('sfxOn'); if (s !== null) this.on = (s === '1');
                const v = parseFloat(localStorage.getItem('sfxVol')); if (!isNaN(v)) this.vol = Math.max(0, Math.min(1, v));
            },
            ensure() {
                if (this.ctx) return;
                try {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                    this.master = this.ctx.createGain();
                    this.master.gain.value = this.vol;
                    this.master.connect(this.ctx.destination);
                } catch (e) { this.ctx = null; }
            },
            resume() { this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
            setOn(b) { this.on = b; localStorage.setItem('sfxOn', b ? '1' : '0'); if (b) this.resume(); },
            setVol(v) { this.vol = Math.max(0, Math.min(1, v)); if (this.master) this.master.gain.value = this.vol; localStorage.setItem('sfxVol', String(this.vol)); },
            tone(f0, f1, dur, type, gain, delay) {
                if (!this.on || !this.ctx) return;
                const t = this.ctx.currentTime + (delay || 0);
                const o = this.ctx.createOscillator(), g = this.ctx.createGain();
                o.type = type || 'square';
                o.frequency.setValueAtTime(f0, t);
                if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(gain || 0.3, t + 0.006);
                g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                o.connect(g); g.connect(this.master);
                o.start(t); o.stop(t + dur + 0.03);
            },
            noise(dur, gain) {
                if (!this.on || !this.ctx) return;
                const t = this.ctx.currentTime;
                const n = Math.floor(this.ctx.sampleRate * dur);
                const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
                const src = this.ctx.createBufferSource(); src.buffer = buf;
                const g = this.ctx.createGain(); g.gain.value = gain || 0.2;
                src.connect(g); g.connect(this.master); src.start(t);
            },
            play(name) {
                if (!this.on || !this.ctx) return;
                const now = performance.now();
                switch (name) {
                    case 'attack': if (now - this._atkT < 45) return; this._atkT = now; this.tone(430, 180, 0.07, 'square', 0.14); break;
                    case 'kill':   if (now - this._killT < 70) return; this._killT = now; this.tone(300, 90, 0.13, 'sawtooth', 0.2); this.noise(0.07, 0.1); break;
                    case 'levelup':if (now - this._lvT < 250) return; this._lvT = now; this.tone(523, 659, 0.1, 'triangle', 0.25); this.tone(784, 1047, 0.16, 'triangle', 0.25, 0.09); break;
                    case 'coin':   this.tone(880, 1320, 0.08, 'square', 0.16); this.tone(1320, 1760, 0.08, 'square', 0.13, 0.06); break;
                    case 'skill':  this.tone(200, 900, 0.18, 'sawtooth', 0.16); break;
                    case 'boss':   this.tone(130, 60, 0.5, 'sawtooth', 0.28); this.tone(90, 50, 0.5, 'square', 0.2, 0.04); break;
                    case 'note':   this.tone(680, 1020, 0.11, 'triangle', 0.2); break;
                    case 'error':  this.tone(220, 150, 0.15, 'square', 0.18); break;
                }
            }
        };
        SFX.init();
        function sfx(name) { SFX.play(name); }
        // 첫 사용자 입력 때 오디오 활성화 (브라우저 정책)
        window.addEventListener('pointerdown', () => SFX.resume());
        window.addEventListener('keydown', () => SFX.resume());
        function setBgmVolume(v) {
            bgmVolume = Math.max(0, Math.min(1, v));
            bgm.volume = bgmVolume;
            localStorage.setItem('bgmVolume', String(bgmVolume));
        }
        function updateLoadingOverlay() {
            loadingOverlay.style.display = (!game.assetLoad.bgm || !game.assetLoad.character) ? 'flex' : 'none';
        }
        window.addEventListener('pointerdown', startBgm);
        window.addEventListener('keydown', startBgm);
        bgm.addEventListener('canplaythrough', () => {
            game.assetLoad.bgm = true;
            updateLoadingOverlay();
        }, { once: true });
        bgm.addEventListener('error', () => {
            game.assetLoad.bgm = true;
            updateLoadingOverlay();
        }, { once: true });

        // 볼륨 슬라이더 (메뉴 > 설정 탭에서 표시)
        const volSlider = document.getElementById('volSlider');
        volSlider.value = Math.round(bgmVolume * 100);
        volSlider.addEventListener('input', () => setBgmVolume(volSlider.value / 100));

        // 맵 설정
        const MAP = {
            width: 2000
        };

        // 게임 상태
        const game = {
            character: {
                x: 500,
                y: 300,
                width: 60,
                height: 80,
                speed: 3,
                frameIndex: 0,
                frameCounter: 0,
                frameDelay: 10,
                runMultiplier: 2,   // 달리기 속도 배수
                runFrameDelay: 6,   // 달리기 시 애니메이션 속도 (더 빠름)
                direction: 'idle',
                facing: 'right', // 마지막으로 바라본 방향 (정지 중에도 유지)
                isAttacking: false,
                attackCounter: 0,
                attackDuration: 20,
                images: {
                    left: [],
                    right: [],
                },
                stats: {
                    hp: 100,
                    maxHp: 100,
                    mana: 50,
                    maxMana: 50,
                    level: 1,
                    exp: 0,
                    maxExp: 100,
                    statPoints: 0,
                    attack: 20,
                    defense: 5,
                    spirit: 10
                },
                job: '마법사' // 전직 전 기본 직업: 마법사
            },
            monsters: [],
            monsterSpawnCounter: 0,
            monsterSpawnInterval: 120, // 2초마다 확인
            autoHunt: false,
            autoHuntCounter: 0,
            autoHuntInterval: 30, // 0.5초마다 자동 공격
            saveCounter: 0, // 진행 상황 자동 저장 카운터
            camera: {
                x: 0,
                y: 0
            },
            damageText: [],
            skillEffects: [],     // 스킬 시각 효과
            skillCooldowns: { q: 0, w: 0, e: 0, f: 0, r: 0 }, // 스킬별 쿨다운
            ultimateUnlocked: false, // 서버보스 30회 처치로 궁극기 해제
            serverBossKills: 0,      // 서버보스 처치 횟수
            totalKills: 0,           // 누적 몬스터 처치 (퀘스트용)
            bossKills: 0,            // 누적 사냥터 보스 처치 (퀘스트용)
            totalPulls: 0,           // 누적 장비 뽑기 횟수 (퀘스트용)
            totalStarforce: 0,       // 누적 장비 강화(스타포스) 시도 (퀘스트용)
            totalGemPulls: 0,        // 누적 보석 뽑기 횟수 (퀘스트용)
            questClaimed: [],        // 보상 받은 퀘스트 id 목록
            questPage: 0,            // 퀘스트 창 페이지
            showQuest: false,        // 퀘스트 창 열림
            questButtons: [],        // 퀘스트 창 클릭 버튼
            guildName: '',           // 가입한 길드 이름 ('' = 미가입)
            guildButtons: [],        // 길드 탭 클릭 버튼
            guildSubTab: 'info',     // 길드 탭 안의 서브탭: info|raid|upgrade|shop
            guildShopLevel: 0,       // 길드 상점 업그레이드 단계 (1:훈장/경험치, 2:혼/각성)
            awakened: false,         // 1차 각성 (공격력 2배 + 새 스킬)
            awakened2: false,        // 2차 각성 (2막50 클리어, 공격력 또 2배 + 더 강한 스킬 + 패시브3개)
            awakened3: false,        // 3차 각성 (3막35 클리어, 공격력 ×8 + 초(超) 스킬 + 패시브 강화)
            awakened4: false,        // 4차 각성 (3막70 클리어, 공격력 ×16 + 극(極) 스킬 + 최강 패시브)
            awakenMsgTier: 2,        // 각성 배너 표시용 차수
            showWorldBoss: false,    // 🌍 월드보스 모달
            worldBossButtons: [],    // 월드보스 모달 클릭영역
            spiritTimer: 0,          // 자연 정령 남은 프레임 (소환 시 60초)
            spiritCooldown: 0,       // 정령 소환 스킬 쿨다운
            spiritAtkCounter: 0,     // 정령 공격 타이머
            spirit: { x: 0, y: 0 },  // 정령 위치
            guildUpgrade: { atk: 0, def: 0, hp: 0 }, // 코인으로 강화하는 길드 능력치 레벨
            raidActive: false,       // 길드전 진행 중
            raidTimer: 0,            // 길드전 남은 프레임
            raidDamage: 0,           // 이번 길드전 누적 데미지
            raidBest: 0,             // 최고 길드전 데미지(길드 기여점수)
            skillLevels: {},         // 스킬 강화 레벨 { q:1, r:1 }
            skillTabButtons: [],     // 스킬 탭 강화 버튼
            coins: 0,             // 보유 코인
            currentZone: 0,       // 현재 사냥터 인덱스
            maxUnlockedZone: 0,   // 해금된 마지막 사냥터
            boss: null,           // 현재 사냥터 보스 (없으면 null)
            serverBoss: null,     // 서버보스 (이벤트에서 소환)
            showMap: false,       // 맵(사냥터 이동) 창 열림
            mapButtons: [],
            showEvent: false,     // 이벤트 메뉴(스텟/상점/맵) 열림
            eventTab: null,       // 가운데에 띄울 탭: 'stat' | 'shop' | 'map' | null
            eventMenuButtons: [], // 이벤트 좌측 메뉴 버튼
            eventCloseButton: null, // 가운데 패널 닫기 버튼
            gemInv: {},           // 미장착 보석: gemInv[type][grade] = 개수
            equippedGems: [],     // 장착 보석 (최대 5): {type, grade}
            gemButtons: [],       // 보석 탭 버튼들
            gemPage: 0,           // 보유 보석 목록 페이지
            uiButtons: [],        // 화면 버튼 (보스/이벤트/상점)
            pvpOpen: false,       // 턴제 PvP 모달 열림
            eventZoneButtons: [], // 이벤트 패널 안의 사냥터 버튼
            showShop: false,      // 뽑기 창 열림
            shopButtons: [],      // 뽑기 창 버튼들
            bag: [],              // 보유 장비 인벤토리
            equipped: {           // 장착 중인 장비 id (8개 슬롯)
                weapon: null, hat: null, top: null, bottom: null,
                shoes: null, gloves: null, cape: null, ring: null
            },
            selectedItemId: null, // 인벤토리에서 선택한 장비
            nextItemId: 1,        // 장비 고유 id 카운터
            scrolls: 0,           // 보유 주문서 (장비 능력치 강화 시 소모)
            cubes: 0,             // 보유 큐브 (잠재능력 재설정 시 소모)
            musicNotes: 0,        // 🎵 음표 재화 (리듬게임에서 획득, 한정상점 화폐)
            boughtMike: false,    // 🎤 마이크 구매 여부 (1회 한정)
            hasNoteSkill: false,  // 🎵 음표공격 스킬 보유 여부 (1회 한정)
            showRhythm: false,    // 리듬게임 창 열림
            petScrolls: 0,        // 보유 펫 강화서 (펫 전용)
            hpPotions: 0,         // 체력 물약 (1키)
            mpPotions: 0,         // 마나 물약 (2키)
            bagPage: 0,           // 인벤토리 페이지
            zoneClearMsg: 0,      // 사냥터 클리어 메시지 표시 시간
            serverClearMsg: 0,    // 서버보스 처치 메시지 표시 시간
            deathMsg: 0,          // 사망 배너 표시 시간
            deathLostCoins: 0,    // 사망 시 잃은 코인(배너 표시용)
            secondAwakenMsg: 0,   // 2차 각성 배너 표시 시간
            summonFlash: 0,       // 서버보스 소환 화면 플래시 타이머
            autoServerBoss: false, // 서버보스 자동 소환
            autoBossCounter: 0,    // 자동 재소환 딜레이 카운터
            autoBossButton: null,  // 자동 소환 토글 버튼
            serverBossTier: 0,     // 선택한 서버보스 난이도 (0이지~3익스트림)
            bossTierButtons: [],   // 난이도 선택 버튼
            inExpDungeon: false,  // 경험치 던전 입장 중
            dungeonTimer: 0,      // 던전 남은 시간 (프레임)
            dungeonExp: 0,        // 던전 몬스터 1마리 경험치
            dungeonButton: null,  // 던전 입장 버튼
            inMedalDungeon: false,    // 훈장 던전 입장 중
            medalDungeonTimer: 0,     // 훈장 던전 남은 시간 (프레임)
            medalDungeonButton: null, // 훈장 던전 입장 버튼
            inTown: false,        // 마을 입장 중 (전투 없음)
            showHome: false,      // 마이홈 실내 화면 열림
            home: { hp: 0, atk: 0, def: 0 }, // 마이홈 강화 (체력/공격/방어 레벨별 %)
            invuln: 0,            // 사망 후 무적 프레임 (연쇄 사망/페널티 방지)
            nearHome: false,      // 집 앞에 서 있는지
            homeButtons: [],      // 마이홈 실내 버튼
            townButtons: [],      // 마을 화면 버튼 (나가기 등)
            pet: {                // 펫: 등급 + 강화(강화서), 자동 공격 + 체력/마나 회복
                rarity: 0,        // 등급 (0~4: 노멀~레전더리)
                level: 0,         // 강화 단계
                x: 500, y: 300,   // 부드러운 추적용 현재 위치
                attackCounter: 0,
                regenCounter: 0
            },
            petButton: null,
            medalGrade: 0,           // 훈장 등급 (0=없음, 1~9)
            medalEnhance: 0,         // 훈장 강화 단계 (0 ~ MEDAL_MAX_ENHANCE)
            medalAbilities: [],      // 훈장 추가능력 (큐브로 획득)
            medalCubes: 0,           // 훈장 큐브 (추가능력 획득용)
            medalShards: 0,          // 훈장 조각 (훈장 던전 보상, 강화 재화)
            medalButtons: [],        // 훈장 탭 버튼
            selectingJob: false,
            selectedJob: null,
            jobButtons: [],
            statBatch: 1,            // 스탯 한 번에 찍을 포인트 수 (1/5/10/'MAX')
            statBatchButtons: [],    // 배수 선택 버튼

            // 메뉴(설명 / 랭킹 / 제작자 / 설정)
            showMenu: false,
            menuTab: 'help',         // 'help' | 'rank' | 'credit' | 'settings'
            menuButtons: [],
            mapPage: 0,

            // === 신규 기능 상태 ===
            autoHpPotion: false,     // ⚙️ 체력 자동물약 (50% 이하)
            autoMpPotion: false,     // ⚙️ 마나 자동물약 (30% 이하)
            comboKills: 0,           // 🔥 연속 처치 콤보 수
            comboTimer: 0,           // 콤보 유지 타이머 (프레임)
            maxHit: 0,               // 📊 최고 단일 데미지
            totalDamageDealt: 0,     // 📊 누적 총 데미지
            lastAttendDate: '',      // 📅 마지막 출석 날짜 (YYYY-MM-DD)
            attendStreak: 0,         // 연속 출석일
            showAttend: false,       // 출석 보상창 열림
            attendButtons: [],
            achClaimed: [],          // 🏅 수령한 도전과제 key 목록
            showAch: false,          // 도전과제창 열림
            achButtons: [],
            dailyShopDate: '',       // 🛍️ 랜덤상점 갱신 날짜
            dailyShopItems: [],      // 랜덤상점 매물 [{kind,cat,rarity,cost,bought}]
            showDailyShop: false,
            dailyShopButtons: [],
            boughtSciSkin: false,    // ✨ 과학자 음표 스킨 구매 여부 (음표 50)
            equippedSciSkin: false,  // ✨ 과학자 음표 스킨 장착 여부 (토글)
            questTab: 'normal',      // 퀘스트 창 탭: 'normal' | 'weekly'
            weeklyClaimed: [],       // 📅 이번 주 수령한 주간 퀘스트 id
            weeklyResetDate: '',     // 주간 리셋 기준(이번 주 일요일 날짜)
            weeklyKills: 0, weeklyBoss: 0, weeklySboss: 0, weeklyDboss: 0, // 주간 카운터
            weeklyTowerBest: 0,      // 이번 주 무한탑 최고층
            dailyBossDate: '',       // 🌅 오늘 일일보스 처치 날짜
            dailyBoss: null,         // 현재 일일보스 몬스터
            inTower: false,          // 🗼 무한의 탑 입장 중
            towerLevel: 0,           // 현재 층
            towerBest: 0,            // 역대 최고층
            towerCoin: 0,            // 🪙 탑 코인 (층 클리어로 획득, 탑 상점 전용 재화)
            showTowerShop: false,    // 🗼 탑 상점 열림
            towerShopButtons: [],
            titlesOwned: ['beginner'], // 🏷️ 보유 칭호 키 목록
            titleEquipped: 'beginner', // 장착 중인 칭호
            towerButton: null,
            petType: 'dragon',       // 🐾 현재 펫 종류
            petOwned: ['dragon'],    // 보유 펫 종류 목록
            showPetBook: false,      // 펫 도감 열림
            petBookButtons: [],

            assetLoad: { bgm: false, character: false }
        };
        game.assetLoad.bgm = bgm.readyState >= 4;
        updateLoadingOverlay();

        // 펫 설정 (등급 + 강화서 강화)
        const PET_RANGE = 360;                 // 자동 공격 사정거리
        const PET_ICON = '🐲';
        const PET_MAX_LEVEL = 5;               // 등급별 최대 강화 단계
        const PET_SCROLL_COST = 3000;          // 펫 강화서 1개 가격 (코인) — 10배
        // 🐾 펫 종류 (수집/변경). dmg=펫공격배수, regen=회복배수, stat=스탯보너스배수
        const PET_TYPES = [
            { id: 'dragon',  name: '아기용',   icon: '🐲', desc: '밸런스형 (기본)',            dmg: 1.0,  regen: 1.0, stat: 1.0,  unlock: '기본 보유' },
            { id: 'wolf',    name: '늑대',     icon: '🐺', desc: '공격 특화 · 펫 데미지 1.5배', dmg: 1.5,  regen: 0.7, stat: 1.0,  unlock: '보스 100회 처치' },
            { id: 'phoenix', name: '불사조',   icon: '🦅', desc: '회복 특화 · 회복 2배',        dmg: 0.8,  regen: 2.0, stat: 1.0,  unlock: '무한의 탑 10층 도달' },
            { id: 'golem',   name: '골렘',     icon: '🗿', desc: '수호형 · 스탯보너스 1.4배',   dmg: 0.8,  regen: 1.0, stat: 1.4,  unlock: '서버보스 5회 처치' },
            { id: 'fairy',   name: '요정',     icon: '🧚', desc: '만능형 · 전부 1.15배',        dmg: 1.15, regen: 1.15, stat: 1.15, unlock: '몬스터 5,000마리 처치' },
            { id: 'note',    name: '음표펫',   icon: '🎵', desc: '아기용 + 음표공격[T] 쿨타임 60%↓', dmg: 1.0, regen: 1.0, stat: 1.0, unlock: '음표 상점 40🎵 구매', buyNotes: 40 }
        ];
        const NOTE_PET_COST = 40;  // 🎵 음표펫 가격 (음표)
        function petTypeDef() { return PET_TYPES.find(p => p.id === game.petType) || PET_TYPES[0]; }
        function acquirePet(id) {
            if (game.petOwned.includes(id)) return;
            game.petOwned.push(id);
            const p = PET_TYPES.find(x => x.id === id);
            if (p) floatMsg(`🎉 새 펫 [${p.name}] 획득! 펫 도감에서 변경 가능`, '#ffd700');
            saveProgress();
        }
        function checkPetUnlocks() {
            const cond = {
                wolf:    () => (game.bossKills || 0) >= 100,
                phoenix: () => (game.towerBest || 0) >= 10,
                golem:   () => (game.serverBossKills || 0) >= 5,
                fairy:   () => (game.totalKills || 0) >= 5000
            };
            for (const id in cond) { if (!game.petOwned.includes(id) && cond[id]()) acquirePet(id); }
        }

        // 물약 설정
        const HP_POTION = { cost: 1200, heal: 0.45 }; // 체력 물약: maxHp의 45% 회복 (10배)
        const MP_POTION = { cost: 900,  heal: 0.6 };  // 마나 물약: maxMana의 60% 회복 (10배)
        // 등급 배율 × 강화 단계 → 펫 강함
        function petPower() { return RARITIES[game.pet.rarity].mult * (1 + game.pet.level * 0.25); }
        function petDamageRatio() { return 1.0 * petPower() * petTypeDef().dmg; } // 플레이어 공격력 대비 비율 (펫 종류 반영)
        // 펫이 캐릭터에게 주는 공격력·방어력 % 보너스 (등급/강화/종류 비례)
        function petStatBonus() { return Math.round(petPower() * 9 * petTypeDef().stat); }
        function petInterval() { return Math.max(10, 42 - (game.pet.rarity * 4 + game.pet.level * 2)); } // 공격 더 빠르게
        function petPromoteCost() { return (game.pet.rarity + 1) * 5; } // 등급업에 필요한 강화서 수

        // === 대규모 밸런스 패치: 메이플스토리급 난이도 (약 10배 어렵게) ===
        // 이 값들만 조절하면 난이도를 쉽게 다시 맞출 수 있음.
        const DIFF = {
            hpMult:    5,    // 몬스터 체력 단계당 배수 (i*175 에 곱함)
            hpQuad:    50,   // 후반 가속용 i*i 계수 (뒤로 갈수록 급격히 단단해짐)
            dmgMult:   2.5,  // 몬스터 공격력 단계당 배수 (i*17.5 에 곱함)
            expMult:   0.6,  // 경험치 보상 배수 (낮을수록 레벨업이 느림)
            coinMult:  0.325, // 코인 보상 배수 (기존 0.65에서 절반으로)
            bossHpMult: 5,   // 보스 체력 = 일반 몬스터 체력 × 이 값 (기존 4)
            bossDmgAdd: 60,  // 보스 추가 공격력 (기존 25)
            levelExpAdd: 90  // 레벨업마다 필요 경험치 증가량 (기존 50)
        };

        // 🔥 버닝 이벤트 버프 — 경험치 2배, 코인 1.5배 (2026-07-03 23:59:59 까지만)
        const BURNING_EXP_MULT = 2;
        const BURNING_COIN_MULT = 1.5;
        const BURNING_END = new Date('2026-07-03T23:59:59');
        function burningActive() { return new Date() <= BURNING_END; }
        function burningExpMult() { return burningActive() ? BURNING_EXP_MULT : 1; }
        function burningCoinMult() { return burningActive() ? BURNING_COIN_MULT : 1; }

        // 사냥터(존) 정의 — 테마 5개 × 각 10단계 = 50개, 단계가 오를수록 강해짐
        // 1단계는 입문용으로 부드럽고, 뒤로 갈수록 메이플처럼 가파르게 단단해짐
        const ZONE_THEMES = [
            { name: '초원',   bg: '#90ee90' },
            { name: '어둠숲', bg: '#3b6b3b' },
            { name: '동굴',   bg: '#8b7d6b' },
            { name: '화산',   bg: '#c0504d' },
            { name: '설원',   bg: '#bfe6ff' },
            { name: '설산',   bg: '#aebfd2' },
            { name: '장난감나라', bg: '#ffc2de' },
            { name: '천상',   bg: '#fff0b8' },
            { name: '2막',    bg: '#160a33', count: 50 }, // 2막은 50스테이지
            { name: '3막',    bg: '#2a0810', count: 70 }  // 3막은 70스테이지 (심연)
        ];
        const ZONES = [];
        const THEME_START = {}; // 테마명 → 시작 zone 인덱스
        let _zi = 0;
        ZONE_THEMES.forEach(theme => {
            const count = theme.count || 10;
            THEME_START[theme.name] = _zi;
            for (let s = 0; s < count; s++) {
                const i = _zi; // 전체 인덱스
                // MOB_X: 초반은 1배(쉬움) → 뒤로 갈수록 점점 강해짐 (기존 존 보존 위해 /49 유지)
                const MOB_X = 1 + (i / 49) * 9;
                const monHp = Math.round((100 + i * 175 * DIFF.hpMult + i * i * DIFF.hpQuad) * MOB_X);
                const monDmg = Math.round((20 + i * 17.5 * DIFF.dmgMult) * MOB_X);
                const monCoin = Math.round((10 + i * 8) * DIFF.coinMult);
                const monExp = Math.round((20 + i * 16) * DIFF.expMult);
                ZONES.push({
                    name: `${theme.name} ${s + 1}`,
                    theme: theme.name,
                    bg: theme.bg,
                    monHp, monDmg, monCoin, monExp,
                    bossHp: monHp * DIFF.bossHpMult,
                    bossDmg: monDmg + DIFF.bossDmgAdd,
                    bossCoin: monCoin * 20,
                    bossExp: monExp * 8
                });
                _zi++;
            }
        });

        // 막(Act) 경계
        const ACT1_FINAL_ZONE = (THEME_START['천상'] !== undefined) ? THEME_START['천상'] + 9 : ZONES.length - 1; // 천상10
        const ACT2_START_ZONE = (THEME_START['2막'] !== undefined) ? THEME_START['2막'] : -1;                    // 2막1
        const ACT2_FINAL_ZONE = (THEME_START['2막'] !== undefined) ? THEME_START['2막'] + 49 : ZONES.length - 1; // 2막50
        const ACT3_START_ZONE = (THEME_START['3막'] !== undefined) ? THEME_START['3막'] : -1;                    // 3막1
        const ACT3_MID_ZONE   = (THEME_START['3막'] !== undefined) ? THEME_START['3막'] + 34 : -1;               // 3막35 → 3차 각성
        const ACT3_FINAL_ZONE = (THEME_START['3막'] !== undefined) ? THEME_START['3막'] + 69 : ZONES.length - 1; // 3막70 → 4차 각성

        // 🌍 익스트림 월드보스 3종 (서버 전체가 HP 공유, 10%+ 기여 시 보상) — type 은 백엔드 키
        const WB_BOSSES = [
            { type: 'golem',  name: '황금 골렘',     color: '#ffcf40', icon: '🗿', reward: '🪙 대량 코인' },
            { type: 'dragon', name: '고대 보물지기', color: '#b06bff', icon: '🐉', reward: '🏆 신화 장비 + 칭호' },
            { type: 'sage',   name: '시간의 현자',   color: '#5fd6ff', icon: '🔮', reward: '✨ 경험치 폭탄' }
        ];

        // 서버보스 — 난이도 4단계 (이지=현재 기준). 입힌 피해는 단계별로 저장됨
        // SERVER_BOSS_DIFF: 서버보스 난이도 배수 — 아래 기본 체력·공격력에 곱해짐 (보상은 그대로)
        const SERVER_BOSS_DIFF = 2; // 2배 어렵게 (체력·공격력 ×2)
        const SERVER_BOSSES = [
            { name: '이지',     maxHp: 300000,   damage: 180,  coinReward: 4000,   expReward: 1500,  color: '#2ecc71' },
            { name: '노말',     maxHp: 1200000,  damage: 450,  coinReward: 15000,  expReward: 5000,  color: '#3498db' },
            { name: '하드',     maxHp: 5000000,  damage: 1100, coinReward: 50000,  expReward: 16000, color: '#e67e22' },
            { name: '익스트림', maxHp: 20000000, damage: 2600, coinReward: 200000, expReward: 50000, color: '#e74c3c' }
        ].map(b => ({ ...b, maxHp: b.maxHp * SERVER_BOSS_DIFF, damage: b.damage * SERVER_BOSS_DIFF }));

        // === 퀘스트 시스템 ===
        // type별 진행값: kill(처치)/boss(보스)/sboss(서버보스)/level(레벨)/zone(도달 단계)/pull(장비뽑기)/starforce(강화)/gempull(보석뽑기)
        const QUESTS = [
            // === 초반 퀘스트 19개 (입문용) ===
            { id: 'e01', title: '뽑기 10번을 하세요',          type: 'pull',      goal: 10,  reward: { coins: 9000 } },
            { id: 'e02', title: '몬스터 5마리 처치',           type: 'kill',      goal: 5,   reward: { coins: 1000 } },
            { id: 'e03', title: '레벨 5 달성',                 type: 'level',     goal: 5,   reward: { coins: 1500 } },
            { id: 'e04', title: '장비 강화 5회',               type: 'starforce', goal: 5,   reward: { coins: 2000 } },
            { id: 'e05', title: '사냥터 5단계 도달',           type: 'zone',      goal: 5,   reward: { coins: 2500 } },
            { id: 'e06', title: '몬스터 20마리 처치',          type: 'kill',      goal: 20,  reward: { coins: 3000 } },
            { id: 'e07', title: '보석 뽑기 5회',               type: 'gempull',   goal: 5,   reward: { coins: 3000 } },
            { id: 'e08', title: '뽑기 30번을 하세요',          type: 'pull',      goal: 30,  reward: { coins: 12000, scrolls: 1 } },
            { id: 'e09', title: '사냥터 보스 1회 처치',        type: 'boss',      goal: 1,   reward: { coins: 4000 } },
            { id: 'e10', title: '레벨 10 달성',                type: 'level',     goal: 10,  reward: { coins: 5000 } },
            { id: 'e11', title: '장비 강화 20회',              type: 'starforce', goal: 20,  reward: { coins: 6000, scrolls: 1 } },
            { id: 'e12', title: '사냥터 10단계 도달',          type: 'zone',      goal: 10,  reward: { coins: 7000 } },
            { id: 'e13', title: '몬스터 100마리 처치',         type: 'kill',      goal: 100, reward: { coins: 10000, cubes: 1 } },
            { id: 'e14', title: '레벨 20 달성',                type: 'level',     goal: 20,  reward: { coins: 12000 } },
            { id: 'e15', title: '보석 뽑기 20회',              type: 'gempull',   goal: 20,  reward: { coins: 12000 } },
            { id: 'e16', title: '뽑기 100번을 하세요',         type: 'pull',      goal: 100, reward: { coins: 30000, scrolls: 2 } },
            { id: 'e17', title: '사냥터 보스 5회 처치',        type: 'boss',      goal: 5,   reward: { coins: 15000 } },
            { id: 'e18', title: '레벨 30 달성',                type: 'level',     goal: 30,  reward: { coins: 20000, cubes: 1 } },
            { id: 'e19', title: '사냥터 20단계 도달',          type: 'zone',      goal: 20,  reward: { coins: 30000, cubes: 1 } },
            // === 기존 퀘스트 ===
            { id: 'k10',    title: '몬스터 10마리 처치',        type: 'kill',  goal: 10,   reward: { coins: 2000 } },
            { id: 'lv10',   title: '레벨 10 달성',              type: 'level', goal: 10,   reward: { coins: 4000 } },
            { id: 'b1',     title: '사냥터 보스 1회 처치',      type: 'boss',  goal: 1,    reward: { coins: 3000, scrolls: 1 } },
            { id: 'k50',    title: '몬스터 50마리 처치',        type: 'kill',  goal: 50,   reward: { coins: 5000, scrolls: 1 } },
            { id: 'lv30',   title: '레벨 30 달성',              type: 'level', goal: 30,   reward: { coins: 15000, scrolls: 2 } },
            { id: 'z20',    title: '사냥터 20단계 도달',        type: 'zone',  goal: 20,   reward: { coins: 20000 } },
            { id: 'k200',   title: '몬스터 200마리 처치',       type: 'kill',  goal: 200,  reward: { coins: 12000, cubes: 1 } },
            { id: 'b10',    title: '보스 10회 처치',            type: 'boss',  goal: 10,   reward: { scrolls: 2, cubes: 2 } },
            { id: 'lv60',   title: '레벨 60 달성',              type: 'level', goal: 60,   reward: { coins: 30000, cubes: 1 } },
            { id: 'sb1',    title: '서버보스 1회 처치',         type: 'sboss', goal: 1,    reward: { coins: 40000, cubes: 2 } },
            { id: 'k1000',  title: '몬스터 1000마리 처치',      type: 'kill',  goal: 1000, reward: { coins: 80000, cubes: 3 } },
            { id: 'z80',    title: '천상10 도달 (1막 클리어)',  type: 'zone',  goal: 80,   reward: { coins: 200000, cubes: 5 } },
            { id: 'lv1000', title: '레벨 1000 달성',            type: 'level', goal: 1000, reward: { coins: 500000, cubes: 5 } },
            { id: 'z90',    title: '2막10 도달',                   type: 'zone', goal: 90,  reward: { coins: 1000000, cubes: 10 } },
            { id: 'z130',   title: '2막50 정복 + 2차 각성',        type: 'zone', goal: 130, reward: { coins: 5000000, cubes: 20 } }
        ];
        function questProgress(q) {
            switch (q.type) {
                case 'kill':  return game.totalKills || 0;
                case 'boss':  return game.bossKills || 0;
                case 'sboss': return game.serverBossKills || 0;
                case 'level': return game.character.stats.level;
                case 'zone':  return game.maxUnlockedZone + 1; // 도달한 단계 (1~90)
                case 'pull':  return game.totalPulls || 0;
                case 'starforce': return game.totalStarforce || 0;
                case 'gempull': return game.totalGemPulls || 0;
                default:      return 0;
            }
        }
        function questDone(q) { return (game.questClaimed || []).includes(q.id); }
        function questClaimable(q) { return !questDone(q) && questProgress(q) >= q.goal; }
        function questClaimableCount() { return QUESTS.filter(questClaimable).length; }
        function claimQuest(id) {
            const q = QUESTS.find(x => x.id === id);
            if (!q || !questClaimable(q)) return;
            const r = q.reward;
            if (r.coins) game.coins += r.coins;
            if (r.scrolls) game.scrolls += r.scrolls;
            if (r.cubes) game.cubes += r.cubes;
            if (!game.questClaimed) game.questClaimed = [];
            game.questClaimed.push(q.id);
            const parts = [];
            if (r.coins) parts.push(`+${r.coins.toLocaleString()}🪙`);
            if (r.scrolls) parts.push(`+${r.scrolls}📜`);
            if (r.cubes) parts.push(`+${r.cubes}🔮`);
            floatMsg(`✅ 퀘스트 완료! ${parts.join(' ')}`, '#2ecc71');
            saveProgress();
        }

        // === 📅 주간 퀘스트 (매주 일요일 리셋, 주 단위 카운터 기반, 큰 보상) ===
        const WEEKLY_QUESTS = [
            { id: 'wk_kill',  title: '이번 주 몬스터 2,000마리 처치', type: 'wkill',  goal: 2000, reward: { coins: 300000,  cubes: 3 } },
            { id: 'wk_boss',  title: '이번 주 보스 100회 처치',       type: 'wboss',  goal: 100,  reward: { coins: 500000,  cubes: 5 } },
            { id: 'wk_sboss', title: '이번 주 서버보스 7회 처치',     type: 'wsboss', goal: 7,    reward: { coins: 800000,  cubes: 8, scrolls: 5 } },
            { id: 'wk_daily', title: '이번 주 일일 보스 5회 처치',    type: 'wdboss', goal: 5,    reward: { coins: 1000000, cubes: 10 } },
            { id: 'wk_tower', title: '무한의 탑 이번 주 20층 도달',    type: 'wtower', goal: 20,   reward: { coins: 1500000, cubes: 12, scrolls: 8 } }
        ];
        function weeklyProgress(q) {
            switch (q.type) {
                case 'wkill':  return game.weeklyKills || 0;
                case 'wboss':  return game.weeklyBoss || 0;
                case 'wsboss': return game.weeklySboss || 0;
                case 'wdboss': return game.weeklyDboss || 0;
                case 'wtower': return game.weeklyTowerBest || 0;
                default:       return 0;
            }
        }
        function weeklyDone(q) { return (game.weeklyClaimed || []).includes(q.id); }
        function weeklyClaimable(q) { return !weeklyDone(q) && weeklyProgress(q) >= q.goal; }
        function weeklyClaimableCount() { return WEEKLY_QUESTS.filter(weeklyClaimable).length; }
        function claimWeekly(id) {
            const q = WEEKLY_QUESTS.find(x => x.id === id);
            if (!q || !weeklyClaimable(q)) return;
            const r = q.reward;
            if (r.coins) game.coins += r.coins;
            if (r.scrolls) game.scrolls += r.scrolls;
            if (r.cubes) game.cubes += r.cubes;
            if (!game.weeklyClaimed) game.weeklyClaimed = [];
            game.weeklyClaimed.push(q.id);
            const parts = [];
            if (r.coins) parts.push(`+${r.coins.toLocaleString()}🪙`);
            if (r.scrolls) parts.push(`+${r.scrolls}📜`);
            if (r.cubes) parts.push(`+${r.cubes}🔮`);
            floatMsg(`📅 주간 퀘스트 완료! ${parts.join(' ')}`, '#4a90e2');
            saveProgress();
        }
        // 이번 주(일요일 기준) 식별 문자열
        function weekKeyStr() {
            const d = new Date(); d.setDate(d.getDate() - d.getDay()); // 이번 주 일요일로
            return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        }
        function checkWeeklyReset() {
            const wk = weekKeyStr();
            if (game.weeklyResetDate === wk) return;
            game.weeklyResetDate = wk;
            game.weeklyClaimed = [];
            game.weeklyKills = 0; game.weeklyBoss = 0; game.weeklySboss = 0; game.weeklyDboss = 0; game.weeklyTowerBest = 0;
            saveProgress();
        }

        // === 경험치 던전 ===
        // 입장료 10000코인, 10분 제한. 몬스터는 전부 HP 1(원킬). 경험치는 깬 마지막 맵 몬스터와 동일.
        const EXP_DUNGEON_COST = 10000;
        const EXP_DUNGEON_FRAMES = 10 * 60 * 60; // 10분 (60fps 기준)

        // === 보석 시스템 ===
        // 5종(공격력/방어력/체력/경험치/스킬쿨). 코인으로 뽑으면 전부 9등급.
        // 같은 종류+같은 등급 2개 → 한 등급 위로 합성(숫자 작을수록 강함, 최대 1등급). 최대 5개 장착.
        const GEM_TYPES = [
            { key: 'attack',   name: '공격력', icon: '⚔️', perStr: 3 }, // 공격력 +%
            { key: 'defense',  name: '방어력', icon: '🛡️', perStr: 3 }, // 방어력 +%
            { key: 'hp',       name: '체력',   icon: '❤️', perStr: 4 }, // 최대 체력 +%
            { key: 'exp',      name: '경험치', icon: '📘', perStr: 5 }, // 경험치 획득 +%
            { key: 'cooldown', name: '스킬쿨', icon: '⏱️', perStr: 2 }  // 스킬 쿨다운 -%
        ];
        const GEM_TYPE_MAP = {};
        GEM_TYPES.forEach(t => { GEM_TYPE_MAP[t.key] = t; });
        const GEM_START_GRADE = 9;   // 뽑으면 항상 9등급
        const GEM_MAX_GRADE = 1;     // 최고 등급 (숫자가 작을수록 강함)
        const GEM_MAX_EQUIP = 5;     // 최대 장착 수
        const GEM_GACHA_COST = 1000;  // 보석 1회 뽑기 코인 (기존 200에서 5배)
        const GEM_CD_CAP = 60;       // 스킬쿨 감소 최대 % (너무 0초가 되지 않게)
        function gemStrength(grade) { return GEM_START_GRADE + 1 - grade; } // 9등급→1, 1등급→9
        function gemColor(grade) {
            // 1등급(최강) → 9등급(최약) 색상
            const colors = ['#ff4081','#e040fb','#7c4dff','#448aff','#18ffff','#69f0ae','#eeff41','#ffab40','#bdbdbd'];
            return colors[grade - 1] || '#bdbdbd';
        }
        function gemEffectLabel(type, grade) {
            const val = gemStrength(grade) * GEM_TYPE_MAP[type].perStr;
            return (type === 'cooldown' ? '-' : '+') + val + '%';
        }

        // === 메이플스토리M 스타일 장비 뽑기 시스템 ===
        // 등급 (낮음 → 높음): 노멀 / 레어 / 에픽 / 유니크 / 레전더리
        // weight: 장비 뽑기 등급 확률 — 좋은 등급일수록 더 희귀하게 하향 조정
        // '신화'는 weight 0 → 장비 뽑기엔 안 나오고 펫 승급으로만 도달하는 펫 전용 최고 등급
        const RARITIES = [
            { name: '노멀',     color: '#9e9e9e', mult: 1.0,  weight: 68 },
            { name: '레어',     color: '#2196f3', mult: 1.7,  weight: 21 },
            { name: '에픽',     color: '#9c27b0', mult: 2.6,  weight: 8 },
            { name: '유니크',   color: '#ff9800', mult: 4.2,  weight: 2.5 },
            { name: '레전더리', color: '#4caf50', mult: 7.0,  weight: 0.5 },
            { name: '신화',     color: '#ffd700', mult: 11.0, weight: 0 }
        ];

        // 등급 안의 세부 단계 (분열) — 같은 노멀이라도 Ⅰ < Ⅱ < Ⅲ
        const SUB_TIERS = 3;
        const SUB_NAME = ['Ⅰ', 'Ⅱ', 'Ⅲ'];      // 표시용 (index 0~2)
        const SUB_MULT = [1.0, 1.28, 1.6];      // 단계별 스탯 배율
        const SUB_WEIGHT = [60, 30, 10];        // 단계 추첨 가중치 (낮을수록 흔함)

        // 세부 단계 추첨
        function rollSubTier() {
            const total = SUB_WEIGHT.reduce((s, w) => s + w, 0);
            let r = Math.random() * total;
            for (let i = 0; i < SUB_TIERS; i++) {
                r -= SUB_WEIGHT[i];
                if (r <= 0) return i;
            }
            return 0;
        }

        // 등급 + 세부 단계 이름 (예: "노멀 Ⅱ")
        function rarityLabel(it) {
            return `${RARITIES[it.rarity].name} ${SUB_NAME[it.sub || 0]}`;
        }

        // 장비 슬롯 8종 + 기본 스탯
        const ITEM_BASE = {
            weapon: { name: '무기', icon: '⚔️', atk: 25, def: 0 },
            hat:    { name: '모자', icon: '🎩', atk: 0,  def: 14 },
            top:    { name: '상의', icon: '👕', atk: 0,  def: 18 },
            bottom: { name: '하의', icon: '👖', atk: 0,  def: 16 },
            shoes:  { name: '신발', icon: '👟', atk: 4,  def: 10 },
            gloves: { name: '장갑', icon: '🧤', atk: 10, def: 4 },
            cape:   { name: '망토', icon: '🧣', atk: 8,  def: 8 },
            ring:   { name: '반지', icon: '💍', atk: 12, def: 2 }
        };
        const ITEM_CATS = ['weapon', 'hat', 'top', 'bottom', 'shoes', 'gloves', 'cape', 'ring'];

        // 뽑기 비용
        const GACHA_COST = { single: 1000, ten: 9000 }; // 장비 뽑기 — 10배

        // 인벤토리 / 강화 설정
        const BAG_MAX = 700;          // 가방 최대 칸
        const MAX_STAR = 15;          // 최대 스타포스 ★
        const STAR_PER = 0.08;        // ★당 스탯 +8%
        const PER_PAGE = 28;          // 인벤토리 페이지당 표시 수
        const UPG_MAX = 7;            // 주문서 최대 강화 횟수
        const UPG_STAT = 5;           // 주문서 1회당 +스탯
        const SCROLL_COST = 800;      // 주문서 가격 (코인) — 10배
        const CUBE_COST = 1500;       // 큐브 가격 (코인) — 10배
