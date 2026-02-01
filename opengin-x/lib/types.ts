export type QueryType = "search" | "metadata" | "attributes" | "relations" | "explore";

export type RelationshipDirection = "INCOMING" | "OUTGOING";

export interface QueryParams {
  // For search
  entityId?: string;
  kindMajor?: string;
  kindMinor?: string;
  entityName?: string;

  // Query type selection
  queryType: QueryType;

  // For attributes
  attributeName?: string;
  startTime?: string;
  endTime?: string;
  fields?: string[];

  // For relations
  activeAt?: string;
  direction?: RelationshipDirection;
  relationName?: string;
  relatedEntityId?: string;
  relationId?: string;
}

export interface QueryHistoryItem {
  id: string;
  params: QueryParams;
  timestamp: number;
  description: string;
}

export interface ApiResponse {
  data: unknown;
  status: number;
  endpoint: string;
  method: string;
  requestBody?: unknown;
  error?: string;
}

// Search request/response types
export interface EntitySearchRequest {
  id?: string;
  kind?: {
    major: string;
    minor?: string;
  };
  name?: string;
  created?: string;
  terminated?: string;
}

export interface EntitySearchResult {
  id: string;
  kind: {
    major: string;
    minor?: string;
  };
  name: string;
  created: string;
  terminated?: string | null;
}

// Relations request/response types
export interface RelationsRequest {
  id?: string;
  relatedEntityId?: string;
  name?: string;
  activeAt?: string;
  startTime?: string;
  endTime?: string;
  direction?: RelationshipDirection;
}

export interface RelationResult {
  id: string;
  relatedEntityId: string;
  name: string;
  startTime: string;
  endTime?: string;
  direction: string;
}

// Attribute response types
export interface AttributeValue {
  start: string;
  end?: string | null;
  value: string;
}

// Attribute Explorer types
export interface CategoryNode {
  id: string;
  name: string;
  kind: { major: string; minor?: string };
  children: CategoryNode[];
  attributes: AttributeNode[];
  loading?: boolean;
  expanded?: boolean;
  // Relation metadata
  relationDirection?: string;
  relationId?: string;
  relationName?: string;
  startTime?: string;
  endTime?: string;
  // Node type indicators
  isDataset?: boolean;
  isCategory?: boolean;
  depth?: number;
  // Parent tracking for attribute fetching
  parentId?: string;
  parentName?: string;
  // Attribute data (for Dataset leaf nodes)
  attributeData?: AttributeValueData;
  attributeLoading?: boolean;
  attributeError?: string;
}

export interface AttributeNode {
  id: string;
  name: string;
  kind: { major: string; minor?: string };
  created: string;
  value?: AttributeValueData;
  loading?: boolean;
}

export interface AttributeValueData {
  columns: string[];
  rows: unknown[][];
  raw?: unknown;
}

export interface ExploreResult {
  entityId: string;
  entityName?: string;
  categories: CategoryNode[];
  relations?: RelationResult[];
  loading?: boolean;
  error?: string;
}
