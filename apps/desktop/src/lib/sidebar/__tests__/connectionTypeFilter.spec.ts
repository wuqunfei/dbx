import { describe, expect, it } from "vitest";
import { filterTreeNodesByConnectionType } from "../connectionTypeFilter";
import type { TreeNode } from "@/types/database";

function connectionNode(id: string): TreeNode {
  return { id, label: id, type: "connection", connectionId: id, children: [] };
}

function groupNode(id: string, children: TreeNode[]): TreeNode {
  return { id, label: id, type: "connection-group", children };
}

const dbTypes: Record<string, "duckdb" | "postgres"> = {
  duck1: "duckdb",
  duck2: "duckdb",
  pg1: "postgres",
};

function getDbType(id: string) {
  return dbTypes[id];
}

describe("filterTreeNodesByConnectionType", () => {
  it("keeps only connection nodes whose resolved db type is allowed", () => {
    const nodes = [connectionNode("duck1"), connectionNode("pg1")];
    const result = filterTreeNodesByConnectionType(nodes, ["duckdb"], getDbType);
    expect(result.map((n) => n.id)).toEqual(["duck1"]);
  });

  it("drops connection-group nodes that end up with zero children after filtering", () => {
    const nodes = [groupNode("group1", [connectionNode("pg1")])];
    const result = filterTreeNodesByConnectionType(nodes, ["duckdb"], getDbType);
    expect(result).toEqual([]);
  });

  it("keeps a connection-group node and filters its children when at least one child matches", () => {
    const nodes = [groupNode("group1", [connectionNode("duck1"), connectionNode("pg1")])];
    const result = filterTreeNodesByConnectionType(nodes, ["duckdb"], getDbType);
    expect(result).toHaveLength(1);
    expect(result[0].children?.map((n) => n.id)).toEqual(["duck1"]);
  });

  it("passes through non-connection, non-group node types unchanged", () => {
    const tableNode = { id: "t1", label: "t1", type: "table" } as TreeNode;
    const result = filterTreeNodesByConnectionType([tableNode], ["duckdb"], getDbType);
    expect(result).toEqual([tableNode]);
  });

  it("treats a connection node with an unresolvable db type as excluded", () => {
    const nodes = [connectionNode("unknown-id")];
    const result = filterTreeNodesByConnectionType(nodes, ["duckdb"], getDbType);
    expect(result).toEqual([]);
  });
});
