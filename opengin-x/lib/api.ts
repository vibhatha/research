import {
  QueryParams,
  ApiResponse,
  QueryType,
  EntitySearchRequest,
  RelationsRequest,
  CategoryNode,
  AttributeNode,
  AttributeValueData,
  RelationResult,
  ExploreResult,
} from "./types";
import { decodeProtobufValues } from "./protobuf";
import { toCurl, generateCallId, CurlRequest } from "./curl";
import { addApiCall, updateApiCall } from "./apiCallStore";

const API_BASE = "/api/proxy";
const EXTERNAL_API_BASE =
  "https://aaf8ece1-3077-4a52-ab05-183a424f6d93-dev.e1-us-east-azure.choreoapis.dev/data-platform/read-api/v1.0/v1/entities";

/**
 * Logged fetch - wraps fetch to log API calls with cURL commands
 */
async function loggedFetch(
  url: string,
  options: RequestInit,
  externalUrl: string
): Promise<Response> {
  const method = (options.method || "GET") as "GET" | "POST";
  const headers: Record<string, string> = {};

  // Extract headers
  if (options.headers) {
    const h = options.headers as Record<string, string>;
    for (const [key, value] of Object.entries(h)) {
      headers[key] = value;
    }
  }

  // Parse body if present
  let body: unknown;
  if (options.body && typeof options.body === "string") {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = options.body;
    }
  }

  // Generate cURL command using external URL (the real API URL)
  const curlRequest: CurlRequest = {
    url: externalUrl,
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body,
  };

  const callId = generateCallId();
  const startTime = performance.now();

  // Log the call immediately (before response)
  addApiCall({
    id: callId,
    timestamp: Date.now(),
    curl: toCurl(curlRequest),
    method,
    url: externalUrl,
  });

  try {
    const response = await fetch(url, options);
    const duration = Math.round(performance.now() - startTime);

    // Update with response info
    updateApiCall(callId, {
      status: response.status,
      duration,
    });

    return response;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    updateApiCall(callId, {
      duration,
      error: error instanceof Error ? error.message : "Network error",
    });
    throw error;
  }
}

export function getQueryTypeLabel(type: QueryType): string {
  switch (type) {
    case "search":
      return "Search Entity";
    case "metadata":
      return "Metadata";
    case "attributes":
      return "Attributes";
    case "relations":
      return "Relations";
    case "explore":
      return "Explore Attributes";
  }
}

export function getQueryTypeDescription(type: QueryType): string {
  switch (type) {
    case "search":
      return "Search by ID or kind";
    case "metadata":
      return "Entity metadata";
    case "attributes":
      return "Entity attribute values";
    case "relations":
      return "Entity relationships";
    case "explore":
      return "Discover all attributes";
  }
}

interface RequestInfo {
  endpoint: string;
  method: "GET" | "POST";
  body?: unknown;
  externalUrl: string;
}

function buildRequest(params: QueryParams): RequestInfo {
  const { queryType } = params;

  switch (queryType) {
    case "search": {
      const body: EntitySearchRequest = {};
      if (params.entityId) {
        body.id = params.entityId;
      }
      if (params.kindMajor) {
        body.kind = { major: params.kindMajor };
        if (params.kindMinor) {
          body.kind.minor = params.kindMinor;
        }
      }
      if (params.entityName) {
        body.name = params.entityName;
      }
      return {
        endpoint: `${API_BASE}/search`,
        method: "POST",
        body,
        externalUrl: `${EXTERNAL_API_BASE}/search`,
      };
    }

    case "metadata": {
      const entityId = encodeURIComponent(params.entityId || "");
      return {
        endpoint: `${API_BASE}/${entityId}/metadata`,
        method: "GET",
        externalUrl: `${EXTERNAL_API_BASE}/${entityId}/metadata`,
      };
    }

    case "attributes": {
      const entityId = encodeURIComponent(params.entityId || "");
      const attrName = encodeURIComponent(params.attributeName || "");
      const searchParams = new URLSearchParams();
      if (params.startTime) searchParams.set("startTime", params.startTime);
      if (params.endTime) searchParams.set("endTime", params.endTime);
      if (params.fields && params.fields.length > 0) {
        params.fields.forEach((f) => searchParams.append("fields", f));
      }
      const qs = searchParams.toString();
      const path = `/${entityId}/attributes/${attrName}${qs ? `?${qs}` : ""}`;
      return {
        endpoint: `${API_BASE}${path}`,
        method: "GET",
        externalUrl: `${EXTERNAL_API_BASE}${path}`,
      };
    }

    case "relations": {
      const entityId = encodeURIComponent(params.entityId || "");
      const body: RelationsRequest = {};
      if (params.relationId) {
        body.id = params.relationId;
      } else {
        if (params.relatedEntityId) body.relatedEntityId = params.relatedEntityId;
        if (params.relationName) body.name = params.relationName;
        if (params.direction) body.direction = params.direction;
        // Use either activeAt OR startTime/endTime
        if (params.activeAt) {
          body.activeAt = params.activeAt;
        } else {
          if (params.startTime) body.startTime = params.startTime;
          if (params.endTime) body.endTime = params.endTime;
        }
      }
      return {
        endpoint: `${API_BASE}/${entityId}/relations`,
        method: "POST",
        body: Object.keys(body).length > 0 ? body : undefined,
        externalUrl: `${EXTERNAL_API_BASE}/${entityId}/relations`,
      };
    }

    case "explore": {
      // Explore doesn't use the standard request flow
      // This case is handled by exploreEntity() instead
      const entityId = encodeURIComponent(params.entityId || "");
      return {
        endpoint: `${API_BASE}/${entityId}/relations`,
        method: "POST",
        externalUrl: `${EXTERNAL_API_BASE}/${entityId}/relations`,
      };
    }
  }
}

export async function executeQuery(params: QueryParams): Promise<ApiResponse> {
  const request = buildRequest(params);

  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (request.body) {
      fetchOptions.body = JSON.stringify(request.body);
    }

    const response = await loggedFetch(
      request.endpoint,
      fetchOptions,
      request.externalUrl
    );
    const data = await response.json();

    return {
      data,
      status: response.status,
      endpoint: request.externalUrl,
      method: request.method,
      requestBody: request.body,
    };
  } catch (error) {
    return {
      data: null,
      status: 500,
      endpoint: request.externalUrl,
      method: request.method,
      requestBody: request.body,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

export function validateParams(params: QueryParams): string | null {
  switch (params.queryType) {
    case "search":
      if (!params.entityId && !params.kindMajor && !params.entityName) {
        return "At least one search criteria is required (Entity ID, Kind, or Name)";
      }
      break;
    case "metadata":
    case "relations":
    case "explore":
      if (!params.entityId) {
        return "Entity ID is required";
      }
      break;
    case "attributes":
      if (!params.entityId) {
        return "Entity ID is required";
      }
      if (!params.attributeName) {
        return "Attribute name is required";
      }
      break;
  }
  return null;
}

// Attribute Explorer API functions

interface EntityInfo {
  id: string;
  kind: { major: string; minor?: string };
  name: string;
  created: string;
  terminated?: string | null;
}

// Recursively find entity-like objects in a response
function findEntityInResponse(data: unknown, targetId: string): EntityInfo | null {
  if (!data) return null;

  // Check if this object looks like an entity
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;

    // Check if this is the entity we're looking for
    if (obj.id === targetId && ("name" in obj || "kind" in obj)) {
      return {
        id: obj.id as string,
        name: (obj.name as string) || targetId,
        kind: (obj.kind as { major: string; minor?: string }) || { major: "UNKNOWN" },
        created: (obj.created as string) || "",
        terminated: obj.terminated as string | null | undefined,
      };
    }

    // Check arrays
    if (Array.isArray(data)) {
      for (const item of data) {
        const found = findEntityInResponse(item, targetId);
        if (found) return found;
      }
    }

    // Check nested properties
    for (const key of Object.keys(obj)) {
      const found = findEntityInResponse(obj[key], targetId);
      if (found) return found;
    }
  }

  return null;
}

async function fetchEntityById(
  entityId: string,
  signal?: AbortSignal
): Promise<EntityInfo | null> {
  try {
    const body: EntitySearchRequest = { id: entityId };
    const response = await loggedFetch(
      `${API_BASE}/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      },
      `${EXTERNAL_API_BASE}/search`
    );
    if (!response.ok) {
      console.log(`[fetchEntityById] Response not OK for ${entityId}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    const decoded = decodeProtobufValues(data);

    // Log for debugging
    console.log(`[fetchEntityById] Raw response for ${entityId}:`, JSON.stringify(decoded, null, 2));

    // Try to find the entity anywhere in the response
    const result = findEntityInResponse(decoded, entityId);

    console.log(`[fetchEntityById] Extracted entity for ${entityId}:`, result);
    return result;
  } catch (error) {
    console.error(`[fetchEntityById] Error fetching ${entityId}:`, error);
    return null;
  }
}

async function fetchEntityRelations(
  entityId: string,
  relationName?: string,
  signal?: AbortSignal
): Promise<RelationResult[]> {
  try {
    const body: RelationsRequest = {};
    if (relationName) body.name = relationName;

    const encodedId = encodeURIComponent(entityId);
    const response = await loggedFetch(
      `${API_BASE}/${encodedId}/relations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      },
      `${EXTERNAL_API_BASE}/${encodedId}/relations`
    );

    if (!response.ok) return [];
    const data = await response.json();
    const decoded = decodeProtobufValues(data) as RelationResult[] | { relations?: RelationResult[] };

    // Handle both array and object responses
    if (Array.isArray(decoded)) return decoded;
    if (decoded && typeof decoded === "object" && "relations" in decoded) {
      return decoded.relations || [];
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchAttributeValue(
  entityId: string,
  attributeName: string
): Promise<AttributeValueData | null> {
  try {
    const encodedEntityId = encodeURIComponent(entityId);
    const encodedAttrName = encodeURIComponent(attributeName);
    const response = await loggedFetch(
      `${API_BASE}/${encodedEntityId}/attributes/${encodedAttrName}`,
      {},
      `${EXTERNAL_API_BASE}/${encodedEntityId}/attributes/${encodedAttrName}`
    );
    if (!response.ok) {
      console.log(`[fetchAttributeValue] Response not OK: ${response.status}`);
      return null;
    }
    const data = await response.json();
    console.log(`[fetchAttributeValue] Raw response:`, JSON.stringify(data, null, 2));

    const decoded = decodeProtobufValues(data);
    console.log(`[fetchAttributeValue] After protobuf decode:`, JSON.stringify(decoded, null, 2));

    const result = decodeProtobufStruct(decoded);
    console.log(`[fetchAttributeValue] Final result:`, result);

    return result;
  } catch (error) {
    console.error(`[fetchAttributeValue] Error:`, error);
    return null;
  }
}

// Decode protobuf Struct format (columns/rows)
function decodeProtobufStruct(data: unknown): AttributeValueData | null {
  if (!data) return null;

  console.log(`[decodeProtobufStruct] Input type:`, Array.isArray(data) ? "array" : typeof data);
  console.log(`[decodeProtobufStruct] Input:`, JSON.stringify(data, null, 2).substring(0, 500));

  // Handle array of attribute values (common response format)
  if (Array.isArray(data)) {
    console.log(`[decodeProtobufStruct] Array with ${data.length} items`);

    // Try to extract all rows from the array
    const allRows: unknown[][] = [];
    let columns: string[] = [];

    for (let idx = 0; idx < data.length; idx++) {
      const item = data[idx];
      console.log(`[decodeProtobufStruct] Processing item ${idx}:`, typeof item);

      if (item && typeof item === "object") {
        const itemObj = item as Record<string, unknown>;
        console.log(`[decodeProtobufStruct] Item ${idx} keys:`, Object.keys(itemObj));

        // Check for decoded attribute format { start, end, value: { columns, rows }, _decoded: true }
        if (itemObj._decoded && itemObj.value && typeof itemObj.value === "object") {
          console.log(`[decodeProtobufStruct] Found _decoded item with value:`, itemObj.value);
          const valueObj = itemObj.value as Record<string, unknown>;
          console.log(`[decodeProtobufStruct] Value object keys:`, Object.keys(valueObj));

          if ("columns" in valueObj && "rows" in valueObj) {
            const cols = Array.isArray(valueObj.columns) ? valueObj.columns.map(String) : [];
            const rows = Array.isArray(valueObj.rows) ? valueObj.rows as unknown[][] : [];
            console.log(`[decodeProtobufStruct] Extracted from _decoded: ${cols.length} cols, ${rows.length} rows`);
            if (columns.length === 0) columns = cols;
            allRows.push(...rows);
            continue;
          }

          // Also check if value has a nested 'data' field (common protobuf pattern)
          if ("data" in valueObj && typeof valueObj.data === "object") {
            const dataObj = valueObj.data as Record<string, unknown>;
            if ("columns" in dataObj && "rows" in dataObj) {
              const cols = Array.isArray(dataObj.columns) ? dataObj.columns.map(String) : [];
              const rows = Array.isArray(dataObj.rows) ? dataObj.rows as unknown[][] : [];
              console.log(`[decodeProtobufStruct] Extracted from _decoded.data: ${cols.length} cols, ${rows.length} rows`);
              if (columns.length === 0) columns = cols;
              allRows.push(...rows);
              continue;
            }
          }
        }

        // Check for value property (protobuf wrapper) that might contain nested JSON
        if ("value" in itemObj && typeof itemObj.value === "object" && itemObj.value !== null) {
          const value = itemObj.value;
          console.log(`[decodeProtobufStruct] Checking value object:`, Object.keys(value as Record<string, unknown>));
          const parsed = parseStructValue(value);
          if (parsed && parsed.columns.length > 0) {
            console.log(`[decodeProtobufStruct] Parsed value: ${parsed.columns.length} cols, ${parsed.rows.length} rows`);
            if (columns.length === 0) columns = parsed.columns;
            allRows.push(...parsed.rows);
            continue;
          }
        }

        // Check for direct columns/rows structure
        if ("columns" in itemObj && "rows" in itemObj) {
          const cols = Array.isArray(itemObj.columns) ? itemObj.columns.map(String) : [];
          const rows = Array.isArray(itemObj.rows) ? itemObj.rows as unknown[][] : [];
          console.log(`[decodeProtobufStruct] Direct columns/rows: ${cols.length} cols, ${rows.length} rows`);
          if (columns.length === 0) columns = cols;
          allRows.push(...rows);
          continue;
        }

        // Check for fields structure (protobuf Struct)
        if ("fields" in itemObj && typeof itemObj.fields === "object") {
          const fields = itemObj.fields as Record<string, unknown>;
          const cols = Object.keys(fields);
          console.log(`[decodeProtobufStruct] Fields structure: ${cols.length} fields`);
          if (columns.length === 0) columns = cols;
          allRows.push(cols.map((col) => extractFieldValue(fields[col])));
          continue;
        }

        console.log(`[decodeProtobufStruct] Item ${idx} did not match any known pattern`);
      }
    }

    if (columns.length > 0 || allRows.length > 0) {
      console.log(`[decodeProtobufStruct] Final result: ${columns.length} columns, ${allRows.length} rows`);
      console.log(`[decodeProtobufStruct] Columns:`, columns);
      return { columns, rows: allRows, raw: data };
    }

    console.log(`[decodeProtobufStruct] No data extracted from array`);
    return { columns: [], rows: [], raw: data };
  }

  // Handle object response
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    console.log(`[decodeProtobufStruct] Object keys:`, Object.keys(obj));

    // Check for decoded attribute format { start, end, value: { columns, rows }, _decoded: true }
    if (obj._decoded && obj.value && typeof obj.value === "object") {
      const valueObj = obj.value as Record<string, unknown>;
      console.log(`[decodeProtobufStruct] Found decoded attribute format, value keys:`, Object.keys(valueObj));
      if ("columns" in valueObj && "rows" in valueObj) {
        const columns = Array.isArray(valueObj.columns) ? valueObj.columns.map(String) : [];
        const rows = Array.isArray(valueObj.rows) ? valueObj.rows as unknown[][] : [];
        console.log(`[decodeProtobufStruct] Decoded columns/rows: ${columns.length} cols, ${rows.length} rows`);
        return { columns, rows, raw: data };
      }
    }

    // Check for values array wrapper
    if ("values" in obj && Array.isArray(obj.values)) {
      console.log(`[decodeProtobufStruct] Found values array with ${(obj.values as unknown[]).length} items`);
      return decodeProtobufStruct(obj.values);
    }

    // Check for direct columns/rows structure
    if ("columns" in obj && "rows" in obj) {
      const columns = Array.isArray(obj.columns) ? obj.columns.map(String) : [];
      const rows = Array.isArray(obj.rows) ? obj.rows as unknown[][] : [];
      console.log(`[decodeProtobufStruct] Direct columns/rows: ${columns.length} cols, ${rows.length} rows`);
      return { columns, rows, raw: data };
    }

    // Check for fields structure (protobuf Struct)
    if ("fields" in obj && typeof obj.fields === "object") {
      const fields = obj.fields as Record<string, unknown>;
      const columns = Object.keys(fields);
      const rows = [columns.map((col) => extractFieldValue(fields[col]))];
      console.log(`[decodeProtobufStruct] Fields structure: ${columns.length} cols`);
      return { columns, rows, raw: data };
    }

    // Try parseStructValue as fallback
    return parseStructValue(data);
  }

  return { columns: [], rows: [], raw: data };
}

function parseStructValue(value: unknown): AttributeValueData | null {
  if (!value || typeof value !== "object") {
    return { columns: [], rows: [], raw: value };
  }

  const obj = value as Record<string, unknown>;

  // Check for columns/rows structure
  if ("columns" in obj && "rows" in obj) {
    const columns = Array.isArray(obj.columns) ? obj.columns.map(String) : [];
    // Rows might be nested - each row might have a "values" property
    let rows: unknown[][] = [];
    if (Array.isArray(obj.rows)) {
      rows = (obj.rows as unknown[]).map((row) => {
        if (Array.isArray(row)) return row;
        if (row && typeof row === "object" && "values" in (row as Record<string, unknown>)) {
          const vals = (row as Record<string, unknown>).values;
          if (Array.isArray(vals)) {
            // Extract actual values from protobuf Value wrappers
            return vals.map(extractFieldValue);
          }
        }
        return [row];
      });
    }
    return { columns, rows, raw: value };
  }

  // Check for fields structure (protobuf Struct)
  if ("fields" in obj && typeof obj.fields === "object") {
    const fields = obj.fields as Record<string, unknown>;
    const columns = Object.keys(fields);
    const rows = [columns.map((col) => extractFieldValue(fields[col]))];
    return { columns, rows, raw: value };
  }

  return { columns: [], rows: [], raw: value };
}

function extractFieldValue(field: unknown): unknown {
  if (!field || typeof field !== "object") return field;
  const f = field as Record<string, unknown>;

  // Handle protobuf Value types
  if ("stringValue" in f) return f.stringValue;
  if ("numberValue" in f) return f.numberValue;
  if ("boolValue" in f) return f.boolValue;
  if ("listValue" in f) {
    const list = f.listValue as { values?: unknown[] };
    return list.values?.map(extractFieldValue) || [];
  }
  if ("structValue" in f) return f.structValue;

  return field;
}

/**
 * Recursively explore a category node to find its children.
 * Stops when reaching a node with kind.major === "Dataset".
 * Tracks parent info for attribute fetching.
 */
async function exploreNodeRecursively(
  nodeId: string,
  signal?: AbortSignal,
  depth: number = 0,
  maxDepth: number = 10,
  visited: Set<string> = new Set(),
  parentId?: string,
  parentName?: string
): Promise<CategoryNode | null> {
  // Prevent infinite loops and excessive depth
  if (depth > maxDepth || visited.has(nodeId) || signal?.aborted) {
    return null;
  }
  visited.add(nodeId);

  console.log(`[exploreNode] Depth ${depth}: Exploring node ${nodeId} (parent: ${parentId})`);

  // Fetch entity info
  const entityInfo = await fetchEntityById(nodeId, signal);
  if (!entityInfo) {
    console.log(`[exploreNode] Could not fetch entity info for ${nodeId}`);
    return null;
  }

  const isDataset = entityInfo.kind.major === "Dataset";
  console.log(`[exploreNode] Entity ${nodeId}: name="${entityInfo.name}", kind=${entityInfo.kind.major}/${entityInfo.kind.minor || ""}, isDataset=${isDataset}`);

  const node: CategoryNode = {
    id: nodeId,
    name: entityInfo.name || nodeId,
    kind: entityInfo.kind,
    children: [],
    attributes: [],
    expanded: false,
    isDataset,
    isCategory: !isDataset,
    depth,
    // Track parent for attribute fetching (important for Dataset leaf nodes)
    parentId,
    parentName,
  };

  // If this is a Dataset, it's a leaf node - don't explore further
  // The attribute can be fetched using: GET /{parentId}/attributes/{node.name}
  if (isDataset) {
    console.log(`[exploreNode] Reached Dataset leaf at depth ${depth}: "${entityInfo.name}" (parent: ${parentId})`);
    console.log(`[exploreNode] To fetch attribute data: GET /${parentId}/attributes/${entityInfo.name}`);
    return node;
  }

  // Fetch ALL relations for this node to debug what's available
  const allRelations = await fetchEntityRelations(nodeId, undefined, signal);
  console.log(`[exploreNode] ALL relations for ${nodeId}:`, allRelations.map(r => ({
    name: r.name,
    direction: r.direction,
    relatedEntityId: r.relatedEntityId
  })));

  // Group relations by name for logging
  const relationsByName: Record<string, number> = {};
  allRelations.forEach(r => {
    relationsByName[r.name] = (relationsByName[r.name] || 0) + 1;
  });
  console.log(`[exploreNode] Relation types for ${nodeId}:`, relationsByName);

  // Find child relations - try different possible relationship names
  // Look for relations that point to child categories/datasets
  const childRelationNames = ["IS_ATTRIBUTE", "HAS_CHILD", "CHILD_CATEGORY", "AS_CATEGORY"];
  const childRelations = allRelations.filter(rel =>
    childRelationNames.includes(rel.name) ||
    rel.name.includes("CHILD") ||
    rel.name.includes("ATTRIBUTE")
  );

  console.log(`[exploreNode] Found ${childRelations.length} potential child relations for ${nodeId}`);

  // Process child nodes (try OUTGOING first, then INCOMING if no results)
  let relationsToProcess = childRelations.filter(rel => rel.direction === "OUTGOING");
  if (relationsToProcess.length === 0) {
    // Try incoming relations if no outgoing found
    relationsToProcess = childRelations.filter(rel => rel.direction === "INCOMING");
    console.log(`[exploreNode] No OUTGOING child relations, trying ${relationsToProcess.length} INCOMING`);
  }

  const childPromises = relationsToProcess.map(async (rel) => {
    console.log(`[exploreNode] Following relation ${rel.name} (${rel.direction}) to ${rel.relatedEntityId}`);
    // Pass current node as parent to children
    const childNode = await exploreNodeRecursively(
      rel.relatedEntityId,
      signal,
      depth + 1,
      maxDepth,
      visited,
      nodeId,  // This node becomes the parent
      entityInfo.name  // Pass parent name too
    );
    if (childNode) {
      childNode.relationDirection = rel.direction;
      childNode.relationId = rel.id;
      childNode.relationName = rel.name;
      childNode.startTime = rel.startTime;
      childNode.endTime = rel.endTime;
    }
    return childNode;
  });

  const children = await Promise.all(childPromises);
  node.children = children.filter((c): c is CategoryNode => c !== null);

  console.log(`[exploreNode] Node ${nodeId} has ${node.children.length} children`);
  return node;
}

export async function exploreEntity(
  entityId: string,
  signal?: AbortSignal
): Promise<ExploreResult> {
  const result: ExploreResult = {
    entityId,
    categories: [],
    relations: [],
    loading: true,
  };

  try {
    if (signal?.aborted) {
      result.error = "Cancelled";
      result.loading = false;
      return result;
    }

    // Get AS_CATEGORY relations for this entity (top-level categories)
    const categoryRelations = await fetchEntityRelations(entityId, "AS_CATEGORY", signal);
    console.log(`[exploreEntity] Found ${categoryRelations.length} AS_CATEGORY relations:`, categoryRelations);

    // Store raw relations for debugging/display
    result.relations = categoryRelations;

    // Track visited nodes to prevent cycles
    const visited = new Set<string>();

    // Recursively explore each top-level category
    const categoryPromises = categoryRelations.map(async (rel) => {
      console.log(`[exploreEntity] Starting recursive exploration for: ${rel.relatedEntityId}`);

      const categoryNode = await exploreNodeRecursively(
        rel.relatedEntityId,
        signal,
        0,
        10,
        visited
      );

      if (categoryNode) {
        categoryNode.relationDirection = rel.direction;
        categoryNode.relationId = rel.id;
        categoryNode.relationName = "AS_CATEGORY";
        categoryNode.startTime = rel.startTime;
        categoryNode.endTime = rel.endTime;
      }

      return categoryNode;
    });

    const categories = await Promise.all(categoryPromises);
    result.categories = categories.filter((c): c is CategoryNode => c !== null);

    console.log(`[exploreEntity] Final tree:`, JSON.stringify(result.categories, null, 2));
    result.loading = false;
  } catch (error) {
    if (signal?.aborted) {
      result.error = "Cancelled";
    } else {
      result.error = error instanceof Error ? error.message : "Failed to explore entity";
    }
    result.loading = false;
  }

  return result;
}

export async function getAttributeValue(
  entityId: string,
  attributeName: string
): Promise<AttributeValueData | null> {
  return fetchAttributeValue(entityId, attributeName);
}
