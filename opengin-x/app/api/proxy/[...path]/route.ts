import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  "https://aaf8ece1-3077-4a52-ab05-183a424f6d93-dev.e1-us-east-azure.choreoapis.dev/data-platform/read-api/v1.0/v1/entities";

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: "GET" | "POST"
) {
  try {
    const pathString = pathSegments.join("/");
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${API_BASE_URL}/${pathString}${searchParams ? `?${searchParams}` : ""}`;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    if (method === "POST") {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
      }
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get("content-type") || "";

    // Check if response is JSON
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response from API:", response.status, text.substring(0, 200));
      return NextResponse.json(
        {
          error: `API returned non-JSON response (${response.status})`,
          contentType,
        },
        { status: response.status || 500 }
      );
    }

    const data = await response.json();

    // Debug logging for attribute responses
    if (pathString.includes('/attributes/')) {
      const isArray = Array.isArray(data);
      console.log(`[Proxy] Attribute response: ${isArray ? `array[${data.length}]` : 'object'}`);
      console.log(`[Proxy] Top-level keys:`, Object.keys(data || {}));

      // Check for values array (common response wrapper)
      if (data?.values && Array.isArray(data.values)) {
        console.log(`[Proxy] Found values array with ${data.values.length} items`);
        if (data.values.length > 0) {
          const firstItem = data.values[0];
          console.log(`[Proxy] First value item keys:`, Object.keys(firstItem || {}));
          if (firstItem?.value) {
            const valueStr = String(firstItem.value);
            console.log(`[Proxy] First item value (${typeof firstItem.value}, len=${valueStr.length}):`, valueStr.substring(0, 100));
          }
        }
      } else if (isArray && data.length > 0) {
        const firstItem = data[0];
        console.log(`[Proxy] First array item keys:`, Object.keys(firstItem || {}));
        if (firstItem?.value) {
          const valueStr = String(firstItem.value);
          console.log(`[Proxy] First item value (${typeof firstItem.value}, len=${valueStr.length}):`, valueStr.substring(0, 100));
        }
      }
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch from API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "POST");
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
