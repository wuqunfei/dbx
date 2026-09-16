import type { TreeNode } from "@/types/database";
import type { DatabaseType } from "@/types/generated/databaseTypes";

export function filterTreeNodesByConnectionType(nodes: TreeNode[], allowedTypes: readonly DatabaseType[], getDbType: (connectionId: string) => DatabaseType | undefined): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (node.type === "connection") {
      const dbType = getDbType(node.connectionId ?? node.id);
      if (dbType && allowedTypes.includes(dbType)) {
        result.push(node);
      }
      continue;
    }
    if (node.type === "connection-group") {
      const filteredChildren = filterTreeNodesByConnectionType(node.children ?? [], allowedTypes, getDbType);
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
      continue;
    }
    result.push(node);
  }
  return result;
}
