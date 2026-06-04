from __future__ import annotations

from dataclasses import dataclass

from academic_credential.crypto.encoding import from_hex, to_hex
from academic_credential.crypto.hashing import sha256


@dataclass(frozen=True)
class ProofStep:
    position: str
    hash: str

    def to_dict(self) -> dict[str, str]:
        return {"position": self.position, "hash": self.hash}


class MerkleTree:
    def __init__(self, leaves: list[str]):
        if not leaves:
            raise ValueError("Merkle tree requires at least one leaf")
        self.levels: list[list[str]] = [leaves]
        current = leaves
        while len(current) > 1:
            next_level = []
            for index in range(0, len(current), 2):
                left = current[index]
                right = current[index + 1] if index + 1 < len(current) else left
                next_level.append(self._parent(left, right))
            self.levels.append(next_level)
            current = next_level

    @staticmethod
    def _parent(left: str, right: str) -> str:
        return to_hex(sha256(b"\x01" + from_hex(left) + from_hex(right)))

    @property
    def root(self) -> str:
        return self.levels[-1][0]

    def proof(self, leaf_index: int) -> list[dict[str, str]]:
        if leaf_index < 0 or leaf_index >= len(self.levels[0]):
            raise IndexError("leaf index out of range")

        proof: list[ProofStep] = []
        index = leaf_index
        for level in self.levels[:-1]:
            is_right = index % 2 == 1
            sibling_index = index - 1 if is_right else index + 1
            sibling = level[sibling_index] if sibling_index < len(level) else level[index]
            proof.append(ProofStep(position="left" if is_right else "right", hash=sibling))
            index //= 2
        return [step.to_dict() for step in proof]

    @classmethod
    def verify(cls, leaf: str, proof: list[dict[str, str]], expected_root: str) -> bool:
        computed = leaf
        for step in proof:
            position = step.get("position")
            sibling = step.get("hash")
            if position == "left":
                computed = cls._parent(sibling, computed)
            elif position == "right":
                computed = cls._parent(computed, sibling)
            else:
                return False
        return computed == expected_root
