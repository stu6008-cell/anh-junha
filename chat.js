        const CHAT = { open: false, tab: 'world', subs: {}, loaded: {}, msgs: { world: [], guild: [], friend: [] }, friend: null };

        // 영구 기록 불러오기 (방마다 한 번)
        function chatLoad(tab) {
            const room = chatRoom(tab); if (!room || CHAT.loaded[room]) return;
            CHAT.loaded[room] = true;
            fetch(RANK_API + '?chat=history&room=' + encodeURIComponent(room) + '&t=' + Date.now())
                .then(r => r.json())
                .then(arr => {
                    if (!Array.isArray(arr)) return;
                    const me = myName();
                    const hist = arr.map(m => ({ name: m.name, text: m.text, mine: m.name === me }));
                    CHAT.msgs[tab] = hist.concat(CHAT.msgs[tab] || []);
                    if (CHAT.msgs[tab].length > 80) CHAT.msgs[tab] = CHAT.msgs[tab].slice(-80);
                    if (CHAT.open && CHAT.tab === tab) renderChatMsgs();
                })
                .catch(() => { CHAT.loaded[room] = false; }); // 실패 시 다음에 다시 시도 가능
        }
        // 영구 저장 (전송과 함께)
        function chatPersist(room, name, text) {
            if (!room) return;
            fetch(RANK_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ chat: 'send', room, name, text }) }).catch(() => {});
        }

        function chatRoom(tab) {
            if (tab === 'world') return 'chat-world';
            if (tab === 'guild') return game.guildName ? 'chat-guild-' + game.guildName : null;
            if (tab === 'friend') return CHAT.friend ? 'chat-dm-' + [myName(), CHAT.friend].sort().join('__') : null;
            return null;
        }
        function chatSub(tab) {
            const room = chatRoom(tab); if (!room) return null;
            if (CHAT.subs[room]) return CHAT.subs[room];
            const sb = sbClient(); if (!sb) return null;
            const ch = sb.channel(room, { config: { broadcast: { self: false } } });
            ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
                if (payload) chatPush(tab, { name: payload.name, text: payload.text, mine: false });
            });
            ch.subscribe();
            CHAT.subs[room] = ch;
            return ch;
        }
        function chatPush(tab, m) {
            const arr = CHAT.msgs[tab]; arr.push(m); if (arr.length > 80) arr.shift();
            if (CHAT.open && CHAT.tab === tab) renderChatMsgs();
        }
        function openChat() {
            if (!window.supabase || !sbClient()) { alert('실시간 서버 로딩 중 — 잠시 후 다시 시도하세요'); return; }
            CHAT.open = true; game.chatOpen = true;
            document.getElementById('chatModal').style.display = 'flex';
            chatSub('world'); chatSub('guild'); // 미리 구독해 백그라운드로도 수신
            chatLoad('world'); chatLoad('guild');
            renderChat();
        }
        function closeChat() {
            CHAT.open = false; game.chatOpen = false;
            for (const k in keys) keys[k] = false;
            document.getElementById('chatModal').style.display = 'none';
        }
        function setChatTab(t) { CHAT.tab = t; if (t !== 'friend') { chatSub(t); chatLoad(t); } renderChat(); }
        function setFriend() {
            const inp = document.getElementById('chatFriendInput'); if (!inp) return;
            const n = (inp.value || '').trim().slice(0, 12); if (!n) return;
            // 친구를 바꾸면 이전 친구 DM 채널을 정리 (안 하면 옛 친구 메시지가 새 친구 창에 섞임)
            const oldRoom = chatRoom('friend');
            if (oldRoom && CHAT.subs[oldRoom]) {
                try { sbClient().removeChannel(CHAT.subs[oldRoom]); } catch (e) {}
                delete CHAT.subs[oldRoom]; delete CHAT.loaded[oldRoom];
            }
            CHAT.friend = n; CHAT.msgs.friend = []; chatSub('friend'); chatLoad('friend'); renderChat();
        }
        function sendChat() {
            const inp = document.getElementById('chatInput'); if (!inp) return;
            const text = (inp.value || '').trim().slice(0, 200); if (!text) return;
            const tab = CHAT.tab;
            if (tab === 'guild' && !game.guildName) { alert('길드에 먼저 가입하세요'); return; }
            if (tab === 'friend' && !CHAT.friend) { alert('먼저 친구 닉네임을 입력하고 연결하세요'); return; }
            const ch = chatSub(tab); if (!ch) { alert('채팅방을 열 수 없어요'); return; }
            ch.send({ type: 'broadcast', event: 'msg', payload: { name: myName(), text } });
            chatPush(tab, { name: myName(), text, mine: true });
            chatPersist(chatRoom(tab), myName(), text); // 영구 저장
            inp.value = '';
        }
        function renderChat() {
            const body = document.getElementById('chatBody'); if (!body) return;
            const tabs = [['world', '🌍 월드'], ['guild', '🏰 길드'], ['friend', '👥 친구']];
            const tabHtml = tabs.map(([k, l]) => `<button class="chat-tab ${CHAT.tab === k ? 'on' : ''}" onclick="setChatTab('${k}')">${l}</button>`).join('');
            const friendBar = CHAT.tab === 'friend'
                ? `<div class="chat-friend"><input id="chatFriendInput" maxlength="12" placeholder="대화할 친구 닉네임" value="${CHAT.friend ? pvpEsc(CHAT.friend) : ''}"><button class="chat-send" onclick="setFriend()">연결</button></div>`
                : '';
            body.innerHTML =
                `<div class="chat-close" onclick="closeChat()">✕</div>
                 <div class="chat-tabs">${tabHtml}</div>
                 ${friendBar}
                 <div id="chatMsgs" class="chat-msgs"></div>
                 <div class="chat-input-row">
                    <input id="chatInput" maxlength="200" placeholder="메시지 입력 후 Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();sendChat();}">
                    <button class="chat-send" onclick="sendChat()">보내기</button>
                 </div>`;
            renderChatMsgs();
            const ci = document.getElementById('chatInput'); if (ci) ci.focus();
        }
        function renderChatMsgs() {
            const box = document.getElementById('chatMsgs'); if (!box) return;
            const tab = CHAT.tab;
            if (tab === 'guild' && !game.guildName) { box.innerHTML = '<div class="chat-empty">길드에 가입하면 길드원과 대화할 수 있어요</div>'; return; }
            if (tab === 'friend' && !CHAT.friend) { box.innerHTML = '<div class="chat-empty">친구 닉네임을 입력하고 «연결»을 누르세요</div>'; return; }
            const arr = CHAT.msgs[tab] || [];
            box.innerHTML = arr.map(m => `<div class="cm ${m.mine ? 'mine' : ''}"><b>${pvpEsc(m.name)}</b> ${pvpEsc(m.text)}</div>`).join('')
                || '<div class="chat-empty">아직 메시지가 없어요. 먼저 인사해보세요! 👋</div>';
            box.scrollTop = box.scrollHeight;
        }

        // ============================================================
        //  🏪 경매장 — 플레이어끼리 장비 거래 (Supabase DB)
        //  팔기: 가방→매물(코인 정산 대기) / 사기: 코인 지불→가방 / 정산: 받기
        // ============================================================
