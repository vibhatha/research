"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, AlertCircle, Search, Folder, FolderOpen, ChevronRight, ChevronDown, Database, FileBox, Table, X, GripVertical } from "lucide-react";
import { ExploreResult, CategoryNode, AttributeValueData } from "@/lib/types";
import { getAttributeValue } from "@/lib/api";

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
    <div className="select-none overflow-hidden">
      <div
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded cursor-pointer transition-colors ${
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
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </button>

        {/* Icon based on type */}
        <div className="flex-shrink-0">
          {isDataset ? (
            <Database className="w-3.5 h-3.5 text-emerald-500" />
          ) : expanded && hasChildren ? (
            <FolderOpen className="w-3.5 h-3.5 text-yellow-500" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-yellow-600" />
          )}
        </div>

        {/* Main content - name and kind */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1">
            {displayName ? (
              <span className={`text-xs font-medium truncate ${isDataset ? "text-emerald-300" : ""}`}>
                {displayName}
              </span>
            ) : (
              <span className="text-xs font-mono text-zinc-400 truncate">{category.id}</span>
            )}
            {/* Children count */}
            {hasChildren && (
              <span className="text-[10px] text-zinc-500 flex-shrink-0">
                ({category.children.length})
              </span>
            )}
          </div>
          {/* Kind info shown inline */}
          <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
            <span className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ${
              isDataset
                ? "bg-emerald-900/40 text-emerald-400"
                : "bg-blue-900/40 text-blue-400"
            }`}>
              {category.kind.major}
            </span>
            {category.kind.minor && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-purple-900/40 text-purple-400 truncate">
                {category.kind.minor}
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
        <div className="border-l border-zinc-800 overflow-hidden" style={{ marginLeft: `${12 + indent}px` }}>
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
    </div>
  );
}

// Resizable Split View Component
interface ResizableSplitViewProps {
  showRightPanel: boolean;
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  minLeftWidth?: number;
  minRightWidth?: number;
  leftWidthPercent: number;
  onWidthChange: (percent: number) => void;
}

function ResizableSplitView({
  showRightPanel,
  leftPanel,
  rightPanel,
  minLeftWidth = 200,
  minRightWidth = 300,
  leftWidthPercent,
  onWidthChange,
}: ResizableSplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;

      // Calculate percentage
      let newPercent = (mouseX / containerWidth) * 100;

      // Apply min width constraints
      const minLeftPercent = (minLeftWidth / containerWidth) * 100;
      const maxLeftPercent = 100 - (minRightWidth / containerWidth) * 100;

      newPercent = Math.max(minLeftPercent, Math.min(maxLeftPercent, newPercent));
      onWidthChange(newPercent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, minLeftWidth, minRightWidth, onWidthChange]);

  if (!showRightPanel) {
    return <div className="flex-1 overflow-hidden">{leftPanel}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex min-h-0 relative overflow-hidden"
      style={{ cursor: isDragging ? "col-resize" : undefined }}
    >
      {/* Left Panel - Tree View */}
      <div
        className="overflow-y-auto overflow-x-hidden flex-shrink-0"
        style={{
          width: `${leftWidthPercent}%`,
          transition: isDragging ? "none" : "width 0.2s ease-out",
        }}
      >
        {leftPanel}
      </div>

      {/* Resizable Divider */}
      <div
        className={`w-1.5 flex-shrink-0 bg-zinc-800 hover:bg-blue-500 cursor-col-resize flex items-center justify-center group ${
          isDragging ? "bg-blue-500" : ""
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className={`flex flex-col items-center justify-center h-16 w-3 rounded ${
          isDragging ? "bg-blue-500" : "bg-zinc-700 group-hover:bg-blue-500"
        }`}>
          <GripVertical className="w-3 h-3 text-zinc-300" />
        </div>
      </div>

      {/* Right Panel - Data View */}
      <div
        className="overflow-hidden flex-1 min-w-0"
        style={{
          transition: isDragging ? "none" : "width 0.2s ease-out",
        }}
      >
        {rightPanel}
      </div>
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

// Component to display attribute data
function AttributeDataPanel({
  node,
  data,
  loading,
  error,
  onClose,
}: {
  node: CategoryNode;
  data: AttributeValueData | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const [showRawData, setShowRawData] = useState(false);

  return (
    <div className="h-full flex flex-col bg-zinc-900/95">
      {/* Compact Header */}
      <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {loading ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
            ) : (
              <Database className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
            <span className={`font-medium truncate ${loading ? "text-blue-300" : "text-emerald-300"}`}>
              {node.name}
            </span>
            {loading && (
              <span className="text-xs text-blue-400 animate-pulse flex-shrink-0">Loading...</span>
            )}
            {!loading && data && data.rows && (
              <span className="text-[10px] text-zinc-500 flex-shrink-0">
                {data.rows.length} row{data.rows.length !== 1 ? "s" : ""} × {data.columns?.length || 0} cols
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!loading && data && (
              <button
                onClick={() => setShowRawData(!showRawData)}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                  showRawData ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {showRawData ? "Table" : "Raw"}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Content - fills remaining space */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-4">
            <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-500" />
            <p className="text-base font-medium text-blue-400">Loading Data</p>
            <p className="text-xs text-zinc-600 mt-2 font-mono break-all">
              GET /{node.parentId}/attributes/{node.name}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400 p-4">
            <AlertCircle className="w-6 h-6 mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : data ? (
          showRawData ? (
            <div className="p-3 space-y-3 overflow-hidden">
              <div className="bg-zinc-800/50 rounded p-2 text-xs overflow-hidden">
                <span className="text-green-400">Columns: </span>
                <span className="text-zinc-300 break-all">{JSON.stringify(data.columns || [])}</span>
              </div>
              <pre className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded overflow-y-auto overflow-x-hidden max-h-[60vh] break-all whitespace-pre-wrap">
                {JSON.stringify(data.raw || data, null, 2)}
              </pre>
            </div>
          ) : data.columns && data.columns.length > 0 ? (
            <div className="p-3 overflow-hidden">
              <div className="rounded border border-zinc-800 overflow-hidden">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-zinc-800/80">
                    <tr>
                      {data.columns.map((col, i) => (
                        <th key={i} className="text-left px-2 py-2 text-zinc-300 font-medium text-xs truncate">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {data.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-2 text-zinc-200 text-sm truncate">
                            {typeof cell === "object" ? (
                              <code className="text-xs text-amber-300">{JSON.stringify(cell)}</code>
                            ) : (
                              String(cell ?? "—")
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 text-zinc-500 text-sm overflow-hidden">
              <p className="mb-2">No structured data available</p>
              <pre className="text-xs bg-zinc-950 p-3 rounded overflow-y-auto overflow-x-hidden max-h-[60vh] text-zinc-400 break-all whitespace-pre-wrap">
                {JSON.stringify(data.raw || data, null, 2)}
              </pre>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-4">
            <Table className="w-6 h-6 mb-2 opacity-30" />
            <p className="text-sm">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttributeExplorer({
  result,
  isLoading,
}: AttributeExplorerProps) {
  const [selectedNode, setSelectedNode] = useState<CategoryNode | null>(null);
  const [attributeData, setAttributeData] = useState<AttributeValueData | null>(null);
  const [attributeLoading, setAttributeLoading] = useState(false);
  const [attributeError, setAttributeError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [splitPaneWidth, setSplitPaneWidth] = useState(35); // Tree panel takes 35%, data panel 65%
  const [userHasResized, setUserHasResized] = useState(false);

  // Handle manual resize - track that user has customized the width
  const handleWidthChange = useCallback((percent: number) => {
    setSplitPaneWidth(percent);
    setUserHasResized(true);
  }, []);

  // Auto-expand data panel when data loads (if user hasn't manually resized)
  useEffect(() => {
    if (attributeData && !userHasResized) {
      // Calculate optimal width based on number of columns
      const numColumns = attributeData.columns?.length || 0;
      // Give more space to the data panel for tables with more columns
      const optimalTreeWidth = Math.max(25, Math.min(40, 50 - numColumns * 3));
      setSplitPaneWidth(optimalTreeWidth);
    }
  }, [attributeData, userHasResized]);

  // Handle node selection - fetch attribute data if it's a Dataset
  const handleSelectNode = useCallback(async (node: CategoryNode) => {
    setSelectedNode(node);

    const isDataset = node.isDataset || node.kind.major === "Dataset";

    if (isDataset && node.parentId && node.name) {
      // Fetch attribute data for Dataset nodes
      console.log(`[AttributeExplorer] Fetching attribute: GET /${node.parentId}/attributes/${node.name}`);
      setAttributeLoading(true);
      setAttributeError(null);
      setAttributeData(null);

      try {
        const data = await getAttributeValue(node.parentId, node.name);
        console.log(`[AttributeExplorer] Attribute data:`, data);
        setAttributeData(data);
      } catch (err) {
        console.error(`[AttributeExplorer] Error fetching attribute:`, err);
        setAttributeError(err instanceof Error ? err.message : "Failed to fetch attribute data");
      } finally {
        setAttributeLoading(false);
      }
    } else {
      // Clear attribute data for non-Dataset nodes
      setAttributeData(null);
      setAttributeError(null);
    }
  }, []);

  const handleCloseDataPanel = useCallback(() => {
    setSelectedNode(null);
    setAttributeData(null);
    setAttributeError(null);
  }, []);

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
  const showDataPanel = selectedNode && (selectedNode.isDataset || selectedNode.kind.major === "Dataset");

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

      {/* Content - Split View */}
      <ResizableSplitView
        showRightPanel={!!showDataPanel}
        leftWidthPercent={splitPaneWidth}
        onWidthChange={handleWidthChange}
        leftPanel={
          showRaw ? (
            /* Raw JSON View */
            <pre className="p-4 text-xs text-zinc-300 overflow-y-auto overflow-x-hidden h-full">
              {JSON.stringify(result.categories, null, 2)}
            </pre>
          ) : (
            /* Tree View */
            <div className="py-2 h-full overflow-y-auto overflow-x-hidden">
              {result.categories && result.categories.length > 0 ? (
                <div className="overflow-hidden">
                  {result.categories.map((cat) => (
                    <TreeNode
                      key={cat.relationId || cat.id}
                      category={cat}
                      isSelected={selectedNode?.id === cat.id}
                      onSelect={handleSelectNode}
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
          )
        }
        rightPanel={
          showDataPanel && selectedNode ? (
            <AttributeDataPanel
              node={selectedNode}
              data={attributeData}
              loading={attributeLoading}
              error={attributeError}
              onClose={handleCloseDataPanel}
            />
          ) : null
        }
      />
    </div>
  );
}
