'use strict';

const REG_NAMES = ['ax', 'bx', 'cx', 'dx', 'si', 'di', 'bp', 'sp'];
const MEM_SIZE = 0x2000;
const STACK_TOP = MEM_SIZE - 2;

const EXAMPLES = {
  basic: `; 서랍(레지스터)에 값 넣고 계산하기
mov ax, 5     ; ax에 5 넣어
add ax, 3     ; +3  -> 8
sub ax, 1     ; -1  -> 7`,

  jump: `; if / while 대신 점프로 반복하기
mov cx, 5     ; 5번 셀 거야

repeat:
dec cx        ; cx 1 줄여
cmp cx, 0     ; 0이랑 비교
jg repeat     ; 아직 0보다 크면 위로`,

  array: `; 배열 다 더하기 (C: for(i=0;i<5;i++) sum += arr[i])
arr dw 10, 20, 30, 40, 50

mov ax, 0        ; 합계
mov bx, 0        ; 오프셋(바이트)
mov cx, 0        ; i

loop_start:
cmp cx, 5
jge loop_end
add ax, [arr+bx] ; 합계 += arr[i]
add bx, 2        ; 다음 칸 (word = 2바이트)
inc cx
jmp loop_start

loop_end:`,

  stack: `; 접시 쌓기 - 나중에 넣은 걸 먼저 꺼낸다
mov ax, 111
mov bx, 222

push ax
push bx

mov ax, 0     ; 일부러 지워보기
mov bx, 0

pop bx        ; 222가 bx로
pop ax        ; 111이 ax로`,

  func: `; 심부름 시키기 - call / ret
mov ax, 5     ; "5 줄게"
call my_func  ; "이거 처리해줘"
jmp done      ; 답은 ax에 들어있음

my_func:
add ax, 10    ; +10 -> 15
ret           ; 돌아감

done:`,

  frame: `; 함수의 정형구 - 프롤로그 / 에필로그
push bp        ; 책상 갖고 옴
mov bp, sp     ; 책상 놓음
sub sp, 4      ; 작업 공간 확보

mov ax, 42
mov [bp-2], ax ; 지역변수에 저장
mov bx, [bp-2] ; 다시 꺼내기

mov sp, bp     ; 공간 치움
pop bp         ; 책상 치움`
};

function toSigned16(v) {
  v &= 0xFFFF;
  return v >= 0x8000 ? v - 0x10000 : v;
}

class AsmError extends Error {}

class CPU {
  constructor() {
    this.regs = { ax: 0, bx: 0, cx: 0, dx: 0, si: 0, di: 0, bp: 0, sp: STACK_TOP };
    this.memory = new Uint8Array(MEM_SIZE);
    this.labels = {};
    this.dataAddr = {};
    this.dataInfo = [];
    this.instructions = [];
    this.ip = 0;
    this.lastCmp = 0;
    this.halted = false;
  }

  readWord(addr) {
    return this.memory[addr] | (this.memory[addr + 1] << 8);
  }

  writeWord(addr, value) {
    value &= 0xFFFF;
    this.memory[addr] = value & 0xFF;
    this.memory[addr + 1] = (value >> 8) & 0xFF;
  }

  resolveAddress(expr) {
    const m = expr.match(/^([A-Za-z_]\w*|\d+)([+-][A-Za-z_]\w*|[+-]\d+)?$/);
    if (!m) throw new AsmError(`주소 표현식을 이해할 수 없어요: [${expr}]`);
    let base = this.valueOf(m[1]);
    if (m[2]) {
      const sign = m[2][0] === '-' ? -1 : 1;
      base += sign * this.valueOf(m[2].slice(1));
    }
    return base & 0xFFFF;
  }

  valueOf(token) {
    if (/^-?\d+$/.test(token)) return parseInt(token, 10);
    if (REG_NAMES.includes(token)) return this.regs[token];
    if (token in this.dataAddr) return this.dataAddr[token];
    throw new AsmError(`알 수 없는 레지스터/이름: ${token}`);
  }

  read(operand) {
    operand = operand.trim();
    if (operand.startsWith('[') && operand.endsWith(']')) {
      return this.readWord(this.resolveAddress(operand.slice(1, -1).trim()));
    }
    return this.valueOf(operand);
  }

  write(operand, value) {
    operand = operand.trim();
    value &= 0xFFFF;
    if (operand.startsWith('[') && operand.endsWith(']')) {
      this.writeWord(this.resolveAddress(operand.slice(1, -1).trim()), value);
      return;
    }
    if (!REG_NAMES.includes(operand)) {
      throw new AsmError(`${operand}에는 값을 쓸 수 없어요 (레지스터가 아니에요)`);
    }
    this.regs[operand] = value;
  }

  push(value) {
    this.regs.sp = (this.regs.sp - 2) & 0xFFFF;
    this.writeWord(this.regs.sp, value);
  }

  pop() {
    const value = this.readWord(this.regs.sp);
    this.regs.sp = (this.regs.sp + 2) & 0xFFFF;
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
    let nextIp = this.ip + 1;

    switch (mnemonic) {
      case 'mov': this.write(operands[0], this.read(operands[1])); break;
      case 'add': this.write(operands[0], this.read(operands[0]) + this.read(operands[1])); break;
      case 'sub': this.write(operands[0], this.read(operands[0]) - this.read(operands[1])); break;
      case 'inc': this.write(operands[0], this.read(operands[0]) + 1); break;
      case 'dec': this.write(operands[0], this.read(operands[0]) - 1); break;
      case 'xor': this.write(operands[0], this.read(operands[0]) ^ this.read(operands[1])); break;
      case 'and': this.write(operands[0], this.read(operands[0]) & this.read(operands[1])); break;
      case 'or': this.write(operands[0], this.read(operands[0]) | this.read(operands[1])); break;
      case 'cmp': this.lastCmp = toSigned16(this.read(operands[0]) - this.read(operands[1])); break;
      case 'jmp': nextIp = this.labelIndex(operands[0]); break;
      case 'je': case 'jz': if (this.lastCmp === 0) nextIp = this.labelIndex(operands[0]); break;
      case 'jne': case 'jnz': if (this.lastCmp !== 0) nextIp = this.labelIndex(operands[0]); break;
      case 'jg': if (this.lastCmp > 0) nextIp = this.labelIndex(operands[0]); break;
      case 'jl': if (this.lastCmp < 0) nextIp = this.labelIndex(operands[0]); break;
      case 'jge': if (this.lastCmp >= 0) nextIp = this.labelIndex(operands[0]); break;
      case 'jle': if (this.lastCmp <= 0) nextIp = this.labelIndex(operands[0]); break;
      case 'push': this.push(this.read(operands[0])); break;
      case 'pop': this.write(operands[0], this.pop()); break;
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

    const dataMatch = text.match(/^(\w+):?\s+(db|dw)\s+(.+)$/i);
    if (dataMatch) {
      const [, label, size, valuesStr] = dataMatch;
      const isWord = size.toLowerCase() === 'dw';
      const values = valuesStr.split(',').map(v => parseInt(v.trim(), 10));
      if (values.some(Number.isNaN)) {
        throw new AsmError(`${label} 선언에 숫자가 아닌 값이 있어요`);
      }
      cpu.dataAddr[label] = dataCursor;
      cpu.dataInfo.push({ label, addr: dataCursor, count: values.length, isWord });
      for (const v of values) {
        if (isWord) cpu.writeWord(dataCursor, v);
        else cpu.memory[dataCursor] = v & 0xFF;
        dataCursor += isWord ? 2 : 1;
      }
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
  for (const reg of REG_NAMES) {
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
  for (const { label, addr, count, isWord } of cpu.dataInfo) {
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(isWord ? cpu.readWord(addr + i * 2) : cpu.memory[addr + i]);
    }
    const div = document.createElement('div');
    div.textContent = `${label} (주소 ${addr}) = [${values.join(', ')}]`;
    box.appendChild(div);
  }
}

function renderStack() {
  const box = el('stack-view');
  box.innerHTML = '';
  if (!cpu || cpu.regs.sp >= STACK_TOP) {
    box.textContent = '(비어있음)';
    return;
  }
  for (let addr = cpu.regs.sp; addr < STACK_TOP; addr += 2) {
    const div = document.createElement('div');
    div.textContent = `${addr === cpu.regs.sp ? '▶ ' : '  '}[${addr}] = ${cpu.readWord(addr)}`;
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
