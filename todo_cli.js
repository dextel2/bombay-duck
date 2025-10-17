#!/usr/bin/env node
// todo_cli.js - A simple persistent TODO CLI
// Usage:
//   node todo_cli.js add "Buy milk"
//   node todo_cli.js list
//   node todo_cli.js done 2

const fs = require('fs');
const path = require('path');

// Optional: use home directory for consistent DB location
// const DB = path.join(require('os').homedir(), '.todo.json');

// Original: use current working directory
const DB = path.join(process.cwd(), '.todo.json');

// Load tasks from file
function loadTasks() {
  if (!fs.existsSync(DB)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB, 'utf8') || '[]');
  } catch (err) {
    console.error('Failed to load TODOs:', err.message);
    return [];
  }
}

// Save tasks to file
function saveTasks(tasks) {
  try {
    fs.writeFileSync(DB, JSON.stringify(tasks, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save TODOs:', err.message);
  }
}

// Add a new task
function addTask(text) {
  if (!text.trim()) {
    return console.error('Error: Task description cannot be empty.');
  }
  const tasks = loadTasks();
  tasks.push({ id: Date.now(), text: text.trim(), done: false });
  saveTasks(tasks);
  console.log('✅ Added task:', text.trim());
}

// List all tasks
function listTasks() {
  const tasks = loadTasks();
  if (tasks.length === 0) {
    return console.log('📭 No todos yet.');
  }
  console.log('📋 TODO List:');
  tasks.forEach((task, index) => {
    const status = task.done ? '✔' : ' ';
    console.log(`${index + 1}. [${status}] ${task.text}`);
  });
}

// Mark a task as done
function markDone(indexStr) {
  const index = parseInt(indexStr, 10) - 1;
  const tasks = loadTasks();

  if (isNaN(index) || index < 0 || index >= tasks.length) {
    return console.error('❌ Error: Invalid task number.');
  }

  if (tasks[index].done) {
    return console.log('⚠️ Task already marked as done:', tasks[index].text);
  }

  tasks[index].done = true;
  saveTasks(tasks);
  console.log('✅ Marked as done:', tasks[index].text);
}

// CLI entry point
function main() {
  const [, , cmd, ...args] = process.argv;

  switch (cmd) {
    case 'add':
      addTask(args.join(' '));
      break;
    case 'list':
      listTasks();
      break;
    case 'done':
      if (!args[0]) {
        console.error('❌ Error: Please provide a task number to mark as done.');
        return;
      }
      markDone(args[0]);
      break;
    default:
      console.log('Usage:\n  add "task"\n  list\n  done <task_number>');
  }
}

main();
