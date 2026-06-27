        const AUC = { open: false, tab: 'browse', list: [], payout: 0, sel: null, loading: false, search: '' };
        function aucSetSearch(v) { AUC.search = v || ''; renderAucList(); } // 목록만 갱신 → 입력 포커스 유지
        function aucBrowseRowsHtml() {
            if (AUC.loading && !AUC.list.length) return '<div class="auc-empty">불러오는 중…</div>';
            if (!AUC.list.length) return '<div class="auc-empty">올라온 매물이 없어요. 첫 판매자가 되어보세요!</div>';
            const q = (AUC.search || '').trim().toLowerCase();
            const me = myName();
            const filtered = q ? AUC.list.filter(l => (aucLabel(l.item) + ' ' + l.seller).toLowerCase().includes(q)) : AUC.list;
            if (!filtered.length) return '<div class="auc-empty">검색 결과가 없어요</div>';
            return filtered.map(l => {
                const mine = l.seller === me;
                const btn = mine ? `<button class="auc-btn cancel" onclick="aucCancelListing(${l.id})">회수</button>`
                                 : `<button class="auc-btn" onclick="aucBuy(${l.id})">구매</button>`;
                return `<div class="auc-row"><div class="nm" style="color:${aucColor(l.item)}">${pvpEsc(aucLabel(l.item))}<div class="pw">공${itemAtk(l.item)} 방${itemDef(l.item)} · ${pvpEsc(l.seller)}</div></div><div class="pr">${l.price.toLocaleString()}🪙</div>${btn}</div>`;
            }).join('');
        }
        function renderAucList() { const el = document.getElementById('aucListBox'); if (el) el.innerHTML = aucBrowseRowsHtml(); }
        function aucColor(it) { return (RARITIES[it.rarity] || RARITIES[0]).color; }
        function aucLabel(it) {
            const base = ITEM_BASE[it.cat] || { name: it.cat, icon: '❓' };
            const tags = (it.star ? ' ★' + it.star : '') + (it.upg ? ' +' + it.upg : '');
            return `${base.icon} ${rarityLabel(it)} ${base.name}${tags}`;
        }
        function aucPost(body) {
            return fetch(RANK_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(r => r.json());
        }
        function openAuction() {
            AUC.open = true; game.aucOpen = true; AUC.tab = 'browse'; AUC.sel = null;
            document.getElementById('aucModal').style.display = 'flex';
            aucRefresh(); aucFetchPayout(); renderAuc();
        }
        function closeAuction() {
            AUC.open = false; game.aucOpen = false;
            for (const k in keys) keys[k] = false;
            document.getElementById('aucModal').style.display = 'none';
        }
        function setAucTab(t) { AUC.tab = t; AUC.sel = null; if (t === 'browse') aucRefresh(); if (t === 'claim') aucFetchPayout(); renderAuc(); }
        function aucRefresh() {
            AUC.loading = true; if (AUC.open && AUC.tab === 'browse') renderAuc();
            fetch(RANK_API + '?auc=list&t=' + Date.now()).then(r => r.json())
                .then(arr => { AUC.list = Array.isArray(arr) ? arr : []; AUC.loading = false; if (AUC.open && AUC.tab === 'browse') renderAuc(); })
                .catch(() => { AUC.loading = false; });
        }
        function aucFetchPayout() {
            fetch(RANK_API + '?auc=payout&name=' + encodeURIComponent(myName()) + '&t=' + Date.now()).then(r => r.json())
                .then(d => { AUC.payout = (d && d.coins) || 0; if (AUC.open && AUC.tab === 'claim') renderAuc(); }).catch(() => {});
        }
        function aucBuy(id) {
            const lst = AUC.list.find(l => l.id === id); if (!lst) return;
            if (lst.seller === myName()) return;
            if (game.coins < lst.price) { floatMsg('코인 부족!', '#ff6b6b'); return; }
            aucPost({ auc: 'buy', id, buyer: myName() }).then(res => {
                if (res && res.ok) {
                    game.coins -= res.price;
                    const it = res.item; it.id = game.nextItemId++;
                    addToBag(it);
                    floatMsg('🏪 구매 완료! ' + aucLabel(it), '#2ecc71');
                    saveProgress(); aucRefresh();
                } else floatMsg(res && res.error === 'gone' ? '이미 팔렸어요' : '구매 실패', '#ff6b6b');
            }).catch(() => floatMsg('서버 연결 실패', '#ff6b6b'));
        }
        function aucCancelListing(id) {
            aucPost({ auc: 'cancel', id, seller: myName() }).then(res => {
                if (res && res.ok) { const it = res.item; it.id = game.nextItemId++; addToBag(it); floatMsg('매물 회수 완료', '#aaa'); saveProgress(); aucRefresh(); }
                else floatMsg('회수 실패', '#ff6b6b');
            }).catch(() => floatMsg('서버 연결 실패', '#ff6b6b'));
        }
        function aucSelectBag(id) { AUC.sel = (AUC.sel === id ? null : id); renderAuc(); }
        function aucSell() {
            const it = AUC.sel != null ? getItemById(AUC.sel) : null;
            if (!it) { floatMsg('팔 아이템을 골라주세요', '#ff6b6b'); return; }
            if (Object.values(game.equipped).includes(it.id)) { floatMsg('장착 중인 장비는 못 팔아요', '#ff6b6b'); return; }
            const inp = document.getElementById('aucPriceInput');
            const price = Math.floor(Number(inp && inp.value) || 0);
            if (price < 1) { floatMsg('가격을 입력하세요', '#ff6b6b'); return; }
            const itemCopy = JSON.parse(JSON.stringify(it));
            aucPost({ auc: 'sell', seller: myName(), price, item: itemCopy }).then(res => {
                if (res && res.ok) {
                    game.bag = game.bag.filter(b => b.id !== it.id);
                    if (game.selectedItemId === it.id) game.selectedItemId = null;
                    AUC.sel = null;
                    floatMsg('🏪 경매장 등록! ' + price.toLocaleString() + '🪙', '#f1c40f');
                    saveProgress(); renderAuc();
                } else floatMsg('등록 실패', '#ff6b6b');
            }).catch(() => floatMsg('서버 연결 실패', '#ff6b6b'));
        }
        function aucClaim() {
            aucPost({ auc: 'claim', name: myName() }).then(res => {
                const c = (res && res.coins) || 0;
                if (c > 0) { game.coins += c; AUC.payout = 0; floatMsg('💰 정산 +' + c.toLocaleString() + '🪙', '#2ecc71'); saveProgress(); }
                else floatMsg('받을 코인이 없어요', '#aaa');
                renderAuc();
            }).catch(() => floatMsg('서버 연결 실패', '#ff6b6b'));
        }
        function renderAuc() {
            const body = document.getElementById('aucBody'); if (!body) return;
            const tabs = [['browse', '🛒 매물'], ['sell', '💰 팔기'], ['claim', '📦 정산']];
            const tabHtml = tabs.map(([k, l]) => `<button class="auc-tab ${AUC.tab === k ? 'on' : ''}" onclick="setAucTab('${k}')">${l}</button>`).join('');
            let inner = '';
            if (AUC.tab === 'browse') {
                inner = `<div class="auc-sellbar" style="margin:0 0 8px">
                            <input id="aucSearchInput" style="flex:1;width:auto" placeholder="🔍 검색 (등급·부위·판매자)" value="${pvpEsc(AUC.search)}" oninput="aucSetSearch(this.value)">
                            <button class="auc-btn" onclick="aucRefresh()">🔄 새로고침</button>
                         </div>
                         <div class="auc-list" id="aucListBox">${aucBrowseRowsHtml()}</div>`;
            } else if (AUC.tab === 'sell') {
                const eq = Object.values(game.equipped);
                const items = game.bag.filter(b => !eq.includes(b.id));
                const rows = items.length ? items.map(it => `<div class="auc-row ${AUC.sel === it.id ? 'sel' : ''}" onclick="aucSelectBag(${it.id})"><div class="nm" style="color:${aucColor(it)}">${pvpEsc(aucLabel(it))}<div class="pw">공${itemAtk(it)} 방${itemDef(it)}</div></div></div>`).join('')
                                          : '<div class="auc-empty">팔 수 있는 장비가 없어요 (장착 중인 건 제외)</div>';
                const sel = AUC.sel != null ? getItemById(AUC.sel) : null;
                inner = `<div class="auc-list">${rows}</div>
                    <div class="auc-sellbar">
                        <span class="lab">${sel ? '선택: ' + pvpEsc(aucLabel(sel)) : '아이템을 골라주세요'}</span>
                        <input id="aucPriceInput" type="number" min="1" placeholder="가격(코인)">
                        <button class="auc-btn" onclick="aucSell()">등록</button>
                    </div>`;
            } else {
                inner = `<div class="auc-list"><div class="auc-empty" style="font-size:14px">내가 판 아이템의 정산 대기 코인<br><br><b style="color:#ffd166;font-size:24px">${AUC.payout.toLocaleString()} 🪙</b></div></div>
                    <div class="auc-sellbar"><span class="lab">팔린 만큼 여기 쌓여요. 받아서 코인에 추가하세요.</span><button class="auc-btn" onclick="aucClaim()">💰 정산 받기</button></div>`;
            }
            body.innerHTML = `<div class="auc-close" onclick="closeAuction()">✕</div>
                <div class="auc-head"><h2>🏪 경매장</h2><span class="auc-coins">보유 ${game.coins.toLocaleString()}🪙</span></div>
                <div class="auc-tabs">${tabHtml}</div>${inner}`;
        }

        // ============================================================
        //  🏰 길드 (구글시트 백엔드 — RANK_API 공유)
        //  만들기/가입/목록/멤버·기여/탈퇴 + 길드 랭킹(총점)
        // ============================================================
        const GUILD = { list: [], info: null, loading: false };
        function myName() { return (document.getElementById('charName').textContent || '모험가').trim(); }

