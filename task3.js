'use strict';

// ===== Constants =====
const TOTAL_POINTS = 20;   // skill points that must be spent exactly
const SKILL_MIN = 1;
const SKILL_MAX = 10;
const STRONG_LIMIT = 7;    // a skill above this value is "strong"
const MAX_STRONG = 1;      // how many strong skills are allowed
const SKILLS = ['strength', 'agility', 'magic', 'luck'];
const REQUIRE = {          // every class needs one skill at a minimum level
  warrior: { skill: 'strength', min: 6 },
  mage: { skill: 'magic', min: 5 },
  rogue: { skill: 'agility', min: 6 },
};
const takenNames = ['aragorn', 'gandalf', 'legolas', 'frodo'];   // lower case

// ===== Page elements =====
const $ = (id) => document.getElementById(id);
const form = $('creator');
const nameInput = $('hero-name');
const classInput = $('hero-class');
const colorInput = $('hero-color');
const summary = $('summary');
const preview = $('preview');
const result = $('result');
const skillInput = {};
for (const s of SKILLS) {
  skillInput[s] = $(s);
  skillInput[s].min = SKILL_MIN;
  skillInput[s].max = SKILL_MAX;
  $('pv-' + s).max = SKILL_MAX;
}
form.noValidate = true;   // switches off browser bubbles; .validity and checkValidity() still work

function el(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}

// ===== Rules. Every check returns [message, inputsToMarkInvalid]; an empty message means "valid" =====
// Reads the HTML-attribute rules (required, minlength, pattern...) through the Constraint Validation API.
function htmlMessage(input, messages) {
  for (const flag of Object.keys(messages)) {
    if (input.validity[flag]) return messages[flag];
  }
  return '';
}

function checkName() {
  const text = nameInput.value.trim();
  let msg = htmlMessage(nameInput, {
    valueMissing: 'Enter a name for your hero.',
    tooShort: 'The name needs at least 3 characters.',
    tooLong: 'The name can have at most 16 characters.',
    patternMismatch: 'Use only letters and spaces, and start with a letter.',
  });
  if (msg === '' && takenNames.includes(text.toLowerCase())) {   // rule HTML cannot express
    msg = `The name "${text}" is already taken. Choose another one.`;
  }
  return [msg, msg ? [nameInput] : []];
}

function checkClass() {
  let msg = htmlMessage(classInput, { valueMissing: 'Choose a class.' });
  if (msg === '') {                                              // rule HTML cannot express
    const rule = REQUIRE[classInput.value];
    const have = Number(skillInput[rule.skill].value);
    if (have < rule.min) {
      msg = `A ${classInput.value} needs ${rule.skill} ${rule.min} or more (now ${have}).`;
    }
  }
  return [msg, msg ? [classInput] : []];
}

function checkColor() {
  const msg = htmlMessage(colorInput, { valueMissing: 'Choose a color.' });
  return [msg, msg ? [colorInput] : []];
}

function checkSkills() {
  const inputs = SKILLS.map((s) => skillInput[s]);
  const broken = inputs.filter((i) => !i.validity.valid);       // required, min, max, step
  if (broken.length > 0) {
    return [`Each skill must be a whole number from ${SKILL_MIN} to ${SKILL_MAX}.`, broken];
  }
  let sum = 0;
  const strong = [];
  for (const i of inputs) {
    const v = Number(i.value);
    sum += v;
    if (v > STRONG_LIMIT) strong.push(i);
  }
  if (sum !== TOTAL_POINTS) {                                    // rule HTML cannot express
    return [`Spend exactly ${TOTAL_POINTS} points. You have used ${sum}.`, inputs];
  }
  if (strong.length > MAX_STRONG) {                              // rule HTML cannot express
    return [`Only ${MAX_STRONG} skill can be higher than ${STRONG_LIMIT}.`, strong];
  }
  return ['', []];
}

const fields = [
  { key: 'name', inputs: [nameInput], error: $('name-error'), check: checkName },
  { key: 'class', inputs: [classInput], error: $('class-error'), check: checkClass },
  { key: 'color', inputs: [colorInput], error: $('color-error'), check: checkColor },
  { key: 'skills', inputs: SKILLS.map((s) => skillInput[s]), error: $('skills-error'), check: checkSkills },
];
const touched = new Set();   // fields the user has already left (blur)

// ===== Showing errors =====
function show(field, [msg, bad]) {
  field.error.textContent = msg;
  for (const input of field.inputs) {
    if (bad.includes(input)) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
}

// Live check: only fields the user has already visited show their errors.
function checkAll() {
  for (const field of fields) {
    if (touched.has(field.key)) show(field, field.check());
  }
}

// ===== Live preview and points counter =====
function updatePreview() {
  $('pv-name').textContent = nameInput.value.trim() || 'Unnamed hero';
  $('pv-class').textContent = classInput.value ? classInput.selectedOptions[0].textContent : 'No class yet';
  preview.className = 'card preview' + (colorInput.value ? ' c-' + colorInput.value : '');
  let used = 0;
  for (const s of SKILLS) {
    const v = Number(skillInput[s].value) || 0;
    used += v;
    $('pv-' + s).value = v;
    $('pv-' + s + '-n').textContent = String(v);
  }
  const pointsLeft = TOTAL_POINTS - used;
  const counter = $('left');
  counter.textContent = String(pointsLeft);
  counter.classList.toggle('error', pointsLeft < 0);
  counter.classList.toggle('success', pointsLeft === 0);
}

// ===== The final result, built with the DOM =====
function createCharacter() {
  const hero = {
    name: nameInput.value.trim(),
    className: classInput.selectedOptions[0].textContent,
    color: colorInput.value,
    skills: SKILLS.map((s) => [s, Number(skillInput[s].value)]),
  };
  result.replaceChildren();
  result.className = 'card result c-' + hero.color;
  result.append(el('h2', 'Character created!'));
  result.append(el('h3', `${hero.name} the ${hero.className}`));
  const ul = el('ul');
  for (const [skill, value] of hero.skills) ul.append(el('li', `${skill}: ${value}`));
  result.append(ul);
  result.hidden = false;
  takenNames.push(hero.name.toLowerCase());   // this name is taken from now on

  summary.hidden = true;
  form.reset();
  touched.clear();
  for (const field of fields) show(field, ['', []]);
  updatePreview();
  result.focus();
}

// ===== Events =====
function onChange() {
  updatePreview();
  checkAll();
}
form.addEventListener('input', onChange);
form.addEventListener('change', onChange);

// blur does not bubble, so the listener uses the capture phase.
form.addEventListener('blur', (event) => {
  const field = fields.find((f) => f.inputs.includes(event.target));
  if (field) {
    touched.add(field.key);
    checkAll();
  }
}, true);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const checks = fields.map((field) => ({ field, res: field.check() }));
  let count = 0;
  for (const { field, res } of checks) {
    touched.add(field.key);
    show(field, res);
    if (res[0] !== '') count++;
  }
  if (count > 0) {
    summary.textContent = `${count} ${count === 1 ? 'error' : 'errors'} found. Fix them and send the form again.`;
    summary.hidden = false;
    checks.find((c) => c.res[0] !== '').res[1][0].focus();   // focus the first invalid input
    return;
  }
  createCharacter();
});

updatePreview();
