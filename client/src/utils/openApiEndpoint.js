/**
 * Shared OpenAPI endpoint → request configuration adapter.
 *
 * Used by both the single-endpoint import and the bounded batch runner so the
 * two paths cannot drift apart.
 */

import { applyParameterExamples } from './openApiParams.js';
import { extractSchemaConstraints } from '../../../server/utils/schemaConstraints.js';

export function buildConfigFromEndpoint(config, endpoint) {
  const expectedStatusCodes = Array.isArray(endpoint.expected?.statusCodes)
    ? endpoint.expected.statusCodes
    : [];
  const serverNeedsReview = Boolean(endpoint.serverUrlNeedsReview || !endpoint.serverUrl);
  const { path: substitutedPath, query, unresolved } = applyParameterExamples(
    endpoint.path || '',
    endpoint.parameters || []
  );
  const parameterNeedsReview = unresolved.length > 0;
  let path = `${substitutedPath}${query}`;
  let serverBaseUrl = '';

  if (!serverNeedsReview && endpoint.serverUrl) {
    try {
      const server = new URL(endpoint.serverUrl);
      if (['http:', 'https:'].includes(server.protocol)) {
        const basePath = server.pathname.replace(/\/+$/, '');
        const operationPath = `/${substitutedPath.replace(/^\/+/, '')}`;
        serverBaseUrl = `${server.origin}${basePath}`;
        path = `${serverBaseUrl}${operationPath}${query}`;
      }
    } catch {
      // Keep the relative operation path; the user can set a target URL manually.
    }
  }

  const parameterNotes = (endpoint.parameters || []).map((parameter) => {
    const required = parameter.required ? ' (required)' : '';
    const example = parameter.example !== undefined ? `; example: ${JSON.stringify(parameter.example)}` : '';
    const description = parameter.description ? ` — ${parameter.description}` : '';
    return `- ${parameter.in} parameter "${parameter.name}"${required}${description}${example}`;
  });
  const constraints = endpoint.requestBody?.schema
    ? extractSchemaConstraints(endpoint.requestBody.schema)
    : [];
  const rules = [
    endpoint.apiTitle ? `API: ${endpoint.apiTitle}` : '',
    endpoint.summary || endpoint.description,
    ...(parameterNotes.length ? ['Parameters from the API specification:', ...parameterNotes] : []),
    ...(parameterNeedsReview
      ? [`Unresolved path parameters: ${unresolved.join(', ')}. Provide concrete values before running.`]
      : []),
    ...(constraints.length ? ['Request body constraints (smart defaults):', ...constraints] : [])
  ].filter(Boolean).join('\n');
  const body = endpoint.request?.body;

  return {
    ...config,
    method: endpoint.method,
    path,
    expectedStatus: expectedStatusCodes[0] ?? '',
    expectedStatusCodes,
    expectedStatusReviewRequired: expectedStatusCodes.length === 0,
    importMetadata: {
      apiTitle: endpoint.apiTitle,
      operationId: endpoint.operationId,
      serverNeedsReview,
      serverBaseUrl,
      parameterNeedsReview,
      unresolvedParameters: unresolved,
      requiresReview: Boolean(endpoint.requiresReview || serverNeedsReview || parameterNeedsReview)
    },
    headers: endpoint.request?.headers || {},
    body: body == null ? '' : JSON.stringify(body, null, 2),
    sampleResponse: '',
    businessRules: rules
  };
}
