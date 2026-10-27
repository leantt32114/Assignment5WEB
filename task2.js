'use strict';

// ===== Constants =====
const MAX_SAVED = 3;     // how many builds can be saved
const HEADROOM = 100;    // watts the power supply must have above the parts' need
const CATEGORIES = ['cpu', 'motherboard', 'ram', 'gpu', 'psu'];
const LABELS = { cpu: 'Processor', motherboard: 'Motherboard', ram: 'Memory', gpu: 'Graphics card', psu: 'Power supply' };

// ===== Data: the page is built from this array (watts = power used; for a PSU = power given) =====
const parts = [
  { id: 1, category: 'cpu', name: 'Ryzen 7 7800X3D', price: 380, watts: 120, socket: 'AM5', inStock: true, tags: ['gaming', '8 cores'] },
  { id: 2, category: 'cpu', name: 'Ryzen 5 7600', price: 200, watts: 65, socket: 'AM5', inStock: false, tags: ['budget', '6 cores'] },
  { id: 3, category: 'cpu', name: 'Core i5-13400F', price: 190, watts: 65, socket: 'LGA1700', inStock: true, tags: ['budget', '10 cores'] },
  { id: 4, category: 'motherboard', name: 'B650 Gaming WiFi', price: 160, watts: 40, socket: 'AM5', memory: 'DDR5', inStock: true, tags: ['ATX', 'wifi'] },
  { id: 5, category: 'motherboard', name: 'B760M Pro', price: 110, watts: 35, socket: 'LGA1700', memory: 'DDR4', inStock: true, tags: ['micro-ATX', 'budget'] },
  { id: 6, category: 'motherboard', name: 'Z790 Gaming', price: 230, watts: 45, socket: 'LGA1700', memory: 'DDR5', inStock: true, tags: ['ATX', 'overclock'] },
  { id: 7, category: 'ram', name: '32 GB DDR5-6000', price: 110, watts: 10, memory: 'DDR5', inStock: true, tags: ['gaming', '2x16 GB'] },
  { id: 8, category: 'ram', name: '16 GB DDR4-3200', price: 45, watts: 8, memory: 'DDR4', inStock: true, tags: ['budget', '2x8 GB'] },
  { id: 9, category: 'gpu', name: 'Radeon RX 9070', price: 600, watts: 220, inStock: true, tags: ['gaming', '16 GB'] },
  { id: 10, category: 'gpu', name: 'GeForce RTX 4060', price: 300, watts: 115, inStock: true, tags: ['budget', '8 GB'] },
  { id: 11, category: 'psu', name: '450 W Bronze', price: 45, watts: 450, inStock: true, tags: ['budget'] },
  { id: 12, category: 'psu', name: '650 W Gold', price: 80, watts: 650, inStock: true, tags: ['quiet'] },
  { id: 13, category: 'psu', name: '850 W Gold', price: 130, watts: 850, inStock: true, tags: ['high power'] },
];

// ===== Page elements =====
const budgetInput = document.getElementById('budget');
const searchInput = document.getElementById('search');
const partsBox = document.getElementById('parts');
const buildBox = document.getElementById('build');
const savedBox = document.getElementById('saved');
const noteBox = document.getElementById('note');
const saveBtn = document.getElementById('save');

// ===== State: change it first, then call render() =====
let selected = {};   // category -> chosen part
let saved = [];      // saved builds: { parts, price, watts }
let budget = Number(budgetInput.value);
let query = '';
let note = { text: 'Pick one part in every category.', kind: 'muted' };

// ===== Helpers =====
function el(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}

const money = (n) => '$' + n;

function say(text, kind) {
  note = { text, kind };
}

// Own loop: total price and power use of a build.
function totals(build) {
  let price = 0;
  let watts = 0;
  for (const part of Object.values(build)) {
    price += part.price;
    if (part.category !== 'psu') watts += part.watts;   // a PSU gives power, it does not use it
  }
  return { price, watts };
}

// Rules that can block an action. Returns the reason, or '' when everything is fine.
function conflict(build) {
  const { cpu, motherboard, ram, psu } = build;
  if (cpu && motherboard && cpu.socket !== motherboard.socket) {
    return `${cpu.name} needs socket ${cpu.socket}, but ${motherboard.name} has socket ${motherboard.socket}.`;
  }
  if (motherboard && ram && motherboard.memory !== ram.memory) {
    return `${motherboard.name} takes ${motherboard.memory}, but ${ram.name} is ${ram.memory}.`;
  }
  const sum = totals(build);
  if (psu && sum.watts + HEADROOM > psu.watts) {
    return `${psu.name} is too weak: this build needs about ${sum.watts + HEADROOM} W.`;
  }
  if (sum.price > budget) {
    return `The build would cost ${money(sum.price)}, which is ${money(sum.price - budget)} over your budget.`;
  }
  return '';
}

// ===== The one render function =====
function render() {
  renderNote();
  renderParts();
  renderBuild();
  renderSaved();
}

function renderNote() {
  noteBox.textContent = note.text;
  noteBox.className = 'msg ' + note.kind;
}

function partCard(part) {
  const isSelected = selected[part.category] === part;
  const card = el('div', '', 'part');
  card.classList.toggle('selected', isSelected);
  card.classList.toggle('soldout', !part.inStock);
  card.append(el('h4', part.name));
  card.append(el('p', money(part.price), 'price'));
  const specs = [
    part.socket ? 'Socket ' + part.socket : '',
    part.memory,
    (part.category === 'psu' ? 'gives ' : 'uses ') + part.watts + ' W',
  ].filter(Boolean).join(' · ');
  card.append(el('p', specs, 'muted'));
  const tags = el('div');
  for (const t of part.tags) tags.append(el('span', t, 'tag'));
  card.append(tags);
  const btn = el('button', !part.inStock ? 'Out of stock' : isSelected ? 'Remove' : 'Add to build');
  btn.dataset.id = part.id;
  btn.disabled = !part.inStock;
  btn.classList.toggle('ghost', isSelected);
  card.append(btn);
  return card;
}

function renderParts() {
  partsBox.replaceChildren();
  const q = query.trim().toLowerCase();
  const found = parts.filter((p) => `${p.name} ${LABELS[p.category]} ${p.tags.join(' ')}`.toLowerCase().includes(q));
  if (found.length === 0) {
    partsBox.append(el('p', `Nothing found for "${query.trim()}". Try another word.`, 'empty'));
    return;
  }
  for (const category of CATEGORIES) {
    const group = found.filter((p) => p.category === category);
    if (group.length === 0) continue;
    partsBox.append(el('h3', LABELS[category], 'cat'));
    for (const part of group) partsBox.append(partCard(part));
  }
}

function renderBuild() {
  buildBox.replaceChildren();
  for (const category of CATEGORIES) {
    const part = selected[category];
    const row = el('div', '', 'slot');
    row.append(el('span', LABELS[category], 'muted'));
    row.append(el('span', part ? `${part.name} (${money(part.price)})` : 'not chosen', part ? '' : 'muted'));
    buildBox.append(row);
  }
  const sum = totals(selected);
  const over = sum.price > budget;
  const bar = el('progress');
  bar.max = budget > 0 ? budget : 1;
  bar.value = Math.min(sum.price, bar.max);
  bar.classList.toggle('over', over);
  buildBox.append(el('p', `Total: ${money(sum.price)} of ${money(budget)}`, over ? 'error' : ''));
  buildBox.append(bar);
  buildBox.append(el('p', `Estimated power use: ${sum.watts} W`, 'muted'));
  if (over) buildBox.append(el('p', `Over budget by ${money(sum.price - budget)}. Remove a part or raise the budget.`, 'error'));
}

function renderSaved() {
  savedBox.replaceChildren();
  if (saved.length === 0) {
    savedBox.append(el('p', 'No saved builds yet. Complete a build and press "Save build".', 'empty'));
    return;
  }
  let cheapest = 0;   // own loop: index of the cheapest saved build
  for (let i = 1; i < saved.length; i++) {
    if (saved[i].price < saved[cheapest].price) cheapest = i;
  }
  const table = el('table');
  const head = el('tr');
  head.append(el('th', ''));
  saved.forEach((b, i) => {
    const th = el('th', `Build ${i + 1} `);
    const del = el('button', 'Delete', 'ghost');
    del.dataset.index = i;
    th.append(del);
    head.append(th);
  });
  table.append(head);
  const rows = CATEGORIES.map((c) => [LABELS[c], (b) => b.parts[c].name]);
  rows.push(['Total price', (b) => money(b.price)], ['Power use', (b) => `${b.watts} W`]);
  for (const [label, get] of rows) {
    const tr = el('tr');
    tr.append(el('th', label));
    saved.forEach((b, i) => {
      const td = el('td', get(b));
      if (label === 'Total price' && saved.length > 1 && i === cheapest) td.classList.add('best');
      tr.append(td);
    });
    table.append(tr);
  }
  const wrap = el('div', '', 'scroll');
  wrap.append(table);
  savedBox.append(wrap);
}

// ===== Events =====
// One listener on the container serves the buttons of all parts (event delegation).
partsBox.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-id]');
  if (!btn) return;
  const part = parts.find((p) => p.id === Number(btn.dataset.id));
  if (selected[part.category] === part) {
    delete selected[part.category];
    say(`${part.name} removed.`, 'success');
  } else {
    const next = { ...selected, [part.category]: part };
    const reason = conflict(next);
    if (reason !== '') {
      say(`Blocked: ${reason}`, 'error');   // the build stays as it was
    } else {
      selected = next;
      say(`${part.name} added.`, 'success');
    }
  }
  render();
});

savedBox.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-index]');
  if (!btn) return;
  saved.splice(Number(btn.dataset.index), 1);
  say('Saved build deleted.', 'success');
  render();
});

saveBtn.addEventListener('click', () => {
  const missing = CATEGORIES.filter((c) => !selected[c]);
  if (missing.length > 0) {
    say(`Choose a part in every category first. Missing: ${missing.map((c) => LABELS[c]).join(', ')}.`, 'error');
  } else if (saved.length >= MAX_SAVED) {
    say(`You can keep only ${MAX_SAVED} builds. Delete one first.`, 'error');
  } else {
    const sum = totals(selected);
    saved.push({ parts: { ...selected }, price: sum.price, watts: sum.watts });
    say(`Build ${saved.length} saved.`, 'success');
  }
  render();
});

searchInput.addEventListener('input', () => {
  query = searchInput.value;
  render();
});

budgetInput.addEventListener('input', () => {
  const value = Number(budgetInput.value);
  if (budgetInput.value === '' || Number.isNaN(value) || value < 0) {
    say('Enter a budget of 0 or more. The old budget is kept.', 'error');
  } else {
    budget = value;
    say(`Budget set to ${money(budget)}.`, 'success');
  }
  render();
});

render();
