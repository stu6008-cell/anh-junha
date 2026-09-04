'use strict';

// ---------------------------------------------------------------- 레지스터

const REG64 = [
  'rax', 'rbx', 'rcx', 'rdx', 'rsi', 'rdi', 'rbp', 'rsp',
  'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15'
];

// 이름 -> { base: 64비트 레지스터, size: 바이트, high: ah/bh/ch/dh 여부 }
const REG_INFO = {};
for (const name of REG64) REG_INFO[name] = { base: name, size: 8 };

const LEGACY_NAMES = {
  rax: ['eax', 'ax', 'al', 'ah'], rbx: ['ebx', 'bx', 'bl', 'bh'],
  rcx: ['ecx', 'cx', 'cl', 'ch'], rdx: ['edx', 'dx', 'dl', 'dh'],
  rsi: ['esi', 'si', 'sil'], rdi: ['edi', 'di', 'dil'],
  rbp: ['ebp', 'bp', 'bpl'], rsp: ['esp', 'sp', 'spl']
};
for (const [base, names] of Object.entries(LEGACY_NAMES)) {
  const sizes = [4, 2, 1, 1];
  names.forEach((name, i) => {
    REG_INFO[name] = { base, size: sizes[i], high: /^[abcd]h$/.test(name) };
  });
}
for (let i = 8; i <= 15; i++) {
  const base = 'r' + i;
  REG_INFO[base + 'd'] = { base, size: 4 };
  REG_INFO[base + 'w'] = { base, size: 2 };
  REG_INFO[base + 'b'] = { base, size: 1 };
}

const SIZE_KEYWORDS = { byte: 1, word: 2, dword: 4, qword: 8 };
const DATA_SIZES = { db: 1, dw: 2, dd: 4, dq: 8 };
const RESERVE_SIZES = { resb: 1, resw: 2, resd: 4, resq: 8 };

const MEM_SIZE = 0x4000;
const STACK_TOP = MEM_SIZE - 8;
const MAX_STEPS_PER_RUN = 200000;

// ---------------------------------------------------------------- 도우미

const mask = size => (1n << BigInt(size * 8)) - 1n;

function toSigned(value, size) {
  const bits = BigInt(size * 8);
  const m = (1n << bits) - 1n;
  const v = value & m;
  return v >> (bits - 1n) ? v - (1n << bits) : v;
}

function signBit(value, size) {
  return ((value >> BigInt(size * 8 - 1)) & 1n) === 1n;
}

function parity(value) {
  let bits = 0;
  let v = value & 0xFFn;
  while (v) { bits += Number(v & 1n); v >>= 1n; }
  return bits % 2 === 0;
}

// 플래그로 조건 판정 (jcc, setcc, cmovcc가 같이 씀)
const CONDITIONS = {
  e: f => f.zf, z: f => f.zf,
  ne: f => !f.zf, nz: f => !f.zf,
  s: f => f.sf, ns: f => !f.sf,
  o: f => f.of, no: f => !f.of,
  c: f => f.cf, b: f => f.cf, nae: f => f.cf,
  nc: f => !f.cf, ae: f => !f.cf, nb: f => !f.cf,
  be: f => f.cf || f.zf, na: f => f.cf || f.zf,
  a: f => !f.cf && !f.zf, nbe: f => !f.cf && !f.zf,
  l: f => f.sf !== f.of, nge: f => f.sf !== f.of,
  ge: f => f.sf === f.of, nl: f => f.sf === f.of,
  le: f => f.zf || f.sf !== f.of, ng: f => f.zf || f.sf !== f.of,
  g: f => !f.zf && f.sf === f.of, nle: f => !f.zf && f.sf === f.of,
  p: f => f.pf, pe: f => f.pf, np: f => !f.pf, po: f => !f.pf
};

class AsmError extends Error {}

// ---------------------------------------------------------------- CPU

class CPU {
  constructor() {
    this.regs = {};
    for (const name of REG64) this.regs[name] = 0n;
    this.regs.rsp = BigInt(STACK_TOP);
    this.memory = new Uint8Array(MEM_SIZE);
    this.flags = { zf: false, sf: false, cf: false, of: false, pf: false };
    this.labels = {};
    this.dataAddr = {};
    this.constants = {};
    this.dataInfo = [];
    this.instructions = [];
    this.ip = 0;
    this.halted = false;
    this.exitCode = null;
    this.output = '';
  }

  // ---- 레지스터

  readReg(name) {
    const info = REG_INFO[name];
    if (info.high) return (this.regs[info.base] >> 8n) & 0xFFn;
    return this.regs[info.base] & mask(info.size);
  }

  writeReg(name, value) {
    const info = REG_INFO[name];
    const v = value & mask(info.size);
    if (info.high) {
      this.regs[info.base] = (this.regs[info.base] & ~0xFF00n) | (v << 8n);
    } else if (info.size >= 4) {
      // 32비트 쓰기는 위쪽을 0으로 채운다 (진짜 x86-64가 그렇게 동작함)
      this.regs[info.base] = v;
    } else {
      this.regs[info.base] = (this.regs[info.base] & ~mask(info.size)) | v;
    }
  }

  // ---- 메모리

  checkAddr(addr, size) {
    if (addr < 0 || addr + size > MEM_SIZE) {
      throw new AsmError(`메모리 범위를 벗어났어요: 주소 ${addr}`);
    }
  }

  readMem(addr, size) {
    const a = Number(addr);
    this.checkAddr(a, size);
    let value = 0n;
    for (let i = size - 1; i >= 0; i--) value = (value << 8n) | BigInt(this.memory[a + i]);
    return value;
  }

  writeMem(addr, size, value) {
    const a = Number(addr);
    this.checkAddr(a, size);
    let v = value & mask(size);
    for (let i = 0; i < size; i++) {
      this.memory[a + i] = Number(v & 0xFFn);
      v >>= 8n;
    }
  }

  // ---- 피연산자

  // "arr + rbx*4", "rbp-8", "rsi", "arr" 같은 주소 계산
  resolveAddress(expr) {
    const terms = expr.replace(/\s+/g, '').match(/[+-]?[^+-]+/g);
    if (!terms) throw new AsmError(`주소 표현식을 이해할 수 없어요: [${expr}]`);

    let addr = 0n;
    for (const term of terms) {
      let sign = 1n;
      let body = term;
      if (body[0] === '+') body = body.slice(1);
      else if (body[0] === '-') { sign = -1n; body = body.slice(1); }

      const [baseToken, scaleToken] = body.split('*');
      let value = this.plainValue(baseToken);
      if (scaleToken !== undefined) {
        const scale = parseImmediate(scaleToken);
        if (scale === null) throw new AsmError(`배수를 이해할 수 없어요: ${body}`);
        value *= scale;
      }
      addr += sign * value;
    }
    return addr;
  }

  // 레지스터 값 / 상수 / 라벨 주소
  plainValue(token) {
    const imm = parseImmediate(token);
    if (imm !== null) return imm;
    if (REG_INFO[token]) return toSigned(this.readReg(token), REG_INFO[token].size);
    if (token in this.constants) return this.constants[token];
    if (token in this.dataAddr) return BigInt(this.dataAddr[token]);
    throw new AsmError(`알 수 없는 이름이에요: ${token}`);
  }

  read(operand, size) {
    const op = parseOperand(operand);
    if (op.kind === 'mem') return this.readMem(this.resolveAddress(op.expr), op.size || size);
    if (op.kind === 'reg') return this.readReg(op.name);
    return this.plainValue(op.text) & mask(size);
  }

  write(operand, value, size) {
    const op = parseOperand(operand);
    if (op.kind === 'mem') {
      this.writeMem(this.resolveAddress(op.expr), op.size || size, value);
      return;
    }
    if (op.kind === 'reg') {
      this.writeReg(op.name, value);
      return;
    }
    throw new AsmError(`${operand}에는 값을 쓸 수 없어요`);
  }

  // ---- 플래그를 세우는 연산들

  setLogicFlags(result, size) {
    this.flags.cf = false;
    this.flags.of = false;
    this.flags.zf = (result & mask(size)) === 0n;
    this.flags.sf = signBit(result, size);
    this.flags.pf = parity(result);
    return result & mask(size);
  }

  doAdd(a, b, size, carry = 0n) {
    const m = mask(size);
    const raw = (a & m) + (b & m) + carry;
    const res = raw & m;
    this.flags.cf = raw > m;
    this.flags.zf = res === 0n;
    this.flags.sf = signBit(res, size);
    const sa = signBit(a, size), sb = signBit(b, size), sr = this.flags.sf;
    this.flags.of = sa === sb && sr !== sa;
    this.flags.pf = parity(res);
    return res;
  }

  doSub(a, b, size, borrow = 0n) {
    const m = mask(size);
    const av = a & m, bv = (b & m) + borrow;
    const res = (av - bv) & m;
    this.flags.cf = av < bv;
    this.flags.zf = res === 0n;
    this.flags.sf = signBit(res, size);
    const sa = signBit(av, size), sb = signBit(b & m, size), sr = this.flags.sf;
    this.flags.of = sa !== sb && sr !== sa;
    this.flags.pf = parity(res);
    return res;
  }

  // inc/dec는 CF를 건드리지 않는다
  doIncDec(value, size, delta) {
    const cf = this.flags.cf;
    const result = delta > 0n ? this.doAdd(value, 1n, size) : this.doSub(value, 1n, size);
    this.flags.cf = cf;
    return result;
  }

  push(value) {
    this.regs.rsp -= 8n;
    this.writeMem(this.regs.rsp, 8, value);
  }

  pop() {
    const value = this.readMem(this.regs.rsp, 8);
    this.regs.rsp += 8n;
    return value;
  }

  labelIndex(name) {
    if (!(name in this.labels)) throw new AsmError(`레이블을 찾을 수 없어요: ${name}`);
    return this.labels[name];
  }

  syscall() {
    const number = this.regs.rax;
    if (number === 1n) {                       // write(fd, buf, count)
      const addr = Number(this.regs.rsi);
      const count = Number(this.regs.rdx);
      let text = '';
      for (let i = 0; i < count; i++) text += String.fromCharCode(this.memory[addr + i]);
      this.output += text;
      this.regs.rax = BigInt(count);
    } else if (number === 60n) {               // exit(code)
      this.exitCode = Number(toSigned(this.regs.rdi, 8));
      this.halted = true;
    } else {
      throw new AsmError(`지원하지 않는 syscall 번호예요: ${number} (1=write, 60=exit만 돼요)`);
    }
  }

  step() {
    if (this.halted) return;
    if (this.ip >= this.instructions.length) { this.halted = true; return; }

    const { mnemonic, operands } = this.instructions[this.ip];
    const size = this.operandSize(operands);
    let nextIp = this.ip + 1;

    const src = i => this.read(operands[i], size);
    const dst = value => this.write(operands[0], value, size);
    const jumpIf = cond => { if (cond) nextIp = this.labelIndex(operands[0]); };

    switch (mnemonic) {
      // 옮기기
      case 'mov': dst(src(1)); break;
      case 'movzx': dst(this.read(operands[1], this.sourceSize(operands[1], 1))); break;
      case 'movsx': {
        const srcSize = this.sourceSize(operands[1], 1);
        dst(toSigned(this.read(operands[1], srcSize), srcSize) & mask(size));
        break;
      }
      case 'lea': dst(this.resolveAddress(parseOperand(operands[1]).expr)); break;
      case 'xchg': {
        const a = src(0), b = src(1);
        dst(b);
        this.write(operands[1], a, size);
        break;
      }
      case 'push': this.push(this.read(operands[0], 8)); break;
      case 'pop': this.write(operands[0], this.pop(), 8); break;

      // 더하고 빼고
      case 'add': dst(this.doAdd(src(0), src(1), size)); break;
      case 'adc': dst(this.doAdd(src(0), src(1), size, this.flags.cf ? 1n : 0n)); break;
      case 'sub': dst(this.doSub(src(0), src(1), size)); break;
      case 'sbb': dst(this.doSub(src(0), src(1), size, this.flags.cf ? 1n : 0n)); break;
      case 'inc': dst(this.doIncDec(src(0), size, 1n)); break;
      case 'dec': dst(this.doIncDec(src(0), size, -1n)); break;
      case 'neg': dst(this.doSub(0n, src(0), size)); break;
      case 'cmp': this.doSub(src(0), src(1), size); break;

      // 곱하고 나누고
      case 'mul': case 'imul': this.multiply(mnemonic, operands, size); break;
      case 'div': case 'idiv': this.divide(mnemonic, operands, size); break;
      case 'cqo': this.regs.rdx = toSigned(this.regs.rax, 8) < 0n ? mask(8) : 0n; break;
      case 'cdq': this.writeReg('edx', toSigned(this.readReg('eax'), 4) < 0n ? 0xFFFFFFFFn : 0n); break;

      // 비트
      case 'and': dst(this.setLogicFlags(src(0) & src(1), size)); break;
      case 'or': dst(this.setLogicFlags(src(0) | src(1), size)); break;
      case 'xor': dst(this.setLogicFlags(src(0) ^ src(1), size)); break;
      case 'not': dst(~src(0) & mask(size)); break;
      case 'test': this.setLogicFlags(src(0) & src(1), size); break;
      case 'shl': case 'sal': case 'shr': case 'sar': case 'rol': case 'ror':
        dst(this.shift(mnemonic, src(0), src(1), size));
        break;

      // 흐름 제어
      case 'jmp': nextIp = this.labelIndex(operands[0]); break;
      case 'call': this.push(BigInt(this.ip + 1)); nextIp = this.labelIndex(operands[0]); break;
      case 'ret': nextIp = Number(this.pop()); break;
      case 'leave': this.regs.rsp = this.regs.rbp; this.regs.rbp = this.pop(); break;
      case 'loop': {
        this.regs.rcx -= 1n;
        jumpIf(this.regs.rcx !== 0n);
        break;
      }
      case 'nop': break;
      case 'hlt': this.halted = true; break;
      case 'syscall': this.syscall(); break;

      default: {
        const jcc = mnemonic.match(/^j(\w+)$/);
        if (jcc && CONDITIONS[jcc[1]]) { jumpIf(CONDITIONS[jcc[1]](this.flags)); break; }

        const setcc = mnemonic.match(/^set(\w+)$/);
        if (setcc && CONDITIONS[setcc[1]]) {
          this.write(operands[0], CONDITIONS[setcc[1]](this.flags) ? 1n : 0n, 1);
          break;
        }

        const cmov = mnemonic.match(/^cmov(\w+)$/);
        if (cmov && CONDITIONS[cmov[1]]) {
          if (CONDITIONS[cmov[1]](this.flags)) dst(src(1));
          break;
        }

        throw new AsmError(`지원하지 않는 명령어예요: ${mnemonic}`);
      }
    }

    this.ip = nextIp;
    if (this.ip >= this.instructions.length) this.halted = true;
  }

  multiply(mnemonic, operands, size) {
    const signed = mnemonic === 'imul';

    if (operands.length === 1) {
      const acc = signed ? toSigned(this.readReg('rax') & mask(size), size) : this.readReg('rax') & mask(size);
      const other = signed
        ? toSigned(this.read(operands[0], size), size)
        : this.read(operands[0], size);
      const product = acc * other;
      const bits = BigInt(size * 8);
      this.write(sizedName('rax', size), product & mask(size), size);
      this.write(sizedName('rdx', size), (product >> bits) & mask(size), size);
      const overflow = (product >> bits) !== 0n && (!signed || (product >> bits) !== -1n);
      this.flags.cf = this.flags.of = overflow;
      return;
    }

    const a = toSigned(this.read(operands[operands.length - 2], size), size);
    const b = toSigned(this.read(operands[operands.length - 1], size), size);
    const product = a * b;
    this.write(operands[0], product & mask(size), size);
    this.flags.cf = this.flags.of = toSigned(product & mask(size), size) !== product;
  }

  divide(mnemonic, operands, size) {
    const signed = mnemonic === 'idiv';
    const bits = BigInt(size * 8);
    const low = this.readReg(sizedName('rax', size));
    const high = this.readReg(sizedName('rdx', size));
    const raw = (high << bits) | low;
    const dividend = signed ? toSigned(raw, size * 2) : raw;
    const divisorRaw = this.read(operands[0], size);
    const divisor = signed ? toSigned(divisorRaw, size) : divisorRaw;

    if (divisor === 0n) throw new AsmError('0으로 나눌 수 없어요');

    let quotient = dividend / divisor;
    let remainder = dividend % divisor;
    if (!signed && quotient > mask(size)) throw new AsmError('몫이 너무 커서 넘쳤어요');

    this.write(sizedName('rax', size), quotient & mask(size), size);
    this.write(sizedName('rdx', size), remainder & mask(size), size);
  }

  shift(mnemonic, value, amountRaw, size) {
    const bits = BigInt(size * 8);
    const amount = amountRaw & 63n;
    const m = mask(size);
    const v = value & m;
    if (amount === 0n) return v;

    let result;
    switch (mnemonic) {
      case 'shl': case 'sal':
        result = (v << amount) & m;
        this.flags.cf = ((v >> (bits - amount)) & 1n) === 1n;
        break;
      case 'shr':
        result = v >> amount;
        this.flags.cf = ((v >> (amount - 1n)) & 1n) === 1n;
        break;
      case 'sar':
        result = (toSigned(v, size) >> amount) & m;
        this.flags.cf = ((v >> (amount - 1n)) & 1n) === 1n;
        break;
      case 'rol': {
        const r = amount % bits;
        result = ((v << r) | (v >> (bits - r))) & m;
        break;
      }
      case 'ror': {
        const r = amount % bits;
        result = ((v >> r) | (v << (bits - r))) & m;
        break;
      }
    }
    this.flags.zf = result === 0n;
    this.flags.sf = signBit(result, size);
    this.flags.pf = parity(result);
    return result;
  }

  // 피연산자에서 크기를 알아낸다: 레지스터 폭 > byte/word/dword/qword 표기 > 기본 8
  operandSize(operands) {
    for (const operand of operands) {
      const op = parseOperand(operand);
      if (op.kind === 'reg') return REG_INFO[op.name].size;
      if (op.kind === 'mem' && op.size) return op.size;
    }
    return 8;
  }

  sourceSize(operand, fallback) {
    const op = parseOperand(operand);
    if (op.kind === 'reg') return REG_INFO[op.name].size;
    if (op.kind === 'mem' && op.size) return op.size;
    return fallback;
  }
}

function sizedName(reg64, size) {
  if (size === 8) return reg64;
  const names = LEGACY_NAMES[reg64];
  if (size === 4) return names[0];
  if (size === 2) return names[1];
  return names[2];
}

// ---------------------------------------------------------------- 파싱

function parseImmediate(token) {
  const text = token.trim();
  if (/^-?0x[0-9a-f]+$/i.test(text)) return BigInt(text.replace('-0x', '0x')) * (text[0] === '-' ? -1n : 1n);
  if (/^-?0b[01]+$/i.test(text)) return BigInt(text.replace('-0b', '0b')) * (text[0] === '-' ? -1n : 1n);
  if (/^-?\d+$/.test(text)) return BigInt(text);
  if (/^'.'$/.test(text)) return BigInt(text.charCodeAt(1));
  return null;
}

function parseOperand(operand) {
  let text = operand.trim();
  let size = 0;

  const sizeMatch = text.match(/^(byte|word|dword|qword)\s+(.*)$/i);
  if (sizeMatch) {
    size = SIZE_KEYWORDS[sizeMatch[1].toLowerCase()];
    text = sizeMatch[2].trim();
  }

  if (text.startsWith('[') && text.endsWith(']')) {
    return { kind: 'mem', expr: text.slice(1, -1), size };
  }
  if (REG_INFO[text]) return { kind: 'reg', name: text };
  return { kind: 'imm', text };
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

// 문자열 안의 쉼표는 자르지 않는다: db "a,b", 10
function splitDataValues(str) {
  const parts = [];
  let current = '';
  let quote = '';
  for (const ch of str) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ',') {
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
    text: stripComment(line).trim(),
    sourceLine: i
  }));

  let cursor = 0;
  const pending = [];

  for (const { text, sourceLine } of cleaned) {
    if (!text) continue;
    if (/^(section|segment|global|extern|bits|default)\b/i.test(text)) continue;

    const equMatch = text.match(/^(\w+)\s+equ\s+(.+)$/i);
    if (equMatch) {
      cpu.constants[equMatch[1]] = evaluateConstant(equMatch[2], cpu, cursor);
      continue;
    }

    const dataMatch = text.match(/^(\w+):?\s+(db|dw|dd|dq)\s+(.+)$/i);
    if (dataMatch) {
      const [, label, directive, valuesText] = dataMatch;
      const size = DATA_SIZES[directive.toLowerCase()];
      cpu.dataAddr[label] = cursor;
      const start = cursor;
      let count = 0;

      for (const value of splitDataValues(valuesText)) {
        if (/^["'].*["']$/.test(value) && value.length > 2) {
          for (const ch of value.slice(1, -1)) {
            cpu.writeMem(cursor, size, BigInt(ch.charCodeAt(0)));
            cursor += size;
            count++;
          }
          continue;
        }
        const num = parseImmediate(value) ?? (value in cpu.constants ? cpu.constants[value] : null);
        if (num === null) throw new AsmError(`${label} 선언의 값을 이해할 수 없어요: ${value}`);
        cpu.writeMem(cursor, size, num);
        cursor += size;
        count++;
      }
      cpu.dataInfo.push({ label, addr: start, count, size, isText: /^["']/.test(splitDataValues(valuesText)[0]) });
      continue;
    }

    const reserveMatch = text.match(/^(\w+):?\s+(resb|resw|resd|resq)\s+(\d+)$/i);
    if (reserveMatch) {
      const [, label, directive, countText] = reserveMatch;
      const size = RESERVE_SIZES[directive.toLowerCase()];
      const count = parseInt(countText, 10);
      cpu.dataAddr[label] = cursor;
      cpu.dataInfo.push({ label, addr: cursor, count, size, isText: false });
      cursor += size * count;
      continue;
    }

    const labelOnly = text.match(/^(\w+):$/);
    if (labelOnly) {
      pending.push({ isLabel: true, name: labelOnly[1], sourceLine });
      continue;
    }

    // 레이블과 명령어가 한 줄에 있는 경우: "start: mov rax, 1"
    const labelWithCode = text.match(/^(\w+):\s+(.*)$/);
    if (labelWithCode) {
      pending.push({ isLabel: true, name: labelWithCode[1], sourceLine });
      pending.push(makeInstruction(labelWithCode[2], sourceLine));
      continue;
    }

    pending.push(makeInstruction(text, sourceLine));
  }

  for (const item of pending) {
    if (!item) continue;
    if (item.isLabel) cpu.labels[item.name] = cpu.instructions.length;
    else cpu.instructions.push(item);
  }

  return cpu;
}

function makeInstruction(text, sourceLine) {
  const match = text.match(/^(\w+)\s*(.*)$/);
  if (!match) return null;
  return {
    isLabel: false,
    mnemonic: match[1].toLowerCase(),
    operands: match[2] ? splitOperands(match[2]) : [],
    sourceLine
  };
}

function stripComment(line) {
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) { if (ch === quote) quote = ''; }
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ';') return line.slice(0, i);
  }
  return line;
}

// "$ - msg", "16" 같은 상수식
function evaluateConstant(expr, cpu, cursor) {
  const terms = expr.replace(/\s+/g, '').match(/[+-]?[^+-]+/g) || [];
  let total = 0n;
  for (const term of terms) {
    let sign = 1n;
    let body = term;
    if (body[0] === '+') body = body.slice(1);
    else if (body[0] === '-') { sign = -1n; body = body.slice(1); }

    let value;
    if (body === '$') value = BigInt(cursor);
    else if (body in cpu.dataAddr) value = BigInt(cpu.dataAddr[body]);
    else if (body in cpu.constants) value = cpu.constants[body];
    else {
      value = parseImmediate(body);
      if (value === null) throw new AsmError(`상수를 이해할 수 없어요: ${body}`);
    }
    total += sign * value;
  }
  return total;
}

// ---------------------------------------------------------------- 예제

const EXAMPLES = {
  basic: `; 서랍(레지스터)에 값 넣고 계산하기
mov rax, 5     ; rax에 5 넣어
add rax, 3     ; +3  -> 8
sub rax, 1     ; -1  -> 7`,

  jump: `; if / while 대신 점프로 반복하기
mov rcx, 5     ; 5번 셀 거야

repeat:
dec rcx        ; rcx 1 줄여 (플래그가 세워짐)
jnz repeat     ; 0이 아니면 위로 다시`,

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

leave           ; 책상 치우기 (mov rsp,rbp + pop rbp)`,

  muldiv: `; 곱하기 / 나누기 - 결과가 rax, 나머지가 rdx
mov rax, 100
mov rbx, 7

mul rbx        ; rax = 100 * 7 = 700

mov rdx, 0     ; 나누기 전엔 rdx를 비워야 함
mov rbx, 3
div rbx        ; rax = 700/3 = 233, rdx = 나머지 1`,

  bits: `; 비트 다루기
mov rax, 5     ; 0b101

shl rax, 3     ; 왼쪽으로 3칸 -> 40 (x8)
shr rax, 1     ; 오른쪽으로 1칸 -> 20 (x0.5)

xor rbx, rbx   ; rbx = 0 (제일 빠른 0 만들기)
not rbx        ; 전부 뒤집기 -> -1
and rbx, 0xFF  ; 아래 8비트만 남기기 -> 255`,

  hello: `; 화면에 글자 찍기 (리눅스 syscall)
msg db "Hello, Assembly!", 10
len equ $ - msg

mov rax, 1     ; 1번 = write
mov rdi, 1     ; 1번 = 화면
mov rsi, msg   ; 글자 위치
mov rdx, len   ; 길이
syscall        ; 실행!

mov rax, 60    ; 60번 = exit
mov rdi, 0     ; 정상 종료
syscall`
};

// ---------------------------------------------------------------- 화면

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

function runToEnd() {
  if (!cpu || cpu.halted) return;
  stopRun();
  try {
    let steps = 0;
    while (!cpu.halted && steps < MAX_STEPS_PER_RUN) {
      cpu.step();
      steps++;
    }
    if (steps >= MAX_STEPS_PER_RUN) {
      showError('너무 오래 걸려서 멈췄어요 (무한 루프?)');
      cpu.halted = true;
    }
  } catch (e) {
    showError(e.message);
    cpu.halted = true;
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
  renderFlags();
  renderMemory();
  renderStack();
  renderOutput();
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
  else if (cpu.halted) el('status').textContent = cpu.exitCode === null ? '실행 끝' : `실행 끝 (exit ${cpu.exitCode})`;
  else el('status').textContent = `다음 줄: ${current + 1}`;
}

function renderRegisters() {
  const box = el('register-view');
  box.innerHTML = '';
  const table = document.createElement('table');
  for (let i = 0; i < 8; i++) {
    const row = document.createElement('tr');
    for (const name of [REG64[i], REG64[i + 8]]) {
      const value = cpu ? toSigned(cpu.regs[name], 8) : 0n;
      const label = document.createElement('td');
      label.textContent = name;
      const cell = document.createElement('td');
      cell.className = 'val';
      cell.textContent = value.toString();
      row.append(label, cell);
    }
    table.appendChild(row);
  }
  box.appendChild(table);
}

function renderFlags() {
  const flags = cpu ? cpu.flags : { zf: false, sf: false, cf: false, of: false, pf: false };
  el('flags-view').innerHTML = '';
  for (const [name, key] of [['ZF', 'zf'], ['SF', 'sf'], ['CF', 'cf'], ['OF', 'of'], ['PF', 'pf']]) {
    const span = document.createElement('span');
    span.className = flags[key] ? 'flag on' : 'flag';
    span.textContent = `${name}=${flags[key] ? 1 : 0}`;
    el('flags-view').appendChild(span);
  }
}

function renderMemory() {
  const box = el('memory-view');
  box.innerHTML = '';
  if (!cpu || cpu.dataInfo.length === 0) {
    box.textContent = '(선언한 데이터 없음)';
    return;
  }
  for (const { label, addr, count, size, isText } of cpu.dataInfo) {
    const values = [];
    for (let i = 0; i < count; i++) values.push(toSigned(cpu.readMem(addr + i * size, size), size));
    const div = document.createElement('div');
    const shown = isText
      ? '"' + values.map(v => String.fromCharCode(Number(v))).join('').replace(/\n/g, '\\n') + '"'
      : '[' + values.join(', ') + ']';
    div.textContent = `${label} (주소 ${addr}) = ${shown}`;
    box.appendChild(div);
  }
}

function renderStack() {
  const box = el('stack-view');
  box.innerHTML = '';
  const rsp = cpu ? Number(cpu.regs.rsp) : STACK_TOP;
  if (!cpu || rsp >= STACK_TOP) {
    box.textContent = '(비어있음)';
    return;
  }
  for (let addr = rsp; addr < STACK_TOP; addr += 8) {
    const div = document.createElement('div');
    div.textContent = `${addr === rsp ? '▶ ' : '  '}[${addr}] = ${toSigned(cpu.readMem(addr, 8), 8)}`;
    box.appendChild(div);
  }
}

function renderOutput() {
  el('output-view').textContent = cpu && cpu.output ? cpu.output : '(아직 출력 없음)';
}

window.addEventListener('DOMContentLoaded', () => {
  el('example-select').addEventListener('change', e => loadExample(e.target.value));
  el('reset-btn').addEventListener('click', reset);
  el('step-btn').addEventListener('click', step);
  el('run-btn').addEventListener('click', toggleRun);
  el('finish-btn').addEventListener('click', runToEnd);
  el('code').addEventListener('input', () => {
    stopRun();
    showError('코드가 바뀌었어요 - "리셋" 누르면 반영돼요');
  });
  loadExample('basic');
});
