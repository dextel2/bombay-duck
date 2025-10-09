#!/usr/bin/env node
// todo_cli.js
// Simple persistent TODO CLI. Usage:
//   node todo_cli.js add "Buy milk"
//   node todo_cli.js list
//   node todo_cli.js done 2

const fs = require('fs');
const path = require('path');
const DB = path.join(process.cwd(), '.todo.json');

function load() {
  if (!fs.existsSync(DB)) return [];
  return JSON.parse(fs.readFileSync(DB, 'utf8') || '[]');
}

function save(items) {
  fs.writeFileSync(DB, JSON.stringify(items, null, 2), 'utf8');
}

function addTask(text) {
  const items = load();
  items.push({ id: Date.now(), text: text.trim(), done: false });
  save(items);
  console.log('Added:', text);
}

function list() {
  const items = load();
  if (!items.length) return console.log('No todos yet.');
  items.forEach((it, i) => {
    console.log(`${i + 1}. [${it.done ? 'x' : ' '}] ${it.text}`);
  });
}

function done(index) {
  const items = load();
  const i = parseInt(index, 10) - 1;
  if (i < 0 || i >= items.length) return console.error('Invalid index');
  items[i].done = true;
  save(items);
  console.log('Marked done:', items[i].text);
}

const [,, cmd, ...args] = process.argv;
if (cmd === 'add') addTask(args.join(' '));
else if (cmd === 'list') list();
else if (cmd === 'done') done(args[0]);
else console.log('Usage: add|list|done');
