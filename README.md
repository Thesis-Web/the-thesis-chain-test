![CI](https://github.com/Thesis-Web/the-thesis-chain-test/actions/workflows/ci.yml/badge.svg)


# the-thesis-chain
The l1 chain build out
# Mirror copy (Thesis-Web)

---

## Simulation Coverage

### Chain / Block / Header Mechanics

- Block application (applyblock-sim.ts)
- Single + multi-block progressions (simple-sim.ts, multiblock-sim.ts)
- Block hash + header hash demonstrations (block-hash-demo-sim.ts, header-hash-sim.ts)
- Chain-level runs (chain-sim.ts)

---

### Forks / Splits / Partition Behavior

- Split simulation + variants (split-sim.ts, split-shadow-sim.ts, split-events-sim.ts)
- Dev split scenarios (dev-split-sim.ts)
- Split log / ramp / multi tracking (chain-split-log-sim-ramp.ts, chain-split-log-sim-multi.ts)
- Emissions split hook (emissions-split-hook-sim.ts)

---

### Consensus & Difficulty

- Difficulty governor + safe mode (difficulty-governor-sim.ts, difficulty-safe-sim.ts)
- Consensus difficulty (consensus-difficulty-sim.ts)
- Consensus skeleton scaffolding (consensus-skeleton-sim.ts)
- Cross-checking diffs / integration (consensus-diff-integration-sim.ts)
- PoW simulation + PoW consensus (pow-sim.ts, pow-consensus-sim.ts)

---

### Ledger State & Deltas

- Full-state assembly / invariants (fullstate-sim.ts)
- Ledger deltas and delta-chain logic (ledger-delta-sim.ts, ledger-delta-chain-sim.ts)
- Ledger consensus smoke validation (ledger-consensus-smoke-sim.ts)
- Back-wall event / boundary accounting (back-wall-sim.ts)
- Mega integration sweep (mega-sim.ts)

---

### Fees & Emissions

- Fee model validation (fee-sim.ts)
- Emissions policy behavior (emissions-sim.ts)

---

### Atomic Value Semantics (Coin + Vault)

- Atomic coin rules (atomic-coin-sim.ts)
- Atomic vault rules (atomic-coin-vault-sim.ts)
- Atomic enforcement suites for EU + vault (atomic-eu-enforce-sim.ts, atomic-vault-enforce-sim.ts)

---

### EU Domain Subsystem

- EU ledger simulations (eu-ledger-sim.ts, eu-ledger-sim-2.ts)
- EU oracle behavior (eu-oracle-sim.ts)
- EU registry delta rules (eu-registry-delta-sim.ts)
- EU transaction shapes (eu-tx-shapes-sim.ts)
- EU VM execution (eu-vm-sim.ts)
- Atomic EU ledger debug / enforce suites (atomic-eu-ledger-debug-sim.ts, atomic-eu-ledger-enforce-sim.ts)

---

### VM & Transactions

- VM baseline execution (tx-vm-sim.ts)
- Transfer VM semantics (tx-transfer-vm-sim.ts)

---

### Vault Subsystem

- Vault delta semantics (vault-delta-sim.ts)
- Vault behavior validation (vault-sim.ts)
- Vault VM execution (vault-vm-sim.ts)

---

### Network / Wire Abstractions (Simulated)

- Wire encoding / decoding (wire-sim.ts)
- Net-wire simulation (net-wire-sim.ts)
- Network simulation (network-sim.ts)
- Bridge simulation (wthe-bridge-sim.ts)

---

### Determinism & Replay

- Replay harness with end-to-end determinism checks (replay-harness-sim.ts)


---

## Simulation Coverage

### Chain / Block / Header Mechanics

- Block application (applyblock-sim.ts)
- Single + multi-block progressions (simple-sim.ts, multiblock-sim.ts)
- Block hash + header hash demonstrations (block-hash-demo-sim.ts, header-hash-sim.ts)
- Chain-level runs (chain-sim.ts)

---

### Forks / Splits / Partition Behavior

- Split simulation + variants (split-sim.ts, split-shadow-sim.ts, split-events-sim.ts)
- Dev split scenarios (dev-split-sim.ts)
- Split log / ramp / multi tracking (chain-split-log-sim-ramp.ts, chain-split-log-sim-multi.ts)
- Emissions split hook (emissions-split-hook-sim.ts)

---

### Consensus & Difficulty

- Difficulty governor + safe mode (difficulty-governor-sim.ts, difficulty-safe-sim.ts)
- Consensus difficulty (consensus-difficulty-sim.ts)
- Consensus skeleton scaffolding (consensus-skeleton-sim.ts)
- Cross-checking diffs / integration (consensus-diff-integration-sim.ts)
- PoW simulation + PoW consensus (pow-sim.ts, pow-consensus-sim.ts)

---

### Ledger State & Deltas

- Full-state assembly / invariants (fullstate-sim.ts)
- Ledger deltas and delta-chain logic (ledger-delta-sim.ts, ledger-delta-chain-sim.ts)
- Ledger consensus smoke validation (ledger-consensus-smoke-sim.ts)
- Back-wall event / boundary accounting (back-wall-sim.ts)
- Mega integration sweep (mega-sim.ts)

---

### Fees & Emissions

- Fee model validation (fee-sim.ts)
- Emissions policy behavior (emissions-sim.ts)

---

### Atomic Value Semantics (Coin + Vault)

- Atomic coin rules (atomic-coin-sim.ts)
- Atomic vault rules (atomic-coin-vault-sim.ts)
- Atomic enforcement suites for EU + vault (atomic-eu-enforce-sim.ts, atomic-vault-enforce-sim.ts)

---

### EU Domain Subsystem

- EU ledger simulations (eu-ledger-sim.ts, eu-ledger-sim-2.ts)
- EU oracle behavior (eu-oracle-sim.ts)
- EU registry delta rules (eu-registry-delta-sim.ts)
- EU transaction shapes (eu-tx-shapes-sim.ts)
- EU VM execution (eu-vm-sim.ts)
- Atomic EU ledger debug / enforce suites (atomic-eu-ledger-debug-sim.ts, atomic-eu-ledger-enforce-sim.ts)

---

### VM & Transactions

- VM baseline execution (tx-vm-sim.ts)
- Transfer VM semantics (tx-transfer-vm-sim.ts)

---

### Vault Subsystem

- Vault delta semantics (vault-delta-sim.ts)
- Vault behavior validation (vault-sim.ts)
- Vault VM execution (vault-vm-sim.ts)

---

### Network / Wire Abstractions (Simulated)

- Wire encoding / decoding (wire-sim.ts)
- Net-wire simulation (net-wire-sim.ts)
- Network simulation (network-sim.ts)
- Bridge simulation (wthe-bridge-sim.ts)

---

### Determinism & Replay

- Replay harness with end-to-end determinism checks (replay-harness-sim.ts)


---

# Architecture Overview

## State Transition Model

The Thesis Chain core follows a strict state-transition architecture.

Each block application is:

Input:
- Previous chain state
- Block header
- Block body (transactions, emissions events, split hooks)

Output:
- New immutable chain state
- Updated ledger snapshot
- Deterministic block hash

There is no implicit mutation outside the state transition boundary.  
All ledger mutations occur through explicit block application.

---

## Determinism Philosophy

This harness is designed around deterministic execution.

Properties:

- No external network calls
- No non-seeded randomness
- No time-based logic inside transitions
- Replay harness verifies monotonic height and hash alignment
- All state transitions are pure functions of prior state + input

If two environments run the same simulation sequence,
they must produce identical final height and block hash.

CI enforces this guarantee.

---

## Ledger Invariants

The following invariants are validated across the sim suite:

- Chain height is strictly monotonic
- lastBlockHash aligns with computed block.hash
- Difficulty adjustments follow governor rules
- Atomic values never violate negative or max-supply constraints
- Vault deltas are reversible and state-consistent
- Split logic preserves accounting boundaries
- Emissions respect configured policy
- EU registry deltas remain consistent across snapshots
- Replay harness confirms full-state determinism

A green CI run implies these invariants hold.

---

# Extending the Simulation Suite

Adding a new simulation is intentionally simple.

1. Create a new file under:

   src/sims/

2. Implement deterministic logic only.
   Avoid external IO or time-based behavior.

3. Export nothing — run directly via ts-node.

4. Ensure the sim exits with non-zero status on failure.

5. The gauntlet runner will automatically include it.

Guidelines:

- Keep each sim focused on one invariant or subsystem.
- Use explicit logging for state transitions.
- Prefer reproducible inputs over random generation.
- If randomness is required, seed it explicitly.

Once committed, CI will execute the new sim automatically.

