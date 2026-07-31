// ============================================================
// VoteCapsule — Merkle Tree Utility
// services/trust/src/merkle/merkle-tree.util.ts
//
// Constructs balanced binary Merkle trees from evidence hashes.
// Generates proof paths for individual leaf verification.
//
// Tree structure:
//              Root (anchored to Hedera + RFC 3161)
//             /                                   \
//        H(H1+H2)                            H(H3+H4)
//       /        \                          /        \
//   Capsule1  Capsule2                 Capsule3  Capsule4
//
// Proof path for Capsule1: [H2, H(H3+H4)]
// Verifier recomputes: H(H(Capsule1 + H2) + H(H3+H4)) === Root
// ============================================================
import * as crypto from 'crypto';

export interface MerkleLeaf {
  index: number;
  hash: string;          // 64-char hex SHA-256
  capsuleId: string;
}

export interface MerkleProof {
  leafIndex: number;
  leafHash: string;
  proofPath: string[];   // Array of sibling hashes from leaf to root
  root: string;
}

export interface MerkleTreeResult {
  root: string;          // Merkle root (64-char hex SHA-256)
  leaves: MerkleLeaf[];
  leafCount: number;
  treeDepth: number;
}

/**
 * Build a balanced binary Merkle tree from an array of SHA-256 hashes.
 *
 * If the number of leaves is odd, the last leaf is duplicated to balance the tree.
 * Empty input returns a zero hash.
 */
export function buildMerkleTree(
  hashes: { hash: string; capsuleId: string }[],
): MerkleTreeResult {
  if (hashes.length === 0) {
    return {
      root: '0'.repeat(64),
      leaves: [],
      leafCount: 0,
      treeDepth: 0,
    };
  }

  // Single leaf — root is the leaf itself
  if (hashes.length === 1) {
    return {
      root: hashes[0].hash.toLowerCase(),
      leaves: [{ index: 0, hash: hashes[0].hash.toLowerCase(), capsuleId: hashes[0].capsuleId }],
      leafCount: 1,
      treeDepth: 0,
    };
  }

  // Build leaves
  const leaves: MerkleLeaf[] = hashes.map((h, i) => ({
    index: i,
    hash: h.hash.toLowerCase(),
    capsuleId: h.capsuleId,
  }));

  // Build tree bottom-up
  let currentLevel: string[] = leaves.map((l) => l.hash);

  let depth = 0;
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      // If odd, duplicate last element
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];
      nextLevel.push(hashPair(left, right));
    }

    currentLevel = nextLevel;
    depth++;
  }

  return {
    root: currentLevel[0],
    leaves,
    leafCount: leaves.length,
    treeDepth: depth,
  };
}

/**
 * Generate a Merkle proof for a specific leaf.
 *
 * The proof is an array of sibling hashes from the leaf up to (but not including) the root.
 * A verifier can recompute the root from the leaf hash + proof path.
 */
export function generateMerkleProof(
  hashes: string[],
  leafIndex: number,
): MerkleProof {
  if (leafIndex < 0 || leafIndex >= hashes.length) {
    throw new Error(`Invalid leaf index ${leafIndex} for tree of size ${hashes.length}`);
  }

  const normalizedHashes = hashes.map((h) => h.toLowerCase());
  const proofPath: string[] = [];

  let currentLevel = [...normalizedHashes];
  let currentIndex = leafIndex;

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];

      // If this pair contains our target, record the sibling
      if (i === currentIndex || i + 1 === currentIndex) {
        const sibling = currentIndex % 2 === 0
          ? (i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i])
          : currentLevel[i];
        proofPath.push(sibling);
      }

      nextLevel.push(hashPair(left, right));
    }

    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    leafIndex,
    leafHash: normalizedHashes[leafIndex],
    proofPath,
    root: currentLevel[0],
  };
}

/**
 * Verify a Merkle proof — confirm that a leaf hash is part of the given root.
 *
 * Returns true if the proof is valid (leaf + proof path recomputes to root).
 */
export function verifyMerkleProof(
  leafHash: string,
  leafIndex: number,
  proofPath: string[],
  expectedRoot: string,
): boolean {
  let currentHash = leafHash.toLowerCase();
  let currentIndex = leafIndex;

  for (const siblingHash of proofPath) {
    if (currentIndex % 2 === 0) {
      currentHash = hashPair(currentHash, siblingHash.toLowerCase());
    } else {
      currentHash = hashPair(siblingHash.toLowerCase(), currentHash);
    }
    currentIndex = Math.floor(currentIndex / 2);
  }

  return currentHash === expectedRoot.toLowerCase();
}

/**
 * Hash a pair of nodes: SHA-256(left + right).
 * Left and right are hex strings (64 chars each).
 */
function hashPair(left: string, right: string): string {
  const combined = Buffer.concat([
    Buffer.from(left, 'hex'),
    Buffer.from(right, 'hex'),
  ]);
  return crypto.createHash('sha256').update(combined).digest('hex');
}
