export type OperationState = "pending" | "applied" | "failed";

export type OperationStatusResult = {
  state: OperationState;
  confirmations: number;
  error?: string;
};

type IndexedOperation = {
  status?: unknown;
  level?: unknown;
  errors?: unknown;
};

const terminalStatuses = new Set(["failed", "backtracked", "skipped"]);

function chainError(operation: IndexedOperation, status: string) {
  if (operation.errors !== undefined) {
    try {
      const detail = JSON.stringify(operation.errors);
      if (detail && detail !== "[]") {
        return `Tezos operation ${status}: ${detail.slice(0, 800)}`;
      }
    } catch {
      // Fall through to the status-only message.
    }
  }
  return `Tezos operation ${status}.`;
}

export function resolveOperationStatus(
  payload: unknown,
  headLevel: number,
  requiredConfirmations: number,
): OperationStatusResult {
  const operations = (
    Array.isArray(payload) ? payload : payload ? [payload] : []
  ) as IndexedOperation[];
  if (operations.length === 0) {
    return { state: "pending", confirmations: 0 };
  }

  for (const operation of operations) {
    const status =
      typeof operation.status === "string"
        ? operation.status.toLowerCase()
        : "";
    if (terminalStatuses.has(status)) {
      return {
        state: "failed",
        confirmations: 0,
        error: chainError(operation, status),
      };
    }
  }

  if (
    !operations.every(
      (operation) =>
        operation.status === "applied" &&
        Number.isSafeInteger(operation.level) &&
        Number(operation.level) > 0,
    )
  ) {
    return { state: "pending", confirmations: 0 };
  }

  const newestLevel = Math.max(
    ...operations.map((operation) => Number(operation.level)),
  );
  const confirmations = Math.max(0, headLevel - newestLevel + 1);
  return {
    state:
      confirmations >= requiredConfirmations ? "applied" : "pending",
    confirmations,
  };
}
