"use client";

import { useSyncExternalStore } from "react";
import type {
  SandboxSummary,
  SnapshotSummary,
} from "@/lib/sandbox";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MockSandbox = SandboxSummary & {
  name: string;
  repo: string;
  branch: string;
};

export type MockSnapshot = SnapshotSummary & {
  name: string;
  repo: string;
  branch: string;
};

export type MockState = {
  sandboxes: MockSandbox[];
  snapshots: MockSnapshot[];
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const now = () => new Date().toISOString();
const minutesAgo = (n: number) =>
  new Date(Date.now() - n * 60 * 1000).toISOString();
const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
const inDays = (n: number) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

const SEED: MockState = {
  sandboxes: [
    {
      sandboxId: "sbx_7f3a9c21b8d4e560",
      name: "next.js",
      repo: "vercel/next.js",
      branch: "canary",
      status: "running",
      runtime: "node22",
      cwd: "/workspace/next.js",
      region: "iad1",
      vcpus: 4,
      memoryMb: 8192,
      timeoutMs: 1800000,
      interactivePort: 3000,
      createdAt: minutesAgo(22),
      updatedAt: minutesAgo(4),
      startedAt: minutesAgo(20),
      stoppedAt: null,
      sourceSnapshotId: "snap_b12c83f09ae4d215",
      snapshottedAt: null,
    },
    {
      sandboxId: "sbx_2e9b4d17f3a90c82",
      name: "ui",
      repo: "shadcn/ui",
      branch: "main",
      status: "running",
      runtime: "node22",
      cwd: "/workspace/ui",
      region: "iad1",
      vcpus: 2,
      memoryMb: 4096,
      timeoutMs: 1800000,
      interactivePort: 3000,
      createdAt: hoursAgo(3),
      updatedAt: minutesAgo(12),
      startedAt: hoursAgo(3),
      stoppedAt: null,
      sourceSnapshotId: null,
      snapshottedAt: null,
    },
    {
      sandboxId: "sbx_a1d67e45bc289f03",
      name: "self-evolve",
      repo: "Yhozen/self-evolve",
      branch: "main",
      status: "stopped",
      runtime: "node22",
      cwd: "/workspace/self-evolve",
      region: "iad1",
      vcpus: 2,
      memoryMb: 4096,
      timeoutMs: 1800000,
      interactivePort: null,
      createdAt: daysAgo(1),
      updatedAt: hoursAgo(7),
      startedAt: daysAgo(1),
      stoppedAt: hoursAgo(7),
      sourceSnapshotId: "snap_c93d81bf06a7e4d2",
      snapshottedAt: hoursAgo(8),
    },
  ],
  snapshots: [
    {
      snapshotId: "snap_b12c83f09ae4d215",
      name: "next.js",
      repo: "vercel/next.js",
      branch: "canary",
      status: "ready",
      sourceSandboxId: "sbx_7f3a9c21b8d4e560",
      region: "iad1",
      sizeBytes: 486 * 1024 * 1024,
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(2),
      expiresAt: inDays(28),
    },
    {
      snapshotId: "snap_c93d81bf06a7e4d2",
      name: "self-evolve",
      repo: "Yhozen/self-evolve",
      branch: "main",
      status: "ready",
      sourceSandboxId: "sbx_a1d67e45bc289f03",
      region: "iad1",
      sizeBytes: 312 * 1024 * 1024,
      createdAt: hoursAgo(8),
      updatedAt: hoursAgo(8),
      expiresAt: inDays(27),
    },
    {
      snapshotId: "snap_4ef729d0c6b8a103",
      name: "ui",
      repo: "shadcn/ui",
      branch: "main",
      status: "ready",
      sourceSandboxId: "sbx_old_shadcn_ui",
      region: "iad1",
      sizeBytes: 198 * 1024 * 1024,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
      expiresAt: inDays(24),
    },
  ],
};

// ---------------------------------------------------------------------------
// External store
// ---------------------------------------------------------------------------

const STORAGE_KEY = "self-evolve:mock-store:v1";

let state: MockState = SEED;
let hydrated = false;
const listeners = new Set<() => void>();

function loadFromStorage(): MockState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockState;
    if (!Array.isArray(parsed.sandboxes) || !Array.isArray(parsed.snapshots)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(next: MockState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  const loaded = loadFromStorage();
  if (loaded) {
    state = loaded;
  } else {
    saveToStorage(state);
  }
  hydrated = true;
}

function emit() {
  for (const listener of listeners) listener();
}

function setState(updater: (prev: MockState) => MockState) {
  state = updater(state);
  saveToStorage(state);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot(): MockState {
  return SEED;
}

function getSnapshot(): MockState {
  hydrate();
  return state;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useMockState(): MockState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function randomId(prefix: string) {
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += hex[Math.floor(Math.random() * 16)];
  }
  return `${prefix}_${out}`;
}

export function parseRepoUrl(url: string): {
  owner: string;
  name: string;
  full: string;
  isValid: boolean;
} {
  try {
    const clean = url.trim().replace(/^(https?:\/\/)?(www\.)?/, "");
    const match = clean.match(/^github\.com\/([^/]+)\/([^/?#]+)/);
    if (match) {
      const name = match[2].replace(/\.git$/, "");
      return {
        owner: match[1],
        name,
        full: `${match[1]}/${name}`,
        isValid: true,
      };
    }
  } catch {
    // ignore
  }
  return { owner: "", name: "", full: "", isValid: false };
}

// ---------------------------------------------------------------------------
// Actions (all mocked)
// ---------------------------------------------------------------------------

export type CreateSandboxPayload = {
  repoUrl: string;
  branch?: string;
  workspacePath?: string;
  vcpus?: number;
  memoryMb?: number;
  region?: string;
  fromSnapshotId?: string | null;
};

export function createSandbox(payload: CreateSandboxPayload): MockSandbox {
  hydrate();
  const parsed = parseRepoUrl(payload.repoUrl);
  const name = parsed.name || "sandbox";
  const repo = parsed.full || payload.repoUrl;
  const sandbox: MockSandbox = {
    sandboxId: randomId("sbx"),
    name,
    repo,
    branch: payload.branch || "main",
    status: "running",
    runtime: "node22",
    cwd: payload.workspacePath || `/workspace/${name}`,
    region: payload.region || "iad1",
    vcpus: payload.vcpus ?? 2,
    memoryMb: payload.memoryMb ?? 4096,
    timeoutMs: 1800000,
    interactivePort: 3000,
    createdAt: now(),
    updatedAt: now(),
    startedAt: now(),
    stoppedAt: null,
    sourceSnapshotId: payload.fromSnapshotId ?? null,
    snapshottedAt: null,
  };
  setState((prev) => ({ ...prev, sandboxes: [sandbox, ...prev.sandboxes] }));
  return sandbox;
}

export function stopSandbox(sandboxId: string) {
  setState((prev) => ({
    ...prev,
    sandboxes: prev.sandboxes.map((s) =>
      s.sandboxId === sandboxId
        ? {
            ...s,
            status: "stopped",
            stoppedAt: now(),
            updatedAt: now(),
            interactivePort: null,
          }
        : s,
    ),
  }));
}

export function resumeSandbox(sandboxId: string) {
  setState((prev) => ({
    ...prev,
    sandboxes: prev.sandboxes.map((s) =>
      s.sandboxId === sandboxId
        ? {
            ...s,
            status: "running",
            stoppedAt: null,
            startedAt: now(),
            updatedAt: now(),
            interactivePort: 3000,
          }
        : s,
    ),
  }));
}

export function deleteSandbox(sandboxId: string) {
  setState((prev) => ({
    ...prev,
    sandboxes: prev.sandboxes.filter((s) => s.sandboxId !== sandboxId),
  }));
}

export function createSnapshot(sandboxId: string): MockSnapshot | null {
  const current = getSnapshot();
  const sandbox = current.sandboxes.find((s) => s.sandboxId === sandboxId);
  if (!sandbox) return null;
  const snapshot: MockSnapshot = {
    snapshotId: randomId("snap"),
    name: sandbox.name,
    repo: sandbox.repo,
    branch: sandbox.branch,
    status: "ready",
    sourceSandboxId: sandboxId,
    region: sandbox.region,
    sizeBytes: 200 * 1024 * 1024 + Math.floor(Math.random() * 300) * 1024 * 1024,
    createdAt: now(),
    updatedAt: now(),
    expiresAt: inDays(30),
  };
  setState((prev) => ({
    ...prev,
    sandboxes: prev.sandboxes.map((s) =>
      s.sandboxId === sandboxId
        ? { ...s, snapshottedAt: now(), updatedAt: now() }
        : s,
    ),
    snapshots: [snapshot, ...prev.snapshots],
  }));
  return snapshot;
}

export function deleteSnapshot(snapshotId: string) {
  setState((prev) => ({
    ...prev,
    snapshots: prev.snapshots.filter((s) => s.snapshotId !== snapshotId),
  }));
}

export function restoreFromSnapshot(snapshotId: string): MockSandbox | null {
  const current = getSnapshot();
  const snapshot = current.snapshots.find((s) => s.snapshotId === snapshotId);
  if (!snapshot) return null;
  const sandbox: MockSandbox = {
    sandboxId: randomId("sbx"),
    name: snapshot.name,
    repo: snapshot.repo,
    branch: snapshot.branch,
    status: "running",
    runtime: "node22",
    cwd: `/workspace/${snapshot.name}`,
    region: snapshot.region,
    vcpus: 2,
    memoryMb: 4096,
    timeoutMs: 1800000,
    interactivePort: 3000,
    createdAt: now(),
    updatedAt: now(),
    startedAt: now(),
    stoppedAt: null,
    sourceSnapshotId: snapshotId,
    snapshottedAt: null,
  };
  setState((prev) => ({ ...prev, sandboxes: [sandbox, ...prev.sandboxes] }));
  return sandbox;
}

export function resetMockStore() {
  setState(() => SEED);
}
