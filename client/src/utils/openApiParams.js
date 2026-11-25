/**
 * Apply explicit examples from an OpenAPI operation to its path template and
 * query string. Only values that appear explicitly in the specification are
 * used; nothing is invented.
 */
export function applyParameterExamples(pathTemplate, parameters = []) {
  const unresolved = [];
  let path = String(pathTemplate || '');
  const queryParts = [];

  for (const parameter of parameters) {
    const hasExample = parameter && parameter.example !== undefined && parameter.example !== null;

    if (parameter?.in === 'path') {
      const token = `{${parameter.name}}`;
      if (hasExample) {
        path = path.split(token).join(encodeURIComponent(String(parameter.example)));
      } else if (parameter.required) {
        unresolved.push(parameter.name);
      }
      continue;
    }

    if (parameter?.in === 'query' && hasExample) {
      queryParts.push(
        `${encodeURIComponent(parameter.name)}=${encodeURIComponent(String(parameter.example))}`
      );
    }
  }

  return {
    path,
    query: queryParts.length ? `?${queryParts.join('&')}` : '',
    unresolved
  };
}
