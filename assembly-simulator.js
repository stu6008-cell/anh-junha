'use strict';

const REG64 = ['rax', 'rbx', 'rcx', 'rdx', 'rsi', 'rdi', 'rbp', 'rsp'];
const REG32 = ['eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'ebp', 'esp'];
const REG32_TO_64 = {
  eax: 'rax', ebx: 'rbx', ecx: 'rcx', edx: 'rdx',
  esi: 'rsi', edi: 'rdi', ebp: 'rbp', esp: 'rsp'
};
const SIZES = { db: 1, dw: 2, dd: 4, dq: 8 };
const RESERVE_SIZES = { resb: 1, resw: 2, resd: 4, resq: 8 };
const SLOT = 8;
const MEM_SIZE = 0x2000;
const STACK_TOP = MEM_SIZE - SLOT;

const EXAMPLES = {
  basic: `; 서랍(레지스터)에 값 넣고 계산하기
mov rax, 5     ; rax에 5 넣어
add rax, 3     ; +3  -> 8
sub rax, 1     ; -1  -> 7`,

  jump: `; if / while 대신 점프로 반복하기
mov rcx, 5     ; 5번 셀 거야

repeat:
dec rcx        ; rcx 1 줄여
cmp rcx, 0     ; 0이랑 비교
jg repeat      ; 아직 0보다 크면 위로`,

  array: `; 배열 다 더하기 (C: for(i=0;i<5;i++) sum += arr[i])
arr dd 10, 20, 30, 40, 50

mov eax, 0            ; 합계 = 0
mov rbx, 0            ; i = 0

loop_start:
cmp rbx, 5            ; i가 5냐?
jge loop_end          ; 그럼 끝내
add eax, [arr+rbx*4]  ; 합계 += arr[i]
inc rbx               ; i++
jmp loop_start        ; 위로 다시

loop_end:`,

  stack: `; 접시 쌓기 - 나중에 넣은 걸 먼저 꺼낸다
mov rax, 111
mov rbx, 222

push rax
push rbx

mov rax, 0     ; 일부러 지워보기
mov rbx, 0

pop rbx        ; 222가 rbx로
pop rax        ; 111이 rax로`,

  func: `; 심부름 시키기 - call / ret
mov rdi, 5     ; "5 줄게" (첫 번째 인자는 rdi)
call my_func   ; "이거 처리해줘"
jmp done       ; 답은 rax에 들어있음

my_func:
mov rax, rdi   ; 받은 5
add rax, 10    ; +10 -> 15
ret            ; "답 여기 있어" 하고 돌아감

done:`,

  frame: `; 함수의 정형구 - 프롤로그 / 에필로그
push rbp        ; 책상 갖고 옴
mov rbp, rsp    ; 책상 놓음
sub rsp, 32     ; 작업 공간 확보

mov rax, 42
mov [rbp-8], rax  ; 지역변수에 저장
mov rbx, [rbp-8]  ; 다시 꺼내기

mov rsp, rbp    ; 공간 치움
pop rbp         ; 책상 치움`
};

class AsmError extends Error {}

function regWidth(token) {
  if (REG64.includes(token)) return 8;
  if (REG32.includes(token)) return 4;
  return 0;
}

function operandWidth(operands) {
  for (const op of operands) {
    const width = regWidth(op.trim());
    if (width) return width;
  }
  return 8;
}

class CPU {
  constructor() {
    this.regs = { rax: 0, rbx: 0, rcx: 0, rdx: 0, rsi: 0, rdi: 0, rbp: 0, rsp: STACK_TOP };
    this.memory = new Uint8Array(MEM_SIZE);
    this.labels = {};
    this.dataAddr = {};
    this.dataInfo = [];
    this.instructions = [];
    this.ip = 0;
    this.lastCmp = 0;
    this.halted = false;
  }

  readMem(addr, size) {
    let value = 0;
    for (let i = size - 1; i >= 0; i--) value = value * 256 + this.memory[addr + i];
    const limit = Math.pow(2, size * 8);
    return value >= limit / 2 ? value - limit : value;
  }

  writeMem(addr, size, value) {
    const limit = Math.pow(2, size * 8);
    let v = value < 0 ? value + limit : value;
    for (let i = 0; i < size; i++) {
      this.memory[addr + i] = v % 256;
      v = Math.floor(v / 256);
    }
  }

  // "arr + rbx*4", "rbp-8", "arr", "rbx" 같은 주소 계산
  resolveAddress(expr) {
    const terms = expr.replace(/\s+/g, '').match(/[+-]?[^+-]+/g);
    if (!terms) throw new AsmError(`주소 표현식을 이해할 수 없어요: [${expr}]`);

    let addr = 0;
    for (const term of terms) {
      let sign = 1;
      let body = term;
      if (body[0] === '+') body = body.slice(1);
      else if (body[0] === '-') { sign = -1; body = body.slice(1); }

      const [baseToken, scaleToken] = body.split('*');
      let value = this.valueOf(baseToken);
      if (scaleToken !== undefined) {
        const scale = parseInt(scaleToken, 10);
        if (Number.isNaN(scale)) throw new AsmError(`배수를 이해할 수 없어요: ${body}`);
        value *= scale;
      }
      addr += sign * value;
    }
    return addr;
  }

  valueOf(token) {
    if (/^-?\d+$/.test(token)) return parseInt(token, 10);
    if (REG64.includes(token)) return this.regs[token];
    if (REG32.includes(token)) return this.regs[REG32_TO_64[token]] & 0xFFFFFFFF;
    if (token in this.dataAddr) return this.dataAddr[token];
    throw new AsmError(`알 수 없는 레지스터/이름: ${token}`);
  }

  read(operand, size) {
    operand = operand.trim();
    if (operand.startsWith('[') && operand.endsWith(']')) {
      return this.readMem(this.resolveAddress(operand.slice(1, -1)), size);
    }
    return this.valueOf(operand);
  }

  write(operand, value, size) {
    operand = operand.trim();
    if (operand.startsWith('[') && operand.endsWith(']')) {
      this.writeMem(this.resolveAddress(operand.slice(1, -1)), size, value);
      return;
    }
    if (REG64.includes(operand)) {
      this.regs[operand] = value;
      return;
    }
    if (REG32.includes(operand)) {
      this.regs[REG32_TO_64[operand]] = value;
      return;
    }
    throw new AsmError(`${operand}에는 값을 쓸 수 없어요 (레지스터가 아니에요)`);
  }

  push(value) {
    this.regs.rsp -= SLOT;
    this.writeMem(this.regs.rsp, SLOT, value);
  }

  pop() {
    const value = this.readMem(this.regs.rsp, SLOT);
    this.regs.rsp += SLOT;
    return value;
  }

  labelIndex(name) {
    if (!(name in this.labels)) throw new AsmError(`레이블을 찾을 수 없어요: ${name}`);
    return this.labels[name];
  }

  step() {
    if (this.halted) return;
    if (this.ip >= this.instructions.length) { this.halted = true; return; }

    const { mnemonic, operands } = this.instructions[this.ip];
    const size = operandWidth(operands);
    const src = i => this.read(operands[i], size);
    const dst = value => this.write(operands[0], value, size);
    let nextIp = this.ip + 1;

    switch (mnemonic) {
      case 'mov': dst(src(1)); break;
      case 'add': dst(src(0) + src(1)); break;
      case 'sub': dst(src(0) - src(1)); break;
      case 'inc': dst(src(0) + 1); break;
      case 'dec': dst(src(0) - 1); break;
      case 'xor': dst(src(0) ^ src(1)); break;
      case 'and': dst(src(0) & src(1)); break;
      case 'or': dst(src(0) | src(1)); break;
      case 'cmp': this.lastCmp = src(0) - src(1); break;
      case 'jmp': nextIp = this.labelIndex(operands[0]); break;
      case 'je': case 'jz': if (this.lastCmp === 0) nextIp = this.labelIndex(operands[0]); break;
      case 'jne': case 'jnz': if (this.lastCmp !== 0) nextIp = this.labelIndex(operands[0]); break;
      case 'jg': if (this.lastCmp > 0) nextIp = this.labelIndex(operands[0]); break;
      case 'jl': if (this.lastCmp < 0) nextIp = this.labelIndex(operands[0]); break;
      case 'jge': if (this.lastCmp >= 0) nextIp = this.labelIndex(operands[0]); break;
      case 'jle': if (this.lastCmp <= 0) nextIp = this.labelIndex(operands[0]); break;
      case 'push': this.push(this.read(operands[0], SLOT)); break;
      case 'pop': this.write(operands[0], this.pop(), SLOT); break;
      case 'call': this.push(this.ip + 1); nextIp = this.labelIndex(operands[0]); break;
      case 'ret': nextIp = this.pop(); break;
      case 'nop': break;
      default: throw new AsmError(`지원하지 않는 명령어예요: ${mnemonic}`);
    }

    this.ip = nextIp;
    if (this.ip >= this.instructions.length) this.halted = true;
  }
}

function splitOperands(str) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function assemble(source) {
  const cpu = new CPU();
  const cleaned = source.split('\n').map((line, i) => ({
    text: line.split(';')[0].trim(),
    sourceLine: i
  }));

  let dataCursor = 0;
  const pending = [];

  for (const { text, sourceLine } of cleaned) {
    if (!text) continue;
    if (/^section\b/i.test(text)) continue;

    const dataMatch = text.match(/^(\w+):?\s+(db|dw|dd|dq)\s+(.+)$/i);
    if (dataMatch) {
      const [, label, directive, valuesStr] = dataMatch;
      const size = SIZES[directive.toLowerCase()];
      const values = valuesStr.split(',').map(v => parseInt(v.trim(), 10));
      if (values.some(Number.isNaN)) {
        throw new AsmError(`${label} 선언에 숫자가 아닌 값이 있어요`);
      }
      cpu.dataAddr[label] = dataCursor;
      cpu.dataInfo.push({ label, addr: dataCursor, count: values.length, size });
      for (const v of values) {
        cpu.writeMem(dataCursor, size, v);
        dataCursor += size;
      }
      continue;
    }

    const reserveMatch = text.match(/^(\w+):?\s+(resb|resw|resd|resq)\s+(\d+)$/i);
    if (reserveMatch) {
      const [, label, directive, countStr] = reserveMatch;
      const size = RESERVE_SIZES[directive.toLowerCase()];
      const count = parseInt(countStr, 10);
      cpu.dataAddr[label] = dataCursor;
      cpu.dataInfo.push({ label, addr: dataCursor, count, size });
      dataCursor += size * count;
      continue;
    }

    const labelOnly = text.match(/^(\w+):$/);
    if (labelOnly) {
      pending.push({ isLabel: true, name: labelOnly[1], sourceLine });
      continue;
    }

    const instrMatch = text.match(/^(\w+)\s*(.*)$/);
    if (!instrMatch) continue;
    pending.push({
      isLabel: false,
      mnemonic: instrMatch[1].toLowerCase(),
      operands: instrMatch[2] ? splitOperands(instrMatch[2]) : [],
      sourceLine
    });
  }

  for (const item of pending) {
    if (item.isLabel) cpu.labels[item.name] = cpu.instructions.length;
    else cpu.instructions.push(item);
  }

  return cpu;
}

let cpu = null;
let runTimer = null;

const el = id => document.getElementById(id);

function showError(message) {
  el('error').textContent = message;
}

function loadExample(name) {
  el('code').value = EXAMPLES[name];
  reset();
}

function reset() {
  stopRun();
  try {
    cpu = assemble(el('code').value);
    showError('');
  } catch (e) {
    cpu = null;
    showError(e.message);
  }
  render();
}

function step() {
  if (!cpu || cpu.halted) return;
  try {
    cpu.step();
  } catch (e) {
    showError(e.message);
    cpu.halted = true;
    stopRun();
  }
  render();
}

function stopRun() {
  if (runTimer) {
    clearInterval(runTimer);
    runTimer = null;
  }
  el('run-btn').textContent = '자동 실행';
}

function toggleRun() {
  if (runTimer) {
    stopRun();
    return;
  }
  if (!cpu || cpu.halted) return;
  el('run-btn').textContent = '정지';
  runTimer = setInterval(() => {
    if (!cpu || cpu.halted) {
      stopRun();
      return;
    }
    step();
  }, 350);
}

function render() {
  renderCode();
  renderRegisters();
  renderMemory();
  renderStack();
}

function renderCode() {
  const view = el('code-view');
  view.innerHTML = '';
  const current = cpu && !cpu.halted && cpu.instructions[cpu.ip]
    ? cpu.instructions[cpu.ip].sourceLine
    : -1;

  el('code').value.split('\n').forEach((line, i) => {
    const div = document.createElement('div');
    div.className = i === current ? 'line current' : 'line';
    div.textContent = `${String(i + 1).padStart(2, ' ')}  ${line}`;
    view.appendChild(div);
  });

  if (!cpu) el('status').textContent = '코드에 문제가 있어요';
  else if (cpu.halted) el('status').textContent = '실행 끝';
  else el('status').textContent = `다음 줄: ${current + 1}`;
}

function renderRegisters() {
  for (const reg of REG64) {
    el('reg-' + reg).textContent = cpu ? cpu.regs[reg] : 0;
  }
  el('flag-cmp').textContent = cpu ? cpu.lastCmp : 0;
}

function renderMemory() {
  const box = el('memory-view');
  box.innerHTML = '';
  if (!cpu || cpu.dataInfo.length === 0) {
    box.textContent = '(선언한 데이터 없음)';
    return;
  }
  for (const { label, addr, count, size } of cpu.dataInfo) {
    const values = [];
    for (let i = 0; i < count; i++) values.push(cpu.readMem(addr + i * size, size));
    const div = document.createElement('div');
    div.textContent = `${label} (주소 ${addr}) = [${values.join(', ')}]`;
    box.appendChild(div);
  }
}

function renderStack() {
  const box = el('stack-view');
  box.innerHTML = '';
  if (!cpu || cpu.regs.rsp >= STACK_TOP) {
    box.textContent = '(비어있음)';
    return;
  }
  for (let addr = cpu.regs.rsp; addr < STACK_TOP; addr += SLOT) {
    const div = document.createElement('div');
    div.textContent = `${addr === cpu.regs.rsp ? '▶ ' : '  '}[${addr}] = ${cpu.readMem(addr, SLOT)}`;
    box.appendChild(div);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  el('example-select').addEventListener('change', e => loadExample(e.target.value));
  el('reset-btn').addEventListener('click', reset);
  el('step-btn').addEventListener('click', step);
  el('run-btn').addEventListener('click', toggleRun);
  el('code').addEventListener('input', () => {
    stopRun();
    showError('코드가 바뀌었어요 - "리셋" 누르면 반영돼요');
  });
  loadExample('basic');
});
