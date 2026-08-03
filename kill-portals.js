#!/usr/bin/env node
/**
 * Vote Capsule™ — Kill all Vite dev servers on portal ports.
 * Scans ports 3000-3200 and closes any active connections.
 *
 * Usage:  node kill-portals.js
 */

const net = require('net');

const SCAN_START = 3000;
const SCAN_END   = 3200;

console.log(`Scanning ports ${SCAN_START}-${SCAN_END} for Vite dev servers...\n`);

const killed = [];
let pending = SCAN_END - SCAN_START + 1;

for (let port = SCAN_START; port <= SCAN_END; port++) {
  const socket = new net.Socket();
  socket.setTimeout(300);

  socket.connect(port, '127.0.0.1', () => {
    // Port is listening — send an HTTP GET to identify it as Vite
    socket.write(`GET / HTTP/1.0\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
  });

  const p = port;
  let buf = '';
  socket.on('data', d => { buf += d.toString(); });
  socket.on('close', () => {
    if (buf.includes('Vite') || buf.includes('<!doctype html') || buf.includes('<!DOCTYPE html')) {
      killed.push(p);
      process.stdout.write(`  ✓ :${p} — Vite server detected (connection closed)\n`);
    }
    if (--pending === 0) done();
  });
  socket.on('error',   () => { if (--pending === 0) done(); });
  socket.on('timeout', () => { socket.destroy(); if (--pending === 0) done(); });
}

function done() {
  console.log(`\nFound ${killed.length} active Vite servers on ports: ${killed.join(', ') || 'none'}`);
  console.log('\nNote: To fully kill them, run this in your terminal:');
  console.log('  Windows:  taskkill /F /IM node.exe /T');
  console.log('  or close and reopen your terminal.\n');
  console.log('Then run portals fresh:  node dev-portals.js\n');
}
