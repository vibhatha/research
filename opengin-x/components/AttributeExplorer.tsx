"use client";

import React, { useState } from "react";
import { Loader2, AlertCircle, Search, Folder, FolderOpen, ChevronRight, ChevronDown, Database, FileBox } from "lucide-react";
import { ExploreResult, CategoryNode } from "@/lib/types";

interface AttributeExplorerProps {
  result: ExploreResult | null;
  isLoading: boolean;
}

interface TreeNodeProps {
  category: CategoryNode;
  isSelected: boolean;
  onSelect: (cat: CategoryNode) => void;
  depth?: number;
}

function TreeNode({ category, isSelected, onSelect, depth = 0 }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  const hasChildren = category.children && category.children.length > 0;
  const isDataset = category.isDataset || category.kind.major === "Dataset";

  // Check if name is different from id (meaning we have a real name)
  const hasRealName = category.name && category.name !== category.id;
  const displayName = hasRealName ? category.name : null;

  // Indentation based on depth
  const indent = depth * 16;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${
          isSelected
            ? "bg-blue-900/40 text-blue-300"
            : "hover:bg-zinc-800/50 text-zinc-300"
        }`}
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={() => onSelect(category)}
      >
        {/* Expand/collapse chevron - only show if has children */}
        <button
          className={`p-0.5 rounded flex-shrink-0 ${hasChildren ? "hover:bg-zinc-700" : "invisible"}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded(!expanded);
          }}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {/* Icon based on type */}
        <div className="flex-shrink-0">
          {isDataset ? (
            <Database className="w-4 h-4 text-emerald-500" />
          ) : expanded && hasChildren ? (
            <FolderOpen className="w-4 h-4 text-yellow-500" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-600" />
          )}
        </div>

        {/* Main content - name and kind */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {displayName ? (
              <span className={`text-sm font-medium truncate ${isDataset ? "text-emerald-300" : ""}`}>
                {displayName}
              </span>
            ) : (
              <span className="text-sm font-mono text-zinc-400 truncate">{category.id}</span>
            )}
            {/* Children count */}
            {hasChildren && (
              <span className="text-[10px] text-zinc-500">
                ({category.children.length})
              </span>
            )}
          </div>
          {/* Kind info shown inline */}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              isDataset
                ? "bg-emerald-900/40 text-emerald-400"
                : "bg-blue-900/40 text-blue-400"
            }`}>
              {category.kind.major}
            </span>
            {category.kind.minor && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400">
                {category.kind.minor}
              </span>
            )}
            {category.relationName && category.relationName !== "AS_CATEGORY" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {category.relationName}
              </span>
            )}
          </div>
        </div>

        {/* Dataset indicator */}
        {isDataset && (
          <FileBox className="w-3 h-3 text-emerald-500 flex-shrink-0" />
        )}
      </div>

      {/* Children - recursive rendering */}
      {expanded && hasChildren && (
        <div className="border-l border-zinc-800" style={{ marginLeft: `${16 + indent}px` }}>
          {category.children.map((child) => (
            <TreeNode
              key={child.relationId || child.id}
              category={child}
              isSelected={isSelected && child.id === category.id}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Expanded details panel */}
      {expanded && !hasChildren && (
        <div
          className="border-l border-zinc-700 mt-1 mb-2 bg-zinc-900/50 rounded-r py-2"
          style={{ marginLeft: `${24 + indent}px` }}
        >
          <div className="text-xs space-y-1.5 px-3">
            {/* Name */}
            <div className="flex items-start gap-2">
              <span className="text-zinc-500 w-20 flex-shrink-0">Name:</span>
              <span className={displayName ? "text-white font-medium" : "text-zinc-500 italic"}>
                {displayName || "(no name)"}
              </span>
            </div>

            {/* Entity ID */}
            <div className="flex items-start gap-2">
              <span className="text-zinc-500 w-20 flex-shrink-0">Entity ID:</span>
              <span className="font-mono text-zinc-300 break-all text-[10px]">{category.id}</span>
            </div>

            {/* Kind */}
            <div className="flex items-start gap-2">
              <span className="text-zinc-500 w-20 flex-shrink-0">Kind:</span>
              <span className="text-blue-400">
                {category.kind.major}
                {category.kind.minor && <span className="text-purple-400">/{category.kind.minor}</span>}
              </span>
            </div>

            {/* Relation Name */}
            {category.relationName && (
              <div className="flex items-start gap-2">
                <span className="text-zinc-500 w-20 flex-shrink-0">Relation:</span>
                <span className="text-zinc-300">{category.relationName}</span>
              </div>
            )}

            {/* Depth */}
            {category.depth !== undefined && (
              <div className="flex items-start gap-2">
                <span className="text-zinc-500 w-20 flex-shrink-0">Depth:</span>
                <span className="text-zinc-400">{category.depth}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to count total nodes in tree
function countNodes(categories: CategoryNode[]): { total: number; datasets: number; categories: number } {
  let total = 0;
  let datasets = 0;
  let cats = 0;

  function count(nodes: CategoryNode[]) {
    for (const node of nodes) {
      total++;
      if (node.isDataset || node.kind.major === "Dataset") {
        datasets++;
      } else {
        cats++;
      }
      if (node.children) {
        count(node.children);
      }
    }
  }

  count(categories);
  return { total, datasets, categories: cats };
}

export default function AttributeExplorer({
  result,
  isLoading,
}: AttributeExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-lg font-medium mb-1">Exploring Entity</p>
        <p className="text-sm">Traversing category hierarchy...</p>
        <p className="text-xs mt-2 text-zinc-600">This may take a moment for deep trees</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500">
        <Search className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium mb-1">Category Explorer</p>
        <p className="text-sm">Enter an entity ID and click Explore</p>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-400 p-8">
        <AlertCircle className="w-12 h-12 mb-3" />
        <p className="font-medium mb-2">Exploration Failed</p>
        <p className="text-sm text-zinc-400">{result.error}</p>
      </div>
    );
  }

  const stats = countNodes(result.categories || []);

  return (
    <div className="h-full flex flex-col">
      {/* Entity Info Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-medium text-white font-mono">
                {result.entityId}
              </h2>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-zinc-500">
                {stats.total} nodes
              </span>
              {stats.categories > 0 && (
                <span className="text-xs text-yellow-500 flex items-center gap-1">
                  <Folder className="w-3 h-3" />
                  {stats.categories} categories
                </span>
              )}
              {stats.datasets > 0 && (
                <span className="text-xs text-emerald-500 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {stats.datasets} datasets
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showRaw
                ? "bg-zinc-700 text-zinc-200"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {showRaw ? "Tree View" : "Raw JSON"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {showRaw ? (
          /* Raw JSON View */
          <pre className="p-4 text-xs text-zinc-300 overflow-auto">
            {JSON.stringify(result.categories, null, 2)}
          </pre>
        ) : (
          /* Tree View */
          <div className="py-2">
            {result.categories && result.categories.length > 0 ? (
              <div>
                {result.categories.map((cat) => (
                  <TreeNode
                    key={cat.relationId || cat.id}
                    category={cat}
                    isSelected={selectedCategory?.id === cat.id}
                    onSelect={setSelectedCategory}
                    depth={0}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-zinc-500 py-8">
                <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No categories found</p>
                <p className="text-xs mt-2">Try a different entity ID</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
